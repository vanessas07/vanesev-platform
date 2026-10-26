// ==============================================================================
// VANESEV Cloud Auth Layer - Utilities & Cryptographic Session Engine
// Zero-dependency native Node.js (crypto, scrypt, RFC 6238 TOTP, RFC 7519 JWT)
// ==============================================================================
import crypto from 'node:crypto';
import { neon } from '@neondatabase/serverless';

const RFC4648_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

// Base32 Decoder for TOTP
export function base32Decode(str) {
  const clean = String(str).toUpperCase().replace(/=+$/, '').replace(/\s+/g, '');
  let bits = 0;
  let value = 0;
  const output = [];
  for (let i = 0; i < clean.length; i++) {
    const idx = RFC4648_ALPHABET.indexOf(clean[i]);
    if (idx === -1) continue;
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      output.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return Buffer.from(output);
}

// RFC 6238 TOTP computation
export function computeTOTP(secret, counter) {
  const buf = Buffer.alloc(8);
  buf.writeBigInt64BE(BigInt(counter));
  const key = base32Decode(secret);
  const hmac = crypto.createHmac('sha1', key).update(buf).digest();
  const offset = hmac[hmac.length - 1] & 0x0f;
  const binary =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);
  return (binary % 1000000).toString().padStart(6, '0');
}

// Verify TOTP token with +/- 1 time-step window (30s steps)
export function verifyTOTP(secret, token, window = 1) {
  if (!secret || !token) return false;
  const cleanToken = String(token).trim();
  if (cleanToken.length !== 6) return false;
  const currentCounter = Math.floor(Date.now() / 1000 / 30);
  for (let i = -window; i <= window; i++) {
    if (computeTOTP(secret, currentCounter + i) === cleanToken) {
      return true;
    }
  }
  return false;
}

// Scrypt Password Hashing with Salt
export function hashPassword(password, salt) {
  const s = salt || crypto.randomBytes(16).toString('hex');
  const h = crypto.scryptSync(password, s, 64).toString('hex');
  return { hash: h, salt: s };
}

// Timing-safe password verification
export function verifyPassword(password, hash, salt) {
  try {
    const h = crypto.scryptSync(password, salt, 64).toString('hex');
    const bufA = Buffer.from(hash, 'hex');
    const bufB = Buffer.from(h, 'hex');
    if (bufA.length !== bufB.length) return false;
    return crypto.timingSafeEqual(bufA, bufB);
  } catch {
    return false;
  }
}

// Standard Signed JWT (HS256)
export function signJwt(payload, secret, expiresInSeconds) {
  const header = { alg: 'HS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const fullPayload = { ...payload, iat: now, exp: now + expiresInSeconds };
  const b64Header = Buffer.from(JSON.stringify(header)).toString('base64url');
  const b64Payload = Buffer.from(JSON.stringify(fullPayload)).toString('base64url');
  const signature = crypto
    .createHmac('sha256', secret)
    .update(`${b64Header}.${b64Payload}`)
    .digest('base64url');
  return `${b64Header}.${b64Payload}.${signature}`;
}

export function verifyJwt(token, secret) {
  try {
    if (!token) return { valid: false, error: 'Token missing' };
    const parts = token.split('.');
    if (parts.length !== 3) return { valid: false, error: 'Malformed token' };
    const [b64Header, b64Payload, signature] = parts;
    const expectedSig = crypto
      .createHmac('sha256', secret)
      .update(`${b64Header}.${b64Payload}`)
      .digest('base64url');
    const bufSig = Buffer.from(signature);
    const bufExpected = Buffer.from(expectedSig);
    if (bufSig.length !== bufExpected.length || !crypto.timingSafeEqual(bufSig, bufExpected)) {
      return { valid: false, error: 'Invalid signature' };
    }
    const payload = JSON.parse(Buffer.from(b64Payload, 'base64url').toString('utf8'));
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && now > payload.exp) {
      return { valid: false, error: 'Token expired' };
    }
    return { valid: true, payload };
  } catch (err) {
    return { valid: false, error: err.message };
  }
}

