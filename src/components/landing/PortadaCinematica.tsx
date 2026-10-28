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
import { ArrowRight, ArrowUpRight, Award, BellRing, CalendarCheck, Check, ChevronDown, Gift, Lock, MessageCircle, Minus, Percent, Plus, QrCode, Palette, Users, Wallet, X } from 'lucide-react';
import { AgendaSemanal, PantallaAEscala, PantallaQr, PantallaReserva, PantallaWhatsapp } from './EfectosPremium';

/*
 * Portada cinematográfica de vanesev.com (G-047: Fraunces + Manrope; G-048: fotos de banco libre).
 * Cada sección tiene su propio movimiento ligado al scroll; nada de tarjetas apiladas.
 * Todo respeta prefers-reduced-motion: sin giros ni desplazamientos, solo opacidad.
 */

const CURVA: [number, number, number, number] = [0.22, 1, 0.36, 1];
const F = '/vanesev/fotos/';
const WHATSAPP = 'https://wa.me/584223794800';

export const Foto: React.FC<{ src: string; alt?: string; className?: string; eager?: boolean }> = ({ src, alt = '', className = '', eager }) => (
  <img src={F + src + '.webp'} alt={alt} loading={eager ? 'eager' : 'lazy'} decoding="async" className={className} />
);

export const Etiqueta: React.FC<{ children: React.ReactNode; oscuro?: boolean }> = ({ children, oscuro }) => (
  <p className={`flex items-center gap-3 text-[11px] font-bold uppercase tracking-[0.3em] ${oscuro ? 'text-[#D9C49B]' : 'text-[#7D6438]'}`}>
    <span className={`h-px w-8 ${oscuro ? 'bg-[#C9A45C]' : 'bg-[#B89B6A]'}`} />
    {children}
  </p>
);

// ─── Barra de progreso de lectura (oro) ──────────────────────────────────────
const BarraProgreso: React.FC = () => {
  const { scrollYProgress } = useScroll();
  const x = useSpring(scrollYProgress, { stiffness: 120, damping: 24, mass: 0.3 });
  return <motion.div aria-hidden="true" style={{ scaleX: x }} className="fixed inset-x-0 top-0 z-[60] h-[3px] origin-left bg-gradient-to-r from-[#9C7A3C] via-[#EBD9AE] to-[#C9A45C]" />;
};

// ─── 1. Portada: arco con la foto propia, titular y avisos en vivo ───────────
const AVISOS = [
  { icono: CalendarCheck, t: 'Nueva reserva', d: 'Lifting de pestañas · jueves 10:30' },
  { icono: Award, t: 'Sello VIP 4 de 5', d: 'Camila vuelve el sábado' },
  { icono: MessageCircle, t: 'Confirmada por WhatsApp', d: 'Manicura rusa con Valentina' },
  { icono: CalendarCheck, t: 'Reservó a las 23:48', d: 'Mientras tú dormías' },
];

const AvisosEnVivo: React.FC = () => {
  const reducir = useReducedMotion();
  const [i, setI] = useState(0);
  useEffect(() => {
    if (reducir) return;
    const t = window.setInterval(() => setI((n) => (n + 1) % AVISOS.length), 2800);
    return () => window.clearInterval(t);
  }, [reducir]);
  const a = AVISOS[i];
  const Icono = a.icono;
  return (
    <div className="relative h-[68px] w-[min(300px,82vw)]" aria-live="polite">
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.div
          key={i}
          initial={{ opacity: 0, y: -26, scale: 0.92 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 18, scale: 0.94, filter: 'blur(4px)' }}
          transition={{ type: 'spring', stiffness: 260, damping: 24 }}
          className="absolute inset-0 flex items-center gap-3 rounded-[22px] border border-white/15 bg-white/12 px-3.5 text-white shadow-[0_20px_50px_-20px_rgba(0,0,0,0.6)] backdrop-blur-xl"
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#F3E6C4] via-[#C9A45C] to-[#9C7A3C] text-[#1F1226]">
            <Icono className="h-[18px] w-[18px]" strokeWidth={1.8} />
          </span>
          <span className="min-w-0">
            <span className="block text-[13px] font-bold leading-tight">{a.t}</span>
            <span className="block truncate text-[12px] text-white/70">{a.d}</span>
          </span>
          <span className="ml-auto self-start pt-3 text-[10px] text-white/50">ahora</span>
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

const Portada: React.FC<{ onPlaza: () => void }> = ({ onPlaza }) => {
  const reducir = useReducedMotion();
  const ref = useRef<HTMLElement | null>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end start'] });
  // Al bajar: la foto se hunde dentro del arco y el arco se acerca un poco.
  const yFoto = useTransform(scrollYProgress, [0, 1], ['0%', reducir ? '0%' : '18%']);
  const escalaArco = useTransform(scrollYProgress, [0, 1], [1, reducir ? 1 : 1.08]);
  const yTexto = useTransform(scrollYProgress, [0, 1], ['0%', reducir ? '0%' : '-30%']);
  const opTexto = useTransform(scrollYProgress, [0, 0.55], [1, 0]);

  const linea1 = 'Tu talento merece una agenda llena.'.split(' ');
  const linea2 = 'Y una marca que no se confunda con nadie.'.split(' ');
  // Arco (como los espejos del estudio): se abre de abajo arriba al cargar.
  const ARCO = 'polygon(0 0, 100% 0, 100% 100%, 0 100%)';

  return (
    <section ref={ref} id="inicio" className="relative min-h-[100svh] overflow-hidden bg-[#140B19] text-white">
      {/* Halos de color detrás del arco */}
      <div aria-hidden="true" className="pointer-events-none absolute -right-32 top-10 h-[620px] w-[620px] rounded-full blur-3xl" style={{ background: 'radial-gradient(circle, rgba(201,164,92,0.28), transparent 68%)' }} />
      <div aria-hidden="true" className="pointer-events-none absolute -left-40 bottom-0 h-[520px] w-[520px] rounded-full blur-3xl" style={{ background: 'radial-gradient(circle, rgba(122,62,140,0.45), transparent 70%)' }} />

      <div className="relative mx-auto grid min-h-[100svh] max-w-6xl items-center gap-8 px-5 pb-12 pt-24 sm:px-8 lg:grid-cols-[1fr_0.9fr] lg:gap-14 lg:pb-16 lg:pt-28">
        {/* El arco con la foto */}
        <motion.div style={{ scale: escalaArco }} className="relative mx-auto w-[74vw] max-w-[440px] lg:order-2 lg:w-full">
          <motion.div
            initial={reducir ? { opacity: 0 } : { clipPath: 'inset(100% 0% 0% 0% round 999px 999px 28px 28px)' }}
            animate={reducir ? { opacity: 1 } : { clipPath: 'inset(0% 0% 0% 0% round 999px 999px 28px 28px)' }}
            transition={{ duration: 1.6, ease: CURVA, delay: 0.15 }}
            className="relative aspect-[3/4] overflow-hidden rounded-t-full rounded-b-[28px] bg-[#2A1236] shadow-[0_60px_120px_-40px_rgba(0,0,0,0.9)] lg:aspect-[4/5]"
            style={{ clipPath: reducir ? ARCO : undefined }}
          >
            <motion.div
              style={{ y: yFoto }}
              initial={reducir ? false : { scale: 1.35 }}
              animate={reducir ? undefined : { scale: 1.06 }}
              transition={{ duration: 3.2, ease: CURVA, delay: 0.15 }}
              className="absolute -inset-y-[10%] inset-x-0"
            >
              <Foto src="pelo-salon" alt="Estilista peinando a una clienta frente a un espejo en arco" eager className="h-full w-full object-cover object-[50%_35%]" />
            </motion.div>
            {/* Viñeteado para que la foto no compita con el texto */}
            <div aria-hidden="true" className="absolute inset-0" style={{ background: 'linear-gradient(180deg, rgba(20,11,25,0) 55%, rgba(20,11,25,0.55) 100%)' }} />
            <div aria-hidden="true" className="v-reflejo pointer-events-none absolute inset-0" />
          </motion.div>
          {/* Filete de oro que dibuja el arco */}
          <svg aria-hidden="true" viewBox="0 0 300 400" preserveAspectRatio="none" className="pointer-events-none absolute -inset-3 h-[calc(100%+24px)] w-[calc(100%+24px)] lg:hidden">
            <motion.path
              d="M6 394 L6 150 A144 144 0 0 1 294 150 L294 394"
              fill="none"
              stroke="url(#oroArco)"
              strokeWidth="1.2"
              vectorEffect="non-scaling-stroke"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 2.2, ease: CURVA, delay: 0.9 }}
            />
            <defs>
              <linearGradient id="oroArco" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0" stopColor="#F3E6C4" />
                <stop offset="0.5" stopColor="#C9A45C" />
                <stop offset="1" stopColor="#8A6A2E" />
              </linearGradient>
            </defs>
          </svg>
          <svg aria-hidden="true" viewBox="0 0 400 500" preserveAspectRatio="none" className="pointer-events-none absolute -inset-4 hidden h-[calc(100%+32px)] w-[calc(100%+32px)] lg:block">
            <motion.path
              d="M6 494 L6 200 A194 194 0 0 1 394 200 L394 494"
              fill="none"
              stroke="url(#oroArcoG)"
              strokeWidth="1.2"
              vectorEffect="non-scaling-stroke"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 2.2, ease: CURVA, delay: 0.9 }}
            />
            <defs>
              <linearGradient id="oroArcoG" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0" stopColor="#F3E6C4" />
                <stop offset="0.5" stopColor="#C9A45C" />
                <stop offset="1" stopColor="#8A6A2E" />
              </linearGradient>
            </defs>
          </svg>
          {/* Aviso en vivo apoyado en el arco */}
          <motion.div
            initial={{ opacity: 0, y: 20, x: 20 }}
            animate={{ opacity: 1, y: 0, x: 0 }}
            transition={{ delay: 1.6, duration: 0.8, ease: CURVA }}
            className="absolute -bottom-6 left-1/2 z-10 -translate-x-1/2 lg:-left-16 lg:bottom-16 lg:translate-x-0"
          >
            <AvisosEnVivo />
          </motion.div>
        </motion.div>

        {/* Texto, siempre sobre obsidiana: contraste máximo */}
        <motion.div style={{ y: yTexto, opacity: opTexto }} className="relative z-10 pt-6 lg:order-1 lg:pt-0">
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, ease: CURVA }}>
            <Etiqueta oscuro>Para uñas, pestañas, peluquería y estética</Etiqueta>
          </motion.div>
          <h1 className="mt-5 font-lujo text-[38px] font-medium leading-[1.03] tracking-[-0.02em] sm:text-6xl lg:text-[64px]">
            {[...linea1.map((w) => ({ w, acento: false })), ...linea2.map((w) => ({ w, acento: true }))].map(({ w, acento }, i) => (
              <span key={i} className="inline-block overflow-hidden pb-[0.1em] align-bottom">
                <motion.span
                  className={`mr-[0.24em] inline-block ${acento ? 'italic font-light text-[#E7CF9C]' : ''}`}
                  initial={reducir ? { opacity: 0 } : { y: '115%', rotate: 6, opacity: 0 }}
                  animate={reducir ? { opacity: 1 } : { y: '0%', rotate: 0, opacity: 1 }}
                  transition={{ duration: 0.9, ease: CURVA, delay: 0.5 + i * 0.055 }}
                >
                  {w}
                </motion.span>
              </span>
            ))}
          </h1>
          <motion.p initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.3, duration: 0.8, ease: CURVA }} className="mt-5 max-w-md text-[16px] leading-relaxed text-white/80 sm:text-lg">
            Tu carta con tu firma, reservas solas a cualquier hora y un Pasaporte VIP que las hace volver. Sin comisiones y sin contraseñas.
          </motion.p>
          <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.45, duration: 0.8, ease: CURVA }} className="mt-7 flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={onPlaza}
              className="v-brillo-boton group relative inline-flex items-center justify-center gap-2 overflow-hidden rounded-full px-7 py-4 text-[15px] font-bold text-[#1F1226] shadow-[0_18px_40px_-16px_rgba(201,164,92,0.8)] cursor-pointer"
              style={{ background: 'linear-gradient(115deg, #F3E6C4 0%, #C9A45C 50%, #EBD9AE 100%)' }}
            >
              Quiero mi plaza de fundadora
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" strokeWidth={2} />
            </button>
            <a href="#un-dia" className="inline-flex items-center justify-center gap-2 rounded-full border border-white/25 px-7 py-4 text-[15px] font-bold text-white hover:border-white/60">
              Ver cómo funciona
            </a>
          </motion.div>
          <motion.ul initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.7, duration: 0.8 }} className="mt-7 flex flex-wrap gap-x-5 gap-y-2 text-[13px] font-semibold text-white/65">
            {['0 % de comisión', 'Sin descargar nada', 'Precios en $ y Bs'].map((x) => (
              <li key={x} className="flex items-center gap-1.5">
                <Check className="h-3.5 w-3.5 text-[#C9A45C]" strokeWidth={2.4} />
                {x}
              </li>
            ))}
          </motion.ul>
        </motion.div>
      </div>
      <SigueBajando className="absolute bottom-5 left-1/2 z-10 hidden -translate-x-1/2 lg:flex" />
    </section>
  );
};

