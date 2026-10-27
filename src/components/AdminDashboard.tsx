import React, { useState, useRef, useMemo } from 'react';
import { 
  ServiceItem, 
  AppointmentBooking, 
  BlockedTimeSlot,
  LoyaltyCard,
  GallerySlide
} from '../types';
import { AppStore, StudioEmailSettings } from '../services/store';
import { authClient } from '../lib/authClient';
import { 
  Wrench,
  KeyRound,
  LayoutDashboard, 
  Calendar, 
  Sparkles, 
  DollarSign, 
  Download, 
  Upload, 
  Check, 
  Trash2, 
  MessageCircle, 
  RefreshCw,
  ExternalLink,
  Phone,
  Edit2,
  CheckCircle2,
  XCircle,
  Menu,
  X,
  ImagePlus,
  Image as ImageIcon,
  Users,
  Mail,
  Plus,
  Clock,
  Award,
  Search,
  Send,
  Copy,
  AlertTriangle,
  Globe,
  Settings,
  LogOut,
  BarChart3,
  FileText,
  Printer,
  TrendingUp,
  UserCheck,
  UserX,
  HelpCircle,
  Filter,
  ShieldCheck,
  Shield,
  UserPlus,
  Lock,
  Briefcase,
  QrCode,
  Palette
} from 'lucide-react';
import { motion } from 'framer-motion';
import { InstagramIcon } from './Icons';
import { DynamicQrManager } from './DynamicQrManager';
import { SalonThemeStudio } from './SalonThemeStudio';
import { getSalonThemeConfig, getPaletteById } from '../utils/salonThemeEngine';

interface AdminDashboardProps {
  services: ServiceItem[];
  promos?: unknown[];
  bookings: AppointmentBooking[];
  blockedSlots: BlockedTimeSlot[];
  exchangeRate: number;
  tenantSlug?: string;
  tenantName?: string;
  onRefreshData: () => void;
  onExitToCatalog: () => void;
  onLogout?: () => void;
}

type TabKey = 'overview' | 'bookings' | 'theme' | 'services' | 'team' | 'qr' | 'crm' | 'analytics' | 'calendar' | 'gallery' | 'settings' | 'puesta_a_punto';

