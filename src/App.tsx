import React, { useState, useEffect, Suspense } from 'react';
import { Navbar } from './components/Navbar';
import { Hero } from './components/Hero';
import { ServiceCatalog } from './components/ServiceCatalog';
import { PromoPage } from './components/PromoPage';
import { LoyaltyClub } from './components/LoyaltyClub';
import { ClientAccountModal } from './components/ClientAccountModal';
import { StudioPolicies } from './components/StudioPolicies';
import { PaymentMethods } from './components/PaymentMethods';
import { Footer } from './components/Footer';
import { BookingModal } from './components/BookingModal';
import { AdminAuthGate } from './components/AdminAuthGate';
import { authClient } from './lib/authClient';
import { SharePage } from './components/SharePage';
import { ClubInviteSection } from './components/ClubInviteSection';
import { PWAInstallModal } from './components/PWAInstallModal';
import { LegalModals, LegalModalType } from './components/LegalModals';
import { CookieConsentBanner } from './components/CookieConsentBanner';
import { CapraStudioExperience } from './components/CapraStudioExperience';
import { TokensDesignSystem } from './components/TokensDesignSystem';
import { AppStore } from './services/store';
import { ServiceItem, PromoOffer, GallerySlide } from './types';

// Lazy-loaded Heavy Admin & Super-Admin Bundles (Code-Splitting for 3G/4G Mobile Speed)
const CentralDashboard = React.lazy(() =>
  import('./components/CentralDashboard').then((m) => ({ default: m.CentralDashboard }))
);
const VanesevLanding = React.lazy(() =>
  import('./components/VanesevLanding').then((m) => ({ default: m.VanesevLanding }))
);
const AdminDashboard = React.lazy(() =>
  import('./components/AdminDashboard').then((m) => ({ default: m.AdminDashboard }))
);
import {
  Calendar,
  MessageCircle,
  Download,
  Terminal,
  ShieldCheck,
  Globe,
  Phone,
  Award,
  Clock,
  Users,
} from 'lucide-react';

import {
  resolveVerifiedBeautyImage,
  getSalonThemeConfig,
} from './utils/salonThemeEngine';

const CAPRA_EDITORIAL_IMAGES: Record<string, string> = {
  'capra-srv-1': '/capra/brows-henna.jpg',
  'capra-srv-2': '/capra/brow-lamination.jpg',
  'capra-srv-3': '/capra/lash-lifting.jpg',
  'capra-srv-4': '/capra/lash-extensions.jpg',
  'capra-srv-5': '/capra/hair-straightening.jpg',
  'capra-srv-6': '/vanesev/sector-hair-color.jpg',
  'capra-srv-7': '/capra/makeup-blindada.jpg',
  'capra-srv-8': '/capra/bridal-package.jpg',
  'capra-srv-9': '/capra/nails-french.jpg',
  'capra-srv-10': '/capra/pedicure-spa.jpg',
  'capra-srv-11': '/vanesev/sector-medspa.jpg',
  'capra-srv-12': '/vanesev/hero-atelier.jpg',
  'capra-cejas-lam': '/capra/brow-lamination.jpg',
  'capra-pestanas-vol': '/capra/lash-extensions.jpg',
  'capra-alisado-org': '/capra/hair-straightening.jpg',
  'capra-secado-ondas': '/vanesev/sector-hair-color.jpg',
  'capra-makeup-social': '/capra/makeup-blindada.jpg',
  'capra-nails-rubber': '/capra/nails-french.jpg',
  'capra-pedi-spa': '/capra/pedicure-spa.jpg',
  'capra-depi-corporal': '/vanesev/sector-medspa.jpg',
  'capra-curso-cejas': '/vanesev/hero-atelier.jpg',
  'capra-curso-automaq': '/capra/bridal-package.jpg',
};

const resolveCapraServiceImage = (id: string, category: string, name: string, rawUrl?: string): string => {
  return resolveVerifiedBeautyImage({ id, category, name, imageUrl: rawUrl });
};

