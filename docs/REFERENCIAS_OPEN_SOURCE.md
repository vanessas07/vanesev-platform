# AUDITORÍA DE REFERENCIAS OPEN SOURCE Y REPOSITORIOS EXTERNOS

- **Documento:** `docs/REFERENCIAS_OPEN_SOURCE.md`
- **Proyecto:** VANESEV (`vanesev.com`)
- **Directiva:** ORDEN PERMANENTE 2330 §1
- **Fecha de Verificación API GitHub:** 26 de Octubre de 2026
- **Estado:** VIGENTE · Marco de Atribución y Cumplimiento de Licencias

---

## 1. Política Estricta de Licenciamiento (Repositorio Público)

En virtud de la naturaleza pública del repositorio de VANESEV en GitHub (`vanessas07/vanesev-platform`):
1. **Sin Licencia Declarada (`null`):** **PROHIBIDO** copiar cualquier línea, bloque o función de código (derechos de autor reservados por defecto según el Convenio de Berna). Únicamente se permite el análisis conceptual de patrones de arquitectura.
2. **Licencias Copyleft Recíprocas (GPL / AGPL):** **PROHIBIDO** incorporar código, adaptarlo o traducirlo a VANESEV para evitar la contaminación de la base de código propietaria. Solo se permite extraer requerimientos de negocio lógicos (ej. cálculo de buffers de tiempo entre citas).
3. **Licencias Permisivas (MIT / Apache-2.0 / BSD):** Se autoriza su adopción priorizando su inclusión como **dependencia gestionada en `package.json`**. Si se incorpora un archivo o algoritmo puntual, debe documentarse en este archivo con enlace al commit exacto, autoría original y manteniendo la cabecera de licencia requerida.

---

## 2. Auditoría Oficial de Repositorios (Verificada con GitHub API)

Comando ejecutado para cada repositorio:
```powershell
gh api repos/<propietario>/<repo> --jq "{full_name, license: .license.spdx_id, stars: .stargazers_count, pushed_at}"
```

| Repositorio | Licencia SPDX | Estrellas | Último Push | Veredicto de Uso | Qué adoptamos y Dónde |
|---|---|---|---|---|---|
| `clawnify/OpenSalon` | **MIT** | 63 | 2026-10-21 | **Solo ideas.** No aporta robustez (SQLite + Hono sin multi-tenant). | Análisis conceptual de estructura de turnos en salón. Cero código copiado. |
| `caballerorandy6/rcbeautysalon` | **SIN LICENCIA** (`null`) | 2 | 2026-01-23 | **PROHIBIDO copiar código.** | Concepto de abonos previos en agenda (estudio de negocio para Bloque 6). Cero código copiado. |
| `MacroMaster101/Vero_Salon_Website` | **SIN LICENCIA** (`null`) | 1 | 2026-10-21 | **PROHIBIDO copiar código.** | Concepto de reservas «race-proof» (implementado por nosotros en PostgreSQL nativo vía `tstzrange &&`). Cero código copiado. |
| `vercel/platforms` | **SIN LICENCIA** (`null`) | 6.722 | 2026-07-08 | **Solo patrón de enrutado.** | Patrón de arquitectura multi-tenant por ruta canónica (`/m/<slug>` y `/<slug>/admin`). Cero archivos copiados. |
| `alextselegidis/easyappointments` | **GPL-3.0** | 4.461 | 2026-10-26 | **Solo lógica de negocio conceptual (GPL).** | Especificación funcional de reglas de antelación mínima, buffers de limpieza de sillón y gestión de descansos de especialistas. Cero código copiado. |
| `calcom/cal.diy` (`calcom/cal.com`) | **MIT** | 49.403 | 2026-10-26 | **Referencia principal de motor de citas.** | Modelo canónico de disponibilidad horaria, almacenamiento en UTC, visualización en huso local (`America/Caracas`) y exclusión de solapamientos a nivel de base de datos (`EXCLUDE USING gist`). |
| `better-auth/better-auth` | **MIT** | 30.476 | 2026-10-26 | **Candidato evaluado para autenticación.** | Evaluado en spike técnico (`spike/better-auth`) como solución estándar de sesiones seguras (`HttpOnly`, `SameSite=Lax`), plugin `organization` para salones y 2FA TOTP. |
| `boxyhq/saas-starter-kit` | **Apache-2.0** | 4.960 | 2026-07-20 | **Referencia de patrones SaaS.** | Patrón de modelo de datos para `audit_log` (registro de auditoría sin PII) y control de acceso basado en roles (`owner`, `admin`, `staff`). |
| `nextjs/saas-starter` | **MIT** | 16.231 | 2025-12-11 | **Referencia secundaria.** | Estructura de tiers de suscripción mensual y jerarquía de permisos de usuario. |
| `pilcrowonpaper/arctic` | **MIT** | 1.717 | 2026-08-08 | **Referencia para OAuth futuro.** | Patrón de integración OAuth ligero con Google y Apple en servidor puro si se implementa sin better-auth en Bloque 6. |

---

## 3. Registro de Atribución de Código Adoptado

Actualmente, **ningún archivo de terceros ha sido copiado íntegramente** dentro de `src/` ni `api/`. Toda implementación en VANESEV ha sido desarrollada desde cero siguiendo las especificaciones de diseño y seguridad de la plataforma. Si en el futuro se importa un algoritmo o módulo permisivo (MIT/Apache-2.0), deberá registrarse en la siguiente tabla antes de su fusión:

| Archivo en VANESEV | Repositorio Origen | Commit / Tag | Licencia | Modificaciones Realizadas |
|---|---|---|---|---|
| *(Ninguno a la fecha)* | — | — | — | Código 100% de autoría propia sobre estándares abiertos. |
