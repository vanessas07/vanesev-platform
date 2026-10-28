// Cliente de /api/salon (G-031/G-033): negocio del salón guardado en Neon.
// Las pantallas del admin (D3) usan SOLO estas funciones; la sesión va en la cookie de better-auth.
// Todas devuelven { ok, data } o { ok: false, error } con el mensaje en español que da el servidor.

export interface PerfilSalon {
  nombre: string;
  eslogan: string | null;
  whatsapp: string | null;
  instagram: string | null;
  ciudad: string | null;
  direccion: string | null;
  horario: string | null;
  logoUrl: string | null;
  portadaEtiqueta: string | null;
  portadaTitulo: string | null;
  portadaSubtitulo: string | null;
  tasaBs: number | null;
  sellosMeta: number | null;
  premioSellos: string | null;
  descuentoPrimeraVisitaUSD: number | null;
  metodosPago: { pago_movil?: boolean; efectivo_usd?: boolean; binance_usdt?: boolean; zelle?: boolean };
  propietaria?: string | null;
}

export type BloqueLanding = 'portada' | 'historia' | 'servicios' | 'galeria' | 'equipo' | 'ofertas' | 'resenas' | 'faq' | 'ubicacion' | 'reservar';

export interface LandingSalon {
  historia?: string | null;
  galeria?: string[];
  faq?: { p: string; r: string }[];
  bloques?: BloqueLanding[];
  seoTitulo?: string | null;
  seoDescripcion?: string | null;
  publicada?: boolean;
}

export interface OfertaSalon {
  id?: string;
  titulo: string;
  texto?: string | null;
  servicioId?: string | null;
  servicioNombre?: string | null;
  precioEspecialUSD?: number | null;
  precioNormalUSD?: number | null;
  boton?: 'ninguno' | 'reservar' | 'catalogo';
  botonTexto?: string | null;
  inicio?: string | null; // AAAA-MM-DD
  fin?: string | null;
  horaInicio?: string | null; // HH:MM (24 h)
  horaFin?: string | null;
  activa?: boolean;
  orden?: number;
}

export interface CuponSalon {
  id?: string;
  codigo: string; // 3–20 letras, números o guiones (se guarda en mayúsculas)
  descripcion?: string | null;
  tipo: 'porcentaje' | 'importe';
  valor: number;
  servicios?: string[]; // vacío = todos los servicios
  inicio?: string | null;
  fin?: string | null;
  usosMax?: number | null;
  usos?: number;
  unoPorClienta?: boolean;
  activo?: boolean;
}

export interface TarjetaRegalo {
  id: string;
  codigoFinal: string; // el código completo solo se ve al crearla
  beneficiaria: string | null;
  nota: string | null;
  saldoInicialUSD: number;
  saldoUSD: number;
  caduca: string | null;
  activa: boolean;
  creada: string;
}

export interface Presupuesto {
  base: number;
  oferta: { titulo: string; descuento: number } | null;
  primeraVisita: number;
  cupon: { codigo: string; descuento: number } | null;
  tarjetaRegalo: { pago: number; saldoRestante: number } | null;
  total: number;
}

export interface SalonPublico {
  perfil: PerfilSalon;
  landing: LandingSalon | null;
  tema: Record<string, any>;
  ofertas: OfertaSalon[];
}

export interface SalonAdmin extends SalonPublico {
  landing: LandingSalon;
  enPrueba: boolean;
  /** Interruptor «Avisos por correo» (G-059). */
  avisosCorreo?: boolean;
  cupones: CuponSalon[];
  tarjetas: TarjetaRegalo[];
}

export type Respuesta<T> = { ok: true; data: T } | { ok: false; error: string; status: number };

async function llamar<T>(url: string, init?: RequestInit): Promise<Respuesta<T>> {
  try {
    const res = await fetch(url, { credentials: 'include', ...init });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) return { ok: false, status: res.status, error: json?.error || 'No se pudo completar la operación.' };
    return { ok: true, data: json as T };
  } catch {
    return { ok: false, status: 0, error: 'Sin conexión con el servidor.' };
  }
}

const accion = <T>(tenantId: string, action: string, datos: Record<string, any>) =>
  llamar<T>('/api/salon', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, tenantId, ...datos }),
  });

const t = (slug: string) => encodeURIComponent(slug);

export const SalonApi = {
  /** Lo que ve la clienta: perfil, landing publicada, tema y ofertas vigentes hoy. Sin sesión. */
  publico: (slug: string) => llamar<SalonPublico>(`/api/salon?tenant=${t(slug)}&vista=publica`),
  /** Todo, para la dueña o admin del salón (y el superadmin). */
  admin: (slug: string) => llamar<SalonAdmin>(`/api/salon?tenant=${t(slug)}`),

  guardarPerfil: (slug: string, perfil: PerfilSalon) => accion<{ success: true }>(slug, 'perfil_guardar', { perfil }),
  guardarAvisos: (slug: string, activos: boolean) => accion<{ success: true; avisosCorreo: boolean }>(slug, 'avisos_guardar', { activos }),
  guardarLanding: (slug: string, landing: LandingSalon) => accion<{ success: true; landing: LandingSalon }>(slug, 'landing_guardar', { landing }),
  guardarTema: (slug: string, tema: Record<string, any>) => accion<{ success: true; tema: Record<string, any> }>(slug, 'tema_guardar', { tema }),

  guardarOferta: (slug: string, oferta: OfertaSalon) => accion<{ success: true; id: string }>(slug, 'oferta_guardar', { oferta }),
  borrarOferta: (slug: string, id: string) => accion<{ success: true }>(slug, 'oferta_borrar', { id }),

  guardarCupon: (slug: string, cupon: CuponSalon) => accion<{ success: true; id: string }>(slug, 'cupon_guardar', { cupon }),
  /** Si el cupón ya se usó, no se borra: queda desactivado (`desactivado: true`). */
  borrarCupon: (slug: string, id: string) => accion<{ success: true; desactivado?: boolean }>(slug, 'cupon_borrar', { id }),

  /** Devuelve el código completo UNA sola vez: la pantalla debe mostrarlo con botón de copiar. */
  crearTarjeta: (slug: string, datos: { saldoUSD: number; beneficiaria?: string; nota?: string; caduca?: string | null }) =>
    accion<{ success: true; id: string; codigo: string; saldoUSD: number }>(slug, 'tarjeta_crear', datos),
  anularTarjeta: (slug: string, id: string) => accion<{ success: true }>(slug, 'tarjeta_anular', { id }),

  /** Precio final que cobrará la reserva (oferta, primera visita, cupón y tarjeta). Público, con freno. */
  presupuesto: (slug: string, datos: { servicioId: string; fecha: string; turno: string; telefono?: string; primeraVisita?: boolean; cupon?: string; tarjetaRegalo?: string }) =>
    accion<Presupuesto>(slug, 'presupuesto', datos),
};
