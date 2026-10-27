// Vercel Serverless Function: /api/central
// 100% Database-Driven Super-Admin & Multi-Tenant Orchestrator for VANESEV (vanesev.com)
// Hardened with strict tenant_context whitelist and Superadmin Better Auth Session
import crypto from 'node:crypto';
import { neon } from '@neondatabase/serverless';
import { auth } from './_better-auth.js';
import { applyCors } from './_cors.js';

function getDb() {
  const connectionString = process.env.DATABASE_URL || process.env.DATABASE_URL_STAGING;
  if (!connectionString) return null;
  return neon(connectionString);
}

async function validateCentralSession(req: any) {
  try {
    const session = await auth.api.getSession({ headers: req.headers });
    if (!session || !session.user) {
      return { status: 401, error: 'Unauthorized: Sesión de VANESEV Central requerida.' };
    }

    const user = session.user as any;
    if (user.platform_role !== 'superadmin_decisivo') {
      return { status: 403, error: 'Forbidden: Requiere rol superadmin_decisivo.' };
    }

    const sessionObj = session.session as any;
    const is2FA = Boolean(sessionObj?.twoFactorVerified || (user.twoFactorEnabled && sessionObj?.twoFactorVerified));
    if (!is2FA) {
      return { status: 403, error: 'Forbidden: Se requiere autenticación de dos factores (2FA) verificada.' };
    }

    return { status: 200, user, session: sessionObj };
  } catch (err: any) {
    return { status: 401, error: 'Error validando sesión de superadmin.' };
  }
}

