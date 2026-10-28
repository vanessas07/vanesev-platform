import React, { useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion, useScroll, useTransform } from 'framer-motion';
import { BellRing, CalendarCheck, Check, Clock, Eye, Gift, Lock, MessageCircle, Moon, Percent, RotateCcw, Tag } from 'lucide-react';
import { Etiqueta, Foto } from '../landing/PortadaCinematica';

/*
 * Piezas propias de cada página de funciones y oficios (diseño de autor: ninguna página repite estructura).
 * Cada pieza es interactiva y enseña la función completa (G-061: todo se presenta como disponible).
 * Ejemplos con el salón de demostración Estudio Ámbar (G-040). Especialistas: Daniela, Valeria y Mariana.
 */

const CURVA: [number, number, number, number] = [0.22, 1, 0.36, 1];
const ORO = 'linear-gradient(115deg, #F3E6C4 0%, #C9A45C 50%, #EBD9AE 100%)';
/** Tasa de ejemplo para enseñar el doble precio; en cada salón se usa la del día. */
const TASA_EJEMPLO = 200;
const bs = (usd: number) => `${(usd * TASA_EJEMPLO).toLocaleString('es-VE')} Bs`;

const Chip: React.FC<{ activo: boolean; onClick: () => void; children: React.ReactNode; oscuro?: boolean }> = ({ activo, onClick, children, oscuro = true }) => (
  <button
    type="button"
    aria-pressed={activo}
    onClick={onClick}
    className={`rounded-full px-4 py-2.5 text-[13px] font-bold transition-colors cursor-pointer ${
      activo
        ? 'text-[#1F1226]'
        : oscuro ? 'border border-white/15 text-white/75 hover:border-white/40' : 'border border-[#1A1020]/12 bg-white text-[#1A1020] hover:border-[#1A1020]/30'
    }`}
    style={activo ? { background: ORO } : undefined}
  >
    {children}
  </button>
);

// ═══ 1. Carta y reservas: la reserva se compone en vivo y llega al WhatsApp ═══
const SERVICIOS_DEMO = [
  { n: 'Manicura rusa', min: 90, usd: 18 },
  { n: 'Lifting de pestañas', min: 60, usd: 25 },
  { n: 'Diseño de cejas', min: 30, usd: 10 },
];
const ESPECIALISTAS = ['Daniela', 'Valeria', 'Mariana'];
const HORAS = ['9:00', '10:30', '12:00', '15:00', '16:30', '18:00'];
const OCUPADAS: Record<number, number[]> = { 0: [1, 3], 1: [0, 4, 5], 2: [2] };

export const SimuladorReserva: React.FC = () => {
  const [s, setS] = useState(0);
  const [e, setE] = useState(0);
  const [h, setH] = useState(0);
  const [moneda, setMoneda] = useState<'$' | 'Bs'>('$');
  const libres = HORAS.map((_, i) => !OCUPADAS[e].includes(i));
  const horaValida = libres[h] ? h : libres.findIndex(Boolean);
  const serv = SERVICIOS_DEMO[s];
  const precio = moneda === '$' ? `${serv.usd} $` : bs(serv.usd);
  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_0.9fr] lg:items-start">
      {/* La carta de la clienta */}
      <div className="rounded-[30px] border border-white/10 bg-[#FBFAFC] p-5 text-[#1A1020] shadow-[0_40px_80px_-40px_rgba(0,0,0,0.8)] sm:p-6">
        <div className="flex items-center justify-between">
          <p className="font-lujo text-[22px] leading-none">Estudio Ámbar</p>
          <div role="radiogroup" aria-label="Moneda" className="flex rounded-full bg-[#F4F0EA] p-1 text-[12px] font-bold">
            {(['$', 'Bs'] as const).map((m) => (
              <button key={m} type="button" role="radio" aria-checked={moneda === m} onClick={() => setMoneda(m)} className={`rounded-full px-3 py-1.5 cursor-pointer ${moneda === m ? 'bg-[#1F1226] text-white' : 'text-[#6E6478]'}`}>{m}</button>
            ))}
          </div>
        </div>
        <p className="mt-5 text-[11px] font-bold uppercase tracking-[0.22em] text-[#7D6438]">1 · Servicio</p>
        <div className="mt-2 space-y-2">
          {SERVICIOS_DEMO.map((x, i) => (
            <button key={x.n} type="button" aria-pressed={s === i} onClick={() => setS(i)} className={`flex w-full items-center justify-between rounded-2xl px-4 py-3 text-left text-[14px] transition-colors cursor-pointer ${s === i ? 'bg-[#1F1226] text-white' : 'bg-white ring-1 ring-[#1A1020]/8'}`}>
              <span className="font-bold">{x.n} <span className={`font-medium ${s === i ? 'text-white/60' : 'text-[#6E6478]'}`}>· {x.min} min</span></span>
              <span className="font-bold">{moneda === '$' ? `${x.usd} $` : bs(x.usd)}</span>
            </button>
          ))}
        </div>
        <p className="mt-5 text-[11px] font-bold uppercase tracking-[0.22em] text-[#7D6438]">2 · Con quién</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {ESPECIALISTAS.map((x, i) => (
            <Chip key={x} oscuro={false} activo={e === i} onClick={() => setE(i)}>{x}</Chip>
          ))}
        </div>
        <p className="mt-5 text-[11px] font-bold uppercase tracking-[0.22em] text-[#7D6438]">3 · Jueves 30, huecos libres de {ESPECIALISTAS[e]}</p>
        <div className="mt-2 grid grid-cols-3 gap-2">
          {HORAS.map((x, i) => (
            <button key={x} type="button" disabled={!libres[i]} aria-pressed={horaValida === i} onClick={() => setH(i)} className={`rounded-xl py-2.5 text-[13px] font-bold transition-colors ${!libres[i] ? 'cursor-not-allowed bg-[#F4F0EA] text-[#1A1020]/25 line-through' : horaValida === i ? 'bg-[#4A1F5C] text-white cursor-pointer' : 'bg-white ring-1 ring-[#1A1020]/10 cursor-pointer'}`}>
              {x}
            </button>
          ))}
        </div>
      </div>
      {/* Lo que te llega a ti */}
      <div className="lg:sticky lg:top-28">
        <p className="flex items-center gap-2 text-[13px] font-bold text-white/70"><MessageCircle className="h-4 w-4 text-[#E7CF9C]" /> Lo que te llega a tu WhatsApp</p>
        <div className="mt-3 rounded-[26px] bg-[#0E1A14] p-4 sm:p-5">
          <AnimatePresence mode="wait">
            <motion.div key={`${s}-${e}-${horaValida}-${moneda}`} initial={{ opacity: 0, y: 12, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.35, ease: CURVA }} className="ml-auto max-w-[92%] rounded-2xl rounded-tr-md bg-[#1F5C46] px-4 py-3 text-[14px] leading-relaxed text-white">
              <p className="font-bold">Nueva reserva · Estudio Ámbar</p>
              <p className="mt-1">{serv.n} con {ESPECIALISTAS[e]}</p>
              <p>Jueves 30 · {HORAS[horaValida]} · {serv.min} min</p>
              <p>Precio: <b>{precio}</b></p>
              <p className="mt-1 text-white/70">Clienta: Camila · 0414-•••-••21</p>
              <p className="mt-2 text-right text-[11px] text-white/50">23:48 ✓✓</p>
            </motion.div>
          </AnimatePresence>
          <div className="mt-3 flex gap-2">
            <span className="flex-1 rounded-full bg-white/10 py-2.5 text-center text-[13px] font-bold text-white">Confirmar</span>
            <span className="flex-1 rounded-full border border-white/15 py-2.5 text-center text-[13px] font-bold text-white/70">Proponer otra hora</span>
          </div>
        </div>
        <p className="mt-4 text-[14px] leading-relaxed text-white/60">Las horas tachadas ya están ocupadas: tu clienta nunca ve un hueco que no existe. Cambia de especialista y mira cómo cambian.</p>
      </div>
    </div>
  );
};

