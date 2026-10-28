import React, { useEffect, useRef, useState } from 'react';
import {
  AnimatePresence,
  motion,
  useMotionValue,
  useMotionValueEvent,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
  type MotionValue,
} from 'framer-motion';
import { CalendarCheck, MessageCircle, QrCode, Award } from 'lucide-react';
import { QREncoder } from '../../utils/qrEncoder';

/*
 * Efectos premium de la web comercial (G-036, «Obsidiana y ciruela»).
 * Todo respeta prefers-reduced-motion: sin desplazamientos ni giros, solo opacidad.
 */

const CURVA: [number, number, number, number] = [0.22, 1, 0.36, 1];

/** Props para una <motion.section>: aparece al entrar en pantalla (una sola vez). */
export const revelarSeccion = {
  initial: { opacity: 0, y: 48 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, amount: 0.08 },
  transition: { duration: 0.9, ease: CURVA },
};

/** Titular que se revela palabra a palabra, con máscara (las palabras suben desde abajo). */
export const TituloRevelado: React.FC<{
  partes: { texto: string; acento?: boolean }[];
  className?: string;
  retraso?: number;
}> = ({ partes, className = '', retraso = 0.1 }) => {
  const reducir = useReducedMotion();
  let indice = 0;
  return (
    <h1 className={className}>
      {partes.map((parte, p) =>
        parte.texto.split(' ').filter(Boolean).map((palabra, w) => {
          const i = indice++;
          return (
            <span key={`${p}-${w}`} className="inline-block overflow-hidden align-bottom pb-[0.08em] mr-[0.22em]">
              <motion.span
                className={`inline-block ${parte.acento ? 'italic font-normal text-[#4A1F5C]' : ''}`}
                initial={reducir ? { opacity: 0 } : { y: '110%', opacity: 0 }}
                animate={reducir ? { opacity: 1 } : { y: '0%', opacity: 1 }}
                transition={{ duration: reducir ? 0.3 : 0.85, ease: CURVA, delay: retraso + i * 0.06 }}
              >
                {palabra}
              </motion.span>
            </span>
          );
        })
      )}
    </h1>
  );
};

/** Fondo de aurora: dos halos (ciruela y champán) que respiran despacio detrás de la portada. */
export const AuroraFondo: React.FC = () => {
  const reducir = useReducedMotion();
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
      <motion.div
        className="absolute -top-40 -right-32 h-[560px] w-[560px] rounded-full blur-3xl"
        style={{ background: 'radial-gradient(circle, rgba(74,31,92,0.22) 0%, rgba(74,31,92,0) 70%)' }}
        animate={reducir ? undefined : { x: [0, -40, 0], y: [0, 30, 0], scale: [1, 1.08, 1] }}
        transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute -bottom-48 -left-24 h-[520px] w-[520px] rounded-full blur-3xl"
        style={{ background: 'radial-gradient(circle, rgba(184,155,106,0.22) 0%, rgba(184,155,106,0) 70%)' }}
        animate={reducir ? undefined : { x: [0, 50, 0], y: [0, -24, 0], scale: [1, 1.12, 1] }}
        transition={{ duration: 22, repeat: Infinity, ease: 'easeInOut' }}
      />
      {/* Retícula fina, muy tenue: textura técnica sin ruido visual. */}
      <div
        className="absolute inset-0 opacity-[0.35]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(26,16,32,0.035) 1px, transparent 1px), linear-gradient(90deg, rgba(26,16,32,0.035) 1px, transparent 1px)',
          backgroundSize: '56px 56px',
          maskImage: 'radial-gradient(ellipse at 50% 30%, black 0%, transparent 72%)',
          WebkitMaskImage: 'radial-gradient(ellipse at 50% 30%, black 0%, transparent 72%)',
        }}
      />
    </div>
  );
};

/** Foto a sangre de la portada: entra con un zoom lento y lleva un velo de porcelana para que el texto se lea. */
export const FotoPortada: React.FC<{ src: string; alt: string }> = ({ src, alt }) => {
  const reducir = useReducedMotion();
  return (
    <div className="absolute inset-0 overflow-hidden">
      <motion.img
        src={src}
        alt={alt}
        loading="eager"
        className="absolute inset-0 h-full w-full object-cover object-[62%_center]"
        initial={reducir ? { opacity: 0 } : { opacity: 0, scale: 1.14 }}
        animate={reducir ? { opacity: 1 } : { opacity: 1, scale: 1.03 }}
        transition={{ duration: reducir ? 0.4 : 2.6, ease: CURVA }}
      />
      {/* Velo: en móvil de arriba abajo; en escritorio de izquierda (texto) a derecha (foto viva). */}
      <div className="absolute inset-0 lg:hidden" style={{ background: 'linear-gradient(180deg, rgba(251,250,252,0.50) 0%, rgba(251,250,252,0.86) 34%, #FBFAFC 70%)' }} />
      <div className="absolute inset-0 hidden lg:block" style={{ background: 'linear-gradient(90deg, #FBFAFC 0%, rgba(251,250,252,0.93) 32%, rgba(251,250,252,0.50) 60%, rgba(251,250,252,0.12) 100%)' }} />
      <div className="absolute inset-x-0 bottom-0 h-40" style={{ background: 'linear-gradient(0deg, #FBFAFC, rgba(251,250,252,0))' }} />
    </div>
  );
};

