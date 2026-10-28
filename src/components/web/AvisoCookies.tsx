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
          className="fixed bottom-3 left-3 right-16 z-50 sm:bottom-6 sm:left-6 sm:right-auto sm:max-w-md"
        >
          <div className="flex items-center gap-3 rounded-full border border-[#C9A45C]/30 bg-[#1F1226]/95 py-2 pl-5 pr-2 text-white shadow-[0_20px_50px_-20px_rgba(0,0,0,0.6)] backdrop-blur-xl">
            <p className="text-[12.5px] leading-snug text-white/80">
              Solo cookies técnicas, sin seguimiento.{' '}
              <a href="/legal/cookies" className="font-bold text-[#E7CF9C] underline underline-offset-2">Ver más</a>
            </p>
            <button type="button" onClick={cerrar} className="shrink-0 rounded-full px-4 py-2 text-[13px] font-bold text-[#1F1226] cursor-pointer" style={{ background: 'linear-gradient(115deg, #F3E6C4 0%, #C9A45C 50%, #EBD9AE 100%)' }}>
              Entendido
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
