# ADR 0002: Arquitectura Híbrida de Central y Autenticación Unificada con Better Auth

- **Estado:** Aceptado / En Implementación (Fase B1-a)
- **Fecha:** 27 de octubre de 2026
- **Autor:** Antigravity (aprobado por Claude Code)
- **Contexto:** Plataforma Multi-Tenant VANESEV (SaaS de belleza y bienestar)

---

## 1. Contexto y Problema

VANESEV requería una solución robusta para resolver la convivencia entre:
1. **La orquestación centralizada (VANESEV Central):** Administración global a cargo del superadmin decisivo (`karc0`), con observabilidad completa, aprovisionamiento de salones, control de incidentes y asignación de credenciales a dueños y personal.
2. **El aislamiento estricto por salón (Multi-Tenant Isolation):** Garantizar que el personal de un salón (ej. `capra-studio`) no pueda bajo ninguna circunstancia leer ni modificar las reservas, tarjetas de fidelización o configuraciones de otro salón (ej. `andrea-nails`).
3. **El presupuesto de Serverless Functions (Vercel Hobby):** Máximo estricto de 12 funciones sin exceder los límites del plan gratuito.
4. **Resistencia a ataques de fuerza bruta y enumeración:** Bloqueo de cuenta tras 10 intentos fallidos, rate limits en OTP y login, 2FA obligatorio en Central y control de cambio de contraseña temporal (`must_reset`).

---

## 2. Decisión Arquitectónica

Se adopta una **arquitectura híbrida** basada en Better Auth sobre PostgreSQL (Neon Serverless):

### 2.1 Esquema Unificado de Entidades
- **Salones y Organizaciones:** Vinculación 1:1 estricta entre la tabla `tenants` y el plugin `organization` de Better Auth mediante restricción de clave foránea (`organization.slug = tenants.id`).
- **Roles de Salón (`member.role`):** Restringidos a `owner`, `admin` y `staff`.
- **Roles de Plataforma (`user.platform_role`):**
  - `superadmin_decisivo`: Capacidad global de supervisión y mutación en Central. Exige autenticación de dos factores (TOTP) verificada en sesión para acceder a `/api/central`.
  - `admin_agentico`: Reservado para agentes autónomos con permisos delimitados.
  - `NULL`: Personal y administradores de salón estándar, delimitados a su respectiva organización.

### 2.2 Ciclo de Vida de Credenciales y MUST_RESET
1. **Aprovisionamiento desde Central:** El superadmin crea miembros desde `/api/central` (acción `create-staff`). El sistema genera una contraseña criptográficamente segura (≥ 16 caracteres) devuelta una sola vez a Central, y marca `must_reset = true`.
2. **Hook de Bloqueo MUST_RESET:** Mientras `must_reset = true`, cualquier endpoint protegido retorna `403 Forbidden` (`MUST_RESET`), permitiendo únicamente las rutas `/change-password` y `/sign-out`.
3. **Restablecimiento:** Al enviar una nueva contraseña de al menos 10 caracteres a `/change-password`, el hook `after` de Better Auth limpia automáticamente la bandera `must_reset = false`.

### 2.3 Seguridad Perimetral y CORS
- **CORS Cerrado (G4 = 0):** Orígenes restringidos a `https://vanesev.com`, `https://www.vanesev.com`, subdominios exactos y la URL de previsualización en Vercel (`process.env.VERCEL_URL`). Se erradica por completo el comodín `*`.
- **Fuga de Información (G2 = 0):** Ningún endpoint de API expone `err.message` o trazas de pila.
- **Anti-Fallback de Secretos (G9 = 0):** Prohibido el uso de valores por defecto literales para variables sensibles.

---

## 3. Consecuencias

### Positivas
- Se unifica la autenticación de Central y salones bajo un motor seguro y probado (Better Auth) sin dependencias dispersas.
- El recuento de funciones serverless se mantiene en 10, respetando holgadamente el límite de 12 de Vercel Hobby.
- Integración transparente con el esquema de auditoría automatizada (`evidencias.yml`).

### Negativas / Deuda a resolver en B1-b
- Las pantallas visuales de inicio de sesión (`src/components/AdminAuthGate.tsx`) deben adaptarse en la Fase B1-b para consumir los endpoints de Better Auth en lugar de los métodos legacy ahora retirados.
