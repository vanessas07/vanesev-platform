import React, { useState } from 'react';
import { authClient } from '../lib/authClient';
import { 
  ShieldCheck, 
  Lock, 
  Mail, 
  KeyRound, 
  ArrowLeft, 
  CheckCircle2, 
  AlertTriangle, 
  RefreshCw,
  ExternalLink
} from 'lucide-react';

interface AdminAuthGateProps {
  onAuthenticated: (email: string) => void;
  onExit: () => void;
  salonSlug?: string;
}

type GateView = 'login' | 'totp' | 'must_reset';

export const AdminAuthGate: React.FC<AdminAuthGateProps> = ({ onAuthenticated, onExit }) => {
  const [view, setView] = useState<GateView>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [totpCode, setTotpCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // ─── PASO 1: VALIDAR CREDENCIALES (CORREO + CONTRASEÑA) ────────────────────
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);
    setLoading(true);

    try {
      const res = await authClient.signIn.email({
        email: email.trim().toLowerCase(),
        password,
      });

      if (res.error) {
        const errMsg = res.error.message || '';
        const errCode = (res.error as any).code || '';
        if (errMsg.includes('MUST_RESET') || errCode === 'MUST_RESET') {
          setView('must_reset');
          setSuccessMsg('Debes restablecer tu contraseña para continuar.');
        } else {
          setError(errMsg || 'Credenciales incorrectas o acceso no autorizado.');
        }
        return;
      }

      if ((res.data as any)?.twoFactorRedirect) {
        setView('totp');
        setSuccessMsg('Introduce el código de verificación en dos pasos (TOTP).');
        return;
      }

      const session = await authClient.getSession();
      if ((session?.data?.user as any)?.must_reset) {
        setView('must_reset');
        setSuccessMsg('Debes restablecer tu contraseña para continuar.');
        return;
      }

      onAuthenticated(email.trim().toLowerCase());
    } catch (err: any) {
      setError(err?.message || 'Error de conexión con el servidor de autenticación.');
    } finally {
      setLoading(false);
    }
  };

  // ─── PASO 2: VERIFICAR CÓDIGO TOTP (2FA) ───────────────────────────────────
  const handleTotpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await authClient.twoFactor.verifyTotp({
        code: totpCode.trim(),
      });

      if (res.error) {
        setError(res.error.message || 'Código TOTP incorrecto o expirado.');
        return;
      }

      const session = await authClient.getSession();
      if ((session?.data?.user as any)?.must_reset) {
        setView('must_reset');
        setSuccessMsg('Debes restablecer tu contraseña para continuar.');
        return;
      }

      onAuthenticated(email.trim().toLowerCase());
    } catch (err: any) {
      setError(err?.message || 'Error al validar el código TOTP.');
    } finally {
      setLoading(false);
    }
  };

  // ─── PASO 3: CAMBIO OBLIGATORIO DE CONTRASEÑA (MUST_RESET >= 12) ───────────
  const handleMustResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (newPassword.length < 12) {
      setError('La nueva contraseña debe tener al menos 12 caracteres.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Las contraseñas no coinciden.');
      return;
    }

    setLoading(true);

    try {
      const res = await authClient.changePassword({
        newPassword,
        currentPassword: password,
        revokeOtherSessions: true,
      });

      if (res.error) {
        setError(res.error.message || 'Error al restablecer la contraseña.');
        return;
      }

      onAuthenticated(email.trim().toLowerCase());
    } catch (err: any) {
      setError(err?.message || 'Error de conexión al actualizar la contraseña.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0E1A14] flex flex-col justify-center items-center p-4 selection:bg-amber-400 selection:text-sage-950 relative overflow-hidden">
      
      {/* Elementos sutiles de fondo */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-amber-400/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Tarjeta de Seguridad Principal */}
      <div className="relative w-full max-w-md bg-[#16291F] border border-amber-400/30 rounded-3xl shadow-2xl p-6 sm:p-8 space-y-6 text-white backdrop-blur-md">
        
        {/* Cabecera */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-amber-400/15 text-amber-300 border border-amber-300/30 shadow-inner mx-auto mb-1">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <span className="text-[10px] uppercase font-bold tracking-[0.25em] text-amber-300 block">
            Acceso Autorizado &bull; Administración y Equipo
          </span>
          <h2 className="font-serif text-2xl sm:text-3xl font-bold text-white tracking-tight">
            VANESEV Panel
          </h2>
          <p className="text-xs text-sage-200/80">
            Portal administrativo del salón
          </p>
        </div>

        {/* Alertas de Estado */}
        {error && (
          <div className="p-3.5 rounded-2xl bg-rose-950/70 border border-rose-500/40 text-rose-200 text-xs flex items-start gap-2.5 animate-in fade-in">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <span className="leading-relaxed">{error}</span>
          </div>
        )}

        {successMsg && (
          <div className="p-3.5 rounded-2xl bg-emerald-950/70 border border-emerald-500/40 text-emerald-200 text-xs flex items-start gap-2.5 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <span className="leading-relaxed">{successMsg}</span>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════════
            VISTA 1: INICIO DE SESIÓN (CORREO + CONTRASEÑA)
        ══════════════════════════════════════════════════════════════════════ */}
        {view === 'login' && (
          <form onSubmit={handleLoginSubmit} className="space-y-4">
            <div>
              <label className="text-xs font-bold text-sage-200 block mb-1">
                Correo Electrónico
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-sage-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="usuario@salon.com"
                  className="w-full pl-10 pr-4 py-3 rounded-2xl bg-[#0E1A14] border border-sage-700 text-white text-xs sm:text-sm focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400 transition-all font-mono"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-sage-200 block mb-1">
                Contraseña
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-sage-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full pl-10 pr-4 py-3 rounded-2xl bg-[#0E1A14] border border-sage-700 text-white text-xs sm:text-sm focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400 transition-all"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-2xl bg-amber-400 hover:bg-amber-300 text-sage-950 font-bold text-xs sm:text-sm shadow-luxury transition-all active:scale-95 cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2 mt-2"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Verificando credenciales...</span>
                </>
              ) : (
                <>
                  <KeyRound className="w-4 h-4 stroke-[2.5]" />
                  <span>Ingresar al Panel de Control</span>
                </>
              )}
            </button>
          </form>
        )}

        {/* ══════════════════════════════════════════════════════════════════════
            VISTA 2: CÓDIGO TOTP (2FA OBLIGATORIO SI ACTIVADO)
        ══════════════════════════════════════════════════════════════════════ */}
        {view === 'totp' && (
          <form onSubmit={handleTotpSubmit} className="space-y-4">
            <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 space-y-2 text-xs">
              <div className="flex items-center gap-2 text-amber-300 font-bold">
                <ShieldCheck className="w-4 h-4" />
                <span>Autenticación en Dos Pasos (TOTP)</span>
              </div>
              <p className="text-sage-200 text-[11px] leading-relaxed">
                Introduce el código de 6 dígitos generado por tu aplicación autenticadora para <span className="font-mono text-white font-bold">{email}</span>.
              </p>
            </div>

            <div>
              <label className="text-xs font-bold text-sage-200 block mb-1 text-center">
                Código de 6 Dígitos
              </label>
              <input
                type="text"
                required
                maxLength={6}
                value={totpCode}
                onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, ''))}
                placeholder="000000"
                className="w-full py-3 text-center rounded-2xl bg-[#0E1A14] border border-amber-400/40 text-amber-300 text-xl font-mono tracking-[0.3em] font-bold focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
            </div>

            <button
              type="submit"
              disabled={loading || totpCode.length < 6}
              className="w-full py-3.5 rounded-2xl bg-amber-400 hover:bg-amber-300 text-sage-950 font-bold text-xs sm:text-sm shadow-luxury transition-all active:scale-95 cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Validando código TOTP...</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4 stroke-[2.5]" />
                  <span>Acceder al Panel de Control</span>
                </>
              )}
            </button>

            <div className="flex items-center justify-center pt-1">
              <button
                type="button"
                onClick={() => {
                  setError(null);
                  setView('login');
                }}
                className="text-xs text-sage-300 hover:text-white flex items-center gap-1 transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Volver al inicio de sesión</span>
              </button>
            </div>
          </form>
        )}

        {/* ══════════════════════════════════════════════════════════════════════
            VISTA 3: CAMBIO OBLIGATORIO DE CONTRASEÑA (MUST_RESET >= 12 CARACTERES)
        ══════════════════════════════════════════════════════════════════════ */}
        {view === 'must_reset' && (
          <form onSubmit={handleMustResetSubmit} className="space-y-4">
            <div className="p-3.5 rounded-2xl bg-amber-400/10 border border-amber-400/30 text-xs text-amber-200 leading-relaxed">
              Es necesario actualizar tu contraseña antes de continuar. Debe tener un mínimo de <strong>12 caracteres</strong>.
            </div>

            <div>
              <label className="text-xs font-bold text-sage-200 block mb-1">
                Nueva Contraseña (mínimo 12 caracteres)
              </label>
              <input
                type="password"
                required
                minLength={12}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Mínimo 12 caracteres"
                className="w-full px-4 py-3 rounded-2xl bg-[#0E1A14] border border-sage-700 text-white text-xs sm:text-sm focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-sage-200 block mb-1">
                Confirmar Nueva Contraseña
              </label>
              <input
                type="password"
                required
                minLength={12}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repite la nueva contraseña"
                className="w-full px-4 py-3 rounded-2xl bg-[#0E1A14] border border-sage-700 text-white text-xs sm:text-sm focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400"
              />
            </div>

            <button
              type="submit"
              disabled={loading || newPassword.length < 12 || newPassword !== confirmPassword}
              className="w-full py-3.5 rounded-2xl bg-amber-400 hover:bg-amber-300 text-sage-950 font-bold text-xs sm:text-sm shadow-luxury transition-all active:scale-95 cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Actualizando contraseña...</span>
                </>
              ) : (
                <span>Guardar y Acceder al Panel</span>
              )}
            </button>
          </form>
        )}

        {/* Pie de Enlace */}
        <div className="pt-4 border-t border-white/10 text-center">
          <button
            onClick={onExit}
            className="inline-flex items-center gap-1.5 text-xs text-sage-300 hover:text-amber-300 transition-colors cursor-pointer"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>Volver a la vista pública</span>
          </button>
        </div>

      </div>

    </div>
  );
};
