/**
 * VANESEV - Auditoría de Aislamiento Multi-Tenant (scripts/tenant-audit.cjs)
 * Inspecciona archivos en api/ buscando consultas a tablas multi-tenant que carezcan de tenant_id.
 * Ejecutar con: node scripts/tenant-audit.cjs
 */

const fs = require('fs');
const path = require('path');

const tenantTables = [
  'services',
  'bookings',
  'loyalty_cards',
  'staff_members',
  'studio_zones',
  'studio_settings',
  'gallery_slides',
  'gallery_items',
  'qr_codes'
];

const apiDir = path.join(__dirname, '..', 'api');
const files = fs.readdirSync(apiDir).filter(f => f.endsWith('.ts') || f.endsWith('.js'));

console.log('========================================================================================');
console.log('               VANESEV - AUDITORÍA ESTÁTICA DE CONSULTAS MULTI-TENANT                   ');
console.log('========================================================================================');

let missingTenantCount = 0;
const issues = [];

files.forEach(file => {
  const filePath = path.join(apiDir, file);
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');

  lines.forEach((line, idx) => {
    // Buscar sentencias SQL típicas (SELECT, UPDATE, DELETE, INSERT)
    tenantTables.forEach(table => {
      const regex = new RegExp(`(FROM|UPDATE|INTO|JOIN)\\s+(public\\.)?${table}\\b`, 'i');
      if (regex.test(line)) {
        // Mirar un bloque de 8 líneas alrededor de la consulta
        const block = lines.slice(Math.max(0, idx - 2), Math.min(lines.length, idx + 10)).join(' ');
        if (!block.includes('tenant_id') && !block.includes('tenantId')) {
          missingTenantCount++;
          issues.push({
            file: `api/${file}`,
            line: idx + 1,
            table,
            snippet: line.trim()
          });
        }
      }
    });
  });
});

console.log(`Tablas auditadas: ${tenantTables.join(', ')}`);
console.log(`Archivos examinados en api/: ${files.length}`);
console.log(`Consultas detectadas potencialmente sin tenant_id: ${missingTenantCount}`);
console.log('----------------------------------------------------------------------------------------');

if (issues.length > 0) {
  issues.forEach((iss, i) => {
    console.log(`${i + 1}. [${iss.file}:${iss.line}] Tabla: ${iss.table} -> "${iss.snippet}"`);
  });
} else {
  console.log('✅ 100% de consultas en api/ incluyen filtrado de tenant_id.');
}

console.log('========================================================================================\n');
process.exit(0);
