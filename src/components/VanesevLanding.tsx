import { VanesevLogo } from './VanesevLogo';
import { PortadaCinematica } from './landing/PortadaCinematica';
import { Migas, PaginaWeb, esPaginaWeb, MENU_FUNCIONES, MENU_OFICIOS } from './web/PaginasWeb';
import { PaginaActivar } from './web/PaginaActivar';
import { AvisoCookies } from './web/AvisoCookies';
import { revelarSeccion, TituloRevelado, AuroraFondo, useInclinacion3D, UnDiaEnTuSalon, FotoPortada, ReflejoPantalla, Magnetico, TarjetaTilt, PanelDeDuena } from './landing/EfectosPremium';
import React, { useState, useRef } from 'react';
import {

  Calendar,
  QrCode,
  ShieldCheck,
  ArrowRight,
  ArrowUpRight,
  Home,
  Check,
  Clock,
  Star,
  Users,
  Palette,
  Sliders,
  Smartphone,
  Award,
  TrendingUp,
  MessageCircle,
  Layers,
  Eye,
  ChevronRight,
  ChevronDown,
  Menu,
  X,
  CheckCircle2,
  MapPin,
  Crown,
  Lock,
  BookOpen,
  Building2,
  Send,
} from 'lucide-react';
import { motion, AnimatePresence, useScroll, useTransform, useReducedMotion } from 'framer-motion';
import {
  SALON_PALETTES,
  SALON_TYPOGRAPHIES,
  SALON_LAYOUTS,
  SalonPaletteId,
  SalonTypographyId,
  SalonCardLayoutId,
  getPaletteById,
  getTypographyById,
} from '../utils/salonThemeEngine';

// Web comercial: nunca enlaza a un salón cliente (G-040). La marca de ejemplo es Estudio Ámbar.
const MARCA_DEMO = 'Estudio Ámbar';

const SECTORS = [
  {
    id: 'brows-lashes',
    tag: 'Brows, Lashes & MakeUp',
    title: 'Estudios de Mirada & Maquillaje de Autor',
    subtitle: 'Laminado, Lifting, Extensiones Seda y Piel Blindada',
    image: '',
    problemSolved:
      'Elimina las 40 preguntas diarias de "¿qué diferencia hay entre lifting y extensiones?" con fichas editoriales fotográficas y reserva por especialista.',
    metrics: 'Cada técnica explicada antes de que pregunten',
    servicesPreview: [
      { name: 'Brow Lamination + Botox Nutritivo', duration: '50 min', price: '$20' },
      { name: 'Lifting de Pestañas + Keratina', duration: '60 min', price: '$22' },
      { name: 'Maquillaje Social Piel Blindada HD', duration: '75 min', price: '$35' },
    ],
  },
  {
    id: 'hair-atelier',
    tag: 'Hair Color & Styling',
    title: 'Salones de Alta Peluquería & Colorimetría',
    subtitle: 'Balayage, Alisados Orgánicos, Hidratación Profunda & Ondas',
    image: '/vanesev/sector-hair-color.jpg',
    problemSolved:
      'Bloquea automáticamente sillones de lavado y estilistas durante 3 o 4 horas sin cruces de agenda ni esperas incómodas en recepción.',
    metrics: 'Sesiones largas sin cruces de agenda',
    servicesPreview: [
      { name: 'Alisado Orgánico Brillo Espejo', duration: '150 min', price: '$45' },
      { name: 'Diseño Balayage & Matiz Gloss', duration: '180 min', price: '$85' },
      { name: 'Peinado de Gala & Ondas Hollywood', duration: '60 min', price: '$25' },
    ],
  },
  {
    id: 'medspa-clinic',
    tag: 'Aesthetic & MedSpa',
    title: 'Clínicas Estéticas, Cabinas Faciales & Spa',
    subtitle: 'Armonización, Hidrafacial, Depilación Láser & Rituales Detox',
    image: '/vanesev/sector-medspa.jpg',
    problemSolved:
      'Asigna cabinas médicas y aparatología por separado, registrando el historial de sesiones y premiando la constancia del paciente.',
    metrics: 'Cada cabina y cada aparato con su propia agenda',
    servicesPreview: [
      { name: 'Protocolo Glow Hidrafacial & LED', duration: '60 min', price: '$55' },
      { name: 'Depilación Corporal Piel de Seda', duration: '45 min', price: '$25' },
      { name: 'Ritual Corporal Botánico Detox', duration: '90 min', price: '$65' },
    ],
  },
  {
    id: 'nails-spa',
    tag: 'Nail Bar & Foot Spa',
    title: 'Nail Bars Boutique & Spa de Manos y Pies',
    subtitle: 'Sistemas Estructurales, Manicura Rusa & Pedicure Botánico',
    image: '',
    problemSolved:
      'Permite que la clienta elija su nivel de diseño, largo y extras antes de llegar al salón, calculando tiempo exacto de mesa y costo en USD/Bs.',
    metrics: 'Diseño, largo y extras elegidos antes de llegar',
    servicesPreview: [
      { name: 'Sistema Estructural Micro-French', duration: '90 min', price: '$25' },
      { name: 'Pedicure Spa Detox con Pétalos', duration: '60 min', price: '$20' },
      { name: 'Nivelación Gel Calcio + Brillo Seda', duration: '60 min', price: '$18' },
    ],
  },
  {
    id: 'barber-lounge',
    tag: 'Gentlemen Grooming',
    title: 'Barberías de Autor & Grooming Lounges',
    subtitle: 'Corte Esculpido, Ritual de Barba con Toalla Caliente & Facial',
    image: '/vanesev/sector-barber-lounge.jpg',
    problemSolved:
      'El cliente escanea el QR en el sillón o entra desde Instagram, elige a su barbero de confianza y agenda en 12 segundos sin llamar.',
    metrics: 'Cada 5 cortes, un ritual de regalo',
    servicesPreview: [
      { name: 'Corte de Autor + Ritual Toalla Caliente', duration: '60 min', price: '$25' },
      { name: 'Perfilado de Barba & Vapor Ozono', duration: '35 min', price: '$15' },
      { name: 'Black Mask Detox & Cuidado Capilar', duration: '45 min', price: '$20' },
    ],
  },
];

