// Universal Salon Author Theme & Brand Customization Engine for VANESEV
// Allows each salon (and Central Super-Admin) to customize color palettes, typography, layout, and photography without ever inheriting Andrea Nails' template.

export type SalonPaletteId =
  | 'rose-cashmere'
  | 'champagne-atelier'
  | 'terracotta-medspa'
  | 'botanical-spa'
  | 'velvet-mauve'
  | 'ivory-noir'
  | 'rosa-velvet-oro';

export type SalonTypographyId = 'haute-couture' | 'vogue-editorial' | 'modern-minimal';

export type SalonLayoutId = 'editorial-magazine' | 'boutique-grid' | 'minimal-menu';
export type SalonCardLayoutId = SalonLayoutId;

export interface SalonPalettePreset {
  id: SalonPaletteId;
  name: string;
  subtitle: string;
  idealSector: string;
  canvasBg: string;
  bgPrimary: string;
  surfaceBg: string;
  softSurfaceBg: string;
  heroBg: string;
  heroText: string;
  textPrimary: string;
  textSecondary: string;
  accentPrimary: string;
  primary: string;
  accentSecondary: string;
  secondary: string;
  borderSubtle: string;
  badgeBg: string;
  badgeText: string;
  gradientCss: string;
  heroGradient: string;
}

export interface SalonTypographyPreset {
  id: SalonTypographyId;
  name: string;
  subtitle: string;
  headingClass: string;
  bodyClass: string;
  headingFont: string;
  bodyFont: string;
  sampleText: string;
}

export interface SalonLayoutPreset {
  id: SalonLayoutId;
  name: string;
  subtitle: string;
}

export interface SalonThemeConfig {
  tenantSlug: string;
  businessName: string;
  salonName: string;
  tagline: string;
  subline: string;
  heroHeadline?: string;
  heroSubheadline: string;
  city: string;
  addressLine?: string;
  whatsappPhone: string;
  instagramHandle: string;
  heroImageUrl: string;
  paletteId: SalonPaletteId;
  typographyId: SalonTypographyId;
  layoutId: SalonLayoutId;
  loyaltyStampsTarget: number;
  loyaltyStampsGoal: number;
  loyaltyRewardTitle: string;
  firstVisitDiscountUSD: number;
  directorName: string;
  showVipPassport?: boolean;
  showCurrencyDual?: boolean;
}

