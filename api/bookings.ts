// Vercel Serverless Function: /api/bookings
// High-performance Neon Serverless Postgres integration with Anti-Tampering & Anti-Hacking Security
import { randomUUID } from 'node:crypto';
import { getDb } from './_db.js';
import { requireSession, requireTenantRole } from './_session.js';
import { claveDeLimite, ipDeLaPeticion, limiteSuperado } from './_limite.js';
import { applyCors } from './_cors.js';
import { calcularPrecio, escriturasDeDescuentos, escriturasDeDevolucion, esLimiteDeDescuento } from './_precios.js';
import { cargarCita, conLimite, enviarAviso } from './_avisos.js';

// Reserva pública: límites contados en la base (migración 0006).
const RESERVAS_POR_IP_HORA = 5;
const RESERVAS_POR_TELEFONO_HORA = 3;
const DIAS_MAXIMOS_DE_ANTELACION = 90;
const TURNO_VALIDO = /^((0?[1-9]|1[0-2]):[0-5]\d (AM|PM)|([01]\d|2[0-3]):[0-5]\d)$/;

/** Fecha de hoy (YYYY-MM-DD) en Venezuela, donde operan los salones. */
function hoyEnCaracas(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Caracas' }).format(new Date());
}

function sumarDias(fecha: string, dias: number): string {
  const d = new Date(`${fecha}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString().slice(0, 10);
}

function fechaReal(fecha: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) return false;
  const d = new Date(`${fecha}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === fecha;
}

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
        clientInstagram,
        serviceId,
        staffId,
        zoneId,
        date,
        timeSlot,
        paymentMethod,
        isFirstVisit,
        notes,
        cupon,
        tarjetaRegalo,
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
      let cleanEmail: string | null = null;
      if (clientEmail !== undefined && clientEmail !== null && String(clientEmail).trim() !== '') {
        const emailCandidate = String(clientEmail).trim().toLowerCase();
        if (emailCandidate.length > 120 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailCandidate)) {
          return res.status(400).json({ error: 'Formato de correo electrónico inválido o excede 120 caracteres.' });
        }
        cleanEmail = emailCandidate;
      }
      const cleanInstagram = clientInstagram ? String(clientInstagram).replace('@', '').trim().slice(0, 40) : '';
      const cleanDate = String(date).trim();
      const cleanTime = String(timeSlot).trim().toUpperCase();
      const cleanNotes = notes ? String(notes).trim().slice(0, 300) : '';
      const validPayment = ['pago_movil', 'efectivo', 'binance'].includes(paymentMethod)
        ? paymentMethod
        : 'pago_movil';
      const claimedFirst = Boolean(isFirstVisit);

      if (cleanPhone.length < 7 || cleanPhone.length > 15) {
        return res.status(400).json({ error: 'Número de teléfono inválido (debe contener entre 7 y 15 dígitos).' });
      }

      // Fecha real, no pasada y como mucho a 90 días; turno con formato de agenda.
      const hoy = hoyEnCaracas();
      if (!fechaReal(cleanDate) || cleanDate < hoy || cleanDate > sumarDias(hoy, DIAS_MAXIMOS_DE_ANTELACION)) {
        return res.status(400).json({ error: `Fecha inválida: debe estar entre hoy y los próximos ${DIAS_MAXIMOS_DE_ANTELACION} días.` });
      }
      if (!TURNO_VALIDO.test(cleanTime)) {
        return res.status(400).json({ error: 'Turno (timeSlot) con formato inválido.' });
      }

      // Freno anti-bots: por IP y por teléfono en el salón (HMAC, nunca en claro).
      const ip = ipDeLaPeticion(req);
      const [porIp, porTelefono] = await Promise.all([
        limiteSuperado(claveDeLimite('reserva-ip', ip), RESERVAS_POR_IP_HORA, 3600),
        limiteSuperado(claveDeLimite('reserva-tel', `${cleanTenant}|${cleanPhone}`), RESERVAS_POR_TELEFONO_HORA, 3600),
      ]);
      if (porIp || porTelefono) {
        res.setHeader('Retry-After', '3600');
        return res.status(429).json({ error: 'Demasiadas reservas seguidas. Inténtalo de nuevo más tarde.' });
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

      // Especialista y zona: solo del mismo salón, y con el nombre que figura en la base.
      let cleanStaffId: string | null = null;
      let cleanStaffName: string | null = null;
      if (staffId) {
        const staffRows = await sql`
          SELECT id, name FROM public.staff_members
          WHERE id = ${String(staffId)} AND tenant_id = ${cleanTenant} AND is_active = true
          LIMIT 1;
        `;
        if (staffRows.length === 0) {
          return res.status(400).json({ error: 'Especialista no encontrado en este salón.' });
        }
        cleanStaffId = staffRows[0].id;
        cleanStaffName = staffRows[0].name;
      }
      let cleanZoneId: string | null = null;
      let cleanZoneName: string | null = null;
      if (zoneId) {
        const zoneRows = await sql`
          SELECT id, name FROM public.studio_zones
          WHERE id = ${String(zoneId)} AND tenant_id = ${cleanTenant} AND is_active = true
          LIMIT 1;
        `;
        if (zoneRows.length === 0) {
          return res.status(400).json({ error: 'Zona no encontrada en este salón.' });
        }
        cleanZoneId = zoneRows[0].id;
        cleanZoneName = zoneRows[0].name;
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

      // 2. Precio final: oferta, primera visita, cupón y tarjeta regalo (G-033), todo decidido aquí.
      const calculo = await calcularPrecio(sql, {
        tenant: cleanTenant,
        servicioId: cleanServiceId,
        precioBase: officialPrice,
        fecha: cleanDate,
        turno: cleanTime,
        telefono: cleanPhone,
        primeraVisitaReclamada: claimedFirst,
        cupon: cupon ? String(cupon) : null,
        tarjeta: tarjetaRegalo ? String(tarjetaRegalo) : null,
      });
      if (!calculo.ok) {
        return res.status(calculo.status).json({ error: calculo.error });
      }
      const desglose = calculo.desglose;
      const eligibleFirstVisit = desglose.primeraVisita > 0;
      const discountUSD = desglose.primeraVisita;
      const finalPriceUSD = desglose.total;
      // Id y estado los decide el servidor: la clienta no puede elegir el id ni dejar la cita «confirmada».
      const bookingStatus = 'en_whatsapp';
      const bookingId = `bk_${randomUUID()}`;

      // 3. Registrar la cita y, en la MISMA transacción, el uso del cupón y el cargo a la tarjeta regalo.
      const insertarCita = sql`
        INSERT INTO public.bookings (
          id, tenant_id, client_name, client_phone, client_email, client_instagram, service_id,
          service_name, service_price_usd, total_price_usd, staff_id, staff_name,
          zone_id, zone_name, date, time_slot, payment_method, notes, status,
          is_first_visit, discount_usd, oferta_id, descuento_oferta_usd, cupon_id, descuento_cupon_usd,
          tarjeta_regalo_id, pago_tarjeta_usd, created_at
        ) VALUES (
          ${bookingId},
          ${cleanTenant},
          ${cleanName},
          ${cleanPhone},
          ${cleanEmail},
          ${cleanInstagram},
          ${cleanServiceId},
          ${cleanServiceName},
          ${officialPrice},
          ${finalPriceUSD},
          ${cleanStaffId},
          ${cleanStaffName},
          ${cleanZoneId},
          ${cleanZoneName},
          ${cleanDate}::date,
          ${cleanTime},
          ${validPayment},
          ${cleanNotes},
          ${bookingStatus},
          ${eligibleFirstVisit},
          ${discountUSD},
          ${desglose.oferta?.id ?? null},
          ${desglose.oferta?.descuento ?? 0},
          ${desglose.cupon?.id ?? null},
          ${desglose.cupon?.descuento ?? 0},
          ${desglose.tarjeta?.id ?? null},
          ${desglose.tarjeta?.pago ?? 0},
          NOW()
        );
      `;
      try {
        await sql.transaction([insertarCita, ...escriturasDeDescuentos(sql, cleanTenant, bookingId, desglose)]);
      } catch (errTx: any) {
        if (esLimiteDeDescuento(errTx)) {
          return res.status(409).json({ error: 'El cupón o la tarjeta regalo ya no están disponibles. Revisa el código e inténtalo de nuevo.' });
        }
        throw errTx;
      }

      // Avisos (G-057, G-058): «solicitud recibida» a la clienta y «nueva reserva» a la dueña. Nunca rompen la reserva.
      const citaNueva = await cargarCita(sql, bookingId, cleanTenant).catch(() => null);
      if (citaNueva) {
        await conLimite(Promise.all([enviarAviso(sql, 'solicitud', citaNueva), enviarAviso(sql, 'nueva_reserva', citaNueva)]));
      }

      return res.status(201).json({
        success: true,
        booking: {
          id: bookingId,
          tenantId: cleanTenant,
          clientName: cleanName,
          clientPhone: cleanPhone,
          clientEmail: cleanEmail,
          serviceName: cleanServiceName,
          servicePriceUSD: officialPrice,
          totalPriceUSD: finalPriceUSD,
          discountUSD,
          desglose: {
            base: desglose.base,
            oferta: desglose.oferta ? { titulo: desglose.oferta.titulo, descuento: desglose.oferta.descuento } : null,
            primeraVisita: desglose.primeraVisita,
            cupon: desglose.cupon ? { codigo: desglose.cupon.codigo, descuento: desglose.cupon.descuento } : null,
            tarjetaRegalo: desglose.tarjeta ? { pago: desglose.tarjeta.pago, saldoRestante: desglose.tarjeta.saldoRestante } : null,
            total: desglose.total,
          },
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

  // ─── GET: Obtener reservas del Salón (Protegido por Sesión y Rol) o de la Clienta (mine=1) ───
  if (req.method === 'GET') {
    try {
      if (req.query?.mine === '1' || req.query?.mine === 'true') {
        const sesion = await requireSession(req);
        if (sesion.status !== 200) {
          return res.status(sesion.status).json({ error: sesion.error });
        }

        const user = sesion.user;
        if (!user?.emailVerified) {
          return res.status(403).json({ error: 'Forbidden: Correo electrónico no verificado.' });
        }

        const userEmail = String(user.email || '').trim().toLowerCase();

        const [bookingRows, stampRows] = await Promise.all([
          sql`
            SELECT 
              id,
              tenant_id as "tenantId",
              service_name as "serviceName",
              TO_CHAR(date, 'YYYY-MM-DD') as "date",
              time_slot as "timeSlot",
              status,
              total_price_usd as "totalPriceUSD"
            FROM public.bookings
            WHERE client_email = ${userEmail}
            ORDER BY date DESC, time_slot DESC
            LIMIT 100;
          `,
          sql`
            SELECT 
              tenant_id as "tenantId",
              COUNT(*)::int as "stampsCount"
            FROM public.bookings
            WHERE client_email = ${userEmail} AND status = 'completada'
            GROUP BY tenant_id;
          `,
        ]);

        return res.status(200).json({
          bookings: bookingRows.map((r: any) => ({
            ...r,
            totalPriceUSD: Number(r.totalPriceUSD) || 0,
          })),
          stamps: stampRows,
          databaseConnected: true,
        });
      }

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
          client_email as "clientEmail",
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

      // Sesión antes de buscar: un anónimo recibe 401 y no puede averiguar qué citas existen.
      const sesion = await requireSession(req);
      if (sesion.status !== 200) {
        return res.status(sesion.status).json({ error: sesion.error });
      }

      // C10 (§4.2): Carga la cita de la base de datos y toma SU tenant_id
      const targetBooking = await sql`
        SELECT id, tenant_id, client_phone, client_name, status
        FROM public.bookings 
        WHERE id = ${cleanId} 
        LIMIT 1;
      `;

      if (targetBooking.length === 0) {
        return res.status(404).json({ error: 'Cita no encontrada.' });
      }

      const bookingTenant = String(targetBooking[0].tenant_id).toLowerCase();

      // Validación estricta de sesión y rol del salón
      const authCheck = await requireTenantRole(req, bookingTenant, ['owner', 'admin', 'staff'], sesion);
      if (authCheck.status !== 200) {
        return res.status(authCheck.status).json({ error: authCheck.error });
      }

      // Reprogramación de Cita (cambio de fecha y turno aislado por salón)
      if (action === 'reschedule' && date && timeSlot) {
        if (targetBooking[0].status === 'cancelada') {
          return res.status(409).json({ error: 'La cita está cancelada: crea una nueva reserva.' });
        }
        const cleanDate = String(date).trim();
        const cleanTime = String(timeSlot).trim().toUpperCase();
        if (!fechaReal(cleanDate) || !TURNO_VALIDO.test(cleanTime)) {
          return res.status(400).json({ error: 'Fecha o turno con formato inválido.' });
        }

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
        const citaCambiada = await cargarCita(sql, cleanId, bookingTenant).catch(() => null);
        if (citaCambiada) await conLimite(enviarAviso(sql, 'cambio', citaCambiada, `${cleanDate} ${cleanTime}`));

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
      // Una cita cancelada no puede volver a activarse: el cupón y el saldo ya se devolvieron.
      if (targetBooking[0].status === 'cancelada' && cleanStatus !== 'cancelada') {
        return res.status(409).json({ error: 'La cita está cancelada: crea una nueva reserva.' });
      }
      if (cleanStatus === 'cancelada') {
        await sql.transaction([
          sql`
            UPDATE public.bookings
            SET status = 'cancelada',
                notes = CASE WHEN ${reasonTag} = '' THEN notes
                             WHEN notes IS NULL OR notes = '' THEN ${reasonTag}
                             ELSE notes || ' ' || ${reasonTag} END
            WHERE id = ${cleanId} AND tenant_id = ${bookingTenant};
          `,
          ...escriturasDeDevolucion(sql, bookingTenant, cleanId),
        ]);
      } else if (reasonTag) {
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

      // Avisos a la clienta al confirmar o cancelar (G-057).
      if (cleanStatus === 'confirmada' || cleanStatus === 'cancelada') {
        const citaEstado = await cargarCita(sql, cleanId, bookingTenant).catch(() => null);
        if (citaEstado) {
          await conLimite(enviarAviso(sql, cleanStatus, citaEstado, cleanStatus === 'confirmada' ? `${citaEstado.fecha} ${citaEstado.turno}` : ''));
        }
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

      // Sesión antes de buscar (401 para anónimos, sin revelar si la cita existe).
      const sesion = await requireSession(req);
      if (sesion.status !== 200) {
        return res.status(sesion.status).json({ error: sesion.error });
      }

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

      // Borrar solo dueño o admin (decisión de karc0, 27/10): el staff cambia estados, no borra.
      const authCheck = await requireTenantRole(req, bookingTenant, ['owner', 'admin'], sesion);
      if (authCheck.status !== 200) {
        return res.status(authCheck.status).json({ error: authCheck.error });
      }

      // Antes de borrar, se devuelven el uso del cupón y el saldo de la tarjeta regalo (misma transacción).
      await sql.transaction([
        ...escriturasDeDevolucion(sql, bookingTenant, cleanId),
        sql`
          DELETE FROM public.bookings 
          WHERE id = ${cleanId} AND tenant_id = ${bookingTenant};
        `,
      ]);

      return res.status(200).json({ success: true, deletedId: cleanId });
    } catch (err: any) {
      console.error('[Neon Delete Booking Error]:', err);
      return res.status(500).json({ error: 'Error al eliminar reserva.' });
    }
  }

  return res.status(405).json({ error: 'Método no permitido.' });
}