/** Reflejo de luz que recorre la pantalla de un móvil cada pocos segundos. */
export const ReflejoPantalla: React.FC = () => <div aria-hidden="true" className="v-reflejo pointer-events-none absolute inset-0 z-30" />;

/** Inclinación 3D que sigue al ratón (solo con puntero fino; en móvil no hace nada). */
export function useInclinacion3D(maximo = 10) {
  const reducir = useReducedMotion();
  const rx = useSpring(useMotionValue(0), { stiffness: 140, damping: 18 });
  const ry = useSpring(useMotionValue(0), { stiffness: 140, damping: 18 });
  const onMouseMove = (e: React.MouseEvent<HTMLElement>) => {
    if (reducir) return;
    const r = e.currentTarget.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width - 0.5;
    const py = (e.clientY - r.top) / r.height - 0.5;
    ry.set(px * maximo * 2);
    rx.set(-py * maximo * 2);
  };
  const onMouseLeave = () => {
    rx.set(0);
    ry.set(0);
  };
  return { estilo: { rotateX: rx, rotateY: ry, transformStyle: 'preserve-3d' as const }, onMouseMove, onMouseLeave };
}

// ─── «Un día en tu salón»: scroll 3D con teléfono fijo y cuatro escenas ─────────
const ESCENAS = [
  {
    icono: QrCode,
    etiqueta: '01 · Recepción',
    titulo: 'Tu clienta escanea tu QR.',
    texto: 'En el espejo, en la recepción o en tu Instagram, entra en tu mundo: tu marca, tus fotos y tus precios. Sin descargar nada.',
  },
  {
    icono: CalendarCheck,
    etiqueta: '02 · Reserva',
    titulo: 'Reserva sola, mientras tú creas.',
    texto: 'Elige tratamiento, especialista y hora entre tus huecos libres de verdad. La oferta del día ya viene aplicada.',
  },
  {
    icono: MessageCircle,
    etiqueta: '03 · Confirmación',
    titulo: 'Te llega al WhatsApp, ya ordenada.',
    texto: 'Servicio, especialista, día, hora y precio en un solo mensaje. Confirmas con un toque y la cita queda en tu agenda.',
  },
  {
    icono: Award,
    etiqueta: '04 · Fidelidad',
    titulo: 'Y vuelve: suma su sello VIP.',
    texto: 'Su Pasaporte VIP cuenta cada visita y le recuerda su premio. Tu clienta es tuya, no de una app.',
  },
];

// QR real de la demo (mismo codificador que el gestor de QR del panel).
// Lleva a la web de VANESEV: la demo nunca apunta a un salón cliente (G-040).
const QR_MATRIZ = QREncoder.generateMatrix('https://vanesev.com/');

export const QrReal: React.FC<{ tam: number }> = ({ tam }) => {
  const n = QR_MATRIZ.length;
  return (
    <svg viewBox={`0 0 ${n} ${n}`} width={tam} height={tam} shapeRendering="crispEdges" aria-hidden="true">
      {QR_MATRIZ.flatMap((fila, y) => fila.map((v, x) => (v ? <rect key={`${x}-${y}`} x={x} y={y} width={1.02} height={1.02} fill="#1F1226" /> : null)))}
    </svg>
  );
};

/** Esquinas de oro alrededor del QR (como un visor de cámara). */
const EsquinasOro: React.FC = () => (
  <>
    {['left-0 top-0 border-l-2 border-t-2 rounded-tl-lg', 'right-0 top-0 border-r-2 border-t-2 rounded-tr-lg', 'left-0 bottom-0 border-l-2 border-b-2 rounded-bl-lg', 'right-0 bottom-0 border-r-2 border-b-2 rounded-br-lg'].map((c) => (
      <span key={c} className={`absolute h-5 w-5 border-[#C9A45C] ${c}`} />
    ))}
  </>
);

