// WhatsApp de cada salón con la API de Meta en SU propio número (C-01; G-054, G-062).
// - La dueña conecta su WhatsApp Business Platform desde su panel: su número, su app de Meta y sus cuotas.
// - VANESEV guarda el token y el secreto de la app cifrados (AES-256-GCM, clave WHATSAPP_CLAVE) y no los devuelve nunca.
// - Avisos por plantilla: confirmación, cambio, cancelación y recordatorios a la clienta; aviso de reserva a la especialista.
// - Agente: contesta a las clientas con los datos reales del salón (horario, servicios, precios, ofertas y enlace
//   para reservar). Sin IA (G-062): no inventa nada y no tiene coste por mensaje.
import { createCipheriv, createDecipheriv, createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import type { CitaAviso, TipoAviso } from './_avisos.js';

const GRAPH = 'https://graph.facebook.com/v21.0';
const WEB = 'https://vanesev.com';
const ZONA = 'America/Caracas';

// ─── Cifrado del acceso de cada salón ───────────────────────────────────────
function clave(): Buffer {
  const b64 = process.env.WHATSAPP_CLAVE || '';
  const k = Buffer.from(b64, 'base64');
  if (k.length !== 32) throw new Error('WHATSAPP_CLAVE ausente o no tiene 32 bytes.');
  return k;
}

export function cifrar(texto: string): string {
  const iv = randomBytes(12);
  const c = createCipheriv('aes-256-gcm', clave(), iv);
  const ct = Buffer.concat([c.update(texto, 'utf8'), c.final()]);
  return `v1:${Buffer.concat([iv, c.getAuthTag(), ct]).toString('base64')}`;
}

export function descifrar(blob: string): string {
  if (!blob.startsWith('v1:')) throw new Error('Formato de cifrado desconocido.');
  const raw = Buffer.from(blob.slice(3), 'base64');
  const d = createDecipheriv('aes-256-gcm', clave(), raw.subarray(0, 12));
  d.setAuthTag(raw.subarray(12, 28));
  return Buffer.concat([d.update(raw.subarray(28)), d.final()]).toString('utf8');
}

export const hayClave = () => {
  try { clave(); return true; } catch { return false; }
};

// ─── Teléfonos ───────────────────────────────────────────────────────────────
/** «0414-123.45.67» → «584141234567». Devuelve null si no parece un móvil. */
export function normalizarTelefono(tel: string | null | undefined): string | null {
  let d = String(tel || '').replace(/\D/g, '');
  if (d.startsWith('00')) d = d.slice(2);
  if (d.length === 11 && d.startsWith('0')) d = `58${d.slice(1)}`; // número venezolano local
  if (d.length === 10 && /^4\d{9}$/.test(d)) d = `58${d}`;
  return d.length >= 10 && d.length <= 15 ? d : null;
}

// ─── Llamadas a la API de Meta ───────────────────────────────────────────────
export interface Conexion {
  tenantId: string;
  phoneNumberId: string;
  token: string;
  agenteActivo: boolean;
  avisosClienta: boolean;
  avisosEquipo: boolean;
}

async function graph(ruta: string, token: string, init: { method?: string; body?: any } = {}): Promise<{ ok: boolean; status: number; json: any }> {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), 8000);
  try {
    const res = await fetch(`${GRAPH}/${ruta}`, {
      method: init.method || 'GET',
      headers: { Authorization: `Bearer ${token}`, ...(init.body ? { 'Content-Type': 'application/json' } : {}) },
      body: init.body ? JSON.stringify(init.body) : undefined,
      signal: ctl.signal,
    });
    const json = await res.json().catch(() => ({}));
    return { ok: res.ok, status: res.status, json };
  } catch (e: any) {
    return { ok: false, status: 0, json: { error: { message: e?.name === 'AbortError' ? 'Meta no respondió a tiempo.' : 'Sin conexión con Meta.' } } };
  } finally {
    clearTimeout(t);
  }
}

