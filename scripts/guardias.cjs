/**
 * VANESEV CI Guardias de Integridad («Grabado a Fuego»)
 * Ejecuta comprobaciones automáticas de deuda técnica y brechas de seguridad.
 * Modo actual: INFORME (Report-Only / Deuda Técnica contabilizada).
 * Ejecutar con: node scripts/guardias.cjs
 */

const { execSync } = require('child_process');

function runGrep(cmd) {
  try {
    const out = execSync(cmd, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] });
    const lines = out.trim().split('\n').filter(Boolean);
    return { count: lines.length, lines };
  } catch (err) {
    // git grep exits with 1 when 0 matches found
    return { count: 0, lines: [] };
  }
}

const guards = [
  {
    id: 'G1',
    name: "Fallback por defecto 'andrea-nails' en api/",
    cmd: "git grep -n \"'andrea-nails'\" api/",
    threshold: 0,
    scope: 'Seguridad Multi-Tenant'
  },
  {
    id: 'G2',
    name: "Exposición de err.message / stack / details en api/",
    cmd: "git grep -nE \"(err\\.message|error\\.message|err\\.stack|details:)\" api/",
    threshold: 0,
    scope: 'Fuga de Información'
  },
  {
    id: 'G3',
    name: "Consultas SELECT * en api/",
    cmd: "git grep -ni \"SELECT \\*\" api/",
    threshold: 0,
    scope: 'Lista Blanca Estricta'
  },
  {
    id: 'G4',
    name: "Cabecera Access-Control-Allow-Origin: * en api/",
    cmd: "git grep -n \"Access-Control-Allow-Origin.*\\*\" api/",
    threshold: 0,
    scope: 'CORS & Credenciales'
  },
  {
    id: 'G5',
    name: "Uso de localStorage en src/ (debe migrar a Neon)",
    cmd: "git grep -n \"localStorage\\.\" src/",
    threshold: 0,
    scope: 'Persistencia Servidor'
  },
  {
    id: 'G6',
    name: "Secretos o cadenas sensibles en texto plano (napi_, postgres:// con clave)",
    cmd: "git grep -nE \"(napi_[a-zA-Z0-9_-]{10,}|postgres:\\/\\/[^\\s:]+:[^\\s@]+@)\" api/ src/",
    threshold: 0,
    scope: 'Secret Scanning'
  },
  {
    id: 'G7',
    name: "Iconografía mágica de IA (Sparkles, Wand, Stars) en src/",
    cmd: "git grep -nE \"(Sparkles|Wand|Stars)\" src/",
    threshold: 0,
    scope: 'Diseño de Autor (D1)'
  },
  {
    id: 'G8',
    name: "Secretos sin enmascarar en reportes/ (tokens, TOTP, passwords)",
    scope: 'Enmascaramiento Evidencias',
    threshold: 0,
    blocking: true,
    check: () => {
      const fs = require('fs');
      const path = require('path');
      const dir = path.join(__dirname, '..', 'reportes');
      if (!fs.existsSync(dir)) return { count: 0, lines: [] };
      const files = fs.readdirSync(dir);
      const lines = [];
      const patterns = [
        /secret=[^*"'\s&]{4,}/i,
        /session_token=[^*"'\s&;]{7,}/i,
        /backupCodes["']?\s*:\s*\[\s*["'][^*"'\]]+["']/i,
        /password["']?\s*:\s*["'][^*"']{3,}["']/i,
      ];
      for (const file of files) {
        const full = path.join(dir, file);
        if (!fs.statSync(full).isFile()) continue;
        const content = fs.readFileSync(full, 'utf8');
        const fileLines = content.split('\n');
        fileLines.forEach((l, idx) => {
          for (const p of patterns) {
            if (p.test(l)) {
              lines.push(`${file}:${idx + 1}: ${l.trim()}`);
              break;
            }
          }
        });
      }
      return { count: lines.length, lines };
    }
  },
  {
    id: 'G9',
    name: "Respaldo inseguro de credenciales (process.env.X || 'literal')",
    scope: 'Anti-Fallback Credenciales',
    threshold: 0,
    blocking: true,
    check: () => {
      const fs = require('fs');
      const path = require('path');
      const apiDir = path.join(__dirname, '..', 'api');
      if (!fs.existsSync(apiDir)) return { count: 0, lines: [] };

      function getFiles(dir) {
        let results = [];
        const list = fs.readdirSync(dir);
        list.forEach(file => {
          const fullPath = path.join(dir, file);
          const stat = fs.statSync(fullPath);
          if (stat && stat.isDirectory()) {
            results = results.concat(getFiles(fullPath));
          } else if (file.endsWith('.ts') || file.endsWith('.js')) {
            results.push(fullPath);
          }
        });
        return results;
      }

      const files = getFiles(apiDir);
      const lines = [];
      const regex = /process\.env\.([A-Za-z0-9_]*(SECRET|KEY|EMAIL|PASSWORD|URL)[A-Za-z0-9_]*)\s*\|\|\s*['"][^'"]*['"]/i;

      for (const file of files) {
        const content = fs.readFileSync(file, 'utf8');
        const fileLines = content.split('\n');
        fileLines.forEach((l, idx) => {
          if (regex.test(l)) {
            const relPath = path.relative(path.join(__dirname, '..'), file).replace(/\\/g, '/');
            lines.push(`${relPath}:${idx + 1}: ${l.trim()}`);
          }
        });
      }
      return { count: lines.length, lines };
    }
  }
];

console.log('====================================================================================================');
console.log('                 VANESEV - INFORME DE GUARDIAS DE INTEGRIDAD CI («GRABADO A FUEGO»)                 ');
console.log('====================================================================================================');
console.log('ID'.padEnd(4) + 'Guardia'.padEnd(52) + 'Área'.padEnd(26) + 'Hallazgos'.padEnd(12) + 'Estado');
console.log('----------------------------------------------------------------------------------------------------');

let totalDebt = 0;
const results = [];

guards.forEach(g => {
  const { count, lines } = g.check ? g.check() : runGrep(g.cmd);
  totalDebt += count;
  const status = count === 0 ? '✅ LIMPIO (0)' : `⚠️ DEUDA (${count})`;
  if (g.blocking && count > 0) {
    process.exitCode = 1;
  }
  console.log(
    g.id.padEnd(4) +
    g.name.padEnd(52) +
    g.scope.padEnd(26) +
    String(count).padEnd(12) +
    status
  );
  results.push({ ...g, count, lines });
});

console.log('====================================================================================================');
console.log(`TOTAL DE COINCIDENCIAS / DEUDA TÉCNICA AUDITADA: ${totalDebt} hallazgos en modo informe.`);
console.log('====================================================================================================\n');

// Detalle resumido de los hallazgos principales
results.filter(r => r.count > 0).forEach(r => {
  console.log(`\n--- [${r.id}] ${r.name} (${r.count} hallazgos) ---`);
  r.lines.slice(0, 5).forEach(l => console.log('  ' + l));
  if (r.count > 5) {
    console.log(`  ... y ${r.count - 5} más.`);
  }
});