export const PantallaQr: React.FC = () => {
  const reducir = useReducedMotion();
  return (
    <div className="relative h-full overflow-hidden bg-[#FBFAFC]">
      <img src="/vanesev/hero-atelier.jpg" alt="" className="absolute inset-x-0 top-0 h-[52%] w-full object-cover object-[70%_center]" />
      <div className="absolute inset-x-0 top-0 h-[52%]" style={{ background: 'linear-gradient(180deg, rgba(20,11,25,0.05) 0%, rgba(251,250,252,0) 50%, #FBFAFC 100%)' }} />
      <div className="absolute inset-x-3 top-[24%] rounded-[22px] bg-white/95 px-4 pb-4 pt-3.5 text-center shadow-[0_24px_50px_-24px_rgba(20,11,25,0.55)] ring-1 ring-[#C9A45C]/40 backdrop-blur">
        <p className="font-lujo text-[17px] leading-none text-[#1A1020]">Estudio Ámbar</p>
        <p className="mt-1 text-[8px] font-semibold uppercase tracking-[0.28em] text-[#8A6A2E]">Carta · Reservas · VIP</p>
        <div className="relative mx-auto mt-3 w-fit p-2.5">
          <EsquinasOro />
          <QrReal tam={104} />
          {!reducir && (
            <motion.span
              aria-hidden="true"
              className="absolute inset-x-1 h-[2px] rounded-full bg-[#C9A45C] shadow-[0_0_12px_2px_rgba(201,164,92,0.65)]"
              animate={{ top: ['10%', '88%', '10%'] }}
              transition={{ duration: 2.6, repeat: Infinity, ease: 'easeInOut' }}
            />
          )}
        </div>
        <p className="mt-2.5 text-[10px] text-[#6E6478]">Apunta con la cámara · reserva en 15 s</p>
      </div>
    </div>
  );
};

export const PantallaReserva: React.FC = () => (
  <div className="flex h-full flex-col bg-[#FBFAFC]">
    <div className="relative h-[34%] shrink-0 overflow-hidden" style={{ background: 'linear-gradient(135deg, #3E2050 0%, #1F1226 55%, #8A6A2E 130%)' }}>
      <span aria-hidden="true" className="absolute -right-4 -top-10 font-lujo text-[120px] leading-none text-[#C9A45C]/25">Á</span>
      <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, rgba(20,11,25,0) 40%, rgba(20,11,25,0.55) 100%)' }} />
      <p className="absolute bottom-2.5 left-3.5 font-lujo text-[17px] leading-none text-white">Lifting de pestañas</p>
      <span className="absolute right-3 top-3 rounded-full bg-white/90 px-2 py-0.5 text-[8px] font-semibold uppercase tracking-[0.18em] text-[#8A6A2E]">Oferta jueves</span>
    </div>
    <div className="flex flex-1 flex-col gap-2.5 px-3.5 pt-3">
      <p className="text-[9px] font-semibold uppercase tracking-[0.22em] text-[#6E6478]">Especialista</p>
      <div className="flex gap-2">
        {['Valentina', 'Marta', 'Ana'].map((x, i) => (
          <span key={x} className={`flex items-center gap-1.5 rounded-full py-1 pl-1 pr-2.5 text-[9px] font-semibold ${i === 0 ? 'bg-[#1F1226] text-white ring-1 ring-[#C9A45C]' : 'bg-white text-[#4A4150] ring-1 ring-[#E4E2EA]'}`}>
            <span className={`flex h-5 w-5 items-center justify-center rounded-full text-[8px] ${i === 0 ? 'bg-[#C9A45C] text-[#1F1226]' : 'bg-[#F4F2F7]'}`}>{x[0]}</span>
            {x}
          </span>
        ))}
      </div>
      <div className="grid grid-cols-3 gap-1.5">
        {['09:30', '10:30', '12:00', '15:00', '16:30', '18:00'].map((h) => (
          <span key={h} className={`rounded-xl py-1.5 text-center text-[10px] font-semibold ${h === '10:30' ? 'bg-[#1F1226] text-white shadow-[0_6px_14px_-8px_rgba(20,11,25,0.8)]' : 'bg-white text-[#1A1020] ring-1 ring-[#E4E2EA]'}`}>{h}</span>
        ))}
      </div>
      <div className="mt-auto mb-4 rounded-2xl bg-white p-3 text-[10px] ring-1 ring-[#C9A45C]/35">
        <div className="flex justify-between text-[#6E6478]"><span>Precio</span><span className="line-through">18,00 $</span></div>
        <div className="flex justify-between text-[#8A6A2E]"><span>Oferta jueves</span><span>−3,00 $</span></div>
        <div className="v-filete-oro my-1.5" />
        <div className="flex justify-between font-semibold text-[#1A1020]"><span>Total</span><span className="font-lujo text-[13px]">15,00 $</span></div>
      </div>
    </div>
  </div>
);

