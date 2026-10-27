# ESTÁNDAR SAAS DE ALTO NIVEL VANESEV («GRABADO A FUEGO») — DEFINITION OF DONE

- **Documento:** `docs/ESTANDAR_SAAS_VANESEV.md`
- **Proyecto:** VANESEV (`vanesev.com`)
- **Directiva:** ORDEN PERMANENTE 2330 (§3, §4, §5) y ORDEN 2345
- **Autoridad:** Claude Code (Director Técnico) · Decisión: karc0 (Administrador Absoluto)
- **Fecha:** 26 de Octubre de 2026
- **Vigencia:** PERMANENTE · Ninguna tarea se aprueba sin cumplir esta especificación.

---

## 1. Seguridad de Alto Nivel y Aislamiento Multi-Tenant

Toda intervención en la arquitectura de API y base de datos debe satisfacer de forma ineludible:

1. **Toda escritura exige sesión autenticada:**
   - Métodos `POST`, `PUT`, `PATCH`, `DELETE` requieren sesión activa de administrador o staff.
   - El `tenant_id` se extrae **exclusivamente de la sesión verificada en el servidor**, jamás de los parámetros del cuerpo (`req.body`) ni de la URL (`req.query`).
2. **Defensa en dos capas (Two-Layer Defense):**
   - **Capa 1 (Código de aplicación):** Toda consulta SQL incluye explícitamente `WHERE tenant_id = $1`.
   - **Capa 2 (Base de datos):** Tablas operativas protegidas mediante **Row Level Security (RLS)** de PostgreSQL activada, ejecutada mediante contexto de sesión (`executeWithTenantRls`).
3. **Validación estricta de entradas con Zod:**
   - Todos los payloads y parámetros recibidos en el servidor se validan mediante esquemas `zod`.
   - Prohibido el uso de tipos `any` o conversiones ciegas en endpoints de API.
4. **Respuestas de error opacas y seguras:**
   - Jamás se devuelve `err.message`, `err.stack` ni `err.details` al cliente.
   - Todo fallo se registra internamente en logs del servidor y responde un mensaje de error genérico con código HTTP apropiado.
5. **Lista blanca estricta en respuestas públicas:**
   - Prohibido `SELECT *` en endpoints accesibles sin autenticación (`tenant_context`, servicios, galería, horarios).
   - Solo se serializan y entregan los campos formalmente autorizados en la lista blanca pública (cero correos, teléfonos personales, comisiones ni estados de pago).
6. **Limitación de tasa (Rate Limiting):**
   - Endpoints críticos (autenticación, reseteo de claves, creación de reservas y altas de clientas) cuentan con control de tasa de peticiones por IP y por cuenta.
7. **Política CORS estricta:**
   - Permitido exclusivamente para orígenes autorizados: `https://vanesev.com`, `https://www.vanesev.com` y vistas previas del equipo (`*.vercel.app`).
   - **TERMINANTEMENTE PROHIBIDO** declarar `Access-Control-Allow-Origin: *` de forma concurrente con `Access-Control-Allow-Credentials: true`.
8. **Cabeceras de protección en `vercel.json`:**
   - `Strict-Transport-Security: max-age=31536000; includeSubDomains; preload`
   - `X-Content-Type-Options: nosniff`
   - `X-Frame-Options: DENY`
   - `X-XSS-Protection: 1; mode=block`
   - `Referrer-Policy: strict-origin-when-cross-origin`
9. **Registro de Auditoría Inmutable (`audit_log`):**
   - Se registran eventos sensibles: inicios de sesión, cambios en catálogos y tarifas, borrado de registros, modificaciones en configuraciones de salón y cambios en el equipo.
   - Estructura: usuario/agente, `tenant_id`, acción, timestamp e IP anonimizada.

---

## 2. Gobernanza de Base de Datos (Neon Serverless PostgreSQL)

1. **Migraciones estricta y cronológicamente numeradas:**
   - Ubicación única: `db/migrations/NNNN_nombre_descriptivo.sql`.
   - Cada migración incluye su bloque de aplicación y su bloque reversible de rollback.
   - Se prueban obligatoriamente primero en una **rama efímera de Neon** antes de plantear su paso a producción.
   - **Prohibido** ejecutar `CREATE TABLE IF NOT EXISTS` dentro de las funciones serverless de la API.
2. **Restricciones declaradas a nivel de esquema:**
   - Claves foráneas con integridad referencial a `tenants(id)`.
   - Clave única compuesta en fidelización: `UNIQUE (tenant_id, phone)` en `loyalty_cards`.
   - Restricciones `CHECK` de negocio (ej. `price_usd >= 0`).
3. **Paso a producción condicionado:**
   - Ninguna migración se ejecuta sobre la base de datos de producción sin la autorización escrita previa y explícita de `karc0`.
4. **Recuperación ante desastres (Disaster Recovery):**
   - Configurada la ventana de restauración de punto en el tiempo (PITR) de Neon.
   - Se documenta y ensaya una prueba de restauración periódica en rama aislada.

---

## 3. Calidad Automatizada y Guardias de CI (GitHub Actions)

El pipeline de CI es obligatorio y bloqueante para todo Pull Request hacia `main`. Comprende:

1. **Validación de tipos y empaquetado en la nube:**
   - `tsc --noEmit` y `npm run build` ejecutados en la VM cloud de 7GB RAM de GitHub Actions.