const NAV_ITEMS: { key: TabKey; label: string; shortLabel: string; subtitle: string; Icon: React.FC<{ className?: string }> }[] = [
  { key: 'overview',  label: 'Panel & Programa VIP',     shortLabel: 'Overview',  subtitle: 'Supervisa facturación, metas operativas, módulos activos y reservas en tiempo real.', Icon: LayoutDashboard },
  { key: 'bookings',  label: 'Agenda & Reservas',        shortLabel: 'Agenda',    subtitle: 'Gestiona turnos confirmados, solicitudes en WhatsApp y citas presenciales.',          Icon: Calendar },
  { key: 'services',  label: 'Catálogo de Servicios',    shortLabel: 'Servicios', subtitle: 'Administra precios en USD/Bs., tiempos de sillón y fotografías editoriales.',        Icon: Sparkles },
  { key: 'theme',     label: 'Diseño & Identidad',       shortLabel: 'Diseño',    subtitle: 'Personaliza en vivo la paleta de colores, tipografía y tarjetas de tu carta QR.',   Icon: Palette },
  { key: 'crm',       label: 'Programa de Fidelidad',    shortLabel: 'Programa',  subtitle: 'Controla sellos acumulados en el Pasaporte VIP y recompensas de clientas.',         Icon: Award },
  { key: 'team',      label: 'Equipo & Cabinas',         shortLabel: 'Equipo',    subtitle: 'Configura especialistas, comisiones pactadas y capacidad por área o cabina.',       Icon: ShieldCheck },
  { key: 'qr',        label: 'Motor QR de Recepción',    shortLabel: 'QR Studio', subtitle: 'Descarga tu código QR oficial para tocadores, espejos, recepción e Instagram.',     Icon: QrCode },
  { key: 'analytics', label: 'Reportes & Finanzas',      shortLabel: 'Reportes',  subtitle: 'Analítica de ingresos, balance de comisiones y exportación contable.',              Icon: BarChart3 },
  { key: 'calendar',  label: 'Horarios & Bloqueos',      shortLabel: 'Horarios',  subtitle: 'Bloquea días festivos, horas de almuerzo o cabinas en mantenimiento.',              Icon: Clock },
  { key: 'gallery',   label: 'Galería Editorial',        shortLabel: 'Galería',   subtitle: 'Actualiza el portafolio visual de trabajos reales de tu estudio.',                  Icon: ImageIcon },
  { key: 'settings',  label: 'Tasa BCV & Ajustes',       shortLabel: 'Ajustes',   subtitle: 'Sincroniza la tasa oficial BCV del día y descarga respaldos de seguridad.',         Icon: Settings },
  { key: 'puesta_a_punto', label: 'Puesta a punto', shortLabel: 'Puesta a punto', subtitle: 'Envía solicitudes de cambio y consulta el historial permanente de tu salón.', Icon: Wrench },
];

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  services,
  bookings,
  blockedSlots,
  exchangeRate,
  tenantSlug = 'capra-studio',
  tenantName = 'Capra Studio',
  onRefreshData,
  onExitToCatalog,
  onLogout,
}) => {
  const [activeTab, setActiveTab] = useState<TabKey>('overview');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [overviewTier, setOverviewTier] = useState<'silver' | 'gold' | 'platinum'>('gold');
  const salonTheme = getSalonThemeConfig(tenantSlug);
  const salonPalette = getPaletteById(salonTheme.paletteId);

  // ─── LIVE STAFF & STUDIO ZONES (NEON DB) ──────────────────────────────────
  const [dbStaff, setDbStaff] = useState<any[]>([]);
  const [dbZones, setDbZones] = useState<any[]>([]);
  const [isLoadingTeamDb, setIsLoadingTeamDb] = useState(false);
  const [enPrueba, setEnPrueba] = useState(false);
  const [peticiones, setPeticiones] = useState<any[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);

  const [solicitudTexto, setSolicitudTexto] = useState('');
  const [solicitudQuiereLlamada, setSolicitudQuiereLlamada] = useState(false);
  const [enviandoSolicitud, setEnviandoSolicitud] = useState(false);
  const [solicitudError, setSolicitudError] = useState<string | null>(null);
  const [solicitudSuccess, setSolicitudSuccess] = useState<string | null>(null);

  const [showActivarModal, setShowActivarModal] = useState(false);
  const [activarPaso, setActivarPaso] = useState<1 | 2>(1);
  const [activarCorreo, setActivarCorreo] = useState('');
  const [activarCodigo, setActivarCodigo] = useState('');
  const [activarContrasena, setActivarContrasena] = useState('');
  const [activarConfirmContrasena, setActivarConfirmContrasena] = useState('');
  const [activarLoading, setActivarLoading] = useState(false);
  const [activarError, setActivarError] = useState<string | null>(null);
  const [activarSuccess, setActivarSuccess] = useState<string | null>(null);

  React.useEffect(() => {
    authClient.getSession().then((res: any) => {
      if (res?.data?.user) {
        setCurrentUser(res.data.user);
      }
    }).catch(() => {});
  }, []);
  const [newZoneName, setNewZoneName] = useState('');
  const [newZoneCapacity, setNewZoneCapacity] = useState('1');
  const [newZoneColor, setNewZoneColor] = useState('#C5A059');

  const fetchTenantTeamAndZones = async () => {
    setIsLoadingTeamDb(true);
    try {
      const res = await fetch(`/api/team?tenant=${encodeURIComponent(tenantSlug)}`);
      if (res.ok) {
        const json = await res.json();
        if (Array.isArray(json.staff)) setDbStaff(json.staff);
        if (Array.isArray(json.zones)) setDbZones(json.zones);
        if (Array.isArray(json.peticiones)) setPeticiones(json.peticiones);
        if (typeof json.enPrueba === 'boolean') setEnPrueba(json.enPrueba);
      }
    } catch {
      // Fallback silencioso
    } finally {
      setIsLoadingTeamDb(false);
    }
  };

  React.useEffect(() => {
    fetchTenantTeamAndZones();
  }, [tenantSlug]);

  const handleSaveStaffToDb = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!collaboratorForm.name.trim()) return;
    setIsLoadingTeamDb(true);
    try {
      await fetch('/api/team', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'upsert_staff',
          tenantId: tenantSlug,
          name: collaboratorForm.name,
          roleTitle: collaboratorForm.role === 'admin' ? 'Directora / Master' : collaboratorForm.role === 'recepcion' ? 'Recepción & Front-Desk' : 'Especialista Senior',
          specialtyTags: collaboratorForm.specialty.split(',').map(s => s.trim()),
          phone: collaboratorForm.phone,
          commissionPercent: Number(collaboratorForm.commissionPercent || 50),
        }),
      });
      setCollaboratorForm({
        name: '',
        phone: '',
        role: 'colaboradora',
        specialty: 'Manicura Rusa & Rubber',
        commissionPercent: '50',
        schedule: 'Lunes a Sábado · Turno Completo',
      });
      setIsInviteModalOpen(false);
      await fetchTenantTeamAndZones();
    } finally {
      setIsLoadingTeamDb(false);
    }
  };

  const handleDeleteStaffFromDb = async (id: string) => {
    setIsLoadingTeamDb(true);
    try {
      await fetch(`/api/team?type=staff&id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
      });
      await fetchTenantTeamAndZones();
    } finally {
      setIsLoadingTeamDb(false);
    }
  };

  const handleSaveZoneToDb = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newZoneName.trim()) return;
    setIsLoadingTeamDb(true);
    try {
      await fetch('/api/team', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'upsert_zone',
          tenantId: tenantSlug,
          name: newZoneName,
          capacity: Number(newZoneCapacity || 1),
        }),
      });
      setNewZoneName('');
      setNewZoneCapacity('1');
      await fetchTenantTeamAndZones();
    } finally {
      setIsLoadingTeamDb(false);
    }
  };

  const handleDeleteZoneFromDb = async (id: string) => {
    setIsLoadingTeamDb(true);
    try {
      await fetch(`/api/team?type=zone&id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
      });
      await fetchTenantTeamAndZones();
    } finally {
      setIsLoadingTeamDb(false);
    }
  };

  const handleEnviarSolicitud = async (e: React.FormEvent) => {
    e.preventDefault();
    setSolicitudError(null);
    setSolicitudSuccess(null);
    if (solicitudTexto.trim().length < 10) {
      setSolicitudError('El texto debe tener al menos 10 caracteres.');
      return;
    }
    if (solicitudTexto.trim().length > 3000) {
      setSolicitudError('El texto no puede superar los 3.000 caracteres.');
      return;
    }
    setEnviandoSolicitud(true);
    try {
      const res = await fetch('/api/team', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'solicitud_cambios',
          tenantId: tenantSlug,
          texto: solicitudTexto.trim(),
          quiereLlamada: solicitudQuiereLlamada,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setSolicitudError(data.error || 'Error al enviar la solicitud.');
        return;
      }
      setSolicitudSuccess('Solicitud enviada correctamente. El equipo técnico la revisará y actualizará su estado.');
      setSolicitudTexto('');
      setSolicitudQuiereLlamada(false);
      await fetchTenantTeamAndZones();
    } catch (err: any) {
      setSolicitudError(err?.message || 'Error de conexión.');
    } finally {
      setEnviandoSolicitud(false);
    }
  };

  const handleEnviarCodigoActivacion = async (e: React.FormEvent) => {
    e.preventDefault();
    setActivarError(null);
    setActivarSuccess(null);
    if (!activarCorreo.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(activarCorreo.trim())) {
      setActivarError('Introduce un correo electrónico válido.');
      return;
    }
    setActivarLoading(true);
    try {
      const res = await fetch('/api/team', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'activar_cuenta_codigo',
          tenantId: tenantSlug,
          correo: activarCorreo.trim().toLowerCase(),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setActivarError(data.error || 'Error al solicitar el código.');
        return;
      }
      setActivarSuccess('Código de 6 dígitos enviado por correo. Revisa tu bandeja de entrada.');
      setActivarPaso(2);
    } catch (err: any) {
      setActivarError(err?.message || 'Error de conexión.');
    } finally {
      setActivarLoading(false);
    }
  };

  const handleActivarCuenta = async (e: React.FormEvent) => {
    e.preventDefault();
    setActivarError(null);
    setActivarSuccess(null);
    if (activarCodigo.trim().length !== 6) {
      setActivarError('El código debe tener 6 dígitos.');
      return;
    }
    if (activarContrasena.length < 12) {
      setActivarError('La nueva contraseña debe tener al menos 12 caracteres.');
      return;
    }
    if (activarContrasena !== activarConfirmContrasena) {
      setActivarError('Las contraseñas no coinciden.');
      return;
    }
    setActivarLoading(true);
    try {
      const res = await fetch('/api/team', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'activar_cuenta',
          tenantId: tenantSlug,
          correo: activarCorreo.trim().toLowerCase(),
          codigo: activarCodigo.trim(),
          nuevaContrasena: activarContrasena,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setActivarError(data.error || 'Error al activar la cuenta.');
        return;
      }
      setActivarSuccess('¡Cuenta activada con éxito! Cerrando sesión para que inicies con tus nuevas credenciales...');
      setTimeout(async () => {
        try {
          await authClient.signOut();
        } finally {
          if (onLogout) {
            onLogout();
          } else {
            window.location.reload();
          }
        }
      }, 2000);
    } catch (err: any) {
      setActivarError(err?.message || 'Error de conexión.');
    } finally {
      setActivarLoading(false);
    }
  };

  // ─── CALENDAR STATE ───────────────────────────────────────────────────────
  const [calendarDate, setCalendarDate] = useState<string>(() => {
    const today = new Date();
    today.setDate(today.getDate() + 1);
    return today.toISOString().split('T')[0];
  });
  const [allTimeSlots, setAllTimeSlots] = useState<string[]>(() => AppStore.getTimeSlots());
  const [newCustomSlot, setNewCustomSlot] = useState('');
  const [openingTime, setOpeningTime] = useState('09:00 AM');
  const [closingTime, setClosingTime] = useState('07:00 PM');

  // ─── SERVICE EDITOR / CREATOR STATE ───────────────────────────────────────
  const [editingService, setEditingService] = useState<ServiceItem | null>(null);
  const [isCreatingService, setIsCreatingService] = useState(false);
  const [serviceImagePreview, setServiceImagePreview] = useState<string | null>(null);
  const serviceImageRef = useRef<HTMLInputElement>(null);

  const [serviceForm, setServiceForm] = useState<Partial<ServiceItem>>({
    name: '',
    category: 'natural',
    priceUSD: 10,
    durationMinutes: 60,
    shortDescription: '',
    fullDescription: '',
    badgeText: 'Clásico',
    badgeColor: 'bg-sage-800',
    imageUrl: '/images/esmaltado-semipermanente.png',
    isAvailable: true,
    tags: ['Uña natural', 'Brillo intacto'],
  });

  // ─── GALLERY / CAROUSEL STATE ───────────────────────────────────────────
  const [gallerySlides, setGallerySlides] = useState<GallerySlide[]>(() => AppStore.getGallery());
  const [newSlideName, setNewSlideName] = useState('');
  const [newSlideTag, setNewSlideTag] = useState('Diseño Real');
  const [newSlideImage, setNewSlideImage] = useState<string | null>(null);
  const [galleryError, setGalleryError] = useState<string | null>(null);
  const [gallerySuccess, setGallerySuccess] = useState<string | null>(null);
  const [isUploadingSlide, setIsUploadingSlide] = useState(false);

  // ─── CRM & CLIENTS STATE ──────────────────────────────────────────────────
  const [crmSearch, setCrmSearch] = useState('');
  const [emailModalClient, setEmailModalClient] = useState<{
    name: string;
    phone: string;
    email?: string;
    stamps: number;
    lastBooking?: AppointmentBooking;
  } | null>(null);
  const [emailTemplate, setEmailTemplate] = useState<'confirmation' | 'reminder' | 'loyalty_prize'>('confirmation');
  const [emailCopySuccess, setEmailCopySuccess] = useState(false);

  // ─── ARSYS WEBMAIL CONFIG ─────────────────────────────────────────────────
  const [emailSettings, setEmailSettings] = useState<StudioEmailSettings>(() => AppStore.getEmailSettings());
  const [emailSettingsSaved, setEmailSettingsSaved] = useState(false);

  // ─── AGENDAMIENTO MANUAL DE CITAS ─────────────────────────────────────────
  const [isManualBookingOpen, setIsManualBookingOpen] = useState(false);
  const [manualClientName, setManualClientName] = useState('');
  const [manualClientPhone, setManualClientPhone] = useState('');
  const [manualClientInstagram, setManualClientInstagram] = useState('');
  const [manualServiceId, setManualServiceId] = useState<string>(services[0]?.id || '');
  const [manualDate, setManualDate] = useState<string>(() => {
    const d = new Date();
    return d.toISOString().split('T')[0];
  });
  const [manualTimeSlot, setManualTimeSlot] = useState<string>('10:00 AM');
  const [manualPaymentMethod, setManualPaymentMethod] = useState<'pago_movil' | 'efectivo' | 'binance'>('pago_movil');
  const [manualIsFirstVisit, setManualIsFirstVisit] = useState(false);
  const [manualNotes, setManualNotes] = useState('');
  const [manualStatus, setManualStatus] = useState<'confirmada' | 'en_whatsapp'>('confirmada');
  const [manualBookingSubmitting, setManualBookingSubmitting] = useState(false);
  const [manualBookingError, setManualBookingError] = useState<string | null>(null);
  const [manualBookingSuccess, setManualBookingSuccess] = useState<string | null>(null);

  // ─── EQUIPO & ROLES (PLAN PRO) ────────────────────────────────────────────
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [inviteProNotice, setInviteProNotice] = useState(false);
  const [collaboratorForm, setCollaboratorForm] = useState({
    name: '',
    phone: '',
    role: 'colaboradora',
    specialty: 'Manicura Rusa & Rubber',
    commissionPercent: '50',
    schedule: 'Lunes a Sábado · Turno Mañana',
  });

  // ─── SETTINGS & EXCHANGE RATE ─────────────────────────────────────────────
  const [currentRate, setCurrentRate] = useState(exchangeRate.toString());
  const [rateSavedMessage, setRateSavedMessage] = useState(false);
  const [bookingFilterStatus, setBookingFilterStatus] = useState('all');

  // ─── DERIVED STATS ────────────────────────────────────────────────────────
  const totalBookingsCount = bookings.length;
  const enWhatsAppCount = bookings.filter(b => b.status === 'en_whatsapp' || b.status === 'pendiente').length;
  const confirmedCount = bookings.filter(b => b.status === 'confirmada').length;
  const completedCount = bookings.filter(b => b.status === 'completada').length;
  const noShowCount = bookings.filter(b => b.status === 'no_asistio').length;
  const cancelledCount = bookings.filter(b => b.status === 'cancelada').length;
  const totalRevenueUSD = bookings
    .filter(b => b.status === 'completada' || b.status === 'confirmada')
    .reduce((acc, b) => acc + b.totalPriceUSD, 0);

  const filteredBookings = bookings.filter(b => {
    if (bookingFilterStatus === 'all') return true;
    if (bookingFilterStatus === 'en_whatsapp') return b.status === 'en_whatsapp' || b.status === 'pendiente';
    return b.status === bookingFilterStatus;
  });

  // Consolidated client list derived from bookings and loyalty store
  const loyaltyCards = AppStore.getLoyaltyCards();
  const clientsList = useMemo(() => {
    const map = new Map<string, {
      phone: string;
      name: string;
      instagram?: string;
      bookingsCount: number;
      lastVisit: string;
      stampsCount: number;
      hasFreeService: boolean;
      lastBooking?: AppointmentBooking;
    }>();

    // From loyalty cards
    Object.values(loyaltyCards).forEach(card => {
      map.set(card.phone, {
        phone: card.phone,
        name: card.clientName,
        bookingsCount: 0,
        lastVisit: card.lastVisit || 'Sin fecha',
        stampsCount: card.stampsCount,
        hasFreeService: card.stampsCount >= 5,
      });
    });

    // Merge bookings data
    bookings.forEach(b => {
      const normPhone = b.clientPhone.replace(/\D/g, '');
      const existing = map.get(normPhone);
      if (existing) {
        existing.bookingsCount += 1;
        if (!existing.instagram && b.clientInstagram) existing.instagram = b.clientInstagram;
        if (!existing.lastBooking) existing.lastBooking = b;
      } else {
        map.set(normPhone, {
          phone: normPhone,
          name: b.clientName,
          instagram: b.clientInstagram,
          bookingsCount: 1,
          lastVisit: b.date,
          stampsCount: Math.min(5, 1),
          hasFreeService: false,
          lastBooking: b,
        });
      }
    });

    const list = Array.from(map.values());
    if (!crmSearch.trim()) return list;
    const q = crmSearch.toLowerCase();
    return list.filter(c => c.name.toLowerCase().includes(q) || c.phone.includes(q) || (c.instagram && c.instagram.toLowerCase().includes(q)));
  }, [loyaltyCards, bookings, crmSearch]);

  // Day occupancy for calendar view
  const isSelectedDayBlocked = AppStore.isDayEntirelyBlocked(calendarDate);
  const bookingsOnSelectedDate = bookings.filter(b => b.date === calendarDate);

  // ─── HANDLERS ─────────────────────────────────────────────────────────────
  const navigate = (tab: TabKey) => {
    setActiveTab(tab);
    setSidebarOpen(false);
  };

  const handleUpdateStatus = (id: string, status: AppointmentBooking['status']) => { 
    AppStore.updateBookingStatusRemote(id, status); 
    onRefreshData(); 
  };

  // ─── AGENDAMIENTO MANUAL HANDLERS ─────────────────────────────────────────
  const handleOpenManualBooking = (date?: string, slot?: string) => {
    if (date) setManualDate(date);
    if (slot) setManualTimeSlot(slot);
    setManualBookingError(null);
    setManualBookingSuccess(null);
    setIsManualBookingOpen(true);
  };

  const handleCreateManualBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    setManualBookingError(null);
    setManualBookingSuccess(null);

    const cleanName = manualClientName.trim();
    const cleanPhone = manualClientPhone.trim().replace(/\D/g, '');

    if (!cleanName) {
      setManualBookingError('Por favor ingresa el nombre de la clienta.');
      return;
    }
    if (cleanPhone.length < 7) {
      setManualBookingError('Por favor ingresa un número de teléfono válido (mínimo 7 dígitos).');
      return;
    }
    if (!manualDate || !manualTimeSlot) {
      setManualBookingError('Por favor selecciona fecha y horario.');
      return;
    }

    const selectedService = services.find(s => s.id === manualServiceId) || services[0];
    if (!selectedService) {
      setManualBookingError('Servicio no encontrado.');
      return;
    }

    const isOccupied = AppStore.isSlotOccupied(manualDate, manualTimeSlot);
    if (isOccupied) {
      const confirmForce = window.confirm(
        `El turno de las ${manualTimeSlot} del día ${manualDate} ya se encuentra ocupado o bloqueado. ¿Deseas forzar el agendamiento manual de todas formas?`
      );
      if (!confirmForce) return;
    }

    setManualBookingSubmitting(true);

    const discountUSD = manualIsFirstVisit ? 2.00 : 0.00;
    const finalPriceUSD = Math.max(0, selectedService.priceUSD - discountUSD);
    const bookingId = 'cita_manual_' + Date.now();

    const rawInstagram = manualClientInstagram.replace('@', '').trim();

    const newBooking: AppointmentBooking = {
      id: bookingId,
      clientName: cleanName,
      clientPhone: cleanPhone,
      clientInstagram: rawInstagram || undefined,
      serviceId: selectedService.id,
      serviceName: selectedService.name,
      servicePriceUSD: selectedService.priceUSD,
      selectedAddons: [],
      totalPriceUSD: finalPriceUSD,
      date: manualDate,
      timeSlot: manualTimeSlot,
      paymentMethod: manualPaymentMethod,
      isFirstVisit: manualIsFirstVisit,
      notes: manualNotes ? `[Cita Manual / Recepción] ${manualNotes}` : '[Cita Manual / Recepción]',
      status: manualStatus,
      createdAt: new Date().toISOString(),
      discountUSD,
    };

    try {
      const res = await AppStore.createBookingRemote(newBooking);
      if (res.success) {
        setManualBookingSuccess(`¡Cita agendada con éxito para ${cleanName}!`);
        onRefreshData();
        setTimeout(() => {
          setManualClientName('');
          setManualClientPhone('');
          setManualClientInstagram('');
          setManualNotes('');
          setIsManualBookingOpen(false);
          setManualBookingSuccess(null);
        }, 1200);
      } else {
        setManualBookingError(res.error || 'Error al agendar la cita.');
      }
    } catch (err: any) {
      setManualBookingError('Guardado en modo local.');
      onRefreshData();
    } finally {
      setManualBookingSubmitting(false);
    }
  };

  const handleOpenInviteModal = () => {
    setInviteProNotice(false);
    setIsInviteModalOpen(true);
  };

  const handleSaveCollaboratorMock = (e: React.FormEvent) => {
    e.preventDefault();
    setInviteProNotice(true);
  };

  const [rescheduleBookingTarget, setRescheduleBookingTarget] = useState<AppointmentBooking | null>(null);
  const [rescheduleNewDate, setRescheduleNewDate] = useState('');
  const [rescheduleNewTime, setRescheduleNewTime] = useState('');
  const [rescheduleSubmitting, setRescheduleSubmitting] = useState(false);
  const [rescheduleError, setRescheduleError] = useState<string | null>(null);

  const handleOpenReschedule = (b: AppointmentBooking) => {
    setRescheduleBookingTarget(b);
    setRescheduleNewDate(b.date);
    setRescheduleNewTime(b.timeSlot);
    setRescheduleError(null);
  };

  const handleConfirmReschedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rescheduleBookingTarget || !rescheduleNewDate || !rescheduleNewTime) return;
    setRescheduleSubmitting(true);
    setRescheduleError(null);

    const res = await AppStore.rescheduleBookingRemote(
      rescheduleBookingTarget.id,
      rescheduleNewDate,
      rescheduleNewTime
    );
    setRescheduleSubmitting(false);

    if (!res.success) {
      setRescheduleError(res.error || 'El horario seleccionado no está disponible en la agenda.');
      return;
    }

    setRescheduleBookingTarget(null);
    onRefreshData();
  };

  // ─── POST-SERVICIO & GESTIÓN DE CIERRE DE CITA ────────────────────────────
  const [completeModalBooking, setCompleteModalBooking] = useState<AppointmentBooking | null>(null);
  const [noShowModalBooking, setNoShowModalBooking] = useState<AppointmentBooking | null>(null);
  const [cancellationModalBooking, setCancellationModalBooking] = useState<AppointmentBooking | null>(null);
  const [cancellationReasonType, setCancellationReasonType] = useState('aviso_previo');
  const [cancellationCustomNote, setCancellationCustomNote] = useState('');

  const isAndreaLegacy = tenantSlug === 'andrea-nails';
  const isCapraTenant = !isAndreaLegacy;
  const tenantInitials = isAndreaLegacy
    ? 'AL'
    : (salonTheme.salonName || tenantName)
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map(w => w[0]?.toUpperCase() || '')
        .join('') || 'VS';
  const tenantRewardLabel = isAndreaLegacy
    ? 'Depilación de Cejas 100% de cortesía'
    : (salonTheme.loyaltyRewardTitle || 'Tratamiento VIP de Cortesía');

  const handleConfirmCompletion = async (notifyWhatsApp = false) => {
    if (!completeModalBooking) return;
    const b = completeModalBooking;
    await AppStore.updateBookingStatusRemote(b.id, 'completada');
    setCompleteModalBooking(null);
    onRefreshData();

    if (notifyWhatsApp) {
      const cleanPhone = b.clientPhone.replace(/\D/g, '');
      const waMsg = `¡Hola ${b.clientName}! ✨\n\nTu servicio de *${b.serviceName}* ha sido registrado como *Culminado con Éxito* hoy en ${tenantName}.\n\n✨ Hemos acreditado tu sello VIP en tu Pasaporte Digital de Fidelidad.\nRecuerda que al completar 5 visitas, ¡tu ${tenantRewardLabel} corre por cuenta de la casa!\n\n¡Gracias por preferirnos, te esperamos pronto!`;
      window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(waMsg)}`, '_blank');
    }
  };

  const handleConfirmNoShow = async (notifyWhatsApp = true) => {
    if (!noShowModalBooking) return;
    const b = noShowModalBooking;
    await AppStore.updateBookingStatusRemote(b.id, 'no_asistio', 'Clienta no asistió a su cita');
    setNoShowModalBooking(null);
    onRefreshData();

    if (notifyWhatsApp) {
      const cleanPhone = b.clientPhone.replace(/\D/g, '');
      const waMsg = `¡Hola ${b.clientName}! ✨\n\nTe estuvimos esperando hoy para tu cita de *${b.serviceName}* en ${tenantName}.\n\nAvísanos cuando tengas disponibilidad y con todo el gusto reprogramamos tu turno en agenda.`;
      window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(waMsg)}`, '_blank');
    }
  };

  const handleConfirmCancellation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cancellationModalBooking) return;
    const reasonsMap: Record<string, string> = {
      aviso_previo: 'Aviso previo de la clienta (reprogramación voluntaria)',
      emergencia: 'Emergencia personal / médica',
      no_respondio: 'No respondió en WhatsApp / Desistió',
      fuerza_mayor: 'Fuerza mayor / Ajuste de agenda del salón',
      otro: cancellationCustomNote.trim() || 'Cancelada por mutuo acuerdo',
    };
    const finalReason = reasonsMap[cancellationReasonType] || cancellationCustomNote || 'Cancelada';
    await AppStore.updateBookingStatusRemote(cancellationModalBooking.id, 'cancelada', finalReason);
    setCancellationModalBooking(null);
    onRefreshData();
  };

  // ─── ANALÍTICA, FACTURACIÓN & REPORTES CONTABLES ──────────────────────────
  const [analyticsPeriod, setAnalyticsPeriod] = useState<'today' | 'yesterday' | '7days' | '15days' | 'month' | 'all' | 'custom'>('7days');
  const [analyticsStartDate, setAnalyticsStartDate] = useState('');
  const [analyticsEndDate, setAnalyticsEndDate] = useState('');

  const analyticsBookings = useMemo(() => {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    return bookings.filter(b => {
      if (!b.date) return false;
      if (analyticsPeriod === 'today') return b.date === todayStr;
      if (analyticsPeriod === 'yesterday') {
        const y = new Date(now);
        y.setDate(y.getDate() - 1);
        return b.date === y.toISOString().split('T')[0];
      }
      if (analyticsPeriod === '7days') {
        const limit = new Date(now);
        limit.setDate(limit.getDate() - 7);
        return b.date >= limit.toISOString().split('T')[0];
      }
      if (analyticsPeriod === '15days') {
        const limit = new Date(now);
        limit.setDate(limit.getDate() - 15);
        return b.date >= limit.toISOString().split('T')[0];
      }
      if (analyticsPeriod === 'month') {
        const limit = new Date(now);
        limit.setDate(limit.getDate() - 30);
        return b.date >= limit.toISOString().split('T')[0];
      }
      if (analyticsPeriod === 'custom') {
        if (analyticsStartDate && b.date < analyticsStartDate) return false;
        if (analyticsEndDate && b.date > analyticsEndDate) return false;
        return true;
      }
      return true;
    });
  }, [bookings, analyticsPeriod, analyticsStartDate, analyticsEndDate]);

  const analyticsCompleted = analyticsBookings.filter(b => b.status === 'completada');
  const analyticsNoShow = analyticsBookings.filter(b => b.status === 'no_asistio');
  const analyticsCancelled = analyticsBookings.filter(b => b.status === 'cancelada');
  const analyticsTotalRevenueUSD = analyticsCompleted.reduce((acc, b) => acc + (Number(b.totalPriceUSD) || 0), 0);
  const analyticsTotalRevenueVES = analyticsTotalRevenueUSD * exchangeRate;
  const analyticsAvgTicketUSD = analyticsCompleted.length > 0 ? analyticsTotalRevenueUSD / analyticsCompleted.length : 0;
  const analyticsTotalProcessed = analyticsCompleted.length + analyticsNoShow.length + analyticsCancelled.length;
  const analyticsAttendanceRate = analyticsTotalProcessed > 0 ? Math.round((analyticsCompleted.length / analyticsTotalProcessed) * 100) : 100;

  const handlePrintReportPDF = () => {
    const printWin = window.open('', '_blank');
    if (!printWin) {
      alert('Por favor habilita las ventanas emergentes en tu navegador para generar el reporte contable PDF.');
      return;
    }

    const periodLabels: Record<string, string> = {
      today: 'Hoy',
      yesterday: 'Ayer',
      '7days': 'Últimos 7 Días (Semanal)',
      '15days': 'Últimos 15 Días (Quincenal)',
      month: 'Últimos 30 Días (Mensual)',
      all: 'Histórico Completo',
      custom: `Desde ${analyticsStartDate || 'Inicio'} hasta ${analyticsEndDate || 'Hoy'}`
    };
    const periodLabel = periodLabels[analyticsPeriod] || 'Período Contable';

    const rowsHtml = analyticsBookings.map((b, i) => `
      <tr style="border-bottom: 1px solid #e5e7eb; font-size: 11px;">
        <td style="padding: 8px 6px;">${i + 1}</td>
        <td style="padding: 8px 6px; font-weight: bold;">${b.date}</td>
        <td style="padding: 8px 6px;">${b.timeSlot}</td>
        <td style="padding: 8px 6px; font-weight: 600;">${b.clientName}<br/><span style="color: #6b7280; font-size: 10px;">${b.clientPhone}</span></td>
        <td style="padding: 8px 6px;">${b.serviceName}</td>
        <td style="padding: 8px 6px; text-transform: capitalize;">${b.paymentMethod.replace('_', ' ')}</td>
        <td style="padding: 8px 6px; font-weight: bold; text-align: right; color: #166534;">$${b.totalPriceUSD.toFixed(2)}</td>
        <td style="padding: 8px 6px; text-align: right; color: #4b5563;">Bs. ${(b.totalPriceUSD * exchangeRate).toFixed(0)}</td>
        <td style="padding: 8px 6px; text-align: center;">
          <span style="display: inline-block; padding: 2px 6px; border-radius: 9999px; font-size: 9px; font-weight: bold; text-transform: uppercase; ${
            b.status === 'completada' ? 'background: #dcfce7; color: #166534;' :
            b.status === 'confirmada' ? 'background: #e0f2fe; color: #075985;' :
            b.status === 'no_asistio' ? 'background: #fef3c7; color: #92400e;' :
            b.status === 'cancelada' ? 'background: #ffe4e6; color: #9f1239;' :
            'background: #fef3c7; color: #78350f;'
          }">${b.status === 'no_asistio' ? 'No Asistió' : b.status}</span>
          ${b.notes && b.notes.includes('[Cancelación:') ? `<br/><span style="font-size: 9px; color: #9f1239;">${b.notes.split('[Cancelación:')[1].replace(']', '')}</span>` : ''}
        </td>
      </tr>
    `).join('');

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8"/>
        <title>Reporte_Contable_${periodLabel.replace(/\\s+/g, '_')}_${tenantSlug}</title>
        <style>
          @page { size: A4 portrait; margin: 12mm 15mm; }
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1f2937; margin: 0; padding: 10px; }
          .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #16291F; padding-bottom: 12px; margin-bottom: 16px; }
          .logo { font-size: 20px; font-weight: 800; color: #16291F; letter-spacing: 0.5px; }
          .subtitle { font-size: 11px; color: #4b5563; text-transform: uppercase; letter-spacing: 1px; }
          .meta { text-align: right; font-size: 11px; color: #4b5563; }
          .kpi-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 18px; }
          .kpi-card { border: 1px solid #e5e7eb; border-radius: 8px; padding: 10px; background: #fafafa; }
          .kpi-title { font-size: 10px; font-weight: 700; text-transform: uppercase; color: #6b7280; }
          .kpi-val { font-size: 18px; font-weight: 800; color: #111827; margin-top: 4px; }
          .kpi-sub { font-size: 10px; color: #059669; font-weight: 600; }
          table { width: 100%; border-collapse: collapse; margin-top: 10px; }
          th { background: #16291F; color: white; font-size: 10px; text-transform: uppercase; padding: 8px 6px; text-align: left; }
          .footer { margin-top: 24px; border-top: 1px solid #e5e7eb; padding-top: 10px; font-size: 10px; color: #9ca3af; display: flex; justify-content: space-between; }
          @media print {
            body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            button { display: none !important; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <div class="logo">${(salonTheme.salonName || tenantName).toUpperCase()}</div>
            <div class="subtitle">Reporte Ejecutivo &amp; Balance Contable de Citas</div>
            <div style="font-size: 12px; font-weight: 700; color: #b45309; margin-top: 4px;">Período Evaluado: ${periodLabel}</div>
          </div>
          <div class="meta">
            <div><b>Fecha de Emisión:</b> ${new Date().toLocaleDateString('es-VE')}</div>
            <div><b>Tasa del Día:</b> $1 USD = ${exchangeRate.toFixed(2)} Bs</div>
            <div><b>Sede Activa:</b> ${tenantSlug}</div>
          </div>
        </div>

        <div class="kpi-grid">
          <div class="kpi-card">
            <div class="kpi-title">Facturación Total (USD)</div>
            <div class="kpi-val" style="color: #15803d;">$${analyticsTotalRevenueUSD.toFixed(2)}</div>
            <div class="kpi-sub">≈ ${analyticsTotalRevenueVES.toLocaleString('es-VE', { maximumFractionDigits: 0 })} Bs</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-title">Citas Culminadas</div>
            <div class="kpi-val">${analyticsCompleted.length}</div>
            <div class="kpi-sub">${analyticsAttendanceRate}% Cumplimiento</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-title">No Asistieron (No-Show)</div>
            <div class="kpi-val" style="color: #b45309;">${analyticsNoShow.length}</div>
            <div style="font-size: 10px; color: #6b7280;">Cupos no aprovechados</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-title">Canceladas con Motivo</div>
            <div class="kpi-val" style="color: #be123c;">${analyticsCancelled.length}</div>
            <div style="font-size: 10px; color: #6b7280;">Con registro de causa</div>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Fecha</th>
              <th>Hora</th>
              <th>Clienta</th>
              <th>Servicio</th>
              <th>Pago</th>
              <th style="text-align: right;">Total USD</th>
              <th style="text-align: right;">Total Bs</th>
              <th style="text-align: center;">Estado</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml || '<tr><td colspan="9" style="text-align: center; padding: 20px; color: #6b7280;">No se registraron movimientos en este período.</td></tr>'}
          </tbody>
        </table>

        <div class="footer">
          <div>${salonTheme.salonName || tenantName} &bull; VANESEV Beauty Cloud &bull; Control Ejecutivo</div>
          <div>Documento Administrativo Confidencial &bull; Página 1 de 1</div>
        </div>

        <script>
          window.onload = function() {
            setTimeout(function() {
              window.print();
            }, 400);
          };
        </script>
      </body>
      </html>
    `;

    printWin.document.open();
    printWin.document.write(htmlContent);
    printWin.document.close();
  };

  const handleDeleteBooking = (id: string) => { 
    if (window.confirm('¿Deseas eliminar este registro de cita?')) { 
      AppStore.deleteBookingRemote(id); 
      onRefreshData(); 
    } 
  };

  // ─── CALENDAR TIME SLOT MANAGEMENT ────────────────────────────────────────
  const handleToggleSlot = (slot: string) => {
    AppStore.toggleBlockSlotRemote(calendarDate, slot);
    onRefreshData();
  };

  const handleToggleBlockEntireDay = () => {
    if (isSelectedDayBlocked) {
      AppStore.unblockEntireDayRemote(calendarDate);
    } else {
      AppStore.blockEntireDayRemote(calendarDate, allTimeSlots, 'Día completo cerrado por el estudio');
    }
    onRefreshData();
  };

  const handleAddCustomSlot = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustomSlot.trim()) return;
    AppStore.addTimeSlot(newCustomSlot.trim());
    setAllTimeSlots(AppStore.getTimeSlots());
    setNewCustomSlot('');
    onRefreshData();
  };

  const handleRemoveSlot = (slot: string) => {
    AppStore.removeTimeSlot(slot);
    setAllTimeSlots(AppStore.getTimeSlots());
    onRefreshData();
  };

  // ─── GALLERY / CAROUSEL MANAGEMENT ────────────────────────────────────────
  const handleSlideImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    setGalleryError(null);
    const file = e.target.files?.[0];
    if (!file) return;

    // Validación de formato: solo JPG, PNG, WEBP
    const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      setGalleryError('Formato inválido. Solo se admiten imágenes JPG, PNG o WEBP.');
      return;
    }

    // Validación de peso máximo: 800 KB
    if (file.size > 800 * 1024) {
      setGalleryError('La imagen supera los 800 KB. Por favor selecciona una imagen más liviana.');
      return;
    }

    // Compresión automática en Canvas para optimizar carga móvil
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 900;
        const scaleSize = MAX_WIDTH / img.width;
        if (scaleSize < 1) {
          canvas.width = MAX_WIDTH;
          canvas.height = img.height * scaleSize;
        } else {
          canvas.width = img.width;
          canvas.height = img.height;
        }
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          // Exportar en JPEG optimizado al 82%
          const compressed = canvas.toDataURL('image/jpeg', 0.82);
          setNewSlideImage(compressed);
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleAddSlide = async (e: React.FormEvent) => {
    e.preventDefault();
    setGalleryError(null);
    setGallerySuccess(null);

    if (!newSlideName.trim()) {
      setGalleryError('Por favor asigna un nombre o técnica a la foto.');
      return;
    }

    if (!newSlideImage) {
      setGalleryError('Por favor selecciona una foto para subir.');
      return;
    }

    setIsUploadingSlide(true);
    const slide: GallerySlide = {
      id: 'slide_' + Date.now(),
      name: newSlideName.trim(),
      imageUrl: newSlideImage,
      tag: newSlideTag.trim() || 'Diseño Real',
      createdAt: new Date().toISOString(),
    };

    const res = AppStore.addGallerySlide(slide);
    if (!res.success) {
      setGalleryError(res.error || 'Error al agregar foto.');
      setIsUploadingSlide(false);
      return;
    }

    // Sincronizar remotamente con Neon Postgres
    await AppStore.saveGallerySlideRemote(slide);
    setGallerySlides(AppStore.getGallery());
    setNewSlideName('');
    setNewSlideImage(null);
    setGallerySuccess('¡Foto agregada al carrusel con éxito!');
    setIsUploadingSlide(false);
    onRefreshData();
    setTimeout(() => setGallerySuccess(null), 3000);
  };

  const handleDeleteSlide = async (id: string) => {
    if (window.confirm('¿Segura que deseas eliminar esta foto del carrusel por completo?')) {
      AppStore.deleteGallerySlide(id);
      await AppStore.deleteGallerySlideRemote(id);
      setGallerySlides(AppStore.getGallery());
      onRefreshData();
    }
  };

  // ─── SERVICE MANAGEMENT ───────────────────────────────────────────────────
  const handleOpenCreateService = () => {
    setIsCreatingService(true);
    setEditingService(null);
    setServiceImagePreview(null);
    setServiceForm({
      id: 'srv_' + Date.now(),
      name: '',
      category: 'natural',
      priceUSD: 20,
      durationMinutes: 60,
      shortDescription: '',
      fullDescription: '',
      badgeText: '',
      badgeColor: 'bg-sage-800',
      imageUrl: isAndreaLegacy ? '/images/esmaltado-semipermanente.png' : '/capra/brows-henna.jpg',
      isAvailable: true,
      tags: isAndreaLegacy ? ['Uña natural'] : ['Autor', 'Premium'],
    });
  };

  const handleOpenEditService = (s: ServiceItem) => {
    setIsCreatingService(false);
    setEditingService(s);
    setServiceImagePreview(null);
    setServiceForm({ ...s });
  };

  const handleServiceImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      const result = ev.target?.result as string;
      setServiceImagePreview(result);
      setServiceForm(prev => ({ ...prev, imageUrl: result }));
    };
    reader.readAsDataURL(file);
  };

  const handleSaveServiceForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!serviceForm.name?.trim()) {
      alert('Por favor indica el nombre del servicio.');
      return;
    }

    const item: ServiceItem = {
      id: serviceForm.id || (editingService ? editingService.id : 'srv_' + Date.now()),
      name: serviceForm.name.trim(),
      category: (serviceForm.category as 'natural' | 'extensions' | 'pedicure') || 'natural',
      priceUSD: parseFloat(serviceForm.priceUSD as unknown as string) || 15,
      durationMinutes: parseInt(serviceForm.durationMinutes as unknown as string) || 60,
      shortDescription: serviceForm.shortDescription?.trim() || 'Servicio profesional de autor.',
      fullDescription: serviceForm.fullDescription?.trim() || serviceForm.shortDescription?.trim() || '',
      idealFor: serviceForm.idealFor?.trim() || 'Cuidado y estética profesional.',
      badgeText: serviceForm.badgeText?.trim() || undefined,
      badgeColor: serviceForm.badgeColor || 'bg-sage-800',
      imageUrl: serviceImagePreview || serviceForm.imageUrl || (isAndreaLegacy ? '/images/esmaltado-semipermanente.png' : '/capra/brows-henna.jpg'),
      isAvailable: serviceForm.isAvailable ?? true,
      tags: serviceForm.tags || (isAndreaLegacy ? ['Especialidad Andrea Labrador'] : ['Autor', 'Premium']),
    };

    AppStore.saveServiceRemote(item);
    setEditingService(null);
    setIsCreatingService(false);
    setServiceImagePreview(null);
    onRefreshData();
  };

  const handleDeleteService = (id: string, name: string) => {
    if (window.confirm(`¿Seguro que deseas eliminar el servicio "${name}" del catálogo?`)) {
      AppStore.deleteServiceRemote(id);
      onRefreshData();
    }
  };

  // ─── CRM STAMP ADJUSTMENTS ────────────────────────────────────────────────
  const handleAdjustStamp = (phone: string, clientName: string, delta: number) => {
    const existing = AppStore.getClientLoyalty(phone);
    const current = existing ? existing.stampsCount : 1;
    const next = Math.max(0, Math.min(6, current + delta));
    AppStore.setLoyaltyStampsRemote(phone, clientName, next);
    onRefreshData();
  };

  // ─── EMAIL TEMPLATE GENERATOR ─────────────────────────────────────────────
  const getEmailContent = () => {
    if (!emailModalClient) return { subject: '', body: '' };
    const { name, stamps, lastBooking } = emailModalClient;
    const date = lastBooking?.date || 'Próxima cita';
    const time = lastBooking?.timeSlot || 'Horario acordado';
    const svc = lastBooking?.serviceName || 'Servicio de Manicura';
    const priceUSD = lastBooking ? lastBooking.totalPriceUSD.toFixed(2) : '10.00';
    const priceVES = lastBooking ? (lastBooking.totalPriceUSD * exchangeRate).toFixed(0) : '368';

    if (emailTemplate === 'confirmation') {
      return {
        subject: `Confirmación de Cita — ${tenantName}`,
        body: `Hola ${name},\n\n¡Tu cita ha sido confirmada con éxito!\n\nDetalles de tu servicio:\n✨ Servicio: ${svc}\n📅 Fecha: ${date}\n⏰ Hora: ${time}\n💰 Total: $${priceUSD} USD (≈ ${priceVES} Bs)\n\n📍 Políticas del estudio:\n- Contamos con margen de tolerancia de puntualidad.\n- Te sugerimos asistir puntualmente para disfrutar de tu experiencia completa.\n\n¡Te esperamos en ${tenantName}!`
      };
    }

    if (emailTemplate === 'reminder') {
      return {
        subject: `Recordatorio de tu Cita de Mañana — ${tenantName}`,
        body: `Hola ${name},\n\nTe escribimos para recordarte tu cita programada para el día de mañana:\n\n✨ Servicio: ${svc}\n📅 Fecha: ${date}\n⏰ Hora: ${time}\n\nSi necesitas reprogramar o tienes alguna pregunta previa, avísanos con anticipación por WhatsApp.\n\n¡Nos vemos pronto!\n${tenantName}`
      };
    }

    return {
      subject: `🎉 ¡Felicitaciones ${name}! Tu ${tenantRewardLabel} está disponible`,
      body: `¡Hola ${name}!\n\n¡Tenemos una excelente noticia para ti! Con tus visitas continuas has acumulado 5 sellos verificados en ${tenantName}.\n\n⭐ Tu ${tenantRewardLabel} corre por cuenta de la casa.\n\nPara canjear tu beneficio, responde a este mensaje o escríbenos por WhatsApp para agendar tu cupo especial.\n\n¡Gracias por tu confianza y preferencia!\n${tenantName}`
    };
  };

  const handleCopyEmailBody = () => {
    const { body } = getEmailContent();
    navigator.clipboard.writeText(body);
    setEmailCopySuccess(true);
    setTimeout(() => setEmailCopySuccess(false), 2000);
  };

  const handleOpenMailClient = () => {
    const { subject, body } = getEmailContent();
    const mailto = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.location.href = mailto;
  };

  const handleSaveEmailSettings = (e: React.FormEvent) => {
    e.preventDefault();
    AppStore.saveEmailSettings(emailSettings);
    setEmailSettingsSaved(true);
    setTimeout(() => setEmailSettingsSaved(false), 2500);
  };

  // ─── RATE & BACKUP ────────────────────────────────────────────────────────
  const handleSaveRate = (e: React.FormEvent) => {
    e.preventDefault();
    const rate = parseFloat(currentRate);
    if (!isNaN(rate) && rate > 0) {
      AppStore.saveExchangeRate(rate);
      onRefreshData();
      setRateSavedMessage(true);
      setTimeout(() => setRateSavedMessage(false), 2500);
    }
  };

  const handleExportJSON = () => {
    const blob = new Blob([AppStore.exportDataJSON()], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `${tenantSlug}-respaldo-${new Date().toISOString().split('T')[0]}.json`; a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      const content = ev.target?.result as string;
      if (content && AppStore.importDataJSON(content)) { alert('¡Datos restaurados!'); onRefreshData(); }
      else alert('Error al leer el archivo.');
    };
    reader.readAsText(file);
  };

  // ─── SHARED UI STYLES ──────────────────────────────────────────────────────
  const inputCls = 'w-full p-2.5 rounded-xl bg-[#FBF9F6] border border-warm-200 text-warm-900 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-warm-400 placeholder:text-warm-400';
  const tabBtnCls = (key: TabKey) =>
    `w-full flex items-center gap-3 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all cursor-pointer ${
      activeTab === key
        ? 'bg-[#1E181A] text-white shadow-sm'
        : 'text-[#6E6266] hover:bg-[#FAF7F2] hover:text-[#1E181A]'
    }`;
  const sectionHead = (title: string, sub: string, action?: React.ReactNode) => (
    <div className="border-b border-[#1E181A]/10 pb-4 mb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
      <div>
        <h3 className="text-lg font-bold font-display text-[#1E181A]">{title}</h3>
        <p className="text-xs text-[#6E6266] mt-0.5">{sub}</p>
      </div>
      {action && <div>{action}</div>}
    </div>
  );

  const currentNavInfo = NAV_ITEMS.find((n) => n.key === activeTab) || NAV_ITEMS[0];
  const progressPercent = Math.min(100, Math.max(28, Math.round(((bookings.length * 25 + services.length * 10) / 300) * 100)));

  return (
    <div className="min-h-screen bg-[#E6E6EB] text-[#18181B] font-sans p-2 sm:p-4 lg:p-6">
      {/* ── VERTIX OUTER ROUNDED APPLICATION CONTAINER ── */}
      <div className="max-w-[1440px] mx-auto bg-[#F5F5F8] rounded-[28px] sm:rounded-[34px] p-4 sm:p-6 lg:p-7 shadow-[0_14px_45px_rgba(0,0,0,0.05)] border border-white min-h-[calc(100vh-48px)] flex flex-col">

        {/* Franja discreta: Periodo de puesta a punto (Orden B1-c §5) */}
        {enPrueba && (
          <div className="mb-4 px-4 py-2.5 rounded-2xl bg-amber-50/90 border border-amber-200/80 text-amber-950 text-xs font-medium flex flex-wrap items-center justify-between gap-3 shadow-2xs">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
              <span><strong>Periodo de puesta a punto</strong> &bull; Tu salón está en fase de prueba y configuración.</span>
            </div>
            {currentUser?.cuenta_prueba && (
              <button
                type="button"
                onClick={() => {
                  setActivarError(null);
                  setActivarSuccess(null);
                  setActivarPaso(1);
                  setShowActivarModal(true);
                }}
                className="px-3.5 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-2xs transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <KeyRound className="w-3.5 h-3.5" />
                <span>Activar mi cuenta</span>
              </button>
            )}
          </div>
        )}

        {/* ── VERTIX TOP HEADER BAR (1 SINGLE CLEAN ROW) ── */}
        <header className="flex items-center justify-between gap-3">
          {/* Left: Circular Coral Brand Mark + Compact Salon Name */}
          <div className="flex items-center gap-2.5 min-w-0">
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs shrink-0 text-white shadow-xs"
              style={{ background: 'linear-gradient(135deg, #F26A3D 0%, #D94824 100%)' }}
            >
              {tenantInitials}
            </div>
            <span className="font-bold text-[#18181B] text-sm sm:text-base tracking-tight truncate">
              {salonTheme.salonName || tenantName}
            </span>
          </div>

          {/* Center: Floating White Capsule Pill Bar (6 Clean 1-Word Tabs like Vertix) */}
          <nav className="hidden lg:flex items-center gap-1 bg-white rounded-full p-1.5 shadow-[0_2px_10px_rgba(0,0,0,0.03)] border border-black/[0.03]">
            {[
              { key: 'overview' as TabKey, label: 'Overview' },
              { key: 'bookings' as TabKey, label: 'Agenda' },
              { key: 'services' as TabKey, label: 'Servicios' },
              { key: 'theme' as TabKey, label: 'Diseño' },
              { key: 'crm' as TabKey, label: 'Programa' },
              { key: 'analytics' as TabKey, label: 'Reportes' },
              ...(enPrueba ? [{ key: 'puesta_a_punto' as TabKey, label: 'Puesta a punto' }] : []),
            ].map((pill) => {
              const active = activeTab === pill.key;
              return (
                <button
                  key={pill.key}
                  type="button"
                  onClick={() => navigate(pill.key)}
                  className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                    active
                      ? 'bg-[#18181B] text-white shadow-2xs'
                      : 'text-[#52525B] hover:text-[#18181B] hover:bg-[#F4F4F6]'
                  }`}
                >
                  {pill.label}
                </button>
              );
            })}
          </nav>

          {/* Right: Two Floating White Capsules (Utility Icons Pill + Profile Pill) */}
          <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
            <div className="bg-white rounded-full px-2.5 sm:px-3.5 py-1.5 shadow-[0_2px_10px_rgba(0,0,0,0.03)] border border-black/[0.03] flex items-center gap-2 sm:gap-3">
              <button
                type="button"
                onClick={() => navigate('bookings')}
                className="text-[#52525B] hover:text-[#18181B] transition-colors cursor-pointer"
                title="Buscar citas y reservas"
              >
                <Search className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={onRefreshData}
                className="text-[#52525B] hover:text-[#18181B] transition-colors cursor-pointer"
                title={`Sincronizar datos · BCV Bs. ${exchangeRate.toFixed(2)}`}
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={onExitToCatalog}
                className="text-[#F26A3D] hover:text-[#D94824] transition-colors cursor-pointer flex items-center gap-1 text-[11px] font-bold"
                title="Ver Carta Pública del Salón"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Carta</span>
              </button>
            </div>

            <div className="bg-white rounded-full pl-1.5 pr-2.5 sm:pr-3.5 py-1 shadow-[0_2px_10px_rgba(0,0,0,0.03)] border border-black/[0.03] flex items-center gap-2">
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[10px] font-bold shrink-0"
                style={{ background: salonPalette.heroGradient }}
              >
                {tenantInitials}
              </div>
              <div className="hidden sm:block text-left leading-tight">
                <p className="text-[11px] font-bold text-[#18181B] truncate max-w-[115px]">
                  {salonTheme.salonName || tenantName}
                </p>
                <p className="text-[9px] text-[#71717A] tabular-nums">
                  BCV Bs. {exchangeRate.toFixed(2)}
                </p>
              </div>
              {onLogout && (
                <button
                  type="button"
                  onClick={onLogout}
                  className="ml-0.5 p-1 rounded-full text-[#71717A] hover:text-rose-600 transition-colors cursor-pointer"
                  title="Cerrar Sesión"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </header>

        {/* ── MOBILE HORIZONTAL CAPSULE SWITCHER (CLEAN 1-ROW SCROLL, ZERO VERTICAL SQUISHING) ── */}
        <div className="lg:hidden mt-3 flex items-center gap-1 overflow-x-auto no-scrollbar bg-white rounded-full p-1.5 shadow-[0_2px_10px_rgba(0,0,0,0.03)] border border-black/[0.03]">
          {NAV_ITEMS.map((item) => {
            const active = activeTab === item.key;
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => navigate(item.key)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer shrink-0 ${
                  active
                    ? 'bg-[#18181B] text-white shadow-2xs'
                    : 'text-[#52525B] hover:text-[#18181B]'
                }`}
              >
                {item.shortLabel}
              </button>
            );
          })}
        </div>

        {/* ── VERTIX BODY WORKSPACE (LEFT 3 FLOATING ICON CAPSULES + MAIN BENTO WORKSPACE) ── */}
        <div className="flex gap-5 lg:gap-7 mt-5 sm:mt-6 flex-1">

          {/* Left Column: 3 Floating Vertical White Icon Capsules (Desktop & Tablet) */}
          <aside className="hidden md:flex flex-col justify-between items-center w-11 shrink-0 select-none">
            {/* Top Mini Capsule (Theme Studio & QR Quick Triggers) */}
            <div className="w-11 rounded-full bg-white shadow-[0_2px_10px_rgba(0,0,0,0.03)] border border-black/[0.03] py-2 flex flex-col items-center gap-1.5">
              <button
                type="button"
                onClick={() => navigate('theme')}
                className={`w-8 h-8 rounded-full flex items-center justify-center transition-all cursor-pointer ${
                  activeTab === 'theme'
                    ? 'bg-[#18181B] text-white shadow-2xs'
                    : 'text-[#71717A] hover:text-[#18181B] hover:bg-[#F4F4F6]'
                }`}
                title="Diseño & Paleta de Carta"
              >
                <Palette className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => navigate('qr')}
                className={`w-8 h-8 rounded-full flex items-center justify-center transition-all cursor-pointer ${
                  activeTab === 'qr'
                    ? 'bg-[#18181B] text-white shadow-2xs'
                    : 'text-[#71717A] hover:text-[#18181B] hover:bg-[#F4F4F6]'
                }`}
                title="Código QR de Recepción"
              >
                <QrCode className="w-4 h-4" />
              </button>
            </div>

            {/* Middle Main Capsule (7 Core Operational Modules) */}
            <div className="w-11 rounded-full bg-white shadow-[0_2px_10px_rgba(0,0,0,0.03)] border border-black/[0.03] py-2.5 flex flex-col items-center gap-2">
              {[
                { key: 'overview' as TabKey, Icon: LayoutDashboard, title: 'Overview / Resumen' },
                { key: 'bookings' as TabKey, Icon: Calendar, title: 'Agenda & Reservas' },
                { key: 'services' as TabKey, Icon: Sparkles, title: 'Catálogo de Servicios' },
                { key: 'crm' as TabKey, Icon: Award, title: 'Pasaporte & Fidelidad VIP' },
                { key: 'team' as TabKey, Icon: Users, title: 'Equipo & Cabinas' },
                { key: 'analytics' as TabKey, Icon: BarChart3, title: 'Reportes & Finanzas' },
                { key: 'settings' as TabKey, Icon: Settings, title: 'Tasa BCV & Ajustes' },
              ].map(({ key, Icon, title }) => {
                const active = activeTab === key;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => navigate(key)}
                    className={`w-8 h-8 rounded-full flex items-center justify-center transition-all cursor-pointer relative ${
                      active
                        ? 'bg-[#18181B] text-white shadow-xs'
                        : 'text-[#71717A] hover:text-[#18181B] hover:bg-[#F4F4F6]'
                    }`}
                    title={title}
                  >
                    <Icon className="w-4 h-4" />
                    {key === 'bookings' && enWhatsAppCount > 0 && (
                      <span className="w-2 h-2 rounded-full bg-[#F26A3D] absolute top-0.5 right-0.5" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Bottom Mini Capsule (Public Catalog & Logout) */}
            <div className="w-11 rounded-full bg-white shadow-[0_2px_10px_rgba(0,0,0,0.03)] border border-black/[0.03] py-2 flex flex-col items-center gap-1.5">
              <button
                type="button"
                onClick={onExitToCatalog}
                className="w-8 h-8 rounded-full flex items-center justify-center text-[#71717A] hover:text-[#18181B] hover:bg-[#F4F4F6] transition-all cursor-pointer"
                title="Abrir Carta Pública del Salón"
              >
                <ExternalLink className="w-4 h-4" />
              </button>
              {onLogout && (
                <button
                  type="button"
                  onClick={onLogout}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-[#71717A] hover:text-rose-600 hover:bg-rose-50 transition-all cursor-pointer"
                  title="Cerrar Sesión"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              )}
            </div>
          </aside>

          {/* ── MAIN CONTENT AREA ── */}
          <main className="flex-1 min-w-0">
            {/* Dynamic Vertix Section Heading + 1-Line Subtitle */}
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2 mb-5">
              <div>
                <h1 className="text-2xl sm:text-[28px] font-bold text-[#18181B] tracking-tight leading-tight">
                  {currentNavInfo.label}
                </h1>
                <p className="text-xs sm:text-sm text-[#71717A] mt-0.5">
                  {currentNavInfo.subtitle}
                </p>
              </div>
              {/* Secondary module pills for Calendar / Gallery / Settings when needed */}
              <div className="flex items-center gap-1.5 flex-wrap">
                {[
                  { key: 'qr' as TabKey, label: 'QR Recepción' },
                  { key: 'team' as TabKey, label: 'Equipo' },
                  { key: 'calendar' as TabKey, label: 'Bloqueos' },
                  { key: 'gallery' as TabKey, label: 'Galería' },
                  { key: 'settings' as TabKey, label: 'Tasa BCV' },
                ].map((sub) => (
                  <button
                    key={sub.key}
                    type="button"
                    onClick={() => navigate(sub.key)}
                    className={`px-3 py-1 rounded-full text-[11px] font-semibold transition-all cursor-pointer border ${
                      activeTab === sub.key
                        ? 'bg-[#18181B] text-white border-[#18181B]'
                        : 'bg-white text-[#52525B] border-black/5 hover:text-[#18181B]'
                    }`}
                  >
                    {sub.label}
                  </button>
                ))}
              </div>
            </div>

            {/* ══════════════════════════════════════════════════════════════════
                TAB 0: OVERVIEW — EXACT VERTIX 2x2 BENTO GRID (SCREENSHOT 1)
            ══════════════════════════════════════════════════════════════════ */}
            {activeTab === 'overview' && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                {/* BENTO 1 (TOP-LEFT, 7 COLS): WARM CORAL-TERRACOTTA HERO METRIC CARD WITH PROGRESS BAR */}
                <motion.div
                  whileHover={{ y: -2 }}
                  className="lg:col-span-7 rounded-[24px] p-6 sm:p-7 text-white shadow-sm flex flex-col justify-between min-h-[240px] relative overflow-hidden"
                  style={{
                    background: 'linear-gradient(135deg, #F27449 0%, #E35633 55%, #C94122 100%)',
                  }}
                >
                  {/* Top Pill & Date */}
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md font-semibold text-[11px]">
                      <Award className="w-3.5 h-3.5" />
                      <span>Sede Couture Pro &bull; {salonPalette.name}</span>
                    </span>
                    <span className="text-[11px] text-white/85 font-medium">
                      BCV: Bs. {exchangeRate.toFixed(2)}
                    </span>
                  </div>

                  {/* Huge Number + Diagonal Hash Progress Bar */}
                  <div className="my-5">
                    <div className="flex items-baseline gap-2">
                      <span className="text-4xl sm:text-5xl font-bold tracking-tight tabular-nums">
                        ${totalRevenueUSD.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                      </span>
                      <span className="text-sm text-white/90 font-medium">
                        USD facturados &bull; {bookings.length} citas registradas
                      </span>
                    </div>

                    {/* Vertix Progress Bar with Diagonal Hash Track */}
                    <div className="mt-4 h-2.5 w-full rounded-full overflow-hidden flex items-center bg-black/15 p-0.5">
                      <div
                        className="h-full bg-white rounded-full transition-all duration-500"
                        style={{ width: `${progressPercent}%` }}
                      />
                      <div
                        className="h-full flex-1 ml-1 rounded-r-full"
                        style={{
                          backgroundImage:
                            'repeating-linear-gradient(-55deg, rgba(255,255,255,0.45), rgba(255,255,255,0.45) 2px, transparent 2px, transparent 6px)',
                        }}
                      />
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-white/85 mt-1.5 font-medium">
                      <span>Nivel Operativo Gold</span>
                      <span>{services.length} servicios publicados en carta QR</span>
                    </div>
                  </div>

                  {/* Bottom White Pill CTA + Equivalent in Bs */}
                  <div className="flex flex-wrap items-center gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        navigate('bookings');
                        handleOpenManualBooking();
                      }}
                      className="px-4 py-2 rounded-full bg-white text-[#18181B] text-xs font-bold shadow-xs hover:scale-[1.02] transition-transform flex items-center gap-1.5 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5 text-[#E35633]" />
                      <span>Agendar Cita</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => navigate('theme')}
                      className="px-4 py-2 rounded-full bg-white/15 hover:bg-white/25 text-white text-xs font-semibold backdrop-blur-md transition-colors flex items-center gap-1.5 cursor-pointer"
                    >
                      <Palette className="w-3.5 h-3.5" />
                      <span>Personalizar Carta</span>
                    </button>
                    <span className="text-[11px] text-white/85 font-medium">
                      ≈ Bs. {(totalRevenueUSD * exchangeRate).toLocaleString('es-VE', { maximumFractionDigits: 0 })} en sistema
                    </span>
                  </div>
                </motion.div>

                {/* BENTO 2 (TOP-RIGHT, 5 COLS): WHITE TIER BENEFITS / ESTADO OPERATIVO CARD */}
                <div className="lg:col-span-5 bg-white rounded-[24px] p-6 shadow-[0_2px_12px_rgba(0,0,0,0.03)] border border-black/[0.03] flex flex-col justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-[#18181B]">Beneficios &amp; Estado del Salón</h3>

                    {/* Segmented Gray Pill Switcher (Silver / Gold / Platinum style) */}
                    <div className="mt-3 bg-[#F4F4F6] rounded-full p-1 inline-flex items-center gap-1">
                      {[
                        { id: 'silver' as const, label: 'Carta QR' },
                        { id: 'gold' as const, label: 'Pasaporte VIP' },
                        { id: 'platinum' as const, label: 'Equipo & BCV' },
                      ].map((tab) => (
                        <button
                          key={tab.id}
                          type="button"
                          onClick={() => setOverviewTier(tab.id)}
                          className={`px-3.5 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                            overviewTier === tab.id
                              ? 'bg-white text-[#18181B] shadow-2xs'
                              : 'text-[#71717A] hover:text-[#18181B]'
                          }`}
                        >
                          {tab.label}
                        </button>
                      ))}
                    </div>

                    {/* Checkmark Rows */}
                    <div className="mt-4 space-y-2.5">
                      {(overviewTier === 'silver'
                        ? [
                            `${services.length} tratamientos con fotografía editorial verificada`,
                            `Ruta pública activa en vanesev.com/m/${tenantSlug}`,
                            `Paleta ${salonPalette.name} editable en tiempo real`,
                            `Reserva en 15 segundos directo al WhatsApp del salón`,
                          ]
                        : overviewTier === 'gold'
                        ? [
                            `Meta de fidelización: ${salonTheme.loyaltyStampsGoal} visitas selladas`,
                            `Premio activo: ${salonTheme.loyaltyRewardTitle}`,
                            `${clientsList.length} clientas registradas en base de datos VIP`,
                            `Acreditación automática al culminar cada cita`,
                          ]
                        : [
                            `Conversión multimoneda activa a Bs. ${exchangeRate.toFixed(2)} (BCV)`,
                            `${dbStaff.length || 2} especialistas configuradas en agenda`,
                            `${dbZones.length || 3} áreas o cabinas operativas sin cruces`,
                            `Reportes financieros y respaldo JSON disponibles`,
                          ]
                      ).map((benefit, idx) => (
                        <div key={idx} className="flex items-center gap-2.5 text-xs text-[#27272A]">
                          <span className="w-4 h-4 rounded-full bg-[#FFF0EC] text-[#E35633] flex items-center justify-center shrink-0">
                            <Check className="w-2.5 h-2.5 stroke-[3]" />
                          </span>
                          <span>{benefit}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <p className="text-[11px] text-[#A1A1AA] mt-4 pt-3 border-t border-zinc-100">
                    Sede sincronizada en tiempo real con Neon Cloud
                  </p>
                </div>

                {/* BENTO 3 (BOTTOM-LEFT, 7 COLS): WHITE OFFERS / QUICK MODULES CARD (3 SUB-CARDS) */}
                <div className="lg:col-span-7 bg-white rounded-[24px] p-6 shadow-[0_2px_12px_rgba(0,0,0,0.03)] border border-black/[0.03]">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="text-sm font-bold text-[#18181B]">Módulos &amp; Acciones Rápidas</h3>
                      <p className="text-xs text-[#71717A] mt-0.5">
                        Configura la experiencia visual, descarga tu QR o actualiza precios al instante.
                      </p>
                    </div>
                    <span className="px-2.5 py-0.5 rounded-full bg-[#FFF0EC] text-[#E35633] text-[10px] font-bold">
                      3 activos
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 mt-4">
                    {/* Sub-Card 1 (Highlighted Coral Border like Vertix Screenshot 1) */}
                    <div className="rounded-[18px] p-4 bg-[#FFF8F6] border border-[#F5CFC4] flex flex-col justify-between min-h-[155px]">
                      <div>
                        <div className="w-8 h-8 rounded-xl bg-white shadow-2xs border border-black/5 flex items-center justify-center text-[#E35633] mb-3">
                          <Palette className="w-4 h-4" />
                        </div>
                        <p className="text-xs font-bold text-[#18181B]">Diseño de Carta</p>
                        <p className="text-[11px] text-[#71717A] mt-1 leading-relaxed">
                          Paleta {salonPalette.name} y tipografía editorial activa.
                        </p>
                      </div>
                      <div className="flex items-center justify-between gap-2 pt-3 mt-2">
                        <span className="text-[10px] text-[#A1A1AA] font-medium">En vivo</span>
                        <button
                          type="button"
                          onClick={() => navigate('theme')}
                          className="px-3 py-1 rounded-full bg-[#F26A3D] text-white text-[10px] font-bold flex items-center gap-1 cursor-pointer shadow-2xs"
                        >
                          <Check className="w-2.5 h-2.5 stroke-[3]" />
                          <span>Editar</span>
                        </button>
                      </div>
                    </div>

                    {/* Sub-Card 2 */}
                    <div className="rounded-[18px] p-4 bg-[#F8F8FA] border border-black/[0.04] flex flex-col justify-between min-h-[155px]">
                      <div>
                        <div className="w-8 h-8 rounded-xl bg-white shadow-2xs border border-black/5 flex items-center justify-center text-[#18181B] mb-3">
                          <QrCode className="w-4 h-4" />
                        </div>
                        <p className="text-xs font-bold text-[#18181B]">Kit QR Recepción</p>
                        <p className="text-[11px] text-[#71717A] mt-1 leading-relaxed">
                          Código QR listo para tocador, recepción y bio de Instagram.
                        </p>
                      </div>
                      <div className="flex items-center justify-between gap-2 pt-3 mt-2">
                        <span className="text-[10px] text-[#A1A1AA] font-medium">Permanente</span>
                        <button
                          type="button"
                          onClick={() => navigate('qr')}
                          className="px-3 py-1 rounded-full bg-[#18181B] text-white text-[10px] font-bold cursor-pointer"
                        >
                          Abrir QR
                        </button>
                      </div>
                    </div>

                    {/* Sub-Card 3 */}
                    <div className="rounded-[18px] p-4 bg-[#F8F8FA] border border-black/[0.04] flex flex-col justify-between min-h-[155px]">
                      <div>
                        <div className="w-8 h-8 rounded-xl bg-white shadow-2xs border border-black/5 flex items-center justify-center text-[#18181B] mb-3">
                          <Sparkles className="w-4 h-4" />
                        </div>
                        <p className="text-xs font-bold text-[#18181B]">Precios &amp; Servicios</p>
                        <p className="text-[11px] text-[#71717A] mt-1 leading-relaxed">
                          {services.length} servicios activos con cálculo automático BCV.
                        </p>
                      </div>
                      <div className="flex items-center justify-between gap-2 pt-3 mt-2">
                        <span className="text-[10px] text-[#A1A1AA] font-medium">Catálogo</span>
                        <button
                          type="button"
                          onClick={() => navigate('services')}
                          className="px-3 py-1 rounded-full bg-[#18181B] text-white text-[10px] font-bold cursor-pointer"
                        >
                          Gestionar
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* BENTO 4 (BOTTOM-RIGHT, 5 COLS): WHITE POINTS HISTORY / ACTIVIDAD EN VIVO CARD */}
                <div className="lg:col-span-5 bg-white rounded-[24px] p-6 shadow-[0_2px_12px_rgba(0,0,0,0.03)] border border-black/[0.03] flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-sm font-bold text-[#18181B]">Actividad &amp; Servicios en Carta</h3>
                      <button
                        type="button"
                        onClick={() => navigate('bookings')}
                        className="text-[11px] font-semibold text-[#E35633] hover:underline cursor-pointer"
                      >
                        Ver agenda &rarr;
                      </button>
                    </div>

                    <div className="divide-y divide-zinc-100">
                      {(bookings.length > 0
                        ? bookings.slice(0, 4).map((b) => ({
                            id: b.id,
                            title: `${b.clientName} · ${b.serviceName}`,
                            sub: `${b.date} · ${b.timeSlot}`,
                            amount: `+$${b.totalPriceUSD.toFixed(0)}`,
                            positive: b.status !== 'cancelada',
                          }))
                        : services.slice(0, 4).map((s) => ({
                            id: s.id,
                            title: s.name,
                            sub: `${s.durationMinutes} min · Disponible en carta QR`,
                            amount: `$${s.priceUSD} USD`,
                            positive: true,
                          }))
                      ).map((row) => (
                        <div key={row.id} className="py-2.5 flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-8 h-8 rounded-full bg-[#FFF3EF] text-[#E35633] flex items-center justify-center shrink-0">
                              <Sparkles className="w-3.5 h-3.5" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs font-bold text-[#18181B] truncate">{row.title}</p>
                              <p className="text-[10px] text-[#A1A1AA] truncate">{row.sub}</p>
                            </div>
                          </div>
                          <span
                            className={`text-xs font-bold tabular-nums shrink-0 ${
                              row.positive ? 'text-[#10B981]' : 'text-[#E35633]'
                            }`}
                          >
                            {row.amount}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ── WHITE WORKSPACE CARD FOR SPECIFIC MODULES (SCREENSHOT 4 STYLE) ── */}
            <div className={activeTab === 'overview' ? 'hidden' : 'bg-white rounded-[24px] border border-black/[0.03] shadow-[0_2px_12px_rgba(0,0,0,0.03)] p-5 sm:p-7 min-h-[540px]'}>

            {/* ══════════════════════════════════════════════════════════════════
                TAB 1: CITAS & RESERVAS
            ══════════════════════════════════════════════════════════════════ */}
            {activeTab === 'bookings' && (
              <div className="space-y-5">
                {sectionHead(
                  'Historial de Citas & Reservas',
                  'Las solicitudes de tus clientas se reflejan aquí de forma atómica y conectadas directo a WhatsApp.',
                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      type="button"
                      onClick={() => handleOpenManualBooking()}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold shadow-sm transition-all cursor-pointer active:scale-95"
                      title="Registrar cita presencial o telefónica directamente en el salón"
                    >
                      <Plus className="w-4 h-4" />
                      <span>+ Agendar Cita Presencial</span>
                    </button>

                    <select
                      value={bookingFilterStatus}
                      onChange={e => setBookingFilterStatus(e.target.value)}
                      className="px-3 py-2 rounded-xl bg-[#FBF9F6] border border-sage-200 text-xs text-warm-900 focus:outline-none focus:ring-2 focus:ring-sage-400 font-bold"
                    >
                      <option value="all">Todas ({bookings.length})</option>
                      <option value="en_whatsapp">🟡 En WhatsApp ({enWhatsAppCount})</option>
                      <option value="confirmada">🟢 Confirmadas ({confirmedCount})</option>
                      <option value="completada">🔵 Completadas ({completedCount})</option>
                      <option value="no_asistio">🟠 No Asistió ({noShowCount})</option>
                      <option value="cancelada">🔴 Canceladas ({cancelledCount})</option>
                    </select>
                  </div>
                )}

                {filteredBookings.length === 0 ? (
                  <div className="text-center py-16 space-y-3">
                    <div className="w-14 h-14 rounded-2xl bg-sage-100 text-sage-500 flex items-center justify-center mx-auto"><Calendar className="w-6 h-6" /></div>
                    <p className="text-sm font-semibold text-warm-700">Sin citas en este estado.</p>
                    <p className="text-xs text-warm-400">Cuando una clienta agende en la web, aparecerá aquí al instante.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {filteredBookings.map(b => (
                      <div key={b.id} className="p-4 rounded-2xl bg-[#FBF9F6] border border-sage-200 space-y-3 hover:border-sage-300 transition-colors">
                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2 pb-3 border-b border-sage-100">
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-bold text-warm-900 text-sm">{b.clientName}</span>
                              {b.status === 'en_whatsapp' || b.status === 'pendiente' ? (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-amber-100 text-amber-900 border border-amber-300 shadow-xs">
                                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping" />
                                  <span>🟡 En WhatsApp (Esperando confirmación)</span>
                                </span>
                              ) : b.status === 'confirmada' ? (
                                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-100 text-emerald-800 border border-emerald-300">
                                  🟢 Confirmada
                                </span>
                              ) : b.status === 'completada' ? (
                                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-blue-100 text-blue-800 border border-blue-300">
                                  🔵 Completada &amp; Sello VIP
                                </span>
                              ) : b.status === 'no_asistio' ? (
                                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-amber-100 text-amber-900 border border-amber-300">
                                  🟠 No Asistió
                                </span>
                              ) : (
                                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-rose-100 text-rose-800 border border-rose-300">
                                  🔴 Cancelada {b.cancellationReason ? `• ${b.cancellationReason}` : ''}
                                </span>
                              )}
                              {b.isFirstVisit && (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-amber-100 text-amber-900 border border-amber-300" title="Verificar presencialmente que sea clienta nueva para aplicar el descuento de bienvenida">
                                  1ª Cita (-$2 OFF) &bull; Validar en salón
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-3 text-xs text-warm-400 mt-1">
                              <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{b.clientPhone}</span>
                              {b.clientInstagram && <span className="flex items-center gap-1 text-pink-600"><InstagramIcon className="w-3 h-3" />@{b.clientInstagram.replace('@','')}</span>}
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <span className="font-serif font-bold text-emerald-700">${b.totalPriceUSD.toFixed(2)} USD</span>
                            <span className="block text-[11px] text-warm-400">≈ {(b.totalPriceUSD * exchangeRate).toFixed(0)} Bs</span>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                          {[
                            ['Servicio', b.serviceName],
                            ['Fecha & Hora', `${b.date} · ${b.timeSlot}`],
                            ['Forma de Pago', b.paymentMethod.replace('_',' ')],
                          ].map(([label, val]) => (
                            <div key={label} className="p-2.5 rounded-xl bg-white border border-sage-100">
                              <span className="text-warm-400 block text-[10px] uppercase font-bold mb-0.5">{label}</span>
                              <span className="font-semibold text-warm-900 capitalize">{val}</span>
                            </div>
                          ))}
                        </div>

                        {b.notes && <p className="text-xs text-warm-600 italic bg-amber-50 p-2.5 rounded-xl border border-amber-100">&ldquo;{b.notes}&rdquo;</p>}

                        <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                          <a
                            href={`https://wa.me/${b.clientPhone.replace(/\D/g,'')}?text=¡Hola%20${encodeURIComponent(b.clientName)}%20bella!%20💕%20Vi%20tu%20solicitud%20en%20la%20web%20para%20${encodeURIComponent(b.serviceName)}%20el%20${b.date}%20a%20las%20${b.timeSlot}.%20¡Confirmado!`}
                            target="_blank" rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#25D366] hover:bg-[#1EBE5D] text-white font-bold text-xs shadow-xs"
                          >
                            <MessageCircle className="w-3.5 h-3.5" /><span>Responder por WhatsApp</span>
                          </a>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {b.status !== 'confirmada' && b.status !== 'completada' && b.status !== 'no_asistio' && (
                              <button 
                                onClick={() => handleUpdateStatus(b.id, 'confirmada')} 
                                className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs flex items-center gap-1 cursor-pointer"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>Confirmar Cita</span>
                              </button>
                            )}

                            {b.status !== 'completada' && b.status !== 'cancelada' && (
                              <button 
                                onClick={() => handleOpenReschedule(b)} 
                                className="px-3 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 text-xs font-semibold flex items-center gap-1 cursor-pointer"
                                title="Reprogramar fecha u hora acordada con la clienta en WhatsApp"
                              >
                                <Calendar className="w-3.5 h-3.5 text-amber-700" />
                                <span>Reprogramar</span>
                              </button>
                            )}

                            {b.status === 'confirmada' && (
                              <>
                                <button 
                                  onClick={() => setCompleteModalBooking(b)} 
                                  className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs flex items-center gap-1 cursor-pointer"
                                  title="Marcar cita culminada con éxito y acreditar sello VIP"
                                >
                                  <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                                  <span>Culminar &amp; Sello</span>
                                </button>

                                <button 
                                  onClick={() => setNoShowModalBooking(b)} 
                                  className="px-3 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 text-xs font-semibold flex items-center gap-1 cursor-pointer"
                                  title="Clienta no llegó al estudio"
                                >
                                  <UserX className="w-3.5 h-3.5 text-amber-700" />
                                  <span>No Asistió</span>
                                </button>
                              </>
                            )}

                            {b.status !== 'cancelada' && b.status !== 'completada' && (
                              <button 
                                onClick={() => {
                                  setCancellationModalBooking(b);
                                  setCancellationReasonType('aviso_previo');
                                  setCancellationCustomNote('');
                                }} 
                                className="px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200 text-xs font-semibold cursor-pointer"
                                title="Cancelar cita registrando el motivo"
                              >
                                Cancelar
                              </button>
                            )}

                            {b.status === 'completada' && (
                              <a
                                href={`https://wa.me/${b.clientPhone.replace(/\D/g,'')}?text=¡Hola%20${encodeURIComponent(b.clientName)}%20bella!%20💅✨%20¡Muchas%20gracias%20por%20tu%20visita%20de%20hoy!%20Hemos%20registrado%20tu%20servicio%20y%20se%20ha%20sumado%20tu%20sello%20en%20tu%20Tarjeta%20VIP.%20Recuerda%20que%20al%20completar%205%20visitas,%20¡tu%20Depilación%20de%20Cejas%20es%20100%25%20GRATIS!%20Nos%20vemos%20pronto%20💕`}
                                target="_blank" rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold shadow-xs"
                                title="Enviar confirmación de sello a la clienta por WhatsApp"
                              >
                                <Sparkles className="w-3 h-3 text-amber-300" />
                                <span>Notificar Sello</span>
                              </a>
                            )}
                            <button onClick={() => handleDeleteBooking(b.id)} className="p-1.5 text-rose-400 hover:bg-rose-50 rounded-xl border border-transparent hover:border-rose-200 transition-colors" title="Eliminar registro"><Trash2 className="w-4 h-4" /></button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ══════════════════════════════════════════════════════════════════
                TAB 1.5: ANALÍTICA & FACTURACIÓN CONTABLE
            ══════════════════════════════════════════════════════════════════ */}
            {activeTab === 'analytics' && (
              <div className="space-y-6">
                {sectionHead(
                  'Analítica & Facturación Contable',
                  'Control financiero detallado, tasa de asistencia, inasistencias (no-show) y exportación oficial de reportes en PDF.',
                  <button
                    onClick={handlePrintReportPDF}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#16291F] hover:bg-sage-900 text-amber-200 font-bold text-xs shadow-luxury transition-all cursor-pointer"
                    title="Generar e imprimir balance contable en PDF formato A4"
                  >
                    <Printer className="w-4 h-4" />
                    <span>Descargar Reporte Contable PDF</span>
                  </button>
                )}

                {/* Filtros de período */}
                <div className="p-4 rounded-2xl bg-[#FBF9F6] border border-sage-200 space-y-3">
                  <div className="flex items-center gap-2 text-xs font-bold text-warm-800">
                    <Filter className="w-4 h-4 text-warm-500" />
                    <span>Seleccionar Período Contable:</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { key: 'today', label: 'Hoy' },
                      { key: 'yesterday', label: 'Ayer' },
                      { key: '7days', label: 'Últimos 7 Días (Semanal)' },
                      { key: '15days', label: 'Últimos 15 Días (Quincenal)' },
                      { key: 'month', label: 'Últimos 30 Días (Mensual)' },
                      { key: 'all', label: 'Histórico Completo' },
                      { key: 'custom', label: 'Rango Personalizado' },
                    ].map(p => (
                      <button
                        key={p.key}
                        type="button"
                        onClick={() => setAnalyticsPeriod(p.key as typeof analyticsPeriod)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                          analyticsPeriod === p.key
                            ? 'bg-[#16291F] text-white shadow-xs'
                            : 'bg-white border border-sage-200 text-warm-700 hover:bg-sage-100'
                        }`}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>

                  {analyticsPeriod === 'custom' && (
                    <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-sage-200 text-xs">
                      <div className="flex items-center gap-2">
                        <span className="text-warm-600 font-medium">Desde:</span>
                        <input
                          type="date"
                          value={analyticsStartDate}
                          onChange={e => setAnalyticsStartDate(e.target.value)}
                          className="px-2.5 py-1.5 bg-white border border-sage-300 rounded-xl font-semibold text-warm-900"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-warm-600 font-medium">Hasta:</span>
                        <input
                          type="date"
                          value={analyticsEndDate}
                          onChange={e => setAnalyticsEndDate(e.target.value)}
                          className="px-2.5 py-1.5 bg-white border border-sage-300 rounded-xl font-semibold text-warm-900"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Tarjetas de Métricas Ejecutivas (KPIs) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  <div className="p-4 rounded-2xl bg-[#FBF9F6] border border-sage-200 space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-warm-400 block">Facturación Total</span>
                    <span className="font-serif text-2xl font-black text-emerald-700 block">
                      ${analyticsTotalRevenueUSD.toFixed(2)} <span className="text-xs font-sans text-warm-500">USD</span>
                    </span>
                    <span className="text-xs font-bold text-warm-600 block">
                      ≈ {analyticsTotalRevenueVES.toLocaleString('es-VE', { maximumFractionDigits: 0 })} Bs
                    </span>
                  </div>

                  <div className="p-4 rounded-2xl bg-[#FBF9F6] border border-sage-200 space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-warm-400 block">Citas Culminadas</span>
                    <div className="flex items-baseline gap-2">
                      <span className="font-serif text-2xl font-black text-warm-900">{analyticsCompleted.length}</span>
                      <span className="text-xs font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                        {analyticsAttendanceRate}% Cumplimiento
                      </span>
                    </div>
                    <span className="text-[11px] text-warm-500 block">De {analyticsTotalProcessed} citas procesadas</span>
                  </div>

                  <div className="p-4 rounded-2xl bg-[#FBF9F6] border border-sage-200 space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-warm-400 block">Inasistencias (No-Show)</span>
                    <span className="font-serif text-2xl font-black text-amber-700 block">{analyticsNoShow.length}</span>
                    <span className="text-[11px] text-amber-800 block">
                      {analyticsTotalProcessed > 0 ? ((analyticsNoShow.length / analyticsTotalProcessed) * 100).toFixed(0) : 0}% de inasistencia
                    </span>
                  </div>

                  <div className="p-4 rounded-2xl bg-[#FBF9F6] border border-sage-200 space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-warm-400 block">Cancelaciones &amp; Ticket</span>
                    <span className="font-serif text-2xl font-black text-rose-700 block">{analyticsCancelled.length} <span className="text-xs font-sans text-warm-500">canceladas</span></span>
                    <span className="text-[11px] text-warm-600 block font-semibold">
                      Ticket Promedio: ${analyticsAvgTicketUSD.toFixed(1)} USD
                    </span>
                  </div>
                </div>

                {/* Tabla Contable Detallada */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-warm-800">
                      Detalle Contable del Período ({analyticsBookings.length} registros)
                    </h4>
                    <span className="text-[11px] text-warm-500">
                      Tasa activa: 1 USD = {exchangeRate.toFixed(2)} Bs
                    </span>
                  </div>

                  {analyticsBookings.length === 0 ? (
                    <div className="p-8 text-center rounded-2xl bg-[#FBF9F6] border border-sage-200 space-y-2">
                      <BarChart3 className="w-8 h-8 text-warm-400 mx-auto" />
                      <p className="text-xs font-bold text-warm-700">Sin movimientos en el período seleccionado.</p>
                      <p className="text-[11px] text-warm-400">Prueba cambiando el filtro de período más arriba.</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto border border-sage-200 rounded-2xl bg-white shadow-xs">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="bg-[#16291F] text-white font-bold text-[10px] uppercase tracking-wider">
                            <th className="p-3">Fecha &amp; Hora</th>
                            <th className="p-3">Clienta</th>
                            <th className="p-3">Servicio</th>
                            <th className="p-3">Método Pago</th>
                            <th className="p-3 text-right">Monto USD</th>
                            <th className="p-3 text-right">Monto Bs</th>
                            <th className="p-3 text-center">Estado / Motivo</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-sage-100 text-warm-800">
                          {analyticsBookings.map(b => (
                            <tr key={b.id} className="hover:bg-[#FBF9F6] transition-colors">
                              <td className="p-3 whitespace-nowrap font-bold">
                                {b.date}<br/>
                                <span className="text-[11px] font-normal text-warm-500">{b.timeSlot}</span>
                              </td>
                              <td className="p-3 whitespace-nowrap">
                                <span className="font-bold text-warm-900">{b.clientName}</span><br/>
                                <span className="text-[10px] text-warm-400">{b.clientPhone}</span>
                              </td>
                              <td className="p-3 font-semibold">{b.serviceName}</td>
                              <td className="p-3 whitespace-nowrap capitalize text-warm-600">
                                {b.paymentMethod.replace('_', ' ')}
                              </td>
                              <td className="p-3 whitespace-nowrap text-right font-bold text-emerald-700 font-serif">
                                ${b.totalPriceUSD.toFixed(2)}
                              </td>
                              <td className="p-3 whitespace-nowrap text-right font-semibold text-warm-600">
                                Bs. {(b.totalPriceUSD * exchangeRate).toLocaleString('es-VE', { maximumFractionDigits: 0 })}
                              </td>
                              <td className="p-3 whitespace-nowrap text-center">
                                {b.status === 'completada' ? (
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                                    Completada
                                  </span>
                                ) : b.status === 'confirmada' ? (
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-300">
                                    Confirmada
                                  </span>
                                ) : b.status === 'no_asistio' ? (
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                                    No Asistió
                                  </span>
                                ) : b.status === 'cancelada' ? (
                                  <div className="inline-block">
                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-300 block">
                                      Cancelada
                                    </span>
                                    {b.cancellationReason && (
                                      <span className="text-[9px] text-rose-700 block max-w-[140px] truncate" title={b.cancellationReason}>
                                        {b.cancellationReason}
                                      </span>
                                    )}
                                  </div>
                                ) : (
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                                    En WhatsApp
                                  </span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ══════════════════════════════════════════════════════════════════
                TAB 2: HORARIOS & CALENDARIO 100% AUTOGESTIONABLE
            ══════════════════════════════════════════════════════════════════ */}
            {activeTab === 'calendar' && (
              <div className="space-y-7">
                {sectionHead(
                  'Gestión Integral de Horarios & Agenda',
                  'Configura tus horas de apertura, turnos personalizados y bloquea turnos o días completos de descanso.'
                )}

                {/* 1. Selector de Día y Bloqueo de Día Completo */}
                <div className="p-5 rounded-2xl bg-[#FBF9F6] border border-sage-200 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <label className="text-xs font-bold text-warm-800">Fecha a gestionar:</label>
                      <input 
                        type="date" 
                        value={calendarDate} 
                        onChange={e => setCalendarDate(e.target.value)}
                        className="px-3.5 py-2 bg-white border border-sage-300 rounded-xl text-xs font-bold text-warm-900 focus:outline-none focus:ring-2 focus:ring-sage-400"
                      />
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      <button
                        type="button"
                        onClick={() => handleOpenManualBooking(calendarDate)}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold shadow-xs transition-all cursor-pointer"
                        title="Agendar cita manual para esta fecha"
                      >
                        <Plus className="w-4 h-4" />
                        <span>+ Agendar en este día</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleToggleBlockEntireDay}
                        className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-xs ${
                          isSelectedDayBlocked
                            ? 'bg-emerald-700 hover:bg-emerald-800 text-white'
                            : 'bg-rose-700 hover:bg-rose-800 text-white'
                        }`}
                      >
                        {isSelectedDayBlocked ? (
                          <>
                            <CheckCircle2 className="w-4 h-4" />
                            <span>Desbloquear Día Completo</span>
                          </>
                        ) : (
                          <>
                            <XCircle className="w-4 h-4" />
                            <span>🚫 Bloquear Día Completo (Día Libre / Cerrado)</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {isSelectedDayBlocked && (
                    <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 text-xs font-medium flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                      <span>Este día se encuentra marcado como <strong>Cerrado</strong>. Las clientas verán el día deshabilitado en el catálogo.</span>
                    </div>
                  )}

                  {/* Turnos de este día */}
                  <div>
                    <span className="text-xs font-bold text-warm-800 block mb-2">Turnos de este día (Toca para alternar bloqueo individual):</span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                      {allTimeSlots.map(slot => {
                        const blocked = AppStore.isSlotOccupied(calendarDate, slot);
                        const bookingInSlot = bookingsOnSelectedDate.find(b => b.timeSlot === slot && b.status !== 'cancelada');

                        return (
                          <div
                            key={slot}
                            onClick={() => !bookingInSlot && handleToggleSlot(slot)}
                            className={`p-3.5 rounded-2xl border text-left flex items-center justify-between transition-all ${
                              bookingInSlot
                                ? 'bg-blue-50 border-blue-200 text-blue-950'
                                : blocked
                                ? 'bg-rose-50 border-rose-200 text-rose-900 cursor-pointer hover:bg-rose-100'
                                : 'bg-white border-sage-200 text-warm-900 cursor-pointer hover:border-sage-400'
                            }`}
                          >
                            <div>
                              <span className="font-serif font-bold text-sm block">{slot}</span>
                              <span className="text-[10px] uppercase font-bold tracking-wider opacity-75">
                                {bookingInSlot
                                  ? `Cita: ${bookingInSlot.clientName}`
                                  : blocked
                                  ? 'Bloqueado'
                                  : 'Disponible'}
                              </span>
                            </div>
                            <div className={`p-1.5 rounded-lg ${
                              bookingInSlot
                                ? 'bg-blue-100 text-blue-700'
                                : blocked
                                ? 'bg-rose-100 text-rose-600'
                                : 'bg-emerald-50 text-emerald-600'
                            }`}>
                              {bookingInSlot ? <Clock className="w-4 h-4" /> : blocked ? <XCircle className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* 2. Configuración de Turnos Regulares del Estudio */}
                <div className="p-5 rounded-2xl bg-white border border-sage-200 space-y-4">
                  <div className="flex items-center justify-between border-b border-sage-100 pb-3">
                    <div>
                      <h4 className="font-serif font-bold text-base text-warm-900">Horario Habitual del Estudio</h4>
                      <p className="text-xs text-warm-500">Agrega o elimina horas predeterminadas disponibles para tus clientas.</p>
                    </div>
                    <span className="text-xs font-bold text-sage-800 bg-sage-50 px-3 py-1 rounded-full border border-sage-200">
                      {allTimeSlots.length} turnos activos
                    </span>
                  </div>

                  {/* Add slot form */}
                  <form onSubmit={handleAddCustomSlot} className="flex flex-wrap items-center gap-2">
                    <input
                      type="text"
                      placeholder="Ej: 10:30 AM, 01:00 PM, 05:30 PM..."
                      value={newCustomSlot}
                      onChange={e => setNewCustomSlot(e.target.value)}
                      className="p-2.5 bg-[#FBF9F6] border border-sage-300 rounded-xl text-xs font-semibold text-warm-900 focus:ring-2 focus:ring-sage-400 focus:outline-none w-56"
                    />
                    <button
                      type="submit"
                      className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-[#16291F] hover:bg-sage-900 text-white rounded-xl text-xs font-bold transition-all"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Añadir Turno</span>
                    </button>
                  </form>

                  {/* Active Slots list with delete */}
                  <div className="flex flex-wrap gap-2 pt-1">
                    {allTimeSlots.map(slot => (
                      <div key={slot} className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-sage-50 border border-sage-200 text-xs font-bold text-warm-900">
                        <span>{slot}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveSlot(slot)}
                          className="text-warm-400 hover:text-rose-600 transition-colors p-0.5"
                          title="Eliminar este turno"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

              </div>
            )}

            {/* ══════════════════════════════════════════════════════════════════
                TAB 3: CATÁLOGO DE SERVICIOS 100% AUTOGESTIONABLE
            ══════════════════════════════════════════════════════════════════ */}
            {activeTab === 'services' && (
              <div className="space-y-6">
                {sectionHead(
                  'Catálogo Oficial de Servicios & Precios',
                  'Crea nuevos servicios, edita precios, duración, fotos y distintivos con efecto inmediato en el catálogo público.',
                  <button
                    onClick={handleOpenCreateService}
                    className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-[#16291F] hover:bg-sage-900 text-white rounded-xl text-xs font-bold shadow-sm transition-all active:scale-95"
                  >
                    <Plus className="w-4 h-4" />
                    <span>+ Añadir Nuevo Servicio</span>
                  </button>
                )}

                {/* Service Create / Edit Modal / Form */}
                {(isCreatingService || editingService) && (
                  <form onSubmit={handleSaveServiceForm} className="p-5 sm:p-6 rounded-3xl bg-sage-50/70 border-2 border-sage-300 space-y-4 shadow-sm">
                    <div className="flex items-center justify-between border-b border-sage-200 pb-3">
                      <span className="font-serif font-bold text-base text-warm-900">
                        {isCreatingService ? '✨ Crear Nuevo Servicio' : `✏️ Editando: ${editingService?.name}`}
                      </span>
                      <button
                        type="button"
                        onClick={() => { setIsCreatingService(false); setEditingService(null); setServiceImagePreview(null); }}
                        className="text-xs text-warm-600 hover:text-warm-900 font-bold p-1"
                      >
                        Cancelar
                      </button>
                    </div>

                    {/* Image Selector */}
                    <div>
                      <label className="text-xs font-bold text-warm-800 block mb-2">Foto del Servicio</label>
                      <div className="flex items-start gap-4">
                        <div className="w-24 h-24 rounded-2xl overflow-hidden border-2 border-sage-300 bg-white shrink-0 flex items-center justify-center shadow-xs">
                          {serviceImagePreview ? (
                            <img src={serviceImagePreview} alt="preview" className="w-full h-full object-cover" />
                          ) : serviceForm.imageUrl ? (
                            <img src={serviceForm.imageUrl} alt="preview" className="w-full h-full object-cover" />
                          ) : (
                            <ImageIcon className="w-8 h-8 text-sage-300" />
                          )}
                        </div>
                        <div className="space-y-2">
                          <button
                            type="button"
                            onClick={() => serviceImageRef.current?.click()}
                            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white border border-sage-300 hover:bg-sage-100 text-warm-900 text-xs font-bold rounded-xl transition-all shadow-xs"
                          >
                            <ImagePlus className="w-3.5 h-3.5" />
                            <span>Subir / Cambiar Foto</span>
                          </button>
                          {(serviceImagePreview || serviceForm.imageUrl) && (
                            <button
                              type="button"
                              onClick={() => { setServiceImagePreview(null); setServiceForm(prev => ({ ...prev, imageUrl: '' })); }}
                              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-rose-700 bg-rose-50 hover:bg-rose-100 text-xs font-bold transition-all ml-2"
                            >
                              <Trash2 className="w-3 h-3" />
                              <span>Quitar</span>
                            </button>
                          )}
                          <p className="text-[10px] text-warm-500">Formatos compatibles: JPG, PNG, WebP. Resolución óptima: 800x800 px.</p>
                          <input ref={serviceImageRef} type="file" accept="image/*" onChange={handleServiceImageChange} className="hidden" />
                        </div>
                      </div>
                    </div>

                    {/* Basic info */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs font-bold text-warm-700 block mb-1">Nombre del Servicio *</label>
                        <input
                          type="text"
                          required
                          value={serviceForm.name}
                          onChange={e => setServiceForm({ ...serviceForm, name: e.target.value })}
                          placeholder="Ej: Esmaltado Semipermanente"
                          className={inputCls}
                        />
                      </div>

                      <div>
                        <label className="text-xs font-bold text-warm-700 block mb-1">Categoría</label>
                        <select
                          value={serviceForm.category}
                          onChange={e => setServiceForm({ ...serviceForm, category: e.target.value as 'natural' | 'extensions' | 'pedicure' })}
                          className={inputCls}
                        >
                          <option value="natural">Uña Natural (Semipermanente, Rubber, Capping)</option>
                          <option value="extensions">Extensiones (Polygel, Jelly Tips)</option>
                          <option value="pedicure">Pedicure &amp; Spa</option>
                        </select>
                      </div>

                      <div>
                        <label className="text-xs font-bold text-warm-700 block mb-1">Precio en USD ($) *</label>
                        <input
                          type="number"
                          step="0.50"
                          required
                          value={serviceForm.priceUSD}
                          onChange={e => setServiceForm({ ...serviceForm, priceUSD: parseFloat(e.target.value) || 0 })}
                          className={inputCls}
                        />
                      </div>

                      <div>
                        <label className="text-xs font-bold text-warm-700 block mb-1">Duración (minutos) *</label>
                        <input
                          type="number"
                          step="5"
                          required
                          value={serviceForm.durationMinutes}
                          onChange={e => setServiceForm({ ...serviceForm, durationMinutes: parseInt(e.target.value) || 60 })}
                          className={inputCls}
                        />
                      </div>
                    </div>

                    {/* Badge & psychological labels */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs font-bold text-warm-700 block mb-1">Etiqueta Badge (Opcional)</label>
                        <input
                          type="text"
                          value={serviceForm.badgeText || ''}
                          placeholder="Ej: Más Solicitado, Clásico, Nuevo"
                          onChange={e => setServiceForm({ ...serviceForm, badgeText: e.target.value })}
                          className={inputCls}
                        />
                      </div>

                      <div>
                        <label className="text-xs font-bold text-warm-700 block mb-1">Color del Badge</label>
                        <select
                          value={serviceForm.badgeColor}
                          onChange={e => setServiceForm({ ...serviceForm, badgeColor: e.target.value })}
                          className={inputCls}
                        >
                          <option value="bg-sage-800">Verde Salvia Elegante</option>
                          <option value="bg-emerald-800">Verde Esmeralda</option>
                          <option value="bg-amber-700">Ámbar / Oro Champagne</option>
                          <option value="bg-rose-700">Rosa Palo</option>
                          <option value="bg-purple-700">Púrpura</option>
                        </select>
                      </div>
                    </div>

                    {/* Descriptions */}
                    <div>
                      <label className="text-xs font-bold text-warm-700 block mb-1">Descripción Breve</label>
                      <input
                        type="text"
                        value={serviceForm.shortDescription || ''}
                        placeholder="Descripción concisa para la tarjeta del catálogo..."
                        onChange={e => setServiceForm({ ...serviceForm, shortDescription: e.target.value })}
                        className={inputCls}
                      />
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                      <input
                        type="checkbox"
                        id="isAvailableCheckbox"
                        checked={serviceForm.isAvailable ?? true}
                        onChange={e => setServiceForm({ ...serviceForm, isAvailable: e.target.checked })}
                        className="rounded border-sage-300 text-sage-800 focus:ring-sage-400 h-4 w-4"
                      />
                      <label htmlFor="isAvailableCheckbox" className="text-xs font-bold text-warm-800 cursor-pointer">
                        Servicio activo y disponible para reservas en la web
                      </label>
                    </div>

                    <button
                      type="submit"
                      className="w-full py-3 rounded-xl bg-[#16291F] hover:bg-sage-900 text-white font-bold text-xs shadow-sm transition-all"
                    >
                      {isCreatingService ? 'Guardar & Publicar en Catálogo' : 'Guardar Cambios del Servicio'}
                    </button>
                  </form>
                )}

                {/* Services List Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {services.map(s => (
                    <div key={s.id} className="rounded-3xl bg-[#FBF9F6] border border-sage-200 overflow-hidden hover:border-sage-300 transition-all flex flex-col justify-between shadow-xs">
                      {s.imageUrl && (
                        <div className="h-32 overflow-hidden bg-sage-100 relative">
                          <img src={s.imageUrl} alt={s.name} className="w-full h-full object-cover" />
                          {!s.isAvailable && (
                            <span className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-rose-600 text-white text-[10px] font-bold">
                              Oculto en Catálogo
                            </span>
                          )}
                        </div>
                      )}
                      <div className="p-4 space-y-3 flex-1 flex flex-col justify-between">
                        <div>
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <span className="font-serif font-bold text-warm-900 text-base">{s.name}</span>
                              <span className="block text-xs text-warm-500 mt-0.5">{s.shortDescription}</span>
                            </div>
                            <span className="font-serif text-lg font-bold text-emerald-700 whitespace-nowrap">
                              ${s.priceUSD.toFixed(2)}
                            </span>
                          </div>

                          {s.badgeText && (
                            <span className={`mt-2 inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase text-white ${s.badgeColor || 'bg-sage-800'}`}>
                              {s.badgeText}
                            </span>
                          )}
                        </div>

                        <div className="pt-3 border-t border-sage-100 flex items-center justify-between text-xs">
                          <span className="text-warm-500">{s.durationMinutes} minutos &bull; {s.category}</span>
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => handleOpenEditService(s)}
                              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white hover:bg-sage-50 border border-sage-200 text-warm-800 font-bold text-xs transition-colors"
                            >
                              <Edit2 className="w-3 h-3" />
                              <span>Editar</span>
                            </button>
                            <button
                              onClick={() => handleDeleteService(s.id, s.name)}
                              className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 border border-transparent hover:border-rose-200 transition-colors"
                              title="Eliminar servicio"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ══════════════════════════════════════════════════════════════════
                TAB 4: GESTIÓN DE CLIENTELA (CRM VISUAL) & EMAIL
            ══════════════════════════════════════════════════════════════════ */}
            {activeTab === 'crm' && (
              <div className="space-y-6">
                {sectionHead(
                  'Gestión Visual de Clientela & CRM',
                  'Monitorea el progreso de sellos de fidelización (6+1 gratis), envía recordatorios por WhatsApp y dispara correos profesionales.'
                )}

                {/* CRM Summary Pill & Search */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                  <div className="relative w-full sm:w-72">
                    <Search className="w-4 h-4 text-warm-400 absolute left-3 top-3" />
                    <input
                      type="text"
                      placeholder="Buscar por nombre o teléfono..."
                      value={crmSearch}
                      onChange={e => setCrmSearch(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 bg-[#FBF9F6] border border-sage-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-sage-400"
                    />
                  </div>

                  <div className="flex items-center gap-2 text-xs">
                    <span className="px-3 py-1 rounded-full bg-sage-50 border border-sage-200 text-warm-800 font-bold">
                      {clientsList.length} clientas registradas
                    </span>
                    <span className="px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 font-bold">
                      {clientsList.filter(c => c.hasFreeService).length} con Cejas GRATIS
                    </span>
                  </div>
                </div>

                {/* Clients Table / Cards */}
                {clientsList.length === 0 ? (
                  <div className="text-center py-16 space-y-2">
                    <Users className="w-10 h-10 text-sage-400 mx-auto" />
                    <p className="text-sm font-bold text-warm-800">No se encontraron clientas.</p>
                    <p className="text-xs text-warm-500">A medida que las clientas agenden en el catálogo, se agregarán a este panel CRM.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {clientsList.map(client => (
                      <div key={client.phone} className="p-4 rounded-2xl bg-[#FBF9F6] border border-sage-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-sage-300 transition-all">
                        
                        {/* Client details */}
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-warm-900 text-sm">{client.name}</span>
                            {client.hasFreeService ? (
                              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500 text-white shadow-xs">
                                🏆 ¡Cejas de Cortesía!
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-200">
                                {client.stampsCount}/5 sellos
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-3 text-xs text-warm-500">
                            <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{client.phone}</span>
                            {client.instagram && (
                              <span className="flex items-center gap-1 text-pink-600 font-semibold">
                                <InstagramIcon className="w-3 h-3" />@{client.instagram.replace('@','')}
                              </span>
                            )}
                            <span>&bull; Última visita: {client.lastVisit}</span>
                          </div>

                          {/* 5 Stamps Visual Indicator */}
                          <div className="flex items-center gap-1.5 pt-1">
                            {[1, 2, 3, 4, 5].map(num => (
                              <div
                                key={num}
                                className={`w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-bold border transition-all ${
                                  num <= client.stampsCount
                                    ? 'bg-amber-400 border-amber-300 text-sage-950 font-black'
                                    : 'bg-white border-sage-200 text-warm-400'
                                }`}
                              >
                                {num <= client.stampsCount ? '✓' : num}
                              </div>
                            ))}
                            <span className="text-[10px] text-warm-500 font-medium ml-1">
                              {client.stampsCount >= 5 ? '¡Completó ciclo (5/5)!' : `Faltan ${Math.max(0, 5 - client.stampsCount)} para gratis`}
                            </span>
                          </div>
                        </div>

                        {/* Actions: Stamp Adjusters, WhatsApp & Email */}
                        <div className="flex flex-wrap items-center gap-2 shrink-0">
                          {/* Manual stamp buttons */}
                          <div className="flex items-center rounded-xl bg-white border border-sage-200 p-0.5 shadow-xs">
                            <button
                              type="button"
                              onClick={() => handleAdjustStamp(client.phone, client.name, -1)}
                              className="px-2 py-1 text-xs font-bold text-warm-600 hover:text-rose-600"
                              title="Restar 1 sello"
                            >
                              -1
                            </button>
                            <span className="px-1 text-[11px] font-bold text-warm-800">{client.stampsCount}</span>
                            <button
                              type="button"
                              onClick={() => handleAdjustStamp(client.phone, client.name, 1)}
                              className="px-2 py-1 text-xs font-bold text-warm-600 hover:text-emerald-700"
                              title="Sumar 1 sello manual"
                            >
                              +1
                            </button>
                          </div>

                          {/* Direct WhatsApp Message with CRM template */}
                          <a
                            href={`https://wa.me/${client.phone}?text=¡Hola%20${encodeURIComponent(client.name)}%20bella!%20💕%20Te%20saludamos%20de%20${encodeURIComponent(tenantName)}.%20${
                              client.hasFreeService
                                ? '¡Queremos%20felicitarte%20porque%20has%20completado%20tus%205%20visitas%20y%20tu%20servicio%20de%20cortesía%20es%20100%25%20GRATIS!%20¿Cuándo%20deseas%20agendarlo?'
                                : `Tienes%20${client.stampsCount}%20de%205%20sellos%20en%20tu%20tarjeta%20VIP.%20¡Te%20esperamos%20pronto!`
                            }`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-[#25D366] hover:bg-[#1EBE5D] text-white text-xs font-bold shadow-xs"
                          >
                            <MessageCircle className="w-3.5 h-3.5" />
                            <span>WhatsApp</span>
                          </a>

                          {/* Trigger Email Modal */}
                          <button
                            type="button"
                            onClick={() => setEmailModalClient({
                              name: client.name,
                              phone: client.phone,
                              stamps: client.stampsCount,
                              lastBooking: client.lastBooking,
                            })}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-white hover:bg-sage-50 border border-sage-300 text-warm-800 text-xs font-bold shadow-xs"
                          >
                            <Mail className="w-3.5 h-3.5 text-sage-600" />
                            <span>Disparar Email</span>
                          </button>
                        </div>

                      </div>
                    ))}
                  </div>
                )}

                {/* ── EMAIL TRIGGER MODAL ── */}
                {emailModalClient && (
                  <div className="p-5 rounded-3xl bg-sage-50 border-2 border-sage-300 space-y-4 shadow-md">
                    <div className="flex items-center justify-between border-b border-sage-200 pb-3">
                      <div className="flex items-center gap-2">
                        <Mail className="w-5 h-5 text-sage-800" />
                        <div>
                          <h4 className="font-serif font-bold text-base text-warm-900">
                            Disparador de Correo CRM — {emailModalClient.name}
                          </h4>
                          <p className="text-xs text-warm-500">Preparado para envío con tu cliente de correo o Webmail Arsys.</p>
                        </div>
                      </div>
                      <button
                        onClick={() => setEmailModalClient(null)}
                        className="text-xs font-bold text-warm-600 hover:text-warm-900"
                      >
                        Cerrar
                      </button>
                    </div>

                    {/* Template Selector */}
                    <div className="flex flex-wrap gap-2">
                      {[
                        { key: 'confirmation', label: '1. Confirmación de Cita' },
                        { key: 'reminder', label: '2. Recordatorio 24h' },
                        { key: 'loyalty_prize', label: '3. Premio Depilación de Cejas de Cortesía' },
                      ].map(t => (
                        <button
                          key={t.key}
                          onClick={() => setEmailTemplate(t.key as typeof emailTemplate)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                            emailTemplate === t.key
                              ? 'bg-[#16291F] text-white shadow-xs'
                              : 'bg-white text-warm-700 border border-sage-200 hover:bg-sage-100'
                          }`}
                        >
                          {t.label}
                        </button>
                      ))}
                    </div>

                    {/* Email preview */}
                    <div className="space-y-2 bg-white p-4 rounded-2xl border border-sage-200 text-xs">
                      <div>
                        <span className="font-bold text-warm-500 block text-[10px] uppercase">Asunto:</span>
                        <span className="font-bold text-warm-900">{getEmailContent().subject}</span>
                      </div>
                      <div className="pt-2 border-t border-sage-100">
                        <span className="font-bold text-warm-500 block text-[10px] uppercase mb-1">Cuerpo del Mensaje:</span>
                        <pre className="whitespace-pre-wrap font-sans text-xs text-warm-800 leading-relaxed bg-[#FBF9F6] p-3 rounded-xl border border-sage-100">
                          {getEmailContent().body}
                        </pre>
                      </div>
                    </div>

                    {/* Email Actions */}
                    <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                      <button
                        onClick={handleCopyEmailBody}
                        className="inline-flex items-center gap-1.5 px-4 py-2 bg-white hover:bg-sage-50 text-warm-900 border border-sage-300 rounded-xl text-xs font-bold transition-all"
                      >
                        <Copy className="w-3.5 h-3.5" />
                        <span>{emailCopySuccess ? '¡Texto Copiado!' : 'Copiar Plantilla de Correo'}</span>
                      </button>

                      <button
                        onClick={handleOpenMailClient}
                        className="inline-flex items-center gap-1.5 px-5 py-2 bg-[#16291F] hover:bg-sage-900 text-white rounded-xl text-xs font-bold transition-all shadow-xs"
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span>Abrir en Gmail / Correo</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* ── GMAIL PERSONAL & IDENTIDAD DEL ESTUDIO ── */}
                <div className="p-5 rounded-2xl bg-white border border-sage-200 space-y-3">
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-sage-800" />
                    <h4 className="font-serif font-bold text-base text-warm-900">Correo Personal de Contacto &amp; Notificaciones (Gmail)</h4>
                  </div>
                  <p className="text-xs text-warm-500">
                    Configura el correo Gmail personal de Andrea para el envío de confirmaciones y fidelización directa.
                  </p>

                  <form onSubmit={handleSaveEmailSettings} className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                    <div>
                      <label className="text-[11px] font-bold text-warm-700 block mb-1">Correo Gmail de Andrea</label>
                      <input
                        type="email"
                        value={emailSettings.contactEmail}
                        onChange={e => setEmailSettings({ ...emailSettings, contactEmail: e.target.value })}
                        className={inputCls}
                        placeholder="andrealabradornails@gmail.com"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-warm-700 block mb-1">Nombre Comercial Remitente</label>
                      <input
                        type="text"
                        value={emailSettings.senderName}
                        onChange={e => setEmailSettings({ ...emailSettings, senderName: e.target.value })}
                        className={inputCls}
                        placeholder="Andrea Labrador Nails Studio"
                      />
                    </div>
                    <div className="sm:col-span-2 pt-1 flex items-center justify-between">
                      <button
                        type="submit"
                        className="px-5 py-2 rounded-xl bg-[#16291F] hover:bg-sage-900 text-white font-bold text-xs shadow-xs"
                      >
                        Guardar Configuración Gmail
                      </button>
                      {emailSettingsSaved && (
                        <span className="text-xs text-emerald-700 font-bold flex items-center gap-1">
                          <Check className="w-4 h-4" /> Configuración de Gmail guardada con éxito
                        </span>
                      )}
                    </div>
                  </form>
                </div>

              </div>
            )}

            {/* ══════════════════════════════════════════════════════════════════
                TAB: CARRUSEL DE FOTOS & LOOKBOOK
            ══════════════════════════════════════════════════════════════════ */}
            {activeTab === 'gallery' && (
              <div className="space-y-6">
                {sectionHead(
                  'Gestión del Carrusel de Fotos & Lookbook',
                  `Administra las fotos reales de uñas que ven tus clientas en el inicio. Límite: ${gallerySlides.length} de 40 fotos permitidas.`
                )}

                {/* Subir Nueva Foto */}
                <div className="p-6 rounded-3xl bg-white border border-sage-200 shadow-soft space-y-4">
                  <div className="flex items-center justify-between border-b border-sage-100 pb-3">
                    <div className="flex items-center gap-2">
                      <ImagePlus className="w-5 h-5 text-sage-800" />
                      <h4 className="font-serif font-bold text-base text-warm-900">Subir Nueva Foto al Carrusel</h4>
                    </div>
                    <span className="text-xs font-bold text-sage-700 bg-sage-50 px-3 py-1 rounded-full border border-sage-200">
                      Tope Máximo: 40 Fotos
                    </span>
                  </div>

                  <form onSubmit={handleAddSlide} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-bold text-warm-800 block mb-1">Nombre del Servicio o Técnica *</label>
                      <input
                        type="text"
                        value={newSlideName}
                        onChange={e => setNewSlideName(e.target.value)}
                        placeholder="Ej: Nivelación Rubber Cherry"
                        className={inputCls}
                        required
                      />
                    </div>

                    <div>
                      <label className="text-xs font-bold text-warm-800 block mb-1">Etiqueta Superior (Badge)</label>
                      <input
                        type="text"
                        value={newSlideTag}
                        onChange={e => setNewSlideTag(e.target.value)}
                        placeholder="Ej: Refuerzo para uña natural"
                        className={inputCls}
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="text-xs font-bold text-warm-800 block mb-1">
                        Foto desde tu Teléfono, Tablet o PC (JPG, PNG o WEBP &bull; Máx 800 KB) *
                      </label>
                      <div className="flex items-center gap-4">
                        <label className="flex-1 cursor-pointer flex items-center justify-center gap-2 px-4 py-3 rounded-2xl border-2 border-dashed border-sage-300 hover:border-sage-500 bg-warm-50 text-xs font-bold text-sage-800 transition-all">
                          <Upload className="w-4 h-4 text-sage-600" />
                          <span>{newSlideImage ? 'Cambiar Foto Seleccionada' : 'Seleccionar Archivo de Imagen'}</span>
                          <input
                            type="file"
                            accept="image/jpeg,image/png,image/webp"
                            onChange={handleSlideImageUpload}
                            className="hidden"
                          />
                        </label>
                        {newSlideImage && (
                          <div className="w-14 h-14 rounded-2xl overflow-hidden border border-sage-300 shrink-0 shadow-xs">
                            <img src={newSlideImage} alt="Previa" className="w-full h-full object-cover" />
                          </div>
                        )}
                      </div>
                    </div>

                    {galleryError && (
                      <div className="sm:col-span-2 p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 shrink-0" />
                        <span>{galleryError}</span>
                      </div>
                    )}

                    {gallerySuccess && (
                      <div className="sm:col-span-2 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 shrink-0" />
                        <span>{gallerySuccess}</span>
                      </div>
                    )}

                    <div className="sm:col-span-2 flex justify-end">
                      <button
                        type="submit"
                        disabled={isUploadingSlide}
                        className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-[#16291F] hover:bg-sage-900 text-white font-bold text-xs shadow-soft transition-all active:scale-95 disabled:opacity-50"
                      >
                        <Plus className="w-4 h-4 text-amber-300" />
                        <span>{isUploadingSlide ? 'Subiendo y Optimizando...' : 'Agregar Foto al Carrusel'}</span>
                      </button>
                    </div>
                  </form>
                </div>

                {/* Galería de Fotos Actuales */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-serif font-bold text-base text-warm-900">
                      Fotos Activas en el Carrusel ({gallerySlides.length})
                    </h4>
                    <span className="text-xs text-warm-500">Se muestran en rotación automática</span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3.5">
                    {gallerySlides.map((slide, idx) => (
                      <div key={slide.id} className="relative rounded-2xl overflow-hidden border border-sage-200 bg-white shadow-xs group">
                        <div className="aspect-[4/5] overflow-hidden bg-sage-950">
                          <img
                            src={slide.imageUrl}
                            alt={slide.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-all duration-300"
                          />
                        </div>

                        {/* Tag */}
                        <div className="absolute top-2 left-2">
                          <span className="text-[9px] font-bold bg-black/60 backdrop-blur-md text-white px-2 py-0.5 rounded-full">
                            #{idx + 1}
                          </span>
                        </div>

                        {/* Info & Delete */}
                        <div className="p-2.5 bg-white space-y-1">
                          <p className="text-xs font-bold text-warm-900 truncate" title={slide.name}>
                            {slide.name}
                          </p>
                          <div className="flex items-center justify-between pt-1 border-t border-sage-100">
                            <span className="text-[10px] text-sage-600 truncate max-w-[90px]">
                              {slide.tag || 'Diseño'}
                            </span>
                            <button
                              onClick={() => handleDeleteSlide(slide.id)}
                              className="p-1 rounded-lg text-rose-500 hover:text-rose-700 hover:bg-rose-50 transition-colors"
                              title="Eliminar foto por completo"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

              </div>
            )}

            {/* ══════════════════════════════════════════════════════════════════
                TAB: EQUIPO & ZONAS DEL SALÓN (100% CONECTADO A NEON DB)
            ══════════════════════════════════════════════════════════════════ */}
            {activeTab === 'team' && (
              <div className="space-y-6">
                {sectionHead(
                  `Equipo de Especialistas & Zonas del Salón — ${tenantName}`,
                  'Módulo Pro V2 conectado en vivo a Neon Postgres (tablas staff_members y studio_zones). Agrega o edita especialistas, comisiones y estaciones de trabajo reales.',
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={fetchTenantTeamAndZones}
                      className="inline-flex items-center gap-1.5 px-3 py-2 bg-sage-100 hover:bg-sage-200 text-warm-900 rounded-xl text-xs font-bold transition-all cursor-pointer"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isLoadingTeamDb ? 'animate-spin' : ''}`} />
                      <span>Sincronizar DB</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setInviteProNotice(false);
                        setIsInviteModalOpen(true);
                      }}
                      className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#16291F] hover:bg-sage-900 text-amber-300 rounded-xl text-xs font-bold shadow-sm transition-all cursor-pointer active:scale-95"
                    >
                      <UserPlus className="w-4 h-4" />
                      <span>+ Nueva Especialista en DB</span>
                    </button>
                  </div>
                )}

                {/* ZONAS / ESTACIONES DEL LOCAL (studio_zones en Neon DB) */}
                <div className="p-5 rounded-3xl bg-[#FBF9F6] border border-sage-200 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-sage-200 pb-3">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-full">
                        Tabla Neon: studio_zones ({dbZones.length} activas)
                      </span>
                      <h4 className="font-serif font-bold text-base text-warm-900 mt-1">
                        Zonas, Cabinas y Estaciones del Salón
                      </h4>
                    </div>
                  </div>

                  <form onSubmit={handleSaveZoneToDb} className="grid grid-cols-1 sm:grid-cols-4 gap-2.5 items-end bg-white p-3.5 rounded-2xl border border-sage-200">
                    <div className="sm:col-span-2">
                      <label className="text-[11px] font-bold text-warm-700 block mb-1">Nombre de la Zona / Cabina / Mesa *</label>
                      <input
                        type="text"
                        required
                        value={newZoneName}
                        onChange={e => setNewZoneName(e.target.value)}
                        placeholder="Ej: Cabina de Cejas & Pestañas, Estación Nails #2..."
                        className={inputCls}
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-warm-700 block mb-1">Capacidad Simultánea</label>
                      <input
                        type="number"
                        min="1"
                        max="20"
                        value={newZoneCapacity}
                        onChange={e => setNewZoneCapacity(e.target.value)}
                        className={inputCls}
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={isLoadingTeamDb}
                      className="px-4 py-2.5 rounded-xl bg-[#16291F] hover:bg-sage-900 text-white font-bold text-xs shadow-xs cursor-pointer"
                    >
                      + Crear Zona en DB
                    </button>
                  </form>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                    {dbZones.map((z: any) => (
                      <div key={z.id} className="p-3.5 rounded-2xl bg-white border border-sage-200 flex items-center justify-between gap-2 shadow-2xs">
                        <div className="flex items-center gap-2.5">
                          <span
                            className="w-3.5 h-3.5 rounded-full shrink-0 border border-black/10"
                            style={{ backgroundColor: z.color_tag || '#C5A059' }}
                          />
                          <div>
                            <p className="font-bold text-xs text-warm-900">{z.name}</p>
                            <span className="text-[10px] text-warm-500">
                              Capacidad: {z.capacity || 1} estación(es) &bull; Activa
                            </span>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleDeleteZoneFromDb(z.id)}
                          className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 transition-colors"
                          title="Eliminar zona de Neon DB"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* DIRECTORIO DE PERSONAL Y ESPECIALISTAS (staff_members en Neon DB) */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-serif font-bold text-base text-warm-900">
                        Especialistas &amp; Personal en Base de Datos ({dbStaff.length})
                      </h4>
                      <p className="text-xs text-warm-500">
                        Sincronizado en tiempo real con la tabla <code className="text-warm-800 font-bold">staff_members</code> para el salón <strong className="text-warm-900">{tenantSlug}</strong>.
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                    {dbStaff.map((member: any) => {
                      const displayName = member.name || member.full_name || 'Especialista';
                      const initials = displayName
                        .split(' ')
                        .map((n: string) => n[0])
                        .join('')
                        .slice(0, 2)
                        .toUpperCase();
                      const rawSpecs = member.specialty_tags || member.specialties;
                      const specs = Array.isArray(rawSpecs) ? rawSpecs.join(', ') : 'Especialista Integral';
                      const comm = Number(member.commission_percent ?? member.commission_pct ?? 50);
                      return (
                        <div key={member.id} className="p-4 rounded-2xl bg-white border border-sage-200 space-y-3 shadow-2xs">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-3">
                              <div
                                className="w-10 h-10 rounded-xl text-white font-serif font-bold flex items-center justify-center text-sm shadow-xs"
                                style={{ backgroundColor: member.avatar_color || '#16291F' }}
                              >
                                {initials}
                              </div>
                              <div>
                                <div className="flex items-center gap-2 flex-wrap">
                                  <h5 className="font-bold text-warm-900 text-sm">{displayName}</h5>
                                  <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-emerald-100 text-emerald-900 border border-emerald-300">
                                    {member.role_title || 'Especialista'}
                                  </span>
                                </div>
                                {member.phone && (
                                  <p className="text-[11px] text-warm-500 flex items-center gap-1 mt-0.5">
                                    <Phone className="w-3 h-3" /> {member.phone}
                                  </p>
                                )}
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleDeleteStaffFromDb(member.id)}
                              className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 transition-colors"
                              title="Eliminar especialista de Neon DB"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>

                          <div className="grid grid-cols-2 gap-2 text-[11px] bg-[#FBF9F6] p-2.5 rounded-xl border border-sage-100">
                            <div>
                              <span className="text-warm-400 font-bold uppercase text-[9px] block">Especialidades</span>
                              <span className="text-warm-800 font-medium">{specs}</span>
                            </div>
                            <div>
                              <span className="text-warm-400 font-bold uppercase text-[9px] block">Comisión Pactada</span>
                              <span className="text-emerald-800 font-bold">{comm}% por servicio</span>
                            </div>
                          </div>

                          <div className="flex items-center justify-between text-[11px] pt-1 border-t border-sage-100">
                            <span className="text-emerald-700 font-bold flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5" /> Activa en Neon Postgres ({member.schedule_summary || 'Jornada Activa'})
                            </span>
                            <span className="text-warm-400 text-[10px]">ID: {member.id}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* ══════════════════════════════════════════════════════════════════
                TAB 5: TASA & RESPALDOS
            ══════════════════════════════════════════════════════════════════ */}
            {activeTab === 'settings' && (
              <div className="space-y-6">
                {sectionHead(
                  'Tasa de Cambio Oficial & Respaldos',
                  'Actualiza la tasa del dólar en Bolívares y gestiona tus copias de seguridad de datos.'
                )}

                <form onSubmit={handleSaveRate} className="p-5 rounded-2xl bg-sage-50 border border-sage-200 space-y-3">
                  <span className="text-xs font-bold text-warm-900 uppercase tracking-wider block">Tasa de Cambio del Día (Binance / Monitor Bs / USD)</span>
                  <p className="text-xs text-warm-500">
                    Puedes actualizar esta tasa diariamente de forma manual según la cotización en Binance o tasa del día para los totales en WhatsApp y pagos móviles.
                  </p>
                  <div className="flex items-center gap-3">
                    <div className="relative w-44">
                      <input
                        type="number"
                        step="0.01"
                        value={currentRate}
                        onChange={e => setCurrentRate(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-white border border-sage-200 text-warm-900 font-bold text-sm focus:outline-none focus:ring-2 focus:ring-sage-400 pr-10"
                      />
                      <span className="absolute right-3 top-2 text-xs text-warm-400">Bs</span>
                    </div>
                    <button type="submit" className="px-5 py-2 rounded-xl bg-[#16291F] hover:bg-sage-900 text-white font-bold text-xs transition-all">
                      Actualizar
                    </button>
                    {rateSavedMessage && <span className="text-xs text-emerald-700 font-bold flex items-center gap-1"><Check className="w-3.5 h-3.5" /> Guardado</span>}
                  </div>
                </form>

                <div className="p-5 rounded-2xl bg-white border border-sage-200 space-y-4">
                  <span className="text-xs font-bold text-warm-900 uppercase tracking-wider block">Copia de Seguridad de Datos</span>
                  <p className="text-xs text-warm-500 leading-relaxed">
                    Descarga una copia completa de tus citas, servicios, turnos y fidelización en formato JSON.
                  </p>
                  <div className="flex flex-wrap gap-3">
                    <button
                      onClick={handleExportJSON}
                      className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-sage-100 hover:bg-sage-200 text-warm-900 text-xs font-bold border border-sage-200 transition-colors"
                    >
                      <Download className="w-4 h-4" />
                      <span>Descargar Respaldo JSON</span>
                    </button>
                    <label className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-sage-100 hover:bg-sage-200 text-warm-900 text-xs font-bold border border-sage-200 cursor-pointer transition-colors">
                      <Upload className="w-4 h-4" />
                      <span>Restaurar desde JSON</span>
                      <input type="file" accept=".json" onChange={handleImportJSON} className="hidden" />
                    </label>
                  </div>
                </div>
              </div>
            )}

            {/* ══════════════════════════════════════════════════════════════════
                TAB: DISEÑO DE CARTA, PALETA & TIPOGRAFÍA EN VIVO
            ══════════════════════════════════════════════════════════════════ */}
            {activeTab === 'theme' && (
              <SalonThemeStudio
                tenantSlug={tenantSlug}
                onOpenPublicCatalog={onExitToCatalog}
              />
            )}

            {/* ══════════════════════════════════════════════════════════════════
                TAB: QR DINÁMICOS & ANALÍTICA DE ESCANEOS EN TIEMPO REAL
            ══════════════════════════════════════════════════════════════════ */}
            {activeTab === 'qr' && (
              <DynamicQrManager
                tenantSlug={tenantSlug as any}
                tenantName={salonTheme.salonName || tenantName}
              />
            )}

            {/* ── PUESTA A PUNTO Y ACTIVACIÓN DE CUENTA (Orden B1-c §3 y §4) ── */}
            {activeTab === 'puesta_a_punto' && (
              <div className="space-y-6">
                {sectionHead(
                  'Periodo de Puesta a Punto',
                  'Envía tus solicitudes de cambio o personalización. Todo lo que pidas y configures se conserva siempre.'
                )}

                {/* Banner Activar mi cuenta (solo visible para cuentas de puesta a punto) */}
                {currentUser?.cuenta_prueba && (
                  <div className="p-5 rounded-2xl bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200/80 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800 bg-amber-100 px-2.5 py-0.5 rounded-full inline-block">
                        Fase de Puesta a Punto Activa
                      </span>
                      <h4 className="font-bold text-sm text-[#18181B] mt-1">¿Lista para activar tu cuenta definitiva?</h4>
                      <p className="text-xs text-zinc-600 max-w-xl leading-relaxed">
                        Al activar tu cuenta sustituirás el acceso temporal por tu correo personal y contraseña definitiva. <strong>No se borra nada</strong>: tu catálogo, equipo, zonas, citas, fichas de clientas y solicitudes se conservan intactos.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setActivarError(null);
                        setActivarSuccess(null);
                        setActivarPaso(1);
                        setShowActivarModal(true);
                      }}
                      className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-md transition-colors cursor-pointer flex items-center gap-2 shrink-0"
                    >
                      <KeyRound className="w-4 h-4" />
                      <span>Activar mi cuenta</span>
                    </button>
                  </div>
                )}

                {/* Formulario de puesta a punto (Orden B1-c §3.1) */}
                <div className="p-6 rounded-2xl bg-zinc-50 border border-zinc-200 space-y-4">
                  <div>
                    <h4 className="font-bold text-sm text-[#18181B]">Formulario de Puesta a Punto</h4>
                    <p className="text-xs text-zinc-500 mt-0.5">
                      Describe los cambios o ajustes que necesitas en tu salón (mínimo 10 caracteres, máximo 3.000). Máximo 10 solicitudes al día.
                    </p>
                  </div>

                  {solicitudError && (
                    <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                      <span>{solicitudError}</span>
                    </div>
                  )}

                  {solicitudSuccess && (
                    <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>{solicitudSuccess}</span>
                    </div>
                  )}

                  <form onSubmit={handleEnviarSolicitud} className="space-y-4">
                    <div>
                      <textarea
                        required
                        rows={4}
                        minLength={10}
                        maxLength={3000}
                        value={solicitudTexto}
                        onChange={(e) => setSolicitudTexto(e.target.value)}
                        placeholder="Ej: Quisiera añadir 3 nuevos servicios de spa capilar, cambiar el horario de los sábados de 10:00 a 19:00, y ajustar la paleta de colores a tonos oro..."
                        className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-300 text-xs focus:outline-none focus:border-amber-600 bg-white leading-relaxed resize-y"
                      />
                      <div className="flex justify-between items-center text-[10px] text-zinc-400 mt-1">
                        <span>Mínimo 10 caracteres</span>
                        <span>{solicitudTexto.length} / 3.000 caracteres</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="quiereLlamada"
                        checked={solicitudQuiereLlamada}
                        onChange={(e) => setSolicitudQuiereLlamada(e.target.checked)}
                        className="rounded border-zinc-300 text-amber-600 focus:ring-amber-500 cursor-pointer"
                      />
                      <label htmlFor="quiereLlamada" className="text-xs text-zinc-700 cursor-pointer select-none font-medium">
                        Quiero una llamada para coordinar estos cambios
                      </label>
                    </div>

                    <div className="pt-1 flex justify-end">
                      <button
                        type="submit"
                        disabled={enviandoSolicitud || solicitudTexto.trim().length < 10}
                        className="px-5 py-2.5 rounded-xl bg-[#18181B] hover:bg-black text-white font-bold text-xs shadow-sm disabled:opacity-50 flex items-center gap-2 cursor-pointer transition-colors"
                      >
                        {enviandoSolicitud ? (
                          <>
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            <span>Enviando solicitud...</span>
                          </>
                        ) : (
                          <>
                            <Send className="w-3.5 h-3.5" />
                            <span>Enviar solicitud</span>
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                </div>

                {/* Historial de solicitudes (nunca se borra) */}
                <div className="p-6 rounded-2xl bg-white border border-zinc-200 space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-zinc-100">
                    <div>
                      <h4 className="font-bold text-sm text-[#18181B]">Historial de Solicitudes de Puesta a Punto</h4>
                      <p className="text-xs text-zinc-500 mt-0.5">Registro permanente de todas las peticiones enviadas por este salón (se conserva siempre).</p>
                    </div>
                    <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-zinc-100 text-zinc-700">
                      {peticiones.length} Solicitudes
                    </span>
                  </div>

                  {peticiones.length === 0 ? (
                    <p className="text-xs text-zinc-400 py-6 text-center">Aún no has enviado ninguna solicitud de puesta a punto.</p>
                  ) : (
                    <div className="divide-y divide-zinc-100">
                      {peticiones.map((p: any) => (
                        <div key={p.id} className="py-4 space-y-2">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                p.estado === 'hecha' ? 'bg-emerald-100 text-emerald-800' :
                                p.estado === 'en_curso' ? 'bg-blue-100 text-blue-800' :
                                'bg-amber-100 text-amber-800'
                              }`}>
                                {p.estado || 'recibida'}
                              </span>
                              {p.priority === 'high' && (
                                <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-rose-100 text-rose-800">
                                  Llamada solicitada
                                </span>
                              )}
                            </div>
                            <span className="text-[11px] text-zinc-400">
                              {p.createdAt ? new Date(p.createdAt).toLocaleString('es-ES') : ''}
                            </span>
                          </div>
                          <p className="text-xs text-zinc-800 whitespace-pre-wrap leading-relaxed bg-zinc-50 p-3 rounded-xl border border-zinc-100">
                            {p.body}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            </div>
          </main>
        </div>
      </div>

      {/* ── MODAL ACTIVAR MI CUENTA (Orden B1-c §4) ── */}
      {showActivarModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl border border-black/10 space-y-5 animate-in fade-in">
            <div className="flex items-center justify-between pb-3 border-b border-black/10">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
                  <KeyRound className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-[#18181B]">Activar mi cuenta de VANESEV</h3>
                  <span className="text-[10px] text-zinc-500 font-medium">Paso {activarPaso} de 2 &bull; Acceso definitivo</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowActivarModal(false);
                  setActivarError(null);
                  setActivarSuccess(null);
                }}
                className="p-1 rounded-full text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-950 text-xs space-y-1">
              <p className="font-bold flex items-center gap-1.5 text-amber-900">
                <CheckCircle2 className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                Todo lo configurado se conserva
              </p>
              <p className="leading-relaxed">
                A partir de este momento entrarás con tu correo personal y contraseña. El acceso temporal deja de funcionar. Tus servicios, citas, fichas, sellos, bloqueos y peticiones se mantienen intactos.
              </p>
            </div>

            {activarError && (
              <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{activarError}</span>
              </div>
            )}

            {activarSuccess && (
              <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{activarSuccess}</span>
              </div>
            )}

            {activarPaso === 1 ? (
              <form onSubmit={handleEnviarCodigoActivacion} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Tu Correo Electrónico Personal *
                  </label>
                  <input
                    type="email"
                    required
                    value={activarCorreo}
                    onChange={(e) => setActivarCorreo(e.target.value)}
                    placeholder="ej: duena@misalon.com"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-amber-600"
                  />
                  <span className="text-[10px] text-slate-500 mt-1 block">
                    Te enviaremos un código de verificación de 6 dígitos (válido durante 10 minutos).
                  </span>
                </div>

                <div className="pt-2 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowActivarModal(false)}
                    className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={activarLoading || !activarCorreo.trim()}
                    className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold cursor-pointer disabled:opacity-50 flex items-center gap-2"
                  >
                    {activarLoading ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Enviando código...</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-3.5 h-3.5" />
                        <span>Enviar código de activación</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleActivarCuenta} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Correo Verificado
                  </label>
                  <div className="flex items-center justify-between text-xs font-mono bg-zinc-100 px-3 py-2 rounded-xl text-zinc-700">
                    <span>{activarCorreo}</span>
                    <button
                      type="button"
                      onClick={() => {
                        setActivarPaso(1);
                        setActivarError(null);
                      }}
                      className="text-[11px] font-sans font-semibold text-amber-700 hover:underline cursor-pointer"
                    >
                      Cambiar
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Código de 6 Dígitos *
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    value={activarCodigo}
                    onChange={(e) => setActivarCodigo(e.target.value.replace(/\D/g, ''))}
                    placeholder="123456"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-base font-mono tracking-widest text-center font-bold focus:outline-none focus:border-amber-600"
                  />
                  <span className="text-[10px] text-slate-500 mt-1 block">
                    Revisa tu bandeja de entrada o spam.
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Nueva Contraseña *
                    </label>
                    <input
                      type="password"
                      required
                      minLength={12}
                      value={activarContrasena}
                      onChange={(e) => setActivarContrasena(e.target.value)}
                      placeholder="Mínimo 12 caracteres"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-amber-600"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Confirmar Contraseña *
                    </label>
                    <input
                      type="password"
                      required
                      minLength={12}
                      value={activarConfirmContrasena}
                      onChange={(e) => setActivarConfirmContrasena(e.target.value)}
                      placeholder="Repite la contraseña"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-amber-600"
                    />
                  </div>
                </div>
                <span className="text-[10px] text-slate-500 block">
                  La contraseña debe tener un mínimo de 12 caracteres para máxima seguridad.
                </span>

                <div className="pt-2 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setActivarPaso(1)}
                    className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
                  >
                    Atrás
                  </button>
                  <button
                    type="submit"
                    disabled={activarLoading || activarCodigo.length !== 6 || activarContrasena.length < 12}
                    className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold cursor-pointer disabled:opacity-50 flex items-center gap-2"
                  >
                    {activarLoading ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Activando cuenta...</span>
                      </>
                    ) : (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>Activar mi cuenta</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* ── MODAL PARA REPROGRAMAR FECHA Y HORA ACORDADA CON LA CLIENTA ── */}
      {rescheduleBookingTarget && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-warm-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="relative w-full max-w-md bg-white rounded-3xl shadow-luxury border border-sage-200 p-6 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-sage-100 pb-3">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full">
                  Acuerdo por WhatsApp
                </span>
                <h3 className="font-serif font-bold text-lg text-warm-900 mt-1">
                  Reprogramar Cita
                </h3>
              </div>
              <button
                onClick={() => setRescheduleBookingTarget(null)}
                className="p-1.5 rounded-full text-warm-400 hover:text-warm-900 hover:bg-sage-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 rounded-2xl bg-sage-50 border border-sage-200 text-xs space-y-1">
              <p className="font-bold text-warm-900">{rescheduleBookingTarget.clientName}</p>
              <p className="text-warm-600">{rescheduleBookingTarget.serviceName}</p>
              <p className="text-warm-500 text-[11px]">
                Horario actual: <span className="font-semibold">{rescheduleBookingTarget.date} a las {rescheduleBookingTarget.timeSlot}</span>
              </p>
            </div>

            {rescheduleError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0" />
                <span>{rescheduleError}</span>
              </div>
            )}

            <form onSubmit={handleConfirmReschedule} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-warm-800 block mb-1">
                  Nueva Fecha Acordada:
                </label>
                <input
                  type="date"
                  required
                  value={rescheduleNewDate}
                  onChange={(e) => setRescheduleNewDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#FBF9F6] border border-sage-200 text-warm-900 text-xs focus:ring-2 focus:ring-sage-400"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-warm-800 block mb-1">
                  Nuevo Horario / Turno:
                </label>
                <select
                  required
                  value={rescheduleNewTime}
                  onChange={(e) => setRescheduleNewTime(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#FBF9F6] border border-sage-200 text-warm-900 text-xs focus:ring-2 focus:ring-sage-400"
                >
                  <option value="">Selecciona un horario</option>
                  {allTimeSlots.map((slot) => (
                    <option key={slot} value={slot}>
                      {slot}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setRescheduleBookingTarget(null)}
                  className="px-4 py-2 rounded-xl bg-sage-100 hover:bg-sage-200 text-warm-800 text-xs font-bold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={rescheduleSubmitting || !rescheduleNewDate || !rescheduleNewTime}
                  className="px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold shadow-sm flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {rescheduleSubmitting ? (
                    <span>Guardando...</span>
                  ) : (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Guardar &amp; Confirmar</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: CULMINACIÓN DE SERVICIO & ACREDITACIÓN DE SELLO VIP ── */}
      {completeModalBooking && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-warm-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="relative w-full max-w-md bg-white rounded-3xl shadow-luxury border border-sage-200 p-6 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-sage-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-amber-500" />
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full">
                    Cierre de Servicio Exitoso
                  </span>
                  <h3 className="font-serif font-bold text-lg text-warm-900 mt-0.5">
                    Culminar &amp; Acreditar Sello VIP
                  </h3>
                </div>
              </div>
              <button
                onClick={() => setCompleteModalBooking(null)}
                className="p-1.5 rounded-full text-warm-400 hover:text-warm-900 hover:bg-sage-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3.5 rounded-2xl bg-sage-50 border border-sage-200 text-xs space-y-1.5">
              <div className="flex justify-between">
                <span className="text-warm-500">Clienta:</span>
                <span className="font-bold text-warm-900">{completeModalBooking.clientName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-warm-500">Servicio:</span>
                <span className="font-semibold text-warm-800">{completeModalBooking.serviceName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-warm-500">Monto del servicio:</span>
                <span className="font-bold text-emerald-700 font-serif">
                  ${completeModalBooking.totalPriceUSD.toFixed(2)} USD (≈ {(completeModalBooking.totalPriceUSD * exchangeRate).toFixed(0)} Bs)
                </span>
              </div>
            </div>

            <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs space-y-1">
              <p className="font-bold flex items-center gap-1.5 text-emerald-900">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                Acreditación Automática de Fidelidad
              </p>
              <p className="text-[11px] leading-relaxed text-emerald-800">
                Al confirmar la culminación, se sumará 1 sello VIP a su cuenta en base de datos.
                Recuerda: <strong>{salonTheme.loyaltyStampsGoal} visitas acumuladas = {tenantRewardLabel}</strong>.
              </p>
            </div>

            <div className="flex flex-col gap-2 pt-2">
              <button
                type="button"
                onClick={() => handleConfirmCompletion(true)}
                className="w-full py-2.5 px-4 rounded-xl bg-[#25D366] hover:bg-[#1EBE5D] text-white font-bold text-xs shadow-sm flex items-center justify-center gap-2 cursor-pointer transition-colors"
              >
                <MessageCircle className="w-4 h-4" />
                <span>Culminar &amp; Notificar por WhatsApp</span>
              </button>
              <button
                type="button"
                onClick={() => handleConfirmCompletion(false)}
                className="w-full py-2 px-4 rounded-xl bg-sage-100 hover:bg-sage-200 text-warm-800 font-bold text-xs cursor-pointer transition-colors"
              >
                Culminar solo en el sistema (sin WhatsApp)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: INASISTENCIA (NO-SHOW) ── */}
      {noShowModalBooking && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-warm-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="relative w-full max-w-md bg-white rounded-3xl shadow-luxury border border-sage-200 p-6 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-sage-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center">
                  <UserX className="w-5 h-5 text-amber-700" />
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800 bg-amber-50 px-2 py-0.5 rounded-full">
                    Inasistencia / No-Show
                  </span>
                  <h3 className="font-serif font-bold text-lg text-warm-900 mt-0.5">
                    Registrar Clienta que No Llegó
                  </h3>
                </div>
              </div>
              <button
                onClick={() => setNoShowModalBooking(null)}
                className="p-1.5 rounded-full text-warm-400 hover:text-warm-900 hover:bg-sage-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3.5 rounded-2xl bg-sage-50 border border-sage-200 text-xs space-y-1">
              <p className="font-bold text-warm-900">{noShowModalBooking.clientName} ({noShowModalBooking.clientPhone})</p>
              <p className="text-warm-600">{noShowModalBooking.serviceName} &bull; {noShowModalBooking.date} a las {noShowModalBooking.timeSlot}</p>
              <p className="text-[11px] text-warm-500 pt-1">
                El cupo quedará registrado en analítica como inasistencia y el horario se liberará en el calendario.
              </p>
            </div>

            <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs space-y-1.5">
              <p className="font-bold">Mensaje sutil pre-redactado para WhatsApp:</p>
              <p className="italic text-[11px] bg-white/90 p-2.5 rounded-xl border border-amber-200 text-warm-800 leading-relaxed">
                &ldquo;¡Hola {noShowModalBooking.clientName} bella! 💕 Te estuvimos esperando hoy para tu cita de {noShowModalBooking.serviceName} en Andrea Labrador Nails Studio. Qué pena que se te haya complicado llegar ✨. Avísame cuando tengas disponibilidad y con todo el gusto te reagendamos para consentirte en tus uñas 💕.&rdquo;
              </p>
            </div>

            <div className="flex flex-col gap-2 pt-2">
              <button
                type="button"
                onClick={() => handleConfirmNoShow(true)}
                className="w-full py-2.5 px-4 rounded-xl bg-[#25D366] hover:bg-[#1EBE5D] text-white font-bold text-xs shadow-sm flex items-center justify-center gap-2 cursor-pointer transition-colors"
              >
                <MessageCircle className="w-4 h-4" />
                <span>Liberar Cupo &amp; Enviar Mensaje Sutil</span>
              </button>
              <button
                type="button"
                onClick={() => handleConfirmNoShow(false)}
                className="w-full py-2 px-4 rounded-xl bg-sage-100 hover:bg-sage-200 text-warm-800 font-bold text-xs cursor-pointer transition-colors"
              >
                Registrar No-Show sin enviar mensaje
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: CANCELACIÓN CON MOTIVO ── */}
      {cancellationModalBooking && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-warm-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="relative w-full max-w-md bg-white rounded-3xl shadow-luxury border border-sage-200 p-6 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-sage-100 pb-3">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-rose-800 bg-rose-50 px-2 py-0.5 rounded-full">
                  Cancelación Formal
                </span>
                <h3 className="font-serif font-bold text-lg text-warm-900 mt-1">
                  Cancelar Cita &amp; Registrar Motivo
                </h3>
              </div>
              <button
                onClick={() => setCancellationModalBooking(null)}
                className="p-1.5 rounded-full text-warm-400 hover:text-warm-900 hover:bg-sage-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 rounded-2xl bg-sage-50 border border-sage-200 text-xs space-y-1">
              <p className="font-bold text-warm-900">{cancellationModalBooking.clientName}</p>
              <p className="text-warm-600">{cancellationModalBooking.serviceName} &bull; {cancellationModalBooking.date} a las {cancellationModalBooking.timeSlot}</p>
            </div>

            <form onSubmit={handleConfirmCancellation} className="space-y-3">
              <div>
                <label className="text-xs font-bold text-warm-800 block mb-1">
                  Causa o Motivo de Cancelación:
                </label>
                <select
                  value={cancellationReasonType}
                  onChange={e => setCancellationReasonType(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#FBF9F6] border border-sage-200 text-warm-900 text-xs font-semibold focus:ring-2 focus:ring-sage-400"
                >
                  <option value="aviso_previo">Aviso previo de la clienta (reprogramación voluntaria)</option>
                  <option value="emergencia">Emergencia personal / salud de la clienta</option>
                  <option value="no_respondio">Clienta no respondió más en WhatsApp / Desistió</option>
                  <option value="fuerza_mayor">Ajuste de agenda / Causa del salón</option>
                  <option value="otro">Otro motivo personalizado...</option>
                </select>
              </div>

              {cancellationReasonType === 'otro' && (
                <div>
                  <label className="text-xs font-bold text-warm-800 block mb-1">
                    Escribe el motivo detallado:
                  </label>
                  <input
                    type="text"
                    required
                    value={cancellationCustomNote}
                    onChange={e => setCancellationCustomNote(e.target.value)}
                    placeholder="Ej. Se le presentó un viaje imprevisto..."
                    className="w-full px-3 py-2 rounded-xl bg-[#FBF9F6] border border-sage-200 text-warm-900 text-xs focus:ring-2 focus:ring-sage-400"
                  />
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setCancellationModalBooking(null)}
                  className="px-4 py-2 rounded-xl bg-sage-100 hover:bg-sage-200 text-warm-800 text-xs font-bold cursor-pointer"
                >
                  Regresar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-rose-700 hover:bg-rose-800 text-white text-xs font-bold shadow-sm cursor-pointer"
                >
                  Confirmar Cancelación
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: AGENDAMIENTO MANUAL DE CITA EN RECEPCIÓN O LLAMADA ── */}
      {isManualBookingOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-warm-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-luxury border border-sage-200 p-6 sm:p-7 space-y-4 animate-in fade-in zoom-in-95 my-6">
            
            <div className="flex items-center justify-between border-b border-sage-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
                  <Calendar className="w-5 h-5 text-emerald-700" />
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                    Recepción &amp; Llamadas
                  </span>
                  <h3 className="font-serif font-bold text-lg text-warm-900 mt-0.5">
                    Agendar Nueva Cita Manual
                  </h3>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsManualBookingOpen(false);
                  setManualBookingError(null);
                  setManualBookingSuccess(null);
                }}
                className="p-1.5 rounded-full text-warm-400 hover:text-warm-900 hover:bg-sage-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {manualBookingError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0" />
                <span>{manualBookingError}</span>
              </div>
            )}

            {manualBookingSuccess && (
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{manualBookingSuccess}</span>
              </div>
            )}

            <form onSubmit={handleCreateManualBooking} className="space-y-3.5 text-xs">
              
              {/* Client Info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-warm-800 block mb-1">
                    Nombre Completo de la Clienta: *
                  </label>
                  <input
                    type="text"
                    required
                    value={manualClientName}
                    onChange={e => setManualClientName(e.target.value)}
                    placeholder="Ej. Valeria Rodríguez"
                    className={inputCls}
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-warm-800 block mb-1">
                    WhatsApp / Teléfono: *
                  </label>
                  <input
                    type="tel"
                    required
                    value={manualClientPhone}
                    onChange={e => setManualClientPhone(e.target.value)}
                    placeholder="Ej. 04241234567"
                    className={inputCls}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-warm-800 block mb-1">
                    Instagram de la Clienta (opcional):
                  </label>
                  <input
                    type="text"
                    value={manualClientInstagram}
                    onChange={e => setManualClientInstagram(e.target.value)}
                    placeholder="@usuario"
                    className={inputCls}
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-warm-800 block mb-1">
                    Servicio Solicitado: *
                  </label>
                  <select
                    value={manualServiceId}
                    onChange={e => setManualServiceId(e.target.value)}
                    className={inputCls}
                  >
                    {services.map(s => (
                      <option key={s.id} value={s.id}>
                        {s.name} (${s.priceUSD} USD / ≈ {(s.priceUSD * exchangeRate).toFixed(0)} Bs)
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Date & Time */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-warm-800 block mb-1">
                    Fecha de la Cita: *
                  </label>
                  <input
                    type="date"
                    required
                    value={manualDate}
                    onChange={e => setManualDate(e.target.value)}
                    className={inputCls}
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-warm-800 block mb-1">
                    Horario / Turno: *
                  </label>
                  <select
                    value={manualTimeSlot}
                    onChange={e => setManualTimeSlot(e.target.value)}
                    className={inputCls}
                  >
                    {allTimeSlots.map(slot => {
                      const isOccupied = AppStore.isSlotOccupied(manualDate, slot);
                      return (
                        <option key={slot} value={slot}>
                          {slot} {isOccupied ? '(Ocupado / Bloqueado)' : '(Libre)'}
                        </option>
                      );
                    })}
                  </select>
                </div>
              </div>

              {/* Payment Method & First Visit */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-warm-800 block mb-1">
                    Forma de Pago Prevista:
                  </label>
                  <select
                    value={manualPaymentMethod}
                    onChange={e => setManualPaymentMethod(e.target.value as any)}
                    className={inputCls}
                  >
                    <option value="pago_movil">Pago Móvil (Bs)</option>
                    <option value="efectivo">Efectivo ($ USD o Bs)</option>
                    <option value="binance">Binance Pay (USDT)</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-warm-800 block mb-1">
                    Estado Inicial:
                  </label>
                  <select
                    value={manualStatus}
                    onChange={e => setManualStatus(e.target.value as any)}
                    className={inputCls}
                  >
                    <option value="confirmada">🟢 Confirmada Directamente</option>
                    <option value="en_whatsapp">🟡 En WhatsApp / Por Coordinar</option>
                  </select>
                </div>
              </div>

              {/* Descuento primera visita */}
              <div className="p-3 rounded-2xl bg-amber-50/70 border border-amber-200 flex items-center justify-between">
                <div>
                  <span className="font-bold text-warm-900 block text-xs">
                    ¿Aplica Descuento de Bienvenida?
                  </span>
                  <span className="text-[11px] text-warm-600">
                    Aplica -$2.00 USD de descuento si es la primera vez que asiste al estudio.
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={manualIsFirstVisit}
                  onChange={e => setManualIsFirstVisit(e.target.checked)}
                  className="w-4 h-4 text-emerald-600 rounded border-sage-300 focus:ring-emerald-500 cursor-pointer"
                />
              </div>

              {/* Notes */}
              <div>
                <label className="text-xs font-bold text-warm-800 block mb-1">
                  Notas u Observaciones (opcional):
                </label>
                <textarea
                  rows={2}
                  value={manualNotes}
                  onChange={e => setManualNotes(e.target.value)}
                  placeholder="Ej. Trae diseño en foto de Instagram, clienta prefiere tono nude..."
                  className={inputCls}
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-sage-100">
                <button
                  type="button"
                  onClick={() => setIsManualBookingOpen(false)}
                  className="px-4 py-2 rounded-xl bg-sage-100 hover:bg-sage-200 text-warm-800 font-bold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={manualBookingSubmitting}
                  className="px-5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold shadow-sm flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {manualBookingSubmitting ? (
                    <span>Guardando...</span>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Guardar y Bloquear Turno</span>
                    </>
                  )}
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

      {/* ── MODAL: PRE-CONFIGURAR COLABORADORA & ASIGNAR ROL (PLAN PRO) ── */}
      {isInviteModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-warm-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-luxury border border-sage-200 p-6 sm:p-7 space-y-4 animate-in fade-in zoom-in-95 my-6">
            
            <div className="flex items-center justify-between border-b border-sage-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-indigo-100 text-indigo-900 flex items-center justify-center font-bold">
                  <UserPlus className="w-5 h-5 text-indigo-900" />
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-900 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-200">
                    Control Multi-Usuario
                  </span>
                  <h3 className="font-serif font-bold text-lg text-warm-900 mt-0.5">
                    Asignar Rol a Nueva Colaboradora
                  </h3>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsInviteModalOpen(false);
                  setInviteProNotice(false);
                }}
                className="p-1.5 rounded-full text-warm-400 hover:text-warm-900 hover:bg-sage-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {inviteProNotice ? (
              <div className="p-4 rounded-2xl bg-amber-50 border-2 border-amber-300 space-y-3">
                <div className="flex items-center gap-2 text-amber-900">
                  <Lock className="w-5 h-5 text-amber-600 shrink-0" />
                  <span className="font-serif font-bold text-sm">
                    Pre-configuración Guardada · Activación Requerida
                  </span>
                </div>
                <p className="text-xs text-amber-950 leading-relaxed">
                  Has definido los datos de <strong>{collaboratorForm.name || 'la colaboradora'}</strong> con el rol de <strong>{collaboratorForm.role === 'colaboradora' ? 'Manicurista' : collaboratorForm.role}</strong>.
                  Para aprovisionar su base de datos independiente, emitir sus credenciales seguras de acceso móvil y habilitar su calendario propio sin acceso a tu balance contable, se requiere la licencia <strong>Plan Salón Pro ($220 Setup / $40 mes)</strong>.
                </p>
                <div className="flex items-center justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setIsInviteModalOpen(false);
                      setInviteProNotice(false);
                    }}
                    className="px-4 py-2 rounded-xl bg-white border border-amber-300 text-warm-800 text-xs font-bold"
                  >
                    Cerrar Simulación
                  </button>
                  <a
                    href={`https://wa.me/584241360937?text=¡Hola!%20Deseo%20activar%20el%20Plan%20Salón%20Pro%20para%20habilitar%20el%20acceso%20de%20mi%20colaboradora%20${encodeURIComponent(collaboratorForm.name || 'de mi equipo')}.`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold shadow-xs flex items-center gap-1"
                  >
                    <MessageCircle className="w-3.5 h-3.5" />
                    <span>Contactar Asesor por WhatsApp</span>
                  </a>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSaveStaffToDb} className="space-y-3.5 text-xs">
                <div>
                  <label className="text-xs font-bold text-warm-800 block mb-1">
                    Nombre y Apellido de la Colaboradora: *
                  </label>
                  <input
                    type="text"
                    required
                    value={collaboratorForm.name}
                    onChange={e => setCollaboratorForm({ ...collaboratorForm, name: e.target.value })}
                    placeholder="Ej. Gabriela Pérez"
                    className={inputCls}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-warm-800 block mb-1">
                      Teléfono / WhatsApp Móvil: *
                    </label>
                    <input
                      type="tel"
                      required
                      value={collaboratorForm.phone}
                      onChange={e => setCollaboratorForm({ ...collaboratorForm, phone: e.target.value })}
                      placeholder="Ej. 04141234567"
                      className={inputCls}
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-warm-800 block mb-1">
                      Rol Asignado: *
                    </label>
                    <select
                      value={collaboratorForm.role}
                      onChange={e => setCollaboratorForm({ ...collaboratorForm, role: e.target.value })}
                      className={inputCls}
                    >
                      <option value="colaboradora">Colaboradora / Manicurista (Agenda propia)</option>
                      <option value="recepcion">Recepción / Front-Desk (Agendamiento)</option>
                      <option value="super_admin">Super Administradora (Acceso Total)</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-warm-800 block mb-1">
                      Especialidad Técnica:
                    </label>
                    <input
                      type="text"
                      value={collaboratorForm.specialty}
                      onChange={e => setCollaboratorForm({ ...collaboratorForm, specialty: e.target.value })}
                      placeholder="Ej. Rubber, Polygel, Manicura Rusa"
                      className={inputCls}
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-warm-800 block mb-1">
                      Comisión Pactada (%):
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={collaboratorForm.commissionPercent}
                      onChange={e => setCollaboratorForm({ ...collaboratorForm, commissionPercent: e.target.value })}
                      placeholder="50"
                      className={inputCls}
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-warm-800 block mb-1">
                    Horario / Turno Asignado:
                  </label>
                  <input
                    type="text"
                    value={collaboratorForm.schedule}
                    onChange={e => setCollaboratorForm({ ...collaboratorForm, schedule: e.target.value })}
                    placeholder="Ej. Lunes a Sábado · Turno Tarde (2pm a 7pm)"
                    className={inputCls}
                  />
                </div>

                <div className="p-3 rounded-2xl bg-indigo-50/70 border border-indigo-200 text-[11px] text-indigo-950 space-y-1">
                  <span className="font-bold block flex items-center gap-1 text-indigo-900">
                    <Shield className="w-3.5 h-3.5 text-indigo-700" />
                    Protección de Datos Financieros
                  </span>
                  <p className="leading-relaxed">
                    Al asignar el rol de Colaboradora o Recepción, el sistema restringe automáticamente los menús de Facturación, Analítica y Balances Contables en PDF, garantizando absoluta confidencialidad en los números de tu negocio.
                  </p>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-sage-100">
                  <button
                    type="button"
                    onClick={() => setIsInviteModalOpen(false)}
                    className="px-4 py-2 rounded-xl bg-sage-100 hover:bg-sage-200 text-warm-800 font-bold cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-indigo-900 hover:bg-indigo-950 text-white font-bold shadow-sm flex items-center gap-1.5 cursor-pointer"
                  >
                    <Check className="w-4 h-4 text-amber-300" />
                    <span>Guardar y Pre-configurar</span>
                  </button>
                </div>
              </form>
            )}

          </div>
        </div>
      )}
    </div>
  );
};
