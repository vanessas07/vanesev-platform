// Vercel Serverless Function: /api/qr
// Motor de QR dinámicos de VANESEV, con el mismo diseño que el de DKitchen (/r/ del local, /q/ de campaña):
//  - Lo impreso apunta a /r/<codigo> (salón) o /q/<codigo> (campaña de VANESEV), nunca al destino final:
//    el destino se cambia sin reimprimir y cada escaneo se cuenta.
//  - Redirección 302 y Cache-Control: no-store: un 301 o una copia en caché dejan de contar escaneos.
//  - Destinos solo internos (/ruta, nunca //dominio ni http): vanesev.com no puede usarse para phishing.
//    Un salón solo apunta a sus propias páginas; las campañas solo se editan desde Central.
//  - Freno de 30 resoluciones por minuto e IP, contado en Neon (cada función serverless tiene su memoria).
//  - La IP se guarda como HMAC con IP_HASH_PEPPER: un hash simple de una IPv4 se revierte en segundos.
import { randomUUID } from 'node:crypto';
import { getDb } from './_db.js';
import { requireCentral, requireSession, requireTenantRole } from './_session.js';
import { claveDeLimite, huella, ipDeLaPeticion, limiteSuperado } from './_limite.js';
import { applyCors } from './_cors.js';