export default async function handler(req: any, res: any) {
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  res.setHeader('X-Content-Type-Options', 'nosniff');

  // Strict CORS filter: exact *.vanesev.com or Vercel Preview
  applyCors(req, res);

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const sql = getDb();
  if (!sql) {
    return res.status(503).json({ error: 'Neon Database connection not configured.' });
  }

  try {
    // ─── GET: Fetch Central Master State or Specific Tenant Context ───────────
    if (req.method === 'GET') {
      const mode = String(req.query?.mode || 'all');
      const tenantSlug = String(req.query?.tenant || '').trim().toLowerCase();

      // 1. Contexto público de tenant con lista blanca estricta (CERO datos privados)
      if (mode === 'tenant_context' && tenantSlug) {
        const tenants = await sql`
          SELECT * FROM public.tenants 
          WHERE id = ${tenantSlug} OR custom_subdomain = ${tenantSlug}
          LIMIT 1;
        `;
        const rawTenant = tenants[0] || null;
        if (!rawTenant) {
          return res.status(404).json({ error: 'Tenant not found' });
        }
        const tId = rawTenant.id;
        const [services, rawStaff, zones] = await Promise.all([
          sql`SELECT * FROM public.services WHERE tenant_id = ${tId} AND is_available = true ORDER BY created_at ASC`,
          sql`SELECT * FROM public.staff_members WHERE tenant_id = ${tId} AND is_active = true ORDER BY created_at ASC`,
          sql`SELECT * FROM public.studio_zones WHERE tenant_id = ${tId} AND is_active = true ORDER BY sort_order ASC`,
        ]);

        // Whitelist estricta de tenant (0 campos privados)
        const tenant: Record<string, any> = {
          id: rawTenant.id,
          business_name: rawTenant.business_name,
          niche: rawTenant.niche,
          slogan: rawTenant.slogan,
          city: rawTenant.city,
          address: rawTenant.address,
          business_hours: rawTenant.business_hours,
          whatsapp_phone: rawTenant.whatsapp_phone,
          instagram_handle: rawTenant.instagram_handle,
          theme_palette: rawTenant.theme_palette,
          primary_color: rawTenant.primary_color,
          accent_color: rawTenant.accent_color,
          bg_color: rawTenant.bg_color,
          theme_config: rawTenant.theme_config,
          exchange_rate_bs: rawTenant.exchange_rate_bs,
          loyalty_stamps_target: rawTenant.loyalty_stamps_target,
          loyalty_reward_title: rawTenant.loyalty_reward_title,
          first_visit_discount_usd: rawTenant.first_visit_discount_usd,
          hero_title: rawTenant.hero_title,
          hero_subtitle: rawTenant.hero_subtitle,
          hero_badge: rawTenant.hero_badge,
          hero_image_url: rawTenant.hero_image_url,
          hero_cta_text: rawTenant.hero_cta_text,
          logo_url: rawTenant.logo_url,
        };

        // Whitelist estricta de staff (0 campos privados)
        const staff = (rawStaff || []).map((s: any) => ({
          id: s.id,
          name: s.name,
          role_title: s.role_title,
          specialty_tags: s.specialty_tags,
          avatar_url: s.avatar_url,
          rating: s.rating,
          zone_id: s.zone_id,
          is_active: s.is_active,
        }));

        return res.status(200).json({ tenant, services, staff, zones });
      }

      // 2. Seguridad Central: Requiere sesión válida de Superadmin con 2FA
      const authCheck = await validateCentralSession(req);
      if (authCheck.status !== 200) {
        return res.status(authCheck.status).json({ error: authCheck.error });
      }

      // Snapshot completo de Central para superadmin autenticado
      const [
        tenants,
        sessions,
        tasks,
        incidents,
        mailbox,
        roadmap,
        docs,
        staff,
        zones,
        bookingStats
      ] = await Promise.all([
        sql`SELECT * FROM public.tenants ORDER BY is_lifetime_free DESC, created_at ASC`,
        sql`SELECT * FROM public.central_sessions ORDER BY session_date DESC`,
        sql`SELECT * FROM public.central_tasks ORDER BY sort_order ASC, created_at DESC`,
        sql`SELECT * FROM public.central_incidents ORDER BY created_at DESC`,
        sql`SELECT * FROM public.central_mailbox ORDER BY created_at DESC`,
        sql`SELECT * FROM public.central_roadmap ORDER BY phase_number ASC, id ASC`,
        sql`SELECT * FROM public.central_docs ORDER BY id ASC`,
        sql`SELECT * FROM public.staff_members ORDER BY tenant_id ASC, created_at ASC`,
        sql`SELECT * FROM public.studio_zones ORDER BY tenant_id ASC, sort_order ASC`,
        sql`
          SELECT 
            tenant_id,
            COUNT(*)::int AS total_bookings,
            COUNT(*) FILTER (WHERE status = 'completada')::int AS completed_bookings,
            COALESCE(SUM(total_price_usd) FILTER (WHERE status != 'cancelada'), 0)::numeric AS total_revenue_usd
          FROM public.bookings
          GROUP BY tenant_id
        `
      ]);

      return res.status(200).json({
        tenants,
        sessions,
        tasks,
        incidents,
        mailbox,
        roadmap,
        docs,
        staff,
        zones,
        bookingStats,
        infrastructure: {
          githubAccount: 'vanessas07',
          vercelAccount: 'vanesevapp-4342',
          neonProjectId: 'super-frog-54108799',
          region: 'aws-us-east-1 (N. Virginia) <-> iad1',
          blobStore: 'vanesev-media-blob (Active)',
          realtimeStatus: 'Neon Live SQL Active',
        }
      });
    }

    // ─── POST: Mutaciones protegidas en Central ──────────────────────────────
    if (req.method === 'POST') {
      const authCheck = await validateCentralSession(req);
      if (authCheck.status !== 200) {
        return res.status(authCheck.status).json({ error: authCheck.error });
      }

      const bodyObj = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
      const action = bodyObj.action;
      const payload = bodyObj.payload || bodyObj;

      // Acción de Alta de Staff / Admin de Salón desde Central (Orden B1-a §4.6)
      if (action === 'create-staff' || action === 'create_staff') {
        const { email, name, organizationSlug, role } = payload || {};
        if (!email || !organizationSlug || !role) {
          return res.status(400).json({ error: 'Campos requeridos faltantes (email, organizationSlug, role).' });
        }

        const cleanEmail = String(email).trim().toLowerCase();
        const cleanOrgSlug = String(organizationSlug).trim().toLowerCase();
        const cleanRole = String(role).trim().toLowerCase();
        const cleanName = String(name || cleanEmail.split('@')[0]).trim();

        if (!['owner', 'admin', 'staff'].includes(cleanRole)) {
          return res.status(400).json({ error: 'Rol inválido. Debe ser owner, admin o staff.' });
        }

        // Verificar que la organización exista
        const orgRows = await sql`
          SELECT id, slug FROM "organization" WHERE slug = ${cleanOrgSlug} OR id = ${cleanOrgSlug} LIMIT 1;
        `;
        if (orgRows.length === 0) {
          return res.status(404).json({ error: `Organización "${cleanOrgSlug}" no encontrada.` });
        }
        const org = orgRows[0];

        // Generar contraseña aleatoria temporal de ≥ 16 caracteres
        const tempPassword = crypto.randomBytes(12).toString('base64url') + 'A1!x';
        const salt = crypto.randomBytes(16).toString('hex');
        const key = crypto.scryptSync(tempPassword.normalize('NFKC'), salt, 64, {
          N: 16384,
          r: 16,
          p: 1,
          maxmem: 128 * 16384 * 16 * 2,
        }).toString('hex');
        const hashedPassword = `${key}:${salt}`;

        const newUserId = `usr_${crypto.randomBytes(8).toString('hex')}`;
        const newAccountId = `acc_${crypto.randomBytes(8).toString('hex')}`;
        const newMemberId = `mem_${crypto.randomBytes(8).toString('hex')}`;

        // Insertar user con must_reset = true
        await sql`
          INSERT INTO "user" (id, name, email, "emailVerified", "createdAt", "updatedAt", must_reset)
          VALUES (${newUserId}, ${cleanName}, ${cleanEmail}, false, NOW(), NOW(), true)
          ON CONFLICT (email) DO UPDATE SET must_reset = true, "updatedAt" = NOW();
        `;

        // Insertar account
        await sql`
          INSERT INTO "account" (id, "userId", "accountId", "providerId", password, "createdAt", "updatedAt")
          VALUES (${newAccountId}, ${newUserId}, ${newUserId}, 'credential', ${hashedPassword}, NOW(), NOW())
          ON CONFLICT (id) DO NOTHING;
        `;

        // Insertar member vinculado a la organización
        await sql`
          INSERT INTO "member" (id, "organizationId", "userId", role, "createdAt")
          VALUES (${newMemberId}, ${org.id}, ${newUserId}, ${cleanRole}, NOW())
          ON CONFLICT (id) DO NOTHING;
        `;

        return res.status(200).json({
          success: true,
          userId: newUserId,
          email: cleanEmail,
          role: cleanRole,
          organizationSlug: org.slug,
          temporaryPassword: tempPassword, // Devuelta UNA SOLA VEZ
        });
      }

      if (action === 'review_session') {
        const { id, reviewStatus, karc0Feedback } = payload || {};
        await sql`
          UPDATE public.central_sessions
          SET review_status = ${String(reviewStatus || 'approved')},
              karc0_feedback = ${String(karc0Feedback || '')},
              reviewed_at = NOW()
          WHERE id = ${String(id)};
        `;
        return res.status(200).json({ ok: true });
      }

      if (action === 'create_incident') {
        const { severity, affectedZone, affectedTenant, title, description } = payload || {};
        const id = `inc-${Date.now()}`;
        await sql`
          INSERT INTO public.central_incidents (id, reporter, severity, affected_zone, affected_tenant, title, description, status)
          VALUES (
            ${id}, 'karc0', ${String(severity || 'critical')},
            ${String(affectedZone || 'General')}, ${String(affectedTenant || 'all')},
            ${String(title || 'Reporte de emergencia')}, ${String(description || '')}, 'open'
          );
        `;
        return res.status(201).json({ ok: true, id });
      }

      if (action === 'update_incident') {
        const { id, status, resolutionNote } = payload || {};
        await sql`
          UPDATE public.central_incidents
          SET status = ${String(status)},
              agent_resolution_note = COALESCE(${resolutionNote || null}, agent_resolution_note),
              resolved_at = CASE WHEN ${String(status)} = 'resolved' THEN NOW() ELSE resolved_at END
          WHERE id = ${String(id)};
        `;
        return res.status(200).json({ ok: true });
      }

      if (action === 'send_mailbox_message') {
        const { sender, recipient, subject, body, category, priority } = payload || {};
        const id = `msg-${Date.now()}`;
        await sql`
          INSERT INTO public.central_mailbox (id, sender, recipient, subject, body, category, priority, is_read)
          VALUES (
            ${id}, ${String(sender || 'karc0')}, ${String(recipient || 'antigravity')},
            ${String(subject || 'Directriz desde Central')}, ${String(body || '')},
            ${String(category || 'order')}, ${String(priority || 'high')}, false
          );
        `;
        return res.status(201).json({ ok: true, id });
      }

      if (action === 'upsert_task') {
        const { id, title, description, zone, priority, status, assignedTo, karc0Notes, dueLabel } = payload || {};
        const taskId = id || `tsk-${Date.now()}`;
        await sql`
          INSERT INTO public.central_tasks (id, title, description, zone, priority, status, assigned_to, karc0_notes, due_label, updated_at)
          VALUES (
            ${taskId}, ${String(title)}, ${String(description || '')},
            ${String(zone || 'ZONA 2 · CENTRAL')}, ${String(priority || 'high')},
            ${String(status || 'pending')}, ${String(assignedTo || 'antigravity')},
            ${String(karc0Notes || '')}, ${String(dueLabel || 'Próximo Sprint')}, NOW()
          )
          ON CONFLICT (id) DO UPDATE SET
            status = EXCLUDED.status,
            priority = EXCLUDED.priority,
            karc0_notes = EXCLUDED.karc0_notes,
            title = EXCLUDED.title,
            description = EXCLUDED.description,
            updated_at = NOW();
        `;
        return res.status(200).json({ ok: true, id: taskId });
      }

      return res.status(400).json({ error: `Unknown action: ${action}` });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err: any) {
    console.error('Error in /api/central:', err);
    return res.status(500).json({ error: 'Error interno en Central.' });
  }
}
