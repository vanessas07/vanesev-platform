// Vercel Serverless Function: /api/bookings
// High-performance Neon Serverless Postgres integration with Anti-Tampering & Anti-Hacking Security
import { getDb } from './_db.js';
import { requireTenantRole } from './_session.js';
import { applyCors } from './_cors.js';

export default async function handler(req: any, res: any) {
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');

  applyCors(req, res);

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

  // ─── POST: Crear y blindar cita (Público para Clientas, precio desde DB) ───
  if (req.method === 'POST') {
    try {
      const {
        tenantId,
        clientName,
        clientPhone,
        clientEmail,
        clientPin,
        clientInstagram,
        serviceId,
        staffId,
        staffName,
        zoneId,
        zoneName,
        date,
        timeSlot,
        paymentMethod,
        isFirstVisit,
        notes,
      } = req.body || {};

      if (!clientName || !clientPhone || !date || !timeSlot || !serviceId) {
        return res.status(400).json({
          error: 'Campos obligatorios faltantes (nombre, teléfono, fecha, hora, serviceId).',
        });
      }

      if (!tenantId || !String(tenantId).trim()) {
        return res.status(400).json({ error: 'Parámetro tenantId requerido para registrar la cita.' });
      }

      const cleanTenant = String(tenantId).trim().toLowerCase();
      const cleanServiceId = String(serviceId).trim();
      const cleanPhone = String(clientPhone).replace(/\D/g, '');
      const cleanName = String(clientName).trim().slice(0, 80);
      const cleanEmail = clientEmail ? String(clientEmail).trim().toLowerCase().slice(0, 80) : '';
      const cleanPin = clientPin ? String(clientPin).trim().slice(0, 10) : '';
      const cleanInstagram = clientInstagram ? String(clientInstagram).replace('@', '').trim().slice(0, 40) : '';
      const cleanDate = String(date).trim().slice(0, 10);
      const cleanTime = String(timeSlot).trim().slice(0, 10);
      const rawNotes = notes ? String(notes).trim().slice(0, 300) : '';
      const cleanNotes = [rawNotes, cleanEmail ? `Email: ${cleanEmail}` : ''].filter(Boolean).join(' | ');
      const validPayment = ['pago_movil', 'efectivo', 'binance'].includes(paymentMethod)
        ? paymentMethod
        : 'pago_movil';
      const claimedFirst = Boolean(isFirstVisit);

      if (cleanPhone.length < 7 || cleanPhone.length > 15) {
        return res.status(400).json({ error: 'Número de teléfono inválido (debe contener entre 7 y 15 dígitos).' });
      }

      // Orden B1-a v2 §4.2: El precio sale exclusivamente de services en la BD, servicePriceUSD del body se ignora.
      const serviceRows = await sql`
        SELECT id, name, price_usd, is_available 
        FROM public.services 
        WHERE id = ${cleanServiceId} AND tenant_id = ${cleanTenant} AND is_available = true 
        LIMIT 1;
      `;

      if (serviceRows.length === 0) {
        return res.status(400).json({ error: 'Servicio no encontrado o no disponible para este salón.' });
      }

      const officialService = serviceRows[0];
      const officialPrice = Number(officialService.price_usd) || 10.0;
      const cleanServiceName = String(officialService.name);

      // 1. Blindaje de Disponibilidad por Salón/Tenant
      const existingSlot = await sql`
        SELECT 1 FROM public.blocked_slots 
        WHERE tenant_id = ${cleanTenant} AND date = ${cleanDate}::date AND time_slot = ${cleanTime}
        UNION ALL
        SELECT 1 FROM public.bookings 
        WHERE tenant_id = ${cleanTenant} AND date = ${cleanDate}::date AND time_slot = ${cleanTime} AND status IN ('en_whatsapp', 'pendiente', 'confirmada');
      `;

      if (existingSlot.length > 0) {
        return res.status(409).json({ error: 'El horario seleccionado ya se encuentra ocupado o bloqueado.' });
      }

      // 2. Blindaje Anti-Fraude: verificación estricta de primera visita
      const previousBookings = await sql`
        SELECT COUNT(*) as count FROM public.bookings 
        WHERE tenant_id = ${cleanTenant} AND client_phone = ${cleanPhone} AND status != 'cancelada';
      `;
      const prevCount = Number(previousBookings[0]?.count || 0);
      const eligibleFirstVisit = (prevCount === 0) && claimedFirst;
      const discountUSD = eligibleFirstVisit ? 2.00 : 0.00;
      const finalPriceUSD = Math.max(0, officialPrice - discountUSD);
      const allowedStatus = ['en_whatsapp', 'pendiente', 'confirmada'];
      const bookingStatus = allowedStatus.includes(req.body?.status) ? req.body.status : 'en_whatsapp';
      const bookingId = req.body?.id || `booking_${Date.now()}_${cleanPhone.slice(-4)}`;

      // 3. Registrar Cita con precio oficial verificado en base de datos
      await sql`
        INSERT INTO public.bookings (
          id, tenant_id, client_name, client_phone, client_instagram, service_id,
          service_name, service_price_usd, total_price_usd, staff_id, staff_name,
          zone_id, zone_name, date, time_slot, payment_method, notes, status,
          is_first_visit, discount_usd, created_at
        ) VALUES (
          ${bookingId},
          ${cleanTenant},
          ${cleanName},
          ${cleanPhone},
          ${cleanInstagram},
          ${cleanServiceId},
          ${cleanServiceName},
          ${officialPrice},
          ${finalPriceUSD},
          ${staffId || null},
          ${staffName ? String(staffName).trim() : null},
          ${zoneId || null},
          ${zoneName ? String(zoneName).trim() : null},
          ${cleanDate}::date,
          ${cleanTime},
          ${validPayment},
          ${cleanNotes},
          ${bookingStatus},
          ${eligibleFirstVisit},
          ${discountUSD},
          NOW()
        );
      `;

      return res.status(201).json({
        success: true,
        booking: {
          id: bookingId,
          tenantId: cleanTenant,
          clientName: cleanName,
          clientPhone: cleanPhone,
          serviceName: cleanServiceName,
          servicePriceUSD: officialPrice,
          totalPriceUSD: finalPriceUSD,
          discountUSD,
          date: cleanDate,
          timeSlot: cleanTime,
          status: bookingStatus,
        },
        databaseConnected: true,
      });
    } catch (err: any) {
      console.error('Error processing booking:', err);
      return res.status(500).json({ error: 'Error interno al registrar cita.' });
    }
  }

  // ─── GET: Obtener reservas del Salón (Protegido por Sesión y Rol) ────────────
  if (req.method === 'GET') {
    try {
      const tenantFilter = req.query?.tenant ? String(req.query.tenant).trim().toLowerCase() : '';
      if (!tenantFilter) {
        return res.status(400).json({ error: 'Parámetro tenant requerido.' });
      }

      // Orden B1-a v2 §4.1: requireTenantRole con roles owner, admin y staff
      const authCheck = await requireTenantRole(req, tenantFilter, ['owner', 'admin', 'staff']);
      if (authCheck.status !== 200) {
        return res.status(authCheck.status).json({ error: authCheck.error });
      }

      const rows = await sql`
        SELECT 
          id,
          tenant_id as "tenantId",
          client_name as "clientName",
          client_phone as "clientPhone",
          client_instagram as "clientInstagram",
          service_id as "serviceId",
          service_name as "serviceName",
          service_price_usd as "servicePriceUSD",
          total_price_usd as "totalPriceUSD",
          staff_id as "staffId",
          staff_name as "staffName",
          zone_id as "zoneId",
          zone_name as "zoneName",
          TO_CHAR(date, 'YYYY-MM-DD') as "date",
          time_slot as "timeSlot",
          payment_method as "paymentMethod",
          notes,
          status,
          is_first_visit as "isFirstVisit",
          discount_usd as "discountUSD",
          created_at as "createdAt"
        FROM public.bookings
        WHERE tenant_id = ${tenantFilter}
        ORDER BY created_at DESC
        LIMIT 200;
      `;

      return res.status(200).json({
        bookings: rows.map((r: any) => ({
          ...r,
          servicePriceUSD: Number(r.servicePriceUSD) || 0,
          totalPriceUSD: Number(r.totalPriceUSD) || 0,
          discountUSD: Number(r.discountUSD) || 0,
        })),
        databaseConnected: true,
      });
    } catch (err: any) {
      console.error('[Neon Get Bookings Error]:', err);
      return res.status(500).json({ error: 'Error al consultar citas en base de datos.' });
    }
  }

  // ─── PATCH: Actualizar estado y reprogramar cita (Protegido por Sesión y Rol) 
  if (req.method === 'PATCH') {
    try {
      const { id, status, action, date, timeSlot, cancellationReason } = req.body || {};
      if (!id) {
        return res.status(400).json({ error: 'id de cita es requerido.' });
      }

      const cleanId = String(id).trim();

      // C10 (§4.2): Carga la cita de la base de datos y toma SU tenant_id
      const targetBooking = await sql`
        SELECT id, tenant_id, client_phone, client_name 
        FROM public.bookings 
        WHERE id = ${cleanId} 
        LIMIT 1;
      `;

      if (targetBooking.length === 0) {
        return res.status(404).json({ error: 'Cita no encontrada.' });
      }

      const bookingTenant = String(targetBooking[0].tenant_id).toLowerCase();

      // Validación estricta de sesión y rol del salón
      const authCheck = await requireTenantRole(req, bookingTenant, ['owner', 'admin', 'staff']);
      if (authCheck.status !== 200) {
        return res.status(authCheck.status).json({ error: authCheck.error });
      }

      // Reprogramación de Cita (cambio de fecha y turno aislado por salón)
      if (action === 'reschedule' && date && timeSlot) {
        const cleanDate = String(date).trim().slice(0, 10);
        const cleanTime = String(timeSlot).trim().slice(0, 10);

        // Validar que el nuevo turno no esté ocupado ni bloqueado en ESE MISMO SALÓN
        const occupied = await sql`
          SELECT 1 FROM public.blocked_slots 
          WHERE tenant_id = ${bookingTenant} AND date = ${cleanDate}::date AND time_slot = ${cleanTime}
          UNION ALL
          SELECT 1 FROM public.bookings 
          WHERE tenant_id = ${bookingTenant}
            AND date = ${cleanDate}::date AND time_slot = ${cleanTime} 
            AND id != ${cleanId} 
            AND status IN ('en_whatsapp', 'pendiente', 'confirmada');
        `;

        if (occupied.length > 0) {
          return res.status(409).json({ error: 'El nuevo horario ya está ocupado o bloqueado en la agenda.' });
        }

        await sql`
          UPDATE public.bookings 
          SET date = ${cleanDate}::date, time_slot = ${cleanTime}, status = 'confirmada'
          WHERE id = ${cleanId} AND tenant_id = ${bookingTenant};
        `;

        return res.status(200).json({ 
          success: true, 
          message: 'Cita reprogramada y confirmada exitosamente.',
          date: cleanDate,
          timeSlot: cleanTime,
          status: 'confirmada'
        });
      }

      if (!status) {
        return res.status(400).json({ error: 'status o acción de reprogramación requerida.' });
      }

      // Orden B1-a v2 §4.2: status solo de una lista cerrada
      const ALLOWED_STATUSES = ['pendiente', 'confirmada', 'en_whatsapp', 'completada', 'cancelada', 'no_asistio'];
      const cleanStatus = String(status).trim().toLowerCase();
      if (!ALLOWED_STATUSES.includes(cleanStatus)) {
        return res.status(400).json({ 
          error: `Estado inválido ('${status}'). Debe ser uno de: ${ALLOWED_STATUSES.join(', ')}.` 
        });
      }

      // Actualizar estado de la cita y motivo si aplica, asegurando WHERE id AND tenant_id
      const reasonTag = cancellationReason ? `[Cancelación: ${String(cancellationReason).slice(0, 140)}]` : '';
      if (reasonTag) {
        await sql`
          UPDATE public.bookings 
          SET status = ${cleanStatus},
              notes = CASE 
                WHEN notes IS NULL OR notes = '' THEN ${reasonTag}
                ELSE notes || ' ' || ${reasonTag}
              END
          WHERE id = ${cleanId} AND tenant_id = ${bookingTenant};
        `;
      } else {
        await sql`
          UPDATE public.bookings 
          SET status = ${cleanStatus}
          WHERE id = ${cleanId} AND tenant_id = ${bookingTenant};
        `;
      }

      // Orden B1-a v2 §4.3 (C8 en bookings.ts): recuento y fidelización con tenant_id
      if (cleanStatus === 'completada') {
        const clientPhone = targetBooking[0].client_phone;
        const clientName = targetBooking[0].client_name;

        // Contar cuántas citas COMPLETADAS reales tiene exclusivamente en este salón
        const countRows = await sql`
          SELECT COUNT(*)::int as count 
          FROM public.bookings 
          WHERE client_phone = ${clientPhone} AND tenant_id = ${bookingTenant} AND status = 'completada';
        `;
        const totalCompleted = Number(countRows[0]?.count || 1);
        const cycleStamps = totalCompleted % 6 === 0 ? 5 : Math.min(5, totalCompleted % 6);
        const rewards = totalCompleted >= 5 ? ['¡5ª Visita: Depilación de Cejas 100% GRATIS!'] : [];

        // C8: ON CONFLICT (phone) DO NOTHING + UPDATE con phone AND tenant_id
        await sql`
          INSERT INTO public.loyalty_cards (tenant_id, phone, client_name, stamps_count, last_visit, rewards_earned, updated_at)
          VALUES (${bookingTenant}, ${clientPhone}, ${clientName}, ${cycleStamps}, CURRENT_DATE, ${rewards}, NOW())
          ON CONFLICT (phone) DO NOTHING;
        `;

        await sql`
          UPDATE public.loyalty_cards 
          SET client_name = ${clientName},
              stamps_count = ${cycleStamps},
              last_visit = CURRENT_DATE,
              rewards_earned = ${rewards},
              updated_at = NOW()
          WHERE phone = ${clientPhone} AND tenant_id = ${bookingTenant};
        `;

        return res.status(200).json({
          success: true,
          id: cleanId,
          status: cleanStatus,
          loyalty: {
            phone: clientPhone,
            clientName,
            stampsCount: cycleStamps,
            totalCompleted,
            hasFreeReward: cycleStamps >= 5
          }
        });
      }

      return res.status(200).json({ success: true, id: cleanId, status: cleanStatus });
    } catch (err: any) {
      console.error('[Neon Update Booking Error]:', err);
      return res.status(500).json({ error: 'Error al actualizar reserva.' });
    }
  }

  // ─── DELETE: Eliminar reserva (Protegido por Sesión y Rol) ──────────────────
  if (req.method === 'DELETE') {
    try {
      const { id } = req.query || req.body || {};
      if (!id) {
        return res.status(400).json({ error: 'id de reserva requerido.' });
      }

      const cleanId = String(id).trim();

      // C10 (§4.2): Carga la cita de la BD para tomar SU tenant_id
      const targetBooking = await sql`
        SELECT id, tenant_id 
        FROM public.bookings 
        WHERE id = ${cleanId} 
        LIMIT 1;
      `;

      if (targetBooking.length === 0) {
        return res.status(404).json({ error: 'Cita no encontrada.' });
      }

      const bookingTenant = String(targetBooking[0].tenant_id).toLowerCase();

      // Exige sesión y rol en ese salón (owner, admin, staff)
      const authCheck = await requireTenantRole(req, bookingTenant, ['owner', 'admin', 'staff']);
      if (authCheck.status !== 200) {
        return res.status(authCheck.status).json({ error: authCheck.error });
      }

      await sql`
        DELETE FROM public.bookings 
        WHERE id = ${cleanId} AND tenant_id = ${bookingTenant};
      `;

      return res.status(200).json({ success: true, deletedId: cleanId });
    } catch (err: any) {
      console.error('[Neon Delete Booking Error]:', err);
      return res.status(500).json({ error: 'Error al eliminar reserva.' });
    }
  }

  return res.status(405).json({ error: 'Método no permitido.' });
}
