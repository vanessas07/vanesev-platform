#!/usr/bin/env node
/**
 * VANESEV · Suite B1-a (autor y custodio: Claude Code, decisión G-007 de karc0).
 *
 * Reglas de esta suite:
 *  - Todo lo que se prueba pasa por la API real de la vista previa: inicio de sesión, TOTP
 *    (secreto generado por el servidor, código calculado aquí), cambio de contraseña, altas, QR…
 *  - La base de datos solo se toca para PREPARAR datos de partida (usuarios fijos con el hash
 *    oficial de better-auth) y para LIMPIAR lo que esta ejecución crea. Nunca para simular un paso.
 *  - Si falta un dato necesario (secreto, IP del runner…), la prueba FALLA. Nada se aprueba solo.
 *  - Solo la rama de staging de Neon (host ep-nameless-math-b838isnk).
 */
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { neon } = require('@neondatabase/serverless');

// ─── Configuración ──────────────────────────────────────────────────────────────
function leerEnvLocal(nombre) {
  if (process.env.CI) return undefined;
  const p = path.join(__dirname, '..', '.env.local');
  if (!fs.existsSync(p)) return undefined;
  const l = fs.readFileSync(p, 'utf8').split(/\r?\n/).find((x) => x.startsWith(`${nombre}=`));
  return l ? l.slice(nombre.length + 1).trim().replace(/^["']|["']$/g, '') : undefined;
}

const BASE = (process.env.TEST_TARGET_URL || 'https://vanesev-platform-git-feat-b1-auth-vanesevapp-4342.vercel.app').replace(/\/+$/, '');
const BYPASS = process.env.VERCEL_AUTOMATION_BYPASS_SECRET || leerEnvLocal('VERCEL_AUTOMATION_BYPASS_SECRET');
const DB_URL = process.env.DATABASE_URL_STAGING || leerEnvLocal('DATABASE_URL_STAGING');
const CRON_SECRET = process.env.CRON_SECRET;
const RUNNER_IP = process.env.RUNNER_IP;
const RUN = (process.env.GITHUB_RUN_ID || `local${Date.now()}`).toLowerCase();

if (!DB_URL || !new URL(DB_URL).hostname.includes('ep-nameless-math-b838isnk')) {
  console.error('[FATAL] DATABASE_URL_STAGING ausente o no es la rama de staging.');
  process.exit(1);
}
if (process.env.CI && (!BYPASS || !RUNNER_IP)) {
  console.error('[FATAL] En CI son obligatorios VERCEL_AUTOMATION_BYPASS_SECRET y RUNNER_IP.');
  process.exit(1);
}
const sql = neon(DB_URL);

// ─── Utilidades ─────────────────────────────────────────────────────────────────
const resultados = [];
function comprobar(id, descripcion, ok, detalle) {
  resultados.push({ id, ok });
  console.log(`${ok ? '✅' : '❌'} ${id} ${descripcion} — ${detalle}`);
}

async function api(ruta, { method = 'GET', body, token, cookies } = {}) {
  const headers = { Origin: 'https://vanesev.com' };
  if (BYPASS) headers['x-vercel-protection-bypass'] = BYPASS;
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (token) headers.Authorization = `Bearer ${token}`;
  if (cookies) headers.Cookie = cookies;
  const res = await fetch(`${BASE}${ruta}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
    redirect: 'manual',
  });
  const texto = await res.text().catch(() => '');
  let json = null;
  try {
    json = JSON.parse(texto);
  } catch {
    json = null;
  }
  const setCookies = typeof res.headers.getSetCookie === 'function' ? res.headers.getSetCookie() : [];
  return {
    status: res.status,
    json,
    texto,
    token: res.headers.get('set-auth-token'),
    location: res.headers.get('location'),
    // Como un navegador: las cookies que el servidor manda borrar (valor vacío) no se reenvían.
    cookies: setCookies.map((c) => c.split(';')[0]).filter((c) => /=.+/.test(c)).join('; '),
  };
}

/** Formato oficial de @better-auth/utils/password: «salt:clave». */
function hashOficial(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const key = crypto.scryptSync(password.normalize('NFKC'), salt, 64, { N: 16384, r: 16, p: 1, maxmem: 128 * 16384 * 16 * 2 });
  return `${salt}:${key.toString('hex')}`;
}

function base32(texto) {
  const alfabeto = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let bits = 0;
  let valor = 0;
  const salida = [];
  for (const ch of texto.toUpperCase().replace(/=+$/, '')) {
    const i = alfabeto.indexOf(ch);
    if (i < 0) continue;
    valor = (valor << 5) | i;
    bits += 5;
    if (bits >= 8) {
      salida.push((valor >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return Buffer.from(salida);
}

/** RFC 6238 (SHA-1, 6 dígitos, 30 s): lo mismo que calcula Google Authenticator. */
function totp(secreto, desfase = 0) {
  const paso = Math.floor(Date.now() / 1000 / 30) + desfase;
  const buf = Buffer.alloc(8);
  buf.writeBigInt64BE(BigInt(paso));
  const h = crypto.createHmac('sha1', base32(secreto)).update(buf).digest();
  const o = h[h.length - 1] & 0xf;
  const n = ((h[o] & 0x7f) << 24) | (h[o + 1] << 16) | (h[o + 2] << 8) | h[o + 3];
  return String(n % 1000000).padStart(6, '0');
}

async function limpiarRateLimitRunner() {
  if (RUNNER_IP) await sql`DELETE FROM "rateLimit" WHERE key LIKE ${RUNNER_IP + '|%'}`;
}

function fechaFutura(dias) {
  const d = new Date(Date.now() + dias * 86400000);
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Caracas' }).format(d);
}

// ─── Datos de partida (solo preparación) ───────────────────────────────────────
const DOMINIO = 'ci.test.vanesev.internal';
const email = (rol) => `ci-${RUN}-${rol}@${DOMINIO}`;
const PASS = {
  superadmin: `Sa-${crypto.randomBytes(9).toString('base64url')}-1`,
  owner: `Ow-${crypto.randomBytes(9).toString('base64url')}-1`,
};
const creados = { bookings: [], services: [], qr: [], campanas: [], equipo: [] };
const inicio = new Date();

async function crearUsuario(rol, { platformRole = null, org = null, memberRole = null } = {}) {
  const id = `ci_${RUN}_${rol}`;
  await sql.transaction([
    sql`INSERT INTO "user" (id, name, email, "emailVerified", "createdAt", "updatedAt", "twoFactorEnabled", platform_role, must_reset)
        VALUES (${id}, ${'CI ' + rol}, ${email(rol)}, true, NOW(), NOW(), false, ${platformRole}, false)`,
    sql`INSERT INTO "account" (id, "userId", "accountId", "providerId", password, "createdAt", "updatedAt")
        VALUES (${id + '_acc'}, ${id}, ${id}, 'credential', ${hashOficial(PASS[rol])}, NOW(), NOW())`,
    ...(org
      ? [sql`INSERT INTO "member" (id, "organizationId", "userId", role, "createdAt") VALUES (${id + '_mem'}, ${org}, ${id}, ${memberRole}, NOW())`]
      : []),
  ]);
  return id;
}

async function limpiar() {
  await sql`DELETE FROM "session" WHERE "userId" IN (SELECT id FROM "user" WHERE email LIKE ${'ci-' + RUN + '-%@' + DOMINIO})`;
  await sql`DELETE FROM "twoFactor" WHERE "userId" IN (SELECT id FROM "user" WHERE email LIKE ${'ci-' + RUN + '-%@' + DOMINIO})`;
  await sql`DELETE FROM "member" WHERE "userId" IN (SELECT id FROM "user" WHERE email LIKE ${'ci-' + RUN + '-%@' + DOMINIO})`;
  await sql`DELETE FROM "account" WHERE "userId" IN (SELECT id FROM "user" WHERE email LIKE ${'ci-' + RUN + '-%@' + DOMINIO})`;
  await sql`DELETE FROM "user" WHERE email LIKE ${'ci-' + RUN + '-%@' + DOMINIO}`;
  if (creados.bookings.length) await sql`DELETE FROM public.bookings WHERE id = ANY(${creados.bookings})`;
  await sql`DELETE FROM public.bookings WHERE client_name LIKE ${'CI ' + RUN + '%'}`;
  if (creados.services.length) await sql`DELETE FROM public.services WHERE id = ANY(${creados.services})`;
  if (creados.qr.length) {
    await sql`DELETE FROM public.qr_scans WHERE code = ANY(${creados.qr})`;
    await sql`DELETE FROM public.qr_codes WHERE code = ANY(${creados.qr})`;
  }
  if (creados.campanas.length) await sql`DELETE FROM public.qr_campanas WHERE codigo = ANY(${creados.campanas})`;
  // Contadores del freno creados en esta ejecución (las claves son HMAC: se acotan por fecha y prefijo).
  await sql`DELETE FROM public.limite_frecuencia WHERE actualizado_en >= ${inicio.toISOString()}
            AND (clave LIKE 'reserva-ip:%' OR clave LIKE 'reserva-tel:%' OR clave LIKE 'qr:%')`;
  await sql`DELETE FROM "rateLimit" WHERE key LIKE ${'phone_otp:58414' + RUN.replace(/\D/g, '').slice(-5) + '%'}`;
  await sql`DELETE FROM "rateLimit" WHERE key LIKE ${'email_otp:ci-' + RUN + '-%'}`;
  await sql`DELETE FROM "verification" WHERE identifier LIKE ${'%ci-' + RUN + '-%'}`;
  if (creados.equipo.length) await sql`DELETE FROM public.staff_members WHERE id = ANY(${creados.equipo})`;
  await limpiarRateLimitRunner();
}

// ─── Suite ──────────────────────────────────────────────────────────────────────
async function main() {
  console.log('================================================================================');
  console.log('        VANESEV · SUITE B1-a (Claude Code) · todo por la API real');
  console.log('================================================================================');
  console.log(`URL: ${BASE} · bypass: ${BYPASS ? 'SÍ (***)' : 'NO'} · CRON_SECRET: ${CRON_SECRET ? 'SÍ (***)' : 'NO'}`);
  console.log(`Staging: ${new URL(DB_URL).hostname} · ejecución: ${RUN}\n`);

  const salon = (await sql`SELECT id FROM "organization" WHERE slug = 'capra-studio'`)[0]?.id;
  const otro = 'andrea-nails';
  const servicio = (await sql`SELECT id, price_usd FROM public.services WHERE tenant_id = 'capra-studio' AND is_available ORDER BY id LIMIT 1`)[0];
  const servicioAjeno = (await sql`SELECT id FROM public.services WHERE tenant_id = ${otro} ORDER BY id LIMIT 1`)[0]?.id;
  const staffAjeno = (await sql`SELECT id FROM public.staff_members WHERE tenant_id = ${otro} LIMIT 1`)[0]?.id;
  if (!salon || !servicio || !servicioAjeno || !staffAjeno) throw new Error('Faltan datos semilla en staging (organización, servicios o staff).');

  await limpiar();
  await crearUsuario('superadmin', { platformRole: 'superadmin_decisivo' });
  await crearUsuario('owner', { org: salon, memberRole: 'owner' });

  // ── A. Sin sesión: 401 en todo lo protegido, también antes de buscar el registro ──
  const anonimas = [
    ['GET', '/api/bookings?tenant=capra-studio'],
    ['PATCH', '/api/bookings', { id: 'no-existe', status: 'cancelada' }],
    ['DELETE', '/api/bookings?id=no-existe'],
    ['GET', '/api/loyalty?tenant=capra-studio'],
    ['POST', '/api/loyalty', { tenantId: 'capra-studio', phone: '04140000000' }],
    ['POST', '/api/services', { tenantId: 'capra-studio', name: 'x', category: 'x', priceUSD: 5 }],
    ['DELETE', '/api/services?id=no-existe'],
    ['POST', '/api/schedule', { tenantId: 'capra-studio', date: fechaFutura(3), timeSlot: '09:00 AM' }],
    ['POST', '/api/gallery', { tenantId: 'capra-studio', title: 'x', imageUrl: '/capra/x.jpg' }],
    ['DELETE', '/api/gallery?id=no-existe'],
    ['GET', '/api/qr?tenant=capra-studio'],
    ['POST', '/api/qr', { action: 'create', tenantId: 'capra-studio', code: 'ci-anon', targetUrl: '/capra-studio' }],
    ['POST', '/api/qr', { action: 'update_target', code: 'no-existe', targetUrl: '/capra-studio' }],
    ['GET', '/api/qr?scope=campaigns'],
    ['GET', '/api/central'],
    ['POST', '/api/central', { action: 'create-staff' }],
    ['GET', '/api/team?tenant=capra-studio'],
    ['POST', '/api/team', { action: 'upsert_staff', tenantId: 'capra-studio', name: 'x' }],
    ['DELETE', '/api/team?type=staff&id=no-existe'],
    ['GET', '/api/bookings?mine=1'],
  ];
  const fallos = [];
  for (const [method, ruta, body] of anonimas) {
    const r = await api(ruta, { method, body });
    if (r.status !== 401) fallos.push(`${method} ${ruta} → ${r.status}`);
  }
  comprobar('A1', `Sin sesión → 401 en ${anonimas.length} rutas (PATCH/DELETE sin revelar si el id existe)`, fallos.length === 0, fallos.join(', ') || 'todas 401');

  // ── B. Superadmin: sin 2FA no entra; activa el 2FA por la API; Central y salones con 2FA ──
  await limpiarRateLimitRunner();
  const saLogin = await api('/api/auth/sign-in/email', { method: 'POST', body: { email: email('superadmin'), password: PASS.superadmin } });
  const saToken = saLogin.token;
  comprobar('B1', 'Login real del superadmin (contraseña con hash oficial)', saLogin.status === 200 && !!saToken, `HTTP ${saLogin.status}, token ${saToken ? 'recibido' : 'NO'}`);
  const saOtro = await api('/api/auth/sign-in/email', { method: 'POST', body: { email: email('superadmin'), password: PASS.superadmin } });
  const saCentralSin = await api('/api/central', { token: saToken });
  const saSalonSin = await api('/api/bookings?tenant=andrea-nails', { token: saToken });
  comprobar('B2', 'Superadmin sin 2FA → Central 403 y salones 403 (mismo filtro que Central)', saCentralSin.status === 403 && saSalonSin.status === 403, `Central ${saCentralSin.status}, bookings ${saSalonSin.status}`);

  const alta2fa = await api('/api/auth/two-factor/enable', { method: 'POST', token: saToken, body: { password: PASS.superadmin } });
  const secreto = alta2fa.json?.totpURI ? new URL(alta2fa.json.totpURI).searchParams.get('secret') : null;
  const filaTf = (await sql`SELECT secret FROM "twoFactor" WHERE "userId" = ${'ci_' + RUN + '_superadmin'}`)[0];
  comprobar('B3', 'Alta del 2FA por la API: el servidor genera el secreto y lo guarda CIFRADO', alta2fa.status === 200 && !!secreto && !!filaTf && filaTf.secret !== secreto,
    `HTTP ${alta2fa.status}, secreto ${secreto ? 'recibido (***)' : 'NO'}, en base ${filaTf ? (filaTf.secret === secreto ? 'EN CLARO' : 'cifrado') : 'sin fila'}`);

  let verif = await api('/api/auth/two-factor/verify-totp', { method: 'POST', token: saToken, body: { code: secreto ? totp(secreto) : '000000' } });
  const saToken2fa = verif.token;
  const tfOk = (await sql`SELECT "twoFactorEnabled" FROM "user" WHERE id = ${'ci_' + RUN + '_superadmin'}`)[0]?.twoFactorEnabled === true;
  comprobar('B4', 'Verificación del TOTP (código calculado como Google Authenticator) → 2FA activo', verif.status === 200 && tfOk && !!saToken2fa, `HTTP ${verif.status}, twoFactorEnabled ${tfOk}`);

  const otraSesion = await api('/api/central', { token: saOtro.token });
  comprobar('B5', 'Al activar el 2FA se cierran las demás sesiones', otraSesion.status === 401, `sesión anterior → ${otraSesion.status}`);

  const central2fa = await api('/api/central', { token: saToken2fa });
  const salon2fa = await api('/api/bookings?tenant=andrea-nails', { token: saToken2fa });
  comprobar('B6', 'Superadmin con 2FA → Central 200 y salón 200', central2fa.status === 200 && salon2fa.status === 200, `Central ${central2fa.status}, bookings ${salon2fa.status}`);

  await limpiarRateLimitRunner();
  const login2 = await api('/api/auth/sign-in/email', { method: 'POST', body: { email: email('superadmin'), password: PASS.superadmin } });
  const pide2fa = login2.status === 200 && login2.json?.twoFactorRedirect === true && !login2.token;
  verif = await api('/api/auth/two-factor/verify-totp', { method: 'POST', cookies: login2.cookies, body: { code: totp(secreto || 'A') } });
  const tokenLogin2 = verif.token;
  const centralLogin2 = await api('/api/central', { token: tokenLogin2 });
  const sigueViva = await api('/api/central', { token: saToken2fa });
  comprobar('B7', 'Nuevo login: contraseña → pide 2FA → código → Central 200, sin cerrar la otra sesión', pide2fa && centralLogin2.status === 200 && sigueViva.status === 200,
    `twoFactorRedirect ${pide2fa}, verify ${verif.status}, Central ${centralLogin2.status}, sesión previa ${sigueViva.status}`);

  // ── C. Alta de staff desde Central → MUST_RESET → cambio de contraseña REAL ──
  const alta = await api('/api/central', { method: 'POST', token: saToken2fa, body: { action: 'create-staff', payload: { email: email('staff'), organizationSlug: 'capra-studio', role: 'staff' } } });
  const temporal = alta.json?.temporaryPassword;
  comprobar('C1', 'Alta de staff desde Central (contraseña temporal ≥ 16, devuelta una vez)', alta.status === 200 && typeof temporal === 'string' && temporal.length >= 16, `HTTP ${alta.status}, temporal ${temporal ? temporal.length + ' caracteres (***)' : 'NO'}`);
  const repetida = await api('/api/central', { method: 'POST', token: saToken2fa, body: { action: 'create-staff', payload: { email: email('staff'), organizationSlug: 'capra-studio', role: 'staff' } } });
  comprobar('C2', 'Alta con un correo existente → 409 sin tocar nada', repetida.status === 409, `HTTP ${repetida.status}`);

  await limpiarRateLimitRunner();
  const stLogin = await api('/api/auth/sign-in/email', { method: 'POST', body: { email: email('staff'), password: temporal || 'x' } });
  const bloqueado = await api('/api/bookings?tenant=capra-studio', { token: stLogin.token });
  const orgApi = await api('/api/auth/organization/list', { token: stLogin.token });
  comprobar('C3', 'Login con la temporal → 403 MUST_RESET en las APIs y en better-auth', stLogin.status === 200 && bloqueado.status === 403 && orgApi.status === 403,
    `login ${stLogin.status}, bookings ${bloqueado.status}, organization/list ${orgApi.status}`);
  const PASS_STAFF = `St-${crypto.randomBytes(9).toString('base64url')}-1`;
  const cambio = await api('/api/auth/change-password', { method: 'POST', token: stLogin.token, body: { currentPassword: temporal || 'x', newPassword: PASS_STAFF, revokeOtherSessions: true } });
  const stToken = cambio.token || cambio.json?.token || stLogin.token;
  const propio = await api('/api/bookings?tenant=capra-studio', { token: stToken });
  comprobar('C4', 'change-password real → must_reset se limpia → bookings del propio salón 200', cambio.status === 200 && propio.status === 200, `change-password ${cambio.status}, bookings ${propio.status}`);
  const ajeno = await api('/api/bookings?tenant=andrea-nails', { token: stToken });
  const centralStaff = await api('/api/central', { token: stToken });
  const catalogoStaff = await api('/api/services', { method: 'POST', token: stToken, body: { tenantId: 'capra-studio', name: 'CI', category: 'CI', priceUSD: 5 } });
  comprobar('C5', 'Staff: otro salón 403, Central 403, catálogo 403', ajeno.status === 403 && centralStaff.status === 403 && catalogoStaff.status === 403,
    `andrea ${ajeno.status}, Central ${centralStaff.status}, services ${catalogoStaff.status}`);

  // ── D. Reserva pública blindada ──
  const telBase = `58414${RUN.replace(/\D/g, '').slice(-5).padStart(5, '0')}`;
  const reserva = await api('/api/bookings', {
    method: 'POST',
    body: { tenantId: 'capra-studio', clientName: `CI ${RUN} precio`, clientPhone: `${telBase}01`, clientEmail: email('clienta'), date: fechaFutura(20), timeSlot: '09:00 AM',
      serviceId: servicio.id, servicePriceUSD: 0.01, status: 'confirmada', id: 'ci-hack', isFirstVisit: false },
  });
  const idReserva = reserva.json?.booking?.id;
  if (idReserva) creados.bookings.push(idReserva);
  const guardada = idReserva ? (await sql`SELECT total_price_usd, status FROM public.bookings WHERE id = ${idReserva}`)[0] : null;
  comprobar('D1', 'Precio, estado e id los decide el servidor', reserva.status === 201 && !!guardada && Number(guardada.total_price_usd) === Number(servicio.price_usd) && guardada.status === 'en_whatsapp' && /^bk_/.test(idReserva || ''),
    `HTTP ${reserva.status}, precio ${guardada?.total_price_usd} (base ${servicio.price_usd}), estado ${guardada?.status}, id ${idReserva ? idReserva.slice(0, 3) + '…' : 'NO'}`);
  const pasada = await api('/api/bookings', { method: 'POST', body: { tenantId: 'capra-studio', clientName: `CI ${RUN} pasada`, clientPhone: `${telBase}02`, date: '2020-01-01', timeSlot: '09:00 AM', serviceId: servicio.id } });
  comprobar('D2', 'Fecha pasada → 400', pasada.status === 400, `HTTP ${pasada.status}`);
  const ajenaStaff = await api('/api/bookings', { method: 'POST', body: { tenantId: 'capra-studio', clientName: `CI ${RUN} staff`, clientPhone: `${telBase}03`, date: fechaFutura(21), timeSlot: '09:00 AM', serviceId: servicio.id, staffId: staffAjeno } });
  comprobar('D3', 'Especialista de otro salón → 400', ajenaStaff.status === 400, `HTTP ${ajenaStaff.status}`);
  const ajenoServ = await api('/api/bookings', { method: 'POST', body: { tenantId: 'capra-studio', clientName: `CI ${RUN} serv`, clientPhone: `${telBase}04`, date: fechaFutura(22), timeSlot: '09:00 AM', serviceId: servicioAjeno } });
  comprobar('D4', 'Servicio de otro salón → 400', ajenoServ.status === 400, `HTTP ${ajenoServ.status}`);
  const reservaClienta = await api('/api/bookings', {
    method: 'POST',
    body: { tenantId: 'capra-studio', clientName: `CI ${RUN} clienta`, clientPhone: `${telBase}05`, clientEmail: email('clienta'), date: fechaFutura(40), timeSlot: '02:00 PM', serviceId: servicio.id },
  });
  const idReservaClienta = reservaClienta.json?.booking?.id;
  if (idReservaClienta) creados.bookings.push(idReservaClienta);
  const estados = [];
  for (let i = 0; i < 4; i++) {
    const r = await api('/api/bookings', { method: 'POST', body: { tenantId: 'capra-studio', clientName: `CI ${RUN} tel${i}`, clientPhone: `${telBase}09`, date: fechaFutura(30 + i), timeSlot: '11:30 AM', serviceId: servicio.id } });
    if (r.json?.booking?.id) creados.bookings.push(r.json.booking.id);
    estados.push(r.status);
  }
  comprobar('D5', 'Freno anti-bots: 4.ª reserva en 1 h desde el mismo teléfono o IP → 429', estados[3] === 429 && estados.slice(0, 3).every((s) => s === 201 || s === 429), `estados ${estados.join(', ')}`);

  // ── E. Dueño: estados, borrado, catálogo validado, QR con destinos propios ──
  await limpiarRateLimitRunner();
  const owLogin = await api('/api/auth/sign-in/email', { method: 'POST', body: { email: email('owner'), password: PASS.owner } });
  const owToken = owLogin.token;
  const staffBorra = await api(`/api/bookings?id=${encodeURIComponent(idReserva || 'x')}`, { method: 'DELETE', token: stToken });
  const staffEstado = await api('/api/bookings', { method: 'PATCH', token: stToken, body: { id: idReserva, status: 'confirmada' } });
  const ownerBorra = await api(`/api/bookings?id=${encodeURIComponent(idReserva || 'x')}`, { method: 'DELETE', token: owToken });
  comprobar('E1', 'Staff cambia estados pero no borra; el dueño sí borra', staffBorra.status === 403 && staffEstado.status === 200 && ownerBorra.status === 200,
    `staff DELETE ${staffBorra.status}, staff PATCH ${staffEstado.status}, owner DELETE ${ownerBorra.status}`);

  const precioMalo = await api('/api/services', { method: 'POST', token: owToken, body: { tenantId: 'capra-studio', name: 'CI', category: 'CI', priceUSD: -5 } });
  const svg = await api('/api/services', { method: 'POST', token: owToken, body: { tenantId: 'capra-studio', name: 'CI', category: 'CI', priceUSD: 5, imageUrl: 'data:image/svg+xml;base64,PHN2Zz4=' } });
  const pisaAjeno = await api('/api/services', { method: 'POST', token: owToken, body: { id: servicioAjeno, tenantId: 'capra-studio', name: 'CI', category: 'CI', priceUSD: 5 } });
  const bueno = await api('/api/services', { method: 'POST', token: owToken, body: { tenantId: 'capra-studio', name: `CI ${RUN}`, category: 'CI', priceUSD: 15, durationMinutes: 45 } });
  if (bueno.json?.serviceId) creados.services.push(bueno.json.serviceId);
  comprobar('E2', 'Catálogo: precio negativo 400, SVG 400, id de otro salón 403, válido 200', precioMalo.status === 400 && svg.status === 400 && pisaAjeno.status === 403 && bueno.status === 200,
    `negativo ${precioMalo.status}, svg ${svg.status}, ajeno ${pisaAjeno.status}, válido ${bueno.status}`);

  const codigo = `ci-${RUN}`.slice(0, 32);
  const destinos = [['https://evil.example', 400], ['//evil.example', 400], ['/andrea-nails', 400], ['/capra-studio#reservar', 200]];
  const qrEstados = [];
  for (const [destino] of destinos) {
    const r = await api('/api/qr', { method: 'POST', token: owToken, body: { action: 'create', tenantId: 'capra-studio', code: codigo, targetUrl: destino, label: 'CI' } });
    if (r.status === 200) creados.qr.push(codigo);
    qrEstados.push(r.status);
  }
  comprobar('E3', 'QR del salón: externo 400, //dominio 400, otro salón 400, propio 200', destinos.every(([, esperado], i) => qrEstados[i] === esperado), `estados ${qrEstados.join(', ')}`);
  const salto = await api(`/r/${codigo}`);
  const escaneos = (await sql`SELECT count(*)::int n FROM public.qr_scans WHERE code = ${codigo}`)[0].n;
  const huella = (await sql`SELECT ip_hash FROM public.qr_scans WHERE code = ${codigo} LIMIT 1`)[0]?.ip_hash || '';
  comprobar('E4', 'Escaneo /r/<código> → 302 al destino con ?qr= y escaneo contado con IP en HMAC',
    salto.status === 302 && salto.location === `/capra-studio?qr=${codigo}#reservar` && escaneos === 1 && /^[0-9a-f]{64}$/.test(huella),
    `HTTP ${salto.status}, Location ${salto.location}, escaneos ${escaneos}, ip_hash ${/^[0-9a-f]{64}$/.test(huella) ? 'HMAC' : huella.slice(0, 12)}`);
  const inexistente = await api('/r/ci-no-existe-xyz');
  comprobar('E5', 'Código inexistente → 302 a la portada, sin atajos por prefijo', inexistente.status === 302 && inexistente.location === '/', `HTTP ${inexistente.status}, Location ${inexistente.location}`);

  // ── F. QR de campaña: solo Central ──
  const campana = `cic-${RUN}`.slice(0, 32);
  const campOwner = await api('/api/qr', { method: 'POST', token: owToken, body: { action: 'campaign_upsert', code: campana, name: 'CI', targetUrl: '/' } });
  const campMala = await api('/api/qr', { method: 'POST', token: saToken2fa, body: { action: 'campaign_upsert', code: campana, name: 'CI', targetUrl: '//evil.example' } });
  const campBuena = await api('/api/qr', { method: 'POST', token: saToken2fa, body: { action: 'campaign_upsert', code: campana, name: 'CI', targetUrl: '/?utm_source=flyer' } });
  if (campBuena.status === 200) creados.campanas.push(campana);
  const campSalto = await api(`/q/${campana}`);
  comprobar('F1', 'Campaña: dueño 403, destino //dominio 400, Central 200, /q/ → 302 con ?qr=',
    campOwner.status === 403 && campMala.status === 400 && campBuena.status === 200 && campSalto.status === 302 && campSalto.location === `/?utm_source=flyer&qr=${campana}`,
    `owner ${campOwner.status}, //dominio ${campMala.status}, Central ${campBuena.status}, /q/ ${campSalto.status} → ${campSalto.location}`);

  // ── I. Equipo del salón (api/team.ts) ──
  const equipoOwner = await api('/api/team?tenant=capra-studio', { token: owToken });
  const equipoStaff = await api('/api/team?tenant=capra-studio', { token: stToken });
  const staffVeSensibles = (equipoStaff.json?.staff || []).some((x) => 'phone' in x || 'commissionPercent' in x);
  const equipoAjeno = await api('/api/team?tenant=andrea-nails', { token: owToken });
  comprobar('I1', 'Equipo: dueño 200, staff 200 sin teléfono ni comisión, otro salón 403',
    equipoOwner.status === 200 && equipoStaff.status === 200 && !staffVeSensibles && equipoAjeno.status === 403,
    `dueño ${equipoOwner.status}, staff ${equipoStaff.status} (sensibles ${staffVeSensibles ? 'SÍ' : 'no'}), andrea ${equipoAjeno.status}`);
  const staffEscribe = await api('/api/team', { method: 'POST', token: stToken, body: { action: 'upsert_staff', tenantId: 'capra-studio', name: 'CI' } });
  const comisionMala = await api('/api/team', { method: 'POST', token: owToken, body: { action: 'upsert_staff', tenantId: 'capra-studio', name: 'CI', commissionPercent: 150 } });
  const pisaAjena = await api('/api/team', { method: 'POST', token: owToken, body: { action: 'upsert_staff', tenantId: 'capra-studio', id: staffAjeno, name: 'CI' } });
  const nuevo = await api('/api/team', { method: 'POST', token: owToken, body: { action: 'upsert_staff', tenantId: 'capra-studio', name: `CI ${RUN}`, commissionPercent: 30 } });
  const idNuevo = nuevo.json?.id || nuevo.json?.staffId || nuevo.json?.staff?.id
    || (await sql`SELECT id FROM public.staff_members WHERE tenant_id = 'capra-studio' AND name = ${'CI ' + RUN} LIMIT 1`)[0]?.id;
  if (idNuevo) creados.equipo.push(idNuevo);
  const borra = idNuevo ? await api(`/api/team?type=staff&id=${encodeURIComponent(idNuevo)}`, { method: 'DELETE', token: owToken }) : { status: 0 };
  comprobar('I2', 'Equipo: staff no escribe 403, comisión 150 % 400, id de otro salón 403, alta y baja del dueño 200',
    staffEscribe.status === 403 && comisionMala.status === 400 && pisaAjena.status === 403 && nuevo.status === 200 && borra.status === 200,
    `staff ${staffEscribe.status}, comisión ${comisionMala.status}, ajeno ${pisaAjena.status}, alta ${nuevo.status}, baja ${borra.status}`);

  // ── J. Código por correo: solo clientas, nunca cuentas de trabajo ──
  const otpTrabajo = await api('/api/auth/email-otp/send-verification-otp', { method: 'POST', body: { email: email('owner'), type: 'sign-in' } });
  const entraTrabajo = await api('/api/auth/sign-in/email-otp', { method: 'POST', body: { email: email('superadmin'), otp: '123456' } });
  const recupera = await api('/api/auth/email-otp/send-verification-otp', { method: 'POST', body: { email: email('owner'), type: 'forget-password' } });
  const reset = await api('/api/auth/forget-password/email-otp', { method: 'POST', body: { email: email('owner') } });
  comprobar('J1', 'Cuenta de trabajo: no se le envía código, no entra por código (sin saltar contraseña ni 2FA), sin recuperación por código',
    entraTrabajo.status === 401 && recupera.status === 400 && reset.status === 403 && otpTrabajo.status === 200,
    `envío ${otpTrabajo.status} (mudo), sign-in ${entraTrabajo.status}, forget-password ${recupera.status}, reset ${reset.status}`);

  const correoClienta = email('clienta');
  const envio = await api('/api/auth/email-otp/send-verification-otp', { method: 'POST', body: { email: correoClienta, type: 'sign-in' } });
  // El código se lee de la base como sustituto del buzón (el paso probado es el inicio de sesión por la API).
  const filaOtp = (await sql`SELECT value FROM "verification" WHERE identifier LIKE ${'%' + correoClienta + '%'} ORDER BY "createdAt" DESC LIMIT 1`)[0];
  const codigoOtp = filaOtp ? String(filaOtp.value).split(":")[0] : null;
  const clienta = codigoOtp ? await api("/api/auth/sign-in/email-otp", { method: "POST", body: { email: correoClienta, otp: codigoOtp } }) : { status: 0 };
  comprobar('J2', 'Clienta: correo real enviado por SMTP (sin SMTP_PASS en Preview → FALLA) y acceso con el código', envio.status === 200 && clienta.status === 200 && !!clienta.token,
    `envío ${envio.status}${envio.status === 500 ? ' (¿falta SMTP_PASS en Preview feat/b1-auth?)' : ''}, código ${codigoOtp ? "generado" : "NO"}, sign-in ${clienta.status}`);
  const mias = clienta.token ? await api('/api/bookings?mine=1', { token: clienta.token }) : { status: 0, json: null };
  const veLaSuya = (mias.json?.bookings || []).some((b) => b.id === idReservaClienta);
  const ajenasVisibles = (mias.json?.bookings || []).some((b) => b.id !== idReservaClienta);
  comprobar('J3', '«Mis citas»: la clienta ve su cita (ligada a su correo) y ninguna ajena', mias.status === 200 && veLaSuya && !ajenasVisibles,
    `HTTP ${mias.status}, su cita ${veLaSuya ? 'sí' : 'NO'}, ajenas ${ajenasVisibles ? 'SÍ' : 'no'}`);

  // ── G. Cron ──
  const cronSin = await api('/api/cron-reminders');
  const cronMal = await fetch(`${BASE}/api/cron-reminders`, { headers: { ...(BYPASS ? { 'x-vercel-protection-bypass': BYPASS } : {}), Authorization: 'Bearer incorrecto' } });
  let cronOk = 0;
  if (CRON_SECRET) {
    const r = await fetch(`${BASE}/api/cron-reminders`, { headers: { ...(BYPASS ? { 'x-vercel-protection-bypass': BYPASS } : {}), Authorization: `Bearer ${CRON_SECRET}` } });
    cronOk = r.status;
  }
  comprobar('G1', 'Cron: sin clave 401, clave errónea 401, clave de Actions 200 (sin clave en CI → FALLA)', cronSin.status === 401 && cronMal.status === 401 && cronOk === 200,
    `sin ${cronSin.status}, errónea ${cronMal.status}, válida ${CRON_SECRET ? cronOk : 'CRON_SECRET AUSENTE'}`);

  // ── H. Tope de OTP por número ──
  const telOtp = `+58414${RUN.replace(/\D/g, '').slice(-5).padStart(5, '0')}77`;
  const otp = [];
  for (let i = 0; i < 4; i++) {
    await limpiarRateLimitRunner();
    otp.push((await api('/api/auth/phone-number/send-otp', { method: 'POST', body: { phoneNumber: telOtp } })).status);
  }
  await sql`DELETE FROM "rateLimit" WHERE key = ${'phone_otp:' + telOtp.replace(/\D/g, '')}`;
  await sql`DELETE FROM "verification" WHERE identifier LIKE ${'%' + telOtp.replace(/\D/g, '') + '%'}`;
  comprobar('H1', 'send-otp: 4.º envío al mismo número en 1 h → 429', otp[3] === 429 && otp.slice(0, 3).every((s) => s === 200), `estados ${otp.join(', ')}`);
}

(async () => {
  let errorFatal = null;
  try {
    await main();
  } catch (err) {
    errorFatal = err;
    console.error(`\n❌ Error durante la suite: ${err?.message || err}`);
  }
  try {
    await limpiar();
    const restos = (await sql`SELECT count(*)::int n FROM "user" WHERE email LIKE ${'ci-' + RUN + '-%@' + DOMINIO}`)[0].n
      + (await sql`SELECT count(*)::int n FROM public.bookings WHERE client_name LIKE ${'CI ' + RUN + '%'}`)[0].n;
    comprobar('Z1', 'Limpieza: 0 filas de esta ejecución en staging', restos === 0, `${restos} filas restantes`);
  } catch (err) {
    comprobar('Z1', 'Limpieza', false, err?.message || String(err));
  }
  const malas = resultados.filter((r) => !r.ok).map((r) => r.id);
  console.log('\n================================================================================');
  console.log(!errorFatal && malas.length === 0
    ? `   TODAS LAS COMPROBACIONES B1-a PASARON ✅ (${resultados.length})`
    : `   FALLAN: ${[...malas, ...(errorFatal ? ['error'] : [])].join(', ')} ❌`);
  console.log('================================================================================');
  process.exit(!errorFatal && malas.length === 0 ? 0 : 1);
})();