/** La noche de una reserva: el reloj avanza con el scroll de 23:48 a las 9:00. */
export const NocheDeReserva: React.FC = () => {
  const reducir = useReducedMotion();
  const ref = useRef<HTMLElement | null>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end end'] });
  const giro = useTransform(scrollYProgress, [0, 1], [reducir ? 0 : -40, reducir ? 0 : 280]);
  const cielo = useTransform(scrollYProgress, [0, 0.7, 1], ['#140B19', '#2A1236', '#6B4A3A']);
  const momentos = [
    { hora: '23:48', icono: Moon, t: 'Camila ve tu carta en la cama', d: 'Desde tu Instagram. Elige lifting con Valeria, el jueves a las 10:30.' },
    { hora: '23:49', icono: CalendarCheck, t: 'La cita queda pedida', d: 'Sin esperar respuesta. El hueco se aparta y nadie más lo puede coger.' },
    { hora: '07:30', icono: MessageCircle, t: 'Lo ves con el café', d: 'Te llega ordenada, con servicio, especialista, hora y precio.' },
    { hora: '07:31', icono: Check, t: 'Confirmas con un toque', d: 'Ella recibe su confirmación con el botón para guardarla en su calendario.' },
  ];
  return (
    <motion.section ref={ref} style={{ background: cielo }} className="relative text-white">
      <div className="mx-auto grid max-w-6xl gap-10 px-5 py-24 sm:px-8 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="lg:sticky lg:top-28 lg:h-fit">
          <Etiqueta oscuro>Una reserva cualquiera</Etiqueta>
          <h2 className="mt-4 font-lujo text-[40px] font-medium leading-[1.02] tracking-[-0.02em] sm:text-6xl">Mientras duermes, <span className="italic font-light text-[#E7CF9C]">tu carta trabaja.</span></h2>
          <div className="mt-10 hidden h-48 w-48 items-center justify-center rounded-full border border-[#C9A45C]/40 lg:flex" aria-hidden="true">
            <motion.span style={{ rotate: giro, y: -40 }} className="block h-20 w-[2px] origin-bottom rounded-full bg-[#E7CF9C]" />
          </div>
        </div>
        <ol className="relative space-y-12 border-l border-[#C9A45C]/30 pl-7">
          {momentos.map((m, i) => {
            const Icono = m.icono;
            return (
              <motion.li key={m.hora} initial={{ opacity: 0, x: 20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true, amount: 0.6 }} transition={{ duration: 0.7, delay: i * 0.05, ease: CURVA }} className="relative">
                <span className="absolute -left-[46px] flex h-9 w-9 items-center justify-center rounded-full bg-[#1F1226] ring-1 ring-[#C9A45C]/50"><Icono className="h-4 w-4 text-[#E7CF9C]" /></span>
                <p className="font-lujo text-[48px] font-medium leading-none text-[#E7CF9C] sm:text-[64px]">{m.hora}</p>
                <p className="mt-3 text-[19px] font-bold">{m.t}</p>
                <p className="mt-1 max-w-md text-[15px] leading-relaxed text-white/70">{m.d}</p>
              </motion.li>
            );
          })}
        </ol>
      </div>
    </motion.section>
  );
};

// ═══ 2. Pasaporte VIP: la dueña diseña su premio y sella citas ═══
const PREMIOS = ['Diseño de cejas gratis', '10 % en su próxima cita', 'Hidratación de manos'];

