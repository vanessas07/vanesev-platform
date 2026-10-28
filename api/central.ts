// Vercel Serverless Function: /api/central
// 100% Database-Driven Super-Admin & Multi-Tenant Orchestrator for VANESEV (vanesev.com)
// Hardened with strict tenant_context whitelist and Superadmin Better Auth Session
import crypto from 'node:crypto';
import { hashPassword } from 'better-auth/crypto';
import { getDb } from './_db.js';
import { requireCentral } from './_session.js';
import { applyCors } from './_cors.js';
import { claveDeLimite, huella, ipDeLaPeticion, limiteSuperado } from './_limite.js';
import {
  OFICIOS, activarCuenta, ajustesCobro, anotar, correoEnAnalisis, correoPagoSolicitado, correoSolicitudRecibida, crearSalonDesdeSolicitud,
  enlaceSeguimiento, estadoPublico, idDesdeSeguimiento, nuevoIdSolicitud, reenviarActivacion, resumirCuestionario,
} from './_altas.js';
import { limpiarCuestionario } from './_cuestionario.js';
import { ultimoFalloIA } from './_ia.js';

const CORREO = /^[^\s@]{1,64}@[^\s@]{1,120}\.[a-z]{2,24}$/i;
const corto = (v: any, max: number) => String(v ?? '').trim().slice(0, max);


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
      const authCheck = await requireCentral(req);
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
        bookingStats,
        peticionesPuestaAPunto,
        solicitudesAlta,
        ajustesCobroFila
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
        `,
        sql`SELECT * FROM public.central_mailbox WHERE category = 'puesta_a_punto' ORDER BY created_at DESC`,
        sql`SELECT * FROM public.solicitudes_alta ORDER BY created_at DESC LIMIT 300`,
        sql`SELECT valor FROM public.central_ajustes WHERE clave = 'cobro' LIMIT 1`
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
        peticionesPuestaAPunto,
        solicitudesAlta,
        ajustesCobro: ajustesCobroFila[0]?.valor || {},
        infrastructure: {
          githubAccount: 'vanessas07',
          vercelAccount: 'vanesevapp-4342',
          region: 'aws-us-east-1 (N. Virginia) <-> iad1',
          blobStore: 'vanesev-media-blob (Active)',
          realtimeStatus: 'Neon Live SQL Active',
        }
      });
    }

    // ─── POST: Mutaciones protegidas en Central ──────────────────────────────
    if (req.method === 'POST') {
      const cuerpoPublico = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};

      // ─── Público: solicitud de alta desde la web (G-063) ───
      if (cuerpoPublico.action === 'solicitud_alta') {
        const ip = ipDeLaPeticion(req);
        if (await limiteSuperado(claveDeLimite('solicitud-alta-ip', ip), 5, 3600)) {
          res.setHeader('Retry-After', '3600');
          return res.status(429).json({ error: 'Has enviado varias solicitudes seguidas. Escríbenos por WhatsApp y te atendemos.' });
        }
        if (cuerpoPublico.web) return res.status(201).json({ success: true }); // campo trampa para bots
        const d = {
          salon_nombre: corto(cuerpoPublico.salon, 120), duena_nombre: corto(cuerpoPublico.nombre, 120),
          email: corto(cuerpoPublico.email, 160).toLowerCase(), whatsapp: corto(cuerpoPublico.whatsapp, 40),
          oficio: corto(cuerpoPublico.oficio, 30), ciudad: corto(cuerpoPublico.ciudad, 80) || null,
          plan: cuerpoPublico.plan === 'atelier' ? 'atelier' : 'esencial', mensaje: corto(cuerpoPublico.mensaje, 1000) || null,
        };
        if (d.salon_nombre.length < 2 || d.duena_nombre.length < 2) return res.status(400).json({ error: 'Escribe el nombre de tu estudio y el tuyo.' });
        if (!CORREO.test(d.email)) return res.status(400).json({ error: 'Escribe un correo válido: ahí te llega el acceso a tu panel.' });
        if (d.whatsapp.replace(/\D/g, '').length < 10) return res.status(400).json({ error: 'Escribe tu WhatsApp con el código de país.' });
        if (!(d.oficio in OFICIOS)) return res.status(400).json({ error: 'Elige tu oficio.' });
        const id = nuevoIdSolicitud();
        await sql`
          INSERT INTO public.solicitudes_alta (id, salon_nombre, duena_nombre, email, whatsapp, oficio, ciudad, plan, mensaje, ip_hash, historial)
          VALUES (${id}, ${d.salon_nombre}, ${d.duena_nombre}, ${d.email}, ${d.whatsapp}, ${d.oficio}, ${d.ciudad}, ${d.plan}, ${d.mensaje},
            ${huella(ip)}, ${JSON.stringify([{ fecha: new Date().toISOString(), estado: 'nueva', nota: 'Solicitud desde la web.' }])}::jsonb);
        `;
        await Promise.race([correoSolicitudRecibida({ id, ...d }), new Promise((r) => setTimeout(r, 6000))]);
        // G-067: la dueña sigue su solicitud y rellena el cuestionario en /solicitud con este enlace firmado.
        return res.status(201).json({ success: true, seguimiento: new URL(enlaceSeguimiento(id)).search });
      }

      // ─── Público: la dueña ve su solicitud y rellena «Cuéntanos tu salón» (G-067, G-068) ───
      if (cuerpoPublico.action === 'solicitud_estado' || cuerpoPublico.action === 'solicitud_cuestionario') {
        const ip = ipDeLaPeticion(req);
        if (await limiteSuperado(claveDeLimite('solicitud-seguimiento-ip', ip), 60, 3600)) {
          return res.status(429).json({ error: 'Demasiadas consultas seguidas. Inténtalo en un rato.' });
        }
        const idSolicitud = idDesdeSeguimiento(corto(cuerpoPublico.t, 100));
        if (!idSolicitud) return res.status(404).json({ error: 'Este enlace no es válido. Ábrelo desde el correo que te enviamos.' });
        const s = (await sql`SELECT * FROM public.solicitudes_alta WHERE id = ${idSolicitud} LIMIT 1;`)[0];
        if (!s) return res.status(404).json({ error: 'No encontramos esta solicitud. Escríbenos por WhatsApp.' });

        if (cuerpoPublico.action === 'solicitud_cuestionario') {
          if (s.estado === 'rechazada') return res.status(409).json({ error: 'Esta solicitud está cerrada. Escríbenos por WhatsApp si quieres retomarla.' });
          const respuestas = limpiarCuestionario(cuerpoPublico.respuestas);
          if (Object.keys(respuestas).length < 3) return res.status(400).json({ error: 'Responde al menos tres preguntas para enviarlo.' });
          await sql`UPDATE public.solicitudes_alta SET cuestionario = ${JSON.stringify(respuestas)}::jsonb, cuestionario_at = now(), updated_at = now() WHERE id = ${idSolicitud};`;
          await anotar(sql, idSolicitud, null, s.cuestionario ? 'La dueña actualizó el cuestionario.' : 'La dueña rellenó el cuestionario «Cuéntanos tu salón».');
          const actual = (await sql`SELECT * FROM public.solicitudes_alta WHERE id = ${idSolicitud} LIMIT 1;`)[0];
          await resumirCuestionario(req, sql, actual); // G-069: si la IA no responde, el resumen se pide luego desde Central
          return res.status(200).json({ success: true, solicitud: estadoPublico(actual) });
        }
        return res.status(200).json({ solicitud: estadoPublico(s) });
      }

      // ─── Público: la dueña activa su cuenta con el enlace del correo (G-064) ───
      if (cuerpoPublico.action === 'activar_cuenta') {
        if (await limiteSuperado(claveDeLimite('activar-ip', ipDeLaPeticion(req)), 10, 3600)) {
          return res.status(429).json({ error: 'Demasiados intentos. Inténtalo en una hora.' });
        }
        const r = await activarCuenta(sql, corto(cuerpoPublico.token, 100), String(cuerpoPublico.password || ''));
        if (!r.ok) return res.status(r.status).json({ error: r.error });
        return res.status(200).json({ success: true, panel: `/${r.slug}/admin` });
      }

      const authCheck = await requireCentral(req);
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

        // 1. Si el correo existe en "user" → 409 Conflict sin tocar nada
        const existingUsers = await sql`
          SELECT id FROM "user" WHERE LOWER(email) = ${cleanEmail} LIMIT 1;
        `;
        if (existingUsers.length > 0) {
          return res.status(409).json({ error: `Conflict: El correo '${cleanEmail}' ya está registrado.` });
        }

        // 2. Verificar que la organización exista
        const orgRows = await sql`
          SELECT id, slug FROM "organization" WHERE slug = ${cleanOrgSlug} OR id = ${cleanOrgSlug} LIMIT 1;
        `;
        if (orgRows.length === 0) {
          return res.status(404).json({ error: `Organización "${cleanOrgSlug}" no encontrada.` });
        }
        const org = orgRows[0];

        // 3. Generar contraseña aleatoria temporal de ≥ 16 caracteres y hashear con better-auth/crypto
        const tempPassword = crypto.randomBytes(12).toString('base64url') + 'A1!x';
        const hashedPassword = await hashPassword(tempPassword);

        const newUserId = `usr_${crypto.randomBytes(8).toString('hex')}`;
        const newAccountId = `acc_${crypto.randomBytes(8).toString('hex')}`;
        const newMemberId = `mem_${crypto.randomBytes(8).toString('hex')}`;

        // 4. Crear user, account y member en una sola transacción atómica
        await sql.transaction([
          sql`
            INSERT INTO "user" (id, name, email, "emailVerified", "createdAt", "updatedAt", must_reset)
            VALUES (${newUserId}, ${cleanName}, ${cleanEmail}, false, NOW(), NOW(), true);
          `,
          sql`
            INSERT INTO "account" (id, "userId", "accountId", "providerId", password, "createdAt", "updatedAt")
            VALUES (${newAccountId}, ${newUserId}, ${newUserId}, 'credential', ${hashedPassword}, NOW(), NOW());
          `,
          sql`
            INSERT INTO "member" (id, "organizationId", "userId", role, "createdAt")
            VALUES (${newMemberId}, ${org.id}, ${newUserId}, ${cleanRole}, NOW());
          `
        ]);

        return res.status(200).json({
          success: true,
          userId: newUserId,
          email: cleanEmail,
          role: cleanRole,
          organizationSlug: org.slug,
          temporaryPassword: tempPassword, // Devuelta UNA SOLA VEZ
        });
      }

      // Acción de Alta de Dueña en Puesta a Punto desde Central (Orden B1-c §2.1)
      if (action === 'create-trial-owner' || action === 'create_trial_owner') {
        const { organizationSlug } = payload || bodyObj || {};
        if (!organizationSlug) {
          return res.status(400).json({ error: 'Parámetro organizationSlug requerido.' });
        }

        const cleanOrgSlug = String(organizationSlug).trim().toLowerCase();
        const cleanEmail = `${cleanOrgSlug}@prueba.vanesev.internal`;

        // 1. Si el usuario existe en "user" → 409 Conflict
        const existingUsers = await sql`
          SELECT id FROM "user" WHERE LOWER(email) = ${cleanEmail} LIMIT 1;
        `;
        if (existingUsers.length > 0) {
          return res.status(409).json({ error: `Conflict: El usuario de prueba '${cleanEmail}' ya existe.` });
        }

        // 2. Verificar que la organización exista
        const orgRows = await sql`
          SELECT id, slug, name FROM "organization" WHERE slug = ${cleanOrgSlug} OR id = ${cleanOrgSlug} LIMIT 1;
        `;
        if (orgRows.length === 0) {
          return res.status(404).json({ error: `Organización "${cleanOrgSlug}" no encontrada.` });
        }
        const org = orgRows[0];

        // 3. Generar contraseña aleatoria temporal de ≥ 16 caracteres y hashear con better-auth/crypto
        const tempPassword = crypto.randomBytes(12).toString('base64url') + 'A1!x';
        const hashedPassword = await hashPassword(tempPassword);

        const newUserId = `usr_${crypto.randomBytes(8).toString('hex')}`;
        const newAccountId = `acc_${crypto.randomBytes(8).toString('hex')}`;
        const newMemberId = `mem_${crypto.randomBytes(8).toString('hex')}`;

        // 4. Crear user, account, member y actualizar tenant en una sola transacción atómica
        await sql.transaction([
          sql`
            INSERT INTO "user" (id, name, email, "emailVerified", "createdAt", "updatedAt", must_reset, cuenta_prueba)
            VALUES (${newUserId}, ${`Dueña ${org.name || cleanOrgSlug}`}, ${cleanEmail}, true, NOW(), NOW(), false, true);
          `,
          sql`
            INSERT INTO "account" (id, "userId", "accountId", "providerId", password, "createdAt", "updatedAt")
            VALUES (${newAccountId}, ${newUserId}, ${newUserId}, 'credential', ${hashedPassword}, NOW(), NOW());
          `,
          sql`
            INSERT INTO "member" (id, "organizationId", "userId", role, "createdAt")
            VALUES (${newMemberId}, ${org.id}, ${newUserId}, 'owner', NOW());
          `,
          sql`
            UPDATE public.tenants
            SET en_prueba = true, updated_at = NOW()
            WHERE id = ${org.slug} OR id = ${cleanOrgSlug};
          `
        ]);

        return res.status(200).json({
          success: true,
          userId: newUserId,
          email: cleanEmail,
          role: 'owner',
          organizationSlug: org.slug,
          temporaryPassword: tempPassword, // Devuelta UNA SOLA VEZ
        });
      }

      // Acción de Regenerar Contraseña Temporal para Dueña en Puesta a Punto (Orden B1-c §2.2)
      if (action === 'reset-trial-password' || action === 'reset_trial_password') {
        const { organizationSlug } = payload || bodyObj || {};
        if (!organizationSlug) {
          return res.status(400).json({ error: 'Parámetro organizationSlug requerido.' });
        }

        const cleanOrgSlug = String(organizationSlug).trim().toLowerCase();
        const cleanEmail = `${cleanOrgSlug}@prueba.vanesev.internal`;

        const users = await sql`
          SELECT id, email, cuenta_prueba FROM "user" WHERE LOWER(email) = ${cleanEmail} LIMIT 1;
        `;
        if (users.length === 0) {
          return res.status(404).json({ error: `Usuario de prueba para "${cleanOrgSlug}" no encontrado.` });
        }

        const u = users[0];
        if (!u.cuenta_prueba) {
          return res.status(400).json({ error: 'La cuenta no es una cuenta de puesta a punto (cuenta_prueba).' });
        }

        const tempPassword = crypto.randomBytes(12).toString('base64url') + 'A1!x';
        const hashedPassword = await hashPassword(tempPassword);

        await sql.transaction([
          sql`
            UPDATE "account"
            SET password = ${hashedPassword}, "updatedAt" = NOW()
            WHERE "userId" = ${u.id} AND "providerId" = 'credential';
          `,
          sql`
            DELETE FROM "session"
            WHERE "userId" = ${u.id};
          `
        ]);

        return res.status(200).json({
          success: true,
          email: cleanEmail,
          organizationSlug: cleanOrgSlug,
          temporaryPassword: tempPassword, // Devuelta UNA SOLA VEZ
        });
      }

      // Acción de Cambio de Estado en Peticiones de Puesta a Punto (Orden B1-c §2.3)
      if (action === 'puesta_a_punto_estado') {
        const { id, estado } = payload || bodyObj || {};
        if (!id || !estado) {
          return res.status(400).json({ error: 'Parámetros id y estado requeridos.' });
        }
        const cleanEstado = String(estado).trim().toLowerCase();
        if (!['recibida', 'en_curso', 'hecha'].includes(cleanEstado)) {
          return res.status(400).json({ error: 'Estado inválido. Debe ser recibida, en_curso o hecha.' });
        }
        await sql`
          UPDATE public.central_mailbox
          SET estado = ${cleanEstado}
          WHERE id = ${String(id)};
        `;
        return res.status(200).json({ ok: true, id, estado: cleanEstado });
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

      // ─── Altas de salones (G-063 a G-066) ───
      if (typeof action === 'string' && action.startsWith('alta_')) {
        const id = corto(payload.id, 40);
        const s = (await sql`SELECT * FROM public.solicitudes_alta WHERE id = ${id} LIMIT 1;`)[0];
        if (!s) return res.status(404).json({ error: 'Solicitud no encontrada.' });
        const ficha = async () => (await sql`SELECT * FROM public.solicitudes_alta WHERE id = ${id} LIMIT 1;`)[0];

        if (action === 'alta_estado') {
          const estado = String(payload.estado || '');
          if (!['en_analisis', 'rechazada', 'nueva'].includes(estado)) return res.status(400).json({ error: 'Estado no válido aquí.' });
          if (['pago_recibido', 'activa'].includes(s.estado)) return res.status(409).json({ error: 'Este salón ya está creado.' });
          await anotar(sql, id, estado as any, corto(payload.nota, 300) || `Estado: ${estado}.`);
          // G-067: la dueña se entera de que su solicitud avanza (el rechazo lo comunica karc0 en persona).
          if (estado === 'en_analisis' && s.estado === 'nueva') {
            const enviado = await correoEnAnalisis(s);
            await anotar(sql, id, null, `Aviso «estamos revisando tu solicitud»: ${enviado ? 'enviado' : 'NO enviado'}.`);
          }
          return res.status(200).json({ success: true, solicitud: await ficha() });
        }
        if (action === 'alta_resumen_ia') {
          if (!s.cuestionario) return res.status(409).json({ error: 'La dueña aún no ha rellenado el cuestionario.' });
          const resumen = await resumirCuestionario(req, sql, s);
          if (!resumen) return res.status(502).json({ error: `La IA no respondió (${ultimoFalloIA || 'sin motivo'}). Las respuestas siguen ahí.` });
          return res.status(200).json({ success: true, solicitud: await ficha() });
        }
        if (action === 'alta_nota') {
          const notas = corto(payload.notas, 2000);
          await sql`UPDATE public.solicitudes_alta SET notas = ${notas}, updated_at = now() WHERE id = ${id};`;
          return res.status(200).json({ success: true, solicitud: await ficha() });
        }
        if (action === 'alta_pedir_pago') {
          if (['pago_recibido', 'activa', 'rechazada'].includes(s.estado)) return res.status(409).json({ error: 'Esta solicitud ya no admite pedir el pago.' });
          const importe = Number(payload.importeUSD);
          if (!Number.isFinite(importe) || importe <= 0 || importe > 5000) return res.status(400).json({ error: 'Importe no válido.' });
          const concepto = corto(payload.concepto, 200) || 'Montaje de fundadora';
          await sql`UPDATE public.solicitudes_alta SET importe_usd = ${importe}, updated_at = now() WHERE id = ${id};`;
          const enviado = await correoPagoSolicitado(sql, s, importe, concepto);
          await anotar(sql, id, 'pago_solicitado', `Pago pedido: ${importe} $ (${concepto}). Correo ${enviado ? 'enviado' : 'NO enviado'}.`);
          return res.status(200).json({ success: true, correo: enviado, solicitud: await ficha() });
        }
        if (action === 'alta_pago_recibido') {
          if (['pago_recibido', 'activa'].includes(s.estado)) return res.status(409).json({ error: 'El pago ya estaba registrado y el salón creado.' });
          if (s.estado === 'rechazada') return res.status(409).json({ error: 'La solicitud está rechazada.' });
          const metodo = corto(payload.metodo, 30);
          if (!['pago_movil', 'zelle', 'binance', 'efectivo', 'otro'].includes(metodo)) return res.status(400).json({ error: 'Elige el medio de pago.' });
          const importe = Number(payload.importeUSD ?? s.importe_usd);
          if (!Number.isFinite(importe) || importe <= 0) return res.status(400).json({ error: 'Indica el importe recibido.' });
          const referencia = corto(payload.referencia, 120) || null;
          const creado = await crearSalonDesdeSolicitud(sql, s);
          if (!creado.ok) return res.status(creado.status).json({ error: creado.error });
          await sql`UPDATE public.solicitudes_alta SET metodo_pago = ${metodo}, referencia_pago = ${referencia}, importe_usd = ${importe}, updated_at = now() WHERE id = ${id};`;
          await anotar(sql, id, 'pago_recibido', `Pago recibido: ${importe} $ por ${metodo}. Salón creado: ${creado.slug}. Bienvenida ${creado.correo ? 'enviada' : 'NO enviada'}.`);
          return res.status(200).json({ success: true, slug: creado.slug, correo: creado.correo, solicitud: await ficha() });
        }
        if (action === 'alta_reenviar_activacion') {
          if (s.estado !== 'pago_recibido') return res.status(409).json({ error: 'Solo para salones creados que aún no activaron la cuenta.' });
          const enviado = await reenviarActivacion(sql, s);
          await anotar(sql, id, null, `Enlace de activación reenviado: ${enviado ? 'sí' : 'NO'}.`);
          return res.status(enviado ? 200 : 502).json(enviado ? { success: true, solicitud: await ficha() } : { error: 'No se pudo enviar el correo.' });
        }
        if (action === 'alta_abrir_salon') {
          if (!s.tenant_id) return res.status(409).json({ error: 'Este caso aún no tiene salón creado.' });
          await sql`UPDATE public.tenants SET en_prueba = false, subscription_status = 'active', updated_at = now() WHERE id = ${s.tenant_id};`;
          await anotar(sql, id, null, 'Salón abierto al público (fuera de puesta a punto).');
          return res.status(200).json({ success: true, solicitud: await ficha() });
        }
        return res.status(400).json({ error: 'Acción de alta desconocida.' });
      }

      if (action === 'ajustes_cobro_guardar') {
        const v: Record<string, string> = {};
        for (const k of ['titular', 'pago_movil', 'zelle', 'binance', 'nota']) {
          const t = corto(payload[k], k === 'nota' ? 400 : 200);
          if (t) v[k] = t;
        }
        await sql`
          INSERT INTO public.central_ajustes (clave, valor, updated_at) VALUES ('cobro', ${JSON.stringify(v)}::jsonb, now())
          ON CONFLICT (clave) DO UPDATE SET valor = EXCLUDED.valor, updated_at = now();
        `;
        return res.status(200).json({ success: true, ajustesCobro: await ajustesCobro(sql) });
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
