import { 
  ServiceItem, 
  PromoOffer, 
  AppointmentBooking, 
  BlockedTimeSlot, 
  LoyaltyCard,
  ClientAccount,
  PaymentMethodType,
  GallerySlide
} from '../types';
import { INITIAL_SERVICES, INITIAL_PROMOS, AVAILABLE_TIME_SLOTS, INITIAL_GALLERY_SLIDES } from '../data/initialData';

const STORAGE_KEYS = {
  SERVICES: 'andrea_labrador_services_v5',
  PROMOS: 'andrea_labrador_promos_v3',
  BOOKINGS: 'andrea_labrador_bookings_v2',
  BLOCKED_SLOTS: 'andrea_labrador_blocked_slots_v2',
  TIME_SLOTS: 'andrea_labrador_time_slots_v1',
  LOYALTY: 'andrea_labrador_loyalty_v2',
  EXCHANGE_RATE: 'andrea_labrador_exchange_rate_v1',
  EMAIL_SETTINGS: 'andrea_labrador_email_settings_v2',
  CLIENT_ACCOUNTS: 'andrea_labrador_client_accounts_v1',
  ACTIVE_CLIENT: 'andrea_labrador_active_client_v1',
  GALLERY: 'andrea_labrador_gallery_v1',
  ADMIN_SESSION: 'andrea_labrador_admin_session_v1',
};

export interface StudioEmailSettings {
  contactEmail: string;
  senderName: string;
}

export interface AppStoreData {
  services: ServiceItem[];
  promos: PromoOffer[];
  bookings: AppointmentBooking[];
  blockedSlots: BlockedTimeSlot[];
  loyaltyCards: Record<string, LoyaltyCard>;
  exchangeRateVES: number;
}

export class AppStore {
  private static activeTenantId: string = '';

  static setActiveTenant(tenantSlug: string): void {
    this.activeTenantId = (tenantSlug || '').trim().toLowerCase();
  }

  static getActiveTenant(): string {
    return this.activeTenantId;
  }

  private static resolveKey(baseKey: string): string {
    const cleanSuffix = baseKey.replace(/^andrea_labrador_/, '');
    const tenantPart = this.activeTenantId || 'isolated';
    return `vanesev_${tenantPart}_${cleanSuffix}`;
  }

  private static getStored<T>(key: string, defaultValue: T): T {
    if (!this.activeTenantId) return defaultValue;
    try {
      const namespacedKey = this.resolveKey(key);
      const data = localStorage.getItem(namespacedKey);
      if (data) return JSON.parse(data);

      // Backward compatibility ONLY for explicit 'andrea-nails' tenant
      if (this.activeTenantId === 'andrea-nails') {
        const legacyData = localStorage.getItem(key);
        if (legacyData) return JSON.parse(legacyData);
      }
      return defaultValue;
    } catch (e) {
      console.error(`Error reading ${key} from storage:`, e);
      return defaultValue;
    }
  }

  private static setStored<T>(key: string, value: T): void {
    if (!this.activeTenantId) return;
    try {
      const namespacedKey = this.resolveKey(key);
      localStorage.setItem(namespacedKey, JSON.stringify(value));
      if (this.activeTenantId === 'andrea-nails') {
        localStorage.setItem(key, JSON.stringify(value));
      }
    } catch (e) {
      console.error(`Error saving ${key} to storage:`, e);
    }
  }

  // ─── SERVICIOS ─────────────────────────────────────────────────────────────
  static getServices(): ServiceItem[] {
    if (!this.activeTenantId) return [];
    const fallback = this.activeTenantId === 'andrea-nails' ? INITIAL_SERVICES : [];
    const list = this.getStored<ServiceItem[]>(STORAGE_KEYS.SERVICES, fallback);
    if (this.activeTenantId === 'andrea-nails' && (!list[0]?.badgeText || list.some(s => s.imageUrl?.includes('unsplash.com')))) {
      this.saveServices(INITIAL_SERVICES);
      return INITIAL_SERVICES;
    }
    return list.map(s => {
      const price = s.id === 'pedicure' && Number(s.priceUSD) === 11.5 ? 13.00 : Number(s.priceUSD) || 0;
      return { ...s, priceUSD: price };
    });
  }

  static saveServices(services: ServiceItem[]): void {
    this.setStored(STORAGE_KEYS.SERVICES, services);
  }

