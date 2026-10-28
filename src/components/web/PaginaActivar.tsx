import React, { useEffect, useState } from 'react';
import { ArrowRight, Check, Eye, EyeOff, ShieldCheck } from 'lucide-react';

/*
 * /activar?token=… — la dueña de un salón recién creado crea su contraseña (G-064).
 * El enlace llega en el correo de bienvenida, sirve una sola vez y caduca a las 72 horas.
 */
export const PaginaActivar: React.FC = () => {
  const token = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('token') || '' : '';
  const [clave, setClave] = useState('');
  const [repetida, setRepetida] = useState('');
  const [ver, setVer] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [panel, setPanel] = useState<string | null>(null);

  useEffect(() => {
    document.title = 'Activa tu cuenta · VANESEV';
    window.scrollTo(0, 0);
  }, []);

  const enviar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (clave !== repetida) return setError('Las dos contraseñas no coinciden.');
    setEnviando(true);
    setError(null);
    try {
      const res = await fetch('/api/central', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'activar_cuenta', token, password: clave }) });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) setError(json?.error || 'No se pudo activar la cuenta.');
      else setPanel(json.panel);
    } catch {
      setError('Sin conexión. Inténtalo de nuevo.');
    }
    setEnviando(false);
  };

  const campo = 'w-full rounded-2xl border border-[#1A1020]/12 bg-white px-4 py-3.5 text-[15px] text-[#1A1020] focus:border-[#4A1F5C] focus:outline-none';
  const largo = clave.length >= 10;

  return (
    <section className="min-h-[100svh] px-5 pb-20 pt-32 sm:px-8" style={{ background: 'radial-gradient(90% 60% at 100% 0%, rgba(122,62,140,0.18), transparent 60%), #FBFAFC' }}>
      <div className="mx-auto max-w-md">
        <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-[#7D6438]">Tu estudio en VANESEV</p>
        <h1 className="mt-4 font-lujo text-[40px] font-medium leading-[1.03] tracking-[-0.02em] text-[#1A1020]">
          Crea tu <span className="italic font-light text-[#4A1F5C]">contraseña.</span>
        </h1>
        {!token ? (
          <p className="mt-6 rounded-2xl bg-rose-50 px-4 py-3 text-[14px] text-rose-800">Este enlace está incompleto. Ábrelo desde el botón «Activar mi cuenta» del correo de bienvenida.</p>
        ) : panel ? (
          <div className="mt-8 rounded-[28px] bg-[#1F1226] p-6 text-white">
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[#C9A45C]/20"><Check className="h-5 w-5 text-[#E7CF9C]" /></span>
            <p className="mt-4 font-lujo text-2xl">Cuenta activada.</p>
            <p className="mt-2 text-[14px] leading-relaxed text-white/75">Entra en tu panel con tu correo y tu contraseña nueva. Lo primero: activa la verificación en dos pasos y completa tu perfil.</p>
            <a href={panel} className="mt-6 inline-flex items-center gap-2 rounded-full px-6 py-3.5 text-[14px] font-bold text-[#1F1226]" style={{ background: 'linear-gradient(115deg, #F3E6C4 0%, #C9A45C 50%, #EBD9AE 100%)' }}>
              Ir a mi panel <ArrowRight className="h-4 w-4" />
            </a>
          </div>
        ) : (
          <form onSubmit={enviar} className="mt-8 space-y-4">
            <label className="block text-[13px] font-bold text-[#1A1020]">Contraseña nueva
              <div className="relative mt-1.5">
                <input type={ver ? 'text' : 'password'} required minLength={10} maxLength={128} autoComplete="new-password" value={clave} onChange={(e) => setClave(e.target.value)} className={`${campo} pr-12`} />
                <button type="button" aria-label={ver ? 'Ocultar contraseña' : 'Ver contraseña'} onClick={() => setVer((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6E6478] cursor-pointer">
                  {ver ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </label>
            <label className="block text-[13px] font-bold text-[#1A1020]">Repítela
              <input type={ver ? 'text' : 'password'} required autoComplete="new-password" value={repetida} onChange={(e) => setRepetida(e.target.value)} className={`mt-1.5 ${campo}`} />
            </label>
            <p className={`flex items-center gap-2 text-[13px] ${largo ? 'text-emerald-800' : 'text-[#6E6478]'}`}><Check className="h-4 w-4" /> Al menos 10 caracteres</p>
            {error && <p className="rounded-2xl bg-rose-50 px-4 py-3 text-[14px] text-rose-800">{error}</p>}
            <button type="submit" disabled={enviando || !largo} className="w-full rounded-full bg-[#1F1226] py-4 text-[15px] font-bold text-white disabled:opacity-50 cursor-pointer">
              {enviando ? 'Activando…' : 'Activar mi cuenta'}
            </button>
            <p className="flex items-start gap-2 text-[12px] leading-relaxed text-[#6E6478]"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[#4A1F5C]" /> El enlace sirve una sola vez y caduca a las 72 horas. Nadie de VANESEV conoce tu contraseña.</p>
          </form>
        )}
      </div>
    </section>
  );
};
