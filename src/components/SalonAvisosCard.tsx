import React, { useEffect, useState } from 'react';
import { BellRing } from 'lucide-react';
import { SalonApi } from '../services/salonApi';

/** Interruptor «Avisos por correo» del salón (T-38, G-059). */
export const SalonAvisosCard: React.FC<{ tenantSlug: string }> = ({ tenantSlug }) => {
  const [activos, setActivos] = useState<boolean | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let vivo = true;
    SalonApi.admin(tenantSlug).then((r) => {
      if (vivo && r.ok) setActivos(r.data.avisosCorreo !== false);
    });
    return () => { vivo = false; };
  }, [tenantSlug]);

  const cambiar = async () => {
    if (activos === null) return;
    const nuevo = !activos;
    setGuardando(true);
    setError(null);
    const r = await SalonApi.guardarAvisos(tenantSlug, nuevo);
    if (r.ok) setActivos(r.data.avisosCorreo);
    else setError(r.error);
    setGuardando(false);
  };

  return (
    <div className="rounded-3xl border border-[#1A1020]/10 bg-white p-5 sm:p-6">
      <div className="flex items-start gap-4">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#1F1226] text-[#E7CF9C]">
          <BellRing className="h-5 w-5" strokeWidth={1.7} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-3">
            <p className="font-lujo text-lg text-[#1A1020]">Avisos por correo</p>
            <button
              type="button"
              role="switch"
              aria-checked={Boolean(activos)}
              aria-label="Activar o desactivar los avisos por correo"
              disabled={activos === null || guardando}
              onClick={cambiar}
              className={`relative h-7 w-12 shrink-0 rounded-full transition-colors disabled:opacity-50 cursor-pointer ${activos ? 'bg-[#1F1226]' : 'bg-[#D9D3DF]'}`}
            >
              <span className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-all ${activos ? 'left-6' : 'left-1'}`} />
            </button>
          </div>
          <p className="mt-1 text-xs leading-relaxed text-[#6E6478]">
            Tus clientas reciben por correo la solicitud, la confirmación, los cambios y dos recordatorios (el día anterior y 2 horas antes). Tú recibes un correo con cada reserva nueva. Solo a quien deja su correo al reservar.
          </p>
          {error && <p className="mt-2 text-xs font-bold text-rose-700">{error}</p>}
        </div>
      </div>
    </div>
  );
};
