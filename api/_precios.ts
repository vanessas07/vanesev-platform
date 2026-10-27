// Precio de una cita decidido SOLO por el servidor (G-033): base → oferta → primera visita → cupón → tarjeta regalo.
// Las escrituras de cupón y tarjeta van en la MISMA transacción que la cita; los CHECK de la migración 0009
// (usos ≤ máximo, saldo ≥ 0, un uso por clienta) revierten la reserva entera si se superan.
import { createHash, randomUUID } from 'node:crypto';

export const CUPON_VALIDO = /^[A-Z0-9-]{3,20}$/;

const redondear = (n: number) => Math.round(n * 100) / 100;

export function hoyEnCaracas(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Caracas' }).format(new Date());
}

/** «10:30 AM» o «10:30» → «10:30» (24 h). */
export function hora24(turno: string): string | null {
  const m = /^(\d{1,2}):(\d{2})(?:\s*(AM|PM))?$/i.exec(String(turno).trim());
  if (!m) return null;
  let h = Number(m[1]);
  const ap = m[3]?.toUpperCase();
  if (ap === 'PM' && h < 12) h += 12;
  if (ap === 'AM' && h === 12) h = 0;
  if (h > 23 || Number(m[2]) > 59) return null;
  return `${String(h).padStart(2, '0')}:${m[2]}`;
}

