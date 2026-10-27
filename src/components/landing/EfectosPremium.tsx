import React, { useRef, useState } from 'react';
import {
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
    texto: 'En el espejo, en la recepción o en tu Instagram: entra en tu carta con tu marca, tus fotos y tus precios. Sin descargar nada.',
  },
  {
    icono: CalendarCheck,
    etiqueta: '02 · Reserva',
    titulo: 'Elige servicio, especialista y hora.',
    texto: 'Solo ve los huecos libres de verdad. El precio lo calcula el sistema: ofertas, cupones y tarjetas regalo incluidos.',
  },
  {
    icono: MessageCircle,
    etiqueta: '03 · Confirmación',
    titulo: 'Te llega por WhatsApp, ya ordenada.',
    texto: 'Servicio, especialista, día y hora en un mensaje. Confirmas con un toque y la cita aparece en tu agenda.',
  },
  {
    icono: Award,
    etiqueta: '04 · Fidelidad',
    titulo: 'Y vuelve: suma su sello VIP.',
    texto: 'Su Pasaporte VIP cuenta cada visita y le recuerda su premio. Tu clienta es tuya, no de una plataforma.',
  },
];

function useOpacidadDeEscena(p: MotionValue<number>, i: number, total: number) {
  const a = i / total;
  const b = (i + 1) / total;
  const entrada = i === 0 ? [-1, 0] : [a - 0.04, a + 0.02];
  const salida = i === total - 1 ? [1, 2] : [b - 0.02, b + 0.04];
  return useTransform(p, [entrada[0], entrada[1], salida[0], salida[1]], [i === 0 ? 1 : 0, 1, 1, i === total - 1 ? 1 : 0]);
}

