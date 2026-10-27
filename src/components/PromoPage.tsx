import React from 'react';
import { PromoOffer, ServiceItem } from '../types';
import { Promotions } from './Promotions';
import { Footer } from './Footer';
import { ArrowLeft, Tag, Shield, Gift, Calendar, MessageCircle, Clock, CheckCircle2 } from 'lucide-react';

interface PromoPageProps {
  promos: PromoOffer[];
  services: ServiceItem[];
  exchangeRate: number;
  onSelectPromoForBooking: (promo: PromoOffer) => void;
  onOpenBooking: () => void;
  onExitToCatalog: () => void;
}

export const PromoPage: React.FC<PromoPageProps> = ({
  promos,
  services,
  exchangeRate,
  onSelectPromoForBooking,
  onOpenBooking,
  onExitToCatalog,
}) => {
  return (
    <div className="min-h-screen flex flex-col bg-warm-100 text-warm-900 font-sans selection:bg-sage-200">
      
      {/* Top Floating / Sticky Navigation */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-sage-200/80 shadow-xs">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 sm:h-20 flex items-center justify-between gap-3">
          
          {/* Back to Catalog Button */}
          <button
            onClick={onExitToCatalog}
            className="inline-flex items-center gap-2 px-3 py-1.5 sm:px-4 sm:py-2 rounded-full bg-sage-100 hover:bg-sage-200 text-sage-900 text-xs sm:text-sm font-bold transition-all border border-sage-200 shadow-xs"
          >
            <ArrowLeft className="w-4 h-4 text-sage-700" />
            <span>Volver al Catálogo</span>
          </button>

          {/* Brand Center */}
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-xl bg-sage-800 text-amber-200 font-serif font-bold text-xs flex items-center justify-center shadow-xs">
              AL
            </span>
            <div className="hidden sm:flex flex-col">
              <span className="font-serif text-lg font-bold text-sage-950 leading-tight">
                Andrea Labrador
              </span>
              <span className="text-[9px] uppercase tracking-wider text-sage-600 font-bold">
                Paquetes &amp; Promociones
              </span>
            </div>
          </div>

          {/* WhatsApp Direct & Booking */}
          <div className="flex items-center gap-2">
            <a
              href="https://wa.me/584241360937?text=Hola%20Andrea!%20Deseo%20consultar%20sobre%20tus%20promociones%20y%20combos"
              target="_blank"
              rel="noopener noreferrer"
              className="hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold hover:bg-emerald-100 transition-all shadow-xs"
            >
              <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
              <span>0424-1360937</span>
            </a>
            <button
              onClick={onOpenBooking}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-full bg-sage-800 hover:bg-sage-900 text-white text-xs sm:text-sm font-bold transition-all shadow-soft"
            >
              <Calendar className="w-3.5 h-3.5 text-amber-300" />
              <span>Agendar</span>
            </button>
          </div>

        </div>
      </header>

      {/* Main Promo Content */}
      <main className="flex-1">
        
        {/* Dedicated Promo Hero */}
        <section className="py-12 sm:py-16 bg-gradient-to-b from-warm-50 via-warm-100 to-warm-100 border-b border-sage-200/60">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center space-y-4">
            
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-100 text-amber-950 text-xs font-bold border border-amber-300 shadow-xs">
              <Tag className="w-4 h-4 text-amber-600" strokeWidth={1.5} />
              <span>Experiencias Integrales con Ahorro Garantizado</span>
            </div>

            <h1 className="font-serif text-3xl sm:text-5xl font-bold text-warm-950 tracking-tight leading-tight">
              Promociones &amp; Paquetes Especiales
            </h1>

            <p className="text-sm sm:text-base text-warm-900/80 max-w-2xl mx-auto leading-relaxed">
              Disfruta de nuestras combinaciones más solicitadas en una sola sesión de cuidado y belleza. 
              Cada paquete está diseñado para brindarte un servicio integral con tarifa preferencial y materiales de máxima calidad.
            </p>

            {/* Highlights Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-6 text-left max-w-3xl mx-auto">
              <div className="p-4 bg-white/90 rounded-2xl border border-sage-200 shadow-xs flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-sage-100 text-sage-800 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <span className="text-xs font-bold text-warm-950 block">Precio Cerrado</span>
                  <span className="text-[11px] text-warm-800 block">Sin costos ocultos ni sorpresas</span>
                </div>
              </div>

              <div className="p-4 bg-white/90 rounded-2xl border border-sage-200 shadow-xs flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-900 flex items-center justify-center shrink-0">
                  <Gift className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <span className="text-xs font-bold text-warm-950 block">Acumula Sellos</span>
                  <span className="text-[11px] text-warm-800 block">Suma para tu depilación de cejas gratis</span>
                </div>
              </div>

              <div className="p-4 bg-white/90 rounded-2xl border border-sage-200 shadow-xs flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-sage-100 text-sage-800 flex items-center justify-center shrink-0">
                  <Clock className="w-5 h-5 text-sage-700" />
                </div>
                <div>
                  <span className="text-xs font-bold text-warm-950 block">Una Sola Cita</span>
                  <span className="text-[11px] text-warm-800 block">Atención continua y sin prisas</span>
                </div>
              </div>
            </div>

          </div>
        </section>

        {/* Full Promotions Component Breakdown */}
        <Promotions
          promos={promos}
          services={services}
          exchangeRate={exchangeRate}
          onSelectPromoForBooking={onSelectPromoForBooking}
        />

        {/* Promo Policy & Guarantee Note */}
        <section className="py-12 bg-white border-t border-sage-200">
          <div className="max-w-4xl mx-auto px-4 sm:px-6">
            <div className="p-6 sm:p-8 bg-warm-50 rounded-3xl border border-sage-200 space-y-4">
              <div className="flex items-center gap-2 text-sage-900">
                <Shield className="w-5 h-5 text-sage-700" />
                <h3 className="font-serif text-lg sm:text-xl font-bold">
                  Condiciones de las Promociones
                </h3>
              </div>
              <ul className="space-y-2 text-xs sm:text-sm text-warm-900/90 leading-relaxed list-disc list-inside">
                <li>Las promociones aplican para ser realizadas en una única sesión agendada con Andrea Labrador.</li>
                <li>Los precios expresados en Dólares ($) se cancelan a la tasa de cambio vigente del día mediante Pago Móvil, Efectivo en Divisas o Binance USDT.</li>
                <li>Todos los paquetes combinados acumulan sellos dentro del <b>Club VIP 6+1</b>.</li>
                <li>Para cambios o reprogramaciones, te agradecemos avisar con al menos 24 horas de antelación para reasignar el cupo.</li>
              </ul>
              <div className="pt-4 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-sage-200/80">
                <span className="text-xs text-warm-700">
                  ¿Tienes alguna duda sobre qué técnica se adapta mejor a tus uñas?
                </span>
                <a
                  href="https://wa.me/584241360937?text=Hola%20Andrea!%20Tengo%20una%20duda%20sobre%20tus%20promociones"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-800 hover:text-emerald-900"
                >
                  <MessageCircle className="w-4 h-4 text-emerald-600" />
                  <span>Pregúntale directamente a Andrea por WhatsApp &rarr;</span>
                </a>
              </div>
            </div>

            {/* Bottom Return CTA */}
            <div className="mt-8 text-center">
              <button
                onClick={onExitToCatalog}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-sage-800 hover:bg-sage-900 text-white text-xs sm:text-sm font-bold transition-all shadow-soft"
              >
                <ArrowLeft className="w-4 h-4 text-amber-300" />
                <span>Explorar Todos los Servicios del Catálogo Principal</span>
              </button>
            </div>
          </div>
        </section>

      </main>

      {/* Footer */}
      <Footer
        onOpenBooking={onOpenBooking}
        onNavigateToShare={onExitToCatalog}
      />

    </div>
  );
};
