// ==============================================================================
// Vercel Serverless Function: /api/auth
// Unified Multi-Zone Authentication Hub (Central, Salon Admin, Staff, Client VIP)
// Replaces admin-auth.ts and client-auth.ts to respect Vercel Hobby 12-function limit.
// ==============================================================================
import { neon } from '@neondatabase/serverless';
import crypto from 'node:crypto';
import {
  hashPassword,
  verifyPassword,
  verifyTOTP,
  signJwt,
  verifyJwt,
  serializeCookie,
  parseCookies,
  getAuthSecret,
  validateSuperadminSession,
} from './_auth.ts';

function getDb() {
  const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  if (!connectionString) return null;
  return neon(connectionString);
}

function getClientIp(req: any): string {
  return (
    (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
    req.socket?.remoteAddress ||
    '127.0.0.1'
  );
}

export default async function handler(req: any, res: any) {
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  const origin = req.headers.origin || '';
  if (
    origin.endsWith('vanesev.com') ||
    origin.includes('localhost') ||
    origin.includes('127.0.0.1')
  ) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  } else {
    res.setHeader('Access-Control-Allow-Origin', 'https://vanesev.com');
  }

  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const sql = getDb();
  if (!sql) {
    return res.status(503).json({ error: 'Database connection not configured.' });
  }

  const ip = getClientIp(req);
  const userAgent = req.headers['user-agent'] || 'unknown';
  const scope = String(req.query?.scope || req.body?.scope || 'central').toLowerCase();
  const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
  const action = body.action || req.query?.action || 'me';

  try {
    // =========================================================================
    // 1. SCOPE: CENTRAL (Superadmin karc0)
    // =========================================================================
    if (scope === 'central') {
      const secret = getAuthSecret('central');

      // GET /api/auth?scope=central (Check current session)
      if (req.method === 'GET' || action === 'me') {
        const session = await validateSuperadminSession(req, sql);
        if (!session.valid) {
          return res.status(401).json({ error: session.error || 'No active superadmin session.' });
        }
        return res.status(200).json({ ok: true, user: session.user, role: 'superadmin' });
      }

      // POST: LOGIN (Step 1 of 2FA)
      if (action === 'login') {
        const email = String(body.email || '').trim().toLowerCase();
        const password = String(body.password || '');

        if (!email || !password) {
          return res.status(400).json({ error: 'Email y contraseña requeridos.' });
        }

        const users = await sql`
          SELECT * FROM public.system_superadmins WHERE email = ${email} LIMIT 1;
        `;

        if (!users || users.length === 0) {
          return res.status(401).json({ error: 'Credenciales inválidas.' });
        }

        const user = users[0];

        // Check Lockout
        if (user.locked_until && new Date(user.locked_until).getTime() > Date.now()) {
          const remainingMinutes = Math.ceil(
            (new Date(user.locked_until).getTime() - Date.now()) / 60000
          );
          return res.status(429).json({
            error: `Cuenta temporalmente bloqueada por exceso de intentos fallidos. Reintenta en ${remainingMinutes} minuto(s).`,
          });
        }

        // Verify scrypt hash
        const isValid = verifyPassword(password, user.password_hash, user.password_salt);
        if (!isValid) {
          const nextFailed = (user.failed_attempts || 0) + 1;
          let lockUntilSql = null;
          if (nextFailed >= 5) {
            lockUntilSql = new Date(Date.now() + 15 * 60 * 1000); // 15 min lock
          }

          await sql`
            UPDATE public.system_superadmins
            SET failed_attempts = ${nextFailed},
                locked_until = ${lockUntilSql},
                updated_at = NOW()
            WHERE id = ${user.id};
          `;

          await sql`
            INSERT INTO public.system_access_logs (id, user_id, email, role, action, ip_address, user_agent)
            VALUES (${'log-' + Date.now()}, ${user.id}, ${email}, 'superadmin', 'login_failed', ${ip}, ${userAgent});
          `;

          return res.status(401).json({ error: 'Credenciales inválidas.' });
        }

        // Credentials valid. If 2FA enabled, require TOTP verification
        if (user.totp_enabled) {
          const tempToken = signJwt(
            { sub: user.id, email: user.email, stage: '2fa_required' },
            secret,
            300 // 5 minutes validity
          );
          return res.status(200).json({
            ok: true,
            require2fa: true,
            tempToken,
            message: 'Introduce tu código de autenticación en 2 pasos (2FA) o código de recuperación.',
          });
        }

        // If no 2FA (fallback), issue session directly
        const sessionToken = signJwt(
          {
            sub: user.id,
            email: user.email,
            role: 'superadmin',
            sessionVersion: user.session_version || 1,
          },
          secret,
          28800 // 8 hours
        );

        const cookieStr = serializeCookie('vs_central', sessionToken, {
          httpOnly: true,
          secure: true,
          sameSite: 'Strict',
          path: '/',
          maxAge: 28800,
        });

        res.setHeader('Set-Cookie', cookieStr);

        await sql`
          UPDATE public.system_superadmins
          SET failed_attempts = 0, locked_until = NULL, last_login_at = NOW()
          WHERE id = ${user.id};
        `;

        await sql`
          INSERT INTO public.system_access_logs (id, user_id, email, role, action, ip_address, user_agent)
          VALUES (${'log-' + Date.now()}, ${user.id}, ${email}, 'superadmin', 'login_success', ${ip}, ${userAgent});
        `;

        return res.status(200).json({ ok: true, user: { id: user.id, email: user.email } });
      }

      // POST: VERIFY 2FA (Step 2 of 2FA)
      if (action === 'verify_2fa') {
        const tempToken = String(body.tempToken || '');
        const code = String(body.code || '').trim().toUpperCase();

        if (!tempToken || !code) {
          return res.status(400).json({ error: 'tempToken y código requeridos.' });
        }

        const decoded = verifyJwt(tempToken, secret);
        if (!decoded.valid || decoded.payload?.stage !== '2fa_required') {
          return res.status(401).json({ error: 'Token temporal de 2FA expirado o inválido.' });
        }

        const userId = decoded.payload.sub;
        const users = await sql`
          SELECT * FROM public.system_superadmins WHERE id = ${userId} LIMIT 1;
        `;
        if (!users || users.length === 0) {
          return res.status(401).json({ error: 'Usuario no encontrado.' });
        }
        const user = users[0];

        // 1. Test standard 6-digit TOTP
        let codeValid = false;
        let recoveryUsedIndex = -1;

        if (/^\d{6}$/.test(code)) {
          codeValid = verifyTOTP(user.totp_secret, code);
        }

        // 2. If not standard TOTP, test recovery codes
        if (!codeValid && user.recovery_codes && Array.isArray(user.recovery_codes)) {
          const inputHash = crypto.createHash('sha256').update(code).digest('hex');
          const recoveryList = user.recovery_codes;
          for (let i = 0; i < recoveryList.length; i++) {
            if (recoveryList[i].hash === inputHash && !recoveryList[i].used) {
              codeValid = true;
              recoveryUsedIndex = i;
              recoveryList[i].used = true;
              recoveryList[i].used_at = new Date().toISOString();
              break;
            }
          }
        }

        if (!codeValid) {
          await sql`
            INSERT INTO public.system_access_logs (id, user_id, email, role, action, ip_address, user_agent)
            VALUES (${'log-' + Date.now()}, ${user.id}, ${user.email}, 'superadmin', '2fa_failed', ${ip}, ${userAgent});
          `;
          return res.status(401).json({ error: 'Código 2FA o de recuperación inválido.' });
        }

        // Code is valid: burn recovery code if used, issue session
        if (recoveryUsedIndex >= 0) {
          await sql`
            UPDATE public.system_superadmins
            SET recovery_codes = ${JSON.stringify(user.recovery_codes)},
                failed_attempts = 0, locked_until = NULL, last_login_at = NOW()
            WHERE id = ${user.id};
          `;
          await sql`
            INSERT INTO public.system_access_logs (id, user_id, email, role, action, ip_address, user_agent)
            VALUES (${'log-' + Date.now()}, ${user.id}, ${user.email}, 'superadmin', 'recovery_code_used', ${ip}, ${userAgent});
          `;
        } else {
          await sql`
            UPDATE public.system_superadmins
            SET failed_attempts = 0, locked_until = NULL, last_login_at = NOW()
            WHERE id = ${user.id};
          `;
          await sql`
            INSERT INTO public.system_access_logs (id, user_id, email, role, action, ip_address, user_agent)
            VALUES (${'log-' + Date.now()}, ${user.id}, ${user.email}, 'superadmin', '2fa_success', ${ip}, ${userAgent});
          `;
        }

        const sessionToken = signJwt(
          {
            sub: user.id,
            email: user.email,
            role: 'superadmin',
            sessionVersion: user.session_version || 1,
          },
          secret,
          28800 // 8 hours
        );

        const cookieStr = serializeCookie('vs_central', sessionToken, {
          httpOnly: true,
          secure: true,
          sameSite: 'Strict',
          path: '/',
          maxAge: 28800,
        });

        res.setHeader('Set-Cookie', cookieStr);
        return res.status(200).json({
          ok: true,
          user: { id: user.id, email: user.email, role: 'superadmin' },
          message: recoveryUsedIndex >= 0 ? 'Acceso concedido mediante código de recuperación.' : 'Autenticación 2FA exitosa.',
        });
      }

      // POST: LOGOUT
      if (action === 'logout') {
        const cookieStr = serializeCookie('vs_central', '', {
          httpOnly: true,
          secure: true,
          sameSite: 'Strict',
          path: '/',
          maxAge: 0,
        });
        res.setHeader('Set-Cookie', cookieStr);
        return res.status(200).json({ ok: true, message: 'Sesión de Central cerrada.' });
      }

      // POST: REVOKE ALL SESSIONS
      if (action === 'revoke_all') {
        const session = await validateSuperadminSession(req, sql);
        if (!session.valid) {
          return res.status(401).json({ error: 'Sesión no autorizada.' });
        }
        await sql`
          UPDATE public.system_superadmins
          SET session_version = session_version + 1, updated_at = NOW()
          WHERE id = ${session.user.id};
        `;
        const cookieStr = serializeCookie('vs_central', '', {
          httpOnly: true,
          secure: true,
          sameSite: 'Strict',
          path: '/',
          maxAge: 0,
        });
        res.setHeader('Set-Cookie', cookieStr);
        return res.status(200).json({ ok: true, message: 'Todas las sesiones activas han sido revocadas.' });
      }

      return res.status(400).json({ error: `Acción desconocida en scope central: ${action}` });
    }

    // =========================================================================
    // 2. SCOPE: SALON ADMIN (Compatibility bridge for existing admin_users)
    // =========================================================================
    if (scope === 'admin') {
      const email = String(body.email || '').trim().toLowerCase();
      const password = String(body.password || '');

      if (action === 'login') {
        const users = await sql`
          SELECT * FROM public.admin_users WHERE email = ${email} LIMIT 1;
        `;
        if (!users || users.length === 0) {
          return res.status(401).json({ error: 'Credenciales inválidas de administrador de salón.' });
        }
        const u = users[0];
        const salt = u.password_salt || 'salt_default_legacy';
        let valid = false;
        if (u.password_hash) {
          valid = verifyPassword(password, u.password_hash, salt);
        }

        if (!valid) {
          return res.status(401).json({ error: 'Contraseña incorrecta.' });
        }

        const adminSecret = getAuthSecret('admin');
        const token = signJwt(
          { sub: u.id, email: u.email, tenantId: u.tenant_id, role: 'owner' },
          adminSecret,
          43200 // 12 hours
        );

        return res.status(200).json({
          success: true,
          token,
          superAdminEmail: u.email,
          requires2FA: false,
        });
      }

      return res.status(200).json({ success: true, message: 'Admin action handled.' });
    }

    // =========================================================================
    // 3. SCOPE: CLIENTA (Compatibility bridge for client_accounts)
    // =========================================================================
    if (scope === 'clienta') {
      const phone = String(body.phone || '').replace(/\D/g, '');
      if (action === 'check') {
        const clients = await sql`
          SELECT id, phone, name, email FROM public.client_accounts WHERE phone = ${phone} LIMIT 1;
        `;
        return res.status(200).json({
          exists: clients.length > 0,
          requiresRegistration: clients.length === 0,
        });
      }
      return res.status(200).json({ ok: true, message: 'Clienta action handled.' });
    }

    return res.status(400).json({ error: `Scope no soportado: ${scope}` });
  } catch (err: any) {
    console.error('Error in /api/auth:', err);
    return res.status(500).json({ error: 'Error interno en autenticación.', details: err.message });
  }
}
