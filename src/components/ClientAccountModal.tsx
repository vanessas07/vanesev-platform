import React, { useState, useEffect } from 'react';
import { 
  X, 
  Mail, 
  Calendar, 
  CheckCircle2, 
  Gift, 
  LogOut, 
  Clock, 
  ArrowRight,
  ShieldCheck,
  AlertTriangle,
  RefreshCw,
  Plus
} from 'lucide-react';
import { authClient } from '../lib/authClient';

interface ClientAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  onBookNewAppointment: () => void;
}

interface ClientBookingItem {
  id: string;
  tenantId: string;
  serviceName: string;
  date: string;
  timeSlot: string;
  status: string;
  totalPriceUSD: number;
}

interface ClientStampItem {
  tenantId: string;
  stampsCount: number;
}

export const ClientAccountModal: React.FC<ClientAccountModalProps> = ({
  isOpen,
  onClose,
  onBookNewAppointment,
}) => {
  const [authStep, setAuthStep] = useState<'enter_email' | 'enter_otp' | 'authenticated'>('enter_email');
  const [email, setEmail] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [currentUserEmail, setCurrentUserEmail] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const [bookings, setBookings] = useState<ClientBookingItem[]>([]);
  const [stamps, setStamps] = useState<ClientStampItem[]>([]);
  const [loadingBookings, setLoadingBookings] = useState(false);

  // Comprobar sesión al abrir el modal
  useEffect(() => {
    if (!isOpen) return;

    setError(null);
    setSuccessMsg(null);

    const checkSession = async () => {
      try {
        const session = await authClient.getSession();
        if (session?.data?.user?.email) {
          setCurrentUserEmail(session.data.user.email);
          setAuthStep('authenticated');
          await loadClientData();
        } else {
          setAuthStep('enter_email');
        }
      } catch {
        setAuthStep('enter_email');
      }
    };

    checkSession();
  }, [isOpen]);

  // Cargar citas y sellos con GET /api/bookings?mine=1
  const loadClientData = async () => {
    setLoadingBookings(true);
    setError(null);
    try {
      const res = await fetch('/api/bookings?mine=1');
      if (res.ok) {
        const data = await res.json();
        setBookings(data.bookings || []);
        setStamps(data.stamps || []);
      } else if (res.status === 401 || res.status === 403) {
        setAuthStep('enter_email');
      } else {
        const err = await res.json();
        setError(err.error || 'Error al consultar citas y sellos.');
      }
    } catch (err: any) {
      setError(err?.message || 'Error de conexión con el servidor.');
    } finally {
      setLoadingBookings(false);
    }
  };

  // Paso 1: Enviar código OTP de 6 dígitos al correo
  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);
    setLoading(true);

    try {
      const cleanEmail = email.trim().toLowerCase();
      const res = await authClient.emailOTP.sendVerificationOtp({
        email: cleanEmail,
        type: 'sign-in',
      });

      if (res.error) {
        setError(res.error.message || 'Error al enviar código de acceso.');
        return;
      }

      setSuccessMsg(`Hemos enviado un código de acceso de 6 dígitos a ${cleanEmail}.`);
      setAuthStep('enter_otp');
    } catch (err: any) {
      setError(err?.message || 'Error al conectar con el servidor.');
    } finally {
      setLoading(false);
    }
  };

  // Paso 2: Verificar código OTP e iniciar sesión
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const cleanEmail = email.trim().toLowerCase();
      const res = await authClient.signIn.emailOtp({
        email: cleanEmail,
        otp: otpCode.trim(),
      });

      if (res.error) {
        setError(res.error.message || 'Código incorrecto o expirado.');
        return;
      }

      setCurrentUserEmail(cleanEmail);
      setAuthStep('authenticated');
      await loadClientData();
    } catch (err: any) {
      setError(err?.message || 'Error de conexión al verificar el código.');
    } finally {
      setLoading(false);
    }
  };

  // Cerrar sesión
  const handleLogout = async () => {
    try {
      await authClient.signOut();
      setCurrentUserEmail(null);
      setBookings([]);
      setStamps([]);
      setOtpCode('');
      setAuthStep('enter_email');
    } catch (err) {
      console.error('Error cerrando sesión:', err);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="relative w-full max-w-lg bg-[#18181B] border border-white/10 rounded-3xl shadow-2xl p-6 sm:p-8 text-white max-h-[90vh] overflow-y-auto">
        
        {/* Cabecera del modal */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-400/15 text-amber-300 border border-amber-300/30 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-serif text-lg font-bold text-white tracking-tight">
                {authStep === 'authenticated' ? 'Mis Citas y Sellos' : 'Acceso de Clienta'}
              </h2>
              <p className="text-[11px] text-zinc-400">
                {authStep === 'authenticated' ? currentUserEmail : 'Sin contraseña ni PIN · Código seguro por correo'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full text-zinc-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mensajes de Estado */}
        {error && (
          <div className="my-4 p-3.5 rounded-2xl bg-rose-950/70 border border-rose-500/40 text-rose-200 text-xs flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <span className="leading-relaxed">{error}</span>
          </div>
        )}

        {successMsg && (
          <div className="my-4 p-3.5 rounded-2xl bg-emerald-950/70 border border-emerald-500/40 text-emerald-200 text-xs flex items-start gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <span className="leading-relaxed">{successMsg}</span>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════════
            PASO 1: INTRODUCIR CORREO ELECTRÓNICO
        ══════════════════════════════════════════════════════════════════════ */}
        {authStep === 'enter_email' && (
          <form onSubmit={handleSendOtp} className="mt-5 space-y-4">
            <p className="text-xs text-zinc-300 leading-relaxed">
              Introduce tu correo electrónico. Te enviaremos un código de un solo uso de 6 dígitos para acceder a tus reservas y sellos de fidelidad.
            </p>

            <div>
              <label className="text-xs font-semibold text-zinc-300 block mb-1.5">
                Correo Electrónico
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="tu@correo.com"
                  className="w-full pl-10 pr-4 py-3 rounded-2xl bg-white/5 border border-white/10 text-white text-xs sm:text-sm focus:outline-none focus:border-amber-400 transition-colors font-mono"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-2xl bg-amber-400 hover:bg-amber-300 text-zinc-950 font-bold text-xs sm:text-sm shadow-md transition-all active:scale-95 cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2 mt-2"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Enviando código...</span>
                </>
              ) : (
                <>
                  <span>Enviar Código de Acceso</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        )}

        {/* ══════════════════════════════════════════════════════════════════════
            PASO 2: INTRODUCIR CÓDIGO OTP DE 6 DÍGITOS
        ══════════════════════════════════════════════════════════════════════ */}
        {authStep === 'enter_otp' && (
          <form onSubmit={handleVerifyOtp} className="mt-5 space-y-4">
            <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 text-xs text-zinc-300 leading-relaxed">
              Introduce el código de 6 dígitos que hemos enviado a <span className="font-mono text-white font-bold">{email}</span>. Caduca en 10 minutos.
            </div>

            <div>
              <label className="text-xs font-semibold text-zinc-300 block mb-1.5 text-center">
                Código de 6 Dígitos
              </label>
              <input
                type="text"
                required
                maxLength={6}
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                placeholder="123456"
                className="w-full py-3 text-center rounded-2xl bg-white/5 border border-amber-400/40 text-amber-300 text-xl font-mono tracking-[0.3em] font-bold focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
            </div>

            <button
              type="submit"
              disabled={loading || otpCode.length < 6}
              className="w-full py-3.5 rounded-2xl bg-amber-400 hover:bg-amber-300 text-zinc-950 font-bold text-xs sm:text-sm shadow-md transition-all active:scale-95 cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Verificando...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Verificar y Entrar</span>
                </>
              )}
            </button>

            <div className="flex items-center justify-between pt-1 text-xs">
              <button
                type="button"
                onClick={() => {
                  setError(null);
                  setAuthStep('enter_email');
                }}
                className="text-zinc-400 hover:text-white transition-colors cursor-pointer"
              >
                ← Cambiar de correo
              </button>
              <button
                type="button"
                onClick={handleSendOtp}
                disabled={loading}
                className="text-amber-300 hover:text-amber-200 transition-colors cursor-pointer underline"
              >
                Reenviar código
              </button>
            </div>
          </form>
        )}

        {/* ══════════════════════════════════════════════════════════════════════
            PASO 3: PANEL AUTENTICADO DE LA CLIENTA (MIS CITAS Y SELLOS)
        ══════════════════════════════════════════════════════════════════════ */}
        {authStep === 'authenticated' && (
          <div className="mt-5 space-y-6">
            
            {/* SECCIÓN 1: MIS SELLOS DE FIDELIDAD */}
            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold text-amber-300 uppercase tracking-wider">
                <Gift className="w-4 h-4" />
                <span>Mis Sellos de Fidelidad</span>
              </div>

              {stamps.length === 0 ? (
                <p className="text-xs text-zinc-400">
                  Aún no tienes visitas completadas registradas con este correo.
                </p>
              ) : (
                <div className="space-y-2">
                  {stamps.map((s) => (
                    <div
                      key={s.tenantId}
                      className="p-3 rounded-xl bg-black/30 border border-white/5 flex items-center justify-between text-xs"
                    >
                      <div>
                        <span className="font-semibold text-white block capitalize">{s.tenantId}</span>
                        <span className="text-[11px] text-zinc-400">Citas completadas</span>
                      </div>
                      <div className="text-right">
                        <span className="text-lg font-bold text-amber-300 font-mono">{s.stampsCount}</span>
                        <span className="text-[10px] text-zinc-400 block">sellos acumulados</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* SECCIÓN 2: MIS RESERVAS / CITAS */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-bold text-zinc-200 uppercase tracking-wider">
                  <Calendar className="w-4 h-4 text-amber-300" />
                  <span>Mis Citas ({bookings.length})</span>
                </div>
                <button
                  type="button"
                  onClick={loadClientData}
                  disabled={loadingBookings}
                  className="text-xs text-zinc-400 hover:text-white flex items-center gap-1 cursor-pointer"
                  title="Refrescar citas"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loadingBookings ? 'animate-spin' : ''}`} />
                  <span>Actualizar</span>
                </button>
              </div>

              {loadingBookings && bookings.length === 0 ? (
                <div className="py-8 text-center text-xs text-zinc-400">
                  <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-amber-400" />
                  <span>Cargando tus reservas...</span>
                </div>
              ) : bookings.length === 0 ? (
                <div className="p-6 text-center text-xs text-zinc-400 bg-white/5 rounded-2xl border border-dashed border-white/10">
                  No tienes citas registradas con tu correo electrónico.
                </div>
              ) : (
                <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
                  {bookings.map((b) => (
                    <div
                      key={b.id}
                      className="p-3.5 rounded-2xl bg-white/5 border border-white/5 space-y-2 text-xs hover:border-amber-400/20 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-white text-sm">{b.serviceName}</span>
                        <span className="font-mono text-amber-300 font-bold">${b.totalPriceUSD.toFixed(2)}</span>
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-zinc-400">
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5" />
                          <span>{b.date} &bull; {b.timeSlot}</span>
                        </div>
                        <span className="capitalize text-zinc-300 font-medium">Salón: {b.tenantId}</span>
                      </div>
                      <div className="flex items-center justify-between pt-1 border-t border-white/5 text-[11px]">
                        <span className="text-zinc-400">Estado:</span>
                        <span className={`px-2 py-0.5 rounded-full font-semibold uppercase text-[10px] ${
                          b.status === 'confirmada' ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/30' :
                          b.status === 'completada' ? 'bg-blue-950 text-blue-300 border border-blue-500/30' :
                          b.status === 'cancelada' ? 'bg-rose-950 text-rose-300 border border-rose-500/30' :
                          'bg-amber-950 text-amber-300 border border-amber-500/30'
                        }`}>
                          {b.status.replace('_', ' ')}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* BOTONES DE ACCIÓN */}
            <div className="pt-3 border-t border-white/10 space-y-2">
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onBookNewAppointment();
                }}
                className="w-full py-3 rounded-2xl bg-amber-400 hover:bg-amber-300 text-zinc-950 font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md cursor-pointer transition-all"
              >
                <Plus className="w-4 h-4 stroke-[2.5]" />
                <span>Reservar Nueva Cita</span>
              </button>

              <button
                type="button"
                onClick={handleLogout}
                className="w-full py-2.5 rounded-2xl text-xs text-zinc-400 hover:text-rose-300 hover:bg-rose-950/20 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Cerrar sesión</span>
              </button>
            </div>

          </div>
        )}

      </div>
    </div>
  );
};
