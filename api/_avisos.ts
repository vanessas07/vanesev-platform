// Avisos automáticos por correo (T-38; G-056 a G-059).
// Cada aviso se «reclama» en public.avisos_enviados antes de enviarse: nunca sale dos veces,
// aunque el cron se ejecute a la vez desde Vercel y desde GitHub.
import { enviarCorreo } from './_correo.js';
import { avisarPorWhatsapp } from './_whatsapp.js';

export type TipoAviso =
  | 'solicitud'
  | 'confirmada'
  | 'cambio'
  | 'cancelada'
  | 'recordatorio_dia'
  | 'recordatorio_2h'
  | 'nueva_reserva';

export interface CitaAviso {
  id: string;
  tenantId: string;
  salon: string;
  salonWhatsapp: string | null;
  salonDireccion: string | null;
  clienta: string;
  clientaEmail: string | null;
  clientaTelefono: string;
  servicio: string;
  especialista: string | null;
  fecha: string; // AAAA-MM-DD (hora de Caracas)
  turno: string; // «10:30 AM» o «14:00»
  totalUSD: number;
  avisosActivos: boolean;
}

const ZONA = 'America/Caracas';
const WEB = 'https://vanesev.com';
const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

/** «10:30 AM» o «14:00» → minutos desde medianoche. */
export function minutosDelTurno(turno: string): number | null {
  const m = String(turno).trim().toUpperCase().match(/^(\d{1,2}):(\d{2})(?:\s*(AM|PM))?$/);
  if (!m) return null;
  let h = Number(m[1]);
  const min = Number(m[2]);
  if (m[3] === 'PM' && h < 12) h += 12;
  if (m[3] === 'AM' && h === 12) h = 0;
  return h * 60 + min;
}

/** Fecha y minutos actuales en Caracas. */
export function ahoraEnCaracas(): { fecha: string; minutos: number } {
  const partes = new Intl.DateTimeFormat('en-CA', { timeZone: ZONA, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false }).formatToParts(new Date());
  const v = (t: string) => partes.find((p) => p.type === t)?.value || '00';
  return { fecha: `${v('year')}-${v('month')}-${v('day')}`, minutos: (Number(v('hour')) % 24) * 60 + Number(v('minute')) };
}