// Artículos del blog (/blog, G-042). Sin cifras que no podamos demostrar.
const EDITORIAL_ARTICLES = [
  {
    id: 'whatsapp-loss',
    category: 'Agenda',
    readTime: '4 min de lectura',
    title: 'La clienta que no esperó tu respuesta: por qué se reserva en otro sitio',
    excerpt:
      'Ve tu trabajo en Instagram, le encanta y escribe. Si la respuesta tarda, el impulso se enfría. Así se recupera esa cita sin vivir pegada al móvil.',
    image: '/vanesev/hero-atelier.jpg',
    content: [
      'Casi todas las consultas llegan cuando no puedes contestar: con las manos ocupadas en un servicio o de noche, cuando el estudio ya cerró. Justo cuando la clienta tiene más ganas.',
      'Ella ve un laminado o un alisado en tus historias, entra en tu perfil y escribe «¿precio?, ¿tienes hueco?». Si tiene que esperar horas para saberlo, muchas veces acaba reservando donde se lo ponen fácil.',
      'La solución no es contestar más rápido: es que no haga falta preguntar. Con tu carta en VANESEV ve tus fotos, tus precios en dólares y en bolívares y tus huecos libres de verdad. Elige a su especialista, reserva en segundos y a ti te llega ordenado al WhatsApp.',
    ],
  },
  {
    id: 'vip-passport-psychology',
    category: 'Fidelidad',
    readTime: '5 min de lectura',
    title: 'El Pasaporte VIP: cómo cinco sellos convierten una visita en una costumbre',
    excerpt:
      'La tarjeta de cartulina se pierde en el bolso. Un pasaporte en su móvil, no. Por qué ver el progreso hacia un premio hace que vuelvan antes.',
    image: '/vanesev/sector-medspa.jpg',
    content: [
      'Cuando una clienta ve cuánto le falta para su premio, tiene un motivo concreto para volver contigo y no probar en el estudio de enfrente.',
      'El problema de siempre eran las tarjetas de cartulina: se olvidan al cambiar de bolso, se mojan o se pierden. Y con ellas, los sellos.',
      'Con el Pasaporte VIP de VANESEV, tu clienta ve sus sellos en su móvil, desde tu carta, sin instalar nada. Cada vez que cierras su cita en tu panel, el sello se suma solo. A la quinta visita, su premio la está esperando.',
    ],
  },
  {
    id: 'author-brand-vs-directories',
    category: 'Tu marca',
    readTime: '4 min de lectura',
    title: 'Tu estudio no es una ficha más en un directorio',
    excerpt:
      'Comisiones por tus propias clientas, tu competencia al lado y una plantilla igual a la de todos. Por qué los estudios de autor quieren su propia casa digital.',
    image: '/vanesev/sector-hair-color.jpg',
    content: [
      'Los directorios de reservas prometen clientas nuevas, pero cobran por ellas y ponen a otros estudios justo al lado de tu perfil.',
      'Además, en un directorio todos los estudios se ven igual: la misma plantilla, la misma letra, ninguna personalidad. Y tu personalidad es justo lo que hace que una clienta te elija.',
      'VANESEV parte de la idea contraria: tu estudio es una firma de autor. Tu carta lleva tus colores, tus letras y tu estilo; tus clientas y sus datos son tuyos, y lo que facturas es tuyo entero.',
    ],
  },
];

