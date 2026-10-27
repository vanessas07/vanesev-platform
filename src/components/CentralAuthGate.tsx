import React, { useState } from 'react';
import { Lock, KeyRound, AlertTriangle, ArrowRight, CheckCircle2, RefreshCw, Smartphone, Copy, ShieldCheck } from 'lucide-react';
import { motion } from 'framer-motion';
import { authClient } from '../lib/authClient';
import { VanesevLogo } from './VanesevLogo';

interface CentralAuthGateProps {
  onAuthenticated: () => void;
  onNavigateToSaaS?: () => void;
}

/**
 * Acceso a Central, todo desde la pantalla (karc0 no usa terminales):
 *   login → (cuenta nueva) cambio de la contraseña provisional → alta de Google Authenticator
 *   → códigos de respaldo → Central. Con el 2FA ya activo: login → código de 6 dígitos → Central.
 */
type Paso = 'login' | 'totp' | 'cambio' | 'alta' | 'respaldo';

const inputClase =
  'w-full px-4 py-3 rounded-2xl bg-v-surface-2 border border-v-line text-v-ink text-xs placeholder:text-v-muted focus:outline-none focus:border-v-brand transition-colors';
const botonClase =
  'w-full py-3.5 rounded-2xl bg-v-brand hover:bg-v-brand-hover text-white text-xs font-bold transition-all shadow-md shadow-v-brand/15 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50';

