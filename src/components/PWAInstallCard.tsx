import React from 'react';
import { Download, Calendar, Award, Smartphone, CheckCircle2, ChevronRight } from 'lucide-react';

interface PWAInstallCardProps {
  onOpenClientAccount: () => void;
  onOpenInstall?: () => void;
}

export const PWAInstallCard: React.FC<PWAInstallCardProps> = ({
  onOpenClientAccount,
  onOpenInstall,
}) => {
  const handleInstall = () => {
    if (onOpenInstall) {
      onOpenInstall();
    } else {
      window.dispatchEvent(new CustomEvent('open-pwa-install'));
    }
  };

  return (
    <section className="py-10 bg-gradient-to-b from-white to-warm-100/60 border-t border-sage-200/60">
      <div className="max-w-5xl mx-auto px-4 sm:px-6">
        <div className="relative overflow-hidden rounded-3xl bg-[#16291F] text-white p-6 sm:p-10 shadow-luxury border border-amber-400/20">
          
          {/* Subtle background glow */}
          <div className="absolute top-0 right-0 w-80 h-80 bg-amber-400/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-60 h-60 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />

          <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            
            {/* Left Column: Information & Explanation */}
            <div className="lg:col-span-7 space-y-4 text-center sm:text-left">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-400/15 border border-amber-300/30 text-amber-300 text-xs font-bold uppercase tracking-wider">
                <Smartphone className="w-3.5 h-3.5" />
                <span>Aplicación Web Progresiva Oficial (PWA)</span>
              </div>

              <h3 className="font-serif text-2xl sm:text-3xl font-bold text-white leading-tight">
                Instala Andrea Nails en tu Teléfono
              </h3>

              <p className="text-xs sm:text-sm text-sage-200/90 leading-relaxed max-w-xl">
                Lleva el salón en tu pantalla de inicio. Acceso inmediato sin descargas pesadas desde tiendas de aplicaciones, optimizado para iPhone, Android y PC.
              </p>

              {/* 3 Core Benefits required by client */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 space-y-1">
                  <div className="w-7 h-7 rounded-xl bg-amber-400/20 text-amber-300 flex items-center justify-center">
                    <Award className="w-4 h-4" />
                  </div>
                  <h4 className="font-bold text-xs text-white">Tarjeta VIP de Sellos</h4>
                  <p className="text-[11px] text-sage-300 leading-tight">
                    Monitorea tus 5 visitas para tu Depilación de Cejas de cortesía.
                  </p>
                </div>

                <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 space-y-1">
                  <div className="w-7 h-7 rounded-xl bg-emerald-400/20 text-emerald-300 flex items-center justify-center">
                    <Calendar className="w-4 h-4" />
                  </div>
                  <h4 className="font-bold text-xs text-white">Tus Citas Agendadas</h4>
                  <p className="text-[11px] text-sage-300 leading-tight">
                    Consulta fecha, hora y servicios de tus citas sin perder el enlace.
                  </p>
                </div>

                <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 space-y-1">
                  <div className="w-7 h-7 rounded-xl bg-amber-400/20 text-amber-300 flex items-center justify-center">
                    <CheckCircle2 className="w-4 h-4" strokeWidth={1.5} />
                  </div>
                  <h4 className="font-bold text-xs text-white">Reserva en 1 Toque</h4>
                  <p className="text-[11px] text-sage-300 leading-tight">
                    Abre el catálogo directamente desde tu pantalla como app nativa.
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-3">
                <button
                  onClick={handleInstall}
                  className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-amber-400 hover:bg-amber-300 text-sage-950 font-bold text-xs sm:text-sm shadow-luxury transition-all transform active:scale-95 cursor-pointer"
                >
                  <Download className="w-4 h-4 stroke-[2.5]" />
                  <span>Instalar App en mi Dispositivo</span>
                </button>

                <button
                  onClick={onOpenClientAccount}
                  className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-full bg-white/10 hover:bg-white/15 text-white font-bold text-xs sm:text-sm border border-white/20 transition-all cursor-pointer"
                >
                  <Award className="w-4 h-4 text-amber-300" strokeWidth={1.5} />
                  <span>Consultar Mi Ficha VIP</span>
                </button>
              </div>
            </div>

            {/* Right Column: Visual Preview Mockup */}
            <div className="lg:col-span-5 flex justify-center">
              <div className="relative w-full max-w-[280px] bg-[#0E1A14] rounded-3xl p-4 border border-amber-400/30 shadow-2xl space-y-3 text-center">
                <div className="w-16 h-16 mx-auto rounded-2xl bg-sage-800 border-2 border-amber-400/40 p-1 shadow-md flex items-center justify-center">
                  <span className="font-serif font-bold text-xl text-amber-300">AL</span>
                </div>

                <div>
                  <h5 className="font-serif font-bold text-sm text-white">Andrea Labrador Nails</h5>
                  <p className="text-[10px] text-amber-300 uppercase tracking-widest font-semibold">
                    Studio &bull; PWA Oficial
                  </p>
                </div>

                <div className="p-2.5 rounded-xl bg-white/5 border border-white/10 text-left space-y-1.5">
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="text-sage-300">Estado VIP</span>
                    <span className="text-amber-300 font-bold">Activo</span>
                  </div>
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="text-sage-300">Meta Fidelización</span>
                    <span className="text-emerald-400 font-bold">5 visitas = Cejas Gratis</span>
                  </div>
                </div>

                <div className="flex items-center justify-center gap-1.5 text-[11px] text-sage-300 pt-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Sin ocupar memoria en tu teléfono</span>
                </div>
              </div>
            </div>

          </div>

        </div>
      </div>
    </section>
  );
};
