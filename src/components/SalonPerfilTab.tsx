import { InstagramIcon } from './Icons';
import React, { useState, useEffect } from 'react';
import { SalonApi, PerfilSalon } from '../services/salonApi';
import { SalonAvisosCard } from './SalonAvisosCard';
import { SalonWhatsappCard } from './SalonWhatsappCard';
import { 
  Building2, 
  Phone, 
  MapPin, 
  Clock, 
  DollarSign, 
  Award, 
  Upload, 
  CheckCircle2, 
  AlertCircle, 
  Image as ImageIcon,
  Save,
  HelpCircle,
  CreditCard
} from 'lucide-react';

interface SalonPerfilTabProps {
  tenantSlug: string;
  onPerfilUpdated?: (perfil: PerfilSalon) => void;
}

export const SalonPerfilTab: React.FC<SalonPerfilTabProps> = ({ tenantSlug, onPerfilUpdated }) => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const [perfil, setPerfil] = useState<PerfilSalon>({
    nombre: '',
    eslogan: '',
    whatsapp: '',
    instagram: '',
    ciudad: '',
    direccion: '',
    horario: '',
    logoUrl: '',
    portadaEtiqueta: '',
    portadaTitulo: '',
    portadaSubtitulo: '',
    tasaBs: null,
    sellosMeta: 5,
    premioSellos: 'Tratamiento VIP de Cortesía',
    descuentoPrimeraVisitaUSD: 2,
    metodosPago: {
      pago_movil: true,
      efectivo_usd: true,
      binance_usdt: false,
      zelle: false,
    },
  });

  useEffect(() => {
    let mounted = true;
    async function cargar() {
      setLoading(true);
      setErrorMsg(null);
      const res = await SalonApi.admin(tenantSlug);
      if (!mounted) return;
      if (res.ok && res.data.perfil) {
        setPerfil({
          ...res.data.perfil,
          metodosPago: res.data.perfil.metodosPago || {
            pago_movil: true,
            efectivo_usd: true,
            binance_usdt: false,
            zelle: false,
          },
        });
      } else if (!res.ok) {
        setErrorMsg(res.error);
      }
      setLoading(false);
    }
    cargar();
    return () => { mounted = false; };
  }, [tenantSlug]);

  const handleLogoFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type === 'image/svg+xml' || file.name.toLowerCase().endsWith('.svg')) {
      setErrorMsg('No se permiten logotipos en formato SVG. Usa imágenes PNG, JPEG o WebP.');
      e.target.value = '';
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setErrorMsg('El archivo supera el límite de 2 MB. Optimiza la imagen antes de subirla.');
      e.target.value = '';
      return;
    }

    setErrorMsg(null);
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setPerfil((prev) => ({ ...prev, logoUrl: reader.result as string }));
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    // Validaciones de cliente antes de enviar
    if (perfil.nombre.length < 2 || perfil.nombre.length > 140) {
      setErrorMsg('El nombre comercial debe tener entre 2 y 140 caracteres.');
      setSaving(false);
      return;
    }
    if (perfil.eslogan && perfil.eslogan.length > 200) {
      setErrorMsg('El eslogan no puede superar los 200 caracteres.');
      setSaving(false);
      return;
    }
    if (perfil.horario && perfil.horario.length > 120) {
      setErrorMsg('El horario no puede superar los 120 caracteres.');
      setSaving(false);
      return;
    }
    if (perfil.sellosMeta && (perfil.sellosMeta < 3 || perfil.sellosMeta > 20)) {
      setErrorMsg('La meta de sellos debe ser entre 3 y 20 visitas.');
      setSaving(false);
      return;
    }
    if (perfil.descuentoPrimeraVisitaUSD !== null && perfil.descuentoPrimeraVisitaUSD !== undefined) {
      if (perfil.descuentoPrimeraVisitaUSD < 0 || perfil.descuentoPrimeraVisitaUSD > 100) {
        setErrorMsg('El descuento de primera visita debe estar entre 0 y 100 $.');
        setSaving(false);
        return;
      }
    }

    const res = await SalonApi.guardarPerfil(tenantSlug, perfil);
    setSaving(false);

    if (res.ok) {
      setSuccessMsg('Identidad y datos del negocio guardados correctamente.');
      onPerfilUpdated?.(perfil);
      setTimeout(() => setSuccessMsg(null), 4000);
    } else {
      setErrorMsg(res.error);
    }
  };

  if (loading) {
    return (
      <div className="py-12 text-center text-xs text-[#6E6478]">
        Cargando configuración de identidad y negocio...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <SalonAvisosCard tenantSlug={tenantSlug} />
      <SalonWhatsappCard tenantSlug={tenantSlug} />

      {/* Guía corta de sección */}
      <div className="p-4 rounded-2xl bg-[#FBFAFC] border border-[#1A1020]/10 flex items-start gap-3.5">
        <div className="p-2 rounded-xl bg-[#1F1226]/10 text-[#4A1F5C] shrink-0 mt-0.5">
          <HelpCircle className="w-4 h-4" />
        </div>
        <div className="text-xs text-[#6E6478] leading-relaxed">
          <p className="font-bold text-[#1A1020] text-sm mb-0.5">Identidad & Datos de Negocio</p>
          <p>
            Configura la marca comercial, canales de atención directa, ubicación física y reglas de cobro de tu salón.
            Los datos aquí definidos alimentan automáticamente tu carta digital, los mensajes de reserva y la ficha pública.
          </p>
        </div>
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

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Bloque 1: Marca & Contacto */}
        <div className="p-5 sm:p-6 rounded-2xl bg-white border border-[#1A1020]/10 space-y-4">
          <h4 className="text-sm font-bold text-[#1A1020] flex items-center gap-2">
            <Building2 className="w-4 h-4 text-[#4A1F5C]" />
            <span>Marca Comercial & Atención Directa</span>
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="block text-xs font-bold text-[#1A1020]">
                Nombre del Salón * (2–140 caracteres)
              </label>
              <input
                type="text"
                required
                minLength={2}
                maxLength={140}
                value={perfil.nombre}
                onChange={(e) => setPerfil({ ...perfil, nombre: e.target.value })}
                className="w-full p-2.5 bg-[#FBFAFC] border border-[#1A1020]/15 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#4A1F5C]"
                placeholder="Ej: Capra Studio"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-bold text-[#1A1020]">
                Eslogan Comercial (≤ 200 caracteres)
              </label>
              <input
                type="text"
                maxLength={200}
                value={perfil.eslogan || ''}
                onChange={(e) => setPerfil({ ...perfil, eslogan: e.target.value })}
                className="w-full p-2.5 bg-[#FBFAFC] border border-[#1A1020]/15 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#4A1F5C]"
                placeholder="Ej: Beauty Atelier & Capra Academy"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-bold text-[#1A1020] flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-[#4A1F5C]" />
                <span>WhatsApp de Reservas * (7–15 dígitos)</span>
              </label>
              <input
                type="text"
                value={perfil.whatsapp || ''}
                onChange={(e) => setPerfil({ ...perfil, whatsapp: e.target.value.replace(/\D/g, '') })}
                className="w-full p-2.5 bg-[#FBFAFC] border border-[#1A1020]/15 rounded-xl text-xs font-mono focus:outline-none focus:ring-2 focus:ring-[#4A1F5C]"
                placeholder="Ej: 584247429530"
              />
              <p className="text-[10px] text-[#6E6478]">Código de país + número, sin espacios ni signos.</p>
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-bold text-[#1A1020] flex items-center gap-1.5">
                <InstagramIcon className="w-3.5 h-3.5 text-[#4A1F5C]" />
                <span>Cuenta de Instagram</span>
              </label>
              <input
                type="text"
                value={perfil.instagram || ''}
                onChange={(e) => setPerfil({ ...perfil, instagram: e.target.value })}
                className="w-full p-2.5 bg-[#FBFAFC] border border-[#1A1020]/15 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#4A1F5C]"
                placeholder="Ej: @caprastudio_"
              />
            </div>
          </div>

          {/* Logo del salón */}
          <div className="pt-2 border-t border-[#1A1020]/5 space-y-2">
            <label className="block text-xs font-bold text-[#1A1020]">
              Logotipo Oficial (PNG, JPEG o WebP hasta 2 MB &bull; Sin SVG)
            </label>
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <div className="w-20 h-20 rounded-2xl border-2 border-dashed border-[#1A1020]/20 bg-[#FBFAFC] flex items-center justify-center overflow-hidden shrink-0">
                {perfil.logoUrl ? (
                  <img src={perfil.logoUrl} alt="Logo" className="w-full h-full object-contain" />
                ) : (
                  <ImageIcon className="w-8 h-8 text-[#6E6478]/40" />
                )}
              </div>
              <div className="space-y-2 flex-1 w-full">
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={handleLogoFile}
                  className="block w-full text-xs text-[#6E6478] file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-[#1F1226] file:text-white hover:file:bg-[#2E1A38] cursor-pointer"
                />
                <input
                  type="url"
                  placeholder="O pega una URL HTTPS directa: https://..."
                  value={perfil.logoUrl && !perfil.logoUrl.startsWith('data:') ? perfil.logoUrl : ''}
                  onChange={(e) => setPerfil({ ...perfil, logoUrl: e.target.value })}
                  className="w-full p-2 bg-[#FBFAFC] border border-[#1A1020]/15 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#4A1F5C]"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Bloque 2: Ubicación & Horarios */}
        <div className="p-5 sm:p-6 rounded-2xl bg-white border border-[#1A1020]/10 space-y-4">
          <h4 className="text-sm font-bold text-[#1A1020] flex items-center gap-2">
            <MapPin className="w-4 h-4 text-[#4A1F5C]" />
            <span>Ubicación Física & Horario de Atención</span>
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1">
              <label className="block text-xs font-bold text-[#1A1020]">Ciudad</label>
              <input
                type="text"
                value={perfil.ciudad || ''}
                onChange={(e) => setPerfil({ ...perfil, ciudad: e.target.value })}
                className="w-full p-2.5 bg-[#FBFAFC] border border-[#1A1020]/15 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#4A1F5C]"
                placeholder="Ej: San Cristóbal, Táchira"
              />
            </div>

            <div className="space-y-1 sm:col-span-2">
              <label className="block text-xs font-bold text-[#1A1020]">Dirección Detallada</label>
              <input
                type="text"
                value={perfil.direccion || ''}
                onChange={(e) => setPerfil({ ...perfil, direccion: e.target.value })}
                className="w-full p-2.5 bg-[#FBFAFC] border border-[#1A1020]/15 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#4A1F5C]"
                placeholder="Ej: Barrio Obrero, Carrera 21 entre Calles 10 y 11"
              />
            </div>

            <div className="space-y-1 sm:col-span-3">
              <label className="block text-xs font-bold text-[#1A1020] flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-[#4A1F5C]" />
                <span>Horario de Atención (≤ 120 caracteres)</span>
              </label>
              <input
                type="text"
                maxLength={120}
                value={perfil.horario || ''}
                onChange={(e) => setPerfil({ ...perfil, horario: e.target.value })}
                className="w-full p-2.5 bg-[#FBFAFC] border border-[#1A1020]/15 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#4A1F5C]"
                placeholder="Ej: Lunes a Sábado de 9:00 AM a 6:00 PM (Previa Cita)"
              />
            </div>
          </div>
        </div>

        {/* Bloque 3: Portada del Estudio */}
        <div className="p-5 sm:p-6 rounded-2xl bg-white border border-[#1A1020]/10 space-y-4">
          <h4 className="text-sm font-bold text-[#1A1020]">Portada de la Carta & Hero</h4>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1">
              <label className="block text-xs font-bold text-[#1A1020]">Etiqueta Superior</label>
              <input
                type="text"
                value={perfil.portadaEtiqueta || ''}
                onChange={(e) => setPerfil({ ...perfil, portadaEtiqueta: e.target.value })}
                className="w-full p-2.5 bg-[#FBFAFC] border border-[#1A1020]/15 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#4A1F5C]"
                placeholder="Ej: ESTUDIO BOUTIQUE"
              />
            </div>
            <div className="space-y-1">
              <label className="block text-xs font-bold text-[#1A1020]">Título Principal</label>
              <input
                type="text"
                value={perfil.portadaTitulo || ''}
                onChange={(e) => setPerfil({ ...perfil, portadaTitulo: e.target.value })}
                className="w-full p-2.5 bg-[#FBFAFC] border border-[#1A1020]/15 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#4A1F5C]"
                placeholder="Ej: Capra Studio"
              />
            </div>
            <div className="space-y-1">
              <label className="block text-xs font-bold text-[#1A1020]">Subtítulo o Promesa</label>
              <input
                type="text"
                value={perfil.portadaSubtitulo || ''}
                onChange={(e) => setPerfil({ ...perfil, portadaSubtitulo: e.target.value })}
                className="w-full p-2.5 bg-[#FBFAFC] border border-[#1A1020]/15 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#4A1F5C]"
                placeholder="Ej: Arquitectura de Miradas & Estética Integral"
              />
            </div>
          </div>
        </div>

        {/* Bloque 4: Reglas de Fidelidad & Cobro */}
        <div className="p-5 sm:p-6 rounded-2xl bg-white border border-[#1A1020]/10 space-y-4">
          <h4 className="text-sm font-bold text-[#1A1020] flex items-center gap-2">
            <Award className="w-4 h-4 text-[#4A1F5C]" />
            <span>Fidelización & Moneda</span>
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="space-y-1">
              <label className="block text-xs font-bold text-[#1A1020]">Tasa BCV Referencial</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={perfil.tasaBs || ''}
                onChange={(e) => setPerfil({ ...perfil, tasaBs: parseFloat(e.target.value) || null })}
                className="w-full p-2.5 bg-[#FBFAFC] border border-[#1A1020]/15 rounded-xl text-xs font-mono focus:outline-none focus:ring-2 focus:ring-[#4A1F5C]"
                placeholder="Ej: 36.50"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-bold text-[#1A1020]">Meta Sellos VIP (3–20)</label>
              <input
                type="number"
                min={3}
                max={20}
                value={perfil.sellosMeta || 5}
                onChange={(e) => setPerfil({ ...perfil, sellosMeta: parseInt(e.target.value, 10) || 5 })}
                className="w-full p-2.5 bg-[#FBFAFC] border border-[#1A1020]/15 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#4A1F5C]"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-bold text-[#1A1020]">Premio al Completar</label>
              <input
                type="text"
                value={perfil.premioSellos || ''}
                onChange={(e) => setPerfil({ ...perfil, premioSellos: e.target.value })}
                className="w-full p-2.5 bg-[#FBFAFC] border border-[#1A1020]/15 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#4A1F5C]"
                placeholder="Ej: Tratamiento VIP de Cortesía"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-bold text-[#1A1020]">Descuento 1ª Cita ($ 0–100)</label>
              <input
                type="number"
                min={0}
                max={100}
                step="0.5"
                value={perfil.descuentoPrimeraVisitaUSD ?? 2}
                onChange={(e) => setPerfil({ ...perfil, descuentoPrimeraVisitaUSD: parseFloat(e.target.value) || 0 })}
                className="w-full p-2.5 bg-[#FBFAFC] border border-[#1A1020]/15 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#4A1F5C]"
              />
            </div>
          </div>

          {/* Métodos de Pago */}
          <div className="pt-3 border-t border-[#1A1020]/5 space-y-2">
            <label className="block text-xs font-bold text-[#1A1020] flex items-center gap-1.5">
              <CreditCard className="w-3.5 h-3.5 text-[#4A1F5C]" />
              <span>Métodos de Pago Habilitados en Recepción</span>
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { id: 'pago_movil', label: 'Pago Móvil (Bs)' },
                { id: 'efectivo_usd', label: 'Efectivo Divisas ($)' },
                { id: 'binance_usdt', label: 'Binance Pay (USDT)' },
                { id: 'zelle', label: 'Zelle (USD)' },
              ].map((m) => {
                const checked = Boolean(perfil.metodosPago?.[m.id as keyof typeof perfil.metodosPago]);
                return (
                  <label
                    key={m.id}
                    className={`flex items-center gap-2.5 p-3 rounded-xl border text-xs font-semibold cursor-pointer transition-all ${
                      checked
                        ? 'bg-[#1F1226]/5 border-[#4A1F5C] text-[#1A1020]'
                        : 'bg-[#FBFAFC] border-[#1A1020]/10 text-[#6E6478]'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(e) =>
                        setPerfil({
                          ...perfil,
                          metodosPago: {
                            ...perfil.metodosPago,
                            [m.id]: e.target.checked,
                          },
                        })
                      }
                      className="rounded text-[#4A1F5C] focus:ring-[#4A1F5C]"
                    />
                    <span>{m.label}</span>
                  </label>
                );
              })}
            </div>
          </div>
        </div>

        {/* Botón de guardado */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2.5 rounded-full bg-[#1F1226] hover:bg-[#2E1A38] text-white text-xs font-bold shadow-sm transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? 'Guardando...' : 'Guardar Perfil'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};
