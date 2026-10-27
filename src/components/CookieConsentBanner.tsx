import React, { useState, useEffect } from 'react';
import { Cookie, Check, Shield } from 'lucide-react';
import { LegalModalType } from './LegalModals';

interface CookieConsentBannerProps {
  onOpenLegal: (type: LegalModalType) => void;
}

const COOKIE_STORAGE_KEY = 'andrea_nails_cookie_consent_v1';

export const CookieConsentBanner: React.FC<CookieConsentBannerProps> = ({ onOpenLegal }) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    try {
      const consented = localStorage.getItem(COOKIE_STORAGE_KEY);
      if (!consented) {
        // Small delay so it appears smoothly after page load
        const timer = setTimeout(() => setIsVisible(true), 1200);
        return () => clearTimeout(timer);
      }
    } catch {}
  }, []);

  const handleAccept = () => {
    try {
      localStorage.setItem(COOKIE_STORAGE_KEY, 'accepted');
    } catch {}
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-3 inset-x-3 sm:bottom-6 sm:inset-x-auto sm:right-6 sm:max-w-md z-50 animate-in fade-in slide-in-from-bottom-5 duration-300">
      <div className="p-4 sm:p-5 rounded-3xl bg-v-surface text-v-ink border border-v-line shadow-luxury space-y-3">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-2xl bg-v-brand-soft text-v-brand flex items-center justify-center shrink-0 shadow-sm mt-0.5">
            <Cookie className="w-5 h-5" />
          </div>
          <div className="space-y-1">
            <h4 className="font-cormorant font-semibold text-base text-v-ink leading-tight">
              Aviso de Privacidad &amp; Cookies
            </h4>
            <p className="text-xs text-v-muted leading-relaxed">
              Utilizamos cookies técnicas y almacenamiento local seguro para recordar tu sesión, tus sellos VIP y ofrecerte la mejor experiencia en el catálogo.
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 pt-1 border-t border-v-line">
          <button
            onClick={() => onOpenLegal('cookies')}
            className="text-[11px] text-v-brand hover:text-v-brand-hover underline underline-offset-2 transition-colors font-medium cursor-pointer"
          >
            Ver detalles de cookies
          </button>

          <button
            onClick={handleAccept}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-v-brand hover:bg-v-brand-hover text-white font-bold text-xs rounded-full shadow-md transition-all active:scale-95 cursor-pointer"
          >
            <Check className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>Aceptar y Continuar</span>
          </button>
        </div>
      </div>
    </div>
  );
};