export function sumarDias(fecha: string, dias: number): string {
  const d = new Date(`${fecha}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString().slice(0, 10);
}

function fechaLarga(fecha: string): string {
  const d = new Date(`${fecha}T12:00:00Z`);
  return `${DIAS[d.getUTCDay()]} ${d.getUTCDate()} de ${MESES[d.getUTCMonth()]}`;
}

function horaBonita(turno: string): string {
  const m = minutosDelTurno(turno);
  if (m === null) return turno;
  const h = Math.floor(m / 60);
  const min = String(m % 60).padStart(2, '0');
  return `${h % 12 === 0 ? 12 : h % 12}:${min} ${h < 12 ? 'a. m.' : 'p. m.'}`;
}

const esc = (s: string) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** Enlace para añadir la cita a Google Calendar (hora de Caracas, 1 h por defecto). */
function enlaceCalendario(c: CitaAviso): string {
  const m = minutosDelTurno(c.turno) ?? 9 * 60;
  const f = c.fecha.replace(/-/g, '');
  const hhmm = (x: number) => `${String(Math.floor(x / 60)).padStart(2, '0')}${String(x % 60).padStart(2, '0')}00`;
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: `${c.servicio} · ${c.salon}`,
    dates: `${f}T${hhmm(m)}/${f}T${hhmm(Math.min(m + 60, 23 * 60 + 59))}`,
    ctz: ZONA,
    details: `Tu cita en ${c.salon}${c.especialista ? ` con ${c.especialista}` : ''}.`,
    ...(c.salonDireccion ? { location: c.salonDireccion } : {}),
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

function enlaceWhatsappSalon(c: CitaAviso, texto: string): string | null {
  const tel = String(c.salonWhatsapp || '').replace(/\D/g, '');
  return tel ? `https://wa.me/${tel}?text=${encodeURIComponent(texto)}` : null;
}

// ─── Plantilla de correo: tablas y estilos en línea (Gmail, Outlook y Apple Mail) ─
export function plantilla(o: { previa: string; etiqueta: string; titulo: string; intro: string; filas: [string, string][]; botones: { texto: string; url: string; principal?: boolean }[]; nota?: string; salon: string; pie?: string }): string {
  const filas = o.filas
    .map(([k, v]) => `<tr><td style="padding:10px 0;border-bottom:1px solid #EFE9E1;font:600 12px Arial,sans-serif;letter-spacing:.08em;text-transform:uppercase;color:#8A6A2E;width:38%">${esc(k)}</td><td style="padding:10px 0;border-bottom:1px solid #EFE9E1;font:600 15px Arial,sans-serif;color:#1A1020">${esc(v)}</td></tr>`)
    .join('');
  const botones = o.botones
    .map((b) => `<a href="${esc(b.url)}" style="display:inline-block;margin:6px 6px 0 0;padding:14px 24px;border-radius:999px;font:700 14px Arial,sans-serif;text-decoration:none;${b.principal ? 'background:#1F1226;color:#ffffff' : 'background:#F4F0EA;color:#1F1226;border:1px solid #E4D9C6'}">${esc(b.texto)}</a>`)
    .join('');
  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(o.titulo)}</title></head>
<body style="margin:0;padding:0;background:#F4F0EA">
<span style="display:none;max-height:0;overflow:hidden">${esc(o.previa)}</span>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F4F0EA"><tr><td align="center" style="padding:28px 14px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:24px;overflow:hidden">
<tr><td style="background:#1F1226;padding:28px 32px">
<div style="font:600 11px Arial,sans-serif;letter-spacing:.3em;text-transform:uppercase;color:#E7CF9C">${esc(o.etiqueta)}</div>
<div style="margin-top:10px;font:500 28px Georgia,'Times New Roman',serif;line-height:1.15;color:#ffffff">${esc(o.salon)}</div>
</td></tr>
<tr><td style="height:3px;background:linear-gradient(90deg,#9C7A3C,#F3E6C4,#C9A45C);background-color:#C9A45C"></td></tr>
<tr><td style="padding:30px 32px 8px">
<h1 style="margin:0;font:500 26px Georgia,'Times New Roman',serif;line-height:1.2;color:#1A1020">${esc(o.titulo)}</h1>
<p style="margin:12px 0 0;font:400 15px/1.6 Arial,sans-serif;color:#4A4150">${esc(o.intro)}</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:18px">${filas}</table>
<div style="margin-top:20px">${botones}</div>
${o.nota ? `<p style="margin:20px 0 0;font:400 13px/1.6 Arial,sans-serif;color:#6E6478">${esc(o.nota)}</p>` : ''}
</td></tr>
<tr><td style="padding:24px 32px 28px;font:400 12px/1.6 Arial,sans-serif;color:#9A92A3">${o.pie ? esc(o.pie) : `Reserva gestionada con <a href="${WEB}" style="color:#7D6438;text-decoration:none;font-weight:700">VANESEV</a>. Si no reservaste esta cita, ignora este correo.`}</td></tr>
</table></td></tr></table></body></html>`;
}

interface Mensaje { para: string; asunto: string; html: string; texto: string }

/** Construye el correo de cada tipo de aviso. */
export function construirAviso(tipo: TipoAviso, c: CitaAviso, correoDuena?: string): Mensaje | null {
  const cuando = `${fechaLarga(c.fecha)} a las ${horaBonita(c.turno)}`;
  const filas: [string, string][] = [
    ['Servicio', c.servicio],
    ...(c.especialista ? [['Con', c.especialista] as [string, string]] : []),
    ['Cuándo', cuando],
    ['Total', `${c.totalUSD.toFixed(2).replace('.', ',')} $`],
    ...(c.salonDireccion ? [['Dónde', c.salonDireccion] as [string, string]] : []),
  ];
  const nombre = c.clienta.split(' ')[0] || c.clienta;
  const wa = (t: string) => enlaceWhatsappSalon(c, t);
  const cambiar = wa(`Hola, soy ${c.clienta}. Necesito cambiar mi cita de ${c.servicio} del ${cuando}.`);
  const base = { salon: c.salon };

  if (tipo === 'nueva_reserva') {
    if (!correoDuena) return null;
    const texto = `Nueva reserva: ${c.clienta} (${c.clientaTelefono}) · ${c.servicio} · ${cuando}.`;
    return {
      para: correoDuena,
      asunto: `Nueva reserva: ${c.clienta} · ${fechaLarga(c.fecha)}, ${horaBonita(c.turno)}`,
      texto,
      html: plantilla({
        ...base,
        previa: texto,
        etiqueta: 'Nueva reserva',
        titulo: `${c.clienta} ha reservado.`,
        intro: 'Te llegó también al WhatsApp. Confírmala en tu panel y le avisamos por correo.',
        filas: [['Clienta', c.clienta], ['Teléfono', c.clientaTelefono], ...filas],
        botones: [
          { texto: 'Abrir mi panel', url: `${WEB}/${c.tenantId}/admin`, principal: true },
          ...(c.clientaTelefono ? [{ texto: 'Escribirle por WhatsApp', url: `https://wa.me/${c.clientaTelefono.replace(/\D/g, '')}` }] : []),
        ],
      }),
    };
  }

  if (!c.clientaEmail) return null;
  const textos: Record<Exclude<TipoAviso, 'nueva_reserva'>, { asunto: string; etiqueta: string; titulo: string; intro: string; nota?: string; calendario?: boolean }> = {
    solicitud: { asunto: `Hemos recibido tu reserva en ${c.salon}`, etiqueta: 'Solicitud recibida', titulo: `¡Gracias, ${nombre}!`, intro: `Tu reserva está en manos de ${c.salon}. En cuanto la confirmen, te llegará otro correo.` },
    confirmada: { asunto: `Tu cita está confirmada · ${fechaLarga(c.fecha)}`, etiqueta: 'Cita confirmada', titulo: `Te esperamos, ${nombre}.`, intro: 'Tu cita está confirmada. Añádela a tu calendario para no olvidarla.', calendario: true },
    cambio: { asunto: `Tu cita ha cambiado · ${fechaLarga(c.fecha)}`, etiqueta: 'Cita cambiada', titulo: 'Tu cita tiene nueva fecha.', intro: 'Estos son los datos actualizados de tu cita.', calendario: true },
    cancelada: { asunto: `Tu cita en ${c.salon} se ha cancelado`, etiqueta: 'Cita cancelada', titulo: 'Tu cita se ha cancelado.', intro: 'Si quieres otra fecha, reserva de nuevo cuando quieras.', nota: 'Si usaste un cupón o una tarjeta regalo, el saldo vuelve a estar disponible.' },
    recordatorio_dia: { asunto: `Mañana te esperamos · ${horaBonita(c.turno)}`, etiqueta: 'Recordatorio', titulo: `${nombre}, mañana es tu cita.`, intro: `Te esperamos en ${c.salon}.`, calendario: true },
    recordatorio_2h: { asunto: `Tu cita es a las ${horaBonita(c.turno)}`, etiqueta: 'Hoy es el día', titulo: `En un rato te vemos, ${nombre}.`, intro: `Tu cita en ${c.salon} es hoy a las ${horaBonita(c.turno)}.` },
  };
  const t = textos[tipo];
  const botones: { texto: string; url: string; principal?: boolean }[] = [];
  if (t.calendario) botones.push({ texto: 'Añadir a mi calendario', url: enlaceCalendario(c), principal: true });
  if (tipo === 'cancelada') botones.push({ texto: 'Reservar de nuevo', url: `${WEB}/m/${c.tenantId}`, principal: true });
  if (cambiar && tipo !== 'cancelada') botones.push({ texto: 'Cambiar o cancelar', url: cambiar });
  return {
    para: c.clientaEmail,
    asunto: t.asunto,
    texto: `${t.titulo} ${t.intro} ${c.servicio} · ${cuando} · ${c.salon}.`,
    html: plantilla({ ...base, previa: `${c.servicio} · ${cuando}`, etiqueta: t.etiqueta, titulo: t.titulo, intro: t.intro, filas, botones, nota: t.nota }),
  };
}

