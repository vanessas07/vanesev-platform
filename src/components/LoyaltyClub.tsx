import React, { useState } from 'react';
import { AppStore } from '../services/store';
import { LoyaltyCard } from '../types';
import { Heart, Sparkles, Award, Search, Gift, CheckCircle2 } from 'lucide-react';

interface LoyaltyClubProps {
  tenantSlug?: string;
  tenantName?: string;
}

export const LoyaltyClub: React.FC<LoyaltyClubProps> = ({
  tenantSlug = 'andrea-nails',
  tenantName = 'Andrea Labrador Nails Studio',
}) => {
  const isCapra = tenantSlug === 'capra-studio';
  const rewardLabel = isCapra ? '¡Diseño de Cejas HD o Secado VIP GRATIS!' : '¡Depilación de Cejas 100% GRATIS!';
  const [searchPhone, setSearchPhone] = useState('');
  const [searchedCard, setSearchedCard] = useState<LoyaltyCard | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [isSearching, setIsSearching] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchPhone.trim()) return;
    setIsSearching(true);
    setHasSearched(true);

    const localCard = AppStore.getClientLoyalty(searchPhone);
    if (localCard) {
      setSearchedCard(localCard);
      setIsSearching(false);
      return;
    }

    // Sin consulta pública por teléfono (era la fuga C4): los sellos se ven en «Mi cuenta» con el correo.
    setSearchedCard(null);
    setIsSearching(false);
  };

  const stampsTotal = 5;
  const currentStamps = searchedCard ? searchedCard.stampsCount : 0;

  return (
    <section id="club-vip" className="py-16 bg-white border-t border-sage-200/50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        
        {/* Header */}
        <div className="text-center max-w-xl mx-auto space-y-2 mb-10">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-50 text-rose-600 text-xs font-semibold tracking-wider uppercase border border-rose-100">
            <Heart className="w-3.5 h-3.5 fill-rose-400" />
            <span>Programa de Fidelización Digital &bull; {isCapra ? 'Capra Studio' : 'Andrea Labrador'}</span>
          </div>
          <h2 className="font-serif text-3xl sm:text-4xl text-warm-900 font-semibold">
            {isCapra ? 'Club VIP Capra • Tu Fidelidad Premiada' : 'Club VIP • Tus Manos Recompensadas'}
          </h2>
          <p className="text-xs sm:text-sm text-warm-800/80">
            Cada visita verificada en <strong>{tenantName}</strong> suma a tu cuidado. Con 5 servicios acumulados en tu tarjeta digital, obtienes <strong>{isCapra ? 'un Diseño de Cejas HD o Secado VIP 100% de cortesía' : 'una Depilación de Cejas 100% de cortesía'}</strong>.
          </p>
        </div>

        {/* Loyalty Container Card */}
        <div className="max-w-3xl mx-auto bg-gradient-to-br from-warm-100 to-sage-50 rounded-3xl p-6 sm:p-10 border border-sage-200/80 shadow-luxury space-y-8">
          
          {/* Card Header */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-sage-200/60 pb-6">
            <div className="text-center sm:text-left">
              <span className="text-[10px] uppercase font-bold tracking-[0.2em] text-sage-600 block">
                Tarjeta Digital de Lealtad &bull; {isCapra ? 'Capra Studio' : 'Andrea Nails'}
              </span>
              <h3 className="font-serif text-2xl font-bold text-sage-900">
                {searchedCard ? searchedCard.clientName : 'Tarjeta VIP Oficial'}
              </h3>
              <p className="text-xs text-warm-600">
                {searchedCard ? `Teléfono: ${searchedCard.phone}` : 'Consulta tus sellos acumulados'}
              </p>
            </div>

            {/* Reward badges */}
            <div className="flex items-center gap-2">
              <div className="px-3 py-1.5 bg-white rounded-xl border border-sage-200 text-xs font-semibold text-sage-800 flex items-center gap-1.5 shadow-sm">
                <Sparkles className="w-3.5 h-3.5 text-gold-500" />
                <span>5 Visitas Acumuladas</span>
              </div>
              <div className="px-3 py-1.5 bg-white rounded-xl border border-sage-200 text-xs font-semibold text-sage-800 flex items-center gap-1.5 shadow-sm">
                <Gift className="w-3.5 h-3.5 text-emerald-600" />
                <span>{rewardLabel}</span>
              </div>
            </div>
          </div>

          {/* 6 Stamps Visual Board */}
          <div className="space-y-4">
            <div className="flex items-center justify-between text-xs font-semibold text-sage-800">
              <span>Progreso de Sellos</span>
              <span>{currentStamps} de {stampsTotal} completados</span>
            </div>

            <div className="grid grid-cols-5 gap-2 sm:gap-4">
              {Array.from({ length: stampsTotal }).map((_, index) => {
                const isStamped = index < currentStamps;
                const isSpecial = index === 4;

                return (
                  <div
                    key={index}
                    className={`aspect-square rounded-2xl border-2 flex flex-col items-center justify-center p-2 text-center transition-all ${
                      isStamped
                        ? 'bg-sage-800 border-sage-800 text-white shadow-soft scale-102'
                        : isSpecial
                        ? 'bg-white border-emerald-500 text-emerald-700 border-dashed shadow-sm'
                        : 'bg-white border-sage-200 text-warm-400 border-dashed'
                    }`}
                  >
                    {isStamped ? (
                      <CheckCircle2 className="w-7 h-7 text-gold-400 mb-1" />
                    ) : isSpecial ? (
                      <Gift className="w-6 h-6 text-emerald-600 mb-1 animate-bounce" />
                    ) : (
                      <span className="font-serif text-lg font-bold text-warm-300 mb-1">
                        #{index + 1}
                      </span>
                    )}

                    <span className="text-[10px] font-bold uppercase tracking-wider leading-tight">
                      {index === 4 ? 'Depilación de Cejas' : `Sello ${index + 1}`}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Search Card by Phone Form */}
          <div className="pt-4 border-t border-sage-200/60">
            <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-warm-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="tel"
                  placeholder="Introduce tu número de teléfono (ej: 04241360937)..."
                  value={searchPhone}
                  onChange={(e) => setSearchPhone(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-white border border-sage-200 rounded-2xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-sage-400"
                />
              </div>
              <button
                type="submit"
                className="px-6 py-3 bg-sage-800 hover:bg-sage-900 text-white rounded-2xl text-xs sm:text-sm font-semibold shadow-soft transition-all"
              >
                Ver Mi Tarjeta VIP
              </button>
            </form>

            {hasSearched && !searchedCard && (
              <p className="text-xs text-warm-600 mt-2 text-center">
                Aún no tienes visitas registradas con este número. ¡Tu primer sello se registrará automáticamente en tu próxima cita!
              </p>
            )}
          </div>

        </div>

      </div>
    </section>
  );
};