const CODIGO_VALIDO = /^[a-z0-9-]{3,32}$/;
// Misma regla que las restricciones de la migración 0006: empieza por una sola «/».
const DESTINO_INTERNO = /^\/([A-Za-z0-9_?&=%.,#-][A-Za-z0-9/_?&=%.,#-]*)?$/;
const LIMITE_POR_IP = 30;
const VENTANA_SEGUNDOS = 60;

function detectDevice(userAgent: string): string {
  const ua = (userAgent || '').toLowerCase();
  if (/ipad|tablet|(android(?!.*mobile))/i.test(ua)) return 'tablet';
  if (/mobile|iphone|ipod|android|blackberry|opera mini|iemobile/i.test(ua)) return 'mobile';
  return 'desktop';
}

function destinoInternoValido(destino: string): boolean {
  return destino.length <= 300 && DESTINO_INTERNO.test(destino);
}

/** Un salón solo puede apuntar a sus propias páginas: /<slug> o /m/<slug>, y lo que cuelgue de ellas. */
function destinoDelSalon(destino: string, tenant: string): boolean {
  if (!destinoInternoValido(destino)) return false;
  return [`/${tenant}`, `/m/${tenant}`].some(
    (base) => destino === base || (destino.startsWith(base) && /^[/?#]/.test(destino.slice(base.length, base.length + 1)))
  );
}

/** Añade ?qr=<codigo> al destino (antes del #) para atribuir los clics al QR. */
function conAtribucion(destino: string, codigo: string): string {
  const url = new URL(destino, 'https://vanesev.com');
  url.searchParams.set('qr', codigo);
  return `${url.pathname}${url.search}${url.hash}`;
}

function redirigir(res: any, destino: string) {
  res.writeHead(302, {
    Location: destino,
    'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
  });
  return res.end();
}

// ─── Resolución pública de un QR (salón o campaña) ──────────────────────────────
async function resolver(req: any, res: any, tipo: 'salon' | 'campana') {
  const codigo = String(req.query?.code || '').trim().replace(/^\/+/, '').toLowerCase();
  if (!CODIGO_VALIDO.test(codigo)) return redirigir(res, '/');

  const sql = getDb();
  if (!sql) return redirigir(res, '/');

  try {
    const ip = ipDeLaPeticion(req);
    if (await limiteSuperado(claveDeLimite('qr', ip), LIMITE_POR_IP, VENTANA_SEGUNDOS)) {
      res.setHeader('Cache-Control', 'no-store');
      res.setHeader('Retry-After', '30');
      return res.status(429).send('Demasiadas peticiones. Inténtalo de nuevo en un momento.');
    }

    if (tipo === 'campana') {
      const filas = await sql`
        SELECT destino FROM public.qr_campanas WHERE codigo = ${codigo} AND activo LIMIT 1;
      `;
      const destino = String(filas[0]?.destino || '');
      if (!destino || !destinoInternoValido(destino)) return redirigir(res, '/');
      await sql`INSERT INTO public.qr_campana_eventos (codigo, tipo) VALUES (${codigo}, 'escaneo');`;
      return redirigir(res, conAtribucion(destino, codigo));
    }

    const filas = await sql`
      SELECT code, tenant_id, target_url FROM public.qr_codes
      WHERE code = ${codigo} AND is_active = true
      LIMIT 1;
    `;
    const qr = filas[0];
    const destino = String(qr?.target_url || '');
    if (!qr || !destinoInternoValido(destino)) return redirigir(res, '/');

    // El escaneo se registra ANTES de responder: tras la respuesta, Vercel puede congelar la función.
    const userAgent = String(req.headers['user-agent'] || '').slice(0, 300);
    await Promise.all([
      sql`
        INSERT INTO public.qr_scans (code, tenant_id, user_agent, referer, ip_hash, device_type, country)
        VALUES (${qr.code}, ${qr.tenant_id}, ${userAgent}, ${String(req.headers['referer'] || '').slice(0, 300)},
                ${huella(ip)}, ${detectDevice(userAgent)}, ${String(req.headers['x-vercel-ip-country'] || 'Desconocido').slice(0, 8)});
      `,
      sql`UPDATE public.qr_codes SET scan_count = scan_count + 1, updated_at = now() WHERE code = ${qr.code} AND tenant_id = ${qr.tenant_id};`,
    ]);
    return redirigir(res, conAtribucion(destino, codigo));
  } catch (err: any) {
    console.error('[QR] No se pudo resolver el código:', err?.message || 'Error desconocido');
    return redirigir(res, '/');
  }
}

export default async function handler(req: any, res: any) {
  if (req.method === 'GET' && req.query?.mode === 'redirect') return resolver(req, res, 'salon');
  if (req.method === 'GET' && req.query?.mode === 'campaign') return resolver(req, res, 'campana');

  // ─── API de gestión (admin del salón y Central) ───────────────────────────────
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  applyCors(req, res);
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const sql = getDb();
  if (!sql) {
    return res.status(503).json({ error: 'Base de datos no disponible.' });
  }

  try {
    if (req.method === 'GET') {
      // Campañas de VANESEV: solo Central.
      if (req.query?.scope === 'campaigns') {
        const central = await requireCentral(req);
        if (central.status !== 200) return res.status(central.status).json({ error: central.error });
        const campanas = await sql`
          SELECT c.codigo, c.nombre, c.destino, c.activo, c.actualizado_en AS "actualizadoEn",
                 COUNT(e.id) FILTER (WHERE e.tipo = 'escaneo')::int AS escaneos
          FROM public.qr_campanas c
          LEFT JOIN public.qr_campana_eventos e ON e.codigo = c.codigo
          GROUP BY c.codigo
          ORDER BY c.creado_en DESC;
        `;
        return res.status(200).json({ campaigns: campanas });
      }

      const tenant = req.query?.tenant ? String(req.query.tenant).trim().toLowerCase() : '';
      if (!tenant) {
        return res.status(400).json({ error: 'Parámetro tenant requerido.' });
      }
      const authCheck = await requireTenantRole(req, tenant, ['owner', 'admin', 'staff']);
      if (authCheck.status !== 200) {
        return res.status(authCheck.status).json({ error: authCheck.error });
      }

      const [qrCodes, statsToday, recentScans] = await Promise.all([
        sql`
          SELECT id, code, tenant_id AS "tenantId", label, target_url AS "targetUrl", scan_count AS "scanCount",
                 is_active AS "isActive", created_at AS "createdAt", updated_at AS "updatedAt"
          FROM public.qr_codes
          WHERE tenant_id = ${tenant}
          ORDER BY created_at DESC;
        `,
        sql`
          SELECT COUNT(*)::int AS count_today FROM public.qr_scans
          WHERE tenant_id = ${tenant} AND scanned_at >= CURRENT_DATE;
        `,
        sql`
          SELECT id, code, device_type AS "deviceType", country, scanned_at AS "scannedAt"
          FROM public.qr_scans
          WHERE tenant_id = ${tenant}
          ORDER BY scanned_at DESC
          LIMIT 50;
        `,
      ]);
      const totalScans = qrCodes.reduce((sum: number, q: any) => sum + (Number(q.scanCount) || 0), 0);

      return res.status(200).json({
        qrCodes,
        totalScans,
        scansToday: statsToday[0]?.count_today || 0,
        recentScans,
      });
    }

    if (req.method === 'POST') {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
      const { action } = body;

      // ── Campañas de VANESEV (solo Central) ──
      if (action === 'campaign_upsert' || action === 'campaign_toggle') {
        const central = await requireCentral(req);
        if (central.status !== 200) return res.status(central.status).json({ error: central.error });

        const codigo = String(body.code || '').trim().toLowerCase();
        if (!CODIGO_VALIDO.test(codigo)) {
          return res.status(400).json({ error: 'Código inválido: 3-32 caracteres a-z, 0-9 o guion.' });
        }

        if (action === 'campaign_toggle') {
          const filas = await sql`
            UPDATE public.qr_campanas SET activo = ${Boolean(body.isActive)}, actualizado_en = now()
            WHERE codigo = ${codigo}
            RETURNING codigo, nombre, destino, activo;
          `;
          if (filas.length === 0) return res.status(404).json({ error: 'Campaña no encontrada.' });
          return res.status(200).json({ success: true, campaign: filas[0] });
        }

        const nombre = String(body.name || '').trim();
        const destino = String(body.targetUrl || '').trim();
        if (nombre.length < 1 || nombre.length > 80) {
          return res.status(400).json({ error: 'Nombre de campaña inválido (1-80 caracteres).' });
        }
        if (!destinoInternoValido(destino)) {
          return res.status(400).json({ error: 'Destino inválido: solo rutas internas de vanesev.com (empiezan por una sola «/»).' });
        }
        const filas = await sql`
          INSERT INTO public.qr_campanas (codigo, nombre, destino)
          VALUES (${codigo}, ${nombre}, ${destino})
          ON CONFLICT (codigo) DO UPDATE SET nombre = EXCLUDED.nombre, destino = EXCLUDED.destino, actualizado_en = now()
          RETURNING codigo, nombre, destino, activo;
        `;
        return res.status(200).json({ success: true, campaign: filas[0] });
      }

      // ── QR de un salón ──
      if (action === 'create') {
        const cleanTenant = String(body.tenantId || '').trim().toLowerCase();
        const authCheck = await requireTenantRole(req, cleanTenant, ['owner', 'admin']);
        if (authCheck.status !== 200) {
          return res.status(authCheck.status).json({ error: authCheck.error });
        }

        const cleanCode = String(body.code || '').trim().toLowerCase();
        const cleanTarget = String(body.targetUrl || '').trim();
        const cleanLabel = String(body.label || cleanCode).trim().slice(0, 80);
        if (!CODIGO_VALIDO.test(cleanCode)) {
          return res.status(400).json({ error: 'Código inválido: 3-32 caracteres a-z, 0-9 o guion.' });
        }
        if (!destinoDelSalon(cleanTarget, cleanTenant)) {
          return res.status(400).json({ error: `Destino inválido: debe ser una página del salón (/${cleanTenant} o /m/${cleanTenant}).` });
        }

        const creado = await sql`
          INSERT INTO public.qr_codes (id, code, tenant_id, label, target_url, is_active)
          VALUES (${`qr_${randomUUID()}`}, ${cleanCode}, ${cleanTenant}, ${cleanLabel}, ${cleanTarget}, true)
          ON CONFLICT (code) DO NOTHING
          RETURNING id, code, tenant_id AS "tenantId", label, target_url AS "targetUrl", is_active AS "isActive";
        `;
        if (creado.length === 0) {
          return res.status(409).json({ error: 'Ese código ya existe. Elige otro.' });
        }
        return res.status(200).json({ success: true, qr: creado[0] });
      }

      if (action === 'update_target' || action === 'toggle_active') {
        // Sesión antes de buscar: un anónimo recibe 401 sin saber qué códigos existen.
        const sesion = await requireSession(req);
        if (sesion.status !== 200) {
          return res.status(sesion.status).json({ error: sesion.error });
        }

        const cleanCode = String(body.code || '').trim().toLowerCase();
        if (!CODIGO_VALIDO.test(cleanCode)) {
          return res.status(400).json({ error: 'Código inválido.' });
        }
        const targetQr = await sql`SELECT tenant_id FROM public.qr_codes WHERE code = ${cleanCode} LIMIT 1;`;
        if (targetQr.length === 0) {
          return res.status(404).json({ error: 'QR no encontrado.' });
        }
        const qrTenant = String(targetQr[0].tenant_id).toLowerCase();
        const authCheck = await requireTenantRole(req, qrTenant, ['owner', 'admin'], sesion);
        if (authCheck.status !== 200) {
          return res.status(authCheck.status).json({ error: authCheck.error });
        }

        if (action === 'toggle_active') {
          const updated = await sql`
            UPDATE public.qr_codes SET is_active = ${Boolean(body.isActive)}, updated_at = now()
            WHERE code = ${cleanCode} AND tenant_id = ${qrTenant}
            RETURNING id, code, tenant_id AS "tenantId", label, target_url AS "targetUrl", is_active AS "isActive";
          `;
          return res.status(200).json({ success: true, qr: updated[0] });
        }

        const cleanTarget = String(body.targetUrl || '').trim();
        if (!destinoDelSalon(cleanTarget, qrTenant)) {
          return res.status(400).json({ error: `Destino inválido: debe ser una página del salón (/${qrTenant} o /m/${qrTenant}).` });
        }
        const updated = await sql`
          UPDATE public.qr_codes
          SET target_url = ${cleanTarget},
              label = COALESCE(${body.label ? String(body.label).trim().slice(0, 80) : null}, label),
              updated_at = now()
          WHERE code = ${cleanCode} AND tenant_id = ${qrTenant}
          RETURNING id, code, tenant_id AS "tenantId", label, target_url AS "targetUrl", is_active AS "isActive";
        `;
        return res.status(200).json({ success: true, qr: updated[0] });
      }

      return res.status(400).json({ error: 'Acción desconocida.' });
    }

    return res.status(405).json({ error: 'Método no permitido.' });
  } catch (err: any) {
    console.error('[API QR Error]:', err?.message || 'Error desconocido');
    return res.status(500).json({ error: 'Error interno en QR.' });
  }
}