// ─── Cinta de especialidades ────────────────────────────────────────────────
const Cinta: React.FC = () => {
  const items = ['Uñas', 'Pestañas', 'Cejas', 'Peluquería', 'Color', 'Estética', 'Maquillaje', 'Spa', 'Barbería'];
  return (
    <div aria-hidden="true" className="relative overflow-hidden border-y border-[#C9A45C]/25 bg-[#140B19] py-5">
      <div className="v-lateral flex w-max gap-10 whitespace-nowrap">
        {[...items, ...items, ...items, ...items].map((x, i) => (
          <span key={i} className="flex items-center gap-10 font-lujo text-[28px] italic font-light text-[#E7CF9C] sm:text-4xl">
            {x}
            <span className="text-[14px] not-italic text-[#C9A45C]">✦</span>
          </span>
        ))}
      </div>
    </div>
  );
};

// ─── 2. Manifiesto: las palabras se encienden con el scroll ──────────────────
const Palabra: React.FC<{ p: MotionValue<number>; desde: number; hasta: number; acento?: boolean; children: string }> = ({ p, desde, hasta, acento, children }) => {
  const o = useTransform(p, [desde, hasta], [0.12, 1]);
  const y = useTransform(p, [desde, hasta], [8, 0]);
  return (
    <motion.span style={{ opacity: o, y }} className={`mr-[0.25em] inline-block ${acento ? 'italic text-[#4A1F5C]' : ''}`}>
      {children}
    </motion.span>
  );
};

const MANIFIESTO: { t: string; acento?: boolean }[] = [
  { t: 'Te ven en Instagram, les encanta tu trabajo y te escriben a medianoche.' },
  { t: 'Mientras contestas, reservan en otro sitio.', acento: true },
  { t: 'VANESEV contesta por ti: tu carta, tus huecos libres y tu precio, con tu marca. Tú solo creas.' },
];

const Manifiesto: React.FC = () => {
  const ref = useRef<HTMLElement | null>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start 0.8', 'end 0.55'] });
  const palabras = MANIFIESTO.flatMap((f) => f.t.split(' ').map((w) => ({ w, acento: !!f.acento })));
  const n = palabras.length;
  return (
    <section ref={ref} id="manifiesto" className="relative bg-[#FBFAFC] px-5 py-24 sm:px-8 sm:py-36">
      <div className="mx-auto max-w-4xl">
        <Etiqueta>Lo que te pasa cada día</Etiqueta>
        <p className="mt-6 font-lujo text-[30px] font-normal leading-[1.18] tracking-[-0.015em] text-[#1A1020] sm:text-5xl sm:leading-[1.12]">
          {palabras.map((x, i) => (
            <Palabra key={i} p={scrollYProgress} desde={i / n} hasta={Math.min(1, (i + 2) / n)} acento={x.acento}>
              {x.w}
            </Palabra>
          ))}
        </p>
      </div>
    </section>
  );
};

// ─── Indicador «sigue bajando»: se apaga en cuanto la persona empieza a bajar ─
export const SigueBajando: React.FC<{ oscuro?: boolean; texto?: string; className?: string }> = ({ oscuro = true, texto = 'Desliza hacia abajo', className = '' }) => {
  const reducir = useReducedMotion();
  const { scrollY } = useScroll();
  const [visible, setVisible] = useState(true);
  useMotionValueEvent(scrollY, 'change', (v) => setVisible(v < 60));
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 10 }}
          transition={{ delay: 1.8, duration: 0.6 }}
          className={`pointer-events-none flex flex-col items-center gap-2 ${oscuro ? 'text-white/80' : 'text-[#1A1020]/70'} ${className}`}
          aria-hidden="true"
        >
          <span className={`relative flex h-11 w-7 justify-center rounded-full border-2 ${oscuro ? 'border-white/60' : 'border-[#1A1020]/40'}`}>
            <motion.span
              className={`mt-2 h-2.5 w-1 rounded-full ${oscuro ? 'bg-[#E7CF9C]' : 'bg-[#7D6438]'}`}
              animate={reducir ? undefined : { y: [0, 14, 0], opacity: [1, 0.2, 1] }}
              transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
            />
          </span>
          <span className="text-[11px] font-bold uppercase tracking-[0.28em]">{texto}</span>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

/** Aviso dentro de una sección fijada: invita a seguir bajando mientras quede recorrido. */
const SeguirEnSeccion: React.FC<{ p: MotionValue<number>; hasta?: number; texto?: string }> = ({ p, hasta = 0.9, texto = 'Sigue bajando' }) => {
  const reducir = useReducedMotion();
  const o = useTransform(p, [0, 0.04, hasta - 0.06, hasta], [0.9, 1, 1, 0]);
  return (
    <motion.p style={{ opacity: o }} aria-hidden="true" className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.28em] text-[#E7CF9C]">
      <motion.span animate={reducir ? undefined : { y: [0, 5, 0] }} transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }} className="flex flex-col leading-none">
        <ChevronDown className="h-4 w-4" strokeWidth={2.2} />
        <ChevronDown className="-mt-2.5 h-4 w-4 opacity-50" strokeWidth={2.2} />
      </motion.span>
      {texto}
    </motion.p>
  );
};

// ─── Teléfono de gama alta: marco de titanio fino, isla dinámica y barra de estado ─
const MarcoTelefono: React.FC<{ children: React.ReactNode; className?: string; style?: React.CSSProperties }> = ({ children, className = '', style }) => (
  <div style={style} className={`v-tel-marco absolute inset-0 p-[2px] shadow-[0_60px_120px_-30px_rgba(0,0,0,0.75),0_0_0_1px_rgba(255,255,255,0.06)] [background:linear-gradient(150deg,#D9D6DC_0%,#8E8A94_18%,#3B3540_45%,#9D98A3_70%,#E9E6EC_100%)] ${className}`}>
    {/* Botones laterales */}
    <span className="absolute -left-[3px] top-[22%] h-[7%] w-[3px] rounded-l bg-[#8E8A94]" />
    <span className="absolute -left-[3px] top-[32%] h-[11%] w-[3px] rounded-l bg-[#8E8A94]" />
    <span className="absolute -right-[3px] top-[28%] h-[14%] w-[3px] rounded-r bg-[#8E8A94]" />
    <div className="v-tel-bisel relative h-full w-full overflow-hidden bg-black p-[4px]">
      <div className="v-tel-pantalla relative h-full w-full overflow-hidden bg-[#FBFAFC]">
        {children}
        {/* Barra de estado e isla dinámica */}
        <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex h-9 items-center justify-between px-6 text-[11px] font-bold text-white mix-blend-difference">
          <span>9:41</span>
          <span className="flex items-center gap-1">
            <span className="flex items-end gap-[2px]">{[4, 6, 8, 10].map((h) => <span key={h} className="w-[3px] rounded-sm bg-white" style={{ height: h }} />)}</span>
            <span className="ml-1 h-[10px] w-[20px] rounded-[3px] border border-white p-[1px]"><span className="block h-full w-[70%] rounded-[1px] bg-white" /></span>
          </span>
        </div>
        <span className="absolute left-1/2 top-[1.6%] z-30 h-[4.6%] w-[30%] -translate-x-1/2 rounded-full bg-black" />
        <div aria-hidden="true" className="v-reflejo pointer-events-none absolute inset-0 z-10" />
      </div>
    </div>
  </div>
);

