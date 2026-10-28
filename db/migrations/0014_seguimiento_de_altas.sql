-- Migración 0014: seguimiento del alta (G-067 a G-069). Idempotente.
-- La dueña que pide plaza sigue su solicitud en /solicitud (enlace firmado, sin token guardado),
-- rellena el cuestionario «Cuéntanos tu salón» y Central ve sus respuestas con un resumen de IA.

ALTER TABLE public.solicitudes_alta ADD COLUMN IF NOT EXISTS cuestionario     jsonb;
ALTER TABLE public.solicitudes_alta ADD COLUMN IF NOT EXISTS cuestionario_at  timestamptz;
ALTER TABLE public.solicitudes_alta ADD COLUMN IF NOT EXISTS resumen_ia       varchar(2000);
ALTER TABLE public.solicitudes_alta ADD COLUMN IF NOT EXISTS resumen_ia_at    timestamptz;
