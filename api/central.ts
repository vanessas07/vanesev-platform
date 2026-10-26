// Vercel Serverless Function: /api/central
// Hardened Public Endpoint: Only mode=tenant_context with strict whitelist is exposed
// All other Central views (GET/POST) return 401 until Bloque 1 v2 is verified and promoted.
import { neon } from '@neondatabase/serverless';

function getDb() {
  const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  if (!connectionString) return null;
  return neon(connectionString);
}

export default async function handler(req: any, res: any) {
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // 1. Cierre de seguridad: Cualquier petición que no sea GET responde 401
  if (req.method !== 'GET') {
    return res.status(401).json({ error: 'Acceso no autorizado. Central se encuentra restringida.' });
  }

  const mode = String(req.query?.mode || '');
  const tenantSlug = String(req.query?.tenant || '').trim().toLowerCase();

  // 2. Cierre de seguridad: Cualquier GET que no sea mode=tenant_context responde 401
  if (mode !== 'tenant_context' || !tenantSlug) {
    return res.status(401).json({ error: 'Acceso no autorizado. Central se encuentra restringida.' });
  }

  const sql = getDb();
  if (!sql) {
    return res.status(503).json({ error: 'Neon Database connection not configured.' });
  }

  try {
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

    // ─── LISTA BLANCA ESTRICTA DE CAMPOS PÚBLICOS DEL TENANT ──────────────────
    // Permitidos: id, business_name, niche, slogan, city, address, business_hours,
    // whatsapp_phone, instagram_handle, temas/colores, exchange_rate_bs,
    // loyalty_stamps_target, loyalty_reward_title, first_visit_discount_usd, hero_*, logo_url.
    // NUNCA: owner_email, owner_name, plan_type, subscription_status, monthly_fee_usd, is_lifetime_free, payment_methods_config.
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

    // ─── LISTA BLANCA ESTRICTA DE CAMPOS PÚBLICOS DEL STAFF ───────────────────
    // Permitidos: id, name, role_title, specialty_tags, avatar_url, rating, zone_id, is_active.
    // NUNCA: phone, email, commission_percent.
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
  } catch (err: any) {
    console.error('Error in /api/central:', err);
    return res.status(500).json({ error: 'Error interno al consultar contexto del salón.' });
  }
}
