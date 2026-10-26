import { getDb } from './_db.js';

export default async function handler(req: any, res: any) {
  const queryTenant = typeof req.query.tenant === 'string' ? req.query.tenant.trim().toLowerCase() : '';

  res.setHeader('Content-Type', 'application/manifest+json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');

  // Si no se especifica un salón explícito, devolver manifiesto neutro de navegador para VANESEV (nunca PWA instalable ni de ningún cliente)
  if (!queryTenant || queryTenant === 'vanesev' || queryTenant === 'saas' || queryTenant === 'central') {
    return res.status(200).json({
      name: 'VANESEV',
      short_name: 'VANESEV',
      description: 'Plataforma integral para salones de belleza, clínicas estéticas, spas y barberías.',
      start_url: '/',
      display: 'browser',
      background_color: '#FAF7F2',
      theme_color: '#FAF7F2',
      icons: [
        {
          src: '/favicon.svg',
          sizes: 'any',
          type: 'image/svg+xml',
        },
      ],
    });
  }

  const tenantSlug = queryTenant === 'capra' ? 'capra-studio' : queryTenant;

  let name = `Salón ${tenantSlug}`;
  let shortName = tenantSlug.slice(0, 18);
  let themeColor = '#5B2A6E';
  let bgColor = '#FAF7F2';
  let description = 'Reserva online, catálogo de servicios y tarjeta de fidelización VIP.';
  const startUrl = `/m/${tenantSlug}`;

  const sql = getDb();
  if (sql) {
    try {
      const rows = await sql`
        SELECT business_name, custom_subdomain, primary_color, secondary_color, slogan, bg_color
        FROM public.tenants
        WHERE id = ${tenantSlug} OR custom_subdomain = ${tenantSlug}
        LIMIT 1;
      `;
      if (rows.length > 0) {
        const t = rows[0];
        name = t.business_name || name;
        shortName = String(t.business_name || shortName).slice(0, 18);
        themeColor = t.primary_color || themeColor;
        bgColor = t.bg_color || bgColor;
        description = t.slogan || description;
      }
    } catch {
      // Fallback seguro si la base de datos no responde
    }
  }

  const icons = [
    {
      src: '/favicon.svg',
      sizes: 'any',
      type: 'image/svg+xml',
      purpose: 'any maskable',
    },
  ];

  const manifest = {
    name,
    short_name: shortName,
    description,
    start_url: startUrl,
    display: 'standalone',
    background_color: bgColor,
    theme_color: themeColor,
    orientation: 'portrait-primary',
    lang: 'es-VE',
    icons,
  };

  return res.status(200).json(manifest);
}
