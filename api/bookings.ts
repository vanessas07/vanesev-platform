// Vercel Serverless Function: /api/bookings
// High-performance Neon Serverless Postgres integration with Anti-Tampering & Anti-Hacking Security
import { neon } from '@neondatabase/serverless';

function getDb() {
  const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  if (!connectionString) {
    return null;
  }
  return neon(connectionString);
}

export default async function handler(req: any, res: any) {
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST,PATCH,DELETE');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const sql = getDb();

  // ─── POST: Crear y blindar cita (Anti-Hacking & Anti-Tampering) ─────────────
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
        serviceName,
        servicePriceUSD,
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

      if (!clientName || !clientPhone || !date || !timeSlot || !serviceName) {
        return res.status(400).json({
          error: 'Campos obligatorios faltantes (nombre, teléfono, fecha, hora, servicio).',
        });
      }

      if (!tenantId || !String(tenantId).trim()) {
        return res.status(400).json({ error: 'Parámetro tenantId requerido para registrar la cita.' });
      }
      const cleanTenant = String(tenantId).trim().toLowerCase();
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
      const cleanPrice = Number(servicePriceUSD) || 10.00;
      const claimedFirst = Boolean(isFirstVisit);

      if (cleanPhone.length < 7 || cleanPhone.length > 15) {
        return res.status(400).json({ error: 'Número de teléfono inválido (debe contener entre 7 y 15 dígitos).' });
      }

      if (sql) {
        try {
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
          const finalPriceUSD = Math.max(0, cleanPrice - discountUSD);
          const allowedStatus = ['en_whatsapp', 'pendiente', 'confirmada'];
          const bookingStatus = allowedStatus.includes(req.body?.status) ? req.body.status : 'en_whatsapp';
          const bookingId = req.body?.id || `booking_${Date.now()}_${cleanPhone.slice(-4)}`;

          // 3. Registrar Cita con soporte de Especialista (staff) y Zona (studio_zone)
          await sql`
            INSERT INTO public.bookings (
              id, tenant_id, client_name, client_phone, client_instagram, service_id,
              service_name, service_price_usd, total_price_usd, staff_id, staff_name,
              zone_id, zone_name, date, time_slot, payment_method, notes, status,
              is_first_visit, discount_usd, created_at
            ) VALUES (
              ${bookingId}, ${cleanTenant}, ${cleanName}, ${cleanPhone}, ${cleanInstagram}, ${String(serviceId || '')},
              ${String(serviceName)}, ${cleanPrice}, ${finalPriceUSD}, ${staffId || null}, ${staffName || null},
              ${zoneId || null}, ${zoneName || null}, ${cleanDate}::date, ${cleanTime}, ${validPayment},
              ${cleanNotes}, ${bookingStatus}, ${eligibleFirstVisit}, ${discountUSD}, NOW()
            );
          `;

          // 4. Inicializar ficha en loyalty_cards si no existe (target_stamps = 5)
          const loyaltyCardRows = await sql`
            SELECT stamps_count FROM public.loyalty_cards WHERE phone = ${cleanPhone};
          `;

          let verifiedStamps = 0;
          if (loyaltyCardRows.length === 0) {
            await sql`
              INSERT INTO public.loyalty_cards (phone, tenant_id, client_name, stamps_count, target_stamps, last_visit, rewards_earned, updated_at)
              VALUES (${cleanPhone}, ${cleanTenant}, ${cleanName}, 0, 5, ${cleanDate}::date, ARRAY[]::TEXT[], NOW())
              ON CONFLICT (phone) DO NOTHING;
            `;
          } else {
            verifiedStamps = Number(loyaltyCardRows[0]?.stamps_count || 0);
          }

          return res.status(200).json({
            success: true,
            booking: {
              id: bookingId,
              tenantId: cleanTenant,
              clientName: cleanName,
              clientPhone: cleanPhone,
              clientEmail: cleanEmail || undefined,
              clientInstagram: cleanInstagram || undefined,
              serviceId,
              serviceName,
              servicePriceUSD: cleanPrice,
              totalPriceUSD: finalPriceUSD,
              staffId: staffId || undefined,
              staffName: staffName || undefined,
              zoneId: zoneId || undefined,
              zoneName: zoneName || undefined,
              date: cleanDate,
              timeSlot: cleanTime,
              paymentMethod: validPayment,
              isFirstVisit: eligibleFirstVisit,
              discountUSD,
              notes: cleanNotes || undefined,
              status: 'pendiente',
            },
            verifiedStamps,
            databaseConnected: true,
          });
        } catch (dbErr: any) {
          console.error('[Neon Booking Error]:', dbErr);
          return res.status(500).json({ error: 'Error al procesar reserva en base de datos.' });
        }
      }

      // Fallback si no hay conexión
      return res.status(200).json({
        success: true,
        booking: {
          id: 'cita_' + Date.now(),
          clientName: cleanName,
          clientPhone: cleanPhone,
          serviceName,
          date: cleanDate,
          timeSlot: cleanTime,
          totalPriceUSD: cleanPrice,
          status: 'pendiente'
        },
        databaseConnected: false,
      });
    } catch (err: any) {
      console.error('Error processing booking:', err);
      return res.status(500).json({ error: 'Error interno al registrar cita.' });
    }
  }

  // ─── GET: Obtener reservas para el Admin o para la Ficha VIP de la Clienta ──
  if (req.method === 'GET') {
    if (!sql) {
      return res.status(200).json({ bookings: [], databaseConnected: false });
    }

    try {
      const clientPhoneFilter = req.query?.clientPhone ? String(req.query.clientPhone).replace(/\D/g, '') : '';
      const tenantFilter = req.query?.tenant ? String(req.query.tenant).trim().toLowerCase() : '';

      let rows: any[] = [];
      if (clientPhoneFilter && clientPhoneFilter.length >= 7) {
        const suffix = clientPhoneFilter.slice(-9);
        rows = tenantFilter
          ? await sql`
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
                AND RIGHT(REGEXP_REPLACE(client_phone, '\D', '', 'g'), 9) = ${suffix}
              ORDER BY date DESC, created_at DESC
              LIMIT 50;
            `
          : [];
      } else if (tenantFilter) {
        rows = await sql`
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
      } else {
        // NUNCA devolver citas sin filtro de salón (prohibido mezclar clientes)
        rows = [];
      }

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

  // ─── PATCH: Actualizar estado y validar fidelización oficial ────────────────
  if (req.method === 'PATCH') {
    if (!sql) {
      return res.status(500).json({ error: 'Base de datos no disponible.' });
    }

    try {
      const { id, tenantId, status, action, date, timeSlot, cancellationReason } = req.body || {};
      if (!id) {
        return res.status(400).json({ error: 'id de cita es requerido.' });
      }

      // Reprogramación de Cita (cambio de fecha y turno aislado por salón)
      if (action === 'reschedule' && date && timeSlot) {
        const cleanDate = String(date).trim().slice(0, 10);
        const cleanTime = String(timeSlot).trim().slice(0, 10);
        const targetBooking = await sql`SELECT tenant_id FROM public.bookings WHERE id = ${id} LIMIT 1;`;
        const bookingTenant = String(targetBooking[0]?.tenant_id || tenantId || '').trim().toLowerCase();

        // Validar que el nuevo turno no esté ocupado por otra cita activa ni bloqueado en ESE MISMO SALÓN
        const occupied = await sql`
          SELECT 1 FROM public.blocked_slots 
          WHERE tenant_id = ${bookingTenant} AND date = ${cleanDate}::date AND time_slot = ${cleanTime}
          UNION ALL
          SELECT 1 FROM public.bookings 
          WHERE tenant_id = ${bookingTenant}
            AND date = ${cleanDate}::date AND time_slot = ${cleanTime} 
            AND id != ${id} 
            AND status IN ('en_whatsapp', 'pendiente', 'confirmada');
        `;

        if (occupied.length > 0) {
          return res.status(409).json({ error: 'El nuevo horario ya está ocupado o bloqueado en la agenda.' });
        }

        await sql`
          UPDATE public.bookings 
          SET date = ${cleanDate}::date, time_slot = ${cleanTime}, status = 'confirmada'
          WHERE id = ${id};
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

      // Actualizar estado de la cita y motivo si aplica
      const reasonTag = cancellationReason ? `[Cancelación: ${String(cancellationReason).slice(0, 140)}]` : '';
      if (reasonTag) {
        await sql`
          UPDATE public.bookings 
          SET status = ${status},
              notes = CASE 
                WHEN notes IS NULL OR notes = '' THEN ${reasonTag}
                ELSE notes || ' ' || ${reasonTag}
              END
          WHERE id = ${id};
        `;
      } else {
        await sql`
          UPDATE public.bookings 
          SET status = ${status}
          WHERE id = ${id};
        `;
      }

      // Si la cita pasa a 'completada', acreditar oficialmente el sello a la clienta (Regla 5 visitas = Cejas gratis)
      if (status === 'completada') {
        const bookingRows = await sql`
          SELECT client_phone, client_name FROM public.bookings WHERE id = ${id};
        `;

        if (bookingRows.length > 0) {
          const clientPhone = bookingRows[0].client_phone;
          const clientName = bookingRows[0].client_name;

          // Contar cuántas citas COMPLETADAS reales tiene
          const countRows = await sql`
            SELECT COUNT(*) as count FROM public.bookings 
            WHERE client_phone = ${clientPhone} AND status = 'completada';
          `;
          const totalCompleted = Number(countRows[0]?.count || 1);
          // Regla Andrea Labrador: 5 visitas completadas para ganar Depilación de Cejas de cortesía
          const cycleStamps = totalCompleted % 6 === 0 ? 5 : Math.min(5, totalCompleted % 6);
          const rewards = totalCompleted >= 5 ? ['¡5ª Visita: Depilación de Cejas 100% GRATIS!'] : [];

          await sql`
            INSERT INTO public.loyalty_cards (phone, client_name, stamps_count, last_visit, rewards_earned, updated_at)
            VALUES (${clientPhone}, ${clientName}, ${cycleStamps}, CURRENT_DATE, ${rewards}, NOW())
            ON CONFLICT (phone) DO UPDATE SET
              client_name = EXCLUDED.client_name,
              stamps_count = ${cycleStamps},
              last_visit = CURRENT_DATE,
              rewards_earned = ${rewards},
              updated_at = NOW();
          `;

          return res.status(200).json({
            success: true,
            id,
            status,
            loyalty: {
              phone: clientPhone,
              clientName,
              stampsCount: cycleStamps,
              totalCompleted,
              hasFreeReward: cycleStamps >= 5
            }
          });
        }
      }

      return res.status(200).json({ success: true, id, status });
    } catch (err: any) {
      console.error('[Neon Update Booking Error]:', err);
      return res.status(500).json({ error: 'Error al actualizar reserva.' });
    }
  }

  // ─── DELETE: Eliminar reserva ────────────────────────────────────────────────
  if (req.method === 'DELETE') {
    if (!sql) {
      return res.status(500).json({ error: 'Base de datos no disponible.' });
    }

    try {
      const { id } = req.query || req.body || {};
      if (!id) {
        return res.status(400).json({ error: 'id de reserva requerido.' });
      }

      await sql`
        DELETE FROM public.bookings 
        WHERE id = ${id};
      `;

      return res.status(200).json({ success: true, deletedId: id });
    } catch (err: any) {
      console.error('[Neon Delete Booking Error]:', err);
      return res.status(500).json({ error: 'Error al eliminar reserva.' });
    }
  }

  return res.status(405).json({ error: 'Método no permitido.' });
}