const CAPRA_FALLBACK_SERVICES: ServiceItem[] = [
  {
    id: 'capra-srv-1',
    name: 'Diseño de Cejas + Sombreado en Henna',
    category: 'cejas_pestanas',
    priceUSD: 12,
    durationMinutes: 40,
    shortDescription: 'Visagismo geométrico con hilo o cera hipoalergénica y pigmentación orgánica en henna.',
    fullDescription: 'Diseño arquitectónico de cejas según tu morfología facial, depilación de alta precisión y sombreado mineral de larga duración.',
    idealFor: 'Mirada enmarcada y simétrica',
    imageUrl: '/capra/brows-henna.jpg',
    badgeText: 'Mirada Perfecta',
    badgeColor: 'bg-[#9E475B]',
    isAvailable: true,
    tags: ['Cejas HD', 'Henna', 'Visagismo'],
  },
  {
    id: 'capra-srv-2',
    name: 'Brow Lamination + Diseño & Botox Nutritivo',
    category: 'cejas_pestanas',
    priceUSD: 20,
    durationMinutes: 50,
    shortDescription: 'Efecto pluma estilizado con reestructuración orgánica y vitaminas para cejas.',
    fullDescription: 'Alineación direccional del vello para lograr cejas más densas, definidas y nutridas hasta por 6 semanas.',
    idealFor: 'Cejas rebeldes o con espacios vacíos',
    imageUrl: '/capra/brow-lamination.jpg',
    badgeText: 'Tendencia VIP',
    badgeColor: 'bg-[#9E475B]',
    isAvailable: true,
    tags: ['Brow Lamination', 'Botox', 'Mirada'],
  },
  {
    id: 'capra-srv-3',
    name: 'Lifting de Pestañas + Tinte & Keratina',
    category: 'cejas_pestanas',
    priceUSD: 22,
    durationMinutes: 60,
    shortDescription: 'Curvatura natural desde la raíz con infusión de keratina y tinte negro intenso.',
    fullDescription: 'Realza la longitud real de tus pestañas naturales sin extensiones, aportando nutrición profunda y efecto rímel.',
    idealFor: 'Mirada fresca y expresiva sin mantenimiento pesado',
    imageUrl: '/capra/lash-lifting.jpg',
    badgeText: 'Mirada Natural',
    badgeColor: 'bg-[#9E475B]',
    isAvailable: true,
    tags: ['Lifting', 'Keratina', 'Pestañas'],
  },
  {
    id: 'capra-srv-4',
    name: 'Extensiones de Pestañas Pelo a Pelo / Volumen Sutil',
    category: 'cejas_pestanas',
    priceUSD: 30,
    durationMinutes: 90,
    shortDescription: 'Fibras de seda ultraligeras aplicadas con aislamiento micro-preciso sin dañar tu pestaña.',
    fullDescription: 'Mapping personalizado según la anatomía de tu ojo con adhesivo hipoalergénico de grado médico.',
    idealFor: 'Despertar lista todos los días',
    imageUrl: '/capra/lash-extensions.jpg',
    badgeText: 'Favorito Capra',
    badgeColor: 'bg-[#9E475B]',
    isAvailable: true,
    tags: ['Extensiones Seda', 'Volumen', 'Mirada'],
  },
  {
    id: 'capra-srv-5',
    name: 'Alisado Orgánico Efecto Espejo & Hidratación Profunda',
    category: 'estilismo',
    priceUSD: 45,
    durationMinutes: 150,
    shortDescription: 'Alisado libre de formol con brillo tridimensional y sellado térmico de aminoácidos.',
    fullDescription: 'Fórmula botánica enriquecida con aminoácidos y aceites nobles para disciplinar la hebra al 100% y devolver la sedosidad espejo.',
    idealFor: 'Cabello liso, brillante y saludable por meses',
    imageUrl: '/capra/hair-straightening.jpg',
    badgeText: 'Hair Couture',
    badgeColor: 'bg-[#C89B7B]',
    isAvailable: true,
    tags: ['Alisado', 'Brillo Espejo', 'Hidratación'],
  },
  {
    id: 'capra-srv-6',
    name: 'Secado Editorial, Brushing & Ondas Glamour',
    category: 'estilismo',
    priceUSD: 18,
    durationMinutes: 60,
    shortDescription: 'Lavado spa capilar, termoprotección y estilizado profesional de larga duración.',
    fullDescription: 'Incluye diagnóstico capilar, lavado relajante en lavacabezas spa y estilizado con cepillo u ondas de pasarela.',
    idealFor: 'Eventos especiales o lucir impecable toda la semana',
    imageUrl: '/vanesev/sector-hair-color.jpg',
    badgeText: 'Estilismo',
    badgeColor: 'bg-[#9E475B]',
    isAvailable: true,
    tags: ['Secado', 'Ondas', 'Brushing'],
  },
  {
    id: 'capra-srv-7',
    name: 'Maquillaje Profesional Social & Piel Blindada HD',
    category: 'maquillaje',
    priceUSD: 35,
    durationMinutes: 75,
    shortDescription: 'Piel blindada de alta definición a prueba de clima, sudor y lágrimas con pestañas.',
    fullDescription: 'Preparación dermo-cosmética de alta gama, técnica de piel blindada luminosa y diseño de ojos personalizado por María Capra.',
    idealFor: 'Graduaciones, galas y sesiones editoriales',
    imageUrl: '/capra/makeup-blindada.jpg',
    badgeText: 'By María Capra',
    badgeColor: 'bg-[#C89B7B]',
    isAvailable: true,
    tags: ['Maquillaje HD', 'Piel Blindada', 'Social'],
  },
  {
    id: 'capra-srv-8',
    name: 'Paquete Reina / Novia (Maquillaje Blindado + Peinado Gala)',
    category: 'maquillaje',
    priceUSD: 65,
    durationMinutes: 135,
    shortDescription: 'Experiencia nupcial o de gala completa: piel blindada luminosa, pestañas y estilismo.',
    fullDescription: 'Atención exclusiva para novias, quinceañeras y protagonistas que requieren perfección absoluta durante más de 16 horas.',
    idealFor: 'Novias y eventos de máxima etiqueta',
    imageUrl: '/capra/bridal-package.jpg',
    badgeText: 'Bridal Suite',
    badgeColor: 'bg-[#C89B7B]',
    isAvailable: true,
    tags: ['Novias', 'Gala', 'Paquete VIP'],
  },
  {
    id: 'capra-srv-9',
    name: 'Manicure Rusa Combinada + Nivelación Rubber / French',
    category: 'nails',
    priceUSD: 20,
    durationMinutes: 90,
    shortDescription: 'Limpieza micro-precisa de cutícula y arquitectura de uña con acabado natural.',
    fullDescription: 'Manicura rusa con instrumental esterilizado en autoclave, nivelación anatómica con base rubber y esmaltado en gel.',
    idealFor: 'Manos impecables por más de 21 días',
    imageUrl: '/capra/nails-french.jpg',
    badgeText: 'Nails Atelier',
    badgeColor: 'bg-[#9E475B]',
    isAvailable: true,
    tags: ['Manicure Rusa', 'Rubber', 'Gel'],
  },
  {
    id: 'capra-srv-10',
    name: 'Pedicure Spa Detox & Esmaltado Semipermanente',
    category: 'nails',
    priceUSD: 20,
    durationMinutes: 60,
    shortDescription: 'Sales minerales, exfoliación orgánica con pétalos, terapia de hidratación y gel.',
    fullDescription: 'Ritual de descanso podal con exfoliación nutritiva, retiro suave de asperezas y esmaltado de larga duración.',
    idealFor: 'Pies descansados, suaves y renovados',
    imageUrl: '/capra/pedicure-spa.jpg',
    badgeText: 'Ritual Spa',
    badgeColor: 'bg-[#9E475B]',
    isAvailable: true,
    tags: ['Pedicure Spa', 'Semipermanente'],
  },
  {
    id: 'capra-srv-11',
    name: 'Depilación Corporal en Cabina Privada (Cera Miel / Española)',
    category: 'depilacion',
    priceUSD: 22,
    durationMinutes: 45,
    shortDescription: 'Cabina climatizada con protocolo calmante post-depilatorio de aloe y manzanilla.',
    fullDescription: 'Protocolo higiénico descartable en cabina privada para piernas completas, axilas y línea de bikini.',
    idealFor: 'Piel de seda libre de irritación',
    imageUrl: '/vanesev/sector-medspa.jpg',
    badgeText: 'Cabina Privada',
    badgeColor: 'bg-[#9E475B]',
    isAvailable: true,
    tags: ['Depilación', 'Cera Española', 'Cabina'],
  },
  {
    id: 'capra-srv-12',
    name: 'MASTERCLASS: Especialista en Cejas, Pestañas & Automaquillaje',
    category: 'cursos',
    priceUSD: 80,
    durationMinutes: 240,
    shortDescription: 'Formación intensiva teórico-práctica con materiales en mesa, guía y certificado.',
    fullDescription: 'Aprende visagismo arquitectónico, laminado, pigmentación híbrida, piel blindada y rentabilidad de salón junto a María Giovanna Capra.',
    idealFor: 'Emprendedoras que buscan iniciar o escalar su estudio',
    imageUrl: '/vanesev/hero-atelier.jpg',
    badgeText: 'Capra Academy',
    badgeColor: 'bg-[#C89B7B]',
    isAvailable: true,
    tags: ['Certificado', 'Práctica Real', 'Capra Academy'],
  },
];