/** Espalda del teléfono: vidrio ciruela, módulo de cámaras y monograma VANESEV grabado en oro. */
const EspaldaTelefono: React.FC<{ style?: React.CSSProperties }> = ({ style }) => (
  <div style={style} className="v-tel-marco absolute inset-0 p-[2px] [background:linear-gradient(150deg,#D9D6DC_0%,#8E8A94_18%,#3B3540_45%,#9D98A3_70%,#E9E6EC_100%)]">
    <div className="v-tel-bisel relative h-full w-full overflow-hidden" style={{ background: 'radial-gradient(120% 80% at 20% 0%, #5A2A6E 0%, #2A1236 45%, #140B19 100%)' }}>
      <span aria-hidden="true" className="absolute inset-0" style={{ background: 'linear-gradient(115deg, transparent 30%, rgba(255,255,255,0.12) 45%, transparent 60%)' }} />
      {/* Módulo de cámaras */}
      <div className="absolute left-[7%] top-[4%] grid h-[25%] w-[46%] grid-cols-2 gap-[6%] rounded-[24%] bg-white/[0.06] p-[6%] ring-1 ring-white/15 backdrop-blur">
        {[0, 1, 2].map((i) => (
          <span key={i} className="aspect-square rounded-full ring-[3px] ring-[#3B3540]" style={{ background: 'radial-gradient(circle at 35% 35%, #4A5A7A 0%, #0B0B12 55%, #000 100%)' }} />
        ))}
        <span className="m-auto h-[30%] w-[30%] rounded-full bg-[#F3E6C4]/80" />
      </div>
      {/* Monograma */}
      <div className="absolute inset-x-0 top-[48%] flex -translate-y-1/2 flex-col items-center">
        <span className="flex h-24 w-24 items-center justify-center rounded-full ring-1 ring-[#C9A45C]/70" style={{ boxShadow: 'inset 0 0 30px rgba(201,164,92,0.25)' }}>
          <span className="v-oro-texto font-lujo text-[58px] italic font-light leading-none">V</span>
        </span>
        <span className="mt-4 text-[12px] font-bold tracking-[0.55em] text-[#E7CF9C]">VANESEV</span>
        <span className="mt-1.5 text-[9px] font-semibold uppercase tracking-[0.3em] text-white/45">Tu marca · Tu agenda</span>
      </div>
    </div>
  </div>
);

// ─── 3. Un día en tu estudio: teléfono 3D que gira entre escenas ─────────────
const ESCENAS = [
  { icono: QrCode, foto: 'pelo-salon', titulo: 'Tu clienta escanea tu QR.', texto: 'En el espejo, en la recepción o en tu Instagram. Entra en tu mundo sin descargar nada.' },
  { icono: CalendarCheck, foto: 'clienta-movil', titulo: 'Reserva sola, mientras tú creas.', texto: 'Elige tratamiento, especialista y hora entre tus huecos libres de verdad.' },
  { icono: MessageCircle, foto: 'clienta-reserva', titulo: 'Te llega al WhatsApp, ya ordenada.', texto: 'Servicio, especialista, día, hora y precio en un solo mensaje. Confirmas con un toque.' },
  { icono: Award, foto: 'unas-arte', titulo: 'Y vuelve por su sello VIP.', texto: 'Su Pasaporte cuenta cada visita y le recuerda su premio. Tu clienta es tuya, no de una app.' },
];
const PALABRAS_FONDO = ['ESCANEA', 'RESERVA', 'CONFIRMA', 'VUELVE'];

const BarraHistoria: React.FC<{ p: MotionValue<number>; i: number; total: number }> = ({ p, i, total }) => {
  const w = useTransform(p, [i / total, (i + 1) / total], ['0%', '100%']);
  return (
    <span className="relative h-[3px] flex-1 overflow-hidden rounded-full bg-white/20">
      <motion.span style={{ width: w }} className="absolute inset-y-0 left-0 rounded-full bg-[#E7CF9C]" />
    </span>
  );
};

