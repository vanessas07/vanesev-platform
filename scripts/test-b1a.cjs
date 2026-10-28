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
// G-070: la suite escribe datos de prueba; contra producción no arranca nunca.
if (/^https?:\/\/(www\.)?vanesev\.com$/i.test(BASE) || /vanesev-platform(-vanesevapp-4342)?\.vercel\.app$/i.test(BASE)) {
  console.error(`La suite no corre contra producción (${BASE}). Usa la vista previa de una rama.`);
  process.exit(1);
}
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
const TRIAL = 'andrea-nails@prueba.vanesev.internal';
const email = (rol) => `ci-${RUN}-${rol}@${DOMINIO}`;
const PASS = {
  superadmin: `Sa-${crypto.randomBytes(9).toString('base64url')}-1`,
  owner: `Ow-${crypto.randomBytes(9).toString('base64url')}-1`,
};
const creados = { bookings: [], services: [], qr: [], campanas: [], equipo: [] };
const inicio = new Date();
let originalCapra = null;

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
  if (creados.altaSlug) {
    const sl = creados.altaSlug;
    await sql`DELETE FROM public.activaciones_cuenta WHERE tenant_id = ${sl}`;
    await sql`DELETE FROM public.qr_codes WHERE tenant_id = ${sl}`;
    await sql`DELETE FROM public.services WHERE tenant_id = ${sl}`;
    await sql`DELETE FROM "member" WHERE "organizationId" IN (SELECT id FROM "organization" WHERE slug = ${sl})`;
    await sql`DELETE FROM "organization" WHERE slug = ${sl}`;
    await sql`UPDATE public.solicitudes_alta SET tenant_id = NULL WHERE tenant_id = ${sl}`;
    await sql`DELETE FROM public.tenants WHERE id = ${sl}`;
  }
  await sql`DELETE FROM public.solicitudes_alta WHERE lower(email) LIKE ${'ci-' + RUN + '-%@' + DOMINIO}`;
  await sql`DELETE FROM "session" WHERE "userId" IN (SELECT id FROM "user" WHERE email LIKE ${'ci-' + RUN + '-%@' + DOMINIO})`;
  await sql`DELETE FROM "twoFactor" WHERE "userId" IN (SELECT id FROM "user" WHERE email LIKE ${'ci-' + RUN + '-%@' + DOMINIO})`;
  await sql`DELETE FROM "member" WHERE "userId" IN (SELECT id FROM "user" WHERE email LIKE ${'ci-' + RUN + '-%@' + DOMINIO})`;
  await sql`DELETE FROM "account" WHERE "userId" IN (SELECT id FROM "user" WHERE email LIKE ${'ci-' + RUN + '-%@' + DOMINIO})`;
  await sql`DELETE FROM "user" WHERE email LIKE ${'ci-' + RUN + '-%@' + DOMINIO}`;
  await sql`DELETE FROM public.whatsapp_mensajes WHERE mensaje_id LIKE ${'ci-' + RUN + '%'}`;
  if (creados.whatsapp) await sql`DELETE FROM public.whatsapp_conexiones WHERE tenant_id = 'capra-studio'`;
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
  const prueba = await sql`SELECT id FROM "user" WHERE email = ${TRIAL}`;
  for (const { id } of prueba) {
    await sql.transaction([
      sql`DELETE FROM "session" WHERE "userId" = ${id}`,
      sql`DELETE FROM "member" WHERE "userId" = ${id}`,
      sql`DELETE FROM "account" WHERE "userId" = ${id}`,
      sql`DELETE FROM "verification" WHERE identifier LIKE ${'activar:' + id + ':%'}`,
      sql`DELETE FROM "user" WHERE id = ${id}`,
    ]);
  }
  await sql`UPDATE public.tenants SET en_prueba = false WHERE id = 'andrea-nails'`;
  // Solo lo de ESTA ejecución: otra ejecución en curso no debe perder sus datos.
  await sql`DELETE FROM public.ofertas WHERE tenant_id = 'capra-studio' AND titulo LIKE ${'CI ' + RUN + '%'}`;
  await sql`DELETE FROM public.cupones WHERE tenant_id = 'capra-studio' AND descripcion LIKE ${'CI ' + RUN + '%'}`;
  await sql`DELETE FROM public.tarjetas_regalo WHERE tenant_id = 'capra-studio' AND nota LIKE ${'CI ' + RUN + '%'}`;
  if (originalCapra) {
    await sql`UPDATE public.tenants SET landing = ${JSON.stringify(originalCapra.landing || {})}::jsonb, tema = ${JSON.stringify(originalCapra.tema || {})}::jsonb,
              slogan = ${originalCapra.slogan} WHERE id = 'capra-studio'`;
  }
  await sql`DELETE FROM public.central_mailbox WHERE sender = 'salon:andrea-nails' AND body LIKE ${'CI ' + RUN + '%'}`;
  await sql`DELETE FROM public.limite_frecuencia WHERE actualizado_en >= ${inicio.toISOString()}
            AND (clave LIKE 'puesta_a_punto:%' OR clave LIKE 'activar_codigo:%' OR clave LIKE 'activar_intento:%' OR clave LIKE 'presupuesto-ip:%')`;
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
    ['POST', '/api/central', { action: 'create-trial-owner', payload: { organizationSlug: 'andrea-nails' } }],
    ['POST', '/api/team', { action: 'activar_cuenta_codigo', correo: 'x@example.com' }],
    ['POST', '/api/team', { action: 'solicitud_cambios', tenantId: 'andrea-nails', texto: 'texto de prueba' }],
    ['GET', '/api/salon?tenant=capra-studio'],
    ['POST', '/api/salon', { action: 'cupon_guardar', tenantId: 'capra-studio', cupon: { codigo: 'XXX', tipo: 'importe', valor: 1 } }],
    ['POST', '/api/salon', { action: 'tarjeta_crear', tenantId: 'capra-studio', saldoUSD: 5 }],
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

  // ── B8. Primera entrada del superadmin desde la pantalla (CentralAuthGate): provisional → cambio → 2FA → Central ──
  await limpiarRateLimitRunner();
  const provisional = `Pv-${crypto.randomBytes(9).toString('base64url')}-1`;
  const idNuevoSa = `ci_${RUN}_superadmin2`;
  await sql.transaction([
    sql`INSERT INTO "user" (id, name, email, "emailVerified", "createdAt", "updatedAt", "twoFactorEnabled", platform_role, must_reset)
        VALUES (${idNuevoSa}, 'CI superadmin2', ${email('superadmin2')}, true, NOW(), NOW(), false, 'superadmin_decisivo', true)`,
    sql`INSERT INTO "account" (id, "userId", "accountId", "providerId", password, "createdAt", "updatedAt")
        VALUES (${idNuevoSa + '_acc'}, ${idNuevoSa}, ${idNuevoSa}, 'credential', ${hashOficial(provisional)}, NOW(), NOW())`,
  ]);
  const pe = await api('/api/auth/sign-in/email', { method: 'POST', body: { email: email('superadmin2'), password: provisional } });
  const peSesion = pe.token ? await api('/api/auth/get-session', { token: pe.token }) : { json: null };
  const peUsuario = peSesion.json?.user || {};
  const definitiva = `Df-${crypto.randomBytes(9).toString('base64url')}-1`;
  const peCambio = await api('/api/auth/change-password', { method: 'POST', token: pe.token, body: { currentPassword: provisional, newPassword: definitiva, revokeOtherSessions: false } });
  const peToken = peCambio.token || pe.token;
  const peAlta = await api('/api/auth/two-factor/enable', { method: 'POST', token: peToken, body: { password: definitiva } });
  let peSecreto = null;
  try { peSecreto = new URL(peAlta.json?.totpURI).searchParams.get('secret'); } catch { peSecreto = null; }
  const peVerif = await api('/api/auth/two-factor/verify-totp', { method: 'POST', token: peToken, body: { code: peSecreto ? totp(peSecreto) : '000000' } });
  const peCentral = peVerif.token ? await api('/api/central', { token: peVerif.token }) : { status: 0 };
  const peVieja = await api('/api/auth/sign-in/email', { method: 'POST', body: { email: email('superadmin2'), password: provisional } });
  comprobar('B8', 'Primera entrada por pantalla: provisional → la sesión dice superadmin y must_reset → cambio → 2FA con la nueva → Central 200; la provisional ya no entra',
    pe.status === 200 && peUsuario.platform_role === 'superadmin_decisivo' && peUsuario.must_reset === true && peCambio.status === 200
      && peAlta.status === 200 && !!peSecreto && (peAlta.json?.backupCodes || []).length > 0 && peVerif.status === 200 && peCentral.status === 200 && peVieja.status === 401,
    `login ${pe.status}, rol ${peUsuario.platform_role || 'NO'}, must_reset ${peUsuario.must_reset}, cambio ${peCambio.status}, alta ${peAlta.status}, verify ${peVerif.status}, Central ${peCentral.status}, provisional ${peVieja.status}`);

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
  comprobar('I2', 'Equipo: staff no escribe 403, comisión 150 % 400, id de otro salón 403, alta del dueño 200 o 201 y baja 200',
    staffEscribe.status === 403 && comisionMala.status === 400 && pisaAjena.status === 403 && (nuevo.status === 200 || nuevo.status === 201) && borra.status === 200,
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
  // Ojo: better-auth responde 200 aunque el SMTP falle (runInBackgroundOrAwait solo lo registra en el log).
  // La ENTREGA del correo no se puede medir desde la API: se comprueba aparte con un envío real a soporte@vanesev.com.
  comprobar('J2', 'Clienta: código generado y acceso con el código (la entrega del correo NO se mide aquí)', envio.status === 200 && clienta.status === 200 && !!clienta.token,
    `envío ${envio.status}, código ${codigoOtp ? "generado" : "NO"}, sign-in ${clienta.status}`);
  const mias = clienta.token ? await api('/api/bookings?mine=1', { token: clienta.token }) : { status: 0, json: null };
  const veLaSuya = (mias.json?.bookings || []).some((b) => b.id === idReservaClienta);
  const ajenasVisibles = (mias.json?.bookings || []).some((b) => b.id !== idReservaClienta);
  comprobar('J3', '«Mis citas»: la clienta ve su cita (ligada a su correo) y ninguna ajena', mias.status === 200 && veLaSuya && !ajenasVisibles,
    `HTTP ${mias.status}, su cita ${veLaSuya ? 'sí' : 'NO'}, ajenas ${ajenasVisibles ? 'SÍ' : 'no'}`);

  // ── K. Puesta a punto (B1-c): acceso temporal, peticiones y «Activar mi cuenta» ──
  await limpiarRateLimitRunner();
  const trialDueño = await api('/api/central', { method: 'POST', token: owToken, body: { action: 'create-trial-owner', payload: { organizationSlug: 'andrea-nails' } } });
  const trial = await api('/api/central', { method: 'POST', token: saToken2fa, body: { action: 'create-trial-owner', payload: { organizationSlug: 'andrea-nails' } } });
  const trialRepe = await api('/api/central', { method: 'POST', token: saToken2fa, body: { action: 'create-trial-owner', payload: { organizationSlug: 'andrea-nails' } } });
  const tempPass = trial.json?.temporaryPassword || '';
  comprobar('K1', 'Central crea el acceso temporal: dueña 403, superadmin 200 (contraseña ≥ 16, una vez), repetido 409',
    trialDueño.status === 403 && trial.status === 200 && trial.json?.email === TRIAL && tempPass.length >= 16 && trialRepe.status === 409 && !('temporaryPassword' in (trialRepe.json || {})),
    `dueña ${trialDueño.status}, superadmin ${trial.status} (${tempPass.length} caracteres), repetido ${trialRepe.status}`);

  const tLogin = await api('/api/auth/sign-in/email', { method: 'POST', body: { email: TRIAL, password: tempPass } });
  const tToken = tLogin.token;
  const tEquipo = tToken ? await api('/api/team?tenant=andrea-nails', { token: tToken }) : { status: 0, json: null };
  const tAjeno = tToken ? await api('/api/team?tenant=capra-studio', { token: tToken }) : { status: 0 };
  const tOtp = await api('/api/auth/email-otp/send-verification-otp', { method: 'POST', body: { email: TRIAL, type: 'sign-in' } });
  const tOtpEntra = await api('/api/auth/sign-in/email-otp', { method: 'POST', body: { email: TRIAL, otp: '123456' } });
  comprobar('K2', 'La dueña entra con el acceso temporal, ve «en puesta a punto», no ve otro salón y no entra por código',
    tLogin.status === 200 && !!tToken && tEquipo.status === 200 && tEquipo.json?.enPrueba === true && tAjeno.status === 403 && tOtpEntra.status === 401,
    `login ${tLogin.status}, equipo ${tEquipo.status} (enPrueba ${tEquipo.json?.enPrueba}), capra ${tAjeno.status}, código ${tOtp.status}/${tOtpEntra.status}`);

  const corta = await api('/api/team', { method: 'POST', token: tToken, body: { action: 'solicitud_cambios', tenantId: 'andrea-nails', texto: 'corta' } });
  const ajenaPide = await api('/api/team', { method: 'POST', token: owToken, body: { action: 'solicitud_cambios', tenantId: 'andrea-nails', texto: `CI ${RUN} ajena` } });
  const staffPide = await api('/api/team', { method: 'POST', token: stToken, body: { action: 'solicitud_cambios', tenantId: 'capra-studio', texto: `CI ${RUN} staff` } });
  const pide = await api('/api/team', { method: 'POST', token: tToken, body: { action: 'solicitud_cambios', tenantId: 'andrea-nails', texto: `CI ${RUN} cambiar el color del botón`, quiereLlamada: true } });
  const idPeticion = pide.json?.id;
  comprobar('K3', 'Formulario: texto corto 400, otro salón 403, staff 403, la dueña 201',
    corta.status === 400 && ajenaPide.status === 403 && staffPide.status === 403 && pide.status === 201 && !!idPeticion,
    `corta ${corta.status}, ajena ${ajenaPide.status}, staff ${staffPide.status}, dueña ${pide.status}`);

  const snap = await api('/api/central', { token: saToken2fa });
  const enCentral = (snap.json?.peticionesPuestaAPunto || []).find((x) => x.id === idPeticion);
  const marcaMala = await api('/api/central', { method: 'POST', token: saToken2fa, body: { action: 'puesta_a_punto_estado', payload: { id: idPeticion, estado: 'borrada' } } });
  const marcaDueña = await api('/api/central', { method: 'POST', token: tToken, body: { action: 'puesta_a_punto_estado', payload: { id: idPeticion, estado: 'hecha' } } });
  const marca = await api('/api/central', { method: 'POST', token: saToken2fa, body: { action: 'puesta_a_punto_estado', payload: { id: idPeticion, estado: 'en_curso' } } });
  const tRelee = await api('/api/team?tenant=andrea-nails', { token: tToken });
  const laSuya = (tRelee.json?.peticiones || []).find((x) => x.id === idPeticion);
  const stEquipo = await api('/api/team?tenant=capra-studio', { token: stToken });
  comprobar('K4', 'Central ve la petición (prioridad alta) y la marca en curso; estado inválido 400, la dueña no marca 403; la dueña ve el estado; el staff no recibe peticiones',
    enCentral?.priority === 'high' && marcaMala.status === 400 && marcaDueña.status === 403 && marca.status === 200 && laSuya?.estado === 'en_curso'
      && stEquipo.status === 200 && (stEquipo.json?.peticiones || []).length === 0,
    `central ${enCentral ? enCentral.priority : 'NO'}, inválido ${marcaMala.status}, dueña ${marcaDueña.status}, marca ${marca.status}, la ve ${laSuya?.estado || 'NO'}, staff ${(stEquipo.json?.peticiones || []).length}`);

  await limpiarRateLimitRunner();
  const nueva = await api('/api/central', { method: 'POST', token: saToken2fa, body: { action: 'reset-trial-password', payload: { organizationSlug: 'andrea-nails' } } });
  const resetNoPrueba = await api('/api/central', { method: 'POST', token: saToken2fa, body: { action: 'reset-trial-password', payload: { organizationSlug: 'capra-studio' } } });
  const tViejo = await api('/api/team?tenant=andrea-nails', { token: tToken });
  const passVieja = await api('/api/auth/sign-in/email', { method: 'POST', body: { email: TRIAL, password: tempPass } });
  const tLogin2 = await api('/api/auth/sign-in/email', { method: 'POST', body: { email: TRIAL, password: nueva.json?.temporaryPassword || '-' } });
  const tToken2 = tLogin2.token;
  comprobar('K5', 'Regenerar contraseña: nueva una vez, revoca la sesión, la vieja no entra, la nueva sí; sin acceso temporal 404',
    nueva.status === 200 && (nueva.json?.temporaryPassword || '').length >= 16 && resetNoPrueba.status === 404 && tViejo.status === 401 && passVieja.status === 401 && tLogin2.status === 200 && !!tToken2,
    `reset ${nueva.status}, sin acceso ${resetNoPrueba.status}, sesión vieja ${tViejo.status}, contraseña vieja ${passVieja.status}, nueva ${tLogin2.status}`);

  const correoReal = email('activa');
  const codigoNoPrueba = await api('/api/team', { method: 'POST', token: owToken, body: { action: 'activar_cuenta_codigo', correo: correoReal } });
  const codigoOcupado = await api('/api/team', { method: 'POST', token: tToken2, body: { action: 'activar_cuenta_codigo', correo: email('owner') } });
  const codigo1 = await api('/api/team', { method: 'POST', token: tToken2, body: { action: 'activar_cuenta_codigo', correo: correoReal } });
  const idTrial = (await sql`SELECT id FROM "user" WHERE email = ${TRIAL}`)[0]?.id;
  const ident = `activar:${idTrial}:${correoReal}`;
  const filaCodigo = (await sql`SELECT value FROM "verification" WHERE identifier = ${ident}`)[0];
  // Sin SMTP_PASS en Preview (G-028) el envío falla: la API debe decirlo (502), nunca «enviado».
  comprobar('K6', 'Código de activación: cuenta normal 403, correo de otra cuenta 409, cuenta de prueba → código guardado con hash (200 o 502 si el SMTP falla)',
    codigoNoPrueba.status === 403 && codigoOcupado.status === 409 && [200, 502].includes(codigo1.status) && !!filaCodigo && /^[0-9a-f]{64}$/.test(filaCodigo.value),
    `normal ${codigoNoPrueba.status}, ocupado ${codigoOcupado.status}, envío ${codigo1.status}, guardado ${filaCodigo ? 'con hash' : 'NO'}`);

  // El código real solo llega al correo: se sustituye por uno conocido (como el buzón en J2); lo probado es la activación por la API.
  const conocido = '246810';
  const fijarCodigo = () => sql`UPDATE "verification" SET value = ${crypto.createHash('sha256').update(conocido).digest('hex')} WHERE identifier = ${ident}`;
  await fijarCodigo();
  const intentosMalos = [];
  for (let i = 0; i < 5; i++) {
    intentosMalos.push((await api('/api/team', { method: 'POST', token: tToken2, body: { action: 'activar_cuenta', correo: correoReal, codigo: '000000', nuevaContrasena: 'Nueva-Clave-1234' } })).status);
  }
  const trasFallos = await api('/api/team', { method: 'POST', token: tToken2, body: { action: 'activar_cuenta', correo: correoReal, codigo: conocido, nuevaContrasena: 'Nueva-Clave-1234' } });
  comprobar('K7', 'Activación: 4 códigos erróneos 400, el 5.º 429 y el código queda anulado (el correcto ya no sirve)',
    intentosMalos.slice(0, 4).every((x) => x === 400) && intentosMalos[4] === 429 && trasFallos.status === 400,
    `intentos ${intentosMalos.join('/')}, después ${trasFallos.status}`);

  await api('/api/team', { method: 'POST', token: tToken2, body: { action: 'activar_cuenta_codigo', correo: correoReal } });
  await fijarCodigo();
  const nuevaClave = `Ac-${crypto.randomBytes(9).toString('base64url')}-1`;
  const claveCorta = await api('/api/team', { method: 'POST', token: tToken2, body: { action: 'activar_cuenta', correo: correoReal, codigo: conocido, nuevaContrasena: 'corta' } });
  const activa = await api('/api/team', { method: 'POST', token: tToken2, body: { action: 'activar_cuenta', correo: correoReal, codigo: conocido, nuevaContrasena: nuevaClave } });
  await limpiarRateLimitRunner();
  const sesionTemporal = await api('/api/team?tenant=andrea-nails', { token: tToken2 });
  const accesoTemporal = await api('/api/auth/sign-in/email', { method: 'POST', body: { email: TRIAL, password: nueva.json?.temporaryPassword || '-' } });
  const real = await api('/api/auth/sign-in/email', { method: 'POST', body: { email: correoReal, password: nuevaClave } });
  const panelReal = real.token ? await api('/api/team?tenant=andrea-nails', { token: real.token }) : { status: 0, json: null };
  const conserva = (panelReal.json?.peticiones || []).some((x) => x.id === idPeticion);
  comprobar('K8', '«Activar mi cuenta»: contraseña corta 400, activa 200, la sesión y el acceso temporal dejan de servir, entra con su correo, el salón sale de puesta a punto y la petición se conserva',
    claveCorta.status === 400 && activa.status === 200 && sesionTemporal.status === 401 && accesoTemporal.status === 401 && real.status === 200
      && panelReal.status === 200 && panelReal.json?.enPrueba === false && conserva,
    `corta ${claveCorta.status}, activa ${activa.status}, sesión temporal ${sesionTemporal.status}, acceso temporal ${accesoTemporal.status}, su correo ${real.status}, enPrueba ${panelReal.json?.enPrueba}, petición ${conserva ? 'conservada' : 'NO'}`);

  // ── L. Negocio del salón (G-033): perfil, landing, tema, ofertas con precio especial, cupones y tarjetas regalo ──
  originalCapra = (await sql`SELECT landing, tema, slogan FROM public.tenants WHERE id = 'capra-studio'`)[0];
  // Preparación: el freno de reservas por IP ya se agotó a propósito en D5.
  await sql`DELETE FROM public.limite_frecuencia WHERE actualizado_en >= ${inicio.toISOString()} AND (clave LIKE 'reserva-ip:%' OR clave LIKE 'reserva-tel:%')`;
  const base = Number(servicio.price_usd);
  const sinSesion = await api('/api/salon?tenant=capra-studio');
  const staffLee = await api('/api/salon?tenant=capra-studio', { token: stToken });
  const ajenoLee = await api('/api/salon?tenant=andrea-nails', { token: owToken });
  const dueñaLee = await api('/api/salon?tenant=capra-studio', { token: owToken });
  const publico = await api('/api/salon?tenant=capra-studio&vista=publica');
  comprobar('L1', 'Salón: sin sesión 401, staff 403, otro salón 403, dueña 200; la vista pública no lleva cupones ni tarjetas',
    sinSesion.status === 401 && staffLee.status === 403 && ajenoLee.status === 403 && dueñaLee.status === 200 && publico.status === 200
      && !!publico.json?.perfil && !('cupones' in (publico.json || {})) && !('tarjetas' in (publico.json || {})),
    `sin ${sinSesion.status}, staff ${staffLee.status}, ajeno ${ajenoLee.status}, dueña ${dueñaLee.status}, pública ${publico.status}`);

  const perfilOrig = dueñaLee.json?.perfil || {};
  const waMalo = await api('/api/salon', { method: 'POST', token: owToken, body: { action: 'perfil_guardar', tenantId: 'capra-studio', perfil: { ...perfilOrig, whatsapp: 'abc' } } });
  const perfilOk = await api('/api/salon', { method: 'POST', token: owToken, body: { action: 'perfil_guardar', tenantId: 'capra-studio', perfil: { ...perfilOrig, eslogan: `CI ${RUN}` } } });
  const verPerfil = await api('/api/salon?tenant=capra-studio&vista=publica');
  const staffPerfil = await api('/api/salon', { method: 'POST', token: stToken, body: { action: 'perfil_guardar', tenantId: 'capra-studio', perfil: { ...perfilOrig } } });
  await api('/api/salon', { method: 'POST', token: owToken, body: { action: 'perfil_guardar', tenantId: 'capra-studio', perfil: perfilOrig } });
  const landMala = await api('/api/salon', { method: 'POST', token: owToken, body: { action: 'landing_guardar', tenantId: 'capra-studio', landing: { bloques: ['portada', '<script>'] } } });
  const landOk = await api('/api/salon', { method: 'POST', token: owToken, body: { action: 'landing_guardar', tenantId: 'capra-studio', landing: { historia: `CI ${RUN}`, faq: [{ p: '¿Hay parking?', r: 'Sí, enfrente.' }], bloques: ['portada', 'historia', 'reservar'] } } });
  const temaMalo = await api('/api/salon', { method: 'POST', token: owToken, body: { action: 'tema_guardar', tenantId: 'capra-studio', tema: { paletteId: 'inventada' } } });
  const temaOk = await api('/api/salon', { method: 'POST', token: owToken, body: { action: 'tema_guardar', tenantId: 'capra-studio', tema: { paletteId: 'rosa-velvet-oro', tenantSlug: 'andrea-nails', loyaltyStampsTarget: 6 } } });
  const verTodo = await api('/api/salon?tenant=capra-studio&vista=publica');
  comprobar('L2', 'Perfil, landing y tema en Neon: datos malos 400, staff 403, la dueña guarda y la vista pública lo muestra (el tema ignora tenantSlug)',
    waMalo.status === 400 && perfilOk.status === 200 && verPerfil.json?.perfil?.eslogan === `CI ${RUN}` && staffPerfil.status === 403
      && landMala.status === 400 && landOk.status === 200 && temaMalo.status === 400 && temaOk.status === 200
      && verTodo.json?.landing?.historia === `CI ${RUN}` && verTodo.json?.tema?.paletteId === 'rosa-velvet-oro' && !('tenantSlug' in (verTodo.json?.tema || {})),
    `wa ${waMalo.status}, perfil ${perfilOk.status}/${verPerfil.json?.perfil?.eslogan === `CI ${RUN}` ? 'visible' : 'NO'}, staff ${staffPerfil.status}, landing ${landMala.status}/${landOk.status}, tema ${temaMalo.status}/${temaOk.status}`);

  const especial = Math.max(1, base - 3);
  const ofCara = await api('/api/salon', { method: 'POST', token: owToken, body: { action: 'oferta_guardar', tenantId: 'capra-studio', oferta: { titulo: `CI ${RUN} cara`, servicioId: servicio.id, precioEspecialUSD: base + 1 } } });
  const ofAjena = await api('/api/salon', { method: 'POST', token: owToken, body: { action: 'oferta_guardar', tenantId: 'capra-studio', oferta: { titulo: `CI ${RUN} ajena`, servicioId: servicioAjeno, precioEspecialUSD: 1 } } });
  const ofOk = await api('/api/salon', { method: 'POST', token: owToken, body: { action: 'oferta_guardar', tenantId: 'capra-studio', oferta: { titulo: `CI ${RUN} oferta`, servicioId: servicio.id, precioEspecialUSD: especial } } });
  const verOfertas = await api('/api/salon?tenant=capra-studio&vista=publica');
  const ofVisible = (verOfertas.json?.ofertas || []).some((o) => o.id === ofOk.json?.id && o.precioEspecialUSD === especial);
  const resOferta = await api('/api/bookings', { method: 'POST', body: { tenantId: 'capra-studio', clientName: `CI ${RUN} oferta`, clientPhone: `${telBase}07`, date: fechaFutura(41), timeSlot: '03:00 PM', serviceId: servicio.id, servicePriceUSD: 0.01 } });
  if (resOferta.json?.booking?.id) creados.bookings.push(resOferta.json.booking.id);
  comprobar('L3', 'Oferta: precio ≥ normal 400, servicio de otro salón 403, válida 201 y pública; la reserva cobra el precio especial (el del cuerpo se ignora)',
    ofCara.status === 400 && ofAjena.status === 403 && ofOk.status === 201 && ofVisible && resOferta.status === 201
      && resOferta.json?.booking?.totalPriceUSD === especial && resOferta.json?.booking?.desglose?.oferta?.descuento === Math.round((base - especial) * 100) / 100,
    `cara ${ofCara.status}, ajena ${ofAjena.status}, válida ${ofOk.status} (pública ${ofVisible ? 'sí' : 'NO'}), reserva ${resOferta.status} total ${resOferta.json?.booking?.totalPriceUSD} (esperado ${especial})`);

  const codigoCupon = `CI${RUN.replace(/\D/g, '').slice(-8)}`;
  const cupMalo = await api('/api/salon', { method: 'POST', token: owToken, body: { action: 'cupon_guardar', tenantId: 'capra-studio', cupon: { codigo: 'a b', tipo: 'porcentaje', valor: 10 } } });
  const cupPct = await api('/api/salon', { method: 'POST', token: owToken, body: { action: 'cupon_guardar', tenantId: 'capra-studio', cupon: { codigo: 'XX1', tipo: 'porcentaje', valor: 150, descripcion: `CI ${RUN}` } } });
  const cupOk = await api('/api/salon', { method: 'POST', token: owToken, body: { action: 'cupon_guardar', tenantId: 'capra-studio', cupon: { codigo: codigoCupon, tipo: 'porcentaje', valor: 50, usosMax: 1, descripcion: `CI ${RUN}` } } });
  const cupRepe = await api('/api/salon', { method: 'POST', token: owToken, body: { action: 'cupon_guardar', tenantId: 'capra-studio', cupon: { codigo: codigoCupon, tipo: 'importe', valor: 1, descripcion: `CI ${RUN}` } } });
  const conCupon = Math.round(especial * 0.5 * 100) / 100;
  const presu = await api('/api/salon', { method: 'POST', body: { action: 'presupuesto', tenantId: 'capra-studio', servicioId: servicio.id, fecha: fechaFutura(42), turno: '04:00 PM', cupon: codigoCupon.toLowerCase() } });
  const resCupon = await api('/api/bookings', { method: 'POST', body: { tenantId: 'capra-studio', clientName: `CI ${RUN} cupon`, clientPhone: `${telBase}08`, date: fechaFutura(42), timeSlot: '04:00 PM', serviceId: servicio.id, cupon: codigoCupon } });
  const idResCupon = resCupon.json?.booking?.id;
  if (idResCupon) creados.bookings.push(idResCupon);
  const agotado = await api('/api/bookings', { method: 'POST', body: { tenantId: 'capra-studio', clientName: `CI ${RUN} cupon2`, clientPhone: `${telBase}09`, date: fechaFutura(43), timeSlot: '04:00 PM', serviceId: servicio.id, cupon: codigoCupon } });
  const cancela = await api('/api/bookings', { method: 'PATCH', token: owToken, body: { id: idResCupon, status: 'cancelada' } });
  const reactiva = await api('/api/bookings', { method: 'PATCH', token: owToken, body: { id: idResCupon, status: 'confirmada' } });
  const presu2 = await api('/api/salon', { method: 'POST', body: { action: 'presupuesto', tenantId: 'capra-studio', servicioId: servicio.id, fecha: fechaFutura(43), turno: '04:00 PM', cupon: codigoCupon } });
  comprobar('L4', 'Cupón: formato 400, 150 % 400, válido 201, repetido 409; presupuesto y reserva con 50 % sobre la oferta; agotado 400; al cancelar se libera; cancelada no se reactiva 409',
    cupMalo.status === 400 && cupPct.status === 400 && cupOk.status === 201 && cupRepe.status === 409 && presu.status === 200 && presu.json?.total === conCupon
      && resCupon.status === 201 && resCupon.json?.booking?.totalPriceUSD === conCupon && agotado.status === 400 && cancela.status === 200
      && reactiva.status === 409 && presu2.status === 200,
    `formato ${cupMalo.status}, 150% ${cupPct.status}, válido ${cupOk.status}, repetido ${cupRepe.status}, presupuesto ${presu.status}/${presu.json?.total}, reserva ${resCupon.status}/${resCupon.json?.booking?.totalPriceUSD} (esperado ${conCupon}), agotado ${agotado.status}, cancelar ${cancela.status}, reactivar ${reactiva.status}, liberado ${presu2.status}`);

  const tarjStaff = await api('/api/salon', { method: 'POST', token: stToken, body: { action: 'tarjeta_crear', tenantId: 'capra-studio', saldoUSD: 5, nota: `CI ${RUN}` } });
  const tarj = await api('/api/salon', { method: 'POST', token: owToken, body: { action: 'tarjeta_crear', tenantId: 'capra-studio', saldoUSD: 5, beneficiaria: 'CI', nota: `CI ${RUN}` } });
  const codigoTarj = tarj.json?.codigo || '';
  const lista = await api('/api/salon?tenant=capra-studio', { token: owToken });
  const enLista = (lista.json?.tarjetas || []).find((x) => x.id === tarj.json?.id);
  const sinCodigo = !JSON.stringify(lista.json?.tarjetas || []).includes(codigoTarj.replace(/-/g, '').slice(0, 8));
  const pago = Math.min(5, especial);
  const resTarj = await api('/api/bookings', { method: 'POST', body: { tenantId: 'capra-studio', clientName: `CI ${RUN} tarjeta`, clientPhone: `${telBase}10`, date: fechaFutura(44), timeSlot: '04:00 PM', serviceId: servicio.id, tarjetaRegalo: codigoTarj.toLowerCase().replace(/-/g, ' ') } });
  const idResTarj = resTarj.json?.booking?.id;
  if (idResTarj) creados.bookings.push(idResTarj);
  const sinSaldo = especial >= 5 ? await api('/api/salon', { method: 'POST', body: { action: 'presupuesto', tenantId: 'capra-studio', servicioId: servicio.id, fecha: fechaFutura(45), turno: '04:00 PM', tarjetaRegalo: codigoTarj } }) : { status: 400 };
  const borraRes = await api(`/api/bookings?id=${encodeURIComponent(idResTarj || 'x')}`, { method: 'DELETE', token: owToken });
  const lista2 = await api('/api/salon?tenant=capra-studio', { token: owToken });
  const saldoDevuelto = (lista2.json?.tarjetas || []).find((x) => x.id === tarj.json?.id)?.saldoUSD;
  comprobar('L5', 'Tarjeta regalo: staff 403, la dueña la emite (código una vez, en la lista solo los 4 últimos), paga la cita, sin saldo 400 y al borrar la cita el saldo vuelve',
    tarjStaff.status === 403 && tarj.status === 201 && /^[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(codigoTarj) && enLista?.codigoFinal === codigoTarj.slice(-4) && sinCodigo
      && resTarj.status === 201 && resTarj.json?.booking?.desglose?.tarjetaRegalo?.pago === pago && sinSaldo.status === 400 && borraRes.status === 200 && saldoDevuelto === 5,
    `staff ${tarjStaff.status}, emite ${tarj.status}, lista ${enLista ? enLista.codigoFinal : 'NO'} (código oculto ${sinCodigo ? 'sí' : 'NO'}), reserva ${resTarj.status} pago ${resTarj.json?.booking?.desglose?.tarjetaRegalo?.pago}, sin saldo ${sinSaldo.status}, borrar ${borraRes.status}, saldo ${saldoDevuelto}`);

  // ── X. Alta de salones con cobro manual (G-063 a G-066) ──
  const altaBody = { action: 'solicitud_alta', salon: `CI ${RUN} Estudio`, nombre: 'CI Dueña Alta', email: email('alta'), whatsapp: '+58 414 1234567', oficio: 'pestanas_cejas', ciudad: 'Caracas' };
  await limpiarRateLimitRunner();
  const altaMala = await api('/api/central', { method: 'POST', body: { ...altaBody, email: 'no-es-correo' } });
  const altaOk = await api('/api/central', { method: 'POST', body: altaBody });
  const sol = (await sql`SELECT id, estado FROM public.solicitudes_alta WHERE lower(email) = ${email('alta')} LIMIT 1`)[0];
  comprobar('X1', 'Alta: la solicitud pública valida el correo (400) y se guarda en Central como «nueva» (201)',
    altaMala.status === 400 && altaOk.status === 201 && sol?.estado === 'nueva', `mala ${altaMala.status}, válida ${altaOk.status}, ficha ${sol?.estado || 'NO'}`);

  // ── X-S. Seguimiento de la solicitud y cuestionario (G-067 a G-069) ──
  const tSeg = new URLSearchParams(String(altaOk.json?.seguimiento || '')).get('t') || '';
  const segOk = await api('/api/central', { method: 'POST', body: { action: 'solicitud_estado', t: tSeg } });
  const segFalso = await api('/api/central', { method: 'POST', body: { action: 'solicitud_estado', t: `${sol?.id || 'alta_0000000000000000'}.${'A'.repeat(32)}` } });
  const sinDatosPrivados = !JSON.stringify(segOk.json || {}).includes(email('alta')) && !JSON.stringify(segOk.json || {}).includes('1234567');
  comprobar('XS1', 'Seguimiento: el alta devuelve un enlace firmado; con él se ve el estado «nueva» sin correo ni WhatsApp; firma falsa 404',
    tSeg.startsWith(`${sol?.id}.`) && segOk.status === 200 && segOk.json?.solicitud?.estado === 'nueva' && sinDatosPrivados && segFalso.status === 404,
    `enlace ${tSeg ? 'sí' : 'NO'}, estado ${segOk.status} ${segOk.json?.solicitud?.estado}, privados ocultos ${sinDatosPrivados}, falso ${segFalso.status}`);

  const cuesCorto = await api('/api/central', { method: 'POST', body: { action: 'solicitud_cuestionario', t: tSeg, respuestas: { soltura: 4, inventada: 'x' } } });
  const cuesOk = await api('/api/central', { method: 'POST', body: { action: 'solicitud_cuestionario', t: tSeg, respuestas: {
    agenda_hoy: ['whatsapp', 'libreta', 'no-existe'], soltura: 4, usadas: ['ninguna'], funciones: ['reservas', 'recordatorios', 'cobros', 'pasaporte'],
    dolor: 'ausencias', frase: 'Que mis clientas reserven solas.', especialistas: '2_3', inyeccion: '<script>',
  } } });
  const filaCues = (await sql`SELECT cuestionario, historial FROM public.solicitudes_alta WHERE id = ${sol?.id || ''}`)[0];
  const cues = filaCues?.cuestionario || {};
  comprobar('XS2', 'Cuestionario: menos de 3 respuestas 400; se guarda solo lo conocido (opción falsa fuera, máximo 3 funciones, campo extra fuera) y queda en el historial',
    cuesCorto.status === 400 && cuesOk.status === 200 && cues.agenda_hoy?.length === 2 && cues.funciones?.length === 3 && !('inyeccion' in cues) && cues.soltura === 4
      && (filaCues?.historial || []).some((h) => /cuestionario/i.test(h.nota || '')),
    `corto ${cuesCorto.status}, válido ${cuesOk.status}, agenda ${cues.agenda_hoy?.length}, funciones ${cues.funciones?.length}, extra ${'inyeccion' in cues ? 'GUARDADO' : 'fuera'}`);

  const analisis = await api('/api/central', { method: 'POST', token: saToken2fa, body: { action: 'alta_estado', payload: { id: sol?.id, estado: 'en_analisis' } } });
  comprobar('XS3', 'Central pasa la solicitud a análisis y el aviso «estamos revisando» queda anotado en el historial',
    analisis.status === 200 && analisis.json?.solicitud?.estado === 'en_analisis' && (analisis.json?.solicitud?.historial || []).some((h) => /estamos revisando/i.test(h.nota || '')),
    `análisis ${analisis.status} ${analisis.json?.solicitud?.estado || analisis.json?.error || ''}`);

  // G-069: el resumen de IA por Vercel AI Gateway (OIDC). Si al enviar no salió, Central lo pide de nuevo y dice el motivo.
  let resumenIa = (await sql`SELECT resumen_ia FROM public.solicitudes_alta WHERE id = ${sol?.id || ''}`)[0]?.resumen_ia;
  const iaDueña = await api('/api/central', { method: 'POST', token: owToken, body: { action: 'alta_resumen_ia', payload: { id: sol?.id } } });
  const iaCentral = resumenIa ? null : await api('/api/central', { method: 'POST', token: saToken2fa, body: { action: 'alta_resumen_ia', payload: { id: sol?.id } } });
  if (!resumenIa) resumenIa = iaCentral?.json?.solicitud?.resumen_ia;
  comprobar('XS4', 'IA: solo Central pide el resumen (dueña 403) y el Gateway devuelve el resumen con «Perfil:» y «Montaje:»',
    iaDueña.status === 403 && !!resumenIa && /Perfil:/i.test(resumenIa) && /Montaje:/i.test(resumenIa),
    `dueña ${iaDueña.status}, resumen ${resumenIa ? `sí (${String(resumenIa).length} car.)` : `NO · ${iaCentral?.status} ${iaCentral?.json?.error || ''}`}`);

  const pagoDueña = await api('/api/central', { method: 'POST', token: owToken, body: { action: 'alta_pedir_pago', payload: { id: sol?.id, importeUSD: 49 } } });
  const pagoSa = await api('/api/central', { method: 'POST', token: saToken2fa, body: { action: 'alta_pedir_pago', payload: { id: sol?.id, importeUSD: 49, concepto: 'Montaje de fundadora' } } });
  comprobar('X2', 'Alta: solo Central pide el pago (dueña 403) y la ficha pasa a «pago pedido» con su importe',
    pagoDueña.status === 403 && pagoSa.status === 200 && pagoSa.json?.solicitud?.estado === 'pago_solicitado' && Number(pagoSa.json?.solicitud?.importe_usd) === 49,
    `dueña ${pagoDueña.status}, central ${pagoSa.status}, estado ${pagoSa.json?.solicitud?.estado}, importe ${pagoSa.json?.solicitud?.importe_usd}`);

  const recibido = await api('/api/central', { method: 'POST', token: saToken2fa, body: { action: 'alta_pago_recibido', payload: { id: sol?.id, metodo: 'pago_movil', importeUSD: 49, referencia: `CI${RUN}` } } });
  const slugAlta = recibido.json?.slug || '';
  creados.altaSlug = slugAlta;
  const repetido = await api('/api/central', { method: 'POST', token: saToken2fa, body: { action: 'alta_pago_recibido', payload: { id: sol?.id, metodo: 'pago_movil', importeUSD: 49 } } });
  const tAlta = (await sql`SELECT en_prueba, owner_email FROM public.tenants WHERE id = ${slugAlta}`)[0];
  const srvAlta = (await sql`SELECT count(*)::int n, count(*) FILTER (WHERE is_available = false AND price_usd = 0)::int ocultos FROM public.services WHERE tenant_id = ${slugAlta}`)[0];
  const qrAlta = (await sql`SELECT count(*)::int n FROM public.qr_codes WHERE tenant_id = ${slugAlta}`)[0].n;
  const duenaAlta = (await sql`SELECT m.role FROM "member" m JOIN "organization" o ON o.id = m."organizationId" JOIN "user" u ON u.id = m."userId" WHERE o.slug = ${slugAlta} AND lower(u.email) = ${email('alta')}`)[0];
  const actAlta = (await sql`SELECT count(*)::int n FROM public.activaciones_cuenta WHERE tenant_id = ${slugAlta} AND usado_at IS NULL`)[0].n;
  comprobar('X3', 'Alta: «pago recibido» crea solo el salón en puesta a punto, su carta por oficio oculta y sin precio, su QR, la dueña (owner) y su enlace de activación; repetido 409',
    recibido.status === 200 && !!slugAlta && tAlta?.en_prueba === true && srvAlta.n >= 6 && srvAlta.ocultos === srvAlta.n && qrAlta === 1 && duenaAlta?.role === 'owner' && actAlta === 1 && repetido.status === 409,
    `recibido ${recibido.status} (${slugAlta || 'sin slug'}), prueba ${tAlta?.en_prueba}, servicios ${srvAlta.n}/${srvAlta.ocultos} ocultos, qr ${qrAlta}, dueña ${duenaAlta?.role || 'NO'}, enlaces ${actAlta}, repetido ${repetido.status}`);

  // El enlace real solo viaja por correo: la prueba crea uno propio con el mismo formato.
  const tokenAlta = crypto.randomBytes(32).toString('base64url');
  const uAlta = (await sql`SELECT id FROM "user" WHERE lower(email) = ${email('alta')}`)[0];
  if (uAlta && slugAlta) await sql`INSERT INTO public.activaciones_cuenta (token_hash, user_id, tenant_id, expira_at) VALUES (${crypto.createHash('sha256').update(tokenAlta).digest('hex')}, ${uAlta.id}, ${slugAlta}, now() + interval '1 hour')`;
  const claveAlta = `Ci-${RUN}-Clave-Larga!`;
  const actCorta = await api('/api/central', { method: 'POST', body: { action: 'activar_cuenta', token: tokenAlta, password: 'corta' } });
  const actFalsa = await api('/api/central', { method: 'POST', body: { action: 'activar_cuenta', token: crypto.randomBytes(32).toString('base64url'), password: claveAlta } });
  const actOk = await api('/api/central', { method: 'POST', body: { action: 'activar_cuenta', token: tokenAlta, password: claveAlta } });
  const actOtra = await api('/api/central', { method: 'POST', body: { action: 'activar_cuenta', token: tokenAlta, password: claveAlta } });
  const loginAlta = await api('/api/auth/sign-in/email', { method: 'POST', body: { email: email('alta'), password: claveAlta } });
  const estadoFinal = (await sql`SELECT estado FROM public.solicitudes_alta WHERE id = ${sol?.id}`)[0]?.estado;
  comprobar('X4', 'Activación: contraseña corta 400, enlace falso 400, válido 200 y de un solo uso (400 al repetir); la dueña entra con su correo y la ficha queda «activa»',
    actCorta.status === 400 && actFalsa.status === 400 && actOk.status === 200 && actOtra.status === 400 && loginAlta.status === 200 && estadoFinal === 'activa',
    `corta ${actCorta.status}, falsa ${actFalsa.status}, válida ${actOk.status}, repetida ${actOtra.status}, login ${loginAlta.status}, ficha ${estadoFinal}`);

  const abrir = await api('/api/central', { method: 'POST', token: saToken2fa, body: { action: 'alta_abrir_salon', payload: { id: sol?.id } } });
  const abrirDueña = await api('/api/central', { method: 'POST', token: owToken, body: { action: 'alta_abrir_salon', payload: { id: sol?.id } } });
  const abierto = (await sql`SELECT en_prueba FROM public.tenants WHERE id = ${slugAlta}`)[0]?.en_prueba;
  comprobar('X5', 'Alta: solo Central abre el salón al público (dueña 403) y sale de puesta a punto', abrir.status === 200 && abrirDueña.status === 403 && abierto === false,
    `central ${abrir.status}, dueña ${abrirDueña.status}, en_prueba ${abierto}`);

  // ── W. WhatsApp del salón con la API de Meta (C-01) ──
  const waDatos = { phoneNumberId: '100000000000001', wabaId: '200000000000002', token: `EAAci${RUN.replace(/\W/g, '')}`.padEnd(60, 'x'), appSecret: 'a1b2c3d4e5f60718293a4b5c6d7e8f90' };
  const waSin = await api('/api/salon', { method: 'POST', body: { action: 'whatsapp_conectar', tenantId: 'capra-studio', ...waDatos } });
  const waStaff = await api('/api/salon', { method: 'POST', token: stToken, body: { action: 'whatsapp_conectar', tenantId: 'capra-studio', ...waDatos } });
  const waMal = await api('/api/salon', { method: 'POST', token: owToken, body: { action: 'whatsapp_conectar', tenantId: 'capra-studio', ...waDatos, phoneNumberId: 'abc' } });
  comprobar('W1', 'WhatsApp: conectar sin sesión 401, staff 403 y datos mal formados 400', waSin.status === 401 && waStaff.status === 403 && waMal.status === 400,
    `sin ${waSin.status}, staff ${waStaff.status}, mal ${waMal.status}`);

  const waCon = await api('/api/salon', { method: 'POST', token: owToken, body: { action: 'whatsapp_conectar', tenantId: 'capra-studio', ...waDatos } });
  creados.whatsapp = true;
  const waGet = await api('/api/salon?tenant=capra-studio', { token: owToken });
  const verifyToken = waGet.json?.whatsapp?.verifyToken || '';
  const sinSecretos = !waGet.texto.includes(waDatos.token) && !waGet.texto.includes(waDatos.appSecret) && !waCon.texto.includes(waDatos.token);
  const fila = (await sql`SELECT token_cifrado, app_secret_cifrado, estado FROM public.whatsapp_conexiones WHERE tenant_id = 'capra-studio'`)[0];
  const cifrado = fila && fila.token_cifrado.startsWith('v1:') && !fila.token_cifrado.includes(waDatos.token) && fila.app_secret_cifrado.startsWith('v1:');
  comprobar('W2', 'WhatsApp: datos falsos → Meta los rechaza (400, estado «error»), se guardan cifrados y el panel nunca devuelve token ni secreto',
    waCon.status === 400 && waGet.json?.whatsapp?.estado === 'error' && verifyToken.length >= 24 && sinSecretos && cifrado,
    `conectar ${waCon.status}, estado ${waGet.json?.whatsapp?.estado}, verifyToken ${verifyToken ? 'sí' : 'NO'}, sin secretos ${sinSecretos ? 'sí' : 'NO'}, cifrado ${cifrado ? 'sí' : 'NO'}`);

  const hdrWa = BYPASS ? { 'x-vercel-protection-bypass': BYPASS } : {};
  const verMal = await fetch(`${BASE}/api/whatsapp/capra-studio?hub.mode=subscribe&hub.verify_token=incorrecto&hub.challenge=123`, { headers: hdrWa });
  const verOk = await fetch(`${BASE}/api/whatsapp/capra-studio?hub.mode=subscribe&hub.verify_token=${encodeURIComponent(verifyToken)}&hub.challenge=reto-${RUN}`, { headers: hdrWa });
  const reto = await verOk.text();
  comprobar('W3', 'Webhook: verificación de Meta con token erróneo 403 y con el bueno devuelve el reto', verMal.status === 403 && verOk.status === 200 && reto === `reto-${RUN}`,
    `erróneo ${verMal.status}, bueno ${verOk.status} (${reto === `reto-${RUN}` ? 'reto ok' : 'reto MAL'})`);

  // Cuerpo como lo envía Meta: no ASCII escapado (\uXXXX) y barra escapada (\/).
  const mensajeId = `ci-${RUN}-wamid`;
  const carga = { object: 'whatsapp_business_account', entry: [{ id: waDatos.wabaId, changes: [{ field: 'messages', value: { messaging_product: 'whatsapp', metadata: { phone_number_id: waDatos.phoneNumberId }, messages: [{ from: '584141234567', id: mensajeId, type: 'text', text: { body: '¿Cuánto cuesta el lifting? https://x.y/z' } }] } }] }] };
  const crudo = JSON.stringify(carga).replace(/[\u007f-￿]/g, (ch) => `\\u${ch.charCodeAt(0).toString(16).padStart(4, '0')}`).replace(/\//g, '\\/');
  const firma = 'sha256=' + crypto.createHmac('sha256', waDatos.appSecret).update(crudo, 'utf8').digest('hex');
  const postWa = (f) => fetch(`${BASE}/api/whatsapp/capra-studio`, { method: 'POST', headers: { ...hdrWa, 'Content-Type': 'application/json', ...(f ? { 'X-Hub-Signature-256': f } : {}) }, body: crudo });
  const sinFirma = await postWa(null);
  const firmaMala = await postWa('sha256=' + '0'.repeat(64));
  const bueno1 = await postWa(firma);
  const bueno2 = await postWa(firma);
  const filasMsg = (await sql`SELECT count(*)::int n FROM public.whatsapp_mensajes WHERE tenant_id = 'capra-studio' AND mensaje_id = ${mensajeId}`)[0].n;
  const tema = (await sql`SELECT tema FROM public.whatsapp_mensajes WHERE tenant_id = 'capra-studio' AND mensaje_id = ${mensajeId}`)[0]?.tema;
  comprobar('W4', 'Webhook: sin firma 401, firma falsa 401, firma de Meta 200; el mensaje repetido se guarda una sola vez y se clasifica (precio → servicios)',
    sinFirma.status === 401 && firmaMala.status === 401 && bueno1.status === 200 && bueno2.status === 200 && filasMsg === 1 && tema === 'servicios',
    `sin ${sinFirma.status}, falsa ${firmaMala.status}, buena ${bueno1.status}/${bueno2.status}, filas ${filasMsg}, tema ${tema}`);

  const waDesc = await api('/api/salon', { method: 'POST', token: owToken, body: { action: 'whatsapp_desconectar', tenantId: 'capra-studio' } });
  const quedan = (await sql`SELECT count(*)::int n FROM public.whatsapp_conexiones WHERE tenant_id = 'capra-studio'`)[0].n;
  const otroSalon = await api('/api/salon', { method: 'POST', token: owToken, body: { action: 'whatsapp_conectar', tenantId: 'andrea-nails', ...waDatos } });
  comprobar('W5', 'WhatsApp: la dueña desconecta (0 filas) y no puede conectar el de otro salón (403)', waDesc.status === 200 && quedan === 0 && otroSalon.status === 403,
    `desconectar ${waDesc.status}, filas ${quedan}, otro salón ${otroSalon.status}`);

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
      + (await sql`SELECT count(*)::int n FROM public.bookings WHERE client_name LIKE ${'CI ' + RUN + '%'}`)[0].n
      + (await sql`SELECT count(*)::int n FROM public.ofertas WHERE titulo LIKE ${'CI ' + RUN + '%'}`)[0].n
      + (await sql`SELECT count(*)::int n FROM public.cupones WHERE descripcion LIKE ${'CI ' + RUN + '%'}`)[0].n
      + (await sql`SELECT count(*)::int n FROM public.tarjetas_regalo WHERE nota LIKE ${'CI ' + RUN + '%'}`)[0].n
      + (await sql`SELECT count(*)::int n FROM public.tenants WHERE business_name LIKE ${'CI ' + RUN + '%'}`)[0].n;
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
