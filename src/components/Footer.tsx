import React from 'react';
import { MessageCircle, Calendar, Gift, Award } from 'lucide-react';
import { InstagramIcon } from './Icons';
import { LegalModalType } from './LegalModals';

interface FooterProps {
  onOpenBooking: () => void;
  onNavigateToShare?: () => void;
  onOpenLegal?: (type: LegalModalType) => void;
  tenantSlug?: string;
}

export const Footer: React.FC<FooterProps> = ({
  onOpenBooking,
  onNavigateToShare,
  onOpenLegal,
  tenantSlug = 'andrea-nails',
}) => {
  const isCapra = tenantSlug === 'capra-studio';
  const brandInitials = isCapra ? 'CS' : 'AL';
  const brandTitle = isCapra ? 'Capra Studio' : 'Andrea Labrador';
  const brandSubtitle = isCapra
    ? 'Salón de Belleza Integral & Capra Academy • By María Capra'
    : 'Estudio de Uñas • Cordero • San Cristóbal, Táchira';
  const brandBio = isCapra
    ? 'Nos complace ser parte de tu embellecimiento y armonía perfecta. Especialistas en Cejas, Pestañas, Peluquería, Alisados, Maquillaje Profesional, Manicure, Depilación y Formación Certificada en Capra Academy.'
    : '7 años dedicados al cuidado y embellecimiento de tus uñas en Cordero y San Cristóbal, Táchira. Especialista en nivelación con Base Rubber, Polygel y Jelly Tips, priorizando siempre la salud de tu uña natural.';
  const waHref = isCapra ? 'https://wa.me/584247429530' : 'https://wa.me/584241360937';
  const waText = isCapra ? '0424-7429530' : '0424-1360937';
  const igHref = isCapra ? 'https://instagram.com/caprastudio_' : 'https://instagram.com/andrealabradorl';
  const igText = isCapra ? '@caprastudio_' : '@andrealabradorl';

  return (
    <footer className="bg-sage-900 text-warm-100 pt-10 pb-20 sm:pb-12 border-t border-sage-800">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 space-y-8">
        
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
          
          {/* Brand Presentation */}
          <div className="md:col-span-5 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-sage-800 border border-amber-300/40 flex items-center justify-center font-serif text-amber-200 font-bold text-sm shadow-xs">
                {brandInitials}
              </div>
              <div className="space-y-0.5">
                <span className="font-serif text-2xl font-bold tracking-wide text-white block leading-tight">
                  {brandTitle}
                </span>
                <span className="text-[10px] uppercase tracking-[0.2em] text-amber-300 font-semibold block">
                  {brandSubtitle}
                </span>
              </div>
            </div>

            <p className="text-xs sm:text-sm text-sage-200/90 leading-relaxed max-w-sm">
              {brandBio}
            </p>
            
            {/* Social Buttons */}
            <div className="flex items-center gap-3 pt-1">
              <a
                href={waHref}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-full bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-bold transition-all shadow-sm"
                title="WhatsApp Oficial"
              >
                <MessageCircle className="w-4 h-4" />
                <span>{waText}</span>
              </a>
              <a
                href={igHref}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-full bg-sage-800 hover:bg-pink-600 text-white text-xs font-bold transition-all shadow-sm"
                title="Instagram Oficial"
              >
                <InstagramIcon className="w-4 h-4" />
                <span>{igText}</span>
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div className="md:col-span-3 space-y-3">
            <span className="text-xs uppercase tracking-wider font-bold text-amber-300 block">
              Explorar
            </span>
            <ul className="space-y-2 text-xs sm:text-sm text-sage-200 font-medium">
              <li><a href="#catalogo" className="hover:text-white transition-colors">Catálogo de Servicios</a></li>
              <li>
                <a 
                  href="/compartir" 
                  onClick={(e) => {
                    if (onNavigateToShare) {
                      e.preventDefault();
                      onNavigateToShare();
                    }
                  }}
                  className="text-amber-300 hover:text-white transition-colors flex items-center gap-1.5 font-bold"
                >
                  <Award className="w-3.5 h-3.5 text-amber-400" strokeWidth={1.5} />
                  <span>Club VIP: 5 Sellos &amp; Cortesía</span>
                </a>
              </li>
              <li><a href="#politicas" className="hover:text-white transition-colors">Políticas del Estudio</a></li>
              <li>
                <button onClick={onOpenBooking} className="text-sage-200 hover:text-white transition-colors flex items-center gap-1 font-semibold">
                  <Calendar className="w-3.5 h-3.5 text-amber-300" />
                  <span>Agendar Cita en Línea</span>
                </button>
              </li>
            </ul>
          </div>

          {/* Working Hours & Location */}
          <div className="md:col-span-4 space-y-3">
            <span className="text-xs uppercase tracking-wider font-bold text-amber-300 block">
              Horario de Atención
            </span>
            <div className="p-4 bg-sage-800/90 rounded-2xl border border-sage-700 space-y-2 text-xs text-sage-200">
              <div className="flex justify-between">
                <span>Lunes a Sábado:</span>
                <span className="font-bold text-white">09:00 AM – 06:00 PM</span>
              </div>
              <div className="flex justify-between border-t border-sage-700 pt-1.5">
                <span>Domingos:</span>
                <span className="text-rose-300 font-semibold">Cerrado (Descanso)</span>
              </div>
              <div className="border-t border-sage-700 pt-1.5 text-[11px] text-sage-300">
                {isCapra
                  ? '📍 Atención personalizada por departamentos bajo previa cita • Capra Studio & Capra Academy.'
                  : '📍 Atención exclusiva bajo previa cita en Cordero (Municipio Andrés Bello) y San Cristóbal, Estado Táchira.'}
              </div>
            </div>
          </div>

        </div>

        {/* Legal Links & Compliance */}
        <div className="pt-6 border-t border-sage-800 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-sage-300">
          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-[11px] text-sage-300 font-medium">
            <button onClick={() => onOpenLegal?.('terminos')} className="hover:text-amber-300 transition-colors underline-offset-2 hover:underline">
              Términos del Servicio
            </button>
            <span>&bull;</span>
            <button onClick={() => onOpenLegal?.('privacidad')} className="hover:text-amber-300 transition-colors underline-offset-2 hover:underline">
              Privacidad &amp; Datos
            </button>
            <span>&bull;</span>
            <button onClick={() => onOpenLegal?.('cookies')} className="hover:text-amber-300 transition-colors underline-offset-2 hover:underline">
              Política de Cookies
            </button>
            <span>&bull;</span>
            <button onClick={() => onOpenLegal?.('descargo')} className="hover:text-amber-300 transition-colors underline-offset-2 hover:underline">
              Descargo de Responsabilidad
            </button>
          </div>

          <p className="text-[11px] text-sage-400 text-center sm:text-right">
            &copy; {new Date().getFullYear()} {isCapra ? 'Capra Studio • By María Capra' : 'Andrea Labrador Nails Studio'} &bull; Powered by VANESEV Cloud
          </p>
        </div>

      </div>
    </footer>
  );
};
