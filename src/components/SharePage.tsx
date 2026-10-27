import React from 'react';
import { ReferralClub } from './ReferralClub';
import { ArrowLeft, Calendar } from 'lucide-react';

interface SharePageProps {
  onOpenBooking: () => void;
  onExitToCatalog: () => void;
  exchangeRate: number;
}

export const SharePage: React.FC<SharePageProps> = ({
  onOpenBooking,
  onExitToCatalog,
  exchangeRate,
}) => {
  return (
    <div className="min-h-screen flex flex-col bg-[#FBF9F6] text-warm-900 font-sans selection:bg-sage-200">
      
      {/* 100% Solid Responsive Navigation Bar */}
      <header className="sticky top-0 z-40 bg-[#FBF9F6] border-b border-sage-200/80 shadow-xs">
        <div className="max-w-5xl mx-auto px-3 sm:px-6 h-16 sm:h-18 flex items-center justify-between gap-2">
          
          {/* Back Button */}
          <button
            onClick={onExitToCatalog}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-sage-900 hover:text-sage-700 transition-colors py-1.5 px-2.5 rounded-full hover:bg-sage-100 shrink-0"
          >
            <ArrowLeft className="w-4 h-4 text-sage-700" />
            <span className="hidden sm:inline">Volver al Catálogo</span>
            <span className="sm:hidden">Volver</span>
          </button>

          {/* Centered Brand Title */}
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="font-serif text-base sm:text-xl font-bold tracking-tight text-sage-900 leading-tight">
              Andrea Labrador
            </span>
            <span className="text-[9px] px-2 py-0.5 rounded-full bg-sage-100 text-sage-900 font-bold uppercase border border-sage-300">
              Fidelización
            </span>
          </div>

          {/* Action CTA */}
          <button
            onClick={onOpenBooking}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 sm:px-4 sm:py-2 bg-sage-800 hover:bg-sage-900 text-white text-xs font-bold rounded-full shadow-soft transition-all shrink-0 active:scale-95"
          >
            <Calendar className="w-3.5 h-3.5 text-amber-300" />
            <span className="hidden sm:inline">Agendar Cita</span>
            <span className="sm:hidden">Cita</span>
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 pb-16">
        <ReferralClub onOpenBooking={onOpenBooking} isStandalonePage={true} />
      </main>

      {/* Compact Clean Footer */}
      <footer className="bg-sage-900 text-warm-100 py-8 border-t border-sage-800 text-center text-xs text-sage-300">
        <div className="max-w-3xl mx-auto px-4 space-y-2">
          <p className="font-serif text-base font-bold text-white">ANDREA LABRADOR &bull; NAILS STUDIO</p>
          <p className="text-sage-300 text-[11px]">
            Programa Oficial de Fidelización &bull; Venezuela
          </p>
          <p className="text-sage-400 text-[10px] pt-1">
            &copy; {new Date().getFullYear()} Todos los derechos reservados.
          </p>
        </div>
      </footer>

    </div>
  );
};
