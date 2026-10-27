#!/usr/bin/env node
/**
 * VANESEV · Alta del superadmin (karc0) — PASO 1 de 2
 *
 * Crea la cuenta con el formato de contraseña OFICIAL de better-auth 1.7 («salt:clave», scrypt
 * N=16384 r=16 p=1, 64 bytes, NFKC; @better-auth/utils/password) y deja:
 *   platform_role = 'superadmin_decisivo', must_reset = true, twoFactorEnabled = false.
 *
 * El 2FA NO se crea aquí: el secreto TOTP lo genera y lo cifra better-auth con BETTER_AUTH_SECRET.
 * Se activa en el PASO 2 con `scripts/activar-2fa-superadmin.cjs`, que usa los endpoints oficiales
 * y es compatible con Google Authenticator. Hasta entonces, Central responde 403.
 *
 * Uso (las credenciales SOLO por la entrada estándar, nunca como argumentos ni en archivos):
 *   node scripts/bootstrap-superadmin.cjs
 *   → pide el correo y la contraseña (≥ 12 caracteres, no se muestra al escribirla).
 *
 * Base de datos: SOLO la rama de staging de Neon (DATABASE_URL_STAGING, host ep-nameless-math-b838isnk).
 * Producción: la ejecuta karc0 con el APROBADO de Claude y su autorización escrita (no desde este script).
 * Si el correo ya existe, se detiene sin tocar nada.
 */
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const readline = require('readline');
const { Writable } = require('stream');
const { neon } = require('@neondatabase/serverless');

let connectionString = process.env.DATABASE_URL_STAGING;
if (!connectionString && !process.env.CI) {
  const envPath = path.join(__dirname, '..', '.env.local');
  if (fs.existsSync(envPath)) {
    const linea = fs.readFileSync(envPath, 'utf8').split(/\r?\n/).find((l) => l.startsWith('DATABASE_URL_STAGING='));
    if (linea) connectionString = linea.slice('DATABASE_URL_STAGING='.length).trim().replace(/^["']|["']$/g, '');
  }
}
if (!connectionString) {
  console.error('[FATAL] DATABASE_URL_STAGING no está definida.');
  process.exit(1);
}
if (!new URL(connectionString).hostname.includes('ep-nameless-math-b838isnk')) {
  console.error('[FATAL] Host no autorizado: este script solo trabaja contra la rama de staging de Neon.');
  process.exit(1);
}
const sql = neon(connectionString);

/** Mismo algoritmo y formato que @better-auth/utils/password (password.node.mjs). */
function hashPasswordOficial(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const key = crypto.scryptSync(password.normalize('NFKC'), salt, 64, {
    N: 16384,
    r: 16,
    p: 1,
    maxmem: 128 * 16384 * 16 * 2,
  });
  return `${salt}:${key.toString('hex')}`;
}

/** Pregunta por la terminal; con `oculta`, no se ve lo que se escribe. */
function preguntar(texto, oculta = false) {
  const silencio = new Writable({
    write(chunk, enc, cb) {
      if (!silencio.mudo) process.stdout.write(chunk, enc);
      cb();
    },
  });
  silencio.mudo = false;
  const rl = readline.createInterface({ input: process.stdin, output: silencio, terminal: true });
  return new Promise((resolve) => {
    rl.question(texto, (respuesta) => {
      rl.close();
      if (oculta) process.stdout.write('\n');
      resolve(respuesta.trim());
    });
    silencio.mudo = oculta;
  });
}

async function main() {
  console.log('VANESEV · Alta del superadmin (paso 1 de 2) — staging');
  const email = (await preguntar('Correo del superadmin: ')).toLowerCase();
  const password = await preguntar('Contraseña (mín. 12 caracteres, no se muestra): ', true);
  const repetida = await preguntar('Repite la contraseña: ', true);

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    console.error('[FATAL] Correo inválido.');
    process.exit(1);
  }
  if (password.length < 12) {
    console.error('[FATAL] La contraseña debe tener al menos 12 caracteres.');
    process.exit(1);
  }
  if (password !== repetida) {
    console.error('[FATAL] Las contraseñas no coinciden.');
    process.exit(1);
  }

  const existente = await sql`SELECT id FROM "user" WHERE LOWER(email) = ${email} LIMIT 1`;
  if (existente.length > 0) {
    console.error('[FATAL] Ya existe un usuario con ese correo. No se ha tocado nada.');
    process.exit(1);
  }

  const userId = `usr_${crypto.randomBytes(12).toString('hex')}`;
  const accountId = `acc_${crypto.randomBytes(12).toString('hex')}`;
  await sql.transaction([
    sql`
      INSERT INTO "user" (id, name, email, "emailVerified", "createdAt", "updatedAt", "twoFactorEnabled", platform_role, must_reset)
      VALUES (${userId}, 'Superadmin VANESEV', ${email}, true, NOW(), NOW(), false, 'superadmin_decisivo', true)
    `,
    sql`
      INSERT INTO "account" (id, "userId", "accountId", "providerId", password, "createdAt", "updatedAt")
      VALUES (${accountId}, ${userId}, ${userId}, 'credential', ${hashPasswordOficial(password)}, NOW(), NOW())
    `,
  ]);

  console.log('[OK] Superadmin creado: rol superadmin_decisivo, cambio de contraseña obligatorio, 2FA pendiente.');
  console.log('Siguiente paso: node scripts/activar-2fa-superadmin.cjs');
}

main().catch((err) => {
  console.error('[FATAL] Error en el alta:', err?.message || 'Error desconocido');
  process.exit(1);
});
