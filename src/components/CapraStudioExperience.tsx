import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {

  Calendar,
  Clock,
  Phone,
  Award,
  ShieldCheck,
  MapPin,
  ArrowRight,
  QrCode,
  Copy,
  Check,
  X,
  Search,
  GraduationCap,
  Palette,
  Type,
  LayoutGrid,
  CheckCircle2,
  Gift,
  Star,
} from 'lucide-react';
import { ServiceItem } from '../types';
import { QREncoder } from '../utils/qrEncoder';
import { AppStore } from '../services/store';
import {
  getSalonThemeConfig,
  saveSalonThemeConfig,
  getPaletteById,
  getTypographyById,
  SALON_PALETTE_PRESETS,
  SALON_TYPOGRAPHY_PRESETS,
  SalonThemeConfig,
  SalonLayoutId,
  resolveVerifiedBeautyImage,
} from '../utils/salonThemeEngine';

interface CapraStudioExperienceProps {
  services: ServiceItem[];
  exchangeRate: number;
  tenantSlug?: string;
  onOpenBooking: (service?: ServiceItem) => void;
  onOpenAccountModal?: () => void;
  onOpenAdmin?: () => void;
}

const CAPRA_CATEGORIES = [
  { id: 'all', label: 'Toda la Carta', code: '00' },
  { id: 'cejas_pestanas', label: 'Cejas & Pestañas', code: '01' },
  { id: 'estilismo', label: 'Estilismo & Alisados', code: '02' },
  { id: 'maquillaje', label: 'Maquillaje & Novias', code: '03' },
  { id: 'nails', label: 'Manicure & Spa Pies', code: '04' },
  { id: 'depilacion', label: 'Cabina Estética', code: '05' },
  { id: 'cursos', label: 'Capra Academy', code: '06' },
];

const matchesCategoryGroup = (serviceCategory: string, selectedTab: string): boolean => {
  if (selectedTab === 'all') return true;
  const cat = (serviceCategory || '').toLowerCase();
  if (selectedTab === 'estilismo') {
    return cat === 'estilismo' || cat === 'estilismo_alisados';
  }
  if (selectedTab === 'nails') {
    return (
      cat === 'nails' ||
      cat === 'unias' ||
      cat === 'manicure_pedicure' ||
      cat === 'manicure' ||
      cat === 'pedicure'
    );
  }
  return cat === selectedTab;
};

const getDepartmentMeta = (catId: string): { title: string; subtitle: string; code: string } => {
  switch (catId) {
    case 'cejas_pestanas':
      return {
        code: '01',
        title: 'Arquitectura de Miradas · Cejas & Pestañas',
        subtitle: 'Visagismo facial milimétrico, sombreado Glance Henna, Brow Lamination con botox, lifting y extensiones de seda.',
      };
    case 'estilismo':
      return {
        code: '02',
        title: 'Hair Couture · Alisados Orgánicos & Peinados de Gala',
        subtitle: 'Alisado progresivo efecto espejo libre de formol agresivo, ondas Hollywood y peinados de alta duración.',
      };
    case 'maquillaje':
      return {
        code: '03',
        title: 'Maquillaje Profesional & Piel Blindada HD',
        subtitle: 'Preparación dermo-cosmética luminosa resistente a clima, lágrimas y fotografía 4K para eventos y novias.',
      };
    case 'nails':
      return {
        code: '04',
        title: 'Nails Atelier & Ritual Pedicure Spa',
        subtitle: 'Manicura rusa combinada con instrumental esterilizado, sistemas estructurales French y terapia podal botánica.',
      };
    case 'depilacion':
      return {
        code: '05',
        title: 'Cabina Estética de Depilación Delicada',
        subtitle: 'Protocolo hipoalergénico de baja temperatura con loción descongestiva post-epilación para piel de seda.',
      };
    case 'cursos':
      return {
        code: '06',
        title: 'Capra Academy · Formación Profesional Certificada',
        subtitle: 'Capacitación intensiva teórico-práctica con guía impresa, materiales incluidos en mesa y certificado oficial.',
      };
    default:
      return {
        code: '00',
        title: 'Especialidades del Estudio',
        subtitle: 'Protocolos personalizados de belleza y bienestar.',
      };
  }
};

