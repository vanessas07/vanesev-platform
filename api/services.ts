// Vercel Serverless Function: /api/services
// Manages catalog services in Neon Serverless Postgres with PostgreSQL 18 RLS enforcement
// Strict multi-tenant isolation: tenant parameter is required; zero cross-tenant default fallback.
import { getDb, executeWithTenantRls } from './_db.js';
import { randomUUID } from 'node:crypto';
import { requireSession, requireTenantRole } from './_session.js';
import { applyCors } from './_cors.js';

// Imágenes: ruta propia (/capra/…, /vanesev/…), https, o la foto subida desde el panel como
// data:image png/jpeg/webp en base64 (máx. ~1,5 MB; el paso a Vercel Blob por salón va en B2).
// Nunca javascript:, http: ni SVG (un SVG puede llevar scripts).
const IMAGEN_VALIDA = /^(\/[A-Za-z0-9/_.-]{1,200}|https:\/\/[^\s"'<>]{1,500}|data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/]+={0,2})$/;
const IMAGEN_MAX_CARACTERES = 2_000_000;
const ID_VALIDO = /^[A-Za-z0-9_-]{1,64}$/;

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  applyCors(req, res);
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST,PUT,DELETE');
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

  // ─── GET: Listar servicios del catálogo (Público con aislamiento por tenant) ─
  if (req.method === 'GET') {
    const rawTenant = req.query?.tenant;
    if (!rawTenant || !String(rawTenant).trim()) {
      return res.status(400).json({ error: 'Parámetro tenant requerido.' });
    }
    const tenantSlug = String(rawTenant).trim().toLowerCase();

    try {
      const rows = await executeWithTenantRls(tenantSlug, (tx) => tx`
        SELECT 
          id,
          tenant_id as "tenantId",
          name,
          category,
          price_usd as "priceUSD",
          duration_minutes as "durationMinutes",
          short_description as "shortDescription",
          full_description as "fullDescription",
          ideal_for as "idealFor",
          image_url as "imageUrl",
          badge_text as "badgeText",
          badge_color as "badgeColor",
          zone_id as "zoneId",
          default_staff_id as "defaultStaffId",
          is_available as "isAvailable",
          tags
        FROM public.services
        WHERE tenant_id = ${tenantSlug}
        ORDER BY price_usd ASC;
      `);

      const normalizeCapraImage = (r: any): string => {
        const raw = String(r.imageUrl || '');
        if (raw.startsWith('/capra/') || raw.startsWith('/vanesev/')) return raw;
        if (String(r.tenantId) !== 'capra-studio') return raw;
        const id = String(r.id || '');
        const lower = `${id} ${r.category || ''} ${r.name || ''}`.toLowerCase();
        if (id === 'capra-srv-1' || lower.includes('henna')) return '/capra/brows-henna.jpg';
        if (id === 'capra-srv-2' || lower.includes('lamination') || lower.includes('laminado')) return '/capra/brow-lamination.jpg';
        if (id === 'capra-srv-3' || lower.includes('lifting')) return '/capra/lash-lifting.jpg';
        if (id === 'capra-srv-4' || lower.includes('extension') || lower.includes('pestaña') || lower.includes('pestana')) return '/capra/lash-extensions.jpg';
        if (id === 'capra-srv-5' || lower.includes('alisado')) return '/capra/hair-straightening.jpg';
        if (id === 'capra-srv-6' || lower.includes('peinado') || lower.includes('onda')) return '/vanesev/sector-hair-color.jpg';
        if (id === 'capra-srv-8' || lower.includes('reina') || lower.includes('novia')) return '/capra/bridal-package.jpg';
        if (id === 'capra-srv-7' || lower.includes('maquillaje')) return '/capra/makeup-blindada.jpg';
        if (id === 'capra-srv-9' || lower.includes('french') || lower.includes('uña') || lower.includes('manicur')) return '/capra/nails-french.jpg';
        if (id === 'capra-srv-10' || lower.includes('pedi')) return '/capra/pedicure-spa.jpg';
        if (id === 'capra-srv-11' || lower.includes('depi')) return '/vanesev/sector-medspa.jpg';
        if (id === 'capra-srv-12' || lower.includes('curso') || lower.includes('academy')) return '/vanesev/hero-atelier.jpg';
        return raw || '/capra/brow-lamination.jpg';
      };

      return res.status(200).json({
        services: rows.map((r: any) => ({
          ...r,
          priceUSD: Number(r.priceUSD) || 0,
          imageUrl: normalizeCapraImage(r),
        })),
        databaseConnected: true,
        rlsEnforced: true,
      });
    } catch (err: any) {
      console.error('[Neon Get Services Error]:', err);
      return res.status(500).json({ error: 'Error al consultar catálogo de servicios.' });
    }
  }

  // ─── POST / PUT: Crear o actualizar servicio (C10: Requiere sesión y rol owner/admin) ───
  if (req.method === 'POST' || req.method === 'PUT') {
    try {
      const {
        id,
        tenantId,
        name,
        category,
        priceUSD,
        durationMinutes,
        shortDescription,
        fullDescription,
        idealFor,
        imageUrl,
        badgeText,
        badgeColor,
        zoneId,
        defaultStaffId,
        isAvailable,
        tags,
      } = req.body || {};

      const rawTenant = tenantId || req.query?.tenant;
      if (!rawTenant || !String(rawTenant).trim()) {
        return res.status(400).json({ error: 'Parámetro tenantId requerido.' });
      }
      const cleanTenant = String(rawTenant).trim().toLowerCase();

      // Validación estricta C10 (§4.2): solo owner o admin pueden modificar catálogo
      const authCheck = await requireTenantRole(req, cleanTenant, ['owner', 'admin']);
      if (authCheck.status !== 200) {
        return res.status(authCheck.status).json({ error: authCheck.error });
      }

      if (!name || !category || priceUSD === undefined) {
        return res.status(400).json({ error: 'Faltan campos obligatorios (nombre, categoría, precio).' });
      }

      // Validación del catálogo: precios y duraciones posibles, textos acotados, imágenes seguras.
      const cleanName = String(name).trim();
      const cleanCategory = String(category).trim();
      const cleanPrice = Number(priceUSD);
      const cleanDuration = durationMinutes === undefined ? 60 : Number(durationMinutes);
      const cleanImage = imageUrl ? String(imageUrl).trim() : '';
      const cleanTags = Array.isArray(tags)
        ? tags.map((t: any) => String(t).trim().slice(0, 30)).filter(Boolean).slice(0, 10)
        : ['Servicio VIP'];
      const available = isAvailable === undefined ? true : Boolean(isAvailable);
      if (cleanName.length < 1 || cleanName.length > 80 || cleanCategory.length < 1 || cleanCategory.length > 40) {
        return res.status(400).json({ error: 'Nombre (1-80) o categoría (1-40) con longitud inválida.' });
      }
      if (!Number.isFinite(cleanPrice) || cleanPrice <= 0 || cleanPrice > 10000) {
        return res.status(400).json({ error: 'Precio inválido: debe ser mayor que 0 y como mucho 10.000 USD.' });
      }
      if (!Number.isInteger(cleanDuration) || cleanDuration < 5 || cleanDuration > 600) {
        return res.status(400).json({ error: 'Duración inválida: entre 5 y 600 minutos.' });
      }
      if (cleanImage && (cleanImage.length > IMAGEN_MAX_CARACTERES || !IMAGEN_VALIDA.test(cleanImage))) {
        return res.status(400).json({ error: 'Imagen inválida: usa una ruta propia o una URL https.' });
      }
      if (id !== undefined && !ID_VALIDO.test(String(id))) {
        return res.status(400).json({ error: 'Id de servicio inválido.' });
      }

      // Un id que ya pertenece a otro salón no se toca: 403 (antes respondía «guardado» sin guardar).
      const serviceId = id ? String(id) : `srv_${randomUUID()}`;
      if (id) {
        const owner = await sql`SELECT tenant_id FROM public.services WHERE id = ${serviceId} LIMIT 1;`;
        if (owner.length > 0 && String(owner[0].tenant_id).toLowerCase() !== cleanTenant) {
          return res.status(403).json({ error: 'Forbidden: el servicio pertenece a otro salón.' });
        }
      }

      await sql`
        INSERT INTO public.services (
          id, tenant_id, name, category, price_usd, duration_minutes,
          short_description, full_description, ideal_for,
          image_url, badge_text, badge_color, zone_id, default_staff_id, is_available, tags, updated_at
        ) VALUES (
          ${serviceId}, ${cleanTenant}, ${cleanName}, ${cleanCategory}, ${cleanPrice}, ${cleanDuration},
          ${String(shortDescription || '').slice(0, 300)}, ${String(fullDescription || '').slice(0, 2000)}, ${String(idealFor || '').slice(0, 300)},
          ${cleanImage}, ${badgeText ? String(badgeText).slice(0, 40) : null}, ${/^[a-z0-9 -]{1,40}$/.test(String(badgeColor || '')) ? badgeColor : 'bg-sage-800'},
          ${zoneId || null}, ${defaultStaffId || null}, ${available}, ${cleanTags}, NOW()
        )
        ON CONFLICT (id) DO UPDATE SET
          name = EXCLUDED.name,
          category = EXCLUDED.category,
          price_usd = EXCLUDED.price_usd,
          duration_minutes = EXCLUDED.duration_minutes,
          short_description = EXCLUDED.short_description,
          full_description = EXCLUDED.full_description,
          ideal_for = EXCLUDED.ideal_for,
          image_url = EXCLUDED.image_url,
          badge_text = EXCLUDED.badge_text,
          badge_color = EXCLUDED.badge_color,
          zone_id = EXCLUDED.zone_id,
          default_staff_id = EXCLUDED.default_staff_id,
          is_available = EXCLUDED.is_available,
          tags = EXCLUDED.tags,
          updated_at = NOW()
        WHERE public.services.tenant_id = ${cleanTenant};
      `;

      return res.status(200).json({
        success: true,
        message: 'Servicio guardado exitosamente en Neon.',
        serviceId,
      });
    } catch (err: any) {
      console.error('[Neon Upsert Service Error]:', err);
      return res.status(500).json({ error: 'Error al actualizar servicio en base de datos.' });
    }
  }

  // ─── DELETE: Eliminar servicio (C10: Requiere sesión y rol owner/admin) ──────
  if (req.method === 'DELETE') {
    try {
      const { id } = req.query || req.body || {};
      if (!id) {
        return res.status(400).json({ error: 'ID de servicio requerido.' });
      }

      const cleanId = String(id).trim();

      // Sesión antes de buscar: 401 para anónimos, sin revelar qué servicios existen.
      const sesion = await requireSession(req);
      if (sesion.status !== 200) {
        return res.status(sesion.status).json({ error: sesion.error });
      }

      // C10 (§4.2): Carga el servicio de la BD para tomar su tenant_id
      const targetService = await sql`
        SELECT id, tenant_id 
        FROM public.services 
        WHERE id = ${cleanId} 
        LIMIT 1;
      `;

      if (targetService.length === 0) {
        return res.status(404).json({ error: 'Servicio no encontrado.' });
      }

      const serviceTenant = String(targetService[0].tenant_id).toLowerCase();

      // Validación estricta de sesión y rol owner/admin
      const authCheck = await requireTenantRole(req, serviceTenant, ['owner', 'admin'], sesion);
      if (authCheck.status !== 200) {
        return res.status(authCheck.status).json({ error: authCheck.error });
      }

      await sql`
        DELETE FROM public.services 
        WHERE id = ${cleanId} AND tenant_id = ${serviceTenant};
      `;

      return res.status(200).json({ success: true, deletedId: cleanId });
    } catch (err: any) {
      console.error('[Neon Delete Service Error]:', err);
      return res.status(500).json({ error: 'Error al eliminar servicio.' });
    }
  }

  return res.status(405).json({ error: 'Método no permitido.' });
}
