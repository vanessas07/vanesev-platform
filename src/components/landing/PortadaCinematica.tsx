import React, { useEffect, useRef, useState } from 'react';
import {
  AnimatePresence,
  motion,
  useMotionValueEvent,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
  type MotionValue,
} from 'framer-motion';
import { ArrowRight, ArrowUpRight, Award, CalendarCheck, Check, Lock, MessageCircle, Minus, Plus, QrCode, Users } from 'lucide-react';
import { AgendaSemanal, PantallaAEscala, PantallaQr, PantallaReserva, PantallaSellos, PantallaWhatsapp } from './EfectosPremium';

/*
 * Portada cinematográfica de vanesev.com (G-047: Fraunces + Manrope; G-048: fotos de banco libre).
 * Cada sección tiene su propio movimiento ligado al scroll; nada de tarjetas apiladas.
 * Todo respeta prefers-reduced-motion: sin giros ni desplazamientos, solo opacidad.
 */

const CURVA: [number, number, number, number] = [0.22, 1, 0.36, 1];
const F = '/vanesev/fotos/';
const WHATSAPP = 'https://wa.me/584223794800';

const Foto: React.FC<{ src: string; alt?: string; className?: string; eager?: boolean }> = ({ src, alt = '', className = '', eager }) => (
  <img src={F + src + '.webp'} alt={alt} loading={eager ? 'eager' : 'lazy'} decoding="async" className={className} />
);

