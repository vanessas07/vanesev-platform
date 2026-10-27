// Vercel Serverless Function: /api/team
// Manages salon staff members and studio zones in Neon Serverless Postgres
import { randomUUID, createHash, randomInt, timingSafeEqual } from 'node:crypto';
import { hashPassword } from 'better-auth/crypto';
import { getDb } from './_db.js';
import { requireSession, requireTenantRole } from './_session.js';
import { applyCors } from './_cors.js';
import { limiteSuperado, claveDeLimite } from './_limite.js';
import { enviarCorreo } from './_correo.js';

const IMAGEN_VALIDA = /^(\/[A-Za-z0-9/_.-]{1,200}|https:\/\/[^\s"'<>]{1,500}|data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/]+={0,2})$/;
const IMAGEN_MAX_CARACTERES = 2_000_000;
const ID_VALIDO = /^[A-Za-z0-9_-]{1,64}$/;

export default async function handler(req: any, res: any) {
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  applyCors(req, res);
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST,DELETE');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const sql = getDb();
  if (!sql) {
    return res.status(503).json({ error: 'Base de datos no disponible.' });
  }

  // ─── GET: Listar especialistas y zonas del salón ─────────────────────────────
  if (req.method === 'GET') {
    try {
      const rawTenant = req.query?.tenant;
      if (!rawTenant || !String(rawTenant).trim()) {
        return res.status(400).json({ error: 'Parámetro tenant requerido.' });
      }
      const cleanTenant = String(rawTenant).trim().toLowerCase();

      const authCheck = await requireTenantRole(req, cleanTenant, ['owner', 'admin', 'staff']);
      if (authCheck.status !== 200) {
        return res.status(authCheck.status).json({ error: authCheck.error });
      }

      const isStaffOnly = authCheck.role === 'staff';

      const [staffRows, zoneRows, peticionesRows, tenantRows] = await Promise.all([
        isStaffOnly
          ? sql`
              SELECT 
                id,
                tenant_id as "tenantId",
                name,
                role_title as "roleTitle",
                specialty_tags as "specialtyTags",
                instagram,
                zone_id as "zoneId",
                schedule_summary as "scheduleSummary",
                avatar_url as "avatarUrl",
                rating,
                completed_services_count as "completedServicesCount",
                is_active as "isActive",
                created_at as "createdAt",
                updated_at as "updatedAt"
              FROM public.staff_members
              WHERE tenant_id = ${cleanTenant}
              ORDER BY created_at ASC;
            `
          : sql`
              SELECT 
                id,
                tenant_id as "tenantId",
                name,
                role_title as "roleTitle",
                specialty_tags as "specialtyTags",
                phone,
                instagram,
                commission_percent as "commissionPercent",
                zone_id as "zoneId",
                schedule_summary as "scheduleSummary",
                avatar_url as "avatarUrl",
                rating,
                completed_services_count as "completedServicesCount",
                is_active as "isActive",
                created_at as "createdAt",
                updated_at as "updatedAt"
              FROM public.staff_members
              WHERE tenant_id = ${cleanTenant}
              ORDER BY created_at ASC;
            `,
        sql`
          SELECT 
            id,
            tenant_id as "tenantId",
            name,
            department,
            description,
            capacity,
            station_code as "stationCode",
            is_active as "isActive",
            sort_order as "sortOrder",
            created_at as "createdAt",
            updated_at as "updatedAt"
          FROM public.studio_zones
          WHERE tenant_id = ${cleanTenant}
          ORDER BY sort_order ASC, created_at ASC;
        `,
        // El historial de puesta a punto es de la dueña: el staff no lo recibe.
        isStaffOnly ? [] : sql`
          SELECT
            id,
            sender,
            recipient,
            subject,
            body,
            category,
            priority,
            estado,
            created_at as "createdAt"
          FROM public.central_mailbox
          WHERE sender = ${`salon:${cleanTenant}`} AND category = 'puesta_a_punto'
          ORDER BY created_at DESC;
        `,
        sql`
          SELECT id, en_prueba as "enPrueba"
          FROM public.tenants
          WHERE id = ${cleanTenant}
          LIMIT 1;
        `,
      ]);

      return res.status(200).json({
        staff: staffRows.map((r: any) => ({
          ...r,
          commissionPercent: r.commissionPercent !== undefined && r.commissionPercent !== null ? Number(r.commissionPercent) : undefined,
          rating: Number(r.rating) || 5.0,
        })),
        zones: zoneRows.map((z: any) => ({
          ...z,
          capacity: Number(z.capacity) || 1,
          sortOrder: Number(z.sortOrder) || 0,
        })),
        peticiones: (peticionesRows || []).map((p: any) => ({
          id: p.id,
          sender: p.sender,
          recipient: p.recipient,
          subject: p.subject,
          body: p.body,
          category: p.category,
          priority: p.priority,
          estado: p.estado || 'recibida',
          createdAt: p.createdAt,
        })),
        enPrueba: Boolean(tenantRows[0]?.enPrueba),
        databaseConnected: true,
      });
    } catch (err: any) {
      console.error('[Neon Get Team Error]:', err);
      return res.status(500).json({ error: 'Error al consultar equipo del salón.' });
    }
  }

  // ─── POST: Operaciones del equipo y puesta a punto ───────────────────────
  if (req.method === 'POST') {
    try {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
      const { action, tenantId } = body;

      // ─── Activar mi cuenta: Paso 1 (Enviar código al correo nuevo) ─────────
      if (action === 'activar_cuenta_codigo') {
        const authSession = await requireSession(req);
        if (authSession.status !== 200) {
          return res.status(authSession.status).json({ error: authSession.error });
        }
        const user = authSession.user;
        if (!user.cuenta_prueba) {
          return res.status(403).json({ error: 'Forbidden: Esta acción es solo para cuentas en periodo de puesta a punto (cuenta_prueba).' });
        }

        const cleanCorreo = String(body.correo || '').trim().toLowerCase();
        if (!cleanCorreo || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanCorreo)) {
          return res.status(400).json({ error: 'Correo electrónico inválido.' });
        }

        // 409 si el correo ya es de otra cuenta
        const existing = await sql`
          SELECT id FROM "user" WHERE LOWER(email) = ${cleanCorreo} LIMIT 1;
        `;
        if (existing.length > 0) {
          return res.status(409).json({ error: 'El correo electrónico ya está registrado en otra cuenta.' });
        }

        // Freno de frecuencia: máximo 3 envíos por hora
        const clave = claveDeLimite('activar_codigo', user.id);
        const superado = await limiteSuperado(clave, 3, 3600);
        if (superado) {
          return res.status(429).json({ error: 'Has superado el límite de 3 envíos por hora. Inténtalo de nuevo más tarde.' });
        }

        // Código de 6 dígitos
        const codigo = String(randomInt(100000, 1000000));
        const hashedCodigo = createHash('sha256').update(codigo).digest('hex');
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutos
        const identifier = `activar:${user.id}:${cleanCorreo}`;

        const verId = `ver_${randomUUID()}`;
        await sql.transaction([
          sql`DELETE FROM "verification" WHERE identifier = ${identifier};`,
          sql`
            INSERT INTO "verification" (id, identifier, value, "expiresAt", "createdAt", "updatedAt")
            VALUES (${verId}, ${identifier}, ${hashedCodigo}, ${expiresAt}, NOW(), NOW());
          `
        ]);

        try {
          await enviarCorreo({
            para: cleanCorreo,
            asunto: 'Activa tu cuenta de VANESEV',
            texto: `Tu código para activar tu cuenta de VANESEV es: ${codigo}\n\nEste código caduca en 10 minutos.`,
            html: `
              <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto; padding: 24px; border: 1px solid #F6ECEC; border-radius: 8px;">
                <h2 style="color: #7A3E4A; margin-top: 0;">Activa tu cuenta de VANESEV</h2>
                <p style="color: #3B2228; font-size: 15px;">Usa el siguiente código de 6 dígitos en tu panel de administración para verificar tu correo y activar tu cuenta:</p>
                <div style="font-size: 32px; font-weight: bold; letter-spacing: 6px; text-align: center; color: #7A3E4A; background: #F6ECEC; padding: 16px; border-radius: 6px; margin: 24px 0;">
                  ${codigo}
                </div>
                <p style="color: #6b7280; font-size: 13px; margin-bottom: 0;">Este código caduca en 10 minutos. Si no has solicitado activar tu cuenta, ignora este mensaje.</p>
              </div>
            `
          });
        } catch (mailErr: any) {
          // Si el correo no sale, la dueña lo tiene que saber: no se responde «enviado».
          console.error('[activar_cuenta_codigo] Error de envío SMTP:', mailErr?.message || mailErr);
          return res.status(502).json({ error: 'No se pudo enviar el código. Inténtalo de nuevo en unos minutos.' });
        }

        return res.status(200).json({ success: true, message: 'Código de activación enviado por correo.' });
      }

      // ─── Activar mi cuenta: Paso 2 (Verificar código y activar cuenta) ───────
      if (action === 'activar_cuenta') {
        const authSession = await requireSession(req);
        if (authSession.status !== 200) {
          return res.status(authSession.status).json({ error: authSession.error });
        }
        const user = authSession.user;
        if (!user.cuenta_prueba) {
          return res.status(403).json({ error: 'Forbidden: Esta acción es solo para cuentas en periodo de puesta a punto (cuenta_prueba).' });
        }

        const { correo, codigo, nuevaContrasena } = body;
        const cleanCorreo = String(correo || '').trim().toLowerCase();
        const cleanCodigo = String(codigo || '').trim();
        const cleanPass = String(nuevaContrasena || '');

        if (!cleanCorreo || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanCorreo)) {
          return res.status(400).json({ error: 'Correo electrónico inválido.' });
        }
        if (!cleanCodigo || cleanCodigo.length !== 6) {
          return res.status(400).json({ error: 'Código de verificación de 6 dígitos requerido.' });
        }
        if (cleanPass.length < 12) {
          return res.status(400).json({ error: 'La nueva contraseña debe tener al menos 12 caracteres.' });
        }

        // Verificar código en tabla verification
        const identifier = `activar:${user.id}:${cleanCorreo}`;
        const verRows = await sql`
          SELECT id, value, "expiresAt" FROM "verification" WHERE identifier = ${identifier} LIMIT 1;
        `;
        if (verRows.length === 0) {
          return res.status(400).json({ error: 'Código no encontrado o no solicitado.' });
        }

        const ver = verRows[0];
        if (new Date(ver.expiresAt).getTime() < Date.now()) {
          return res.status(400).json({ error: 'El código de activación ha caducado. Solicita uno nuevo.' });
        }

        // Máximo 5 intentos por código: al quinto fallo el código se anula y hay que pedir otro.
        const claveIntentos = claveDeLimite('activar_intento', ver.id);
        const hashedInput = Buffer.from(createHash('sha256').update(cleanCodigo).digest('hex'));
        const guardado = Buffer.from(String(ver.value));
        if (guardado.length !== hashedInput.length || !timingSafeEqual(guardado, hashedInput)) {
          if (await limiteSuperado(claveIntentos, 4, 600)) {
            await sql`DELETE FROM "verification" WHERE id = ${ver.id};`;
            return res.status(429).json({ error: 'Demasiados intentos. Solicita un código nuevo.' });
          }
          return res.status(400).json({ error: 'Código de activación incorrecto.' });
        }

        // 409 si el correo ya pertenece a otro usuario
        const conflictUsers = await sql`
          SELECT id FROM "user" WHERE LOWER(email) = ${cleanCorreo} AND id != ${user.id} LIMIT 1;
        `;
        if (conflictUsers.length > 0) {
          return res.status(409).json({ error: 'El correo electrónico ya está registrado en otra cuenta.' });
        }

        // El salón sale de su membresía de dueña, nunca del cuerpo de la petición.
        const memberRows = await sql`
          SELECT o.slug, o.id as "orgId"
          FROM "member" m
          JOIN "organization" o ON m."organizationId" = o.id
          WHERE m."userId" = ${user.id} AND m.role = 'owner'
          LIMIT 1;
        `;
        const tenantSlug = memberRows[0]?.slug;
        if (!tenantSlug) {
          return res.status(403).json({ error: 'La cuenta no es dueña de ningún salón.' });
        }

        // Hashear la nueva contraseña
        const hashedPassword = await hashPassword(cleanPass);

        // En UNA SOLA TRANSACCIÓN atómica:
        // - cambia user.email al verificado, emailVerified = true, cuenta_prueba = false
        // - guarda la nueva contraseña (hashPassword) en account
        // - pone tenants.en_prueba = false
        // - revoca TODAS sus sesiones
        // - elimina el registro de verificación usado
        // NO borra nada más (citas, clientas, sellos, bloqueos, escaneos, formulario de puesta a punto)
        await sql.transaction([
          sql`
            UPDATE "user"
            SET email = ${cleanCorreo}, "emailVerified" = true, cuenta_prueba = false, "updatedAt" = NOW()
            WHERE id = ${user.id};
          `,
          sql`
            UPDATE "account"
            SET password = ${hashedPassword}, "updatedAt" = NOW()
            WHERE "userId" = ${user.id} AND "providerId" = 'credential';
          `,
          sql`
            UPDATE public.tenants
            SET en_prueba = false, updated_at = NOW()
            WHERE id = ${tenantSlug};
          `,
          sql`
            DELETE FROM "session"
            WHERE "userId" = ${user.id};
          `,
          sql`
            DELETE FROM "verification"
            WHERE identifier = ${identifier};
          `
        ]);

        return res.status(200).json({
          success: true,
          email: cleanCorreo,
          message: 'Cuenta activada correctamente. Inicia sesión con tu nuevo correo y contraseña.'
        });
      }

      // ─── Verificación de permisos de Salón para el resto de acciones ─────────
      const rawTenant = tenantId || req.query?.tenant;
      if (!rawTenant || !String(rawTenant).trim()) {
        return res.status(400).json({ error: 'Parámetro tenantId requerido.' });
      }
      const cleanTenant = String(rawTenant).trim().toLowerCase();

      const authCheck = await requireTenantRole(req, cleanTenant, ['owner', 'admin']);
      if (authCheck.status !== 200) {
        return res.status(authCheck.status).json({ error: authCheck.error });
      }

      // ─── Formulario de puesta a punto: Solicitud de cambios (Orden B1-c §3.1)
      if (action === 'solicitud_cambios') {
        const { texto, quiereLlamada } = body;
        const cleanTexto = String(texto || '').trim();
        if (cleanTexto.length < 10 || cleanTexto.length > 3000) {
          return res.status(400).json({ error: 'El texto debe tener entre 10 y 3.000 caracteres.' });
        }

        const clave = claveDeLimite('puesta_a_punto', cleanTenant);
        const superado = await limiteSuperado(clave, 10, 86400); // Máximo 10 al día por salón
        if (superado) {
          return res.status(429).json({ error: 'Has alcanzado el límite de 10 solicitudes de puesta a punto al día para este salón.' });
        }

        const prioridad = Boolean(quiereLlamada) ? 'high' : 'normal';
        const asunto = Boolean(quiereLlamada)
          ? `Solicitud de puesta a punto (Requiere llamada) · ${cleanTenant}`
          : `Solicitud de puesta a punto · ${cleanTenant}`;

        const msgId = `msg-pap-${Date.now()}-${randomUUID().slice(0, 8)}`;
        await sql`
          INSERT INTO public.central_mailbox (id, sender, recipient, subject, body, category, priority, estado, is_read, created_at)
          VALUES (
            ${msgId},
            ${`salon:${cleanTenant}`},
            'karc0',
            ${asunto},
            ${cleanTexto},
            'puesta_a_punto',
            ${prioridad},
            'recibida',
            false,
            NOW()
          );
        `;

        return res.status(201).json({ success: true, id: msgId });
      }

      if (action === 'upsert_staff') {
        const {
          id,
          name,
          roleTitle,
          specialtyTags,
          phone,
          instagram,
          commissionPercent,
          zoneId,
          scheduleSummary,
          avatarUrl,
          isActive,
        } = body;

        if (!name || !String(name).trim()) {
          return res.status(400).json({ error: 'Nombre del especialista requerido.' });
        }

        const cleanName = String(name).trim().slice(0, 80);
        const cleanRoleTitle = roleTitle ? String(roleTitle).trim().slice(0, 60) : 'Especialista';
        const cleanSpecialtyTags = Array.isArray(specialtyTags)
          ? specialtyTags.map((t: any) => String(t).trim().slice(0, 30)).filter(Boolean).slice(0, 10)
          : [];
        const cleanPhone = phone ? String(phone).replace(/\D/g, '').slice(0, 15) : null;
        const cleanInstagram = instagram ? String(instagram).replace('@', '').trim().slice(0, 40) : null;

        const commVal = commissionPercent !== undefined && commissionPercent !== null ? Number(commissionPercent) : 0;
        if (!Number.isFinite(commVal) || commVal < 0 || commVal > 100) {
          return res.status(400).json({ error: 'El porcentaje de comisión debe estar entre 0 y 100.' });
        }

        const cleanZoneId = zoneId && String(zoneId).trim() ? String(zoneId).trim().slice(0, 64) : null;
        const cleanSchedule = scheduleSummary ? String(scheduleSummary).trim().slice(0, 100) : null;
        const cleanAvatar = avatarUrl ? String(avatarUrl).trim() : null;

        if (cleanAvatar && (cleanAvatar.length > IMAGEN_MAX_CARACTERES || !IMAGEN_VALIDA.test(cleanAvatar))) {
          return res.status(400).json({ error: 'Avatar inválido: usa una ruta propia o una URL https.' });
        }

        if (id !== undefined && id !== null && String(id).trim() !== '') {
          const staffIdStr = String(id).trim();
          if (!ID_VALIDO.test(staffIdStr)) {
            return res.status(400).json({ error: 'ID de especialista inválido.' });
          }
          const owner = await sql`SELECT tenant_id FROM public.staff_members WHERE id = ${staffIdStr} LIMIT 1;`;
          if (owner.length > 0 && String(owner[0].tenant_id).toLowerCase() !== cleanTenant) {
            return res.status(403).json({ error: 'Forbidden: el especialista pertenece a otro salón.' });
          }

          await sql`
            INSERT INTO public.staff_members (
              id, tenant_id, name, role_title, specialty_tags, phone, instagram,
              commission_percent, zone_id, schedule_summary, avatar_url, is_active, updated_at
            ) VALUES (
              ${staffIdStr}, ${cleanTenant}, ${cleanName}, ${cleanRoleTitle}, ${cleanSpecialtyTags},
              ${cleanPhone}, ${cleanInstagram}, ${commVal}, ${cleanZoneId},
              ${cleanSchedule}, ${cleanAvatar}, ${isActive !== undefined ? Boolean(isActive) : true}, NOW()
            )
            ON CONFLICT (id) DO UPDATE SET
              name = EXCLUDED.name,
              role_title = EXCLUDED.role_title,
              specialty_tags = EXCLUDED.specialty_tags,
              phone = EXCLUDED.phone,
              instagram = EXCLUDED.instagram,
              commission_percent = EXCLUDED.commission_percent,
              zone_id = EXCLUDED.zone_id,
              schedule_summary = EXCLUDED.schedule_summary,
              avatar_url = EXCLUDED.avatar_url,
              is_active = EXCLUDED.is_active,
              updated_at = NOW()
            WHERE public.staff_members.tenant_id = ${cleanTenant};
          `;

          return res.status(200).json({ success: true, staffId: staffIdStr });
        } else {
          const newId = `stf_${randomUUID()}`;
          await sql`
            INSERT INTO public.staff_members (
              id, tenant_id, name, role_title, specialty_tags, phone, instagram,
              commission_percent, zone_id, schedule_summary, avatar_url, is_active, updated_at
            ) VALUES (
              ${newId}, ${cleanTenant}, ${cleanName}, ${cleanRoleTitle}, ${cleanSpecialtyTags},
              ${cleanPhone}, ${cleanInstagram}, ${commVal}, ${cleanZoneId},
              ${cleanSchedule}, ${cleanAvatar}, ${isActive !== undefined ? Boolean(isActive) : true}, NOW()
            );
          `;

          return res.status(201).json({ success: true, staffId: newId });
        }
      }

      if (action === 'upsert_zone') {
        const {
          id,
          name,
          department,
          description,
          capacity,
          stationCode,
          isActive,
          sortOrder,
        } = body;

        if (!name || !String(name).trim()) {
          return res.status(400).json({ error: 'Nombre de la zona requerido.' });
        }

        const cleanName = String(name).trim().slice(0, 80);
        const cleanDept = department ? String(department).trim().slice(0, 40) : 'General';
        const cleanDesc = description ? String(description).trim().slice(0, 300) : null;
        const capVal = capacity !== undefined && capacity !== null ? parseInt(String(capacity), 10) : 1;
        const cleanCapacity = Number.isInteger(capVal) && capVal >= 1 && capVal <= 100 ? capVal : 1;
        const cleanStationCode = stationCode ? String(stationCode).trim().slice(0, 20) : null;
        const sortVal = sortOrder !== undefined && sortOrder !== null ? parseInt(String(sortOrder), 10) : 0;
        const cleanSort = Number.isInteger(sortVal) ? sortVal : 0;

        if (id !== undefined && id !== null && String(id).trim() !== '') {
          const zoneIdStr = String(id).trim();
          if (!ID_VALIDO.test(zoneIdStr)) {
            return res.status(400).json({ error: 'ID de zona inválido.' });
          }
          const owner = await sql`SELECT tenant_id FROM public.studio_zones WHERE id = ${zoneIdStr} LIMIT 1;`;
          if (owner.length > 0 && String(owner[0].tenant_id).toLowerCase() !== cleanTenant) {
            return res.status(403).json({ error: 'Forbidden: la zona pertenece a otro salón.' });
          }

          await sql`
            INSERT INTO public.studio_zones (
              id, tenant_id, name, department, description, capacity, station_code, is_active, sort_order, updated_at
            ) VALUES (
              ${zoneIdStr}, ${cleanTenant}, ${cleanName}, ${cleanDept}, ${cleanDesc},
              ${cleanCapacity}, ${cleanStationCode}, ${isActive !== undefined ? Boolean(isActive) : true}, ${cleanSort}, NOW()
            )
            ON CONFLICT (id) DO UPDATE SET
              name = EXCLUDED.name,
              department = EXCLUDED.department,
              description = EXCLUDED.description,
              capacity = EXCLUDED.capacity,
              station_code = EXCLUDED.station_code,
              is_active = EXCLUDED.is_active,
              sort_order = EXCLUDED.sort_order,
              updated_at = NOW()
            WHERE public.studio_zones.tenant_id = ${cleanTenant};
          `;

          return res.status(200).json({ success: true, zoneId: zoneIdStr });
        } else {
          const newId = `zon_${randomUUID()}`;
          await sql`
            INSERT INTO public.studio_zones (
              id, tenant_id, name, department, description, capacity, station_code, is_active, sort_order, updated_at
            ) VALUES (
              ${newId}, ${cleanTenant}, ${cleanName}, ${cleanDept}, ${cleanDesc},
              ${cleanCapacity}, ${cleanStationCode}, ${isActive !== undefined ? Boolean(isActive) : true}, ${cleanSort}, NOW()
            );
          `;

          return res.status(201).json({ success: true, zoneId: newId });
        }
      }

      return res.status(400).json({ error: 'Acción desconocida.' });
    } catch (err: any) {
      console.error('[Neon Upsert Team Error]:', err);
      return res.status(500).json({ error: 'Error al actualizar equipo o zona en base de datos.' });
    }
  }

  // ─── DELETE: Eliminar especialista o zona (?type=staff|zone&id=) ────────────
  if (req.method === 'DELETE') {
    try {
      const type = String(req.query?.type || req.body?.type || '').trim().toLowerCase();
      const id = String(req.query?.id || req.body?.id || '').trim();

      if (!id || (type !== 'staff' && type !== 'zone')) {
        return res.status(400).json({ error: 'Parámetros type (staff|zone) e id requeridos.' });
      }

      // Sesión antes de buscar (401 para anónimos)
      const sesion = await requireSession(req);
      if (sesion.status !== 200) {
        return res.status(sesion.status).json({ error: sesion.error });
      }

      if (type === 'staff') {
        const target = await sql`SELECT id, tenant_id FROM public.staff_members WHERE id = ${id} LIMIT 1;`;
        if (target.length === 0) {
          return res.status(404).json({ error: 'Especialista no encontrado.' });
        }
        const tenant = String(target[0].tenant_id).toLowerCase();
        const authCheck = await requireTenantRole(req, tenant, ['owner', 'admin'], sesion);
        if (authCheck.status !== 200) {
          return res.status(authCheck.status).json({ error: authCheck.error });
        }

        await sql`DELETE FROM public.staff_members WHERE id = ${id} AND tenant_id = ${tenant};`;
        return res.status(200).json({ success: true, deletedId: id, type: 'staff' });
      }

      if (type === 'zone') {
        const target = await sql`SELECT id, tenant_id FROM public.studio_zones WHERE id = ${id} LIMIT 1;`;
        if (target.length === 0) {
          return res.status(404).json({ error: 'Zona no encontrada.' });
        }
        const tenant = String(target[0].tenant_id).toLowerCase();
        const authCheck = await requireTenantRole(req, tenant, ['owner', 'admin'], sesion);
        if (authCheck.status !== 200) {
          return res.status(authCheck.status).json({ error: authCheck.error });
        }

        await sql`DELETE FROM public.studio_zones WHERE id = ${id} AND tenant_id = ${tenant};`;
        return res.status(200).json({ success: true, deletedId: id, type: 'zone' });
      }

      return res.status(400).json({ error: 'Tipo inválido.' });
    } catch (err: any) {
      console.error('[Neon Delete Team Error]:', err);
      return res.status(500).json({ error: 'Error al eliminar registro.' });
    }
  }

  return res.status(405).json({ error: 'Método no permitido.' });
}
