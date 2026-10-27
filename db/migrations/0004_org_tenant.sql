-- Migración 0004: Vinculación Estricta Salón ↔ Organización y Semillas
-- Target: Neon PostgreSQL (Staging)

-- 1. Restricción de clave foránea entre organization.slug y tenants.id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_organization_tenant'
  ) THEN
    ALTER TABLE "organization" 
    ADD CONSTRAINT "fk_organization_tenant" 
    FOREIGN KEY ("slug") REFERENCES "tenants"("id") 
    ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

-- 2. Restricción de roles permitidos en miembros (owner, admin, staff)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_member_role'
  ) THEN
    ALTER TABLE "member" 
    ADD CONSTRAINT "chk_member_role" 
    CHECK ("role" IN ('owner', 'admin', 'staff'));
  END IF;
END $$;

-- 3. Semilla en staging de las organizaciones vinculadas a tenants existentes
INSERT INTO "organization" ("id", "name", "slug", "createdAt")
VALUES 
  ('org_capra_studio', 'Capra Studio · Salón de Belleza', 'capra-studio', NOW()),
  ('org_andrea_nails', 'Andrea Labrador Nails', 'andrea-nails', NOW())
ON CONFLICT ("slug") DO UPDATE SET "name" = EXCLUDED."name";
