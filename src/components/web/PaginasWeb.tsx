import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion, useScroll, useTransform } from 'framer-motion';
import {
  ArrowRight, ArrowUpRight, Award, BellRing, CalendarCheck, Check, Clock, Droplets, Eye, Gift, Hand, Heart, Lock, MessageCircle,
  Minus, Palette, Percent, Plus, Printer, QrCode, Scissors, ShieldCheck, Smartphone, Tag, TrendingUp, Users, Wallet,
} from 'lucide-react';
import { Comparativa, Etiqueta, Foto, Precios, SigueBajando, TarjetaVip } from '../landing/PortadaCinematica';
import { FUNCIONES, OFICIOS_WEB, TODAS_LAS_PAGINAS, type IconoWeb, type PaginaContenido } from './contenidoWeb';
import { LEGALES } from './legales';

/*
 * Páginas de la web de VANESEV (T-34 a T-37): soluciones, oficios, precios, fundadoras y legales.
 * Misma línea que la portada (G-047): Fraunces + Manrope, fotos propias y movimiento ligado al scroll.
 */

const CURVA: [number, number, number, number] = [0.22, 1, 0.36, 1];
const WHATSAPP = 'https://wa.me/584223794800';

const ICONOS: Record<IconoWeb, React.ElementType> = {
  qr: QrCode, calendario: CalendarCheck, whatsapp: MessageCircle, premio: Award, equipo: Users, candado: Lock, regalo: Gift,
  porcentaje: Percent, cartera: Wallet, campana: BellRing, paleta: Palette, reloj: Clock, impresora: Printer, movil: Smartphone,
  escudo: ShieldCheck, grafica: TrendingUp, etiqueta: Tag, corazon: Heart, tijeras: Scissors, ojo: Eye, mano: Hand, gota: Droplets,
};

const aparecer = {
  initial: { opacity: 0, y: 34 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, amount: 0.25 },
  transition: { duration: 0.8, ease: CURVA },
};

/** Ajusta el título y la descripción de la pestaña y de los buscadores en cada página. */
function useMeta(titulo: string, descripcion: string) {
  useEffect(() => {
    document.title = `${titulo} · VANESEV`;
    const m = document.querySelector('meta[name="description"]');
    if (m) m.setAttribute('content', descripcion);
    window.scrollTo(0, 0);
  }, [titulo, descripcion]);
}

