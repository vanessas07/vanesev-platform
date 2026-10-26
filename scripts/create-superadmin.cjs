// VANESEV Cloud Superadmin Onboarding Script
// Creates/updates the superadmin in Neon Postgres without writing secrets to git.
// Usage: SUPERADMIN_EMAIL="..." SUPERADMIN_PASSWORD="..." node scripts/create-superadmin.cjs [--production]
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { neon } = require('@neondatabase/serverless');

const RFC4648_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

function base32Encode(buffer) {
  let bits = 0;
  let value = 0;
  let output = '';
  for (let i = 0; i < buffer.length; i++) {
    value = (value << 8) | buffer[i];
    bits += 8;
    while (bits >= 5) {
      output += RFC4648_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) {
    output += RFC4648_ALPHABET[(value << (5 - bits)) & 31];
  }
  return output;
}

function generateRecoveryCodes(count = 10) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // No ambiguous chars (0, O, 1, I)
  const codes = [];
  const hashed = [];
  for (let i = 0; i < count; i++) {
    let part1 = '';
    let part2 = '';
    for (let j = 0; j < 4; j++) {
      part1 += chars[crypto.randomInt(0, chars.length)];
      part2 += chars[crypto.randomInt(0, chars.length)];
    }
    const code = `${part1}-${part2}`;
    codes.push(code);
    const hash = crypto.createHash('sha256').update(code).digest('hex');
    hashed.push({ hash, used: false, used_at: null });
  }
  return { codes, hashed };
}

function getConnectionString() {
  const isProd = process.argv.includes('--production');
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  const envPath = path.resolve(__dirname, '../.env.local');
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf8');
    const key = isProd ? 'DATABASE_URL_PRODUCTION' : 'DATABASE_URL_STAGING';
    const match = content.match(new RegExp(`${key}=["']?([^"'\\r\\n]+)`));
    if (match) return match[1];
    const defaultMatch = content.match(/DATABASE_URL=["']?([^"'\\r\\n]+)/);
    if (defaultMatch) return defaultMatch[1];
  }
  throw new Error('No database connection string found.');
}

async function main() {
  const email = process.env.SUPERADMIN_EMAIL;
  const password = process.env.SUPERADMIN_PASSWORD;

  if (!email || !password) {
    console.error('ERROR: Faltan las variables de entorno obligatorias SUPERADMIN_EMAIL o SUPERADMIN_PASSWORD.');
    console.error('Por seguridad, la contraseña NUNCA se pasa por línea de comandos (--password=).');
    console.error('Uso seguro en PowerShell:');
    console.error('  $env:SUPERADMIN_EMAIL="karc.0194@gmail.com"; $env:SUPERADMIN_PASSWORD="..."; node scripts/create-superadmin.cjs; Remove-Item Env:\\SUPERADMIN_PASSWORD');
    process.exit(1);
  }

  const connStr = getConnectionString();
  const isProd = process.argv.includes('--production');
  console.log(`Connecting to Neon [${isProd ? 'PRODUCTION' : 'STAGING'}]...`);
  const sql = neon(connStr);

  const cleanEmail = email.trim().toLowerCase();
  const salt = crypto.randomBytes(16).toString('hex');
  const passwordHash = crypto.scryptSync(password, salt, 64).toString('hex');
  const totpSecret = base32Encode(crypto.randomBytes(20));
  const { codes, hashed } = generateRecoveryCodes(10);
  const id = `superadmin-${crypto.createHash('md5').update(cleanEmail).digest('hex').slice(0, 12)}`;

  await sql`
    INSERT INTO public.system_superadmins (
      id, email, password_hash, password_salt, session_version,
      totp_secret, totp_enabled, recovery_codes, failed_attempts, updated_at
    ) VALUES (
      ${id}, ${cleanEmail}, ${passwordHash}, ${salt}, 1,
      ${totpSecret}, true, ${JSON.stringify(hashed)}, 0, NOW()
    )
    ON CONFLICT (email) DO UPDATE SET
      password_hash = EXCLUDED.password_hash,
      password_salt = EXCLUDED.password_salt,
      session_version = public.system_superadmins.session_version + 1,
      totp_secret = EXCLUDED.totp_secret,
      totp_enabled = true,
      recovery_codes = EXCLUDED.recovery_codes,
      failed_attempts = 0,
      locked_until = NULL,
      updated_at = NOW();
  `;

  console.log('================================================================');
  console.log('       VANESEV CENTRAL - SUPERADMIN ONBOARDED SUCCESSFULLY      ');
  console.log('================================================================');
  console.log(`User ID:        ${id}`);
  console.log(`Email:          ${cleanEmail}`);
  console.log(`2FA Status:     ACTIVE (TOTP RFC 6238)`);
  console.log(`TOTP Secret:    ${totpSecret}`);
  console.log(`TOTP Auth URI:  otpauth://totp/VANESEV%20Central:${encodeURIComponent(cleanEmail)}?secret=${totpSecret}&issuer=VANESEV`);
  console.log('----------------------------------------------------------------');
  console.log('RECOVERY CODES (10 SINGLE-USE CODES - STORE SAFELY OFFLINE):');
  codes.forEach((c, idx) => console.log(`  [${(idx + 1).toString().padStart(2, '0')}] ${c}`));
  console.log('================================================================');
}

main().catch(err => {
  console.error('Failed to create superadmin:', err);
  process.exit(1);
});
