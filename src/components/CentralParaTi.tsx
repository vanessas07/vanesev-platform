import React, { useMemo, useState } from 'react';
import { CheckCircle2, MessageSquareText, XCircle } from 'lucide-react';

/*
 * Central → «Para ti, karc0» (G-072): las tareas de karc0 con su contexto y tres respuestas.
 * Al responder, la tarea sale de esta lista y la respuesta entra en el Buzón (sin leer) para Claude,
 * que la recoge al arrancar la siguiente sesión (C-14).
 */

type Respuesta = 'hecho' | 'no_pude' | 'notas';
const PRIORIDAD: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };
const ETIQUETA: Record<string, string> = { critical: 'Crítica', high: 'Alta', medium: 'Media', low: 'Baja' };

export const CentralParaTi: React.FC<{ tareas: any[]; onCambio: () => void }> = ({ tareas, onCambio }) => {
  const [notas, setNotas] = useState<Record<string, string>>({});
  const [ocupado, setOcupado] = useState<string | null>(null);
  const [aviso, setAviso] = useState<{ ok: boolean; t: string } | null>(null);

  const mias = useMemo(
    () => tareas
      .filter((t) => t.assigned_to === 'karc0' && ['pending', 'in_progress'].includes(t.status))
      .sort((a, b) => (PRIORIDAD[a.priority] ?? 9) - (PRIORIDAD[b.priority] ?? 9) || String(a.id).localeCompare(String(b.id), 'es', { numeric: true })),
    [tareas],
  );

  const responder = async (id: string, respuesta: Respuesta) => {
    const texto = (notas[id] || '').trim();
    if (respuesta !== 'hecho' && !texto) {
      setAviso({ ok: false, t: 'Escribe una nota: qué pasó o qué necesitas, para que Claude sepa cómo seguir.' });
      return;
    }
    setOcupado(id); setAviso(null);
    const res = await fetch('/api/central', {
      method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'karc0_responde', payload: { id, respuesta, notas: texto } }),
    });
    const json = await res.json().catch(() => ({}));
    setOcupado(null);
    if (!res.ok) { setAviso({ ok: false, t: json?.error || 'No se pudo enviar.' }); return; }
    setAviso({ ok: true, t: `${id}: respuesta enviada al Buzón de Claude.` });
    setNotas((n) => ({ ...n, [id]: '' }));
    onCambio();
  };

  return (
    <section className="rounded-3xl bg-[#1F1226] p-5 text-white sm:p-7" aria-labelledby="titulo-para-ti">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-[#E7CF9C]">Para ti, karc0</p>
          <h3 id="titulo-para-ti" className="font-lujo text-3xl">{mias.length ? `${mias.length} cosas esperan tu respuesta` : 'Nada pendiente para ti'}</h3>
          <p className="mt-1 max-w-2xl text-[13px] text-white/65">Responde con un botón. La tarea sale de aquí y tu respuesta llega al Buzón de Claude, que la lee al empezar la siguiente sesión.</p>
        </div>
      </div>
      {aviso && <p className={`mt-4 rounded-xl px-3 py-2 text-[13px] font-bold ${aviso.ok ? 'bg-emerald-50 text-emerald-800' : 'bg-rose-50 text-rose-800'}`}>{aviso.t}</p>}
      <ol className="mt-5 space-y-3">
        {mias.map((t) => (
          <li key={t.id} className="rounded-2xl bg-white p-4 text-[#1A1020] sm:p-5">
            <p className="flex flex-wrap items-center gap-2 text-[11px] font-bold">
              <span className="rounded-full bg-[#4A1F5C] px-2.5 py-0.5 text-white">{t.id}</span>
              <span className={`rounded-full px-2.5 py-0.5 ${t.priority === 'critical' ? 'bg-rose-100 text-rose-900' : t.priority === 'high' ? 'bg-amber-100 text-amber-900' : 'bg-[#F4F2F7] text-[#4A4150]'}`}>{ETIQUETA[t.priority] || t.priority}</span>
              {t.zone && <span className="text-[#6E6478]">{t.zone}</span>}
            </p>
            <p className="mt-2 text-[15px] font-bold leading-snug">{t.title}</p>
            {t.description && <p className="mt-1.5 whitespace-pre-line text-[13px] leading-relaxed text-[#4A4150]">{t.description}</p>}
            {t.karc0_notes && <p className="mt-2 rounded-xl bg-[#F4F0EA] px-3 py-2 text-[12px] text-[#4A4150]">{t.karc0_notes}</p>}
            <textarea
              value={notas[t.id] || ''} onChange={(e) => setNotas((n) => ({ ...n, [t.id]: e.target.value }))} rows={2}
              placeholder="Tu nota para Claude (obligatoria si no pudiste o le pasas notas)"
              aria-label={`Nota para ${t.id}`}
              className="mt-3 w-full rounded-xl border border-[#1A1020]/15 bg-[#FBFAFC] px-3 py-2.5 text-[13px] focus:border-[#4A1F5C] focus:outline-none"
            />
            <div className="mt-2.5 flex flex-wrap gap-2">
              <button type="button" disabled={ocupado === t.id} onClick={() => responder(t.id, 'hecho')} className="inline-flex items-center gap-1.5 rounded-full bg-emerald-700 px-4 py-2 text-[12px] font-bold text-white disabled:opacity-50 cursor-pointer"><CheckCircle2 className="h-4 w-4" /> Ya lo hice</button>
              <button type="button" disabled={ocupado === t.id} onClick={() => responder(t.id, 'no_pude')} className="inline-flex items-center gap-1.5 rounded-full bg-rose-50 px-4 py-2 text-[12px] font-bold text-rose-800 ring-1 ring-rose-200 disabled:opacity-50 cursor-pointer"><XCircle className="h-4 w-4" /> No pude</button>
              <button type="button" disabled={ocupado === t.id} onClick={() => responder(t.id, 'notas')} className="inline-flex items-center gap-1.5 rounded-full bg-[#1F1226] px-4 py-2 text-[12px] font-bold text-white disabled:opacity-50 cursor-pointer"><MessageSquareText className="h-4 w-4" /> Te paso notas</button>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
};