/** Mensaje de error de Meta, legible y sin datos sensibles. */
export function errorDeMeta(json: any): string {
  const e = json?.error || {};
  const base = String(e.error_user_msg || e.message || 'Meta rechazó la petición.');
  return `${base}${e.code ? ` (código ${e.code})` : ''}`.slice(0, 280);
}

/** Comprueba que el token abre ese número y devuelve el número visible y el nombre verificado. */
export async function verificarNumero(phoneNumberId: string, token: string) {
  const r = await graph(`${phoneNumberId}?fields=display_phone_number,verified_name,quality_rating`, token);
  if (!r.ok) return { ok: false as const, error: errorDeMeta(r.json) };
  return { ok: true as const, numero: String(r.json.display_phone_number || ''), nombre: String(r.json.verified_name || '') };
}

export async function enviarTexto(c: Conexion, para: string, texto: string) {
  return graph(`${c.phoneNumberId}/messages`, c.token, {
    method: 'POST',
    body: { messaging_product: 'whatsapp', recipient_type: 'individual', to: para, type: 'text', text: { preview_url: true, body: texto.slice(0, 4000) } },
  });
}

export async function enviarPlantilla(c: Conexion, para: string, nombre: string, parametros: string[], idioma = 'es') {
  return graph(`${c.phoneNumberId}/messages`, c.token, {
    method: 'POST',
    body: {
      messaging_product: 'whatsapp',
      to: para,
      type: 'template',
      template: {
        name: nombre,
        language: { code: idioma },
        ...(parametros.length ? { components: [{ type: 'body', parameters: parametros.map((p) => ({ type: 'text', text: p.slice(0, 900) })) }] } : {}),
      },
    },
  });
}

async function marcarLeido(c: Conexion, mensajeId: string) {
  await graph(`${c.phoneNumberId}/messages`, c.token, { method: 'POST', body: { messaging_product: 'whatsapp', status: 'read', message_id: mensajeId } });
}

// ─── Plantillas que cada dueña crea en su WhatsApp Manager (guía del panel) ──
export const PLANTILLAS = [
  { nombre: 'vanesev_cita_confirmada', para: 'Clienta', texto: 'Hola {{1}}, tu cita en {{2}} está confirmada: {{3}}, {{4}}. Si necesitas cambiarla, responde a este mensaje.' },
  { nombre: 'vanesev_cita_cambiada', para: 'Clienta', texto: 'Hola {{1}}, tu cita en {{2}} ha cambiado: {{3}}, {{4}}. Si no te viene bien, responde a este mensaje.' },
  { nombre: 'vanesev_cita_cancelada', para: 'Clienta', texto: 'Hola {{1}}, tu cita en {{2}} de {{3}}, {{4}}, se ha cancelado. Cuando quieras, reserva otra respondiendo a este mensaje.' },
  { nombre: 'vanesev_recordatorio', para: 'Clienta', texto: 'Hola {{1}}, te recordamos tu cita en {{2}}: {{3}}, {{4}}. ¡Te esperamos!' },
  { nombre: 'vanesev_nueva_reserva', para: 'Tu equipo', texto: 'Nueva reserva en {{1}}: {{2}} ({{3}}), {{4}}, {{5}}. Confírmala en tu panel.' },
] as const;

const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
function cuandoTexto(c: CitaAviso, prefijo = ''): string {
  const d = new Date(`${c.fecha}T12:00:00Z`);
  return `${prefijo}${DIAS[d.getUTCDay()]} ${d.getUTCDate()} de ${MESES[d.getUTCMonth()]} a las ${c.turno}`;
}

