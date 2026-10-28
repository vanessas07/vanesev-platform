// Vercel Serverless Function: /api/salon (función 12 de 12, G-031/G-033)
// Negocio del salón en Neon: perfil, landing, tema, ofertas con precio especial, cupones y tarjetas regalo.
//   GET  ?tenant=<slug>&vista=publica → lo que ve la clienta (sin cupones ni tarjetas)
//   GET  ?tenant=<slug>               → todo, para owner/admin
//   POST {action:'presupuesto', …}    → precio final que calcularía la reserva (público, con freno)
//   POST {action:…, tenantId, …}      → altas y cambios, owner/admin
//   GET/POST ?whatsapp=<slug>         → webhook de Meta del WhatsApp del salón (C-01; ruta /api/whatsapp/<slug>)
import { randomInt, randomUUID } from 'node:crypto';
import { getDb } from './_db.js';
import { requireSession, requireTenantRole } from './_session.js';
import { applyCors } from './_cors.js';
import { claveDeLimite, ipDeLaPeticion, limiteSuperado } from './_limite.js';
import { CUPON_VALIDO, calcularPrecio, hashTarjeta, hoyEnCaracas } from './_precios.js';
import { cargarConexion, cifrar, enviarPlantilla, errorDeMeta, hayClave, manejarWebhook, normalizarTelefono, nuevoVerifyToken, verificarNumero } from './_whatsapp.js';

