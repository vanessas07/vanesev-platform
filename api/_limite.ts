import { createHmac } from 'node:crypto';
import { getDb } from './_db.js';

/**
 * Freno de frecuencia respaldado por Neon (migración 0006, `public.limite_superado`).
 *
 * El contador no puede vivir en memoria: cada función serverless de Vercel tiene la suya
 * y nunca la comparten, así que un `Map` deja pasar todas las peticiones.
 *
 * Los datos personales (IP, teléfono) nunca llegan a la base en claro. Un hash simple de una
 * IPv4 se revierte probando las 4.300 millones de direcciones en segundos, así que se usa
 * HMAC-SHA256 con `IP_HASH_PEPPER`, un secreto que solo conoce la aplicación.
 */

export function ipDeLaPeticion(req: any): string {
  const xff = req.headers?.['x-forwarded-for'];
  const valor = Array.isArray(xff) ? xff[0] : xff;
  return String(valor || req.headers?.['x-real-ip'] || req.socket?.remoteAddress || 'desconocida').split(',')[0].trim();
}

/** HMAC del dato con el secreto del proceso. Sin secreto, todos comparten un único contador (falla cerrado). */
export function huella(dato: string): string {
  const pepper = process.env.IP_HASH_PEPPER;
  if (!pepper) {
    console.error('[LIMITE] Falta IP_HASH_PEPPER: todas las peticiones comparten un único contador.');
    return 'sin-pepper';
  }
  return createHmac('sha256', pepper).update(dato).digest('hex');
}

export function claveDeLimite(prefijo: string, dato: string): string {
  return `${prefijo}:${huella(dato)}`;
}

/** true si la clave supera `limite` intentos en `ventanaSegundos`. Cuenta este intento. */
export async function limiteSuperado(clave: string, limite: number, ventanaSegundos: number): Promise<boolean> {
  const sql = getDb();
  if (!sql) return true;
  const filas = await sql`
    SELECT public.limite_superado(${clave}, ${limite}, make_interval(secs => ${ventanaSegundos})) AS superado;
  `;
  return Boolean(filas[0]?.superado);
}