function plantillaDe(tipo: TipoAviso | 'aviso_equipo', c: CitaAviso): { nombre: string; params: string[] } | null {
  const nombre = c.clienta.split(' ')[0] || c.clienta;
  switch (tipo) {
    case 'confirmada': return { nombre: 'vanesev_cita_confirmada', params: [nombre, c.salon, c.servicio, cuandoTexto(c, 'el ')] };
    case 'cambio': return { nombre: 'vanesev_cita_cambiada', params: [nombre, c.salon, c.servicio, cuandoTexto(c, 'ahora el ')] };
    case 'cancelada': return { nombre: 'vanesev_cita_cancelada', params: [nombre, c.salon, c.servicio, cuandoTexto(c, 'el ')] };
    case 'recordatorio_dia': return { nombre: 'vanesev_recordatorio', params: [nombre, c.salon, c.servicio, `mañana a las ${c.turno}`] };
    case 'recordatorio_2h': return { nombre: 'vanesev_recordatorio', params: [nombre, c.salon, c.servicio, `hoy a las ${c.turno}`] };
    case 'aviso_equipo': return { nombre: 'vanesev_nueva_reserva', params: [c.salon, c.clienta, c.clientaTelefono || 'sin teléfono', c.servicio, cuandoTexto(c, 'el ')] };
    default: return null; // la solicitud ya la ve la clienta en pantalla
  }
}

// ─── Conexión de un salón ────────────────────────────────────────────────────
export async function cargarConexion(sql: any, tenantId: string, { soloVerificada = true } = {}): Promise<Conexion | null> {
  const filas = await sql`
    SELECT tenant_id, phone_number_id, token_cifrado, estado, agente_activo, avisos_clienta, avisos_equipo
    FROM public.whatsapp_conexiones WHERE tenant_id = ${tenantId} LIMIT 1;
  `;
  const f = filas[0];
  if (!f || (soloVerificada && f.estado !== 'verificada')) return null;
  try {
    return {
      tenantId: f.tenant_id, phoneNumberId: f.phone_number_id, token: descifrar(f.token_cifrado),
      agenteActivo: f.agente_activo, avisosClienta: f.avisos_clienta, avisosEquipo: f.avisos_equipo,
    };
  } catch {
    return null;
  }
}

async function apuntarError(sql: any, tenantId: string, mensaje: string) {
  await sql`UPDATE public.whatsapp_conexiones SET ultimo_error = ${mensaje.slice(0, 300)}, updated_at = now() WHERE tenant_id = ${tenantId};`;
}

/**
 * Avisos por WhatsApp de una cita. Cada aviso sale una sola vez (registro avisos_enviados, destinatario «wa:<número>»).
 * Nunca lanza: un fallo de WhatsApp no puede romper una reserva ni el cron.
 */
export async function avisarPorWhatsapp(sql: any, tipo: TipoAviso, cita: CitaAviso, clave = ''): Promise<number> {
  try {
    const c = await cargarConexion(sql, cita.tenantId);
    if (!c) return 0;
    const envios: { tipo: TipoAviso | 'aviso_equipo'; para: string }[] = [];
    if (tipo === 'nueva_reserva') {
      if (c.avisosEquipo) {
        const staff = await sql`
          SELECT s.phone FROM public.bookings b
          JOIN public.staff_members s ON s.id = b.staff_id AND s.tenant_id = b.tenant_id
          WHERE b.id = ${cita.id} AND b.tenant_id = ${cita.tenantId} LIMIT 1;
        `;
        const tel = normalizarTelefono(staff[0]?.phone);
        if (tel) envios.push({ tipo: 'aviso_equipo', para: tel });
      }
    } else if (c.avisosClienta) {
      const tel = normalizarTelefono(cita.clientaTelefono);
      if (tel) envios.push({ tipo, para: tel });
    }
    let enviados = 0;
    for (const e of envios) {
      const p = plantillaDe(e.tipo, cita);
      if (!p) continue;
      const tipoClave = clave ? `${e.tipo}:${clave}`.slice(0, 60) : e.tipo;
      const destino = `wa:${e.para}`;
      const reclamo = await sql`
        INSERT INTO public.avisos_enviados (booking_id, tenant_id, tipo, destinatario)
        VALUES (${cita.id}, ${cita.tenantId}, ${tipoClave}, ${destino})
        ON CONFLICT DO NOTHING RETURNING booking_id;
      `;
      if (!reclamo.length) continue;
      const r = await enviarPlantilla(c, e.para, p.nombre, p.params);
      if (r.ok) enviados++;
      else {
        await sql`UPDATE public.avisos_enviados SET ok = false WHERE booking_id = ${cita.id} AND tipo = ${tipoClave} AND destinatario = ${destino};`;
        await apuntarError(sql, cita.tenantId, `Aviso «${p.nombre}»: ${errorDeMeta(r.json)}`);
      }
    }
    return enviados;
  } catch (e: any) {
    console.error('[whatsapp] aviso', tipo, e?.message || 'error');
    return 0;
  }
}

