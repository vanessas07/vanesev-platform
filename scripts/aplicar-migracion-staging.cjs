#!/usr/bin/env node
/**
 * Aplica UNA migración de db/migrations en la rama de staging de Neon (nunca en producción).
 * Uso: node scripts/aplicar-migracion-staging.cjs db/migrations/0006_....sql
 *
 * Usa el driver HTTP de Neon: divide el archivo en sentencias (respetando los bloques $$ … $$)
 * y las ejecuta todas en una sola transacción. BEGIN/COMMIT del archivo se ignoran.
 */
const fs = require('fs');
const path = require('path');
const { neon } = require('@neondatabase/serverless');

const archivo = process.argv[2];
if (!archivo || !/^db[\\/]migrations[\\/]\d{4}_[\w-]+\.sql$/.test(archivo)) {
  console.error('[FATAL] Indica una migración: db/migrations/NNNN_nombre.sql');
  process.exit(1);
}

let url = process.env.DATABASE_URL_STAGING;
if (!url && !process.env.CI) {
  const linea = fs
    .readFileSync(path.join(__dirname, '..', '.env.local'), 'utf8')
    .split(/\r?\n/)
    .find((l) => l.startsWith('DATABASE_URL_STAGING='));
  if (linea) url = linea.slice('DATABASE_URL_STAGING='.length).trim().replace(/^["']|["']$/g, '');
}
if (!url || !new URL(url).hostname.includes('ep-nameless-math-b838isnk')) {
  console.error('[FATAL] Solo se admite la rama de staging de Neon (ep-nameless-math-b838isnk).');
  process.exit(1);
}

function dividir(texto) {
  const sentencias = [];
  let actual = '';
  let dentroDolar = false;
  for (const linea of texto.split(/\r?\n/)) {
    if (!dentroDolar && linea.trim().startsWith('--')) continue;
    actual += linea + '\n';
    const marcas = (linea.match(/\$\$/g) || []).length;
    if (marcas % 2 === 1) dentroDolar = !dentroDolar;
    if (!dentroDolar && linea.trim().endsWith(';')) {
      sentencias.push(actual.trim());
      actual = '';
    }
  }
  if (actual.trim()) sentencias.push(actual.trim());
  return sentencias.filter((s) => !/^(BEGIN|COMMIT);$/i.test(s));
}

(async () => {
  const sql = neon(url);
  const sentencias = dividir(fs.readFileSync(archivo, 'utf8'));
  await sql.transaction(sentencias.map((s) => sql(s)));
  console.log(`[OK] ${path.basename(archivo)} aplicada en staging (${sentencias.length} sentencias).`);
})().catch((err) => {
  console.error('[FATAL] La migración no se aplicó (transacción revertida):', err?.message || 'Error desconocido');
  process.exit(1);
});
