import React, { useState, useEffect } from 'react';
import { SalonApi, LandingSalon, BloqueLanding } from '../services/salonApi';
import { 
  Globe, 
  HelpCircle, 
  CheckCircle2, 
  AlertCircle, 
  Save, 
  Copy, 
  Check, 
  ArrowUp, 
  ArrowDown, 
  Plus, 
  Trash2, 
  Image as ImageIcon,
  ExternalLink,
  Layers,
  Sparkles
} from 'lucide-react';

interface SalonLandingTabProps {
  tenantSlug: string;
}

const BLOQUES_DEFAULT: { id: BloqueLanding; label: string; desc: string }[] = [
  { id: 'portada', label: 'Portada / Hero', desc: 'Encabezado principal, eslogan y llamada a la acción' },
  { id: 'historia', label: 'Historia del Estudio', desc: 'Trayectoria, filosofía y propuesta de valor del salón' },
  { id: 'servicios', label: 'Catálogo de Servicios', desc: 'Listado categorizado con precios en USD y Bs.' },
  { id: 'galeria', label: 'Galería de Trabajos', desc: 'Fotografías reales de resultados y aplicaciones' },
  { id: 'equipo', label: 'Equipo & Especialistas', desc: 'Presentación del equipo técnico y cabinas' },
  { id: 'ofertas', label: 'Ofertas & Promociones', desc: 'Precios especiales temporales y paquetes' },
  { id: 'resenas', label: 'Reseñas & Testimonios', desc: 'Opiniones y valoración verificada de clientas' },
  { id: 'faq', label: 'Preguntas Frecuentes', desc: 'Respuestas a dudas habituales sobre citas y servicios' },
  { id: 'ubicacion', label: 'Ubicación & Horarios', desc: 'Dirección física, mapa orientativo y días de apertura' },
  { id: 'reservar', label: 'Cierre de Reserva', desc: 'Botón final directo para agendar turno' },
];