// ─── Agente: respuestas con los datos reales del salón (G-062) ───────────────
export type Tema = 'saludo' | 'servicios' | 'horario' | 'ubicacion' | 'ofertas' | 'reservar' | 'persona' | 'otro';

export function clasificar(texto: string): Tema {
  const t = texto.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  if (/\b(persona|humano|asesora|hablar con|atiendame|atiende)\b/.test(t)) return 'persona';
  if (/(oferta|promo|descuento|rebaja|cupon)/.test(t)) return 'ofertas';
  if (/(reserv|cita|turno|agend|hueco|disponib|cupo)/.test(t)) return 'reservar';
  if (/(precio|cuanto|cuesta|vale|servicio|lista|carta|catalogo|tarifa)/.test(t)) return 'servicios';
  if (/(horario|abren|abierto|cierran|que dias|a que hora|atienden)/.test(t)) return 'horario';
  if (/(donde|direccion|ubicacion|ubicad|llegar|local|mapa)/.test(t)) return 'ubicacion';
  if (/^(hola|buenas|buenos|hey|saludos)/.test(t.trim())) return 'saludo';
  return 'otro';
}

interface DatosSalon {
  slug: string;
  nombre: string;
  horario: string | null;
  direccion: string | null;
  tasaBs: number | null;
  servicios: { nombre: string; usd: number; minutos: number | null }[];
  ofertas: { titulo: string; texto: string | null }[];
}

const precio = (usd: number, tasa: number | null) =>
  `${usd.toFixed(2).replace('.', ',').replace(',00', '')} $${tasa ? ` (${Math.round(usd * tasa).toLocaleString('es-VE')} Bs)` : ''}`;

export function construirRespuesta(tema: Tema, d: DatosSalon): string {
  const carta = `${WEB}/m/${d.slug}`;
  const pie = `\n\nReserva aquí, con tus huecos reales: ${carta}\nSi prefieres que te atienda una persona, escribe *persona*.`;
  switch (tema) {
    case 'persona':
      return `Perfecto. Le paso tu mensaje al equipo de ${d.nombre} y te responden en cuanto puedan.`;
    case 'servicios': {
      if (!d.servicios.length) return `Te paso nuestra carta con todos los servicios y precios del día:${pie}`;
      const lista = d.servicios.slice(0, 8).map((s) => `• ${s.nombre}: ${precio(s.usd, d.tasaBs)}${s.minutos ? ` · ${s.minutos} min` : ''}`).join('\n');
      return `Estos son algunos de nuestros servicios en ${d.nombre}:\n${lista}${d.servicios.length > 8 ? '\n…y más en la carta.' : ''}${pie}`;
    }
    case 'horario':
      return `${d.horario ? `Nuestro horario en ${d.nombre}: ${d.horario}.` : `En la carta de ${d.nombre} ves los huecos libres de cada día.`}${pie}`;
    case 'ubicacion':
      return `${d.direccion ? `Estamos en ${d.direccion}.` : `Te enviamos la dirección de ${d.nombre} enseguida.`}${pie}`;
    case 'ofertas':
      return d.ofertas.length
        ? `Ofertas de hoy en ${d.nombre}:\n${d.ofertas.slice(0, 5).map((o) => `• ${o.titulo}${o.texto ? `: ${o.texto}` : ''}`).join('\n')}${pie}`
        : `Hoy no tenemos ofertas activas, pero en la carta ves todos los precios al día.${pie}`;
    case 'reservar':
      return `¡Claro! Elige servicio, especialista y hora en nuestra carta; solo ves los huecos libres de verdad y la cita te queda apartada al momento.${pie}`;
    default:
      return `¡Hola! Gracias por escribir a ${d.nombre}. Puedes preguntarme por *precios*, *horario*, *dirección* u *ofertas*, o reservar directamente.${pie}`;
  }
}

