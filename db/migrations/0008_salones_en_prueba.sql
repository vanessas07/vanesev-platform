-- Migración 0008: Puesta a punto de salones (en_prueba, cuenta_prueba y estado en central_mailbox)
ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS en_prueba boolean NOT NULL DEFAULT false;

ALTER TABLE "user"
  ADD COLUMN IF NOT EXISTS cuenta_prueba boolean NOT NULL DEFAULT false;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_user_cuenta_prueba'
  ) THEN
    ALTER TABLE "user"
      ADD CONSTRAINT chk_user_cuenta_prueba
      CHECK (cuenta_prueba = false OR email LIKE '%@prueba.vanesev.internal');
  END IF;
END $$;

ALTER TABLE public.central_mailbox
  ADD COLUMN IF NOT EXISTS estado text NOT NULL DEFAULT 'recibida';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_central_mailbox_estado'
  ) THEN
    ALTER TABLE public.central_mailbox
      ADD CONSTRAINT chk_central_mailbox_estado
      CHECK (estado IN ('recibida', 'en_curso', 'hecha'));
  END IF;
END $$;
