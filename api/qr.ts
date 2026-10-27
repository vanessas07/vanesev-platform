// Vercel Serverless Function: /api/qr
// Unified Management API & Ultra-Fast Dynamic QR Redirect Engine for VANESEV
// Reference architecture: https://www.javiggil.com/56fc9cb32b97
// 100% Editable target destination with zero re-printing of physical QR codes
import { getDb } from './_db.js';
import { requireTenantRole } from './_session.js';
import { applyCors } from './_cors.js';

function detectDevice(userAgent: string): string {
  const ua = (userAgent || '').toLowerCase();
  if (/ipad|tablet|(android(?!.*mobile))/i.test(ua)) return 'tablet';
  if (/mobile|iphone|ipod|android|blackberry|opera mini|iemobile/i.test(ua)) return 'mobile';
  return 'desktop';
}

function hashIp(ip: string): string {
  if (!ip) return 'anonymous';
  let hash = 0;
  for (let i = 0; i < ip.length; i++) {
    hash = (hash << 5) - hash + ip.charCodeAt(i);
    hash |= 0;
  }
  return 'ip_' + Math.abs(hash).toString(16);
}

export default async function handler(req: any, res: any) {
  // Check if this is a Dynamic 302 Redirect Request (/r/:code -> /api/qr?mode=redirect&code=:code)
  const isRedirect =
    req.query?.mode === 'redirect' ||
    Boolean(req.query?.code && !req.query?.tenant && req.method === 'GET' && !req.query?.action);

  if (isRedirect) {
    // Prevent any intermediary or browser cache so 100% of scans are tracked in real-time
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');

    const rawCode = String(req.query?.code || req.query?.c || '').trim();
    const cleanCode = rawCode.replace(/^\/+/, '').toLowerCase();

    // Fallback destination if code is missing
    if (!cleanCode) {
      res.writeHead(302, { Location: '/' });
      return res.end();
    }

    const sql = getDb();
    if (!sql) {
      const fallback = cleanCode.startsWith('capra')
        ? '/capra-studio'
        : cleanCode.startsWith('andrea')
        ? '/andrea-nails'
        : '/';
      res.writeHead(302, { Location: fallback });
      return res.end();
    }

    try {
      const rows = await sql`
        SELECT id, code, tenant_id, target_url, is_active
        FROM public.qr_codes
        WHERE LOWER(code) = ${cleanCode}
        LIMIT 1;
      `;

      const qr = rows[0] || null;

      if (!qr || qr.is_active === false) {
        const fallback = cleanCode.startsWith('capra')
          ? '/capra-studio'
          : cleanCode.startsWith('andrea')
          ? '/andrea-nails'
          : '/';
        res.writeHead(302, { Location: fallback });
        return res.end();
      }

      // Metadata for Real-Time Analytics
      const userAgent = String(req.headers['user-agent'] || '');
      const referer = String(req.headers['referer'] || '');
      const rawIp = String(
        req.headers['x-forwarded-for'] ||
        req.headers['x-real-ip'] ||
        req.socket?.remoteAddress ||
        ''
      ).split(',')[0].trim();

      const deviceType = detectDevice(userAgent);
      const ipHash = hashIp(rawIp);
      const country = String(req.headers['x-vercel-ip-country'] || 'Desconocido');

      // Asynchronously log scan & increment counter in parallel
      Promise.all([
        sql`
          INSERT INTO public.qr_scans (code, tenant_id, user_agent, referer, ip_hash, device_type, country)
          VALUES (${qr.code}, ${qr.tenant_id}, ${userAgent.slice(0, 500)}, ${referer.slice(0, 500)}, ${ipHash}, ${deviceType}, ${country});
        `,
        sql`
          UPDATE public.qr_codes
          SET scan_count = scan_count + 1, updated_at = now()
          WHERE code = ${qr.code};
        `
      ]).catch((err) => {
        console.error('[QR Scan Track Error]:', err);
      });

      // Resolve Target Destination (relative or absolute)
      let destination = qr.target_url || '/';
      if (!destination.startsWith('http://') && !destination.startsWith('https://')) {
        if (!destination.startsWith('/')) {
          destination = '/' + destination;
        }
      }

      // Send HTTP 302 Found (NEVER 301, as explained in the architecture spec)
      res.writeHead(302, { Location: destination });
      return res.end();
    } catch (err: any) {
      console.error('[QR Redirect Error]:', err);
      const fallback = cleanCode.startsWith('capra')
        ? '/capra-studio'
        : cleanCode.startsWith('andrea')
        ? '/andrea-nails'
        : '/';
      res.writeHead(302, { Location: fallback });
      return res.end();
    }
  }

  // ─── MANAGEMENT API (Admin & Central Studio Operations) ────────────────────
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  applyCors(req, res);
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST,PATCH,DELETE');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const sql = getDb();
  if (!sql) {
    return res.status(503).json({ error: 'Neon Database connection not configured.' });
  }

  try {
    // ─── GET: Fetch QR Codes & Scan Stats (Aislado por tenant) ───────────────
    if (req.method === 'GET') {
      const tenant = req.query?.tenant ? String(req.query.tenant).trim().toLowerCase() : '';
      if (!tenant) {
        return res.status(400).json({ error: 'Parámetro tenant requerido.' });
      }

      // Require session & tenant role
      const authCheck = await requireTenantRole(req, tenant, ['owner', 'admin', 'staff']);
      if (authCheck.status !== 200) {
        return res.status(authCheck.status).json({ error: authCheck.error });
      }

      const qrCodes = await sql`
        SELECT 
          id,
          code,
          tenant_id as "tenantId",
          label,
          target_url as "targetUrl",
          scan_count as "scanCount",
          is_active as "isActive",
          created_at as "createdAt",
          updated_at as "updatedAt"
        FROM public.qr_codes
        WHERE tenant_id = ${tenant}
        ORDER BY created_at DESC;
      `;

      const statsToday = await sql`
        SELECT COUNT(*)::int as count_today
        FROM public.qr_scans
        WHERE tenant_id = ${tenant} AND scanned_at >= CURRENT_DATE;
      `;

      const recentScans = await sql`
        SELECT 
          id,
          code,
          device_type as "deviceType",
          country,
          scanned_at as "scannedAt"
        FROM public.qr_scans
        WHERE tenant_id = ${tenant}
        ORDER BY scanned_at DESC
        LIMIT 50;
      `;

      const totalScans = qrCodes.reduce((sum: number, q: any) => sum + (Number(q.scanCount) || 0), 0);

      return res.status(200).json({
        qrCodes,
        totalScans,
        scansToday: statsToday[0]?.count_today || 0,
        recentScans,
      });
    }

    // ─── POST: Create or Update QR Code Destination (C10: Requiere sesión y rol owner/admin) ───
    if (req.method === 'POST') {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
      const { action } = body;

      // 1. Update Destination URL in real-time (no re-print required)
      if (action === 'update_target') {
        const { code, targetUrl, label } = body;
        if (!code || !targetUrl) {
          return res.status(400).json({ error: 'code and targetUrl are required' });
        }

        const cleanCode = String(code).trim().toLowerCase();
        const cleanTarget = String(targetUrl).trim();

        const targetQr = await sql`
          SELECT id, tenant_id FROM public.qr_codes WHERE LOWER(code) = ${cleanCode} LIMIT 1;
        `;
        if (targetQr.length === 0) {
          return res.status(404).json({ error: 'QR Code not found' });
        }

        const qrTenant = String(targetQr[0].tenant_id).toLowerCase();
        const authCheck = await requireTenantRole(req, qrTenant, ['owner', 'admin']);
        if (authCheck.status !== 200) {
          return res.status(authCheck.status).json({ error: authCheck.error });
        }

        const updated = await sql`
          UPDATE public.qr_codes
          SET target_url = ${cleanTarget},
              label = COALESCE(${label ? String(label).trim() : null}, label),
              updated_at = now()
          WHERE LOWER(code) = ${cleanCode} AND tenant_id = ${qrTenant}
          RETURNING *;
        `;

        return res.status(200).json({ success: true, qr: updated[0] });
      }

      // 2. Create new dynamic QR Code
      if (action === 'create') {
        const { code, tenantId, label, targetUrl } = body;
        if (!code || !tenantId || !targetUrl) {
          return res.status(400).json({ error: 'code, tenantId, and targetUrl are required' });
        }

        const cleanTenant = String(tenantId).trim().toLowerCase();
        const authCheck = await requireTenantRole(req, cleanTenant, ['owner', 'admin']);
        if (authCheck.status !== 200) {
          return res.status(authCheck.status).json({ error: authCheck.error });
        }

        const cleanCode = String(code).trim().toLowerCase().replace(/[^a-z0-9_-]/g, '');
        const cleanTarget = String(targetUrl).trim();
        const cleanLabel = String(label || cleanCode).trim();

        const created = await sql`
          INSERT INTO public.qr_codes (code, tenant_id, label, target_url, is_active)
          VALUES (${cleanCode}, ${cleanTenant}, ${cleanLabel}, ${cleanTarget}, true)
          ON CONFLICT (code) DO UPDATE
          SET target_url = EXCLUDED.target_url,
              label = EXCLUDED.label,
              updated_at = now()
          WHERE public.qr_codes.tenant_id = ${cleanTenant}
          RETURNING *;
        `;

        return res.status(200).json({ success: true, qr: created[0] });
      }

      // 3. Toggle Active Status
      if (action === 'toggle_active') {
        const { code, isActive } = body;
        const cleanCode = String(code).trim().toLowerCase();

        const targetQr = await sql`
          SELECT id, tenant_id FROM public.qr_codes WHERE LOWER(code) = ${cleanCode} LIMIT 1;
        `;
        if (targetQr.length === 0) {
          return res.status(404).json({ error: 'QR Code not found' });
        }

        const qrTenant = String(targetQr[0].tenant_id).toLowerCase();
        const authCheck = await requireTenantRole(req, qrTenant, ['owner', 'admin']);
        if (authCheck.status !== 200) {
          return res.status(authCheck.status).json({ error: authCheck.error });
        }

        const updated = await sql`
          UPDATE public.qr_codes
          SET is_active = ${Boolean(isActive)}, updated_at = now()
          WHERE LOWER(code) = ${cleanCode} AND tenant_id = ${qrTenant}
          RETURNING *;
        `;
        return res.status(200).json({ success: true, qr: updated[0] });
      }

      return res.status(400).json({ error: 'Unknown action' });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err: any) {
    console.error('[API QR Error]:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}