  static async fetchRemoteServices(): Promise<ServiceItem[]> {
    if (!this.activeTenantId) return [];
    try {
      const res = await fetch(`/api/services?tenant=${encodeURIComponent(this.activeTenantId)}`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.services) && data.services.length > 0) {
          const services: ServiceItem[] = data.services.map((s: any) => ({
            ...s,
            priceUSD: Number(s.priceUSD) || 0,
          }));
          this.saveServices(services);
          return services;
        }
      }
    } catch (e) {
      console.warn('Usando catálogo local:', e);
    }
    return this.getServices();
  }

  static async saveServiceRemote(service: ServiceItem): Promise<void> {
    if (!this.activeTenantId) return;
    this.updateService(service);
    try {
      await fetch(`/api/services?tenant=${encodeURIComponent(this.activeTenantId)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...service, tenantId: this.activeTenantId })
      });
    } catch (e) {
      console.error('Error guardando servicio en Neon:', e);
    }
  }

  static updateService(service: ServiceItem): void {
    const services = this.getServices();
    const index = services.findIndex(s => s.id === service.id);
    if (index >= 0) {
      services[index] = service;
    } else {
      services.push(service);
    }
    this.saveServices(services);
  }

  static async deleteServiceRemote(id: string): Promise<void> {
    if (!this.activeTenantId) return;
    this.deleteService(id);
    try {
      await fetch(`/api/services?id=${encodeURIComponent(id)}&tenant=${encodeURIComponent(this.activeTenantId)}`, { method: 'DELETE' });
    } catch (e) {
      console.error('Error eliminando servicio en Neon:', e);
    }
  }

  static deleteService(id: string): void {
    const services = this.getServices().filter(s => s.id !== id);
    this.saveServices(services);
  }

  static toggleServiceAvailability(id: string): void {
    const services = this.getServices();
    const service = services.find(s => s.id === id);
    if (service) {
      service.isAvailable = !service.isAvailable;
      this.saveServices(services);
      this.saveServiceRemote(service);
    }
  }

  // ─── PROMOCIONES ───────────────────────────────────────────────────────────
  static getPromos(): PromoOffer[] {
    if (!this.activeTenantId) return [];
    const fallback = this.activeTenantId === 'andrea-nails' ? INITIAL_PROMOS : [];
    const list = this.getStored<PromoOffer[]>(STORAGE_KEYS.PROMOS, fallback);
    return list.map(p => ({
      ...p,
      regularPriceUSD: Number(p.regularPriceUSD) || 0,
      promoPriceUSD: Number(p.promoPriceUSD) || 0,
    }));
  }

  static savePromos(promos: PromoOffer[]): void {
    this.setStored(STORAGE_KEYS.PROMOS, promos);
  }

  static addPromo(promo: PromoOffer): void {
    const promos = this.getPromos();
    promos.unshift(promo);
    this.savePromos(promos);
  }

  static togglePromoActive(id: string): void {
    const promos = this.getPromos();
    const promo = promos.find(p => p.id === id);
    if (promo) {
      promo.isActive = !promo.isActive;
      this.savePromos(promos);
    }
  }

  // ─── CARRUSEL DE DISEÑOS / GALERÍA ─────────────────────────────────────────
  static getGallery(): GallerySlide[] {
    if (!this.activeTenantId) return [];
    const fallback = this.activeTenantId === 'andrea-nails' ? INITIAL_GALLERY_SLIDES : [];
    const list = this.getStored<GallerySlide[]>(STORAGE_KEYS.GALLERY, fallback);
    if (this.activeTenantId === 'andrea-nails' && (!Array.isArray(list) || list.length === 0)) {
      this.saveGallery(INITIAL_GALLERY_SLIDES);
      return INITIAL_GALLERY_SLIDES;
    }
    return list;
  }

  static saveGallery(slides: GallerySlide[]): void {
    const trimmed = slides.slice(0, 40);
    this.setStored(STORAGE_KEYS.GALLERY, trimmed);
  }

  static addGallerySlide(slide: GallerySlide): { success: boolean; error?: string } {
    const current = this.getGallery();
    if (current.length >= 40) {
      return { success: false, error: 'Has alcanzado el límite máximo de 40 imágenes en el carrusel.' };
    }
    current.unshift(slide);
    this.saveGallery(current);
    return { success: true };
  }

  static deleteGallerySlide(id: string): void {
    const current = this.getGallery();
    const filtered = current.filter(s => s.id !== id);
    this.saveGallery(filtered);
  }

  static async fetchRemoteGallery(): Promise<GallerySlide[]> {
    if (!this.activeTenantId) return [];
    try {
      const res = await fetch(`/api/gallery?tenant=${encodeURIComponent(this.activeTenantId)}`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.slides) && data.slides.length > 0) {
          this.saveGallery(data.slides);
          return data.slides;
        }
      }
    } catch (e) {
      console.warn('Usando carrusel local:', e);
    }
    return this.getGallery();
  }

  static async saveGallerySlideRemote(slide: GallerySlide): Promise<void> {
    if (!this.activeTenantId) return;
    try {
      await fetch(`/api/gallery?tenant=${encodeURIComponent(this.activeTenantId)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...slide, tenantId: this.activeTenantId })
      });
    } catch (e) {
      console.error('Error guardando imagen en base de datos:', e);
    }
  }

  static async deleteGallerySlideRemote(id: string): Promise<void> {
    if (!this.activeTenantId) return;
    this.deleteGallerySlide(id);
    try {
      await fetch(`/api/gallery?id=${encodeURIComponent(id)}&tenant=${encodeURIComponent(this.activeTenantId)}`, { method: 'DELETE' });
    } catch (e) {
      console.error('Error eliminando imagen de base de datos:', e);
    }
  }

  // ─── CITAS Y RESERVAS ──────────────────────────────────────────────────────
  static getBookings(): AppointmentBooking[] {
    if (!this.activeTenantId) return [];
    const list = this.getStored<AppointmentBooking[]>(STORAGE_KEYS.BOOKINGS, []);
    return list.map(b => ({
      ...b,
      servicePriceUSD: Number(b.servicePriceUSD) || 0,
      totalPriceUSD: Number(b.totalPriceUSD) || 0,
      discountUSD: Number(b.discountUSD) || 0,
    }));
  }

  static saveBookings(bookings: AppointmentBooking[]): void {
    this.setStored(STORAGE_KEYS.BOOKINGS, bookings);
  }

  static async fetchRemoteBookings(): Promise<AppointmentBooking[]> {
    if (!this.activeTenantId) return [];
    try {
      const res = await fetch(`/api/bookings?tenant=${encodeURIComponent(this.activeTenantId)}`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.bookings)) {
          const bookings = data.bookings.map((b: any) => ({
            ...b,
            servicePriceUSD: Number(b.servicePriceUSD) || 0,
            totalPriceUSD: Number(b.totalPriceUSD) || 0,
            discountUSD: Number(b.discountUSD) || 0,
          }));
          this.saveBookings(bookings);
          return bookings;
        }
      }
    } catch (e) {
      console.warn('Usando citas locales:', e);
    }
    return this.getBookings();
  }

  static async createBookingRemote(booking: AppointmentBooking): Promise<{
    success: boolean;
    booking?: AppointmentBooking;
    error?: string;
  }> {
    const targetTenant = (booking as any).tenantId || this.activeTenantId;
    if (!targetTenant) {
      return { success: false, error: 'Salón no identificado para la reserva.' };
    }
    this.addBooking(booking);

    try {
      const res = await fetch(`/api/bookings?tenant=${encodeURIComponent(targetTenant)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantId: targetTenant,
          clientName: booking.clientName,
          clientPhone: booking.clientPhone,
          clientEmail: booking.clientEmail,
          clientPin: booking.clientPin,
          clientInstagram: booking.clientInstagram,
          serviceId: booking.serviceId,
          serviceName: booking.serviceName,
          servicePriceUSD: booking.servicePriceUSD,
          totalPriceUSD: booking.totalPriceUSD,
          date: booking.date,
          timeSlot: booking.timeSlot,
          paymentMethod: booking.paymentMethod,
          isFirstVisit: booking.isFirstVisit,
          notes: booking.notes,
          status: booking.status,
        })
      });

      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error || 'Error al registrar cita.' };
      }

      if (data.booking) {
        this.updateBookingStatus(booking.id, data.booking.status);
      }

      return { success: true, booking: data.booking || booking };
    } catch (e: any) {
      console.warn('Cita guardada en modo local/offline:', e);
      return { success: true, booking };
    }
  }

  static addBooking(booking: AppointmentBooking): void {
    const bookings = this.getBookings();
    bookings.unshift(booking);
    this.saveBookings(bookings);
    this.recordLoyaltyVisit(booking.clientPhone, booking.clientName);

    this.registerOrUpdateClientAccount({
      name: booking.clientName,
      phone: booking.clientPhone,
      email: booking.clientEmail,
      pin: booking.clientPin,
      instagram: booking.clientInstagram,
    });
  }

  static async updateBookingStatusRemote(id: string, status: AppointmentBooking['status'], cancellationReason?: string): Promise<void> {
    if (!this.activeTenantId) return;
    this.updateBookingStatus(id, status, cancellationReason);
    try {
      await fetch(`/api/bookings?tenant=${encodeURIComponent(this.activeTenantId)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, tenantId: this.activeTenantId, status, cancellationReason })
      });
    } catch (e) {
      console.error('Error actualizando estado en Neon:', e);
    }
  }

  static updateBookingStatus(id: string, status: AppointmentBooking['status'], cancellationReason?: string): void {
    const bookings = this.getBookings();
    const booking = bookings.find(b => b.id === id);
    if (booking) {
      booking.status = status;
      if (cancellationReason) {
        booking.cancellationReason = cancellationReason;
      }
      this.saveBookings(bookings);
    }
  }

  static rescheduleBooking(id: string, date: string, timeSlot: string): void {
    const bookings = this.getBookings();
    const booking = bookings.find(b => b.id === id);
    if (booking) {
      booking.date = date;
      booking.timeSlot = timeSlot;
      booking.status = 'confirmada';
      this.saveBookings(bookings);
    }
  }

  static async rescheduleBookingRemote(id: string, date: string, timeSlot: string): Promise<{ success: boolean; error?: string }> {
    if (!this.activeTenantId) return { success: false, error: 'Salón no activo.' };
    this.rescheduleBooking(id, date, timeSlot);
    try {
      const res = await fetch(`/api/bookings?tenant=${encodeURIComponent(this.activeTenantId)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, tenantId: this.activeTenantId, action: 'reschedule', date, timeSlot })
      });
      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error || 'Error al reprogramar cita.' };
      }
      return { success: true };
    } catch (e: any) {
      console.error('Error reprogramando cita en Neon:', e);
      return { success: true };
    }
  }

  static async deleteBookingRemote(id: string): Promise<void> {
    if (!this.activeTenantId) return;
    this.deleteBooking(id);
    try {
      await fetch(`/api/bookings?id=${encodeURIComponent(id)}&tenant=${encodeURIComponent(this.activeTenantId)}`, { method: 'DELETE' });
    } catch (e) {
      console.error('Error eliminando reserva en Neon:', e);
    }
  }

  static deleteBooking(id: string): void {
    const bookings = this.getBookings().filter(b => b.id !== id);
    this.saveBookings(bookings);
  }

  // ─── BLOQUEOS DE CALENDARIO ────────────────────────────────────────────────
  static getBlockedSlots(): BlockedTimeSlot[] {
    if (!this.activeTenantId) return [];
    return this.getStored<BlockedTimeSlot[]>(STORAGE_KEYS.BLOCKED_SLOTS, []);
  }

  static saveBlockedSlots(slots: BlockedTimeSlot[]): void {
    this.setStored(STORAGE_KEYS.BLOCKED_SLOTS, slots);
  }

  static async fetchRemoteBlockedSlots(): Promise<BlockedTimeSlot[]> {
    if (!this.activeTenantId) return [];
    try {
      const res = await fetch(`/api/schedule?tenant=${encodeURIComponent(this.activeTenantId)}`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.blockedSlots)) {
          this.saveBlockedSlots(data.blockedSlots);
          return data.blockedSlots;
        }
      }
    } catch (e) {
      console.warn('Usando bloqueos locales:', e);
    }
    return this.getBlockedSlots();
  }

  static async toggleBlockSlotRemote(date: string, timeSlot: string, reason?: string): Promise<boolean> {
    if (!this.activeTenantId) return false;
    const isNowBlocked = this.toggleBlockSlot(date, timeSlot, reason);
    try {
      await fetch(`/api/schedule?tenant=${encodeURIComponent(this.activeTenantId)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenantId: this.activeTenantId, action: 'toggle', date, timeSlot, reason })
      });
    } catch (e) {
      console.error('Error sincronizando slot en Neon:', e);
    }
    return isNowBlocked;
  }

  static toggleBlockSlot(date: string, timeSlot: string, reason?: string): boolean {
    const slots = this.getBlockedSlots();
    const index = slots.findIndex(s => s.date === date && s.timeSlot === timeSlot);
    let isNowBlocked = false;
    if (index >= 0) {
      slots.splice(index, 1);
      isNowBlocked = false;
    } else {
      slots.push({ date, timeSlot, reason: reason || 'Horario reservado/bloqueado por estudio' });
      isNowBlocked = true;
    }
    this.saveBlockedSlots(slots);
    return isNowBlocked;
  }

  static async blockEntireDayRemote(date: string, slots?: string[], reason = 'Día cerrado / libre'): Promise<void> {
    if (!this.activeTenantId) return;
    this.blockEntireDay(date, reason);
    try {
      await fetch(`/api/schedule?tenant=${encodeURIComponent(this.activeTenantId)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantId: this.activeTenantId,
          action: 'block_day',
          date,
          slots: slots || this.getTimeSlots(),
          reason
        })
      });
    } catch (e) {
      console.error('Error bloqueando día en Neon:', e);
    }
  }

  static blockEntireDay(date: string, reason = 'Día cerrado / libre'): void {
    const slots = this.getTimeSlots();
    const current = this.getBlockedSlots().filter(s => s.date !== date);
    slots.forEach(slot => {
      current.push({ date, timeSlot: slot, reason });
    });
    this.saveBlockedSlots(current);
  }

  static async unblockEntireDayRemote(date: string): Promise<void> {
    if (!this.activeTenantId) return;
    this.unblockEntireDay(date);
    try {
      await fetch(`/api/schedule?tenant=${encodeURIComponent(this.activeTenantId)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenantId: this.activeTenantId, action: 'unblock_day', date })
      });
    } catch (e) {
      console.error('Error desbloqueando día en Neon:', e);
    }
  }

  static unblockEntireDay(date: string): void {
    const current = this.getBlockedSlots().filter(s => s.date !== date);
    this.saveBlockedSlots(current);
  }

  static isSlotOccupied(date: string, timeSlot: string): boolean {
    const blocked = this.getBlockedSlots().some(s => s.date === date && s.timeSlot === timeSlot);
    if (blocked) return true;

    const booked = this.getBookings().some(
      b => b.date === date && b.timeSlot === timeSlot && (b.status === 'confirmada' || b.status === 'pendiente' || b.status === 'en_whatsapp')
    );
    return booked;
  }

  static isDayEntirelyBlocked(date: string): boolean {
    const slots = this.getTimeSlots();
    if (slots.length === 0) return false;
    const blocks = this.getBlockedSlots().filter(s => s.date === date);
    return slots.every(slot => blocks.some(b => b.timeSlot === slot));
  }

  // ─── TURNOS Y HORARIOS CONFIGURABLES ───────────────────────────────────────
  static getTimeSlots(): string[] {
    return this.getStored<string[]>(STORAGE_KEYS.TIME_SLOTS, AVAILABLE_TIME_SLOTS);
  }

  static saveTimeSlots(slots: string[]): void {
    this.setStored(STORAGE_KEYS.TIME_SLOTS, slots);
  }

  static addTimeSlot(slot: string): void {
    const slots = this.getTimeSlots();
    if (!slots.includes(slot)) {
      slots.push(slot);
      this.saveTimeSlots(slots);
    }
  }

  static removeTimeSlot(slot: string): void {
    const slots = this.getTimeSlots().filter(s => s !== slot);
    this.saveTimeSlots(slots);
  }

  // ─── FIDELIZACIÓN (6+1 GRATIS) ─────────────────────────────────────────────
  static getLoyaltyCards(): Record<string, LoyaltyCard> {
    if (!this.activeTenantId) return {};
    return this.getStored<Record<string, LoyaltyCard>>(STORAGE_KEYS.LOYALTY, {});
  }

  static saveLoyaltyCards(cards: Record<string, LoyaltyCard>): void {
    this.setStored(STORAGE_KEYS.LOYALTY, cards);
  }

  static async fetchRemoteLoyaltyCards(): Promise<Record<string, LoyaltyCard>> {
    if (!this.activeTenantId) return {};
    try {
      const res = await fetch(`/api/loyalty?tenant=${encodeURIComponent(this.activeTenantId)}`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.cards)) {
          const map: Record<string, LoyaltyCard> = {};
          data.cards.forEach((c: any) => {
            map[c.phone] = {
              phone: c.phone,
              clientName: c.clientName,
              stampsCount: c.stampsCount,
              lastVisit: c.lastVisit,
              rewardsEarned: c.rewardsEarned || [],
            };
          });
          this.saveLoyaltyCards(map);
          return map;
        }
      }
    } catch (e) {
      console.warn('Usando tarjetas de fidelización locales:', e);
    }
    return this.getLoyaltyCards();
  }

  static async fetchClientLoyaltyRemote(phone: string): Promise<LoyaltyCard | null> {
    if (!this.activeTenantId) return null;
    const cleanPhone = phone.replace(/\D/g, '');
    if (!cleanPhone) return null;

    try {
      const res = await fetch(`/api/loyalty?phone=${encodeURIComponent(cleanPhone)}&tenant=${encodeURIComponent(this.activeTenantId)}`);
      if (res.ok) {
        const data = await res.json();
        if (data.found || data.stampsCount !== undefined) {
          const card: LoyaltyCard = {
            phone: data.phone,
            clientName: data.clientName || 'Clienta VIP',
            stampsCount: data.stampsCount || 0,
            lastVisit: data.lastVisit || new Date().toISOString().split('T')[0],
            rewardsEarned: data.rewardsEarned || [],
          };
          const cards = this.getLoyaltyCards();
          cards[cleanPhone] = card;
          this.saveLoyaltyCards(cards);
          return card;
        }
      }
    } catch (e) {
      console.warn('Error consultando fidelización remota:', e);
    }

    return this.getClientLoyalty(cleanPhone);
  }

  static getClientLoyalty(phone: string): LoyaltyCard | null {
    const cards = this.getLoyaltyCards();
    const normalized = phone.replace(/\D/g, '');
    return cards[normalized] || null;
  }

  static async setLoyaltyStampsRemote(phone: string, clientName: string, stamps: number): Promise<LoyaltyCard> {
    const card = this.setLoyaltyStamps(phone, clientName, stamps);
    if (!this.activeTenantId) return card;
    try {
      await fetch(`/api/loyalty?tenant=${encodeURIComponent(this.activeTenantId)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantId: this.activeTenantId,
          phone: card.phone,
          clientName: card.clientName,
          stampsCount: card.stampsCount,
        })
      });
    } catch (e) {
      console.error('Error sincronizando fidelización en Neon:', e);
    }
    return card;
  }

  static setLoyaltyStamps(phone: string, clientName: string, stamps: number): LoyaltyCard {
    const cards = this.getLoyaltyCards();
    const normalized = phone.replace(/\D/g, '');
    const existing = cards[normalized] || {
      phone: normalized,
      clientName: clientName || 'Clienta',
      stampsCount: 0,
      lastVisit: new Date().toISOString().split('T')[0],
      rewardsEarned: []
    };
    existing.clientName = clientName || existing.clientName;
    existing.stampsCount = Math.max(0, Math.min(5, stamps));
    if (existing.stampsCount === 5 && !existing.rewardsEarned.includes('¡Depilación de Cejas 100% GRATIS!')) {
      existing.rewardsEarned.push('¡Depilación de Cejas 100% GRATIS!');
    }
    cards[normalized] = existing;
    this.saveLoyaltyCards(cards);
    return existing;
  }

  static recordLoyaltyVisit(phone: string, clientName: string): LoyaltyCard {
    const cards = this.getLoyaltyCards();
    const normalized = phone.replace(/\D/g, '');
    const existing = cards[normalized] || {
      phone: normalized,
      clientName: clientName,
      stampsCount: 0,
      lastVisit: new Date().toISOString().split('T')[0],
      rewardsEarned: []
    };

    existing.clientName = clientName;
    existing.lastVisit = new Date().toISOString().split('T')[0];
    existing.stampsCount = Math.min(5, existing.stampsCount + 1);

    if (existing.stampsCount === 5 && !existing.rewardsEarned.includes('¡Depilación de Cejas 100% GRATIS!')) {
      existing.rewardsEarned.push('¡Depilación de Cejas 100% GRATIS!');
    }

    cards[normalized] = existing;
    this.saveLoyaltyCards(cards);
    return existing;
  }

  // ─── CONFIGURACIÓN DE CORREO GMAIL ─────────────────────────────────────────
  static getEmailSettings(): StudioEmailSettings {
    return this.getStored<StudioEmailSettings>(STORAGE_KEYS.EMAIL_SETTINGS, {
      contactEmail: 'andrealabradornails@gmail.com',
      senderName: 'Andrea Labrador Nails Studio'
    });
  }

  static saveEmailSettings(settings: StudioEmailSettings): void {
    this.setStored(STORAGE_KEYS.EMAIL_SETTINGS, settings);
  }

  // ─── TASA DE CAMBIO (VES / USD) ────────────────────────────────────────────
  static getExchangeRate(): number {
    return this.getStored<number>(STORAGE_KEYS.EXCHANGE_RATE, 36.85);
  }

  static saveExchangeRate(rate: number): void {
    this.setStored(STORAGE_KEYS.EXCHANGE_RATE, rate);
  }

  // ─── GESTIÓN DE CUENTAS & FICHAS DE CLIENTAS ──────────────────────────────
  static getClientAccounts(): Record<string, ClientAccount> {
    return this.getStored<Record<string, ClientAccount>>(STORAGE_KEYS.CLIENT_ACCOUNTS, {});
  }

  static saveClientAccounts(accounts: Record<string, ClientAccount>): void {
    this.setStored(STORAGE_KEYS.CLIENT_ACCOUNTS, accounts);
  }

  static findClientAccount(identifier: string): ClientAccount | null {
    if (!identifier) return null;
    const clean = identifier.trim().toLowerCase();
    const cleanPhone = clean.replace(/\D/g, '');
    const accounts = this.getClientAccounts();

    // 1. Buscar en cuentas explícitas por teléfono o correo
    for (const key of Object.keys(accounts)) {
      const acc = accounts[key];
      const accPhone = (acc.phone || '').replace(/\D/g, '');
      const accEmail = (acc.email || '').trim().toLowerCase();
      if ((cleanPhone && accPhone === cleanPhone) || (accEmail && accEmail === clean)) {
        return acc;
      }
    }

    // 2. Si no tiene cuenta formal, buscar en tarjetas de fidelización existentes
    if (cleanPhone) {
      const loyalty = this.getClientLoyalty(cleanPhone);
      if (loyalty && (loyalty.stampsCount > 0 || loyalty.clientName)) {
        return {
          id: 'acc_' + cleanPhone,
          name: loyalty.clientName || 'Clienta Habitual',
          phone: cleanPhone,
          stampsCount: loyalty.stampsCount,
          createdAt: loyalty.lastVisit || new Date().toISOString(),
          lastVisit: loyalty.lastVisit,
        };
      }

      // 3. Buscar si tiene citas previas registradas
      const bookings = this.getBookings();
      const prev = bookings.find(b => (b.clientPhone || '').replace(/\D/g, '') === cleanPhone);
      if (prev) {
        return {
          id: 'acc_' + cleanPhone,
          name: prev.clientName,
          phone: cleanPhone,
          email: prev.clientEmail,
          instagram: prev.clientInstagram,
          stampsCount: loyalty ? loyalty.stampsCount : 0,
          createdAt: prev.createdAt,
          lastVisit: prev.date,
        };
      }
    }

    return null;
  }

  static registerOrUpdateClientAccount(data: {
    name: string;
    phone: string;
    email?: string;
    pin?: string;
    instagram?: string;
  }): ClientAccount {
    const accounts = this.getClientAccounts();
    const cleanPhone = data.phone.replace(/\D/g, '');
    const existing = this.findClientAccount(cleanPhone) || (data.email ? this.findClientAccount(data.email) : null);
    const loyalty = this.getClientLoyalty(cleanPhone);

    const account: ClientAccount = {
      id: existing?.id || 'acc_' + cleanPhone,
      name: data.name.trim() || existing?.name || 'Clienta',
      phone: cleanPhone,
      email: data.email?.trim() || existing?.email,
      pin: data.pin?.trim() || existing?.pin,
      instagram: data.instagram?.trim() || existing?.instagram,
      stampsCount: loyalty?.stampsCount || existing?.stampsCount || 0,
      createdAt: existing?.createdAt || new Date().toISOString(),
      lastVisit: new Date().toISOString().split('T')[0],
    };

    accounts[cleanPhone] = account;
    this.saveClientAccounts(accounts);
    this.setActiveClient(account);
    return account;
  }

  static getActiveClient(): ClientAccount | null {
    return this.getStored<ClientAccount | null>(STORAGE_KEYS.ACTIVE_CLIENT, null);
  }

  static setActiveClient(account: ClientAccount | null): void {
    this.setStored(STORAGE_KEYS.ACTIVE_CLIENT, account);
  }

  static logoutClient(): void {
    this.setActiveClient(null);
    try {
      localStorage.removeItem('andrea_client_session_token');
    } catch {}
  }

  static getClientSessionToken(): string | null {
    try {
      return localStorage.getItem('andrea_client_session_token');
    } catch {
      return null;
    }
  }

  static setClientSessionToken(token: string | null): void {
    try {
      if (token) {
        localStorage.setItem('andrea_client_session_token', token);
      } else {
        localStorage.removeItem('andrea_client_session_token');
      }
    } catch {}
  }

  // ─── CONSULTA HERMÉTICA DE ESTADO (ANTI-ENUMERACIÓN) ──────────────────────
  static async checkClientProfileRemote(phone: string): Promise<{
    found: boolean;
    isRegistered: boolean;
    clientName?: string;
    stampsCount: number;
    hasPin?: boolean;
    rewardEligible?: boolean;
    lastVisit?: string;
  }> {
    const cleanPhone = phone.replace(/\D/g, '');
    if (!cleanPhone || cleanPhone.length < 7) {
      return { found: false, isRegistered: false, stampsCount: 0 };
    }

    // 1. Revisar si la clienta ya tiene sesión activa local
    const localAcc = this.findClientAccount(cleanPhone);
    if (localAcc) {
      return {
        found: true,
        isRegistered: true,
        clientName: localAcc.name,
        stampsCount: localAcc.stampsCount,
        hasPin: Boolean(localAcc.pin),
        rewardEligible: localAcc.stampsCount >= 6,
        lastVisit: localAcc.createdAt,
      };
    }

    // 2. Consulta a /api/client-auth con protección anti-enumeración
    try {
      const res = await fetch('/api/auth?scope=clienta', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'check', phone: cleanPhone })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.registered) {
          return {
            found: true,
            isRegistered: true,
            stampsCount: Number(data.stampsCount) || 0,
            hasPin: Boolean(data.hasPin),
            rewardEligible: Boolean(data.rewardEligible),
            lastVisit: data.lastVisit,
          };
        }
      }
    } catch (e) {
      console.warn('Usando respaldo de comprobación de cliente:', e);
    }

    return { found: false, isRegistered: false, stampsCount: 0 };
  }

  // ─── LOGIN HERMÉTICO CON REGLA DE LOS 3 FALLOS ESTRICTOS ─────────────────
  static async loginClientRemote(phone: string, pin: string, rememberMe = true): Promise<{
    success: boolean;
    error?: string;
    requiresReset?: boolean;
    emailMasked?: string;
    remainingAttempts?: number;
    account?: ClientAccount;
  }> {
    const cleanPhone = phone.replace(/\D/g, '');
    try {
      const res = await fetch('/api/auth?scope=clienta', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'login', phone: cleanPhone, pin })
      });
      const data = await res.json();

      if (!res.ok) {
        return {
          success: false,
          error: data.error || 'Error al iniciar sesión.',
          requiresReset: Boolean(data.requiresReset),
          emailMasked: data.emailMasked,
          remainingAttempts: data.remainingAttempts,
        };
      }

      if (data.sessionToken) {
        if (rememberMe) {
          this.setClientSessionToken(data.sessionToken);
        } else {
          try {
            sessionStorage.setItem('andrea_client_session_token', data.sessionToken);
          } catch {}
        }
      }

      const account = this.registerOrUpdateClientAccount({
        name: data.profile?.name || 'Clienta',
        phone: cleanPhone,
        email: data.profile?.email,
        instagram: data.profile?.instagram,
      });

      account.stampsCount = data.profile?.stampsCount || 0;
      this.setActiveClient(account);

      return { success: true, account };
    } catch (e: any) {
      const localAcc = this.findClientAccount(cleanPhone);
      if (localAcc) {
        this.setActiveClient(localAcc);
        return { success: true, account: localAcc };
      }
      return { success: false, error: 'Error de conexión con el servidor seguro.' };
    }
  }

  // ─── RECUPERACIÓN DE CONTRASEÑA POR CORREO ELECTRÓNICO (3 FALLOS) ──────────
  static async requestPasswordResetRemote(phone: string): Promise<{
    success: boolean;
    error?: string;
    emailMasked?: string;
    verificationCode?: string;
    message?: string;
  }> {
    const cleanPhone = phone.replace(/\D/g, '');
    try {
      const res = await fetch('/api/auth?scope=clienta', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'request_reset', phone: cleanPhone })
      });
      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error || 'Error al solicitar código de recuperación.' };
      }
      return {
        success: true,
        emailMasked: data.emailMasked,
        verificationCode: data.verificationCode,
        message: data.message
      };
    } catch (e) {
      return { success: false, error: 'Error de conexión con el servidor de recuperación.' };
    }
  }

  static async resetPasswordWithCodeRemote(phone: string, code: string, newPin: string): Promise<{
    success: boolean;
    error?: string;
    account?: ClientAccount;
  }> {
    const cleanPhone = phone.replace(/\D/g, '');
    try {
      const res = await fetch('/api/auth?scope=clienta', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reset_password', phone: cleanPhone, code, newPin })
      });
      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error || 'Código incorrecto o expirado.' };
      }

      if (data.sessionToken) {
        this.setClientSessionToken(data.sessionToken);
      }

      const account = this.findClientAccount(cleanPhone) || this.registerOrUpdateClientAccount({
        name: data.profile?.name || 'Clienta',
        phone: cleanPhone,
        email: data.profile?.email,
      });

      this.setActiveClient(account);
      return { success: true, account };
    } catch (e) {
      return { success: false, error: 'Error de conexión al actualizar contraseña.' };
    }
  }

  // ─── INICIO DE SESIÓN OAUTH CON GOOGLE Y APPLE ─────────────────────────────
  static async oauthLoginRemote(provider: 'google' | 'apple', email: string, name?: string, providerId?: string): Promise<{
    success: boolean;
    error?: string;
    isExisting?: boolean;
    needsCompletion?: boolean;
    email?: string;
    name?: string;
    provider?: string;
    providerId?: string;
    account?: ClientAccount;
  }> {
    try {
      const res = await fetch('/api/auth?scope=clienta', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'oauth_login', provider, email, name, providerId })
      });
      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error || 'Error al autenticar con proveedor.' };
      }

      if (data.isExisting && data.sessionToken) {
        this.setClientSessionToken(data.sessionToken);
        const account = this.registerOrUpdateClientAccount({
          name: data.profile?.name || name || 'Clienta',
          phone: data.profile?.phone,
          email: data.profile?.email || email,
        });
        account.stampsCount = data.profile?.stampsCount || 0;
        this.setActiveClient(account);
        return { success: true, isExisting: true, account };
      }

      return {
        success: true,
        needsCompletion: Boolean(data.needsCompletion),
        email: data.email,
        name: data.name,
        provider: data.provider,
        providerId: data.providerId
      };
    } catch (e) {
      return { success: false, error: 'Error de conexión con el servicio OAuth.' };
    }
  }

  static async oauthCompleteRemote(data: {
    provider: 'google' | 'apple';
    email: string;
    name: string;
    phone: string;
    pin: string;
    providerId?: string;
  }): Promise<{
    success: boolean;
    error?: string;
    account?: ClientAccount;
  }> {
    const cleanPhone = data.phone.replace(/\D/g, '');
    try {
      const res = await fetch('/api/auth?scope=clienta', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'oauth_complete',
          provider: data.provider,
          email: data.email,
          name: data.name,
          phone: cleanPhone,
          pin: data.pin,
          providerId: data.providerId
        })
      });
      const resData = await res.json();
      if (!res.ok) {
        return { success: false, error: resData.error || 'Error al completar registro.' };
      }

      if (resData.sessionToken) {
        this.setClientSessionToken(resData.sessionToken);
      }

      const account = this.registerOrUpdateClientAccount({
        name: data.name,
        phone: cleanPhone,
        email: data.email,
      });
      this.setActiveClient(account);
      return { success: true, account };
    } catch (e) {
      return { success: false, error: 'Error de conexión al completar registro.' };
    }
  }

  // ─── REGISTRO SEGURO DE FICHA Y PIN CRIPTOGRÁFICO EN NEON ────────────────
  static async registerClientRemote(data: {
    phone: string;
    pin: string;
    name: string;
    email?: string;
    instagram?: string;
  }): Promise<{
    success: boolean;
    error?: string;
    account?: ClientAccount;
  }> {
    const cleanPhone = data.phone.replace(/\D/g, '');
    try {
      const res = await fetch('/api/auth?scope=clienta', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'register',
          phone: cleanPhone,
          pin: data.pin,
          name: data.name,
          email: data.email,
          instagram: data.instagram,
        })
      });

      const resData = await res.json();
      if (!res.ok) {
        return { success: false, error: resData.error || 'Error al registrar ficha.' };
      }

      if (resData.sessionToken) {
        this.setClientSessionToken(resData.sessionToken);
      }

      const account = this.registerOrUpdateClientAccount({
        name: data.name,
        phone: cleanPhone,
        email: data.email,
        instagram: data.instagram,
      });
      account.stampsCount = resData.profile?.stampsCount || 0;
      this.setActiveClient(account);

      return { success: true, account };
    } catch (e: any) {
      const account = this.registerOrUpdateClientAccount(data);
      return { success: true, account };
    }
  }

  // ─── GENERADOR DE MENSAJE WHATSAPP ─────────────────────────────────────────
  static generateWhatsAppBookingUrl(booking: {
    serviceName: string;
    totalPriceUSD: number;
    date: string;
    timeSlot: string;
    clientName: string;
    clientPhone: string;
    clientEmail?: string;
    clientInstagram?: string;
    addons?: { name: string; priceUSD: number }[];
    paymentMethod: PaymentMethodType;
    notes?: string;
    isFirstVisit?: boolean;
    isExistingClient?: boolean;
    discountUSD?: number;
    referralCode?: string;
  }): string {
    const paymentLabel = {
      pago_movil: 'Pago Móvil',
      efectivo: 'Efectivo en Dólares ($)',
      binance: 'Binance Pay (USDT)'
    }[booking.paymentMethod];

    const addonsText = booking.addons && booking.addons.length > 0
      ? `\n✨ *Adicionales:* ${booking.addons.map(a => `${a.name} (+$${a.priceUSD.toFixed(2)})`).join(', ')}`
      : '';

    const emailText = booking.clientEmail ? `\n📧 *Correo:* ${booking.clientEmail}` : '';
    const igText = booking.clientInstagram ? `\n📸 *Instagram:* @${booking.clientInstagram.replace('@', '')}` : '';
    const notesText = booking.notes ? `\n📝 *Nota:* ${booking.notes}` : '';
    
    // Si la clienta es habitual, el mensaje NO menciona ningún descuento de primera cita
    const firstVisitText = (!booking.isExistingClient && booking.isFirstVisit)
      ? `\n🎉 *Beneficio 1ª Cita:* -$2.00 USD (Sujeto a validación presencial en el estudio por Andrea para clientas nuevas)`
      : '';
    
    const loyaltyText = booking.isExistingClient
      ? `\n⭐ *Clienta VIP Registrada:* Sumando a mi Tarjeta de Fidelización (5 visitas = Depilación de Cejas GRATIS)`
      : `\n⭐ *Programa de Fidelización:* Sumando a mi 5ª visita para Depilación de Cejas de cortesía`;

    const totalText = (!booking.isExistingClient && booking.isFirstVisit)
      ? `💰 *Total Estimado con Descuento:* $${booking.totalPriceUSD.toFixed(2)} USD\n📌 _Nota: La bonificación de $2 USD la aplica Andrea directamente en el salón tras corroborar que sea tu primera visita._`
      : `💰 *Total del Servicio:* $${booking.totalPriceUSD.toFixed(2)} USD`;

    const message = `💅 *SOLICITUD DE CITA — ANDREA LABRADOR NAILS STUDIO*

👤 *Clienta:* ${booking.clientName}
📱 *Teléfono:* ${booking.clientPhone}${emailText}${igText}
🗓 *Fecha Solicitada:* ${booking.date}
⏰ *Hora:* ${booking.timeSlot}

✨ *Servicios & Detalles:*
• ${booking.serviceName}${addonsText}

💳 *Forma de Pago:* ${paymentLabel}${firstVisitText}${loyaltyText}${notesText}

${totalText}

Hola Andrea, ¿tienes este cupo disponible para confirmarme? ¡Muchas gracias! 💕`;

    const encoded = encodeURIComponent(message);
    return `https://wa.me/584241360937?text=${encoded}`;
  }

  // ─── RESPALDO JSON EXPORT/IMPORT ───────────────────────────────────────────
  static exportDataJSON(): string {
    const payload: AppStoreData = {
      services: this.getServices(),
      promos: this.getPromos(),
      bookings: this.getBookings(),
      blockedSlots: this.getBlockedSlots(),
      loyaltyCards: this.getLoyaltyCards(),
      exchangeRateVES: this.getExchangeRate()
    };
    return JSON.stringify(payload, null, 2);
  }

  static importDataJSON(jsonString: string): boolean {
    try {
      const parsed: Partial<AppStoreData> = JSON.parse(jsonString);
      if (parsed.services) this.saveServices(parsed.services);
      if (parsed.promos) this.savePromos(parsed.promos);
      if (parsed.bookings) this.saveBookings(parsed.bookings);
      if (parsed.blockedSlots) this.saveBlockedSlots(parsed.blockedSlots);
      if (parsed.loyaltyCards) this.saveLoyaltyCards(parsed.loyaltyCards);
      if (parsed.exchangeRateVES) this.saveExchangeRate(parsed.exchangeRateVES);
      return true;
    } catch (e) {
      console.error('Error importing data:', e);
      return false;
    }
  }

  // ─── SUPER ADMIN AUTENTICACIÓN & 2FA ───────────────────────────────────────
  static getAdminSession(): { token: string; email: string } | null {
    try {
      const sessionStr = sessionStorage.getItem(STORAGE_KEYS.ADMIN_SESSION);
      if (!sessionStr) return null;
      const parsed = JSON.parse(sessionStr);
      if (parsed?.token && parsed?.email) return parsed;
      return null;
    } catch {
      return null;
    }
  }

  static setAdminSession(token: string, email: string): void {
    try {
      sessionStorage.setItem(STORAGE_KEYS.ADMIN_SESSION, JSON.stringify({ token, email, timestamp: Date.now() }));
    } catch (e) {
      console.error('Error guardando sesión de Super Admin:', e);
    }
  }

  static clearAdminSession(): void {
    try {
      sessionStorage.removeItem(STORAGE_KEYS.ADMIN_SESSION);
    } catch (e) {
      console.error('Error cerrando sesión de Super Admin:', e);
    }
  }

  static isAdminAuthenticated(): boolean {
    const session = this.getAdminSession();
    return Boolean(session && session.token);
  }

  static async loginAdminRemote(email: string, password: string): Promise<{
    success: boolean;
    requires2FA?: boolean;
    token?: string;
    superAdminEmail?: string;
    maskedEmail?: string;
    demo2FACode?: string;
    error?: string;
    message?: string;
  }> {
    try {
      const res = await fetch('/api/auth?scope=admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'login', email, password })
      });
      const data = await res.json();
      if (res.ok && data.success && data.token) {
        this.setAdminSession(data.token, data.superAdminEmail || email);
      }
      return data;
    } catch (err: any) {
      return { success: false, error: 'Error de conexión con el servidor de autenticación.' };
    }
  }

  static async verifyAdmin2FARemote(email: string, code: string): Promise<{
    success: boolean;
    token?: string;
    superAdminEmail?: string;
    error?: string;
  }> {
    try {
      const res = await fetch('/api/auth?scope=admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'verify_2fa', email, code })
      });
      const data = await res.json();
      if (res.ok && data.success && data.token) {
        this.setAdminSession(data.token, data.superAdminEmail || email);
      }
      return data;
    } catch (err: any) {
      return { success: false, error: 'Error al verificar el código 2FA.' };
    }
  }

  static async requestAdminResetRemote(email: string): Promise<{
    success: boolean;
    message?: string;
    maskedEmail?: string;
    demoResetCode?: string;
    error?: string;
  }> {
    try {
      const res = await fetch('/api/auth?scope=admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'request_reset', email })
      });
      return await res.json();
    } catch (err: any) {
      return { success: false, error: 'Error al solicitar código de restablecimiento.' };
    }
  }

  static async resetAdminPasswordRemote(email: string, code: string, newPassword: string): Promise<{
    success: boolean;
    message?: string;
    error?: string;
  }> {
    try {
      const res = await fetch('/api/auth?scope=admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reset_password', email, code, newPassword })
      });
      return await res.json();
    } catch (err: any) {
      return { success: false, error: 'Error al actualizar contraseña.' };
    }
  }
}
