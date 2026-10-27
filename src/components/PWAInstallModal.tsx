import React, { useState, useEffect } from 'react';
import { Download, X, Share, PlusSquare, Smartphone, CheckCircle2, Calendar, Award } from 'lucide-react';

interface PWAInstallModalProps {
  onOpenClientAccount?: () => void;
}

export const PWAInstallModal: React.FC<PWAInstallModalProps> = ({ onOpenClientAccount }) => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [installedSuccess, setInstalledSuccess] = useState(false);
  const [isBannerDismissed, setIsBannerDismissed] = useState(false);

  useEffect(() => {
    // Check standalone mode
    const isRunningStandalone = 
      window.matchMedia('(display-mode: standalone)').matches || 
      (window.navigator as any).standalone === true;
    setIsStandalone(isRunningStandalone);

    // Detect iOS
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isAppleDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(isAppleDevice);

    // Listen for beforeinstallprompt event (Android / Chromium)
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    // Listen for global custom open event from any button in the app
    const handleGlobalOpen = () => {
      setShowModal(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('open-pwa-install', handleGlobalOpen);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('open-pwa-install', handleGlobalOpen);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      // Android / Chromium native install prompt
      try {
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') {
          setInstalledSuccess(true);
          setTimeout(() => setInstalledSuccess(false), 3500);
        }
        setDeferredPrompt(null);
      } catch (err) {
        setShowModal(true);
      }
    } else {
      // iOS or browser without direct prompt support
      setShowModal(true);
    }
  };

  return (
    <>
      {/* ── SECCIÓN ÚNICA SUPERIOR DE DESCARGA PWA CON PULSO VISUAL ── */}
      {!isStandalone && !isBannerDismissed && (
        <section className="w-full max-w-full bg-[#16291F] text-white border-b border-amber-400/30 overflow-hidden relative shadow-sm z-40">
          <div className="max-w-6xl mx-auto px-3 sm:px-6 py-2 sm:py-2.5 flex items-center justify-between gap-2 min-w-0">
            
            {/* Indicador de Pulso Visual + Texto */}
            <div 
              onClick={() => setShowModal(true)}
              className="flex items-center gap-2.5 min-w-0 flex-1 cursor-pointer hover:opacity-95 transition-opacity"
            >
              {/* Pulso Visual Ping */}
              <span className="relative flex h-2.5 w-2.5 shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-80"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-400 shadow-[0_0_8px_#f59e0b]"></span>
              </span>

              {/* Mensaje de Invitación */}
              <div className="flex items-center gap-1.5 min-w-0 flex-1 truncate">
                <span className="font-bold text-[11px] sm:text-xs text-amber-300 shrink-0">
                  Descarga la App:
                </span>
                <span className="font-medium text-[10px] sm:text-xs text-sage-100 truncate">
                  Tarjeta VIP de sellos y citas en tu inicio
                </span>
              </div>
            </div>

            {/* Botón con Pulso Visual */}
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                onClick={handleInstallClick}
                className="relative inline-flex items-center gap-1.5 px-3 py-1 bg-gradient-to-r from-amber-400 to-amber-300 hover:from-amber-300 text-sage-950 text-[11px] sm:text-xs font-bold rounded-full shadow-md transition-all active:scale-95 shrink-0 cursor-pointer animate-pulse ring-2 ring-amber-400/30"
              >
                <Download className="w-3 h-3 stroke-[2.5]" />
                <span>{isIOS ? 'Cómo Instalar' : 'Descargar'}</span>
              </button>

              <button
                onClick={() => setIsBannerDismissed(true)}
                className="p-1 rounded-full text-sage-300 hover:text-white hover:bg-white/10 transition-colors shrink-0"
                title="Cerrar aviso temporalmente"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

          </div>
        </section>
      )}

      {/* ── MODAL EXPLICATIVO Y GUÍA DE INSTALACIÓN PASO A PASO ── */}
      {showModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-warm-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="relative w-full max-w-md bg-white rounded-3xl shadow-luxury border border-sage-200 overflow-hidden p-6 space-y-5 animate-in fade-in zoom-in-95 duration-200">
            
            {/* Close button */}
            <button
              onClick={() => setShowModal(false)}
              className="absolute top-4 right-4 p-2 rounded-full text-warm-400 hover:text-warm-900 hover:bg-sage-50 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Header with App Logo */}
            <div className="flex items-center gap-3 pr-6">
              <div className="w-12 h-12 rounded-2xl bg-[#16291F] border border-amber-400/40 shadow-sm flex items-center justify-center shrink-0">
                <span className="font-serif font-bold text-amber-300 text-lg">AL</span>
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                  App PWA Oficial
                </span>
                <h3 className="font-serif text-lg font-bold text-warm-900 leading-tight">
                  Andrea Labrador Nails en tu {isIOS ? 'iPhone / iPad' : 'Dispositivo'}
                </h3>
              </div>
            </div>

            {/* Why install explanation */}
            <div className="p-3.5 bg-warm-50 rounded-2xl border border-sage-200/80 space-y-2 text-xs">
              <p className="font-bold text-warm-900 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-amber-600" strokeWidth={1.5} />
                <span>¿Por qué descargar la App en tu inicio?</span>
              </p>
              <ul className="space-y-1.5 text-warm-700 text-[11px]">
                <li className="flex items-start gap-1.5">
                  <Award className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                  <span><strong>Tarjeta VIP con sellos:</strong> Monitorea tus visitas acumuladas (¡5 visitas = Depilación de Cejas de cortesía!).</span>
                </li>
                <li className="flex items-start gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                  <span><strong>Tus Citas Agendadas:</strong> Revisa el día y la hora de tu cita sin perder el mensaje en WhatsApp.</span>
                </li>
                <li className="flex items-start gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-sage-600 shrink-0 mt-0.5" />
                  <span><strong>Acceso en 1 Toque:</strong> Abre el catálogo en 1 segundo sin ocupar memoria de tu teléfono.</span>
                </li>
              </ul>
            </div>

            {/* If Android/Chromium has native prompt */}
            {deferredPrompt && (
              <div className="pt-1">
                <button
                  onClick={handleInstallClick}
                  className="w-full py-3.5 rounded-2xl bg-amber-400 hover:bg-amber-300 text-sage-950 text-xs sm:text-sm font-bold shadow-soft transition-all active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Download className="w-4 h-4 stroke-[2.5]" />
                  <span>Instalar Ahora en mi Pantalla de Inicio</span>
                </button>
              </div>
            )}

            {/* iOS / Safari Step-by-Step Instructions */}
            {isIOS && (
              <div className="space-y-3 bg-[#FBF9F6] p-4 rounded-2xl border border-sage-200 text-xs">
                <p className="font-bold text-sage-900 text-center">Pasos para iPhone / Safari:</p>
                
                {/* Step 1 */}
                <div className="flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full bg-[#16291F] text-amber-200 font-serif font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                    1
                  </span>
                  <div className="space-y-0.5">
                    <p className="font-bold text-warm-900">
                      Toca el botón Compartir
                    </p>
                    <p className="text-warm-600 text-[11px] flex items-center gap-1.5 flex-wrap">
                      En la barra inferior de Safari, pulsa el ícono 
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-white border border-sage-200 font-bold text-sage-800">
                        <Share className="w-3 h-3" /> Compartir
                      </span>
                    </p>
                  </div>
                </div>

                {/* Step 2 */}
                <div className="flex items-start gap-3 pt-2 border-t border-sage-200/60">
                  <span className="w-6 h-6 rounded-full bg-[#16291F] text-amber-200 font-serif font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                    2
                  </span>
                  <div className="space-y-0.5">
                    <p className="font-bold text-warm-900">
                      Selecciona "Añadir a pantalla de inicio"
                    </p>
                    <p className="text-warm-600 text-[11px] flex items-center gap-1.5 flex-wrap">
                      Desliza en el menú y presiona 
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-white border border-sage-200 font-bold text-sage-800">
                        <PlusSquare className="w-3 h-3" /> Añadir a inicio
                      </span>
                    </p>
                  </div>
                </div>

                {/* Step 3 */}
                <div className="flex items-start gap-3 pt-2 border-t border-sage-200/60">
                  <span className="w-6 h-6 rounded-full bg-[#16291F] text-amber-200 font-serif font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                    3
                  </span>
                  <div className="space-y-0.5">
                    <p className="font-bold text-warm-900">
                      Confirma tocando "Añadir"
                    </p>
                    <p className="text-warm-600 text-[11px]">
                      En la esquina superior derecha, pulsa "Añadir". ¡Listo! La app quedará instalada como ícono propio.
                    </p>
                  </div>
                </div>

              </div>
            )}

            {/* Quick action: View VIP account directly */}
            {onOpenClientAccount && (
              <div className="pt-2 border-t border-sage-100 flex items-center justify-between">
                <span className="text-[11px] text-warm-600">¿Ya tienes visitas registradas?</span>
                <button
                  onClick={() => {
                    setShowModal(false);
                    onOpenClientAccount();
                  }}
                  className="text-xs font-bold text-sage-800 hover:text-sage-950 underline flex items-center gap-1 cursor-pointer"
                >
                  <Award className="w-3.5 h-3.5 text-amber-600" strokeWidth={1.5} />
                  <span>Ver Mi Ficha VIP</span>
                </button>
              </div>
            )}

            {/* Modal action */}
            <button
              onClick={() => setShowModal(false)}
              className="w-full py-3 rounded-2xl bg-[#16291F] hover:bg-sage-900 text-white text-xs font-bold shadow-soft transition-all cursor-pointer"
            >
              Cerrar y seguir navegando
            </button>

          </div>
        </div>
      )}

      {/* Success Notification toast */}
      {installedSuccess && (
        <div className="fixed top-5 right-5 z-50 bg-emerald-800 text-white px-4 py-3 rounded-2xl shadow-luxury flex items-center gap-2 text-xs font-bold border border-emerald-500 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-300" />
          <span>¡App instalada con éxito en tu pantalla de inicio!</span>
        </div>
      )}
    </>
  );
};
