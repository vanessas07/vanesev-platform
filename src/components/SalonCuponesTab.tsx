import React, { useState, useEffect } from 'react';
import { SalonApi, CuponSalon } from '../services/salonApi';
import { ServiceItem } from '../types';
import { 
  Percent, 
  HelpCircle, 
  CheckCircle2, 
  AlertCircle, 
  Plus, 
  Trash2, 
  Calendar, 
  Users, 
  ShieldCheck, 
  Info,
  DollarSign
} from 'lucide-react';

interface SalonCuponesTabProps {
  tenantSlug: string;
  services: ServiceItem[];
}

export const SalonCuponesTab: React.FC<SalonCuponesTabProps> = ({ tenantSlug, services }) => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [cupones, setCupones] = useState<CuponSalon[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [codigo, setCodigo] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [tipo, setTipo] = useState<'porcentaje' | 'importe'>('porcentaje');
  const [valor, setValor] = useState<string>('');
  const [serviciosSeleccionados, setServiciosSeleccionados] = useState<string[]>([]);
  const [inicio, setInicio] = useState('');
  const [fin, setFin] = useState('');
  const [usosMax, setUsosMax] = useState<string>('');
  const [unoPorClienta, setUnoPorClienta] = useState(true);

  const cargarCupones = async () => {
    setLoading(true);
    setErrorMsg(null);
    const res = await SalonApi.admin(tenantSlug);
    if (res.ok) {
      setCupones(res.data.cupones || []);
    } else {
      setErrorMsg(res.error);
    }
    setLoading(false);
  };

  useEffect(() => {
    cargarCupones();
  }, [tenantSlug]);

  const handleCodigoChange = (val: string) => {
    // A–Z, 0–9 y guiones; en mayúsculas automáticamente
    const limpio = val.toUpperCase().replace(/[^A-Z0-9-]/g, '').slice(0, 20);
    setCodigo(limpio);
  };

  const toggleServicio = (sId: string) => {
    if (serviciosSeleccionados.includes(sId)) {
      setServiciosSeleccionados(serviciosSeleccionados.filter((id) => id !== sId));
    } else {
      setServiciosSeleccionados([...serviciosSeleccionados, sId]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    if (codigo.length < 3 || codigo.length > 20) {
      setErrorMsg('El código debe tener entre 3 y 20 caracteres alfanuméricos.');
      setSaving(false);
      return;
    }

    const valNum = parseFloat(valor);
    if (isNaN(valNum) || valNum <= 0) {
      setErrorMsg('Indica un valor de descuento mayor que 0.');
      setSaving(false);
      return;
    }

    if (tipo === 'porcentaje' && valNum > 100) {
      setErrorMsg('El descuento porcentual no puede exceder el 100%.');
      setSaving(false);
      return;
    }

    const payload: CuponSalon = {
      codigo: codigo.trim(),
      descripcion: descripcion.trim() || null,
      tipo,
      valor: valNum,
      servicios: serviciosSeleccionados.length > 0 ? serviciosSeleccionados : undefined,
      inicio: inicio || null,
      fin: fin || null,
      usosMax: usosMax ? parseInt(usosMax, 10) : null,
      unoPorClienta,
      activo: true,
    };

    const res = await SalonApi.guardarCupon(tenantSlug, payload);
    setSaving(false);

    if (res.ok) {
      setSuccessMsg(`Cupón ${codigo} creado correctamente.`);
      setShowForm(false);
      resetForm();
      cargarCupones();
      setTimeout(() => setSuccessMsg(null), 4000);
    } else {
      setErrorMsg(res.error);
    }
  };

  const resetForm = () => {
    setCodigo('');
    setDescripcion('');
    setTipo('porcentaje');
    setValor('');
    setServiciosSeleccionados([]);
    setInicio('');
    setFin('');
    setUsosMax('');
    setUnoPorClienta(true);
  };

  const handleBorrar = async (id?: string) => {
    if (!id) return;
    if (!window.confirm('¿Deseas eliminar este cupón? Si ya fue utilizado en reservas, el servidor lo mantendrá desactivado para no romper el historial de cobros.')) return;
    setErrorMsg(null);
    const res = await SalonApi.borrarCupon(tenantSlug, id);
    if (res.ok) {
      if (res.data?.desactivado) {
        setSuccessMsg('El cupón tenía reservas previas asociadas: ha sido desactivado permanentemente para proteger el historial contable.');
      } else {
        setSuccessMsg('Cupón eliminado correctamente.');
      }
      cargarCupones();
      setTimeout(() => setSuccessMsg(null), 5000);
    } else {
      setErrorMsg(res.error);
    }
  };

  return (
    <div className="space-y-6">
      {/* Guía corta de sección */}
      <div className="p-4 rounded-2xl bg-[#FBFAFC] border border-[#1A1020]/10 flex items-start gap-3.5">
        <div className="p-2 rounded-xl bg-[#1F1226]/10 text-[#4A1F5C] shrink-0 mt-0.5">
          <HelpCircle className="w-4 h-4" />
        </div>
        <div className="text-xs text-[#6E6478] leading-relaxed">
          <p className="font-bold text-[#1A1020] text-sm mb-0.5">Cupones de Descuento</p>
          <p>
            Crea códigos promocionales para premiar clientas o campañas en redes. Configura límites de usos totales,
            restricción de una vez por persona y servicios aplicables.
          </p>
        </div>
      </div>

      {/* Aviso legal/operativo para la dueña */}
      <div className="p-3.5 rounded-2xl bg-[#1F1226]/5 border border-[#4A1F5C]/15 text-xs text-[#1A1020] flex items-center gap-2.5 font-medium">
        <Info className="w-4 h-4 text-[#4A1F5C] shrink-0" />
        <span>
          <strong>Protección de historial:</strong> Si borras un cupón que ya haya sido canjeado por alguna clienta,
          el servidor no lo destruirá sino que lo <strong>desactivará</strong> para preservar las auditorías de caja.
        </span>
      </div>

      {errorMsg && (
        <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          <span>{errorMsg}</span>
        </div>
      )}

      {successMsg && (
        <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-start gap-2.5">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Cabecera y botón de nuevo cupón */}
      <div className="flex items-center justify-between gap-3">
        <h4 className="text-sm font-bold text-[#1A1020] flex items-center gap-2">
          <Percent className="w-4 h-4 text-[#4A1F5C]" />
          <span>Cupones Registrados ({cupones.length})</span>
        </h4>
        <button
          type="button"
          onClick={() => { setShowForm(!showForm); resetForm(); }}
          className="px-4 py-2 bg-[#1F1226] hover:bg-[#2E1A38] text-white rounded-full text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-sm"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>{showForm ? 'Cancelar' : 'Crear Cupón'}</span>
        </button>
      </div>

      {/* Formulario de creación */}
      {showForm && (
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 rounded-2xl bg-white border border-[#1A1020]/15 space-y-4 shadow-sm">
          <h5 className="text-xs font-bold text-[#1A1020] uppercase tracking-wider">Nuevo Código Promocional</h5>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="block text-xs font-bold text-[#1A1020]">Código del Cupón * (3–20 caracteres, A-Z, 0-9, -)</label>
              <input
                type="text"
                required
                minLength={3}
                maxLength={20}
                value={codigo}
                onChange={(e) => handleCodigoChange(e.target.value)}
                placeholder="Ej: BIENVENIDA2026"
                className="w-full p-2.5 bg-[#FBFAFC] border border-[#1A1020]/15 rounded-xl text-xs font-mono font-bold tracking-wider focus:outline-none focus:ring-2 focus:ring-[#4A1F5C]"
              />
              <p className="text-[10px] text-[#6E6478]">Se convierte a mayúsculas automáticamente al escribir.</p>
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-bold text-[#1A1020]">Descripción Interna</label>
              <input
                type="text"
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
                placeholder="Ej: Campaña Instagram Primavera"
                className="w-full p-2.5 bg-[#FBFAFC] border border-[#1A1020]/15 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#4A1F5C]"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-bold text-[#1A1020]">Tipo de Descuento</label>
              <select
                value={tipo}
                onChange={(e) => setTipo(e.target.value as any)}
                className="w-full p-2.5 bg-[#FBFAFC] border border-[#1A1020]/15 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#4A1F5C]"
              >
                <option value="porcentaje">Porcentaje (%) &bull; Máx 100%</option>
                <option value="importe">Monto Fijo en Divisas ($ USD)</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-bold text-[#1A1020]">
                Valor del Descuento {tipo === 'porcentaje' ? '(%)' : '($ USD)'} *
              </label>
              <input
                type="number"
                step="0.5"
                min="0.5"
                max={tipo === 'porcentaje' ? 100 : 1000}
                required
                value={valor}
                onChange={(e) => setValor(e.target.value)}
                placeholder={tipo === 'porcentaje' ? 'Ej: 15' : 'Ej: 5.00'}
                className="w-full p-2.5 bg-[#FBFAFC] border border-[#1A1020]/15 rounded-xl text-xs font-mono font-bold focus:outline-none focus:ring-2 focus:ring-[#4A1F5C]"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-bold text-[#1A1020]">Fecha Inicio (Opcional)</label>
              <input
                type="date"
                value={inicio}
                onChange={(e) => setInicio(e.target.value)}
                className="w-full p-2.5 bg-[#FBFAFC] border border-[#1A1020]/15 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#4A1F5C]"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-bold text-[#1A1020]">Fecha Fin (Opcional)</label>
              <input
                type="date"
                value={fin}
                onChange={(e) => setFin(e.target.value)}
                className="w-full p-2.5 bg-[#FBFAFC] border border-[#1A1020]/15 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#4A1F5C]"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-bold text-[#1A1020]">Límite Máximo de Usos Totales</label>
              <input
                type="number"
                min="1"
                value={usosMax}
                onChange={(e) => setUsosMax(e.target.value)}
                placeholder="Vacío = Ilimitados"
                className="w-full p-2.5 bg-[#FBFAFC] border border-[#1A1020]/15 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#4A1F5C]"
              />
            </div>

            <div className="flex items-center pt-5">
              <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-[#1A1020]">
                <input
                  type="checkbox"
                  checked={unoPorClienta}
                  onChange={(e) => setUnoPorClienta(e.target.checked)}
                  className="rounded text-[#4A1F5C] focus:ring-[#4A1F5C]"
                />
                <span>Un solo uso por número de clienta (Recomendado)</span>
              </label>
            </div>

            {/* Selección de servicios */}
            <div className="space-y-2 sm:col-span-2 pt-2 border-t border-[#1A1020]/10">
              <label className="block text-xs font-bold text-[#1A1020]">
                Servicios Aplicables (Deja vacío para que aplique a todo el catálogo)
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto p-2 bg-[#FBFAFC] rounded-xl border border-[#1A1020]/10">
                {services.map((s) => {
                  const sel = serviciosSeleccionados.includes(s.id);
                  return (
                    <label
                      key={s.id}
                      className={`flex items-center gap-2 p-2 rounded-lg text-xs cursor-pointer transition-colors ${
                        sel ? 'bg-[#1F1226]/10 text-[#4A1F5C] font-bold' : 'text-[#1A1020] hover:bg-white'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={sel}
                        onChange={() => toggleServicio(s.id)}
                        className="rounded text-[#4A1F5C] focus:ring-[#4A1F5C]"
                      />
                      <span className="truncate">{s.name} (${s.priceUSD})</span>
                    </label>
                  );
                })}
              </div>
              <p className="text-[10px] text-[#6E6478]">
                {serviciosSeleccionados.length === 0
                  ? 'Aplica a TODOS los servicios del salón.'
                  : `Aplica exclusivamente a ${serviciosSeleccionados.length} servicio(s) seleccionado(s).`}
              </p>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-[#1A1020]/10">
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="px-4 py-2 text-xs font-semibold text-[#6E6478] hover:text-[#1A1020] cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2 bg-[#1F1226] hover:bg-[#2E1A38] text-white rounded-full text-xs font-bold shadow-sm transition-all cursor-pointer disabled:opacity-50"
            >
              {saving ? 'Guardando...' : 'Crear Cupón'}
            </button>
          </div>
        </form>
      )}

      {/* Listado de Cupones */}
      {loading ? (
        <div className="py-10 text-center text-xs text-[#6E6478]">Cargando cupones del salón...</div>
      ) : cupones.length === 0 ? (
        <div className="p-8 rounded-2xl bg-white border border-[#1A1020]/10 text-center space-y-2">
          <Percent className="w-8 h-8 text-[#6E6478]/40 mx-auto" />
          <p className="text-xs font-bold text-[#1A1020]">No hay cupones emitidos</p>
          <p className="text-[11px] text-[#6E6478]">
            Pulsa en "Crear Cupón" para emitir códigos promocionales para tus clientas.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {cupones.map((c) => {
            const usosText = `${c.usos ?? 0} / ${c.usosMax ?? '∞'} usos`;
            const esPorcentaje = c.tipo === 'porcentaje';
            return (
              <div
                key={c.id || c.codigo}
                className="p-4 sm:p-5 rounded-2xl bg-white border border-[#1A1020]/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="space-y-1.5 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono font-bold text-sm text-[#1A1020] bg-[#1A1020]/5 px-2.5 py-0.5 rounded-lg">
                      {c.codigo}
                    </span>
                    <span className="font-bold text-xs text-[#4A1F5C]">
                      {esPorcentaje ? `-${c.valor}%` : `-$${c.valor.toFixed(2)} USD`}
                    </span>
                    {c.activo ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                        Activo
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#F4F2F7] text-[#4A4150]">
                        Desactivado
                      </span>
                    )}
                    {c.unoPorClienta && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-50 text-amber-800 border border-amber-200">
                        1 por clienta
                      </span>
                    )}
                  </div>

                  {c.descripcion && <p className="text-xs text-[#6E6478]">{c.descripcion}</p>}

                  <div className="flex items-center gap-3 text-xs text-[#6E6478] flex-wrap">
                    <span className="font-medium text-[#1A1020]">{usosText}</span>
                    {(c.inicio || c.fin) && (
                      <span className="flex items-center gap-1 text-[11px]">
                        <Calendar className="w-3 h-3 text-[#4A1F5C]" />
                        <span>{c.inicio || 'Inicio'} &rarr; {c.fin || 'Sin límite'}</span>
                      </span>
                    )}
                    {Array.isArray(c.servicios) && c.servicios.length > 0 ? (
                      <span className="text-[11px] text-[#4A1F5C]">
                        {c.servicios.length} servicio(s) específico(s)
                      </span>
                    ) : (
                      <span className="text-[11px] text-[#6E6478]">Todos los servicios</span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleBorrar(c.id)}
                    className="p-2 text-[#6E6478] hover:text-rose-600 transition-colors cursor-pointer rounded-lg hover:bg-rose-50"
                    title="Eliminar o desactivar cupón"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
