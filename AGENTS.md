# CONSTITUCIÓN Y REGLAS DE GOBERNANZA — VANESEV BEAUTY & WELLNESS CLOUD

> **IMPORTANTE PARA TODOS LOS AGENTES (CLAUDE CODE, GEMINI FLASH, ARGÓN, COPILOT, ETC.):**
> Este documento rige de manera obligatoria e ineludible cualquier intervención en este repositorio.
> Todo agente que lea este archivo DEBE acatar estas directrices sin excepción.

---

## 1. Identidad y Naturaleza del Proyecto
1. **Este proyecto es VANESEV (vanesev.com)**: Una plataforma SaaS multi-tenant para salones de belleza, estética, peluquerías, nail bars y spas de autor.
2. **NO es un proyecto monocliente ni exclusivo de Andrea Labrador**:
   - `andrea-nails` fue un salón histórico inicial, hoy aislado como tenant legacy secundario.
   - `capra-studio` es el salón de referencia oficial activo en producción.
   - **TERMINANTEMENTE PROHIBIDO** asumir que el proyecto pertenece a un solo salón o mezclar datos, catálogos, imágenes, tokens, redes sociales o números de WhatsApp entre tenants o en la web comercial raíz.

---

## 2. Las 5 Zonas Arquitectónicas Estrictas (Sin Cruce de Contextos)

El sistema opera bajo 5 zonas con aislamiento absoluto:

| Zona | Ruta URL | Audiencia / Acceso | Regla de Oro |
|---|---|---|---|
| **Zona 1: Web Comercial** | `vanesev.com/` | Público general, dueños de salones | Embudo de ventas, catálogo interactivo demo, precios a medida, WhatsApp comercial (+58 422-3794800). **Cero botones o enlaces a login/admin públicos**. |
| **Zona 2: VANESEV Central** | `vanesev.com/central` | Super-Admin exclusivo (karc0) | Gobernanza global de la plataforma, aprobación de altas, métricas de tenants, roadmap y soporte. Protegido por sesión autenticada. |
| **Zona 3: Admin del Salón** | `vanesev.com/<slug>/admin` | Dueño / Gerente del Salón | Configuración de servicios, especialistas, zonas/cabinas, paleta cromática, tipografía y Pasaporte VIP. Aislado por `tenant_id`. |
| **Zona 4: Catálogo Público PWA** | `vanesev.com/m/<slug>` | Clienta del salón | Carta digital QR, selección de especialista, turnos disponibles y envío de reserva a WhatsApp del salón. Aislado por `tenant_id`. |
| **Zona 5: Ficha Admin / Panel Staff** | `vanesev.com/<slug>/staff` | Especialistas / Recepción | Vista restringida de agenda diaria, turnos asignados y validación de sellos VIP. Sin acceso a finanzas globales ni configuración del tenant. |

---

## 3. Restricción de Hardware y Protocolo de Compilación (Celeron N4120 / 3.83 GB RAM)
- El entorno de desarrollo local tiene hardware limitado (Intel Celeron N4120, 3.83 GB RAM).
- **PROHIBICIÓN ABSOLUTA:** NUNCA ejecutar compilaciones locales masivas:
  - ❌ `npm run build`
  - ❌ `tsc` / `npx tsc`
  - ❌ `vite build`
  - ❌ `vercel build`
- **Verificación local permitida:**
  - Verificación sintáctica ligera vía Node / `ts.transpileModule` (en scripts unitarios de < 2 segundos).
- **Despliegues a Producción:**
  - Todo build de producción se ejecuta **en los servidores cloud de Vercel**.
  - Flujo Git-First: cambios probados sintácticamente -> `git add .` -> `git commit -m "..."` -> push a `staging` -> merge a `main` -> `npx vercel --prod --yes` (sin build local previo).

---

## 4. Reglas de Aislamiento Multi-Tenant en Base de Datos (Neon PostgreSQL)
1. **Clave Foránea Obligatoria (`tenant_id`)**:
   - Toda consulta a `services`, `bookings`, `loyalty_cards`, `staff_members`, `studio_zones`, `studio_settings`, `qr_codes` DEBE incluir `WHERE tenant_id = $1`.
   - Queda prohibido consultar tablas de clientes sin especificar el `tenant_id`.
2. **Tarjetas de Fidelidad (`loyalty_cards`)**:
   - La clave primaria o de unicidad en Neon debe ser compuesta: `(tenant_id, phone)`, jamás el teléfono solo.
3. **Imágenes y Multimedia**:
   - Las imágenes de un salón residen bajo su propia carpeta o prefijo (ej: `/capra/...`, `/vanesev/...`).
   - Jamás mostrar fotografías de un salón dentro del catálogo o admin de otro salón.

---

## 5. Integración con Memoria Local Compartida (`mem.cjs`)
Por directriz del usuario karc0 (verificada en `RULE[user_global]`):
- Al iniciar cualquier tarea: `node --no-warnings C:\Users\karc0\.claude\memoria\mem.cjs resumen --p dkitchen`
- Al finalizar cualquier tarea: registrar `hecho`, `pendiente` o `leccion` con `--agente <nombre>`.
- Prohibido almacenar contraseñas, tokens de Neon o credenciales en texto plano.

---

## 6. Inspiración y Dedicatoria de Autor a Vanessa
- El nombre **VANESEV** es un homenaje y regalo de cumpleaños #7 de su padre (karc0) a su hija Vanessa.
- La web comercial mantiene guiños sutiles, permanentes y de alta elegancia:
  - Subtítulo de marca en Navbar: `Dedicado a Vanessa · Suite Digital`
  - Pill en Hero: `Inspirado en Vanessa · Suite Tecnológica de Autor para Salones`
  - Badge VIP en simulador 3D: `Pasaporte VIP #001 · Vanessa V. — Cliente Fundadora 🩷`
  - Footer de autor: `Creado con amor e inspirado en Vanessa`
- Estos elementos deben mantenerse con la máxima sofisticación y sobriedad comercial.
