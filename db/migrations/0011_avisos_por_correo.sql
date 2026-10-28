-- Migración 0011: avisos automáticos por correo (T-38; G-056 a G-059). Idempotente.
-- 1) Interruptor por salón. Al crearse la columna, Capra y Andrea quedan apagados (G-059);
--    si la migración se repite, no pisa lo que la dueña haya decidido después.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'tenants' AND column_name = 'avisos_correo'
  ) THEN
    ALTER TABLE public.tenants ADD COLUMN avisos_correo boolean NOT NULL DEFAULT true;
    UPDATE public.tenants SET avisos_correo = false WHERE id IN ('capra-studio', 'andrea-nails');
  END IF;
END $$;

-- 2) Registro de avisos enviados: cada aviso sale una sola vez por cita, tipo y destinatario.
--    El cron «reclama» el aviso con INSERT … ON CONFLICT DO NOTHING antes de enviarlo.
CREATE TABLE IF NOT EXISTS public.avisos_enviados (
  booking_id   varchar(80)  NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  tenant_id    varchar(80)  NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  tipo         varchar(60)  NOT NULL,
  destinatario varchar(160) NOT NULL,
  ok           boolean      NOT NULL DEFAULT true,
  enviado_at   timestamptz  NOT NULL DEFAULT now(),
  PRIMARY KEY (booking_id, tipo, destinatario)
);
CREATE INDEX IF NOT EXISTS idx_avisos_enviados_tenant ON public.avisos_enviados (tenant_id, enviado_at DESC);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_avisos_tipo') THEN
    ALTER TABLE public.avisos_enviados ADD CONSTRAINT chk_avisos_tipo
      CHECK (tipo ~ '^(solicitud|confirmada|cambio|cancelada|recordatorio_dia|recordatorio_2h|nueva_reserva)(:[0-9: APM-]{0,24})?$');
  END IF;
END $$;
