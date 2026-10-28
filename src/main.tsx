import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

/*
 * Arranque de la app.
 * Tras cada despliegue, una pestaña abierta con la versión anterior pide piezas de código que ya no existen.
 * Eso no es un fallo de la plataforma: se recarga sola una vez (con el preloader de marca) y carga la versión nueva.
 * Solo si el fallo persiste se muestra la pantalla de aviso, con la línea de la web (obsidiana, oro, Fraunces + Manrope).
 */

const CLAVE_RECARGA = 'vanesev_recarga_version';

/** Fallos típicos de una versión antigua en caché: piezas de código que ya no existen en el servidor. */
function esFalloDeVersion(mensaje: string): boolean {
  return /dynamically imported module|Importing a module script failed|Loading chunk|Failed to fetch|error loading dynamically|MIME type|Unable to preload CSS/i.test(mensaje);
}

/** Recarga una sola vez cada dos minutos, para no entrar en bucle si el fallo fuera real. */
function recargarUnaVez(): boolean {
  try {
    const ultima = Number(sessionStorage.getItem(CLAVE_RECARGA) || 0);
    if (Date.now() - ultima < 120000) return false;
    sessionStorage.setItem(CLAVE_RECARGA, String(Date.now()));
  } catch {
    return false;
  }
  window.location.reload();
  return true;
}

// Vite avisa con este evento cuando no puede cargar una pieza de la versión anterior.
window.addEventListener('vite:preloadError', (evento) => {
  if (recargarUnaVez()) evento.preventDefault();
});

const Preloader: React.FC = () => (
  <div className="v-preloader" role="status" aria-label="Cargando">
    <span className="v-preloader-anillo" aria-hidden="true" />
    <span className="v-preloader-v" aria-hidden="true">V</span>
  </div>
);

class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; recargando: boolean }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, recargando: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[ErrorBoundary]', error?.message, info.componentStack);
    if (esFalloDeVersion(error?.message || '') && recargarUnaVez()) this.setState({ recargando: true });
  }
  render() {
    if (!this.state.hasError) return this.props.children;
    if (this.state.recargando) return <Preloader />;
    return (
      <div style={{
        minHeight: '100svh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        background: 'radial-gradient(120% 90% at 85% 0%, #4A1F5C 0%, #1F1226 45%, #140B19 100%)', color: '#fff',
        fontFamily: "Manrope, 'Helvetica Neue', Arial, sans-serif", padding: '2rem 1.25rem', textAlign: 'center',
      }}>
        <span style={{ fontFamily: "Fraunces, Georgia, serif", fontSize: '3.25rem', lineHeight: 1, color: '#E7CF9C' }}>V</span>
        <h1 style={{ fontFamily: "Fraunces, Georgia, serif", fontWeight: 500, fontSize: '1.9rem', lineHeight: 1.1, margin: '1.25rem 0 0.75rem' }}>
          Esta página no ha cargado bien.
        </h1>
        <p style={{ fontSize: '1rem', color: 'rgba(255,255,255,0.72)', maxWidth: '340px', lineHeight: 1.55, margin: '0 0 1.75rem' }}>
          Suele pasar con una conexión lenta. Vuelve a intentarlo y, si sigue igual, entra desde el inicio.
        </p>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', justifyContent: 'center' }}>
          <button
            type="button"
            onClick={() => window.location.reload()}
            style={{
              background: 'linear-gradient(115deg, #F3E6C4 0%, #C9A45C 50%, #EBD9AE 100%)', color: '#1F1226', border: 'none',
              borderRadius: '999px', padding: '0.9rem 1.9rem', fontSize: '0.95rem', fontWeight: 700, cursor: 'pointer',
            }}
          >
            Volver a intentarlo
          </button>
          <a
            href="/"
            style={{
              color: '#fff', border: '1px solid rgba(255,255,255,0.3)', borderRadius: '999px',
              padding: '0.9rem 1.6rem', fontSize: '0.95rem', fontWeight: 700, textDecoration: 'none',
            }}
          >
            Ir al inicio
          </a>
        </div>
      </div>
    );
  }
}

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);