const IMAGEN_VALIDA = /^(\/[A-Za-z0-9/_.-]{1,200}|https:\/\/[^\s"'<>]{1,500}|data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/]+={0,2})$/;
const IMAGEN_MAX_CARACTERES = 2_000_000;
const FECHA = /^\d{4}-\d{2}-\d{2}$/;
const HORA = /^([01]\d|2[0-3]):[0-5]\d$/;
const PRESUPUESTOS_POR_IP_HORA = 30;

type Fallo = { error: string };
const fallo = (error: string): Fallo => ({ error });
const esFallo = (x: any): x is Fallo => x && typeof x === 'object' && 'error' in x && Object.keys(x).length === 1;

function texto(v: any, max: number, { min = 0, obligatorio = false } = {}): string | null | Fallo {
  if (v === undefined || v === null || String(v).trim() === '') return obligatorio ? fallo('Falta un campo obligatorio.') : null;
  const t = String(v).trim();
  if (t.length < min || t.length > max) return fallo(`Texto fuera de límites (${min}–${max} caracteres).`);
  return t;
}

function numero(v: any, minimo: number, maximo: number, { entero = false } = {}): number | null | Fallo {
  if (v === undefined || v === null || v === '') return null;
  const n = Number(v);
  if (!Number.isFinite(n) || n < minimo || n > maximo || (entero && !Number.isInteger(n))) return fallo(`Número fuera de límites (${minimo}–${maximo}).`);
  return entero ? n : Math.round(n * 100) / 100;
}

function fecha(v: any): string | null | Fallo {
  if (v === undefined || v === null || v === '') return null;
  const t = String(v);
  if (!FECHA.test(t) || Number.isNaN(Date.parse(`${t}T00:00:00Z`))) return fallo('Fecha inválida (AAAA-MM-DD).');
  return t;
}

function hora(v: any): string | null | Fallo {
  if (v === undefined || v === null || v === '') return null;
  return HORA.test(String(v)) ? String(v) : fallo('Hora inválida (HH:MM).');
}

function imagen(v: any): string | null | Fallo {
  if (v === undefined || v === null || v === '') return null;
  const t = String(v).trim();
  return t.length <= IMAGEN_MAX_CARACTERES && IMAGEN_VALIDA.test(t) ? t : fallo('Imagen no válida (ruta, https o PNG/JPEG/WebP ≤ 2 MB; sin SVG).');
}

/** Primer fallo de un objeto de campos validados, o null. */
function primerFallo(campos: Record<string, any>): string | null {
  for (const v of Object.values(campos)) if (esFallo(v)) return v.error;
  return null;
}

// ─── Landing: estructura cerrada (lo que no está aquí se descarta) ───────────
const BLOQUES = ['portada', 'historia', 'servicios', 'galeria', 'equipo', 'ofertas', 'resenas', 'faq', 'ubicacion', 'reservar'];

function validarLanding(l: any): Record<string, any> | Fallo {
  if (!l || typeof l !== 'object' || Array.isArray(l)) return fallo('Landing inválida.');
  const historia = texto(l.historia, 600);
  const seoTitulo = texto(l.seoTitulo, 70);
  const seoDescripcion = texto(l.seoDescripcion, 160);
  const err = primerFallo({ historia, seoTitulo, seoDescripcion });
  if (err) return fallo(err);
  const galeria = Array.isArray(l.galeria) ? l.galeria : [];
  if (galeria.length > 8) return fallo('Máximo 8 fotos en la galería de la landing.');
  const fotos: string[] = [];
  for (const g of galeria) {
    const im = imagen(g);
    if (esFallo(im) || im === null) return fallo('Foto de la galería no válida.');
    fotos.push(im);
  }
  const faqIn = Array.isArray(l.faq) ? l.faq : [];
  if (faqIn.length > 8) return fallo('Máximo 8 preguntas frecuentes.');
  const faq: { p: string; r: string }[] = [];
  for (const q of faqIn) {
    const p = texto(q?.p, 140, { min: 3, obligatorio: true });
    const r = texto(q?.r, 400, { min: 3, obligatorio: true });
    if (esFallo(p) || esFallo(r)) return fallo('Pregunta frecuente incompleta o demasiado larga.');
    faq.push({ p: p as string, r: r as string });
  }
  const bloquesIn = Array.isArray(l.bloques) ? l.bloques.map(String) : BLOQUES;
  if (bloquesIn.some((b: string) => !BLOQUES.includes(b)) || new Set(bloquesIn).size !== bloquesIn.length) return fallo('Bloques de la landing no válidos.');
  return { historia, galeria: fotos, faq, bloques: bloquesIn, seoTitulo, seoDescripcion, publicada: l.publicada !== false };
}

// ─── Tema: claves de SalonThemeConfig (src/utils/salonThemeEngine.ts) ────────
const TEMA_TEXTOS: Record<string, number> = {
  businessName: 140, salonName: 140, tagline: 140, subline: 300, heroHeadline: 140, heroSubheadline: 300,
  city: 80, addressLine: 160, whatsappPhone: 30, instagramHandle: 60, loyaltyRewardTitle: 140, directorName: 120,
};
const TEMA_IDS: Record<string, string[]> = {
  paletteId: ['rose-cashmere', 'champagne-atelier', 'terracotta-medspa', 'botanical-spa', 'velvet-mauve', 'ivory-noir', 'rosa-velvet-oro'],
  typographyId: ['haute-couture', 'vogue-editorial', 'modern-minimal'],
  layoutId: ['editorial-magazine', 'boutique-grid', 'minimal-menu'],
};

function validarTema(t: any): Record<string, any> | Fallo {
  if (!t || typeof t !== 'object' || Array.isArray(t)) return fallo('Tema inválido.');
  const limpio: Record<string, any> = {};
  for (const [k, v] of Object.entries(t)) {
    if (k in TEMA_TEXTOS) {
      const x = texto(v, TEMA_TEXTOS[k]);
      if (esFallo(x)) return fallo(`Tema: ${k} demasiado largo.`);
      if (x !== null) limpio[k] = x;
    } else if (k in TEMA_IDS) {
      if (!TEMA_IDS[k].includes(String(v))) return fallo(`Tema: ${k} no válido.`);
      limpio[k] = String(v);
    } else if (k === 'heroImageUrl') {
      const im = imagen(v);
      if (esFallo(im)) return fallo('Tema: imagen de portada no válida.');
      if (im) limpio[k] = im;
    } else if (k === 'loyaltyStampsTarget' || k === 'loyaltyStampsGoal') {
      const n = numero(v, 3, 20, { entero: true });
      if (esFallo(n)) return fallo('Tema: sellos entre 3 y 20.');
      if (n !== null) limpio[k] = n;
    } else if (k === 'firstVisitDiscountUSD') {
      const n = numero(v, 0, 100);
      if (esFallo(n)) return fallo('Tema: descuento de primera visita entre 0 y 100 $.');
      if (n !== null) limpio[k] = n;
    } else if (k === 'showVipPassport' || k === 'showCurrencyDual') {
      limpio[k] = Boolean(v);
    }
    // tenantSlug y cualquier otra clave se ignoran: el salón sale de la URL, no del cuerpo.
  }
  return limpio;
}

/** Código de tarjeta regalo: 12 caracteres sin ambiguos, en 3 bloques (solo se muestra una vez). */
function codigoTarjeta(): string {
  const abc = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  let s = '';
  for (let i = 0; i < 12; i++) s += abc[randomInt(abc.length)];
  return `${s.slice(0, 4)}-${s.slice(4, 8)}-${s.slice(8)}`;
}

const mapaOferta = (o: any) => ({
  id: o.id, titulo: o.titulo, texto: o.texto, servicioId: o.servicio_id, servicioNombre: o.servicio_nombre ?? null,
  precioEspecialUSD: o.precio_especial_usd === null ? null : Number(o.precio_especial_usd),
  precioNormalUSD: o.precio_normal_usd === null || o.precio_normal_usd === undefined ? null : Number(o.precio_normal_usd),
  boton: o.boton, botonTexto: o.boton_texto, inicio: o.inicio, fin: o.fin, horaInicio: o.hora_inicio, horaFin: o.hora_fin,
  activa: o.activa, orden: o.orden,
});

/** Estado del WhatsApp del salón para su panel: nunca incluye el token ni el secreto de la app. */
async function estadoWhatsapp(sql: any, tenant: string) {
  const f = (await sql`
    SELECT phone_number_id, waba_id, numero_visible, nombre_verificado, verify_token, estado, agente_activo,
           avisos_clienta, avisos_equipo, ultimo_error, webhook_visto_at
    FROM public.whatsapp_conexiones WHERE tenant_id = ${tenant} LIMIT 1;
  `)[0];
  const webhookUrl = `https://vanesev.com/api/whatsapp/${tenant}`;
  if (!f) return { conectado: false, webhookUrl };
  return {
    conectado: true, estado: f.estado, phoneNumberId: f.phone_number_id, wabaId: f.waba_id, numero: f.numero_visible,
    nombre: f.nombre_verificado, verifyToken: f.verify_token, webhookUrl, webhookVisto: f.webhook_visto_at,
    agente: f.agente_activo, avisosClienta: f.avisos_clienta, avisosEquipo: f.avisos_equipo, ultimoError: f.ultimo_error,
  };
}

export default async function handler(req: any, res: any) {
  // Webhook de Meta (servidor a servidor, sin CORS): /api/whatsapp/<slug> → ?whatsapp=<slug>.
  if (req.query?.whatsapp) {
    const sqlWa = getDb();
    if (!sqlWa) return res.status(503).json({ error: 'Base de datos no disponible.' });
    try {
      return await manejarWebhook(req, res, sqlWa, String(req.query.whatsapp));
    } catch (err: any) {
      console.error('[WhatsApp webhook]', err?.message || err);
      return res.status(500).json({ error: 'Error al atender el webhook.' });
    }
  }
  if (applyCors(req, res)) return;
  const sql = getDb();
  if (!sql) return res.status(503).json({ error: 'Base de datos no disponible.' });

  // ─── GET ──────────────────────────────────────────────────────────────────
  if (req.method === 'GET') {
    try {
      const tenant = String(req.query?.tenant || '').trim().toLowerCase();
      if (!tenant) return res.status(400).json({ error: 'Parámetro tenant requerido.' });
      const publica = req.query?.vista === 'publica';

      if (!publica) {
        const authCheck = await requireTenantRole(req, tenant, ['owner', 'admin']);
        if (authCheck.status !== 200) return res.status(authCheck.status).json({ error: authCheck.error });
      }

      const hoy = hoyEnCaracas();
      const [salones, ofertas] = await Promise.all([
        sql`
          SELECT id, business_name, slogan, owner_name, whatsapp_phone, instagram_handle, city, address, business_hours,
                 logo_url, hero_badge, hero_title, hero_subtitle, exchange_rate_bs, loyalty_stamps_target,
                 loyalty_reward_title, first_visit_discount_usd, payment_methods_config, landing, tema, en_prueba,
                 COALESCE(avisos_correo, true) AS avisos_correo
          FROM public.tenants WHERE id = ${tenant} LIMIT 1;
        `,
        publica
          ? sql`
              SELECT o.*, s.name AS servicio_nombre, s.price_usd AS precio_normal_usd
              FROM public.ofertas o
              LEFT JOIN public.services s ON s.id = o.servicio_id AND s.tenant_id = o.tenant_id
              WHERE o.tenant_id = ${tenant} AND o.activa = true
                AND (o.inicio IS NULL OR o.inicio <= ${hoy}::date) AND (o.fin IS NULL OR o.fin >= ${hoy}::date)
              ORDER BY o.orden ASC, o.created_at DESC;
            `
          : sql`
              SELECT o.*, s.name AS servicio_nombre, s.price_usd AS precio_normal_usd
              FROM public.ofertas o
              LEFT JOIN public.services s ON s.id = o.servicio_id AND s.tenant_id = o.tenant_id
              WHERE o.tenant_id = ${tenant}
              ORDER BY o.orden ASC, o.created_at DESC;
            `,
      ]);
      if (!salones.length) return res.status(404).json({ error: 'Salón no encontrado.' });
      const t = salones[0];
      const perfil = {
        nombre: t.business_name, eslogan: t.slogan, whatsapp: t.whatsapp_phone, instagram: t.instagram_handle,
        ciudad: t.city, direccion: t.address, horario: t.business_hours, logoUrl: t.logo_url,
        portadaEtiqueta: t.hero_badge, portadaTitulo: t.hero_title, portadaSubtitulo: t.hero_subtitle,
        tasaBs: t.exchange_rate_bs === null ? null : Number(t.exchange_rate_bs),
        sellosMeta: t.loyalty_stamps_target, premioSellos: t.loyalty_reward_title,
        descuentoPrimeraVisitaUSD: t.first_visit_discount_usd === null ? null : Number(t.first_visit_discount_usd),
        metodosPago: t.payment_methods_config || {},
      };

      if (publica) {
        const landing = t.landing || {};
        return res.status(200).json({
          perfil,
          landing: landing.publicada === false ? null : landing,
          tema: t.tema || {},
          ofertas: ofertas.map(mapaOferta),
        });
      }

      const [cupones, tarjetas] = await Promise.all([
        sql`SELECT * FROM public.cupones WHERE tenant_id = ${tenant} ORDER BY created_at DESC;`,
        sql`
          SELECT id, codigo_final, beneficiaria, nota, saldo_inicial_usd, saldo_usd, caduca, activa, created_at
          FROM public.tarjetas_regalo WHERE tenant_id = ${tenant} ORDER BY created_at DESC;
        `,
      ]);
      const whatsapp = await estadoWhatsapp(sql, tenant);
      return res.status(200).json({
        whatsapp,
        perfil: { ...perfil, propietaria: t.owner_name },
        landing: t.landing || {},
        tema: t.tema || {},
        enPrueba: Boolean(t.en_prueba),
        avisosCorreo: t.avisos_correo !== false,
        ofertas: ofertas.map(mapaOferta),
        cupones: cupones.map((c: any) => ({
          id: c.id, codigo: c.codigo, descripcion: c.descripcion, tipo: c.tipo, valor: Number(c.valor),
          servicios: c.servicios || [], inicio: c.inicio, fin: c.fin, usosMax: c.usos_max, usos: c.usos,
          unoPorClienta: c.uno_por_clienta, activo: c.activo,
        })),
        tarjetas: tarjetas.map((x: any) => ({
          id: x.id, codigoFinal: x.codigo_final, beneficiaria: x.beneficiaria, nota: x.nota,
          saldoInicialUSD: Number(x.saldo_inicial_usd), saldoUSD: Number(x.saldo_usd), caduca: x.caduca,
          activa: x.activa, creada: x.created_at,
        })),
      });
    } catch (err: any) {
      console.error('[Salon GET Error]:', err);
      return res.status(500).json({ error: 'Error al consultar el salón.' });
    }
  }

  if (req.method !== 'POST') return res.status(405).json({ error: 'Método no permitido.' });

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
    const action = String(body.action || '');
    const tenant = String(body.tenantId || '').trim().toLowerCase();
    if (!tenant) return res.status(400).json({ error: 'Parámetro tenantId requerido.' });

    // ─── Presupuesto público: el mismo cálculo que hará la reserva, sin escribir nada ───
    if (action === 'presupuesto') {
      if (await limiteSuperado(claveDeLimite('presupuesto-ip', ipDeLaPeticion(req)), PRESUPUESTOS_POR_IP_HORA, 3600)) {
        res.setHeader('Retry-After', '3600');
        return res.status(429).json({ error: 'Demasiadas consultas seguidas. Inténtalo más tarde.' });
      }
      const f = fecha(body.fecha);
      if (esFallo(f) || f === null) return res.status(400).json({ error: 'Fecha inválida.' });
      const servicio = await sql`
        SELECT id, price_usd FROM public.services
        WHERE id = ${String(body.servicioId || '')} AND tenant_id = ${tenant} AND is_available = true LIMIT 1;
      `;
      if (!servicio.length) return res.status(400).json({ error: 'Servicio no encontrado en este salón.' });
      const telefono = String(body.telefono || '').replace(/\D/g, '');
      const calculo = await calcularPrecio(sql, {
        tenant,
        servicioId: servicio[0].id,
        precioBase: Number(servicio[0].price_usd) || 0,
        fecha: f,
        turno: String(body.turno || ''),
        telefono,
        primeraVisitaReclamada: Boolean(body.primeraVisita) && telefono.length >= 7,
        cupon: body.cupon ? String(body.cupon) : null,
        tarjeta: body.tarjetaRegalo ? String(body.tarjetaRegalo) : null,
      });
      if (!calculo.ok) return res.status(calculo.status).json({ error: calculo.error });
      const d = calculo.desglose;
      return res.status(200).json({
        base: d.base,
        oferta: d.oferta ? { titulo: d.oferta.titulo, descuento: d.oferta.descuento } : null,
        primeraVisita: d.primeraVisita,
        cupon: d.cupon ? { codigo: d.cupon.codigo, descuento: d.cupon.descuento } : null,
        tarjetaRegalo: d.tarjeta ? { pago: d.tarjeta.pago, saldoRestante: d.tarjeta.saldoRestante } : null,
        total: d.total,
      });
    }

    // ─── Lo demás: sesión antes de buscar nada, y owner/admin del salón ───
    const sesion = await requireSession(req);
    if (sesion.status !== 200) return res.status(sesion.status).json({ error: sesion.error });
    const authCheck = await requireTenantRole(req, tenant, ['owner', 'admin'], sesion);
    if (authCheck.status !== 200) return res.status(authCheck.status).json({ error: authCheck.error });

    if (action === 'perfil_guardar') {
      const p = body.perfil || {};
      const c = {
        nombre: texto(p.nombre, 140, { min: 2, obligatorio: true }),
        eslogan: texto(p.eslogan, 200),
        whatsapp: p.whatsapp ? (/^\+?\d{7,15}$/.test(String(p.whatsapp).replace(/[\s-]/g, '')) ? String(p.whatsapp).replace(/[\s-]/g, '') : fallo('WhatsApp inválido (7 a 15 dígitos).')) : null,
        instagram: p.instagram ? (/^@?[A-Za-z0-9._]{1,30}$/.test(String(p.instagram).trim()) ? String(p.instagram).trim().replace(/^@/, '') : fallo('Instagram inválido.')) : null,
        ciudad: texto(p.ciudad, 80),
        direccion: texto(p.direccion, 200),
        horario: texto(p.horario, 120),
        logoUrl: imagen(p.logoUrl),
        portadaEtiqueta: texto(p.portadaEtiqueta, 80),
        portadaTitulo: texto(p.portadaTitulo, 140),
        portadaSubtitulo: texto(p.portadaSubtitulo, 300),
        tasaBs: numero(p.tasaBs, 0.01, 1_000_000),
        sellosMeta: numero(p.sellosMeta, 3, 20, { entero: true }),
        premioSellos: texto(p.premioSellos, 140),
        descuentoPrimeraVisitaUSD: numero(p.descuentoPrimeraVisitaUSD, 0, 100),
      };
      const err = primerFallo(c);
      if (err) return res.status(400).json({ error: err });
      const mp = p.metodosPago && typeof p.metodosPago === 'object' ? p.metodosPago : {};
      const metodos = {
        pago_movil: Boolean(mp.pago_movil), efectivo_usd: Boolean(mp.efectivo_usd),
        binance_usdt: Boolean(mp.binance_usdt), zelle: Boolean(mp.zelle),
      };
      await sql`
        UPDATE public.tenants SET
          business_name = ${c.nombre}, slogan = ${c.eslogan}, whatsapp_phone = COALESCE(${c.whatsapp}, whatsapp_phone),
          instagram_handle = ${c.instagram}, city = ${c.ciudad}, address = ${c.direccion}, business_hours = ${c.horario},
          logo_url = ${c.logoUrl}, hero_badge = ${c.portadaEtiqueta}, hero_title = ${c.portadaTitulo},
          hero_subtitle = ${c.portadaSubtitulo}, exchange_rate_bs = COALESCE(${c.tasaBs}, exchange_rate_bs),
          loyalty_stamps_target = COALESCE(${c.sellosMeta}, loyalty_stamps_target), loyalty_reward_title = ${c.premioSellos},
          first_visit_discount_usd = COALESCE(${c.descuentoPrimeraVisitaUSD}, first_visit_discount_usd),
          payment_methods_config = ${JSON.stringify(metodos)}::jsonb, updated_at = NOW()
        WHERE id = ${tenant};
      `;
      return res.status(200).json({ success: true });
    }

    // Interruptor «Avisos por correo» del salón (G-059).
    if (action === 'avisos_guardar') {
      const activos = body.activos === true;
      await sql`UPDATE public.tenants SET avisos_correo = ${activos}, updated_at = NOW() WHERE id = ${tenant};`;
      return res.status(200).json({ success: true, avisosCorreo: activos });
    }

    // ─── WhatsApp del salón con la API de Meta (C-01, G-054) ───
    if (action === 'whatsapp_conectar') {
      if (!hayClave()) return res.status(503).json({ error: 'El cifrado de WhatsApp no está configurado en el servidor.' });
      const phoneNumberId = String(body.phoneNumberId || '').trim();
      const wabaId = String(body.wabaId || '').trim() || null;
      const token = String(body.token || '').trim();
      const appSecret = String(body.appSecret || '').trim();
      if (!/^\d{5,40}$/.test(phoneNumberId)) return res.status(400).json({ error: 'El identificador del número son solo cifras (lo ves en WhatsApp → Configuración de la API).' });
      if (wabaId && !/^\d{5,40}$/.test(wabaId)) return res.status(400).json({ error: 'El identificador de la cuenta de WhatsApp Business son solo cifras.' });
      if (token.length < 40 || token.length > 1000 || /\s/.test(token)) return res.status(400).json({ error: 'El token de acceso no parece válido. Cópialo entero, sin espacios.' });
      if (!/^[a-f0-9]{32}$/i.test(appSecret)) return res.status(400).json({ error: 'La clave secreta de la app tiene 32 letras y cifras (Configuración de la app → Básica).' });
      const v = await verificarNumero(phoneNumberId, token);
      const previo = (await sql`SELECT verify_token FROM public.whatsapp_conexiones WHERE tenant_id = ${tenant} LIMIT 1;`)[0];
      const verifyToken = previo?.verify_token || nuevoVerifyToken();
      await sql`
        INSERT INTO public.whatsapp_conexiones (tenant_id, phone_number_id, waba_id, numero_visible, nombre_verificado, token_cifrado,
          app_secret_cifrado, verify_token, estado, ultimo_error, updated_at)
        VALUES (${tenant}, ${phoneNumberId}, ${wabaId}, ${v.ok ? v.numero : null}, ${v.ok ? v.nombre : null}, ${cifrar(token)},
          ${cifrar(appSecret)}, ${verifyToken}, ${v.ok ? 'verificada' : 'error'}, ${v.ok ? null : v.error}, now())
        ON CONFLICT (tenant_id) DO UPDATE SET phone_number_id = EXCLUDED.phone_number_id, waba_id = EXCLUDED.waba_id,
          numero_visible = EXCLUDED.numero_visible, nombre_verificado = EXCLUDED.nombre_verificado,
          token_cifrado = EXCLUDED.token_cifrado, app_secret_cifrado = EXCLUDED.app_secret_cifrado,
          estado = EXCLUDED.estado, ultimo_error = EXCLUDED.ultimo_error, updated_at = now();
      `;
      const whatsapp = await estadoWhatsapp(sql, tenant);
      if (!v.ok) return res.status(400).json({ error: `Meta no acepta estos datos: ${v.error}`, whatsapp });
      return res.status(200).json({ success: true, whatsapp });
    }

    if (action === 'whatsapp_opciones') {
      const r = await sql`
        UPDATE public.whatsapp_conexiones
        SET agente_activo = ${body.agente !== false}, avisos_clienta = ${body.avisosClienta !== false},
            avisos_equipo = ${body.avisosEquipo !== false}, updated_at = now()
        WHERE tenant_id = ${tenant} RETURNING tenant_id;
      `;
      if (!r.length) return res.status(404).json({ error: 'Primero conecta tu WhatsApp.' });
      return res.status(200).json({ success: true, whatsapp: await estadoWhatsapp(sql, tenant) });
    }

    if (action === 'whatsapp_probar') {
      const para = normalizarTelefono(body.telefono);
      if (!para) return res.status(400).json({ error: 'Escribe un móvil con su código de país, por ejemplo 58 414 1234567.' });
      const c = await cargarConexion(sql, tenant);
      if (!c) return res.status(404).json({ error: 'Tu WhatsApp aún no está verificado.' });
      // «hello_world» viene aprobada en todas las cuentas nuevas de WhatsApp Business.
      const r = await enviarPlantilla(c, para, 'hello_world', [], 'en_US');
      if (!r.ok) return res.status(400).json({ error: `No salió el mensaje de prueba: ${errorDeMeta(r.json)}` });
      return res.status(200).json({ success: true });
    }

    if (action === 'whatsapp_desconectar') {
      await sql`DELETE FROM public.whatsapp_conexiones WHERE tenant_id = ${tenant};`;
      return res.status(200).json({ success: true, whatsapp: await estadoWhatsapp(sql, tenant) });
    }

    if (action === 'landing_guardar') {
      const l = validarLanding(body.landing);
      if (esFallo(l)) return res.status(400).json({ error: l.error });
      await sql`UPDATE public.tenants SET landing = ${JSON.stringify(l)}::jsonb, updated_at = NOW() WHERE id = ${tenant};`;
      return res.status(200).json({ success: true, landing: l });
    }

    if (action === 'tema_guardar') {
      const t = validarTema(body.tema);
      if (esFallo(t)) return res.status(400).json({ error: t.error });
      await sql`UPDATE public.tenants SET tema = ${JSON.stringify(t)}::jsonb, updated_at = NOW() WHERE id = ${tenant};`;
      return res.status(200).json({ success: true, tema: t });
    }

    if (action === 'oferta_guardar') {
      const o = body.oferta || {};
      const c = {
        titulo: texto(o.titulo, 60, { min: 2, obligatorio: true }),
        texto: texto(o.texto, 160),
        botonTexto: texto(o.botonTexto, 30),
        precio: numero(o.precioEspecialUSD, 0, 100000),
        inicio: fecha(o.inicio),
        fin: fecha(o.fin),
        horaInicio: hora(o.horaInicio),
        horaFin: hora(o.horaFin),
        orden: numero(o.orden ?? 0, 0, 999, { entero: true }),
      };
      const err = primerFallo(c);
      if (err) return res.status(400).json({ error: err });
      const boton = ['ninguno', 'reservar', 'catalogo'].includes(o.boton) ? o.boton : 'reservar';
      if (c.inicio && c.fin && c.inicio > c.fin) return res.status(400).json({ error: 'La fecha de inicio es posterior a la de fin.' });
      if ((c.horaInicio === null) !== (c.horaFin === null) || (c.horaInicio && c.horaFin && c.horaInicio >= c.horaFin)) {
        return res.status(400).json({ error: 'La franja horaria necesita inicio y fin, y el inicio antes del fin.' });
      }
      let servicioId: string | null = null;
      if (o.servicioId) {
        const s = await sql`SELECT id, price_usd FROM public.services WHERE id = ${String(o.servicioId)} AND tenant_id = ${tenant} LIMIT 1;`;
        if (!s.length) return res.status(403).json({ error: 'Ese servicio no es de tu salón.' });
        servicioId = s[0].id;
        if (c.precio !== null && (c.precio as number) >= Number(s[0].price_usd)) {
          return res.status(400).json({ error: 'El precio especial tiene que ser menor que el precio normal del servicio.' });
        }
      } else if (c.precio !== null) {
        return res.status(400).json({ error: 'Para poner un precio especial, elige el servicio.' });
      }
      const activa = o.activa !== false;
      if (o.id) {
        const r = await sql`
          UPDATE public.ofertas SET titulo = ${c.titulo}, texto = ${c.texto}, servicio_id = ${servicioId},
            precio_especial_usd = ${c.precio}, boton = ${boton}, boton_texto = ${c.botonTexto},
            inicio = ${c.inicio}::date, fin = ${c.fin}::date, hora_inicio = ${c.horaInicio}::time, hora_fin = ${c.horaFin}::time,
            activa = ${activa}, orden = ${c.orden ?? 0}, updated_at = NOW()
          WHERE id = ${String(o.id)} AND tenant_id = ${tenant} RETURNING id;
        `;
        if (!r.length) return res.status(403).json({ error: 'Esa oferta no es de tu salón.' });
        return res.status(200).json({ success: true, id: r[0].id });
      }
      const id = `of_${randomUUID()}`;
      await sql`
        INSERT INTO public.ofertas (id, tenant_id, titulo, texto, servicio_id, precio_especial_usd, boton, boton_texto,
          inicio, fin, hora_inicio, hora_fin, activa, orden)
        VALUES (${id}, ${tenant}, ${c.titulo}, ${c.texto}, ${servicioId}, ${c.precio}, ${boton}, ${c.botonTexto},
          ${c.inicio}::date, ${c.fin}::date, ${c.horaInicio}::time, ${c.horaFin}::time, ${activa}, ${c.orden ?? 0});
      `;
      return res.status(201).json({ success: true, id });
    }

    if (action === 'oferta_borrar') {
      const r = await sql`DELETE FROM public.ofertas WHERE id = ${String(body.id || '')} AND tenant_id = ${tenant} RETURNING id;`;
      if (!r.length) return res.status(403).json({ error: 'Esa oferta no es de tu salón.' });
      return res.status(200).json({ success: true });
    }

    if (action === 'cupon_guardar') {
      const cu = body.cupon || {};
      const codigo = String(cu.codigo || '').trim().toUpperCase();
      if (!CUPON_VALIDO.test(codigo)) return res.status(400).json({ error: 'Código: de 3 a 20 letras, números o guiones.' });
      const tipo = cu.tipo === 'importe' ? 'importe' : cu.tipo === 'porcentaje' ? 'porcentaje' : null;
      if (!tipo) return res.status(400).json({ error: 'Tipo de cupón: porcentaje o importe.' });
      const c = {
        descripcion: texto(cu.descripcion, 120),
        valor: numero(cu.valor, 0.01, tipo === 'porcentaje' ? 100 : 100000),
        inicio: fecha(cu.inicio),
        fin: fecha(cu.fin),
        usosMax: numero(cu.usosMax, 1, 100000, { entero: true }),
      };
      const err = primerFallo(c);
      if (err) return res.status(400).json({ error: err });
      if (c.valor === null) return res.status(400).json({ error: 'Indica el valor del descuento.' });
      if (c.inicio && c.fin && c.inicio > c.fin) return res.status(400).json({ error: 'La fecha de inicio es posterior a la de fin.' });
      const serviciosIn: string[] = Array.isArray(cu.servicios) ? cu.servicios.map(String).slice(0, 50) : [];
      if (serviciosIn.length) {
        const propios = await sql`SELECT id FROM public.services WHERE tenant_id = ${tenant} AND id = ANY(${serviciosIn});`;
        if (propios.length !== new Set(serviciosIn).size) return res.status(403).json({ error: 'Algún servicio no es de tu salón.' });
      }
      const servicios = serviciosIn.length ? serviciosIn : null;
      const unoPorClienta = cu.unoPorClienta !== false;
      const activo = cu.activo !== false;
      try {
        if (cu.id) {
          const r = await sql`
            UPDATE public.cupones SET codigo = ${codigo}, descripcion = ${c.descripcion}, tipo = ${tipo}, valor = ${c.valor},
              servicios = ${servicios}, inicio = ${c.inicio}::date, fin = ${c.fin}::date, usos_max = ${c.usosMax},
              uno_por_clienta = ${unoPorClienta}, activo = ${activo}, updated_at = NOW()
            WHERE id = ${String(cu.id)} AND tenant_id = ${tenant} RETURNING id;
          `;
          if (!r.length) return res.status(403).json({ error: 'Ese cupón no es de tu salón.' });
          return res.status(200).json({ success: true, id: r[0].id });
        }
        const id = `cp_${randomUUID()}`;
        await sql`
          INSERT INTO public.cupones (id, tenant_id, codigo, descripcion, tipo, valor, servicios, inicio, fin, usos_max, uno_por_clienta, activo)
          VALUES (${id}, ${tenant}, ${codigo}, ${c.descripcion}, ${tipo}, ${c.valor}, ${servicios}, ${c.inicio}::date, ${c.fin}::date,
            ${c.usosMax}, ${unoPorClienta}, ${activo});
        `;
        return res.status(201).json({ success: true, id });
      } catch (e: any) {
        if (/uq_cupones_codigo/.test(String(e?.constraint || e?.message))) return res.status(409).json({ error: 'Ya tienes un cupón con ese código.' });
        if (/chk_cupones_usos/.test(String(e?.constraint || e?.message))) return res.status(400).json({ error: 'El máximo de usos no puede ser menor que los usos que ya lleva.' });
        throw e;
      }
    }

    if (action === 'cupon_borrar') {
      // Un cupón ya usado no se borra (queda en el historial de las citas): se desactiva.
      const id = String(body.id || '');
      const r = await sql`SELECT usos FROM public.cupones WHERE id = ${id} AND tenant_id = ${tenant} LIMIT 1;`;
      if (!r.length) return res.status(403).json({ error: 'Ese cupón no es de tu salón.' });
      if (Number(r[0].usos) > 0) {
        await sql`UPDATE public.cupones SET activo = false, updated_at = NOW() WHERE id = ${id} AND tenant_id = ${tenant};`;
        return res.status(200).json({ success: true, desactivado: true });
      }
      await sql`DELETE FROM public.cupones WHERE id = ${id} AND tenant_id = ${tenant};`;
      return res.status(200).json({ success: true });
    }

    if (action === 'tarjeta_crear') {
      const c = {
        saldo: numero(body.saldoUSD, 1, 10000),
        beneficiaria: texto(body.beneficiaria, 80),
        nota: texto(body.nota, 200),
        caduca: fecha(body.caduca),
      };
      const err = primerFallo(c);
      if (err) return res.status(400).json({ error: err });
      if (c.saldo === null) return res.status(400).json({ error: 'Indica el saldo de la tarjeta (de 1 a 10.000 $).' });
      if (c.caduca && (c.caduca as string) < hoyEnCaracas()) return res.status(400).json({ error: 'La caducidad no puede ser una fecha pasada.' });
      const codigo = codigoTarjeta();
      const id = `tr_${randomUUID()}`;
      await sql.transaction([
        sql`
          INSERT INTO public.tarjetas_regalo (id, tenant_id, codigo_hash, codigo_final, beneficiaria, nota, saldo_inicial_usd, saldo_usd, caduca)
          VALUES (${id}, ${tenant}, ${hashTarjeta(codigo)}, ${codigo.slice(-4)}, ${c.beneficiaria}, ${c.nota}, ${c.saldo}, ${c.saldo}, ${c.caduca}::date);
        `,
        sql`
          INSERT INTO public.tarjeta_movimientos (id, tarjeta_id, tenant_id, importe_usd, motivo)
          VALUES (${`tm_${randomUUID()}`}, ${id}, ${tenant}, ${c.saldo}, 'emision');
        `,
      ]);
      // El código completo solo sale en esta respuesta: en la base solo queda su hash.
      return res.status(201).json({ success: true, id, codigo, saldoUSD: c.saldo });
    }

    if (action === 'tarjeta_anular') {
      const id = String(body.id || '');
      const r = await sql`
        UPDATE public.tarjetas_regalo SET activa = false WHERE id = ${id} AND tenant_id = ${tenant} AND activa = true RETURNING saldo_usd;
      `;
      if (!r.length) return res.status(403).json({ error: 'Esa tarjeta no es de tu salón o ya está anulada.' });
      await sql`
        INSERT INTO public.tarjeta_movimientos (id, tarjeta_id, tenant_id, importe_usd, motivo)
        VALUES (${`tm_${randomUUID()}`}, ${id}, ${tenant}, 0, 'anulacion');
      `;
      return res.status(200).json({ success: true });
    }

    return res.status(400).json({ error: 'Acción desconocida.' });
  } catch (err: any) {
    console.error('[Salon POST Error]:', err);
    return res.status(500).json({ error: 'Error al guardar los datos del salón.' });
  }
}
