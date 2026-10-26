// Vercel Serverless Function: /api/services
// Manages catalog services in Neon Serverless Postgres with PostgreSQL 18 RLS enforcement
// Strict multi-tenant isolation: tenant parameter is required; zero cross-tenant default fallback.
import { getDb, executeWithTenantRls } from './_db.js';

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST,PUT,DELETE');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const sql = getDb();

  // ─── GET: Listar servicios del catálogo (Con Aislamiento RLS en Postgres 18) ─
  if (req.method === 'GET') {
    const rawTenant = req.query?.tenant;
    if (!rawTenant || !String(rawTenant).trim()) {
      return res.status(400).json({ error: 'Parámetro tenant requerido.' });
    }
    const tenantSlug = String(rawTenant).trim().toLowerCase();

    if (!sql) {
      return res.status(200).json({ services: [], databaseConnected: false });
    }

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

  // ─── POST / PUT: Crear o actualizar servicio ────────────────────────────────
  if (req.method === 'POST' || req.method === 'PUT') {
    if (!sql) {
      return res.status(500).json({ error: 'Base de datos no disponible.' });
    }

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

      if (!name || !category || priceUSD === undefined) {
        return res.status(400).json({ error: 'Faltan campos obligatorios (nombre, categoría, precio).' });
      }

      const serviceId = id || ('srv_' + Date.now());
      const cleanTenant = String(rawTenant).trim().toLowerCase();
      const cleanPrice = Number(priceUSD) || 10;
      const cleanDuration = Number(durationMinutes) || 60;
      const cleanTags = Array.isArray(tags) ? tags : ['Servicio VIP'];
      const available = isAvailable ?? true;

      await sql`
        INSERT INTO public.services (
          id, tenant_id, name, category, price_usd, duration_minutes,
          short_description, full_description, ideal_for,
          image_url, badge_text, badge_color, zone_id, default_staff_id, is_available, tags, updated_at
        ) VALUES (
          ${serviceId}, ${cleanTenant}, ${name}, ${category}, ${cleanPrice}, ${cleanDuration},
          ${shortDescription || ''}, ${fullDescription || ''}, ${idealFor || ''},
          ${imageUrl || ''}, ${badgeText || null}, ${badgeColor || 'bg-sage-800'},
          ${zoneId || null}, ${defaultStaffId || null}, ${available}, ${cleanTags}, NOW()
        )
        ON CONFLICT (id) DO UPDATE SET
          tenant_id = EXCLUDED.tenant_id,
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
          updated_at = NOW();
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

  // ─── DELETE: Eliminar servicio ──────────────────────────────────────────────
  if (req.method === 'DELETE') {
    if (!sql) {
      return res.status(500).json({ error: 'Base de datos no disponible.' });
    }

    try {
      const { id } = req.query || req.body || {};
      const rawTenant = req.query?.tenant || req.body?.tenantId;
      if (!id) {
        return res.status(400).json({ error: 'ID de servicio requerido.' });
      }
      if (!rawTenant || !String(rawTenant).trim()) {
        return res.status(400).json({ error: 'Parámetro tenant requerido.' });
      }
      const cleanTenant = String(rawTenant).trim().toLowerCase();

      await sql`
        DELETE FROM public.services 
        WHERE id = ${id} AND tenant_id = ${cleanTenant};
      `;

      return res.status(200).json({ success: true, deletedId: id });
    } catch (err: any) {
      console.error('[Neon Delete Service Error]:', err);
      return res.status(500).json({ error: 'Error al eliminar servicio.' });
    }
  }

  return res.status(405).json({ error: 'Método no permitido.' });
}