async function datosDelSalon(sql: any, tenantId: string): Promise<DatosSalon | null> {
  const hoy = new Intl.DateTimeFormat('en-CA', { timeZone: ZONA }).format(new Date());
  const [t, servicios, ofertas] = await Promise.all([
    sql`SELECT business_name, business_hours, address, city, exchange_rate_bs FROM public.tenants WHERE id = ${tenantId} LIMIT 1;`,
    sql`
      SELECT name, price_usd, duration_minutes FROM public.services
      WHERE tenant_id = ${tenantId} AND COALESCE(is_available, true) = true
      ORDER BY price_usd ASC NULLS LAST LIMIT 20;
    `,
    sql`
      SELECT titulo, texto FROM public.ofertas
      WHERE tenant_id = ${tenantId} AND activa = true
        AND (inicio IS NULL OR inicio <= ${hoy}::date) AND (fin IS NULL OR fin >= ${hoy}::date)
      ORDER BY orden ASC LIMIT 5;
    `,
  ]);
  if (!t.length) return null;
  return {
    slug: tenantId,
    nombre: t[0].business_name || tenantId,
    horario: t[0].business_hours || null,
    direccion: [t[0].address, t[0].city].filter(Boolean).join(', ') || null,
    tasaBs: t[0].exchange_rate_bs === null ? null : Number(t[0].exchange_rate_bs),
    servicios: servicios.map((s: any) => ({ nombre: s.name, usd: Number(s.price_usd || 0), minutos: s.duration_minutes ?? null })),
    ofertas: ofertas.map((o: any) => ({ titulo: o.titulo, texto: o.texto })),
  };
}

// ─── Webhook de Meta: /api/whatsapp/<salón> ──────────────────────────────────
/**
 * Cuerpo tal como lo firmó Meta. El runtime de Vercel ya entrega el JSON leído; Meta lo firma escapando los
 * caracteres no ASCII (\uXXXX) y la barra (\/), así que se reconstruye igual. Si hay cuerpo crudo, se usa ese.
 */