const CAPRA_CATEGORIES = [
  { id: 'all', label: 'Todos los Servicios' },
  { id: 'cejas_pestanas', label: 'Cejas & Pestañas' },
  { id: 'estilismo_alisados', label: 'Estilismo & Alisados' },
  { id: 'maquillaje', label: 'Maquillaje Pro' },
  { id: 'manicure_pedicure', label: 'Manicure & Pies' },
  { id: 'depilacion', label: 'Cabina Depilación' },
  { id: 'cursos', label: 'Capra Academy' },
];

export const App: React.FC = () => {
  // Resolve active zone & tenant from URL path (Single Domain Architecture: /m/<slug> or /<slug> - No Subdomains)
  const resolveInitialRoute = () => {
    const path = window.location.pathname.toLowerCase();
    const hash = window.location.hash.toLowerCase();
    const search = new URLSearchParams(window.location.search);

    const isTokens =
      path.startsWith('/__tokens') ||
      path.startsWith('/tokens') ||
      hash === '#tokens' ||
      search.has('tokens');

    const isCentral =
      path.startsWith('/central') ||
      hash === '#central' ||
      search.has('central');

    const isAdmin =
      path.includes('/admin') ||
      hash === '#admin' ||
      search.has('admin');

    const salonParam = search.get('salon');

    // Extract dynamic tenant slug from /m/<slug> or /<slug>/admin or ?salon=<slug>
    let extractedSlug = '';
    if (salonParam) {
      extractedSlug = salonParam.toLowerCase().trim();
    } else if (path.startsWith('/m/')) {
      const parts = path.replace(/^\/m\//, '').split('/').filter(Boolean);
      extractedSlug = (parts[0] || '').trim();
    } else {
      const parts = path.split('/').filter(Boolean);
      const first = (parts[0] || '').trim();
      // Rutas de la web comercial que nunca son un salón (G-042, G-044).
      if (first && !['central', 'saas', 'compartir', 'promociones', 'admin', 'blog', 'para'].includes(first)) {
        extractedSlug = first;
      }
    }

    if (extractedSlug === 'capra') extractedSlug = 'capra-studio';
    if (extractedSlug === 'andrea') extractedSlug = 'andrea-nails';

    const hasExplicitSalon = Boolean(extractedSlug);
    // NUNCA asignar un salón por defecto en la raíz (vanesev.com) ni en Central
    const tenant: string = extractedSlug || '';

    // Root SaaS route: on apex domain or /, or explicitly /saas (or when no explicit salon & not central)
    const isSaasLanding =
      !isCentral &&
      (path === '/' ||
        path === '' ||
        path.startsWith('/saas') ||
        hash === '#saas' ||
        search.get('zone') === 'saas' ||
        !hasExplicitSalon);

    return { isTokens, isCentral, isSaasLanding: !isTokens && isSaasLanding, isAdmin: isAdmin && hasExplicitSalon, tenant };
  };

  const initialRoute = resolveInitialRoute();
  const [isTokensRoute, setIsTokensRoute] = useState(initialRoute.isTokens);
  const [isCentralRoute, setIsCentralRoute] = useState(initialRoute.isCentral);
  const [isSaasRoute, setIsSaasRoute] = useState(initialRoute.isSaasLanding);
  const [activeTenant, setActiveTenant] = useState<string>(initialRoute.tenant);

  // Legal modal state
  const [activeLegalModal, setActiveLegalModal] = useState<LegalModalType>(null);

  // Store reactive state (inicializado vacío para jamás mezclar datos antes de entrar a un salón explícito)
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [promos, setPromos] = useState<PromoOffer[]>([]);
  const [gallerySlides, setGallerySlides] = useState<GallerySlide[]>([]);
  const [bookings, setBookings] = useState< ReturnType<typeof AppStore.getBookings> >([]);
  const [blockedSlots, setBlockedSlots] = useState< ReturnType<typeof AppStore.getBlockedSlots> >([]);
  const [exchangeRate, setExchangeRate] = useState<number>(36.85);

  // Routing state for SaaS Admin Dashboard
  const [isAdminRoute, setIsAdminRoute] = useState(initialRoute.isAdmin);

  // Super Admin session state with 2FA protection
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);

  useEffect(() => {
    authClient.getSession().then((res) => {
      if (res?.data?.user) setIsAdminAuthenticated(true);
    }).catch(() => {});
  }, []);

  // Routing state for Share / Referral Page
  const [isShareRoute, setIsShareRoute] = useState(() => {
    const path = window.location.pathname.toLowerCase();
    const hash = window.location.hash.toLowerCase();
    const search = new URLSearchParams(window.location.search);
    return path.startsWith('/compartir') || hash === '#compartir' || search.has('compartir');
  });

  // Routing state for Dedicated Promo Page
  const [isPromoRoute, setIsPromoRoute] = useState(() => {
    const path = window.location.pathname.toLowerCase();
    const hash = window.location.hash.toLowerCase();
    const search = new URLSearchParams(window.location.search);
    return path.startsWith('/promociones') || hash === '#promociones' || search.has('promociones');
  });

  // Referred by friend parameter
  const [referralCode, setReferralCode] = useState<string>(() => {
    const search = new URLSearchParams(window.location.search);
    return search.get('ref') || '';
  });

  // Client booking modal state
  const [isBookingOpen, setIsBookingOpen] = useState(false);
  const [selectedService, setSelectedService] = useState<ServiceItem | null>(null);
  const [selectedPromo, setSelectedPromo] = useState<PromoOffer | null>(null);
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);

  // Load store data with Neon Cloud synchronization ONLY when an explicit tenant is active
  const refreshData = (targetTenant: string = activeTenant) => {
    const cleanTenant = (targetTenant || '').trim().toLowerCase();
    if (!cleanTenant) return;

    AppStore.setActiveTenant(cleanTenant as any);
    if (cleanTenant !== 'andrea-nails') {
      setServices(CAPRA_FALLBACK_SERVICES);
      fetch(`/api/services?tenant=${encodeURIComponent(cleanTenant)}`)
        .then(r => (r.ok ? r.json() : null))
        .then(json => {
          const rawServices = Array.isArray(json?.services) ? json.services : Array.isArray(json?.data) ? json.data : null;
          if (rawServices && rawServices.length > 0) {
            const mapped: ServiceItem[] = rawServices.map((row: any) => ({
              id: row.id,
              name: row.name,
              category: row.category || 'cejas_pestanas',
              priceUSD: Number(row.priceUSD ?? row.price_usd ?? 20),
              durationMinutes: Number(row.durationMinutes ?? row.duration_min ?? 60),
              shortDescription: row.shortDescription || row.description || '',
              fullDescription: row.fullDescription || row.description || '',
              idealFor: row.idealFor || row.includes_note || 'Atención personalizada de autor',
              imageUrl: resolveCapraServiceImage(row.id, row.category || 'cejas_pestanas', row.name || '', row.imageUrl || row.image_url),
              badgeText: row.badgeText || (row.category === 'cursos' ? 'Academy' : 'Autor'),
              badgeColor: row.category === 'cursos' ? 'bg-[#C89B7B]' : 'bg-[#9E475B]',
              isAvailable: row.isAvailable !== false && row.is_active !== false,
              tags: Array.isArray(row.tags) ? row.tags : [row.category || 'Belleza', 'Autor'],
            }));
            setServices(mapped);
          }
        })
        .catch(() => {});
    } else {
      setServices(AppStore.getServices());
      AppStore.fetchRemoteServices()
        .then(remoteServices => {
          if (remoteServices && remoteServices.length > 0) setServices(remoteServices);
        })
        .catch(() => {});
    }

    setPromos(AppStore.getPromos());
    AppStore.fetchRemotePromos().then(setPromos).catch(() => {});
    setBookings(AppStore.getBookings());
    setBlockedSlots(AppStore.getBlockedSlots());
    setExchangeRate(AppStore.getExchangeRate());

    Promise.all([
      AppStore.fetchRemoteBookings(),
      AppStore.fetchRemoteBlockedSlots(),
      AppStore.fetchRemoteLoyaltyCards(),
      AppStore.fetchRemoteGallery(),
    ])
      .then(([remoteBookings, remoteBlockedSlots, _, remoteGallery]) => {
        if (remoteBookings) setBookings(remoteBookings);
        if (remoteBlockedSlots) setBlockedSlots(remoteBlockedSlots);
        if (remoteGallery && remoteGallery.length > 0) setGallerySlides(remoteGallery);
      })
      .catch(() => {});
  };

  useEffect(() => {
    // 1. ZONA 1: Web Comercial VANESEV (vanesev.com /) — CERO contacto con salones clientes ni PWA
    if (isSaasRoute) {
      document.title = 'VANESEV · Suite de autor para salones de belleza';
      const existingManifest = document.querySelector("link[rel='manifest']");
      if (existingManifest) existingManifest.remove();
      return;
    }

    // 2. ZONA 2: VANESEV Central (/central) — Comando global sin mezclar un salón como activo
    if (isCentralRoute) {
      document.title = 'VANESEV Central · Dirección Multi-Sede';
      const existingManifest = document.querySelector("link[rel='manifest']");
      if (existingManifest) existingManifest.remove();
      return;
    }

    // 3. ZONA 3 y 4: Solo cuando existe un salón explícito en la ruta (/m/<slug> o /<slug>/admin)
    if (!activeTenant) return;

    AppStore.setActiveTenant(activeTenant as any);
    refreshData(activeTenant);

    const isAndreaLegacy = activeTenant === 'andrea-nails';
    const salonTheme = getSalonThemeConfig(activeTenant);
    document.title = isAndreaLegacy
      ? 'Andrea Labrador · Nails Studio | Cordero & San Cristóbal'
      : `${salonTheme.salonName} | Reserva Online & Pasaporte VIP`;

    let manifestLink = document.querySelector("link[rel='manifest']") as HTMLLinkElement | null;
    if (!isAdminRoute) {
      if (!manifestLink) {
        manifestLink = document.createElement('link');
        manifestLink.rel = 'manifest';
        document.head.appendChild(manifestLink);
      }
      manifestLink.href = `/api/manifest?tenant=${encodeURIComponent(activeTenant)}`;
    } else if (manifestLink) {
      manifestLink.remove();
    }
  }, [activeTenant, isCentralRoute, isSaasRoute, isAdminRoute]);

  // Listen to browser navigation changes
  useEffect(() => {
    const handleLocationChange = () => {
      const r = resolveInitialRoute();
      setIsCentralRoute(r.isCentral);
      setIsSaasRoute(r.isSaasLanding);
      setActiveTenant(r.tenant);
      setIsAdminRoute(r.isAdmin);

      const path = window.location.pathname.toLowerCase();
      const hash = window.location.hash.toLowerCase();
      const search = new URLSearchParams(window.location.search);
      setIsShareRoute(path.startsWith('/compartir') || hash === '#compartir' || search.has('compartir'));
      setIsPromoRoute(path.startsWith('/promociones') || hash === '#promociones' || search.has('promociones'));
      if (search.get('ref')) {
        setReferralCode(search.get('ref') || '');
      }
    };

    window.addEventListener('popstate', handleLocationChange);
    window.addEventListener('hashchange', handleLocationChange);
    return () => {
      window.removeEventListener('popstate', handleLocationChange);
      window.removeEventListener('hashchange', handleLocationChange);
    };
  }, []);

  const switchToCentral = () => {
    window.history.pushState(null, '', '/central');
    setActiveTenant('');
    setIsCentralRoute(true);
    setIsSaasRoute(false);
    setIsAdminRoute(false);
    setIsShareRoute(false);
    setIsPromoRoute(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const switchToSaasLanding = () => {
    window.history.pushState(null, '', '/');
    setActiveTenant('');
    setIsSaasRoute(true);
    setIsCentralRoute(false);
    setIsAdminRoute(false);
    setIsShareRoute(false);
    setIsPromoRoute(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const switchToTenant = (slug: string, openAdmin = false) => {
    const cleanSlug = (slug || '').trim().toLowerCase();
    if (!cleanSlug) return;
    const url = openAdmin ? `/${cleanSlug}/admin` : `/m/${cleanSlug}`;
    window.history.pushState(null, '', url);
    setActiveTenant(cleanSlug);
    setIsCentralRoute(false);
    setIsSaasRoute(false);
    setIsShareRoute(false);
    setIsPromoRoute(false);
    setIsAdminRoute(openAdmin);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Navigation handlers
  const handleNavigateToShare = () => {
    window.history.pushState(null, '', '/compartir');
    setIsShareRoute(true);
    setIsAdminRoute(false);
    setIsPromoRoute(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleNavigateToPromo = () => {
    window.history.pushState(null, '', '/promociones');
    setIsPromoRoute(true);
    setIsShareRoute(false);
    setIsAdminRoute(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleExitToCatalog = () => {
    const url = activeTenant === 'andrea-nails' ? '/andrea-nails' : `/m/${activeTenant}`;
    window.history.pushState(null, '', url);
    setIsAdminRoute(false);
    setIsShareRoute(false);
    setIsPromoRoute(false);
    setIsCentralRoute(false);
    setIsSaasRoute(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Booking modal triggers
  const handleOpenGeneralBooking = () => {
    setSelectedService(null);
    setSelectedPromo(null);
    setIsBookingOpen(true);
  };

  const handleSelectService = (service: ServiceItem) => {
    setSelectedService(service);
    setSelectedPromo(null);
    setIsBookingOpen(true);
  };

  const handleSelectServiceById = (serviceId: string) => {
    const svc = services.find(s => s.id === serviceId);
    if (svc) {
      setSelectedService(svc);
      setSelectedPromo(null);
      setIsBookingOpen(true);
    } else {
      const el = document.getElementById(`service-${serviceId}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' });
      } else {
        handleOpenGeneralBooking();
      }
    }
  };

  const handleSelectPromo = (promo: PromoOffer) => {
    setSelectedPromo(promo);
    setSelectedService(null);
    setIsBookingOpen(true);
  };

  const lazyFallback = (
    <div className="min-h-screen bg-[#FAF7F2] text-[#1E181A] flex items-center justify-center p-6">
      <div className="text-center space-y-3">
        <div className="w-10 h-10 rounded-full border-2 border-[#9E475B]/25 border-t-[#9E475B] animate-spin mx-auto" />
        <p className="text-[11px] font-bold text-[#9E475B] tracking-[0.22em] uppercase">
          VANESEV &bull; Preparando Experiencia
        </p>
      </div>
    </div>
  );

  // ─── PÁGINA INTERACTIVA: /__tokens (SISTEMA DE TOKENS CIRUELA IMPERIAL) ───
  // ─── PÁGINA INTERACTIVA: /__tokens (SISTEMA DE TOKENS CIRUELA IMPERIAL) ───
  if (isTokensRoute) {
    const isProductionHost =
      window.location.hostname === 'vanesev.com' ||
      window.location.hostname === 'www.vanesev.com';

    if (isProductionHost) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-[#FBFAFC] text-[#24152B] p-6 font-sans">
          <div className="max-w-md text-center">
            <h1 className="text-6xl font-serif font-light mb-4 text-[#5B2A6E]">404</h1>
            <p className="text-lg text-[#6E6478] mb-6">Página no encontrada.</p>
            <a
              href="/"
              className="inline-block px-5 py-2.5 bg-[#5B2A6E] text-white rounded-lg text-sm font-medium hover:bg-[#4A2159] transition-colors"
            >
              Volver al inicio
            </a>
          </div>
        </div>
      );
    }

    return <TokensDesignSystem />;
  }

  // ─── ZONA 2: VANESEV CENTRAL (SUPER-ADMIN COMMAND CENTER FOR KARC0) ───────
  if (isCentralRoute) {
    return (
      <Suspense fallback={lazyFallback}>
        <CentralDashboard
          onNavigateToSaaSLanding={switchToSaasLanding}
          onNavigateToTenant={(slug, openAdmin) => {
            if (openAdmin) {
              setIsAdminAuthenticated(true);
            }
            switchToTenant(slug, Boolean(openAdmin));
          }}
        />
      </Suspense>
    );
  }

  // ─── ZONA 1: WEB COMERCIAL DE VENTA VANESEV (vanesev.com / ?zone=saas) ───
  if (isSaasRoute) {
    return (
      <Suspense fallback={lazyFallback}>
        <VanesevLanding />
      </Suspense>
    );
  }

  const activeSalonTheme = getSalonThemeConfig(activeTenant);

  // ─── ZONA 3: PROTECTED ADMIN PRO V2 DEL SALÓN ACTIVO ──────────────────────
  if (isAdminRoute) {
    if (!isAdminAuthenticated) {
      return (
        <AdminAuthGate
          onAuthenticated={() => {
            setIsAdminAuthenticated(true);
            refreshData(activeTenant);
          }}
          onExit={handleExitToCatalog}
        />
      );
    }

    return (
      <Suspense fallback={lazyFallback}>
        <AdminDashboard
          services={services}
          promos={promos}
          bookings={bookings}
          blockedSlots={blockedSlots}
          exchangeRate={exchangeRate}
          tenantSlug={activeTenant}
          tenantName={activeTenant === 'andrea-nails' ? 'Andrea Labrador Nails Studio' : activeSalonTheme.salonName}
          onRefreshData={() => refreshData(activeTenant)}
          onExitToCatalog={handleExitToCatalog}
          onLogout={() => {
            authClient.signOut().finally(() => {
            setIsAdminAuthenticated(false);
            handleExitToCatalog();
          });
          }}
        />
      </Suspense>
    );
  }

  // --- RENDER DEDICATED SHARE / REFERRAL CLUB PAGE ---
  if (isShareRoute) {
    return (
      <SharePage
        onOpenBooking={handleOpenGeneralBooking}
        onExitToCatalog={handleExitToCatalog}
        exchangeRate={exchangeRate}
      />
    );
  }

  // --- RENDER DEDICATED PROMOTIONS PAGE ---
  if (isPromoRoute) {
    return (
      <div className="min-h-screen flex flex-col bg-warm-100 text-warm-900 font-sans selection:bg-sage-200">
        <PromoPage
          promos={promos}
          services={services}
          exchangeRate={exchangeRate}
          onSelectPromoForBooking={handleSelectPromo}
          onOpenBooking={handleOpenGeneralBooking}
          onExitToCatalog={handleExitToCatalog}
        />
        <BookingModal
          isOpen={isBookingOpen}
          onClose={() => setIsBookingOpen(false)}
          services={services}
          preSelectedService={selectedService}
          preSelectedPromo={selectedPromo}
          exchangeRate={exchangeRate}
          referralCode={referralCode}
          tenantSlug={activeTenant as any}
          tenantName={activeTenant === 'andrea-nails' ? 'Andrea Labrador Nails Studio' : activeSalonTheme.salonName}
          tenantWhatsapp={activeTenant === 'andrea-nails' ? '584241360937' : activeSalonTheme.whatsappPhone}
          onBookingCreated={() => refreshData(activeTenant)}
        />
        <ClientAccountModal
          isOpen={isAccountModalOpen}
          onClose={() => setIsAccountModalOpen(false)}
          onBookNewAppointment={handleOpenGeneralBooking}
        />
        <PWAInstallModal />
      </div>
    );
  }

  // --- RENDER PUBLIC CUSTOMER CATALOG ---
  // Any salon in VANESEV (Capra Studio or any new client created in Central) uses CapraStudioExperience + SalonThemeEngine.
  // Only the external legacy client 'andrea-nails' uses the legacy nail components.
  const isAndreaLegacy = activeTenant === 'andrea-nails';
  const isCapra = !isAndreaLegacy;

  if (isCapra) {
    return (
      <div className="min-h-screen flex flex-col bg-[#FAF7F2] text-[#1E181A] font-sans selection:bg-[#9E475B]/20 selection:text-[#1E181A] overflow-x-hidden">
        <CapraStudioExperience
          services={services}
          exchangeRate={exchangeRate}
          tenantSlug={activeTenant}
          onOpenBooking={(s) => s ? handleSelectService(s) : handleOpenGeneralBooking()}
          onOpenAccountModal={() => setIsAccountModalOpen(true)}
          onOpenAdmin={() => switchToTenant(activeTenant, true)}
        />
        <BookingModal
          isOpen={isBookingOpen}
          onClose={() => setIsBookingOpen(false)}
          preSelectedService={selectedService}
          preSelectedPromo={selectedPromo}
          services={services}
          exchangeRate={exchangeRate}
          referralCode={referralCode}
          tenantSlug={activeTenant as any}
          tenantName={activeSalonTheme.salonName}
          tenantWhatsapp={activeSalonTheme.whatsappPhone || '584247429530'}
          onBookingCreated={() => refreshData(activeTenant)}
          onNavigateToShare={handleNavigateToShare}
        />
        <LegalModals
          activeModal={activeLegalModal}
          onClose={() => setActiveLegalModal(null)}
        />
        <CookieConsentBanner onOpenLegal={(type) => setActiveLegalModal(type)} />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-warm-100 text-warm-900 font-sans selection:bg-sage-200 overflow-x-hidden">
      {/* Sticky Top Header: PWA Install Banner + Client Navbar */}
      <div className="sticky top-0 z-40">
        <PWAInstallModal onOpenClientAccount={() => setIsAccountModalOpen(true)} />
        <Navbar
          onOpenBooking={handleOpenGeneralBooking}
          onOpenClientAccount={() => setIsAccountModalOpen(true)}
          onNavigateToShare={handleNavigateToShare}
          onNavigateToPromo={handleNavigateToPromo}
          exchangeRate={exchangeRate}
        />
      </div>

      {/* Main Public Content Sections */}
      <main className="flex-1 pb-16 sm:pb-0">
        <Hero
          onOpenBooking={handleOpenGeneralBooking}
          onSelectServiceById={handleSelectServiceById}
          gallerySlides={gallerySlides}
        />

        {/* Visual Loyalty & First Visit Banner */}
        <ClubInviteSection onNavigateToShare={handleNavigateToShare} />

        {/* Catálogo Completo de Servicios (Multi-Tenant) */}
        <ServiceCatalog
          services={services}
          exchangeRate={exchangeRate}
          onSelectServiceForBooking={handleSelectService}
          customCategories={isCapra ? CAPRA_CATEGORIES : undefined}
          studioSubtitle={
            isCapra
              ? 'Explora nuestros 6 departamentos especializados y los cursos profesionales certificados de Capra Academy:'
              : undefined
          }
        />

        {/* Tarjeta Digital & Club VIP de Fidelización */}
        <LoyaltyClub
          tenantSlug={activeTenant}
          tenantName={isCapra ? 'Capra Studio · By María Capra' : 'Andrea Labrador Nails Studio'}
        />

        <StudioPolicies tenantSlug={activeTenant} />

        <PaymentMethods tenantSlug={activeTenant} />
      </main>

      {/* Client Footer */}
      <Footer
        onOpenBooking={handleOpenGeneralBooking}
        onNavigateToShare={handleNavigateToShare}
        onOpenLegal={(type) => setActiveLegalModal(type)}
        tenantSlug={activeTenant}
      />

      {/* Sticky Mobile Fast Booking Bar for Clients */}
      <div className="fixed bottom-0 inset-x-0 z-30 p-3 bg-white/95 backdrop-blur-md border-t border-sage-200/80 sm:hidden flex items-center justify-between shadow-luxury">
        <div>
          <span className="text-[10px] uppercase font-bold tracking-wider text-sage-600 block">
            {isCapra ? 'Capra Studio' : 'Agenda Abierta'}
          </span>
          <span className="font-serif font-bold text-sm text-sage-900">
            Citas Disponibles
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsAccountModalOpen(true)}
            className="p-2.5 rounded-full bg-sage-100 text-sage-800"
            title="Mi Ficha VIP"
          >
            <Award className="w-4 h-4 text-amber-600" strokeWidth={1.5} />
          </button>
          <button
            onClick={() => window.dispatchEvent(new CustomEvent('open-pwa-install'))}
            className="p-2.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300 shadow-xs"
            title="Instalar App Oficial"
          >
            <Download className="w-4 h-4 text-amber-700 stroke-[2.5]" />
          </button>
          <a
            href={isCapra ? 'https://wa.me/584247429530' : 'https://wa.me/584241360937'}
            target="_blank"
            rel="noopener noreferrer"
            className="p-2.5 rounded-full bg-emerald-100 text-emerald-800"
            title="WhatsApp Oficial"
          >
            <MessageCircle className="w-4 h-4" />
          </a>
          <button
            onClick={handleOpenGeneralBooking}
            className="px-5 py-2.5 bg-sage-800 text-white rounded-full text-xs font-bold flex items-center gap-1.5 shadow-soft"
          >
            <Calendar className="w-3.5 h-3.5 text-amber-300" />
            <span>Agendar Cita</span>
          </button>
        </div>
      </div>

      {/* Client Booking Modal */}
      <BookingModal
        isOpen={isBookingOpen}
        onClose={() => setIsBookingOpen(false)}
        preSelectedService={selectedService}
        preSelectedPromo={selectedPromo}
        services={services}
        exchangeRate={exchangeRate}
        referralCode={referralCode}
        tenantSlug={activeTenant}
        tenantName={isCapra ? 'Capra Studio' : 'Andrea Labrador Nails Studio'}
        tenantWhatsapp={isCapra ? '584247429530' : '584241360937'}
        onBookingCreated={() => refreshData(activeTenant)}
        onNavigateToShare={handleNavigateToShare}
      />

      {/* Client Account & Loyalty Card Modal */}
      <ClientAccountModal
        isOpen={isAccountModalOpen}
        onClose={() => setIsAccountModalOpen(false)}
        onBookNewAppointment={handleOpenGeneralBooking}
      />

      {/* Cookie Consent Banner */}
      <CookieConsentBanner onOpenLegal={(type) => setActiveLegalModal(type)} />

      {/* Legal Modals */}
      <LegalModals activeModal={activeLegalModal} onClose={() => setActiveLegalModal(null)} />
    </div>
  );
};

export default App;
