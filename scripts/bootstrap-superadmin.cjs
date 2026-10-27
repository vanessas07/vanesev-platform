/**
 * VANESEV - Script de Bootstrap para Superadmin (karc0)
 * Requisitos de RESPUESTA 1300 (§4.5):
 * - Conexión estricta a Neon Staging (ep-nameless-math-b838isnk).
 * - Credenciales (correo y contraseña) suministradas exclusivamente vía stdin.
 * - Sin contraseñas ni secretos en argumentos de línea de comandos ni archivos.
 * - Registra platform_role = 'superadmin_decisivo' y must_reset = true.
 * - Exige activación de TOTP (2FA).
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { neon } = require('@neondatabase/serverless');

// 1. Obtención de conexión a Staging
let connectionString = process.env.DATABASE_URL_STAGING;
if (!process.env.CI) {
  const envPath = path.join(__dirname, '../.env.local');
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, 'utf8').split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith('DATABASE_URL_STAGING=')) {
        connectionString = trimmed.slice('DATABASE_URL_STAGING='.length).trim().replace(/^["']|["']$/g, '');
      }
    }
  }
}

if (!connectionString) {
  console.error('[FATAL] DATABASE_URL_STAGING no está definida.');
  process.exit(1);
}

try {
  const parsed = new URL(connectionString);
  if (!parsed.hostname.includes('ep-nameless-math-b838isnk')) {
    console.error(`[FATAL] Host no autorizado: "${parsed.hostname}". Se exige Neon Staging.`);
    process.exit(1);
  }
} catch (e) {
  console.error('[FATAL] Error en URL de base de datos:', e.message);
  process.exit(1);
}

const sql = neon(connectionString);

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const key = crypto.scryptSync(password.normalize('NFKC'), salt, 64, {
    N: 16384,
    r: 16,
    p: 1,
    maxmem: 128 * 16384 * 16 * 2,
  }).toString('hex');
  return `${key}:${salt}`;
}

async function bootstrap() {
  console.log('Esperando credenciales por stdin (JSON o email\\npassword)...');

  let inputData = '';
  process.stdin.setEncoding('utf8');
  for await (const chunk of process.stdin) {
    inputData += chunk;
  }

  const trimmed = inputData.trim();
  if (!trimmed) {
    console.error('[FATAL] No se recibieron datos por stdin.');
    process.exit(1);
  }

  let email = '';
  let password = '';
  let name = 'Superadmin VANESEV';

  if (trimmed.startsWith('{')) {
    try {
      const parsed = JSON.parse(trimmed);
      email = String(parsed.email || '').trim().toLowerCase();
      password = String(parsed.password || '');
      if (parsed.name) name = String(parsed.name).trim();
    } catch (err) {
      console.error('[FATAL] JSON inválido en stdin.');
      process.exit(1);
    }
  } else {
    const lines = trimmed.split('\n').map(l => l.trim()).filter(Boolean);
    if (lines.length >= 2) {
      email = lines[0].toLowerCase();
      password = lines[1];
      if (lines[2]) name = lines[2];
    }
  }

  if (!email || !password) {
    console.error('[FATAL] Se requieren email y password válidos.');
    process.exit(1);
  }

  if (password.length < 12) {
    console.error('[FATAL] La contraseña de superadmin debe tener al menos 12 caracteres.');
    process.exit(1);
  }

  const hashedPassword = hashPassword(password);
  const userId = `superadmin_${crypto.randomBytes(8).toString('hex')}`;
  const accountId = `acc_${crypto.randomBytes(8).toString('hex')}`;

  // Eliminar superadmin previo con el mismo correo si existe (idempotente)
  const existing = await sql`SELECT id FROM "user" WHERE email = ${email}`;
  if (existing.length > 0) {
    const oldId = existing[0].id;
    await sql`DELETE FROM "account" WHERE "userId" = ${oldId}`;
    await sql`DELETE FROM "member" WHERE "userId" = ${oldId}`;
    await sql`DELETE FROM "user" WHERE id = ${oldId}`;
    console.log(`[INFO] Usuario previo para ${email} sustituido.`);
  }

  // Insertar usuario superadmin con platform_role y must_reset = true
  await sql`
    INSERT INTO "user" (
      id, name, email, "emailVerified", "createdAt", "updatedAt",
      "twoFactorEnabled", platform_role, must_reset
    )
    VALUES (
      ${userId}, ${name}, ${email}, true, NOW(), NOW(),
      false, 'superadmin_decisivo', true
    )
  `;

  // Insertar cuenta credential
  await sql`
    INSERT INTO "account" (
      id, "userId", "accountId", "providerId", password, "createdAt", "updatedAt"
    )
    VALUES (
      ${accountId}, ${userId}, ${userId}, 'credential', ${hashedPassword}, NOW(), NOW()
    )
  `;

  console.log(`[EXITO] Superadmin aprovisionado correctamente.`);
  console.log(`ID: ${userId}`);
  console.log(`Email: ${email}`);
  console.log(`Rol: superadmin_decisivo`);
  console.log(`Must Reset: true`);
  console.log(`2FA requerido en primer login: SÍ`);
}

bootstrap().catch(err => {
  console.error('[FATAL] Error en bootstrap:', err.message);
  process.exit(1);
});