export const TallerPasaporte: React.FC = () => {
  const reducir = useReducedMotion();
  const [meta, setMeta] = useState(5);
  const [premio, setPremio] = useState(0);
  const [sellos, setSellos] = useState(2);
  const lleno = sellos >= meta;
  return (
    <div className="grid gap-8 lg:grid-cols-[0.85fr_1.15fr] lg:items-center">
      <div className="space-y-6">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-[#D9C49B]">Tú eliges el premio</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {PREMIOS.map((p, i) => <Chip key={p} activo={premio === i} onClick={() => setPremio(i)}>{p}</Chip>)}
          </div>
        </div>
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-[#D9C49B]">Y a cuántas visitas</p>
          <div className="mt-3 flex gap-2">
            {[4, 5, 6, 8].map((n) => <Chip key={n} activo={meta === n} onClick={() => { setMeta(n); setSellos((v) => Math.min(v, n)); }}>{n}</Chip>)}
          </div>
        </div>
        <div className="flex gap-3">
          <button type="button" disabled={lleno} onClick={() => setSellos((v) => Math.min(meta, v + 1))} className="v-brillo-boton relative flex-1 overflow-hidden rounded-full px-6 py-4 text-[15px] font-bold text-[#1F1226] disabled:opacity-40 cursor-pointer" style={{ background: ORO }}>
            Cerrar la cita de hoy
          </button>
          <button type="button" aria-label="Empezar de nuevo" onClick={() => setSellos(0)} className="flex h-[52px] w-[52px] items-center justify-center rounded-full border border-white/20 text-white/80 hover:border-white/50 cursor-pointer">
            <RotateCcw className="h-4 w-4" />
          </button>
        </div>
        <p className="text-[14px] leading-relaxed text-white/60">Así funciona en tu panel: cierras la cita y el sello se suma solo. Solo tu equipo puede sellar, cada una con su clave.</p>
      </div>
      {/* El pasaporte en el móvil de la clienta */}
      <div className="relative overflow-hidden rounded-[30px] p-6 sm:p-8" style={{ background: 'linear-gradient(140deg, #2A1236 0%, #1F1226 55%, #140B19 100%)' }}>
        <div className="pointer-events-none absolute inset-[10px] rounded-[22px] border border-[#C9A45C]/40" />
        <div className="relative flex items-start justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.34em] text-[#E7CF9C]">Pasaporte VIP</p>
            <p className="mt-1.5 font-lujo text-[26px] leading-none text-white">Estudio Ámbar</p>
          </div>
          <span className="font-lujo text-[22px] italic text-[#E7CF9C]">#001</span>
        </div>
        <div className="relative mt-8 grid gap-3" style={{ gridTemplateColumns: `repeat(${meta <= 5 ? meta : Math.ceil(meta / 2)}, minmax(0, 1fr))` }}>
          {Array.from({ length: meta }, (_, i) => {
            const puesto = i < sellos;
            return (
              <div key={i} className="flex aspect-square items-center justify-center rounded-full border border-dashed border-[#C9A45C]/40">
                <AnimatePresence>
                  {puesto && (
                    <motion.span initial={{ scale: reducir ? 1 : 2.2, opacity: 0, rotate: reducir ? 0 : -25 }} animate={{ scale: 1, opacity: 1, rotate: 0 }} exit={{ scale: 0.6, opacity: 0 }} transition={{ type: 'spring', stiffness: 380, damping: 18 }} className="flex h-[82%] w-[82%] items-center justify-center rounded-full font-lujo text-[22px] font-medium text-[#1F1226]" style={{ background: ORO }}>
                      V
                    </motion.span>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
        <div className="relative mt-7 flex items-end justify-between gap-3">
          <div>
            <p className="text-[14px] font-bold text-white">Camila Rojas</p>
            <p className="text-[12px] text-white/60">{lleno ? 'Su premio la está esperando' : `Le faltan ${meta - sellos} para: ${PREMIOS[premio].toLowerCase()}`}</p>
          </div>
          <AnimatePresence>
            {lleno && (
              <motion.span initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="shrink-0 rounded-full px-3 py-1.5 text-[12px] font-bold text-[#1F1226]" style={{ background: ORO }}>
                ¡Premio listo!
              </motion.span>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

// ═══ 3. Equipo y agenda: lo que ves tú y lo que ve tu especialista ═══
const FRANJAS = ['9:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00'];
const CITAS_DIA: { col: number; desde: number; dur: number; t: string; usd: number }[] = [
  { col: 0, desde: 0, dur: 2, t: 'Manicura rusa', usd: 18 },
  { col: 0, desde: 3, dur: 1, t: 'Gel', usd: 15 },
  { col: 0, desde: 6, dur: 2, t: 'Polygel', usd: 22 },
  { col: 1, desde: 1, dur: 1, t: 'Lifting', usd: 25 },
  { col: 1, desde: 4, dur: 2, t: 'Pelo a pelo', usd: 40 },
  { col: 1, desde: 8, dur: 1, t: 'Cejas', usd: 10 },
  { col: 2, desde: 0, dur: 3, t: 'Balayage', usd: 60 },
  { col: 2, desde: 5, dur: 1, t: 'Corte', usd: 12 },
  { col: 2, desde: 7, dur: 2, t: 'Alisado', usd: 45 },
];

export const AgendaEquipo: React.FC = () => {
  const [vista, setVista] = useState<'duena' | 'especialista'>('duena');
  const yo = 1;
  const caja = CITAS_DIA.reduce((t, c) => t + c.usd, 0);
  return (
    <div>
      <div role="radiogroup" aria-label="Quién mira la agenda" className="grid grid-cols-2 gap-1 rounded-full border border-[#1A1020]/10 bg-white p-1 text-[13px] font-bold sm:w-fit">
        {([['duena', 'Lo ves tú, la dueña'], ['especialista', 'Lo ve Valeria']] as const).map(([id, t]) => (
          <button key={id} type="button" role="radio" aria-checked={vista === id} onClick={() => setVista(id)} className={`rounded-full px-5 py-3 transition-colors cursor-pointer ${vista === id ? 'bg-[#1F1226] text-white' : 'text-[#6E6478]'}`}>{t}</button>
        ))}
      </div>
      <div className="mt-6 grid gap-5 lg:grid-cols-[1fr_260px]">
        <div className="overflow-hidden rounded-[26px] bg-white ring-1 ring-[#1A1020]/8">
          <div className="grid grid-cols-[52px_repeat(3,1fr)] border-b border-[#1A1020]/8 text-[12px] font-bold">
            <span />
            {ESPECIALISTAS.map((n, i) => (
              <span key={n} className={`px-2 py-3 text-center ${vista === 'especialista' && i === yo ? 'text-[#4A1F5C]' : 'text-[#1A1020]'}`}>{n}</span>
            ))}
          </div>
          <div className="relative grid grid-cols-[52px_repeat(3,1fr)]" style={{ gridTemplateRows: `repeat(${FRANJAS.length}, 40px)` }}>
            {FRANJAS.map((f, i) => (
              <span key={f} className="border-t border-[#1A1020]/5 pr-2 pt-1 text-right text-[10px] text-[#6E6478]" style={{ gridColumn: 1, gridRow: i + 1 }}>{f}</span>
            ))}
            {CITAS_DIA.map((c, i) => {
              const ajena = vista === 'especialista' && c.col !== yo;
              return (
                <motion.div key={i} layout transition={{ duration: 0.4, ease: CURVA }} className={`m-1 overflow-hidden rounded-xl px-2 py-1.5 text-[11px] leading-tight ${ajena ? 'bg-[#F4F0EA] text-[#1A1020]/35' : c.col === 0 ? 'bg-[#4A1F5C] text-white' : c.col === 1 ? 'bg-[#C9A45C] text-[#1F1226]' : 'bg-[#1F1226] text-white'}`} style={{ gridColumn: c.col + 2, gridRow: `${c.desde + 1} / span ${c.dur}` }}>
                  <p className="font-bold">{ajena ? 'Ocupado' : c.t}</p>
                  {!ajena && <p className="opacity-75">{c.dur * 60} min</p>}
                </motion.div>
              );
            })}
          </div>
        </div>
        <div className="space-y-4">
          <div className="relative overflow-hidden rounded-[24px] bg-[#1F1226] p-5 text-white">
            <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-[#E7CF9C]">Caja de hoy</p>
            <AnimatePresence mode="wait">
              {vista === 'duena' ? (
                <motion.div key="caja" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <p className="mt-2 font-lujo text-[44px] font-medium leading-none">{caja} $</p>
                  <p className="mt-1 text-[13px] text-white/60">{bs(caja)} · {CITAS_DIA.length} citas</p>
                </motion.div>
              ) : (
                <motion.div key="cerrada" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="mt-3 flex items-center gap-2 text-[14px] text-white/70">
                  <Lock className="h-4 w-4 text-[#E7CF9C]" /> Solo la ve la dueña
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <div className="rounded-[24px] bg-white p-5 ring-1 ring-[#1A1020]/8">
            <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-[#7D6438]">Zonas ocupadas hoy</p>
            {[['Mesa de uñas', 62], ['Cabina de pestañas', 48], ['Sillón 1', 75]].map(([z, pct]) => (
              <div key={z as string} className="mt-3">
                <p className="flex justify-between text-[13px] font-bold text-[#1A1020]"><span>{z}</span><span>{pct} %</span></p>
                <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-[#F4F0EA]">
                  <motion.div initial={{ width: 0 }} whileInView={{ width: `${pct}%` }} viewport={{ once: true }} transition={{ duration: 1, ease: CURVA }} className="h-full rounded-full bg-[#4A1F5C]" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

// ═══ 4. Ofertas y tarjetas regalo: el ticket que calcula el sistema ═══
const Linea: React.FC<{ t: string; v: string; acento?: boolean }> = ({ t, v, acento }) => (
  <motion.p layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} className={`flex items-baseline gap-2 text-[14px] ${acento ? 'text-[#4A7A5C]' : 'text-[#1A1020]'}`}>
    <span>{t}</span><span className="flex-1 border-b border-dotted border-[#1A1020]/20" /><span className="font-bold">{v}</span>
  </motion.p>
);

export const TicketOferta: React.FC = () => {
  const [s, setS] = useState(1);
  const [oferta, setOferta] = useState(true);
  const [cupon, setCupon] = useState('');
  const [regalo, setRegalo] = useState(false);
  const serv = SERVICIOS_DEMO[s];
  const cuponOk = cupon.trim().toUpperCase() === 'AMIGA10';
  const ofertaAplica = oferta && s === 1;
  const trasOferta = serv.usd - (ofertaAplica ? 3 : 0);
  const descCupon = cuponOk ? Math.round(trasOferta * 0.1 * 100) / 100 : 0;
  const subtotal = trasOferta - descCupon;
  const usoRegalo = regalo ? Math.min(15, subtotal) : 0;
  const total = Math.round((subtotal - usoRegalo) * 100) / 100;
  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_0.9fr] lg:items-start">
      <div className="space-y-5 text-white">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-[#D9C49B]">Servicio</p>
          <div className="mt-3 flex flex-wrap gap-2">{SERVICIOS_DEMO.map((x, i) => <Chip key={x.n} activo={s === i} onClick={() => setS(i)}>{x.n}</Chip>)}</div>
        </div>
        <label className="flex cursor-pointer items-center justify-between gap-4 rounded-2xl border border-white/12 bg-white/[0.04] px-4 py-3.5">
          <span><span className="flex items-center gap-2 text-[15px] font-bold"><Tag className="h-4 w-4 text-[#E7CF9C]" /> Jueves de lifting −3 $</span><span className="text-[12px] text-white/55">Solo lifting, jueves de 9:00 a 13:00</span></span>
          <input type="checkbox" checked={oferta} onChange={(ev) => setOferta(ev.target.checked)} className="h-5 w-5 accent-[#C9A45C]" />
        </label>
        <div className="rounded-2xl border border-white/12 bg-white/[0.04] px-4 py-3.5">
          <label htmlFor="cupon-demo" className="flex items-center gap-2 text-[15px] font-bold"><Percent className="h-4 w-4 text-[#E7CF9C]" /> Cupón</label>
          <input id="cupon-demo" value={cupon} onChange={(ev) => setCupon(ev.target.value)} placeholder="Prueba AMIGA10" className="mt-2 w-full rounded-xl border border-white/15 bg-transparent px-3 py-2.5 text-[15px] uppercase tracking-[0.12em] text-white placeholder:normal-case placeholder:tracking-normal placeholder:text-white/35 focus:border-[#C9A45C] focus:outline-none" />
          {cupon && <p className={`mt-1.5 text-[12px] ${cuponOk ? 'text-[#9FD3B0]' : 'text-white/50'}`}>{cuponOk ? '10 % aplicado' : 'Ese código no existe'}</p>}
        </div>
        <label className="flex cursor-pointer items-center justify-between gap-4 rounded-2xl border border-white/12 bg-white/[0.04] px-4 py-3.5">
          <span><span className="flex items-center gap-2 text-[15px] font-bold"><Gift className="h-4 w-4 text-[#E7CF9C]" /> Paga con su tarjeta regalo</span><span className="text-[12px] text-white/55">Saldo de 15 $; si cancela, vuelve a la tarjeta</span></span>
          <input type="checkbox" checked={regalo} onChange={(ev) => setRegalo(ev.target.checked)} className="h-5 w-5 accent-[#C9A45C]" />
        </label>
      </div>
      {/* Ticket */}
      <div className="relative rounded-[22px] bg-[#FBF8F1] p-6 shadow-[0_40px_80px_-40px_rgba(0,0,0,0.8)] lg:sticky lg:top-28">
        <div aria-hidden="true" className="absolute -bottom-2 left-4 right-4 h-4" style={{ background: 'radial-gradient(circle at 8px 0, transparent 7px, #FBF8F1 7.5px) 0 0 / 16px 16px repeat-x' }} />
        <p className="font-lujo text-[22px] text-[#1A1020]">Estudio Ámbar</p>
        <p className="text-[12px] text-[#6E6478]">Jueves 30 · 10:30 · con Valeria</p>
        <div className="mt-5 space-y-2.5">
          <Linea t={serv.n} v={`${serv.usd} $`} />
          <AnimatePresence>{ofertaAplica && <Linea key="o" t="Jueves de lifting" v="−3 $" acento />}</AnimatePresence>
          {oferta && s !== 1 && <p className="text-[12px] text-[#6E6478]">La oferta del jueves es solo para lifting: no se aplica.</p>}
          <AnimatePresence>{cuponOk && <Linea key="c" t="Cupón AMIGA10" v={`−${descCupon} $`} acento />}</AnimatePresence>
          <AnimatePresence>{usoRegalo > 0 && <Linea key="r" t="Tarjeta regalo" v={`−${usoRegalo} $`} acento />}</AnimatePresence>
        </div>
        <div className="mt-5 border-t border-dashed border-[#1A1020]/20 pt-4">
          <p className="flex items-baseline justify-between"><span className="text-[13px] font-bold uppercase tracking-[0.18em] text-[#7D6438]">Total</span><span className="font-lujo text-[44px] font-medium leading-none text-[#1A1020]">{total} $</span></p>
          <p className="text-right text-[13px] text-[#6E6478]">{bs(total)}</p>
        </div>
        <p className="mt-5 flex items-center gap-2 rounded-xl bg-[#1F1226] px-3 py-2.5 text-[12px] font-bold text-white"><Check className="h-4 w-4 text-[#E7CF9C]" /> Lo calcula el servidor: nadie puede cambiar el total</p>
      </div>
    </div>
  );
};

/** Semana de ejemplo: la oferta llena el día flojo. */
export const SemanaFloja: React.FC = () => {
  const [conOferta, setConOferta] = useState(false);
  const dias = [['Lun', 70], ['Mar', 55], ['Mié', 80], ['Jue', conOferta ? 88 : 30], ['Vie', 95], ['Sáb', 100]] as const;
  return (
    <div className="rounded-[28px] bg-white p-6 ring-1 ring-[#1A1020]/8 sm:p-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <p className="font-lujo text-[26px] leading-tight text-[#1A1020]">Tu agenda de la semana</p>
        <button type="button" aria-pressed={conOferta} onClick={() => setConOferta((v) => !v)} className={`rounded-full px-5 py-3 text-[13px] font-bold transition-colors cursor-pointer ${conOferta ? 'text-[#1F1226]' : 'bg-[#1F1226] text-white'}`} style={conOferta ? { background: ORO } : undefined}>
          {conOferta ? 'Oferta del jueves activa' : 'Activar «Jueves de lifting»'}
        </button>
      </div>
      <div className="mt-8 flex h-48 items-end gap-2 sm:gap-4">
        {dias.map(([d, pct]) => (
          <div key={d} className="flex h-full flex-1 flex-col items-center justify-end gap-2">
            <span className="text-[12px] font-bold text-[#1A1020]">{pct} %</span>
            <motion.div animate={{ height: `${pct}%` }} transition={{ type: 'spring', stiffness: 120, damping: 18 }} className={`w-full rounded-t-xl ${d === 'Jue' ? (conOferta ? 'bg-[#C9A45C]' : 'bg-[#E58A8A]/60') : 'bg-[#4A1F5C]/80'}`} />
            <span className="text-[12px] font-bold text-[#6E6478]">{d}</span>
          </div>
        ))}
      </div>
      <p className="mt-6 text-[14px] leading-relaxed text-[#4A4150]">Ejemplo de ocupación. La oferta sale en tu carta con su banner solo en el día y la hora que elijas, y deja de ofrecerse sola cuando termina.</p>
    </div>
  );
};

// ═══ 5. QR y kit: el QR no cambia aunque cambie la carta ═══
/** Dibujo decorativo con forma de QR (no se puede escanear: el QR real sale en el kit de cada salón). */
const DibujoQr: React.FC<{ color?: string }> = ({ color = '#1F1226' }) => {
  const celdas = useMemo(() => {
    const n = 25;
    const out: [number, number][] = [];
    let semilla = 7;
    const azar = () => { semilla = (semilla * 9301 + 49297) % 233280; return semilla / 233280; };
    const enEsquina = (x: number, y: number) => (x < 8 && y < 8) || (x > n - 9 && y < 8) || (x < 8 && y > n - 9);
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) if (!enEsquina(x, y) && azar() > 0.52) out.push([x, y]);
    return out;
  }, []);
  const Ojo: React.FC<{ x: number; y: number }> = ({ x, y }) => (
    <g>
      <rect x={x} y={y} width={7} height={7} rx={1.6} fill="none" stroke={color} strokeWidth={1} />
      <rect x={x + 2} y={y + 2} width={3} height={3} rx={0.8} fill={color} />
    </g>
  );
  return (
    <svg viewBox="-0.5 -0.5 26 26" className="h-full w-full" aria-hidden="true">
      {celdas.map(([x, y]) => <rect key={`${x}-${y}`} x={x + 0.1} y={y + 0.1} width={0.8} height={0.8} rx={0.25} fill={color} />)}
      <Ojo x={0} y={0} /><Ojo x={18} y={0} /><Ojo x={0} y={18} />
    </svg>
  );
};

const VERSIONES_CARTA = [
  { cuando: 'Lunes', items: [['Manicura rusa', '18 $'], ['Lifting', '25 $'], ['Cejas', '10 $']] },
  { cuando: 'Jueves', items: [['Manicura rusa', '18 $'], ['Lifting', '22 $ · oferta'], ['Cejas', '10 $']] },
  { cuando: 'Diciembre', items: [['Manicura navideña', '20 $'], ['Lifting', '25 $'], ['Tarjeta regalo', 'desde 15 $']] },
];

export const QrVivo: React.FC = () => {
  const [v, setV] = useState(0);
  const version = VERSIONES_CARTA[v];
  return (
    <div className="grid items-center gap-6 sm:grid-cols-[0.9fr_1.1fr]">
      <div className="relative mx-auto w-full max-w-[280px]">
        <div className="rounded-[30px] bg-[#FBF8F1] p-6 shadow-[0_40px_80px_-30px_rgba(0,0,0,0.85)]">
          <div className="aspect-square"><DibujoQr /></div>
          <p className="mt-4 text-center font-lujo text-[18px] text-[#1A1020]">Estudio Ámbar</p>
          <p className="text-center text-[11px] font-bold uppercase tracking-[0.22em] text-[#7D6438]">Escanea y reserva</p>
        </div>
        <span className="absolute -right-2 -top-3 rounded-full px-3 py-1.5 text-[11px] font-bold text-[#1F1226] shadow-lg" style={{ background: ORO }}>Impreso una vez</span>
      </div>
      <div>
        <div role="radiogroup" aria-label="Tu carta en otro momento" className="flex flex-wrap gap-2">
          {VERSIONES_CARTA.map((x, i) => <Chip key={x.cuando} activo={v === i} onClick={() => setV(i)}>{x.cuando}</Chip>)}
        </div>
        <div className="mt-4 rounded-[24px] border border-white/12 bg-white/[0.05] p-5">
          <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-[#D9C49B]">Lo que ve quien escanea el {version.cuando.toLowerCase()}</p>
          <AnimatePresence mode="wait">
            <motion.ul key={v} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.3 }} className="mt-3 space-y-2">
              {version.items.map(([n, p]) => (
                <li key={n} className="flex justify-between rounded-xl bg-white/[0.06] px-4 py-3 text-[14px] text-white"><span className="font-bold">{n}</span><span className="text-[#E7CF9C]">{p}</span></li>
              ))}
            </motion.ul>
          </AnimatePresence>
        </div>
        <p className="mt-4 text-[14px] leading-relaxed text-white/65">Cambias precios, ofertas o servicios en tu panel. El papel de la recepción sigue igual y lleva siempre a lo último.</p>
      </div>
    </div>
  );
};

const PALETAS_KIT = [
  { n: 'Ciruela', fondo: '#1F1226', tinta: '#E7CF9C', claro: '#F4F0EA' },
  { n: 'Rosa empolvado', fondo: '#B5838D', tinta: '#FFFFFF', claro: '#F7EEF0' },
  { n: 'Verde salvia', fondo: '#4F6B5B', tinta: '#F3EBDD', claro: '#EEF2EE' },
];

export const KitImprimible: React.FC = () => {
  const [p, setP] = useState(0);
  const pal = PALETAS_KIT[p];
  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {PALETAS_KIT.map((x, i) => (
          <button key={x.n} type="button" aria-pressed={p === i} onClick={() => setP(i)} className={`flex items-center gap-2 rounded-full border px-4 py-2.5 text-[13px] font-bold cursor-pointer ${p === i ? 'border-[#1A1020] bg-white text-[#1A1020]' : 'border-[#1A1020]/12 bg-white/60 text-[#6E6478]'}`}>
            <span className="h-4 w-4 rounded-full" style={{ background: x.fondo }} /> {x.n}
          </button>
        ))}
      </div>
      <div className="mt-8 grid grid-cols-2 items-end gap-4 sm:grid-cols-[1.2fr_1fr_0.8fr]">
        <motion.div layout className="col-span-2 rounded-[22px] p-6 sm:col-span-1" style={{ background: pal.fondo, color: pal.tinta }} transition={{ duration: 0.4 }}>
          <p className="text-[10px] font-bold uppercase tracking-[0.3em] opacity-80">Cartel de recepción</p>
          <p className="mt-3 font-lujo text-[28px] leading-tight">Reserva tu próxima cita aquí</p>
          <div className="mt-5 w-28 rounded-xl bg-white p-2"><DibujoQr /></div>
        </motion.div>
        <motion.div layout className="rounded-[16px] p-4" style={{ background: pal.claro }} transition={{ duration: 0.4 }}>
          <p className="text-[9px] font-bold uppercase tracking-[0.26em]" style={{ color: pal.fondo }}>Tarjeta</p>
          <p className="mt-2 font-lujo text-[18px] leading-tight text-[#1A1020]">Estudio Ámbar</p>
          <div className="mt-3 w-16"><DibujoQr color={pal.fondo} /></div>
        </motion.div>
        <motion.div layout className="flex aspect-square items-center justify-center rounded-full p-5" style={{ background: pal.fondo }} transition={{ duration: 0.4 }}>
          <div className="w-full rounded-lg bg-white p-1.5"><DibujoQr /></div>
        </motion.div>
      </div>
    </div>
  );
};

export const EscaneosPorLugar: React.FC = () => {
  const lugares = [['Biografía de Instagram', 211], ['Recepción', 142], ['Espejo del tocador', 88], ['Tarjeta de visita', 37]] as const;
  const max = 211;
  return (
    <div className="space-y-5">
      {lugares.map(([l, n], i) => (
        <div key={l}>
          <p className="flex items-baseline justify-between text-[15px] text-white"><span className="font-bold">{l}</span><span className="font-lujo text-[26px] text-[#E7CF9C]">{n}</span></p>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10">
            <motion.div initial={{ width: 0 }} whileInView={{ width: `${(n / max) * 100}%` }} viewport={{ once: true, amount: 0.8 }} transition={{ duration: 1.1, delay: i * 0.12, ease: CURVA }} className="h-full rounded-full" style={{ background: ORO }} />
          </div>
        </div>
      ))}
      <p className="text-[13px] text-white/50">Escaneos de ejemplo de un mes. En tu panel ves los de cada QR que crees.</p>
    </div>
  );
};

// ═══ 6. Uñas: configurador de servicio (precio y tiempo exactos) ═══
const TECNICAS_UNAS = [
  { n: 'Gel semipermanente', usd: 15, min: 60 },
  { n: 'Manicura rusa', usd: 18, min: 90 },
  { n: 'Polygel', usd: 22, min: 105 },
];
const LARGOS = [{ n: 'Corto', usd: 0, min: 0 }, { n: 'Medio', usd: 3, min: 15 }, { n: 'Largo', usd: 6, min: 30 }];
const FORMAS = ['Almendra', 'Cuadrada', 'Coffin'] as const;
const EXTRAS_UNAS = [{ n: 'Retirada', usd: 4, min: 20 }, { n: 'Diseño a mano', usd: 5, min: 30 }, { n: 'Piedras', usd: 3, min: 10 }];

const SiluetaUna: React.FC<{ forma: (typeof FORMAS)[number]; largo: number }> = ({ forma, largo }) => {
  const alto = 70 + largo * 22;
  const punta = forma === 'Almendra' ? `Q30 ${-14} 52 0` : forma === 'Cuadrada' ? `L4 ${-6} L48 ${-6} L52 0` : `L10 ${-12} L42 ${-12} L52 0`;
  return (
    <svg viewBox={`-6 -26 64 ${alto + 40}`} className="h-56 w-auto" aria-hidden="true">
      <defs>
        <linearGradient id="una-oro" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#F3E6C4" /><stop offset="0.5" stopColor="#C9A45C" /><stop offset="1" stopColor="#9C7A3C" /></linearGradient>
      </defs>
      <motion.path animate={{ d: `M0 ${alto} L0 0 ${punta} L52 ${alto} Q26 ${alto + 12} 0 ${alto} Z` }} transition={{ duration: 0.5, ease: CURVA }} fill="url(#una-oro)" />
      <path d={`M8 ${alto - 4} Q26 ${alto + 4} 44 ${alto - 4}`} stroke="#1F1226" strokeOpacity="0.25" fill="none" />
    </svg>
  );
};

export const ConfiguradorUnas: React.FC = () => {
  const [t, setT] = useState(1);
  const [l, setL] = useState(1);
  const [f, setF] = useState<(typeof FORMAS)[number]>('Almendra');
  const [extras, setExtras] = useState<number[]>([]);
  const base = TECNICAS_UNAS[t];
  const usd = base.usd + LARGOS[l].usd;
  const min = base.min + LARGOS[l].min;
  const extraUsd = extras.reduce((s, i) => s + EXTRAS_UNAS[i].usd, 0);
  const extraMin = extras.reduce((s, i) => s + EXTRAS_UNAS[i].min, 0);
  const inicio = 10.5;
  const fin = inicio + (min + extraMin) / 60;
  return (
    <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
      <div className="space-y-6">
        {([
          ['Técnica', TECNICAS_UNAS.map((x) => x.n), t, setT],
          ['Largo', LARGOS.map((x) => x.n), l, setL],
        ] as [string, string[], number, (n: number) => void][]).map(([titulo, ops, val, set]) => (
          <div key={titulo}>
            <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-[#7D6438]">{titulo}</p>
            <div className="mt-3 flex flex-wrap gap-2">{ops.map((o, i) => <Chip key={o} oscuro={false} activo={val === i} onClick={() => set(i)}>{o}</Chip>)}</div>
          </div>
        ))}
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-[#7D6438]">Forma</p>
          <div className="mt-3 flex flex-wrap gap-2">{FORMAS.map((o) => <Chip key={o} oscuro={false} activo={f === o} onClick={() => setF(o)}>{o}</Chip>)}</div>
        </div>
        <div className="rounded-[22px] border border-dashed border-[#7D6438]/40 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-[#7D6438]">Extras en la misma cita</p>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {EXTRAS_UNAS.map((x, i) => (
              <Chip key={x.n} oscuro={false} activo={extras.includes(i)} onClick={() => setExtras((v) => (v.includes(i) ? v.filter((k) => k !== i) : [...v, i]))}>+ {x.n}</Chip>
            ))}
          </div>
          <p className="mt-3 text-[13px] leading-relaxed text-[#6E6478]">Tu clienta suma los extras en la misma cita y la agenda guarda el tiempo total.</p>
        </div>
      </div>
      <div className="flex flex-col items-center rounded-[30px] bg-[#1F1226] p-6 text-white sm:p-8">
        <SiluetaUna forma={f} largo={l} />
        <p className="mt-2 text-center font-lujo text-[22px] leading-tight">{base.n} · {LARGOS[l].n.toLowerCase()} · {f.toLowerCase()}</p>
        <div className="mt-5 grid w-full grid-cols-2 gap-3 text-center">
          <div className="rounded-2xl bg-white/[0.06] p-3"><p className="text-[11px] uppercase tracking-[0.2em] text-white/50">Precio</p><p className="font-lujo text-[30px] text-[#E7CF9C]">{usd + extraUsd} $</p><p className="text-[11px] text-white/50">{bs(usd + extraUsd)}</p></div>
          <div className="rounded-2xl bg-white/[0.06] p-3"><p className="text-[11px] uppercase tracking-[0.2em] text-white/50">Tiempo</p><p className="font-lujo text-[30px] text-[#E7CF9C]">{min + extraMin} min</p><p className="text-[11px] text-white/50">en tu agenda</p></div>
        </div>
        <div className="mt-5 w-full">
          <p className="flex justify-between text-[11px] text-white/50"><span>9:00</span><span>Tu mañana</span><span>14:00</span></p>
          <div className="relative mt-1.5 h-9 rounded-xl bg-white/[0.06]">
            <motion.div animate={{ left: `${((inicio - 9) / 5) * 100}%`, width: `${Math.min(((fin - inicio) / 5) * 100, 100 - ((inicio - 9) / 5) * 100)}%` }} transition={{ duration: 0.5, ease: CURVA }} className="absolute inset-y-1 rounded-lg" style={{ background: ORO }} />
          </div>
          <p className="mt-2 text-center text-[12px] text-white/60">Desde las 10:30, ocupa lo justo: ni un minuto más.</p>
        </div>
      </div>
    </div>
  );
};

// ═══ 7. Pestañas y cejas: cada técnica explicada, con su retoque ═══
const TECNICAS_MIRADA = [
  { n: 'Lifting de pestañas', foto: 'pestanas-mirada', sesion: '60 min', dura: '6 a 8 semanas', retoque: 7, cuidados: ['24 h sin mojarlas', 'Sin rímel resistente al agua'] },
  { n: 'Pelo a pelo', foto: 'pestanas-tecnica', sesion: '120 min', dura: 'Con retoque', retoque: 3, cuidados: ['48 h sin vapor ni sauna', 'Cepíllalas cada mañana'] },
  { n: 'Volumen ruso', foto: 'pestanas-cabina', sesion: '150 min', dura: 'Con retoque', retoque: 3, cuidados: ['Sin aceites en los ojos', 'Duerme boca arriba la 1.ª noche'] },
  { n: 'Laminado de cejas', foto: 'cejas-laminado', sesion: '45 min', dura: '6 semanas', retoque: 6, cuidados: ['24 h sin mojarlas', 'Péinalas hacia arriba'] },
];

export const TecnicasMirada: React.FC = () => {
  const [i, setI] = useState(0);
  const t = TECNICAS_MIRADA[i];
  return (
    <div>
      <div role="tablist" aria-label="Técnicas" className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-2 sm:mx-0 sm:flex-wrap sm:px-0">
        {TECNICAS_MIRADA.map((x, k) => (
          <button key={x.n} type="button" role="tab" aria-selected={i === k} onClick={() => setI(k)} className={`shrink-0 rounded-full px-5 py-3 text-[14px] font-bold transition-colors cursor-pointer ${i === k ? 'text-[#1F1226]' : 'border border-white/15 text-white/75'}`} style={i === k ? { background: ORO } : undefined}>{x.n}</button>
        ))}
      </div>
      <AnimatePresence mode="wait">
        <motion.div key={i} role="tabpanel" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.45, ease: CURVA }} className="mt-6 grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="relative overflow-hidden rounded-[28px]">
            <Foto src={t.foto} className="aspect-[4/3] w-full object-cover lg:aspect-[4/5]" />
            <p className="absolute bottom-4 left-4 rounded-full bg-[#140B19]/80 px-4 py-2 font-lujo text-[18px] text-white backdrop-blur">{t.n}</p>
          </div>
          <div className="text-white">
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-2xl border border-white/10 bg-white/[0.05] p-4"><Clock className="h-5 w-5 text-[#E7CF9C]" /><p className="mt-3 text-[12px] uppercase tracking-[0.2em] text-white/50">Sesión</p><p className="font-lujo text-[26px]">{t.sesion}</p></div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.05] p-4"><Eye className="h-5 w-5 text-[#E7CF9C]" /><p className="mt-3 text-[12px] uppercase tracking-[0.2em] text-white/50">Dura</p><p className="font-lujo text-[26px]">{t.dura}</p></div>
            </div>
            <div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.05] p-5">
              <p className="text-[12px] font-bold uppercase tracking-[0.2em] text-white/50">Su retoque, en semanas</p>
              <div className="relative mt-5 h-2 rounded-full bg-white/10">
                <motion.div key={`r${i}`} initial={{ width: 0 }} animate={{ width: `${(t.retoque / 8) * 100}%` }} transition={{ duration: 0.9, ease: CURVA }} className="h-full rounded-full" style={{ background: ORO }} />
                <motion.span key={`m${i}`} initial={{ left: '0%' }} animate={{ left: `${(t.retoque / 8) * 100}%` }} transition={{ duration: 0.9, ease: CURVA }} className="absolute -top-2 h-6 w-6 -translate-x-1/2 rounded-full border-2 border-[#1F1226] bg-[#E7CF9C]" />
              </div>
              <p className="mt-2 flex justify-between text-[11px] text-white/40"><span>Hoy</span><span>4</span><span>8 semanas</span></p>
              <p className="mt-3 text-[15px]">Retoque a la <b className="text-[#E7CF9C]">semana {t.retoque}</b>, reservado como su propio servicio con su precio.</p>
              <p className="mt-3 flex flex-wrap items-center gap-2 text-[13px] text-white/60"><BellRing className="h-4 w-4 text-[#E7CF9C]" /> Le avisamos sola cuando le toca</p>
            </div>
            <ul className="mt-5 space-y-2">
              {t.cuidados.map((c) => <li key={c} className="flex gap-2 text-[15px] text-white/80"><Check className="mt-0.5 h-4 w-4 shrink-0 text-[#E7CF9C]" />{c}</li>)}
            </ul>
            <p className="mt-3 text-[13px] text-white/45">Ejemplo: los tiempos y cuidados los escribes tú en la ficha de cada servicio.</p>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

// ═══ 8. Peluquería: precio por largo y agenda sin cruces ═══
const SERVICIOS_PELO = [
  { n: 'Alisado', largos: [[35, 120], [45, 150], [60, 180]] },
  { n: 'Balayage', largos: [[50, 150], [60, 180], [75, 210]] },
  { n: 'Corte y peinado', largos: [[12, 45], [15, 50], [18, 60]] },
] as const;

export const PrecioPorLargo: React.FC = () => {
  const [s, setS] = useState(0);
  const [l, setL] = useState(1);
  const [usd, min] = SERVICIOS_PELO[s].largos[l];
  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_1fr] lg:items-center">
      <div className="space-y-5">
        <div className="flex flex-wrap gap-2">{SERVICIOS_PELO.map((x, i) => <Chip key={x.n} oscuro={false} activo={s === i} onClick={() => setS(i)}>{x.n}</Chip>)}</div>
        <div className="flex items-end gap-4" role="radiogroup" aria-label="Largo del pelo">
          {['Corto', 'Medio', 'Largo'].map((x, i) => (
            <button key={x} type="button" role="radio" aria-checked={l === i} onClick={() => setL(i)} className="group flex flex-1 flex-col items-center gap-2 cursor-pointer">
              <span className="relative w-full overflow-hidden rounded-t-full rounded-b-2xl bg-[#F4F0EA]" style={{ height: 70 + i * 45 }}>
                <motion.span animate={{ opacity: l === i ? 1 : 0.25 }} className="absolute inset-x-[18%] top-[10%] bottom-0 rounded-t-full" style={{ background: 'linear-gradient(180deg, #4A1F5C, #1F1226)' }} />
              </span>
              <span className={`text-[13px] font-bold ${l === i ? 'text-[#1A1020]' : 'text-[#6E6478]'}`}>{x}</span>
            </button>
          ))}
        </div>
      </div>
      <div className="rounded-[28px] bg-[#1F1226] p-6 text-white sm:p-8">
        <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-[#E7CF9C]">En tu carta</p>
        <AnimatePresence mode="wait">
          <motion.div key={`${s}-${l}`} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.3 }}>
            <p className="mt-3 font-lujo text-[30px] leading-tight">{SERVICIOS_PELO[s].n}, pelo {['corto', 'medio', 'largo'][l]}</p>
            <p className="mt-4 font-lujo text-[56px] font-medium leading-none text-[#E7CF9C]">{usd} $</p>
            <p className="mt-1 text-[14px] text-white/60">{bs(usd)} · {Math.floor(min / 60)} h{min % 60 ? ` ${min % 60} min` : ''} de sillón</p>
          </motion.div>
        </AnimatePresence>
        <p className="mt-6 text-[14px] leading-relaxed text-white/65">Se acabó el «depende»: tu clienta ve el precio de su largo antes de sentarse, y la agenda guarda el tiempo exacto.</p>
      </div>
    </div>
  );
};

const CARRILES = ['Estilista', 'Sillón 1', 'Lavacabezas'];
export const AgendaSinCruces: React.FC = () => {
  const [con, setCon] = useState(true);
  // Horas de 14:00 a 19:00 en pasos de 15 min (20 pasos).
  const bloques = con
    ? [
        { c: 0, d: 0, h: 12, t: 'Balayage · Isabel' }, { c: 1, d: 0, h: 12, t: 'Balayage' }, { c: 2, d: 12, h: 2, t: 'Lavado' },
        { c: 0, d: 14, h: 4, t: 'Corte · Sofía' }, { c: 1, d: 14, h: 4, t: 'Corte' },
      ]
    : [
        { c: 0, d: 0, h: 12, t: 'Balayage · Isabel' }, { c: 1, d: 0, h: 12, t: 'Balayage' },
        { c: 0, d: 8, h: 4, t: 'Corte · Sofía', cruce: true }, { c: 1, d: 8, h: 4, t: 'Corte', cruce: true }, { c: 2, d: 12, h: 2, t: 'Lavado' },
      ];
  return (
    <div className="text-white">
      <div role="radiogroup" aria-label="Cómo se reserva" className="grid grid-cols-2 gap-1 rounded-full border border-white/15 bg-white/[0.04] p-1 text-[13px] font-bold sm:w-fit">
        {([[false, 'En la libreta'], [true, 'Con VANESEV']] as const).map(([v, t]) => (
          <button key={t} type="button" role="radio" aria-checked={con === v} onClick={() => setCon(v)} className={`rounded-full px-5 py-3 cursor-pointer ${con === v ? 'text-[#1F1226]' : 'text-white/70'}`} style={con === v ? { background: ORO } : undefined}>{t}</button>
        ))}
      </div>
      <div className="mt-6 rounded-[26px] border border-white/10 bg-white/[0.03] p-4 sm:p-6">
        {/* En el móvil la tarde se desliza en horizontal para que cada bloque se lea entero. */}
        <div className="-mx-4 overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0">
        <div className="min-w-[560px]">
        <p className="flex justify-between pl-[92px] text-[11px] text-white/40"><span>14:00</span><span>16:00</span><span>18:00</span><span>19:00</span></p>
        <div className="mt-2 space-y-2">
          {CARRILES.map((c, ci) => (
            <div key={c} className="flex items-center gap-3">
              <span className="w-[80px] shrink-0 text-[12px] font-bold text-white/70">{c}</span>
              <div className="relative h-12 flex-1 rounded-xl bg-white/[0.05]">
                {bloques.filter((b) => b.c === ci).map((b) => (
                  <motion.div key={`${b.t}-${b.d}`} layout transition={{ duration: 0.5, ease: CURVA }} className={`absolute inset-y-1 flex items-center overflow-hidden rounded-lg px-2 text-[11px] font-bold ${'cruce' in b && b.cruce ? 'bg-[#E58A8A]/80 text-[#1F1226] ring-2 ring-[#E58A8A]' : ci === 2 ? 'bg-[#4A1F5C] text-white' : 'text-[#1F1226]'}`} style={{ left: `${(b.d / 20) * 100}%`, width: `${(b.h / 20) * 100}%`, background: 'cruce' in b && b.cruce ? undefined : ci === 2 ? undefined : ORO }}>
                    <span className="truncate">{b.t}</span>
                  </motion.div>
                ))}
              </div>
            </div>
          ))}
        </div>
        </div>
        </div>
        <AnimatePresence mode="wait">
          <motion.p key={String(con)} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className={`mt-5 rounded-xl px-4 py-3 text-[14px] ${con ? 'bg-[#C9A45C]/12 text-white' : 'bg-[#E58A8A]/15 text-[#F5C4C4]'}`}>
            {con ? 'La agenda ocupa a tu estilista y al sillón el tiempo exacto. El corte de Sofía solo se ofrece cuando ambos están libres.' : 'Sofía se apuntó a las 16:00 sin ver que el balayage de Isabel dura hasta las 17:00. Dos clientas esperando.'}
          </motion.p>
        </AnimatePresence>
      </div>
    </div>
  );
};

// ═══ 9. Estética: cabinas y aparatos, y bonos de sesiones ═══
const APARATOS = [
  { n: 'Cabina facial', citas: [[0, 2, 'Limpieza profunda'], [3, 2, 'Hidrafacial'], [6, 1, 'Peeling']] },
  { n: 'Radiofrecuencia', citas: [[1, 1, 'Facial'], [4, 2, 'Corporal'], [7, 1, 'Facial']] },
  { n: 'Láser', citas: [[0, 1, 'Axilas'], [2, 1, 'Piernas'], [5, 2, 'Piernas completas']] },
] as const;

export const CabinasYAparatos: React.FC = () => {
  const [sel, setSel] = useState(1);
  return (
    <div className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
      <div className="space-y-2">
        {APARATOS.map((a, i) => (
          <button key={a.n} type="button" aria-pressed={sel === i} onClick={() => setSel(i)} className={`flex w-full items-center justify-between rounded-2xl px-5 py-4 text-left text-[15px] font-bold transition-colors cursor-pointer ${sel === i ? 'bg-[#1F1226] text-white' : 'bg-white text-[#1A1020] ring-1 ring-[#1A1020]/8'}`}>
            {a.n}<span className={`text-[12px] ${sel === i ? 'text-[#E7CF9C]' : 'text-[#6E6478]'}`}>{a.citas.length} citas hoy</span>
          </button>
        ))}
        <p className="pt-2 text-[14px] leading-relaxed text-[#4A4150]">Cada servicio sabe qué cabina o aparato necesita. Si está ocupado, ese hueco no se ofrece.</p>
      </div>
      <div className="rounded-[26px] bg-white p-5 ring-1 ring-[#1A1020]/8">
        <p className="font-lujo text-[22px] text-[#1A1020]">{APARATOS[sel].n} · jueves</p>
        <div className="relative mt-4 grid" style={{ gridTemplateRows: 'repeat(8, 38px)' }}>
          {['9:00', '10:00', '11:00', '12:00', '15:00', '16:00', '17:00', '18:00'].map((h, i) => (
            <span key={h} className="border-t border-[#1A1020]/6 pt-1 text-[10px] text-[#6E6478]" style={{ gridRow: i + 1, gridColumn: 1 }}>{h}</span>
          ))}
          <AnimatePresence>
            {APARATOS[sel].citas.map(([d, h, t]) => (
              <motion.div key={`${sel}-${d}`} initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.35, ease: CURVA }} className="ml-12 mt-1 rounded-xl bg-[#4A1F5C] px-3 py-1.5 text-[12px] font-bold text-white" style={{ gridRow: `${d + 1} / span ${h}`, gridColumn: 1 }}>
                {t}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

export const BonoSesiones: React.FC = () => {
  const [hechas, setHechas] = useState(3);
  const total = 6;
  return (
    <div className="rounded-[28px] border border-dashed border-[#E7CF9C]/40 p-6 text-white sm:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="font-lujo text-[26px] leading-tight">Bono de 6 sesiones de radiofrecuencia</p>
      </div>
      <div className="mt-8 flex items-center">
        {Array.from({ length: total }, (_, i) => (
          <React.Fragment key={i}>
            <button type="button" aria-label={`Sesión ${i + 1}`} onClick={() => setHechas(i + 1)} className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-[14px] font-bold cursor-pointer" style={i < hechas ? { background: ORO, color: '#1F1226' } : { border: '1px solid rgba(255,255,255,0.25)' }}>
              {i < hechas ? <Check className="h-4 w-4" /> : i + 1}
            </button>
            {i < total - 1 && <span className="h-[2px] flex-1" style={{ background: i < hechas - 1 ? '#C9A45C' : 'rgba(255,255,255,0.15)' }} />}
          </React.Fragment>
        ))}
      </div>
      <p className="mt-6 text-[15px] text-white/75">{hechas < total ? `Lleva ${hechas} de ${total}: le quedan ${total - hechas} sesiones pagadas.` : 'Tratamiento completo. Es el momento de ofrecerle el siguiente.'}</p>
      <p className="mt-2 text-[13px] text-white/50">Paquetes de precio cerrado con sus sesiones contadas, en el panel de la dueña y en el móvil de la clienta.</p>
    </div>
  );
};

/** Lista de lo que incluye, en dos columnas en escritorio. */
export const ListaIncluye: React.FC<{ puntos: { titulo: string; texto: string }[]; claro?: boolean }> = ({ puntos, claro }) => (
  <ul className="grid gap-x-12 sm:grid-cols-2">
    {puntos.map((p, i) => (
      <motion.li key={p.titulo} initial={{ opacity: 0, y: 14 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.5 }} transition={{ duration: 0.5, delay: (i % 2) * 0.06, ease: CURVA }} className={`flex gap-4 border-t py-5 ${claro ? 'border-[#1A1020]/10' : 'border-white/10'}`}>
        <span className={`font-lujo text-[22px] leading-none ${claro ? 'text-[#B89B6A]' : 'text-[#C9A45C]'}`}>{String(i + 1).padStart(2, '0')}</span>
        <span>
          <span className={`block font-lujo text-[22px] leading-tight ${claro ? 'text-[#1A1020]' : 'text-white'}`}>{p.titulo}</span>
          <span className={`mt-1 block text-[15px] leading-relaxed ${claro ? 'text-[#4A4150]' : 'text-white/60'}`}>{p.texto}</span>
        </span>
      </motion.li>
    ))}
  </ul>
);
