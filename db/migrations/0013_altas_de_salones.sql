-- Migración 0013: alta de salones con cobro manual (G-063 a G-066). Idempotente.
-- Solicitud desde la web → análisis → pago pedido → «pago recibido» en Central → el salón se crea solo
-- y la dueña recibe un enlace de activación de un solo uso (72 h) para crear su contraseña.

-- 1) Solicitudes de alta (la ficha de cada caso en Central).
CREATE TABLE IF NOT EXISTS public.solicitudes_alta (
  id               varchar(40)   PRIMARY KEY,
  salon_nombre     varchar(120)  NOT NULL,
  duena_nombre     varchar(120)  NOT NULL,
  email            varchar(160)  NOT NULL,
  whatsapp         varchar(40)   NOT NULL,
  oficio           varchar(30)   NOT NULL,
  ciudad           varchar(80),
  plan             varchar(30)   NOT NULL DEFAULT 'esencial',
  mensaje          varchar(1000),
  estado           varchar(20)   NOT NULL DEFAULT 'nueva',
  importe_usd      numeric(10,2),
  metodo_pago      varchar(30),
  referencia_pago  varchar(120),
  notas            varchar(2000),
  tenant_id        varchar(80)   REFERENCES public.tenants(id) ON DELETE SET NULL,
  ip_hash          varchar(80),
  historial        jsonb         NOT NULL DEFAULT '[]'::jsonb,
  created_at       timestamptz   NOT NULL DEFAULT now(),
  updated_at       timestamptz   NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_solicitudes_alta_estado ON public.solicitudes_alta (estado, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_solicitudes_alta_email ON public.solicitudes_alta (lower(email));

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_solicitudes_estado') THEN
    ALTER TABLE public.solicitudes_alta ADD CONSTRAINT chk_solicitudes_estado
      CHECK (estado IN ('nueva', 'en_analisis', 'pago_solicitado', 'pago_recibido', 'activa', 'rechazada'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_solicitudes_oficio') THEN
    ALTER TABLE public.solicitudes_alta ADD CONSTRAINT chk_solicitudes_oficio
      CHECK (oficio IN ('unas', 'pestanas_cejas', 'peluqueria', 'estetica', 'varios'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_solicitudes_plan') THEN
    ALTER TABLE public.solicitudes_alta ADD CONSTRAINT chk_solicitudes_plan CHECK (plan IN ('esencial', 'atelier'));
  END IF;
END $$;

-- 2) Enlaces de activación de la cuenta de la dueña: solo se guarda el hash del enlace.
CREATE TABLE IF NOT EXISTS public.activaciones_cuenta (
  token_hash  varchar(64)  PRIMARY KEY,
  user_id     text         NOT NULL REFERENCES public."user"(id) ON DELETE CASCADE,
  tenant_id   varchar(80)  NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  expira_at   timestamptz  NOT NULL,
  usado_at    timestamptz,
  created_at  timestamptz  NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_activaciones_user ON public.activaciones_cuenta (user_id);

-- 3) Ajustes de Central (datos de cobro, G-066). Nunca en el código.
CREATE TABLE IF NOT EXISTS public.central_ajustes (
  clave       varchar(60)  PRIMARY KEY,
  valor       jsonb        NOT NULL DEFAULT '{}'::jsonb,
  updated_at  timestamptz  NOT NULL DEFAULT now()
);