export const SALON_PALETTE_PRESETS: SalonPalettePreset[] = [
  {
    id: 'rose-cashmere',
    name: 'Rose Cashmere & Silk',
    subtitle: 'Rosa empolvado, seda tibia y acentos champagne.',
    idealSector: 'Cejas, Pestañas, Maquillaje & Beauty Studios',
    canvasBg: '#FAF6F3',
    bgPrimary: '#FAF6F3',
    surfaceBg: '#FFFFFF',
    softSurfaceBg: '#F5ECE8',
    heroBg: '#23171B',
    heroText: '#FAF6F3',
    textPrimary: '#1E1518',
    textSecondary: '#6E585F',
    accentPrimary: '#9E475B',
    primary: '#9E475B',
    accentSecondary: '#C89B7B',
    secondary: '#C89B7B',
    borderSubtle: '#E8D8D2',
    badgeBg: '#F7E7EB',
    badgeText: '#8A384B',
    gradientCss: 'linear-gradient(135deg, #9E475B 0%, #C89B7B 100%)',
    heroGradient: 'linear-gradient(135deg, #9E475B 0%, #C89B7B 100%)',
  },
  {
    id: 'champagne-atelier',
    name: 'Champagne & Travertine',
    subtitle: 'Piedra travertino luminosa, oro suave y espresso cálido.',
    idealSector: 'Alta Peluquería, Colorimetría & Novias',
    canvasBg: '#FAF8F5',
    bgPrimary: '#FAF8F5',
    surfaceBg: '#FFFFFF',
    softSurfaceBg: '#F2ECE4',
    heroBg: '#1F1B18',
    heroText: '#FAF8F5',
    textPrimary: '#1C1917',
    textSecondary: '#6B625B',
    accentPrimary: '#B08455',
    primary: '#B08455',
    accentSecondary: '#8C6239',
    secondary: '#8C6239',
    borderSubtle: '#E5DDD3',
    badgeBg: '#F5EFE6',
    badgeText: '#8C6239',
    gradientCss: 'linear-gradient(135deg, #B08455 0%, #D4B087 100%)',
    heroGradient: 'linear-gradient(135deg, #B08455 0%, #D4B087 100%)',
  },
  {
    id: 'terracotta-medspa',
    name: 'Terracotta & Alabaster',
    subtitle: 'Alabastro clínico cálido, terracota coral y cobre.',
    idealSector: 'Clínicas Estéticas, MedSpas & Dermo-Cosmética',
    canvasBg: '#FBF8F6',
    bgPrimary: '#FBF8F6',
    surfaceBg: '#FFFFFF',
    softSurfaceBg: '#F6ECE7',
    heroBg: '#241916',
    heroText: '#FBF8F6',
    textPrimary: '#211715',
    textSecondary: '#735E59',
    accentPrimary: '#C46247',
    primary: '#C46247',
    accentSecondary: '#D99B78',
    secondary: '#D99B78',
    borderSubtle: '#EAD9D1',
    badgeBg: '#FCECE7',
    badgeText: '#A84A31',
    gradientCss: 'linear-gradient(135deg, #C46247 0%, #E08E6D 100%)',
    heroGradient: 'linear-gradient(135deg, #C46247 0%, #E08E6D 100%)',
  },
  {
    id: 'botanical-spa',
    name: 'Linen & Olive Wellness',
    subtitle: 'Lino orgánico, piedra mineral y olivo mediterráneo.',
    idealSector: 'Spas Holísticos, Masajes & Bienestar Corporal',
    canvasBg: '#F8F8F5',
    bgPrimary: '#F8F8F5',
    surfaceBg: '#FFFFFF',
    softSurfaceBg: '#EFEFE9',
    heroBg: '#1B211E',
    heroText: '#F8F8F5',
    textPrimary: '#1A201D',
    textSecondary: '#5C6660',
    accentPrimary: '#4A6B5B',
    primary: '#4A6B5B',
    accentSecondary: '#B59B72',
    secondary: '#B59B72',
    borderSubtle: '#DCE0DA',
    badgeBg: '#EBF0EC',
    badgeText: '#395447',
    gradientCss: 'linear-gradient(135deg, #4A6B5B 0%, #7A9A89 100%)',
    heroGradient: 'linear-gradient(135deg, #4A6B5B 0%, #7A9A89 100%)',
  },
  {
    id: 'velvet-mauve',
    name: 'Velvet Plum & Pearl',
    subtitle: 'Perla rosada, ciruela aterciopelada y bronce.',
    idealSector: 'Salones Integrales & Academias de Belleza',
    canvasBg: '#FAF7F9',
    bgPrimary: '#FAF7F9',
    surfaceBg: '#FFFFFF',
    softSurfaceBg: '#F2EBF0',
    heroBg: '#211620',
    heroText: '#FAF7F9',
    textPrimary: '#1F151E',
    textSecondary: '#6B5868',
    accentPrimary: '#7D3C68',
    primary: '#7D3C68',
    accentSecondary: '#C49A76',
    secondary: '#C49A76',
    borderSubtle: '#E3D6E0',
    badgeBg: '#F4E8F0',
    badgeText: '#682D54',
    gradientCss: 'linear-gradient(135deg, #7D3C68 0%, #B36A98 100%)',
    heroGradient: 'linear-gradient(135deg, #7D3C68 0%, #B36A98 100%)',
  },
  {
    id: 'ivory-noir',
    name: 'Atelier Ivory & Cognac',
    subtitle: 'Marfil arquitectónico, nogal cognac y grafito.',
    idealSector: 'Barberías de Autor & Estudios Conceptuales',
    canvasBg: '#F7F5F2',
    bgPrimary: '#F7F5F2',
    surfaceBg: '#FFFFFF',
    softSurfaceBg: '#EDE8E1',
    heroBg: '#181615',
    heroText: '#F7F5F2',
    textPrimary: '#181615',
    textSecondary: '#615B56',
    accentPrimary: '#965D36',
    primary: '#965D36',
    accentSecondary: '#292524',
    secondary: '#292524',
    borderSubtle: '#DDD6CE',
    badgeBg: '#EFE7DF',
    badgeText: '#7D4925',
    gradientCss: 'linear-gradient(135deg, #292524 0%, #965D36 100%)',
    heroGradient: 'linear-gradient(135deg, #292524 0%, #965D36 100%)',
  },
  {
    id: 'rosa-velvet-oro',
    name: 'Rosa Velvet & Oro',
    subtitle: 'Rosa empolvado, terciopelo marsala y detalles en pan de oro.',
    idealSector: 'Capra Studio, Salones Boutique & Alta Estética',
    canvasBg: '#F6ECEC',
    bgPrimary: '#F6ECEC',
    surfaceBg: '#FFFFFF',
    softSurfaceBg: '#EEDCDC',
    heroBg: '#2D1B20',
    heroText: '#F6ECEC',
    textPrimary: '#3B2228',
    textSecondary: '#6B4A52',
    accentPrimary: '#7A3E4A',
    primary: '#7A3E4A',
    accentSecondary: '#C5A059',
    secondary: '#C5A059',
    borderSubtle: '#E4CFD3',
    badgeBg: '#F5E6E8',
    badgeText: '#8A6A2E',
    gradientCss: 'linear-gradient(135deg, #7A3E4A 0%, #C5A059 100%)',
    heroGradient: 'linear-gradient(135deg, #7A3E4A 0%, #C5A059 100%)',
  },
];

