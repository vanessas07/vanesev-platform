// Vercel Serverless Function: /api/loyalty
// Handles loyalty stamp queries and admin adjustments in Neon Postgres
import { getDb } from './_db.js';
import { requireTenantRole } from './_session.js';
import { applyCors } from './_cors.js';

export default async function handler(req: any, res: any) {
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  res.setHeader('X-Content-Type-Options', 'nosniff');

  // Strict CORS filter (closed, no wildcard)
  applyCors(req, res);

  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const sql = getDb();
  if (!sql) {
    return res.status(503).json({ error: 'Base de datos no disponible.' });
  }

  // ─── GET: Listar tarjetas de fidelización del salón para CRM (Protegido por Sesión y Rol) ───
  if (req.method === 'GET') {
    try {
      const cleanTenant = req.query?.tenant ? String(req.query.tenant).trim().toLowerCase() : '';
      if (!cleanTenant) {
        return res.status(400).json({ error: 'Parámetro tenant requerido.' });
      }

      // Orden B1-a v2 §4.1: requireTenantRole con roles owner, admin y staff
      const authCheck = await requireTenantRole(req, cleanTenant, ['owner', 'admin', 'staff']);
      if (authCheck.status !== 200) {
        return res.status(authCheck.status).json({ error: authCheck.error });
      }

      // Listar tarjetas exclusivamente de este salón
      const allRows = await sql`
        SELECT 
          phone,
          tenant_id as "tenantId",
          client_name as "clientName",
          stamps_count as "stampsCount",
          TO_CHAR(last_visit, 'YYYY-MM-DD') as "lastVisit",
          rewards_earned as "rewardsEarned"
        FROM public.loyalty_cards
        WHERE tenant_id = ${cleanTenant}
        ORDER BY last_visit DESC
        LIMIT 200;
      `;

      return res.status(200).json({
        cards: allRows,
        databaseConnected: true,
      });
    } catch (err: any) {
      console.error('[Neon Get Loyalty Error]:', err);
      return res.status(500).json({ error: 'Error al consultar programa de fidelización.' });
    }
  }

  // ─── POST: Ajustar sellos manualmente desde Admin (C10: Requiere sesión y rol owner/admin) ───
  if (req.method === 'POST') {
    try {
      const { phone, tenantId, clientName, stampsCount, action } = req.body || {};
      const cleanPhone = phone ? String(phone).replace(/\D/g, '') : '';
      const cleanTenant = String(tenantId || req.query?.tenant || '').trim().toLowerCase();

      if (!cleanPhone || !cleanTenant) {
        return res.status(400).json({ error: 'Teléfono y salón (tenantId) requeridos para ajustar fidelización.' });
      }

      // Validación estricta C10 (§4.2): solo owner o admin pueden ajustar sellos manualmente
      const authCheck = await requireTenantRole(req, cleanTenant, ['owner', 'admin']);
      if (authCheck.status !== 200) {
        return res.status(authCheck.status).json({ error: authCheck.error });
      }

      const name = clientName ? String(clientName).trim().slice(0, 80) : 'Clienta';
      const targetStamps = Math.max(0, Math.min(6, Number(stampsCount) || 0));

      const existing = await sql`
        SELECT stamps_count, rewards_earned FROM public.loyalty_cards
        WHERE phone = ${cleanPhone} AND tenant_id = ${cleanTenant};
      `;

      let rewards: string[] = [];
      if (existing.length > 0 && Array.isArray(existing[0].rewards_earned)) {
        rewards = [...existing[0].rewards_earned];
      }

      if (targetStamps === 6 && !rewards.includes('¡7º Servicio 100% GRATIS!')) {
        rewards.push('¡7º Servicio 100% GRATIS!');
      }

      if (action === 'redeem') {
        rewards = rewards.filter(r => r !== '¡7º Servicio 100% GRATIS!');
      }

      // C8: ON CONFLICT (phone) DO NOTHING + UPDATE con phone AND tenant_id
      await sql`
        INSERT INTO public.loyalty_cards (phone, tenant_id, client_name, stamps_count, last_visit, rewards_earned, updated_at)
        VALUES (${cleanPhone}, ${cleanTenant}, ${name}, ${targetStamps}, CURRENT_DATE, ${rewards}, NOW())
        ON CONFLICT (phone) DO NOTHING;
      `;

      await sql`
        UPDATE public.loyalty_cards 
        SET client_name = ${name},
            stamps_count = ${targetStamps},
            last_visit = CURRENT_DATE,
            rewards_earned = ${rewards},
            updated_at = NOW()
        WHERE phone = ${cleanPhone} AND tenant_id = ${cleanTenant};
      `;

      return res.status(200).json({
        success: true,
        phone: cleanPhone,
        tenantId: cleanTenant,
        clientName: name,
        stampsCount: targetStamps,
        rewardsEarned: rewards,
      });
    } catch (err: any) {
      console.error('[Neon Update Loyalty Error]:', err);
      return res.status(500).json({ error: 'Error al actualizar fidelización.' });
    }
  }

  return res.status(405).json({ error: 'Método no permitido.' });
}