function cuerposCandidatos(req: any): string[] {
  const out: string[] = [];
  if (typeof req.rawBody === 'string') out.push(req.rawBody);
  if (Buffer.isBuffer(req.rawBody)) out.push(req.rawBody.toString('utf8'));
  if (typeof req.body === 'string') out.push(req.body);
  else if (req.body && typeof req.body === 'object') {
    const plano = JSON.stringify(req.body);
    out.push(plano.replace(/[\u007f-￿]/g, (ch) => `\\u${ch.charCodeAt(0).toString(16).padStart(4, '0')}`).replace(/\//g, '\\/'));
    out.push(plano);
  }
  return out;
}

export function firmaValida(req: any, appSecret: string): boolean {
  const cabecera = String(req.headers?.['x-hub-signature-256'] || '');
  if (!cabecera.startsWith('sha256=')) return false;
  const recibida = Buffer.from(cabecera.slice(7), 'hex');
  return cuerposCandidatos(req).some((cuerpo) => {
    const esperada = createHmac('sha256', appSecret).update(cuerpo, 'utf8').digest();
    return esperada.length === recibida.length && timingSafeEqual(esperada, recibida);
  });
}

export async function manejarWebhook(req: any, res: any, sql: any, tenantRaw: string) {
  const tenant = String(tenantRaw || '').trim().toLowerCase();
  if (!/^[a-z0-9-]{2,80}$/.test(tenant)) return res.status(404).json({ error: 'Salón no encontrado.' });
  const filas = await sql`SELECT verify_token, app_secret_cifrado, estado FROM public.whatsapp_conexiones WHERE tenant_id = ${tenant} LIMIT 1;`;
  const fila = filas[0];

  // Verificación de la suscripción (Meta, una vez, al configurar el webhook).
  if (req.method === 'GET') {
    const q = req.query || {};
    const tokenOk = fila && typeof q['hub.verify_token'] === 'string' && q['hub.verify_token'].length === fila.verify_token.length
      && timingSafeEqual(Buffer.from(q['hub.verify_token']), Buffer.from(fila.verify_token));
    if (q['hub.mode'] === 'subscribe' && tokenOk) {
      await sql`UPDATE public.whatsapp_conexiones SET webhook_visto_at = now(), updated_at = now() WHERE tenant_id = ${tenant};`;
      res.setHeader('Content-Type', 'text/plain');
      return res.status(200).send(String(q['hub.challenge'] || ''));
    }
    return res.status(403).json({ error: 'Verificación no válida.' });
  }

  if (req.method !== 'POST') return res.status(405).json({ error: 'Método no permitido.' });
  if (!fila) return res.status(404).json({ error: 'Este salón no tiene WhatsApp conectado.' });
  let secreto = '';
  try { secreto = descifrar(fila.app_secret_cifrado); } catch { return res.status(500).json({ error: 'Conexión dañada: vuelve a conectarla.' }); }
  if (!firmaValida(req, secreto)) return res.status(401).json({ error: 'Firma no válida.' });

  await sql`UPDATE public.whatsapp_conexiones SET webhook_visto_at = now() WHERE tenant_id = ${tenant};`;
  const c = await cargarConexion(sql, tenant);
  const cuerpo = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
  const mensajes: any[] = [];
  for (const entry of cuerpo.entry || []) for (const ch of entry.changes || []) for (const m of ch.value?.messages || []) mensajes.push(m);

  let respondidos = 0;
  let datos: DatosSalon | null = null;
  for (const m of mensajes.slice(0, 20)) {
    const id = String(m.id || '').slice(0, 120);
    const de = normalizarTelefono(m.from);
    if (!id || !de) continue;
    const texto = String(m.text?.body || m.button?.text || m.interactive?.button_reply?.title || m.interactive?.list_reply?.title || '');
    const tema = texto ? clasificar(texto) : 'otro';
    const nuevo = await sql`
      INSERT INTO public.whatsapp_mensajes (tenant_id, mensaje_id, remitente, tema)
      VALUES (${tenant}, ${id}, ${de}, ${tema}) ON CONFLICT DO NOTHING RETURNING mensaje_id;
    `;
    if (!nuevo.length || !c || !c.agenteActivo) continue;
    // Si pidió una persona hace menos de 12 h, el agente calla y deja el chat a la dueña.
    const callar = await sql`
      SELECT 1 FROM public.whatsapp_mensajes
      WHERE tenant_id = ${tenant} AND remitente = ${de} AND tema = 'persona' AND respondido = true
        AND recibido_at > now() - interval '12 hours' LIMIT 1;
    `;
    if (callar.length) continue;
    // No repetir la misma respuesta al mismo número en 10 minutos.
    const repetida = await sql`
      SELECT 1 FROM public.whatsapp_mensajes
      WHERE tenant_id = ${tenant} AND remitente = ${de} AND tema = ${tema} AND respondido = true
        AND recibido_at > now() - interval '10 minutes' LIMIT 1;
    `;
    if (repetida.length) continue;
    datos = datos || (await datosDelSalon(sql, tenant));
    if (!datos) continue;
    await marcarLeido(c, id).catch(() => undefined);
    const r = await enviarTexto(c, de, construirRespuesta(tema, datos));
    if (r.ok) {
      respondidos++;
      await sql`UPDATE public.whatsapp_mensajes SET respondido = true WHERE tenant_id = ${tenant} AND mensaje_id = ${id};`;
    } else {
      await apuntarError(sql, tenant, `Agente: ${errorDeMeta(r.json)}`);
    }
  }
  return res.status(200).json({ ok: true, recibidos: mensajes.length, respondidos });
}

export const nuevoVerifyToken = () => randomBytes(18).toString('hex');
