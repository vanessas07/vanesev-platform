import React, { useState, useEffect, useMemo } from 'react';
import { 
  ServiceItem, 
  ServiceAddon, 
  PaymentMethodType, 
  AppointmentBooking, 
  PromoOffer 
} from '../types';
import { INITIAL_ADDONS, AVAILABLE_TIME_SLOTS } from '../data/initialData';
import { AppStore } from '../services/store';
import confetti from 'canvas-confetti';
import { 
  X, 
  Calendar, 
  Clock, 
  DollarSign, 
  Sparkles, 
  Check, 
  ShieldCheck, 
  Send, 
  ChevronRight, 
  User, 
  Phone, 
  CreditCard,
  Gift,
  Info,
  Mail,
  Lock,
  CheckCircle2
} from 'lucide-react';
import { InstagramIcon } from './Icons';
import { getSalonThemeConfig } from '../utils/salonThemeEngine';

interface BookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  preSelectedService?: ServiceItem | null;
  preSelectedPromo?: PromoOffer | null;
  services: ServiceItem[];
  exchangeRate: number;
  referralCode?: string;
  tenantSlug?: string;
  tenantName?: string;
  tenantWhatsapp?: string;
  onNavigateToShare?: () => void;
  onBookingCreated?: () => void;
}

interface AvailableDateItem {
  dateString: string;
  dayName: string;
  dayNumber: number;
  monthName: string;
}

