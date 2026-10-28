// IA de VANESEV por Vercel AI Gateway (G-069).
// Sin clave en el código: en Vercel se usa el token OIDC del propio despliegue (cabecera `x-vercel-oidc-token`
// o `VERCEL_OIDC_TOKEN`); `AI_GATEWAY_API_KEY` solo si algún día se crea en Vercel.
// Solo crédito gratuito mensual, sin recarga: si se agota o falla, devuelve null y el resto sigue funcionando.

const GATEWAY = 'https://ai-gateway.vercel.sh/v1/chat/completions';
export const MODELO_IA = 'anthropic/claude-haiku-5.5';

function credencial(req?: any): string | null {
  const cabecera = req?.headers?.['x-vercel-oidc-token'];
  return process.env.AI_GATEWAY_API_KEY || (typeof cabecera === 'string' ? cabecera : null) || process.env.VERCEL_OIDC_TOKEN || null;
}

export async function preguntarIA(
  req: any,
  sistema: string,
  usuario: string,
  opciones: { maxTokens?: number; esperaMs?: number } = {},
): Promise<string | null> {
  const token = credencial(req);
  if (!token) {
    console.error('[ia] Sin credencial del Gateway (OIDC desactivado en el proyecto).');
    return null;
  }
  const control = new AbortController();
  const reloj = setTimeout(() => control.abort(), opciones.esperaMs ?? 12000);
  try {
    const res = await fetch(GATEWAY, {
      method: 'POST',
      signal: control.signal,
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: MODELO_IA,
        max_tokens: opciones.maxTokens ?? 500,
        temperature: 0.3,
        messages: [{ role: 'system', content: sistema }, { role: 'user', content: usuario }],
      }),
    });
    if (!res.ok) {
      console.error('[ia] Gateway', res.status, (await res.text().catch(() => '')).slice(0, 160));
      return null;
    }
    const json: any = await res.json();
    const texto = json?.choices?.[0]?.message?.content;
    return typeof texto === 'string' && texto.trim() ? texto.trim() : null;
  } catch (e: any) {
    console.error('[ia] Gateway', e?.name === 'AbortError' ? 'tiempo agotado' : e?.message || 'error');
    return null;
  } finally {
    clearTimeout(reloj);
  }
}
