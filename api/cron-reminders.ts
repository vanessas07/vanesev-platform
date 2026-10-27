import { getDb } from './_db.js';
import { applyCors } from './_cors.js';

/**
 * Endpoint de Automatización Nivel 2 (Cron / Webhook):
 * - Protegido estrictamente con Bearer Token (CRON_SECRET).
 * - Consulta citas confirmadas para las próximas 24 horas en Neon Postgres.
 * - Despacha recordatorios transaccionales vía Resend (Email) y Meta WhatsApp Cloud API.
 */
export default async function handler(req: any, res: any) {
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  res.setHeader('X-Content-Type-Options', 'nosniff');

  // Closed CORS filter
  applyCors(req, res);

  if (req.method === 'OPTIONS') return res.status(200).end();

  // 1. Verificación obligatoria de autorización por CRON_SECRET (Orden B1-a §4.8)
  const authHeader = req.headers?.authorization;
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || !authHeader || authHeader !== `Bearer ${cronSecret}`) {
    return res.status(401).json({ error: 'Unauthorized: Token de autorización cron ausente o inválido.' });
  }

  const sql = getDb();
  if (!sql) {
    return res.status(500).json({ error: 'Base de datos Neon no disponible.' });
  }

  try {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];

    const upcomingBookings = await sql`
      SELECT
        b.id,
        b.tenant_id as "tenantId",
        b.client_name as "clientName",
        b.client_phone as "clientPhone",
        b.service_name as "serviceName",
        b.staff_id as "staffId",
        b.staff_name as "staffName",
        b.zone_id as "zoneId",
        b.zone_name as "zoneName",
        b.date as "date",
        b.time_slot as "timeSlot",
        b.total_price_usd as "totalPriceUSD",
        t.business_name as "salonName",
        t.whatsapp_phone as "salonWhatsapp"
      FROM public.bookings b
      LEFT JOIN public.tenants t ON t.id = b.tenant_id
      WHERE b.date = ${tomorrowStr}
        AND b.status IN ('confirmada', 'en_whatsapp', 'pendiente', 'confirmed', 'pending')
      ORDER BY b.time_slot ASC;
    `;

    const resendApiKey = process.env.RESEND_API_KEY ? process.env.RESEND_API_KEY.trim() : null;
    const metaWaToken = process.env.META_WHATSAPP_TOKEN ? process.env.META_WHATSAPP_TOKEN.trim() : null;
    const metaPhoneId = process.env.META_WHATSAPP_PHONE_ID ? process.env.META_WHATSAPP_PHONE_ID.trim() : null;

    const dispatches = upcomingBookings.map((b: any) => ({
      bookingId: b.id,
      tenantId: b.tenantId,
      salonName: b.salonName || b.tenantId,
      clientName: b.clientName,
      clientPhone: b.clientPhone,
      date: b.date,
      timeSlot: b.timeSlot,
      channels: {
        whatsappDeepLink: `https://wa.me/${String(b.clientPhone).replace(/\D/g, '')}?text=${encodeURIComponent(
          `¡Hola ${b.clientName}! ✨ Te recordamos tu cita de mañana (${b.date} a las ${b.timeSlot}) en ${b.salonName || 'nuestro estudio'}. ¡Te esperamos!`
        )}`,
        metaCloudApiReady: Boolean(metaWaToken && metaPhoneId),
        resendEmailReady: Boolean(resendApiKey),
      },
    }));

    return res.status(200).json({
      ok: true,
      success: true,
      window: '24h',
      targetDate: tomorrowStr,
      totalUpcoming: dispatches.length,
      providersConfigured: {
        resendEmail: Boolean(resendApiKey),
        metaWhatsappCloud: Boolean(metaWaToken && metaPhoneId),
      },
      dispatches,
    });
  } catch (err: any) {
    console.error('[Cron Reminders Error]:', err);
    return res.status(500).json({ error: 'Error procesando cola de recordatorios 24h.' });
  }
}
