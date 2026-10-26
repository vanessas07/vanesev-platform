import React, { useState, useEffect } from 'react';
import { AppStore } from '../services/store';
import { ClientAccount, AppointmentBooking } from '../types';
import { GoogleIcon } from './Icons';
import { 
  X, 
  User, 
  Phone, 
  Mail, 
  Lock, 
  Sparkles, 
  Calendar, 
  CheckCircle2, 
  Gift, 
  LogOut, 
  Clock, 
  ArrowRight,
  ShieldCheck,
  Eye,
  EyeOff,
  AlertTriangle,
  KeyRound,
  Check
} from 'lucide-react';

interface ClientAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  onBookNewAppointment: () => void;
}

type AuthViewMode = 'login' | 'register' | 'reset_request' | 'reset_verify' | 'oauth_completion';

export const ClientAccountModal: React.FC<ClientAccountModalProps> = ({
  isOpen,
  onClose,
  onBookNewAppointment,
}) => {
  const [activeAccount, setActiveAccount] = useState<ClientAccount | null>(null);
  const [clientBookings, setClientBookings] = useState<AppointmentBooking[]>([]);

  // View state
  const [viewMode, setViewMode] = useState<AuthViewMode>('login');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'error' | 'success' | 'warning'; text: string } | null>(null);

  // Form fields
  const [loginPhone, setLoginPhone] = useState('');
  const [loginPin, setLoginPin] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  // Manual Register fields
  const [regName, setRegName] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPin, setRegPin] = useState('');

  // Password Reset fields
  const [resetPhone, setResetPhone] = useState('');
  const [resetEmailMasked, setResetEmailMasked] = useState('');
  const [resetCode, setResetCode] = useState('');
  const [newPin, setNewPin] = useState('');
  const [showNewPin, setShowNewPin] = useState(false);
  const [demoVerificationCode, setDemoVerificationCode] = useState<string | null>(null);

  // OAuth Completion fields
  const [oauthProvider, setOauthProvider] = useState<'google' | 'apple'>('google');
  const [oauthEmail, setOauthEmail] = useState('');
  const [oauthName, setOauthName] = useState('');
  const [oauthPhone, setOauthPhone] = useState('');
  const [oauthPin, setOauthPin] = useState('');

  useEffect(() => {
    if (isOpen) {
      const current = AppStore.getActiveClient();
      setActiveAccount(current);
      if (current) {
        loadClientBookings(current.phone);
      } else {
        setViewMode('login');
        setStatusMessage(null);
      }
    }
  }, [isOpen]);

  const [isLoadingBookings, setIsLoadingBookings] = useState(false);

  const loadClientBookings = async (phone: string) => {
    const cleanPhone = phone.replace(/\D/g, '');
    const allLocal = AppStore.getBookings();
    const localMine = allLocal.filter(b => (b.clientPhone || '').replace(/\D/g, '') === cleanPhone);
    setClientBookings(localMine);

    if (!cleanPhone) return;
    setIsLoadingBookings(true);
    try {
      const res = await fetch(`/api/bookings?clientPhone=${encodeURIComponent(cleanPhone)}`);
      if (res.ok) {
        const json = await res.json();
        const rawList = Array.isArray(json.bookings) ? json.bookings : Array.isArray(json.data) ? json.data : null;
        if (rawList) {
          const remoteMapped: AppointmentBooking[] = rawList.map((r: any) => ({
            id: r.id,
            clientName: r.clientName || r.client_name,
            clientPhone: r.clientPhone || r.client_phone,
            serviceId: r.serviceId || r.service_id,
            serviceName: r.serviceName || r.service_name,
            date: r.date || r.appointment_date,
            timeSlot: r.timeSlot || r.time_slot,
            status: r.status || 'pendiente',
            notes: r.notes || '',
            paymentMethod: r.paymentMethod || r.payment_method || 'pago_movil',
            totalPriceUSD: Number(r.totalPriceUSD ?? r.price_usd ?? 0),
            createdAt: r.createdAt || r.created_at || new Date().toISOString(),
          }));
          const mergedMap = new Map<string, AppointmentBooking>();
          remoteMapped.forEach(b => mergedMap.set(b.id, b));
          localMine.forEach(b => {
            if (!mergedMap.has(b.id)) mergedMap.set(b.id, b);
          });
          setClientBookings(Array.from(mergedMap.values()));
        }
      }
    } catch {
      // Fallback silencioso a localMine
    } finally {
      setIsLoadingBookings(false);
    }
  };

  if (!isOpen) return null;

  // ─── LOGIN HANDLER (3 FALLOS OBLIGAN A RESETEAR POR CORREO) ───────────────
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMessage(null);

    const cleanPhone = loginPhone.replace(/\D/g, '');
    if (!cleanPhone || cleanPhone.length < 7) {
      setStatusMessage({ type: 'error', text: 'Ingresa un número de teléfono válido (al menos 7 dígitos).' });
      return;
    }
    if (!loginPin) {
      setStatusMessage({ type: 'error', text: 'Por favor ingresa tu contraseña o PIN.' });
      return;
    }

    setIsSubmitting(true);
    const res = await AppStore.loginClientRemote(cleanPhone, loginPin, rememberMe);
    setIsSubmitting(false);

    if (res.success && res.account) {
      setActiveAccount(res.account);
      loadClientBookings(res.account.phone);
      setStatusMessage(null);
    } else {
      if (res.requiresReset) {
        // Activación estricta de reseteo obligatorio
        setResetPhone(cleanPhone);
        setResetEmailMasked(res.emailMasked || 'tu correo registrado');
        setViewMode('reset_request');
        setStatusMessage({
          type: 'warning',
          text: res.error || 'Has superado los 3 intentos. Debes crear una contraseña nueva mediante tu correo.'
        });
      } else {
        setStatusMessage({
          type: 'error',
          text: res.error || 'Credenciales incorrectas.'
        });
      }
    }
  };

  // ─── REGISTRO MANUAL HANDLER ──────────────────────────────────────────────
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMessage(null);

    const cleanPhone = regPhone.replace(/\D/g, '');
    if (!regName.trim()) {
      setStatusMessage({ type: 'error', text: 'Ingresa tu nombre y apellido.' });
      return;
    }
    if (!cleanPhone || cleanPhone.length < 7) {
      setStatusMessage({ type: 'error', text: 'Ingresa un número de WhatsApp válido (al menos 7 dígitos).' });
      return;
    }
    if (!regEmail.trim() || !regEmail.includes('@')) {
      setStatusMessage({ type: 'error', text: 'Ingresa un correo electrónico válido para proteger tu ficha.' });
      return;
    }
    if (!regPin || regPin.length < 4) {
      setStatusMessage({ type: 'error', text: 'La contraseña o PIN debe contener al menos 4 caracteres.' });
      return;
    }

    setIsSubmitting(true);
    const res = await AppStore.registerClientRemote({
      phone: cleanPhone,
      pin: regPin,
      name: regName,
      email: regEmail,
    });
    setIsSubmitting(false);

    if (res.success && res.account) {
      setActiveAccount(res.account);
      loadClientBookings(res.account.phone);
      setStatusMessage(null);
    } else {
      setStatusMessage({ type: 'error', text: res.error || 'Error al registrar tu ficha.' });
    }
  };

  // ─── SOLICITAR CÓDIGO DE RECUPERACIÓN (RESET REQUEST) ──────────────────────
  const handleRequestReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMessage(null);

    const cleanPhone = resetPhone.replace(/\D/g, '');
    if (!cleanPhone || cleanPhone.length < 7) {
      setStatusMessage({ type: 'error', text: 'Ingresa tu número de teléfono registrado.' });
      return;
    }

    setIsSubmitting(true);
    const res = await AppStore.requestPasswordResetRemote(cleanPhone);
    setIsSubmitting(false);

    if (res.success) {
      setResetEmailMasked(res.emailMasked || 'tu correo registrado');
      if (res.verificationCode) {
        setDemoVerificationCode(res.verificationCode);
      }
      setViewMode('reset_verify');
      setStatusMessage({
        type: 'success',
        text: `Código de seguridad enviado a ${res.emailMasked || 'tu correo'}. Validez: 15 minutos.`
      });
    } else {
      setStatusMessage({ type: 'error', text: res.error || 'Error al solicitar el código de recuperación.' });
    }
  };

  // ─── ASIGNAR NUEVA CONTRASEÑA CON CÓDIGO ──────────────────────────────────
  const handleVerifyReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMessage(null);

    const cleanPhone = resetPhone.replace(/\D/g, '');
    if (!resetCode.trim()) {
      setStatusMessage({ type: 'error', text: 'Ingresa el código de 6 dígitos recibido en tu correo.' });
      return;
    }
    if (!newPin || newPin.length < 4) {
      setStatusMessage({ type: 'error', text: 'La nueva contraseña debe tener al menos 4 caracteres.' });
      return;
    }

    setIsSubmitting(true);
    const res = await AppStore.resetPasswordWithCodeRemote(cleanPhone, resetCode.trim(), newPin.trim());
    setIsSubmitting(false);

    if (res.success && res.account) {
      setActiveAccount(res.account);
      loadClientBookings(res.account.phone);
      setStatusMessage(null);
      setDemoVerificationCode(null);
    } else {
      setStatusMessage({ type: 'error', text: res.error || 'Código incorrecto o expirado.' });
    }
  };

  // ─── OAUTH (DESHABILITADO HASTA BLOQUE 6) ─────────────────────────────────
  const handleOAuthTrigger = async (_provider: 'google' | 'apple') => {
    setStatusMessage({
      type: 'error',
      text: 'El acceso con Google/Apple se encuentra temporalmente deshabilitado por mantenimiento de seguridad.'
    });
  };

  // ─── COMPLETAR FICHA POST-OAUTH ───────────────────────────────────────────
  const handleOAuthComplete = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMessage(null);

    const cleanPhone = oauthPhone.replace(/\D/g, '');
    if (!cleanPhone || cleanPhone.length < 7) {
      setStatusMessage({ type: 'error', text: 'Ingresa tu número de WhatsApp para vincular tus citas.' });
      return;
    }
    if (!oauthPin || oauthPin.length < 4) {
      setStatusMessage({ type: 'error', text: 'Crea una contraseña o PIN de al menos 4 caracteres para tu ficha.' });
      return;
    }

    setIsSubmitting(true);
    const res = await AppStore.oauthCompleteRemote({
      provider: oauthProvider,
      email: oauthEmail,
      name: oauthName || 'Clienta VIP',
      phone: cleanPhone,
      pin: oauthPin.trim(),
    });
    setIsSubmitting(false);

    if (res.success && res.account) {
      setActiveAccount(res.account);
      loadClientBookings(res.account.phone);
      setStatusMessage(null);
    } else {
      setStatusMessage({ type: 'error', text: res.error || 'Error al vincular tu ficha.' });
    }
  };

  const handleLogout = () => {
    AppStore.logoutClient();
    setActiveAccount(null);
    setClientBookings([]);
    setViewMode('login');
  };

  const stampsTotal = 5;
  const currentStamps = activeAccount ? activeAccount.stampsCount : 0;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-warm-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
      <div className="relative w-full max-w-xl bg-white rounded-3xl shadow-luxury border border-sage-200 overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Modal Header */}
        <div className="px-6 py-4 bg-warm-100 border-b border-sage-200/80 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-sage-800 text-white flex items-center justify-center">
              <User className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-serif text-base font-bold text-sage-900 leading-tight">
                {activeAccount ? 'Mi Ficha de Clienta VIP' : 'Acceso & Registro de Clienta'}
              </h3>
              <span className="text-[10px] text-sage-600 font-semibold block uppercase tracking-wider">
                Andrea Labrador Nails Studio &bull; Cloud Postgres
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-warm-200 text-warm-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-6">
          
          {/* Status Message Alert */}
          {statusMessage && (
            <div className={`p-3.5 rounded-2xl border text-xs font-semibold flex items-start gap-2.5 ${
              statusMessage.type === 'error' ? 'bg-rose-50 border-rose-200 text-rose-800' :
              statusMessage.type === 'warning' ? 'bg-amber-50 border-amber-300 text-amber-950' :
              'bg-emerald-50 border-emerald-200 text-emerald-900'
            }`}>
              {statusMessage.type === 'error' && <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />}
              {statusMessage.type === 'warning' && <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />}
              {statusMessage.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />}
              <span>{statusMessage.text}</span>
            </div>
          )}

          {activeAccount ? (
            /* ══════ VISTA DE CLIENTA LOGUEADA ══════ */
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-warm-50 border border-sage-200">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h4 className="font-serif text-xl font-bold text-warm-950">{activeAccount.name}</h4>
                    <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 text-[10px] font-bold border border-amber-300">
                      VIP Activa
                    </span>
                  </div>
                  <div className="text-xs text-warm-700 space-y-0.5 font-medium">
                    <p className="flex items-center gap-1.5"><Phone className="w-3.5 h-3.5 text-sage-600" />{activeAccount.phone}</p>
                    {activeAccount.email && (
                      <p className="flex items-center gap-1.5">
                        <Mail className="w-3.5 h-3.5 text-sage-600" />
                        <span>{activeAccount.email}</span>
                        <span title="Verificado" className="inline-flex items-center">
                          <Check className="w-3 h-3 text-emerald-600" />
                        </span>
                      </p>
                    )}
                  </div>
                </div>
                <button
                  onClick={handleLogout}
                  className="inline-flex items-center gap-1.5 text-xs text-rose-700 hover:text-rose-900 font-bold px-3.5 py-2 rounded-xl border border-rose-200 hover:bg-rose-50 transition-colors"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Cerrar Sesión</span>
                </button>
              </div>

              {/* Digital Loyalty Card */}
              <div className="p-5 rounded-3xl bg-gradient-to-br from-sage-900 to-warm-900 text-white shadow-soft space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[10px] uppercase tracking-widest text-amber-300 font-bold block">Tarjeta Digital VIP</span>
                    <h4 className="font-serif text-lg font-bold">Programa de Fidelización</h4>
                  </div>
                  <span className="text-xs font-bold text-amber-300 bg-white/10 px-3 py-1 rounded-full border border-amber-400/30">
                    {currentStamps} de {stampsTotal} Sellos
                  </span>
                </div>

                <div className="grid grid-cols-5 gap-2">
                  {Array.from({ length: stampsTotal }).map((_, i) => {
                    const isStamped = i < currentStamps;
                    return (
                      <div
                        key={i}
                        className={`aspect-square rounded-xl border flex flex-col items-center justify-center p-1 transition-all ${
                          isStamped
                            ? 'bg-amber-400/20 border-amber-300 text-amber-200 shadow-sm'
                            : 'bg-white/5 border-white/20 text-white/40 border-dashed'
                        }`}
                      >
                        {isStamped ? (
                          <CheckCircle2 className="w-5 h-5 text-amber-300" />
                        ) : i === 4 ? (
                          <Gift className="w-5 h-5 text-amber-300 animate-pulse" />
                        ) : (
                          <span className="text-xs font-bold">#{i + 1}</span>
                        )}
                        <span className="text-[8px] font-bold mt-0.5">
                          {i === 4 ? '¡CORTESÍA!' : `Sello ${i + 1}`}
                        </span>
                      </div>
                    );
                  })}
                </div>

                <div className="pt-2 border-t border-white/10 text-xs text-white/90 flex items-center justify-between">
                  <span>{currentStamps >= 5 ? '🎉 ¡Felicidades! Tienes tu Servicio de Cortesía desbloqueado.' : `Te faltan ${stampsTotal - currentStamps} visitas verificadas para tu cortesía.`}</span>
                </div>
              </div>

              {/* Guía rápida: ¿Cómo funciona tu Tarjeta VIP? */}
              <div className="p-4 rounded-2xl bg-warm-50 border border-sage-200/90 space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-bold text-sage-900 uppercase tracking-wider">
                  <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                  <span>¿Cómo funciona tu Ficha & Tarjeta VIP?</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px] text-warm-700">
                  <div className="p-2.5 rounded-xl bg-white border border-sage-200/60">
                    <span className="font-bold text-sage-900 block">1. Agenda en 1 Toque</span>
                    Tus datos quedan guardados para reservar sin volver a escribir tu teléfono.
                  </div>
                  <div className="p-2.5 rounded-xl bg-white border border-sage-200/60">
                    <span className="font-bold text-sage-900 block">2. Suma Sellos en Nube</span>
                    Cada cita marcada como Completada en el salón suma +1 sello automático.
                  </div>
                  <div className="p-2.5 rounded-xl bg-white border border-sage-200/60">
                    <span className="font-bold text-sage-900 block">3. 5to Sello = Cortesía</span>
                    Al acumular 5 sellos desbloqueas tu Depilación de Cejas o Cortesía VIP 100% Gratis.
                  </div>
                </div>
              </div>

              {/* Action Button: Book next appointment */}
              <button
                onClick={() => {
                  onClose();
                  onBookNewAppointment();
                }}
                className="w-full py-3.5 px-5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-2xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 shadow-soft hover:shadow-luxury transition-all"
              >
                <Calendar className="w-4 h-4" />
                <span>Agendar Cita con mis Datos Guardados</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              {/* History of Bookings */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-sage-800 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-sage-600" />
                    <span>Tus Citas Sincronizadas en Nube ({clientBookings.length})</span>
                  </h4>
                  {isLoadingBookings && (
                    <span className="text-[10px] font-bold text-emerald-700 animate-pulse">Sincronizando Neon DB...</span>
                  )}
                </div>

                {clientBookings.length === 0 ? (
                  <p className="text-xs text-warm-600 p-4 bg-warm-50 rounded-2xl border border-sage-200 text-center">
                    No tienes citas registradas aún. ¡Agenda tu cita para comenzar a sumar sellos!
                  </p>
                ) : (
                  <div className="space-y-2">
                    {clientBookings.map((b) => (
                      <div key={b.id} className="p-3 bg-white border border-sage-200 rounded-xl flex items-center justify-between text-xs">
                        <div>
                          <p className="font-bold text-warm-900">{b.serviceName}</p>
                          <p className="text-warm-600 text-[11px]">{b.date} &bull; {b.timeSlot}</p>
                        </div>
                        <div className="text-right">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            b.status === 'completada' ? 'bg-blue-100 text-blue-800' :
                            b.status === 'confirmada' ? 'bg-emerald-100 text-emerald-800' :
                            'bg-amber-100 text-amber-800'
                          }`}>
                            {b.status}
                          </span>
                          <span className="block font-bold text-warm-900 mt-0.5">${b.totalPriceUSD.toFixed(2)} USD</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : viewMode === 'login' ? (
            /* ══════ VISTA 1: LOGIN HABITUAL ══════ */
            <div className="space-y-5">
              {/* Formulario de Login */}
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-sage-800 flex items-center gap-1">
                    <Phone className="w-3.5 h-3.5 text-sage-600" />
                    <span>Número de WhatsApp *</span>
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="Ej: 0414-1234567"
                    value={loginPhone}
                    onChange={(e) => setLoginPhone(e.target.value)}
                    className="w-full p-3 bg-warm-50 border border-sage-200 rounded-xl text-xs sm:text-sm focus:ring-2 focus:ring-sage-400 focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-bold text-sage-800 flex items-center gap-1">
                      <Lock className="w-3.5 h-3.5 text-sage-600" />
                      <span>Contraseña o PIN *</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setResetPhone(loginPhone);
                        setViewMode('reset_request');
                      }}
                      className="text-[11px] text-amber-800 hover:text-amber-950 font-semibold"
                    >
                      ¿Olvidaste tu clave?
                    </button>
                  </div>
                  
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      placeholder="Mínimo 4 caracteres"
                      value={loginPin}
                      onChange={(e) => setLoginPin(e.target.value)}
                      className="w-full p-3 pr-10 bg-warm-50 border border-sage-200 rounded-xl text-xs sm:text-sm focus:ring-2 focus:ring-sage-400 focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-warm-500 hover:text-warm-800"
                      title={showPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Casilla Recordar en este dispositivo */}
                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="rememberMeCheckbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 rounded border-sage-300 text-sage-800 focus:ring-sage-500"
                  />
                  <label htmlFor="rememberMeCheckbox" className="text-xs text-warm-700 font-medium cursor-pointer">
                    Recordar mi acceso en este dispositivo
                  </label>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3.5 px-5 bg-sage-800 hover:bg-sage-900 disabled:bg-sage-400 text-white rounded-2xl text-xs sm:text-sm font-bold shadow-soft hover:shadow-luxury transition-all"
                >
                  {isSubmitting ? 'Verificando...' : 'Acceder a Mi Ficha VIP'}
                </button>

                <div className="text-center pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setStatusMessage(null);
                      setViewMode('register');
                    }}
                    className="text-xs text-sage-800 hover:text-sage-950 font-bold"
                  >
                    ¿Primera vez aquí? <span className="underline text-amber-800">Crear ficha manual</span>
                  </button>
                </div>
              </form>
            </div>
          ) : viewMode === 'register' ? (
            /* ══════ VISTA 2: REGISTRO MANUAL ══════ */
            <form onSubmit={handleRegister} className="space-y-4">
              <div className="text-center space-y-1 pb-1">
                <h4 className="font-serif text-lg font-bold text-warm-950">Crear Nueva Ficha de Clienta</h4>
                <p className="text-xs text-warm-600">
                  Registra tus datos una sola vez para acumular tus 5 sellos y disfrutar de tu depilación de cejas de cortesía.
                </p>
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-bold text-sage-800 flex items-center gap-1">
                  <User className="w-3.5 h-3.5 text-sage-600" />
                  <span>Nombre y Apellido *</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Sofía Ramírez"
                  value={regName}
                  onChange={(e) => setRegName(e.target.value)}
                  className="w-full p-3 bg-warm-50 border border-sage-200 rounded-xl text-xs sm:text-sm focus:ring-2 focus:ring-sage-400 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-sage-800 flex items-center gap-1">
                    <Phone className="w-3.5 h-3.5 text-sage-600" />
                    <span>WhatsApp *</span>
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="0414-1234567"
                    value={regPhone}
                    onChange={(e) => setRegPhone(e.target.value)}
                    className="w-full p-3 bg-warm-50 border border-sage-200 rounded-xl text-xs sm:text-sm focus:ring-2 focus:ring-sage-400 focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-bold text-sage-800 flex items-center gap-1">
                    <Mail className="w-3.5 h-3.5 text-sage-600" />
                    <span>Correo Electrónico *</span>
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="tuemail@gmail.com"
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    className="w-full p-3 bg-warm-50 border border-sage-200 rounded-xl text-xs sm:text-sm focus:ring-2 focus:ring-sage-400 focus:outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-bold text-sage-800 flex items-center gap-1">
                  <Lock className="w-3.5 h-3.5 text-sage-600" />
                  <span>Crear Contraseña o PIN *</span>
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder="Crea tu clave secreta (mínimo 4 caracteres)"
                    value={regPin}
                    onChange={(e) => setRegPin(e.target.value)}
                    className="w-full p-3 pr-10 bg-warm-50 border border-sage-200 rounded-xl text-xs sm:text-sm focus:ring-2 focus:ring-sage-400 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-warm-500 hover:text-warm-800"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="regRememberCheckbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded border-sage-300 text-sage-800 focus:ring-sage-500"
                />
                <label htmlFor="regRememberCheckbox" className="text-xs text-warm-700 font-medium cursor-pointer">
                  Recordar mi acceso en este dispositivo
                </label>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3.5 px-5 bg-sage-800 hover:bg-sage-900 disabled:bg-sage-400 text-white rounded-2xl text-xs sm:text-sm font-bold shadow-soft hover:shadow-luxury transition-all"
              >
                {isSubmitting ? 'Creando Ficha...' : 'Crear Ficha & Guardar en Base de Datos'}
              </button>

              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setStatusMessage(null);
                    setViewMode('login');
                  }}
                  className="text-xs text-sage-800 hover:text-sage-950 font-bold"
                >
                  ¿Ya estás registrada? <span className="underline text-amber-800">Iniciar Sesión</span>
                </button>
              </div>
            </form>
          ) : viewMode === 'reset_request' ? (
            /* ══════ VISTA 3: SOLICITAR CÓDIGO TRAS 3 FALLOS O PÉRDIDA ══════ */
            <form onSubmit={handleRequestReset} className="space-y-4">
              <div className="p-4 bg-amber-50 rounded-2xl border border-amber-200 text-amber-950 space-y-1 text-left">
                <div className="flex items-center gap-2 font-bold text-xs uppercase tracking-wider">
                  <KeyRound className="w-4 h-4 text-amber-700" />
                  <span>Recuperación Segura por Correo</span>
                </div>
                <p className="text-xs leading-relaxed">
                  Por seguridad estricta de la ficha, el único método para reestablecer el acceso es generando una <b>contraseña nueva</b> a través del correo electrónico registrado.
                </p>
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-bold text-sage-800 flex items-center gap-1">
                  <Phone className="w-3.5 h-3.5 text-sage-600" />
                  <span>Número de WhatsApp Registrado *</span>
                </label>
                <input
                  type="tel"
                  required
                  placeholder="0414-1234567"
                  value={resetPhone}
                  onChange={(e) => setResetPhone(e.target.value)}
                  className="w-full p-3 bg-warm-50 border border-sage-200 rounded-xl text-xs sm:text-sm focus:ring-2 focus:ring-sage-400 focus:outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3.5 px-5 bg-amber-800 hover:bg-amber-900 disabled:bg-amber-400 text-white rounded-2xl text-xs sm:text-sm font-bold shadow-soft transition-all"
              >
                {isSubmitting ? 'Enviando Código...' : 'Enviar Código de Seguridad de 6 Dígitos'}
              </button>

              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setStatusMessage(null);
                    setViewMode('login');
                  }}
                  className="text-xs text-sage-800 hover:text-sage-950 font-bold"
                >
                  &larr; Volver al inicio de sesión
                </button>
              </div>
            </form>
          ) : viewMode === 'reset_verify' ? (
            /* ══════ VISTA 4: INGRESAR CÓDIGO Y CREAR NUEVA CLAVE ══════ */
            <form onSubmit={handleVerifyReset} className="space-y-4">
              <div className="text-center space-y-1 pb-1">
                <h4 className="font-serif text-lg font-bold text-warm-950">Asignar Nueva Contraseña</h4>
                <p className="text-xs text-warm-600">
                  Ingresa el código enviado a <b>{resetEmailMasked}</b> y define tu nueva contraseña.
                </p>
                {demoVerificationCode && (
                  <div className="mt-2 p-2.5 bg-emerald-50 rounded-xl border border-emerald-200 text-emerald-900 text-xs font-mono font-bold">
                    Código de verificación generado: <span className="text-base tracking-widest">{demoVerificationCode}</span>
                  </div>
                )}
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-bold text-sage-800 flex items-center gap-1">
                  <KeyRound className="w-3.5 h-3.5 text-sage-600" />
                  <span>Código de 6 Dígitos *</span>
                </label>
                <input
                  type="text"
                  required
                  maxLength={6}
                  placeholder="Ej: 123456"
                  value={resetCode}
                  onChange={(e) => setResetCode(e.target.value)}
                  className="w-full p-3 bg-warm-50 border border-sage-200 rounded-xl text-center font-mono text-base tracking-widest font-bold focus:ring-2 focus:ring-sage-400 focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-bold text-sage-800 flex items-center gap-1">
                  <Lock className="w-3.5 h-3.5 text-sage-600" />
                  <span>Nueva Contraseña o PIN *</span>
                </label>
                <div className="relative">
                  <input
                    type={showNewPin ? 'text' : 'password'}
                    required
                    placeholder="Mínimo 4 caracteres"
                    value={newPin}
                    onChange={(e) => setNewPin(e.target.value)}
                    className="w-full p-3 pr-10 bg-warm-50 border border-sage-200 rounded-xl text-xs sm:text-sm focus:ring-2 focus:ring-sage-400 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPin(!showNewPin)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-warm-500 hover:text-warm-800"
                  >
                    {showNewPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3.5 px-5 bg-sage-800 hover:bg-sage-900 disabled:bg-sage-400 text-white rounded-2xl text-xs sm:text-sm font-bold shadow-soft hover:shadow-luxury transition-all"
              >
                {isSubmitting ? 'Actualizando...' : 'Actualizar Contraseña & Acceder'}
              </button>

              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => setViewMode('reset_request')}
                  className="text-xs text-warm-600 hover:text-warm-900 font-medium"
                >
                  ¿No recibiste el código? Solicitar otro
                </button>
              </div>
            </form>
          ) : (
            /* ══════ VISTA 5: COMPLETAR FICHA POST-OAUTH (GOOGLE) ══════ */
            <form onSubmit={handleOAuthComplete} className="space-y-4">
              <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-200 text-emerald-950 space-y-1 text-left">
                <div className="flex items-center gap-2 font-bold text-xs uppercase tracking-wider">
                  <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                  <span>Autenticación Exitosa con Google</span>
                </div>
                <p className="text-xs leading-relaxed">
                  Tu correo <b>{oauthEmail}</b> ha sido verificado. Ahora asigna tu número de WhatsApp y una contraseña para blindar tu ficha en la base de datos de Neon.
                </p>
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-bold text-sage-800 flex items-center gap-1">
                  <User className="w-3.5 h-3.5 text-sage-600" />
                  <span>Tu Nombre</span>
                </label>
                <input
                  type="text"
                  required
                  value={oauthName}
                  onChange={(e) => setOauthName(e.target.value)}
                  className="w-full p-3 bg-warm-50 border border-sage-200 rounded-xl text-xs sm:text-sm focus:ring-2 focus:ring-sage-400 focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-bold text-sage-800 flex items-center gap-1">
                  <Phone className="w-3.5 h-3.5 text-sage-600" />
                  <span>Número de WhatsApp para Citas y Sellos *</span>
                </label>
                <input
                  type="tel"
                  required
                  placeholder="0414-1234567"
                  value={oauthPhone}
                  onChange={(e) => setOauthPhone(e.target.value)}
                  className="w-full p-3 bg-warm-50 border border-sage-200 rounded-xl text-xs sm:text-sm focus:ring-2 focus:ring-sage-400 focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-bold text-sage-800 flex items-center gap-1">
                  <Lock className="w-3.5 h-3.5 text-sage-600" />
                  <span>Asignar Contraseña o PIN de Respaldo *</span>
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder="Mínimo 4 caracteres"
                    value={oauthPin}
                    onChange={(e) => setOauthPin(e.target.value)}
                    className="w-full p-3 pr-10 bg-warm-50 border border-sage-200 rounded-xl text-xs sm:text-sm focus:ring-2 focus:ring-sage-400 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-warm-500 hover:text-warm-800"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3.5 px-5 bg-sage-800 hover:bg-sage-900 disabled:bg-sage-400 text-white rounded-2xl text-xs sm:text-sm font-bold shadow-soft hover:shadow-luxury transition-all"
              >
                {isSubmitting ? 'Guardando en Postgres...' : 'Crear y Blindar mi Ficha'}
              </button>
            </form>
          )}

        </div>

      </div>
    </div>
  );
};
