// Vercel Serverless Function: /api/gallery
// Manages carousel gallery images in Neon Serverless Postgres with strict tenant isolation
import { getDb } from './_db.js';

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
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
      try {
        await sql`
          CREATE TABLE IF NOT EXISTS public.gallery_slides (
            id VARCHAR(100) PRIMARY KEY,
            tenant_id VARCHAR(50),
            name VARCHAR(120) NOT NULL,
            image_url TEXT NOT NULL,
            tag VARCHAR(100),
            technique VARCHAR(120),
            created_at TIMESTAMPTZ DEFAULT NOW()
          );
        `;
        await sql`
          ALTER TABLE public.gallery_slides 
          ADD COLUMN IF NOT EXISTS tenant_id VARCHAR(50);
        `;
      } catch (ddlErr: any) {
        console.warn('[Gallery Table Init Note]:', ddlErr?.message);
      }

      const cols = await sql`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'gallery_slides';
      `;
      return res.status(200).json({ cols: cols.map((c: any) => c.column_name) });
    } catch (err: any) {
      console.error('[Neon Get Gallery Error]:', err);
      return res.status(500).json({ error: 'Error al consultar imágenes de la galería.', details: err?.message, stack: err?.stack });
    }
  }

  // ─── POST: Añadir o actualizar imagen por salón ────────────────────────────
  if (req.method === 'POST') {
    try {
      const { id, name, imageUrl, tag, technique } = req.body || {};
      if (!name || !imageUrl) {
        return res.status(400).json({ error: 'Nombre e imagen son obligatorios.' });
      }

      const countRes = await sql`
        SELECT COUNT(*) as count FROM public.gallery_slides WHERE tenant_id = ${tenantSlug};
      `;
      const currentCount = Number(countRes[0]?.count) || 0;
      if (currentCount >= 40) {
        return res.status(400).json({ error: 'Límite de 40 imágenes alcanzado. Elimina alguna para subir una nueva.' });
      }

      const slideId = id || `slide_${Date.now()}`;
      const cleanName = String(name).trim().slice(0, 120);
      const cleanTag = tag ? String(tag).trim().slice(0, 100) : 'Diseño Real';
      const cleanTech = technique ? String(technique).trim().slice(0, 120) : '';

      await sql`
        INSERT INTO public.gallery_slides (id, tenant_id, name, image_url, tag, technique)
        VALUES (${slideId}, ${tenantSlug}, ${cleanName}, ${imageUrl}, ${cleanTag}, ${cleanTech})
        ON CONFLICT (id) DO UPDATE SET
          tenant_id = EXCLUDED.tenant_id,
          name = EXCLUDED.name,
          image_url = EXCLUDED.image_url,
          tag = EXCLUDED.tag,
          technique = EXCLUDED.technique;
      `;

      return res.status(200).json({
        success: true,
        slide: { id: slideId, tenantId: tenantSlug, name: cleanName, imageUrl, tag: cleanTag, technique: cleanTech }
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
