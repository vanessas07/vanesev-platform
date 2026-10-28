import { VanesevLogo } from './VanesevLogo';
import { revelarSeccion, TituloRevelado, AuroraFondo, useInclinacion3D, UnDiaEnTuSalon, FotoPortada, ReflejoPantalla, Magnetico, TarjetaTilt, PanelDeDuena } from './landing/EfectosPremium';
import React, { useState, useRef } from 'react';
import {

  Calendar,
  QrCode,
  ShieldCheck,
  ArrowRight,
  ArrowUpRight,
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
  const esBlog = typeof window !== 'undefined' && window.location.pathname.toLowerCase().startsWith('/blog');
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
  const [leadSpecialty, setLeadSpecialty] = useState('Cejas, Pestañas & Maquillaje');
  const [leadSubmitted, setLeadSubmitted] = useState(false);

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

  const handleLeadSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLeadSubmitted(true);
    const msg = `Hola equipo VANESEV, quiero activar mi salón en el plan *${selectedPlanName}*.\n\n• Salón: ${leadSalonName || 'Mi Salón'}\n• Responsable: ${leadOwnerName || 'Directora'}\n• Especialidad: ${leadSpecialty}\n• WhatsApp: ${leadWhatsapp}`;
    window.open(`https://wa.me/584223794800?text=${encodeURIComponent(msg)}`, '_blank', 'noopener,noreferrer');
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
          <a
            href="#inicio"
            onClick={(e) => {
              e.preventDefault();
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className="flex items-center gap-2 min-w-0 shrink-0"
          >
            <VanesevLogo tono="claro" tamano={34} />
          </a>

          {/* Center Commercial Funnel Links (Desktop) */}
          <ul className="hidden lg:flex items-center gap-0.5">
            {[
              { id: 'un-dia', label: 'Cómo funciona' },
              { id: 'equipo', label: 'Tu equipo' },
              { id: 'personalizador', label: 'Tu marca' },
              { id: 'sectores', label: 'Especialidades' },
              { id: 'precios', label: 'Precios' },
              { id: 'fundadoras', label: 'Fundadoras' },
            ].map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => scrollToSection(item.id)}
                  className="whitespace-nowrap rounded-full px-3.5 py-2 text-xs font-bold text-[#6E6478] hover:text-[#1A1020] hover:bg-[#F4F2F7] transition-colors cursor-pointer"
                >
                  {item.label}
                </button>
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
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 'un-dia', label: 'Cómo funciona' },
                  { id: 'equipo', label: 'Tu equipo' },
                  { id: 'personalizador', label: 'Tu marca' },
                  { id: 'sectores', label: 'Especialidades' },
                  { id: 'precios', label: 'Precios' },
                  { id: 'fundadoras', label: 'Fundadoras' },
                  { id: 'faq', label: 'Preguntas' },
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setMobileMenuOpen(false);
                      scrollToSection(item.id);
                    }}
                    className="p-3 rounded-2xl bg-[#FBFAFC] text-left text-xs font-bold text-[#1A1020] border border-[#1A1020]/5 cursor-pointer"
                  >
                    {item.label}
                  </button>
                ))}
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

      {!esBlog && (<>
      {/* ═══════════════════════════════════════════════════════════════════════════
          2. HIGH-IMPACT COMMERCIAL SAAS HERO + 3D DEVICE & FLOATING SALON BADGES
      ═══════════════════════════════════════════════════════════════════════════ */}
      <section
        id="inicio"
        className="relative overflow-hidden pt-28 sm:pt-36 pb-20 sm:pb-28 px-4 sm:px-6"
        style={{ background: '#FBFAFC' }}
      >
        <FotoPortada src="/vanesev/hero-atelier.jpg" alt="Atelier de belleza luminoso con recepción y código QR de reservas" />
        <AuroraFondo />
        <div className="relative z-10 mx-auto max-w-6xl grid items-center gap-12 lg:gap-16 lg:grid-cols-[1.15fr_1fr]">
          {/* Left Commercial SaaS Pitch */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <p className="inline-flex items-center gap-2 rounded-full border border-[#4A1F5C]/25 bg-white px-4 py-1.5 text-xs font-bold text-[#4A1F5C] shadow-2xs">
              <span className="h-2 w-2 animate-pulse rounded-full bg-[#B89B6A]" />
              Para estudios de belleza de autor &bull; 0 % comisión
            </p>

            <TituloRevelado
              className="font-lujo mt-6 text-[44px] sm:text-6xl lg:text-[80px] font-semibold leading-[0.96] tracking-[-0.02em] text-[#1A1020]"
              partes={[{ texto: 'Tu talento merece una' }, { texto: 'agenda llena.', acento: true }, { texto: 'Y una marca que no se confunda con nadie.' }]}
            />

            <p className="mt-6 max-w-xl text-base sm:text-lg leading-relaxed text-[#4A4150] font-medium">
              Tus clientas ven tu carta, eligen a su especialista y reservan solas, a cualquier hora. A ti te llega ordenado al WhatsApp y ellas vuelven por su Pasaporte VIP. Sin comisiones y sin compartir escaparate con nadie.
            </p>

            {/* Primary & Secondary Commercial CTAs */}
            <div className="mt-8 flex flex-col sm:flex-row gap-3.5">
              <button
                type="button"
                onClick={() => openCheckoutWithPlan('Plan Fundadora')}
                className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full px-8 py-4 text-sm sm:text-[15px] font-bold text-white shadow-[0_14px_38px_rgba(74,31,92,0.30)] transition-transform hover:scale-[1.02] cursor-pointer"
                style={{ background: '#1F1226' }}
              >
                <span>Quiero mi plaza de fundadora</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={() => scrollToSection('un-dia')}
                className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full border border-[#1A1020]/15 bg-white/90 backdrop-blur hover:bg-[#F4F2F7] px-7 py-4 text-sm sm:text-[15px] font-bold text-[#1A1020] shadow-xs transition-colors cursor-pointer"
              >
                <ArrowUpRight className="w-4 h-4 text-[#4A1F5C]" strokeWidth={1.5} />
                <span>Mira cómo reserva tu clienta</span>
              </button>
            </div>

            <p className="mt-5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#7D6438]">
              <span>Te lo dejamos montado</span><span aria-hidden="true" className="h-1 w-1 rounded-full bg-[#B89B6A]" />
              <span>0 % comisiones</span><span aria-hidden="true" className="h-1 w-1 rounded-full bg-[#B89B6A]" />
              <span>Tus clientas, siempre tuyas</span>
            </p>

            {/* Direct Sub-Links */}
            <p className="mt-6 text-xs sm:text-sm text-[#6E6478]">
              ¿Prefieres hablarlo primero?{" "}
              <a
                href="https://wa.me/584223794800?text=Hola%2C%20quiero%20ver%20una%20demo%20de%20VANESEV%20con%20los%20servicios%20de%20mi%20sal%C3%B3n."
                target="_blank"
                rel="noopener noreferrer"
                className="font-bold text-[#1A1020] underline decoration-[#B89B6A] decoration-2 underline-offset-4"
              >
                Escríbenos por WhatsApp
              </a>
            </p>

            {/* 3 Quick Proof Metrics */}
            <div className="mt-8 pt-6 border-t border-[#1A1020]/10 grid grid-cols-3 gap-4 max-w-lg">
              <div>
                <p className="font-lujo text-2xl sm:text-3xl font-bold text-[#1A1020]">0%</p>
                <p className="text-[11px] font-semibold text-[#6E6478]">Comisión por cita</p>
              </div>
              <div>
                <p className="font-lujo text-2xl sm:text-3xl font-bold text-[#4A1F5C]">15 seg</p>
                <p className="text-[11px] font-semibold text-[#6E6478]">Lo que tarda en reservar</p>
              </div>
              <div>
                <p className="font-lujo text-2xl sm:text-3xl font-bold text-[#1A1020]">100 %</p>
                <p className="text-[11px] font-semibold text-[#6E6478]">Tus clientas, tuyas</p>
              </div>
            </div>
          </motion.div>
          {/* Right: 3D Interactive Phone Showcase + 4 Floating Live Salon Badges */}
          <div
            className="relative mx-auto w-full max-w-[350px]"
            style={{ perspective: '1600px' }}
            onMouseMove={inclinacion.onMouseMove}
            onMouseLeave={inclinacion.onMouseLeave}
          >
            {/* Floating Badge 1 (Top-Left) */}
            <motion.div
              initial={{ opacity: 0, x: shouldReduceMotion ? 0 : -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.25 }}
              className="absolute z-20 -left-12 top-10 hidden sm:flex items-center gap-3 rounded-2xl border border-[#1A1020]/10 bg-white/95 px-3.5 py-2.5 text-[#1A1020] shadow-xl backdrop-blur-md"
              style={{ transform: 'rotate(-3deg)' }}
            >
              <span className="relative flex h-2.5 w-2.5">
                <span className="absolute inset-0 animate-ping rounded-full bg-[#B89B6A] opacity-75" />
                <span className="relative h-2.5 w-2.5 rounded-full bg-[#B89B6A]" />
              </span>
              <div>
                <span className="block whitespace-nowrap text-xs font-bold">Cita 16:30 Confirmada</span>
                <span className="block whitespace-nowrap text-[10px] text-[#6E6478]">Lifting + Keratina &bull; $22 USD</span>
              </div>
            </motion.div>

            {/* Floating Badge 2 (Top-Right) */}
            <motion.div
              initial={{ opacity: 0, x: shouldReduceMotion ? 0 : 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.35 }}
              className="absolute z-20 -right-10 top-28 hidden sm:flex items-center gap-3 rounded-2xl border border-[#1A1020]/10 bg-white/95 px-3.5 py-2.5 text-[#1A1020] shadow-xl backdrop-blur-md"
              style={{ transform: 'rotate(3deg)' }}
            >
              <span className="h-2.5 w-2.5 rounded-full bg-[#1F1226]" />
              <div>
                <span className="block whitespace-nowrap text-xs font-bold">Precio al día</span>
                <span className="block whitespace-nowrap text-[10px] text-[#6E6478]">En dólares y en bolívares</span>
              </div>
            </motion.div>

            {/* Floating Badge 3 (Bottom-Left) */}
            <motion.div
              initial={{ opacity: 0, x: shouldReduceMotion ? 0 : -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.45 }}
              className="absolute z-20 -left-10 bottom-24 hidden sm:flex items-center gap-3 rounded-2xl border border-[#1A1020]/10 bg-white/95 px-3.5 py-2.5 text-[#1A1020] shadow-xl backdrop-blur-md"
              style={{ transform: 'rotate(2deg)' }}
            >
              <span className="h-2.5 w-2.5 rounded-full bg-[#1F1226]" />
              <div>
                <span className="block whitespace-nowrap text-xs font-bold">Pasaporte VIP #001</span>
                <span className="block whitespace-nowrap text-[10px] text-[#6E6478]">Clienta fundadora &bull; 5 de 5 sellos</span>
              </div>
            </motion.div>

            {/* Palette Switcher Pill Above Phone */}
            <div className="mb-3 mx-auto w-fit px-3.5 py-1.5 rounded-full bg-white border border-[#1A1020]/10 shadow-xs flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#6E6478]">
                Prueba colores:
              </span>
              <div className="flex items-center gap-1.5">
                {SALON_PALETTES.slice(0, 5).map((pal) => (
                  <button
                    key={pal.id}
                    type="button"
                    onClick={() => setPhonePaletteId(pal.id)}
                    className={`w-4 h-4 rounded-full transition-transform cursor-pointer ${
                      phonePaletteId === pal.id ? 'scale-125 ring-2 ring-[#1A1020] ring-offset-1' : 'opacity-75 hover:opacity-100'
                    }`}
                    style={{ backgroundColor: pal.primary }}
                    title={pal.name}
                  />
                ))}
              </div>
            </div>

            {/* Phone Bezel */}
            <div aria-hidden="true" className="pointer-events-none absolute inset-[-14%] rounded-full blur-3xl" style={{ background: 'radial-gradient(closest-side, rgba(217,196,155,0.55), rgba(74,31,92,0.18) 60%, transparent)' }} />
            <motion.div style={inclinacion.estilo} className="relative rounded-[46px] p-[3px] shadow-[0_60px_120px_-30px_rgba(20,11,25,0.55)] [background:linear-gradient(145deg,#E9DFCF,#8C7A5E_30%,#2A1A30_62%,#140B19)]">
              <div
                className="relative rounded-[43px] overflow-hidden flex flex-col min-h-[560px] transition-colors duration-500 ring-[6px] ring-[#140B19]"
                style={{ backgroundColor: phonePalette.bgPrimary, color: phonePalette.textPrimary }}
              >
                <ReflejoPantalla />
                {/* Phone Top Bar */}
                <div className="px-4 pt-4 pb-3 bg-white/90 backdrop-blur-md border-b border-black/5 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-7 h-7 rounded-full flex items-center justify-center text-white font-lujo font-bold text-xs"
                      style={{ background: phonePalette.heroGradient }}
                    >
                      EÁ
                    </div>
                    <div>
                      <p className="font-lujo font-bold text-xs leading-none">{MARCA_DEMO}</p>
                      <p className="text-[9px] text-[#6E6478] mt-0.5">Carta · Reservas · VIP</p>
                    </div>
                  </div>
                  <span
                    className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider"
                    style={{ backgroundColor: phonePalette.badgeBg, color: phonePalette.badgeText }}
                  >
                    En Vivo
                  </span>
                </div>

                {/* 3 Interactive Tabs Inside Phone */}
                <div className="p-2 bg-white/70 border-b border-black/5 grid grid-cols-3 gap-1">
                  {[
                    { id: 'catalog', label: '01. Carta QR' },
                    { id: 'passport', label: '02. Sellos VIP' },
                    { id: 'whatsapp', label: '03. Agenda' },
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setPhoneStep(tab.id as any)}
                      className={`py-1.5 px-2 rounded-full text-[10px] font-bold transition-all cursor-pointer ${
                        phoneStep === tab.id ? 'text-white shadow-2xs' : 'bg-white text-[#6E6478]'
                      }`}
                      style={phoneStep === tab.id ? { backgroundColor: phonePalette.primary } : undefined}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                {/* Dynamic Screen Inside Phone */}
                <div className="p-3.5 flex-1 flex flex-col justify-between">
                  <AnimatePresence mode="wait">
                    {phoneStep === 'catalog' && (
                      <motion.div
                        key="catalog"
                        initial={{ opacity: 0, x: 8 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -8 }}
                        className="space-y-3"
                      >
                        <div className="relative h-32 rounded-2xl overflow-hidden shadow-xs" style={{ background: phonePalette.heroGradient }}>
                          <div aria-hidden="true" className="absolute -right-6 -top-8 h-28 w-28 rounded-full bg-white/15 blur-xl" />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-black/5 to-transparent flex flex-col justify-end p-3 text-white">
                            <span className="text-[9px] uppercase tracking-widest font-bold opacity-90">
                              Mirada de Autor &bull; 60 Min
                            </span>
                            <p className="font-lujo text-sm font-semibold leading-tight">
                              Lifting de Pestañas + Keratina
                            </p>
                          </div>
                        </div>

                        <div className="space-y-1.5">
                          {[
                            { name: 'Laminado de cejas', price: '$20', time: '50 min', ini: 'C' },
                            { name: 'Lifting de pestañas + tinte', price: '$22', time: '60 min', ini: 'P' },
                            { name: 'Alisado brillo espejo', price: '$45', time: '120 min', ini: 'A' },
                          ].map((srv, idx) => (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => setSelectedDemoService(idx)}
                              className={`w-full p-2 rounded-2xl border text-left flex items-center gap-2.5 transition-all cursor-pointer bg-white ${
                                selectedDemoService === idx ? 'ring-2 shadow-xs' : 'border-black/8 opacity-85'
                              }`}
                              style={selectedDemoService === idx ? { borderColor: phonePalette.primary } : undefined}
                            >
                              <span className="w-10 h-10 rounded-xl shrink-0 flex items-center justify-center font-lujo text-base text-white" style={{ background: phonePalette.heroGradient }}>{srv.ini}</span>
                              <div className="flex-1 min-w-0">
                                <p className="text-[11px] font-bold truncate">{srv.name}</p>
                                <p className="text-[9px] text-[#6E6478]">{srv.time} &bull; Especialista</p>
                              </div>
                              <span className="font-lujo font-bold text-xs shrink-0" style={{ color: phonePalette.primary }}>
                                {srv.price}
                              </span>
                            </button>
                          ))}
                        </div>

                        <div className="grid grid-cols-3 gap-1.5">
                          {['10:30 AM', '02:00 PM', '04:30 PM'].map((hr) => (
                            <button
                              key={hr}
                              type="button"
                              onClick={() => setSelectedDemoTime(hr)}
                              className={`py-1.5 rounded-xl text-[10px] font-bold border transition-all cursor-pointer ${
                                selectedDemoTime === hr ? 'text-white' : 'bg-white text-[#1A1020] border-black/10'
                              }`}
                              style={selectedDemoTime === hr ? { backgroundColor: phonePalette.primary, borderColor: phonePalette.primary } : undefined}
                            >
                              {hr}
                            </button>
                          ))}
                        </div>
                      </motion.div>
                    )}

                    {phoneStep === 'passport' && (
                      <motion.div
                        key="passport"
                        initial={{ opacity: 0, x: 8 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -8 }}
                        className="space-y-3"
                      >
                        <div
                          className="p-4 rounded-2xl text-white shadow-md space-y-2.5"
                          style={{ background: phonePalette.heroGradient }}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-[9px] uppercase tracking-widest font-bold opacity-90">
                              Pasaporte VIP
                            </span>
                            <Crown className="w-4 h-4" />
                          </div>
                          <p className="font-lujo text-lg font-semibold leading-tight">
                            {simulatedStamps} de 5 Visitas Selladas
                          </p>
                          <div className="grid grid-cols-5 gap-1.5 pt-1">
                            {[1, 2, 3, 4, 5].map((num) => (
                              <button
                                key={num}
                                type="button"
                                onClick={() => setSimulatedStamps(num)}
                                className={`h-9 rounded-xl flex items-center justify-center font-bold text-xs transition-all cursor-pointer ${
                                  num <= simulatedStamps
                                    ? 'bg-white text-[#1A1020] shadow-xs scale-105'
                                    : 'bg-white/20 text-white/80'
                                }`}
                              >
                                {num <= simulatedStamps ? <Check className="w-3.5 h-3.5" /> : num}
                              </button>
                            ))}
                          </div>
                        </div>
                        <p className="text-[11px] text-[#6E6478] text-center">
                          Toca cualquier casilla del 1 al 5 para simular el sellado digital de una clienta.
                        </p>
                      </motion.div>
                    )}

                    {phoneStep === 'whatsapp' && (
                      <motion.div
                        key="whatsapp"
                        initial={{ opacity: 0, x: 8 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -8 }}
                        className="space-y-3"
                      >
                        <div className="p-3.5 rounded-2xl bg-white border border-black/10 space-y-2">
                          <div className="flex items-center gap-2 text-[#7D6438] font-bold text-xs">
                            <CheckCircle2 className="w-4 h-4" />
                            <span>Turno Registrado en Agenda</span>
                          </div>
                          <p className="text-[11px] text-[#6E6478] leading-relaxed">
                            La reserva te llega ordenada al WhatsApp y el hueco se bloquea en tu agenda. Nadie más puede cogerlo.
                          </p>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <button
                    type="button"
                    onClick={() => scrollToSection('un-dia')}
                    className="w-full py-3 rounded-full text-white text-xs font-bold shadow-md flex items-center justify-center gap-1.5 mt-3 cursor-pointer"
                    style={{ background: phonePalette.heroGradient }}
                  >
                    <span>Ver cómo reserva, paso a paso</span>
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Un día en tu salón: scroll 3D (G-036) */}
      <UnDiaEnTuSalon />

      {/* Tu panel de dueña (G-036) */}
      <PanelDeDuena />

      {/* Tu equipo (G-044) */}
      <motion.section {...revelarSeccion} id="equipo" className="scroll-mt-24 relative overflow-hidden py-20 sm:py-28 px-4 sm:px-6 text-white" style={{ background: 'radial-gradient(90% 80% at 90% 0%, rgba(201,164,92,0.20) 0%, transparent 55%), radial-gradient(70% 70% at 0% 100%, rgba(122,62,140,0.35) 0%, transparent 60%), #140B19' }}>
        <div className="mx-auto max-w-6xl">
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#D9C49B]">Tu equipo</p>
          <h2 className="font-lujo mt-4 max-w-3xl text-[34px] sm:text-5xl font-semibold leading-[1.04]">
            Un estudio no es una sola persona.{' '}
            <span className="italic font-normal text-[#D9C49B]">Tu sistema tampoco.</span>
          </h2>
          <p className="mt-5 max-w-2xl text-sm sm:text-base leading-relaxed text-white/75">
            Cada especialista con su agenda, su acceso y sus servicios. Tú lo ves todo; ellas, solo lo suyo.
          </p>
          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { icono: Calendar, t: 'Agenda por especialista', d: 'Cada una con sus horarios y sus huecos reales. La clienta elige con quién y nunca se pisan dos citas.' },
              { icono: Users, t: 'Un acceso para cada una', d: 'Tu equipo entra con su propia clave, ve su día y sella el Pasaporte VIP. Tu caja y tus números son solo tuyos.' },
              { icono: Layers, t: 'Cabinas y zonas', d: 'Sillones, camillas y aparatos se reservan por separado: un tratamiento largo no te bloquea el resto del estudio.' },
              { icono: TrendingUp, t: 'Comisiones claras', d: 'Ves lo que factura cada profesional y su comisión pactada. Pagar a fin de mes deja de ser una discusión.' },
            ].map((c) => (
              <TarjetaTilt key={c.t} className="rounded-[24px]">
                <div className="h-full rounded-[24px] border border-[#C9A45C]/25 bg-white/[0.04] p-6 backdrop-blur-sm">
                  <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[#C9A45C]/15 text-[#EBDDB8] ring-1 ring-[#C9A45C]/50">
                    <c.icono className="h-5 w-5" strokeWidth={1.5} />
                  </span>
                  <h3 className="font-lujo mt-5 text-xl">{c.t}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-white/70">{c.d}</p>
                </div>
              </TarjetaTilt>
            ))}
          </div>
          <p className="mt-8 text-xs sm:text-sm text-white/60">
            Incluye 3 personas y 3 cabinas o zonas. Cada profesional más, 3 $ al mes. ¿Tienes más de un local?{' '}
            <a href="https://wa.me/584223794800?text=Hola%2C%20tengo%20m%C3%A1s%20de%20un%20local%20y%20quiero%20ver%20VANESEV." target="_blank" rel="noopener noreferrer" className="font-semibold text-[#EBDDB8] underline decoration-[#C9A45C] underline-offset-4">Lo vemos contigo</a>.
          </p>
        </div>
      </motion.section>

      {/* ═══════════════════════════════════════════════════════════════════════════
          3. INFINITE EDITORIAL MARQUEE STRIP (MARQUESINA COMERCIAL)
      ═══════════════════════════════════════════════════════════════════════════ */}
      <div className="relative overflow-hidden border-y border-[#C9A45C]/30 bg-[#F7F1E6] py-4 text-[#1A1020]">
        <div className="flex w-max animate-[marquee_34s_linear_infinite] gap-10 whitespace-nowrap text-lg sm:text-2xl font-lujo font-semibold">
          {[
            'Tu marca, tus clientas',
            'Sin comisiones por cita',
            'Pasaporte VIP de 5 sellos',
            'Agenda por especialista y cabina',
            'Un QR para siempre en recepción',
            'Diseño 100% de autor',
            'Precios en $ y Bs, siempre al día',
            'Tu marca, tus clientas',
            'Sin comisiones por cita',
            'Pasaporte VIP de 5 sellos',
            'Agenda por especialista y cabina',
            'Un QR para siempre en recepción',
          ].map((item, idx) => (
            <span key={idx} className="flex items-center gap-10">
              <span>{item}</span>
              <span className="h-1.5 w-1.5 rotate-45 bg-[#C9A45C]" />
            </span>
          ))}
        </div>
        <style>{`@keyframes marquee { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }`}</style>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════════
          4. FULL-BLEED ARCHITECTURAL MANIFESTO BANNER (70SVH)
      ═══════════════════════════════════════════════════════════════════════════ */}
      <motion.section {...revelarSeccion} className="relative h-[64svh] min-h-[400px] overflow-hidden">
        <img
          src="/vanesev/sector-medspa.jpg"
          alt="Cabina de estética luminosa preparada para un tratamiento"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#140B19]/90 via-[#140B19]/35 to-transparent" />
        <div className="relative mx-auto flex h-full max-w-6xl flex-col justify-end px-6 pb-12 sm:pb-16 text-white">
          <h2 className="font-lujo max-w-4xl text-3xl sm:text-5xl lg:text-6xl font-semibold leading-[1.04]">
            El talento y las manos ya son tuyos.{' '}
            <span className="italic font-normal text-[#D9C49B]">
              Tus clientas y tu agenda también deberían serlo.
            </span>
          </h2>
          <p className="mt-4 text-xs sm:text-sm font-bold uppercase tracking-[0.22em] text-[#D9C49B]">
            Sin directorios intermediarios entre tu sillón y tu clienta
          </p>
        </div>
      </motion.section>

      {/* ═══════════════════════════════════════════════════════════════════════════
          5. «¿TE SUENA?»: LO QUE HOY LE CUESTA CLIENTAS A LA DUEÑA
      ═══════════════════════════════════════════════════════════════════════════ */}
      <motion.section {...revelarSeccion} className="bg-[#F4F2F7] py-20 sm:py-28 px-4 sm:px-6">
        <div className="mx-auto max-w-6xl">
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#4A1F5C]">¿Te suena?</p>
          <h2 className="font-lujo mt-3 max-w-3xl text-3xl sm:text-5xl font-semibold leading-[1.04] text-[#1A1020]">
            Lo que hoy te cuesta clientas,{' '}
            <span className="italic font-normal text-[#4A1F5C]">sin que lo veas.</span>
          </h2>

          <div className="mt-12 grid md:grid-cols-2 md:gap-x-14">
            {[
              {
                num: '01',
                title: 'Contestas «¿precio?» y «¿tienes hueco?» con las manos ocupadas.',
                desc: 'Cuando por fin te quitas los guantes y miras el móvil, ella ya reservó en otro sitio.',
              },
              {
                num: '02',
                title: 'Las apps de reservas cobran por tus clientas y te ponen a tu competencia al lado.',
                desc: 'Tu trabajo, tu reputación y tus clientas acaban en el escaparate de otros, con una plantilla igual a la de todos.',
              },
              {
                num: '03',
                title: 'Cada cambio de precio es rehacer la historia destacada o el PDF.',
                desc: 'Y mientras tanto, tus clientas ven precios viejos o una lista que no se lee en el móvil.',
              },
              {
                num: '04',
                title: 'La tarjeta de sellos de cartulina se pierde en el bolso.',
                desc: 'Y con ella, el motivo para volver contigo y no probar en el estudio de enfrente.',
              },
            ].map((item) => (
              <div
                key={item.num}
                className="grid grid-cols-[52px_1fr] gap-4 border-t border-[#1A1020]/15 py-7"
              >
                <span className="v-cifra font-lujo v-cifra-clara text-[34px] leading-none">
                  {item.num}
                </span>
                <div>
                  <p className="text-lg sm:text-xl font-semibold text-[#1A1020] leading-snug">
                    {item.title}
                  </p>
                  <p className="mt-2 text-sm text-[#6E6478] leading-relaxed">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-8 flex flex-col sm:flex-row gap-3.5">
            <button
              type="button"
              onClick={() => openCheckoutWithPlan('Plan Fundadora')}
              className="inline-flex justify-center rounded-full bg-[#1F1226] hover:bg-[#2E1A38] px-7 py-4 text-sm font-bold text-white transition-colors cursor-pointer"
            >
              Quiero que esto se acabe &rarr;
            </button>
            <a
              href="https://wa.me/584223794800?text=Hola%2C%20quiero%20que%20mis%20clientas%20reserven%20solas%20en%20mi%20estudio."
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex justify-center rounded-full border border-[#1A1020] px-7 py-4 text-sm font-bold text-[#1A1020] hover:bg-white transition-colors"
            >
              Contártelo por WhatsApp
            </a>
          </div>
        </div>
      </motion.section>

      {/* ═══════════════════════════════════════════════════════════════════════════
          6. «QUÉ HACEMOS»: TRES PILARES (01, 02, 03)
      ═══════════════════════════════════════════════════════════════════════════ */}
      <motion.section {...revelarSeccion} id="signature" className="scroll-mt-24 py-20 sm:py-28 px-4 sm:px-6 bg-[#FBFAFC]">
        <div className="mx-auto max-w-6xl">
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#4A1F5C]">Qué hacemos por ti</p>
          <h2 className="font-lujo mt-3 max-w-3xl text-3xl sm:text-5xl font-semibold leading-[1.04] text-[#1A1020]">
            Tú creas.{' '}
            <span className="italic font-normal text-[#4A1F5C]">Del resto nos ocupamos nosotras.</span>
          </h2>

          <div className="mt-12 space-y-4">
            <div
              onClick={() => scrollToSection('un-dia')}
              className="v-tarjeta-lujo text-white group relative grid items-center gap-6 overflow-hidden rounded-[28px] p-7 sm:p-9 transition duration-300 hover:-translate-y-0.5 md:grid-cols-[84px_1fr_auto] cursor-pointer"
            >
              <span className="v-cifra font-lujo v-cifra-oscura text-5xl leading-none">01</span>
              <div>
                <h3 className="font-lujo text-2xl sm:text-3xl font-semibold">Tu carta, y tus clientas reservan solas</h3>
                <p className="mt-2 max-w-2xl text-sm sm:text-base leading-relaxed text-white/85">Tus servicios con tu marca y tus precios en dólares y bolívares. Eligen especialista y hora a cualquier hora del día, y te llega ordenado al WhatsApp.</p>
              </div>
              <p className="font-semibold flex md:justify-end items-center gap-1 text-[#EBDDB8]">
                <span>Ver cómo funciona</span>
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
              </p>
            </div>
            <div
              onClick={() => scrollToSection('un-dia')}
              className="v-tarjeta-clara bg-white text-[#1A1020] group relative grid items-center gap-6 overflow-hidden rounded-[28px] p-7 sm:p-9 transition duration-300 hover:-translate-y-0.5 md:grid-cols-[84px_1fr_auto] cursor-pointer"
            >
              <span className="v-cifra font-lujo v-cifra-clara text-5xl leading-none">02</span>
              <div>
                <h3 className="font-lujo text-2xl sm:text-3xl font-semibold">Pasaporte VIP: el motivo para volver</h3>
                <p className="mt-2 max-w-2xl text-sm sm:text-base leading-relaxed text-[#6E6478]">Cada visita suma un sello en su móvil. A la quinta, su premio. Nada que se pierda en el bolso y nada que imprimir.</p>
              </div>
              <p className="font-semibold flex md:justify-end items-center gap-1 text-[#4A1F5C]">
                <span>Ver el Pasaporte</span>
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
              </p>
            </div>
            <div
              onClick={() => scrollToSection('panel-duena')}
              className="v-tarjeta-clara bg-white text-[#1A1020] group relative grid items-center gap-6 overflow-hidden rounded-[28px] p-7 sm:p-9 transition duration-300 hover:-translate-y-0.5 md:grid-cols-[84px_1fr_auto] cursor-pointer"
            >
              <span className="v-cifra font-lujo v-cifra-clara text-5xl leading-none">03</span>
              <div>
                <h3 className="font-lujo text-2xl sm:text-3xl font-semibold">Tu panel de dueña</h3>
                <p className="mt-2 max-w-2xl text-sm sm:text-base leading-relaxed text-[#6E6478]">Agenda de todo el equipo, caja, ofertas, cupones y tarjetas regalo con el precio calculado sin errores, y tu kit con QR listo para imprimir.</p>
              </div>
              <p className="font-semibold flex md:justify-end items-center gap-1 text-[#4A1F5C]">
                <span>Ver el panel</span>
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
              </p>
            </div>
          </div>
        </div>
      </motion.section>

      {/* ═══════════════════════════════════════════════════════════════════════════
          7. "LA PUERTA DE ENTRADA · CARTA QR" + 6 SUPERPOWERS
      ═══════════════════════════════════════════════════════════════════════════ */}
      <motion.section {...revelarSeccion} id="carta-qr" className="scroll-mt-20 bg-[#F4F2F7] py-20 sm:py-28 px-4 sm:px-6">
        <div className="mx-auto max-w-6xl">
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#4A1F5C]">
            Tu carta &bull; Lista sin teclear nada
          </p>
          <h2 className="font-lujo mt-3 max-w-4xl text-3xl sm:text-5xl font-semibold leading-[1.04] text-[#1A1020]">
            Nos mandas tu lista como la tengas.{' '}
            <span className="italic font-normal text-[#4A1F5C]">Te la devolvemos convertida en tu carta.</span>
          </h2>
          <p className="mt-4 max-w-2xl text-base sm:text-lg text-[#6E6478] leading-relaxed">
            Una foto, un PDF o un mensaje de WhatsApp: con eso basta. Te entregamos tu carta con tus colores, tus fotos y tu QR para la recepción y para Instagram.
          </p>

          {/* 6 Superpowers Grid */}
          <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-5">
            {[
              {
                num: '01',
                title: 'Te la montamos desde tu lista actual',
                desc: 'Nos mandas una foto o mensaje con tus servicios y precios y nuestro equipo la deja configurada sin que tengas que teclear nada.',
              },
              {
                num: '02',
                title: 'Precios en dólares y en bolívares',
                desc: 'Cambias un precio desde el móvil en segundos y tus clientas lo ven al instante. Se acabó rehacer historias y PDF.',
              },
              {
                num: '03',
                title: 'Un código QR para siempre',
                desc: 'Lo imprimes una sola vez en acrílico para tu recepción o espejos. Tus servicios y promociones cambian, el QR nunca caduca.',
              },
              {
                num: '04',
                title: 'Cada tratamiento, bien explicado',
                desc: 'Foto, duración, qué incluye y tu recomendación. Llegan sabiendo lo que quieren y con menos preguntas.',
              },
              {
                num: '05',
                title: 'Reserva en 15 segundos sin cruces',
                desc: 'Solo ve los huecos libres de verdad. Elige y te llega la reserva al WhatsApp, sin cruces con otra cita.',
              },
              {
                num: '06',
                title: 'Puente directo a tu Pasaporte VIP',
                desc: 'Desde la misma carta QR, tus clientas consultan sus sellos acumulados entrando con su correo, sin instalar nada.',
              },
            ].map((sp) => (
              <TarjetaTilt key={sp.num} className="rounded-[24px]">
              <div
                className="h-full rounded-[24px] bg-white border border-[#1A1020]/8 p-6 shadow-2xs flex flex-col justify-between transition-shadow duration-300 hover:shadow-[0_24px_50px_-28px_rgba(20,11,25,0.45)]"
              >
                <div>
                  <span className="v-cifra font-lujo v-cifra-clara text-[34px] leading-none">
                    {sp.num}
                  </span>
                  <h3 className="font-lujo text-xl font-bold text-[#1A1020] mt-2">
                    {sp.title}
                  </h3>
                  <p className="text-xs sm:text-sm text-[#6E6478] mt-2 leading-relaxed">
                    {sp.desc}
                  </p>
                </div>
              </div>
              </TarjetaTilt>
            ))}
          </div>
        </div>
      </motion.section>

      {/* ═══════════════════════════════════════════════════════════════════════════
          8. INTERACTIVE AUTHOR DESIGN STUDIO ("NINGÚN SALÓN SE PARECE A OTRO")
      ═══════════════════════════════════════════════════════════════════════════ */}
      <motion.section {...revelarSeccion} ref={showcaseRef} id="personalizador" className="scroll-mt-20 py-20 sm:py-28 px-4 sm:px-6 bg-[#FBFAFC]">
        <div className="mx-auto max-w-6xl space-y-10">
          <div className="max-w-3xl">
            <span className="text-xs font-bold uppercase tracking-[0.22em] text-[#4A1F5C]">
              Tu marca &bull; Ningún estudio igual a otro
            </span>
            <h2 className="font-lujo mt-3 text-3xl sm:text-5xl font-semibold text-[#1A1020] leading-[1.04]">
              Ningún salón se parece a otro.{' '}
              <span className="italic font-normal text-[#4A1F5C]">Pruébalo aquí en vivo.</span>
            </h2>
            <p className="mt-4 text-base text-[#6E6478] leading-relaxed">
              Tu estudio tiene un estilo que tus clientas reconocen. Tu carta también debería tenerlo. Prueba colores, letras y estilos ahora mismo:
            </p>
          </div>

          <motion.div
            style={{ rotateX, scale: scale3d, transformPerspective: 1200 }}
            className="grid grid-cols-1 lg:grid-cols-12 gap-6 bg-white rounded-[32px] p-5 sm:p-8 border border-[#1A1020]/10 shadow-xl"
          >
            {/* Left Controls (5 cols) */}
            <div className="lg:col-span-5 space-y-5">
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-[#1A1020] flex items-center gap-2 mb-2.5">
                  <Palette className="w-4 h-4 text-[#4A1F5C]" />
                  <span>1. Tus colores</span>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {SALON_PALETTES.map((pal) => (
                    <button
                      key={pal.id}
                      type="button"
                      onClick={() => setStudioPaletteId(pal.id)}
                      className={`p-2.5 rounded-2xl border text-left transition-all cursor-pointer flex items-center gap-2.5 ${
                        studioPaletteId === pal.id
                          ? 'border-[#1A1020] bg-[#FBFAFC] shadow-2xs ring-1 ring-[#1A1020]'
                          : 'border-black/10 hover:bg-[#FBFAFC]/60'
                      }`}
                    >
                      <span
                        className="w-6 h-6 rounded-full shrink-0 border border-black/10"
                        style={{ background: pal.heroGradient }}
                      />
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-[#1A1020] truncate">{pal.name}</p>
                        <p className="text-[10px] text-[#6E6478] truncate">{pal.subtitle}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-[#1A1020] flex items-center gap-2 mb-2">
                  <Sliders className="w-4 h-4 text-[#4A1F5C]" />
                  <span>2. Tus letras</span>
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {SALON_TYPOGRAPHIES.map((typo) => (
                    <button
                      key={typo.id}
                      type="button"
                      onClick={() => setStudioTypographyId(typo.id)}
                      className={`p-2.5 rounded-2xl border text-left transition-all cursor-pointer ${
                        studioTypographyId === typo.id
                          ? 'bg-[#140B19] text-white border-[#1A1020]'
                          : 'bg-[#FBFAFC] text-[#1A1020] border-black/10'
                      }`}
                    >
                      <p className="text-xs font-bold truncate">{typo.name}</p>
                      <p className="text-[9px] opacity-75 truncate">{typo.subtitle}</p>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-[#1A1020] flex items-center gap-2 mb-2">
                  <Layers className="w-4 h-4 text-[#4A1F5C]" />
                  <span>3. Estilo de tu carta</span>
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {SALON_LAYOUTS.map((lay) => (
                    <button
                      key={lay.id}
                      type="button"
                      onClick={() => setStudioLayoutId(lay.id)}
                      className={`p-2.5 rounded-2xl border text-left transition-all cursor-pointer ${
                        studioLayoutId === lay.id
                          ? 'bg-[#1F1226] text-white border-[#4A1F5C]'
                          : 'bg-[#FBFAFC] text-[#1A1020] border-black/10'
                      }`}
                    >
                      <p className="text-xs font-bold truncate">{lay.name}</p>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Right Live Preview Canvas (7 cols) */}
            <div
              className="lg:col-span-7 rounded-[24px] p-5 sm:p-7 border transition-colors duration-500 flex flex-col justify-between"
              style={{
                backgroundColor: studioPalette.bgPrimary,
                color: studioPalette.textPrimary,
                borderColor: 'rgba(0,0,0,0.08)',
              }}
            >
              <div>
                <div
                  className="rounded-2xl p-5 text-white shadow-md mb-5"
                  style={{ background: studioPalette.heroGradient }}
                >
                  <span className="text-[10px] font-bold uppercase tracking-widest opacity-90">
                    Así se vería tu carta &bull; {studioPalette.name}
                  </span>
                  <h3
                    className="text-2xl sm:text-3xl font-bold mt-1"
                    style={{ fontFamily: studioTypography.headingFont }}
                  >
                    {MARCA_DEMO}
                  </h3>
                  <p className="text-xs opacity-90 mt-1">
                    Carta, reservas y Pasaporte VIP con tu firma.
                  </p>
                </div>

                <div
                  className={
                    studioLayoutId === 'minimal-menu'
                      ? 'space-y-2.5'
                      : 'grid grid-cols-1 sm:grid-cols-2 gap-3.5'
                  }
                >
                  {[
                    {
                      name: 'Laminado de cejas nutritivo',
                      price: '$20',
                      time: '50 min',
                      ini: 'C',
                    },
                    {
                      name: 'Maquillaje social de larga duración',
                      price: '$35',
                      time: '75 min',
                      ini: 'M',
                    },
                  ].map((item, idx) => (
                    <div
                      key={idx}
                      className="rounded-2xl bg-white p-3.5 border border-black/5 shadow-xs flex items-center gap-3.5"
                    >
                      <span
                        className="w-16 h-16 rounded-xl shrink-0 flex items-center justify-center text-2xl text-white"
                        style={{ background: studioPalette.heroGradient, fontFamily: studioTypography.headingFont }}
                      >
                        {item.ini}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p
                          className="text-sm font-bold leading-snug"
                          style={{ fontFamily: studioTypography.headingFont, color: studioPalette.textPrimary }}
                        >
                          {item.name}
                        </p>
                        <p className="text-[11px] opacity-75 mt-0.5">{item.time} &bull; Especialista</p>
                        <div className="flex items-center justify-between mt-2">
                          <span className="font-bold text-xs" style={{ color: studioPalette.primary }}>
                            {item.price}
                          </span>
                          <span
                            className="px-2.5 py-1 rounded-full text-[10px] font-bold text-white"
                            style={{ backgroundColor: studioPalette.primary }}
                          >
                            Reservar
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-5 pt-4 border-t border-black/10 flex flex-wrap items-center justify-between gap-3 text-xs">
                <span className="font-semibold opacity-80">
                  Letras: <strong>{studioTypography.name}</strong>
                </span>
                <button
                  type="button"
                  onClick={() => openCheckoutWithPlan(`Configuración con paleta ${studioPalette.name}`)}
                  className="font-bold underline cursor-pointer"
                  style={{ color: studioPalette.primary }}
                >
                  Quiero mi carta con este estilo &rarr;
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      </motion.section>

      {/* ═══════════════════════════════════════════════════════════════════════════
          9. COMPARATIVA «DEJA DE REGALAR TUS CLIENTAS» + ESPECIALIDADES
      ═══════════════════════════════════════════════════════════════════════════ */}
      <motion.section {...revelarSeccion} id="sectores" className="scroll-mt-24 bg-[#F4F2F7] py-20 sm:py-28 px-4 sm:px-6">
        <div className="mx-auto max-w-6xl space-y-20">
          <div className="max-w-4xl mx-auto">
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#4A1F5C]">La diferencia</p>
            <h2 className="font-lujo mt-3 text-3xl sm:text-5xl font-semibold leading-[1.04] text-[#1A1020]">
              Deja de regalar tus clientas{' '}
              <span className="italic font-normal text-[#4A1F5C]">a las apps.</span>
            </h2>
            <p className="mt-3 text-base text-[#6E6478]">
              Lo mismo que ya haces, comparado sin rodeos.
            </p>

            <div className="mt-8 overflow-hidden rounded-[28px] border border-[#1A1020]/10 bg-white shadow-sm">
              <div className="grid grid-cols-3 sm:grid-cols-[1.3fr_1fr_1fr_1fr] border-b border-[#1A1020]/10 text-[11px] sm:text-sm font-bold">
                <p className="hidden sm:block p-5 text-[#6E6478]"></p>
                <p className="p-3 sm:p-5 text-center text-[#6E6478]">Apps de reservas</p>
                <p className="p-3 sm:p-5 text-center text-[#6E6478]">Solo Instagram y WhatsApp</p>
                <p className="p-3 sm:p-5 text-center text-white" style={{ background: '#1F1226' }}>VANESEV</p>
              </div>
              {[
                { l: 'Comisión por tus clientas', a: 'Sí, por cada clienta nueva', b: 'No', c: 'Nunca' },
                { l: 'Tus clientas, solo tuyas', a: 'Junto a tu competencia', b: 'Sí, pero dispersas', c: 'Sí, con su historial' },
                { l: 'Tu marca', a: 'Plantilla igual para todos', b: 'Tu perfil, sin carta', c: 'Carta con tu firma' },
                { l: 'Reservas a cualquier hora', a: 'Sí', b: 'Solo cuando contestas', c: 'Sí, sin cruces' },
                { l: 'Motivo para volver', a: 'No', b: 'Tarjeta de cartulina', c: 'Pasaporte VIP en su móvil' },
                { l: 'Precios en $ y Bs al día', a: 'No', b: 'Rehaces el PDF', c: 'Al instante' },
              ].map((row) => (
                <div key={row.l} className="grid grid-cols-3 sm:grid-cols-[1.3fr_1fr_1fr_1fr] items-stretch border-t border-[#1A1020]/8 text-xs sm:text-sm">
                  <p className="col-span-3 sm:col-span-1 px-4 pt-3 pb-1 sm:p-5 font-semibold text-[#1A1020]">{row.l}</p>
                  <p className="px-3 pb-3 pt-1 sm:p-5 text-center text-[#6E6478]">{row.a}</p>
                  <p className="px-3 pb-3 pt-1 sm:p-5 text-center text-[#6E6478]">{row.b}</p>
                  <p className="px-3 pb-3 pt-1 sm:p-5 text-center font-semibold bg-[#F4F2F7] text-[#4A1F5C]">{row.c}</p>
                </div>
              ))}
            </div>
          </div>

          {/* 5 Verticales del Sector Belleza */}
          <div className="space-y-8">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
              <div>
                <span className="text-xs font-bold uppercase tracking-[0.22em] text-[#4A1F5C]">
                  Tu especialidad
                </span>
                <h2 className="font-lujo mt-2 text-3xl sm:text-4xl font-semibold text-[#1A1020]">
                  Hecho para cómo trabajas tú.
                </h2>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {SECTORS.map((sec, idx) => (
                  <button
                    key={sec.id}
                    type="button"
                    onClick={() => setActiveSectorIdx(idx)}
                    className={`px-4 py-2 rounded-full text-xs font-bold transition-all cursor-pointer ${
                      activeSectorIdx === idx
                        ? 'bg-[#140B19] text-white shadow-xs'
                        : 'bg-white text-[#6E6478] hover:text-[#1A1020] border border-[#1A1020]/10'
                    }`}
                  >
                    {sec.tag}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 bg-white rounded-[32px] p-5 sm:p-8 border border-[#1A1020]/10 shadow-sm items-center">
              <div className="lg:col-span-5 h-64 sm:h-80 rounded-2xl overflow-hidden">
                {activeSector.image ? (
                  <img src={activeSector.image} alt={activeSector.title} className="w-full h-full object-cover" />
                ) : (
                  <div className="v-tarjeta-lujo relative flex h-full w-full flex-col justify-end rounded-2xl p-7 text-white">
                    <span aria-hidden="true" className="v-cifra font-lujo v-cifra-oscura absolute right-6 top-2 text-[120px] leading-none opacity-80">{activeSector.title.charAt(0)}</span>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-[#EBDDB8]">{activeSector.tag}</p>
                    <p className="font-lujo mt-2 text-2xl leading-tight">{activeSector.subtitle}</p>
                  </div>
                )}
              </div>
              <div className="lg:col-span-7 space-y-4">
                <span className="px-3 py-1 rounded-full bg-[#EFEAF1] text-[#4A1F5C] text-xs font-bold">
                  {activeSector.metrics}
                </span>
                <h3 className="font-lujo text-2xl sm:text-3xl font-bold text-[#1A1020]">
                  {activeSector.title}
                </h3>
                <p className="text-sm sm:text-base text-[#6E6478] leading-relaxed">
                  {activeSector.problemSolved}
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-2">
                  {activeSector.servicesPreview.map((sp, i) => (
                    <div key={i} className="p-3 rounded-2xl bg-[#FBFAFC] border border-[#1A1020]/8">
                      <p className="text-xs font-bold text-[#1A1020]">{sp.name}</p>
                      <div className="flex items-center justify-between mt-1.5 text-[11px] text-[#6E6478]">
                        <span>{sp.duration}</span>
                        <span className="font-bold text-[#4A1F5C]">{sp.price}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </motion.section>

      {/* ═══════════════════════════════════════════════════════════════════════════
          10. PRECIOS (G-043): ESENCIAL 19 $ · GRANDE 79 $ · MONTAJE FUNDADORA 49 $ + CALCULADORA
      ═══════════════════════════════════════════════════════════════════════════ */}
      <motion.section {...revelarSeccion} id="precios" className="scroll-mt-24 py-20 sm:py-28 px-4 sm:px-6 bg-[#FBFAFC]">
        <div className="mx-auto max-w-6xl space-y-14">
          <div className="max-w-3xl">
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#4A1F5C]">Precios claros &bull; 0 % comisión</p>
            <h2 className="font-lujo mt-3 text-3xl sm:text-5xl font-semibold leading-[1.04] text-[#1A1020]">
              Menos de lo que te deja{' '}
              <span className="italic font-normal text-[#4A1F5C]">una sola clienta al mes.</span>
            </h2>
            <p className="mt-3 text-sm sm:text-base text-[#6E6478]">
              Una cuota fija, sin permanencia y sin sorpresas. Si un mes creces más de lo previsto, te avisamos: nunca te cortamos.
            </p>
          </div>

          {/* Montaje de fundadora */}
          <div className="v-tarjeta-lujo relative overflow-hidden rounded-[28px] p-7 sm:p-9 text-white grid gap-6 md:grid-cols-[1fr_auto] items-center">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#EBDDB8]">Plan fundadora &bull; 100 plazas</p>
              <p className="font-lujo mt-3 text-2xl sm:text-3xl leading-tight">Te lo dejamos montado por <span className="v-cifra v-cifra-oscura">49 $</span> <span className="text-lg text-white/55 line-through decoration-[#C9A45C]">150 $</span></p>
              <p className="mt-2 max-w-2xl text-sm text-white/75">Con tu lista actual, tu logo y tus colores. Y tu precio de fundadora se queda contigo para siempre. Después, 14 días para probarlo con tus clientas.</p>
            </div>
            <button
              type="button"
              onClick={() => openCheckoutWithPlan('Plan Fundadora')}
              className="rounded-full px-7 py-4 text-sm font-bold text-[#1F1226] shadow-lg cursor-pointer transition-transform hover:scale-[1.02]"
              style={{ background: 'linear-gradient(115deg, #F3E6C4 0%, #C9A45C 55%, #EBD9AE 100%)' }}
            >
              Quiero mi plaza &rarr;
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[
              {
                name: 'Esencial',
                price: '19 $',
                period: 'al mes',
                note: 'o 171 $ al año',
                subtitle: 'Todo lo que tu estudio necesita para llenar la agenda con tu propia marca.',
                features: [
                  'Tu carta con tu marca, tus fotos y tus precios en $ y Bs',
                  'Reservas por especialista que te llegan ordenadas al WhatsApp',
                  'Pasaporte VIP de 5 sellos para que vuelvan',
                  'Ofertas, cupones y tarjetas regalo con el precio exacto',
                  'Tu equipo: 3 personas y 3 cabinas o zonas (cada profesional más, 3 $/mes)',
                  'Hasta 300 reservas al mes y tu kit con QR para imprimir',
                ],
                highlighted: true,
                cta: 'Empezar como fundadora',
                plan: 'Plan Fundadora · Esencial',
              },
              {
                name: 'Grande',
                price: '79 $',
                period: 'al mes',
                note: 'Muy pronto',
                subtitle: 'Para el estudio que quiere crecer sin pasarse las noches creando contenido.',
                features: [
                  'Todo lo de Esencial',
                  'Asistente de marketing con IA: hasta 40 piezas al mes',
                  'Historias, publicaciones y ofertas con tu estilo, listas para subir',
                  'Ideas de campañas según tus huecos libres de la semana',
                ],
                highlighted: false,
                cta: 'Avísame cuando esté',
                plan: 'Lista de espera · Grande',
              },
            ].map((plan) => (
              <div
                key={plan.name}
                className={`rounded-[30px] p-7 sm:p-8 flex flex-col justify-between border transition-transform hover:-translate-y-1 ${
                  plan.highlighted ? 'bg-white text-[#1A1020] border-[#C9A45C]/60 shadow-[0_30px_70px_-40px_rgba(20,11,25,0.5)]' : 'bg-white/70 text-[#1A1020] border-[#1A1020]/12'
                }`}
              >
                <div className="space-y-4">
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="font-lujo text-3xl">{plan.name}</h3>
                    {!plan.highlighted && (
                      <span className="rounded-full border border-[#C9A45C]/60 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#8A6A2E]">Muy pronto</span>
                    )}
                  </div>
                  <p className="text-sm text-[#6E6478]">{plan.subtitle}</p>
                  <div className="flex items-baseline gap-2">
                    <span className="v-cifra font-lujo v-cifra-clara text-5xl">{plan.price}</span>
                    <span className="text-sm font-semibold text-[#6E6478]">{plan.period}</span>
                    {plan.highlighted && <span className="text-xs text-[#6E6478]">&bull; {plan.note}</span>}
                  </div>
                  <ul className="space-y-2.5 pt-4 border-t border-[#1A1020]/10">
                    {plan.features.map((ft) => (
                      <li key={ft} className="flex items-start gap-2 text-sm">
                        <Check className="w-4 h-4 text-[#8A6A2E] shrink-0 mt-0.5 stroke-[2.5]" />
                        <span>{ft}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <button
                  type="button"
                  onClick={() => openCheckoutWithPlan(plan.plan)}
                  className={`w-full mt-7 py-3.5 rounded-full text-sm font-bold transition-all cursor-pointer ${
                    plan.highlighted ? 'bg-[#1F1226] hover:bg-[#2E1A38] text-white shadow-lg' : 'bg-white hover:bg-[#1F1226] hover:text-white text-[#1A1020] border border-[#1A1020]/15'
                  }`}
                >
                  {plan.cta}
                </button>
              </div>
            ))}
          </div>

          {/* Calculadora: lo que se pierde por contestar tarde */}
          <div className="bg-white rounded-[32px] p-6 sm:p-10 border border-[#1A1020]/10 shadow-sm grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            <div className="lg:col-span-7 space-y-4">
              <span className="text-xs font-bold uppercase tracking-[0.2em] text-[#4A1F5C]">
                Haz la cuenta
              </span>
              <h3 className="font-lujo text-2xl sm:text-3xl font-semibold text-[#1A1020]">
                ¿Cuánto se te va cada mes en clientas que no esperaron tu respuesta?
              </h3>
              <div className="space-y-4 pt-2">
                <div>
                  <div className="flex justify-between text-xs font-bold mb-1.5">
                    <span>Lo que te deja una clienta de media</span>
                    <span className="text-[#4A1F5C]">{avgTicket} $</span>
                  </div>
                  <input
                    type="range"
                    min={12}
                    max={90}
                    value={avgTicket}
                    onChange={(e) => setAvgTicket(Number(e.target.value))}
                    className="w-full accent-[#4A1F5C] cursor-pointer"
                    aria-label="Ticket medio por clienta"
                  />
                </div>
                <div>
                  <div className="flex justify-between text-xs font-bold mb-1.5">
                    <span>Citas que se te enfrían a la semana</span>
                    <span className="text-[#4A1F5C]">{missedWeekly} a la semana</span>
                  </div>
                  <input
                    type="range"
                    min={2}
                    max={20}
                    value={missedWeekly}
                    onChange={(e) => setMissedWeekly(Number(e.target.value))}
                    className="w-full accent-[#4A1F5C] cursor-pointer"
                    aria-label="Citas perdidas por semana"
                  />
                </div>
              </div>
            </div>
            <div className="lg:col-span-5 v-tarjeta-lujo rounded-3xl p-7 text-white space-y-3">
              <span className="text-[10px] font-bold uppercase tracking-widest text-[#EBDDB8] block">
                Lo que podrías recuperar
              </span>
              <p className="font-lujo text-4xl sm:text-5xl">
                <span className="v-cifra v-cifra-oscura">+{monthlyRecoveredUSD.toLocaleString('es-ES')} $</span> <span className="text-lg text-white/70">al mes</span>
              </p>
              <p className="text-xs text-white/80">
                Son <strong className="text-white">{yearlyRecoveredUSD.toLocaleString('es-ES')} $ al año</strong> en citas que hoy se van mientras atiendes. Con recuperar una sola al mes, VANESEV ya se paga solo.
              </p>
              <button
                type="button"
                onClick={() => openCheckoutWithPlan('Plan Fundadora')}
                className="w-full mt-2 py-3 rounded-full bg-white text-[#1A1020] text-xs font-bold shadow-xs cursor-pointer"
              >
                Quiero recuperarlas
              </button>
            </div>
          </div>
        </div>
      </motion.section>

      {/* ═══════════════════════════════════════════════════════════════════════════
          11. FUNDADORAS (G-040/G-043): 100 PLAZAS; LOS CASOS DE ÉXITO LLEGARÁN CON SU TESTIMONIO
      ═══════════════════════════════════════════════════════════════════════════ */}
      <motion.section {...revelarSeccion} id="fundadoras" className="scroll-mt-24 text-[#1A1020] py-20 sm:py-28 px-4 sm:px-6" style={{ background: 'radial-gradient(90% 70% at 15% 10%, rgba(217,196,155,0.30) 0%, transparent 60%), radial-gradient(80% 70% at 90% 90%, rgba(74,31,92,0.10) 0%, transparent 60%), #F7F3EE' }}>
        <div className="mx-auto max-w-6xl grid gap-12 md:grid-cols-[1.1fr_0.9fr] items-center">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#7D6438]">Fundadoras</p>
            <h2 className="font-lujo mt-3 text-3xl sm:text-5xl font-semibold leading-[1.04]">
              Los primeros 100 estudios{' '}
              <span className="italic font-normal text-[#4A1F5C]">entran por la puerta grande.</span>
            </h2>
            <p className="mt-4 text-base text-[#4A4150] leading-relaxed">
              Precio de fundadora para siempre, montaje a 49 $ en lugar de 150 $ y línea directa con nosotras para decidir lo que viene. Los primeros estudios ya están dentro: muy pronto te contarán aquí su historia.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => openCheckoutWithPlan('Plan Fundadora')}
                className="px-7 py-4 rounded-full text-sm font-bold text-white shadow-lg flex items-center gap-2 cursor-pointer transition-transform hover:scale-[1.02]"
                style={{ background: '#1F1226' }}
              >
                <span>Quiero mi plaza de fundadora</span>
                <ArrowRight className="w-4 h-4" />
              </button>
              <a
                href="https://wa.me/584223794800?text=Hola%2C%20quiero%20saber%20m%C3%A1s%20del%20plan%20fundadora%20de%20VANESEV."
                target="_blank"
                rel="noopener noreferrer"
                className="px-6 py-4 rounded-full border border-[#1A1020]/20 hover:border-[#1A1020]/40 text-sm font-bold text-[#1A1020]"
              >
                Preguntar por WhatsApp
              </a>
            </div>
          </div>
          <dl className="grid grid-cols-3 gap-3 sm:gap-4">
            {[
              ['100', 'plazas de fundadora'],
              ['49 $', 'montaje, no 150 $'],
              ['0 %', 'comisión, siempre'],
            ].map(([v, k]) => (
              <div key={k} className="v-tarjeta-clara rounded-[22px] bg-white p-4 sm:p-6 text-center">
                <dt className="v-cifra font-lujo v-cifra-clara text-3xl sm:text-5xl leading-none">{v}</dt>
                <dd className="mt-2 text-[11px] sm:text-xs font-semibold text-[#6E6478]">{k}</dd>
              </div>
            ))}
          </dl>
        </div>
      </motion.section>

      {/* ═══════════════════════════════════════════════════════════════════════════
          12. PREGUNTAS FRECUENTES (el blog vive en /blog, G-042)
      ═══════════════════════════════════════════════════════════════════════════ */}
      <motion.section {...revelarSeccion} className="py-20 sm:py-28 px-4 sm:px-6 bg-[#FBFAFC]">
        <div className="mx-auto max-w-6xl">
          {/* FAQ Accordion */}
          <div id="faq" className="scroll-mt-20 max-w-3xl mx-auto space-y-6">
            <div className="text-center space-y-2">
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#4A1F5C]">
                Preguntas Frecuentes
              </p>
              <h2 className="font-lujo text-3xl sm:text-4xl font-semibold text-[#1A1020]">
                Lo que nos preguntan las dueñas.
              </h2>
            </div>

            <div className="space-y-3">
              {FAQ_ITEMS.map((item, idx) => {
                const open = openFaqIdx === idx;
                return (
                  <div
                    key={idx}
                    className="rounded-2xl bg-white border border-[#1A1020]/10 overflow-hidden shadow-2xs"
                  >
                    <button
                      type="button"
                      onClick={() => setOpenFaqIdx(open ? null : idx)}
                      className="w-full p-5 text-left flex items-center justify-between gap-4 cursor-pointer"
                    >
                      <span className="font-bold text-sm sm:text-base text-[#1A1020]">
                        {item.q}
                      </span>
                      <ChevronDown
                        className={`w-4 h-4 text-[#4A1F5C] shrink-0 transition-transform ${
                          open ? 'rotate-180' : ''
                        }`}
                      />
                    </button>
                    {open && (
                      <div className="px-5 pb-5 text-xs sm:text-sm text-[#6E6478] leading-relaxed border-t border-[#1A1020]/6 pt-3">
                        {item.a}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </motion.section>

      {/* ═══════════════════════════════════════════════════════════════════════════
          13. FINAL CLOSING COMMERCIAL CTA BANNER
      ═══════════════════════════════════════════════════════════════════════════ */}
      <motion.section {...revelarSeccion}
        className="py-20 sm:py-28 px-4 sm:px-6 text-center text-white"
        style={{ background: 'radial-gradient(120% 140% at 85% 0%, #4A1F5C 0%, #1F1226 45%, #140B19 100%)' }}
      >
        <div className="mx-auto max-w-3xl space-y-6">
          <h2 className="font-lujo text-4xl sm:text-6xl lg:text-7xl font-semibold leading-none">
            Tu marca. Tu agenda.{' '}
            <span className="italic font-normal text-[#D9C49B]">Tus clientas.</span>
          </h2>
          <p className="mx-auto max-w-xl text-base sm:text-lg text-white/80">
            Te enseñamos tu carta con tus propios servicios antes de pagar nada. Sin permanencia, y con nosotras al otro lado del WhatsApp.
          </p>
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3.5">
            <button
              type="button"
              onClick={() => openCheckoutWithPlan('Plan Fundadora')}
              className="px-9 py-4 rounded-full text-sm sm:text-base font-bold text-[#1F1226] shadow-xl cursor-pointer"
              style={{ background: 'linear-gradient(115deg, #F3E6C4 0%, #C9A45C 55%, #EBD9AE 100%)' }}
            >
              Quiero mi plaza de fundadora &rarr;
            </button>
            <a
              href="https://wa.me/584223794800?text=Hola%2C%20quiero%20ver%20una%20demo%20de%20VANESEV%20para%20mi%20sal%C3%B3n."
              target="_blank"
              rel="noopener noreferrer"
              className="px-8 py-4 rounded-full border border-white/25 hover:border-white/60 text-sm sm:text-base font-bold text-white"
            >
              Verla con mis servicios
            </a>
          </div>
        </div>
      </motion.section>

      </>)}

      {esBlog && (
        <section id="blog" className="pt-32 sm:pt-40 pb-20 sm:pb-28 px-4 sm:px-6 bg-[#FBFAFC]">
          <div className="mx-auto max-w-6xl space-y-8">
          {/* Blog Editorial */}
          <div className="space-y-8">
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
          <div className="grid gap-10 md:grid-cols-[1.4fr_repeat(4,1fr)]">
            {/* Column 1: Brand & Partner CTA */}
            <div>
              <VanesevLogo tono="oscuro" tamano={38} />
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

            {/* Column 2: Productos */}
            <nav aria-label="Productos">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-white/40">Productos</p>
              <ul className="mt-4 space-y-2.5 text-xs sm:text-sm text-white/75">
                <li>
                  <button type="button" onClick={() => scrollToSection('un-dia')} className="hover:text-white cursor-pointer">
                    Cómo funciona
                  </button>
                </li>
                <li>
                  <button type="button" onClick={() => scrollToSection('equipo')} className="hover:text-white cursor-pointer">
                    Tu equipo
                  </button>
                </li>
                <li>
                  <button type="button" onClick={() => scrollToSection('personalizador')} className="hover:text-white cursor-pointer">
                    Tu marca
                  </button>
                </li>
                <li>
                  <button type="button" onClick={() => scrollToSection('precios')} className="hover:text-white cursor-pointer">
                    Precios
                  </button>
                </li>
              </ul>
            </nav>

            {/* Column 3: Especialidades */}
            <nav aria-label="Especialidades">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-white/40">Sectores</p>
              <ul className="mt-4 space-y-2.5 text-xs sm:text-sm text-white/75">
                <li>
                  <button type="button" onClick={() => { setActiveSectorIdx(0); scrollToSection('sectores'); }} className="hover:text-white cursor-pointer">
                    Cejas, Pestañas &amp; MakeUp
                  </button>
                </li>
                <li>
                  <button type="button" onClick={() => { setActiveSectorIdx(1); scrollToSection('sectores'); }} className="hover:text-white cursor-pointer">
                    Peluquerías &amp; Color
                  </button>
                </li>
                <li>
                  <button type="button" onClick={() => { setActiveSectorIdx(2); scrollToSection('sectores'); }} className="hover:text-white cursor-pointer">
                    Clínicas &amp; MedSpa
                  </button>
                </li>
                <li>
                  <button type="button" onClick={() => { setActiveSectorIdx(3); scrollToSection('sectores'); }} className="hover:text-white cursor-pointer">
                    Nail Bars &amp; Barberías
                  </button>
                </li>
              </ul>
            </nav>

            {/* Column 4: Recursos & Demos */}
            <nav aria-label="Recursos">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-white/40">Recursos</p>
              <ul className="mt-4 space-y-2.5 text-xs sm:text-sm text-white/75">
                <li>
                  <button
                    type="button"
                    onClick={() => scrollToSection('inicio')}
                    className="hover:text-white font-semibold text-[#D9C49B] cursor-pointer"
                  >
                    Inicio
                  </button>
                </li>
                <li>
                  <a href="/blog" className="hover:text-white">
                    Blog
                  </a>
                </li>
                <li>
                  <button type="button" onClick={() => scrollToSection('fundadoras')} className="hover:text-white cursor-pointer">
                    Plan fundadora
                  </button>
                </li>
                <li>
                  <button type="button" onClick={() => scrollToSection('faq')} className="hover:text-white cursor-pointer">
                    Preguntas Frecuentes
                  </button>
                </li>
              </ul>
            </nav>

            {/* Column 5: Legal */}
            <nav aria-label="Legal">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-white/40">Legal</p>
              <ul className="mt-4 space-y-2.5 text-xs sm:text-sm text-white/75">
                <li>
                  <button type="button" onClick={() => setLegalModalTitle('Política de Privacidad y Protección de Datos')} className="hover:text-white cursor-pointer">
                    Privacidad
                  </button>
                </li>
                <li>
                  <button type="button" onClick={() => setLegalModalTitle('Términos y Condiciones de Uso SaaS')} className="hover:text-white cursor-pointer">
                    Términos de Servicio
                  </button>
                </li>
                <li>
                  <button type="button" onClick={() => setLegalModalTitle('Política de Cookies y Almacenamiento Seguro')} className="hover:text-white cursor-pointer">
                    Política de Cookies
                  </button>
                </li>
              </ul>
            </nav>
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
                <strong className="text-[#4A1F5C]">{selectedPlanName}</strong>. Te escribimos por WhatsApp y te enseñamos tu carta antes de cobrarte nada.
              </p>

              <form onSubmit={handleLeadSubmit} className="space-y-3.5 mt-5">
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

                <div>
                  <label className="text-xs font-bold text-[#1A1020] block mb-1">
                    Tu especialidad
                  </label>
                  <select
                    value={leadSpecialty}
                    onChange={(e) => setLeadSpecialty(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-2xl bg-[#FBFAFC] border border-[#1A1020]/12 text-xs font-semibold focus:outline-none focus:border-[#4A1F5C]"
                  >
                    <option value="Cejas, Pestañas & Maquillaje">Cejas, Pestañas &amp; Maquillaje</option>
                    <option value="Peluquería, Colorimetría & Alisados">Peluquería, Colorimetría &amp; Alisados</option>
                    <option value="Clínica Estética, Facial & Spa">Clínica Estética, Facial &amp; Spa</option>
                    <option value="Nail Bar & Spa de Manos y Pies">Nail Bar &amp; Spa de Manos y Pies</option>
                    <option value="Barbería de Autor">Barbería de Autor</option>
                  </select>
                </div>

                <button
                  type="submit"
                  className="w-full py-3.5 rounded-full text-white text-xs sm:text-sm font-bold shadow-lg flex items-center justify-center gap-2 mt-2 cursor-pointer"
                  style={{ background: '#1F1226' }}
                >
                  <Send className="w-4 h-4" />
                  <span>Quiero ver mi carta</span>
                </button>
              </form>
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
