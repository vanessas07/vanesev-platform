-- 0010 · QR dinámicos de los salones (R1/T-12, 28/10/2026).
-- qr_codes y qr_scans existían solo en staging; producción no los tenía (auditoría 0330), así que el
-- gestor de QR del admin y /r/<código> fallaban. Mismo esquema que staging, con las reglas de 0006.
-- Idempotente: en staging no cambia nada.
BEGIN;

CREATE TABLE IF NOT EXISTS public.qr_codes (
  id text PRIMARY KEY DEFAULT (gen_random_uuid())::text,
  code text NOT NULL UNIQUE,
  tenant_id text NOT NULL,
  label text NOT NULL,
  target_url text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  scan_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_qr_codes_code ON public.qr_codes (code);
CREATE INDEX IF NOT EXISTS idx_qr_codes_tenant ON public.qr_codes (tenant_id);

CREATE TABLE IF NOT EXISTS public.qr_scans (
  id bigserial PRIMARY KEY,
  code text NOT NULL,
  tenant_id text NOT NULL,
  scanned_at timestamptz NOT NULL DEFAULT now(),
  user_agent text,
  referer text,
  ip_hash text,
  device_type text,
  country text
);
CREATE INDEX IF NOT EXISTS idx_qr_scans_code ON public.qr_scans (code);
CREATE INDEX IF NOT EXISTS idx_qr_scans_tenant ON public.qr_scans (tenant_id);
CREATE INDEX IF NOT EXISTS idx_qr_scans_time ON public.qr_scans (scanned_at DESC);

-- Reglas de 0006 (en producción se saltaron porque la tabla no existía).
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_qr_codes_destino_interno') THEN
    ALTER TABLE public.qr_codes
      ADD CONSTRAINT chk_qr_codes_destino_interno
      CHECK (target_url ~ '^/([A-Za-z0-9_?&=%.,#-][A-Za-z0-9/_?&=%.,#-]*)?$' AND length(target_url) <= 300);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_qr_codes_codigo') THEN
    ALTER TABLE public.qr_codes
      ADD CONSTRAINT chk_qr_codes_codigo CHECK (code ~ '^[a-z0-9-]{3,32}$');
  END IF;
END $$;

COMMIT;