export const PantallaWhatsapp: React.FC = () => (
  <div className="flex h-full flex-col bg-[#F3EEE8]">
    <div className="flex items-center gap-2 bg-[#1F1226] px-3 pb-2.5 pt-11 text-white">
      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#C9A45C] font-lujo text-[11px] text-[#1F1226]">EÁ</span>
      <div className="leading-tight">
        <p className="text-[11px] font-semibold">Estudio Ámbar</p>
        <p className="text-[8px] text-[#EBDDB8]">en línea</p>
      </div>
    </div>
    <div className="flex flex-1 flex-col justify-end gap-2 px-2.5 pb-6" style={{ backgroundImage: 'radial-gradient(rgba(201,164,92,0.12) 1px, transparent 1px)', backgroundSize: '14px 14px' }}>
      <div className="ml-auto max-w-[86%] rounded-2xl rounded-br-md bg-white px-3 py-2 text-[10px] leading-relaxed text-[#1A1020] shadow-sm">
        Hola, quiero reservar <b>Lifting de pestañas</b> con Valentina el <b>jueves a las 10:30</b>.
        <span className="mt-1 block rounded-lg bg-[#F7F1E6] px-2 py-1 text-[9px] text-[#8A6A2E]">Total con oferta: 15,00 $</span>
        <span className="mt-0.5 block text-right text-[8px] text-[#8A6A2E]">10:24 ✓✓</span>
      </div>
      <div className="max-w-[80%] rounded-2xl rounded-bl-md bg-[#1F1226] px-3 py-2 text-[10px] leading-relaxed text-white shadow-sm">
        ¡Confirmada! Te esperamos el jueves a las 10:30. Te avisamos el día antes.
        <span className="mt-0.5 block text-right text-[8px] text-[#EBDDB8]">10:25</span>
      </div>
    </div>
  </div>
);

export const PantallaSellos: React.FC<{ progreso: MotionValue<number> }> = ({ progreso }) => {
  const quinto = useTransform(progreso, [0.8, 0.94], [0, 1]);
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 bg-[#FBFAFC] px-3.5">
      <div className="v-tarjeta-lujo w-full rounded-[20px] p-4 text-white">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[8px] font-semibold uppercase tracking-[0.28em] text-[#EBDDB8]">Pasaporte VIP</p>
            <p className="mt-1 font-lujo text-[18px] leading-none">Estudio Ámbar</p>
          </div>
          <span className="v-cifra v-cifra-oscura font-lujo text-[15px]">#001</span>
        </div>
        <div className="mt-4 flex justify-between">
          {[0, 1, 2, 3].map((i) => (
            <span key={i} className="flex h-8 w-8 items-center justify-center rounded-full bg-[#C9A45C]/15 text-[#EBDDB8] ring-1 ring-[#C9A45C]/70">
              <Award className="h-3.5 w-3.5" strokeWidth={1.5} />
            </span>
          ))}
          <motion.span style={{ scale: quinto, opacity: quinto }} className="flex h-8 w-8 items-center justify-center rounded-full text-[#1F1226]" >
            <span className="flex h-8 w-8 items-center justify-center rounded-full" style={{ background: 'linear-gradient(135deg,#F3E6C4,#C9A45C 55%,#9C7A3C)' }}>
              <Award className="h-3.5 w-3.5" strokeWidth={1.8} />
            </span>
          </motion.span>
        </div>
        <p className="mt-3 text-[9px] text-white/70">5 de 5 visitas</p>
      </div>
      <p className="font-lujo text-[19px] text-[#1A1020]">Tu premio te espera</p>
      <p className="-mt-3 text-[10px] text-[#6E6478]">Diseño de cejas de regalo</p>
    </div>
  );
};

const ANCHO_PANTALLA = 270;

export const PantallaAEscala: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const ref = useRef<HTMLDivElement | null>(null);
  const [caja, setCaja] = useState({ k: 1, alto: 570 });
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const medir = () => {
      const k = el.clientWidth / ANCHO_PANTALLA || 1;
      setCaja({ k, alto: el.clientHeight / k });
    };
    medir();
    const ro = new ResizeObserver(medir);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return (
    <div ref={ref} className="absolute inset-0 overflow-hidden">
      <div className="absolute left-0 top-0 origin-top-left" style={{ width: ANCHO_PANTALLA, height: caja.alto, transform: `scale(${caja.k})` }}>
        {children}
      </div>
    </div>
  );
};

