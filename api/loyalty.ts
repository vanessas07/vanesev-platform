// Vercel Serverless Function: /api/loyalty
// Handles loyalty stamp queries and admin adjustments in Neon Postgres
import { neon } from '@neondatabase/serverless';
import { auth } from './_better-auth.js';
import { applyCors } from './_cors.js';

function getDb() {
  const connectionString = process.env.DATABASE_URL || process.env.DATABASE_URL_STAGING;
  if (!connectionString) return null;
  return neon(connectionString);
}

export default async function handler(req: any, res: any) {
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  res.setHeader('X-Content-Type-Options', 'nosniff');

  // Strict CORS filter (closed, no wildcard)
  applyCors(req, res);

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const sql = getDb();

  // ─── GET: Listar tarjetas de fidelización del salón para CRM ───────────────
  if (req.method === 'GET') {
    if (!sql) {
      return res.status(200).json({ cards: [], stampsCount: 0, databaseConnected: false });
    }

    try {
      const cleanTenant = req.query?.tenant ? String(req.query.tenant).trim().toLowerCase() : '';
      if (!cleanTenant) {
        return res.status(400).json({ error: 'Parámetro tenant requerido.' });
      }

      // 1. Verificación de sesión con Better Auth (Orden B1-a §4.8)
      const session = await auth.api.getSession({ headers: req.headers });
      if (!session || !session.user) {
        return res.status(401).json({ error: 'Unauthorized: Sesión requerida para consultar fidelización.' });
      }

      const user = session.user as any;
      let isAllowed = false;
      if (user.platform_role === 'superadmin_decisivo') {
        isAllowed = true;
      } else {
        const memberRows = await sql`
          SELECT m.role FROM "member" m
          JOIN "organization" o ON m."organizationId" = o.id
          WHERE m."userId" = ${user.id} AND o.slug = ${cleanTenant}
          LIMIT 1;
        `;
        if (memberRows.length > 0) {
          isAllowed = true;
        }
      }

      if (!isAllowed) {
        return res.status(403).json({ error: 'Forbidden: No tiene permisos sobre la organización solicitada.' });
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

  // ─── POST: Ajustar sellos manualmente desde Admin ───────────────────────────
  if (req.method === 'POST') {
    if (!sql) {
      return res.status(500).json({ error: 'Base de datos no disponible.' });
    }

    try {
      const { phone, tenantId, clientName, stampsCount, action } = req.body || {};
      const cleanPhone = phone ? String(phone).replace(/\D/g, '') : '';
      const cleanTenant = String(tenantId || req.query?.tenant || '').trim().toLowerCase();

      if (!cleanPhone || !cleanTenant) {
        return res.status(400).json({ error: 'Teléfono y salón (tenantId) requeridos para ajustar fidelización.' });
      }

      // 1. Verificación de sesión con Better Auth
      const session = await auth.api.getSession({ headers: req.headers });
      if (!session || !session.user) {
        return res.status(401).json({ error: 'Unauthorized: Sesión requerida para ajustar fidelización.' });
      }

      const user = session.user as any;
      let isAllowed = false;
      if (user.platform_role === 'superadmin_decisivo') {
        isAllowed = true;
      } else {
        const memberRows = await sql`
          SELECT m.role FROM "member" m
          JOIN "organization" o ON m."organizationId" = o.id
          WHERE m."userId" = ${user.id} AND o.slug = ${cleanTenant}
          LIMIT 1;
        `;
        if (memberRows.length > 0) {
          isAllowed = true;
        }
      }

      if (!isAllowed) {
        return res.status(403).json({ error: 'Forbidden: No tiene permisos sobre la organización solicitada.' });
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

      // C8 Fix: ON CONFLICT actualiza datos solo si tenant_id coincide, previniendo secuestro entre salones
      await sql`
        INSERT INTO public.loyalty_cards (phone, tenant_id, client_name, stamps_count, last_visit, rewards_earned, updated_at)
        VALUES (${cleanPhone}, ${cleanTenant}, ${name}, ${targetStamps}, CURRENT_DATE, ${rewards}, NOW())
        ON CONFLICT (phone) DO UPDATE SET
          client_name = EXCLUDED.client_name,
          stamps_count = ${targetStamps},
          last_visit = CURRENT_DATE,
          rewards_earned = ${rewards},
          updated_at = NOW()
        WHERE loyalty_cards.tenant_id = ${cleanTenant};
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