2. **Auditoría de Consultas Multi-Tenant (`scripts/tenant-audit.cjs`):**
   - Análisis estático del código de la API. El recuento de consultas a tablas multi-tenant sin filtro `tenant_id` debe ser **exactamente 0**.
3. **Guardias de Integridad de Código (`scripts/guardias.cjs`):**
   - Verifica y reporta desviaciones sobre:
     - `'andrea-nails'` como fallback por defecto en `api/`.
     - Exposición de `err.message` o trazas en respuestas HTTP.
     - `SELECT *` en APIs públicas.
     - `Allow-Origin: *` inseguro con credenciales.
     - Persistencia de datos de negocio en `localStorage` en lugar de Neon.
     - Credenciales, tokens o correos personales en texto plano.
     - Iconografía de IA (`Sparkles`, `Wand`, `Stars`) fuera de los componentes legacy acotados.
4. **Matriz de contaminación entre tenants:**
   - Ejecución automatizada contra entornos de prueba:
     - Inquilino A intentando escribir o leer en Inquilino B $\rightarrow$ **403 Forbidden**.
     - Petición de escritura sin token/sesión $\rightarrow$ **401 Unauthorized**.
     - Rol Staff intentando consultar métricas financieras $\rightarrow$ **403 Forbidden**.
     - Clienta intentando consultar reservas de otra usuaria $\rightarrow$ **403 Forbidden**.
5. **Auditoría Visual sin falsos positivos:**
   - La captura de `/central` debe comprobar explícitamente la presencia del formulario de acceso si no hay sesión activa.
   - Comprobación de que ningún nodo visible excede el ancho de la ventana (`getBoundingClientRect().right > window.innerWidth`).

---

## 4. Motor de Reservas Concurrente a Prueba de Carreras (Race-Proof)

1. **Garantía en motor relacional (Patrón Cal.com):**
   - El control de colisiones entre dos clientas que intentan reservar el mismo especialista en el mismo minuto se gestiona a nivel de PostgreSQL mediante una restricción de exclusión con rangos de tiempo:
     ```sql
     CONSTRAINT no_overlapping_bookings EXCLUDE USING gist (
       staff_id WITH =,
       tstzrange(start_time, end_time) WITH &&
     ) WHERE (status NOT IN ('cancelled', 'rejected'))
     ```
2. **Normalización horaria:**
   - Las fechas y turnos se persisten exclusivamente en formato UTC (`timestamptz`).
   - La visualización, cálculo de disponibilidad y envío de recordatorios se convierte al huso horario oficial del salón (`America/Caracas`).

---

## 5. Operación y Telemetría

1. **Monitorización activa:** Vercel Speed Insights y Web Analytics habilitados en el proyecto.
2. **Health Check endpoint:** `GET /api/health` para comprobar la conectividad del pool de base de datos sin transferir datos de salones.
3. **Revisión de logs:** Auditoría de errores en runtime de Vercel documentada en cada avance.

---

## 6. Blindaje en GitHub («Grabado a Fuego»)

1. **Protección estricta de la rama `main`:**
   - Despliegues a producción permitidos **únicamente mediante Pull Request**.
   - Check de verificación «Typecheck & Production Build (Cloud VM)» obligatorio en verde.
   - Rama base requerida al día antes del merge (`strict mode`).
   - Cero push directo, cero force-push y cero eliminación de rama, aplicable también a administradores.
2. **Protección de la rama `staging`:**
   - Bloqueados los force-pushes y la eliminación de la rama.
3. **Escaneo de seguridad:**
   - *Secret Scanning* y *Push Protection* habilitados para prevenir fugas de claves en commits.
   - Alertas y revisiones automatizadas de *Dependabot* activas.
4. **Gobernanza de fusiones:**
   - Todo PR hacia `main` debe citar obligatoriamente la respuesta formal **`APROBADO`** emitida por Claude Code en el canal oficial (`RESPUESTAS_CLAUDE/`).

---

## 7. Tabla de Cumplimiento Obligatoria en Reportes

A partir de la presente orden, todo reporte técnico en `BUZON_AGENTES/` debe concluir con la siguiente matriz:

| Requisito del Estándar | Estado (`Cumple` / `No Cumple` / `No Aplica`) | Prueba Técnica / Comando Verificador |
|---|---|---|
| Escritura con sesión y tenant de sesión | *Evaluado por fase* | Salida de pruebas con curl / test runner |
| Doble capa (WHERE tenant_id + RLS) | *Evaluado por fase* | Verificación en esquema y consultas |
| Validación de entradas con Zod | *Evaluado por fase* | Esquemas de validación en handlers |
| Errores sin trazas ni mensajes internos | *Evaluado por fase* | Ejecución de `scripts/guardias.cjs` |
| Lista blanca en lecturas públicas | *Evaluado por fase* | Verificación de claves JSON en curl |
| CORS estricto sin comodín con credenciales | *Evaluado por fase* | Cabeceras HTTP de respuesta |
| Migraciones numeradas en Neon | *Evaluado por fase* | `db/migrations/NNNN_*.sql` |
| CI con compilación en la nube | **Cumple** | `gh run list --workflow="Cloud CI/CD"` |
| Auditoría visual sin desbordes reales | *Evaluado por fase* | `scripts/visual-audit.cjs` con validación de rect |
| main protegido en GitHub | **Cumple** | Reglas de rama activas en GitHub API |
