// Cuestionario «Cuéntanos tu salón» (G-068). Módulo puro, sin imports: lo usan la web (/solicitud),
// la API (validación y resumen de IA) y Central (lectura). Una sola fuente para preguntas y opciones.

export type Pregunta = {
  id: string;
  texto: string;
  ayuda?: string;
  tipo: 'una' | 'varias' | 'escala' | 'texto';
  opciones?: [string, string][];
  max?: number; // varias: máximo de opciones; texto: máximo de caracteres
};
export type Bloque = { id: string; titulo: string; entradilla: string; preguntas: Pregunta[] };

export const CUESTIONARIO: Bloque[] = [
  {
    id: 'experiencia', titulo: 'Tu día a día', entradilla: 'Para montar tu panel a tu ritmo, sin tecnicismos.',
    preguntas: [
      { id: 'agenda_hoy', texto: '¿Cómo llevas hoy tu agenda?', ayuda: 'Marca todo lo que uses.', tipo: 'varias', opciones: [
        ['libreta', 'Libreta o agenda de papel'], ['whatsapp', 'Chats de WhatsApp'], ['instagram', 'Mensajes de Instagram'],
        ['hoja', 'Hoja de cálculo'], ['otra_app', 'Otra app'], ['memoria', 'De memoria'],
      ] },
      { id: 'soltura', texto: '¿Qué tal te llevas con la tecnología?', ayuda: '1 = me cuesta · 5 = me encanta probar cosas nuevas', tipo: 'escala' },
    ],
  },
  {
    id: 'apps', titulo: 'Lo que ya probaste', entradilla: 'Así no repetimos lo que no te funcionó.',
    preguntas: [
      { id: 'usadas', texto: '¿Has usado alguna app para tu salón?', tipo: 'varias', opciones: [
        ['ninguna', 'Ninguna todavía'], ['booksy', 'Booksy'], ['fresha', 'Fresha'], ['agendapro', 'AgendaPro'], ['beunik', 'Beunik'],
        ['setmore', 'Setmore o Calendly'], ['otra', 'Otra'],
      ] },
      { id: 'no_gusto', texto: 'Si usaste alguna, ¿qué no te gustó?', ayuda: 'Opcional.', tipo: 'varias', opciones: [
        ['cara', 'Cara o en dólares sin opción en Bs'], ['comision', 'Cobraba comisión por cita'], ['complicada', 'Complicada de usar'],
        ['clientas', 'Mis clientas no la usaban'], ['marca', 'No se veía como mi marca'], ['directorio', 'Me ponía junto a la competencia'],
        ['soporte', 'Sin ayuda cuando la necesitaba'],
      ] },
    ],
  },
  {
    id: 'ideal', titulo: 'Tu app ideal', entradilla: 'Lo que más te importa va primero en tu montaje.',
    preguntas: [
      { id: 'funciones', texto: 'Elige las 3 cosas que más quieres', tipo: 'varias', max: 3, opciones: [
        ['reservas', 'Reservas online 24 h'], ['recordatorios', 'Recordatorios que eviten ausencias'], ['cobros', 'Cobros y señas (Pago Móvil, Zelle)'],
        ['pasaporte', 'Pasaporte VIP de sellos'], ['carta', 'Carta con precios en $ y Bs'], ['equipo', 'Agenda de mi equipo'],
        ['ofertas', 'Ofertas y tarjetas regalo'], ['cifras', 'Saber cuánto gano'], ['tienda', 'Vender productos'],
      ] },
      { id: 'dolor', texto: '¿Qué es lo que más te quita el sueño?', tipo: 'una', opciones: [
        ['ausencias', 'Clientas que no aparecen'], ['whatsapp', 'Horas contestando WhatsApp'], ['no_vuelven', 'Clientas que no vuelven'],
        ['desorden', 'Citas que se pisan'], ['cobros', 'Cobrar y cuadrar la caja'], ['visibilidad', 'Que me conozcan más'],
      ] },
      { id: 'frase', texto: 'Completa la frase: «Mi app ideal sería…»', tipo: 'texto', max: 400 },
    ],
  },
  {
    id: 'tamano', titulo: 'Tu salón hoy', entradilla: 'Para dejarte el equipo y la agenda listos.',
    preguntas: [
      { id: 'especialistas', texto: '¿Cuántas personas atienden?', tipo: 'una', opciones: [['solo_yo', 'Solo yo'], ['2_3', '2 o 3'], ['4_6', 'De 4 a 6'], ['7_mas', '7 o más']] },
      { id: 'citas', texto: '¿Cuántas citas tienes a la semana?', tipo: 'una', opciones: [['menos_20', 'Menos de 20'], ['20_50', 'De 20 a 50'], ['50_100', 'De 50 a 100'], ['mas_100', 'Más de 100']] },
      { id: 'modalidad', texto: '¿Dónde atiendes?', tipo: 'una', opciones: [['local', 'En mi local'], ['domicilio', 'A domicilio'], ['ambos', 'Las dos cosas']] },
      { id: 'instagram', texto: 'Instagram del salón', ayuda: 'Opcional. Nos ayuda a preparar tu carta y tus fotos.', tipo: 'texto', max: 60 },
    ],
  },
];

const PREGUNTAS = CUESTIONARIO.flatMap((b) => b.preguntas);

/** Valida y limpia lo que llega de la web: solo ids y opciones conocidas; nada más se guarda. */
export function limpiarCuestionario(entrada: any): Record<string, string | number | string[]> {
  const fuera: Record<string, string | number | string[]> = {};
  if (!entrada || typeof entrada !== 'object') return fuera;
  for (const p of PREGUNTAS) {
    const v = entrada[p.id];
    if (v === undefined || v === null || v === '') continue;
    const validas = new Set((p.opciones || []).map(([k]) => k));
    if (p.tipo === 'una' && typeof v === 'string' && validas.has(v)) fuera[p.id] = v;
    if (p.tipo === 'varias' && Array.isArray(v)) {
      const lista = [...new Set(v.filter((x) => typeof x === 'string' && validas.has(x)))].slice(0, p.max || 20);
      if (lista.length) fuera[p.id] = lista;
    }
    if (p.tipo === 'escala' && Number.isInteger(v) && v >= 1 && v <= 5) fuera[p.id] = v;
    if (p.tipo === 'texto' && typeof v === 'string') {
      const t = v.replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, p.max || 200);
      if (t) fuera[p.id] = t;
    }
  }
  return fuera;
}

/** Respuestas en texto legible (para Central y para la IA). */
export function respuestasLegibles(r: Record<string, any> | null | undefined): [string, string][] {
  if (!r) return [];
  const filas: [string, string][] = [];
  for (const p of PREGUNTAS) {
    const v = r[p.id];
    if (v === undefined) continue;
    const etiqueta = (k: string) => (p.opciones || []).find(([id]) => id === k)?.[1] || k;
    const texto = Array.isArray(v) ? v.map(etiqueta).join(', ') : p.tipo === 'escala' ? `${v} de 5` : p.opciones ? etiqueta(String(v)) : String(v);
    filas.push([p.texto, texto]);
  }
  return filas;
}