export const CentralAuthGate: React.FC<CentralAuthGateProps> = ({
  onAuthenticated,
  onNavigateToSaaS,
}) => {
  const [paso, setPaso] = useState<Paso>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nueva, setNueva] = useState('');
  const [repetida, setRepetida] = useState('');
  const [code, setCode] = useState('');
  const [totpURI, setTotpURI] = useState('');
  const [respaldo, setRespaldo] = useState<string[]>([]);
  const [copiado, setCopiado] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const clave = (() => {
    try {
      return new URL(totpURI).searchParams.get('secret') || '';
    } catch {
      return '';
    }
  })();

  const copiar = async (texto: string, que: string) => {
    try {
      await navigator.clipboard.writeText(texto);
      setCopiado(que);
      setTimeout(() => setCopiado(''), 2000);
    } catch {
      setCopiado('');
    }
  };

  // El servidor genera y cifra el secreto; aquí solo se muestra para Google Authenticator.
  const iniciarAlta = async (contrasena: string) => {
    const res = await authClient.twoFactor.enable({ password: contrasena });
    if (res.error || !(res.data as any)?.totpURI) {
      setError(res.error?.message || 'No se pudo preparar Google Authenticator. Vuelve a intentarlo.');
      return;
    }
    setTotpURI((res.data as any).totpURI);
    setRespaldo((res.data as any).backupCodes || []);
    setCode('');
    setPaso('alta');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      if (paso === 'login') {
        const res = await authClient.signIn.email({
          email: email.trim().toLowerCase(),
          password,
        });

        if (res.error) {
          setError(res.error.message || 'Credenciales incorrectas o no autorizadas.');
          return;
        }

        if ((res.data as any)?.twoFactorRedirect) {
          setPaso('totp');
          return;
        }

        // Sin 2FA todavía: es la primera entrada. Solo el superadmin sigue; Central exige el 2FA.
        const sesion = await authClient.getSession();
        const usuario = (sesion.data as any)?.user;
        if (!usuario || usuario.platform_role !== 'superadmin_decisivo') {
          await authClient.signOut();
          setError('Esta cuenta no tiene acceso a Central.');
          return;
        }
        if (usuario.must_reset) {
          setPaso('cambio');
          return;
        }
        await iniciarAlta(password);
      } else if (paso === 'cambio') {
        if (nueva.length < 12) {
          setError('La nueva contraseña debe tener al menos 12 caracteres.');
          return;
        }
        if (nueva !== repetida) {
          setError('Las contraseñas no coinciden.');
          return;
        }
        if (nueva === password) {
          setError('La nueva contraseña tiene que ser distinta de la provisional.');
          return;
        }
        const res = await authClient.changePassword({
          currentPassword: password,
          newPassword: nueva,
          revokeOtherSessions: false,
        });
        if (res.error) {
          setError(res.error.message || 'No se pudo cambiar la contraseña.');
          return;
        }
        setPassword(nueva);
        setNueva('');
        setRepetida('');
        await iniciarAlta(nueva);
      } else if (paso === 'alta') {
        const res = await authClient.twoFactor.verifyTotp({ code: code.trim() });
        if (res.error) {
          setError(res.error.message || 'Código incorrecto. Usa el que muestra ahora la app.');
          return;
        }
        setPaso('respaldo');
      } else if (paso === 'totp') {
        const res = await authClient.twoFactor.verifyTotp({
          code: code.trim(),
        });

        if (res.error) {
          setError(res.error.message || 'Código TOTP incorrecto o expirado.');
          return;
        }

        onAuthenticated();
      } else {
        setPassword('');
        onAuthenticated();
      }
    } catch (err: any) {
      setError(err?.message || 'Error de conexión con el servidor de autenticación.');
    } finally {
      setSubmitting(false);
    }
  };

  const titulos: Record<Paso, [string, string]> = {
    login: ['Acceso Super-Admin', 'Autenticación criptográfica con 2FA obligatorio'],
    totp: ['Acceso Super-Admin', 'Autenticación criptográfica con 2FA obligatorio'],
    cambio: ['Primera entrada', 'Paso 1 de 3 · Elige tu contraseña definitiva'],
    alta: ['Google Authenticator', 'Paso 2 de 3 · Vincula tu móvil'],
    respaldo: ['Códigos de respaldo', 'Paso 3 de 3 · Guárdalos antes de entrar'],
  };

  const campoCodigo = (
    <div>
      <label className="block text-xs font-semibold text-v-ink mb-1.5">
        Código de 6 dígitos de Google Authenticator
      </label>
      <input
        type="text"
        inputMode="numeric"
        autoComplete="one-time-code"
        required
        autoFocus
        maxLength={6}
        value={code}
        onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
        placeholder="123456"
        className="w-full px-4 py-3 rounded-2xl bg-v-surface-2 border border-v-line text-v-ink text-sm font-mono tracking-widest text-center focus:outline-none focus:border-v-brand transition-colors tabular-nums"
      />
    </div>
  );

  return (
    <div className="min-h-screen bg-v-bg text-v-ink flex flex-col justify-between p-4 sm:p-6 font-texto antialiased">
      {/* Cabecera Superior */}
      <div className="flex items-center justify-between max-w-5xl w-full mx-auto">
        <div className="flex items-center gap-2.5">
          <VanesevLogo tono="claro" tamano={32} dedicatoria={false} />
          <span className="text-[10px] font-semibold uppercase tracking-[0.18em] px-2.5 py-1 rounded-full border border-[#B89B6A]/40 text-[#7D6438]">
            Central
          </span>
        </div>
        {onNavigateToSaaS && (
          <button
            type="button"
            onClick={onNavigateToSaaS}
            className="text-xs text-v-muted hover:text-v-ink transition-colors cursor-pointer"
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
          className="bg-v-surface rounded-3xl p-6 sm:p-8 border border-v-line shadow-card relative overflow-hidden"
        >
          {/* Resplandor sutil de fondo */}
          <div className="absolute top-0 right-0 w-48 h-48 bg-v-brand/5 rounded-full blur-3xl pointer-events-none" />

          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-2xl bg-v-brand-soft border border-v-brand/20 flex items-center justify-center text-v-brand">
              {paso === 'alta' ? <Smartphone className="w-6 h-6" /> : paso === 'respaldo' ? <ShieldCheck className="w-6 h-6" /> : <Lock className="w-6 h-6" />}
            </div>
            <div>
              <h1 className="text-lg font-bold text-v-ink tracking-tight">{titulos[paso][0]}</h1>
              <p className="text-xs text-v-muted">{titulos[paso][1]}</p>
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
            {paso === 'login' && (
              <>
                <div>
                  <label className="block text-xs font-semibold text-v-ink mb-1.5">
                    Correo del Super-Admin
                  </label>
                  <input
                    type="email"
                    required
                    autoComplete="username"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="superadmin@vanesev.com"
                    className={inputClase}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-v-ink mb-1.5">
                    Contraseña Maestra
                  </label>
                  <input
                    type="password"
                    required
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••••••"
                    className={inputClase}
                  />
                </div>

                <div className="pt-2">
                  <button type="submit" disabled={submitting} className={botonClase}>
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
            )}

            {paso === 'cambio' && (
              <>
                <p className="text-[11px] text-v-muted leading-relaxed">
                  Has entrado con una contraseña provisional. Elige ahora la tuya (mínimo 12 caracteres); la provisional dejará de servir.
                </p>
                <div>
                  <label className="block text-xs font-semibold text-v-ink mb-1.5">Nueva contraseña</label>
                  <input
                    type="password"
                    required
                    autoFocus
                    autoComplete="new-password"
                    value={nueva}
                    onChange={(e) => setNueva(e.target.value)}
                    placeholder="Mínimo 12 caracteres"
                    className={inputClase}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-v-ink mb-1.5">Repite la contraseña</label>
                  <input
                    type="password"
                    required
                    autoComplete="new-password"
                    value={repetida}
                    onChange={(e) => setRepetida(e.target.value)}
                    className={inputClase}
                  />
                </div>
                <div className="pt-2">
                  <button type="submit" disabled={submitting || nueva.length < 12 || nueva !== repetida} className={botonClase}>
                    {submitting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <span>Guardar y seguir</span>}
                  </button>
                </div>
              </>
            )}

            {paso === 'alta' && (
              <>
                <ol className="text-[11px] text-v-muted leading-relaxed space-y-1.5 list-decimal pl-4">
                  <li>Instala <strong className="text-v-ink">Google Authenticator</strong> en tu móvil si no lo tienes.</li>
                  <li>
                    Si estás en el móvil, pulsa el botón de abajo. Si no, en la app: «+» → «Introducir clave de configuración»,
                    nombre «VANESEV Central», pega la clave y elige «Basada en el tiempo».
                  </li>
                  <li>Escribe aquí el código de 6 dígitos que muestra la app.</li>
                </ol>

                <a
                  href={totpURI}
                  className="w-full py-3 rounded-2xl bg-v-surface-2 hover:bg-v-line/50 border border-v-line text-v-ink text-xs font-bold flex items-center justify-center gap-2"
                >
                  <Smartphone className="w-4 h-4" />
                  <span>Abrir en Google Authenticator</span>
                </a>

                <div className="p-3.5 rounded-2xl bg-v-surface-2 border border-v-line">
                  <div className="text-[10px] text-v-muted mb-1">Clave de configuración</div>
                  <div className="flex items-center justify-between gap-2">
                    <code className="text-xs font-mono text-v-ink break-all">{clave.replace(/(.{4})/g, '$1 ').trim()}</code>
                    <button
                      type="button"
                      onClick={() => copiar(clave, 'clave')}
                      className="shrink-0 p-2 rounded-xl bg-v-surface hover:bg-v-line/40 border border-v-line text-v-ink cursor-pointer"
                      aria-label="Copiar clave"
                    >
                      {copiado === 'clave' ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {campoCodigo}

                <div className="pt-2">
                  <button type="submit" disabled={submitting || code.length < 6} className={botonClase}>
                    {submitting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <span>Activar Google Authenticator</span>}
                  </button>
                </div>
              </>
            )}

            {paso === 'respaldo' && (
              <>
                <p className="text-[11px] text-v-muted leading-relaxed">
                  Google Authenticator está activo. Si pierdes el móvil, cada uno de estos códigos sirve <strong className="text-v-ink">una sola vez</strong> en lugar
                  del código de 6 dígitos. Guárdalos en un lugar seguro: no se volverán a mostrar.
                </p>
                <div className="grid grid-cols-2 gap-2 p-3.5 rounded-2xl bg-v-surface-2 border border-v-line">
                  {respaldo.map((c) => (
                    <code key={c} className="text-xs font-mono text-v-ink text-center tabular-nums">{c}</code>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => copiar(respaldo.join('\n'), 'respaldo')}
                  className="w-full py-3 rounded-2xl bg-v-surface-2 hover:bg-v-line/50 border border-v-line text-v-ink text-xs font-bold flex items-center justify-center gap-2 cursor-pointer"
                >
                  {copiado === 'respaldo' ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  <span>{copiado === 'respaldo' ? 'Copiados' : 'Copiar los códigos'}</span>
                </button>
                <div className="pt-2">
                  <button type="submit" className={botonClase}>
                    <span>Ya los he guardado · Entrar en Central</span>
                    <CheckCircle2 className="w-4 h-4" />
                  </button>
                </div>
              </>
            )}

            {paso === 'totp' && (
              <>
                <div className="p-3.5 rounded-2xl bg-v-brand-soft border border-v-brand/20 mb-2">
                  <div className="flex items-center gap-2 text-xs font-bold text-v-brand mb-1">
                    <KeyRound className="w-4 h-4" />
                    <span>Verificación en Dos Pasos (TOTP)</span>
                  </div>
                  <p className="text-[11px] text-v-muted leading-relaxed">
                    Introduce el código de 6 dígitos generado por tu aplicación autenticadora (Google Authenticator).
                  </p>
                </div>

                {campoCodigo}

                <div className="pt-2 space-y-2">
                  <button type="submit" disabled={submitting || code.length < 6} className={botonClase}>
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
                      setPaso('login');
                      setCode('');
                      setError('');
                    }}
                    className="w-full py-2 text-center text-xs text-v-muted hover:text-v-ink transition-colors cursor-pointer"
                  >
                    ← Volver a usuario y contraseña
                  </button>
                </div>
              </>
            )}
          </form>

          {/* Nota de pie */}
          <div className="mt-6 pt-4 border-t border-v-line text-center text-[10px] text-v-muted leading-relaxed">
            Sesión protegida por Better Auth con 2FA obligatorio y verificación estricta de superadmin_decisivo.
          </div>
        </motion.div>
      </div>

      {/* Pie */}
      <div className="text-center text-[11px] text-v-muted">
        VANESEV Cloud Platform &bull; Gobernanza Central &bull; 2026
      </div>
    </div>
  );
};
