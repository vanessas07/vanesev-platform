// Vercel Serverless Function: /api/gallery
// Manages carousel gallery images in Neon Serverless Postgres with strict tenant isolation
import { getDb } from './_db.js';
import { applyCors } from './_cors.js';

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  applyCors(req, res);
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST,DELETE');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // 1. Verificación obligatoria de tenant: sin tenant responde 400
  const rawTenant = req.query?.tenant || (req.body && req.body.tenantId);
  if (!rawTenant || !String(rawTenant).trim()) {
    return res.status(400).json({ error: 'Parámetro tenant requerido.' });
  }
  const tenantSlug = String(rawTenant).trim().toLowerCase();

  const sql = getDb();
  if (!sql) {
    if (req.method === 'GET') {
      return res.status(200).json({ slides: [], databaseConnected: false });
    }
    return res.status(500).json({ error: 'Base de datos no disponible.' });
  }

  // ─── GET: Listar imágenes del carrusel filtradas estrictamente por tenant_id ─
  if (req.method === 'GET') {
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

  // ─── POST: Añadir o actualizar imagen por salón ────────────────────────────
  if (req.method === 'POST') {
    try {
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
        WHERE public.gallery_slides.tenant_id = EXCLUDED.tenant_id;
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

  // ─── DELETE: Eliminar imagen por ID y tenant_id ───────────────────────────
  if (req.method === 'DELETE') {
    try {
      const { id } = req.query || req.body || {};
      if (!id) {
        return res.status(400).json({ error: 'ID de imagen requerido.' });
      }

      await sql`
        DELETE FROM public.gallery_slides 
        WHERE id = ${id} AND tenant_id = ${tenantSlug};
      `;

      return res.status(200).json({ success: true, deletedId: id });
    } catch (err: any) {
      console.error('[Neon Delete Gallery Error]:', err);
      return res.status(500).json({ error: 'Error al eliminar imagen de la galería.' });
    }
  }

  return res.status(405).json({ error: 'Método no permitido.' });
}
