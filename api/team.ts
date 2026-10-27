// Vercel Serverless Function: /api/team
// Manages salon staff members and studio zones in Neon Serverless Postgres
import { randomUUID } from 'node:crypto';
import { getDb } from './_db.js';
import { requireSession, requireTenantRole } from './_session.js';
import { applyCors } from './_cors.js';

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

      const [staffRows, zoneRows] = await Promise.all([
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
        databaseConnected: true,
      });
    } catch (err: any) {
      console.error('[Neon Get Team Error]:', err);
      return res.status(500).json({ error: 'Error al consultar equipo del salón.' });
    }
  }

  // ─── POST: Crear o actualizar especialista o zona (owner/admin) ─────────────
  if (req.method === 'POST') {
    try {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
      const { action, tenantId } = body;

      const rawTenant = tenantId || req.query?.tenant;
      if (!rawTenant || !String(rawTenant).trim()) {
        return res.status(400).json({ error: 'Parámetro tenantId requerido.' });
      }
      const cleanTenant = String(rawTenant).trim().toLowerCase();

      const authCheck = await requireTenantRole(req, cleanTenant, ['owner', 'admin']);
      if (authCheck.status !== 200) {
        return res.status(authCheck.status).json({ error: authCheck.error });
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

      return res.status(400).json({ error: 'Acción desconocida (debe ser upsert_staff o upsert_zone).' });
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