// ─── Cabecera de página: foto a sangre con parallax ──────────────────────────
const CabeceraPagina: React.FC<{ etiqueta: string; titulo: string; acento: string; subtitulo: string; foto: string; onPlaza: () => void }> = ({ etiqueta, titulo, acento, subtitulo, foto, onPlaza }) => {
  const reducir = useReducedMotion();
  const ref = useRef<HTMLElement | null>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end start'] });
  const y = useTransform(scrollYProgress, [0, 1], ['0%', reducir ? '0%' : '25%']);
  const escala = useTransform(scrollYProgress, [0, 1], [1.05, reducir ? 1.05 : 1.2]);
  return (
    <section ref={ref} className="relative flex min-h-[92svh] items-end overflow-hidden bg-[#140B19] text-white lg:items-center">
      <motion.div style={{ y, scale: escala }} className="absolute inset-0 lg:left-[40%]">
        <Foto src={foto} eager className="h-full w-full object-cover" />
      </motion.div>
      <div aria-hidden="true" className="absolute inset-0 lg:hidden" style={{ background: 'linear-gradient(180deg, rgba(20,11,25,0.4) 0%, rgba(20,11,25,0.55) 40%, #140B19 85%)' }} />
      <div aria-hidden="true" className="absolute inset-0 hidden lg:block" style={{ background: 'linear-gradient(90deg, #140B19 0%, #140B19 40%, rgba(20,11,25,0.4) 70%, rgba(20,11,25,0.1) 100%)' }} />
      <div className="relative mx-auto w-full max-w-6xl px-5 pb-14 pt-32 sm:px-8 lg:py-32">
        <div className="max-w-xl">
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, ease: CURVA }}>
            <Etiqueta oscuro>{etiqueta}</Etiqueta>
          </motion.div>
          <motion.h1 initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1, duration: 0.9, ease: CURVA }} className="mt-5 font-lujo text-[40px] font-medium leading-[1.02] tracking-[-0.02em] sm:text-6xl lg:text-[68px]">
            {titulo} <span className="italic font-light text-[#E7CF9C]">{acento}</span>
          </motion.h1>
          <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3, duration: 0.8, ease: CURVA }} className="mt-5 text-[16px] leading-relaxed text-white/75 sm:text-lg">
            {subtitulo}
          </motion.p>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45, duration: 0.8, ease: CURVA }} className="mt-7 flex flex-col gap-3 sm:flex-row">
            <button type="button" onClick={onPlaza} className="v-brillo-boton relative inline-flex items-center justify-center gap-2 overflow-hidden rounded-full px-7 py-4 text-[15px] font-bold text-[#1F1226] cursor-pointer" style={{ background: 'linear-gradient(115deg, #F3E6C4 0%, #C9A45C 50%, #EBD9AE 100%)' }}>
              Quiero mi plaza de fundadora <ArrowRight className="h-4 w-4" strokeWidth={2} />
            </button>
            <a href={`${WHATSAPP}?text=${encodeURIComponent('Hola, quiero ver una demo de VANESEV con mis servicios.')}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center gap-2 rounded-full border border-white/25 px-7 py-4 text-[15px] font-bold hover:border-white/60">
              Verla con mis servicios
            </a>
          </motion.div>
          <SigueBajando className="mt-10" />
        </div>
      </div>
    </section>
  );
};

// ─── Dolores: se tachan al pasar ─────────────────────────────────────────────
const Dolores: React.FC<{ dolores: string[] }> = ({ dolores }) => (
  <section className="bg-[#FBFAFC] px-5 py-24 sm:px-8 sm:py-32">
    <div className="mx-auto max-w-4xl">
      <Etiqueta>Lo que te pasa hoy</Etiqueta>
      <ul className="mt-8 space-y-6">
        {dolores.map((d, i) => (
          <motion.li key={d} {...aparecer} transition={{ ...aparecer.transition, delay: i * 0.1 }} className="relative">
            <p className="font-lujo text-[26px] leading-snug text-[#1A1020] sm:text-4xl">
              <span className="relative">
                {d}
                <motion.span initial={{ scaleX: 0 }} whileInView={{ scaleX: 1 }} viewport={{ once: true, amount: 1 }} transition={{ delay: 0.6 + i * 0.15, duration: 0.7, ease: CURVA }} className="absolute left-0 top-[55%] h-[2px] w-full origin-left bg-[#C9A45C]" />
              </span>
            </p>
          </motion.li>
        ))}
      </ul>
      <motion.p {...aparecer} className="mt-10 font-lujo text-[30px] italic text-[#4A1F5C] sm:text-5xl">Con VANESEV, eso se acabó.</motion.p>
    </div>
  </section>
);

// ─── Pasos: título fijo a la izquierda y pasos que se encienden ─────────────
const Pasos: React.FC<{ pasos: { titulo: string; texto: string }[]; foto: string }> = ({ pasos, foto }) => (
  <section className="relative bg-[#F4F0EA] px-5 py-24 sm:px-8 sm:py-32">
    <div className="mx-auto grid max-w-6xl gap-12 lg:grid-cols-2">
      <div className="lg:sticky lg:top-28 lg:self-start">
        <Etiqueta>Cómo funciona</Etiqueta>
        <h2 className="mt-4 font-lujo text-[40px] font-medium leading-[1.02] tracking-[-0.02em] text-[#1A1020] sm:text-6xl">
          Así de <span className="italic font-light text-[#4A1F5C]">sencillo.</span>
        </h2>
        <div className="mt-8 hidden overflow-hidden rounded-[28px] lg:block">
          <Foto src={foto} className="aspect-[4/3] w-full object-cover" />
        </div>
      </div>
      <ol className="space-y-5">
        {pasos.map((p, i) => (
          <motion.li key={p.titulo} {...aparecer} transition={{ ...aparecer.transition, delay: i * 0.08 }} className="flex gap-5 rounded-[26px] bg-white p-6 shadow-[0_24px_60px_-40px_rgba(20,11,25,0.5)] ring-1 ring-[#1A1020]/5 sm:p-8">
            <span className="font-lujo text-[44px] font-medium leading-none text-[#C9A45C]">0{i + 1}</span>
            <div>
              <h3 className="font-lujo text-[24px] leading-tight text-[#1A1020]">{p.titulo}</h3>
              <p className="mt-2 text-[15px] leading-relaxed text-[#4A4150]">{p.texto}</p>
            </div>
          </motion.li>
        ))}
      </ol>
    </div>
  </section>
);

// ─── Qué incluye: rejilla en dos columnas también en el móvil ────────────────
const Incluye: React.FC<{ puntos: PaginaContenido['incluye'] }> = ({ puntos }) => (
  <section className="relative overflow-hidden bg-[#140B19] px-5 py-24 text-white sm:px-8 sm:py-32">
    <div aria-hidden="true" className="pointer-events-none absolute -left-40 top-0 h-[520px] w-[520px] rounded-full blur-3xl" style={{ background: 'radial-gradient(circle, rgba(122,62,140,0.4), transparent 70%)' }} />
    <div className="relative mx-auto max-w-6xl">
      <Etiqueta oscuro>Qué incluye</Etiqueta>
      <h2 className="mt-4 max-w-2xl font-lujo text-[40px] font-medium leading-[1.02] tracking-[-0.02em] sm:text-6xl">
        Todo lo que necesitas, <span className="italic font-light text-[#E7CF9C]">nada que sobre.</span>
      </h2>
      <div className="mt-12 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {puntos.map((x, i) => {
          const Icono = ICONOS[x.icono];
          return (
            <motion.div key={x.titulo} initial={{ opacity: 0, y: 30, scale: 0.96 }} whileInView={{ opacity: 1, y: 0, scale: 1 }} viewport={{ once: true, amount: 0.3 }} transition={{ duration: 0.6, delay: (i % 4) * 0.07, ease: CURVA }} className={`relative flex flex-col rounded-[24px] border p-5 ${x.pronto ? 'border-dashed border-white/15 bg-white/[0.02]' : 'border-white/10 bg-white/[0.05]'}`}>
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-[#F3E6C4] via-[#C9A45C] to-[#9C7A3C] text-[#1F1226]">
                <Icono className="h-5 w-5" strokeWidth={1.7} />
              </span>
              <p className="mt-5 text-[16px] font-bold leading-snug">{x.titulo}</p>
              <p className="mt-1.5 text-[14px] leading-snug text-white/60">{x.texto}</p>
              {x.pronto && <span className="mt-3 w-fit rounded-full border border-[#E7CF9C]/50 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.16em] text-[#E7CF9C]">Muy pronto</span>}
            </motion.div>
          );
        })}
      </div>
    </div>
  </section>
);

// ─── Banda de foto con frase ─────────────────────────────────────────────────
const Banda: React.FC<{ foto: string; frase: string }> = ({ foto, frase }) => {
  const reducir = useReducedMotion();
  const ref = useRef<HTMLElement | null>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] });
  const y = useTransform(scrollYProgress, [0, 1], reducir ? ['0%', '0%'] : ['-12%', '12%']);
  return (
    <section ref={ref} className="relative flex min-h-[70svh] items-center overflow-hidden bg-[#140B19] px-5 text-center text-white sm:px-8">
      <motion.div style={{ y }} className="absolute -inset-y-[12%] inset-x-0">
        <Foto src={foto} className="h-full w-full object-cover opacity-55" />
      </motion.div>
      <div aria-hidden="true" className="absolute inset-0" style={{ background: 'radial-gradient(70% 60% at 50% 50%, rgba(20,11,25,0.3), rgba(20,11,25,0.9) 90%)' }} />
      <motion.p {...aparecer} className="relative mx-auto max-w-4xl font-lujo text-[34px] font-medium italic leading-[1.1] sm:text-6xl">
        «{frase}»
      </motion.p>
    </section>
  );
};

const PreguntasPagina: React.FC<{ preguntas: [string, string][] }> = ({ preguntas }) => {
  const [abierta, setAbierta] = useState<number | null>(0);
  return (
    <section className="bg-[#FBFAFC] px-5 py-24 sm:px-8 sm:py-32">
      <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[0.8fr_1.2fr]">
        <div>
          <Etiqueta>Preguntas</Etiqueta>
          <h2 className="mt-4 font-lujo text-[40px] font-medium leading-[1.02] tracking-[-0.02em] text-[#1A1020] sm:text-5xl">
            Lo que <span className="italic font-light text-[#4A1F5C]">nos preguntan.</span>
          </h2>
        </div>
        <div>
          {preguntas.map(([q, a], i) => {
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

// ─── Sigue explorando: enlaces a las demás páginas ───────────────────────────
const SigueExplorando: React.FC<{ actual: string }> = ({ actual }) => {
  const otras = TODAS_LAS_PAGINAS.filter((p) => p.ruta !== actual).slice(0, 8);
  return (
    <section className="bg-[#F4F0EA] px-5 py-20 sm:px-8">
      <div className="mx-auto max-w-6xl">
        <Etiqueta>Sigue explorando</Etiqueta>
        <div className="-mx-5 mt-6 flex snap-x gap-3 overflow-x-auto px-5 pb-3 sm:mx-0 sm:grid sm:grid-cols-4 sm:overflow-visible sm:px-0">
          {otras.map((p) => (
            <a key={p.ruta} href={p.ruta} className="group relative h-56 w-[62vw] max-w-[260px] shrink-0 snap-start overflow-hidden rounded-[22px] sm:w-auto sm:max-w-none">
              <Foto src={p.foto} className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-110" />
              <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, transparent 30%, rgba(20,11,25,0.9))' }} />
              <span className="absolute inset-x-4 bottom-4 flex items-end justify-between gap-2 text-white">
                <span className="font-lujo text-[22px] leading-tight">{p.menu}</span>
                <ArrowUpRight className="h-5 w-5 shrink-0 text-[#E7CF9C]" strokeWidth={2} />
              </span>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
};

const CierrePagina: React.FC<{ onPlaza: () => void }> = ({ onPlaza }) => (
  <section className="relative overflow-hidden px-5 py-28 text-center text-white sm:px-8" style={{ background: 'radial-gradient(120% 140% at 85% 0%, #4A1F5C 0%, #1F1226 45%, #140B19 100%)' }}>
    <motion.div {...aparecer} className="mx-auto max-w-3xl">
      <h2 className="font-lujo text-[42px] font-medium leading-[1] tracking-[-0.02em] sm:text-7xl">
        Tu marca. Tu agenda. <span className="italic font-light text-[#E7CF9C]">Tus clientas.</span>
      </h2>
      <p className="mx-auto mt-5 max-w-xl text-[16px] text-white/75">Te enseñamos tu carta con tus propios servicios antes de pagar nada.</p>
      <button type="button" onClick={onPlaza} className="v-brillo-boton relative mt-8 overflow-hidden rounded-full px-9 py-4 text-[16px] font-bold text-[#1F1226] cursor-pointer" style={{ background: 'linear-gradient(115deg, #F3E6C4 0%, #C9A45C 50%, #EBD9AE 100%)' }}>
        Quiero mi plaza de fundadora
      </button>
    </motion.div>
  </section>
);

// ─── Página de solución o de oficio ──────────────────────────────────────────
const PaginaSolucion: React.FC<{ c: PaginaContenido; onPlaza: () => void }> = ({ c, onPlaza }) => {
  useMeta(c.menu, c.meta);
  return (
    <>
      <CabeceraPagina etiqueta={c.etiqueta} titulo={c.titulo} acento={c.acento} subtitulo={c.subtitulo} foto={c.foto} onPlaza={onPlaza} />
      <Dolores dolores={c.dolores} />
      <Pasos pasos={c.pasos} foto={c.fotoBanda} />
      <Incluye puntos={c.incluye} />
      {c.ruta === '/funciones/pasaporte-vip' && (
        <section className="bg-[#140B19] px-5 pb-24 sm:px-8">
          <div className="mx-auto max-w-md" style={{ perspective: '1200px' }}>
            <motion.div initial={{ rotateX: 30, opacity: 0 }} whileInView={{ rotateX: 0, opacity: 1 }} viewport={{ once: true, amount: 0.5 }} transition={{ duration: 1, ease: CURVA }}>
              <TarjetaVip />
            </motion.div>
          </div>
        </section>
      )}
      <Banda foto={c.fotoBanda} frase={c.frase} />
      <PreguntasPagina preguntas={c.preguntas} />
      <SigueExplorando actual={c.ruta} />
      <CierrePagina onPlaza={onPlaza} />
    </>
  );
};

// ─── /precios ────────────────────────────────────────────────────────────────
const PaginaPrecios: React.FC<{ onPlaza: () => void }> = ({ onPlaza }) => {
  useMeta('Precios', 'Esencial: 19 $ al mes o 171 $ al año, sin comisiones ni permanencia. Montaje de fundadora a 49 $. Plan Atelier con marketing con IA, muy pronto.');
  return (
    <>
      <div className="h-24 bg-[#FBFAFC]" />
      <Precios onPlaza={onPlaza} />
      <Comparativa />
      <PreguntasPagina
        preguntas={[
          ['¿Hay permanencia?', 'No. Pagas mes a mes (o el año con 3 meses gratis) y lo dejas cuando quieras.'],
          ['¿Cómo pago?', 'Por los medios habituales en Venezuela: Pago Móvil, Zelle o Binance (USDT). Te lo indicamos al darte de alta.'],
          ['¿Qué incluye el montaje de fundadora?', 'Te dejamos tu carta montada con tu lista de servicios, tu logo, tus colores y tus fotos, tu Pasaporte VIP configurado y tu kit con QR listo para imprimir.'],
          ['¿Y si tengo más de 3 personas en mi equipo?', 'Cada profesional más cuesta 3 $ al mes, sin cambiar de plan.'],
          ['¿Cuándo llega Atelier?', 'Está en preparación. Si quieres que te avisemos, escríbenos y serás de las primeras.'],
        ]}
      />
      <CierrePagina onPlaza={onPlaza} />
    </>
  );
};

// ─── /fundadoras ─────────────────────────────────────────────────────────────
const PaginaFundadoras: React.FC<{ onPlaza: () => void }> = ({ onPlaza }) => {
  useMeta('Fundadoras', 'Las 100 primeras dueñas tienen su estudio montado por 49 $ en lugar de 150 $: carta, Pasaporte VIP, panel y kit con QR, con 14 días para probarlo.');
  const incluye = [
    ['Tu carta montada', 'Con tu lista de servicios tal como la tengas: foto, PDF o un mensaje de WhatsApp.'],
    ['Tu marca', 'Tu logo, tus colores, tus letras y tus fotos. Nada de plantillas.'],
    ['Tu Pasaporte VIP', 'Con el premio que tú elijas, listo para el primer sello.'],
    ['Tu equipo', 'Tus especialistas dadas de alta con su clave y su agenda.'],
    ['Tu kit con QR', 'Cartel de recepción, tarjeta y pegatina listos para imprimir.'],
    ['14 días para probarlo', 'Con tus clientas de verdad, antes de pagar la primera cuota.'],
  ];
  const proceso = [
    ['Reservas tu plaza', 'Nos dejas el nombre de tu estudio y tu WhatsApp.'],
    ['Nos mandas tu lista', 'Como la tengas. Con tu logo y unas fotos basta.'],
    ['Te enseñamos tu carta', 'Montada con tus servicios, antes de pagar nada.'],
    ['Empiezas a recibir reservas', 'Pones tu QR en la recepción y el enlace en tu Instagram.'],
  ];
  return (
    <>
      <CabeceraPagina etiqueta="100 plazas de fundadora" titulo="Las primeras cien," acento="con tu estudio montado por nosotras." subtitulo="Montaje completo por 49 $ en lugar de 150 $. Te lo dejamos todo listo y tienes 14 días para probarlo con tus clientas." foto="cejas-laminado" onPlaza={onPlaza} />
      <section className="bg-[#FBFAFC] px-5 py-24 sm:px-8 sm:py-32">
        <div className="mx-auto max-w-6xl">
          <Etiqueta>Qué incluye tu montaje</Etiqueta>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {incluye.map(([t, d], i) => (
              <motion.div key={t} {...aparecer} transition={{ ...aparecer.transition, delay: (i % 3) * 0.08 }} className="rounded-[26px] bg-white p-7 ring-1 ring-[#1A1020]/6 shadow-[0_24px_60px_-40px_rgba(20,11,25,0.45)]">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#C9A45C]/20"><Check className="h-5 w-5 text-[#7D6438]" strokeWidth={2.4} /></span>
                <h3 className="mt-5 font-lujo text-[24px] text-[#1A1020]">{t}</h3>
                <p className="mt-2 text-[15px] leading-relaxed text-[#4A4150]">{d}</p>
              </motion.div>
            ))}
          </div>
          <div className="mt-12 flex flex-col items-start gap-6 rounded-[30px] bg-[#1F1226] p-8 text-white sm:flex-row sm:items-center sm:justify-between sm:p-10">
            <div>
              <p className="text-[12px] font-bold uppercase tracking-[0.24em] text-[#E7CF9C]">Montaje de fundadora</p>
              <p className="mt-2 font-lujo text-[56px] font-medium leading-none">49 $ <span className="text-[24px] text-white/40 line-through">150 $</span></p>
              <p className="mt-2 text-[15px] text-white/70">Y después, Esencial a 19 $ al mes. Sin comisiones y sin permanencia.</p>
            </div>
            <button type="button" onClick={onPlaza} className="v-brillo-boton relative shrink-0 overflow-hidden rounded-full px-8 py-4 text-[15px] font-bold text-[#1F1226] cursor-pointer" style={{ background: 'linear-gradient(115deg, #F3E6C4 0%, #C9A45C 50%, #EBD9AE 100%)' }}>
              Reservar mi plaza
            </button>
          </div>
        </div>
      </section>
      <Pasos pasos={proceso.map(([titulo, texto]) => ({ titulo, texto }))} foto="unas-nude" />
      <Banda foto="pestanas-mirada" frase="Tú pones el talento. Nosotras te lo dejamos todo listo." />
      <CierrePagina onPlaza={onPlaza} />
    </>
  );
};

// ─── /legal/… ────────────────────────────────────────────────────────────────
const PaginaLegal: React.FC<{ id: string }> = ({ id }) => {
  const doc = LEGALES.find((l) => l.id === id) ?? LEGALES[0];
  useMeta(doc.titulo, doc.resumen);
  return (
    <section className="bg-[#FBFAFC] px-5 pb-24 pt-32 sm:px-8 sm:pt-40">
      <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[240px_1fr]">
        <nav aria-label="Documentos legales" className="lg:sticky lg:top-28 lg:self-start">
          <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-[#7D6438]">Legal</p>
          <ul className="mt-4 flex flex-wrap gap-2 lg:flex-col">
            {LEGALES.map((l) => (
              <li key={l.id}>
                <a href={`/legal/${l.id}`} className={`block rounded-full px-4 py-2 text-[14px] font-bold ${l.id === doc.id ? 'bg-[#1F1226] text-white' : 'bg-white text-[#1A1020] ring-1 ring-[#1A1020]/10'}`}>
                  {l.titulo}
                </a>
              </li>
            ))}
          </ul>
        </nav>
        <article className="max-w-3xl">
          <h1 className="font-lujo text-[40px] font-medium leading-[1.05] tracking-[-0.02em] text-[#1A1020] sm:text-6xl">{doc.titulo}</h1>
          <p className="mt-3 text-[14px] text-[#6E6478]">Última actualización: 29 de octubre de 2026</p>
          <p className="mt-6 text-[17px] leading-relaxed text-[#4A4150]">{doc.resumen}</p>
          {doc.secciones.map(([t, parrafos]) => (
            <section key={t} className="mt-10">
              <h2 className="font-lujo text-[26px] text-[#1A1020]">{t}</h2>
              {parrafos.map((p, i) => (
                <p key={i} className="mt-3 text-[16px] leading-relaxed text-[#4A4150]">{p}</p>
              ))}
            </section>
          ))}
        </article>
      </div>
    </section>
  );
};

/** Rutas de la web que no son la portada ni el blog. Devuelve null si la ruta no es una página. */
export function esPaginaWeb(ruta: string): boolean {
  return (
    TODAS_LAS_PAGINAS.some((p) => p.ruta === ruta) ||
    ruta === '/precios' ||
    ruta === '/fundadoras' ||
    ruta.startsWith('/legal/')
  );
}

export const PaginaWeb: React.FC<{ ruta: string; onPlaza: () => void }> = ({ ruta, onPlaza }) => {
  const c = TODAS_LAS_PAGINAS.find((p) => p.ruta === ruta);
  if (c) return <PaginaSolucion c={c} onPlaza={onPlaza} />;
  if (ruta === '/precios') return <PaginaPrecios onPlaza={onPlaza} />;
  if (ruta === '/fundadoras') return <PaginaFundadoras onPlaza={onPlaza} />;
  return <PaginaLegal id={ruta.replace('/legal/', '')} />;
};

export const MENU_FUNCIONES = FUNCIONES.map((f) => ({ ruta: f.ruta, texto: f.menu }));
export const MENU_OFICIOS = OFICIOS_WEB.map((f) => ({ ruta: f.ruta, texto: f.menu }));
