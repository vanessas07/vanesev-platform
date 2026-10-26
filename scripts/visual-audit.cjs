// ==============================================================================
// VANESEV Cloud Platform - Automated Multi-Viewport Visual Audit
// Executes in GitHub Actions VM (7GB RAM). Zero local RAM burden.
// Viewports: 375px (Mobile Standard) and 1366px (Desktop Standard)
// ==============================================================================
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const BASE_URL = process.env.AUDIT_BASE_URL || 'http://localhost:4173';
const OUTPUT_DIR = path.resolve(__dirname, '../artifacts/screenshots');

const VIEWPORTS = [
  { name: 'Mobile', width: 375, height: 667 },
  { name: 'Desktop', width: 1366, height: 768 },
];

const ROUTES = [
  { slug: 'landing', path: '/', name: 'Zona 1: Web Comercial SaaS' },
  { slug: 'central-gate', path: '/central', name: 'Zona 2: Central Superadmin (Login Gate)' },
  { slug: 'pwa-capra', path: '/m/capra-studio', name: 'Zona 4: PWA Catálogo Capra Studio' },
  { slug: 'admin-andrea', path: '/andrea-nails/admin', name: 'Zona 3: Admin Salón Andrea Nails' },
];

async function runAudit() {
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  console.log(`Starting Visual Audit against ${BASE_URL}...`);
  const browser = await chromium.launch();
  const results = [];

  for (const vp of VIEWPORTS) {
    const context = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      deviceScaleFactor: 2,
    });
    const page = await context.newPage();

    for (const route of ROUTES) {
      const url = `${BASE_URL}${route.path}`;
      const fileName = `${route.slug}-${vp.width}px.png`;
      const filePath = path.join(OUTPUT_DIR, fileName);

      try {
        await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
        await page.waitForTimeout(1000); // Wait for animations to settle

        // Check horizontal overflow
        const overflow = await page.evaluate(() => {
          return {
            scrollWidth: document.documentElement.scrollWidth,
            clientWidth: document.documentElement.clientWidth,
            hasHorizontalOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
          };
        });

        await page.screenshot({ path: filePath, fullPage: false });

        results.push({
          route: route.name,
          viewport: `${vp.name} (${vp.width}px)`,
          overflow: overflow.hasHorizontalOverflow ? '❌ DESBORDE' : '✅ OK',
          scrollDiff: overflow.scrollWidth - overflow.clientWidth,
          screenshot: fileName,
        });

        console.log(`✓ Captured ${route.slug} @ ${vp.width}px [Overflow: ${overflow.hasHorizontalOverflow ? 'YES' : 'NO'}]`);
      } catch (err) {
        console.error(`✗ Error capturing ${route.slug} @ ${vp.width}px:`, err.message);
        results.push({
          route: route.name,
          viewport: `${vp.name} (${vp.width}px)`,
          overflow: '⚠️ ERROR',
          scrollDiff: 0,
          screenshot: 'N/A',
        });
      }
    }
    await context.close();
  }

  await browser.close();

  // Generate Markdown Summary
  let md = '# Reporte de Auditoría Visual Automatizada (Playwright)\n\n';
  md += '| Zona / Pantalla | Viewport | Estado Desborde Horizontal | Diferencia (px) | Archivo Captura |\n';
  md += '|---|---|---|---|---|\n';
  for (const r of results) {
    md += `| ${r.route} | ${r.viewport} | ${r.overflow} | ${r.scrollDiff > 0 ? '+' + r.scrollDiff + 'px' : '0px'} | \`${r.screenshot}\` |\n`;
  }

  const summaryPath = path.join(OUTPUT_DIR, 'audit-summary.md');
  fs.writeFileSync(summaryPath, md, 'utf8');
  console.log('\nAudit Summary:\n' + md);

  // If in GitHub Actions, append to GITHUB_STEP_SUMMARY
  if (process.env.GITHUB_STEP_SUMMARY) {
    fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, md, 'utf8');
  }
}

runAudit().catch(err => {
  console.error('Audit failed:', err);
  process.exit(1);
});