export const BookingModal: React.FC<BookingModalProps> = ({
  isOpen,
  onClose,
  preSelectedService,
  preSelectedPromo,
  services,
  exchangeRate,
  referralCode,
  tenantSlug = 'capra-studio',
  tenantName = 'Capra Studio',
  tenantWhatsapp = '584247429530',
  onNavigateToShare,
  onBookingCreated,
}) => {
  // Wizard steps: 1: Service & Addons, 2: Date & Time, 3: Client Info & Confirm
  const [step, setStep] = useState<1 | 2 | 3>(1);
  
  // Selection state (Supports multiple services e.g. Manos + Pies)
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>([]);
  const [selectedAddonIds, setSelectedAddonIds] = useState<string[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string>('');

  // Multi-Specialist & Studio Zone state from Neon DB
  const [availableStaff, setAvailableStaff] = useState<any[]>([]);
  const [availableZones, setAvailableZones] = useState<any[]>([]);
  const [selectedStaffId, setSelectedStaffId] = useState<string>('');
  const [selectedZoneId, setSelectedZoneId] = useState<string>('');
  
  // Client details
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [clientPin, setClientPin] = useState('');
  const [clientInstagram, setClientInstagram] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodType>('pago_movil');
  const [notes, setNotes] = useState('');
  const [isFirstVisit, setIsFirstVisit] = useState(true);

  // Intelligent client recognition state
  const [isExistingClient, setIsExistingClient] = useState(false);
  const [recognizedStamps, setRecognizedStamps] = useState<number>(0);
  const [isCheckingClient, setIsCheckingClient] = useState(false);

  // Confirmation state
  const [isSuccess, setIsSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lastCreatedBooking, setLastCreatedBooking] = useState<AppointmentBooking | null>(null);

  // Available dates (Next 14 business days, skip Sundays)
  const availableDates = useMemo<AvailableDateItem[]>(() => {
    const dates: AvailableDateItem[] = [];
    const today = new Date();
    for (let i = 1; dates.length < 14; i++) {
      const nextDate = new Date(today);
      nextDate.setDate(today.getDate() + i);
      
      // Sunday is 0: Skip Sundays as studio is closed
      if (nextDate.getDay() === 0) continue;

      const yyyy = nextDate.getFullYear();
      const mm = String(nextDate.getMonth() + 1).padStart(2, '0');
      const dd = String(nextDate.getDate()).padStart(2, '0');
      const dateString = `${yyyy}-${mm}-${dd}`;

      const dayName = nextDate.toLocaleDateString('es-ES', { weekday: 'short' }).toUpperCase();
      const dayNumber = nextDate.getDate();
      const monthName = nextDate.toLocaleDateString('es-ES', { month: 'short' });

      dates.push({ dateString, dayName, dayNumber, monthName });
    }
    return dates;
  }, []);

  // Sync remote schedule, staff/zones and check active client on open
  useEffect(() => {
    if (isOpen) {
      AppStore.fetchRemoteBlockedSlots().catch(console.warn);

      fetch(`/api/central?mode=tenant_context&tenant=${encodeURIComponent(tenantSlug)}`)
        .then(r => (r.ok ? r.json() : null))
        .then(json => {
          if (json) {
            const staffList = Array.isArray(json.staff) ? json.staff : [];
            const zoneList = Array.isArray(json.zones) ? json.zones : [];
            setAvailableStaff(staffList);
            setAvailableZones(zoneList);
            if (staffList.length > 0 && !selectedStaffId) {
              setSelectedStaffId(staffList[0].id);
            }
            if (zoneList.length > 0 && !selectedZoneId) {
              setSelectedZoneId(zoneList[0].id);
            }
          }
        })
        .catch(() => {});

      const active = AppStore.getActiveClient();
      if (active) {
        if (!clientName) setClientName(active.name);
        if (!clientPhone) setClientPhone(active.phone);
        if (active.email && !clientEmail) setClientEmail(active.email);
        if (active.instagram && !clientInstagram) setClientInstagram(active.instagram);
        setIsExistingClient(true);
        setIsFirstVisit(false);
        setRecognizedStamps(active.stampsCount || 0);
      }
    }
    if (preSelectedService) {
      setSelectedServiceIds([preSelectedService.id]);
    } else if (services.length > 0 && selectedServiceIds.length === 0) {
      setSelectedServiceIds([services[0].id]);
    }

    if (availableDates.length > 0 && !selectedDate) {
      setSelectedDate(availableDates[0].dateString);
    }
  }, [isOpen, preSelectedService, preSelectedPromo, services, availableDates, tenantSlug]);

  // Intelligent real-time recognition by phone or email
  useEffect(() => {
    const cleanPhone = clientPhone.replace(/\D/g, '');
    if (cleanPhone.length >= 7) {
      setIsCheckingClient(true);
      const localAcc = AppStore.findClientAccount(cleanPhone) || (clientEmail ? AppStore.findClientAccount(clientEmail) : null);
      if (localAcc) {
        if (!clientName) setClientName(localAcc.name);
        if (!clientEmail && localAcc.email) setClientEmail(localAcc.email);
        setIsExistingClient(true);
        setIsFirstVisit(false);
        setRecognizedStamps(localAcc.stampsCount || 0);
        setIsCheckingClient(false);
      } else {
        // Sin consulta pública por teléfono (era la fuga C4): la clienta ve su ficha entrando con su correo.
        setIsExistingClient(false);
        setIsCheckingClient(false);
      }
    } else if (clientEmail && clientEmail.includes('@')) {
      const localAcc = AppStore.findClientAccount(clientEmail);
      if (localAcc) {
        if (!clientName) setClientName(localAcc.name);
        if (!clientPhone) setClientPhone(localAcc.phone);
        setIsExistingClient(true);
        setIsFirstVisit(false);
        setRecognizedStamps(localAcc.stampsCount || 0);
      } else {
        setIsExistingClient(false);
      }
    } else {
      setIsExistingClient(false);
    }
  }, [clientPhone, clientEmail]);

  if (!isOpen) return null;

  // Selected Services List (Multiple allowed: e.g. Manos + Pedicure Spa)
  const currentServices = services.filter(s => selectedServiceIds.includes(s.id));
  const currentService = currentServices[0] || services[0];
  const combinedServiceNames = currentServices.map(s => s.name).join(' + ') || currentService.name;
  const totalDurationMinutes = currentServices.reduce((acc, curr) => acc + curr.durationMinutes, 0);

  const selectedAddons = INITIAL_ADDONS.filter(a => selectedAddonIds.includes(a.id));

  // Calculate pricing: sum of all selected services + addons
  const basePriceUSD = currentServices.reduce((acc, curr) => acc + curr.priceUSD, 0);
  const addonsTotalUSD = selectedAddons.reduce((acc, curr) => acc + curr.priceUSD, 0);
  const discountUSD = (!isExistingClient && isFirstVisit) ? 2.00 : 0.00;
  const totalPriceUSD = Math.max(0, basePriceUSD + addonsTotalUSD - discountUSD);
  const totalPriceVES = totalPriceUSD * exchangeRate;

  // Toggle service selection (allows adding/removing services like Pedicure Spa)
  const toggleService = (serviceId: string) => {
    setSelectedServiceIds(prev => {
      if (prev.includes(serviceId)) {
        // Keep at least one service selected
        if (prev.length === 1) return prev;
        return prev.filter(id => id !== serviceId);
      } else {
        return [...prev, serviceId];
      }
    });
  };

  // Toggle addon
  const toggleAddon = (id: string) => {
    setSelectedAddonIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const chosenStaffObj = availableStaff.find((s: any) => s.id === selectedStaffId) || availableStaff[0];
  const chosenZoneObj = availableZones.find((z: any) => z.id === selectedZoneId) || availableZones[0];

  // Submit and open WhatsApp
  const handleConfirmReservation = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!clientName.trim() || !clientPhone.trim()) {
      alert('Por favor indica tu nombre y teléfono para confirmar la cita.');
      return;
    }

    if (!selectedDate || !selectedTimeSlot) {
      alert('Por favor selecciona una fecha y hora disponibles.');
      setStep(2);
      return;
    }

    // Check availability once more before finalizing
    if (AppStore.isSlotOccupied(selectedDate, selectedTimeSlot)) {
      alert('Lo sentimos, este horario acaba de ser reservado. Por favor elige otro horario.');
      return;
    }

    setIsSubmitting(true);

    const staffNote = chosenStaffObj ? `Especialista: ${chosenStaffObj.name || chosenStaffObj.full_name}` : '';
    const zoneNote = chosenZoneObj ? `Área: ${chosenZoneObj.name}` : '';
    const enrichedNotes = [notes.trim(), staffNote, zoneNote].filter(Boolean).join(' | ');

    const booking: AppointmentBooking & Record<string, any> = {
      id: 'cita_' + Date.now(),
      tenantId: tenantSlug,
      clientName: clientName.trim(),
      clientPhone: clientPhone.trim(),
      clientEmail: clientEmail.trim() || undefined,
      clientPin: clientPin.trim() || undefined,
      clientInstagram: clientInstagram.trim() || undefined,
      serviceId: currentService.id,
      serviceName: combinedServiceNames,
      servicePriceUSD: basePriceUSD,
      selectedAddons,
      totalPriceUSD,
      staffId: chosenStaffObj?.id,
      staffName: chosenStaffObj?.name || chosenStaffObj?.full_name,
      zoneId: chosenZoneObj?.id,
      zoneName: chosenZoneObj?.name,
      date: selectedDate,
      timeSlot: selectedTimeSlot,
      paymentMethod,
      notes: enrichedNotes || undefined,
      status: 'en_whatsapp',
      isFirstVisit: (!isExistingClient && isFirstVisit),
      discountUSD,
      createdAt: new Date().toISOString()
    };

    // Guardar en Neon Postgres y localmente
    const remoteResult = await AppStore.createBookingRemote(booking);
    const finalBooking = remoteResult.booking || booking;
    setLastCreatedBooking(finalBooking);

    // Launch confetti celebration
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 }
    });

    setIsSuccess(true);
    setIsSubmitting(false);
    onBookingCreated?.();

    // Generate WhatsApp link dynamically targeting the active salon's WhatsApp
    const baseWaUrl = AppStore.generateWhatsAppBookingUrl({
      serviceName: finalBooking.serviceName,
      totalPriceUSD: finalBooking.totalPriceUSD,
      date: finalBooking.date,
      timeSlot: finalBooking.timeSlot,
      clientName: finalBooking.clientName,
      clientPhone: finalBooking.clientPhone,
      clientEmail: finalBooking.clientEmail,
      clientInstagram: finalBooking.clientInstagram,
      addons: finalBooking.selectedAddons,
      paymentMethod: finalBooking.paymentMethod,
      notes: finalBooking.notes,
      isFirstVisit: finalBooking.isFirstVisit,
      isExistingClient,
      discountUSD: finalBooking.discountUSD,
      referralCode: referralCode || undefined,
    });
    const cleanTargetWa = tenantWhatsapp.replace(/\D/g, '') || '584241360937';
    const waUrl = baseWaUrl.replace(/wa\.me\/\d+/, `wa.me/${cleanTargetWa}`);

    // Open WhatsApp directly
    setTimeout(() => {
      window.location.href = waUrl;
    }, 600);
  };

  const handleResetAndClose = () => {
    setIsSuccess(false);
    setStep(1);
    onClose();
  };

  const isAndreaLegacy = tenantSlug === 'andrea-nails';
  const isCapra = !isAndreaLegacy;
  const salonTheme = getSalonThemeConfig(tenantSlug);
  const directorName = isAndreaLegacy ? 'Andrea' : (tenantSlug === 'capra-studio' ? 'María Capra' : 'Dirección del Salón');
  const loyaltyRewardLabel = isAndreaLegacy
    ? 'Depilación de Cejas 100% GRATIS'
    : (salonTheme.loyaltyRewardTitle || 'Tratamiento VIP de Cortesía');

  const getServiceCategoryLabel = (cat?: string) => {
    if (!isCapra) return cat === 'pedicure' ? 'Pies' : 'Manos';
    const c = (cat || '').toLowerCase();
    if (c.includes('ceja') || c.includes('pestana')) return 'Cejas & Mirada';
    if (c.includes('estilismo') || c.includes('alisado')) return 'Estilismo Capilar';
    if (c.includes('maquillaje')) return 'Maquillaje HD';
    if (c.includes('nail') || c.includes('manicure') || c.includes('pedicure') || c.includes('unia')) return 'Nails & Spa Pies';
    if (c.includes('depi')) return 'Cabina Privada';
    if (c.includes('curso')) return 'Academy';
    return 'Atelier';
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-[#1E181A]/55 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
      <div
        className={`relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl border overflow-hidden flex flex-col max-h-[92vh] ${
          isCapra ? 'border-[#9E475B]/25' : 'border-sage-200'
        }`}
      >
        {/* Modal Header */}
        <div
          className={`px-6 py-5 border-b flex items-center justify-between ${
            isCapra
              ? 'bg-[#FAF7F2] text-[#1E181A] border-[#1E181A]/10'
              : 'bg-warm-100 border-sage-200/80'
          }`}
        >
          <div>
            <span
              className={`text-[10px] font-bold uppercase tracking-[0.2em] block ${
                isCapra ? 'text-[#9E475B]' : 'text-sage-700'
              }`}
            >
              Agenda Oficial &bull; {salonTheme.salonName || tenantName}
            </span>
            <h3
              className={`font-display text-2xl font-bold ${
                isCapra ? 'text-[#1E181A]' : 'text-sage-900'
              }`}
            >
              {isSuccess ? '¡Cita Lista para Confirmar!' : `Reservar en ${salonTheme.salonName || tenantName}`}
            </h3>
          </div>
          <button
            onClick={handleResetAndClose}
            className={`p-2 rounded-full transition-all cursor-pointer ${
              isCapra
                ? 'text-[#6E6266] hover:text-[#1E181A] hover:bg-black/5'
                : 'text-warm-500 hover:text-warm-900 hover:bg-white/80'
            }`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          {isSuccess && lastCreatedBooking ? (
            /* Success Confirmation Screen */
            <div className="text-center py-6 space-y-6">
              <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto shadow-soft">
                <Check className="w-8 h-8" />
              </div>

              <div className="space-y-2">
                <h4 className="font-serif text-2xl font-bold text-warm-900">
                  ¡Casi listo, {lastCreatedBooking.clientName}!
                </h4>
                <p className="text-sm text-warm-900 max-w-md mx-auto font-medium">
                  Tu cita está registrada en nuestra agenda digital. Toca el botón para enviar tu comprobante a {tenantName} por WhatsApp (+{tenantWhatsapp.replace(/\D/g, '')}) y recibir confirmación inmediata.
                </p>
              </div>

              {/* Booking Summary Box */}
              <div
                className={`p-5 rounded-2xl border text-left max-w-md mx-auto space-y-3 text-xs sm:text-sm tabular-nums ${
                  isCapra
                    ? 'bg-[#FAF6F3] border-[#8E4A59]/25'
                    : 'bg-sage-50 border-sage-200/80'
                }`}
              >
                <div className="flex justify-between border-b border-black/10 pb-2 gap-4">
                  <span className="text-warm-700 font-bold">Servicio:</span>
                  <span className="font-bold text-warm-900 text-right">{lastCreatedBooking.serviceName}</span>
                </div>
                {chosenStaffObj && (
                  <div className="flex justify-between border-b border-black/10 pb-2">
                    <span className="text-warm-700 font-bold">Especialista &amp; Zona:</span>
                    <span className="font-bold text-warm-900">
                      {chosenStaffObj.name || chosenStaffObj.full_name} {chosenZoneObj ? `(${chosenZoneObj.name})` : ''}
                    </span>
                  </div>
                )}
                <div className="flex justify-between border-b border-black/10 pb-2">
                  <span className="text-warm-700 font-bold">Fecha y Hora:</span>
                  <span className="font-bold text-warm-900">{lastCreatedBooking.date} a las {lastCreatedBooking.timeSlot}</span>
                </div>
                <div className="flex justify-between pb-1">
                  <span className="text-warm-700 font-bold">Total a Pagar:</span>
                  <span className="font-bold text-warm-900 font-serif text-base">${lastCreatedBooking.totalPriceUSD.toFixed(2)} USD</span>
                </div>
              </div>

              {/* Action button to re-trigger WhatsApp */}
              <div className="pt-2 flex flex-col sm:flex-row gap-3 justify-center">
                <a
                  href={AppStore.generateWhatsAppBookingUrl({
                    serviceName: lastCreatedBooking.serviceName,
                    totalPriceUSD: lastCreatedBooking.totalPriceUSD,
                    date: lastCreatedBooking.date,
                    timeSlot: lastCreatedBooking.timeSlot,
                    clientName: lastCreatedBooking.clientName,
                    clientPhone: lastCreatedBooking.clientPhone,
                    clientInstagram: lastCreatedBooking.clientInstagram,
                    addons: lastCreatedBooking.selectedAddons,
                    paymentMethod: lastCreatedBooking.paymentMethod,
                    notes: lastCreatedBooking.notes,
                    referralCode: referralCode || undefined,
                  }).replace(/wa\.me\/\d+/, `wa.me/${tenantWhatsapp.replace(/\D/g, '')}`)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-xs sm:text-sm font-bold shadow-soft transition-all"
                >
                  <Send className="w-4 h-4" />
                  <span>Enviar a WhatsApp (+{tenantWhatsapp.replace(/\D/g, '')})</span>
                </a>
                <button
                  onClick={handleResetAndClose}
                  className="px-6 py-3 border border-warm-300 text-warm-800 rounded-2xl text-xs sm:text-sm font-semibold hover:bg-warm-50 transition-all cursor-pointer"
                >
                  Cerrar
                </button>
              </div>

              {/* Official Loyalty Program Confirmation Banner */}
              {onNavigateToShare && (
                <div
                  className={`p-4 border rounded-2xl text-left flex items-center justify-between gap-3 max-w-md mx-auto shadow-xs ${
                    isCapra
                      ? 'bg-[#FAF6F3] border-[#8E4A59]/25'
                      : 'bg-sage-50 border-sage-200'
                  }`}
                >
                  <div className="space-y-0.5">
                    <span className="text-[10px] uppercase font-bold text-warm-700 tracking-wider flex items-center gap-1">
                      <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                      <span>Programa de Fidelización</span>
                    </span>
                    <p className="text-xs font-bold text-warm-900">
                      ¡5 Visitas = {loyaltyRewardLabel}!
                    </p>
                    <p className="text-[11px] text-warm-600">
                      Esta visita sumará automáticamente a tu tarjeta digital.
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      handleResetAndClose();
                      onNavigateToShare();
                    }}
                    className={`shrink-0 px-3.5 py-2 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer ${
                      isCapra ? 'bg-[#191215] hover:bg-[#8E4A59]' : 'bg-sage-800 hover:bg-sage-900'
                    }`}
                  >
                    Ver Tarjeta
                  </button>
                </div>
              )}
            </div>
          ) : (
            /* Wizard Steps */
            <div>
              {/* Step indicator breadcrumbs */}
              <div className="flex items-center justify-between pb-6 border-b border-warm-200 mb-6">
                <div 
                  onClick={() => setStep(1)}
                  className={`flex items-center gap-2 cursor-pointer ${
                    step === 1
                      ? isCapra
                        ? 'text-[#191215] font-bold'
                        : 'text-sage-800 font-bold'
                      : 'text-warm-400'
                  }`}
                >
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${
                      step === 1
                        ? isCapra
                          ? 'bg-[#191215] text-white'
                          : 'bg-sage-800 text-white'
                        : 'bg-warm-200'
                    }`}
                  >
                    1
                  </div>
                  <span className="text-xs sm:text-sm">Servicio</span>
                </div>
                <div className="w-8 h-px bg-warm-200"></div>
                <div 
                  onClick={() => setStep(2)}
                  className={`flex items-center gap-2 cursor-pointer ${
                    step === 2
                      ? isCapra
                        ? 'text-[#191215] font-bold'
                        : 'text-sage-800 font-bold'
                      : 'text-warm-400'
                  }`}
                >
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${
                      step === 2
                        ? isCapra
                          ? 'bg-[#191215] text-white'
                          : 'bg-sage-800 text-white'
                        : 'bg-warm-200'
                    }`}
                  >
                    2
                  </div>
                  <span className="text-xs sm:text-sm">Fecha y Hora</span>
                </div>
                <div className="w-8 h-px bg-warm-200"></div>
                <div 
                  onClick={() => setStep(3)}
                  className={`flex items-center gap-2 cursor-pointer ${
                    step === 3
                      ? isCapra
                        ? 'text-[#191215] font-bold'
                        : 'text-sage-800 font-bold'
                      : 'text-warm-400'
                  }`}
                >
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${
                      step === 3
                        ? isCapra
                          ? 'bg-[#191215] text-white'
                          : 'bg-sage-800 text-white'
                        : 'bg-warm-200'
                    }`}
                  >
                    3
                  </div>
                  <span className="text-xs sm:text-sm">Tus Datos</span>
                </div>
              </div>

              {/* STEP 1: SERVICE & ADDONS */}
              {step === 1 && (
                <div className="space-y-6">
                  {/* Multi-Service Selection */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <label
                        className={`block text-xs font-bold uppercase tracking-wider ${
                          isCapra ? 'text-[#191215]' : 'text-sage-800'
                        }`}
                      >
                        {isCapra
                          ? 'Selecciona tus Servicios o Cursos'
                          : 'Elige tus Servicios (Puedes seleccionar Manos y Pies)'}
                      </label>
                      <span className="text-[11px] text-warm-600 font-semibold tabular-nums">
                        {currentServices.length} {currentServices.length === 1 ? 'seleccionado' : 'seleccionados'} ({totalDurationMinutes} min)
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {services.filter(s => s.isAvailable).map((srv) => {
                        const isSelected = selectedServiceIds.includes(srv.id);
                        return (
                          <div
                            key={srv.id}
                            onClick={() => toggleService(srv.id)}
                            className={`p-3.5 rounded-2xl border cursor-pointer transition-all flex items-center justify-between gap-3 ${
                              isSelected
                                ? isCapra
                                  ? 'bg-[#FAF6F3] border-[#8E4A59] text-[#191215] shadow-xs ring-1 ring-[#8E4A59]'
                                  : 'bg-sage-50 border-sage-800 text-sage-950 shadow-sm ring-1 ring-sage-800'
                                : 'bg-white border-warm-200 hover:bg-warm-50/80 text-warm-900'
                            }`}
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <div
                                className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 transition-colors ${
                                  isSelected
                                    ? isCapra
                                      ? 'bg-[#8E4A59] border-[#8E4A59] text-white'
                                      : 'bg-sage-800 border-sage-800 text-white'
                                    : 'border-warm-300 bg-white'
                                }`}
                              >
                                {isSelected && <Check className="w-3.5 h-3.5 stroke-[2.5]" />}
                              </div>
                              <div className="truncate">
                                <p className="text-xs font-bold text-warm-900 truncate">{srv.name}</p>
                                <p className="text-[10px] text-warm-600 font-medium tabular-nums">
                                  {srv.durationMinutes} min &bull; {getServiceCategoryLabel(srv.category)}
                                </p>
                              </div>
                            </div>
                            <span className="font-serif font-bold text-sm text-warm-900 shrink-0 tabular-nums">
                              ${srv.priceUSD.toFixed(2)}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Selector Multi-Especialista y Cabina / Área (Conectado a Neon DB) */}
                  {(availableStaff.length > 0 || availableZones.length > 0) && (
                    <div
                      className={`p-4 rounded-2xl border space-y-3 ${
                        isCapra
                          ? 'bg-[#FAF6F3] border-[#8E4A59]/20'
                          : 'bg-warm-50/90 border-sage-200/90'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span
                          className={`text-xs font-bold uppercase tracking-wider ${
                            isCapra ? 'text-[#191215]' : 'text-sage-800'
                          }`}
                        >
                          Especialista &amp; Cabina / Área ({tenantName})
                        </span>
                        <span className="text-[10px] font-semibold text-warm-600 bg-white px-2 py-0.5 rounded-full border border-warm-200">
                          Multi-Zona Activo
                        </span>
                      </div>

                      {availableStaff.length > 0 && (
                        <div className="space-y-1.5">
                          <label className="block text-[11px] font-semibold text-warm-700">
                            Selecciona tu Especialista de Preferencia:
                          </label>
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                            {availableStaff.map((st) => {
                              const isChosen = selectedStaffId === st.id;
                              return (
                                <button
                                  key={st.id}
                                  type="button"
                                  onClick={() => {
                                    setSelectedStaffId(st.id);
                                    if (st.zoneId) setSelectedZoneId(st.zoneId);
                                  }}
                                  className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                                    isChosen
                                      ? isCapra
                                        ? 'bg-[#191215] text-white border-[#191215] shadow-xs'
                                        : 'bg-sage-800 text-white border-sage-900 shadow-xs'
                                      : 'bg-white text-warm-900 border-warm-200 hover:border-warm-400'
                                  }`}
                                >
                                  <p className="text-xs font-bold truncate">{st.name}</p>
                                  <p className={`text-[10px] truncate ${isChosen ? 'text-amber-200' : 'text-warm-600'}`}>
                                    {st.role}
                                  </p>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {availableZones.length > 0 && (
                        <div className="space-y-1.5 pt-1">
                          <label className="block text-[11px] font-semibold text-warm-700">
                            Departamento / Cabina Asignada:
                          </label>
                          <div className="flex flex-wrap gap-1.5">
                            {availableZones.map((zn) => {
                              const isZoneChosen = selectedZoneId === zn.id;
                              return (
                                <button
                                  key={zn.id}
                                  type="button"
                                  onClick={() => setSelectedZoneId(zn.id)}
                                  className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-all cursor-pointer ${
                                    isZoneChosen
                                      ? 'bg-amber-100 border-amber-400 text-amber-950 font-bold'
                                      : 'bg-white border-warm-200 text-warm-700 hover:bg-warm-100'
                                  }`}
                                >
                                  {zn.name}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Add-ons Section (Only for Andrea Nails Studio) */}
                  {!isCapra && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold uppercase tracking-wider text-sage-800 flex items-center gap-1.5">
                          <Sparkles className="w-3.5 h-3.5 text-gold-500" />
                          <span>Adicionales &amp; Personalización (Opcional)</span>
                        </span>
                      </div>

                      {!selectedServiceIds.includes('pedicure') && (
                        <div
                          onClick={() => toggleService('pedicure')}
                          className="p-3.5 rounded-2xl bg-amber-50/70 border border-amber-300/80 cursor-pointer flex items-center justify-between gap-3 hover:bg-amber-100/60 transition-all"
                        >
                          <div className="flex items-center gap-2.5">
                            <span className="text-lg">🦶</span>
                            <div>
                              <p className="text-xs font-bold text-amber-950">¿Deseas sumar Pedicure Spa a tu cita?</p>
                              <p className="text-[11px] text-amber-800">Aprovecha tu visita y sal con manos y pies perfectos.</p>
                            </div>
                          </div>
                          <span className="text-xs font-bold text-amber-950 bg-amber-200/80 px-2.5 py-1 rounded-full border border-amber-300 shrink-0">
                            + $13.00 USD
                          </span>
                        </div>
                      )}

                      <div className="space-y-2">
                        {INITIAL_ADDONS.map((addon) => {
                          const isChecked = selectedAddonIds.includes(addon.id);
                          return (
                            <div
                              key={addon.id}
                              onClick={() => toggleAddon(addon.id)}
                              className={`p-3 rounded-2xl border cursor-pointer flex items-center justify-between transition-all ${
                                isChecked
                                  ? 'bg-sage-100 border-sage-400 text-sage-900 font-semibold'
                                  : 'bg-white border-sage-200/80 text-warm-800 hover:bg-warm-50'
                              }`}
                            >
                              <div className="flex items-center gap-3">
                                <div className={`w-5 h-5 rounded-md border flex items-center justify-center transition-colors ${
                                  isChecked ? 'bg-sage-800 border-sage-800 text-white' : 'border-sage-300'
                                }`}>
                                  {isChecked && <Check className="w-3.5 h-3.5" />}
                                </div>
                                <span className="text-xs sm:text-sm">{addon.name}</span>
                              </div>
                              <span className="text-xs font-bold text-sage-800">
                                +${addon.priceUSD.toFixed(2)}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* First Visit Discount Selector OR VIP Recognition Banner */}
                  {!preSelectedPromo && !isExistingClient ? (
                    <div 
                      onClick={() => setIsFirstVisit(!isFirstVisit)}
                      className={`p-4 rounded-2xl border cursor-pointer transition-all flex items-center justify-between ${
                        isFirstVisit 
                          ? 'bg-amber-50/90 border-amber-300 text-amber-950 shadow-xs'
                          : 'bg-warm-50 border-warm-200 text-warm-700 hover:bg-white'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-5 h-5 rounded-md border flex items-center justify-center transition-colors ${
                          isFirstVisit ? 'bg-amber-600 border-amber-600 text-white' : 'border-warm-300'
                        }`}>
                          {isFirstVisit && <Check className="w-3.5 h-3.5" />}
                        </div>
                        <div>
                          <span className="text-xs sm:text-sm font-bold block">
                            ¿Es tu primera visita con {directorName}?
                          </span>
                          <span className="text-[11px] text-amber-900 font-medium block">
                            Bonificación de $2.00 USD de bienvenida (validada presencialmente en el estudio para clientas nuevas).
                          </span>
                        </div>
                      </div>
                      <span className="text-xs sm:text-sm font-black text-amber-700 bg-amber-100/90 px-2.5 py-1 rounded-full border border-amber-300 shrink-0 tabular-nums">
                        -$2.00 USD
                      </span>
                    </div>
                  ) : isExistingClient ? (
                    <div className="p-4 rounded-2xl bg-warm-100 border border-warm-300 text-warm-950 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Sparkles className="w-5 h-5 text-amber-600 shrink-0" />
                        <div>
                          <span className="text-xs sm:text-sm font-bold block">
                            ¡Clienta VIP Reconocida!
                          </span>
                          <span className="text-[11px] text-warm-700 block">
                            Esta cita sumará a tus sellos acumulados ({recognizedStamps}/5) para tu {loyaltyRewardLabel}.
                          </span>
                        </div>
                      </div>
                      <span className="text-xs font-bold text-amber-800 bg-white/80 px-2.5 py-1 rounded-full border border-amber-200 shrink-0">
                        Sellos VIP
                      </span>
                    </div>
                  ) : null}

                  {/* Step 1 Footer */}
                  <div className="pt-4 flex items-center justify-between border-t border-warm-100">
                    <div className="tabular-nums">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-warm-600 uppercase font-bold">Total Estimado</span>
                        {isFirstVisit && (
                          <span className="text-[10px] bg-amber-100 text-amber-900 border border-amber-300 px-2 py-0.5 rounded-full font-bold">
                            -$2 OFF 1ª Cita
                          </span>
                        )}
                      </div>
                      <span className="font-serif text-2xl font-bold text-warm-900">
                        ${totalPriceUSD.toFixed(2)} USD
                      </span>
                    </div>
                    <button
                      onClick={() => setStep(2)}
                      className={`inline-flex items-center gap-2 px-6 py-3 text-white rounded-2xl text-xs sm:text-sm font-semibold shadow-soft cursor-pointer ${
                        isCapra ? 'bg-[#191215] hover:bg-[#8E4A59]' : 'bg-sage-800 hover:bg-sage-900'
                      }`}
                    >
                      <span>Elegir Fecha &amp; Hora</span>
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 2: DATE & TIME SELECTION */}
              {step === 2 && (
                <div className="space-y-6">
                  {/* Date Picker Carousel / Grid */}
                  <div className="space-y-2">
                    <label
                      className={`block text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 ${
                        isCapra ? 'text-[#191215]' : 'text-sage-800'
                      }`}
                    >
                      <Calendar className="w-3.5 h-3.5 text-warm-600" />
                      <span>1. Selecciona el Día de tu Cita</span>
                    </label>

                    <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                      {availableDates.map((item: AvailableDateItem) => {
                        const isSelected = selectedDate === item.dateString;
                        return (
                          <button
                            key={item.dateString}
                            type="button"
                            onClick={() => {
                              setSelectedDate(item.dateString);
                              setSelectedTimeSlot(''); // reset slot when day changes
                            }}
                            className={`p-2.5 rounded-2xl border text-center transition-all flex flex-col items-center justify-center cursor-pointer tabular-nums ${
                              isSelected
                                ? isCapra
                                  ? 'bg-[#191215] border-[#191215] text-white shadow-soft'
                                  : 'bg-sage-800 border-sage-800 text-white shadow-soft'
                                : 'bg-white border-warm-200 text-warm-800 hover:bg-warm-50'
                            }`}
                          >
                            <span className="text-[10px] font-semibold opacity-75">{item.dayName}</span>
                            <span className="text-base font-bold font-serif my-0.5">{item.dayNumber}</span>
                            <span className="text-[9px] uppercase tracking-wider opacity-60">{item.monthName}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Time Slots Grid */}
                  <div className="space-y-2 pt-2">
                    <label
                      className={`block text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 ${
                        isCapra ? 'text-[#191215]' : 'text-sage-800'
                      }`}
                    >
                      <Clock className="w-3.5 h-3.5 text-warm-600" />
                      <span>2. Horarios Disponibles ({selectedDate || 'Elige fecha primero'})</span>
                    </label>

                    {selectedDate && AppStore.isDayEntirelyBlocked(selectedDate) ? (
                      <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-center text-xs text-rose-800 font-semibold space-y-1">
                        <p>Día no disponible para citas.</p>
                        <p className="text-[11px] font-normal text-rose-600">El estudio no tiene turnos abiertos en esta fecha. Por favor selecciona otro día.</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                        {AppStore.getTimeSlots().map((slot) => {
                          const isOccupied = AppStore.isSlotOccupied(selectedDate, slot);
                          const isSelected = selectedTimeSlot === slot;

                          return (
                            <button
                              key={slot}
                              type="button"
                              disabled={isOccupied}
                              onClick={() => setSelectedTimeSlot(slot)}
                              className={`p-3 rounded-2xl border text-xs sm:text-sm font-semibold flex items-center justify-between transition-all tabular-nums ${
                                isOccupied
                                  ? 'bg-warm-100 border-warm-100 text-warm-400 cursor-not-allowed line-through'
                                  : isSelected
                                  ? isCapra
                                    ? 'bg-[#191215] border-[#191215] text-white shadow-soft cursor-pointer'
                                    : 'bg-sage-800 border-sage-800 text-white shadow-soft cursor-pointer'
                                  : 'bg-white border-warm-200 text-warm-900 hover:border-warm-400 hover:bg-warm-50 cursor-pointer'
                              }`}
                            >
                              <span>{slot}</span>
                              {isOccupied ? (
                                <span className="text-[10px] uppercase font-bold text-rose-500 bg-rose-50 px-2 py-0.5 rounded-md">
                                  Ocupado
                                </span>
                              ) : isSelected ? (
                                <Check className="w-4 h-4 text-amber-300" />
                              ) : (
                                <span className="text-[10px] uppercase font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md">
                                  Libre
                                </span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Step 2 Footer */}
                  <div className="pt-4 flex items-center justify-between border-t border-warm-100">
                    <button
                      onClick={() => setStep(1)}
                      className="px-4 py-2.5 text-xs text-warm-600 hover:text-warm-900 font-semibold cursor-pointer"
                    >
                      &larr; Volver
                    </button>
                    <button
                      disabled={!selectedDate || !selectedTimeSlot}
                      onClick={() => setStep(3)}
                      className={`inline-flex items-center gap-2 px-6 py-3 rounded-2xl text-xs sm:text-sm font-semibold transition-all ${
                        selectedDate && selectedTimeSlot
                          ? isCapra
                            ? 'bg-[#191215] hover:bg-[#8E4A59] text-white shadow-soft cursor-pointer'
                            : 'bg-sage-800 hover:bg-sage-900 text-white shadow-soft cursor-pointer'
                          : 'bg-warm-200 text-warm-400 cursor-not-allowed'
                      }`}
                    >
                      <span>Ingresar Datos</span>
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 3: CLIENT DETAILS & WHATSAPP CONFIRMATION */}
              {step === 3 && (
                <form onSubmit={handleConfirmReservation} className="space-y-5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="block text-xs font-bold text-warm-800 flex items-center gap-1">
                        <User className="w-3.5 h-3.5 text-warm-600" />
                        <span>Nombre y Apellido *</span>
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="Ej: Sofía Ramírez"
                        value={clientName}
                        onChange={(e) => setClientName(e.target.value)}
                        className="w-full p-3 bg-warm-50 border border-warm-200 rounded-xl text-xs sm:text-sm focus:ring-2 focus:ring-warm-400 focus:outline-none"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="block text-xs font-bold text-warm-800 flex items-center gap-1">
                        <Phone className="w-3.5 h-3.5 text-warm-600" />
                        <span>Número de WhatsApp *</span>
                      </label>
                      <input
                        type="tel"
                        required
                        placeholder="Ej: 0414-1234567"
                        value={clientPhone}
                        onChange={(e) => setClientPhone(e.target.value)}
                        className="w-full p-3 bg-warm-50 border border-warm-200 rounded-xl text-xs sm:text-sm focus:ring-2 focus:ring-warm-400 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="block text-xs font-bold text-warm-800 flex items-center gap-1">
                        <Mail className="w-3.5 h-3.5 text-warm-600" />
                        <span>Correo Electrónico (Para tu Ficha)</span>
                      </label>
                      <input
                        type="email"
                        placeholder="tuemail@gmail.com"
                        value={clientEmail}
                        onChange={(e) => setClientEmail(e.target.value)}
                        className="w-full p-3 bg-warm-50 border border-warm-200 rounded-xl text-xs sm:text-sm focus:ring-2 focus:ring-warm-400 focus:outline-none"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="block text-xs font-bold text-warm-800 flex items-center gap-1">
                        <InstagramIcon className="w-3.5 h-3.5 text-warm-600" />
                        <span>Usuario de Instagram (Opcional)</span>
                      </label>
                      <input
                        type="text"
                        placeholder="@tu_usuario"
                        value={clientInstagram}
                        onChange={(e) => setClientInstagram(e.target.value)}
                        className="w-full p-3 bg-warm-50 border border-warm-200 rounded-xl text-xs sm:text-sm focus:ring-2 focus:ring-warm-400 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-warm-800 flex items-center gap-1">
                      <CreditCard className="w-3.5 h-3.5 text-warm-600" />
                      <span>Método de Pago Preferido</span>
                    </label>
                    <select
                      value={paymentMethod}
                      onChange={(e) => setPaymentMethod(e.target.value as PaymentMethodType)}
                      className="w-full p-3 bg-warm-50 border border-warm-200 rounded-xl text-xs sm:text-sm font-semibold focus:ring-2 focus:ring-warm-400 focus:outline-none"
                    >
                      <option value="pago_movil">Pago Móvil (Tasa BCV)</option>
                      <option value="efectivo">Efectivo en Divisas ($)</option>
                      <option value="binance">Binance Pay (USDT)</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-warm-800">
                      Notas especiales o requerimiento (Opcional)
                    </label>
                    <textarea
                      rows={2}
                      placeholder={
                        isCapra
                          ? 'Ej: Deseo laminado natural o consultar por fechas de Capra Academy...'
                          : 'Ej: Deseo tono nude clásico o retirar sistema previo...'
                      }
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      className="w-full p-3 bg-warm-50 border border-warm-200 rounded-xl text-xs sm:text-sm focus:ring-2 focus:ring-warm-400 focus:outline-none resize-none"
                    />
                  </div>

                  {/* Reconocimiento Inteligente de Clienta Habitual vs Nueva Clienta */}
                  {isExistingClient ? (
                    <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200/90 flex items-start gap-3 shadow-xs">
                      <div className="w-9 h-9 rounded-xl bg-emerald-700 text-white flex items-center justify-center shrink-0">
                        <Sparkles className="w-5 h-5 text-amber-300" />
                      </div>
                      <div className="space-y-0.5 text-xs flex-1">
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <span className="font-bold text-emerald-950 text-sm">
                            ¡Qué alegría verte de nuevo, {clientName || 'Clienta'}!
                          </span>
                          <span className="text-[10px] uppercase font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full border border-emerald-300">
                            Clienta VIP Habitual
                          </span>
                        </div>
                        <p className="text-emerald-800 text-[11px] leading-relaxed">
                          Reconocida automáticamente en tu Ficha de Clienta. Cuentas con <b>{recognizedStamps} de 5 sellos</b> acumulados en tu Tarjeta de Fidelización.
                          {recognizedStamps >= 4
                            ? ` ¡Esta visita completa tu ciclo para tu ${loyaltyRewardLabel}!`
                            : ' ¡Esta cita sumará tu siguiente sello oficial!'}
                        </p>
                      </div>
                    </div>
                  ) : preSelectedPromo ? (
                    <div className="p-3.5 rounded-2xl bg-amber-50/80 border border-amber-200 text-xs text-amber-900 flex items-center gap-2">
                      <Gift className="w-4 h-4 text-amber-600 shrink-0" />
                      <span><b>Combo Promocional:</b> Ahorro directo aplicado en paquete cerrado. Suma automáticamente a tu Tarjeta VIP.</span>
                    </div>
                  ) : (
                    /* Beneficio Primera Cita */
                    <div className="space-y-3">
                      <label className="flex items-start gap-3 p-3.5 bg-amber-50/90 border border-amber-200 rounded-2xl cursor-pointer hover:bg-amber-100/50 transition-colors">
                        <input
                          type="checkbox"
                          checked={isFirstVisit}
                          onChange={(e) => setIsFirstVisit(e.target.checked)}
                          className="mt-0.5 w-4 h-4 text-amber-600 rounded border-amber-300 focus:ring-amber-500 accent-amber-600 cursor-pointer"
                        />
                        <div className="text-xs space-y-0.5">
                          <span className="font-bold text-amber-950 block">
                            ¿Es tu primera visita con {directorName}? (Descuento de bienvenida -$2.00 USD)
                          </span>
                          <span className="text-[11px] text-amber-800 leading-tight block">
                            <b>Validación Presencial:</b> La bonificación de $2.00 USD es validada en recepción al momento de tu cita tras verificar que sea tu primera visita en {tenantName}.
                          </span>
                        </div>
                      </label>

                      {/* Crear PIN / Contraseña opcional para su ficha */}
                      <div className="p-3 rounded-2xl bg-warm-50 border border-warm-200 space-y-1.5">
                        <label className="block text-[11px] font-bold text-warm-800 flex items-center gap-1.5">
                          <Lock className="w-3.5 h-3.5 text-warm-600" />
                          <span>Crea tu PIN para tu Ficha de Clienta (Opcional - 4 dígitos)</span>
                        </label>
                        <input
                          type="password"
                          maxLength={6}
                          placeholder="Ej: 1234"
                          value={clientPin}
                          onChange={(e) => setClientPin(e.target.value)}
                          className="w-full p-2.5 bg-white border border-warm-200 rounded-xl text-xs focus:ring-2 focus:ring-warm-400 focus:outline-none"
                        />
                        <p className="text-[10px] text-warm-500">
                          Te permitirá consultar tus sellos acumulados y próximas citas en cualquier momento.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Resumen Final de Reserva */}
                  <div
                    className={`p-4 rounded-2xl border space-y-2.5 tabular-nums ${
                      isCapra
                        ? 'bg-[#FAF6F3] border-[#8E4A59]/25'
                        : 'bg-sage-50/80 border-sage-200/80'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="space-y-0.5">
                        <span className="text-[10px] font-bold text-warm-700 uppercase tracking-wider">
                          Resumen de Cita
                        </span>
                        <p className="text-xs font-bold text-warm-900">
                          {combinedServiceNames} &bull; {selectedDate} ({selectedTimeSlot})
                        </p>
                        <p className="text-[11px] text-warm-600">
                          Tasa oficial BCV: ≈ Bs. {totalPriceVES.toFixed(2)}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="text-[10px] text-warm-600 block uppercase">Total a Pagar</span>
                        <span className="font-serif text-2xl font-bold text-warm-900">
                          ${totalPriceUSD.toFixed(2)} USD
                        </span>
                      </div>
                    </div>

                    {/* Breakdown & Loyalty notes */}
                    <div className="pt-2 border-t border-black/10 flex flex-wrap items-center justify-between text-xs text-warm-800 gap-1.5">
                      <span>Base: ${basePriceUSD.toFixed(2)} {addonsTotalUSD > 0 && `+ Adicionales: $${addonsTotalUSD.toFixed(2)}`}</span>
                      {!preSelectedPromo && !isExistingClient && isFirstVisit ? (
                        <span className="font-bold text-amber-900 bg-amber-100/90 px-2 py-0.5 rounded-full border border-amber-300 text-[11px]">
                          1ª Cita: -$2.00 USD (Sujeto a validación)
                        </span>
                      ) : isExistingClient ? (
                        <span className="font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full border border-emerald-300 text-[11px]">
                          Clienta VIP: {recognizedStamps}/5 sellos
                        </span>
                      ) : null}
                    </div>

                    {!preSelectedPromo && !isExistingClient && isFirstVisit && (
                      <div className="p-2.5 rounded-xl bg-amber-100/70 border border-amber-200/90 text-[11px] text-amber-900 flex items-start gap-2">
                        <Info className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                        <span><b>Aviso:</b> La bonificación de $2.00 USD será validada en persona en {tenantName} al momento de tu atención.</span>
                      </div>
                    )}

                    <div className="pt-1 text-[11px] text-warm-700 font-medium flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                      <span>Suma 1 sello en tu Pasaporte de Fidelidad (5 visitas = {loyaltyRewardLabel}).</span>
                    </div>
                  </div>

                  {/* Submit Button */}
                  <div className="pt-2 flex items-center justify-between border-t border-warm-100">
                    <button
                      type="button"
                      onClick={() => setStep(2)}
                      className="px-4 py-2.5 text-xs text-warm-600 hover:text-warm-900 font-semibold cursor-pointer"
                    >
                      &larr; Cambiar Fecha
                    </button>
                    <button
                      type="submit"
                      className={`inline-flex items-center gap-2 px-7 py-3.5 text-white rounded-2xl text-xs sm:text-sm font-semibold shadow-soft transition-all cursor-pointer ${
                        isCapra ? 'bg-[#191215] hover:bg-[#8E4A59]' : 'bg-emerald-700 hover:bg-emerald-800'
                      }`}
                    >
                      <Send className="w-4 h-4" />
                      <span>Confirmar &amp; Reservar vía WhatsApp</span>
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
