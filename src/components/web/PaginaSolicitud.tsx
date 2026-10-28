import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion, useScroll, useTransform } from 'framer-motion';
import { ArrowLeft, ArrowRight, Check, MessageCircle, PencilLine, Sparkles } from 'lucide-react';
import { CUESTIONARIO, respuestasLegibles } from '../../../api/_cuestionario';

/*
 * /solicitud?t=… — la dueña que pidió plaza sigue su solicitud y nos cuenta cómo es su salón (G-067, G-068).
 * El enlace va firmado (llega en cada correo del circuito); sin él no se ve nada.
 * Estructura propia: hilo de oro con las cinco etapas (se rellena con el scroll) y cuestionario por pasos.
 */

type Solicitud = {
  salon: string; nombre: string; oficio: string; plan: string; estado: string;
  fechas: Record<string, string | null>; importe: number | null;
  cuestionario: Record<string, any> | null; cuestionarioAt: string | null;
};

const ETAPAS: { id: string; t: string; d: string }[] = [
  { id: 'nueva', t: 'Solicitud recibida', d: 'Ya tenemos tus datos.' },
  { id: 'en_analisis', t: 'En análisis', d: 'Revisamos tu caso y, si hace falta, te escribimos por WhatsApp.' },
  { id: 'pago_solicitado', t: 'Pago del montaje', d: 'Te llega un correo con el importe y los medios de pago.' },
  { id: 'pago_recibido', t: 'Tu estudio, creado', d: 'Carta, Pasaporte y QR listos. Te llega el enlace para activar tu cuenta.' },
  { id: 'activa', t: 'Cuenta activa', d: 'Entras en tu panel y lo dejas a tu gusto.' },
];
const ORDEN = ETAPAS.map((e) => e.id);
const WHATSAPP = 'https://wa.me/584223794800';

const fecha = (f?: string | null) => (f ? new Date(f).toLocaleDateString('es-VE', { day: 'numeric', month: 'short' }) : '');

async function llamar(cuerpo: Record<string, any>) {
  const res = await fetch('/api/central', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(cuerpo) });
  const json = await res.json().catch(() => ({}));
  return { ok: res.ok, json };
}

