import React, { useMemo, useState } from 'react';
import { CheckCircle2, CircleDollarSign, ClipboardList, Mail, RefreshCw, Sparkles, Store, XCircle } from 'lucide-react';
import { respuestasLegibles } from '../../api/_cuestionario';

/*
 * Central → Altas (G-063 a G-066): solicitudes de la web y su ficha.
 * nueva → en análisis → pago pedido → pago recibido (el salón se crea solo y sale la bienvenida) → activa.
 */

type Estado = 'nueva' | 'en_analisis' | 'pago_solicitado' | 'pago_recibido' | 'activa' | 'rechazada';
const ESTADOS: Record<Estado, { t: string; c: string }> = {
  nueva: { t: 'Nueva', c: 'bg-[#4A1F5C] text-white' },
  en_analisis: { t: 'En análisis', c: 'bg-amber-100 text-amber-900' },
  pago_solicitado: { t: 'Pago pedido', c: 'bg-sky-100 text-sky-900' },
  pago_recibido: { t: 'Pago recibido · falta activar', c: 'bg-emerald-100 text-emerald-900' },
  activa: { t: 'Activa', c: 'bg-emerald-700 text-white' },
  rechazada: { t: 'Rechazada', c: 'bg-rose-100 text-rose-900' },
};
const OFICIOS: Record<string, string> = { unas: 'Uñas', pestanas_cejas: 'Pestañas y cejas', peluqueria: 'Peluquería', estetica: 'Estética', varios: 'Varios' };
const METODOS = [['pago_movil', 'Pago Móvil'], ['zelle', 'Zelle'], ['binance', 'Binance'], ['efectivo', 'Efectivo'], ['otro', 'Otro']];

async function accion(action: string, payload: Record<string, any>) {
  const res = await fetch('/api/central', { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, payload }) });
  const json = await res.json().catch(() => ({}));
  return { ok: res.ok, json };
}

const campo = 'w-full rounded-xl border border-[#1A1020]/15 bg-white px-3 py-2.5 text-[13px] text-[#1A1020] focus:border-[#4A1F5C] focus:outline-none';

