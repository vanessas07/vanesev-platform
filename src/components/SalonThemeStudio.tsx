import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Palette,
  Type,
  LayoutGrid,
  CheckCircle2,
  Save,
  ExternalLink,
  Award,
  Phone,
  MapPin,
  Clock,
  ArrowRight,
} from 'lucide-react';
import {
  getSalonThemeConfig,
  saveSalonThemeConfig,
  getPaletteById,
  getTypographyById,
  SALON_PALETTE_PRESETS,
  SALON_TYPOGRAPHY_PRESETS,
  SalonThemeConfig,
  SalonLayoutId,
} from '../utils/salonThemeEngine';

interface SalonThemeStudioProps {
  tenantSlug: string;
  onOpenPublicCatalog?: () => void;
  onSaved?: () => void;
}

export const SalonThemeStudio: React.FC<SalonThemeStudioProps> = ({
  tenantSlug,
  onOpenPublicCatalog,
  onSaved,
}) => {
  const [config, setConfig] = useState<SalonThemeConfig>(() =>
    getSalonThemeConfig(tenantSlug)
  );
  const [savedToast, setSavedToast] = useState(false);

  useEffect(() => {
    setConfig(getSalonThemeConfig(tenantSlug));
  }, [tenantSlug]);

  const activePalette = getPaletteById(config.paletteId);
  const activeTypography = getTypographyById(config.typographyId);

  const handleUpdate = <K extends keyof SalonThemeConfig>(
    key: K,
    val: SalonThemeConfig[K]
  ) => {
    const updated = { ...config, [key]: val };
    setConfig(updated);
    saveSalonThemeConfig(updated);
  };

  const handleSaveAll = (e: React.FormEvent) => {
    e.preventDefault();
    saveSalonThemeConfig(config);
    setSavedToast(true);
    onSaved?.();
    setTimeout(() => setSavedToast(false), 2500);
  };

  return (
    <div className="space-y-8">
      {/* Header Banner */}
      <div className="rounded-3xl bg-[#FAF7F2] border border-[#E6DAD2] p-6 sm:p-7 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white border border-[#E6DAD2] text-[10px] font-mono uppercase tracking-widest font-bold text-[#9E475B] mb-2">
            <Palette className="w-3.5 h-3.5" />
            <span>STUDIO BRAND &amp; CATALOG CUSTOMIZER</span>
          </span>
          <h3 className="font-serif text-2xl sm:text-3xl text-[#1E181A]">
            Diseño, Tipografía &amp; Paleta de Autor ({config.businessName})
          </h3>
          <p className="text-xs sm:text-sm text-[#6E5D62] mt-1 max-w-2xl">
            Personaliza la atmósfera visual de la carta interactiva de este salón. Cada cambio se aplica instantáneamente en <span className="font-mono font-semibold text-[#1E181A]">/m/{tenantSlug}</span> sin afectar a ningún otro cliente.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          {onOpenPublicCatalog && (
            <button
              type="button"
              onClick={onOpenPublicCatalog}
              className="px-4 py-2.5 rounded-full bg-white hover:bg-stone-50 text-[#1E181A] border border-[#E6DAD2] text-xs font-semibold flex items-center gap-1.5 shadow-2xs cursor-pointer"
            >
              <span>Ver Carta en Vivo</span>
              <ExternalLink className="w-3.5 h-3.5 text-[#9E475B]" />
            </button>
          )}
          <button
            type="button"
            onClick={handleSaveAll}
            className="px-5 py-2.5 rounded-full text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm cursor-pointer"
            style={{ background: activePalette.gradientCss }}
          >
            <Save className="w-3.5 h-3.5" />
            <span>{savedToast ? '¡Diseño Guardado!' : 'Guardar Cambios'}</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Controls */}
        <form onSubmit={handleSaveAll} className="lg:col-span-7 space-y-6">
          {/* 1. Color Palette Selector */}
          <div className="bg-white rounded-3xl border border-stone-200/80 p-6 space-y-4 shadow-2xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Palette className="w-4 h-4 text-[#9E475B]" />
                <h4 className="font-serif text-lg text-stone-900">
                  1. Paletas de Color Sugeridas (Curaduría Sector Belleza)
                </h4>
              </div>
              <span className="text-[11px] font-mono text-stone-500">6 Colecciones</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {SALON_PALETTE_PRESETS.map((preset) => {
                const isSelected = config.paletteId === preset.id;
                return (
                  <motion.button
                    key={preset.id}
                    type="button"
                    whileHover={{ y: -2 }}
                    onClick={() => handleUpdate('paletteId', preset.id)}
                    className={`p-4 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-3 ${
                      isSelected
                        ? 'border-stone-900 bg-stone-50/90 ring-1 ring-stone-900 shadow-xs'
                        : 'border-stone-200 hover:border-stone-300 bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span
                          className="w-6 h-6 rounded-full border border-black/10 shadow-2xs"
                          style={{ backgroundColor: preset.canvasBg }}
                        />
                        <span
                          className="w-6 h-6 rounded-full border border-black/10 shadow-2xs -ml-3"
                          style={{ backgroundColor: preset.accentPrimary }}
                        />
                        <span
                          className="w-6 h-6 rounded-full border border-black/10 shadow-2xs -ml-3"
                          style={{ backgroundColor: preset.accentSecondary }}
                        />
                      </div>
                      {isSelected && <CheckCircle2 className="w-4 h-4 text-stone-900" />}
                    </div>

                    <div>
                      <p className="text-xs font-bold text-stone-900">{preset.name}</p>
                      <p className="text-[11px] text-stone-500 mt-0.5">{preset.subtitle}</p>
                      <span className="inline-block mt-2 text-[10px] font-mono text-stone-600 bg-stone-100 px-2 py-0.5 rounded-md">
                        {preset.idealSector}
                      </span>
                    </div>
                  </motion.button>
                );
              })}
            </div>
          </div>

          {/* 2. Typography Selector */}
          <div className="bg-white rounded-3xl border border-stone-200/80 p-6 space-y-4 shadow-2xs">
            <div className="flex items-center gap-2">
              <Type className="w-4 h-4 text-[#9E475B]" />
              <h4 className="font-serif text-lg text-stone-900">
                2. Par Tipográfico del Catálogo
              </h4>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {SALON_TYPOGRAPHY_PRESETS.map((typo) => {
                const isSelected = config.typographyId === typo.id;
                return (
                  <button
                    key={typo.id}
                    type="button"
                    onClick={() => handleUpdate('typographyId', typo.id)}
                    className={`p-4 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                      isSelected
                        ? 'border-stone-900 bg-stone-50 ring-1 ring-stone-900'
                        : 'border-stone-200 hover:border-stone-300 bg-white'
                    }`}
                  >
                    <div>
                      <span className={`${typo.headingClass} text-lg text-stone-900 block`}>
                        Aa Bb Cc
                      </span>
                      <p className="text-xs font-bold text-stone-900 mt-1">{typo.name}</p>
                      <p className="text-[10px] text-stone-500 mt-0.5">{typo.subtitle}</p>
                    </div>
                    <p className="text-[10px] text-stone-600 mt-3 pt-2 border-t border-stone-100">
                      {typo.sampleText}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 3. Layout Mode */}
          <div className="bg-white rounded-3xl border border-stone-200/80 p-6 space-y-4 shadow-2xs">
            <div className="flex items-center gap-2">
              <LayoutGrid className="w-4 h-4 text-[#9E475B]" />
              <h4 className="font-serif text-lg text-stone-900">
                3. Disposición de Tarjetas de Servicios
              </h4>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {(
                [
                  {
                    id: 'editorial-magazine',
                    title: 'Editorial Magazine',
                    desc: 'Tarjetas horizontales amplias con fotografía lateral de gran impacto.',
                  },
                  {
                    id: 'boutique-grid',
                    title: 'Escaparate Boutique',
                    desc: 'Cuadrícula de 3 columnas estilo e-commerce de alta cosmética.',
                  },
                  {
                    id: 'minimal-menu',
                    title: 'Carta Compacta',
                    desc: 'Lectura rápida con miniatura cuadrada y reserva directa.',
                  },
                ] as { id: SalonLayoutId; title: string; desc: string }[]
              ).map((lay) => {
                const isSelected = config.layoutId === lay.id;
                return (
                  <button
                    key={lay.id}
                    type="button"
                    onClick={() => handleUpdate('layoutId', lay.id)}
                    className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
                      isSelected
                        ? 'border-stone-900 bg-stone-50 ring-1 ring-stone-900'
                        : 'border-stone-200 hover:border-stone-300 bg-white'
                    }`}
                  >
                    <p className="text-xs font-bold text-stone-900">{lay.title}</p>
                    <p className="text-[11px] text-stone-500 mt-1">{lay.desc}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 4. Studio Texts & Loyalty Rules */}
          <div className="bg-white rounded-3xl border border-stone-200/80 p-6 space-y-4 shadow-2xs">
            <div className="flex items-center gap-2">
              <Award className="w-4 h-4 text-[#9E475B]" strokeWidth={1.5} />
              <h4 className="font-serif text-lg text-stone-900">
                4. Textos de Portada, Contacto &amp; Fidelización VIP
              </h4>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-bold text-stone-700 mb-1">
                  Nombre Comercial del Salón
                </label>
                <input
                  type="text"
                  value={config.businessName}
                  onChange={(e) => handleUpdate('businessName', e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 text-xs font-semibold"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-stone-700 mb-1">
                  Directora / Firma de Autor
                </label>
                <input
                  type="text"
                  value={config.directorName}
                  onChange={(e) => handleUpdate('directorName', e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 text-xs font-semibold"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-stone-700 mb-1">
                  Subtítulo / Especialidad Principal
                </label>
                <input
                  type="text"
                  value={config.tagline}
                  onChange={(e) => handleUpdate('tagline', e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 text-xs font-semibold"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-stone-700 mb-1">
                  Ciudad / Ubicación
                </label>
                <input
                  type="text"
                  value={config.city}
                  onChange={(e) => handleUpdate('city', e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 text-xs font-semibold"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-stone-700 mb-1">
                  WhatsApp de Recepción (con código país)
                </label>
                <input
                  type="text"
                  value={config.whatsappPhone}
                  onChange={(e) => handleUpdate('whatsappPhone', e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 text-xs font-semibold"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-stone-700 mb-1">
                  Usuario de Instagram
                </label>
                <input
                  type="text"
                  value={config.instagramHandle}
                  onChange={(e) => handleUpdate('instagramHandle', e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 text-xs font-semibold"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-[11px] font-bold text-stone-700 mb-1">
                  Descripción Editorial de Bienvenida
                </label>
                <textarea
                  rows={2}
                  value={config.subline}
                  onChange={(e) => handleUpdate('subline', e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 text-xs font-medium resize-none"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-stone-700 mb-1">
                  Meta de Visitas para Premio VIP
                </label>
                <select
                  value={config.loyaltyStampsTarget}
                  onChange={(e) => handleUpdate('loyaltyStampsTarget', Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 text-xs font-semibold"
                >
                  <option value={4}>4 Sellos Verificados</option>
                  <option value={5}>5 Sellos Verificados (Recomendado)</option>
                  <option value={6}>6 Sellos Verificados</option>
                  <option value={8}>8 Sellos Verificados</option>
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-bold text-stone-700 mb-1">
                  Recompensa del Pasaporte VIP
                </label>
                <input
                  type="text"
                  value={config.loyaltyRewardTitle}
                  onChange={(e) => handleUpdate('loyaltyRewardTitle', e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 text-xs font-semibold"
                />
              </div>
            </div>
          </div>
        </form>

        {/* Right Column: Live Interactive Mirror Preview */}
        <div className="lg:col-span-5 sticky top-24 space-y-4">
          <div className="flex items-center justify-between px-1">
            <span className="text-[11px] font-mono uppercase tracking-wider text-stone-500 font-semibold">
              VISTA PREVIA EN VIVO · /M/{tenantSlug.toUpperCase()}
            </span>
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-semibold">
              Sincronizado en Tiempo Real
            </span>
          </div>

          <div
            className={`rounded-[32px] p-5 border shadow-luxury space-y-4 transition-all duration-300 ${activeTypography.bodyClass}`}
            style={{
              backgroundColor: activePalette.canvasBg,
              borderColor: activePalette.borderSubtle,
              color: activePalette.textPrimary,
            }}
          >
            {/* Mini Header */}
            <div
              className="rounded-full px-4 py-2.5 bg-white/90 border flex items-center justify-between gap-2 shadow-2xs"
              style={{ borderColor: activePalette.borderSubtle }}
            >
              <div className="flex items-center gap-2.5">
                <div
                  className={`w-8 h-8 rounded-full text-white flex items-center justify-center text-xs font-bold ${activeTypography.headingClass}`}
                  style={{ background: activePalette.gradientCss }}
                >
                  {config.businessName.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <p className={`${activeTypography.headingClass} text-sm font-semibold leading-none`}>
                    {config.businessName}
                  </p>
                  <p className="text-[10px] mt-0.5" style={{ color: activePalette.textSecondary }}>
                    {config.city}
                  </p>
                </div>
              </div>
              <span
                className="px-3 py-1 rounded-full text-white text-[10px] font-semibold"
                style={{ backgroundColor: activePalette.accentPrimary }}
              >
                Reservar
              </span>
            </div>

            {/* Mini Hero Card */}
            <div
              className="rounded-2xl p-5 border space-y-2.5"
              style={{
                backgroundColor: activePalette.softSurfaceBg,
                borderColor: activePalette.borderSubtle,
              }}
            >
              <span
                className="inline-block px-2.5 py-0.5 rounded-full bg-white text-[9px] font-bold uppercase tracking-widest"
                style={{ color: activePalette.accentPrimary }}
              >
                BY {config.directorName.toUpperCase()}
              </span>
              <h5 className={`${activeTypography.headingClass} text-2xl leading-tight`}>
                {config.businessName}:{' '}
                <span className="italic font-normal" style={{ color: activePalette.accentPrimary }}>
                  {config.tagline}
                </span>
              </h5>
              <p className="text-xs leading-relaxed" style={{ color: activePalette.textSecondary }}>
                {config.subline}
              </p>
            </div>

            {/* Mini Service Card */}
            <div
              className="bg-white rounded-2xl border overflow-hidden flex items-center gap-3.5 p-3 shadow-2xs"
              style={{ borderColor: activePalette.borderSubtle }}
            >
              <img
                src="/capra/brow-lamination.jpg"
                alt="Preview"
                className="w-20 h-20 rounded-xl object-cover shrink-0"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span
                    className="text-[10px] font-mono font-bold px-2 py-0.5 rounded"
                    style={{
                      backgroundColor: activePalette.badgeBg,
                      color: activePalette.badgeText,
                    }}
                  >
                    01.01
                  </span>
                  <span className="text-sm font-bold tabular-nums">$20 USD</span>
                </div>
                <p className={`${activeTypography.headingClass} text-base truncate mt-1`}>
                  Brow Lamination + Botox
                </p>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-[10px] flex items-center gap-1" style={{ color: activePalette.textSecondary }}>
                    <Clock className="w-3 h-3" /> 60 min
                  </span>
                  <span
                    className="px-3 py-1 rounded-lg text-white text-[10px] font-semibold flex items-center gap-1"
                    style={{ backgroundColor: activePalette.accentPrimary }}
                  >
                    Reservar <ArrowRight className="w-2.5 h-2.5" />
                  </span>
                </div>
              </div>
            </div>

            {/* Mini VIP Passport Card */}
            <div
              className="rounded-2xl p-4 text-white flex items-center justify-between gap-3"
              style={{ background: activePalette.gradientCss }}
            >
              <div>
                <span className="text-[9px] font-mono uppercase tracking-widest opacity-85 block">
                  PASAPORTE DE FIDELIDAD
                </span>
                <p className="text-xs font-bold mt-0.5">
                  {config.loyaltyStampsTarget} Visitas = {config.loyaltyRewardTitle}
                </p>
              </div>
              <Award className="w-6 h-6 opacity-90 shrink-0" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
