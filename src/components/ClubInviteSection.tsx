import React from 'react';
import { Award, ArrowRight, CheckCircle2 } from 'lucide-react';

interface ClubInviteSectionProps {
  onNavigateToShare: () => void;
}

export const ClubInviteSection: React.FC<ClubInviteSectionProps> = ({ onNavigateToShare }) => {
  return (
    <section className="py-10 sm:py-14 bg-warm-100">
      <div className="max-w-5xl mx-auto px-4 sm:px-6">

        {/* Solid luxury banner — bg-[#16291F] = deep sage green, fully opaque */}
        <div className="rounded-3xl bg-[#16291F] text-white border border-amber-300/50 shadow-luxury overflow-hidden">
          <div className="p-6 sm:p-10 flex flex-col sm:flex-row items-center gap-6 sm:gap-8">

            {/* Nail art visual stack */}
            <div className="flex items-center justify-center shrink-0">
              <div className="flex items-center">
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl overflow-hidden border-2 border-amber-200/80 shadow-lg -mr-4 relative z-0">
                  <img src="/images/base-rubber.png" alt="Rubber Base" className="w-full h-full object-cover" />
                </div>
                <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl overflow-hidden border-2 border-white shadow-xl relative z-10">
                  <img src="/images/jelly-tips.jpg" alt="Jelly Tips" className="w-full h-full object-cover" />
                </div>
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl overflow-hidden border-2 border-amber-200/80 shadow-lg -ml-4 relative z-0">
                  <img src="/images/polygel-extensions.png" alt="Polygel" className="w-full h-full object-cover" />
                </div>
              </div>
            </div>

            {/* Copy & Benefits */}
            <div className="flex-1 text-center sm:text-left space-y-3 min-w-0">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-400/20 border border-amber-400/40 text-amber-300 text-[10px] font-bold uppercase tracking-wider">
                <Award className="w-3.5 h-3.5 shrink-0 text-amber-300" />
                <span>Beneficios Oficiales para Clientas</span>
              </div>

              <h2 className="font-serif text-xl sm:text-2xl lg:text-3xl font-bold text-white leading-snug">
                Programa de Fidelización{' '}
                <span className="italic font-normal text-amber-200">
                  &amp; Bienvenida
                </span>
              </h2>

              <p className="text-xs sm:text-sm text-sage-200 leading-relaxed">
                Premio directo a tu preferencia continua, sin condiciones ocultas:
              </p>

              {/* 2 Rules Pill Badges */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                <div className="flex items-center gap-2.5 p-2.5 rounded-2xl bg-white/10 border border-white/15 text-sage-100">
                  <CheckCircle2 className="w-4 h-4 text-amber-300 shrink-0" />
                  <div>
                    <strong className="text-white block">1ª Cita: $2 USD de Descuento</strong>
                    <span className="text-[11px] text-sage-300">Si es tu primera vez en el estudio</span>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 p-2.5 rounded-2xl bg-white/10 border border-white/15 text-sage-100">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <div>
                    <strong className="text-white block">5 Servicios = Depilación de Cejas</strong>
                    <span className="text-[11px] text-sage-300">Premio exclusivo de cortesía en tu 5ª visita</span>
                  </div>
                </div>
              </div>

              <div className="pt-1">
                <a
                  href="#club-vip"
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-amber-400 hover:bg-amber-300 text-sage-950 font-bold text-xs sm:text-sm rounded-full shadow-lg transition-all active:scale-95"
                >
                  <Award className="w-4 h-4 shrink-0 text-sage-900" strokeWidth={1.5} />
                  <span>Ver Mi Tarjeta de Fidelización</span>
                  <ArrowRight className="w-3.5 h-3.5 shrink-0 text-sage-900" />
                </a>
              </div>
            </div>

          </div>
        </div>
      </div>
    </section>
  );
};
