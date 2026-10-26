// Vercel Serverless Function: /api/central
// 100% Database-Driven Super-Admin & Multi-Tenant Orchestrator for VANESEV (vanesev.com)
import { neon } from '@neondatabase/serverless';
import { validateSuperadminSession, applyCors } from './_auth.ts';

function getDb() {
  const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  if (!connectionString) return null;
  return neon(connectionString);
}

export default async function handler(req: any, res: any) {
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  res.setHeader('X-Content-Type-Options', 'nosniff');

  // Strict CORS filter: exact *.vanesev.com or localhost outside production
  applyCors(req, res);

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const sql = getDb();
  if (!sql) {
    return res.status(503).json({ error: 'Neon Database connection not configured.' });
  }

  try {
    // ─── GET: Fetch Central Master State or Specific Tenant Context ───────────
    if (req.method === 'GET') {
      const mode = String(req.query?.mode || 'all');
      const tenantSlug = String(req.query?.tenant || '');

      if (mode === 'tenant_context' && tenantSlug) {
        const tenants = await sql`
          SELECT * FROM public.tenants 
          WHERE id = ${tenantSlug} OR custom_subdomain = ${tenantSlug}
          LIMIT 1;
        `;
        const tenant = tenants[0] || null;
        if (!tenant) {
          return res.status(404).json({ error: 'Tenant not found' });
        }
        const tId = tenant.id;
        const [services, staff, zones] = await Promise.all([
          sql`SELECT * FROM public.services WHERE tenant_id = ${tId} AND is_available = true ORDER BY created_at ASC`,
          sql`SELECT * FROM public.staff_members WHERE tenant_id = ${tId} AND is_active = true ORDER BY created_at ASC`,
          sql`SELECT * FROM public.studio_zones WHERE tenant_id = ${tId} AND is_active = true ORDER BY sort_order ASC`,
        ]);
        return res.status(200).json({ tenant, services, staff, zones });
      }

      // Security Check: Full Central Dashboard requires valid Superadmin session
      const auth = await validateSuperadminSession(req, sql);
      if (!auth.valid) {
        return res.status(401).json({ error: auth.error || 'Unauthorized: Sesión de VANESEV Central requerida' });
      }

      // Full Central Dashboard Snapshot for karc0
      const [
        tenants,
        sessions,
        tasks,
        incidents,
        mailbox,
        roadmap,
        docs,
        staff,
        zones,
        bookingStats
      ] = await Promise.all([
        sql`SELECT * FROM public.tenants ORDER BY is_lifetime_free DESC, created_at ASC`,
        sql`SELECT * FROM public.central_sessions ORDER BY session_date DESC`,
        sql`SELECT * FROM public.central_tasks ORDER BY sort_order ASC, created_at DESC`,
        sql`SELECT * FROM public.central_incidents ORDER BY created_at DESC`,
        sql`SELECT * FROM public.central_mailbox ORDER BY created_at DESC`,
        sql`SELECT * FROM public.central_roadmap ORDER BY phase_number ASC, id ASC`,
        sql`SELECT * FROM public.central_docs ORDER BY id ASC`,
        sql`SELECT * FROM public.staff_members ORDER BY tenant_id ASC, created_at ASC`,
        sql`SELECT * FROM public.studio_zones ORDER BY tenant_id ASC, sort_order ASC`,
        sql`
          SELECT 
            tenant_id,
            COUNT(*)::int AS total_bookings,
            COUNT(*) FILTER (WHERE status = 'completada')::int AS completed_bookings,
            COALESCE(SUM(total_price_usd) FILTER (WHERE status != 'cancelada'), 0)::numeric AS total_revenue_usd
          FROM public.bookings
          GROUP BY tenant_id
        `
      ]);

      return res.status(200).json({
        tenants,
        sessions,
        tasks,
        incidents,
        mailbox,
        roadmap,
        docs,
        staff,
        zones,
        bookingStats,
        infrastructure: {
          githubAccount: 'vanessas07',
          vercelAccount: 'vanesevapp-4342',
          neonProjectId: 'super-frog-54108799',
          region: 'aws-us-east-1 (N. Virginia) <-> iad1',
          blobStore: 'vanesev-media-blob (Active)',
          realtimeStatus: 'Neon Live SQL Active',
        }
      });
    }

    // ─── POST: Create / Mutate Records in Central or Salon Admin V2 ───────────
    if (req.method === 'POST') {
      // Security Check: All Central mutations require valid Superadmin session
      const auth = await validateSuperadminSession(req, sql);
      if (!auth.valid) {
        return res.status(401).json({ error: auth.error || 'Unauthorized: Sesión de VANESEV Central requerida' });
      }

      const bodyObj = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
      const action = bodyObj.action;
      const payload = bodyObj.payload || bodyObj;

      // 1. Review / Approve / Request Changes on a Session
      if (action === 'review_session') {
        const { id, reviewStatus, karc0Feedback } = payload || {};
        await sql`
          UPDATE public.central_sessions
          SET review_status = ${String(reviewStatus || 'approved')},
              karc0_feedback = ${String(karc0Feedback || '')},
              reviewed_at = NOW()
          WHERE id = ${String(id)};
        `;
        return res.status(200).json({ ok: true });
      }

      // 2. Create New Emergency Incident / Bug Report from karc0
      if (action === 'create_incident') {
        const { severity, affectedZone, affectedTenant, title, description } = payload || {};
        const id = `inc-${Date.now()}`;
        await sql`
          INSERT INTO public.central_incidents (id, reporter, severity, affected_zone, affected_tenant, title, description, status)
          VALUES (
            ${id}, 'karc0', ${String(severity || 'critical')},
            ${String(affectedZone || 'General')}, ${String(affectedTenant || 'all')},
            ${String(title || 'Reporte de emergencia')}, ${String(description || '')}, 'open'
          );
        `;
        return res.status(201).json({ ok: true, id });
      }

      // 3. Update Incident Status
      if (action === 'update_incident') {
        const { id, status, resolutionNote } = payload || {};
        await sql`
          UPDATE public.central_incidents
          SET status = ${String(status)},
              agent_resolution_note = COALESCE(${resolutionNote || null}, agent_resolution_note),
              resolved_at = CASE WHEN ${String(status)} = 'resolved' THEN NOW() ELSE resolved_at END
          WHERE id = ${String(id)};
        `;
        return res.status(200).json({ ok: true });
      }

      // 4. Send Message in Bidirectional Mailbox (karc0 <-> Antigravity)
      if (action === 'send_mailbox_message') {
        const { sender, recipient, subject, body, category, priority } = payload || {};
        const id = `msg-${Date.now()}`;
        await sql`
          INSERT INTO public.central_mailbox (id, sender, recipient, subject, body, category, priority, is_read)
          VALUES (
            ${id}, ${String(sender || 'karc0')}, ${String(recipient || 'antigravity')},
            ${String(subject || 'Directriz desde Central')}, ${String(body || '')},
            ${String(category || 'order')}, ${String(priority || 'high')}, false
          );
        `;
        return res.status(201).json({ ok: true, id });
      }

      // 5. Create or Update Pending Task
      if (action === 'upsert_task') {
        const { id, title, description, zone, priority, status, assignedTo, karc0Notes, dueLabel } = payload || {};
        const taskId = id || `tsk-${Date.now()}`;
        await sql`
          INSERT INTO public.central_tasks (id, title, description, zone, priority, status, assigned_to, karc0_notes, due_label, updated_at)
          VALUES (
            ${taskId}, ${String(title)}, ${String(description || '')},
            ${String(zone || 'ZONA 2 · CENTRAL')}, ${String(priority || 'high')},
            ${String(status || 'pending')}, ${String(assignedTo || 'antigravity')},
            ${String(karc0Notes || '')}, ${String(dueLabel || 'Próximo Sprint')}, NOW()
          )
          ON CONFLICT (id) DO UPDATE SET
            status = EXCLUDED.status,
            priority = EXCLUDED.priority,
            karc0_notes = EXCLUDED.karc0_notes,
            title = EXCLUDED.title,
            description = EXCLUDED.description,
            updated_at = NOW();
        `;
        return res.status(200).json({ ok: true, id: taskId });
      }

      // 6. Create or Update Tenant (Salon / Barbershop / Studio) & Custom Subdomain URL
      if (action === 'upsert_tenant' || action === 'create_tenant_wizard') {
        const {
          id, customSubdomain, businessName, niche, slogan, ownerName, ownerEmail,
          whatsappPhone, instagramHandle, city, businessHours, themePalette,
          primaryColor, accentColor, bgColor, exchangeRateBs, loyaltyStampsTarget,
          loyaltyRewardTitle, planType, subscriptionStatus, monthlyFeeUsd
        } = payload || {};

        const cleanSlug = String(id || customSubdomain || `salon-${Date.now()}`).toLowerCase().replace(/[^a-z0-9-]/g, '');
        const cleanSub = String(customSubdomain || cleanSlug).toLowerCase().replace(/[^a-z0-9-]/g, '');

        await sql`
          INSERT INTO public.tenants (
            id, custom_subdomain, business_name, niche, slogan, owner_name, owner_email,
            whatsapp_phone, instagram_handle, city, business_hours, theme_palette,
            primary_color, accent_color, bg_color, exchange_rate_bs, loyalty_stamps_target,
            loyalty_reward_title, plan_type, subscription_status, monthly_fee_usd, updated_at
          ) VALUES (
            ${cleanSlug}, ${cleanSub}, ${String(businessName)}, ${String(niche || 'beauty_salon')},
            ${String(slogan || '')}, ${String(ownerName || '')}, ${String(ownerEmail || '')},
            ${String(whatsappPhone || '')}, ${String(instagramHandle || '')},
            ${String(city || 'Venezuela')}, ${String(businessHours || 'Lun - Sáb · 9:00 AM - 6:00 PM')},
            ${String(themePalette || 'capra_mauve_gold')}, ${String(primaryColor || '#B5838D')},
            ${String(accentColor || '#C5A059')}, ${String(bgColor || '#FDFBF9')},
            ${Number(exchangeRateBs || 42.50)}, ${Number(loyaltyStampsTarget || 5)},
            ${String(loyaltyRewardTitle || 'Servicio VIP 100% GRATIS')},
            ${String(planType || 'pro_studio')}, ${String(subscriptionStatus || 'active')},
            ${Number(monthlyFeeUsd || 25)}, NOW()
          )
          ON CONFLICT (id) DO UPDATE SET
            custom_subdomain = EXCLUDED.custom_subdomain,
            business_name = EXCLUDED.business_name,
            niche = EXCLUDED.niche,
            slogan = EXCLUDED.slogan,
            owner_name = EXCLUDED.owner_name,
            whatsapp_phone = EXCLUDED.whatsapp_phone,
            instagram_handle = EXCLUDED.instagram_handle,
            primary_color = EXCLUDED.primary_color,
            accent_color = EXCLUDED.accent_color,
            exchange_rate_bs = EXCLUDED.exchange_rate_bs,
            loyalty_stamps_target = EXCLUDED.loyalty_stamps_target,
            loyalty_reward_title = EXCLUDED.loyalty_reward_title,
            subscription_status = EXCLUDED.subscription_status,
            monthly_fee_usd = EXCLUDED.monthly_fee_usd,
            updated_at = NOW();
        `;

        if (action === 'create_tenant_wizard') {
          await sql`
            INSERT INTO public.studio_zones (id, tenant_id, name, department, description, capacity, station_code, is_active)
            VALUES (
              ${`zone-${cleanSlug}-main`}, ${cleanSlug}, 'Estación Principal VIP', 'general',
              'Área principal del salón', 2, 'EST-01', true
            )
            ON CONFLICT (id) DO NOTHING;
          `;
          await sql`
            INSERT INTO public.staff_members (id, tenant_id, name, role_title, specialty_tags, phone, instagram, commission_percent, schedule_summary, is_active)
            VALUES (
              ${`staff-${cleanSlug}-owner`}, ${cleanSlug}, ${String(ownerName || businessName)},
              'Directora / Master Artist', ARRAY['Especialista Principal'], ${String(whatsappPhone || '')},
              ${String(instagramHandle || '')}, 100, ${String(businessHours || 'Lun - Sáb · 9:00 AM - 6:00 PM')}, true
            )
            ON CONFLICT (id) DO NOTHING;
          `;
        }

        return res.status(200).json({ ok: true, id: cleanSlug, subdomain: `${cleanSub}.vanesev.com` });
      }

      // 7. Create or Update Staff Member (Admin Pro V2)
      if (action === 'upsert_staff') {
        const {
          id, tenantId, name, fullName, roleTitle, specialtyTags, specialties,
          phone, instagram, commissionPercent, commissionPct, zoneId, scheduleSummary, isActive
        } = payload || {};
        const staffId = id || `staff-${Date.now()}`;
        const finalName = String(name || fullName || 'Especialista');
        const rawTags = specialtyTags || specialties || 'Especialista VIP';
        const tagsArray = Array.isArray(rawTags)
          ? rawTags
          : String(rawTags).split(',').map((s: string) => s.trim()).filter(Boolean);
        const finalComm = Number(commissionPercent ?? commissionPct ?? 40);
        await sql`
          INSERT INTO public.staff_members (
            id, tenant_id, name, role_title, specialty_tags, phone, instagram,
            commission_percent, zone_id, schedule_summary, is_active, updated_at
          ) VALUES (
            ${staffId}, ${String(tenantId || 'andrea-nails')}, ${finalName},
            ${String(roleTitle || 'Especialista Senior')}, ${tagsArray},
            ${String(phone || '')}, ${String(instagram || '')},
            ${finalComm}, ${zoneId || null},
            ${String(scheduleSummary || 'Lun - Sáb · 9:00 AM - 6:00 PM')},
            ${isActive !== false}, NOW()
          )
          ON CONFLICT (id) DO UPDATE SET
            name = EXCLUDED.name,
            role_title = EXCLUDED.role_title,
            specialty_tags = EXCLUDED.specialty_tags,
            commission_percent = EXCLUDED.commission_percent,
            zone_id = EXCLUDED.zone_id,
            schedule_summary = EXCLUDED.schedule_summary,
            is_active = EXCLUDED.is_active,
            updated_at = NOW();
        `;
        return res.status(200).json({ ok: true, id: staffId });
      }

      // 8. Delete Staff Member
      if (action === 'delete_staff') {
        await sql`DELETE FROM public.staff_members WHERE id = ${String(payload?.id)};`;
        return res.status(200).json({ ok: true });
      }

      // 9. Create or Update Studio Zone / Station (Admin Pro V2)
      if (action === 'upsert_zone') {
        const { id, tenantId, name, department, description, capacity, stationCode, isActive } = payload || {};
        const zoneId = id || `zone-${Date.now()}`;
        await sql`
          INSERT INTO public.studio_zones (
            id, tenant_id, name, department, description, capacity, station_code, is_active, updated_at
          ) VALUES (
            ${zoneId}, ${String(tenantId || 'andrea-nails')}, ${String(name)},
            ${String(department || 'general')}, ${String(description || '')},
            ${Number(capacity || 1)}, ${String(stationCode || 'EST-01')},
            ${isActive !== false}, NOW()
          )
          ON CONFLICT (id) DO UPDATE SET
            name = EXCLUDED.name,
            department = EXCLUDED.department,
            description = EXCLUDED.description,
            capacity = EXCLUDED.capacity,
            station_code = EXCLUDED.station_code,
            is_active = EXCLUDED.is_active,
            updated_at = NOW();
        `;
        return res.status(200).json({ ok: true, id: zoneId });
      }

      // 10. Delete Studio Zone
      if (action === 'delete_zone') {
        await sql`DELETE FROM public.studio_zones WHERE id = ${String(payload?.id)};`;
        return res.status(200).json({ ok: true });
      }

      return res.status(400).json({ error: `Unknown action: ${action}` });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err: any) {
    console.error('Error in /api/central:', err);
    return res.status(500).json({ error: err?.message || 'Internal Server Error' });
  }
}