/** Código de tarjeta regalo normalizado (sin espacios ni guiones, en mayúsculas) y su hash. */
export function hashTarjeta(codigo: string): string {
  const limpio = String(codigo || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  return createHash('sha256').update(`vanesev-tarjeta:${limpio}`).digest('hex');
}

export interface Desglose {
  base: number;
  oferta: { id: string; titulo: string; descuento: number } | null;
  primeraVisita: number;
  cupon: { id: string; codigo: string; descuento: number; clave: string } | null;
  tarjeta: { id: string; pago: number; saldoRestante: number } | null;
  total: number;
}

interface Entrada {
  tenant: string;
  servicioId: string;
  precioBase: number;
  fecha: string;
  turno: string;
  telefono: string;
  primeraVisitaReclamada: boolean;
  cupon?: string | null;
  tarjeta?: string | null;
}

type Resultado = { ok: true; desglose: Desglose } | { ok: false; status: number; error: string };

export async function calcularPrecio(sql: any, e: Entrada): Promise<Resultado> {
  const base = redondear(e.precioBase);
  let precio = base;
  const hoy = hoyEnCaracas();
  const hora = hora24(e.turno);

  // 1. Oferta con precio especial del servicio, vigente en la fecha y la hora de la cita (la más barata).
  let oferta: Desglose['oferta'] = null;
  const ofertas = await sql`
    SELECT id, titulo, precio_especial_usd
    FROM public.ofertas
    WHERE tenant_id = ${e.tenant} AND activa = true AND servicio_id = ${e.servicioId}
      AND precio_especial_usd IS NOT NULL
      AND (inicio IS NULL OR inicio <= ${e.fecha}::date) AND (fin IS NULL OR fin >= ${e.fecha}::date)
      AND (hora_inicio IS NULL OR (${hora}::time >= hora_inicio AND ${hora}::time < hora_fin))
    ORDER BY precio_especial_usd ASC
    LIMIT 1;
  `;
  if (ofertas.length && Number(ofertas[0].precio_especial_usd) < precio) {
    const especial = redondear(Number(ofertas[0].precio_especial_usd));
    oferta = { id: ofertas[0].id, titulo: ofertas[0].titulo, descuento: redondear(precio - especial) };
    precio = especial;
  }

  // 2. Primera visita: solo si nunca ha reservado en este salón (importe configurado por el salón).
  let primeraVisita = 0;
  if (e.primeraVisitaReclamada) {
    const [previas, salon] = await Promise.all([
      sql`SELECT COUNT(*)::int AS n FROM public.bookings WHERE tenant_id = ${e.tenant} AND client_phone = ${e.telefono} AND status != 'cancelada';`,
      sql`SELECT first_visit_discount_usd FROM public.tenants WHERE id = ${e.tenant} LIMIT 1;`,
    ]);
    if (Number(previas[0]?.n || 0) === 0) {
      const importe = salon[0]?.first_visit_discount_usd;
      primeraVisita = redondear(Math.min(precio, importe === null || importe === undefined ? 2 : Number(importe) || 0));
      precio = redondear(precio - primeraVisita);
    }
  }

  // 3. Cupón de descuento.
  let cupon: Desglose['cupon'] = null;
  if (e.cupon) {
    const codigo = String(e.cupon).trim().toUpperCase();
    if (!CUPON_VALIDO.test(codigo)) return { ok: false, status: 400, error: 'Cupón no válido.' };
    const filas = await sql`
      SELECT id, codigo, tipo, valor, uno_por_clienta
      FROM public.cupones
      WHERE tenant_id = ${e.tenant} AND codigo = ${codigo} AND activo = true
        AND (inicio IS NULL OR inicio <= ${hoy}::date) AND (fin IS NULL OR fin >= ${hoy}::date)
        AND (servicios IS NULL OR cardinality(servicios) = 0 OR ${e.servicioId} = ANY(servicios))
        AND (usos_max IS NULL OR usos < usos_max)
      LIMIT 1;
    `;
    if (!filas.length) return { ok: false, status: 400, error: 'Cupón no válido, caducado o agotado para este servicio.' };
    const c = filas[0];
    if (c.uno_por_clienta) {
      const usado = await sql`SELECT 1 FROM public.cupon_usos WHERE cupon_id = ${c.id} AND clave = ${e.telefono} LIMIT 1;`;
      if (usado.length) return { ok: false, status: 409, error: 'Ya has usado este cupón.' };
    }
    const descuento = redondear(Math.min(precio, c.tipo === 'porcentaje' ? (precio * Number(c.valor)) / 100 : Number(c.valor)));
    cupon = { id: c.id, codigo: c.codigo, descuento, clave: c.uno_por_clienta ? e.telefono : '' };
    precio = redondear(precio - descuento);
  }

  // 4. Tarjeta regalo: paga lo que quede, hasta su saldo.
  let tarjeta: Desglose['tarjeta'] = null;
  if (e.tarjeta) {
    const filas = await sql`
      SELECT id, saldo_usd FROM public.tarjetas_regalo
      WHERE codigo_hash = ${hashTarjeta(e.tarjeta)} AND tenant_id = ${e.tenant} AND activa = true
        AND (caduca IS NULL OR caduca >= ${hoy}::date) AND saldo_usd > 0
      LIMIT 1;
    `;
    if (!filas.length) return { ok: false, status: 400, error: 'Tarjeta regalo no válida, caducada o sin saldo.' };
    const saldo = Number(filas[0].saldo_usd);
    const pago = redondear(Math.min(saldo, precio));
    tarjeta = { id: filas[0].id, pago, saldoRestante: redondear(saldo - pago) };
    precio = redondear(precio - pago);
  }

  return { ok: true, desglose: { base, oferta, primeraVisita, cupon, tarjeta, total: Math.max(0, precio) } };
}

/** Escrituras que acompañan al INSERT de la cita, en la misma transacción. */
export function escriturasDeDescuentos(sql: any, tenant: string, bookingId: string, d: Desglose): any[] {
  const q: any[] = [];
  if (d.cupon) {
    q.push(sql`
      INSERT INTO public.cupon_usos (id, cupon_id, tenant_id, booking_id, clave, descuento_usd)
      VALUES (${`cu_${randomUUID()}`}, ${d.cupon.id}, ${tenant}, ${bookingId}, ${d.cupon.clave || bookingId}, ${d.cupon.descuento});
    `);
    q.push(sql`UPDATE public.cupones SET usos = usos + 1, updated_at = NOW() WHERE id = ${d.cupon.id} AND tenant_id = ${tenant};`);
  }
  if (d.tarjeta && d.tarjeta.pago > 0) {
    q.push(sql`UPDATE public.tarjetas_regalo SET saldo_usd = saldo_usd - ${d.tarjeta.pago} WHERE id = ${d.tarjeta.id} AND tenant_id = ${tenant};`);
    q.push(sql`
      INSERT INTO public.tarjeta_movimientos (id, tarjeta_id, tenant_id, booking_id, importe_usd, motivo)
      VALUES (${`tm_${randomUUID()}`}, ${d.tarjeta.id}, ${tenant}, ${bookingId}, ${-d.tarjeta.pago}, 'reserva');
    `);
  }
  return q;
}

/**
 * Devuelve el uso del cupón y el saldo de la tarjeta de una cita cancelada o borrada.
 * Idempotente: tras la primera vez ya no queda uso ni pago que devolver.
 */
export function escriturasDeDevolucion(sql: any, tenant: string, bookingId: string): any[] {
  return [
    sql`
      UPDATE public.cupones SET usos = usos - 1, updated_at = NOW()
      WHERE tenant_id = ${tenant} AND usos > 0
        AND id = (SELECT cupon_id FROM public.cupon_usos WHERE booking_id = ${bookingId} AND tenant_id = ${tenant});
    `,
    sql`DELETE FROM public.cupon_usos WHERE booking_id = ${bookingId} AND tenant_id = ${tenant};`,
    sql`
      UPDATE public.tarjetas_regalo t SET saldo_usd = t.saldo_usd + b.pago_tarjeta_usd
      FROM public.bookings b
      WHERE b.id = ${bookingId} AND b.tenant_id = ${tenant} AND t.id = b.tarjeta_regalo_id
        AND t.tenant_id = ${tenant} AND b.pago_tarjeta_usd > 0;
    `,
    sql`
      INSERT INTO public.tarjeta_movimientos (id, tarjeta_id, tenant_id, booking_id, importe_usd, motivo)
      SELECT ${`tm_${randomUUID()}`}, b.tarjeta_regalo_id, b.tenant_id, b.id, b.pago_tarjeta_usd, 'devolucion'
      FROM public.bookings b
      WHERE b.id = ${bookingId} AND b.tenant_id = ${tenant} AND b.tarjeta_regalo_id IS NOT NULL AND b.pago_tarjeta_usd > 0;
    `,
    sql`UPDATE public.bookings SET pago_tarjeta_usd = 0 WHERE id = ${bookingId} AND tenant_id = ${tenant};`,
  ];
}

/** Errores de los CHECK/UNIQUE de la 0009 que significan «límite superado» (la transacción ya se revirtió). */
export function esLimiteDeDescuento(err: any): boolean {
  const c = String(err?.constraint || err?.message || '');
  return /chk_cupones_usos|uq_cupon_usos_clave|chk_tarjetas_saldo/.test(c);
}