export const SALON_PALETTES = SALON_PALETTE_PRESETS;

export const SALON_TYPOGRAPHY_PRESETS: SalonTypographyPreset[] = [
  {
    id: 'haute-couture',
    name: 'Haute Couture Editorial',
    subtitle: 'Fraunces Optical Serif + Plus Jakarta Sans',
    headingClass: 'font-serif',
    bodyClass: 'font-sans',
    headingFont: "'Fraunces', Georgia, serif",
    bodyFont: "'Plus Jakarta Sans', -apple-system, sans-serif",
    sampleText: 'Elegancia orgánica con curvas suaves de revista de moda.',
  },
  {
    id: 'vogue-editorial',
    name: 'Vogue Atelier Contraste',
    subtitle: 'Bodoni Moda High-Contrast + Plus Jakarta Sans',
    headingClass: 'font-vogue',
    bodyClass: 'font-sans',
    headingFont: "'Bodoni Moda', Georgia, serif",
    bodyFont: "'Plus Jakarta Sans', -apple-system, sans-serif",
    sampleText: 'Contraste arquitectónico inspirado en alta perfumería europea.',
  },
  {
    id: 'modern-minimal',
    name: 'Startup Minimalist Sans',
    subtitle: 'Plus Jakarta Sans Geométrica en Títulos y Cuerpo',
    headingClass: 'font-sans tracking-tight font-bold',
    bodyClass: 'font-sans',
    headingFont: "'Plus Jakarta Sans', -apple-system, sans-serif",
    bodyFont: "'Plus Jakarta Sans', -apple-system, sans-serif",
    sampleText: 'Claridad contemporánea, limpia y directa para clínicas y estudios modernos.',
  },
];

export const SALON_TYPOGRAPHIES = SALON_TYPOGRAPHY_PRESETS;

