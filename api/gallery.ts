// Vercel Serverless Function: /api/gallery
// Manages carousel gallery images in Neon Serverless Postgres with strict tenant isolation
import { getDb } from './_db.js';
import { requireTenantRole } from './_session.js';
import { applyCors } from './_cors.js';

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  applyCors(req, res);
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST,DELETE');
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
    if (req.method === 'GET') {
      return res.status(200).json({ slides: [], databaseConnected: false });
    }
    return res.status(503).json({ error: 'Base de datos no disponible.' });
  }

  // ─── GET: Listar imágenes del carrusel (Público, filtrado por tenant_id) ────
  if (req.method === 'GET') {
    const rawTenant = req.query?.tenant;
    if (!rawTenant || !String(rawTenant).trim()) {
      return res.status(400).json({ error: 'Parámetro tenant requerido.' });
    }
    const tenantSlug = String(rawTenant).trim().toLowerCase();

    try {
      const rows = await sql`
        SELECT 
          id,
          tenant_id as "tenantId",
          title as "name",
          subtitle as "technique",
          category as "tag",
          image_url as "imageUrl",
          sort_order as "sortOrder",
          is_active as "isActive",
          created_at as "createdAt"
        FROM public.gallery_slides
        WHERE tenant_id = ${tenantSlug}
        ORDER BY sort_order ASC, created_at DESC
        LIMIT 40;
      `;

      return res.status(200).json({
        slides: rows || [],
        databaseConnected: true,
      });
    } catch (err: any) {
      console.error('[Neon Get Gallery Error]:', err);
      return res.status(500).json({ error: 'Error al consultar imágenes de la galería.' });
    }
  }

  // ─── POST: Añadir o actualizar imagen (C10: Requiere sesión y rol owner/admin) ─
  if (req.method === 'POST') {
    try {
      const rawTenant = req.body?.tenantId || req.query?.tenant;
      if (!rawTenant || !String(rawTenant).trim()) {
        return res.status(400).json({ error: 'Parámetro tenantId requerido.' });
      }
      const tenantSlug = String(rawTenant).trim().toLowerCase();

      // Validación estricta C10 (§4.2): solo owner o admin pueden modificar la galería
      const authCheck = await requireTenantRole(req, tenantSlug, ['owner', 'admin']);
      if (authCheck.status !== 200) {
        return res.status(authCheck.status).json({ error: authCheck.error });
      }

      const { id, name, imageUrl, tag, technique, title, subtitle, category } = req.body || {};
      const finalTitle = String(title || name || '').trim().slice(0, 120);
      const finalImage = String(imageUrl || '').trim();

      if (!finalTitle || !finalImage) {
        return res.status(400).json({ error: 'Nombre/título e imagen son obligatorios.' });
      }

      const countRes = await sql`
        SELECT COUNT(*) as count FROM public.gallery_slides WHERE tenant_id = ${tenantSlug};
      `;
      const currentCount = Number(countRes[0]?.count) || 0;
      if (currentCount >= 40) {
        return res.status(400).json({ error: 'Límite de 40 imágenes alcanzado. Elimina alguna para subir una nueva.' });
      }

      const slideId = id || `slide_${Date.now()}`;
      const finalSubtitle = String(subtitle || technique || '').trim().slice(0, 120);
      const finalCategory = String(category || tag || 'Diseño Real').trim().slice(0, 100);

      await sql`
        INSERT INTO public.gallery_slides (id, tenant_id, title, subtitle, category, image_url, is_active)
        VALUES (${slideId}, ${tenantSlug}, ${finalTitle}, ${finalSubtitle}, ${finalCategory}, ${finalImage}, true)
        ON CONFLICT (id) DO UPDATE SET
          title = EXCLUDED.title,
          subtitle = EXCLUDED.subtitle,
          category = EXCLUDED.category,
          image_url = EXCLUDED.image_url,
          is_active = EXCLUDED.is_active
        WHERE public.gallery_slides.tenant_id = ${tenantSlug};
      `;

      return res.status(200).json({
        success: true,
        slide: {
          id: slideId,
          tenantId: tenantSlug,
          name: finalTitle,
          technique: finalSubtitle,
          tag: finalCategory,
          imageUrl: finalImage,
          isActive: true
        }
      });
    } catch (err: any) {
      console.error('[Neon Save Gallery Error]:', err);
      return res.status(500).json({ error: 'Error al guardar imagen de la galería.' });
    }
  }

  // ─── DELETE: Eliminar imagen (C10: Requiere sesión y rol owner/admin) ───────
  if (req.method === 'DELETE') {
    try {
      const { id } = req.query || req.body || {};
      if (!id) {
        return res.status(400).json({ error: 'ID de imagen requerido.' });
      }

      const cleanId = String(id).trim();

      // C10 (§4.2): Carga la imagen de la BD para tomar su tenant_id
      const targetSlide = await sql`
        SELECT id, tenant_id 
        FROM public.gallery_slides 
        WHERE id = ${cleanId} 
        LIMIT 1;
      `;

      if (targetSlide.length === 0) {
        return res.status(404).json({ error: 'Imagen no encontrada.' });
      }

      const slideTenant = String(targetSlide[0].tenant_id).toLowerCase();

      // Validación estricta de sesión y rol owner/admin
      const authCheck = await requireTenantRole(req, slideTenant, ['owner', 'admin']);
      if (authCheck.status !== 200) {
        return res.status(authCheck.status).json({ error: authCheck.error });
      }

      await sql`
        DELETE FROM public.gallery_slides 
        WHERE id = ${cleanId} AND tenant_id = ${slideTenant};
      `;

      return res.status(200).json({ success: true, deletedId: cleanId });
    } catch (err: any) {
      console.error('[Neon Delete Gallery Error]:', err);
      return res.status(500).json({ error: 'Error al eliminar imagen de la galería.' });
    }
  }

  return res.status(405).json({ error: 'Método no permitido.' });
}