export const CentralAltas: React.FC<{ solicitudes: any[]; ajustesCobro: Record<string, string>; onCambio: () => void }> = ({ solicitudes, ajustesCobro, onCambio }) => {
  const [sel, setSel] = useState<string | null>(solicitudes[0]?.id || null);
  const [filtro, setFiltro] = useState<'abiertas' | 'todas'>('abiertas');
  const [ocupado, setOcupado] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null);
  const [importe, setImporte] = useState('49');
  const [concepto, setConcepto] = useState('Montaje de fundadora');
  const [metodo, setMetodo] = useState('pago_movil');
  const [referencia, setReferencia] = useState('');
  const [nota, setNota] = useState('');
  const [cobro, setCobro] = useState<Record<string, string>>(ajustesCobro || {});
  const [verCobro, setVerCobro] = useState(false);

  const lista = useMemo(() => solicitudes.filter((s) => filtro === 'todas' || !['activa', 'rechazada'].includes(s.estado)), [solicitudes, filtro]);
  const s = solicitudes.find((x) => x.id === sel) || null;
  const pendientes = solicitudes.filter((x) => x.estado === 'nueva').length;

  const ejecutar = async (action: string, payload: Record<string, any>, exito: (j: any) => string) => {
    setOcupado(true); setMsg(null);
    const r = await accion(action, payload);
    setMsg(r.ok ? { ok: true, t: exito(r.json) } : { ok: false, t: r.json?.error || 'No se pudo completar.' });
    setOcupado(false);
    if (r.ok) onCambio();
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-[#8A6A2E]">Altas de salones</p>
          <h2 className="font-lujo text-3xl text-[#1A1020]">Solicitudes {pendientes > 0 && <span className="ml-2 rounded-full bg-[#4A1F5C] px-2.5 py-0.5 align-middle text-sm text-white">{pendientes} nuevas</span>}</h2>
        </div>
        <div className="flex gap-2">
          {(['abiertas', 'todas'] as const).map((f) => (
            <button key={f} type="button" onClick={() => setFiltro(f)} className={`rounded-full px-4 py-2 text-[13px] font-bold cursor-pointer ${filtro === f ? 'bg-[#1F1226] text-white' : 'bg-white text-[#1A1020] ring-1 ring-[#1A1020]/10'}`}>{f === 'abiertas' ? 'Abiertas' : 'Todas'}</button>
          ))}
          <button type="button" onClick={() => setVerCobro((v) => !v)} className="rounded-full bg-white px-4 py-2 text-[13px] font-bold text-[#1A1020] ring-1 ring-[#1A1020]/10 cursor-pointer">Ajustes de cobro</button>
        </div>
      </div>

      {verCobro && (
        <div className="rounded-3xl bg-white p-5 ring-1 ring-[#1A1020]/8">
          <p className="font-lujo text-xl text-[#1A1020]">Datos de cobro (G-066)</p>
          <p className="mt-1 text-[12px] text-[#6E6478]">Salen en el correo «Completa el alta». Si los dejas vacíos, el correo dice que se los envías por WhatsApp.</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {[['titular', 'Titular'], ['pago_movil', 'Pago Móvil (banco, teléfono y cédula/RIF)'], ['zelle', 'Zelle (correo y nombre)'], ['binance', 'Binance (Pay ID o wallet USDT)'], ['nota', 'Nota final del correo']].map(([k, t]) => (
              <label key={k} className={`block text-[12px] font-bold text-[#1A1020] ${k === 'nota' ? 'sm:col-span-2' : ''}`}>{t}
                <input value={cobro[k] || ''} onChange={(e) => setCobro({ ...cobro, [k]: e.target.value })} className={`mt-1 ${campo}`} />
              </label>
            ))}
          </div>
          <button type="button" disabled={ocupado} onClick={() => ejecutar('ajustes_cobro_guardar', cobro, () => 'Datos de cobro guardados.')} className="mt-4 rounded-full bg-[#1F1226] px-5 py-2.5 text-[13px] font-bold text-white disabled:opacity-50 cursor-pointer">Guardar</button>
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-[320px_1fr]">
        <ul className="space-y-2">
          {lista.length === 0 && <li className="rounded-2xl bg-white p-5 text-[13px] text-[#6E6478] ring-1 ring-[#1A1020]/8">No hay solicitudes {filtro === 'abiertas' ? 'abiertas' : ''}. Llegan desde «Quiero mi plaza» en la web.</li>}
          {lista.map((x) => (
            <li key={x.id}>
              <button type="button" onClick={() => { setSel(x.id); setMsg(null); setImporte(String(x.importe_usd ?? 49)); }} className={`w-full rounded-2xl p-4 text-left ring-1 transition-colors cursor-pointer ${sel === x.id ? 'bg-[#1F1226] text-white ring-[#1F1226]' : 'bg-white text-[#1A1020] ring-[#1A1020]/8'}`}>
                <p className="flex items-center justify-between gap-2 text-[14px] font-bold"><span className="truncate">{x.salon_nombre}</span><span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] ${ESTADOS[x.estado as Estado]?.c}`}>{ESTADOS[x.estado as Estado]?.t}</span></p>
                <p className={`mt-1 text-[12px] ${sel === x.id ? 'text-white/65' : 'text-[#6E6478]'}`}>{x.duena_nombre} · {OFICIOS[x.oficio] || x.oficio} · {new Date(x.created_at).toLocaleDateString('es-VE')}{x.cuestionario ? ' · cuestionario ✓' : ''}</p>
              </button>
            </li>
          ))}
        </ul>

        {s ? (
          <div className="space-y-4 rounded-3xl bg-white p-5 ring-1 ring-[#1A1020]/8 sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-lujo text-2xl text-[#1A1020]">{s.salon_nombre}</p>
                <p className="text-[13px] text-[#6E6478]">{s.duena_nombre} · {s.email} · {s.whatsapp}{s.ciudad ? ` · ${s.ciudad}` : ''}</p>
                <p className="text-[13px] text-[#6E6478]">Oficio: {OFICIOS[s.oficio] || s.oficio} · Plan: {s.plan === 'atelier' ? 'Atelier' : 'Esencial'}{s.importe_usd ? ` · Importe: ${s.importe_usd} $` : ''}{s.metodo_pago ? ` · ${s.metodo_pago}${s.referencia_pago ? ` (${s.referencia_pago})` : ''}` : ''}</p>
              </div>
              <span className={`rounded-full px-3 py-1 text-[11px] font-bold ${ESTADOS[s.estado as Estado]?.c}`}>{ESTADOS[s.estado as Estado]?.t}</span>
            </div>
            {s.mensaje && <p className="rounded-2xl bg-[#F4F0EA] p-3 text-[13px] text-[#1A1020]">«{s.mensaje}»</p>}

            {/* G-067 a G-069: lo que contó la dueña en «Cuéntanos tu salón» y su resumen de IA */}
            {s.cuestionario ? (
              <div className="rounded-2xl border border-[#4A1F5C]/15 bg-[#FBFAFC] p-4">
                <p className="flex items-center justify-between gap-2 text-[14px] font-bold text-[#1A1020]">
                  <span className="flex items-center gap-2"><ClipboardList className="h-4 w-4 text-[#4A1F5C]" /> Cuéntanos tu salón</span>
                  <span className="text-[11px] font-semibold text-[#6E6478]">{s.cuestionario_at ? new Date(s.cuestionario_at).toLocaleString('es-VE', { dateStyle: 'short', timeStyle: 'short' }) : ''}</span>
                </p>
                {s.resumen_ia ? (
                  <div className="mt-3 rounded-xl bg-[#1F1226] p-3.5 text-[13px] leading-relaxed text-white/85">
                    <p className="mb-1.5 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.2em] text-[#E7CF9C]"><Sparkles className="h-3 w-3" /> Resumen con IA</p>
                    {String(s.resumen_ia).split('\n').filter(Boolean).map((l: string, i: number) => <p key={i}>{l}</p>)}
                  </div>
                ) : (
                  <button type="button" disabled={ocupado} onClick={() => ejecutar('alta_resumen_ia', { id: s.id }, () => 'Resumen listo.')} className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-[#1F1226] px-4 py-2 text-[12px] font-bold text-white disabled:opacity-50 cursor-pointer"><Sparkles className="h-3.5 w-3.5" /> Resumir con IA</button>
                )}
                <dl className="mt-3 space-y-1.5">
                  {respuestasLegibles(s.cuestionario).map(([p, v]) => (
                    <div key={p} className="grid gap-0.5 text-[12px] sm:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)] sm:gap-3">
                      <dt className="text-[#6E6478]">{p}</dt><dd className="font-semibold text-[#1A1020]">{v}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            ) : !['activa', 'rechazada'].includes(s.estado) && (
              <p className="rounded-2xl bg-[#F4F0EA] p-3 text-[12px] text-[#4A4150]">Aún no ha rellenado «Cuéntanos tu salón». El enlace va en su acuse y en cada correo del circuito.</p>
            )}
            {s.tenant_id && (
              <p className="flex flex-wrap gap-3 text-[13px] font-bold">
                <a href={`/m/${s.tenant_id}`} target="_blank" rel="noopener noreferrer" className="text-[#4A1F5C]">Ver su carta</a>
                <a href={`/${s.tenant_id}/admin`} target="_blank" rel="noopener noreferrer" className="text-[#4A1F5C]">Su panel</a>
              </p>
            )}

            {/* Paso 1: análisis */}
            {['nueva', 'en_analisis'].includes(s.estado) && (
              <div className="flex flex-wrap gap-2">
                {s.estado === 'nueva' && <button type="button" disabled={ocupado} onClick={() => ejecutar('alta_estado', { id: s.id, estado: 'en_analisis' }, () => 'Marcada en análisis. Le llega el aviso «estamos revisando tu solicitud».')} className="rounded-full bg-amber-100 px-4 py-2 text-[13px] font-bold text-amber-900 cursor-pointer">Pasar a análisis (le avisa por correo)</button>}
                <button type="button" disabled={ocupado} onClick={() => ejecutar('alta_estado', { id: s.id, estado: 'rechazada', nota }, () => 'Solicitud rechazada.')} className="inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-[13px] font-bold text-rose-700 hover:bg-rose-50 cursor-pointer"><XCircle className="h-4 w-4" /> Rechazar</button>
              </div>
            )}

            {/* Paso 2: pedir el pago */}
            {['nueva', 'en_analisis', 'pago_solicitado'].includes(s.estado) && (
              <div className="rounded-2xl border border-[#1A1020]/10 p-4">
                <p className="flex items-center gap-2 text-[14px] font-bold text-[#1A1020]"><Mail className="h-4 w-4 text-[#4A1F5C]" /> {s.estado === 'pago_solicitado' ? 'Volver a enviar el correo de pago' : 'Pedir el pago'}</p>
                <div className="mt-3 grid gap-2 sm:grid-cols-[120px_1fr]">
                  <input value={importe} onChange={(e) => setImporte(e.target.value)} inputMode="decimal" className={campo} aria-label="Importe en dólares" />
                  <input value={concepto} onChange={(e) => setConcepto(e.target.value)} className={campo} aria-label="Concepto" />
                </div>
                <button type="button" disabled={ocupado} onClick={() => ejecutar('alta_pedir_pago', { id: s.id, importeUSD: Number(importe.replace(',', '.')), concepto }, (j) => j.correo ? 'Correo de pago enviado.' : 'Pago anotado, pero el correo NO salió: revisa el SMTP.')} className="mt-3 rounded-full bg-[#1F1226] px-5 py-2.5 text-[13px] font-bold text-white disabled:opacity-50 cursor-pointer">Enviar correo de pago</button>
              </div>
            )}

            {/* Paso 3: pago recibido → el salón se crea solo */}
            {['en_analisis', 'pago_solicitado'].includes(s.estado) && (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-4">
                <p className="flex items-center gap-2 text-[14px] font-bold text-[#1A1020]"><CircleDollarSign className="h-4 w-4 text-emerald-700" /> Pago recibido</p>
                <p className="mt-1 text-[12px] text-[#4A4150]">Al confirmarlo se crean solos el salón, su carta por oficio (oculta y sin precio), su landing, su Pasaporte, su QR y la cuenta de la dueña, y le llega el correo de bienvenida con su enlace de activación.</p>
                <div className="mt-3 grid gap-2 sm:grid-cols-3">
                  <select value={metodo} onChange={(e) => setMetodo(e.target.value)} className={campo} aria-label="Medio de pago">{METODOS.map(([v, t]) => <option key={v} value={v}>{t}</option>)}</select>
                  <input value={importe} onChange={(e) => setImporte(e.target.value)} inputMode="decimal" className={campo} aria-label="Importe recibido" />
                  <input value={referencia} onChange={(e) => setReferencia(e.target.value)} placeholder="Referencia" className={campo} />
                </div>
                <button type="button" disabled={ocupado} onClick={() => ejecutar('alta_pago_recibido', { id: s.id, metodo, importeUSD: Number(importe.replace(',', '.')), referencia }, (j) => `Salón creado: ${j.slug}. ${j.correo ? 'Bienvenida enviada.' : 'La bienvenida NO salió: usa «Reenviar activación».'}`)} className="mt-3 inline-flex items-center gap-2 rounded-full bg-emerald-700 px-5 py-2.5 text-[13px] font-bold text-white disabled:opacity-50 cursor-pointer">
                  <Store className="h-4 w-4" /> {ocupado ? 'Creando el salón…' : 'Confirmar pago y crear el salón'}
                </button>
              </div>
            )}

            {s.estado === 'pago_recibido' && (
              <button type="button" disabled={ocupado} onClick={() => ejecutar('alta_reenviar_activacion', { id: s.id }, () => 'Enlace de activación reenviado.')} className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-[13px] font-bold text-[#1A1020] ring-1 ring-[#1A1020]/15 cursor-pointer"><RefreshCw className="h-4 w-4" /> Reenviar activación</button>
            )}
            {s.estado === 'activa' && <p className="flex items-center gap-2 text-[13px] font-bold text-emerald-800"><CheckCircle2 className="h-4 w-4" /> La dueña ya activó su cuenta.</p>}
            {s.tenant_id && ['pago_recibido', 'activa'].includes(s.estado) && (
              <div className="rounded-2xl border border-[#1A1020]/10 p-4">
                <p className="text-[14px] font-bold text-[#1A1020]">Abrir al público</p>
                <p className="mt-1 text-[12px] text-[#4A4150]">Saca el salón de «puesta a punto» cuando su carta tenga precios y fotos. Su pestaña «Puesta a punto» (peticiones de cambio) desaparece de su panel.</p>
                <button type="button" disabled={ocupado} onClick={() => ejecutar('alta_abrir_salon', { id: s.id }, () => 'Salón abierto al público.')} className="mt-3 rounded-full bg-[#1F1226] px-5 py-2.5 text-[13px] font-bold text-white disabled:opacity-50 cursor-pointer">Abrir al público</button>
              </div>
            )}

            <label className="block text-[12px] font-bold text-[#1A1020]">Notas internas
              <textarea defaultValue={s.notas || ''} key={s.id} onBlur={(e) => { if (e.target.value !== (s.notas || '')) ejecutar('alta_nota', { id: s.id, notas: e.target.value }, () => 'Notas guardadas.'); }} onChange={(e) => setNota(e.target.value)} rows={3} className={`mt-1 ${campo}`} />
            </label>

            {msg && <p className={`rounded-xl px-3 py-2 text-[13px] font-bold ${msg.ok ? 'bg-emerald-50 text-emerald-800' : 'bg-rose-50 text-rose-800'}`}>{msg.t}</p>}

            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#8A6A2E]">Historial</p>
              <ol className="mt-2 space-y-1.5">
                {[...(s.historial || [])].reverse().map((h: any, i: number) => (
                  <li key={i} className="text-[12px] text-[#4A4150]"><span className="font-bold text-[#1A1020]">{new Date(h.fecha).toLocaleString('es-VE', { dateStyle: 'short', timeStyle: 'short' })}</span> · {h.nota}</li>
                ))}
              </ol>
            </div>
          </div>
        ) : (
          <div className="rounded-3xl bg-white p-6 text-[13px] text-[#6E6478] ring-1 ring-[#1A1020]/8">Elige una solicitud para ver su ficha.</div>
        )}
      </div>
    </div>
  );
};
