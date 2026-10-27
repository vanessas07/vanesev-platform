/**
 * VANESEV WCAG 2.1 Contrast Calculator
 * Fórmula oficial W3C / WCAG 2.1 de luminancia relativa y ratio de contraste.
 * Ejecutar con: node scripts/wcag-contrast.cjs
 */

function sRGBtoLinear(c) {
  const v = c / 255;
  return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
}

function getLuminance(hex) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return 0.2126 * sRGBtoLinear(r) + 0.7152 * sRGBtoLinear(g) + 0.0722 * sRGBtoLinear(b);
}

function getContrast(hex1, hex2) {
  const l1 = getLuminance(hex1);
  const l2 = getLuminance(hex2);
  const max = Math.max(l1, l2);
  const min = Math.min(l1, l2);
  return (max + 0.05) / (min + 0.05);
}

const bg = '#FBFAFC';      // --v-bg (Porcelana fría)
const surface = '#FFFFFF'; // --v-surface

const tokens = [
  { name: '--v-ink', hex: '#24152B', role: 'Texto principal (tinta ciruela)' },
  { name: '--v-brand-hover', hex: '#4A2159', role: 'Hover CTA primario' },
  { name: '--v-brand', hex: '#5B2A6E', role: 'Ciruela imperial (CTA primario)' },
  { name: '--v-danger', hex: '#B3261E', role: 'Alertas críticas / error' },
  { name: '--v-muted', hex: '#6E6478', role: 'Texto secundario / metadatos' },
  { name: '--v-ok', hex: '#1F7A5A', role: 'Éxito / confirmaciones' },
  { name: '--v-warn', hex: '#B26A00', role: 'Avisos / alertas suaves' },
  { name: '--v-platinum', hex: '#B9BCC6', role: 'Filetes platino / separadores' },
];

console.log('========================================================================================');
console.log('                VANESEV - CÁLCULO OFICIAL DE CONTRASTES WCAG 2.1                        ');
console.log('========================================================================================');
console.log('Token'.padEnd(18) + 'HEX'.padEnd(10) + 'vs #FBFAFC (Fondo)'.padEnd(24) + 'vs #FFFFFF (Superficie)'.padEnd(24) + 'Nivel WCAG');
console.log('----------------------------------------------------------------------------------------');

tokens.forEach(t => {
  const cBg = getContrast(t.hex, bg);
  const cSurf = getContrast(t.hex, surface);
  let level = 'Fallo';
  if (cBg >= 7.0) level = 'AAA (Excelente)';
  else if (cBg >= 4.5) level = 'AA (Cumple)';
  else if (cBg >= 3.0) level = 'AA Grande / UI';
  else level = 'Estructural / Filete';

  console.log(
    t.name.padEnd(18) +
    t.hex.padEnd(10) +
    (cBg.toFixed(2) + ':1').padEnd(24) +
    (cSurf.toFixed(2) + ':1').padEnd(24) +
    level
  );
});

const cWhiteOnBrand = getContrast('#FFFFFF', '#5B2A6E');
console.log('----------------------------------------------------------------------------------------');
console.log('Texto #FFFFFF sobre --v-brand (#5B2A6E): ' + cWhiteOnBrand.toFixed(2) + ':1 -> AAA (Excelente)');

console.log('\n========================================================================================');
console.log('        CAPRA STUDIO (OPCIÓN 2: ROJO LACRE & PLATINO - SAN CRISTÓBAL)                   ');
console.log('========================================================================================');
const capraLacreBg = '#FAF8F8';
const capraLacrePrimary = '#8B1E2D';
const capraLacreText = '#241215';

console.log('Primario #8B1E2D vs Fondo #FAF8F8: ' + getContrast(capraLacrePrimary, capraLacreBg).toFixed(2) + ':1 -> AAA (Excelente)');
console.log('Texto #241215 vs Fondo #FAF8F8:    ' + getContrast(capraLacreText, capraLacreBg).toFixed(2) + ':1 -> AAA (Excelente)');
console.log('Texto #FFFFFF sobre Primario #8B1E2D: ' + getContrast('#FFFFFF', capraLacrePrimary).toFixed(2) + ':1 -> AAA (Excelente)');
console.log('========================================================================================\n');
