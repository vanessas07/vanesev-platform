// Vercel Serverless Function: /api/schedule
// Handles calendar slot blocking and availability in Neon Postgres
import { neon } from '@neondatabase/serverless';
import { applyCors } from './_cors.js';

function getDb() {
  const connectionString = process.env.DATABASE_URL || process.env.DATABASE_URL_STAGING;
  if (!connectionString) return null;
  return neon(connectionString);
}

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  applyCors(req, res);
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const sql = getDb();

  // ─── GET: Obtener slots bloqueados (aislados por tenant_id) ─────────────────
  if (req.method === 'GET') {
    if (!sql) {
      return res.status(200).json({ blockedSlots: [], databaseConnected: false });
    }

    try {
      const cleanTenant = req.query?.tenant ? String(req.query.tenant).trim().toLowerCase() : '';
      if (!cleanTenant) {
        return res.status(200).json({ blockedSlots: [], databaseConnected: true });
      }

      const rows = await sql`
        SELECT 
          TO_CHAR(date, 'YYYY-MM-DD') as "date",
          time_slot as "timeSlot",
          reason
        FROM public.blocked_slots
        WHERE tenant_id = ${cleanTenant}
        ORDER BY date ASC, time_slot ASC;
      `;

      return res.status(200).json({
        blockedSlots: rows,
        databaseConnected: true,
      });
    } catch (err: any) {
      console.error('[Neon Get Schedule Error]:', err);
      return res.status(500).json({ error: 'Error al consultar horarios bloqueados.' });
    }
  }

  // ─── POST: Toggle slot o bloquear/desbloquear día completo (aislado por tenant_id) ───
  if (req.method === 'POST') {
    if (!sql) {
      return res.status(500).json({ error: 'Base de datos no disponible.' });
    }

    try {
      const { tenantId, action, date, timeSlot, slots, reason } = req.body || {};
      const cleanTenant = String(tenantId || req.query?.tenant || '').trim().toLowerCase();

      if (!date || !cleanTenant) {
        return res.status(400).json({ error: 'Fecha y salón (tenantId) requeridos.' });
      }

      const cleanDate = String(date).trim().slice(0, 10);
      const cleanReason = reason ? String(reason).trim().slice(0, 120) : 'Horario bloqueado por estudio';

      // Acción 1: Bloquear día completo
      if (action === 'block_day') {
        const timeSlots = Array.isArray(slots) && slots.length > 0
          ? slots
          : ['09:00 AM', '11:30 AM', '02:00 PM', '04:30 PM'];

        for (const slot of timeSlots) {
          const existing = await sql`
            SELECT id FROM public.blocked_slots
            WHERE tenant_id = ${cleanTenant} AND date = ${cleanDate}::date AND time_slot = ${slot};
          `;
          if (existing.length === 0) {
            await sql`
              INSERT INTO public.blocked_slots (tenant_id, date, time_slot, reason)
              VALUES (${cleanTenant}, ${cleanDate}::date, ${slot}, ${cleanReason});
            `;
          }
        }

        return res.status(200).json({ success: true, action: 'block_day', date: cleanDate });
      }

      // Acción 2: Desbloquear día completo
      if (action === 'unblock_day') {
        await sql`
          DELETE FROM public.blocked_slots
          WHERE tenant_id = ${cleanTenant} AND date = ${cleanDate}::date;
        `;

        return res.status(200).json({ success: true, action: 'unblock_day', date: cleanDate });
      }

      // Acción 3: Toggle de un slot individual
      if (!timeSlot) {
        return res.status(400).json({ error: 'Turno (timeSlot) requerido para toggle.' });
      }

      const existing = await sql`
        SELECT id FROM public.blocked_slots
        WHERE tenant_id = ${cleanTenant} AND date = ${cleanDate}::date AND time_slot = ${timeSlot};
      `;

      if (existing.length > 0) {
        await sql`
          DELETE FROM public.blocked_slots
          WHERE tenant_id = ${cleanTenant} AND date = ${cleanDate}::date AND time_slot = ${timeSlot};
        `;
        return res.status(200).json({ success: true, action: 'unblocked', date: cleanDate, timeSlot });
      } else {
        await sql`
          INSERT INTO public.blocked_slots (tenant_id, date, time_slot, reason)
          VALUES (${cleanTenant}, ${cleanDate}::date, ${timeSlot}, ${cleanReason});
        `;
        return res.status(200).json({ success: true, action: 'blocked', date: cleanDate, timeSlot });
      }
    } catch (err: any) {
      console.error('[Neon Schedule Update Error]:', err);
      return res.status(500).json({ error: 'Error al actualizar calendario.' });
    }
  }

  return res.status(405).json({ error: 'Método no permitido.' });
}
