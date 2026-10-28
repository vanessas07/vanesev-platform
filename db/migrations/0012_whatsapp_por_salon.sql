-- Migración 0012: WhatsApp de cada salón con la API de Meta en su propio número (C-01; G-054, G-062). Idempotente.
-- Cada dueña conecta SU WhatsApp Business Platform: VANESEV guarda el acceso cifrado (AES-256-GCM con la
-- clave WHATSAPP_CLAVE de Vercel) y nunca lo devuelve al navegador.

-- 1) Conexión por salón: una fila como máximo por salón.
CREATE TABLE IF NOT EXISTS public.whatsapp_conexiones (
  tenant_id            varchar(80)  PRIMARY KEY REFERENCES public.tenants(id) ON DELETE CASCADE,
  phone_number_id      varchar(40)  NOT NULL,
  waba_id              varchar(40),
  numero_visible       varchar(40),
  nombre_verificado    varchar(160),
  token_cifrado        text         NOT NULL,
  app_secret_cifrado   text         NOT NULL,
  verify_token         varchar(80)  NOT NULL,
  estado               varchar(20)  NOT NULL DEFAULT 'pendiente',
  agente_activo        boolean      NOT NULL DEFAULT true,
  avisos_clienta       boolean      NOT NULL DEFAULT true,
  avisos_equipo        boolean      NOT NULL DEFAULT true,
  ultimo_error         varchar(300),
  webhook_visto_at     timestamptz,
  created_at           timestamptz  NOT NULL DEFAULT now(),
  updated_at           timestamptz  NOT NULL DEFAULT now()
);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_whatsapp_estado') THEN
    ALTER TABLE public.whatsapp_conexiones ADD CONSTRAINT chk_whatsapp_estado
      CHECK (estado IN ('pendiente', 'verificada', 'error'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_whatsapp_ids') THEN
    ALTER TABLE public.whatsapp_conexiones ADD CONSTRAINT chk_whatsapp_ids
      CHECK (phone_number_id ~ '^[0-9]{5,40}$' AND (waba_id IS NULL OR waba_id ~ '^[0-9]{5,40}$'));
  END IF;
END $$;

-- 2) Mensajes recibidos: el webhook de Meta puede repetir un aviso; cada mensaje se atiende una sola vez.
CREATE TABLE IF NOT EXISTS public.whatsapp_mensajes (
  tenant_id    varchar(80)  NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  mensaje_id   varchar(120) NOT NULL,
  remitente    varchar(40)  NOT NULL,
  tema         varchar(30),
  respondido   boolean      NOT NULL DEFAULT false,
  recibido_at  timestamptz  NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, mensaje_id)
);
CREATE INDEX IF NOT EXISTS idx_whatsapp_mensajes_tenant ON public.whatsapp_mensajes (tenant_id, recibido_at DESC);

-- 3) Los avisos por WhatsApp usan el mismo registro de avisos (destinatario «wa:<número>»);
--    el aviso a la especialista es un tipo nuevo.
ALTER TABLE public.avisos_enviados DROP CONSTRAINT IF EXISTS chk_avisos_tipo;
ALTER TABLE public.avisos_enviados ADD CONSTRAINT chk_avisos_tipo
  CHECK (tipo ~ '^(solicitud|confirmada|cambio|cancelada|recordatorio_dia|recordatorio_2h|nueva_reserva|aviso_equipo)(:[0-9: APM-]{0,24})?$');