export const SalonLandingTab: React.FC<SalonLandingTabProps> = ({ tenantSlug }) => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  const [landing, setLanding] = useState<LandingSalon>({
    historia: '',
    galeria: [],
    faq: [],
    bloques: ['portada', 'historia', 'servicios', 'galeria', 'equipo', 'ofertas', 'resenas', 'faq', 'ubicacion', 'reservar'],
    seoTitulo: '',
    seoDescripcion: '',
    publicada: true,
  });

  const [nuevaFotoUrl, setNuevaFotoUrl] = useState('');
  const [nuevaPregunta, setNuevaPregunta] = useState('');
  const [nuevaRespuesta, setNuevaRespuesta] = useState('');

  useEffect(() => {
    let mounted = true;
    async function cargar() {
      setLoading(true);
      setErrorMsg(null);
      const res = await SalonApi.admin(tenantSlug);
      if (!mounted) return;
      if (res.ok && res.data.landing) {
        const l = res.data.landing;
        setLanding({
          historia: l.historia || '',
          galeria: Array.isArray(l.galeria) ? l.galeria : [],
          faq: Array.isArray(l.faq) ? l.faq : [],
          bloques: Array.isArray(l.bloques) && l.bloques.length > 0
            ? l.bloques
            : ['portada', 'historia', 'servicios', 'galeria', 'equipo', 'ofertas', 'resenas', 'faq', 'ubicacion', 'reservar'],
          seoTitulo: l.seoTitulo || '',
          seoDescripcion: l.seoDescripcion || '',
          publicada: l.publicada ?? true,
        });
      } else if (!res.ok) {
        setErrorMsg(res.error);
      }
      setLoading(false);
    }
    cargar();
    return () => { mounted = false; };
  }, [tenantSlug]);

  const moverBloque = (index: number, direccion: 'arriba' | 'abajo') => {
    const bloques = [...(landing.bloques || [])];
    const target = direccion === 'arriba' ? index - 1 : index + 1;
    if (target < 0 || target >= bloques.length) return;
    const temp = bloques[index];
    bloques[index] = bloques[target];
    bloques[target] = temp;
    setLanding({ ...landing, bloques });
  };

  const agregarFoto = () => {
    const url = nuevaFotoUrl.trim();
    if (!url) return;
    if ((landing.galeria || []).length >= 8) {
      setErrorMsg('El límite máximo de la galería es de 8 fotografías.');
      return;
    }
    setLanding({ ...landing, galeria: [...(landing.galeria || []), url] });
    setNuevaFotoUrl('');
  };

  const eliminarFoto = (idx: number) => {
    const gal = [...(landing.galeria || [])];
    gal.splice(idx, 1);
    setLanding({ ...landing, galeria: gal });
  };

  const agregarFaq = () => {
    const p = nuevaPregunta.trim();
    const r = nuevaRespuesta.trim();
    if (!p || !r) {
      setErrorMsg('Indica tanto la pregunta como la respuesta.');
      return;
    }
    if (p.length > 140) {
      setErrorMsg('La pregunta no puede superar los 140 caracteres.');
      return;
    }
    if (r.length > 400) {
      setErrorMsg('La respuesta no puede superar los 400 caracteres.');
      return;
    }
    if ((landing.faq || []).length >= 8) {
      setErrorMsg('El límite máximo es de 8 preguntas frecuentes.');
      return;
    }
    setLanding({ ...landing, faq: [...(landing.faq || []), { p, r }] });
    setNuevaPregunta('');
    setNuevaRespuesta('');
    setErrorMsg(null);
  };

  const eliminarFaq = (idx: number) => {
    const f = [...(landing.faq || [])];
    f.splice(idx, 1);
    setLanding({ ...landing, faq: f });
  };

  const copiarEnlace = () => {
    const url = `https://vanesev.com/${tenantSlug}`;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    if (landing.historia && landing.historia.length > 600) {
      setErrorMsg('La historia no puede superar los 600 caracteres.');
      setSaving(false);
      return;
    }
    if (landing.seoTitulo && landing.seoTitulo.length > 70) {
      setErrorMsg('El título SEO no puede superar los 70 caracteres.');
      setSaving(false);
      return;
    }
    if (landing.seoDescripcion && landing.seoDescripcion.length > 160) {
      setErrorMsg('La descripción SEO no puede superar los 160 caracteres.');
      setSaving(false);
      return;
    }

    const res = await SalonApi.guardarLanding(tenantSlug, landing);
    setSaving(false);

    if (res.ok) {
      setSuccessMsg('Landing y presencia web guardadas correctamente.');
      setTimeout(() => setSuccessMsg(null), 4000);
    } else {
      setErrorMsg(res.error);
    }
  };

  if (loading) {
    return (
      <div className="py-12 text-center text-xs text-[#6E6478]">
        Cargando configuración de la landing...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Guía corta de sección */}
      <div className="p-4 rounded-2xl bg-[#FBFAFC] border border-[#24152B]/10 flex items-start gap-3.5">
        <div className="p-2 rounded-xl bg-[#5B2A6E]/10 text-[#5B2A6E] shrink-0 mt-0.5">
          <HelpCircle className="w-4 h-4" />
        </div>
        <div className="text-xs text-[#6E6478] leading-relaxed">
          <p className="font-bold text-[#24152B] text-sm mb-0.5">Landing & Presencia Web</p>
          <p>
            Diseña la estructura de la página pública de tu salón: redacta tu historia, sube tu galería de trabajos,
            define tus preguntas frecuentes y ordena los bloques con flechas según tu prioridad comercial.
          </p>
        </div>
      </div>

      {/* Barra de estado público y enlace */}
      <div className="p-4 rounded-2xl bg-white border border-[#24152B]/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={Boolean(landing.publicada)}
              onChange={(e) => setLanding({ ...landing, publicada: e.target.checked })}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-stone-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-stone-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#5B2A6E]" />
          </label>
          <div>
            <span className="text-xs font-bold text-[#24152B] block">
              {landing.publicada ? 'Página pública ACTIVA' : 'Página pública PAUSADA'}
            </span>
            <span className="text-[11px] text-[#6E6478]">
              {landing.publicada ? 'Visible para clientas en internet' : 'Solo visible en modo borrador'}
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={copiarEnlace}
          className="px-4 py-2 rounded-xl bg-[#FBFAFC] hover:bg-[#F2EDF3] border border-[#24152B]/15 text-xs font-bold text-[#24152B] flex items-center gap-2 cursor-pointer transition-colors"
        >
          {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-[#5B2A6E]" />}
          <span>{copiedLink ? '¡Copiado!' : `vanesev.com/${tenantSlug}`}</span>
        </button>
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
        {/* Historia del Salón */}
        <div className="p-5 sm:p-6 rounded-2xl bg-white border border-[#24152B]/10 space-y-3">
          <div className="flex items-center justify-between">
            <label className="block text-xs font-bold text-[#24152B]">
              Historia & Filosofía del Estudio (≤ 600 caracteres)
            </label>
            <span className={`text-[11px] font-mono ${((landing.historia || '').length > 600) ? 'text-rose-600 font-bold' : 'text-[#6E6478]'}`}>
              {(landing.historia || '').length} / 600
            </span>
          </div>
          <textarea
            rows={4}
            maxLength={600}
            value={landing.historia || ''}
            onChange={(e) => setLanding({ ...landing, historia: e.target.value })}
            placeholder="Narra brevemente el origen de tu estudio, tu pasión por el detalle y el estándar de atención que ofreces a cada clienta..."
            className="w-full p-3 bg-[#FBFAFC] border border-[#24152B]/15 rounded-xl text-xs leading-relaxed focus:outline-none focus:ring-2 focus:ring-[#5B2A6E] resize-none"
          />
        </div>

        {/* Orden de Bloques con Flechas */}
        <div className="p-5 sm:p-6 rounded-2xl bg-white border border-[#24152B]/10 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-bold text-[#24152B] flex items-center gap-2">
                <Layers className="w-4 h-4 text-[#5B2A6E]" />
                <span>Orden de Secciones en la Web</span>
              </h4>
              <p className="text-[11px] text-[#6E6478] mt-0.5">
                Organiza la secuencia visual de tu landing utilizando las flechas ↑ y ↓.
              </p>
            </div>
            <span className="text-[11px] font-bold text-[#5B2A6E] bg-[#5B2A6E]/10 px-2.5 py-1 rounded-full">
              {landing.bloques?.length || 10} bloques
            </span>
          </div>

          <div className="space-y-2">
            {(landing.bloques || []).map((bId, idx) => {
              const meta = BLOQUES_DEFAULT.find((b) => b.id === bId) || { id: bId, label: bId, desc: '' };
              return (
                <div
                  key={bId}
                  className="flex items-center justify-between gap-3 p-3 rounded-xl bg-[#FBFAFC] border border-[#24152B]/10 hover:border-[#5B2A6E]/30 transition-all"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="w-6 h-6 rounded-full bg-[#24152B]/5 text-[#24152B] font-mono text-[11px] font-bold flex items-center justify-center shrink-0">
                      {idx + 1}
                    </span>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-[#24152B] truncate">{meta.label}</p>
                      <p className="text-[10px] text-[#6E6478] truncate">{meta.desc}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      disabled={idx === 0}
                      onClick={() => moverBloque(idx, 'arriba')}
                      className="p-1.5 rounded-lg border border-[#24152B]/15 text-[#24152B] hover:bg-white disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
                      title="Mover arriba"
                    >
                      <ArrowUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      disabled={idx === (landing.bloques?.length || 10) - 1}
                      onClick={() => moverBloque(idx, 'abajo')}
                      className="p-1.5 rounded-lg border border-[#24152B]/15 text-[#24152B] hover:bg-white disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
                      title="Mover abajo"
                    >
                      <ArrowDown className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Galería (≤ 8 fotos) */}
        <div className="p-5 sm:p-6 rounded-2xl bg-white border border-[#24152B]/10 space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-bold text-[#24152B] flex items-center gap-2">
              <ImageIcon className="w-4 h-4 text-[#5B2A6E]" />
              <span>Galería Visual (≤ 8 fotografías)</span>
            </h4>
            <span className="text-[11px] font-mono text-[#6E6478]">
              {(landing.galeria || []).length} / 8
            </span>
          </div>

          <div className="flex gap-2">
            <input
              type="url"
              placeholder="Pega la URL de una imagen (https://...)"
              value={nuevaFotoUrl}
              onChange={(e) => setNuevaFotoUrl(e.target.value)}
              className="flex-1 p-2.5 bg-[#FBFAFC] border border-[#24152B]/15 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#5B2A6E]"
            />
            <button
              type="button"
              onClick={agregarFoto}
              disabled={(landing.galeria || []).length >= 8 || !nuevaFotoUrl.trim()}
              className="px-4 py-2 bg-[#5B2A6E] hover:bg-[#4A2159] text-white rounded-xl text-xs font-bold transition-all disabled:opacity-50 cursor-pointer flex items-center gap-1.5 shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Añadir</span>
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {(landing.galeria || []).map((url, i) => (
              <div key={i} className="relative rounded-xl overflow-hidden border border-[#24152B]/10 group aspect-square bg-stone-100">
                <img src={url} alt={`Trabajo ${i + 1}`} className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => eliminarFoto(i)}
                  className="absolute top-1.5 right-1.5 p-1 rounded-full bg-rose-600 text-white shadow-sm opacity-90 hover:opacity-100 transition-opacity cursor-pointer"
                  title="Eliminar foto"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Preguntas Frecuentes (≤ 8 items) */}
        <div className="p-5 sm:p-6 rounded-2xl bg-white border border-[#24152B]/10 space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-bold text-[#24152B]">Preguntas Frecuentes (≤ 8 items)</h4>
            <span className="text-[11px] font-mono text-[#6E6478]">
              {(landing.faq || []).length} / 8
            </span>
          </div>

          <div className="space-y-2 p-3 rounded-xl bg-[#FBFAFC] border border-[#24152B]/10">
            <input
              type="text"
              maxLength={140}
              placeholder="Pregunta (≤ 140 caracteres)..."
              value={nuevaPregunta}
              onChange={(e) => setNuevaPregunta(e.target.value)}
              className="w-full p-2 bg-white border border-[#24152B]/15 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-[#5B2A6E]"
            />
            <textarea
              rows={2}
              maxLength={400}
              placeholder="Respuesta explicativa (≤ 400 caracteres)..."
              value={nuevaRespuesta}
              onChange={(e) => setNuevaRespuesta(e.target.value)}
              className="w-full p-2 bg-white border border-[#24152B]/15 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-[#5B2A6E] resize-none"
            />
            <div className="flex justify-end">
              <button
                type="button"
                onClick={agregarFaq}
                disabled={(landing.faq || []).length >= 8 || !nuevaPregunta.trim() || !nuevaRespuesta.trim()}
                className="px-3.5 py-1.5 bg-[#5B2A6E] hover:bg-[#4A2159] text-white rounded-lg text-xs font-bold disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Agregar FAQ</span>
              </button>
            </div>
          </div>

          <div className="space-y-2.5">
            {(landing.faq || []).map((faqItem, i) => (
              <div key={i} className="p-3 rounded-xl bg-[#FBFAFC] border border-[#24152B]/10 flex items-start justify-between gap-3">
                <div className="space-y-1 text-xs">
                  <p className="font-bold text-[#24152B]">¿{faqItem.p}?</p>
                  <p className="text-[#6E6478] leading-relaxed">{faqItem.r}</p>
                </div>
                <button
                  type="button"
                  onClick={() => eliminarFaq(i)}
                  className="p-1 text-stone-400 hover:text-rose-600 transition-colors cursor-pointer shrink-0"
                  title="Eliminar FAQ"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Optimización SEO */}
        <div className="p-5 sm:p-6 rounded-2xl bg-white border border-[#24152B]/10 space-y-4">
          <h4 className="text-sm font-bold text-[#24152B]">Optimización para Buscadores (SEO)</h4>
          <div className="space-y-3">
            <div className="space-y-1">
              <div className="flex justify-between items-center">
                <label className="block text-xs font-bold text-[#24152B]">Título SEO (≤ 70 caracteres)</label>
                <span className="text-[10px] font-mono text-[#6E6478]">{(landing.seoTitulo || '').length} / 70</span>
              </div>
              <input
                type="text"
                maxLength={70}
                value={landing.seoTitulo || ''}
                onChange={(e) => setLanding({ ...landing, seoTitulo: e.target.value })}
                placeholder="Ej: Capra Studio | Belleza y Arquitectura de Miradas en San Cristóbal"
                className="w-full p-2.5 bg-[#FBFAFC] border border-[#24152B]/15 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#5B2A6E]"
              />
            </div>

            <div className="space-y-1">
              <div className="flex justify-between items-center">
                <label className="block text-xs font-bold text-[#24152B]">Descripción SEO (≤ 160 caracteres)</label>
                <span className="text-[10px] font-mono text-[#6E6478]">{(landing.seoDescripcion || '').length} / 160</span>
              </div>
              <textarea
                rows={2}
                maxLength={160}
                value={landing.seoDescripcion || ''}
                onChange={(e) => setLanding({ ...landing, seoDescripcion: e.target.value })}
                placeholder="Ej: Reserva en línea en Capra Studio. Cejas perfectas, lifting de pestañas, manicura y alisados orgánicos en San Cristóbal."
                className="w-full p-2.5 bg-[#FBFAFC] border border-[#24152B]/15 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#5B2A6E] resize-none"
              />
            </div>
          </div>
        </div>

        {/* Guardar */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2.5 rounded-full bg-[#5B2A6E] hover:bg-[#4A2159] text-white text-xs font-bold shadow-sm transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? 'Guardando...' : 'Guardar Landing'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};
