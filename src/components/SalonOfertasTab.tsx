import React, { useState, useEffect } from 'react';
import { SalonApi, OfertaSalon } from '../services/salonApi';
import { ServiceItem } from '../types';
import { 
  Tag, 
  HelpCircle, 
  CheckCircle2, 
  AlertCircle, 
  Plus, 
  Trash2, 
  Clock, 
  Calendar, 
  DollarSign, 
  AlertTriangle,
  Save,
  Info
} from 'lucide-react';

interface SalonOfertasTabProps {
  tenantSlug: string;
  services: ServiceItem[];
}

export const SalonOfertasTab: React.FC<SalonOfertasTabProps> = ({ tenantSlug, services }) => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [ofertas, setOfertas] = useState<OfertaSalon[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Formulario de nueva oferta
  const [showForm, setShowForm] = useState(false);
  const [titulo, setTitulo] = useState('');
  const [texto, setTexto] = useState('');
  const [servicioId, setServicioId] = useState('');
  const [precioEspecialUSD, setPrecioEspecialUSD] = useState<string>('');
  const [boton, setBoton] = useState<'ninguno' | 'reservar' | 'catalogo'>('reservar');
  const [botonTexto, setBotonTexto] = useState('Reservar con oferta');
  const [inicio, setInicio] = useState('');
  const [fin, setFin] = useState('');
  const [horaInicio, setHoraInicio] = useState('');
  const [horaFin, setHoraFin] = useState('');
  const [activa, setActiva] = useState(true);
  const [orden, setOrden] = useState(1);

  const cargarOfertas = async () => {
    setLoading(true);
    setErrorMsg(null);
    const res = await SalonApi.admin(tenantSlug);
    if (res.ok) {
      setOfertas(res.data.ofertas || []);
    } else {
      setErrorMsg(res.error);
    }
    setLoading(false);
  };

  useEffect(() => {
    cargarOfertas();
  }, [tenantSlug]);

  const servicioSeleccionado = services.find((s) => s.id === servicioId);
  const precioNormal = servicioSeleccionado?.priceUSD || 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    if (titulo.length < 2 || titulo.length > 60) {
      setErrorMsg('El título de la oferta debe tener entre 2 y 60 caracteres.');
      setSaving(false);
      return;
    }
    if (texto && texto.length > 160) {
      setErrorMsg('El texto explicativo no puede superar los 160 caracteres.');
      setSaving(false);
      return;
    }
    if (botonTexto && botonTexto.length > 30) {
      setErrorMsg('El texto del botón no puede superar los 30 caracteres.');
      setSaving(false);
      return;
    }

    const espUSD = parseFloat(precioEspecialUSD);
    if (isNaN(espUSD) || espUSD <= 0) {
      setErrorMsg('Indica un precio especial válido en USD.');
      setSaving(false);
      return;
    }

    if (servicioSeleccionado && espUSD >= precioNormal) {
      setErrorMsg(`El precio especial ($${espUSD.toFixed(2)}) debe ser estrictamente menor que el precio regular ($${precioNormal.toFixed(2)}).`);
      setSaving(false);
      return;
    }

    // Validación de franja horaria: o ambas o ninguna
    if ((horaInicio && !horaFin) || (!horaInicio && horaFin)) {
      setErrorMsg('La franja horaria requiere tanto hora de inicio como hora de fin (o ambas vacías).');
      setSaving(false);
      return;
    }

    const payload: OfertaSalon = {
      titulo: titulo.trim(),
      texto: texto.trim() || null,
      servicioId: servicioId || null,
      servicioNombre: servicioSeleccionado?.name || null,
      precioEspecialUSD: espUSD,
      precioNormalUSD: precioNormal || null,
      boton,
      botonTexto: botonTexto.trim() || null,
      inicio: inicio || null,
      fin: fin || null,
      horaInicio: horaInicio || null,
      horaFin: horaFin || null,
      activa,
      orden,
    };

    const res = await SalonApi.guardarOferta(tenantSlug, payload);
    setSaving(false);

    if (res.ok) {
      setSuccessMsg('Oferta guardada exitosamente.');
      setShowForm(false);
      resetForm();
      cargarOfertas();
      setTimeout(() => setSuccessMsg(null), 4000);
    } else {
      setErrorMsg(res.error);
    }
  };

  const resetForm = () => {
    setTitulo('');
    setTexto('');
    setServicioId('');
    setPrecioEspecialUSD('');
    setBoton('reservar');
    setBotonTexto('Reservar con oferta');
    setInicio('');
    setFin('');
    setHoraInicio('');
    setHoraFin('');
    setActiva(true);
    setOrden(ofertas.length + 1);
  };

  const handleBorrar = async (id?: string) => {
    if (!id) return;
    if (!window.confirm('¿Seguro que deseas eliminar esta oferta?')) return;
    setErrorMsg(null);
    const res = await SalonApi.borrarOferta(tenantSlug, id);
    if (res.ok) {
      setSuccessMsg('Oferta eliminada.');
      cargarOfertas();
      setTimeout(() => setSuccessMsg(null), 3000);
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
          <p className="font-bold text-[#1A1020] text-sm mb-0.5">Ofertas & Precios Especiales</p>
          <p>
            Publica promociones temporales para tus servicios. El precio especial se vincula a tu catálogo y el servidor
            lo aplica automáticamente durante la reserva cuando la clienta elige un turno dentro de la vigencia configurada.
          </p>
        </div>
      </div>

      {/* Aviso de verdad técnica requerido por orden */}
      <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-center gap-2.5 font-medium">
        <Info className="w-4 h-4 text-amber-700 shrink-0" />
        <span>
          <strong>Regla de reserva:</strong> El precio especial se aplica de verdad al reservar en esas fechas y horas.
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

      {/* Cabecera y botón de nueva oferta */}
      <div className="flex items-center justify-between gap-3">
        <h4 className="text-sm font-bold text-[#1A1020] flex items-center gap-2">
          <Tag className="w-4 h-4 text-[#4A1F5C]" />
          <span>Ofertas Activas ({ofertas.length})</span>
        </h4>
        <button
          type="button"
          onClick={() => { setShowForm(!showForm); resetForm(); }}
          className="px-4 py-2 bg-[#1F1226] hover:bg-[#2E1A38] text-white rounded-full text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-sm"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>{showForm ? 'Cancelar' : 'Nueva Oferta'}</span>
        </button>
      </div>

      {/* Formulario de creación */}
      {showForm && (
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 rounded-2xl bg-white border border-[#1A1020]/15 space-y-4 shadow-sm">
          <h5 className="text-xs font-bold text-[#1A1020] uppercase tracking-wider">Crear Nueva Oferta Comercial</h5>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="block text-xs font-bold text-[#1A1020]">Título de la Oferta * (≤ 60 caracteres)</label>
              <input
                type="text"
                required
                maxLength={60}
                value={titulo}
                onChange={(e) => setTitulo(e.target.value)}
                placeholder="Ej: Happy Hour Manicura Semipermanente"
                className="w-full p-2.5 bg-[#FBFAFC] border border-[#1A1020]/15 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#4A1F5C]"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-bold text-[#1A1020]">Servicio en Promoción *</label>
              <select
                required
                value={servicioId}
                onChange={(e) => setServicioId(e.target.value)}
                className="w-full p-2.5 bg-[#FBFAFC] border border-[#1A1020]/15 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#4A1F5C]"
              >
                <option value="">-- Selecciona un servicio --</option>
                {services.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} (${s.priceUSD.toFixed(2)} USD)
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1 sm:col-span-2">
              <label className="block text-xs font-bold text-[#1A1020]">Texto o Beneficio (≤ 160 caracteres)</label>
              <input
                type="text"
                maxLength={160}
                value={texto}
                onChange={(e) => setTexto(e.target.value)}
                placeholder="Ej: Disfruta de un 25% de descuento directo en turnos de mañana los días laborables."
                className="w-full p-2.5 bg-[#FBFAFC] border border-[#1A1020]/15 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#4A1F5C]"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-bold text-[#1A1020]">Precio Especial ($ USD) *</label>
              <input
                type="number"
                step="0.5"
                min="0.5"
                required
                value={precioEspecialUSD}
                onChange={(e) => setPrecioEspecialUSD(e.target.value)}
                placeholder="Ej: 15.00"
                className="w-full p-2.5 bg-[#FBFAFC] border border-[#1A1020]/15 rounded-xl text-xs font-mono font-bold focus:outline-none focus:ring-2 focus:ring-[#4A1F5C]"
              />
              {servicioSeleccionado && (
                <p className="text-[11px] text-[#6E6478]">
                  Precio normal: <span className="line-through">${precioNormal.toFixed(2)}</span> &bull; 
                  Ahorro: <span className="text-emerald-700 font-bold">${Math.max(0, precioNormal - (parseFloat(precioEspecialUSD) || 0)).toFixed(2)} USD</span>
                </p>
              )}
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-bold text-[#1A1020]">Tipo de Botón & Acción</label>
              <select
                value={boton}
                onChange={(e) => setBoton(e.target.value as any)}
                className="w-full p-2.5 bg-[#FBFAFC] border border-[#1A1020]/15 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#4A1F5C]"
              >
                <option value="reservar">Botón Reservar</option>
                <option value="catalogo">Ver en Catálogo</option>
                <option value="ninguno">Sin Botón</option>
              </select>
            </div>

            <div className="space-y-1 sm:col-span-2">
              <label className="block text-xs font-bold text-[#1A1020]">Texto del Botón (≤ 30 caracteres)</label>
              <input
                type="text"
                maxLength={30}
                value={botonTexto}
                onChange={(e) => setBotonTexto(e.target.value)}
                className="w-full p-2.5 bg-[#FBFAFC] border border-[#1A1020]/15 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#4A1F5C]"
              />
            </div>

            {/* Fechas de vigencia */}
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

            {/* Franja horaria */}
            <div className="space-y-1">
              <label className="block text-xs font-bold text-[#1A1020]">Hora Desde (Opcional, 24 h)</label>
              <input
                type="time"
                value={horaInicio}
                onChange={(e) => setHoraInicio(e.target.value)}
                className="w-full p-2.5 bg-[#FBFAFC] border border-[#1A1020]/15 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#4A1F5C]"
              />
            </div>
            <div className="space-y-1">
              <label className="block text-xs font-bold text-[#1A1020]">Hora Hasta (Opcional, 24 h)</label>
              <input
                type="time"
                value={horaFin}
                onChange={(e) => setHoraFin(e.target.value)}
                className="w-full p-2.5 bg-[#FBFAFC] border border-[#1A1020]/15 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#4A1F5C]"
              />
            </div>

            <div className="flex items-center gap-4 sm:col-span-2 pt-2">
              <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-[#1A1020]">
                <input
                  type="checkbox"
                  checked={activa}
                  onChange={(e) => setActiva(e.target.checked)}
                  className="rounded text-[#4A1F5C] focus:ring-[#4A1F5C]"
                />
                <span>Oferta activa y visible</span>
              </label>

              <div className="flex items-center gap-2 text-xs text-[#1A1020]">
                <span className="font-bold">Prioridad / Orden:</span>
                <input
                  type="number"
                  min={1}
                  value={orden}
                  onChange={(e) => setOrden(parseInt(e.target.value, 10) || 1)}
                  className="w-16 p-1 bg-[#FBFAFC] border border-[#1A1020]/15 rounded-lg text-xs text-center"
                />
              </div>
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
              {saving ? 'Guardando...' : 'Guardar Oferta'}
            </button>
          </div>
        </form>
      )}

      {/* Listado de Ofertas */}
      {loading ? (
        <div className="py-10 text-center text-xs text-[#6E6478]">Cargando ofertas del salón...</div>
      ) : ofertas.length === 0 ? (
        <div className="p-8 rounded-2xl bg-white border border-[#1A1020]/10 text-center space-y-2">
          <Tag className="w-8 h-8 text-[#6E6478]/40 mx-auto" />
          <p className="text-xs font-bold text-[#1A1020]">No hay ofertas configuradas</p>
          <p className="text-[11px] text-[#6E6478]">
            Pulsa en "Nueva Oferta" para publicar precios especiales o paquetes de temporada.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {ofertas.map((of) => (
            <div
              key={of.id || of.titulo}
              className="p-4 sm:p-5 rounded-2xl bg-white border border-[#1A1020]/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
            >
              <div className="space-y-1.5 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-bold text-xs text-[#1A1020]">{of.titulo}</span>
                  {of.activa ? (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                      Activa
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#F4F2F7] text-[#4A4150]">
                      Inactiva
                    </span>
                  )}
                  {of.servicioNombre && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-[#1F1226]/10 text-[#4A1F5C]">
                      {of.servicioNombre}
                    </span>
                  )}
                </div>

                {of.texto && <p className="text-xs text-[#6E6478]">{of.texto}</p>}

                <div className="flex items-center gap-3 text-xs text-[#6E6478] flex-wrap">
                  {of.precioNormalUSD && (
                    <span>
                      Normal: <span className="line-through">${of.precioNormalUSD.toFixed(2)} USD</span>
                    </span>
                  )}
                  {of.precioEspecialUSD && (
                    <span className="font-bold text-emerald-800 text-sm">
                      Especial: ${of.precioEspecialUSD.toFixed(2)} USD
                    </span>
                  )}
                  {(of.inicio || of.fin) && (
                    <span className="flex items-center gap-1 text-[11px]">
                      <Calendar className="w-3 h-3 text-[#4A1F5C]" />
                      <span>{of.inicio || 'Siempre'} hasta {of.fin || 'Indefinido'}</span>
                    </span>
                  )}
                  {(of.horaInicio && of.horaFin) && (
                    <span className="flex items-center gap-1 text-[11px]">
                      <Clock className="w-3 h-3 text-[#4A1F5C]" />
                      <span>{of.horaInicio} – {of.horaFin}</span>
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => handleBorrar(of.id)}
                  className="p-2 text-[#6E6478] hover:text-rose-600 transition-colors cursor-pointer rounded-lg hover:bg-rose-50"
                  title="Eliminar oferta"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
