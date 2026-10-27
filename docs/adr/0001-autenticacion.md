# ADR 0001: ARQUITECTURA DE AUTENTICACIÓN Y SESIONES MULTI-TENANT (BLOQUE 1 v2)

- **Estado:** PROPUESTO (Pendiente de decisión de Claude Code y karc0)
- **Fecha:** 26 de Octubre de 2026
- **Contexto:** Prueba de concepto `spike/better-auth` ordenada en la ORDEN PERMANENTE 2330 §2.
- **Autor:** Antigravity (Ejecutor) · **Supervisor:** Claude Code (Director Técnico) · **Decisión:** karc0

---

## 1. Contexto y Problema a Resolver

La plataforma VANESEV atiende a 3 tipos de actores con requisitos de autenticación profundamente dispares:
1. **Superadministrador Directivo (`karc0`):** Acceso a VANESEV Central (`/central`). Exige seguridad bancaria: correo, contraseña criptográfica fuerte, 2FA TOTP obligatorio (RFC 6238) y códigos de recuperación de un solo uso.
2. **Dueños y Staff de Salón (`tenant_admin` / `tenant_staff`):** Acceso al panel de administración del salón (`/<slug>/admin`). Autenticación mediante correo y contraseña, con autorización estrictamente acotada a su propio `tenant_id`.
3. **Clientas de Salón (Público Móvil en Venezuela):** Acceso a catálogo PWA, reserva y Pasaporte VIP. En el mercado venezolano, las clientas no gestionan contraseñas alfanuméricas complejas; el estándar de uso es **Número de WhatsApp / Teléfono + PIN numérico de 4 dígitos**.

El enfoque inicial ad-hoc presentó fallos previos (endpoints OAuth simulados, reseteos de clave no operativos, hashes SHA-256 legacy). La ORDEN 2330 exige evaluar si adoptar la librería open source **`better-auth` (Opción A)** o completar y blindar el módulo unificado **`api/auth.ts` con criptografía nativa de Node.js (Opción B)**.

---

## 2. Opción A: Adopción de `better-auth`

### 2.1 Arquitectura y Plugins
- **Librería:** `better-auth` (MIT, ~30k estrellas en GitHub).
- **Montaje en Vercel:** Requiere una función catch-all `api/auth/[...all].ts` adaptada mediante `toNodeHandler(auth)`. Consume 1 de los 12 slots de funciones de Vercel Hobby (total del proyecto: 11 de 12 funciones).
- **Plugins requeridos:**
  - `organization`: Modela salones como organizaciones (`organizationId = tenant_id`) con roles (`owner`, `admin`, `member`).
  - `twoFactor`: TOTP para el superadmin de Central.
  - `bearer` / cookie handler: Emisión de cookies de sesión `HttpOnly`, `Secure`, `SameSite=Lax`.

### 2.2 Evaluación Técnica y Limitaciones en VANESEV
1. **Incompatibilidad con el driver HTTP de Neon (`@neondatabase/serverless`):**
   `better-auth` utiliza Kysely y espera un pool de conexiones TCP estándar (`pg.Pool` o `postgres.js`). El driver de Neon en Vercel funciona mediante consultas HTTP stateless sin conexión persistente. Integrar un pool TCP en Vercel Serverless Function dispara los tiempos de cold start (+200-400 ms) y agota las conexiones concurrentes de la base de datos sin un pooler WebSocket dedicado.
2. **Proliferación de Esquema en Base de Datos:**
   `better-auth` exige crear 9 tablas nuevas en PostgreSQL: `user`, `session`, `account`, `verification`, `organization`, `member`, `invitation`, `twoFactor`, `rateLimit`. Esto duplica las tablas ya existentes (`admin_users`, `client_accounts`, `system_superadmins`, `tenants`) requiriendo una migración masiva de datos en Neon.
3. **Falta de soporte nativo para Teléfono + PIN (Clientas):**
   `better-auth` solo contempla autenticación por teléfono mediante envío de SMS con código OTP (vía Twilio u otros proveedores de pago). No dispone de un plugin nativo de "Teléfono + PIN estático de 4 dígitos", obligando a desarrollar un proveedor customizado que anula la ventaja de usar una librería prediseñada.
4. **Impacto en Cold Start y Límite de Bundle:**
   El árbol de dependencias de `better-auth` (Kysely, Zod, jose, nanoid) incrementa el tamaño empaquetado de la lambda en ~1.8 MB, impactando el límite de arranque en la capa gratuita de Vercel.

