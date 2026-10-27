-- Migración 0009 (Claude Code, G-031/G-033): negocio del salón en el servidor.
-- Ofertas con precio especial, cupones de descuento, tarjetas regalo con saldo, landing y tema en Neon.
-- Los límites (usos, saldo, uno por clienta) los garantiza la base: si se superan, la reserva entera se revierte.

-- Landing y tema del salón (antes solo en el navegador).
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS landing jsonb NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS tema jsonb NOT NULL DEFAULT '{}'::jsonb;

-- Ofertas: banner con fechas y franja horaria; con servicio y precio especial, cambia el precio real al reservar.
CREATE TABLE IF NOT EXISTS public.ofertas (
  id text PRIMARY KEY,
  tenant_id text NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  titulo text NOT NULL CHECK (char_length(titulo) BETWEEN 2 AND 60),
  texto text CHECK (texto IS NULL OR char_length(texto) <= 160),
  servicio_id text,
  precio_especial_usd numeric(10,2) CHECK (precio_especial_usd IS NULL OR precio_especial_usd >= 0),
  boton text NOT NULL DEFAULT 'reservar' CHECK (boton IN ('ninguno', 'reservar', 'catalogo')),
  boton_texto text CHECK (boton_texto IS NULL OR char_length(boton_texto) <= 30),
  inicio date,
  fin date,
  hora_inicio time,
  hora_fin time,
  activa boolean NOT NULL DEFAULT true,
  orden integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_ofertas_precio_con_servicio CHECK (precio_especial_usd IS NULL OR servicio_id IS NOT NULL),
  CONSTRAINT chk_ofertas_fechas CHECK (inicio IS NULL OR fin IS NULL OR inicio <= fin),
  CONSTRAINT chk_ofertas_horas CHECK ((hora_inicio IS NULL) = (hora_fin IS NULL) AND (hora_inicio IS NULL OR hora_inicio < hora_fin))
);
CREATE INDEX IF NOT EXISTS idx_ofertas_tenant ON public.ofertas (tenant_id, activa);

-- Cupones de descuento: código público del salón.
CREATE TABLE IF NOT EXISTS public.cupones (
  id text PRIMARY KEY,
  tenant_id text NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  codigo text NOT NULL CHECK (codigo ~ '^[A-Z0-9-]{3,20}$'),
  descripcion text CHECK (descripcion IS NULL OR char_length(descripcion) <= 120),
  tipo text NOT NULL CHECK (tipo IN ('porcentaje', 'importe')),
  valor numeric(10,2) NOT NULL CHECK (valor > 0),
  servicios text[],
  inicio date,
  fin date,
  usos_max integer CHECK (usos_max IS NULL OR usos_max > 0),
  usos integer NOT NULL DEFAULT 0,
  uno_por_clienta boolean NOT NULL DEFAULT true,
  activo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_cupones_codigo UNIQUE (tenant_id, codigo),
  CONSTRAINT chk_cupones_porcentaje CHECK (tipo <> 'porcentaje' OR valor <= 100),
  CONSTRAINT chk_cupones_fechas CHECK (inicio IS NULL OR fin IS NULL OR inicio <= fin),
  -- Garantía de la base: nunca más usos que el máximo.
  CONSTRAINT chk_cupones_usos CHECK (usos >= 0 AND (usos_max IS NULL OR usos <= usos_max))
);

-- Cada uso, ligado a su cita. «clave» = teléfono si el cupón es de uno por clienta; si no, el id de la cita.
CREATE TABLE IF NOT EXISTS public.cupon_usos (
  id text PRIMARY KEY,
  cupon_id text NOT NULL REFERENCES public.cupones(id) ON DELETE CASCADE,
  tenant_id text NOT NULL,
  booking_id text NOT NULL,
  clave text NOT NULL,
  descuento_usd numeric(10,2) NOT NULL CHECK (descuento_usd >= 0),
  created_at timestamptz NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_cupon_usos_clave UNIQUE (cupon_id, clave),
  CONSTRAINT uq_cupon_usos_booking UNIQUE (booking_id)
);

-- Tarjetas regalo: la dueña las emite tras cobrarlas fuera de la plataforma. El código solo se guarda con hash.
CREATE TABLE IF NOT EXISTS public.tarjetas_regalo (
  id text PRIMARY KEY,
  tenant_id text NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  codigo_hash text NOT NULL UNIQUE,
  codigo_final text NOT NULL CHECK (char_length(codigo_final) = 4),
  beneficiaria text CHECK (beneficiaria IS NULL OR char_length(beneficiaria) <= 80),
  nota text CHECK (nota IS NULL OR char_length(nota) <= 200),
  saldo_inicial_usd numeric(10,2) NOT NULL CHECK (saldo_inicial_usd > 0 AND saldo_inicial_usd <= 10000),
  -- Garantía de la base: el saldo nunca baja de 0 ni supera el inicial.
  saldo_usd numeric(10,2) NOT NULL,
  caduca date,
  activa boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_tarjetas_saldo CHECK (saldo_usd >= 0 AND saldo_usd <= saldo_inicial_usd)
);
CREATE INDEX IF NOT EXISTS idx_tarjetas_tenant ON public.tarjetas_regalo (tenant_id);

CREATE TABLE IF NOT EXISTS public.tarjeta_movimientos (
  id text PRIMARY KEY,
  tarjeta_id text NOT NULL REFERENCES public.tarjetas_regalo(id) ON DELETE CASCADE,
  tenant_id text NOT NULL,
  booking_id text,
  importe_usd numeric(10,2) NOT NULL,
  motivo text NOT NULL CHECK (motivo IN ('emision', 'reserva', 'devolucion', 'anulacion')),
  created_at timestamptz NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_tarjeta_mov ON public.tarjeta_movimientos (tarjeta_id);

-- Desglose del precio en cada cita (lo decide el servidor).
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS oferta_id text;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS descuento_oferta_usd numeric(10,2) NOT NULL DEFAULT 0;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS cupon_id text;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS descuento_cupon_usd numeric(10,2) NOT NULL DEFAULT 0;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS tarjeta_regalo_id text;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS pago_tarjeta_usd numeric(10,2) NOT NULL DEFAULT 0;