const FAQ_ITEMS = [
  {
    q: '¿Mis clientas tienen que descargar alguna aplicación o registrarse con contraseña?',
    a: 'No. Entran desde el enlace de tu Instagram o escaneando el QR de tu recepción. Ven tu carta, eligen tratamiento, especialista y hora en 15 segundos, sin descargar nada y sin contraseñas.',
  },
  {
    q: '¿Cobran alguna comisión por cada cita reservada o por cada servicio?',
    a: 'Ninguna. Pagas tu cuota fija y el 100 % de lo que facturas es tuyo. Tampoco cobramos por clienta nueva: las clientas que traes con tu trabajo son tuyas.',
  },
  {
    q: '¿Puedo cambiar los colores, letras, fotos y precios cuando yo quiera?',
    a: 'Sí, cuando quieras y desde el móvil. En tu panel eliges colores, letras y estilo de carta, y cambias servicios, fotos y precios. Lo que cambias se ve al instante en el teléfono de tus clientas, en dólares y en bolívares.',
  },
  {
    q: '¿Necesito comprar un dominio web aparte para mi salón?',
    a: 'No. Tu estudio tiene su propia dirección dentro de VANESEV y su kit con QR listo para imprimir. Si más adelante quieres tu dominio propio, te ayudamos a conectarlo.',
  },
  {
    q: '¿Cómo funciona la confirmación de citas con WhatsApp?',
    a: 'Cuando la clienta selecciona su servicio, fecha y hora en tu carta digital, el sistema registra la reserva en tu agenda y abre automáticamente tu WhatsApp con todos los datos listos. Desde tu panel puedes confirmar, reprogramar o culminar la cita con 1 toque.',
  },
  {
    q: '¿En cuánto tiempo queda listo mi salón si empiezo hoy?',
    a: 'Nos mandas tu lista de servicios como la tengas (foto, PDF o un mensaje de WhatsApp) y tu logo. Te devolvemos tu carta, tu Pasaporte VIP y tu panel listos, y tienes 14 días para probarlo con tus clientas.',
  },
];

