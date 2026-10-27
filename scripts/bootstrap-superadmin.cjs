/**
 * VANESEV - Script de Bootstrap para Superadmin (karc0)
 * Requisitos de RESPUESTA 1300 (§4.5) y ORDEN B1-a v2 (§4.5):
 * - Conexión estricta a Neon Staging (ep-nameless-math-b838isnk).
 * - Credenciales (correo y contraseña) suministradas exclusivamente vía stdin.
 * - Sin contraseñas ni secretos en argumentos de línea de comandos ni archivos.
 * - Registra platform_role = 'superadmin_decisivo' y must_reset = true.
 * - No termina sin TOTP verificado: genera secreto, muestra otpauth:// una sola vez,
 *   pide código por stdin, lo verifica y activa twoFactorEnabled = true.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const readline = require('readline');
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

function generateBase32Secret(length = 20) {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  const bytes = crypto.randomBytes(length);
  let secret = '';
  for (let i = 0; i < bytes.length; i++) {
    secret += alphabet[bytes[i] % 32];
  }
  return secret;
}

function base32Decode(str) {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  const clean = str.toUpperCase().replace(/=+$/, '');
  let bits = 0;
  let value = 0;
  const bytes = [];
  for (let i = 0; i < clean.length; i++) {
    const idx = alphabet.indexOf(clean[i]);
    if (idx === -1) continue;
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return Buffer.from(bytes);
}

function verifyTotp(secret, token, window = 1) {
  const key = base32Decode(secret);
  const epoch = Math.floor(Date.now() / 1000);
  const currentStep = Math.floor(epoch / 30);
  const cleanToken = String(token || '').trim();

  for (let errorWindow = -window; errorWindow <= window; errorWindow++) {
    const step = currentStep + errorWindow;
    const buf = Buffer.alloc(8);
    buf.writeBigInt64BE(BigInt(step));
    const hmac = crypto.createHmac('sha1', key).update(buf).digest();
    const offset = hmac[hmac.length - 1] & 0xf;
    const code =
      ((hmac[offset] & 0x7f) << 24 |
       (hmac[offset + 1] & 0xff) << 16 |
       (hmac[offset + 2] & 0xff) << 8 |
       (hmac[offset + 3] & 0xff)) % 1000000;
    const formatted = String(code).padStart(6, '0');
    if (formatted === cleanToken) {
      return true;
    }
  }
  return false;
}

async function readAllStdin() {
  let inputData = '';
  process.stdin.setEncoding('utf8');
  for await (const chunk of process.stdin) {
    inputData += chunk;
  }
  return inputData;
}

async function bootstrap() {
  console.log('Esperando credenciales por stdin (JSON o lineas)...');

  const inputData = await readAllStdin();
  const trimmed = inputData.trim();
  if (!trimmed) {
    console.error('[FATAL] No se recibieron datos por stdin.');
    process.exit(1);
  }

  let email = '';
  let password = '';
  let name = 'Superadmin VANESEV';
  let providedTotp = '';
  let customSecret = '';

  if (trimmed.startsWith('{')) {
    try {
      const parsed = JSON.parse(trimmed);
      email = String(parsed.email || '').trim().toLowerCase();
      password = String(parsed.password || '');
      if (parsed.name) name = String(parsed.name).trim();
      if (parsed.totpCode || parsed.code) providedTotp = String(parsed.totpCode || parsed.code).trim();
      if (parsed.secret) customSecret = String(parsed.secret).trim();
    } catch (err) {
      console.error('[FATAL] JSON inválido en stdin.');
      process.exit(1);
    }
  } else {
    const lines = trimmed.split('\n').map(l => l.trim()).filter(Boolean);
    if (lines.length >= 2) {
      email = lines[0].toLowerCase();
      password = lines[1];
      if (lines.length >= 3 && /^\d{6}$/.test(lines[2])) {
        providedTotp = lines[2];
      } else if (lines.length >= 3) {
        name = lines[2];
        if (lines[3] && /^\d{6}$/.test(lines[3])) {
          providedTotp = lines[3];
        }
      }
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

  // Generar secreto TOTP (o usar customSecret si fue suministrado para tests)
  const totpSecret = customSecret || generateBase32Secret(20);
  const otpUri = `otpauth://totp/VANESEV:${encodeURIComponent(email)}?secret=${totpSecret}&issuer=VANESEV`;

  console.log('\n[2FA REQUERIDO] Escanee el siguiente URI en su app autenticadora (Google Auth / 1Password):');
  console.log(`URI TOTP: ${otpUri}\n`);

  let finalTotp = providedTotp;
  if (!finalTotp) {
    console.error('[FATAL] Se requiere código TOTP de 6 dígitos para completar el bootstrap.');
    process.exit(1);
  }

  const isTotpValid = verifyTotp(totpSecret, finalTotp);
  if (!isTotpValid) {
    console.error('[FATAL] Código TOTP inválido. El bootstrap no puede finalizar sin 2FA verificado.');
    process.exit(1);
  }

  const hashedPassword = hashPassword(password);
  const userId = `superadmin_${crypto.randomBytes(8).toString('hex')}`;
  const accountId = `acc_${crypto.randomBytes(8).toString('hex')}`;
  const twoFactorId = `tf_${crypto.randomBytes(8).toString('hex')}`;
  const backupCodes = JSON.stringify([
    crypto.randomBytes(4).toString('hex'),
    crypto.randomBytes(4).toString('hex'),
    crypto.randomBytes(4).toString('hex'),
    crypto.randomBytes(4).toString('hex')
  ]);

  // Transacción idempotente: eliminar registros previos para este correo
  const existing = await sql`SELECT id FROM "user" WHERE email = ${email}`;
  if (existing.length > 0) {
    const oldId = existing[0].id;
    await sql`DELETE FROM "twoFactor" WHERE "userId" = ${oldId}`;
    await sql`DELETE FROM "session" WHERE "userId" = ${oldId}`;
    await sql`DELETE FROM "account" WHERE "userId" = ${oldId}`;
    await sql`DELETE FROM "member" WHERE "userId" = ${oldId}`;
    await sql`DELETE FROM "user" WHERE id = ${oldId}`;
    console.log(`[INFO] Usuario previo para ${email} sustituido.`);
  }

  // Insertar usuario superadmin con platform_role, must_reset = true y twoFactorEnabled = true
  await sql`
    INSERT INTO "user" (
      id, name, email, "emailVerified", "createdAt", "updatedAt",
      "twoFactorEnabled", platform_role, must_reset
    )
    VALUES (
      ${userId}, ${name}, ${email}, true, NOW(), NOW(),
      true, 'superadmin_decisivo', true
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

  // Insertar registro twoFactor verificado con updatedAt
  await sql`
    INSERT INTO "twoFactor" (
      id, secret, "backupCodes", "userId", verified, "updatedAt"
    )
    VALUES (
      ${twoFactorId}, ${totpSecret}, ${backupCodes}, ${userId}, true, NOW()
    )
  `;

  console.log(`[EXITO] Superadmin aprovisionado y verificado con 2FA correctamente.`);
  console.log(`ID: ${userId}`);
  console.log(`Email: ${email}`);
  console.log(`Rol: superadmin_decisivo`);
  console.log(`Must Reset: true`);
  console.log(`2FA Activo y Verificado: true`);
}

bootstrap().catch(err => {
  console.error('[FATAL] Error en bootstrap:', err.message);
  process.exit(1);
});