const Etiqueta: React.FC<{ children: React.ReactNode; oscuro?: boolean }> = ({ children, oscuro }) => (
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

// ─── 1. Portada: mosaico de fotos en movimiento, titular y avisos en vivo ─────
const COLUMNAS = [
  ['unas-oscuras', 'pestanas-tecnica', 'pelo-salon'],
  ['maquillaje-novia', 'unas-rosa', 'salon-neon'],
  ['unas-francesa', 'clienta-movil', 'unas-arte'],
];

const AVISOS = [
  { icono: CalendarCheck, t: 'Nueva reserva', d: 'Lifting de pestañas · jueves 10:30' },
  { icono: Award, t: 'Sello VIP 4 de 5', d: 'Laura vuelve el sábado' },
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
  const yMosaico = useTransform(scrollYProgress, [0, 1], ['0%', reducir ? '0%' : '22%']);
  const escalaMosaico = useTransform(scrollYProgress, [0, 1], [1, reducir ? 1 : 1.18]);
  const rotMosaico = useTransform(scrollYProgress, [0, 1], [reducir ? 0 : -6, reducir ? 0 : 4]);
  const yTexto = useTransform(scrollYProgress, [0, 1], ['0%', reducir ? '0%' : '-35%']);
  const opTexto = useTransform(scrollYProgress, [0, 0.55], [1, 0]);

  const linea1 = 'Tu talento merece una agenda llena.'.split(' ');
  const linea2 = 'Y una marca que no se confunda con nadie.'.split(' ');

  return (
    <section ref={ref} id="inicio" className="relative min-h-[100svh] overflow-hidden bg-[#140B19] text-white">
      {/* Mosaico: tres columnas de fotos que suben y bajan sin parar */}
      <motion.div
        aria-hidden="true"
        style={{ y: yMosaico, scale: escalaMosaico, rotate: rotMosaico }}
        className="absolute -inset-x-10 -top-20 bottom-0 flex gap-3 opacity-70 lg:left-[42%] lg:-right-16 lg:gap-4"
      >
        {COLUMNAS.map((col, c) => (
          <div key={c} className={`flex-1 ${c === 1 ? 'pt-24' : ''}`}>
            <div className={`flex flex-col gap-3 lg:gap-4 ${reducir ? '' : c === 1 ? 'v-baja' : 'v-sube'}`} style={{ animationDuration: `${40 + c * 9}s` }}>
              {[...col, ...col].map((src, k) => (
                <div key={k} className="overflow-hidden rounded-[22px] lg:rounded-[28px]">
                  <Foto src={src} eager={k < 2} className="aspect-[3/4] w-full object-cover" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </motion.div>
      {/* Velos: en el móvil el texto va abajo; en escritorio, a la izquierda */}
      <div aria-hidden="true" className="absolute inset-0 lg:hidden" style={{ background: 'linear-gradient(180deg, rgba(20,11,25,0.55) 0%, rgba(20,11,25,0.25) 28%, rgba(20,11,25,0.88) 58%, #140B19 78%)' }} />
      <div aria-hidden="true" className="absolute inset-0 hidden lg:block" style={{ background: 'linear-gradient(90deg, #140B19 0%, #140B19 38%, rgba(20,11,25,0.55) 62%, rgba(20,11,25,0.2) 100%)' }} />
      <div aria-hidden="true" className="absolute inset-x-0 bottom-0 h-32" style={{ background: 'linear-gradient(0deg, #140B19, rgba(20,11,25,0))' }} />
      <div aria-hidden="true" className="pointer-events-none absolute -left-40 top-1/3 h-[520px] w-[520px] rounded-full blur-3xl" style={{ background: 'radial-gradient(circle, rgba(122,62,140,0.45), transparent 70%)' }} />

      {/* Avisos en vivo sobre las fotos */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.2, duration: 0.8, ease: CURVA }}
        className="absolute z-10 hidden lg:block lg:right-[8%] lg:top-[24%]"
      >
        <AvisosEnVivo />
      </motion.div>

      <motion.div style={{ y: yTexto, opacity: opTexto }} className="relative z-10 mx-auto flex min-h-[100svh] max-w-6xl flex-col justify-end px-5 pb-12 pt-28 sm:px-8 lg:justify-center lg:pb-16">
        <div className="max-w-xl">
          <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.2, duration: 0.7, ease: CURVA }} className="mb-6 lg:hidden">
            <AvisosEnVivo />
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, ease: CURVA }}>
            <Etiqueta oscuro>Para uñas, pestañas, peluquería y estética</Etiqueta>
          </motion.div>
          <h1 className="mt-5 font-lujo text-[38px] font-medium leading-[1.02] tracking-[-0.02em] sm:text-6xl lg:text-[68px]">
            {[...linea1.map((w) => ({ w, acento: false })), ...linea2.map((w) => ({ w, acento: true }))].map(({ w, acento }, i) => (
              <span key={i} className="inline-block overflow-hidden pb-[0.1em] align-bottom">
                <motion.span
                  className={`mr-[0.24em] inline-block ${acento ? 'italic font-light text-[#E7CF9C]' : ''}`}
                  initial={reducir ? { opacity: 0 } : { y: '115%', rotate: 6, opacity: 0 }}
                  animate={reducir ? { opacity: 1 } : { y: '0%', rotate: 0, opacity: 1 }}
                  transition={{ duration: 0.9, ease: CURVA, delay: 0.15 + i * 0.055 }}
                >
                  {w}
                </motion.span>
              </span>
            ))}
          </h1>
          <motion.p
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1, duration: 0.8, ease: CURVA }}
            className="mt-5 max-w-md text-[16px] leading-relaxed text-white/75 sm:text-lg"
          >
            Tu carta con tu firma, reservas solas a cualquier hora y un Pasaporte VIP que las hace volver. Sin comisiones y sin contraseñas.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.15, duration: 0.8, ease: CURVA }}
            className="mt-7 flex flex-col gap-3 sm:flex-row"
          >
            <button
              type="button"
              onClick={onPlaza}
              className="v-brillo-boton group relative inline-flex items-center justify-center gap-2 overflow-hidden rounded-full px-7 py-4 text-[15px] font-bold text-[#1F1226] shadow-[0_18px_40px_-16px_rgba(201,164,92,0.8)] cursor-pointer"
              style={{ background: 'linear-gradient(115deg, #F3E6C4 0%, #C9A45C 50%, #EBD9AE 100%)' }}
            >
              Quiero mi plaza de fundadora
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" strokeWidth={2} />
            </button>
            <a
              href="#un-dia"
              className="inline-flex items-center justify-center gap-2 rounded-full border border-white/25 px-7 py-4 text-[15px] font-bold text-white backdrop-blur hover:border-white/60"
            >
              Ver cómo funciona
            </a>
          </motion.div>
          <motion.ul
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.4, duration: 0.8 }}
            className="mt-7 flex flex-wrap gap-x-5 gap-y-2 text-[13px] font-semibold text-white/65"
          >
            {['0 % de comisión', 'Sin descargar nada', 'Precios en $ y Bs'].map((x) => (
              <li key={x} className="flex items-center gap-1.5">
                <Check className="h-3.5 w-3.5 text-[#C9A45C]" strokeWidth={2.4} />
                {x}
              </li>
            ))}
          </motion.ul>
        </div>
      </motion.div>
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

  const pantallas = [<PantallaQr key="qr" />, <PantallaReserva key="re" />, <PantallaWhatsapp key="wa" />, <PantallaSellos key="vip" progreso={scrollYProgress} />];
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
        {/* Foto de la escena, con zoom lento */}
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
        {/* Palabra gigante que cruza el fondo */}
        <motion.p aria-hidden="true" style={{ x: xFondo }} className="pointer-events-none absolute top-[30%] whitespace-nowrap font-lujo text-[34vw] font-semibold italic leading-none text-transparent lg:top-[18%] lg:text-[22vw]" >
          <span style={{ WebkitTextStroke: '1px rgba(231,207,156,0.28)' }}>{PALABRAS_FONDO.join(' · ')}</span>
        </motion.p>

        <div className="relative mx-auto flex h-full max-w-6xl flex-col px-5 pb-8 pt-24 sm:px-8 lg:grid lg:grid-cols-2 lg:items-center lg:gap-16 lg:pb-0 lg:pt-16">
          {/* Teléfono con cara y espalda */}
          <div className="flex flex-1 items-center justify-center lg:order-2" style={{ perspective: '1600px' }}>
            <motion.div style={{ rotateY: rotY, rotateX: rotX, scale: escala, transformStyle: 'preserve-3d' }} className="relative h-[44svh] max-h-[620px] min-h-[300px] aspect-[9/18.5] lg:h-[66svh]">
              <div style={cara} className="absolute inset-0 rounded-[38px] p-[3px] shadow-[0_60px_120px_-30px_rgba(0,0,0,0.8)] [background:linear-gradient(145deg,#F3E6C4,#9C7A3C_30%,#2A1A30_62%,#140B19)] lg:rounded-[46px]">
                <div className="relative h-full w-full overflow-hidden rounded-[35px] bg-[#FBFAFC] ring-[5px] ring-[#140B19] lg:rounded-[43px]">
                  <PantallaAEscala>{pantallas[activa]}</PantallaAEscala>
                  <div aria-hidden="true" className="v-reflejo pointer-events-none absolute inset-0 z-10" />
                </div>
                <div className="absolute left-1/2 top-3 h-4 w-20 -translate-x-1/2 rounded-full bg-[#140B19] lg:h-5 lg:w-24" />
              </div>
              {/* Espalda: obsidiana con la V de oro */}
              <div style={{ ...cara, transform: 'rotateY(180deg)' }} className="v-tarjeta-lujo absolute inset-0 flex flex-col items-center justify-center rounded-[38px] lg:rounded-[46px]">
                <span className="v-oro-texto font-lujo text-[96px] font-medium leading-none">V</span>
                <span className="mt-3 text-[10px] font-bold uppercase tracking-[0.5em] text-[#E7CF9C]">Vanesev</span>
                <span className="absolute left-5 top-5 h-12 w-12 rounded-2xl bg-black/40 ring-1 ring-white/10" />
              </div>
            </motion.div>
          </div>

          {/* Texto de la escena + barras tipo historia */}
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
            <div className="relative mt-4 min-h-[120px] sm:min-h-[170px]" aria-live="polite">
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
          </div>
        </div>
      </div>
    </section>
  );
};