/** Datos de una cita para los avisos, siempre con su salón. */
export async function cargarCita(sql: any, bookingId: string, tenantId: string): Promise<CitaAviso | null> {
  const filas = await sql`
    SELECT b.id, b.tenant_id, b.client_name, b.client_email, b.client_phone, b.service_name, b.staff_name,
           to_char(b.date, 'YYYY-MM-DD') AS fecha, b.time_slot, b.total_price_usd,
           t.business_name, t.whatsapp_phone, t.address, t.city, COALESCE(t.avisos_correo, true) AS avisos_correo
    FROM public.bookings b
    JOIN public.tenants t ON t.id = b.tenant_id
    WHERE b.id = ${bookingId} AND b.tenant_id = ${tenantId}
    LIMIT 1;
  `;
  return filas.length ? filaACita(filas[0]) : null;
}

export function filaACita(r: any): CitaAviso {
  return {
    id: r.id,
    tenantId: r.tenant_id,
    salon: r.business_name || r.tenant_id,
    salonWhatsapp: r.whatsapp_phone || null,
    salonDireccion: [r.address, r.city].filter(Boolean).join(', ') || null,
    clienta: r.client_name || 'Clienta',
    clientaEmail: r.client_email || null,
    clientaTelefono: r.client_phone || '',
    servicio: r.service_name || 'Tu servicio',
    especialista: r.staff_name || null,
    fecha: r.fecha,
    turno: r.time_slot,
    totalUSD: Number(r.total_price_usd || 0),
    avisosActivos: r.avisos_correo !== false,
  };
}

