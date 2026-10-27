// VANESEV Cloud Database Migration Runner
// Usage: node scripts/migrate.cjs [--production]
const fs = require('fs');
const path = require('path');
const { neon } = require('@neondatabase/serverless');

function getConnectionString() {
  const isProd = process.argv.includes('--production');
  if (process.env.DATABASE_URL) {
    return process.env.DATABASE_URL;
  }
  const envPath = path.resolve(__dirname, '../.env.local');
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf8');
    const key = isProd ? 'DATABASE_URL_PRODUCTION' : 'DATABASE_URL_STAGING';
    const match = content.match(new RegExp(`${key}=["']?([^"'\\r\\n]+)`));
    if (match) return match[1];
    const defaultMatch = content.match(/DATABASE_URL=["']?([^"'\\r\\n]+)/);
    if (defaultMatch) return defaultMatch[1];
  }
  throw new Error('No database connection string found in environment or .env.local');
}

function splitSqlStatements(sqlText) {
  // Remove full-line comments and clean up
  const lines = sqlText
    .split('\n')
    .filter(line => !line.trim().startsWith('--'))
    .join('\n');
  return lines
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0);
}

async function runMigrations() {
  const connStr = getConnectionString();
  const isProd = process.argv.includes('--production');
  console.log(`Connecting to Neon Database [${isProd ? 'PRODUCTION' : 'STAGING'}]...`);
  const sql = neon(connStr);

  // 1. Create schema_migrations table if not exists
  await sql`
    CREATE TABLE IF NOT EXISTS public.schema_migrations (
      version VARCHAR(64) PRIMARY KEY,
      applied_at TIMESTAMPTZ DEFAULT NOW()
    );
  `;

  // 2. Read applied migrations
  const appliedRows = await sql`SELECT version FROM public.schema_migrations ORDER BY version ASC;`;
  const applied = new Set(appliedRows.map(r => r.version));
  console.log(`Currently applied migrations (${applied.size}):`, Array.from(applied));

  // 3. Read migration files
  const migrationsDir = path.resolve(__dirname, '../db/migrations');
  if (!fs.existsSync(migrationsDir)) {
    console.log('No migrations directory found.');
    return;
  }

  const files = fs.readdirSync(migrationsDir)
    .filter(f => f.endsWith('.sql'))
    .sort();

  let count = 0;
  for (const file of files) {
    const version = path.basename(file, '.sql');
    if (applied.has(version)) {
      continue;
    }
    console.log(`Applying migration: ${file}...`);
    const sqlContent = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
    const statements = splitSqlStatements(sqlContent);

    for (const stmt of statements) {
      // Execute each individual statement
      await sql(stmt);
    }

    await sql`INSERT INTO public.schema_migrations (version) VALUES (${version});`;
    console.log(`✓ Migration ${version} applied successfully.`);
    count++;
  }

  if (count === 0) {
    console.log('Database is up to date. No new migrations to apply.');
  } else {
    console.log(`All ${count} pending migration(s) applied successfully.`);
  }
}

runMigrations().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
