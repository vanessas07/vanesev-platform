-- Migración 0005: Roles de Plataforma y Requisito de Reseteo (MUST_RESET)
-- Target: Neon PostgreSQL (Staging)

ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "platform_role" TEXT DEFAULT NULL;
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "must_reset" BOOLEAN DEFAULT FALSE;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_platform_role'
  ) THEN
    ALTER TABLE "user" 
    ADD CONSTRAINT "chk_platform_role" 
    CHECK ("platform_role" IS NULL OR "platform_role" IN ('superadmin_decisivo', 'admin_agentico'));
  END IF;
END $$;