/** Correos de las dueñas del salón (rol owner). */
async function correosDuena(sql: any, tenantId: string): Promise<string[]> {
  const filas = await sql`
    SELECT DISTINCT u.email
    FROM "member" m
    JOIN "user" u ON u.id = m."userId"
    JOIN "organization" o ON o.id = m."organizationId"
    WHERE o.slug = ${tenantId} AND m.role = 'owner' AND u.email IS NOT NULL;
  `;
  return filas.map((f: any) => String(f.email)).filter((e: string) => e.includes('@'));
}

/**
 * Envía un aviso una sola vez, por WhatsApp y por correo. Devuelve cuántos mensajes salieron.
 * Nunca lanza: un fallo de correo no puede romper una reserva ni el cron.
 * `clave` distingue avisos del mismo tipo para fechas distintas (cita cambiada, recordatorio de otra fecha).
 */
export async function enviarAviso(sql: any, tipo: TipoAviso, cita: CitaAviso, clave = ''): Promise<number> {
  // WhatsApp (C-01) va por su propio interruptor, en la conexión del salón; el correo, por «Avisos por correo».
  const porWhatsapp = await avisarPorWhatsapp(sql, tipo, cita, clave);
  return porWhatsapp + (await avisarPorCorreo(sql, tipo, cita, clave));
}

async function avisarPorCorreo(sql: any, tipo: TipoAviso, cita: CitaAviso, clave = ''): Promise<number> {
  try {
    if (!cita.avisosActivos) return 0;
    const destinos = tipo === 'nueva_reserva' ? await correosDuena(sql, cita.tenantId) : cita.clientaEmail ? [cita.clientaEmail] : [];
    let enviados = 0;
    for (const destino of destinos) {
      const tipoClave = clave ? `${tipo}:${clave}`.slice(0, 60) : tipo;
      const reclamo = await sql`
        INSERT INTO public.avisos_enviados (booking_id, tenant_id, tipo, destinatario)
        VALUES (${cita.id}, ${cita.tenantId}, ${tipoClave}, ${destino.toLowerCase().slice(0, 160)})
        ON CONFLICT DO NOTHING
        RETURNING booking_id;
      `;
      if (!reclamo.length) continue; // ya enviado (o enviándose en otra ejecución)
      const msg = construirAviso(tipo, cita, destino);
      if (!msg) continue;
      try {
        await enviarCorreo({ para: msg.para, asunto: msg.asunto, texto: msg.texto, html: msg.html });
        enviados++;
      } catch (e: any) {
        // Se deja constancia del fallo; no se reintenta en bucle.
        console.error('[avisos] fallo de envío', tipo, cita.tenantId, e?.code || e?.message || 'error');
        await sql`UPDATE public.avisos_enviados SET ok = false WHERE booking_id = ${cita.id} AND tipo = ${tipoClave} AND destinatario = ${destino.toLowerCase().slice(0, 160)};`;
      }
    }
    return enviados;
  } catch (e: any) {
    console.error('[avisos] error', tipo, e?.message || 'error');
    return 0;
  }
}

/** Para las reservas: no espera más de `ms` a que salgan los correos. */
export async function conLimite<T>(p: Promise<T>, ms = 6000): Promise<T | null> {
  return Promise.race([p, new Promise<null>((r) => setTimeout(() => r(null), ms))]);
}
