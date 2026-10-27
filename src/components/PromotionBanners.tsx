import React from 'react';
import { ArrowRight, Tag, Percent } from 'lucide-react';

interface PromotionBannersProps {
  onNavigateToPromo: () => void;
  exchangeRate: number;
}

export const PromotionBanners: React.FC<PromotionBannersProps> = ({
  onNavigateToPromo,
  exchangeRate,
}) => {
  return (
    <section className="py-10 bg-warm-100/60 border-y border-sage-200/60">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        
        {/* Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100 text-amber-900 text-xs font-bold tracking-wider uppercase mb-2">
              <Tag className="w-3.5 h-3.5 text-amber-600" strokeWidth={1.5} />
              <span>Combos Exclusivos del Estudio</span>
            </div>
            <h2 className="font-serif text-2xl sm:text-3xl text-warm-900 font-bold">
              Promociones Especiales
            </h2>
            <p className="text-xs sm:text-sm text-warm-800/80">
              Paquetes diseñados para consentirte con una experiencia integral ahorrando en servicios combinados.
            </p>
          </div>

          <button
            onClick={onNavigateToPromo}
            className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-bold text-amber-900 hover:text-amber-950 transition-colors group shrink-0"
          >
            <span>Ver detalles de promociones</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform text-amber-600" />
          </button>
        </div>

        {/* The 2 Visual Promotional Banners */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          
          {/* Banner 1: Pack Integral Manos & Pies */}
          <div 
            onClick={onNavigateToPromo}
            className="relative bg-gradient-to-br from-white via-warm-50 to-sage-50/50 rounded-3xl p-6 border border-sage-200/90 shadow-soft hover:shadow-luxury transition-all cursor-pointer group overflow-hidden flex flex-col justify-between"
          >
            {/* Top Badge */}
            <div className="flex items-center justify-between gap-2 mb-4">
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-100 text-amber-900 text-[11px] font-bold">
                <Tag className="w-3 h-3 text-amber-700" />
                <span>Ahorras $5.00 USD</span>
              </span>
              <span className="text-[10px] font-bold uppercase tracking-wider bg-sage-800 text-amber-200 px-3 py-1 rounded-full">
                Más Solicitado
              </span>
            </div>

            {/* Content */}
            <div className="space-y-2 mb-6">
              <h3 className="font-serif text-xl sm:text-2xl font-bold text-sage-950 group-hover:text-sage-800 transition-colors">
                Pack Integral: Manos &amp; Pies
              </h3>
              <p className="text-xs sm:text-sm text-warm-900/80 leading-relaxed">
                Semipermanente en manos + Pedicura Spa profunda. Cuidado completo en una sola sesión de bienestar.
              </p>
            </div>

            {/* Pricing & CTA */}
            <div className="pt-4 border-t border-sage-200/80 flex items-center justify-between gap-3">
              <div>
                <span className="text-[11px] text-warm-700 line-through font-semibold block">
                  Antes: $30.00 USD
                </span>
                <div className="flex items-baseline gap-1.5">
                  <span className="font-serif text-2xl sm:text-3xl font-black text-sage-950">
                    $25.00
                  </span>
                  <span className="text-xs font-bold text-sage-800">
                    USD (≈ {(25 * exchangeRate).toFixed(0)} Bs)
                  </span>
                </div>
              </div>

              <span className="inline-flex items-center gap-1 px-4 py-2 bg-sage-800 group-hover:bg-sage-900 text-white rounded-full text-xs font-bold transition-all shadow-xs shrink-0">
                <span>Ver Promoción</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
              </span>
            </div>
          </div>

          {/* Banner 2: Combo Escultural Polygel */}
          <div 
            onClick={onNavigateToPromo}
            className="relative bg-gradient-to-br from-white via-warm-50 to-amber-50/40 rounded-3xl p-6 border border-amber-200/80 shadow-soft hover:shadow-luxury transition-all cursor-pointer group overflow-hidden flex flex-col justify-between"
          >
            {/* Top Badge */}
            <div className="flex items-center justify-between gap-2 mb-4">
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-100 text-amber-900 text-[11px] font-bold">
                <Percent className="w-3 h-3 text-amber-700" />
                <span>Ahorras $7.00 USD</span>
              </span>
              <span className="text-[10px] font-bold uppercase tracking-wider bg-amber-900 text-amber-100 px-3 py-1 rounded-full">
                Duración &amp; Resistencia
              </span>
            </div>

            {/* Content */}
            <div className="space-y-2 mb-6">
              <h3 className="font-serif text-xl sm:text-2xl font-bold text-warm-950 group-hover:text-amber-900 transition-colors">
                Combo Escultural: Polygel Premium
              </h3>
              <p className="text-xs sm:text-sm text-warm-900/80 leading-relaxed">
                Extensión completa en Polygel o Acrílico + Nivelación Rubber para máxima fuerza y acabado impecable.
              </p>
            </div>

            {/* Pricing & CTA */}
            <div className="pt-4 border-t border-amber-200/80 flex items-center justify-between gap-3">
              <div>
                <span className="text-[11px] text-warm-700 line-through font-semibold block">
                  Antes: $35.00 USD
                </span>
                <div className="flex items-baseline gap-1.5">
                  <span className="font-serif text-2xl sm:text-3xl font-black text-warm-950">
                    $28.00
                  </span>
                  <span className="text-xs font-bold text-amber-950">
                    USD (≈ {(28 * exchangeRate).toFixed(0)} Bs)
                  </span>
                </div>
              </div>

              <span className="inline-flex items-center gap-1 px-4 py-2 bg-amber-900 group-hover:bg-amber-950 text-white rounded-full text-xs font-bold transition-all shadow-xs shrink-0">
                <span>Ver Promoción</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
              </span>
            </div>
          </div>

        </div>

      </div>
    </section>
  );
};