// ─── 4. Galería horizontal por oficio (el scroll vertical la desplaza) ───────
const OFICIOS = [
  { foto: 'unas-oscuras', nombre: 'Uñas', frase: 'Que elija diseño, largo y extras antes de llegar.', servicios: [['Manicura rusa', '18 $'], ['Esculpidas en gel', '25 $'], ['Pedicura spa', '20 $']] },
  { foto: 'pestanas-tecnica', nombre: 'Pestañas y cejas', frase: 'Cada técnica explicada antes de que pregunten.', servicios: [['Lifting + keratina', '22 $'], ['Laminado de cejas', '20 $'], ['Extensiones pelo a pelo', '35 $']] },
  { foto: 'pelo-salon', nombre: 'Peluquería', frase: 'Servicios de tres horas sin cruces en la agenda.', servicios: [['Balayage + gloss', '85 $'], ['Alisado orgánico', '45 $'], ['Peinado de evento', '25 $']] },
  { foto: 'estetica-facial', nombre: 'Estética', frase: 'Cada cabina y cada aparato con su propia agenda.', servicios: [['Limpieza facial profunda', '35 $'], ['Hidrafacial + LED', '55 $'], ['Depilación láser', '30 $']] },
  { foto: 'maquillaje-novia', nombre: 'Maquillaje', frase: 'Novias y eventos con fecha y seña reservadas.', servicios: [['Maquillaje social', '35 $'], ['Novia con prueba', '120 $'], ['Clase de automaquillaje', '40 $']] },
  { foto: 'salon-lujo', nombre: 'Barbería', frase: 'Que elija a su barbero de confianza en segundos.', servicios: [['Corte de autor', '15 $'], ['Ritual de barba', '12 $'], ['Corte + barba', '25 $']] },
];