/** Pantalla del Pasaporte dentro del teléfono: la misma tarjeta que en su sección. */
const PantallaPasaporte: React.FC<{ p: MotionValue<number> }> = ({ p }) => (
  <div className="flex h-full flex-col bg-[#F7F2EA] px-3.5 pt-12">
    <p className="text-[9px] font-bold uppercase tracking-[0.28em] text-[#8A6A2E]">Mi Pasaporte</p>
    <p className="font-lujo text-[20px] leading-tight text-[#1A1020]">Hola, Camila</p>
    <div className="mt-3">
      <TarjetaVip p={p} desde={0.78} paso={0.04} compacta />
    </div>
    <div className="mt-3 rounded-2xl bg-white p-3 ring-1 ring-[#C9A45C]/30">
      <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-[#6E6478]">Tu próxima cita</p>
      <p className="mt-1 text-[12px] font-bold text-[#1A1020]">Manicura rusa · sáb 11:00</p>
      <p className="text-[10px] text-[#6E6478]">Con Valentina · Estudio Ámbar</p>
    </div>
  </div>
);

const UnDia: React.FC = () => {
  const reducir = useReducedMotion();
  const ref = useRef<HTMLElement | null>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end end'] });
  const p = useSpring(scrollYProgress, { stiffness: 80, damping: 22, mass: 0.5 });
  const [activa, setActiva] = useState(0);
  const total = ESCENAS.length;
  // La pantalla cambia justo cuando el teléfono enseña la espalda: el cambio no se ve.
  useMotionValueEvent(p, 'change', (v) => setActiva(v < 0.22 ? 0 : v < 0.47 ? 1 : v < 0.72 ? 2 : 3));

  const rotY = useTransform(p, [0, 0.19, 0.25, 0.44, 0.5, 0.69, 0.75, 1], reducir ? [0, 0, 0, 0, 0, 0, 0, 0] : [-14, 10, 346, 370, 706, 730, 1066, 1094]);
  const rotX = useTransform(p, [0, 0.5, 1], reducir ? [0, 0, 0] : [8, -4, 6]);
  const escala = useTransform(p, [0, 0.1, 0.9, 1], reducir ? [1, 1, 1, 1] : [0.86, 1, 1, 0.94]);
  const xFondo = useTransform(p, [0, 1], ['10%', '-60%']);

  const pantallas = [<PantallaQr key="qr" />, <PantallaReserva key="re" />, <PantallaWhatsapp key="wa" />, <PantallaPasaporte key="vip" p={scrollYProgress} />];
  const escena = ESCENAS[activa];

  const irAEscena = (i: number) => {
    const el = ref.current;
    if (!el) return;
    const recorrido = el.offsetHeight - window.innerHeight;
    const arriba = el.getBoundingClientRect().top + window.scrollY;
    window.scrollTo({ top: arriba + recorrido * ((i + 0.4) / total), behavior: reducir ? 'auto' : 'smooth' });
  };

  const cara: React.CSSProperties = { backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden' };

  return (
    <section ref={ref} id="un-dia" aria-label="Un día en tu estudio con VANESEV" className="relative h-[460vh] bg-[#140B19] text-white">
      <div className="sticky top-0 h-[100svh] overflow-hidden">
        <AnimatePresence initial={false}>
          <motion.div
            key={escena.foto}
            initial={{ opacity: 0, scale: 1.15 }}
            animate={{ opacity: 1, scale: 1.04 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.1, ease: CURVA }}
            className="absolute inset-0"
          >
            <Foto src={escena.foto} className="h-full w-full object-cover" />
          </motion.div>
        </AnimatePresence>
        <div aria-hidden="true" className="absolute inset-0" style={{ background: 'radial-gradient(70% 55% at 50% 42%, rgba(20,11,25,0.55) 0%, rgba(20,11,25,0.88) 70%), linear-gradient(180deg, rgba(20,11,25,0.6) 0%, rgba(20,11,25,0.3) 40%, #140B19 92%)' }} />
        <motion.p aria-hidden="true" style={{ x: xFondo }} className="pointer-events-none absolute top-[30%] whitespace-nowrap font-lujo text-[34vw] font-semibold italic leading-none text-transparent lg:top-[18%] lg:text-[22vw]">
          <span style={{ WebkitTextStroke: '1px rgba(231,207,156,0.28)' }}>{PALABRAS_FONDO.join(' · ')}</span>
        </motion.p>

        <div className="relative mx-auto flex h-full max-w-6xl flex-col px-5 pb-7 pt-24 sm:px-8 lg:grid lg:grid-cols-2 lg:items-center lg:gap-16 lg:pb-0 lg:pt-16">
          <div className="flex flex-1 items-center justify-center lg:order-2" style={{ perspective: '1600px' }}>
            <motion.div style={{ rotateY: rotY, rotateX: rotX, scale: escala, transformStyle: 'preserve-3d' }} className="relative h-[45svh] max-h-[640px] min-h-[300px] aspect-[9/19.3] lg:h-[68svh]">
              <MarcoTelefono style={cara}>
                <PantallaAEscala>{pantallas[activa]}</PantallaAEscala>
              </MarcoTelefono>
              <EspaldaTelefono style={{ ...cara, transform: 'rotateY(180deg)' }} />
            </motion.div>
          </div>

          <div className="relative lg:order-1">
            <div className="flex gap-1.5">
              {ESCENAS.map((_, i) => (
                <BarraHistoria key={i} p={p} i={i} total={total} />
              ))}
            </div>
            <div className="mt-4 flex items-center gap-2">
              {ESCENAS.map((e, i) => {
                const Icono = e.icono;
                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => irAEscena(i)}
                    aria-label={`Paso ${i + 1}: ${e.titulo}`}
                    aria-current={i === activa ? 'step' : undefined}
                    className={`flex h-9 w-9 items-center justify-center rounded-full transition-all duration-500 cursor-pointer ${i === activa ? 'scale-110 bg-gradient-to-br from-[#F3E6C4] via-[#C9A45C] to-[#9C7A3C] text-[#1F1226]' : 'bg-white/10 text-white/60 ring-1 ring-white/15'}`}
                  >
                    <Icono className="h-4 w-4" strokeWidth={1.8} />
                  </button>
                );
              })}
              <span className="ml-2 text-[12px] font-bold tracking-[0.2em] text-[#E7CF9C]">0{activa + 1} / 0{total}</span>
            </div>
            <div className="relative mt-4 min-h-[118px] sm:min-h-[170px]" aria-live="polite">
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={activa}
                  initial={reducir ? { opacity: 0 } : { opacity: 0, y: 24, filter: 'blur(6px)' }}
                  animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                  exit={reducir ? { opacity: 0 } : { opacity: 0, y: -16, filter: 'blur(6px)' }}
                  transition={{ duration: 0.45, ease: CURVA }}
                >
                  <h2 className="font-lujo text-[30px] font-medium leading-[1.05] tracking-[-0.02em] sm:text-5xl lg:text-6xl">{escena.titulo}</h2>
                  <p className="mt-3 max-w-md text-[15px] leading-relaxed text-white/75 sm:text-lg">{escena.texto}</p>
                </motion.div>
              </AnimatePresence>
            </div>
            <div className="mt-3">
              <SeguirEnSeccion p={p} hasta={0.9} texto="Sigue bajando para ver el siguiente paso" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

// ─── 4. Oficios: tarjetas que se apilan con el scroll (G-051) ────────────────
const OFICIOS = [
  { foto: 'unas-oscuras', nombre: 'Uñas', frase: 'Que elija diseño, largo y extras antes de llegar, y que tu mesa no se quede vacía.', servicios: [['Manicura rusa', '60 min', '18 $'], ['Esculpidas en gel', '90 min', '25 $'], ['Pedicura spa', '60 min', '20 $']] },
  { foto: 'pestanas-tecnica', nombre: 'Pestañas', frase: 'Cada técnica explicada antes de que pregunten: lifting, pelo a pelo o volumen.', servicios: [['Lifting + keratina', '60 min', '22 $'], ['Pelo a pelo', '120 min', '35 $'], ['Retoque de 15 días', '60 min', '18 $']] },
  { foto: 'cejas-laminado', nombre: 'Cejas', frase: 'Laminado, diseño y henna con su tiempo justo, sin huecos muertos en tu agenda.', servicios: [['Laminado de cejas', '50 min', '20 $'], ['Diseño con henna', '40 min', '15 $'], ['Depilación con hilo', '20 min', '8 $']] },
  { foto: 'pelo-salon', nombre: 'Peluquería', frase: 'Servicios de tres horas, sillón y lavacabezas reservados, sin cruces en la agenda.', servicios: [['Balayage + gloss', '180 min', '85 $'], ['Alisado orgánico', '150 min', '45 $'], ['Recogido de evento', '60 min', '25 $']] },
  { foto: 'estetica-facial', nombre: 'Estética', frase: 'Cada cabina y cada aparato con su propia agenda, y el historial de cada clienta.', servicios: [['Limpieza facial profunda', '60 min', '35 $'], ['Hidrafacial + LED', '60 min', '55 $'], ['Depilación láser', '30 min', '30 $']] },
  { foto: 'maquillaje-novia', nombre: 'Maquillaje', frase: 'Novias y eventos con la fecha reservada y la prueba incluida en la cita.', servicios: [['Maquillaje social', '75 min', '35 $'], ['Novia con prueba', '180 min', '120 $'], ['Clase de automaquillaje', '90 min', '40 $']] },
];

const TarjetaApilada: React.FC<{ o: (typeof OFICIOS)[number]; i: number; total: number; p: MotionValue<number> }> = ({ o, i, total, p }) => {
  const reducir = useReducedMotion();
  const escala = useTransform(p, [i / total, 1], [1, reducir ? 1 : 1 - (total - i) * 0.035]);
  const brillo = useTransform(p, [i / total, Math.min(1, (i + 1) / total)], [1, reducir ? 1 : 0.55]);
  const imagen = useTransform(p, [i / total, Math.min(1, (i + 1) / total)], [1.12, 1]);
  return (
    <div className="sticky top-0 flex h-[100svh] items-center justify-center px-4 sm:px-8">
      <motion.article
        style={{ scale: escala, top: `calc(${i * 14}px - 2svh)` }}
        className="relative h-[70svh] max-h-[640px] w-full max-w-5xl origin-top overflow-hidden rounded-[32px] bg-[#1F1226] shadow-[0_-20px_60px_-20px_rgba(20,11,25,0.55)] lg:grid lg:grid-cols-[1.1fr_1fr]"
      >
        <div className="absolute inset-0 overflow-hidden lg:relative">
          <motion.div style={{ scale: imagen, filter: useTransform(brillo, (b) => `brightness(${b})`) }} className="h-full w-full">
            <Foto src={o.foto} alt={o.nombre} className="h-full w-full object-cover" />
          </motion.div>
        </div>
        <div className="absolute inset-0 lg:hidden" style={{ background: 'linear-gradient(180deg, rgba(20,11,25,0) 30%, rgba(20,11,25,0.7) 58%, rgba(20,11,25,0.97) 100%)' }} />
        <div className="absolute inset-x-0 bottom-0 p-6 text-white sm:p-8 lg:relative lg:flex lg:flex-col lg:justify-center lg:p-12">
          <p className="text-[12px] font-bold tracking-[0.3em] text-[#E7CF9C]">0{i + 1} / 0{total}</p>
          <h3 className="mt-2 font-lujo text-[44px] font-medium leading-none tracking-[-0.02em] sm:text-6xl">{o.nombre}</h3>
          <p className="mt-3 max-w-md text-[15px] leading-snug text-white/75">{o.frase}</p>
          <ul className="mt-5 space-y-2 border-t border-white/15 pt-4">
            {o.servicios.map(([s, d, pr]) => (
              <li key={s} className="flex items-baseline justify-between gap-3 text-[15px]">
                <span className="text-white/90">
                  {s} <span className="text-[12px] text-white/45">· {d}</span>
                </span>
                <span className="font-lujo text-[18px] text-[#E7CF9C]">{pr}</span>
              </li>
            ))}
          </ul>
        </div>
      </motion.article>
    </div>
  );
};

const Oficios: React.FC = () => {
  const ref = useRef<HTMLDivElement | null>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end end'] });
  return (
    <section id="sectores" className="relative bg-[#F4F0EA]">
      <div className="mx-auto max-w-6xl px-5 pt-24 sm:px-8 sm:pt-32">
        <Etiqueta>Tu oficio</Etiqueta>
        <h2 className="mt-4 max-w-3xl font-lujo text-[42px] font-medium leading-[1] tracking-[-0.02em] text-[#1A1020] sm:text-6xl">
          Hecho para cómo <span className="italic font-light text-[#4A1F5C]">trabajas tú.</span>
        </h2>
        <p className="mt-5 max-w-md text-[16px] leading-relaxed text-[#4A4150]">Tu carta se adapta a tu especialidad, tus tiempos y tus precios. Baja y mira cada oficio.</p>
      </div>
      <div ref={ref} className="relative pb-[6svh]">
        {OFICIOS.map((o, i) => (
          <TarjetaApilada key={o.nombre} o={o} i={i} total={OFICIOS.length} p={scrollYProgress} />
        ))}
      </div>
    </section>
  );
};

// ─── 5. Tu equipo: rejilla viva (bento) ───────────────────────────────────────
const Equipo: React.FC = () => {
  const reducir = useReducedMotion();
  const ref = useRef<HTMLDivElement | null>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'center center'] });
  const rotX = useTransform(scrollYProgress, [0, 1], [reducir ? 0 : 32, 0]);
  const y = useTransform(scrollYProgress, [0, 1], [reducir ? 0 : 60, 0]);
  const especialistas = [
    { n: 'Valentina', o: 'Uñas', f: 'unas-arte' },
    { n: 'Marta', o: 'Cejas', f: 'cejas-laminado' },
    { n: 'Daniela', o: 'Peluquería', f: 'pelo-salon' },
  ];
  return (
    <section id="equipo" className="relative overflow-hidden bg-[#140B19] px-5 py-24 text-white sm:px-8 sm:py-32">
      <div aria-hidden="true" className="pointer-events-none absolute -right-40 top-0 h-[600px] w-[600px] rounded-full blur-3xl" style={{ background: 'radial-gradient(circle, rgba(201,164,92,0.22), transparent 70%)' }} />
      <div className="relative mx-auto max-w-6xl">
        <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.4 }} transition={{ duration: 0.8, ease: CURVA }}>
          <Etiqueta oscuro>Tu equipo</Etiqueta>
          <h2 className="mt-4 max-w-3xl font-lujo text-[40px] font-medium leading-[1.02] tracking-[-0.02em] sm:text-6xl">
            Un estudio no es una sola persona. <span className="italic font-light text-[#E7CF9C]">Tu sistema tampoco.</span>
          </h2>
        </motion.div>

        <div className="mt-12 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          {/* Agenda real, que se levanta al entrar */}
          <div ref={ref} className="col-span-2 lg:row-span-2" style={{ perspective: '1400px' }}>
            <motion.div style={{ rotateX: rotX, y, transformOrigin: '50% 100%' }} className="overflow-hidden rounded-[26px] bg-white text-[#1A1020] shadow-[0_50px_100px_-40px_rgba(0,0,0,0.8)] ring-1 ring-[#C9A45C]/40">
              <AgendaSemanal />
            </motion.div>
          </div>
          {/* Especialistas con su foto */}
          <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.7, ease: CURVA }} className="col-span-2 rounded-[26px] border border-white/10 bg-white/[0.04] p-5">
            <p className="font-lujo text-[22px] leading-tight">La clienta elige con quién.</p>
            <div className="mt-4 flex gap-3">
              {especialistas.map((e, i) => (
                <motion.div key={e.n} initial={{ opacity: 0, scale: 0.8 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} transition={{ delay: 0.15 * i, type: 'spring', stiffness: 200, damping: 18 }} className="flex-1 text-center">
                  <span className="mx-auto block aspect-square w-full max-w-[84px] overflow-hidden rounded-full ring-2 ring-[#C9A45C]/70 ring-offset-2 ring-offset-[#140B19]">
                    <Foto src={e.f} className="h-full w-full object-cover" />
                  </span>
                  <span className="mt-2 block text-[13px] font-bold">{e.n}</span>
                  <span className="block text-[11px] text-white/55">{e.o}</span>
                </motion.div>
              ))}
            </div>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.7, delay: 0.1, ease: CURVA }} className="flex flex-col justify-between rounded-[26px] border border-white/10 bg-white/[0.04] p-5">
            <Lock className="h-6 w-6 text-[#E7CF9C]" strokeWidth={1.6} />
            <p className="mt-6 text-[15px] font-bold leading-snug">Cada una, su clave.</p>
            <p className="mt-1 text-[13px] leading-snug text-white/60">Ve su día. Tu caja, solo tú.</p>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.7, delay: 0.2, ease: CURVA }} className="flex flex-col justify-between rounded-[26px] p-5 text-[#1F1226]" style={{ background: 'linear-gradient(135deg, #F3E6C4 0%, #C9A45C 60%, #9C7A3C 100%)' }}>
            <Users className="h-6 w-6" strokeWidth={1.6} />
            <p className="mt-6 font-lujo text-[44px] font-medium leading-none">3 + 3</p>
            <p className="mt-1 text-[13px] font-semibold leading-snug">personas y cabinas incluidas</p>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

