import React, { useState } from 'react';
import { 
  ServiceItem, 
  PromoOffer, 
  AppointmentBooking, 
  BlockedTimeSlot, 
  LoyaltyCard 
} from '../types';
import { AVAILABLE_TIME_SLOTS } from '../data/initialData';
import { AppStore } from '../services/store';
import { 
  X, 
  LayoutDashboard, 
  Calendar, 
  Scissors, 
  Tag, 
  Heart, 
  DollarSign, 
  Download, 
  Upload, 
  Check, 
  AlertCircle, 
  Plus, 
  Trash2, 
  MessageCircle, 
  Clock, 
  Eye, 
  EyeOff, 
  ShieldCheck,
  RefreshCw
} from 'lucide-react';

interface AdminPanelProps {
  isOpen: boolean;
  onClose: () => void;
  services: ServiceItem[];
  promos: PromoOffer[];
  bookings: AppointmentBooking[];
  blockedSlots: BlockedTimeSlot[];
  loyaltyCards: Record<string, LoyaltyCard>;
  exchangeRate: number;
  onRefreshData: () => void;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({
  isOpen,
  onClose,
  services,
  promos,
  bookings,
  blockedSlots,
  loyaltyCards,
  exchangeRate,
  onRefreshData,
}) => {
  const [activeTab, setActiveTab] = useState<'bookings' | 'calendar' | 'services' | 'promos' | 'loyalty' | 'backup'>('bookings');
  
  // Calendar management state
  const [calendarDate, setCalendarDate] = useState<string>(() => {
    const today = new Date();
    today.setDate(today.getDate() + 1);
    return today.toISOString().split('T')[0];
  });

  // Service edition state
  const [editingService, setEditingService] = useState<ServiceItem | null>(null);
  
  // New promo state
  const [newPromoTitle, setNewPromoTitle] = useState('');
  const [newPromoSubtitle, setNewPromoSubtitle] = useState('');
  const [newPromoPrice, setNewPromoPrice] = useState('');
  const [newPromoRegularPrice, setNewPromoRegularPrice] = useState('');
  const [newPromoBadge, setNewPromoBadge] = useState('PROMO VIP');

  // Rate state
  const [currentRate, setCurrentRate] = useState(exchangeRate.toString());

  if (!isOpen) return null;

  // Stats calculation
  const totalBookingsCount = bookings.length;
  const pendingCount = bookings.filter(b => b.status === 'pendiente').length;
  const totalRevenueUSD = bookings
    .filter(b => b.status === 'completada' || b.status === 'confirmada')
    .reduce((acc, curr) => acc + curr.totalPriceUSD, 0);

  // Handle slot toggle
  const handleToggleSlot = (timeSlot: string) => {
    AppStore.toggleBlockSlot(calendarDate, timeSlot);
    onRefreshData();
  };

  // Handle service save
  const handleSaveEditingService = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingService) return;
    AppStore.updateService(editingService);
    setEditingService(null);
    onRefreshData();
  };

  // Handle create promo
  const handleCreatePromo = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPromoTitle || !newPromoPrice) return;

    const promo: PromoOffer = {
      id: 'promo_' + Date.now(),
      title: newPromoTitle,
      subtitle: newPromoSubtitle || 'Promoción especial por tiempo limitado',
      servicesIncluded: ['Servicios personalizados'],
      promoPriceUSD: parseFloat(newPromoPrice),
      regularPriceUSD: parseFloat(newPromoRegularPrice) || parseFloat(newPromoPrice) + 4,
      badge: newPromoBadge || 'OFERTA',
      validUntil: 'Válido este mes',
      isActive: true,
      imageUrl: 'https://images.unsplash.com/photo-1632345031435-8727f6897d53?q=80&w=600&auto=format&fit=crop'
    };

    AppStore.addPromo(promo);
    setNewPromoTitle('');
    setNewPromoSubtitle('');
    setNewPromoPrice('');
    setNewPromoRegularPrice('');
    onRefreshData();
  };

  // Handle rate update
  const handleSaveRate = () => {
    const val = parseFloat(currentRate);
    if (!isNaN(val) && val > 0) {
      AppStore.saveExchangeRate(val);
      onRefreshData();
      alert(`Tasa actualizada a ${val} Bs por USD`);
    }
  };

  // Export JSON
  const handleExportJSON = () => {
    const data = AppStore.exportDataJSON();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `andrea_labrador_backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-warm-900/70 backdrop-blur-md flex items-center justify-center p-2 sm:p-4">
      <div className="relative w-full max-w-5xl bg-white rounded-3xl shadow-2xl border border-sage-200 overflow-hidden flex flex-col max-h-[94vh]">
        
        {/* Admin Header */}
        <div className="px-6 py-4 bg-sage-900 text-white flex items-center justify-between border-b border-sage-800">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-sage-800 border border-sage-700 flex items-center justify-center text-gold-400">
              <LayoutDashboard className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold tracking-[0.2em] text-gold-400 block">
                Panel de Control Interno
              </span>
              <h2 className="font-serif text-xl font-bold">
                Andrea Labrador &bull; Gestión de Citas & Catálogo
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onRefreshData}
              className="p-2 rounded-xl bg-sage-800 hover:bg-sage-700 text-sage-200 transition-all text-xs flex items-center gap-1.5"
              title="Refrescar datos"
            >
              <RefreshCw className="w-4 h-4" />
              <span className="hidden sm:inline">Actualizar</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-sage-800 hover:bg-sage-700 text-sage-200 transition-all"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Overview Stats Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 bg-warm-50 border-b border-sage-200 text-xs sm:text-sm">
          <div className="p-3 bg-white rounded-2xl border border-sage-200/80 shadow-sm">
            <span className="text-sage-600 block text-[10px] uppercase font-bold">Total Citas</span>
            <span className="font-serif text-xl font-bold text-sage-900">{totalBookingsCount}</span>
            <span className="text-[10px] text-warm-500 block">({pendingCount} pendientes)</span>
          </div>

          <div className="p-3 bg-white rounded-2xl border border-sage-200/80 shadow-sm">
            <span className="text-sage-600 block text-[10px] uppercase font-bold">Ingresos Confirmados</span>
            <span className="font-serif text-xl font-bold text-emerald-700">${totalRevenueUSD.toFixed(2)} USD</span>
            <span className="text-[10px] text-emerald-600 block">≈ {(totalRevenueUSD * exchangeRate).toFixed(0)} Bs</span>
          </div>

          <div className="p-3 bg-white rounded-2xl border border-sage-200/80 shadow-sm">
            <span className="text-sage-600 block text-[10px] uppercase font-bold">Servicios Activos</span>
            <span className="font-serif text-xl font-bold text-sage-900">
              {services.filter(s => s.isAvailable).length} de {services.length}
            </span>
            <span className="text-[10px] text-sage-600 block">en el catálogo</span>
          </div>

          <div className="p-3 bg-white rounded-2xl border border-sage-200/80 shadow-sm">
            <span className="text-sage-600 block text-[10px] uppercase font-bold">Tasa Actual</span>
            <span className="font-serif text-xl font-bold text-sage-900">{exchangeRate.toFixed(2)} Bs</span>
            <span className="text-[10px] text-sage-600 block">por $1.00 USD</span>
          </div>
        </div>

        {/* Tab Navigation Menu */}
        <div className="flex items-center space-x-1 px-4 py-2 bg-white border-b border-sage-200 overflow-x-auto text-xs font-semibold">
          <button
            onClick={() => setActiveTab('bookings')}
            className={`px-4 py-2 rounded-xl transition-all flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'bookings'
                ? 'bg-sage-800 text-white shadow-sm'
                : 'text-warm-700 hover:bg-sage-50'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Citas Registradas ({bookings.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('calendar')}
            className={`px-4 py-2 rounded-xl transition-all flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'calendar'
                ? 'bg-sage-800 text-white shadow-sm'
                : 'text-warm-700 hover:bg-sage-50'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Calendario & Bloqueos ({blockedSlots.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('services')}
            className={`px-4 py-2 rounded-xl transition-all flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'services'
                ? 'bg-sage-800 text-white shadow-sm'
                : 'text-warm-700 hover:bg-sage-50'
            }`}
          >
            <Scissors className="w-3.5 h-3.5" />
            <span>Catálogo de Servicios</span>
          </button>

          <button
            onClick={() => setActiveTab('promos')}
            className={`px-4 py-2 rounded-xl transition-all flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'promos'
                ? 'bg-sage-800 text-white shadow-sm'
                : 'text-warm-700 hover:bg-sage-50'
            }`}
          >
            <Tag className="w-3.5 h-3.5" strokeWidth={1.5} />
            <span>Ofertas & Promos</span>
          </button>

          <button
            onClick={() => setActiveTab('loyalty')}
            className={`px-4 py-2 rounded-xl transition-all flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'loyalty'
                ? 'bg-sage-800 text-white shadow-sm'
                : 'text-warm-700 hover:bg-sage-50'
            }`}
          >
            <Heart className="w-3.5 h-3.5" />
            <span>Fidelización VIP</span>
          </button>

          <button
            onClick={() => setActiveTab('backup')}
            className={`px-4 py-2 rounded-xl transition-all flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'backup'
                ? 'bg-sage-800 text-white shadow-sm'
                : 'text-warm-700 hover:bg-sage-50'
            }`}
          >
            <Download className="w-3.5 h-3.5" />
            <span>Tasa & Respaldo Backend</span>
          </button>
        </div>

        {/* Tab Content Panels */}
        <div className="p-6 overflow-y-auto flex-1">
          
          {/* TAB 1: CITAS / RESERVAS */}
          {activeTab === 'bookings' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-serif text-lg font-bold text-warm-900">
                  Historial de Citas Solicitadas
                </h3>
                <span className="text-xs text-warm-500">
                  Las citas se guardan de forma interna e inmediata al ser enviadas a WhatsApp.
                </span>
              </div>

              {bookings.length === 0 ? (
                <div className="text-center py-12 bg-warm-50 rounded-3xl border border-dashed border-sage-200 p-8 space-y-2">
                  <Calendar className="w-10 h-10 text-sage-400 mx-auto" />
                  <p className="text-sm font-semibold text-sage-800">No hay citas registradas aún.</p>
                  <p className="text-xs text-warm-600 max-w-sm mx-auto">
                    Cuando una clienta reserve un servicio desde el catálogo, aparecerá listada aquí con todos sus datos.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {bookings.map((b) => (
                    <div
                      key={b.id}
                      className="p-4 bg-white rounded-2xl border border-sage-200/80 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-warm-900">{b.clientName}</span>
                          <span className="text-xs text-sage-600">({b.clientPhone})</span>
                          {b.clientInstagram && (
                            <span className="text-[11px] text-pink-600 bg-pink-50 px-2 py-0.5 rounded-md font-medium">
                              @{b.clientInstagram.replace('@', '')}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-sage-800 font-semibold">
                          💎 {b.serviceName} &bull; 📅 {b.date} a las {b.timeSlot}
                        </p>
                        {b.selectedAddons && b.selectedAddons.length > 0 && (
                          <p className="text-[11px] text-warm-600">
                            + Adicionales: {b.selectedAddons.map(a => a.name).join(', ')}
                          </p>
                        )}
                        {b.notes && (
                          <p className="text-[11px] text-warm-700 italic">
                            &ldquo;{b.notes}&rdquo;
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end border-t sm:border-t-0 pt-2 sm:pt-0 border-sage-100">
                        <div className="text-right">
                          <span className="font-serif font-bold text-base text-sage-900 block">
                            ${b.totalPriceUSD.toFixed(2)} USD
                          </span>
                          <span className="text-[10px] text-sage-600 block uppercase">
                            {b.paymentMethod.replace('_', ' ')}
                          </span>
                        </div>

                        {/* Status selector */}
                        <select
                          value={b.status}
                          onChange={(e) => {
                            AppStore.updateBookingStatus(b.id, e.target.value as any);
                            onRefreshData();
                          }}
                          className={`text-xs font-bold px-3 py-1.5 rounded-xl border focus:outline-none ${
                            b.status === 'confirmada'
                              ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                              : b.status === 'completada'
                              ? 'bg-blue-50 border-blue-300 text-blue-800'
                              : b.status === 'cancelada'
                              ? 'bg-rose-50 border-rose-300 text-rose-800'
                              : 'bg-amber-50 border-amber-300 text-amber-800'
                          }`}
                        >
                          <option value="pendiente">Pendiente</option>
                          <option value="confirmada">Confirmada</option>
                          <option value="completada">Completada</option>
                          <option value="cancelada">Cancelada</option>
                        </select>

                        {/* Direct WhatsApp Client Button */}
                        <a
                          href={`https://wa.me/${b.clientPhone.replace(/\D/g, '')}?text=Hola%20${encodeURIComponent(b.clientName)},%20te%20escribe%20Andrea%20Labrador%20para%20confirmar%20tu%20cita%20del%20${b.date}%20a%20las%20${b.timeSlot}.`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs transition-all shadow-sm"
                          title="Escribir a la clienta por WhatsApp"
                        >
                          <MessageCircle className="w-4 h-4" />
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: CALENDARIO & BLOQUEO DE HORARIOS */}
          {activeTab === 'calendar' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div>
                  <h3 className="font-serif text-lg font-bold text-warm-900">
                    Gestor Reactivo de Horarios & Citas
                  </h3>
                  <p className="text-xs text-warm-600">
                    Toca cualquier horario para bloquearlo o liberarlo inmediatamente en la app de las clientas.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <label className="text-xs font-bold text-sage-800">Fecha a gestionar:</label>
                  <input
                    type="date"
                    value={calendarDate}
                    onChange={(e) => setCalendarDate(e.target.value)}
                    className="px-3 py-1.5 rounded-xl border border-sage-200 text-xs font-semibold text-warm-900 bg-white"
                  />
                </div>
              </div>

              {/* Slots Grid for the selected date */}
              <div className="p-6 bg-warm-50 rounded-3xl border border-sage-200/80 space-y-4">
                <div className="flex items-center justify-between text-xs font-bold text-sage-900">
                  <span>Horarios para el día: {calendarDate}</span>
                  <span className="text-[11px] text-warm-500 font-normal">
                    Verde: Disponible &bull; Rojo: Ocupado / Bloqueado
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {AVAILABLE_TIME_SLOTS.map((slot) => {
                    const isOccupied = AppStore.isSlotOccupied(calendarDate, slot);

                    return (
                      <button
                        key={slot}
                        type="button"
                        onClick={() => handleToggleSlot(slot)}
                        className={`p-4 rounded-2xl border text-xs sm:text-sm font-semibold flex items-center justify-between transition-all ${
                          isOccupied
                            ? 'bg-rose-50 border-rose-200 text-rose-800 hover:bg-rose-100 shadow-sm'
                            : 'bg-emerald-50 border-emerald-200 text-emerald-800 hover:bg-emerald-100 shadow-sm'
                        }`}
                      >
                        <span className="font-serif text-base">{slot}</span>
                        <span className={`px-2.5 py-1 rounded-lg text-[10px] uppercase font-bold ${
                          isOccupied ? 'bg-rose-600 text-white' : 'bg-emerald-600 text-white'
                        }`}>
                          {isOccupied ? 'Ocupado / Bloqueado' : 'Disponible'}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Currently Blocked list */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-sage-800">
                  Bloqueos Activos Guardados ({blockedSlots.length})
                </h4>
                {blockedSlots.length === 0 ? (
                  <p className="text-xs text-warm-500 italic">No hay bloqueos manuales activos.</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {blockedSlots.map((b, idx) => (
                      <div key={idx} className="p-2.5 bg-white rounded-xl border border-sage-200 text-xs flex justify-between items-center">
                        <span className="font-semibold text-warm-900">{b.date} &bull; {b.timeSlot}</span>
                        <button
                          onClick={() => {
                            AppStore.toggleBlockSlot(b.date, b.timeSlot);
                            onRefreshData();
                          }}
                          className="text-rose-600 hover:text-rose-800 font-bold text-xs"
                        >
                          Liberar
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: GESTIÓN DE SERVICIOS */}
          {activeTab === 'services' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-serif text-lg font-bold text-warm-900">
                    Administración de Servicios del Catálogo
                  </h3>
                  <p className="text-xs text-warm-600">
                    Modifica precios en USD, descripciones o activa/desactiva disponibilidad.
                  </p>
                </div>
              </div>

              {/* Edit Modal / Form if open */}
              {editingService && (
                <form onSubmit={handleSaveEditingService} className="p-5 bg-sage-50 rounded-2xl border border-sage-300 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase text-sage-900">
                      Editar: {editingService.name}
                    </span>
                    <button
                      type="button"
                      onClick={() => setEditingService(null)}
                      className="text-xs text-warm-600 hover:text-warm-900"
                    >
                      Cancelar
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                    <div>
                      <label className="block font-bold text-sage-800 mb-1">Precio ($ USD):</label>
                      <input
                        type="number"
                        step="0.5"
                        value={editingService.priceUSD}
                        onChange={(e) => setEditingService({ ...editingService, priceUSD: parseFloat(e.target.value) || 0 })}
                        className="w-full p-2.5 rounded-xl border border-sage-200 bg-white"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-sage-800 mb-1">Duración (minutos):</label>
                      <input
                        type="number"
                        step="5"
                        value={editingService.durationMinutes}
                        onChange={(e) => setEditingService({ ...editingService, durationMinutes: parseInt(e.target.value) || 0 })}
                        className="w-full p-2.5 rounded-xl border border-sage-200 bg-white"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-sage-800 mb-1">Categoría:</label>
                      <select
                        value={editingService.category}
                        onChange={(e) => setEditingService({ ...editingService, category: e.target.value as any })}
                        className="w-full p-2.5 rounded-xl border border-sage-200 bg-white font-semibold"
                      >
                        <option value="natural">Uña Natural</option>
                        <option value="extensions">Extensiones</option>
                        <option value="pedicure">Pedicure</option>
                      </select>
                    </div>
                  </div>

                  <div className="text-xs space-y-1">
                    <label className="block font-bold text-sage-800">Descripción Corta:</label>
                    <input
                      type="text"
                      value={editingService.shortDescription}
                      onChange={(e) => setEditingService({ ...editingService, shortDescription: e.target.value })}
                      className="w-full p-2.5 rounded-xl border border-sage-200 bg-white"
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setEditingService(null)}
                      className="px-4 py-2 rounded-xl border text-xs font-semibold"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2 rounded-xl bg-sage-800 text-white text-xs font-semibold shadow-sm"
                    >
                      Guardar Cambios
                    </button>
                  </div>
                </form>
              )}

              {/* Services List */}
              <div className="space-y-3">
                {services.map((srv) => (
                  <div
                    key={srv.id}
                    className="p-4 bg-white rounded-2xl border border-sage-200/80 shadow-sm flex items-center justify-between gap-4"
                  >
                    <div className="flex items-center gap-4">
                      <img src={srv.imageUrl} alt={srv.name} className="w-12 h-12 rounded-xl object-cover" />
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-warm-900">{srv.name}</span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                            srv.isAvailable ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                          }`}>
                            {srv.isAvailable ? 'Activo' : 'Agotado'}
                          </span>
                        </div>
                        <p className="text-xs text-warm-600">{srv.shortDescription}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <span className="font-serif font-bold text-base text-sage-900">
                          ${srv.priceUSD.toFixed(2)} USD
                        </span>
                        <span className="text-[10px] text-warm-500 block">{srv.durationMinutes} min</span>
                      </div>

                      <button
                        onClick={() => {
                          AppStore.toggleServiceAvailability(srv.id);
                          onRefreshData();
                        }}
                        className={`p-2 rounded-xl border ${
                          srv.isAvailable ? 'text-sage-700 hover:bg-sage-50' : 'text-rose-600 bg-rose-50'
                        }`}
                        title={srv.isAvailable ? 'Desactivar del catálogo' : 'Activar en el catálogo'}
                      >
                        {srv.isAvailable ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                      </button>

                      <button
                        onClick={() => setEditingService(srv)}
                        className="px-3 py-1.5 bg-sage-50 hover:bg-sage-100 text-sage-800 rounded-xl text-xs font-semibold border border-sage-200"
                      >
                        Editar
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 4: OFERTAS & PROMOCIONES */}
          {activeTab === 'promos' && (
            <div className="space-y-6">
              <div>
                <h3 className="font-serif text-lg font-bold text-warm-900">
                  Creador de Ofertas & Promociones
                </h3>
                <p className="text-xs text-warm-600">
                  Lanza promociones especiales o paquetes combinados visibles al instante para tus clientas.
                </p>
              </div>

              {/* Create Promo Form */}
              <form onSubmit={handleCreatePromo} className="p-5 bg-warm-50 rounded-2xl border border-sage-200/80 space-y-4">
                <span className="text-xs font-bold uppercase tracking-wider text-sage-800 block">
                  Crear Nueva Promoción
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="block font-bold text-sage-800 mb-1">Título del Combo:</label>
                    <input
                      type="text"
                      placeholder="Ej: Promo San Valentín / Dúo Manos & Pies"
                      value={newPromoTitle}
                      onChange={(e) => setNewPromoTitle(e.target.value)}
                      className="w-full p-2.5 rounded-xl border border-sage-200 bg-white"
                      required
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-sage-800 mb-1">Badge / Distintivo:</label>
                    <input
                      type="text"
                      placeholder="Ej: 20% OFF / EDICIÓN LIMITADA"
                      value={newPromoBadge}
                      onChange={(e) => setNewPromoBadge(e.target.value)}
                      className="w-full p-2.5 rounded-xl border border-sage-200 bg-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="block font-bold text-sage-800 mb-1">Precio Oferta ($ USD):</label>
                    <input
                      type="number"
                      step="0.5"
                      placeholder="Ej: 18.00"
                      value={newPromoPrice}
                      onChange={(e) => setNewPromoPrice(e.target.value)}
                      className="w-full p-2.5 rounded-xl border border-sage-200 bg-white"
                      required
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-sage-800 mb-1">Precio Regular Antes ($ USD):</label>
                    <input
                      type="number"
                      step="0.5"
                      placeholder="Ej: 22.00"
                      value={newPromoRegularPrice}
                      onChange={(e) => setNewPromoRegularPrice(e.target.value)}
                      className="w-full p-2.5 rounded-xl border border-sage-200 bg-white"
                    />
                  </div>
                </div>

                <div className="text-xs">
                  <label className="block font-bold text-sage-800 mb-1">Descripción Breve:</label>
                  <input
                    type="text"
                    placeholder="Ej: Incluye manicura semipermanente + exfoliación con aceites"
                    value={newPromoSubtitle}
                    onChange={(e) => setNewPromoSubtitle(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-sage-200 bg-white"
                  />
                </div>

                <button
                  type="submit"
                  className="px-6 py-2.5 bg-sage-800 hover:bg-sage-900 text-white rounded-xl text-xs font-semibold shadow-sm flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  <span>Publicar Promoción en el Catálogo</span>
                </button>
              </form>

              {/* Active Promos List */}
              <div className="space-y-3">
                {promos.map((p) => (
                  <div key={p.id} className="p-4 bg-white rounded-2xl border border-sage-200/80 shadow-sm flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-warm-900">{p.title}</span>
                        <span className="text-[10px] uppercase font-bold px-2 py-0.5 bg-gold-100 text-gold-800 rounded-md">
                          {p.badge}
                        </span>
                      </div>
                      <p className="text-xs text-warm-600">{p.subtitle}</p>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <span className="font-serif font-bold text-base text-sage-900">${p.promoPriceUSD.toFixed(2)} USD</span>
                        <span className="text-xs text-warm-400 line-through block">${p.regularPriceUSD.toFixed(2)}</span>
                      </div>

                      <button
                        onClick={() => {
                          AppStore.togglePromoActive(p.id);
                          onRefreshData();
                        }}
                        className={`text-xs font-semibold px-3 py-1.5 rounded-xl border ${
                          p.isActive ? 'bg-emerald-50 text-emerald-800 border-emerald-300' : 'bg-warm-100 text-warm-500'
                        }`}
                      >
                        {p.isActive ? 'Activa' : 'Pausada'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 5: FIDELIZACIÓN VIP */}
          {activeTab === 'loyalty' && (
            <div className="space-y-4">
              <div>
                <h3 className="font-serif text-lg font-bold text-warm-900">
                  Control de Tarjetas de Lealtad & Sellos VIP
                </h3>
                <p className="text-xs text-warm-600">
                  Registra visitas y gestiona los premios acumulados por tus clientas.
                </p>
              </div>

              {Object.keys(loyaltyCards).length === 0 ? (
                <p className="text-xs text-warm-500 italic">Aún no hay clientas con visitas registradas.</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {Object.values(loyaltyCards).map((card) => (
                    <div key={card.phone} className="p-4 bg-white rounded-2xl border border-sage-200/80 shadow-sm space-y-2">
                      <div className="flex justify-between items-center">
                        <div>
                          <span className="font-bold text-sm text-warm-900">{card.clientName}</span>
                          <p className="text-xs text-warm-600">{card.phone}</p>
                        </div>
                        <span className="text-xs font-serif font-bold px-2.5 py-1 bg-sage-100 text-sage-800 rounded-xl">
                          {card.stampsCount} / 6 Sellos
                        </span>
                      </div>

                      <div className="flex items-center gap-2 pt-2">
                        <button
                          onClick={() => {
                            AppStore.recordLoyaltyVisit(card.phone, card.clientName);
                            onRefreshData();
                          }}
                          className="flex-1 py-1.5 px-3 bg-sage-800 text-white rounded-xl text-xs font-semibold hover:bg-sage-900"
                        >
                          +1 Sello (Añadir Visita)
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 6: RESPALDO BACKEND & TASA */}
          {activeTab === 'backup' && (
            <div className="space-y-6">
              {/* Currency configuration */}
              <div className="p-5 bg-warm-50 rounded-2xl border border-sage-200/80 space-y-3">
                <h4 className="text-sm font-bold text-warm-900">
                  Tasa de Cambio Oficial (Bolívares por Dólar)
                </h4>
                <p className="text-xs text-warm-600">
                  Esta tasa se utiliza para calcular automáticamente los montos en bolívares en el catálogo y los mensajes de WhatsApp.
                </p>

                <div className="flex items-center gap-3 max-w-xs">
                  <input
                    type="number"
                    step="0.05"
                    value={currentRate}
                    onChange={(e) => setCurrentRate(e.target.value)}
                    className="p-2.5 rounded-xl border border-sage-300 text-xs font-bold text-warm-900 bg-white"
                  />
                  <button
                    onClick={handleSaveRate}
                    className="px-4 py-2.5 bg-sage-800 text-white rounded-xl text-xs font-semibold hover:bg-sage-900"
                  >
                    Guardar Tasa
                  </button>
                </div>
              </div>

              {/* Database export / import */}
              <div className="p-5 bg-sage-50 rounded-2xl border border-sage-200/80 space-y-4">
                <div className="space-y-1">
                  <h4 className="text-sm font-bold text-sage-900 flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    <span>Preparación para Base de Datos (Neon / Supabase / Blob)</span>
                  </h4>
                  <p className="text-xs text-warm-700">
                    Toda la arquitectura ha sido diseñada desacoplada. Puedes exportar en cualquier momento la base de datos completa en JSON para migrarla a la nube cuando karc0 lo autorice.
                  </p>
                </div>

                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={handleExportJSON}
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-white hover:bg-sage-100 text-sage-900 rounded-xl text-xs font-semibold border border-sage-300 shadow-sm transition-all"
                  >
                    <Download className="w-4 h-4" />
                    <span>Descargar Respaldo JSON Completo</span>
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>

      </div>
    </div>
  );
};
