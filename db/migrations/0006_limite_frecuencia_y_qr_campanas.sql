-- Migración 0006: freno de frecuencia en la base y QR de campaña de VANESEV
-- Target: Neon PostgreSQL (Staging). En producción, solo con el APROBADO de Claude y la autorización de karc0.
--
-- 1. Freno de frecuencia: el contador vive en Neon y no en la memoria de la función
--    (cada función serverless tiene la suya y nunca la comparten). La clave llega ya
--    como HMAC (IP o teléfono + IP_HASH_PEPPER): aquí nunca se guarda un dato personal en claro.
-- 2. QR de campaña (/q/<codigo>): los imprime VANESEV (flyers, tarjetas) y su destino
--    solo se cambia desde Central. Igual que DKitchen 0071, con el destino limitado a
--    rutas internas y sin «//» (DKitchen admite «//dominio», que el navegador trata como externo).

BEGIN;

CREATE TABLE IF NOT EXISTS public.limite_frecuencia (
  clave text PRIMARY KEY CHECK (length(clave) <= 200),
  contador integer NOT NULL DEFAULT 0,
  ventana_inicio timestamptz NOT NULL DEFAULT now(),
  actualizado_en timestamptz NOT NULL DEFAULT now()
);

-- true si la clave supera el límite dentro de la ventana. Cuenta el intento de forma atómica.
CREATE OR REPLACE FUNCTION public.limite_superado(p_clave text, p_limite integer, p_ventana interval)
RETURNS boolean LANGUAGE plpgsql AS $$
DECLARE v integer;
BEGIN
  INSERT INTO public.limite_frecuencia AS l (clave, contador, ventana_inicio, actualizado_en)
  VALUES (p_clave, 1, now(), now())
  ON CONFLICT (clave) DO UPDATE SET
    contador = CASE WHEN l.ventana_inicio < now() - p_ventana THEN 1 ELSE l.contador + 1 END,
    ventana_inicio = CASE WHEN l.ventana_inicio < now() - p_ventana THEN now() ELSE l.ventana_inicio END,
    actualizado_en = now()
  RETURNING contador INTO v;
  RETURN v > p_limite;
END;
$$;

CREATE TABLE IF NOT EXISTS public.qr_campanas (
  codigo text PRIMARY KEY CHECK (codigo ~ '^[a-z0-9-]{3,32}$'),
  nombre text NOT NULL CHECK (length(nombre) BETWEEN 1 AND 80),
  destino text NOT NULL CHECK (destino ~ '^/([A-Za-z0-9_?&=%.,#-][A-Za-z0-9/_?&=%.,#-]*)?$' AND length(destino) <= 300),
  activo boolean NOT NULL DEFAULT true,
  creado_en timestamptz NOT NULL DEFAULT now(),
  actualizado_en timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.qr_campana_eventos (
  id bigserial PRIMARY KEY,
  codigo text NOT NULL REFERENCES public.qr_campanas(codigo) ON DELETE CASCADE,
  tipo text NOT NULL CHECK (tipo IN ('escaneo', 'clic', 'formulario', 'whatsapp')),
  detalle text CHECK (length(detalle) <= 120),
  ocurrido_en timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS qr_campana_eventos_codigo ON public.qr_campana_eventos (codigo, tipo, ocurrido_en);

-- QR de los salones: el destino debe ser una ruta interna (mismo criterio que las campañas).
-- En producción qr_codes aún no existe (auditoría 0330): el bloque se salta y lo creará B2 ya con estas reglas.
DO $$
BEGIN
  IF to_regclass('public.qr_codes') IS NULL THEN
    RETURN;
  END IF;
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