export const SALON_LAYOUTS: SalonLayoutPreset[] = [
  {
    id: 'editorial-magazine',
    name: 'Editorial Magazine',
    subtitle: 'Foto lateral amplia, descripción detallada y sello de especialidad.',
  },
  {
    id: 'boutique-grid',
    name: 'Boutique Grid',
    subtitle: 'Tarjetas verticales estilo vitrina de moda con imagen protagonista.',
  },
  {
    id: 'minimal-menu',
    name: 'Minimalist Menu',
    subtitle: 'Lectura rápida de salón con precios y duración alineados.',
  },
];

export const VERIFIED_BEAUTY_PHOTO_LIBRARY: Record<string, { label: string; url: string }[]> = {
  cejas_pestanas: [
    { label: 'Diseño de Cejas & Henna HD', url: '/capra/brows-henna.jpg' },
    { label: 'Brow Lamination & Botox', url: '/capra/brow-lamination.jpg' },
    { label: 'Lifting de Pestañas & Keratina', url: '/capra/lash-lifting.jpg' },
    { label: 'Extensiones de Pestañas Seda', url: '/capra/lash-extensions.jpg' },
  ],
  estilismo: [
    { label: 'Alisado Orgánico Brillo Espejo', url: '/capra/hair-straightening.jpg' },
    { label: 'Estilismo, Ondas & Colorimetría', url: '/vanesev/sector-hair-color.jpg' },
  ],
  maquillaje: [
    { label: 'Maquillaje Social & Piel Blindada', url: '/capra/makeup-blindada.jpg' },
    { label: 'Novias & Gala Luxury Package', url: '/capra/bridal-package.jpg' },
  ],
  nails: [
    { label: 'Manicura Estructural & Micro-French', url: '/capra/nails-french.jpg' },
    { label: 'Pedicure Spa Botánico', url: '/capra/pedicure-spa.jpg' },
  ],
  depilacion: [
    { label: 'Cabina Estética & MedSpa', url: '/vanesev/sector-medspa.jpg' },
  ],
  cursos: [
    { label: 'Atelier & Academia de Belleza', url: '/vanesev/hero-atelier.jpg' },
  ],
};

// Guaranteed 100% verified image resolver so NO service in Capra Studio or any new salon ever shows a wrong photo
export function resolveVerifiedBeautyImage(
  idOrObj: string | { id?: string; category?: string; name?: string; imageUrl?: string },
  categoryArg?: string,
  nameArg?: string,
  rawUrlArg?: string
): string {
  const id = typeof idOrObj === 'string' ? idOrObj : idOrObj.id || '';
  const category = typeof idOrObj === 'string' ? categoryArg || '' : idOrObj.category || '';
  const name = typeof idOrObj === 'string' ? nameArg || '' : idOrObj.name || '';
  const rawUrl = typeof idOrObj === 'string' ? rawUrlArg : idOrObj.imageUrl;

  if (rawUrl && (rawUrl.startsWith('/capra/') || rawUrl.startsWith('/vanesev/'))) {
    return rawUrl;
  }

  const lower = `${id} ${category} ${name}`.toLowerCase();

  if (id === 'capra-srv-1' || lower.includes('henna') || (lower.includes('ceja') && lower.includes('sombreado'))) {
    return '/capra/brows-henna.jpg';
  }
  if (id === 'capra-srv-2' || lower.includes('lamination') || lower.includes('laminado')) {
    return '/capra/brow-lamination.jpg';
  }
  if (id === 'capra-srv-3' || lower.includes('lifting')) {
    return '/capra/lash-lifting.jpg';
  }
  if (id === 'capra-srv-4' || lower.includes('extension') || lower.includes('rimel') || lower.includes('rímel') || lower.includes('pestaña') || lower.includes('pestana')) {
    return '/capra/lash-extensions.jpg';
  }
  if (id === 'capra-srv-5' || lower.includes('alisado') || lower.includes('progresivo') || lower.includes('espejo')) {
    return '/capra/hair-straightening.jpg';
  }
  if (id === 'capra-srv-6' || lower.includes('peinado') || lower.includes('onda') || lower.includes('secado') || lower.includes('brushing')) {
    return '/vanesev/sector-hair-color.jpg';
  }
  if (id === 'capra-srv-8' || lower.includes('reina') || lower.includes('novia') || lower.includes('paquete')) {
    return '/capra/bridal-package.jpg';
  }
  if (id === 'capra-srv-7' || lower.includes('maquillaje') || lower.includes('blindada') || lower.includes('automaq')) {
    return '/capra/makeup-blindada.jpg';
  }
  if (id === 'capra-srv-9' || lower.includes('french') || lower.includes('manicur') || lower.includes('uña') || lower.includes('una') || lower.includes('rubber')) {
    return '/capra/nails-french.jpg';
  }
  if (id === 'capra-srv-10' || lower.includes('pedi') || lower.includes('pie')) {
    return '/capra/pedicure-spa.jpg';
  }
  if (id === 'capra-srv-11' || lower.includes('depi') || lower.includes('cera') || lower.includes('corporal') || lower.includes('facial')) {
    return '/vanesev/sector-medspa.jpg';
  }
  if (id === 'capra-srv-12' || lower.includes('curso') || lower.includes('academy') || lower.includes('masterclass')) {
    return '/vanesev/hero-atelier.jpg';
  }

  return '/capra/brow-lamination.jpg';
}

