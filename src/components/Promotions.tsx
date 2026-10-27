import React from 'react';
import { PromoOffer, ServiceItem } from '../types';
import { Check, Tag, ArrowRight, Clock } from 'lucide-react';

interface PromotionsProps {
  promos: PromoOffer[];
  services: ServiceItem[];
  exchangeRate: number;
  onSelectPromoForBooking: (promo: PromoOffer) => void;
}

export const Promotions: React.FC<PromotionsProps> = ({
  promos,
  services,
  exchangeRate,
  onSelectPromoForBooking,
}) => {
  const activePromos = promos.filter(p => p.isActive);

  if (activePromos.length === 0) return null;

  return (
    <section id="promociones" className="py-16 bg-warm-100 relative overflow-hidden">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        
        {/* Section Header */}
        <div className="text-center max-w-xl mx-auto space-y-2 mb-10">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gold-400/20 text-gold-600 text-xs font-semibold tracking-wider uppercase">
            <Tag className="w-3.5 h-3.5" strokeWidth={1.5} />
            <span>Paquetes & Beneficios Exclusivos</span>
          </div>
          <h2 className="font-serif text-3xl sm:text-4xl text-warm-900 font-semibold">
            Promociones & Combos
          </h2>
          <p className="text-xs sm:text-sm text-warm-800/80">
            Diseñados para consentirte con una experiencia integral ahorrando en tus servicios combinados.
          </p>
        </div>

        {/* Promo Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {activePromos.map((promo) => {
            const savingsUSD = promo.regularPriceUSD - promo.promoPriceUSD;
            const priceVES = promo.promoPriceUSD * exchangeRate;

            return (
              <div
                key={promo.id}
                className="relative bg-white rounded-3xl p-6 sm:p-8 border border-sage-200/80 shadow-soft hover:shadow-luxury transition-all flex flex-col justify-between overflow-hidden group"
              >
                {/* Background accent badge */}
                <div className="absolute top-0 right-0 bg-sage-700 text-warm-50 text-[10px] sm:text-xs font-bold uppercase tracking-wider py-1.5 px-6 rounded-bl-2xl shadow-sm">
                  {promo.badge}
                </div>

                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <span className="text-xs font-bold text-amber-700 tracking-wider uppercase flex items-center gap-1.5">
                      <Tag className="w-3.5 h-3.5" />
                      <span>Ahorras ${savingsUSD.toFixed(2)} USD</span>
                    </span>
                    <h3 className="font-serif text-2xl sm:text-3xl font-bold text-warm-900 leading-tight">
                      {promo.title}
                    </h3>
                    <p className="text-xs sm:text-sm text-warm-900 font-medium">
                      {promo.subtitle}
                    </p>
                  </div>

                  {/* Included Services list */}
                  <div className="p-4 bg-sage-50/90 rounded-2xl border border-sage-200/80 space-y-2.5">
                    <span className="text-xs font-bold text-sage-900 uppercase tracking-wider block">
                      Incluye en una sola cita:
                    </span>
                    <ul className="space-y-2 text-xs sm:text-sm text-warm-900">
                      {promo.servicesIncluded.map((srv, idx) => (
                        <li key={idx} className="flex items-center gap-2.5 font-medium">
                          <div className="w-4 h-4 rounded-full bg-sage-700 text-white flex items-center justify-center flex-shrink-0">
                            <Check className="w-2.5 h-2.5" />
                          </div>
                          <span className="font-semibold">{srv}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Pricing Comparison */}
                  <div className="flex items-baseline gap-3 pt-2">
                    <span className="text-xs text-warm-800 line-through font-bold">
                      Antes: ${promo.regularPriceUSD.toFixed(2)}
                    </span>
                    <div className="flex items-baseline gap-2">
                      <span className="font-serif text-3xl sm:text-4xl font-black text-sage-900">
                        ${promo.promoPriceUSD.toFixed(2)}
                      </span>
                      <span className="text-xs sm:text-sm text-sage-800 font-bold">
                        USD (≈ {priceVES.toFixed(0)} Bs)
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-warm-900 font-medium pt-1">
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-sage-600" />
                      <span>{promo.validUntil}</span>
                    </div>
                    <span className="text-[11px] text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200 font-bold">
                      ⭐ Suma a tu Tarjeta VIP
                    </span>
                  </div>

                  <p className="text-[11px] text-warm-600 italic">
                    * Precio promocional cerrado con ahorro directo. No acumulable con el cupón de bienvenida individual.
                  </p>
                </div>

                {/* Booking Button */}
                <div className="pt-6">
                  <button
                    onClick={() => onSelectPromoForBooking(promo)}
                    className="w-full py-3.5 px-5 bg-sage-800 hover:bg-sage-900 text-white text-xs sm:text-sm font-bold rounded-2xl flex items-center justify-center gap-2 shadow-soft hover:shadow-luxury transition-all transform active:scale-98"
                  >
                    <span>Aprovechar Combo & Agendar (${promo.promoPriceUSD.toFixed(2)} USD)</span>
                    <ArrowRight className="w-4 h-4 text-amber-300" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

      </div>
    </section>
  );
};