// ─── 6. Tu marca: la carta cambia de estilo en vivo ──────────────────────────
const ESTILOS = [
  { n: 'Champán', lienzo: '#F4ECDF', fondo: '#FBF7F0', tinta: '#2A2018', acento: '#B08A4E', suave: '#F1E7D6', foto: 'unas-nude', letra: "'Fraunces', Georgia, serif" },
  { n: 'Rosa cashmere', lienzo: '#F8E9EC', fondo: '#FCF5F6', tinta: '#3A1F27', acento: '#B0607A', suave: '#F6E3E8', foto: 'unas-rosa', letra: "'Bodoni Moda', Georgia, serif" },
  { n: 'Oliva', lienzo: '#E8EDE3', fondo: '#F5F6F0', tinta: '#1F2A22', acento: '#5E7A62', suave: '#E4EADF', foto: 'estetica-bodegon', letra: "'Plus Jakarta Sans', sans-serif" },
  { n: 'Ciruela', lienzo: '#EFE5F3', fondo: '#F8F4FA', tinta: '#24122C', acento: '#6E2F84', suave: '#ECE0F1', foto: 'pestanas-mirada', letra: "'Fraunces', Georgia, serif" },
  { n: 'Noir', lienzo: '#EDE6DD', fondo: '#151214', tinta: '#F4EEE6', acento: '#C9A45C', suave: '#262024', foto: 'unas-oscuras', letra: "'Bodoni Moda', Georgia, serif" },
];