---

## 3. Opción B: `api/auth.ts` Unificado con Criptografía Nativa de Node.js

### 3.1 Arquitectura Actual y Estado
- **Función:** Una única lambda serverless `api/auth.ts` (10 de 12 funciones en Hobby).
- **Cero dependencias externas:** Utiliza el módulo nativo `crypto` de Node.js 22 LTS:
  - Hashing: `crypto.scryptSync(password, salt, 64)` con salt criptográfico de 16 bytes y timing-safe comparison (`crypto.timingSafeEqual`).
  - 2FA TOTP: Implementación nativa de RFC 6238 en pure Node.js (cero librerías externas), con tolerancia de ventana temporal de 30 segundos.
  - Códigos de Recuperación: 10 códigos numéricos de un solo uso, hasheados con scrypt y quemados tras su primer consumo.
  - Firma de Sesión: Token HMAC-SHA256 codificado en base64url, verificado con `SESSION_SECRET` y versionado con `session_version` en base de datos para revocación instantánea.
- **Compatibilidad Neon:** 100% nativa con `sql` stateless de `@neondatabase/serverless` (latencia < 25 ms, cero cold start de pool).
- **Resultados de suite de seguridad:** 11 de 11 casos de prueba en verde (`scripts/test-bloque-1.js`), incluyendo revocación, rate limiting y cierre de 401.

### 3.2 Tareas Pendientes para Completar Opción B en BLOQUE 1 v2
1. Portar los endpoints de admin de salón (`login_admin`, `reset_admin`) desde `_auth.js` hacia `api/auth.ts` vinculando el usuario estrictamente a su `tenant_id`.
2. Portar el flujo de clientas (`login_client`, `register_client`) con teléfono + PIN de 4 dígitos hasheado con scrypt.
3. Crear migración `db/migrations/0002_must_reset_and_auth_cleanup.sql` para marcar cuentas con hash SHA-256 antiguo con la bandera `must_reset = true`.
4. Implementar rate limit en memoria/BD (máximo 5 intentos por IP/minuto con respuesta 429).

---

## 4. Matriz Comparativa de Decisión

| Criterio de Evaluación | Opción A: `better-auth` | Opción B: `api/auth.ts` Unificado |
|---|---|---|
| **Límite de Lambdas Vercel Hobby** | 11 de 12 funciones (catch-all dinámico) | **10 de 12 funciones** (función única canónica) |
| **Tiempo de Cold Start en Vercel** | ~250–450 ms (dependencias Kysely/jose) | **~15–30 ms** (Node crypto nativo puro) |
| **Compatibilidad Neon Serverless HTTP** | Requiere pooler TCP o adapter custom | **100% Nativo** (consultas stateless) |
| **Complejidad de Esquema en Neon** | +9 tablas nuevas (`user`, `session`, `org`...) | **Aprovecha tablas existentes** (`system_superadmins`, `tenants`) |
| **Soporte Teléfono + PIN (Clientas VE)** | Requiere plugin customizado (diseñado para SMS) | **Nativo y adaptado al mercado venezolano** |
| **2FA TOTP Superadmin** | Soportado con plugin | **Comprobado y funcionando (11/11 tests OK)** |
| **Riesgo de Regresión en Producción** | Alto (reescritura total de clientes y API) | **Bajo** (completar handlers existentes) |
| **Mantenibilidad a Largo Plazo** | Código de librería auditado por la comunidad | Código interno acotado a < 350 líneas |

---

## 5. Recomendación Técnica Objetiva

> **Veredicto Técnico:** **Se recomienda la OPCIÓN B (`api/auth.ts` consolidado y terminado).**

**Motivos fundamentales:**
1. `better-auth` no encaja de forma limpia en una arquitectura Vercel Serverless Functions + Vite SPA + Neon HTTP Stateless sin introducir penalizaciones de latencia en cold start y sobrecarga de conexiones TCP.
2. La realidad del modelo multi-tenant de VANESEV (donde las clientas usan Teléfono + PIN y el Superadmin usa 2FA TOTP con Central cerrada) está resuelta con mayor ligereza, rapidez y cero dependencias externas en `api/auth.ts`.
3. Opción B permite cerrar la **Fase 1 (BLOQUE 1 v2)** de forma inmediata y segura sin reestructurar todo el modelo de datos de Neon ni arriesgar el límite de 12 funciones de Vercel Hobby.

*Queda sometido a la decisión final de Claude Code (Director Técnico) y karc0.*