const Oficios: React.FC = () => {
  const reducir = useReducedMotion();
  const ref = useRef<HTMLElement | null>(null);
  const pista = useRef<HTMLDivElement | null>(null);
  const [dist, setDist] = useState(0);
  useEffect(() => {
    const el = pista.current;
    if (!el) return;
    const medir = () => setDist(Math.max(0, el.scrollWidth - window.innerWidth));
    medir();
    window.addEventListener('resize', medir);
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(medir) : null;
    ro?.observe(el);
    return () => {
      window.removeEventListener('resize', medir);
      ro?.disconnect();
    };
  }, []);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end end'] });
  const p = useSpring(scrollYProgress, { stiffness: 110, damping: 26, mass: 0.4 });
  const distRef = useRef(0);
  distRef.current = dist;
  const x = useTransform(p, (v) => -v * distRef.current);
  const [actual, setActual] = useState(0);
  useMotionValueEvent(scrollYProgress, 'change', (v) => setActual(Math.min(OFICIOS.length, Math.round(v * OFICIOS.length))));

  // Sin movimiento: carrusel normal deslizable con el dedo.
  if (reducir) {
    return (
      <section id="sectores" className="bg-[#F4F0EA] py-20">
        <div className="mx-auto max-w-6xl px-5">
          <Etiqueta>Tu oficio</Etiqueta>
          <h2 className="mt-4 font-lujo text-4xl font-medium text-[#1A1020]">Hecho para cómo trabajas tú.</h2>
        </div>
        <div className="mt-8 flex snap-x gap-4 overflow-x-auto px-5 pb-4">
          {OFICIOS.map((o) => (
            <TarjetaOficio key={o.nombre} o={o} />
          ))}
        </div>
      </section>
    );
  }

  return (
    <section ref={ref} id="sectores" className="relative bg-[#F4F0EA]" style={{ height: `calc(${dist}px + 100svh)` }}>
      <div className="sticky top-0 flex h-[100svh] flex-col justify-center overflow-hidden pt-20">
        <motion.div ref={pista} style={{ x }} className="flex w-max items-stretch gap-4 px-5 sm:gap-6 sm:px-8 lg:px-[max(2rem,calc((100vw-72rem)/2))]">
          {/* Primer panel: el titular */}
          <div className="flex w-[78vw] max-w-[440px] shrink-0 flex-col justify-center pr-4">
            <Etiqueta>Tu oficio</Etiqueta>
            <h2 className="mt-4 font-lujo text-[44px] font-medium leading-[1] tracking-[-0.02em] text-[#1A1020] sm:text-6xl">
              Hecho para cómo <span className="italic font-light text-[#4A1F5C]">trabajas tú.</span>
            </h2>
            <p className="mt-5 max-w-sm text-[16px] leading-relaxed text-[#4A4150]">Desliza: tu carta se adapta a tu especialidad, tus tiempos y tus precios.</p>
            <p className="mt-8 flex items-center gap-3 text-[13px] font-bold text-[#7D6438]">
              <ArrowRight className="h-4 w-4 v-empuja" strokeWidth={2} /> Sigue bajando
            </p>
          </div>
          {OFICIOS.map((o) => (
            <TarjetaOficio key={o.nombre} o={o} />
          ))}
          <div className="w-[8vw] shrink-0" />
        </motion.div>
        <div className="mx-auto mt-6 flex w-full max-w-6xl items-center gap-4 px-5 sm:px-8">
          <span className="text-[12px] font-bold tracking-[0.2em] text-[#7D6438]">0{Math.max(1, actual)} / 0{OFICIOS.length}</span>
          <span className="relative h-[2px] flex-1 overflow-hidden rounded-full bg-[#1A1020]/10">
            <motion.span style={{ scaleX: p }} className="absolute inset-0 origin-left bg-[#1F1226]" />
          </span>
        </div>
      </div>
    </section>
  );
};

