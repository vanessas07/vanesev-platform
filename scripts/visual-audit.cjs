// ==============================================================================
// VANESEV Cloud Platform - Automated Multi-Viewport Visual Audit
// Executes in GitHub Actions VM (7GB RAM). Zero local RAM burden.
// Viewports: 375px (Mobile Standard) and 1366px (Desktop Standard)
// Incluye validación estricta de Login Gate en /central y detección de recorte.
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
  let globalHasViolations = false;

  for (const vp of VIEWPORTS) {
    const context = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      deviceScaleFactor: 2,
    });
    const page = await context.newPage();
    page.on('pageerror', (err) => console.log(`[PAGE ERROR ${vp.name}]: ${err.message}`));

    for (const route of ROUTES) {
      const url = `${BASE_URL}${route.path}`;
      const fileName = `${route.slug}-${vp.width}px.png`;
      const filePath = path.join(OUTPUT_DIR, fileName);

      try {
        await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });

        // Esperar a que se resuelva lazy loading si aplica
        if (route.slug === 'central-gate') {
          try {
            await page.waitForSelector('form, input', { timeout: 10000 });
          } catch (e) {
            // Se registrará en la validación de authGateCheck
          }
        }
        await page.waitForTimeout(1000); // Wait for animations to settle

        // 1. Check document scroll horizontal overflow
        const docOverflow = await page.evaluate(() => {
          return {
            scrollWidth: document.documentElement.scrollWidth,
            clientWidth: document.documentElement.clientWidth,
            hasDocOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
          };
        });

        // 2. Check individual element bounding rect overflow (element right edge clipped past viewport)
        // Se auditan elementos interactivos y de contenido visibles (botones, inputs, titulares, párrafos, nav)
        const clippingCheck = await page.evaluate(() => {
          const viewportWidth = window.innerWidth;
          const offenders = [];
          const contentTags = ['button', 'input', 'a', 'h1', 'h2', 'h3', 'h4', 'p', 'nav', 'header', 'article', 'section'];
          const elements = Array.from(document.querySelectorAll(contentTags.join(',')));

          for (const el of elements) {
            const style = window.getComputedStyle(el);
            if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') continue;
            const rect = el.getBoundingClientRect();
            if (rect.width === 0 || rect.height === 0) continue;

            // Ignorar elementos fuera del viewport superior o inferior
            if (rect.bottom < 0 || rect.top > window.innerHeight * 2.5) continue;

            // Tolerancia de 1.5px por sub-píxeles
            if (rect.right > viewportWidth + 1.5 && rect.left < viewportWidth) {
              offenders.push({
                tag: el.tagName.toLowerCase(),
                className: (el.className || '').toString().slice(0, 40),
                right: Math.round(rect.right),
                diff: Math.round(rect.right - viewportWidth)
              });
            }
          }
          return {
            hasClipping: offenders.length > 0,
            offenders: offenders.slice(0, 3)
          };
        });

        // 3. Verificación de Login Gate en /central sin sesión
        let authGateCheck = { valid: true, note: 'N/A' };
        if (route.slug === 'central-gate') {
          authGateCheck = await page.evaluate(() => {
            const textContent = document.body.innerText || '';
            const showsDashboardLeak = textContent.includes('Alta de Nuevo Salón') || textContent.includes('2 Sedes');
            const hasFormOrLogin = textContent.includes('Contraseña') || textContent.includes('Código') || document.querySelector('input') !== null;
            if (showsDashboardLeak) {
              return { valid: false, note: '❌ Fuga: Central pintó el panel sin sesión' };
            }
            if (!hasFormOrLogin) {
              return { valid: false, note: '❌ Fallo: Central no mostró formulario de login' };
            }
            return { valid: true, note: '✅ Login Gate verificado' };
          });
        }

        const isClean = !docOverflow.hasDocOverflow && !clippingCheck.hasClipping && authGateCheck.valid;
        if (!isClean) {
          globalHasViolations = true;
        }

        await page.screenshot({ path: filePath, fullPage: false });

        let statusStr = '✅ OK (0px)';
        if (!authGateCheck.valid) {
          statusStr = authGateCheck.note;
        } else if (clippingCheck.hasClipping) {
          statusStr = `❌ RECORTE (+${clippingCheck.offenders[0].diff}px en ${clippingCheck.offenders[0].tag})`;
        } else if (docOverflow.hasDocOverflow) {
          statusStr = `❌ DESBORDE (+${docOverflow.scrollWidth - docOverflow.clientWidth}px)`;
        }

        results.push({
          route: route.name,
          viewport: `${vp.name} (${vp.width}px)`,
          status: statusStr,
          scrollDiff: docOverflow.scrollWidth - docOverflow.clientWidth,
          screenshot: fileName,
        });

        console.log(`✓ Audited ${route.slug} @ ${vp.width}px [Status: ${statusStr}]`);
      } catch (err) {
        console.error(`✗ Error capturing ${route.slug} @ ${vp.width}px:`, err.message);
        globalHasViolations = true;
        results.push({
          route: route.name,
          viewport: `${vp.name} (${vp.width}px)`,
          status: `⚠️ ERROR (${err.message.slice(0, 40)})`,
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
  md += '| Zona / Pantalla | Viewport | Estado Visual & Aislamiento | Archivo Captura |\n';
  md += '|---|---|---|---|\n';
  for (const r of results) {
    md += `| ${r.route} | ${r.viewport} | ${r.status} | \`${r.screenshot}\` |\n`;
  }

  const summaryPath = path.join(OUTPUT_DIR, 'audit-summary.md');
  fs.writeFileSync(summaryPath, md, 'utf8');
  console.log('\nAudit Summary:\n' + md);

  if (process.env.GITHUB_STEP_SUMMARY) {
    fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, md, 'utf8');
  }

  if (globalHasViolations && process.env.STRICT_AUDIT) {
    console.error('❌ Visual audit failed with violations.');
    process.exit(1);
  }
}

runAudit().catch(err => {
  console.error('Audit crashed:', err);
  process.exit(1);
});
