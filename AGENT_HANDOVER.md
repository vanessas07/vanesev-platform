# VANESEV (`vanesev.com`) — Traspaso técnico para agentes

> Reescrito por Claude Code (director técnico) el 27/10/2026. La versión anterior ordenaba
> `git push +staging:main` y `npx vercel --prod`, hoy prohibidos. Manda `AGENTS.md`; esto es un resumen.

## 1. Reglas operativas
1. **Sin compilación local** (`npm run build`, `tsc`, `vite build`, `vercel build`): el equipo tiene 3,83 GB de RAM. Los builds y las pruebas corren en GitHub Actions y en Vercel. Solo se permite `node --check` o `ts.transpileModule` para la sintaxis.
2. **Ramas:** se trabaja en `feat/...`. Nada llega a `staging` ni a `main` sin PR; `main` exige el APROBADO de Claude Code en `RESPUESTAS_CLAUDE`. Prohibidos el push directo, el force-push y `npx vercel --prod`.
3. **Evidencias:** las genera `.github/workflows/evidencias.yml` y las escribe y custodia Claude Code (`scripts/test-*.cjs`, decisión G-007). El agente ejecutor no los modifica.
4. **Aislamiento:** VANESEV no se mezcla con ningún otro proyecto (código, despliegues, memoria `mem.cjs --p vanesev`).
5. **Secretos:** nunca en el repo, en reportes ni en registros. Se crean por stdin en Vercel o en GitHub Actions.
6. **Neon:** las migraciones numeradas (`db/migrations/NNNN_*.sql`) se aplican solo en la rama de staging con `scripts/aplicar-migracion-staging.cjs`. Producción, solo con autorización escrita de karc0.

## 2. Invariantes de arquitectura (no romper)
- **Autenticación:** better-auth (`api/_better-auth.ts`, ruta `api/auth/[...all].ts`) con `organization` (salón = organización, `slug = tenants.id`), `twoFactor`, `phoneNumber` y `bearer`.
- **Sesión en las APIs:** siempre con `api/_session.ts` (`requireSession`, `requireTenantRole`, `requireCentral`). Para PATCH/DELETE: sesión primero (401), después buscar el registro, después el rol.
- **Central:** `platform_role = 'superadmin_decisivo'` + 2FA activo + sesión posterior a activarlo. `GET /api/central?mode=tenant_context` es la única vista pública (lista blanca).
- **Escrituras:** cada consulta lleva `WHERE tenant_id`; los ids y estados sensibles los genera el servidor; precios desde la base, nunca del cuerpo de la petición.
- **Freno de frecuencia:** `api/_limite.ts` (contador en Neon, IP o teléfono en HMAC con `IP_HASH_PEPPER`). Nunca en memoria.
- **QR:** `/r/<código>` (salón) y `/q/<código>` (campaña, solo Central) → `api/qr.ts`. Destinos solo internos (una sola `/` inicial); 302 sin caché.
- **RLS:** `executeWithTenantRls` de `api/_db.ts` **no garantiza RLS** (si falla el cambio de rol, repite la consulta sin él). El aislamiento real llega en el B2 (rol `vanesev_app` sin BYPASSRLS + RLS FORCE). Hasta entonces, el `WHERE tenant_id` es obligatorio.
- **ESM:** los imports relativos dentro de `api/` llevan la extensión `.js`.
- **Presupuesto de funciones (Vercel Hobby):** máximo 12. Los archivos de `api/` que empiezan por `_` no cuentan.
