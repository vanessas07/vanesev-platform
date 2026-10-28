import { timingSafeEqual } from 'node:crypto';
import { getDb } from './_db.js';
import { applyCors } from './_cors.js';
import { ahoraEnCaracas, enviarAviso, filaACita, minutosDelTurno, sumarDias } from './_avisos.js';

/**
 * Recordatorios de cita por correo (T-38; G-056).
 * - Lo llaman el cron diario de Vercel (14:00 UTC = 10:00 en Caracas) y un workflow de GitHub cada 15 minutos.
 * - Protegido con CRON_SECRET (Bearer), comparado en tiempo constante.
 * - Día anterior: a partir de las 10:00 de Caracas, las citas de mañana.
 * - 2 horas antes: las citas que empiezan dentro de 60 a 135 minutos.
 * - Cada aviso sale una sola vez (public.avisos_enviados), aunque coincidan dos ejecuciones.
 * - Solo salones con «Avisos por correo» activado (G-059) y clientas que dejaron su correo.
 */
export const config = { maxDuration: 60 };

const ACTIVAS = ['confirmada', 'en_whatsapp', 'pendiente'];

export default async function handler(req: any, res: any) {
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Cache-Control', 'no-store');

  applyCors(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  // Verificación obligatoria de autorización por CRON_SECRET (Orden B1-a §4.8)
  const cronSecret = String(process.env.CRON_SECRET ?? '').trim(); // vacía → 401
  const recibido = String(req.headers?.authorization || '').trim();
  const esperado = `Bearer ${cronSecret}`;
  const a = Buffer.from(recibido);
  const b = Buffer.from(esperado);
  if (!cronSecret || a.length !== b.length || !timingSafeEqual(a, b)) {
    return res.status(401).json({ error: 'Unauthorized: Token de autorización cron ausente o inválido.' });
  }

  const sql = getDb();
  if (!sql) return res.status(500).json({ error: 'Base de datos Neon no disponible.' });

  try {
    const { fecha: hoy, minutos } = ahoraEnCaracas();
    const manana = sumarDias(hoy, 1);
    const inicio = Date.now();
    const quedaTiempo = () => Date.now() - inicio < 45_000;

    const citas = await sql`
      SELECT b.id, b.tenant_id, b.client_name, b.client_email, b.client_phone, b.service_name, b.staff_name,
             to_char(b.date, 'YYYY-MM-DD') AS fecha, b.time_slot, b.total_price_usd,
             t.business_name, t.whatsapp_phone, t.address, t.city, COALESCE(t.avisos_correo, true) AS avisos_correo
      FROM public.bookings b
      JOIN public.tenants t ON t.id = b.tenant_id
      WHERE b.date IN (${hoy}::date, ${manana}::date)
        AND b.status = ANY(${ACTIVAS})
        AND b.client_email IS NOT NULL AND b.client_email <> ''
        AND COALESCE(t.avisos_correo, true) = true
      ORDER BY b.date ASC, b.time_slot ASC
      LIMIT 500;
    `;

    let recordatoriosDia = 0;
    let recordatorios2h = 0;

    for (const r of citas) {
      if (!quedaTiempo()) break;
      const cita = filaACita(r);
      const clave = `${cita.fecha} ${cita.turno}`;
      const inicioCita = minutosDelTurno(cita.turno);
      if (inicioCita === null) continue;
      const faltan = (cita.fecha === hoy ? 0 : 1440) + inicioCita - minutos;

      if (faltan >= 60 && faltan <= 135) {
        recordatorios2h += await enviarAviso(sql, 'recordatorio_2h', cita, clave);
      } else if (cita.fecha === manana && minutos >= 10 * 60) {
        recordatoriosDia += await enviarAviso(sql, 'recordatorio_dia', cita, clave);
      }
    }

    return res.status(200).json({
      ok: true,
      horaCaracas: `${hoy} ${String(Math.floor(minutos / 60)).padStart(2, '0')}:${String(minutos % 60).padStart(2, '0')}`,
      citasRevisables: citas.length,
      recordatoriosDia,
      recordatorios2h,
    });
  } catch (err: any) {
    console.error('[Cron Reminders Error]:', err?.message || 'error');
    return res.status(500).json({ error: 'Error procesando los recordatorios.' });
  }
}
