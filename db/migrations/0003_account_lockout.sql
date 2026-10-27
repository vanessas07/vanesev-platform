-- Migración 0003: Campos de bloqueo por cuenta tras intentos fallidos
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "failed_attempts" INTEGER DEFAULT 0;
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "locked_until" TIMESTAMP WITH TIME ZONE;
