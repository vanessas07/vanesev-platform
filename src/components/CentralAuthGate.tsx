import React, { useState } from 'react';
import { Lock, KeyRound, AlertTriangle, ArrowRight, CheckCircle2, RefreshCw } from 'lucide-react';
import { motion } from 'framer-motion';
import { authClient } from '../lib/authClient';

interface CentralAuthGateProps {
  onAuthenticated: () => void;
  onNavigateToSaaS?: () => void;
}

export const CentralAuthGate: React.FC<CentralAuthGateProps> = ({
  onAuthenticated,
  onNavigateToSaaS,
}) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [require2fa, setRequire2fa] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      if (!require2fa) {
        const res = await authClient.signIn.email({
          email: email.trim().toLowerCase(),
          password,
        });

        if (res.error) {
          setError(res.error.message || 'Credenciales incorrectas o no autorizadas.');
          return;
        }

        if (res.data?.twoFactorRedirect) {
          setRequire2fa(true);
        } else {
          // Central exige 2FA activo obligatoriamente. Si no lo tiene, se rechaza tajantemente.
          setError('Activa el 2FA con scripts/activar-2fa-superadmin.cjs');
        }
      } else {
        const res = await authClient.twoFactor.verifyTotp({
          code: code.trim(),
        });

        if (res.error) {
          setError(res.error.message || 'Código TOTP incorrecto o expirado.');
          return;
        }

        onAuthenticated();
      }
    } catch (err: any) {
      setError(err?.message || 'Error de conexión con el servidor de autenticación.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0C0C0E] text-white flex flex-col justify-between p-4 sm:p-6 font-sans antialiased">
      {/* Cabecera Superior */}
      <div className="flex items-center justify-between max-w-5xl w-full mx-auto">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[#F26A3D] flex items-center justify-center font-black text-white text-xs tracking-wider">
            V7
          </div>
          <span className="font-bold text-sm tracking-tight text-white">VANESEV Central</span>
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-white/10 text-[#A1A1AA]">
            Gobernanza
          </span>
        </div>
        {onNavigateToSaaS && (
          <button
            type="button"
            onClick={onNavigateToSaaS}
            className="text-xs text-[#A1A1AA] hover:text-white transition-colors cursor-pointer"
          >
            ← Volver a vanesev.com
          </button>
        )}
      </div>

      {/* Tarjeta Principal */}
      <div className="max-w-md w-full mx-auto my-8">
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-[#18181B] rounded-3xl p-6 sm:p-8 border border-white/10 shadow-2xl relative overflow-hidden"
        >
          {/* Resplandor sutil de fondo */}
          <div className="absolute top-0 right-0 w-48 h-48 bg-[#F26A3D]/10 rounded-full blur-3xl pointer-events-none" />

          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-2xl bg-[#F26A3D]/15 border border-[#F26A3D]/30 flex items-center justify-center text-[#F26A3D]">
              <Lock className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white tracking-tight">Acceso Super-Admin</h1>
              <p className="text-xs text-[#A1A1AA]">Autenticación criptográfica con 2FA obligatorio</p>
            </div>
          </div>

          {error && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="mb-4 p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-start gap-2.5 leading-relaxed"
            >
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <span>{error}</span>
            </motion.div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {!require2fa ? (
              <>
                <div>
                  <label className="block text-xs font-semibold text-[#D4D4D8] mb-1.5">
                    Correo del Super-Admin
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="superadmin@vanesev.com"
                    className="w-full px-4 py-3 rounded-2xl bg-white/5 border border-white/10 text-white text-xs placeholder:text-[#52525B] focus:outline-none focus:border-[#F26A3D] transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#D4D4D8] mb-1.5">
                    Contraseña Maestra
                  </label>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••••••"
                    className="w-full px-4 py-3 rounded-2xl bg-white/5 border border-white/10 text-white text-xs placeholder:text-[#52525B] focus:outline-none focus:border-[#F26A3D] transition-colors"
                  />
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full py-3.5 rounded-2xl bg-[#F26A3D] hover:bg-[#D94824] text-white text-xs font-bold transition-all shadow-lg shadow-[#F26A3D]/20 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {submitting ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Verificando credenciales...</span>
                      </>
                    ) : (
                      <>
                        <span>Continuar con 2FA</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="p-3.5 rounded-2xl bg-[#F26A3D]/10 border border-[#F26A3D]/20 mb-2">
                  <div className="flex items-center gap-2 text-xs font-bold text-[#F26A3D] mb-1">
                    <KeyRound className="w-4 h-4" />
                    <span>Verificación en Dos Pasos (TOTP)</span>
                  </div>
                  <p className="text-[11px] text-[#A1A1AA] leading-relaxed">
                    Introduce el código de 6 dígitos generado por tu aplicación autenticadora (Google Authenticator).
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#D4D4D8] mb-1.5">
                    Código TOTP de 6 Dígitos
                  </label>
                  <input
                    type="text"
                    required
                    autoFocus
                    maxLength={6}
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                    placeholder="123456"
                    className="w-full px-4 py-3 rounded-2xl bg-white/5 border border-white/10 text-white text-sm font-mono tracking-widest text-center focus:outline-none focus:border-[#F26A3D] transition-colors"
                  />
                </div>

                <div className="pt-2 space-y-2">
                  <button
                    type="submit"
                    disabled={submitting || code.length < 6}
                    className="w-full py-3.5 rounded-2xl bg-[#F26A3D] hover:bg-[#D94824] text-white text-xs font-bold transition-all shadow-lg shadow-[#F26A3D]/20 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {submitting ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Validando código TOTP...</span>
                      </>
                    ) : (
                      <>
                        <span>Acceder a Central</span>
                        <CheckCircle2 className="w-4 h-4" />
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setRequire2fa(false);
                      setCode('');
                      setError('');
                    }}
                    className="w-full py-2 text-center text-xs text-[#A1A1AA] hover:text-white transition-colors cursor-pointer"
                  >
                    ← Volver a usuario y contraseña
                  </button>
                </div>
              </>
            )}
          </form>

          {/* Nota de pie */}
          <div className="mt-6 pt-4 border-t border-white/5 text-center text-[10px] text-[#71717A] leading-relaxed">
            Sesión protegida por Better Auth con 2FA obligatorio y verificación estricta de superadmin_decisivo.
          </div>
        </motion.div>
      </div>

      {/* Pie */}
      <div className="text-center text-[11px] text-[#52525B]">
        VANESEV Cloud Platform &bull; Gobernanza Central &bull; 2026
      </div>
    </div>
  );
};