const TarjetaOficio: React.FC<{ o: (typeof OFICIOS)[number] }> = ({ o }) => (
  <article className="group relative h-[64svh] max-h-[620px] w-[78vw] max-w-[420px] shrink-0 snap-center overflow-hidden rounded-[30px] bg-[#1F1226] shadow-[0_40px_80px_-40px_rgba(20,11,25,0.7)]">
    <Foto src={o.foto} alt={o.nombre} className="absolute inset-0 h-full w-full object-cover transition-transform duration-[1400ms] ease-out group-hover:scale-110" />
    <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, rgba(20,11,25,0.05) 25%, rgba(20,11,25,0.55) 55%, rgba(20,11,25,0.95) 100%)' }} />
    <div className="absolute inset-x-0 bottom-0 p-6 text-white">
      <h3 className="font-lujo text-[36px] font-medium leading-none tracking-[-0.02em]">{o.nombre}</h3>
      <p className="mt-2 text-[14px] leading-snug text-white/75">{o.frase}</p>
      <ul className="mt-4 space-y-1.5 border-t border-white/15 pt-3">
        {o.servicios.map(([s, pr]) => (
          <li key={s} className="flex items-baseline justify-between gap-3 text-[14px]">
            <span className="text-white/90">{s}</span>
            <span className="font-lujo text-[17px] text-[#E7CF9C]">{pr}</span>
          </li>
        ))}
      </ul>
    </div>
  </article>
);