export const CapraStudioExperience: React.FC<CapraStudioExperienceProps> = ({
  services,
  exchangeRate,
  tenantSlug = 'capra-studio',
  onOpenBooking,
}) => {
  const [themeConfig, setThemeConfig] = useState<SalonThemeConfig>(() =>
    getSalonThemeConfig(tenantSlug)
  );
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showQrModal, setShowQrModal] = useState(false);
  const [showVipModal, setShowVipModal] = useState(false);
  const [showCustomizer, setShowCustomizer] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

  // VIP Loyalty Passport interactive state
  const [vipPhoneInput, setVipPhoneInput] = useState('');
  const [vipClientData, setVipClientData] = useState<{
    name: string;
    stamps: number;
    visits: number;
  } | null>(null);

  useEffect(() => {
    setThemeConfig(getSalonThemeConfig(tenantSlug));
    const handleUpdate = (e: any) => {
      if (e.detail && e.detail.tenantSlug === tenantSlug) {
        setThemeConfig(e.detail);
      } else {
        setThemeConfig(getSalonThemeConfig(tenantSlug));
      }
    };
    window.addEventListener('vanesev-theme-updated', handleUpdate);
    return () => window.removeEventListener('vanesev-theme-updated', handleUpdate);
  }, [tenantSlug]);

  const palette = getPaletteById(themeConfig.paletteId);
  const typography = getTypographyById(themeConfig.typographyId);

  const updateThemeField = <K extends keyof SalonThemeConfig>(
    key: K,
    value: SalonThemeConfig[K]
  ) => {
    const next = { ...themeConfig, [key]: value };
    setThemeConfig(next);
    saveSalonThemeConfig(next);
  };

  // Normalize all incoming services so every single item has a 100% verified beauty photo
  const normalizedServices = React.useMemo(
    () =>
      services.map((s) => ({
        ...s,
        imageUrl: resolveVerifiedBeautyImage(s.id, s.category, s.name, s.imageUrl),
      })),
    [services]
  );

  const qrSvgString = React.useMemo(() => {
    try {
      const matrix = QREncoder.generateMatrix(`https://vanesev.com/m/${tenantSlug}`);
      return QREncoder.toSVG(matrix, {
        fgColor: palette.accentPrimary,
        bgColor: '#FFFFFF',
        centerText: themeConfig.businessName.slice(0, 5).toUpperCase(),
      });
    } catch {
      return '';
    }
  }, [tenantSlug, palette.accentPrimary, themeConfig.businessName]);

  const filteredServices = normalizedServices.filter((s) => {
    const matchesCat = matchesCategoryGroup(s.category, selectedCategory);
    const matchesSearch =
      !searchQuery.trim() ||
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.shortDescription.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.tags && s.tags.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase())));
    return matchesCat && matchesSearch;
  });

  const featuredService =
    normalizedServices.find((s) => s.id === 'capra-srv-5' || s.id === 'capra-alisado-org') ||
    normalizedServices.find((s) => s.id === 'capra-srv-2' || s.id === 'capra-cejas-lam') ||
    normalizedServices[0];

  const academyCourses = normalizedServices.filter((s) => s.category === 'cursos');

  const activeSectionIds =
    selectedCategory === 'all'
      ? ['cejas_pestanas', 'estilismo', 'maquillaje', 'nails', 'depilacion', 'cursos']
      : [selectedCategory];

  const handleLookupVip = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = vipPhoneInput.replace(/\D/g, '');
    if (clean.length < 7) return;
    const cards = Object.values(AppStore.getLoyaltyCards());
    const found = cards.find((c) => (c.phone || '').replace(/\D/g, '').includes(clean.slice(-7)));
    if (found) {
      setVipClientData({
        name: found.clientName,
        stamps: found.stampsCount || 1,
        visits: found.stampsCount || 1,
      });
    } else {
      setVipClientData({
        name: 'Clienta Invitada VIP',
        stamps: 1,
        visits: 1,
      });
    }
  };

  return (
    <div
      className={`min-h-screen ${typography.bodyClass} flex flex-col pb-24 sm:pb-12 transition-colors duration-300`}
      style={{
        backgroundColor: palette.canvasBg,
        color: palette.textPrimary,
      }}
    >
      {/* ══ 1. FLOATING LUMINOUS LUXURY TOP NAVIGATION (VERTIX / HAUTE COUTURE INSPIRED) ══ */}
      <div className="sticky top-0 z-40 px-3 sm:px-6 pt-3 pb-2 pointer-events-none">
        <div
          className="max-w-6xl mx-auto rounded-full px-4 sm:px-6 py-2.5 flex items-center justify-between gap-3 shadow-pill border backdrop-blur-xl pointer-events-auto transition-all"
          style={{
            backgroundColor: 'rgba(255, 255, 255, 0.90)',
            borderColor: palette.borderSubtle,
          }}
        >
          {/* Studio Brand Identity */}
          <div className="flex items-center gap-3 min-w-0">
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center text-white ${typography.headingClass} text-base font-bold shadow-xs shrink-0`}
              style={{ background: palette.gradientCss }}
            >
              {themeConfig.businessName
                .split(' ')
                .map((w) => w[0])
                .join('')
                .slice(0, 2)
                .toUpperCase()}
            </div>
            <div className="truncate min-w-0 max-w-[130px] sm:max-w-none">
              <div className="flex items-center gap-2">
                <span
                  className={`${typography.headingClass} text-base sm:text-lg font-semibold tracking-tight truncate`}
                  style={{ color: palette.textPrimary }}
                >
                  {themeConfig.businessName}
                </span>
                <span
                  className="hidden md:inline-block px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider"
                  style={{
                    backgroundColor: palette.badgeBg,
                    color: palette.badgeText,
                  }}
                >
                  {themeConfig.instagramHandle}
                </span>
              </div>
              <p className="text-[11px] truncate" style={{ color: palette.textSecondary }}>
                {themeConfig.city} · Tasa BCV: Bs. {exchangeRate.toFixed(2)}
              </p>
            </div>
          </div>

          {/* Action Pills */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">

            <button
              onClick={() => setShowQrModal(true)}
              className="hidden sm:flex px-3 py-2 rounded-full text-xs font-semibold items-center gap-1.5 transition-all cursor-pointer border hover:scale-[1.02]"
              style={{
                backgroundColor: '#FFFFFF',
                color: palette.textPrimary,
                borderColor: palette.borderSubtle,
              }}
              title="Código QR Oficial del Estudio"
            >
              <QrCode className="w-3.5 h-3.5" style={{ color: palette.accentPrimary }} />
              <span className="hidden md:inline">QR Salón</span>
            </button>

            <button
              onClick={() => setShowVipModal(true)}
              className="px-3.5 py-2 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer border hover:scale-[1.02]"
              style={{
                backgroundColor: palette.badgeBg,
                color: palette.badgeText,
                borderColor: palette.borderSubtle,
              }}
            >
              <Award className="w-3.5 h-3.5" strokeWidth={1.5} />
              <span className="hidden sm:inline">Pasaporte VIP</span>
              <span className="sm:hidden">VIP</span>
            </button>

            <button
              onClick={() => onOpenBooking()}
              className="px-3 sm:px-5 py-2 rounded-full text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm hover:opacity-95 transition-all cursor-pointer shrink-0"
              style={{ backgroundColor: palette.accentPrimary }}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Reservar</span>
            </button>
          </div>
        </div>
      </div>

      {/* ══ 2. LUMINOUS HAUTE-COUTURE HERO SHOWCASE (NO MASSIVE BLACK, WARM EDITORIAL LUXURY) ══ */}
      <header className="max-w-6xl mx-auto w-full px-4 sm:px-6 pt-4 pb-6">
        <div
          className="rounded-[32px] p-6 sm:p-10 lg:p-12 border relative overflow-hidden shadow-soft"
          style={{
            backgroundColor: palette.softSurfaceBg,
            borderColor: palette.borderSubtle,
          }}
        >
          {/* Soft silk radial glow */}
          <div
            className="absolute -top-24 -right-24 w-96 h-96 rounded-full pointer-events-none opacity-45 blur-3xl"
            style={{ background: palette.gradientCss }}
          />

          <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="lg:col-span-7 space-y-5"
            >
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/85 border shadow-2xs" style={{ borderColor: palette.borderSubtle }}>
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: palette.accentPrimary }}
                />
                <span
                  className="text-[11px] font-semibold uppercase tracking-[0.16em]"
                  style={{ color: palette.accentPrimary }}
                >
                  BY {themeConfig.directorName.toUpperCase()} · {themeConfig.tagline.toUpperCase()}
                </span>
              </div>

              <h1
                className={`${typography.headingClass} text-3xl sm:text-5xl lg:text-[54px] leading-[1.06] tracking-tight`}
                style={{ color: palette.textPrimary }}
              >
                {themeConfig.businessName}:{' '}
                <span className="italic font-normal" style={{ color: palette.accentPrimary }}>
                  excelencia estética y bienestar a tu medida.
                </span>
              </h1>

              <p
                className="text-sm sm:text-base leading-relaxed max-w-xl"
                style={{ color: palette.textSecondary }}
              >
                {themeConfig.subline}
              </p>

              {/* Interactive Action & Trust Row */}
              <div className="pt-1 flex flex-wrap items-center gap-3">
                <motion.button
                  whileHover={{ y: -2 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => onOpenBooking()}
                  className="px-6 py-3.5 rounded-full text-white font-semibold text-xs sm:text-sm flex items-center gap-2 shadow-md cursor-pointer"
                  style={{ background: palette.gradientCss }}
                >
                  <Calendar className="w-4 h-4" />
                  <span>Agendar cita en 15 segundos</span>
                </motion.button>

                <a
                  href={`https://wa.me/${themeConfig.whatsappPhone}?text=${encodeURIComponent(
                    `Hola ${themeConfig.businessName}, deseo consultar disponibilidad para una cita.`
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-5 py-3.5 rounded-full bg-white hover:bg-white/90 text-xs sm:text-sm font-semibold flex items-center gap-2 border shadow-2xs transition-all"
                  style={{
                    color: palette.textPrimary,
                    borderColor: palette.borderSubtle,
                  }}
                >
                  <Phone className="w-3.5 h-3.5" style={{ color: palette.accentPrimary }} />
                  <span>Atención Directa WhatsApp</span>
                </a>
              </div>

              {/* Micro-metrics row */}
              <div className="pt-2 grid grid-cols-3 gap-3 max-w-lg tabular-nums">
                <div className="bg-white/80 backdrop-blur-xs rounded-2xl p-3 border" style={{ borderColor: palette.borderSubtle }}>
                  <span className="text-xs font-bold block" style={{ color: palette.accentPrimary }}>
                    ★★★★★ 4.9
                  </span>
                  <span className="text-[11px]" style={{ color: palette.textSecondary }}>
                    Calificación verificada
                  </span>
                </div>
                <div className="bg-white/80 backdrop-blur-xs rounded-2xl p-3 border" style={{ borderColor: palette.borderSubtle }}>
                  <span className="text-xs font-bold block" style={{ color: palette.textPrimary }}>
                    {themeConfig.loyaltyStampsTarget} Visitas VIP
                  </span>
                  <span className="text-[11px] truncate block" style={{ color: palette.textSecondary }}>
                    {themeConfig.loyaltyRewardTitle}
                  </span>
                </div>
                <div className="bg-white/80 backdrop-blur-xs rounded-2xl p-3 border" style={{ borderColor: palette.borderSubtle }}>
                  <span className="text-xs font-bold block" style={{ color: palette.textPrimary }}>
                    Bs. {exchangeRate.toFixed(2)}
                  </span>
                  <span className="text-[11px]" style={{ color: palette.textSecondary }}>
                    Tasa Oficial BCV
                  </span>
                </div>
              </div>
            </motion.div>

            {/* Right Editorial Showcase & Loyalty Card Preview */}
            <motion.div
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.55, delay: 0.1 }}
              className="lg:col-span-5"
            >
              <div
                className="relative rounded-3xl overflow-hidden border bg-white shadow-luxury"
                style={{ borderColor: palette.borderSubtle }}
              >
                <img
                  src="/capra/brow-lamination.jpg"
                  alt={themeConfig.businessName}
                  className="w-full h-64 sm:h-72 object-cover object-center"
                />
                <div className="p-4 sm:p-5 bg-white flex items-center justify-between gap-3">
                  <div>
                    <span
                      className="text-[10px] font-bold uppercase tracking-widest block"
                      style={{ color: palette.accentPrimary }}
                    >
                      PASAPORTE DE FIDELIDAD ACTIVO
                    </span>
                    <p className="text-xs sm:text-sm font-semibold mt-0.5" style={{ color: palette.textPrimary }}>
                      Completa {themeConfig.loyaltyStampsTarget} sellos = {themeConfig.loyaltyRewardTitle}
                    </p>
                  </div>
                  <button
                    onClick={() => setShowVipModal(true)}
                    className="px-3.5 py-2 rounded-xl text-white text-xs font-semibold shrink-0 cursor-pointer"
                    style={{ backgroundColor: palette.accentPrimary }}
                  >
                    Mis Sellos
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </header>

      {/* ══ 3. RECOMENDACIÓN ESTRELLA DE LA DIRECTORA ══ */}
      {featuredService && (
        <section className="max-w-6xl mx-auto w-full px-4 sm:px-6 pb-4">
          <motion.div
            whileHover={{ y: -2 }}
            className="rounded-3xl bg-white border p-4 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-card"
            style={{ borderColor: palette.borderSubtle }}
          >
            <div className="flex items-center gap-4">
              <img
                src={featuredService.imageUrl}
                alt={featuredService.name}
                className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl object-cover border shrink-0"
                style={{ borderColor: palette.borderSubtle }}
              />
              <div>
                <div
                  className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider mb-1"
                  style={{
                    backgroundColor: palette.badgeBg,
                    color: palette.badgeText,
                  }}
                >
                  <Award className="w-3 h-3" strokeWidth={1.5} />
                  <span>RECOMENDACIÓN DE LA DIRECTORA · TRATAMIENTO ESTRELLA</span>
                </div>
                <h2
                  className={`${typography.headingClass} text-lg sm:text-2xl leading-snug`}
                  style={{ color: palette.textPrimary }}
                >
                  {featuredService.name}
                </h2>
                <p className="text-xs sm:text-sm line-clamp-2 mt-0.5" style={{ color: palette.textSecondary }}>
                  {featuredService.shortDescription}
                </p>
              </div>
            </div>

            <div
              className="flex items-center justify-between sm:justify-end w-full sm:w-auto gap-4 pt-3 sm:pt-0 border-t sm:border-t-0 shrink-0 tabular-nums"
              style={{ borderColor: palette.borderSubtle }}
            >
              <div className="text-left sm:text-right">
                <span className="text-xl font-bold block leading-none" style={{ color: palette.textPrimary }}>
                  ${featuredService.priceUSD} USD
                </span>
                <span className="text-[11px] font-mono mt-1 block" style={{ color: palette.textSecondary }}>
                  Bs. {(featuredService.priceUSD * exchangeRate).toFixed(2)} · {featuredService.durationMinutes} min
                </span>
              </div>
              <button
                onClick={() => onOpenBooking(featuredService)}
                className="px-5 py-3 rounded-2xl text-white text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
                style={{ backgroundColor: palette.accentPrimary }}
              >
                <span>Reservar</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </motion.div>
        </section>
      )}

      {/* ══ 4. BARRA DE ESPECIALIDADES + BUSCADOR + SELECTOR DE VISTA ══ */}
      <div
        className="sticky top-[68px] z-30 backdrop-blur-md border-y py-3 px-4 sm:px-6"
        style={{
          backgroundColor: `${palette.canvasBg}EE`,
          borderColor: palette.borderSubtle,
        }}
      >
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Category Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1 md:pb-0">
            {CAPRA_CATEGORIES.map((cat) => {
              const active = selectedCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className="px-3.5 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 border"
                  style={
                    active
                      ? {
                          backgroundColor: palette.accentPrimary,
                          color: '#FFFFFF',
                          borderColor: palette.accentPrimary,
                        }
                      : {
                          backgroundColor: '#FFFFFF',
                          color: palette.textSecondary,
                          borderColor: palette.borderSubtle,
                        }
                  }
                >
                  <span className="font-mono text-[10px] opacity-75">{cat.code}</span>
                  <span>{cat.label}</span>
                </button>
              );
            })}
          </div>

          {/* Search & Layout Switcher */}
          <div className="flex items-center gap-2 shrink-0">
            <div className="relative flex-1 md:w-60">
              <Search
                className="w-3.5 h-3.5 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
                style={{ color: palette.accentPrimary }}
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar tratamiento o curso..."
                className="w-full pl-9 pr-8 py-2 rounded-full bg-white border text-xs focus:outline-none"
                style={{
                  borderColor: palette.borderSubtle,
                  color: palette.textPrimary,
                }}
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer"
                  style={{ color: palette.textSecondary }}
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ══ 5. CATÁLOGO DE ESPECIALIDADES (CON FOTOGRAFÍA 100% VERIFICADA Y 3 MODOS DE LAYOUT) ══ */}
      <main className="max-w-6xl mx-auto w-full px-4 sm:px-6 py-8 space-y-12 flex-1">
        {filteredServices.length === 0 ? (
          <div
            className="bg-white rounded-3xl p-10 text-center border"
            style={{ borderColor: palette.borderSubtle }}
          >
            <p className={`${typography.headingClass} text-xl mb-1`} style={{ color: palette.textPrimary }}>
              No encontramos servicios con "{searchQuery}"
            </p>
            <p className="text-xs mb-4" style={{ color: palette.textSecondary }}>
              Explora todas las especialidades de {themeConfig.businessName}.
            </p>
            <button
              onClick={() => {
                setSelectedCategory('all');
                setSearchQuery('');
              }}
              className="px-5 py-2.5 rounded-full text-white text-xs font-semibold cursor-pointer"
              style={{ backgroundColor: palette.accentPrimary }}
            >
              Ver toda la carta
            </button>
          </div>
        ) : (
          activeSectionIds.map((secId) => {
            const sectionItems = filteredServices.filter((s) =>
              matchesCategoryGroup(s.category, secId)
            );
            if (sectionItems.length === 0) return null;
            const dept = getDepartmentMeta(secId);

            return (
              <section key={secId} className="space-y-5">
                {/* Department Header */}
                <div
                  className="flex flex-col sm:flex-row sm:items-end justify-between gap-2 pb-3 border-b"
                  style={{ borderColor: palette.borderSubtle }}
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span
                        className="font-mono text-xs font-bold"
                        style={{ color: palette.accentPrimary }}
                      >
                        /{dept.code}
                      </span>
                      <span
                        className="font-mono text-[10px] uppercase tracking-[0.18em]"
                        style={{ color: palette.textSecondary }}
                      >
                        DEPARTAMENTO ESPECIALIZADO
                      </span>
                    </div>
                    <h3
                      className={`${typography.headingClass} text-2xl sm:text-3xl mt-0.5`}
                      style={{ color: palette.textPrimary }}
                    >
                      {dept.title}
                    </h3>
                  </div>
                  <p className="text-xs max-w-md" style={{ color: palette.textSecondary }}>
                    {dept.subtitle}
                  </p>
                </div>

                {/* Cards Grid — Adapts to themeConfig.layoutId */}
                <div
                  className={
                    themeConfig.layoutId === 'boutique-grid'
                      ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5'
                      : 'grid grid-cols-1 md:grid-cols-2 gap-5'
                  }
                >
                  {sectionItems.map((svc, idx) => {
                    const priceBs = (svc.priceUSD * exchangeRate).toFixed(2);
                    const isCourse = svc.category === 'cursos';

                    if (themeConfig.layoutId === 'minimal-menu') {
                      return (
                        <motion.article
                          key={svc.id}
                          whileHover={{ y: -3 }}
                          className="bg-white rounded-2xl p-4 sm:p-5 border shadow-2xs flex items-center gap-4 justify-between transition-all"
                          style={{ borderColor: palette.borderSubtle }}
                        >
                          <img
                            src={svc.imageUrl}
                            alt={svc.name}
                            loading="lazy"
                            className="w-20 h-20 rounded-2xl object-cover shrink-0 border"
                            style={{ borderColor: palette.borderSubtle }}
                          />
                          <div className="flex-1 min-w-0">
                            <span
                              className="font-mono text-[10px] font-semibold"
                              style={{ color: palette.accentPrimary }}
                            >
                              {dept.code}.{String(idx + 1).padStart(2, '0')} · {svc.durationMinutes} min
                            </span>
                            <h4
                              className={`${typography.headingClass} text-base sm:text-lg leading-snug truncate`}
                              style={{ color: palette.textPrimary }}
                            >
                              {svc.name}
                            </h4>
                            <p
                              className="text-xs line-clamp-2 mt-0.5"
                              style={{ color: palette.textSecondary }}
                            >
                              {svc.shortDescription}
                            </p>
                          </div>
                          <div className="text-right shrink-0 space-y-2 tabular-nums">
                            <div>
                              <span
                                className="text-base font-bold block"
                                style={{ color: palette.textPrimary }}
                              >
                                ${svc.priceUSD} USD
                              </span>
                              <span
                                className="text-[10px] font-mono block"
                                style={{ color: palette.textSecondary }}
                              >
                                Bs. {priceBs}
                              </span>
                            </div>
                            <button
                              onClick={() => onOpenBooking(svc)}
                              className="px-3.5 py-1.5 rounded-xl text-white text-xs font-semibold cursor-pointer"
                              style={{ backgroundColor: palette.accentPrimary }}
                            >
                              Reservar
                            </button>
                          </div>
                        </motion.article>
                      );
                    }

                    const isVerticalCard = themeConfig.layoutId === 'boutique-grid';

                    return (
                      <motion.article
                        key={svc.id}
                        whileHover={{ y: -4 }}
                        transition={{ type: 'spring', stiffness: 300, damping: 24 }}
                        className={`group bg-white rounded-3xl border overflow-hidden shadow-card hover:shadow-luxury transition-all flex ${
                          isVerticalCard ? 'flex-col' : 'flex-col sm:flex-row'
                        }`}
                        style={{ borderColor: palette.borderSubtle }}
                      >
                        {/* Verified Beauty Image Container */}
                        <div
                          className={`${
                            isVerticalCard ? 'w-full h-52' : 'w-full sm:w-48 h-52 sm:h-auto'
                          } relative overflow-hidden shrink-0`}
                          style={{ backgroundColor: palette.softSurfaceBg }}
                        >
                          <img
                            src={svc.imageUrl}
                            alt={svc.name}
                            loading="lazy"
                            onError={(e) => {
                              (e.currentTarget as HTMLImageElement).src = '/capra/brow-lamination.jpg';
                            }}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          />

                          {/* Top badge */}
                          <span
                            className="absolute top-3 left-3 px-2.5 py-1 rounded-full text-[10px] font-semibold uppercase tracking-wider text-white shadow-xs"
                            style={{
                              backgroundColor: isCourse
                                ? palette.accentSecondary
                                : palette.accentPrimary,
                            }}
                          >
                            {svc.badgeText || (isCourse ? 'Capra Academy' : 'Signature')}
                          </span>

                          {/* Duration pill */}
                          <span className="absolute bottom-3 left-3 px-2.5 py-1 rounded-full bg-black/70 backdrop-blur-xs text-white text-[10px] font-mono flex items-center gap-1 tabular-nums">
                            <Clock className="w-3 h-3 text-amber-200" />
                            {svc.durationMinutes} min
                          </span>
                        </div>

                        {/* Card Content — Safe padding so price never clips on mobile */}
                        <div className="p-5 flex-1 flex flex-col justify-between">
                          <div>
                            <div className="flex items-start justify-between gap-3 mb-2">
                              <span
                                className="font-mono text-[11px] font-semibold px-2 py-0.5 rounded-md"
                                style={{
                                  backgroundColor: palette.badgeBg,
                                  color: palette.badgeText,
                                }}
                              >
                                {dept.code}.{String(idx + 1).padStart(2, '0')}
                              </span>
                              <div className="text-right tabular-nums shrink-0">
                                <span
                                  className="text-lg sm:text-xl font-bold block leading-none"
                                  style={{ color: palette.textPrimary }}
                                >
                                  ${svc.priceUSD} USD
                                </span>
                                <span
                                  className="block text-[10px] font-mono mt-1"
                                  style={{ color: palette.textSecondary }}
                                >
                                  Bs. {priceBs}
                                </span>
                              </div>
                            </div>

                            <h4
                              className={`${typography.headingClass} text-lg sm:text-xl leading-snug mb-1.5`}
                              style={{ color: palette.textPrimary }}
                            >
                              {svc.name}
                            </h4>

                            <p
                              className="text-xs leading-relaxed mb-4"
                              style={{ color: palette.textSecondary }}
                            >
                              {svc.fullDescription || svc.shortDescription}
                            </p>
                          </div>

                          <div
                            className="pt-3 border-t flex items-center justify-between gap-3"
                            style={{ borderColor: palette.borderSubtle }}
                          >
                            <span
                              className="text-[11px] truncate"
                              style={{ color: palette.textSecondary }}
                            >
                              {svc.idealFor}
                            </span>

                            <button
                              onClick={() => onOpenBooking(svc)}
                              className="px-4 py-2.5 rounded-xl text-white text-xs font-semibold flex items-center gap-1.5 shadow-2xs hover:opacity-95 transition-all cursor-pointer shrink-0"
                              style={{
                                backgroundColor: isCourse
                                  ? palette.accentSecondary
                                  : palette.accentPrimary,
                              }}
                            >
                              <span>{isCourse ? 'Inscribirme' : 'Reservar'}</span>
                              <ArrowRight className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </motion.article>
                    );
                  })}
                </div>
              </section>
            );
          })
        )}

        {/* ══ 6. SECCIÓN ESPECIAL: CAPRA ACADEMY (FORMACIÓN PRESENCIAL CERTIFICADA) ══ */}
        {academyCourses.length > 0 && selectedCategory !== 'cursos' && (
          <section
            className="rounded-[32px] p-6 sm:p-10 border relative overflow-hidden shadow-soft"
            style={{
              backgroundColor: palette.softSurfaceBg,
              borderColor: palette.borderSubtle,
            }}
          >
            <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
              <div className="lg:col-span-6 space-y-4">
                <div
                  className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white border text-[10px] font-mono uppercase tracking-[0.18em] font-semibold"
                  style={{
                    borderColor: palette.borderSubtle,
                    color: palette.accentPrimary,
                  }}
                >
                  <GraduationCap className="w-3.5 h-3.5" />
                  <span>CAPRA ACADEMY · FORMACIÓN PROFESIONAL</span>
                </div>
                <h3
                  className={`${typography.headingClass} text-3xl sm:text-4xl leading-tight`}
                  style={{ color: palette.textPrimary }}
                >
                  Capacitación presencial certificada por {themeConfig.directorName}.
                </h3>
                <p
                  className="text-xs sm:text-sm leading-relaxed"
                  style={{ color: palette.textSecondary }}
                >
                  Domina las técnicas exactas de nuestro estudio con práctica en modelo real, materiales incluidos en mesa, guía impresa y certificado avalado.
                </p>
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div className="p-3.5 rounded-2xl bg-white border" style={{ borderColor: palette.borderSubtle }}>
                    <span className="font-mono text-[10px] uppercase block" style={{ color: palette.accentPrimary }}>
                      MODALIDAD
                    </span>
                    <span className="text-xs font-semibold" style={{ color: palette.textPrimary }}>
                      Grupos VIP Reducidos (Práctica Real)
                    </span>
                  </div>
                  <div className="p-3.5 rounded-2xl bg-white border" style={{ borderColor: palette.borderSubtle }}>
                    <span className="font-mono text-[10px] uppercase block" style={{ color: palette.accentPrimary }}>
                      INSCRIPCIÓN
                    </span>
                    <span className="text-xs font-semibold" style={{ color: palette.textPrimary }}>
                      Reserva tu cupo con el 50%
                    </span>
                  </div>
                </div>
              </div>

              <div className="lg:col-span-6 grid grid-cols-1 gap-3.5">
                {academyCourses.map((course) => (
                  <div
                    key={course.id}
                    className="p-4 sm:p-5 rounded-2xl bg-white border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-2xs"
                    style={{ borderColor: palette.borderSubtle }}
                  >
                    <div className="flex items-center gap-3.5">
                      <img
                        src={course.imageUrl}
                        alt={course.name}
                        className="w-16 h-16 rounded-xl object-cover shrink-0 border"
                        style={{ borderColor: palette.borderSubtle }}
                      />
                      <div>
                        <span
                          className="text-[10px] font-mono uppercase tracking-widest font-semibold block"
                          style={{ color: palette.accentPrimary }}
                        >
                          CERTIFICACIÓN · {course.durationMinutes / 60} HORAS
                        </span>
                        <h4
                          className={`${typography.headingClass} text-base sm:text-lg mt-0.5`}
                          style={{ color: palette.textPrimary }}
                        >
                          {course.name}
                        </h4>
                        <p className="text-xs mt-0.5 line-clamp-1" style={{ color: palette.textSecondary }}>
                          {course.shortDescription}
                        </p>
                      </div>
                    </div>
                    <div className="flex sm:flex-col items-center sm:items-end justify-between w-full sm:w-auto gap-2 shrink-0 tabular-nums">
                      <span className="text-lg font-bold" style={{ color: palette.textPrimary }}>
                        ${course.priceUSD} USD
                      </span>
                      <button
                        onClick={() => onOpenBooking(course)}
                        className="px-4 py-2 rounded-xl text-white font-semibold text-xs cursor-pointer whitespace-nowrap"
                        style={{ backgroundColor: palette.accentPrimary }}
                      >
                        Apartar Cupo
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* ══ 7. GARANTÍA, UBICACIÓN Y MÉTODOS DE PAGO ══ */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-5 pt-2">
          <div
            className="bg-white rounded-3xl p-5 border space-y-2 shadow-2xs"
            style={{ borderColor: palette.borderSubtle }}
          >
            <div
              className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-wider font-semibold"
              style={{ color: palette.accentPrimary }}
            >
              <MapPin className="w-4 h-4" />
              <span>01 · Ubicación &amp; Horario</span>
            </div>
            <h4 className={`${typography.headingClass} text-lg`} style={{ color: palette.textPrimary }}>
              {themeConfig.city}
            </h4>
            <p className="text-xs leading-relaxed" style={{ color: palette.textSecondary }}>
              Atención personalizada de Lunes a Sábado de 8:30 AM a 6:30 PM bajo cita previa. Ambiente climatizado y confort VIP.
            </p>
          </div>

          <div
            className="bg-white rounded-3xl p-5 border space-y-2 shadow-2xs"
            style={{ borderColor: palette.borderSubtle }}
          >
            <div
              className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-wider font-semibold"
              style={{ color: palette.accentPrimary }}
            >
              <ShieldCheck className="w-4 h-4" />
              <span>02 · Reserva Garantizada</span>
            </div>
            <h4 className={`${typography.headingClass} text-lg`} style={{ color: palette.textPrimary }}>
              Puntualidad &amp; Cuidado
            </h4>
            <p className="text-xs leading-relaxed" style={{ color: palette.textSecondary }}>
              Tu turno queda bloqueado exclusivamente para ti con la especialista seleccionada. Tolerancia de 15 minutos entre citas.
            </p>
          </div>

          <div
            className="bg-white rounded-3xl p-5 border space-y-2 shadow-2xs"
            style={{ borderColor: palette.borderSubtle }}
          >
            <div
              className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-wider font-semibold"
              style={{ color: palette.accentPrimary }}
            >
              <Award className="w-4 h-4" />
              <span>03 · Facilidades de Pago</span>
            </div>
            <h4 className={`${typography.headingClass} text-lg`} style={{ color: palette.textPrimary }}>
              Multi-Divisa sin Fricción
            </h4>
            <p className="text-xs leading-relaxed tabular-nums" style={{ color: palette.textSecondary }}>
              Efectivo (USD / COP), Zelle, Binance Pay (USDT) y Pago Móvil a tasa oficial BCV del día (Bs. {exchangeRate.toFixed(2)}).
            </p>
          </div>
        </section>
      </main>

      {/* ══ FOOTER LUMÍNICO DE AUTOR ══ */}
      <footer
        className="bg-white border-t py-8 px-4 sm:px-8 text-xs"
        style={{ borderColor: palette.borderSubtle, color: palette.textSecondary }}
      >
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div
              className={`w-8 h-8 rounded-full text-white ${typography.headingClass} flex items-center justify-center text-xs font-bold`}
              style={{ background: palette.gradientCss }}
            >
              {themeConfig.businessName[0]}
            </div>
            <div>
              <p className="font-semibold" style={{ color: palette.textPrimary }}>
                {themeConfig.businessName} · {themeConfig.tagline}
              </p>
              <p className="text-[11px]">{themeConfig.city}</p>
            </div>
          </div>
          <div className="flex items-center gap-4 text-[11px]">
            <button
              onClick={() => setShowVipModal(true)}
              className="hover:underline font-semibold cursor-pointer"
              style={{ color: palette.accentPrimary }}
            >
              Pasaporte VIP
            </button>
            <span>·</span>
            <a
              href="/"
              className="hover:underline font-mono uppercase tracking-wider font-semibold"
              style={{ color: palette.textPrimary }}
            >
              Experiencia impulsada por VANESEV
            </a>
          </div>
        </div>
      </footer>

      {/* ══ BARRA FLOTANTE INFERIOR EN MÓVIL (LUMINOUS GLASS CAPSULE) ══ */}
      <div
        className="fixed bottom-0 inset-x-0 z-40 sm:hidden bg-white/95 backdrop-blur-xl border-t px-4 pt-2.5 pb-[max(12px,env(safe-area-inset-bottom))] flex items-center justify-between gap-2 shadow-luxury"
        style={{ borderColor: palette.borderSubtle }}
      >
        <button
          onClick={() => setShowVipModal(true)}
          className="px-3 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer border"
          style={{
            backgroundColor: palette.badgeBg,
            color: palette.badgeText,
            borderColor: palette.borderSubtle,
          }}
        >
          <Award className="w-3.5 h-3.5" strokeWidth={1.5} />
          <span>Sellos VIP</span>
        </button>

        <a
          href={`https://wa.me/${themeConfig.whatsappPhone}`}
          target="_blank"
          rel="noopener noreferrer"
          className="px-3 py-2.5 rounded-xl bg-white text-xs font-semibold flex items-center gap-1.5 border"
          style={{
            color: palette.textPrimary,
            borderColor: palette.borderSubtle,
          }}
        >
          <Phone className="w-3.5 h-3.5" style={{ color: palette.accentPrimary }} />
          <span>WhatsApp</span>
        </a>

        <button
          onClick={() => onOpenBooking()}
          className="flex-1 py-2.5 px-4 rounded-xl text-white text-xs font-semibold flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
          style={{ backgroundColor: palette.accentPrimary }}
        >
          <Calendar className="w-3.5 h-3.5" />
          <span>Reservar Cita</span>
        </button>
      </div>

      {/* ══ MODAL PASAPORTE VIP PROPIO DEL SALÓN (VERTIX REWARDS CARD INSPIRED — ZERO ANDREA NAILS) ══ */}
      <AnimatePresence>
        {showVipModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4"
            onClick={() => setShowVipModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, y: 12 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 12 }}
              className="bg-white rounded-[32px] max-w-lg w-full p-6 sm:p-7 shadow-2xl border relative overflow-hidden"
              style={{ borderColor: palette.borderSubtle }}
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => setShowVipModal(false)}
                className="absolute top-5 right-5 w-8 h-8 rounded-full bg-black/5 hover:bg-black/10 flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>

              <span
                className="text-[10px] font-mono uppercase tracking-[0.2em] font-bold block mb-1"
                style={{ color: palette.accentPrimary }}
              >
                PROGRAMA DE RECOMPENSAS · {themeConfig.businessName.toUpperCase()}
              </span>
              <h3 className={`${typography.headingClass} text-2xl sm:text-3xl mb-4`} style={{ color: palette.textPrimary }}>
                Pasaporte de Fidelidad VIP
              </h3>

              {/* Luminous Gradient Loyalty Card (Inspired by Vertix Rewards Card in User Reference) */}
              <div
                className="rounded-3xl p-6 text-white shadow-lg mb-6 relative overflow-hidden"
                style={{ background: palette.gradientCss }}
              >
                <div className="flex items-center justify-between text-xs opacity-90 mb-4">
                  <span className="px-2.5 py-1 rounded-full bg-white/20 backdrop-blur-xs font-semibold flex items-center gap-1.5">
                    <Star className="w-3.5 h-3.5 fill-current" />
                    <span>Miembro Privé</span>
                  </span>
                  <span className="font-mono text-[11px]">{themeConfig.businessName}</span>
                </div>

                <div className="tabular-nums mb-4">
                  <span className="text-4xl font-bold tracking-tight">
                    {vipClientData ? vipClientData.stamps : 1} / {themeConfig.loyaltyStampsTarget}
                  </span>
                  <span className="text-sm ml-2 opacity-90">sellos verificados</span>
                </div>

                {/* Stamp circles progress */}
                <div className="grid grid-cols-5 gap-2 mb-4">
                  {Array.from({ length: themeConfig.loyaltyStampsTarget }).map((_, idx) => {
                    const earned = idx < (vipClientData ? vipClientData.stamps : 1);
                    return (
                      <div
                        key={idx}
                        className={`h-11 rounded-2xl flex items-center justify-center font-mono text-xs font-bold border transition-all ${
                          earned
                            ? 'bg-white text-[#1E181A] border-white shadow-xs'
                            : 'bg-white/15 text-white/80 border-white/30'
                        }`}
                      >
                        {earned ? <Check className="w-4 h-4 stroke-[2.5]" /> : idx + 1}
                      </div>
                    );
                  })}
                </div>

                <div className="flex items-center justify-between text-xs pt-2 border-t border-white/20">
                  <span>Recompensa al completar:</span>
                  <span className="font-bold">{themeConfig.loyaltyRewardTitle}</span>
                </div>
              </div>

              {/* Phone lookup form */}
              <form onSubmit={handleLookupVip} className="space-y-3">
                <label className="block text-xs font-semibold" style={{ color: palette.textPrimary }}>
                  Consulta tus sellos acumulados con tu número de WhatsApp:
                </label>
                <div className="flex gap-2">
                  <input
                    type="tel"
                    placeholder="Ej: 0424-7429530"
                    value={vipPhoneInput}
                    onChange={(e) => setVipPhoneInput(e.target.value)}
                    className="flex-1 px-4 py-2.5 rounded-2xl border text-xs focus:outline-none"
                    style={{ borderColor: palette.borderSubtle }}
                  />
                  <button
                    type="submit"
                    className="px-5 py-2.5 rounded-2xl text-white text-xs font-semibold cursor-pointer"
                    style={{ backgroundColor: palette.accentPrimary }}
                  >
                    Consultar
                  </button>
                </div>
              </form>

              {vipClientData && (
                <div
                  className="mt-4 p-4 rounded-2xl border flex items-center justify-between gap-3"
                  style={{
                    backgroundColor: palette.softSurfaceBg,
                    borderColor: palette.borderSubtle,
                  }}
                >
                  <div>
                    <p className="text-xs font-bold" style={{ color: palette.textPrimary }}>
                      {vipClientData.name}
                    </p>
                    <p className="text-[11px]" style={{ color: palette.textSecondary }}>
                      Cada cita agendada suma automáticamente 1 sello a tu ficha digital.
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setShowVipModal(false);
                      onOpenBooking();
                    }}
                    className="px-3.5 py-2 rounded-xl text-white text-xs font-semibold shrink-0 cursor-pointer"
                    style={{ backgroundColor: palette.accentPrimary }}
                  >
                    Sumar Sello
                  </button>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ══ DRAWER INTERACTIVO DE PERSONALIZACIÓN DE ESTILO (PALETA, TIPOGRAFÍA Y LAYOUT EN VIVO) ══ */}
      <AnimatePresence>
        {showCustomizer && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/45 backdrop-blur-xs flex justify-end"
            onClick={() => setShowCustomizer(false)}
          >
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="w-full max-w-md bg-white h-full overflow-y-auto p-6 shadow-2xl space-y-6"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between pb-4 border-b border-stone-200">
                <div>
                  <span className="text-[10px] font-mono uppercase tracking-widest text-rose-700 font-bold block">
                    STUDIO DESIGN ENGINE · EN VIVO
                  </span>
                  <h3 className="font-serif text-xl text-stone-900">
                    Personalizar Identidad del Catálogo
                  </h3>
                </div>
                <button
                  onClick={() => setShowCustomizer(false)}
                  className="w-8 h-8 rounded-full bg-stone-100 hover:bg-stone-200 flex items-center justify-center cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* 1. Paletas de Color Curadas */}
              <div className="space-y-3">
                <label className="text-xs font-bold uppercase tracking-wider text-stone-700 flex items-center gap-1.5">
                  <Palette className="w-3.5 h-3.5 text-rose-700" />
                  <span>1. Paleta de Colores Sugerida</span>
                </label>
                <div className="grid grid-cols-1 gap-2.5">
                  {SALON_PALETTE_PRESETS.map((preset) => {
                    const active = themeConfig.paletteId === preset.id;
                    return (
                      <button
                        key={preset.id}
                        onClick={() => updateThemeField('paletteId', preset.id)}
                        className={`p-3.5 rounded-2xl border text-left transition-all flex items-center justify-between gap-3 cursor-pointer ${
                          active
                            ? 'border-stone-900 bg-stone-50 shadow-xs ring-1 ring-stone-900'
                            : 'border-stone-200 hover:border-stone-300 bg-white'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className="w-9 h-9 rounded-xl shadow-xs border border-black/10 shrink-0"
                            style={{ background: preset.gradientCss }}
                          />
                          <div>
                            <p className="text-xs font-bold text-stone-900">{preset.name}</p>
                            <p className="text-[11px] text-stone-500">{preset.idealSector}</p>
                          </div>
                        </div>
                        {active && <CheckCircle2 className="w-4 h-4 text-stone-900 shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 2. Tipografía Editorial */}
              <div className="space-y-3">
                <label className="text-xs font-bold uppercase tracking-wider text-stone-700 flex items-center gap-1.5">
                  <Type className="w-3.5 h-3.5 text-rose-700" />
                  <span>2. Tipografía de Autor</span>
                </label>
                <div className="space-y-2">
                  {SALON_TYPOGRAPHY_PRESETS.map((typo) => {
                    const active = themeConfig.typographyId === typo.id;
                    return (
                      <button
                        key={typo.id}
                        onClick={() => updateThemeField('typographyId', typo.id)}
                        className={`w-full p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
                          active
                            ? 'border-stone-900 bg-stone-50 ring-1 ring-stone-900'
                            : 'border-stone-200 hover:border-stone-300 bg-white'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className={`${typo.headingClass} text-base text-stone-900`}>
                            {typo.name}
                          </span>
                          {active && <CheckCircle2 className="w-4 h-4 text-stone-900" />}
                        </div>
                        <p className="text-[11px] text-stone-500 mt-0.5">{typo.subtitle}</p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 3. Disposición de Tarjetas */}
              <div className="space-y-3">
                <label className="text-xs font-bold uppercase tracking-wider text-stone-700 flex items-center gap-1.5">
                  <LayoutGrid className="w-3.5 h-3.5 text-rose-700" />
                  <span>3. Formato Visual del Catálogo</span>
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(
                    [
                      { id: 'editorial-magazine', label: 'Editorial' },
                      { id: 'boutique-grid', label: 'Escaparate' },
                      { id: 'minimal-menu', label: 'Compacto' },
                    ] as { id: SalonLayoutId; label: string }[]
                  ).map((lay) => {
                    const active = themeConfig.layoutId === lay.id;
                    return (
                      <button
                        key={lay.id}
                        onClick={() => updateThemeField('layoutId', lay.id)}
                        className={`py-2.5 px-3 rounded-xl border text-xs font-semibold cursor-pointer transition-all ${
                          active
                            ? 'bg-stone-900 text-white border-stone-900'
                            : 'bg-white text-stone-700 border-stone-200 hover:bg-stone-50'
                        }`}
                      >
                        {lay.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="pt-4 border-t border-stone-200">
                <button
                  onClick={() => setShowCustomizer(false)}
                  className="w-full py-3 rounded-2xl text-white text-xs font-semibold shadow-md cursor-pointer"
                  style={{ backgroundColor: palette.accentPrimary }}
                >
                  Guardar y Aplicar Diseño en Vivo
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ══ MODAL QR DINÁMICO ══ */}
      <AnimatePresence>
        {showQrModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4"
            onClick={() => setShowQrModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              className="bg-white border rounded-3xl max-w-sm w-full p-6 shadow-2xl text-center relative"
              style={{ borderColor: palette.borderSubtle }}
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => setShowQrModal(false)}
                className="absolute top-4 right-4 w-8 h-8 rounded-full bg-stone-100 hover:bg-stone-200 flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>

              <span
                className="inline-block px-3 py-1 rounded-full text-[10px] font-mono font-bold uppercase tracking-widest mb-2"
                style={{
                  backgroundColor: palette.badgeBg,
                  color: palette.badgeText,
                }}
              >
                QR Oficial de Recepción
              </span>
              <h3 className={`${typography.headingClass} text-2xl`} style={{ color: palette.textPrimary }}>
                {themeConfig.businessName}
              </h3>
              <p className="text-xs mb-4" style={{ color: palette.textSecondary }}>
                Escanea con la cámara para abrir la carta interactiva y agendar sin esperas
              </p>

              <div
                className="bg-white p-4 rounded-2xl border inline-block shadow-inner mb-4"
                style={{ borderColor: palette.borderSubtle }}
              >
                {qrSvgString ? (
                  <div
                    className="w-48 h-48 mx-auto"
                    dangerouslySetInnerHTML={{ __html: qrSvgString }}
                  />
                ) : (
                  <div className="w-48 h-48 flex items-center justify-center text-xs text-gray-400">
                    Generando QR...
                  </div>
                )}
              </div>

              <div
                className="bg-stone-50 rounded-xl p-2.5 border flex items-center justify-between gap-2 mb-4"
                style={{ borderColor: palette.borderSubtle }}
              >
                <span className="text-[11px] font-mono truncate pl-1" style={{ color: palette.textPrimary }}>
                  https://vanesev.com/m/{tenantSlug}
                </span>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(`https://vanesev.com/m/${tenantSlug}`);
                    setIsCopied(true);
                    setTimeout(() => setIsCopied(false), 2000);
                  }}
                  className="px-2.5 py-1 rounded-lg text-white text-[10px] font-bold flex items-center gap-1 shrink-0 cursor-pointer"
                  style={{ backgroundColor: palette.accentPrimary }}
                >
                  {isCopied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                  <span>{isCopied ? 'Copiado' : 'Copiar'}</span>
                </button>
              </div>

              <button
                onClick={() => setShowQrModal(false)}
                className="w-full py-2.5 rounded-xl text-white text-xs font-bold cursor-pointer"
                style={{ backgroundColor: palette.textPrimary }}
              >
                Cerrar
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
