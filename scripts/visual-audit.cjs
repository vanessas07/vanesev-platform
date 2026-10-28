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
  { slug: 'web-precios', path: '/precios', name: 'Zona 1: Precios' },
  { slug: 'web-fundadoras', path: '/fundadoras', name: 'Zona 1: Fundadoras' },
  { slug: 'web-carta', path: '/funciones/carta-y-reservas', name: 'Zona 1: Carta y reservas' },
  { slug: 'web-unas', path: '/para/unas', name: 'Zona 1: Para uñas' },
  { slug: 'web-pasaporte', path: '/funciones/pasaporte-vip', name: 'Zona 1: Pasaporte VIP' },
  { slug: 'web-equipo', path: '/funciones/equipo-y-agenda', name: 'Zona 1: Equipo y agenda' },
  { slug: 'web-ofertas', path: '/funciones/ofertas-y-tarjetas-regalo', name: 'Zona 1: Ofertas y regalos' },
  { slug: 'web-qr', path: '/funciones/qr-y-kit', name: 'Zona 1: QR y kit' },
  { slug: 'web-mirada', path: '/para/pestanas-y-cejas', name: 'Zona 1: Pestañas y cejas' },
  { slug: 'web-pelo', path: '/para/peluqueria', name: 'Zona 1: Peluquería' },
  { slug: 'web-estetica', path: '/para/estetica', name: 'Zona 1: Estética' },
  { slug: 'web-legal', path: '/legal/privacidad', name: 'Zona 1: Privacidad' },
  // G-067: /solicitud con la API simulada (vite preview no tiene funciones): recién enviada y con el cuestionario hecho.
  { slug: 'web-solicitud', path: '/solicitud?t=demo&nueva=1', name: 'Zona 1: Seguimiento de la solicitud (cuestionario)', mock: { solicitud: {
    salon: 'Estudio Ámbar', nombre: 'Valentina', oficio: 'Uñas', plan: 'Esencial', estado: 'nueva', importe: null, cuestionario: null, cuestionarioAt: null,
    fechas: { nueva: '2026-10-28T19:00:00Z', en_analisis: null, pago_solicitado: null, pago_recibido: null, activa: null },
  } } },
  { slug: 'web-solicitud-hecha', path: '/solicitud?t=demo', name: 'Zona 1: Seguimiento de la solicitud (respuestas)', mock: { solicitud: {
    salon: 'Estudio Ámbar', nombre: 'Valentina', oficio: 'Uñas', plan: 'Atelier', estado: 'pago_solicitado', importe: 49, cuestionarioAt: '2026-10-28T19:05:00Z',
    cuestionario: { agenda_hoy: ['whatsapp', 'libreta'], soltura: 4, usadas: ['booksy'], no_gusto: ['comision', 'directorio'], funciones: ['reservas', 'recordatorios', 'pasaporte'], dolor: 'ausencias', frase: 'Que mis clientas reserven solas y yo solo tenga que atenderlas.', especialistas: '2_3', citas: '20_50', modalidad: 'local', instagram: '@estudioambar' },
    fechas: { nueva: '2026-10-28T19:00:00Z', en_analisis: '2026-10-28T20:00:00Z', pago_solicitado: '2026-10-28T21:00:00Z', pago_recibido: null, activa: null },
  } } },
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
    // React captura los fallos de pintado en su pantalla de aviso: solo se ven como console.error.
    page.on('console', (msg) => {
      if (msg.type() === 'error') console.log(`[CONSOLE ERROR ${vp.name}]: ${msg.text().slice(0, 600)}`);
    });

    for (const route of ROUTES) {
      const url = `${BASE_URL}${route.path}`;
      const fileName = `${route.slug}-${vp.width}px.png`;
      const filePath = path.join(OUTPUT_DIR, fileName);

      try {
        await page.unroute('**/api/central').catch(() => {});
        if (route.mock) await page.route('**/api/central', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(route.mock) }));
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

            // Ignorar elementos dentro de un contenedor con scroll o recorte horizontal legítimo (carruseles, pills tabs con overflow-x: auto/scroll/hidden)
            let isInsideScrollContainer = false;
            let parent = el.parentElement;
            while (parent && parent !== document.body && parent !== document.documentElement) {
              const pStyle = window.getComputedStyle(parent);
              if (['auto', 'scroll', 'hidden'].includes(pStyle.overflowX) || ['auto', 'scroll', 'hidden'].includes(pStyle.overflow)) {
                isInsideScrollContainer = true;
                break;
              }
              parent = parent.parentElement;
            }
            if (isInsideScrollContainer) continue;

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

        // En la web, además, capturas de las secciones de mitad de página (scroll 3D, panel, tarjetas).
        if (route.slug === 'landing') {
          for (const [ancla, avance] of [['manifiesto', 0], ['un-dia', 0.1], ['un-dia', 0.6], ['sectores', 0.5], ['equipo', 0], ['personalizador', 0], ['comparativa', 0], ['comparativa', 0.6], ['pasaporte', 0.75], ['precios', 0], ['fundadoras', 0]]) {
            const ok = await page.evaluate(([id, k]) => {
              const el = document.getElementById(id);
              if (!el) return false;
              const y = el.getBoundingClientRect().top + window.scrollY + (el.offsetHeight - window.innerHeight) * k;
              window.scrollTo(0, Math.max(0, y));
              return true;
            }, [ancla, avance]);
            if (!ok) continue;
            await page.waitForTimeout(1600);
            await page.screenshot({ path: path.join(OUTPUT_DIR, `landing-${ancla}-${Math.round(avance * 100)}-${vp.width}px.png`), fullPage: false });
          }
          await page.evaluate(() => window.scrollTo(0, 0));
        }

        // Páginas de funciones y oficios (diseño de autor): capturas a lo largo de toda la página.
        if (/^web-(carta|unas|pasaporte|equipo|ofertas|qr|mirada|pelo|estetica|solicitud|solicitud-hecha)$/.test(route.slug)) {
          for (const k of route.slug.startsWith('web-solicitud') ? [0.35, 0.7, 1] : [0.12, 0.24, 0.36, 0.48, 0.6, 0.72]) {
            await page.evaluate((f) => window.scrollTo(0, (document.documentElement.scrollHeight - window.innerHeight) * f), k);
            await page.waitForTimeout(1400);
            await page.screenshot({ path: path.join(OUTPUT_DIR, `${route.slug}-${Math.round(k * 100)}-${vp.width}px.png`), fullPage: false });
          }
          await page.evaluate(() => window.scrollTo(0, 0));
        }

        // Una página que cae en la pantalla de error de React NO está bien, aunque no desborde.
        const pantallaDeError = await page.evaluate(() => (document.body.innerText.includes('Estamos actualizando la plataforma') || document.body.innerText.includes('Esta página no ha cargado bien')));
        if (pantallaDeError) globalHasViolations = true;

        let statusStr = '✅ OK (0px)';
        if (pantallaDeError) {
          statusStr = '❌ PANTALLA DE ERROR (la página no se pinta)';
        } else if (!authGateCheck.valid) {
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

  if (results.some((r) => r.status.includes('PANTALLA DE ERROR'))) {
    console.error('❌ Alguna página cae en la pantalla de error.');
    process.exit(1);
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
