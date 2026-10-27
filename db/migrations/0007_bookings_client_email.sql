-- Migración 0007: Añade columna client_email a bookings e índice (client_email, tenant_id)
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS client_email varchar(120);

CREATE INDEX IF NOT EXISTS idx_bookings_client_email_tenant
  ON public.bookings (client_email, tenant_id);
