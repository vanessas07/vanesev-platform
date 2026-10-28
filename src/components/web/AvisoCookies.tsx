import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

/*
 * Aviso de cookies de vanesev.com (T-37). La web solo usa almacenamiento técnico, así que es un aviso, no un
 * consentimiento: una cookie técnica recuerda que ya se vio durante un año.
 */
const COOKIE = 'vanesev_aviso_cookies';

export const AvisoCookies: React.FC = () => {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    if (typeof document === 'undefined' || document.cookie.includes(`${COOKIE}=1`)) return;
    const t = window.setTimeout(() => setVisible(true), 1500);
    return () => window.clearTimeout(t);
  }, []);
  const cerrar = () => {
    document.cookie = `${COOKIE}=1; max-age=31536000; path=/; SameSite=Lax; Secure`;
    setVisible(false);
  };
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          role="region"
          aria-label="Aviso de cookies"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 30 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="fixed inset-x-3 bottom-3 z-50 sm:inset-x-auto sm:bottom-6 sm:left-6 sm:max-w-sm"
        >
          <div className="rounded-[24px] border border-[#C9A45C]/30 bg-[#1F1226]/95 p-5 text-white shadow-[0_30px_70px_-20px_rgba(0,0,0,0.6)] backdrop-blur-xl">
            <p className="font-lujo text-[19px] leading-tight">Solo cookies técnicas.</p>
            <p className="mt-1.5 text-[13px] leading-relaxed text-white/70">
              Sin publicidad ni seguimiento: solo lo imprescindible para que la web funcione.{' '}
              <a href="/legal/cookies" className="font-bold text-[#E7CF9C] underline underline-offset-2">Más información</a>
            </p>
            <button type="button" onClick={cerrar} className="mt-4 w-full rounded-full py-3 text-[14px] font-bold text-[#1F1226] cursor-pointer" style={{ background: 'linear-gradient(115deg, #F3E6C4 0%, #C9A45C 50%, #EBD9AE 100%)' }}>
              Entendido
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