const DEFAULT_CAPRA_THEME: SalonThemeConfig = {
  tenantSlug: 'capra-studio',
  businessName: 'Capra Studio',
  salonName: 'Capra Studio',
  tagline: 'Beauty Atelier & Capra Academy',
  subline:
    'Arquitectura de cejas y pestañas, alisados orgánicos con brillo espejo, maquillaje blindado HD, manicura estructural y formación certificada en San Cristóbal.',
  heroHeadline: 'Capra Studio',
  heroSubheadline:
    'Arquitectura de cejas y pestañas, alisados orgánicos con brillo espejo, maquillaje blindado HD, manicura estructural y formación certificada en San Cristóbal.',
  city: 'San Cristóbal, Táchira',
  addressLine: 'San Cristóbal, Táchira',
  whatsappPhone: '584247429530',
  instagramHandle: '@caprastudio_',
  heroImageUrl: '/vanesev/hero-atelier.jpg',
  paletteId: 'rose-cashmere',
  typographyId: 'haute-couture',
  layoutId: 'editorial-magazine',
  loyaltyStampsTarget: 5,
  loyaltyStampsGoal: 5,
  loyaltyRewardTitle: 'Tratamiento VIP de Cortesía',
  firstVisitDiscountUSD: 2,
  directorName: 'María Giovanna Capra',
  showVipPassport: true,
  showCurrencyDual: true,
};

function normalizeThemeConfig(raw: Partial<SalonThemeConfig>, slug: string): SalonThemeConfig {
  const bName = raw.businessName || raw.salonName || DEFAULT_CAPRA_THEME.businessName;
  const sub = raw.subline || raw.heroSubheadline || DEFAULT_CAPRA_THEME.subline;
  const stamps = Number(raw.loyaltyStampsTarget || raw.loyaltyStampsGoal || 5);
  return {
    ...DEFAULT_CAPRA_THEME,
    ...raw,
    tenantSlug: slug,
    businessName: bName,
    salonName: bName,
    subline: sub,
    heroSubheadline: sub,
    loyaltyStampsTarget: stamps,
    loyaltyStampsGoal: stamps,
  };
}

// Tema del salón guardado en Neon (tenants.tema, G-031): se carga una vez por salón y se guarda en
// memoria; las pantallas siguen leyendo en síncrono y se repintan con el evento «vanesev-theme-updated».
const temasEnMemoria = new Map<string, Partial<SalonThemeConfig>>();
const temasPedidos = new Set<string>();

function avisarCambioDeTema(config: SalonThemeConfig) {
  try {
    window.dispatchEvent(new CustomEvent('vanesev-theme-updated', { detail: config }));
  } catch {
    // fuera del navegador no hay a quién avisar
  }
}