export const VanesevLanding: React.FC = () => {
  // /blog es una página propia (G-042): misma cabecera y pie, sin las secciones de la portada.
  const ruta = typeof window !== 'undefined' ? window.location.pathname.toLowerCase().replace(/\/+$/, '') || '/' : '/';
  const esBlog = ruta.startsWith('/blog');
  const esActivar = ruta === '/activar';
  const esPagina = esPaginaWeb(ruta) || esActivar;
  const [menuAbierto, setMenuAbierto] = useState<'funciones' | 'oficios' | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const inclinacion = useInclinacion3D(9);

  // Interactive Phone Simulator State in Hero
  const [phoneStep, setPhoneStep] = useState<'catalog' | 'passport' | 'whatsapp'>('catalog');
  const [phonePaletteId, setPhonePaletteId] = useState<SalonPaletteId>('champagne-atelier');
  const [selectedDemoService, setSelectedDemoService] = useState(0);
  const [selectedDemoTime, setSelectedDemoTime] = useState('10:30 AM');
  const [simulatedStamps, setSimulatedStamps] = useState(4);

  // Interactive Live Theme Studio on Landing Page
  const [studioPaletteId, setStudioPaletteId] = useState<SalonPaletteId>('champagne-atelier');
  const [studioTypographyId, setStudioTypographyId] = useState<SalonTypographyId>('haute-couture');
  const [studioLayoutId, setStudioLayoutId] = useState<SalonCardLayoutId>('editorial-magazine');

  // Active Sector Showcase
  const [activeSectorIdx, setActiveSectorIdx] = useState(0);

  // Real-time Birthday Party Burst state for Vanessa

  // Financial Recovery Calculator
  const [avgTicket, setAvgTicket] = useState(28);
  const [missedWeekly, setMissedWeekly] = useState(6);

  // FAQ Accordion State
  const [openFaqIdx, setOpenFaqIdx] = useState<number | null>(0);

  // Active Blog Article Modal
  const [activeArticle, setActiveArticle] = useState<(typeof EDITORIAL_ARTICLES)[0] | null>(null);

  // Commercial Onboarding / Checkout Modal ("Crear mi Salón / Solicitar Alta")
  const [onboardingModalOpen, setOnboardingModalOpen] = useState(false);
  const [selectedPlanName, setSelectedPlanName] = useState('Plan Fundadora');
  const [leadSalonName, setLeadSalonName] = useState('');
  const [leadOwnerName, setLeadOwnerName] = useState('');
  const [leadWhatsapp, setLeadWhatsapp] = useState('');
  const [leadSpecialty, setLeadSpecialty] = useState('unas');
  const [leadEmail, setLeadEmail] = useState('');
  const [leadCiudad, setLeadCiudad] = useState('');
  const [leadTrampa, setLeadTrampa] = useState('');
  const [leadSubmitted, setLeadSubmitted] = useState(false);
  const [leadEnviando, setLeadEnviando] = useState(false);
  const [leadError, setLeadError] = useState<string | null>(null);

  // Legal Modal State
  const [legalModalTitle, setLegalModalTitle] = useState<string | null>(null);

  // 3D Scroll Perspective Ref
  const showcaseRef = useRef<HTMLElement>(null);
  const shouldReduceMotion = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: showcaseRef,
    offset: ['start end', 'end start'],
  });
  const rotateX = useTransform(scrollYProgress, [0, 0.45, 1], [10, 0, -4]);
  const scale3d = useTransform(scrollYProgress, [0, 0.45, 1], [0.95, 1, 0.98]);

  const phonePalette = getPaletteById(phonePaletteId);
  const studioPalette = getPaletteById(studioPaletteId);
  const studioTypography = getTypographyById(studioTypographyId);
  const activeSector = SECTORS[activeSectorIdx] || SECTORS[0];

  const monthlyRecoveredUSD = avgTicket * missedWeekly * 4;
  const yearlyRecoveredUSD = monthlyRecoveredUSD * 12;

  const scrollToSection = (id: string) => {
    setMobileMenuOpen(false);
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth' });
    else window.location.href = `/#${id}`;
  };

  const openCheckoutWithPlan = (planLabel: string) => {
    setSelectedPlanName(planLabel);
    setLeadSubmitted(false);
    setOnboardingModalOpen(true);
  };

  const handleLeadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLeadEnviando(true);
    setLeadError(null);
    try {
      const res = await fetch('/api/central', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'solicitud_alta', salon: leadSalonName, nombre: leadOwnerName, email: leadEmail, whatsapp: leadWhatsapp,
          oficio: leadSpecialty, ciudad: leadCiudad, plan: /atelier/i.test(selectedPlanName) ? 'atelier' : 'esencial', web: leadTrampa,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) setLeadError(json?.error || 'No se pudo enviar. Escríbenos por WhatsApp.');
      else setLeadSubmitted(true);
    } catch {
      setLeadError('Sin conexión. Inténtalo de nuevo o escríbenos por WhatsApp.');
    }
    setLeadEnviando(false);
  };


  return (
    <div className="min-h-screen bg-[#FBFAFC] text-[#1A1020] font-texto selection:bg-[#4A1F5C]/15 selection:text-[#1A1020] overflow-x-clip">
      {/* ═══════════════════════════════════════════════════════════════════════════
          1. FLOATING CAPSULE COMMERCIAL NAVBAR (100% MOBILE RESPONSIVE, ZERO ADMIN/LOGIN LEAKS)
      ═══════════════════════════════════════════════════════════════════════════ */}
      <header className="fixed inset-x-0 top-0 z-50 flex justify-center px-2.5 sm:px-6 pt-3 sm:pt-4">
        <nav
          aria-label="Principal"
          className="flex w-full max-w-6xl min-w-0 items-center justify-between gap-2 rounded-full border border-[#E4E2EA] bg-white/95 text-[#1A1020] shadow-[0_14px_40px_rgba(20,11,25,0.12)] backdrop-blur-xl py-2 pl-3 sm:pl-5 pr-2 sm:pr-2.5"
        >
          {/* Brand Logo */}
          {/* En la portada sube arriba; en cualquier otra página lleva a la portada. */}
          <a
            href="/"
            aria-label="VANESEV, ir al inicio"
            onClick={(e) => {
              if (ruta !== '/') return;
              e.preventDefault();
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className="flex items-center gap-2 min-w-0 shrink-0"
          >
            <VanesevLogo tono="claro" tamano={34} />
          </a>

          {/* Menú de escritorio: desplegables de funciones y oficios, y páginas propias */}
          <ul className="hidden lg:flex items-center gap-0.5" onMouseLeave={() => setMenuAbierto(null)}>
            {([['funciones', 'Funciones', MENU_FUNCIONES], ['oficios', 'Oficios', MENU_OFICIOS]] as const).map(([id, texto, items]) => (
              <li key={id} className="relative" onMouseEnter={() => setMenuAbierto(id)}>
                <button
                  type="button"
                  aria-expanded={menuAbierto === id}
                  onClick={() => setMenuAbierto(menuAbierto === id ? null : id)}
                  className="flex items-center gap-1 whitespace-nowrap rounded-full px-3.5 py-2 text-[13px] font-bold text-[#6E6478] hover:text-[#1A1020] hover:bg-[#F4F2F7] transition-colors cursor-pointer"
                >
                  {texto}
                  <ChevronDown className={`w-3.5 h-3.5 transition-transform ${menuAbierto === id ? 'rotate-180' : ''}`} />
                </button>
                <AnimatePresence>
                  {menuAbierto === id && (
                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 8 }}
                      transition={{ duration: 0.2 }}
                      className="absolute left-0 top-full pt-3"
                    >
                      <div className="w-64 rounded-3xl border border-[#1A1020]/8 bg-white p-2 shadow-[0_24px_60px_-20px_rgba(20,11,25,0.35)]">
                        {items.map((it) => (
                          <a key={it.ruta} href={it.ruta} className="flex items-center justify-between rounded-2xl px-4 py-3 text-[14px] font-bold text-[#1A1020] hover:bg-[#F4F0EA]">
                            {it.texto}
                            <ArrowUpRight className="w-4 h-4 text-[#7D6438]" />
                          </a>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </li>
            ))}
            {[
              ['/', 'Inicio'],
              ['/precios', 'Precios'],
              ['/fundadoras', 'Fundadoras'],
              ['/blog', 'Blog'],
            ].filter(([href]) => href !== '/' || ruta !== '/').map(([href, texto]) => (
              <li key={href}>
                <a href={href} className={`whitespace-nowrap rounded-full px-3.5 py-2 text-[13px] font-bold transition-colors hover:bg-[#F4F2F7] ${ruta === href ? 'text-[#1A1020]' : 'text-[#6E6478] hover:text-[#1A1020]'}`}>
                  {texto}
                </a>
              </li>
            ))}
          </ul>

          {/* Right Actions: Commercial CTA + Mobile Menu Button (Zero Login/Admin leaks) */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <Magnetico>
              <button
              type="button"
              onClick={() => openCheckoutWithPlan('Plan Fundadora')}
              className="hidden sm:inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-4 sm:px-5 py-2 text-xs sm:text-sm font-bold text-white shadow-sm transition-transform hover:scale-[1.02] cursor-pointer"
              style={{ background: '#1F1226' }}
            >
              <ArrowRight className="w-3.5 h-3.5" strokeWidth={1.5} />
              <span>Quiero mi plaza</span>
            </button>
              </Magnetico>
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="w-9 h-9 rounded-full flex items-center justify-center text-[#1A1020] bg-[#FBFAFC] border border-[#1A1020]/10 lg:hidden shrink-0 cursor-pointer"
              aria-label="Abrir menú"
            >
              {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </button>
          </div>
        </nav>

        {/* Mobile Drawer — Clean Public Sections Only (Zero Login / Admin Buttons) */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="fixed inset-x-3 top-20 z-50 rounded-3xl bg-white border border-[#1A1020]/10 shadow-2xl p-5 space-y-3 lg:hidden"
            >
              <div className="max-h-[62svh] space-y-4 overflow-y-auto">
                <a href="/" className={`flex items-center justify-between rounded-2xl px-4 py-3 text-[14px] font-bold ${ruta === '/' ? 'bg-[#F4F0EA] text-[#1A1020]' : 'bg-[#1F1226] text-white'}`}>
                  <span className="flex items-center gap-2"><Home className="w-4 h-4" strokeWidth={1.8} /> Inicio</span>
                  <ArrowUpRight className="w-4 h-4 opacity-70" />
                </a>
                {([['Funciones', MENU_FUNCIONES], ['Oficios', MENU_OFICIOS]] as const).map(([titulo, items]) => (
                  <div key={titulo}>
                    <p className="px-1 text-[11px] font-bold uppercase tracking-[0.24em] text-[#7D6438]">{titulo}</p>
                    <div className="mt-2 grid grid-cols-2 gap-2">
                      {items.map((it) => (
                        <a key={it.ruta} href={it.ruta} className="rounded-2xl bg-[#FBFAFC] p-3 text-[13px] font-bold text-[#1A1020] border border-[#1A1020]/5">
                          {it.texto}
                        </a>
                      ))}
                    </div>
                  </div>
                ))}
                <div className="grid grid-cols-3 gap-2">
                  {[
                    ['/precios', 'Precios'],
                    ['/fundadoras', 'Fundadoras'],
                    ['/blog', 'Blog'],
                  ].map(([href, texto]) => (
                    <a key={href} href={href} className="rounded-2xl bg-[#1F1226] p-3 text-center text-[13px] font-bold text-white">
                      {texto}
                    </a>
                  ))}
                </div>
              </div>
              <div className="pt-2 border-t border-[#1A1020]/10 flex flex-col gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    openCheckoutWithPlan('Plan Fundadora');
                  }}
                  className="w-full py-3 rounded-full text-xs font-bold text-white flex items-center justify-center gap-2 shadow-md cursor-pointer"
                  style={{ background: '#1F1226' }}
                >
                  <ArrowRight className="w-4 h-4" strokeWidth={1.5} />
                  <span>Quiero mi plaza de fundadora</span>
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {esActivar && <PaginaActivar />}
      {esPagina && !esActivar && <PaginaWeb ruta={ruta} onPlaza={() => openCheckoutWithPlan('Plan Fundadora')} />}
      {!esBlog && !esPagina && <PortadaCinematica onPlaza={() => openCheckoutWithPlan('Plan Fundadora')} />}

      {esBlog && (
        <section id="blog" className="pt-32 sm:pt-40 pb-20 sm:pb-28 px-4 sm:px-6 bg-[#FBFAFC]">
          <div className="mx-auto max-w-6xl space-y-8">
          {/* Blog Editorial */}
          <div className="space-y-8">
            <Migas actual="Blog" />
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#4A1F5C]">
                El blog de VANESEV
              </p>
              <h2 className="font-lujo mt-2 text-3xl sm:text-4xl font-semibold text-[#1A1020]">
                Ideas para llenar tu agenda sin vivir pegada al móvil.
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {EDITORIAL_ARTICLES.map((art) => (
                <article
                  key={art.id}
                  onClick={() => setActiveArticle(art)}
                  className="group rounded-[28px] bg-white border border-[#1A1020]/10 overflow-hidden shadow-2xs hover:shadow-md transition-all flex flex-col justify-between cursor-pointer"
                >
                  <div>
                    <div className="h-48 overflow-hidden">
                      <img
                        src={art.image}
                        alt={art.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    </div>
                    <div className="p-6">
                      <div className="flex items-center justify-between text-[11px] font-bold text-[#4A1F5C] mb-2">
                        <span>{art.category}</span>
                        <span className="text-[#6E6478]">{art.readTime}</span>
                      </div>
                      <h3 className="font-lujo text-lg font-bold text-[#1A1020] leading-snug group-hover:text-[#4A1F5C] transition-colors">
                        {art.title}
                      </h3>
                      <p className="text-xs text-[#6E6478] mt-2 leading-relaxed line-clamp-3">
                        {art.excerpt}
                      </p>
                    </div>
                  </div>
                  <div className="px-6 pb-5 pt-2 flex items-center gap-1 text-xs font-bold text-[#1A1020]">
                    <span>Leer artículo completo</span>
                    <ArrowRight className="w-3.5 h-3.5 text-[#4A1F5C]" />
                  </div>
                </article>
              ))}
            </div>
          </div>

          </div>
        </section>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════════
          14. COMPLETE 5-COLUMN CORPORATE SAAS FOOTER (ZERO DEBUG/CENTRAL LINKS)
      ═══════════════════════════════════════════════════════════════════════════ */}
      <footer className="bg-[#140B19] text-white border-t border-white/10">
        <div className="mx-auto max-w-6xl px-6 py-16">
          <div className="grid grid-cols-2 gap-10 md:grid-cols-[1.4fr_repeat(4,1fr)]">
            {/* Column 1: Brand & Partner CTA */}
            <div className="col-span-2 md:col-span-1">
              <a href="/" aria-label="VANESEV, ir al inicio" className="inline-block">
                <VanesevLogo tono="oscuro" tamano={38} />
              </a>
              <p className="mt-4 max-w-xs text-xs sm:text-sm leading-relaxed text-white/60">
                Para estudios de belleza de autor: tu carta, tus reservas y tus clientas, con tu marca y sin comisiones.
              </p>
              <button
                type="button"
                onClick={() => openCheckoutWithPlan('Consulta General VANESEV')}
                className="mt-5 inline-flex items-center gap-2 rounded-full border border-white/20 px-4 py-2 text-xs font-bold hover:border-white/50 cursor-pointer"
              >
                <span>Ver mi carta de ejemplo</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {([
              ['Funciones', MENU_FUNCIONES.map((m) => [m.ruta, m.texto])],
              ['Oficios', MENU_OFICIOS.map((m) => [m.ruta, m.texto])],
              ['VANESEV', [['/', 'Inicio'], ['/precios', 'Precios'], ['/fundadoras', 'Fundadoras'], ['/blog', 'Blog'], ['/#faq', 'Preguntas frecuentes']]],
              ['Legal', [['/legal/aviso-legal', 'Aviso legal'], ['/legal/privacidad', 'Privacidad'], ['/legal/cookies', 'Cookies'], ['/legal/condiciones', 'Condiciones del servicio']]],
            ] as [string, string[][]][]).map(([titulo, enlaces]) => (
              <nav key={titulo} aria-label={titulo}>
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-white/40">{titulo}</p>
                <ul className="mt-4 space-y-2.5 text-sm text-white/75">
                  {enlaces.map(([href, texto]) => (
                    <li key={href}>
                      <a href={href} className="hover:text-white">{texto}</a>
                    </li>
                  ))}
                </ul>
              </nav>
            ))}
          </div>

          <div className="mt-12 pt-6 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-white/45">
            <p>© 2026 VANESEV &bull; Hecho con amor, para V. &bull; Todos los derechos reservados.</p>
            <div className="flex items-center gap-4">
              <a
                href="https://wa.me/584223794800"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-white"
              >
                Escríbenos por WhatsApp
              </a>

            </div>
          </div>
        </div>
      </footer>

      <AvisoCookies />

      {/* ─── FLOATING WHATSAPP COMMERCIAL BUTTON (BOTTOM-LEFT) ─── */}
      <a
        href="https://wa.me/584223794800?text=Hola%2C%20quiero%20m%C3%A1s%20informaci%C3%B3n%20sobre%20VANESEV%20para%20mi%20sal%C3%B3n%20de%20belleza."
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Hablar con ventas por WhatsApp"
        className="fixed bottom-4 right-4 sm:bottom-5 sm:right-5 z-40 w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-[#1F1226]/90 backdrop-blur ring-1 ring-[#C9A45C]/60 text-[#EBDDB8] shadow-[0_12px_30px_-10px_rgba(20,11,25,0.7)] flex items-center justify-center hover:scale-110 transition-transform"
      >
        <MessageCircle className="w-5 h-5" strokeWidth={1.6} />
      </a>

      {/* ═══════════════════════════════════════════════════════════════════════════
          MODAL 1: SOLICITUD DE ALTA / CHECKOUT COMERCIAL DE SALÓN
      ═══════════════════════════════════════════════════════════════════════════ */}
      <AnimatePresence>
        {onboardingModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/55 backdrop-blur-xs flex items-center justify-center p-4"
            onClick={() => setOnboardingModalOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.95, y: 12 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 12 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-lg rounded-[32px] bg-white p-6 sm:p-8 shadow-2xl border border-[#1A1020]/10 relative"
            >
              <button
                type="button"
                onClick={() => setOnboardingModalOpen(false)}
                className="absolute top-5 right-5 w-8 h-8 rounded-full bg-[#FBFAFC] flex items-center justify-center text-[#1A1020] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>

              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#4A1F5C] block">
                Plan fundadora &bull; 100 plazas
              </span>
              <h3 className="font-lujo text-2xl sm:text-3xl font-bold text-[#1A1020] mt-1">
                Reserva tu plaza
              </h3>
              <p className="text-xs text-[#6E6478] mt-1">
                <strong className="text-[#4A1F5C]">{selectedPlanName}</strong>. Revisamos tu solicitud y te escribimos en menos de 24 horas con los siguientes pasos.
              </p>

              {leadSubmitted ? (
                <div className="mt-6 rounded-3xl bg-[#1F1226] p-6 text-white">
                  <p className="font-lujo text-2xl">¡Solicitud recibida!</p>
                  <p className="mt-2 text-sm leading-relaxed text-white/75">Te hemos enviado un correo a <b className="text-white">{leadEmail}</b>. Revisamos tu caso y te escribimos con el pago del montaje; en cuanto lo confirmemos, te llega el acceso a tu panel con tu carta ya creada.</p>
                  <a href={`https://wa.me/584223794800?text=${encodeURIComponent(`Hola, acabo de enviar la solicitud de ${leadSalonName}.`)}`} target="_blank" rel="noopener noreferrer" className="mt-5 inline-flex rounded-full border border-white/30 px-5 py-3 text-xs font-bold hover:border-white/70">Escribirnos por WhatsApp</a>
                </div>
              ) : (
              <form onSubmit={handleLeadSubmit} className="space-y-3.5 mt-5">
                <input type="text" tabIndex={-1} autoComplete="off" aria-hidden="true" value={leadTrampa} onChange={(e) => setLeadTrampa(e.target.value)} className="hidden" name="web" />
                <div>
                  <label className="text-xs font-bold text-[#1A1020] block mb-1">
                    Nombre de tu estudio
                  </label>
                  <input
                    type="text"
                    required
                    value={leadSalonName}
                    onChange={(e) => setLeadSalonName(e.target.value)}
                    placeholder="Ej: Estudio Ámbar"
                    className="w-full px-4 py-2.5 rounded-2xl bg-[#FBFAFC] border border-[#1A1020]/12 text-xs font-semibold focus:outline-none focus:border-[#4A1F5C]"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-[#1A1020] block mb-1">
                      Tu nombre
                    </label>
                    <input
                      type="text"
                      required
                      value={leadOwnerName}
                      onChange={(e) => setLeadOwnerName(e.target.value)}
                      placeholder="Ej: Valentina Gómez"
                      className="w-full px-4 py-2.5 rounded-2xl bg-[#FBFAFC] border border-[#1A1020]/12 text-xs font-semibold focus:outline-none focus:border-[#4A1F5C]"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-[#1A1020] block mb-1">
                      Tu WhatsApp
                    </label>
                    <input
                      type="tel"
                      required
                      value={leadWhatsapp}
                      onChange={(e) => setLeadWhatsapp(e.target.value)}
                      placeholder="Ej: +58 424-0000000"
                      className="w-full px-4 py-2.5 rounded-2xl bg-[#FBFAFC] border border-[#1A1020]/12 text-xs font-semibold focus:outline-none focus:border-[#4A1F5C]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-[#1A1020] block mb-1">
                      Tu correo
                    </label>
                    <input
                      type="email"
                      required
                      value={leadEmail}
                      onChange={(e) => setLeadEmail(e.target.value)}
                      placeholder="Aquí te llega tu acceso"
                      className="w-full px-4 py-2.5 rounded-2xl bg-[#FBFAFC] border border-[#1A1020]/12 text-xs font-semibold focus:outline-none focus:border-[#4A1F5C]"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-[#1A1020] block mb-1">
                      Tu ciudad
                    </label>
                    <input
                      type="text"
                      value={leadCiudad}
                      onChange={(e) => setLeadCiudad(e.target.value)}
                      placeholder="Ej: Caracas"
                      className="w-full px-4 py-2.5 rounded-2xl bg-[#FBFAFC] border border-[#1A1020]/12 text-xs font-semibold focus:outline-none focus:border-[#4A1F5C]"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-[#1A1020] block mb-1">
                    Tu oficio
                  </label>
                  <select
                    value={leadSpecialty}
                    onChange={(e) => setLeadSpecialty(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-2xl bg-[#FBFAFC] border border-[#1A1020]/12 text-xs font-semibold focus:outline-none focus:border-[#4A1F5C]"
                  >
                    <option value="unas">Uñas</option>
                    <option value="pestanas_cejas">Pestañas y cejas</option>
                    <option value="peluqueria">Peluquería</option>
                    <option value="estetica">Estética</option>
                    <option value="varios">Varios oficios</option>
                  </select>
                </div>

                {leadError && <p className="text-xs font-bold text-rose-700">{leadError}</p>}

                <button
                  type="submit"
                  disabled={leadEnviando}
                  className="w-full py-3.5 rounded-full text-white text-xs sm:text-sm font-bold shadow-lg flex items-center justify-center gap-2 mt-2 cursor-pointer disabled:opacity-60"
                  style={{ background: '#1F1226' }}
                >
                  <Send className="w-4 h-4" />
                  <span>{leadEnviando ? 'Enviando…' : 'Enviar mi solicitud'}</span>
                </button>
              </form>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══════════════════════════════════════════════════════════════════════════
          MODAL 3: LECTURA COMPLETA DE ARTÍCULO DEL BLOG
      ═══════════════════════════════════════════════════════════════════════════ */}
      <AnimatePresence>
        {activeArticle && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/55 backdrop-blur-xs flex items-center justify-center p-4"
            onClick={() => setActiveArticle(null)}
          >
            <motion.div
              initial={{ scale: 0.95, y: 12 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 12 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-2xl rounded-[32px] bg-white overflow-hidden shadow-2xl border border-[#1A1020]/10 max-h-[88vh] flex flex-col"
            >
              <div className="relative h-56 shrink-0">
                <img
                  src={activeArticle.image}
                  alt={activeArticle.title}
                  className="w-full h-full object-cover"
                />
                <button
                  type="button"
                  onClick={() => setActiveArticle(null)}
                  className="absolute top-4 right-4 w-9 h-9 rounded-full bg-white text-[#1A1020] flex items-center justify-center shadow-md cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="p-6 sm:p-8 overflow-y-auto space-y-4">
                <span className="text-xs font-bold uppercase tracking-wider text-[#4A1F5C]">
                  {activeArticle.category} &bull; {activeArticle.readTime}
                </span>
                <h3 className="font-lujo text-2xl sm:text-3xl font-bold text-[#1A1020]">
                  {activeArticle.title}
                </h3>
                {activeArticle.content.map((p, i) => (
                  <p key={i} className="text-sm text-[#4A4150] leading-relaxed">
                    {p}
                  </p>
                ))}
                <div className="pt-4 border-t border-[#1A1020]/10 flex justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      setActiveArticle(null);
                      openCheckoutWithPlan('Plan Fundadora');
                    }}
                    className="px-6 py-3 rounded-full text-white text-xs font-bold cursor-pointer"
                    style={{ background: '#1F1226' }}
                  >
                    Quiero esto en mi estudio &rarr;
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══════════════════════════════════════════════════════════════════════════
          MODAL 4: TEXTOS LEGALES CORPORATIVOS
      ═══════════════════════════════════════════════════════════════════════════ */}
      <AnimatePresence>
        {legalModalTitle && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/55 backdrop-blur-xs flex items-center justify-center p-4"
            onClick={() => setLegalModalTitle(null)}
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-xl rounded-[28px] bg-white p-6 sm:p-8 shadow-2xl space-y-4"
            >
              <div className="flex items-center justify-between">
                <h3 className="font-lujo text-xl font-bold text-[#1A1020]">{legalModalTitle}</h3>
                <button
                  type="button"
                  onClick={() => setLegalModalTitle(null)}
                  className="w-8 h-8 rounded-full bg-[#FBFAFC] flex items-center justify-center cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <p className="text-xs sm:text-sm text-[#6E6478] leading-relaxed">
                VANESEV Beauty &amp; Wellness Cloud garantiza que cada salón afiliado conserva el 100% de la titularidad sobre su catálogo de servicios, fotografías, tarifas y registros de clientas VIP, operando bajo aislamiento multi-tenant estricto en bases de datos cifradas y sin cobro de comisiones por intermediación.
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