export const PaginaSolicitud: React.FC = () => {
  const params = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : new URLSearchParams();
  const t = params.get('t') || '';
  const recienEnviada = params.get('nueva') === '1';
  const [s, setS] = useState<Solicitud | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(true);
  const [editando, setEditando] = useState(false);
  const cuestionarioRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    document.title = 'Tu solicitud · VANESEV';
    window.scrollTo(0, 0);
    if (!t) { setCargando(false); return; }
    llamar({ action: 'solicitud_estado', t }).then(({ ok, json }) => {
      if (ok) setS(json.solicitud);
      else setError(json?.error || 'No pudimos abrir tu solicitud.');
      setCargando(false);
    }).catch(() => { setError('Sin conexión. Recarga la página.'); setCargando(false); });
  }, [t]);

  const indice = s ? Math.max(0, ORDEN.indexOf(s.estado)) : 0;
  const rechazada = s?.estado === 'rechazada';
  const mostrarCuestionario = s && !rechazada && (!s.cuestionario || editando);

  return (
    <div className="min-h-[100svh] bg-[#FBFAFC]">
      {/* ── Cabecera de obsidiana con el hilo de oro ── */}
      <section className="relative overflow-hidden bg-[#1F1226] px-5 pb-16 pt-32 text-white sm:px-8">
        <div aria-hidden className="pointer-events-none absolute -right-40 -top-40 h-[520px] w-[520px] rounded-full opacity-60" style={{ background: 'radial-gradient(closest-side, rgba(122,62,140,0.55), transparent)' }} />
        <div className="relative mx-auto grid max-w-5xl gap-12 lg:grid-cols-[1.1fr_1fr]">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-[#E7CF9C]">Tu plaza de fundadora</p>
            {cargando ? (
              <p className="mt-6 font-lujo text-[40px] leading-[1.05] text-white/60">Abriendo tu solicitud…</p>
            ) : !t || error ? (
              <>
                <h1 className="mt-5 font-lujo text-[40px] font-medium leading-[1.05] tracking-[-0.02em]">Este enlace <span className="italic font-light text-[#E7CF9C]">no se abre.</span></h1>
                <p className="mt-5 max-w-md text-[15px] leading-relaxed text-white/70">{error || 'Ábrelo desde el botón del correo que te enviamos al pedir tu plaza.'}</p>
                <a href={WHATSAPP} target="_blank" rel="noopener noreferrer" className="mt-7 inline-flex items-center gap-2 rounded-full border border-white/25 px-5 py-3 text-[13px] font-bold hover:border-white/60"><MessageCircle className="h-4 w-4" /> Escríbenos por WhatsApp</a>
              </>
            ) : s && (
              <>
                <h1 className="mt-5 font-lujo text-[40px] font-medium leading-[1.03] tracking-[-0.02em] sm:text-[54px]">
                  {recienEnviada ? <>¡Gracias, {s.nombre}!</> : <>Hola, {s.nombre}.</>}
                  <span className="block italic font-light text-[#E7CF9C]">{s.salon}</span>
                </h1>
                <p className="mt-5 max-w-md text-[15px] leading-relaxed text-white/70">
                  {rechazada
                    ? 'Por ahora no podemos darte plaza. Escríbenos por WhatsApp y lo hablamos con calma.'
                    : s.cuestionario
                      ? 'Ya tenemos tus respuestas. Aquí ves en qué punto está tu solicitud; cada paso también te llega por correo.'
                      : 'Tu solicitud está dentro. Mientras la revisamos, cuéntanos cómo es tu salón: son 3 minutos y tu montaje sale a tu medida.'}
                </p>
                <p className="mt-6 flex flex-wrap gap-2 text-[12px] font-bold">
                  <span className="rounded-full bg-white/10 px-3 py-1.5">{s.oficio}</span>
                  <span className="rounded-full bg-white/10 px-3 py-1.5">Plan {s.plan}</span>
                </p>
                {!s.cuestionario && !rechazada && (
                  <button type="button" onClick={() => cuestionarioRef.current?.scrollIntoView({ behavior: 'smooth' })} className="mt-8 inline-flex items-center gap-2 rounded-full px-6 py-3.5 text-[14px] font-bold text-[#1F1226] cursor-pointer" style={{ background: 'linear-gradient(115deg, #F3E6C4 0%, #C9A45C 50%, #EBD9AE 100%)' }}>
                    Cuéntanos tu salón <ArrowRight className="h-4 w-4" />
                  </button>
                )}
              </>
            )}
          </div>
          {s && !rechazada && <HiloDeOro indice={indice} fechas={s.fechas} importe={s.importe} />}
        </div>
      </section>

      {/* ── Cuestionario o lo que nos contó ── */}
      <div ref={cuestionarioRef} className="scroll-mt-24 px-5 py-16 sm:px-8">
        <div className="mx-auto max-w-3xl">
          {mostrarCuestionario && (
            <Cuestionario
              t={t}
              inicial={s!.cuestionario || {}}
              onEnviado={(nueva) => { setS(nueva); setEditando(false); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
            />
          )}
          {s?.cuestionario && !editando && (
            <Resumen respuestas={s.cuestionario} fechaEnvio={s.cuestionarioAt} onEditar={rechazada ? undefined : () => setEditando(true)} />
          )}
        </div>
      </div>
    </div>
  );
};

/* Etapas en un hilo vertical: el tramo hecho es de oro y se dibuja al desplazarse. */
const HiloDeOro: React.FC<{ indice: number; fechas: Record<string, string | null>; importe: number | null }> = ({ indice, fechas, importe }) => {
  const ref = useRef<HTMLOListElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start 85%', 'end 40%'] });
  const tope = (indice + 0.5) / ETAPAS.length;
  const alto = useTransform(scrollYProgress, [0, 1], [`${tope * 55}%`, `${tope * 100}%`]);
  return (
    <ol ref={ref} className="relative self-center pl-10" aria-label="Estado de tu solicitud">
      <span aria-hidden className="absolute left-[11px] top-2 bottom-2 w-px bg-white/15" />
      <motion.span aria-hidden className="absolute left-[11px] top-2 w-px origin-top" style={{ height: alto, background: 'linear-gradient(#F3E6C4, #C9A45C)' }} />
      {ETAPAS.map((e, i) => {
        const hecha = i < indice;
        const actual = i === indice;
        return (
          <li key={e.id} className="relative pb-7 last:pb-0" aria-current={actual ? 'step' : undefined}>
            <span className={`absolute -left-10 top-0.5 flex h-6 w-6 items-center justify-center rounded-full ${hecha ? 'bg-[#C9A45C] text-[#1F1226]' : actual ? 'bg-[#1F1226] ring-2 ring-[#E7CF9C]' : 'bg-[#1F1226] ring-1 ring-white/25'}`}>
              {hecha ? <Check className="h-3.5 w-3.5" /> : actual ? <motion.span className="h-2 w-2 rounded-full bg-[#E7CF9C]" animate={{ opacity: [1, 0.3, 1] }} transition={{ duration: 1.8, repeat: Infinity }} /> : null}
            </span>
            <p className={`text-[15px] font-bold ${hecha || actual ? 'text-white' : 'text-white/45'}`}>
              {e.t} {fechas[e.id] && (hecha || actual) && <span className="ml-1 text-[12px] font-semibold text-[#E7CF9C]">{fecha(fechas[e.id])}</span>}
            </p>
            {(actual || !hecha) && <p className={`mt-0.5 text-[13px] leading-relaxed ${actual ? 'text-white/70' : 'text-white/35'}`}>{e.id === 'pago_solicitado' && actual && importe ? `Importe: ${importe} $. Los datos están en tu correo.` : e.d}</p>}
          </li>
        );
      })}
    </ol>
  );
};

/* Cuestionario por bloques: opciones para tocar, escala de 1 a 5 y dos campos de texto. */
const Cuestionario: React.FC<{ t: string; inicial: Record<string, any>; onEnviado: (s: Solicitud) => void }> = ({ t, inicial, onEnviado }) => {
  const [paso, setPaso] = useState(0);
  const [r, setR] = useState<Record<string, any>>(inicial);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bloque = CUESTIONARIO[paso];
  const ultimo = paso === CUESTIONARIO.length - 1;
  const contestadas = useMemo(() => Object.values(r).filter((v) => (Array.isArray(v) ? v.length : v !== '' && v !== undefined)).length, [r]);

  const alternar = (id: string, valor: string, max?: number) => {
    const actual: string[] = Array.isArray(r[id]) ? r[id] : [];
    if (actual.includes(valor)) return setR({ ...r, [id]: actual.filter((x) => x !== valor) });
    // «Ninguna» excluye al resto y al revés.
    const base = valor === 'ninguna' ? [] : actual.filter((x) => x !== 'ninguna');
    if (max && base.length >= max) return;
    setR({ ...r, [id]: [...base, valor] });
  };

  const enviar = async () => {
    setEnviando(true); setError(null);
    try {
      const { ok, json } = await llamar({ action: 'solicitud_cuestionario', t, respuestas: r });
      if (ok) onEnviado(json.solicitud);
      else setError(json?.error || 'No se pudo enviar.');
    } catch {
      setError('Sin conexión. Tus respuestas siguen aquí: inténtalo de nuevo.');
    }
    setEnviando(false);
  };

  return (
    <section aria-labelledby="titulo-cuestionario">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-[#7D6438]">Cuéntanos tu salón · {paso + 1} de {CUESTIONARIO.length}</p>
          <h2 id="titulo-cuestionario" className="mt-3 font-lujo text-[34px] font-medium leading-[1.05] tracking-[-0.02em] text-[#1A1020] sm:text-[42px]">{bloque.titulo}</h2>
          <p className="mt-2 text-[15px] text-[#6E6478]">{bloque.entradilla}</p>
        </div>
        <span aria-hidden className="hidden font-lujo text-[88px] leading-none text-[#4A1F5C]/10 sm:block">0{paso + 1}</span>
      </div>
      <div className="mt-6 h-1 overflow-hidden rounded-full bg-[#1A1020]/8" role="progressbar" aria-valuenow={paso + 1} aria-valuemin={1} aria-valuemax={CUESTIONARIO.length}>
        <motion.div className="h-full rounded-full" style={{ background: 'linear-gradient(90deg, #4A1F5C, #C9A45C)' }} animate={{ width: `${((paso + 1) / CUESTIONARIO.length) * 100}%` }} transition={{ duration: 0.5 }} />
      </div>

      <AnimatePresence mode="wait">
        <motion.div key={bloque.id} initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }} transition={{ duration: 0.3 }} className="mt-10 space-y-10">
          {bloque.preguntas.map((p) => (
            <fieldset key={p.id}>
              <legend className="text-[17px] font-bold text-[#1A1020]">{p.texto}</legend>
              {(p.ayuda || p.max) && <p className="mt-1 text-[13px] text-[#6E6478]">{p.ayuda || `Hasta ${p.max}.`}{p.tipo === 'varias' && p.max ? ` Llevas ${(r[p.id] || []).length} de ${p.max}.` : ''}</p>}
              {(p.tipo === 'una' || p.tipo === 'varias') && (
                <div className="mt-4 flex flex-wrap gap-2.5">
                  {p.opciones!.map(([k, texto]) => {
                    const marcada = p.tipo === 'una' ? r[p.id] === k : (r[p.id] || []).includes(k);
                    return (
                      <button
                        key={k} type="button" aria-pressed={marcada}
                        onClick={() => (p.tipo === 'una' ? setR({ ...r, [p.id]: marcada ? '' : k }) : alternar(p.id, k, p.max))}
                        className={`rounded-full px-4 py-2.5 text-[14px] font-semibold transition-all cursor-pointer ${marcada ? 'bg-[#1F1226] text-white shadow-[0_10px_24px_-12px_rgba(31,18,38,0.8)]' : 'bg-white text-[#1A1020] ring-1 ring-[#1A1020]/12 hover:ring-[#4A1F5C]/50'}`}
                      >
                        {marcada && <Check className="-ml-1 mr-1.5 inline h-3.5 w-3.5 text-[#E7CF9C]" />}{texto}
                      </button>
                    );
                  })}
                </div>
              )}
              {p.tipo === 'escala' && (
                <div className="mt-4 flex gap-2.5">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button key={n} type="button" aria-pressed={r[p.id] === n} aria-label={`${n} de 5`} onClick={() => setR({ ...r, [p.id]: n })}
                      className={`h-14 w-14 rounded-2xl font-lujo text-2xl transition-all cursor-pointer ${r[p.id] === n ? 'bg-[#4A1F5C] text-white' : r[p.id] > n ? 'bg-[#4A1F5C]/15 text-[#4A1F5C]' : 'bg-white text-[#1A1020] ring-1 ring-[#1A1020]/12'}`}>
                      {n}
                    </button>
                  ))}
                </div>
              )}
              {p.tipo === 'texto' && (
                p.max && p.max > 100
                  ? <textarea value={r[p.id] || ''} maxLength={p.max} rows={3} onChange={(e) => setR({ ...r, [p.id]: e.target.value })} placeholder="…que mis clientas reserven solas y yo solo tenga que atenderlas." className="mt-4 w-full rounded-2xl border border-[#1A1020]/12 bg-white px-4 py-3.5 font-lujo text-[18px] italic text-[#1A1020] placeholder:text-[#1A1020]/30 focus:border-[#4A1F5C] focus:outline-none" />
                  : <input value={r[p.id] || ''} maxLength={p.max} onChange={(e) => setR({ ...r, [p.id]: e.target.value })} placeholder="@tusalon" className="mt-4 w-full max-w-xs rounded-2xl border border-[#1A1020]/12 bg-white px-4 py-3 text-[15px] text-[#1A1020] focus:border-[#4A1F5C] focus:outline-none" />
              )}
            </fieldset>
          ))}
        </motion.div>
      </AnimatePresence>

      {error && <p className="mt-8 rounded-2xl bg-rose-50 px-4 py-3 text-[14px] text-rose-800">{error}</p>}
      <div className="mt-12 flex items-center justify-between gap-3">
        <button type="button" onClick={() => setPaso((n) => Math.max(0, n - 1))} disabled={paso === 0} className="inline-flex items-center gap-2 rounded-full px-4 py-3 text-[14px] font-bold text-[#1A1020] disabled:opacity-0 cursor-pointer"><ArrowLeft className="h-4 w-4" /> Atrás</button>
        {ultimo ? (
          <button type="button" onClick={enviar} disabled={enviando || contestadas < 3} className="inline-flex items-center gap-2 rounded-full bg-[#1F1226] px-7 py-4 text-[15px] font-bold text-white disabled:opacity-50 cursor-pointer">
            {enviando ? 'Enviando…' : 'Enviar mis respuestas'} <Check className="h-4 w-4" />
          </button>
        ) : (
          <button type="button" onClick={() => { setPaso((n) => n + 1); window.scrollTo({ top: (document.getElementById('titulo-cuestionario')?.getBoundingClientRect().top || 0) + window.scrollY - 120, behavior: 'smooth' }); }} className="inline-flex items-center gap-2 rounded-full bg-[#1F1226] px-7 py-4 text-[15px] font-bold text-white cursor-pointer">
            Siguiente <ArrowRight className="h-4 w-4" />
          </button>
        )}
      </div>
    </section>
  );
};