/** Trae el tema del salón desde /api/salon (vista pública) y avisa a las pantallas. */
export async function cargarTemaRemoto(tenantSlug: string): Promise<SalonThemeConfig> {
  const cleanSlug = (tenantSlug || 'capra-studio').toLowerCase().trim();
  temasPedidos.add(cleanSlug);
  try {
    const res = await fetch(`/api/salon?tenant=${encodeURIComponent(cleanSlug)}&vista=publica`);
    if (res.ok) {
      const json = await res.json();
      if (json?.tema && typeof json.tema === 'object') temasEnMemoria.set(cleanSlug, json.tema);
    }
  } catch {
    // sin conexión: se queda el tema por defecto
  }
  const config = getSalonThemeConfig(cleanSlug);
  avisarCambioDeTema(config);
  return config;
}

export function getSalonThemeConfig(tenantSlug: string): SalonThemeConfig {
  const cleanSlug = (tenantSlug || 'capra-studio').toLowerCase().trim();
  if (!temasPedidos.has(cleanSlug) && typeof window !== 'undefined') void cargarTemaRemoto(cleanSlug);
  const guardado = temasEnMemoria.get(cleanSlug);
  if (guardado && Object.keys(guardado).length) {
    const base = cleanSlug === 'capra-studio' ? DEFAULT_CAPRA_THEME : {};
    return normalizeThemeConfig({ ...base, ...guardado }, cleanSlug);
  }

  if (cleanSlug === 'capra-studio') {
    return DEFAULT_CAPRA_THEME;
  }

  const prettyName = cleanSlug
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');

  return normalizeThemeConfig(
    {
      tenantSlug: cleanSlug,
      businessName: prettyName,
      salonName: prettyName,
      tagline: 'Salón de Belleza & Bienestar',
      subline:
        'Reserva tu experiencia personalizada en segundos, elige tu especialista y acumula sellos en tu pasaporte VIP digital.',
      directorName: `Equipo ${prettyName}`,
      paletteId: 'champagne-atelier',
    },
    cleanSlug
  );
}

/**
 * Guarda el tema en Neon (owner/admin del salón o superadmin). Devuelve el tema al momento para
 * que la pantalla no espere; si el servidor lo rechaza, se vuelve a cargar el guardado y se avisa.
 */
export function saveSalonThemeConfig(
  slugOrConfig: string | Partial<SalonThemeConfig>,
  maybeConfig?: Partial<SalonThemeConfig>
): SalonThemeConfig {
  const rawConfig: Partial<SalonThemeConfig> =
    typeof slugOrConfig === 'string'
      ? { ...(maybeConfig || {}), tenantSlug: slugOrConfig }
      : slugOrConfig;
  const cleanSlug = (rawConfig.tenantSlug || 'capra-studio').toLowerCase().trim();
  const existing = getSalonThemeConfig(cleanSlug);
  const merged = normalizeThemeConfig({ ...existing, ...rawConfig }, cleanSlug);
  temasEnMemoria.set(cleanSlug, merged);
  avisarCambioDeTema(merged);
  const { tenantSlug: _slug, ...tema } = merged;
  fetch('/api/salon', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'tema_guardar', tenantId: cleanSlug, tema }),
  })
    .then((res) => {
      if (!res.ok) void cargarTemaRemoto(cleanSlug);
    })
    .catch(() => void cargarTemaRemoto(cleanSlug));
  return merged;
}

export function getPaletteById(id: SalonPaletteId): SalonPalettePreset {
  return SALON_PALETTE_PRESETS.find((p) => p.id === id) || SALON_PALETTE_PRESETS[0];
}

export function getTypographyById(id: SalonTypographyId): SalonTypographyPreset {
  return SALON_TYPOGRAPHY_PRESETS.find((t) => t.id === id) || SALON_TYPOGRAPHY_PRESETS[0];
}
