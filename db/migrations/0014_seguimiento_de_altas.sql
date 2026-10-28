-- Migración 0014: seguimiento del alta (G-067 y G-068). Idempotente.
-- La dueña que pide plaza sigue su solicitud en /solicitud (enlace firmado, sin token guardado)
-- y rellena el cuestionario «Cuéntanos tu salón»; Central ve sus respuestas en la ficha.

ALTER TABLE public.solicitudes_alta ADD COLUMN IF NOT EXISTS cuestionario     jsonb;
ALTER TABLE public.solicitudes_alta ADD COLUMN IF NOT EXISTS cuestionario_at  timestamptz;