// ─── 5. Tu equipo: rejilla viva (bento) ───────────────────────────────────────
const Equipo: React.FC = () => {
  const reducir = useReducedMotion();
  const ref = useRef<HTMLDivElement | null>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'center center'] });
  const rotX = useTransform(scrollYProgress, [0, 1], [reducir ? 0 : 32, 0]);
  const y = useTransform(scrollYProgress, [0, 1], [reducir ? 0 : 60, 0]);
  const especialistas = [
    { n: 'Valentina', o: 'Uñas', f: 'unas-francesa' },
    { n: 'Marta', o: 'Cejas', f: 'pestanas-mirada' },
    { n: 'Ana', o: 'Color', f: 'pelo-secado' },
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
  { n: 'Noir', lienzo: '#EDE6DD', fondo: '#151214', tinta: '#F4EEE6', acento: '#C9A45C', suave: '#262024', foto: 'salon-neon', letra: "'Bodoni Moda', Georgia, serif" },
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
            className="relative h-[560px] w-[280px] rounded-[44px] p-[3px] shadow-[0_60px_120px_-40px_rgba(20,11,25,0.6)] [background:linear-gradient(145deg,#F3E6C4,#9C7A3C_30%,#2A1A30_62%,#140B19)]"
          >
            <div className="relative h-full w-full overflow-hidden rounded-[41px] ring-[5px] ring-[#140B19]" style={{ background: e.fondo, color: e.tinta, transition: transicion }}>
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

const Comparativa: React.FC = () => {
  const [ticket, setTicket] = useState(25);
  const [perdidas, setPerdidas] = useState(5);
  const mes = ticket * perdidas * 4;
  const filas = [
    ['Comisión por tus clientas', 'Por cada clienta nueva', 'Nunca'],
    ['Tus clientas', 'Junto a tu competencia', 'Solo tuyas, con su historial'],
    ['Tu marca', 'Plantilla igual para todas', 'Carta con tu firma'],
    ['Motivo para volver', 'Ninguno', 'Pasaporte VIP en su móvil'],
  ];
  return (
    <section id="comparativa" className="relative overflow-hidden px-5 py-24 text-white sm:px-8 sm:py-32" style={{ background: 'radial-gradient(90% 70% at 100% 0%, rgba(122,62,140,0.5) 0%, transparent 60%), #1F1226' }}>
      <div className="relative mx-auto grid max-w-6xl gap-14 lg:grid-cols-2 lg:gap-20">
        <div>
          <Etiqueta oscuro>Haz la cuenta</Etiqueta>
          <h2 className="mt-4 font-lujo text-[40px] font-medium leading-[1.02] tracking-[-0.02em] sm:text-6xl">
            Deja de regalar tus clientas <span className="italic font-light text-[#E7CF9C]">a las apps.</span>
          </h2>
          <div className="mt-10 space-y-7 rounded-[28px] border border-white/10 bg-white/[0.05] p-6 backdrop-blur">
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
        <div className="self-end">
          <div className="grid grid-cols-[1fr_1fr] gap-x-4 border-b border-white/15 pb-3 text-[12px] font-bold uppercase tracking-[0.18em]">
            <span className="text-white/50">Apps de reservas</span>
            <span className="text-[#E7CF9C]">VANESEV</span>
          </div>
          {filas.map(([l, a, b], k) => (
            <motion.div key={l} initial={{ opacity: 0, x: 40 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true, amount: 0.6 }} transition={{ duration: 0.6, delay: k * 0.08, ease: CURVA }} className="border-b border-white/10 py-5">
              <p className="text-[12px] font-bold uppercase tracking-[0.16em] text-white/45">{l}</p>
              <div className="mt-2 grid grid-cols-[1fr_1fr] gap-x-4 text-[15px]">
                <span className="relative w-fit text-white/50">
                  {a}
                  <motion.span initial={{ scaleX: 0 }} whileInView={{ scaleX: 1 }} viewport={{ once: true }} transition={{ delay: 0.5 + k * 0.08, duration: 0.5 }} className="absolute left-0 top-1/2 h-px w-full origin-left bg-[#E06A6A]" />
                </span>
                <span className="flex items-start gap-1.5 font-bold text-white">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#C9A45C]" strokeWidth={2.4} />
                  {b}
                </span>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

// ─── 8. Pasaporte VIP en 3D: los sellos caen con el scroll ───────────────────
const Sello: React.FC<{ p: MotionValue<number>; i: number }> = ({ p, i }) => {
  const reducir = useReducedMotion();
  const desde = 0.18 + i * 0.12;
  const s = useTransform(p, [desde, desde + 0.08], reducir ? [1, 1] : [2.4, 1]);
  const o = useTransform(p, [desde, desde + 0.05], [0, 1]);
  const r = useTransform(p, [desde, desde + 0.08], reducir ? [0, 0] : [-40, 0]);
  const ultimo = i === 4;
  return (
    <span className="relative flex h-11 w-11 items-center justify-center rounded-full ring-1 ring-[#C9A45C]/50 sm:h-14 sm:w-14">
      <motion.span style={{ scale: s, opacity: o, rotate: r }} className="absolute inset-0 flex items-center justify-center rounded-full text-[#1F1226]" >
        <span className="flex h-full w-full items-center justify-center rounded-full" style={{ background: ultimo ? 'linear-gradient(135deg,#F3E6C4,#C9A45C 55%,#9C7A3C)' : 'rgba(201,164,92,0.25)', color: ultimo ? '#1F1226' : '#E7CF9C' }}>
          <Award className="h-5 w-5" strokeWidth={1.6} />
        </span>
      </motion.span>
    </span>
  );
};

const Pasaporte: React.FC = () => {
  const reducir = useReducedMotion();
  const ref = useRef<HTMLElement | null>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end end'] });
  const p = useSpring(scrollYProgress, { stiffness: 90, damping: 22, mass: 0.4 });
  const rotY = useTransform(p, [0, 0.4, 1], reducir ? [0, 0, 0] : [-38, -6, 8]);
  const rotX = useTransform(p, [0, 0.4, 1], reducir ? [0, 0, 0] : [24, 6, -4]);
  const premio = useTransform(p, [0.8, 0.9], [0, 1]);
  const brillo = useTransform(p, [0, 1], ['-80%', '180%']);
  return (
    <section ref={ref} id="pasaporte" className="relative h-[260vh] bg-[#140B19]">
      <div className="sticky top-0 flex h-[100svh] items-center overflow-hidden">
        <Foto src="unas-francesa" className="absolute inset-0 h-full w-full object-cover opacity-30" />
        <div aria-hidden="true" className="absolute inset-0" style={{ background: 'radial-gradient(60% 50% at 50% 50%, rgba(20,11,25,0.4), #140B19 85%)' }} />
        <div className="relative mx-auto grid w-full max-w-6xl items-center gap-10 px-5 pt-16 text-white sm:px-8 lg:grid-cols-2">
          <div>
            <Etiqueta oscuro>Pasaporte VIP</Etiqueta>
            <h2 className="mt-4 font-lujo text-[40px] font-medium leading-[1.02] tracking-[-0.02em] sm:text-6xl">
              Cinco visitas, un premio. <span className="italic font-light text-[#E7CF9C]">Y vuelve contigo.</span>
            </h2>
            <p className="mt-5 max-w-md text-[16px] leading-relaxed text-white/70">Sin cartulinas que se pierden: su pasaporte vive en su móvil y el sello se suma solo cuando cierras la cita.</p>
          </div>
          <div className="flex justify-center" style={{ perspective: '1400px' }}>
            <motion.div style={{ rotateY: rotY, rotateX: rotX, transformStyle: 'preserve-3d' }} className="v-tarjeta-lujo relative w-full max-w-[420px] overflow-hidden rounded-[28px] p-6 sm:p-8">
              <motion.span aria-hidden="true" style={{ left: brillo }} className="pointer-events-none absolute top-0 h-full w-1/3 -skew-x-12 bg-gradient-to-r from-transparent via-white/15 to-transparent" />
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.32em] text-[#E7CF9C]">Pasaporte VIP</p>
                  <p className="mt-2 font-lujo text-[28px] leading-none">Estudio Ámbar</p>
                </div>
                <span className="v-oro-texto font-lujo text-[26px] font-medium">#001</span>
              </div>
              <div className="mt-8 flex justify-between">
                {[0, 1, 2, 3, 4].map((i) => (
                  <Sello key={i} p={p} i={i} />
                ))}
              </div>
              <div className="mt-6 flex items-end justify-between">
                <p className="text-[13px] text-white/60">Laura · clienta desde 2026</p>
                <motion.p style={{ opacity: premio }} className="rounded-full bg-[#C9A45C] px-3 py-1 text-[12px] font-bold text-[#1F1226]">¡Premio listo!</motion.p>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
};

// ─── 9. Precios ─────────────────────────────────────────────────────────────
const Precios: React.FC<{ onPlaza: () => void }> = ({ onPlaza }) => {
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

          {/* Grande, muy pronto */}
          <motion.div initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.2 }} transition={{ duration: 0.8, delay: 0.1, ease: CURVA }} className="relative overflow-hidden rounded-[32px] text-white">
            <Foto src="maquillaje-novia" className="absolute inset-0 h-full w-full object-cover" />
            <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, rgba(20,11,25,0.55), rgba(20,11,25,0.95) 60%)' }} />
            <div className="relative p-7 sm:p-10">
              <span className="rounded-full border border-[#E7CF9C]/60 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-[#E7CF9C]">Muy pronto</span>
              <h3 className="mt-5 font-lujo text-[34px] font-medium">Grande</h3>
              <p className="mt-1 text-[15px] text-white/70">Para crecer sin pasarte las noches creando contenido.</p>
              <p className="mt-5 font-lujo text-[56px] font-medium leading-none">
                79 $ <span className="font-texto text-[15px] font-bold text-white/60">al mes</span>
              </p>
              <ul className="mt-6 space-y-2.5 text-[15px]">
                {['Todo lo de Esencial', 'Asistente de marketing con IA: hasta 40 piezas al mes', 'Historias y ofertas con tu estilo, listas para subir'].map((x) => (
                  <li key={x} className="flex gap-2.5">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#C9A45C]" strokeWidth={2.4} />
                    {x}
                  </li>
                ))}
              </ul>
              <a href={`${WHATSAPP}?text=${encodeURIComponent('Hola, avisadme cuando esté el plan Grande de VANESEV.')}`} target="_blank" rel="noopener noreferrer" className="mt-8 flex w-full items-center justify-center gap-2 rounded-full border border-white/30 py-4 text-[15px] font-bold hover:border-white/70">
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

const Preguntas: React.FC = () => {
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