const TuMarca: React.FC = () => {
  const reducir = useReducedMotion();
  const [i, setI] = useState(0);
  const [tocado, setTocado] = useState(false);
  useEffect(() => {
    if (reducir || tocado) return;
    const t = window.setInterval(() => setI((n) => (n + 1) % ESTILOS.length), 2600);
    return () => window.clearInterval(t);
  }, [reducir, tocado]);
  const e = ESTILOS[i];
  const transicion = 'background-color .7s ease, color .7s ease, border-color .7s ease';
  return (
    <section id="personalizador" className="relative overflow-hidden px-5 py-24 sm:px-8 sm:py-32" style={{ background: e.lienzo, transition: transicion }}>
      <div className="mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-2">
        <div>
          <Etiqueta>Tu marca</Etiqueta>
          <h2 className="mt-4 font-lujo text-[40px] font-medium leading-[1.02] tracking-[-0.02em] text-[#1A1020] sm:text-6xl">
            Tu carta no se parece <span className="italic font-light text-[#4A1F5C]">a la de nadie.</span>
          </h2>
          <p className="mt-5 max-w-md text-[16px] leading-relaxed text-[#4A4150]">Tus colores, tus letras y tus fotos. Toca un estilo y mira cómo cambia: lo mismo haces tú desde tu panel, cuando quieras.</p>
          <div className="mt-8 flex flex-wrap gap-3" role="radiogroup" aria-label="Estilo de la carta">
            {ESTILOS.map((x, k) => (
              <button
                key={x.n}
                type="button"
                role="radio"
                aria-checked={k === i}
                onClick={() => {
                  setTocado(true);
                  setI(k);
                }}
                className={`flex items-center gap-2 rounded-full py-1.5 pl-1.5 pr-4 text-[13px] font-bold transition-all cursor-pointer ${k === i ? 'bg-[#1F1226] text-white shadow-lg' : 'bg-white/80 text-[#1A1020] ring-1 ring-[#1A1020]/10'}`}
              >
                <span className="h-7 w-7 rounded-full ring-2 ring-white" style={{ background: `linear-gradient(135deg, ${x.acento}, ${x.suave})` }} />
                {x.n}
              </button>
            ))}
          </div>
        </div>

        {/* Teléfono con la carta en el estilo elegido */}
        <div className="flex justify-center" style={{ perspective: '1400px' }}>
          <motion.div
            initial={reducir ? { opacity: 0 } : { opacity: 0, rotateY: -30, y: 60 }}
            whileInView={{ opacity: 1, rotateY: -8, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 1.1, ease: CURVA }}
            style={{ transformStyle: 'preserve-3d' }}
            className="v-tel-marco relative h-[560px] w-[272px] p-[2px] shadow-[0_60px_120px_-40px_rgba(20,11,25,0.6)] [background:linear-gradient(145deg,#F3E6C4,#9C7A3C_30%,#2A1A30_62%,#140B19)]"
          >
            <div className="v-tel-pantalla relative h-full w-full overflow-hidden ring-[4px] ring-black" style={{ background: e.fondo, color: e.tinta, transition: transicion }}>
              <AnimatePresence initial={false}>
                <motion.div key={e.foto} initial={{ opacity: 0, scale: 1.1 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.7 }} className="absolute inset-x-0 top-0 h-[200px]">
                  <Foto src={e.foto} className="h-full w-full object-cover" />
                  <div className="absolute inset-0" style={{ background: `linear-gradient(180deg, transparent 40%, ${e.fondo})` }} />
                </motion.div>
              </AnimatePresence>
              <div className="relative px-5 pt-[150px]">
                <p className="text-[30px] leading-none" style={{ fontFamily: e.letra, transition: transicion }}>Estudio Ámbar</p>
                <p className="mt-1.5 text-[9px] font-bold uppercase tracking-[0.3em]" style={{ color: e.acento }}>Carta · Reservas · VIP</p>
                <div className="mt-5 space-y-2">
                  {[['Manicura rusa', '60 min', '18 $'], ['Lifting de pestañas', '60 min', '22 $'], ['Diseño de cejas', '40 min', '15 $']].map(([s, d, pr], k) => (
                    <div key={s} className="flex items-center justify-between rounded-2xl px-3 py-2.5" style={{ background: k === 0 ? e.acento : e.suave, color: k === 0 ? '#fff' : e.tinta, transition: transicion }}>
                      <span>
                        <span className="block text-[13px] font-bold">{s}</span>
                        <span className="block text-[10px] opacity-70">{d}</span>
                      </span>
                      <span className="text-[16px]" style={{ fontFamily: e.letra }}>{pr}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-4 rounded-full py-3 text-center text-[13px] font-bold text-white" style={{ background: e.tinta === '#F4EEE6' ? e.acento : e.tinta, transition: transicion }}>
                  Reservar ahora
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

// ─── 7. Calculadora y comparativa: «Deja de regalar tus clientas a las apps» ─
const Numero: React.FC<{ valor: number }> = ({ valor }) => {
  const reducir = useReducedMotion();
  const [n, setN] = useState(valor);
  const anterior = useRef(valor);
  useEffect(() => {
    if (reducir) {
      setN(valor);
      return;
    }
    const desde = anterior.current;
    anterior.current = valor;
    const inicio = performance.now();
    let id = 0;
    const paso = (t: number) => {
      const k = Math.min(1, (t - inicio) / 500);
      setN(Math.round(desde + (valor - desde) * (1 - Math.pow(1 - k, 3))));
      if (k < 1) id = requestAnimationFrame(paso);
    };
    id = requestAnimationFrame(paso);
    return () => cancelAnimationFrame(id);
  }, [valor, reducir]);
  return <>{n.toLocaleString('es-ES')}</>;
};

const Deslizador: React.FC<{ etiqueta: string; valor: number; min: number; max: number; sufijo: string; onChange: (v: number) => void }> = ({ etiqueta, valor, min, max, sufijo, onChange }) => (
  <label className="block">
    <span className="flex items-baseline justify-between text-[14px] font-bold text-white/80">
      {etiqueta}
      <span className="font-lujo text-[22px] text-white">
        {valor}
        {sufijo}
      </span>
    </span>
    <input type="range" min={min} max={max} value={valor} onChange={(ev) => onChange(Number(ev.target.value))} className="v-rango mt-3 w-full" />
  </label>
);

const COLUMNAS_COMPARA = ['Apps de reservas', 'Instagram y WhatsApp a mano', 'VANESEV'];
const FILAS_COMPARA: { t: string; icono: React.ElementType; v: [string, string, string]; pronto?: boolean }[] = [
  { t: 'Comisión por tus clientas', icono: Percent, v: ['Por cada clienta nueva', 'Ninguna', 'Nunca. Cuota fija'] },
  { t: 'De quién son tus clientas', icono: Users, v: ['Del directorio, junto a tu competencia', 'Tuyas, perdidas entre chats', 'Tuyas, con su historial y sus sellos'] },
  { t: 'Tu marca', icono: Palette, v: ['Plantilla igual para todas', 'Tu perfil, sin carta', 'Carta con tus colores, letras y fotos'] },
  { t: 'Reservas a cualquier hora', icono: CalendarCheck, v: ['Sí', 'Solo cuando contestas', 'Sí, con tus huecos reales y sin cruces'] },
  { t: 'Precios en $ y Bs', icono: Wallet, v: ['No', 'Rehaces el PDF cada día', 'Al día y al instante'] },
  { t: 'Tu equipo', icono: Lock, v: ['Pagas por cada una', 'Un solo móvil para todas', 'Agenda y clave por especialista'] },
  { t: 'Ofertas y tarjetas regalo', icono: Gift, v: ['Limitadas', 'A mano, con errores', 'Precio exacto y saldo automático'] },
  { t: 'Motivo para volver', icono: Award, v: ['Ninguno', 'Tarjeta de cartulina', 'Pasaporte VIP en su móvil'] },
  { t: 'Recordatorios de cita', icono: BellRing, v: ['Sí', 'Tú, una a una', 'Automáticos desde tu WhatsApp'], pronto: true },
];

export const Comparativa: React.FC = () => {
  const [ticket, setTicket] = useState(25);
  const [perdidas, setPerdidas] = useState(5);
  const mes = ticket * perdidas * 4;
  return (
    <section id="comparativa" className="relative overflow-hidden px-5 py-24 text-white sm:px-8 sm:py-32" style={{ background: 'radial-gradient(90% 70% at 100% 0%, rgba(122,62,140,0.5) 0%, transparent 60%), #1F1226' }}>
      <div className="relative mx-auto max-w-6xl">
        <div className="grid gap-12 lg:grid-cols-[1fr_1fr] lg:items-end lg:gap-20">
          <div>
            <Etiqueta oscuro>Haz la cuenta</Etiqueta>
            <h2 className="mt-4 font-lujo text-[40px] font-medium leading-[1.02] tracking-[-0.02em] sm:text-6xl">
              Deja de regalar tus clientas <span className="italic font-light text-[#E7CF9C]">a las apps.</span>
            </h2>
            <p className="mt-5 max-w-md text-[16px] leading-relaxed text-white/70">Cada mensaje que contestas tarde es una cita que se va a otro sitio. Mueve los valores y mira cuánto es en tu caso.</p>
          </div>
          <div className="space-y-7 rounded-[28px] border border-white/10 bg-white/[0.05] p-6 backdrop-blur sm:p-8">
            <Deslizador etiqueta="Precio medio de tu servicio" valor={ticket} min={8} max={120} sufijo=" $" onChange={setTicket} />
            <Deslizador etiqueta="Clientas que se te escapan a la semana" valor={perdidas} min={1} max={20} sufijo="" onChange={setPerdidas} />
            <div className="border-t border-white/10 pt-6">
              <p className="text-[14px] font-semibold text-white/70">Lo que dejas de facturar al mes</p>
              <p className="mt-1 font-lujo text-[64px] font-medium leading-none text-[#E7CF9C] sm:text-[80px]">
                <Numero valor={mes} /> $
              </p>
              <p className="mt-3 text-[15px] text-white/75">
                VANESEV te cuesta <b className="text-white">19 $ al mes</b>. Con recuperar una sola clienta, ya se paga.
              </p>
            </div>
          </div>
        </div>

        {/* Comparativa: tabla en escritorio, fichas en el móvil */}
        <div className="mt-20">
          <h3 className="font-lujo text-[30px] font-medium leading-tight sm:text-4xl">Lo mismo que ya haces, comparado sin rodeos.</h3>
          <div className="mt-8 hidden overflow-hidden rounded-[28px] border border-white/10 lg:block">
            <div className="grid grid-cols-[1.1fr_1fr_1fr_1.2fr] bg-white/[0.04] text-[12px] font-bold uppercase tracking-[0.18em]">
              <span className="p-5 text-white/40" />
              {COLUMNAS_COMPARA.map((c, k) => (
                <span key={c} className={`p-5 ${k === 2 ? 'bg-gradient-to-b from-[#C9A45C]/25 to-[#C9A45C]/10 text-[#E7CF9C]' : 'text-white/55'}`}>{c}</span>
              ))}
            </div>
            {FILAS_COMPARA.map((f, k) => {
              const Icono = f.icono;
              return (
                <motion.div key={f.t} initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.6 }} transition={{ duration: 0.5, delay: k * 0.04, ease: CURVA }} className="grid grid-cols-[1.1fr_1fr_1fr_1.2fr] border-t border-white/[0.07] text-[15px]">
                  <span className="flex items-center gap-3 p-5 font-bold">
                    <Icono className="h-5 w-5 shrink-0 text-[#C9A45C]" strokeWidth={1.6} />
                    {f.t}
                  </span>
                  <span className="flex items-start gap-2 p-5 text-white/50"><X className="mt-0.5 h-4 w-4 shrink-0 text-[#E07A7A]" strokeWidth={2.2} />{f.v[0]}</span>
                  <span className="flex items-start gap-2 p-5 text-white/50"><Minus className="mt-0.5 h-4 w-4 shrink-0 text-white/40" strokeWidth={2.2} />{f.v[1]}</span>
                  <span className="flex items-start gap-2 bg-[#C9A45C]/[0.08] p-5 font-bold text-white">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#E7CF9C]" strokeWidth={2.6} />
                    <span>
                      {f.v[2]}
                      {f.pronto && <span className="ml-2 rounded-full border border-[#E7CF9C]/50 px-2 py-0.5 text-[10px] uppercase tracking-[0.14em] text-[#E7CF9C]">Muy pronto</span>}
                    </span>
                  </span>
                </motion.div>
              );
            })}
          </div>
          <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:hidden">
            {FILAS_COMPARA.map((f, k) => {
              const Icono = f.icono;
              return (
                <motion.div key={f.t} initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.4 }} transition={{ duration: 0.5, delay: (k % 2) * 0.06, ease: CURVA }} className="rounded-[24px] border border-white/10 bg-white/[0.04] p-5">
                  <p className="flex items-center gap-2.5 text-[15px] font-bold">
                    <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#C9A45C]/15"><Icono className="h-[18px] w-[18px] text-[#E7CF9C]" strokeWidth={1.7} /></span>
                    {f.t}
                  </p>
                  <div className="mt-4 space-y-2 text-[14px]">
                    <p className="flex gap-2 text-white/45"><X className="mt-0.5 h-4 w-4 shrink-0 text-[#E07A7A]" strokeWidth={2.2} /><span><b className="font-semibold text-white/60">Apps:</b> {f.v[0]}</span></p>
                    <p className="flex gap-2 text-white/45"><Minus className="mt-0.5 h-4 w-4 shrink-0 text-white/40" strokeWidth={2.2} /><span><b className="font-semibold text-white/60">A mano:</b> {f.v[1]}</span></p>
                    <p className="flex gap-2 rounded-xl bg-[#C9A45C]/[0.12] px-3 py-2 font-bold text-white">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#E7CF9C]" strokeWidth={2.6} />
                      <span>
                        {f.v[2]}
                        {f.pronto && <span className="ml-1.5 text-[10px] uppercase tracking-[0.14em] text-[#E7CF9C]">· muy pronto</span>}
                      </span>
                    </p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
};

// ─── 8. Pasaporte VIP: tarjeta de lujo con sellos que caen con el scroll ─────
/** Roseta de sello: forma propia de VANESEV (doce puntas suaves) con la V grabada. */
const Roseta: React.FC<{ llena: boolean; ultima?: boolean }> = ({ llena, ultima }) => (
  <svg viewBox="0 0 48 48" className="h-full w-full" aria-hidden="true">
    <defs>
      <linearGradient id={ultima ? 'oroUltimo' : 'oroSello'} x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#F3E6C4" />
        <stop offset="0.5" stopColor="#C9A45C" />
        <stop offset="1" stopColor="#8A6A2E" />
      </linearGradient>
    </defs>
    <path
      d="M24.00 2.00 L28.81 6.03 L35.00 4.95 L37.15 10.85 L43.05 13.00 L41.97 19.19 L46.00 24.00 L41.97 28.81 L43.05 35.00 L37.15 37.15 L35.00 43.05 L28.81 41.97 L24.00 46.00 L19.19 41.97 L13.00 43.05 L10.85 37.15 L4.95 35.00 L6.03 28.81 L2.00 24.00 L6.03 19.19 L4.95 13.00 L10.85 10.85 L13.00 4.95 L19.19 6.03Z"
      fill={llena ? `url(#${ultima ? 'oroUltimo' : 'oroSello'})` : 'none'}
      stroke={llena ? 'none' : 'rgba(231,207,156,0.45)'}
      strokeWidth="1"
      strokeDasharray={llena ? undefined : '2 2'}
    />
    {llena && (
      <text x="24" y="31" textAnchor="middle" fontFamily="Fraunces, Georgia, serif" fontStyle="italic" fontSize="16" fill="#2A1236">
        V
      </text>
    )}
  </svg>
);

const SelloVip: React.FC<{ p?: MotionValue<number>; desde: number; i: number; compacta?: boolean }> = ({ p, desde, i, compacta }) => {
  const reducir = useReducedMotion();
  const quieto = useMotionValue(1);
  const fuente = p ?? quieto;
  const a = p ? desde : -1;
  const s = useTransform(fuente, [a, a + 0.06], reducir || !p ? [1, 1] : [2.6, 1]);
  const o = useTransform(fuente, [a, a + 0.04], p ? [0, 1] : [1, 1]);
  const r = useTransform(fuente, [a, a + 0.06], reducir || !p ? [0, 0] : [-50, 0]);
  return (
    <span className={`relative block ${compacta ? 'h-9 w-9' : 'h-12 w-12 sm:h-14 sm:w-14'}`}>
      <span className="absolute inset-0"><Roseta llena={false} /></span>
      <motion.span style={{ scale: s, opacity: o, rotate: r }} className="absolute inset-0 drop-shadow-[0_6px_10px_rgba(0,0,0,0.45)]">
        <Roseta llena ultima={i === 4} />
      </motion.span>
    </span>
  );
};

/** Tarjeta del Pasaporte VIP: la misma en la portada y dentro del teléfono. */
export const TarjetaVip: React.FC<{ p?: MotionValue<number>; desde?: number; paso?: number; compacta?: boolean }> = ({ p, desde = 0.2, paso = 0.12, compacta }) => {
  const quieto = useMotionValue(1);
  const premio = useTransform(p ?? quieto, [desde + paso * 4, desde + paso * 4 + 0.05], p ? [0, 1] : [1, 1]);
  return (
    <div className={`relative aspect-[1.586] w-full overflow-hidden ${compacta ? 'rounded-[16px]' : 'rounded-[26px]'} text-white shadow-[0_40px_80px_-30px_rgba(0,0,0,0.8)]`}>
      <Foto src="unas-oscuras" className="absolute inset-0 h-full w-full object-cover" />
      <div className="absolute inset-0" style={{ background: 'linear-gradient(120deg, rgba(42,18,54,0.96) 0%, rgba(42,18,54,0.82) 45%, rgba(20,11,25,0.6) 100%)' }} />
      {/* Grano y filete de oro */}
      <div className="absolute inset-0 opacity-[0.18]" style={{ backgroundImage: 'radial-gradient(rgba(255,255,255,0.5) 0.6px, transparent 0.6px)', backgroundSize: '4px 4px' }} />
      <div className={`absolute ${compacta ? 'inset-[5px] rounded-[12px]' : 'inset-[10px] rounded-[18px]'} border border-[#C9A45C]/45`} />
      <div className={`relative flex h-full flex-col justify-between ${compacta ? 'p-3' : 'p-6 sm:p-7'}`}>
        <div className="flex items-start justify-between">
          <div>
            <p className={`${compacta ? 'text-[7px]' : 'text-[10px]'} font-bold uppercase tracking-[0.34em] text-[#E7CF9C]`}>Pasaporte VIP</p>
            <p className={`${compacta ? 'mt-0.5 text-[15px]' : 'mt-1.5 text-[26px] sm:text-[30px]'} font-lujo leading-none`}>Estudio Ámbar</p>
          </div>
          <span className={`v-oro-texto font-lujo ${compacta ? 'text-[14px]' : 'text-[24px]'} font-medium italic`}>#001</span>
        </div>
        <div className="flex items-center justify-between">
          {[0, 1, 2, 3, 4].map((i) => (
            <SelloVip key={i} p={p} desde={desde + i * paso} i={i} compacta={compacta} />
          ))}
        </div>
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className={`${compacta ? 'text-[9px]' : 'text-[13px]'} font-bold`}>Camila Rojas</p>
            <p className={`${compacta ? 'text-[7px]' : 'text-[11px]'} text-white/60`}>Premio a la 5.ª visita: diseño de cejas</p>
          </div>
          <motion.span style={{ opacity: premio }} className={`shrink-0 rounded-full bg-gradient-to-r from-[#F3E6C4] via-[#C9A45C] to-[#EBD9AE] ${compacta ? 'px-2 py-0.5 text-[7px]' : 'px-3 py-1 text-[11px]'} font-bold text-[#1F1226]`}>
            ¡Premio listo!
          </motion.span>
        </div>
      </div>
    </div>
  );
};

const Pasaporte: React.FC = () => {
  const reducir = useReducedMotion();
  const ref = useRef<HTMLElement | null>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end end'] });
  const p = useSpring(scrollYProgress, { stiffness: 90, damping: 22, mass: 0.4 });
  const rotY = useTransform(p, [0, 0.35, 1], reducir ? [0, 0, 0] : [-38, -6, 6]);
  const rotX = useTransform(p, [0, 0.35, 1], reducir ? [0, 0, 0] : [26, 6, -3]);
  const brillo = useTransform(p, [0, 1], ['-80%', '180%']);
  return (
    <section ref={ref} id="pasaporte" className="relative h-[260vh] bg-[#140B19]">
      <div className="sticky top-0 flex h-[100svh] items-center overflow-hidden">
        <Foto src="unas-francesa" className="absolute inset-0 h-full w-full object-cover opacity-25" />
        <div aria-hidden="true" className="absolute inset-0" style={{ background: 'radial-gradient(60% 50% at 50% 50%, rgba(20,11,25,0.4), #140B19 85%)' }} />
        <div className="relative mx-auto grid w-full max-w-6xl items-center gap-10 px-5 pt-16 text-white sm:px-8 lg:grid-cols-2">
          <div>
            <Etiqueta oscuro>Pasaporte VIP</Etiqueta>
            <h2 className="mt-4 font-lujo text-[40px] font-medium leading-[1.02] tracking-[-0.02em] sm:text-6xl">
              Cinco visitas, un premio. <span className="italic font-light text-[#E7CF9C]">Y vuelve contigo.</span>
            </h2>
            <p className="mt-5 max-w-md text-[16px] leading-relaxed text-white/70">Sin cartulinas que se pierden: su pasaporte vive en su móvil y el sello se suma solo cuando cierras la cita. Tú eliges el premio.</p>
            <div className="mt-5">
              <SeguirEnSeccion p={p} hasta={0.85} texto="Baja y mira cómo se sellan" />
            </div>
          </div>
          <div className="flex justify-center" style={{ perspective: '1400px' }}>
            <motion.div style={{ rotateY: rotY, rotateX: rotX, transformStyle: 'preserve-3d' }} className="relative w-full max-w-[460px]">
              <TarjetaVip p={p} desde={0.18} paso={0.12} />
              <motion.span aria-hidden="true" style={{ left: brillo }} className="pointer-events-none absolute top-0 h-full w-1/3 -skew-x-12 rounded-[26px] bg-gradient-to-r from-transparent via-white/15 to-transparent" />
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
};

// ─── 9. Precios ─────────────────────────────────────────────────────────────
export const Precios: React.FC<{ onPlaza: () => void }> = ({ onPlaza }) => {
  const [anual, setAnual] = useState(false);
  const incluye = [
    'Tu carta con tu marca, tus fotos y tus precios en $ y Bs',
    'Reservas por especialista que te llegan ordenadas al WhatsApp',
    'Pasaporte VIP de 5 sellos para que vuelvan',
    'Ofertas, cupones y tarjetas regalo con el precio exacto',
    'Tu equipo: 3 personas y 3 cabinas o zonas (cada profesional más, 3 $/mes)',
    'Tu QR y tu kit listos para imprimir',
  ];
  return (
    <section id="precios" className="relative bg-[#FBFAFC] px-5 py-24 sm:px-8 sm:py-32">
      <div className="mx-auto max-w-6xl">
        <div className="text-center">
          <div className="flex justify-center">
            <Etiqueta>Precios</Etiqueta>
          </div>
          <h2 className="mx-auto mt-4 max-w-3xl font-lujo text-[40px] font-medium leading-[1.02] tracking-[-0.02em] text-[#1A1020] sm:text-6xl">
            Menos que un servicio <span className="italic font-light text-[#4A1F5C]">al mes.</span>
          </h2>
          <div className="mt-8 inline-flex rounded-full bg-[#EFEAF1] p-1 text-[14px] font-bold" role="radiogroup" aria-label="Forma de pago">
            {[
              ['Mensual', false],
              ['Anual · 3 meses gratis', true],
            ].map(([l, v]) => (
              <button
                key={String(l)}
                type="button"
                role="radio"
                aria-checked={anual === v}
                onClick={() => setAnual(v as boolean)}
                className="relative rounded-full px-5 py-2.5 cursor-pointer"
              >
                {anual === v && <motion.span layoutId="pago" className="absolute inset-0 rounded-full bg-[#1F1226]" transition={{ type: 'spring', stiffness: 300, damping: 28 }} />}
                <span className={`relative ${anual === v ? 'text-white' : 'text-[#6E6478]'}`}>{l as string}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="mt-12 grid items-start gap-6 lg:grid-cols-[1.25fr_1fr]">
          {/* Esencial con borde de oro vivo */}
          <motion.div initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.2 }} transition={{ duration: 0.8, ease: CURVA }} className="v-borde-vivo rounded-[32px] p-[2px]">
            <div className="rounded-[30px] bg-white p-7 sm:p-10">
              <div className="flex items-center justify-between gap-3">
                <h3 className="font-lujo text-[34px] font-medium">Esencial</h3>
                <span className="rounded-full bg-[#1F1226] px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-[#E7CF9C]">Fundadoras</span>
              </div>
              <p className="mt-2 text-[15px] text-[#6E6478]">Todo para llenar tu agenda con tu propia marca.</p>
              <div className="mt-6 flex items-end gap-2">
                <AnimatePresence mode="wait" initial={false}>
                  <motion.span key={anual ? 'a' : 'm'} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.3 }} className="font-lujo text-[76px] font-medium leading-[0.85] text-[#1A1020]">
                    {anual ? '171' : '19'} $
                  </motion.span>
                </AnimatePresence>
                <span className="pb-1 text-[15px] font-bold text-[#6E6478]">{anual ? 'al año' : 'al mes'}</span>
              </div>
              <ul className="mt-7 space-y-3 border-t border-[#1A1020]/8 pt-6">
                {incluye.map((x) => (
                  <li key={x} className="flex gap-3 text-[15px] leading-snug text-[#1A1020]">
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#C9A45C]/20">
                      <Check className="h-3 w-3 text-[#7D6438]" strokeWidth={3} />
                    </span>
                    {x}
                  </li>
                ))}
              </ul>
              <div className="mt-8 rounded-2xl bg-[#F7F1E6] p-4">
                <p className="text-[14px] font-bold text-[#1A1020]">
                  Montaje de fundadora: <span className="text-[#7D6438]">49 $</span> <span className="font-normal text-[#6E6478] line-through">150 $</span>
                </p>
                <p className="mt-1 text-[13px] text-[#6E6478]">Te lo dejamos montado con tu lista, tu logo y tus fotos. Solo 100 plazas.</p>
              </div>
              <button type="button" onClick={onPlaza} className="mt-6 flex w-full items-center justify-center gap-2 rounded-full bg-[#1F1226] py-4 text-[15px] font-bold text-white cursor-pointer">
                Empezar como fundadora <ArrowRight className="h-4 w-4" strokeWidth={2} />
              </button>
            </div>
          </motion.div>

          {/* Atelier, muy pronto (G-052) */}
          <motion.div initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.2 }} transition={{ duration: 0.8, delay: 0.1, ease: CURVA }} className="relative overflow-hidden rounded-[32px] text-white">
            <Foto src="pestanas-mirada" className="absolute inset-0 h-full w-full object-cover" />
            <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, rgba(20,11,25,0.55), rgba(20,11,25,0.95) 60%)' }} />
            <div className="relative p-7 sm:p-10">
              <span className="rounded-full border border-[#E7CF9C]/60 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-[#E7CF9C]">Muy pronto</span>
              <h3 className="mt-5 font-lujo text-[34px] font-medium">Atelier</h3>
              <p className="mt-1 text-[15px] text-white/70">Tu marca crece sola: contenido listo cada semana, sin pasarte las noches creándolo.</p>
              <p className="mt-5 font-lujo text-[56px] font-medium leading-none">
                79 $ <span className="font-texto text-[15px] font-bold text-white/60">al mes</span>
              </p>
              <ul className="mt-6 space-y-2.5 text-[15px]">
                {[
                  'Todo lo de Esencial',
                  'Asistente de marketing con IA: hasta 40 piezas al mes con tus fotos y tu estilo',
                  'Historias, publicaciones y guiones de reels listos para subir',
                  'Calendario de contenido según tus huecos libres de la semana',
                  'Campañas para llenar los días flojos, con la oferta ya creada',
                  'Informe mensual: qué servicios venden más y qué clientas no han vuelto',
                  'Atención prioritaria por WhatsApp',
                ].map((x) => (
                  <li key={x} className="flex gap-2.5">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#C9A45C]" strokeWidth={2.4} />
                    {x}
                  </li>
                ))}
              </ul>
              <a href={`${WHATSAPP}?text=${encodeURIComponent('Hola, avisadme cuando esté el plan Atelier de VANESEV.')}`} target="_blank" rel="noopener noreferrer" className="mt-8 flex w-full items-center justify-center gap-2 rounded-full border border-white/30 py-4 text-[15px] font-bold hover:border-white/70">
                Avísame cuando esté <ArrowUpRight className="h-4 w-4" strokeWidth={2} />
              </a>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

// ─── 10. Preguntas ──────────────────────────────────────────────────────────
const PREGUNTAS = [
  ['¿Mis clientas tienen que descargar algo?', 'No. Entran desde tu Instagram o escaneando tu QR. Ven tu carta y reservan en segundos, sin descargar nada y sin contraseñas.'],
  ['¿Cobráis comisión por cita?', 'Ninguna. Pagas tu cuota fija y el 100 % de lo que facturas es tuyo. Tampoco cobramos por clienta nueva.'],
  ['¿Puedo cambiar colores, fotos y precios?', 'Cuando quieras y desde el móvil. Lo que cambias se ve al instante, en dólares y en bolívares.'],
  ['¿Cómo me llegan las reservas?', 'La cita entra en tu agenda y te llega al WhatsApp con servicio, especialista, día, hora y precio. Confirmas con un toque.'],
  ['¿Cuánto tarda en estar listo?', 'Nos mandas tu lista como la tengas (foto, PDF o un mensaje) y tu logo. Te devolvemos tu carta, tu Pasaporte VIP y tu panel listos, y tienes 14 días para probarlo.'],
];

export const Preguntas: React.FC = () => {
  const [abierta, setAbierta] = useState<number | null>(0);
  return (
    <section id="faq" className="bg-[#F4F0EA] px-5 py-24 sm:px-8 sm:py-32">
      <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[0.8fr_1.2fr]">
        <div>
          <Etiqueta>Preguntas</Etiqueta>
          <h2 className="mt-4 font-lujo text-[40px] font-medium leading-[1.02] tracking-[-0.02em] text-[#1A1020] sm:text-5xl">
            Lo que nos preguntan <span className="italic font-light text-[#4A1F5C]">las dueñas.</span>
          </h2>
        </div>
        <div>
          {PREGUNTAS.map(([q, a], i) => {
            const open = abierta === i;
            return (
              <div key={q} className="border-b border-[#1A1020]/12">
                <button type="button" aria-expanded={open} onClick={() => setAbierta(open ? null : i)} className="flex w-full items-center justify-between gap-4 py-6 text-left cursor-pointer">
                  <span className="font-lujo text-[21px] leading-snug text-[#1A1020] sm:text-2xl">{q}</span>
                  <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-colors ${open ? 'bg-[#1F1226] text-white' : 'bg-white text-[#1A1020] ring-1 ring-[#1A1020]/10'}`}>
                    {open ? <Minus className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                  </span>
                </button>
                <AnimatePresence initial={false}>
                  {open && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.4, ease: CURVA }} className="overflow-hidden">
                      <p className="max-w-xl pb-6 text-[16px] leading-relaxed text-[#4A4150]">{a}</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

// ─── 11. Cierre a sangre ─────────────────────────────────────────────────────
const Cierre: React.FC<{ onPlaza: () => void }> = ({ onPlaza }) => {
  const reducir = useReducedMotion();
  const ref = useRef<HTMLElement | null>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] });
  const y = useTransform(scrollYProgress, [0, 1], reducir ? ['0%', '0%'] : ['-15%', '15%']);
  const escala = useTransform(scrollYProgress, [0, 0.5], reducir ? [1, 1] : [0.86, 1]);
  return (
    <section ref={ref} id="fundadoras" className="relative overflow-hidden bg-[#140B19] px-5 py-32 text-center text-white sm:py-44">
      <motion.div style={{ y }} className="absolute -inset-y-[15%] inset-x-0">
        <Foto src="pestanas-mirada" className="h-full w-full object-cover opacity-45" />
      </motion.div>
      <div aria-hidden="true" className="absolute inset-0" style={{ background: 'radial-gradient(70% 60% at 50% 50%, rgba(20,11,25,0.35), #140B19 90%)' }} />
      <motion.div style={{ scale: escala }} className="relative mx-auto max-w-4xl">
        <Etiqueta oscuro>100 plazas de fundadora</Etiqueta>
        <h2 className="mt-6 font-lujo text-[48px] font-medium leading-[0.98] tracking-[-0.025em] sm:text-7xl lg:text-8xl">
          Tu marca. Tu agenda. <span className="italic font-light text-[#E7CF9C]">Tus clientas.</span>
        </h2>
        <p className="mx-auto mt-6 max-w-xl text-[17px] leading-relaxed text-white/75">Te enseñamos tu carta con tus propios servicios antes de pagar nada. Sin permanencia, y con nosotras al otro lado del WhatsApp.</p>
        <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <button type="button" onClick={onPlaza} className="v-brillo-boton relative overflow-hidden rounded-full px-9 py-4 text-[16px] font-bold text-[#1F1226] cursor-pointer" style={{ background: 'linear-gradient(115deg, #F3E6C4 0%, #C9A45C 50%, #EBD9AE 100%)' }}>
            Quiero mi plaza de fundadora
          </button>
          <a href={`${WHATSAPP}?text=${encodeURIComponent('Hola, quiero ver una demo de VANESEV con mis servicios.')}`} target="_blank" rel="noopener noreferrer" className="rounded-full border border-white/30 px-9 py-4 text-[16px] font-bold hover:border-white/70">
            Verla con mis servicios
          </a>
        </div>
      </motion.div>
    </section>
  );
};

export const PortadaCinematica: React.FC<{ onPlaza: () => void }> = ({ onPlaza }) => (
  <>
    <BarraProgreso />
    <Portada onPlaza={onPlaza} />
    <Cinta />
    <Manifiesto />
    <UnDia />
    <Oficios />
    <Equipo />
    <TuMarca />
    <Comparativa />
    <Pasaporte />
    <Precios onPlaza={onPlaza} />
    <Preguntas />
    <Cierre onPlaza={onPlaza} />
  </>
);