// Cookie Helpers
export function parseCookies(req) {
  const header = req.headers?.cookie || '';
  const result = {};
  header.split(';').forEach((item) => {
    const [rawKey, ...rawVal] = item.trim().split('=');
    if (rawKey) {
      result[rawKey] = decodeURIComponent(rawVal.join('='));
    }
  });
  return result;
}

export function serializeCookie(name, value, options = {}) {
  const parts = [`${name}=${encodeURIComponent(value)}`];
  if (options.maxAge !== undefined) parts.push(`Max-Age=${options.maxAge}`);
  if (options.httpOnly) parts.push('HttpOnly');
  if (options.secure) parts.push('Secure');
  if (options.sameSite) parts.push(`SameSite=${options.sameSite}`);
  parts.push(`Path=${options.path || '/'}`);
  return parts.join('; ');
}

// CORS Whitelist Filter: Only exact *.vanesev.com or localhost in non-production
export function applyCors(req, res) {
  const origin = (req.headers?.origin || '').trim();
  const isVanesev = /^https:\/\/([a-z0-9-]+\.)?vanesev\.com$/.test(origin);
  const isLocalDev =
    process.env.VERCEL_ENV !== 'production' &&
    /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);

  if (isVanesev || isLocalDev) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST,PATCH,DELETE');
    res.setHeader(
      'Access-Control-Allow-Headers',
      'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
    );
  }
}

// Secret Resolution - ZERO FALLBACKS (Throws fatal error if missing)
export function requireEnv(name) {
  const val = process.env[name];
  if (!val || !val.trim()) {
    throw new Error(`FATAL: Variable de entorno obligatoria '${name}' no está configurada.`);
  }
  return val.trim();
}

export function getAuthSecret(scope = 'central') {
  switch (scope) {
    case 'central':
      return requireEnv('CENTRAL_AUTH_SECRET');
    case 'admin':
      return requireEnv('ADMIN_AUTH_SECRET');
    case 'staff':
      return requireEnv('STAFF_AUTH_SECRET');
    case 'clienta':
      return requireEnv('CLIENT_AUTH_SECRET');
    default:
      throw new Error(`Scope desconocido: ${scope}`);
  }
}

// Superadmin Session Validator for Central APIs
export async function validateSuperadminSession(req, sqlInstance) {
  try {
    const cookies = parseCookies(req);
    const token =
      cookies['vs_central'] ||
      (req.headers?.authorization?.startsWith('Bearer ')
        ? req.headers.authorization.slice(7)
        : null);

    if (!token) {
      return { valid: false, error: 'No se encontró cookie vs_central ni cabecera Bearer' };
    }

    const secret = getAuthSecret('central');
    const verified = verifyJwt(token, secret);
    if (!verified.valid || !verified.payload) {
      return { valid: false, error: verified.error || 'Token de sesión inválido' };
    }

    const payload = verified.payload;
    if (payload.role !== 'superadmin' || !payload.sub) {
      return { valid: false, error: 'Rol insuficiente o sesión no válida' };
    }

    // Connect to database to verify session version and active status
    const dbUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL;
    if (!sqlInstance && !dbUrl) {
      throw new Error('FATAL: Variable DATABASE_URL no está configurada.');
    }
    const sql = sqlInstance || neon(dbUrl);
    const users = await sql`
      SELECT id, email, session_version, failed_attempts, locked_until
      FROM public.system_superadmins
      WHERE id = ${payload.sub}
      LIMIT 1;
    `;

    if (!users || users.length === 0) {
      return { valid: false, error: 'Superadmin no registrado' };
    }

    const user = users[0];
    if (user.locked_until && new Date(user.locked_until).getTime() > Date.now()) {
      return { valid: false, error: 'Cuenta temporalmente bloqueada por seguridad' };
    }

    // Check revocable session version
    if (user.session_version !== payload.sessionVersion) {
      return { valid: false, error: 'Sesión revocada o caducada en otro dispositivo' };
    }

    return { valid: true, user: { id: user.id, email: user.email } };
  } catch (err) {
    return { valid: false, error: err.message || 'Error validando sesión de superadmin' };
  }
}
