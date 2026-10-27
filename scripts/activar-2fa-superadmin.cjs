#!/usr/bin/env node
/**
 * VANESEV · Activar el 2FA del superadmin con Google Authenticator — PASO 2 de 2
 *
 * Solo usa los endpoints OFICIALES de better-auth (el servidor genera y cifra el secreto TOTP):
 *   1. /sign-in/email               → inicia sesión con la contraseña del paso 1.
 *   2. /change-password             → cambio obligatorio (must_reset), mín. 12 caracteres.
 *   3. /two-factor/enable           → el servidor crea el secreto y los códigos de respaldo.
 *   4. Se muestra la CLAVE para Google Authenticator (una sola vez, solo en esta terminal).
 *   5. /two-factor/verify-totp      → con el código de 6 dígitos de la app: 2FA activo.
 * Después, Central exige iniciar sesión con contraseña + código de Google Authenticator.
 *
 * Uso:
 *   node scripts/activar-2fa-superadmin.cjs
 *   VANESEV_URL=https://<vista-previa>.vercel.app node scripts/activar-2fa-superadmin.cjs
 *   (para una vista previa protegida, exporta también VERCEL_AUTOMATION_BYPASS_SECRET en la sesión)
 *
 * Nada se guarda en disco ni en registros: la clave y los códigos de respaldo solo se imprimen aquí.
 * Guarda los códigos de respaldo en Doc operativos (a mano), nunca en el repositorio.
 */
const readline = require('readline');
const { Writable } = require('stream');

const BASE = (process.env.VANESEV_URL || 'https://vanesev.com').replace(/\/+$/, '');
const BYPASS = process.env.VERCEL_AUTOMATION_BYPASS_SECRET || null;

function preguntar(texto, oculta = false) {
  const salida = new Writable({
    write(chunk, enc, cb) {
      if (!salida.mudo) process.stdout.write(chunk, enc);
      cb();
    },
  });
  salida.mudo = false;
  const rl = readline.createInterface({ input: process.stdin, output: salida, terminal: true });
  return new Promise((resolve) => {
    rl.question(texto, (r) => {
      rl.close();
      if (oculta) process.stdout.write('\n');
      resolve(r.trim());
    });
    salida.mudo = oculta;
  });
}

async function llamar(ruta, cuerpo, token) {
  const headers = { 'Content-Type': 'application/json', Origin: 'https://vanesev.com' };
  if (BYPASS) headers['x-vercel-protection-bypass'] = BYPASS;
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${BASE}/api/auth${ruta}`, { method: 'POST', headers, body: JSON.stringify(cuerpo) });
  let datos = {};
  try {
    datos = await res.json();
  } catch {
    datos = {};
  }
  return { status: res.status, datos, token: res.headers.get('set-auth-token') };
}

function fallar(paso, r) {
  console.error(`[FATAL] ${paso}: HTTP ${r.status} ${r.datos?.message || r.datos?.code || ''}`.trim());
  process.exit(1);
}

async function main() {
  console.log(`VANESEV · Activar 2FA del superadmin (paso 2 de 2) — ${BASE}`);
  const email = (await preguntar('Correo del superadmin: ')).toLowerCase();
  const password = await preguntar('Contraseña actual (no se muestra): ', true);

  const login = await llamar('/sign-in/email', { email, password });
  if (login.status !== 200) fallar('Inicio de sesión', login);
  if (login.datos?.twoFactorRedirect) {
    console.error('[FATAL] Esta cuenta ya tiene el 2FA activo. Para cambiar de móvil, pide a Claude el procedimiento de recuperación.');
    process.exit(1);
  }
  let token = login.token || login.datos?.token;
  if (!token) fallar('Inicio de sesión (sin token de sesión)', login);

  const nueva = await preguntar('Nueva contraseña (mín. 12 caracteres, no se muestra): ', true);
  const repetida = await preguntar('Repite la nueva contraseña: ', true);
  if (nueva.length < 12 || nueva !== repetida || nueva === password) {
    console.error('[FATAL] La nueva contraseña debe tener 12 caracteres o más, coincidir y ser distinta de la actual.');
    process.exit(1);
  }
  const cambio = await llamar('/change-password', { currentPassword: password, newPassword: nueva, revokeOtherSessions: true }, token);
  if (cambio.status !== 200) fallar('Cambio de contraseña', cambio);
  token = cambio.token || cambio.datos?.token || token;

  const alta = await llamar('/two-factor/enable', { password: nueva }, token);
  if (alta.status !== 200 || !alta.datos?.totpURI) fallar('Alta del 2FA', alta);
  const clave = new URL(alta.datos.totpURI).searchParams.get('secret');

  console.log('\n──────── Google Authenticator ────────');
  console.log('1. Abre Google Authenticator → «+» → «Introducir clave de configuración».');
  console.log('2. Nombre de la cuenta: VANESEV Central');
  console.log(`3. Clave: ${clave.replace(/(.{4})/g, '$1 ').trim()}`);
  console.log('4. Tipo de clave: «Basada en el tiempo» → Añadir.');
  console.log('\nCódigos de respaldo (cada uno sirve una vez si pierdes el móvil; cópialos a Doc operativos):');
  for (const c of alta.datos.backupCodes || []) console.log(`   ${c}`);
  console.log('──────────────────────────────────────\n');

  for (let intento = 1; intento <= 3; intento++) {
    const codigo = await preguntar('Código de 6 dígitos que muestra la app: ');
    const verif = await llamar('/two-factor/verify-totp', { code: codigo }, token);
    if (verif.status === 200) {
      await preguntar('2FA verificado. Copia los códigos de respaldo y pulsa Enter para borrar la pantalla… ');
      console.clear();
      console.log('[OK] 2FA activo. Las demás sesiones se han cerrado.');
      console.log('Central pedirá a partir de ahora: contraseña + código de Google Authenticator.');
      return;
    }
    console.error(`Código no válido (intento ${intento} de 3). Espera al siguiente código de la app.`);
  }
  console.error('[FATAL] No se pudo verificar el código. Vuelve a ejecutar el script.');
  process.exit(1);
}

main().catch((err) => {
  console.error('[FATAL]', err?.message || 'Error desconocido');
  process.exit(1);
});