/* Lo que nos contó, como una ficha editorial. */
const Resumen: React.FC<{ respuestas: Record<string, any>; fechaEnvio: string | null; onEditar?: () => void }> = ({ respuestas, fechaEnvio, onEditar }) => (
  <section aria-labelledby="titulo-resumen">
    <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.3em] text-[#7D6438]"><Sparkles className="h-3.5 w-3.5" /> Lo que nos contaste{fechaEnvio ? ` · ${fecha(fechaEnvio)}` : ''}</p>
    <h2 id="titulo-resumen" className="mt-3 font-lujo text-[34px] font-medium leading-[1.05] tracking-[-0.02em] text-[#1A1020]">Con esto preparamos <span className="italic font-light text-[#4A1F5C]">tu montaje.</span></h2>
    <dl className="mt-8 divide-y divide-[#1A1020]/8 border-y border-[#1A1020]/8">
      {respuestasLegibles(respuestas).map(([p, v]) => (
        <div key={p} className="grid gap-1 py-4 sm:grid-cols-[1fr_1.2fr] sm:gap-6">
          <dt className="text-[13px] font-bold text-[#6E6478]">{p}</dt>
          <dd className="text-[15px] text-[#1A1020]">{v}</dd>
        </div>
      ))}
    </dl>
    <div className="mt-8 flex flex-wrap gap-3">
      {onEditar && <button type="button" onClick={onEditar} className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-3 text-[13px] font-bold text-[#1A1020] ring-1 ring-[#1A1020]/15 cursor-pointer"><PencilLine className="h-4 w-4" /> Cambiar respuestas</button>}
      <a href={WHATSAPP} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-full bg-[#1F1226] px-5 py-3 text-[13px] font-bold text-white"><MessageCircle className="h-4 w-4" /> ¿Dudas? WhatsApp</a>
    </div>
  </section>
);
