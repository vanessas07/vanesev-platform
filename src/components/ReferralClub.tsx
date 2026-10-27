import React, { useState } from 'react';
import { 
  Check, 
  Award, 
  Calendar, 
  MessageCircle, 
  ShieldCheck,
  CheckCircle2,
  Search,
  Loader2
} from 'lucide-react';
import { AppStore } from '../services/store';

interface ReferralClubProps {
  onOpenBooking: () => void;
  isStandalonePage?: boolean;
}

export const ReferralClub: React.FC<ReferralClubProps> = ({ 
  onOpenBooking,
  isStandalonePage = false 
}) => {
  const [clientPhone, setClientPhone] = useState('');
  const [clientName, setClientName] = useState('');
  const [stampsCount, setStampsCount] = useState<number>(3);
  const [isSearched, setIsSearched] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [searchFeedback, setSearchFeedback] = useState<string | null>(null);

  const cleanName = clientName.trim() || 'Clienta VIP';

  const handleLookupPhone = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPhone = clientPhone.replace(/\D/g, '');
    if (cleanPhone.length < 7) {
      alert('Por favor ingresa un número de teléfono válido.');
      return;
    }

    setIsLoading(true);
    setSearchFeedback(null);

    try {
      const card = await AppStore.fetchClientLoyaltyRemote(cleanPhone);
      setIsSearched(true);
      if (card && card.stampsCount > 0) {
        setStampsCount(card.stampsCount);
        if (card.clientName) setClientName(card.clientName);
        setSearchFeedback(
          card.stampsCount >= 5 
            ? '🎉 ¡Felicidades! Tienes acumulados tus 5 sellos. ¡Tu Depilación de Cejas es 100% de cortesía!' 
            : `Tienes ${card.stampsCount} de 5 sellos acumulados. ¡Te faltan solo ${5 - card.stampsCount} para tu Depilación de Cejas de cortesía!`
        );
      } else {
        setStampsCount(0);
        setSearchFeedback('👋 ¡Bienvenida! Aún no tienes sellos registrados. Agenda tu cita para activar tu primer sello.');
      }
    } catch (err) {
      console.warn('Error consultando fidelización:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const whatsappInquiryMessage = `¡Hola Andrea! 💅✨ Te escribo desde tu catálogo oficial. Mi nombre es ${cleanName}.

Deseo consultar mis sellos acumulados en el *Programa de Fidelización* o agendar mi próxima cita. ¡Gracias! 💕`;

  const whatsappInquiryUrl = `https://wa.me/584241360937?text=${encodeURIComponent(whatsappInquiryMessage)}`;

  return (
    <section id="fidelizacion" className={`relative overflow-hidden ${isStandalonePage ? 'py-8 sm:py-16' : 'py-12 sm:py-20'} bg-[#FBF9F6] border-t border-sage-200/80`}>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 relative z-10 space-y-10">
        
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto space-y-3">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-sage-100 border border-sage-300 text-sage-900 text-xs font-bold uppercase tracking-wider shadow-xs">
            <Award className="w-3.5 h-3.5 text-amber-600" />
            <span>Programa Oficial de Clientes Frecuentes</span>
          </div>
          
          <h2 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-bold text-warm-900 tracking-tight leading-tight">
            Tarjeta de Fidelización <br />
            <span className="italic font-normal text-sage-800">
              &amp; Descuento de Bienvenida
            </span>
          </h2>

          <p className="text-xs sm:text-sm text-warm-700 leading-relaxed max-w-xl mx-auto">
            En el estudio de Andrea Labrador premiamos tu lealtad y el cuidado continuo de tus uñas naturales y extensiones con beneficios directos y transparentes.
          </p>
        </div>

        {/* 2 Core Rules Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          
          {/* Card 1: Primera Cita */}
          <div className="bg-white p-6 rounded-3xl border border-amber-300 shadow-soft hover:shadow-luxury transition-all flex flex-col justify-between group bg-gradient-to-br from-white to-amber-50/40">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="w-9 h-9 rounded-2xl bg-amber-100 text-amber-900 font-bold flex items-center justify-center text-sm font-serif">
                  01
                </span>
                <span className="text-[10px] uppercase font-bold tracking-wider text-amber-800 bg-amber-100/80 px-2.5 py-1 rounded-full border border-amber-300">
                  Bienvenida
                </span>
              </div>
              
              <h3 className="font-serif text-xl font-bold text-warm-900">
                1ª Cita: $2 USD de Descuento
              </h3>
              
              <p className="text-xs sm:text-sm text-warm-700 leading-relaxed">
                Si es tu primera vez agendando un servicio con Andrea, disfrutas de <strong>$2 USD de descuento directo</strong> en cualquier técnica del catálogo (Semipermanente, Base Rubber, Polygel o Jelly Tips).
              </p>
            </div>

            <div className="pt-4 mt-2 border-t border-amber-200/60 flex items-center gap-2 text-xs font-bold text-amber-900">
              <CheckCircle2 className="w-4 h-4 text-amber-600 shrink-0" />
              <span>Se descuenta automáticamente al agendar</span>
            </div>
          </div>

          {/* Card 2: 5 Visitas = Cejas Gratis */}
          <div className="bg-white p-6 rounded-3xl border border-emerald-300 shadow-soft hover:shadow-luxury transition-all flex flex-col justify-between group bg-gradient-to-br from-white to-emerald-50/40">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="w-9 h-9 rounded-2xl bg-emerald-100 text-emerald-900 font-bold flex items-center justify-center text-sm font-serif">
                  02
                </span>
                <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-800 bg-emerald-100 px-2.5 py-1 rounded-full border border-emerald-300">
                  Fidelidad 5 Visitas
                </span>
              </div>
              
              <h3 className="font-serif text-xl font-bold text-warm-900">
                5 Servicios = Cejas de Cortesía
              </h3>
              
              <p className="text-xs sm:text-sm text-warm-700 leading-relaxed">
                Cada servicio completado suma 1 sello a tu tarjeta digital. Al acumular <strong>5 visitas</strong>, obtienes tu <strong>Depilación de Cejas 100% de cortesía</strong>.
              </p>
            </div>

            <div className="pt-4 mt-2 border-t border-emerald-200/60 flex items-center gap-2 text-xs font-bold text-emerald-900">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Asociado a tu número de teléfono</span>
            </div>
          </div>

        </div>

        {/* Visual Interactive Loyalty Card */}
        <div className="bg-white rounded-3xl border border-sage-200 shadow-luxury p-5 sm:p-8 max-w-2xl mx-auto space-y-6">
          
          {/* Real-time Phone Lookup Form */}
          <form onSubmit={handleLookupPhone} className="p-4 rounded-2xl bg-[#FBF9F6] border border-sage-200 space-y-3">
            <div className="flex items-center gap-2">
              <Award className="w-4 h-4 text-amber-600" strokeWidth={1.5} />
              <span className="text-xs uppercase font-bold tracking-wider text-warm-900">
                Consulta tus Sellos Acumulados en Tiempo Real
              </span>
            </div>
            <p className="text-xs text-warm-600">
              Ingresa tu número de WhatsApp para consultar tu tarjeta VIP en vivo:
            </p>
            <div className="flex flex-col sm:flex-row items-center gap-2">
              <input
                type="tel"
                placeholder="Ej: 04241234567"
                value={clientPhone}
                onChange={(e) => setClientPhone(e.target.value)}
                className="w-full sm:flex-1 p-3 bg-white border border-sage-300 rounded-xl text-xs sm:text-sm font-semibold text-warm-900 focus:ring-2 focus:ring-sage-500 focus:outline-none transition-all"
              />
              <button
                type="submit"
                disabled={isLoading}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-5 py-3 rounded-xl bg-[#16291F] hover:bg-sage-900 text-white font-bold text-xs transition-all shadow-xs shrink-0"
              >
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                <span>Verificar Sellos</span>
              </button>
            </div>
            {searchFeedback && (
              <p className="text-xs font-semibold text-sage-900 bg-sage-50 p-2.5 rounded-xl border border-sage-200">
                {searchFeedback}
              </p>
            )}
          </form>

          {/* VIRTUAL LOYALTY CARD */}
          <div className="p-5 sm:p-7 rounded-3xl bg-[#16291F] text-white border-2 border-amber-300/40 shadow-luxury space-y-5">
            
            {/* Header of Card */}
            <div className="flex items-center justify-between border-b border-white/15 pb-3">
              <div className="flex items-center gap-2">
                <Award className="w-4 h-4 text-amber-300" strokeWidth={1.5} />
                <span className="font-serif text-xs sm:text-sm tracking-wider uppercase text-[#FDF2D6] font-bold">
                  TARJETA DE FIDELIZACIÓN VIP
                </span>
              </div>
              <span className="text-[10px] uppercase font-bold tracking-wider bg-amber-400/20 text-amber-200 px-3 py-0.5 rounded-full border border-amber-300/30">
                Andrea Labrador Nails
              </span>
            </div>

            {/* Client Name on Card */}
            <div className="space-y-0.5">
              <span className="text-[10px] uppercase tracking-[0.2em] text-sage-300 font-semibold block">
                Titular de la tarjeta:
              </span>
              <p className="font-serif text-2xl font-bold text-white tracking-wide">
                {cleanName}
              </p>
            </div>

            {/* 5 STAMP SLOTS + PRIZE SLOT */}
            <div className="space-y-2 pt-1">
              <div className="flex items-center justify-between text-xs text-sage-300">
                <span>Progreso de visitas acumuladas:</span>
                <span className="text-amber-200 font-bold">{Math.min(5, stampsCount)} de 5 servicios</span>
              </div>

              <div className="grid grid-cols-5 gap-2 pt-1">
                {[1, 2, 3, 4, 5].map((num) => {
                  const isFilled = num <= stampsCount;
                  return (
                    <div
                      key={num}
                      className={`h-12 rounded-xl flex flex-col items-center justify-center transition-all border ${
                        isFilled
                          ? 'bg-amber-400 border-amber-300 text-sage-950 font-bold shadow-sm'
                          : 'bg-white/5 border-white/15 text-sage-300'
                      }`}
                    >
                      {isFilled ? (
                        <Check className="w-5 h-5 text-sage-950 stroke-[3]" />
                      ) : (
                        <span className="text-sm font-serif font-bold">{num}</span>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* 5th Reward Box */}
              <div className="mt-3 p-3.5 rounded-2xl bg-gradient-to-r from-emerald-900/60 to-sage-900/60 border border-emerald-400/40 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-emerald-500 text-white flex items-center justify-center font-bold text-sm">
                    🎁
                  </div>
                  <div>
                    <span className="text-xs font-bold text-white block">Visita #5: Depilación de Cejas de Cortesía</span>
                    <span className="text-[10px] text-emerald-200">100% de cortesía para clientas del Club</span>
                  </div>
                </div>
                <Award className="w-5 h-5 text-amber-300" />
              </div>
            </div>

            {/* Bottom details */}
            <div className="text-[11px] text-sage-300 flex items-center justify-between pt-2 border-t border-white/15">
              <span>Sin fecha de caducidad</span>
              <span className="text-amber-200 font-semibold">Técnicas de Autor &bull; 7 Años</span>
            </div>

          </div>

          {/* Action CTAs */}
          <div className="space-y-3 pt-1">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                onClick={onOpenBooking}
                className="flex items-center justify-center gap-2 px-5 py-3.5 rounded-2xl bg-sage-800 hover:bg-sage-900 text-white font-bold text-xs sm:text-sm shadow-soft transition-all active:scale-98"
              >
                <Calendar className="w-4 h-4 text-amber-300" />
                <span>Agendar mis cejas de cortesía</span>
              </button>

              <a
                href={whatsappInquiryUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 px-5 py-3.5 rounded-2xl bg-[#25D366] hover:bg-[#1EBE5D] text-white font-bold text-xs sm:text-sm shadow-soft transition-all active:scale-98"
              >
                <MessageCircle className="w-4 h-4 fill-white" />
                <span>Consultar por WhatsApp</span>
              </a>
            </div>
          </div>

          {/* Transparent Rules */}
          <div className="pt-3 border-t border-sage-100">
            <div className="flex items-center gap-1.5 text-xs text-warm-700">
              <ShieldCheck className="w-4 h-4 text-sage-600 shrink-0" />
              <span>
                <strong>Condiciones claras:</strong> Tus visitas se acreditan automáticamente tras la realización de cada servicio. Con 5 visitas acumuladas disfrutas de tu depilación de cejas de cortesía.
              </span>
            </div>
          </div>

        </div>

      </div>
    </section>
  );
};