const PantallaQr: React.FC = () => (
  <div className="flex h-full flex-col items-center justify-center gap-5 px-6 text-center">
    <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-[#7D6438]">Capra Studio</p>
    <div className="grid grid-cols-7 gap-[3px] rounded-2xl bg-white p-3 shadow-[0_10px_30px_-12px_rgba(20,11,25,0.45)]">
      {Array.from({ length: 49 }).map((_, i) => {
        const esquina = [0, 1, 2, 7, 9, 14, 15, 16, 4, 5, 6, 11, 13, 18, 19, 20, 28, 29, 30, 35, 37, 42, 43, 44].includes(i);
        const lleno = esquina || (i * 7 + 3) % 5 < 2;
        return <span key={i} className={`h-3.5 w-3.5 rounded-[3px] ${lleno ? 'bg-[#1F1226]' : 'bg-[#F4F2F7]'}`} />;
      })}
    </div>
    <p className="font-cormorant text-2xl font-semibold text-[#1A1020]">Escanea y reserva</p>
  </div>
);

const PantallaReserva: React.FC = () => (
  <div className="flex h-full flex-col gap-3 px-4 pt-10">
    <p className="font-cormorant text-xl font-semibold text-[#1A1020]">Manicura rusa</p>
    <p className="-mt-2 text-[11px] text-[#6E6478]">60 min · con Valentina</p>
    <div className="flex gap-2">
      {['V', 'M', 'L'].map((x, i) => (
        <span key={x} className={`flex h-9 w-9 items-center justify-center rounded-full text-xs font-bold ${i === 0 ? 'bg-[#1F1226] text-[#D9C49B] ring-2 ring-[#B89B6A]' : 'bg-[#F4F2F7] text-[#6E6478]'}`}>{x}</span>
      ))}
    </div>
    <div className="grid grid-cols-3 gap-2">
      {['09:30', '10:30', '12:00', '15:00', '16:30', '18:00'].map((h) => (
        <span key={h} className={`rounded-xl py-2 text-center text-[11px] font-bold ${h === '10:30' ? 'bg-[#1F1226] text-white' : 'border border-[#E4E2EA] bg-white text-[#1A1020]'}`}>{h}</span>
      ))}
    </div>
    <div className="mt-auto mb-6 rounded-2xl border border-[#E4E2EA] bg-white p-3 text-[11px]">
      <div className="flex justify-between text-[#6E6478]"><span>Precio</span><span className="line-through">18,00 $</span></div>
      <div className="flex justify-between text-[#6E6478]"><span>Oferta jueves</span><span>−3,00 $</span></div>
      <div className="mt-1 flex justify-between font-bold text-[#1A1020]"><span>Total</span><span>15,00 $</span></div>
    </div>
  </div>
);

const PantallaWhatsapp: React.FC = () => (
  <div className="flex h-full flex-col justify-end gap-2 bg-[#F4F2F7] px-3 pb-8">
    <div className="ml-auto max-w-[85%] rounded-2xl rounded-br-md bg-[#1F1226] px-3.5 py-2.5 text-[11px] leading-relaxed text-white shadow-md">
      Hola, Capra. Quiero reservar <b>Manicura rusa</b> con Valentina el <b>jueves a las 10:30</b>. Total: 15,00 $.
    </div>
    <div className="max-w-[80%] rounded-2xl rounded-bl-md bg-white px-3.5 py-2.5 text-[11px] leading-relaxed text-[#1A1020] shadow-sm">
      ¡Confirmada! Te esperamos el jueves. ✓
    </div>
  </div>
);

const PantallaSellos: React.FC<{ progreso: MotionValue<number> }> = ({ progreso }) => {
  const quinto = useTransform(progreso, [0.82, 0.95], [0, 1]);
  return (
    <div className="flex h-full flex-col items-center justify-center gap-5 px-6 text-center">
      <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-[#7D6438]">Pasaporte VIP</p>
      <div className="flex gap-2.5">
        {[0, 1, 2, 3].map((i) => (
          <span key={i} className="flex h-10 w-10 items-center justify-center rounded-full bg-[#1F1226] text-[#D9C49B] ring-1 ring-[#B89B6A]">
            <Award className="h-4 w-4" strokeWidth={1.5} />
          </span>
        ))}
        <motion.span style={{ scale: quinto, opacity: quinto }} className="flex h-10 w-10 items-center justify-center rounded-full bg-[#B89B6A] text-[#1F1226]">
          <Award className="h-4 w-4" strokeWidth={1.5} />
        </motion.span>
      </div>
      <p className="font-cormorant text-2xl font-semibold text-[#1A1020]">5.ª visita: tu premio</p>
    </div>
  );
};

export const UnDiaEnTuSalon: React.FC = () => {
  const reducir = useReducedMotion();
  const ref = useRef<HTMLElement | null>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end end'] });
  const p = useSpring(scrollYProgress, { stiffness: 90, damping: 22, mass: 0.4 });
  const [activa, setActiva] = useState(0);
  useMotionValueEvent(scrollYProgress, 'change', (v) => setActiva(Math.min(ESCENAS.length - 1, Math.max(0, Math.floor(v * ESCENAS.length)))));

  const rotY = useTransform(p, [0, 1], reducir ? [0, 0] : [-26, 26]);
  const rotX = useTransform(p, [0, 0.5, 1], reducir ? [0, 0, 0] : [10, 0, 8]);
  const escala = useTransform(p, [0, 0.5, 1], reducir ? [1, 1, 1] : [0.9, 1.02, 0.96]);
  const brillo = useTransform(p, [0, 1], ['-60%', '160%']);
  const ops = ESCENAS.map((_, i) => useOpacidadDeEscena(scrollYProgress, i, ESCENAS.length));
  const pantallas = [<PantallaQr />, <PantallaReserva />, <PantallaWhatsapp />, <PantallaSellos progreso={scrollYProgress} />];

  return (
    <section ref={ref} id="un-dia" aria-label="Un día en tu salón con VANESEV" className="relative h-[340vh] bg-[#140B19] text-white">
      <div className="sticky top-0 flex h-[100svh] items-center overflow-hidden px-4 sm:px-6">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
          style={{ background: 'radial-gradient(70% 60% at 70% 40%, rgba(74,31,92,0.55) 0%, rgba(20,11,25,0) 70%)' }}
        />
        <div className="relative mx-auto grid w-full max-w-6xl items-center gap-8 lg:grid-cols-[1fr_1fr] lg:gap-16">
          {/* Texto de la escena activa */}
          <div className="order-2 lg:order-1">
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#D9C49B]">Un día en tu salón</p>
            <div className="relative mt-4 min-h-[190px] sm:min-h-[210px]">
              {ESCENAS.map((e, i) => (
                <motion.div key={e.etiqueta} style={{ opacity: ops[i] }} className="absolute inset-0" aria-hidden={i !== activa}>
                  <p className="text-xs font-semibold text-white/50">{e.etiqueta}</p>
                  <h2 className="mt-2 font-cormorant text-[34px] sm:text-5xl font-semibold leading-[1.02] tracking-tight">{e.titulo}</h2>
                  <p className="mt-4 max-w-md text-sm sm:text-base leading-relaxed text-white/70">{e.texto}</p>
                </motion.div>
              ))}
            </div>
            {/* Progreso por escenas */}
            <div className="mt-6 flex gap-2">
              {ESCENAS.map((e, i) => {
                const Icono = e.icono;
                return (
                  <span
                    key={e.etiqueta}
                    className={`flex h-10 w-10 items-center justify-center rounded-full transition-all duration-500 ${i === activa ? 'bg-[#B89B6A] text-[#1F1226] scale-110' : 'bg-white/5 text-white/40 ring-1 ring-white/10'}`}
                  >
                    <Icono className="h-4 w-4" strokeWidth={1.5} />
                  </span>
                );
              })}
            </div>
          </div>

          {/* Teléfono en 3D */}
          <div className="order-1 lg:order-2 flex justify-center" style={{ perspective: '1400px' }}>
            <motion.div
              style={{ rotateY: rotY, rotateX: rotX, scale: escala, transformStyle: 'preserve-3d' }}
              className="relative h-[46svh] max-h-[560px] min-h-[340px] aspect-[9/19] rounded-[42px] bg-gradient-to-b from-[#3A2A40] via-[#241829] to-[#140B19] p-2.5 shadow-[0_50px_100px_-30px_rgba(0,0,0,0.85),0_0_0_1px_rgba(217,196,155,0.25)]"
            >
              <div className="relative h-full w-full overflow-hidden rounded-[34px] bg-[#FBFAFC]">
                {pantallas.map((pantalla, i) => (
                  <motion.div key={i} style={{ opacity: ops[i] }} className="absolute inset-0">
                    {pantalla}
                  </motion.div>
                ))}
                {/* Reflejo que barre la pantalla con el scroll */}
                <motion.div
                  aria-hidden="true"
                  style={{ left: brillo }}
                  className="pointer-events-none absolute top-0 h-full w-1/3 -skew-x-12 bg-gradient-to-r from-transparent via-white/25 to-transparent"
                />
              </div>
              <div className="absolute left-1/2 top-3.5 h-5 w-24 -translate-x-1/2 rounded-full bg-[#140B19]" />
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
};
