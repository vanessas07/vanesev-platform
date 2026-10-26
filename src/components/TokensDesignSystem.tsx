import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Palette,
  Type,
  Layout,
  Sparkles,
  Smartphone,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Sliders,
  DollarSign,
  Calendar,
  MessageCircle,
  Clock,
  ChevronRight,
  ExternalLink,
} from 'lucide-react';

export const TokensDesignSystem: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'tokens' | 'typography' | 'web_copy' | 'bocetos' | 'capra_themes' | 'motion' | 'audit'>('tokens');
  const [capraThemeSelected, setCapraThemeSelected] = useState<'opcion1' | 'opcion2'>('opcion1');

  // Tokens oficiales VANESEV "Ciruela imperial" (Fondo Claro)
  const tokens = [
    { name: '--v-bg', hex: '#FBFAFC', role: 'Fondo general (Porcelana fría)', contrast: 'Base', level: 'Base', isLight: true },
    { name: '--v-surface', hex: '#FFFFFF', role: 'Superficie de tarjetas y modales', contrast: 'Base', level: 'Base', isLight: true },
    { name: '--v-surface-2', hex: '#F4F2F7', role: 'Zonas alternas, hover y sidebars', contrast: '1.05:1 vs bg', level: 'Estructural', isLight: true },
    { name: '--v-line', hex: '#E4E2EA', role: 'Bordes finos de 1px y separadores platino', contrast: '1.2:1 vs bg', level: 'Estructural', isLight: true },
    { name: '--v-ink', hex: '#24152B', role: 'Texto titular y lectura principal (tinta ciruela)', contrast: '14.8:1 vs bg', level: 'AAA', isLight: false },
    { name: '--v-muted', hex: '#6E6478', role: 'Texto secundario, metadatos y ayudas', contrast: '4.9:1 vs bg', level: 'AA', isLight: false },
    { name: '--v-brand', hex: '#5B2A6E', role: 'Ciruela imperial: CTA principal y acentos', contrast: '7.4:1 vs bg', level: 'AAA', isLight: false },
    { name: '--v-brand-hover', hex: '#4A2159', role: 'Hover / activo del botón CTA', contrast: '9.5:1 vs bg', level: 'AAA', isLight: false },
    { name: '--v-brand-soft', hex: '#EEE7F2', role: 'Chips activos, selección sutil', contrast: '1.15:1 vs bg', level: 'Decorativo', isLight: true },
    { name: '--v-platinum', hex: '#B9BCC6', role: 'Filetes platino de lujo y separadores', contrast: '1.8:1 vs bg', level: 'Estructural', isLight: true },
    { name: '--v-ok', hex: '#1F7A5A', role: 'Confirmación, citas agendadas, éxito', contrast: '4.8:1 vs bg', level: 'AA', isLight: false },
    { name: '--v-warn', hex: '#B26A00', role: 'Avisos de agenda, límites próximos', contrast: '4.6:1 vs bg', level: 'AA', isLight: false },
    { name: '--v-danger', hex: '#B3261E', role: 'Alertas críticas, cancelaciones', contrast: '5.2:1 vs bg', level: 'AA', isLight: false },
  ];

  return (
    <div className="min-h-screen bg-[#FBFAFC] text-[#24152B] font-sans antialiased selection:bg-[#EEE7F2] selection:text-[#5B2A6E]">
      {/* Top Bar Header */}
      <header className="border-b border-[#E4E2EA] bg-[#FFFFFF]/90 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#5B2A6E] text-white flex items-center justify-center font-bold font-serif text-xl shadow-xs">
              V
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-base tracking-tight text-[#24152B]">VANESEV Design System</span>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-[#EEE7F2] text-[#5B2A6E]">
                  Ciruela Imperial
                </span>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                  Staging /__tokens
                </span>
              </div>
              <p className="text-xs text-[#6E6478]">
                Tokens de autor, contrastes WCAG, especificación tipográfica y previsualización de temas
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <a
              href="/"
              className="text-xs font-semibold px-3 py-1.5 rounded-xl border border-[#E4E2EA] text-[#6E6478] hover:text-[#24152B] hover:bg-[#F4F2F7] transition-all"
            >
              ← Ir a Web
            </a>
            <a
              href="/?central=1"
              className="text-xs font-semibold px-3 py-1.5 rounded-xl bg-[#5B2A6E] text-white hover:bg-[#4A2159] transition-all shadow-xs"
            >
              Central Directivo
            </a>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex overflow-x-auto gap-2 py-2 border-t border-[#E4E2EA]/60 scrollbar-none">
          {[
            { id: 'tokens', label: '1. Tokens & Contraste', icon: Palette },
            { id: 'typography', label: '2. Tipografía', icon: Type },
            { id: 'web_copy', label: '3. Estructura & Copy Web', icon: Layout },
            { id: 'bocetos', label: '4. Bocetos Central & Admin', icon: Sliders },
            { id: 'capra_themes', label: '5. Temas Capra Studio', icon: Smartphone },
            { id: 'motion', label: '6. Inventario de Movimiento', icon: Clock },
            { id: 'audit', label: '7. Auditoría de Colores', icon: ShieldCheck },
          ].map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`text-xs font-semibold px-3 py-2 rounded-xl whitespace-nowrap flex items-center gap-2 transition-all ${
                  active
                    ? 'bg-[#5B2A6E] text-white shadow-xs'
                    : 'text-[#6E6478] hover:text-[#24152B] hover:bg-[#F4F2F7]'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {/* TAB 1: TOKENS & CONTRASTE */}
        {activeTab === 'tokens' && (
          <div className="space-y-8">
            <div>
              <h2 className="text-2xl font-serif font-semibold text-[#24152B]">
                Paleta «Ciruela imperial» (Fondos Claros)
              </h2>
              <p className="text-xs text-[#6E6478] mt-1 max-w-3xl">
                Elegida directamente por karc0 para la marca corporativa de VANESEV. Todos los fondos son porcelana limpia
                y superficies blancas. Cero negro, cero modo oscuro, cero degradados multicolores y cero rosas o marrones.
              </p>
            </div>

            {/* Grid of Token Swatches */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {tokens.map((t) => (
                <div
                  key={t.name}
                  className="bg-[#FFFFFF] border border-[#E4E2EA] rounded-2xl p-4 shadow-xs flex flex-col justify-between"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div
                      className="w-12 h-12 rounded-xl border border-black/10 shadow-inner shrink-0"
                      style={{ backgroundColor: t.hex }}
                    />
                    <div className="overflow-hidden">
                      <div className="font-mono text-xs font-bold text-[#24152B]">{t.name}</div>
                      <div className="font-mono text-xs text-[#6E6478] uppercase">{t.hex}</div>
                    </div>
                  </div>

                  <div className="border-t border-[#E4E2EA] pt-2.5 space-y-1">
                    <div className="text-xs text-[#24152B] font-medium leading-snug">{t.role}</div>
                    <div className="flex items-center justify-between text-[11px] pt-1">
                      <span className="text-[#6E6478]">Contraste:</span>
                      <span className={`font-semibold px-2 py-0.5 rounded-full text-[10px] ${
                        t.level === 'AAA' ? 'bg-purple-100 text-[#5B2A6E]' :
                        t.level === 'AA' ? 'bg-emerald-100 text-emerald-800' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {t.contrast} ({t.level})
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Live Component Preview using Tokens */}
            <div className="mt-10 bg-[#FFFFFF] border border-[#E4E2EA] rounded-3xl p-6 sm:p-8 shadow-xs">
              <h3 className="text-lg font-serif font-semibold text-[#24152B] mb-1">
                Micro-Componentes Reales con Tokens «Ciruela imperial»
              </h3>
              <p className="text-xs text-[#6E6478] mb-6">
                Prueba en vivo de botones de acción, filetes platino, estados de selección e inputs semánticos.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* CTA Card */}
                <div className="p-5 rounded-2xl bg-[#FBFAFC] border border-[#E4E2EA] space-y-3">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#6E6478]">Botón Principal CTA</span>
                  <p className="text-xs text-[#24152B]">Sólido, con autoridad de maison, sin degradados:</p>
                  <button className="w-full py-3 px-5 rounded-xl bg-[#5B2A6E] text-white font-semibold text-xs hover:bg-[#4A2159] transition-all shadow-xs flex items-center justify-center gap-2">
                    <span>Quiero mi estudio en VANESEV</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Chips & Badges */}
                <div className="p-5 rounded-2xl bg-[#FBFAFC] border border-[#E4E2EA] space-y-3">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#6E6478]">Chips Activos & Estados</span>
                  <div className="flex flex-wrap gap-2 pt-1">
                    <span className="px-3 py-1.5 rounded-xl bg-[#EEE7F2] text-[#5B2A6E] text-xs font-semibold border border-[#5B2A6E]/15">
                      Sello 05/05 · Listo
                    </span>
                    <span className="px-3 py-1.5 rounded-xl bg-emerald-50 text-[#1F7A5A] text-xs font-semibold border border-[#1F7A5A]/20">
                      Cita Confirmada
                    </span>
                    <span className="px-3 py-1.5 rounded-xl bg-amber-50 text-[#B26A00] text-xs font-semibold border border-[#B26A00]/20">
                      1 Hueco Libre
                    </span>
                  </div>
                </div>

                {/* Form Input */}
                <div className="p-5 rounded-2xl bg-[#FBFAFC] border border-[#E4E2EA] space-y-3">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#6E6478]">Input Semántico de Autor</span>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-[#24152B]">Nombre del Salón</label>
                    <input
                      type="text"
                      readOnly
                      value="Capra Studio Atelier"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-[#E4E2EA] text-xs text-[#24152B] focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: TIPOGRAFÍA */}
        {activeTab === 'typography' && (
          <div className="space-y-8">
            <div>
              <h2 className="text-2xl font-serif font-semibold text-[#24152B]">
                Sistema Tipográfico Oficial de VANESEV
              </h2>
              <p className="text-xs text-[#6E6478] mt-1 max-w-3xl">
                Cormorant Garamond para voz de maison en titulares, combinada con Manrope para interfaz de alta precisión.
                Prohibido Fraunces en VANESEV para preservar la separación de marcas con los estudios.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Cormorant Display Card */}
              <div className="bg-white border border-[#E4E2EA] rounded-3xl p-6 sm:p-8 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-bold text-[#5B2A6E]">Titulares & Maison Display</span>
                  <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-[#EEE7F2] text-[#5B2A6E]">
                    Cormorant Garamond 500 / 600
                  </span>
                </div>

                <div className="pt-2 space-y-4 font-serif">
                  <h1 className="text-4xl sm:text-5xl font-semibold text-[#24152B] leading-tight tracking-tight">
                    Tu estudio, con agenda llena y marca de autor.
                  </h1>
                  <h2 className="text-2xl font-medium text-[#5B2A6E]">
                    Lujo silencioso, precisión clínica y estatus.
                  </h2>
                  <p className="text-base text-[#6E6478] italic leading-relaxed">
                    «El software que las clientas más exigentes reconocen como un estándar de distinción.»
                  </p>
                </div>
              </div>

              {/* Manrope UI Card */}
              <div className="bg-white border border-[#E4E2EA] rounded-3xl p-6 sm:p-8 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-bold text-[#5B2A6E]">Interfaz & Cifras Tabulares</span>
                  <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                    Manrope + Tabular Nums
                  </span>
                </div>

                <div className="pt-2 space-y-4 font-sans">
                  <p className="text-sm text-[#24152B] leading-relaxed">
                    Manrope ofrece claridad insuperable en pantallas móviles OLED y pantallas táctiles de recepción.
                    Las cifras nunca se desalinean gracias a la propiedad <code className="bg-[#F4F2F7] px-1.5 py-0.5 rounded text-xs font-mono">tabular-nums</code>.
                  </p>

                  <div className="p-4 rounded-2xl bg-[#FBFAFC] border border-[#E4E2EA] space-y-2">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-[#6E6478]">Ingresos Estimados Recuperados:</span>
                      <span className="font-bold text-[#5B2A6E] text-base" style={{ fontVariantNumeric: 'tabular-nums' }}>
                        $1,480.00 USD / mes
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-[#6E6478]">Citas Confirmadas hoy:</span>
                      <span className="font-semibold text-[#24152B]" style={{ fontVariantNumeric: 'tabular-nums' }}>
                        24 citas
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-[#6E6478]">Tasa de Asistencia:</span>
                      <span className="font-semibold text-[#1F7A5A]" style={{ fontVariantNumeric: 'tabular-nums' }}>
                        98.4%
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: ESTRUCTURA & COPY WEB */}
        {activeTab === 'web_copy' && (
          <div className="space-y-8">
            <div>
              <h2 className="text-2xl font-serif font-semibold text-[#24152B]">
                Estructura de Venta Agresiva y Honesta (10 Secciones)
              </h2>
              <p className="text-xs text-[#6E6478] mt-1 max-w-3xl">
                Diseñada según la Orden 1930 §3.1 para convertir a dueñas de salones de belleza sin urgencia falsa, sin
                testimonios inventados y con psicología de negocio tangible.
              </p>
            </div>

            <div className="space-y-4">
              {[
                {
                  num: '01',
                  name: 'Hero con Promesa de Resultado',
                  copy: '«Tu estudio, con agenda llena y marca de autor.» Subtítulo: Carta QR, reservas por especialista y Pasaporte VIP. CTA ciruela sólido y móvil 3D sin etiquetas que tapen el cristal.',
                },
                {
                  num: '02',
                  name: 'El Dolor, Cuantificado',
                  copy: '«El dinero que tu estudio pierde cada semana en silencio.» Huecos vacíos entre citas, mensajes de WhatsApp contestados con retraso y clientas que se van a otro salón.',
                },
                {
                  num: '03',
                  name: 'Calculadora de Ingresos Recuperados',
                  copy: 'Control interactivo: [Puestos de trabajo] × [Ticket promedio] × [Citas perdidas]. Fórmula visible con cifras tabulares que demuestra el retorno mensual.',
                },
                {
                  num: '04',
                  name: 'Cómo Funciona en 3 Pasos (Pinned Scenes)',
                  copy: '01. La clienta escanea la carta en la mesa o desde Instagram → 02. Elige especialista y hora con confirmación directa → 03. Acumula sellos en su móvil y regresa.',
                },
                {
                  num: '05',
                  name: '«Cada estudio, su marca» (Diferencial)',
                  copy: 'Selector interactivo de 3 salones de prueba (Pestañas, Uñas, Peluquería/Barbería) con identidades opuestas. Demostración del generador de diseño real.',
                },
                {
                  num: '06',
                  name: 'Pasaporte VIP en 1 Imagen',
                  copy: 'Infografía nítida que explica cómo el Pasaporte digital reemplaza el cartón por fidelización móvil criptográfica que las clientas adoran.',
                },
                {
                  num: '07',
                  name: 'Precios con Anclaje Visual',
                  copy: '3 Planes transparentes (Boutique, Estudio de Autor, Multi-Sede). El nivel central destacado como «Recomendado» con ahorro anual explícito.',
                },
                {
                  num: '08',
                  name: 'Garantía de Funcionamiento',
                  copy: 'Marcador en staging para el texto legal y compromiso operativo validado por karc0.',
                },
                {
                  num: '09',
                  name: 'Preguntas que Frenan la Compra',
                  copy: 'Respuestas directas: «No requiere instalación de apps», «Te ayudamos a migrar tus clientas desde WhatsApp», «Sin ataduras ni permanencias».',
                },
                {
                  num: '10',
                  name: 'Cierre de Conversión & Contacto',
                  copy: 'Formulario de 4 campos (Nombre, Salón, Ciudad, WhatsApp) y botón directo a WhatsApp. Barra fija inferior en móvil que no tapa ningún elemento.',
                },
              ].map((s) => (
                <div key={s.num} className="bg-white border border-[#E4E2EA] rounded-2xl p-5 shadow-xs flex items-start gap-4">
                  <div className="font-serif font-bold text-lg text-[#5B2A6E] w-8 shrink-0">{s.num}</div>
                  <div className="space-y-1">
                    <h4 className="text-sm font-bold text-[#24152B]">{s.name}</h4>
                    <p className="text-xs text-[#6E6478] leading-relaxed">{s.copy}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 4: BOCETOS CENTRAL & ADMIN */}
        {activeTab === 'bocetos' && (
          <div className="space-y-8">
            <div>
              <h2 className="text-2xl font-serif font-semibold text-[#24152B]">
                Bocetos Funcionales: Central & Admin de Salón
              </h2>
              <p className="text-xs text-[#6E6478] mt-1 max-w-3xl">
                Arquitectura de pantallas clara, profesional y libre de colores estridentes o modo oscuro artificial.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Central Mockup */}
              <div className="bg-white border border-[#E4E2EA] rounded-3xl p-6 shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-[#E4E2EA] pb-3">
                  <div>
                    <h3 className="text-base font-bold text-[#24152B]">Central Superadmin (karc0)</h3>
                    <p className="text-[11px] text-[#6E6478]">Zona 2 · Centro de Dirección General</p>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#EEE7F2] text-[#5B2A6E]">
                    Porcelana + Cero Naranja
                  </span>
                </div>

                <div className="space-y-3">
                  <div className="p-3 rounded-xl bg-[#F4F2F7] border border-[#E4E2EA] flex items-center justify-between text-xs">
                    <span className="font-semibold text-[#24152B]">Siguiente del Día:</span>
                    <span className="text-[#5B2A6E] font-medium">Revisión Bloque 1 v2</span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="p-3 rounded-xl bg-[#FBFAFC] border border-[#E4E2EA]">
                      <div className="text-[10px] text-[#6E6478] uppercase font-bold">Salones</div>
                      <div className="text-lg font-bold text-[#24152B]" style={{ fontVariantNumeric: 'tabular-nums' }}>2</div>
                    </div>
                    <div className="p-3 rounded-xl bg-[#FBFAFC] border border-[#E4E2EA]">
                      <div className="text-[10px] text-[#6E6478] uppercase font-bold">MRR Recurrente</div>
                      <div className="text-lg font-bold text-[#5B2A6E]" style={{ fontVariantNumeric: 'tabular-nums' }}>$190</div>
                    </div>
                    <div className="p-3 rounded-xl bg-[#FBFAFC] border border-[#E4E2EA]">
                      <div className="text-[10px] text-[#6E6478] uppercase font-bold">Infraestructura</div>
                      <div className="text-lg font-bold text-[#1F7A5A]">100% OK</div>
                    </div>
                  </div>

                  <div className="p-3 rounded-xl border border-[#E4E2EA] text-xs space-y-1">
                    <div className="font-bold text-[#24152B]">Salones Activos en Plataforma:</div>
                    <div className="text-[11px] text-[#6E6478] flex justify-between py-1 border-b border-[#E4E2EA]/60">
                      <span>• Capra Studio (María Giovanna Capra)</span>
                      <span className="text-[#1F7A5A] font-semibold">Salud Óptima</span>
                    </div>
                    <div className="text-[11px] text-[#6E6478] flex justify-between py-1">
                      <span>• Andrea Labrador Nails (Vitalicio VIP)</span>
                      <span className="text-[#1F7A5A] font-semibold">Salud Óptima</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Salon Admin Mockup */}
              <div className="bg-white border border-[#E4E2EA] rounded-3xl p-6 shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-[#E4E2EA] pb-3">
                  <div>
                    <h3 className="text-base font-bold text-[#24152B]">Admin del Salón (Dueña)</h3>
                    <p className="text-[11px] text-[#6E6478]">Zona 3 · Foco Inmediato en Facturación y Citas</p>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                    Acento de Marca de Salón
                  </span>
                </div>

                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-2 text-center">
                    <div className="p-3 rounded-xl bg-[#FBFAFC] border border-[#E4E2EA]">
                      <div className="text-[10px] text-[#6E6478] uppercase font-bold">Ingresos Hoy</div>
                      <div className="text-lg font-bold text-[#24152B]" style={{ fontVariantNumeric: 'tabular-nums' }}>$145 USD</div>
                    </div>
                    <div className="p-3 rounded-xl bg-[#FBFAFC] border border-[#E4E2EA]">
                      <div className="text-[10px] text-[#6E6478] uppercase font-bold">Citas por Confirmar</div>
                      <div className="text-lg font-bold text-[#B26A00]" style={{ fontVariantNumeric: 'tabular-nums' }}>3 citas</div>
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-amber-50/50 border border-amber-200/60 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-[#24152B]">1 Hueco Libre Mañana (3:30 PM)</span>
                      <button className="text-[10px] font-bold px-2.5 py-1 rounded-lg bg-[#5B2A6E] text-white hover:bg-[#4A2159] transition-all">
                        Llenar este hueco
                      </button>
                    </div>
                    <p className="text-[11px] text-[#6E6478]">
                      Envía un aviso VIP automático por WhatsApp a las 5 clientas que llevan más de 25 días sin venir.
                    </p>
                  </div>

                  <div className="p-3 rounded-xl border border-[#E4E2EA] text-xs space-y-1">
                    <div className="font-bold text-[#24152B]">Clientas Próximas a Recompensa VIP:</div>
                    <div className="text-[11px] text-[#6E6478] flex justify-between py-1">
                      <span>• Mariana V. (4 de 5 sellos)</span>
                      <span className="text-[#5B2A6E] font-bold">A 1 sello</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: TEMAS CAPRA STUDIO */}
        {activeTab === 'capra_themes' && (
          <div className="space-y-8">
            <div>
              <h2 className="text-2xl font-serif font-semibold text-[#24152B]">
                2 Opciones de Tema de Autor para Capra Studio
              </h2>
              <p className="text-xs text-[#6E6478] mt-1 max-w-3xl">
                Capra Studio (@caprastudio_ de María Giovanna Capra) debe tener identidad visual 100% propia, guardada en Neon
                y totalmente diferenciada de la Ciruela imperial de VANESEV y del verde de Andrea Nails. karc0 elige la opción final.
              </p>
            </div>

            {/* Selector de Opción */}
            <div className="flex gap-4">
              <button
                onClick={() => setCapraThemeSelected('opcion1')}
                className={`flex-1 p-4 rounded-2xl border text-left transition-all ${
                  capraThemeSelected === 'opcion1'
                    ? 'border-[#9E6B7A] bg-[#9E6B7A]/5 shadow-sm ring-2 ring-[#9E6B7A]/20'
                    : 'border-[#E4E2EA] bg-white hover:bg-[#F4F2F7]'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-sm text-[#24152B]">Opción 1: Velvet Champagne & Mauve</span>
                  {capraThemeSelected === 'opcion1' && <CheckCircle2 className="w-4 h-4 text-[#9E6B7A]" />}
                </div>
                <p className="text-xs text-[#6E6478]">
                  Mauve cálido (#9E6B7A) + Champagne satinado (#D4AF37) + Fondo Lino suave (#FAF7F5). Tipografía Cinzel + Plus Jakarta Sans.
                </p>
              </button>

              <button
                onClick={() => setCapraThemeSelected('opcion2')}
                className={`flex-1 p-4 rounded-2xl border text-left transition-all ${
                  capraThemeSelected === 'opcion2'
                    ? 'border-[#A85A48] bg-[#A85A48]/5 shadow-sm ring-2 ring-[#A85A48]/20'
                    : 'border-[#E4E2EA] bg-white hover:bg-[#F4F2F7]'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-sm text-[#24152B]">Opción 2: Warm Terra & Pearl Bronze</span>
                  {capraThemeSelected === 'opcion2' && <CheckCircle2 className="w-4 h-4 text-[#A85A48]" />}
                </div>
                <p className="text-xs text-[#6E6478]">
                  Terracota sedosa (#A85A48) + Bronce perlado (#C29B7F) + Fondo Perla cálida (#FDFBF7). Tipografía Playfair Display + Inter.
                </p>
              </button>
            </div>

            {/* Live Interactive Preview Card for Capra Studio */}
            <div
              className="rounded-3xl p-6 sm:p-8 border shadow-sm transition-all"
              style={{
                backgroundColor: capraThemeSelected === 'opcion1' ? '#FAF7F5' : '#FDFBF7',
                borderColor: capraThemeSelected === 'opcion1' ? '#E8DFD8' : '#EAE2D8',
                color: capraThemeSelected === 'opcion1' ? '#2D2327' : '#241E1D',
              }}
            >
              <div className="max-w-md mx-auto bg-white rounded-3xl p-6 border shadow-sm space-y-4" style={{ borderColor: capraThemeSelected === 'opcion1' ? '#E8DFD8' : '#EAE2D8' }}>
                <div className="flex items-center justify-between">
                  <div>
                    <h3
                      className="text-xl font-bold tracking-tight"
                      style={{
                        fontFamily: capraThemeSelected === 'opcion1' ? 'Cinzel, serif' : 'Playfair Display, serif',
                        color: capraThemeSelected === 'opcion1' ? '#9E6B7A' : '#A85A48',
                      }}
                    >
                      CAPRA STUDIO
                    </h3>
                    <p className="text-[11px] text-gray-500">By María Giovanna Capra · San Cristóbal</p>
                  </div>
                  <span
                    className="text-[10px] font-bold px-2.5 py-1 rounded-full text-white"
                    style={{ backgroundColor: capraThemeSelected === 'opcion1' ? '#9E6B7A' : '#A85A48' }}
                  >
                    Atelier VIP
                  </span>
                </div>

                <div className="p-4 rounded-2xl border space-y-2" style={{ backgroundColor: capraThemeSelected === 'opcion1' ? '#FAF7F5' : '#FDFBF7', borderColor: capraThemeSelected === 'opcion1' ? '#E8DFD8' : '#EAE2D8' }}>
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-xs">Brow Lamination + Botox Nutritivo</span>
                    <span className="font-bold text-xs" style={{ color: capraThemeSelected === 'opcion1' ? '#9E6B7A' : '#A85A48' }}>$20 USD</span>
                  </div>
                  <p className="text-[11px] text-gray-600 leading-snug">
                    Reestructuración de cejas rebeldes con efecto pluma y alineación direccional de vello.
                  </p>
                  <button
                    className="w-full mt-2 py-2 px-4 rounded-xl text-xs font-bold text-white transition-all shadow-xs"
                    style={{ backgroundColor: capraThemeSelected === 'opcion1' ? '#9E6B7A' : '#A85A48' }}
                  >
                    Reservar con Especialista
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 6: INVENTARIO DE MOVIMIENTO */}
        {activeTab === 'motion' && (
          <div className="space-y-8">
            <div>
              <h2 className="text-2xl font-serif font-semibold text-[#24152B]">
                Inventario de Movimiento & Mapa de Interacciones
              </h2>
              <p className="text-xs text-[#6E6478] mt-1 max-w-3xl">
                Conforme a la Orden 1945: las 78 animaciones existentes en el repositorio se conservan y se elevan a estándar
                de alta cosmética. Se prohíben efectos de nave espacial, rebotes exagerados y partículas mágicas.
              </p>
            </div>

            <div className="overflow-x-auto border border-[#E4E2EA] rounded-2xl bg-white shadow-xs">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#F4F2F7] border-b border-[#E4E2EA] text-[#6E6478] uppercase text-[10px] tracking-wider">
                  <tr>
                    <th className="py-3 px-4 font-bold">Archivo / Componente</th>
                    <th className="py-3 px-4 font-bold">Efecto / Animación</th>
                    <th className="py-3 px-4 font-bold">Decisión</th>
                    <th className="py-3 px-4 font-bold">Mejora de Alta Gama (Orden 1945)</th>
                    <th className="py-3 px-4 font-bold">Bloque</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E4E2EA] text-[#24152B]">
                  <tr>
                    <td className="py-3 px-4 font-mono text-[11px]">VanesevLanding.tsx</td>
                    <td className="py-3 px-4">Smartphone Hero Preview</td>
                    <td className="py-3 px-4"><span className="px-2 py-0.5 rounded-full bg-purple-100 text-[#5B2A6E] font-bold text-[10px]">MEJORAR</span></td>
                    <td className="py-3 px-4 text-[#6E6478]">Rotación 3D suave con `useScroll` (max ±12°) sin tapar el cristal.</td>
                    <td className="py-3 px-4 font-semibold">D2</td>
                  </tr>
                  <tr>
                    <td className="py-3 px-4 font-mono text-[11px]">VanesevLanding.tsx</td>
                    <td className="py-3 px-4">Lista de 3 Pasos</td>
                    <td className="py-3 px-4"><span className="px-2 py-0.5 rounded-full bg-purple-100 text-[#5B2A6E] font-bold text-[10px]">MEJORAR</span></td>
                    <td className="py-3 px-4 text-[#6E6478]">Escenas fijas (pinned scroll): avanza el producto con el scroll.</td>
                    <td className="py-3 px-4 font-semibold">D2</td>
                  </tr>
                  <tr>
                    <td className="py-3 px-4 font-mono text-[11px]">CapraStudioExperience.tsx</td>
                    <td className="py-3 px-4">Tarjeta Pasaporte VIP</td>
                    <td className="py-3 px-4"><span className="px-2 py-0.5 rounded-full bg-purple-100 text-[#5B2A6E] font-bold text-[10px]">MEJORAR</span></td>
                    <td className="py-3 px-4 text-[#6E6478]">Inclinación 3D con giroscopio en móvil y mouse en desktop.</td>
                    <td className="py-3 px-4 font-semibold">D1</td>
                  </tr>
                  <tr>
                    <td className="py-3 px-4 font-mono text-[11px]">AdminDashboard.tsx</td>
                    <td className="py-3 px-4">Contadores Financieros</td>
                    <td className="py-3 px-4"><span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px]">CONSERVAR</span></td>
                    <td className="py-3 px-4 text-[#6E6478]">Mantener transición numérica añadiendo tabular-nums estricto.</td>
                    <td className="py-3 px-4 font-semibold">D3</td>
                  </tr>
                  <tr>
                    <td className="py-3 px-4 font-mono text-[11px]">CentralAuthGate.tsx</td>
                    <td className="py-3 px-4">Card de Login 2FA</td>
                    <td className="py-3 px-4"><span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px]">CONSERVAR</span></td>
                    <td className="py-3 px-4 text-[#6E6478]">Transición sobria de entrada en 200ms sin rebotes artificiales.</td>
                    <td className="py-3 px-4 font-semibold">D1</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 7: AUDITORÍA DE COLORES */}
        {activeTab === 'audit' && (
          <div className="space-y-8">
            <div>
              <h2 className="text-2xl font-serif font-semibold text-[#24152B]">
                Auditoría de Componentes para Migración a Tokens
              </h2>
              <p className="text-xs text-[#6E6478] mt-1 max-w-3xl">
                Lista de componentes del proyecto que actualmente contienen clases Tailwind fijas o colores filtrados
                para su unificación bajo variables semánticas en el Bloque D1.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                { file: 'CookieConsentBanner.tsx', issue: 'Utiliza #16291F y amber-400 (Andrea Nails filtrado a todo el producto)', action: 'Migrar a var(--v-surface) y var(--v-brand)' },
                { file: 'CentralDashboard.tsx', issue: 'Utiliza acentos naranjas #F26A3D', action: 'Sustituir por Ciruela imperial #5B2A6E' },
                { file: 'AdminDashboard.tsx', issue: 'Utiliza paletas verdes del salón en la barra lateral del admin', action: 'Adoptar estructura VANESEV clara con chip de salón' },
                { file: 'WhatsAppHelpFloat.tsx', issue: 'Círculo blanco sin icono SVG visible en varias resoluciones', action: 'Garantizar visibilidad del SVG y herencia de tokens' },
                { file: 'PWAInstallModal.tsx', issue: 'Gradientes de fondo fijos', action: 'Consumir tokens semánticos del tenant activo' },
                { file: 'AdminAuthGate.tsx', issue: 'Textos de "Super Admin" en login de salón de belleza', action: 'Corregir a "Acceso del estudio · {nombre}"' },
              ].map((item, idx) => (
                <div key={idx} className="bg-white border border-[#E4E2EA] rounded-2xl p-5 shadow-xs space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-[#5B2A6E]">{item.file}</span>
                    <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                      Pendiente D1
                    </span>
                  </div>
                  <div className="text-xs text-[#B3261E] font-medium leading-snug">{item.issue}</div>
                  <div className="text-xs text-[#1F7A5A] pt-1">
                    <b>Acción:</b> {item.action}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
};