export const UnDiaEnTuSalon: React.FC = () => {
  const reducir = useReducedMotion();
  const ref = useRef<HTMLElement | null>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end end'] });
  const p = useSpring(scrollYProgress, { stiffness: 90, damping: 22, mass: 0.4 });
  const [activa, setActiva] = useState(0);
  const total = ESCENAS.length;
  useMotionValueEvent(scrollYProgress, 'change', (v) => setActiva(Math.min(total - 1, Math.max(0, Math.floor(v * total)))));

  // Giro suave: el teléfono se presenta de frente y apenas se inclina (antes empezaba girado 26°).
  const rotY = useTransform(p, [0, 1], reducir ? [0, 0] : [-9, 9]);
  const rotX = useTransform(p, [0, 0.5, 1], reducir ? [0, 0, 0] : [4, 0, 3]);
  const escala = useTransform(p, [0, 0.5, 1], reducir ? [1, 1, 1] : [0.96, 1, 0.98]);
  const brillo = useTransform(p, [0, 1], ['-60%', '160%']);
  const pantallas = [<PantallaQr />, <PantallaReserva />, <PantallaWhatsapp />, <PantallaSellos progreso={scrollYProgress} />];
  const escena = ESCENAS[activa];

  // Los iconos llevan a su escena: el scroll nunca se siente «atascado».
  const irAEscena = (i: number) => {
    const el = ref.current;
    if (!el) return;
    const recorrido = el.offsetHeight - window.innerHeight;
    const arriba = el.getBoundingClientRect().top + window.scrollY;
    window.scrollTo({ top: arriba + recorrido * ((i + 0.5) / total), behavior: reducir ? 'auto' : 'smooth' });
  };

  return (
    <section ref={ref} id="un-dia" aria-label="Un día en tu estudio con VANESEV" className="relative h-[300vh] text-[#1A1020]" style={{ background: '#FBFAFC' }}>
      <div className="sticky top-0 flex h-[100svh] items-center overflow-hidden px-4 pt-20 pb-4 sm:px-6 lg:pt-16">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
          style={{ background: 'radial-gradient(60% 55% at 72% 45%, rgba(217,196,155,0.45) 0%, rgba(217,196,155,0) 70%), radial-gradient(50% 45% at 12% 85%, rgba(74,31,92,0.10) 0%, rgba(74,31,92,0) 70%)' }}
        />
        <div className="relative mx-auto grid w-full max-w-6xl items-center gap-5 lg:grid-cols-[1fr_1fr] lg:gap-16">
          {/* Texto de la escena activa: una sola a la vez, nunca dos superpuestas */}
          <div className="order-2 lg:order-1">
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#7D6438]">Un día en tu estudio</p>
            <div className="relative mt-2 sm:mt-3 min-h-[148px] sm:min-h-[200px]" aria-live="polite">
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={escena.etiqueta}
                  initial={reducir ? { opacity: 0 } : { opacity: 0, y: 14 }}
                  animate={reducir ? { opacity: 1 } : { opacity: 1, y: 0 }}
                  exit={reducir ? { opacity: 0 } : { opacity: 0, y: -10 }}
                  transition={{ duration: 0.32, ease: CURVA }}
                >
                  <p className="text-xs font-semibold text-[#6E6478]">{escena.etiqueta}</p>
                  <h2 className="mt-1.5 sm:mt-2 font-lujo text-[26px] sm:text-5xl font-semibold leading-[1.05] tracking-tight">{escena.titulo}</h2>
                  <p className="mt-2 sm:mt-3 max-w-md text-[13px] sm:text-base leading-relaxed text-[#4A4150]">{escena.texto}</p>
                </motion.div>
              </AnimatePresence>
            </div>
            {/* Progreso por escenas: también son botones */}
            <div className="mt-4 flex items-center gap-2">
              {ESCENAS.map((e, i) => {
                const Icono = e.icono;
                return (
                  <button
                    key={e.etiqueta}
                    type="button"
                    onClick={() => irAEscena(i)}
                    aria-label={e.etiqueta}
                    aria-current={i === activa ? 'step' : undefined}
                    className={`flex h-10 w-10 items-center justify-center rounded-full transition-all duration-500 cursor-pointer ${i === activa ? 'bg-[#1F1226] text-[#D9C49B] ring-1 ring-[#B89B6A] scale-110 shadow-[0_10px_24px_-10px_rgba(20,11,25,0.6)]' : 'bg-white text-[#6E6478] ring-1 ring-[#E4E2EA] hover:text-[#1A1020]'}`}
                  >
                    <Icono className="h-4 w-4" strokeWidth={1.5} />
                  </button>
                );
              })}
              <span className="ml-2 font-lujo text-sm text-[#8A6A2E]">{activa + 1} / {total}</span>
            </div>
          </div>

          {/* Teléfono en 3D */}
          <div className="order-1 lg:order-2 flex justify-center" style={{ perspective: '1400px' }}>
            <motion.div
              animate={reducir ? undefined : { y: [0, -8, 0] }}
              transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
              className="relative"
            >
            <div aria-hidden="true" className="pointer-events-none absolute inset-[-22%] rounded-full blur-3xl" style={{ background: 'radial-gradient(closest-side, rgba(201,164,92,0.45), rgba(74,31,92,0.12) 65%, transparent)' }} />
            <motion.div
              style={{ rotateY: rotY, rotateX: rotX, scale: escala, transformStyle: 'preserve-3d' }}
              className="relative h-[48svh] min-h-[300px] max-h-[600px] lg:h-[62svh] aspect-[9/17] lg:aspect-[9/19] rounded-[36px] lg:rounded-[44px] p-[3px] shadow-[0_50px_100px_-30px_rgba(20,11,25,0.55)] [background:linear-gradient(145deg,#F3E6C4,#9C7A3C_28%,#2A1A30_60%,#140B19)]"
            >
              <div className="relative h-full w-full overflow-hidden rounded-[33px] lg:rounded-[41px] bg-[#FBFAFC] ring-[5px] lg:ring-[6px] ring-[#140B19]">
                <AnimatePresence initial={false}>
                  <motion.div
                    key={activa}
                    initial={reducir ? { opacity: 0 } : { opacity: 0, scale: 1.04 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.4, ease: CURVA }}
                    className="absolute inset-0"
                  >
                    <PantallaAEscala>{pantallas[activa]}</PantallaAEscala>
                  </motion.div>
                </AnimatePresence>
                {/* Reflejo que barre la pantalla con el scroll */}
                <motion.div
                  aria-hidden="true"
                  style={{ left: brillo }}
                  className="pointer-events-none absolute top-0 z-10 h-full w-1/3 -skew-x-12 bg-gradient-to-r from-transparent via-white/25 to-transparent"
                />
              </div>
              <div className="absolute left-1/2 top-3 h-4 w-20 lg:h-5 lg:w-24 -translate-x-1/2 rounded-full bg-[#140B19]" />
            </motion.div>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
};

// ─── Botón magnético: se desplaza hacia el cursor unos píxeles (solo con ratón) ─
export const Magnetico: React.FC<{ children: React.ReactNode; fuerza?: number; className?: string }> = ({ children, fuerza = 0.28, className = '' }) => {
  const reducir = useReducedMotion();
  const x = useSpring(useMotionValue(0), { stiffness: 220, damping: 16, mass: 0.4 });
  const y = useSpring(useMotionValue(0), { stiffness: 220, damping: 16, mass: 0.4 });
  return (
    <motion.div
      className={`inline-flex ${className}`}
      style={{ x, y }}
      onMouseMove={(e) => {
        if (reducir) return;
        const r = e.currentTarget.getBoundingClientRect();
        x.set((e.clientX - (r.left + r.width / 2)) * fuerza);
        y.set((e.clientY - (r.top + r.height / 2)) * fuerza);
      }}
      onMouseLeave={() => {
        x.set(0);
        y.set(0);
      }}
    >
      {children}
    </motion.div>
  );
};

// ─── Tarjeta con inclinación 3D y brillo de champán que sigue al cursor ──────
export const TarjetaTilt: React.FC<{ children: React.ReactNode; className?: string; maximo?: number }> = ({ children, className = '', maximo = 7 }) => {
  const reducir = useReducedMotion();
  const rx = useSpring(useMotionValue(0), { stiffness: 160, damping: 18 });
  const ry = useSpring(useMotionValue(0), { stiffness: 160, damping: 18 });
  const [luz, setLuz] = useState<{ x: number; y: number } | null>(null);
  return (
    <div style={{ perspective: 1100 }} className="h-full">
      <motion.div
        className={`relative h-full ${className}`}
        style={{ rotateX: rx, rotateY: ry, transformStyle: 'preserve-3d' }}
        whileHover={reducir ? undefined : { y: -4 }}
        onMouseMove={(e) => {
          if (reducir) return;
          const r = e.currentTarget.getBoundingClientRect();
          const px = (e.clientX - r.left) / r.width;
          const py = (e.clientY - r.top) / r.height;
          ry.set((px - 0.5) * maximo * 2);
          rx.set(-(py - 0.5) * maximo * 2);
          setLuz({ x: px * 100, y: py * 100 });
        }}
        onMouseLeave={() => {
          rx.set(0);
          ry.set(0);
          setLuz(null);
        }}
      >
        {children}
        {luz && (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 rounded-[inherit]"
            style={{ background: `radial-gradient(420px circle at ${luz.x}% ${luz.y}%, rgba(217,196,155,0.22), transparent 55%)` }}
          />
        )}
      </motion.div>
    </div>
  );
};

// ─── Cifra que cuenta hasta su valor al entrar en pantalla ───────────────────
const CifraAnimada: React.FC<{ valor: number; prefijo?: string; sufijo?: string }> = ({ valor, prefijo = '', sufijo = '' }) => {
  const reducir = useReducedMotion();
  const [n, setN] = useState(reducir ? valor : 0);
  return (
    <motion.span
      viewport={{ once: true }}
      onViewportEnter={() => {
        if (reducir) return;
        const inicio = performance.now();
        const paso = (t: number) => {
          const k = Math.min(1, (t - inicio) / 1400);
          setN(Math.round(valor * (1 - Math.pow(1 - k, 3))));
          if (k < 1) requestAnimationFrame(paso);
        };
        requestAnimationFrame(paso);
      }}
    >
      {prefijo}
      {n.toLocaleString('es-ES')}
      {sufijo}
    </motion.span>
  );
};

// ─── «Tu panel de dueña»: el admin, en un marco de navegador vivo ────────────
// Agenda de ejemplo: franjas de 1 h desde las 9:00 (fila 0) hasta las 18:00 (fila 9).
const CITAS = [
  { dia: 0, ini: 0, dur: 2, t: 'Manicura rusa', q: 'Valentina', tono: 'ciruela' },
  { dia: 0, ini: 3, dur: 1, t: 'Cejas', q: 'Marta', tono: 'oro' },
  { dia: 0, ini: 6, dur: 2, t: 'Mechas', q: 'Ana', tono: 'obsidiana' },
  { dia: 1, ini: 1, dur: 2, t: 'Lifting', q: 'Ana', tono: 'oro' },
  { dia: 1, ini: 5, dur: 1, t: 'Pedicura', q: 'Laura', tono: 'ciruela' },
  { dia: 2, ini: 0, dur: 1, t: 'Cejas', q: 'Marta', tono: 'oro' },
  { dia: 2, ini: 2, dur: 3, t: 'Alisado', q: 'Sofía', tono: 'obsidiana' },
  { dia: 2, ini: 6, dur: 1, t: 'Diseño', q: 'Valentina', tono: 'ciruela' },
  { dia: 3, ini: 1, dur: 1, t: 'Diseño', q: 'Valentina', tono: 'ciruela' },
  { dia: 3, ini: 4, dur: 2, t: 'Maquillaje', q: 'Ana', tono: 'oro' },
  { dia: 4, ini: 0, dur: 2, t: 'Novias', q: 'Laura', tono: 'obsidiana' },
  { dia: 4, ini: 3, dur: 1, t: 'Cejas', q: 'Marta', tono: 'oro' },
  { dia: 4, ini: 5, dur: 2, t: 'Keratina', q: 'Sofía', tono: 'ciruela' },
];
const TONOS: Record<string, { fondo: string; borde: string; texto: string }> = {
  ciruela: { fondo: 'rgba(74,31,92,0.08)', borde: '#4A1F5C', texto: '#3A1748' },
  oro: { fondo: 'rgba(201,164,92,0.16)', borde: '#C9A45C', texto: '#6E5223' },
  obsidiana: { fondo: 'rgba(31,18,38,0.07)', borde: '#1F1226', texto: '#1A1020' },
};
const HORAS = ['9', '10', '11', '12', '13', '14', '15', '16', '17'];

export const AgendaSemanal: React.FC = () => {
  const reducir = useReducedMotion();
  const FILAS = 9;
  return (
    <div className="p-3 sm:p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-[9px] font-semibold uppercase tracking-[0.24em] text-[#8A6A2E]">Agenda</p>
          <p className="font-lujo text-[15px] sm:text-lg leading-tight text-[#1A1020]">3 – 7 de noviembre</p>
        </div>
        <div className="flex rounded-full bg-[#F4F2F7] p-0.5 text-[9px] font-semibold text-[#6E6478]">
          {['Día', 'Semana', 'Mes'].map((v) => (
            <span key={v} className={`rounded-full px-2.5 py-1 ${v === 'Semana' ? 'bg-white text-[#1A1020] shadow-sm ring-1 ring-[#C9A45C]/40' : ''}`}>{v}</span>
          ))}
        </div>
      </div>
      <div className="mb-3 grid grid-cols-3 gap-1.5">
        {[
          ['Hoy', '8 citas'],
          ['Ocupación', '82 %'],
          ['Caja', '1.240 $'],
        ].map(([k, v]) => (
          <div key={k} className="rounded-xl bg-[#FBFAFC] px-2 py-1.5 ring-1 ring-[#1A1020]/5">
            <p className="text-[8px] uppercase tracking-[0.16em] text-[#6E6478]">{k}</p>
            <p className="font-lujo text-[13px] text-[#1A1020]">{v}</p>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-[22px_repeat(5,1fr)] gap-x-1">
        <span />
        {['Lun', 'Mar', 'Mié', 'Jue', 'Vie'].map((d, i) => (
          <p key={d} className={`pb-1 text-center text-[8px] font-semibold uppercase tracking-[0.14em] ${i === 2 ? 'text-[#8A6A2E]' : 'text-[#6E6478]'}`}>{d}</p>
        ))}
        {/* Columna de horas */}
        <div className="relative" style={{ height: FILAS * 22 }}>
          {HORAS.map((h, i) => (
            <span key={h} className="absolute right-1 -translate-y-1/2 text-[7px] text-[#9A92A3]" style={{ top: i * 22 }}>{h}</span>
          ))}
        </div>
        {[0, 1, 2, 3, 4].map((dia) => (
          <div
            key={dia}
            className={`relative rounded-lg ${dia === 2 ? 'bg-[#C9A45C]/[0.06]' : ''}`}
            style={{ height: FILAS * 22, backgroundImage: 'linear-gradient(rgba(26,16,32,0.06) 1px, transparent 1px)', backgroundSize: '100% 22px' }}
          >
            {CITAS.filter((c) => c.dia === dia).map((c, i) => {
              const t = TONOS[c.tono];
              return (
                <motion.div
                  key={i}
                  initial={reducir ? { opacity: 0 } : { opacity: 0, x: -6 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.1 + (dia * 3 + i) * 0.05, duration: 0.45, ease: CURVA }}
                  className="absolute inset-x-[2px] overflow-hidden rounded-[6px] px-1 py-[3px]"
                  style={{ top: c.ini * 22 + 1, height: c.dur * 22 - 2, background: t.fondo, borderLeft: `2px solid ${t.borde}`, color: t.texto }}
                >
                  <p className="text-[7.5px] font-semibold leading-[1.15]">{c.t}</p>
                  {c.dur > 1 && <p className="text-[7px] leading-tight opacity-70">{c.q}</p>}
                </motion.div>
              );
            })}
            {dia === 2 && (
              <div className="absolute inset-x-0 z-10 flex items-center" style={{ top: 4.4 * 22 }}>
                <span className="h-1.5 w-1.5 rounded-full bg-[#C9A45C] shadow-[0_0_8px_2px_rgba(201,164,92,0.6)]" />
                <span className="h-px flex-1 bg-[#C9A45C]" />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export const PanelDeDuena: React.FC = () => {
  return (
    <section
      id="panel-duena"
      aria-label="Tu panel de dueña"
      className="relative overflow-hidden px-4 sm:px-6 py-20 sm:py-28"
      style={{ background: 'radial-gradient(70% 60% at 85% 20%, rgba(217,196,155,0.30) 0%, transparent 60%), #FBFAFC' }}
    >
      <div className="mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-[0.9fr_1.1fr]">
        <motion.div {...revelarSeccion}>
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#7D6438]">Tu panel de dueña</p>
          <h2 className="mt-4 font-lujo text-[38px] sm:text-5xl font-semibold leading-[1.02] tracking-tight text-[#1A1020]">
            Todo tu estudio, <span className="italic font-normal text-[#4A1F5C]">en una sola pantalla.</span>
          </h2>
          <p className="mt-5 max-w-md text-sm sm:text-base leading-relaxed text-[#4A4150]">
            La agenda de todo tu equipo, tu caja en dólares y bolívares, tus ofertas, cupones y tarjetas regalo, y tu kit con QR. Lo que ves funciona hoy: no es una maqueta.
          </p>
          <dl className="mt-8 grid max-w-md grid-cols-3 gap-4 border-t border-[#1A1020]/10 pt-6">
            <div>
              <dt className="font-lujo text-3xl font-semibold text-[#1A1020]"><CifraAnimada valor={38} /></dt>
              <dd className="text-[11px] font-semibold text-[#6E6478]">Citas esta semana</dd>
            </div>
            <div>
              <dt className="font-lujo text-3xl font-semibold text-[#4A1F5C]"><CifraAnimada valor={1240} prefijo="$" /></dt>
              <dd className="text-[11px] font-semibold text-[#6E6478]">Caja de la semana</dd>
            </div>
            <div>
              <dt className="font-lujo text-3xl font-semibold text-[#1A1020]">0 %</dt>
              <dd className="text-[11px] font-semibold text-[#6E6478]">Comisión por cita</dd>
            </div>
          </dl>
        </motion.div>

        <TarjetaTilt maximo={5} className="rounded-[22px]">
          <div className="overflow-hidden rounded-[22px] border border-[#1A1020]/10 bg-white shadow-[0_50px_100px_-40px_rgba(20,11,25,0.45)]">
            <div className="flex items-center gap-2 border-b border-[#1A1020]/8 bg-[#F4F2F7] px-4 py-2.5">
              <span className="h-2.5 w-2.5 rounded-full bg-[#E4E2EA]" />
              <span className="h-2.5 w-2.5 rounded-full bg-[#E4E2EA]" />
              <span className="h-2.5 w-2.5 rounded-full bg-[#E4E2EA]" />
              <span className="ml-3 flex-1 truncate rounded-full bg-white px-3 py-1 text-[10px] text-[#6E6478]">vanesev.com/tu-salon/admin</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-[120px_1fr]">
              <div className="hidden sm:block space-y-1 border-r border-[#1A1020]/8 bg-[#FBFAFC] p-3 text-[10px] font-semibold text-[#6E6478]">
                {['Inicio', 'Agenda', 'Servicios', 'Ofertas', 'Cupones', 'Clientas', 'Caja'].map((m, i) => (
                  <div key={m} className={`rounded-lg px-2 py-1.5 ${i === 1 ? 'bg-[#1F1226] text-[#EBDDB8] ring-1 ring-[#C9A45C]/50' : ''}`}>{m}</div>
                ))}
              </div>
              <AgendaSemanal />
            </div>
          </div>
        </TarjetaTilt>
      </div>
    </section>
  );
};
