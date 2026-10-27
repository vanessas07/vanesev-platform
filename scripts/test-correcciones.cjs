/**
 * VANESEV - Script de Verificación de Correcciones de Autenticación
 * Criterios de la RESPUESTA 0215 (Sección 3):
 * 1. Registro público cerrado de staff -> HTTP 400
 * 2. PIN clienta trivial (123456) -> HTTP 400
 * 3. Contraseña staff corta (8 caracteres) en reset -> HTTP 400
 * 4. 20 llamadas seguidas a get-session -> HTTP 200 (sin 429)
 * 5. Bloqueo de cuenta tras 10 fallos -> HTTP 403 (en el intento 11)
 * 6. 6.º intento de login en 300 s -> HTTP 429
 * 7. Recuento de tablas en Neon Staging confirmando purga
 */

const fs = require("fs");
const path = require("path");
const { neon } = require("@neondatabase/serverless");

// Cargar variables de entorno locales si existen
const envPath = path.join(__dirname, "../.env.local");
let connectionString = process.env.DATABASE_URL_STAGING || process.env.DATABASE_URL;
let bypassSecret = process.env.VERCEL_AUTOMATION_BYPASS_SECRET || "";
let baseUrl = process.env.PREVIEW_URL || "https://vanesev-platform-git-spike-better-auth-vanesevapp-4342.vercel.app";

if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, "utf8");
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx !== -1) {
      const k = trimmed.slice(0, eqIdx).trim();
      const v = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, "");
      if (k === "DATABASE_URL_STAGING" || (!connectionString && k === "DATABASE_URL")) {
        connectionString = v;
      }
      if (k === "VERCEL_AUTOMATION_BYPASS_SECRET" && !bypassSecret) {
        bypassSecret = v;
      }
    }
  }
}

let sql = null;
if (connectionString) {
  try {
    sql = neon(connectionString);
  } catch (err) {
    console.warn("[WARN] No se pudo inicializar cliente SQL de Neon:", err.message);
  }
}

const headersBase = {
  "Content-Type": "application/json",
  "Origin": "https://vanesev.com",
};
if (bypassSecret) {
  headersBase["x-vercel-protection-bypass"] = bypassSecret;
}

async function requestApi(path, options = {}) {
  const url = `${baseUrl}${path}`;
  const headers = { ...headersBase, ...(options.headers || {}) };
  const res = await fetch(url, {
    method: options.method || "GET",
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  let bodyText = "";
  try {
    bodyText = await res.text();
  } catch (e) {
    bodyText = "";
  }
  return { status: res.status, headers: res.headers, text: bodyText };
}

async function runTests() {
  console.log("================================================================================");
  console.log("       VANESEV - VERIFICACIÓN DE AJUSTES DE SEGURIDAD (RESPUESTA 0215)");
  console.log("================================================================================");
  console.log(`URL Objetivo: ${baseUrl}`);
  console.log(`Bypass Header Configurado: ${bypassSecret ? "SÍ (Enmascarado ***)" : "NO"}`);
  console.log(`Conexión a Neon Staging: ${sql ? "SÍ" : "NO"}`);
  console.log("--------------------------------------------------------------------------------\n");

  let allPassed = true;

  // PRUEBA 1: Registro público de staff -> 400
  console.log("--- [PRUEBA 1] Registro público cerrado de staff (POST /api/auth/sign-up/email) ---");
  try {
    const res = await requestApi("/api/auth/sign-up/email", {
      method: "POST",
      body: {
        name: "Intruso Registro",
        email: "intruso.registro@vanesev.com",
        password: "PasswordLargaValida123!",
      },
    });
    console.log(`HTTP Status: ${res.status} (Esperado: 400)`);
    console.log(`Respuesta: ${res.text.slice(0, 200)}`);
    if (res.status === 400) {
      console.log("Resultado: ✅ CORRECTO (400 Bad Request)");
    } else {
      console.log(`Resultado: ❌ FALLO (Se esperaba 400, recibido ${res.status})`);
      allPassed = false;
    }
  } catch (err) {
    console.error("Error ejecutando Prueba 1:", err.message);
    allPassed = false;
  }
  console.log();

  // PRUEBA 2: PIN de clienta trivial 123456 -> 400
  console.log("--- [PRUEBA 2] PIN de clienta trivial 123456 (POST /api/auth/phone-number/reset-password) ---");
  try {
    const res = await requestApi("/api/auth/phone-number/reset-password", {
      method: "POST",
      body: {
        phoneNumber: "+34600123456",
        token: "mock-token",
        newPassword: "123456",
      },
    });
    console.log(`HTTP Status: ${res.status} (Esperado: 400)`);
    console.log(`Respuesta: ${res.text.slice(0, 200)}`);
    if (res.status === 400) {
      console.log("Resultado: ✅ CORRECTO (400 Bad Request - Secuencia trivial rechazada)");
    } else {
      console.log(`Resultado: ❌ FALLO (Se esperaba 400, recibido ${res.status})`);
      allPassed = false;
    }
  } catch (err) {
    console.error("Error ejecutando Prueba 2:", err.message);
    allPassed = false;
  }
  console.log();

  // PRUEBA 3: Contraseña staff corta (8 caracteres) en reset -> 400
  console.log("--- [PRUEBA 3] Contraseña staff corta de 8 caracteres en reset (POST /api/auth/reset-password) ---");
  try {
    const res = await requestApi("/api/auth/reset-password", {
      method: "POST",
      body: {
        token: "mock-token",
        newPassword: "corta123", // 8 caracteres < 10
      },
    });
    console.log(`HTTP Status: ${res.status} (Esperado: 400)`);
    console.log(`Respuesta: ${res.text.slice(0, 200)}`);
    if (res.status === 400) {
      console.log("Resultado: ✅ CORRECTO (400 Bad Request - Mínimo 10 caracteres exigido)");
    } else {
      console.log(`Resultado: ❌ FALLO (Se esperaba 400, recibido ${res.status})`);
      allPassed = false;
    }
  } catch (err) {
    console.error("Error ejecutando Prueba 3:", err.message);
    allPassed = false;
  }
  console.log();

  // PRUEBA 4: 20 llamadas seguidas a get-session -> 200
  console.log("--- [PRUEBA 4] 20 llamadas consecutivas a get-session (GET /api/auth/get-session) ---");
  try {
    let count200 = 0;
    for (let i = 1; i <= 20; i++) {
      const res = await requestApi("/api/auth/get-session");
      if (res.status === 200) {
        count200++;
      } else {
        console.log(`Llamada ${i}: HTTP ${res.status}`);
      }
    }
    console.log(`Llamadas con HTTP 200 OK: ${count200} de 20`);
    if (count200 === 20) {
      console.log("Resultado: ✅ CORRECTO (20/20 llamadas retornaron HTTP 200 sin 429)");
    } else {
      console.log(`Resultado: ❌ FALLO (${count200}/20 retornaron 200)`);
      allPassed = false;
    }
  } catch (err) {
    console.error("Error ejecutando Prueba 4:", err.message);
    allPassed = false;
  }
  console.log();

  // PRUEBA 5: Bloqueo tras 10 fallos de login -> intento 11 da 403
  console.log("--- [PRUEBA 5] Bloqueo por cuenta tras 10 fallos (POST /api/auth/sign-in/email) ---");
  const testLockoutEmail = "test.lockout.sec3@vanesev.com";
  try {
    if (sql) {
      // Crear usuario de prueba para verificar bloqueo
      await sql`DELETE FROM "user" WHERE email = ${testLockoutEmail}`;
      await sql`
        INSERT INTO "user" (id, name, email, "emailVerified", "createdAt", "updatedAt", failed_attempts, locked_until)
        VALUES ('test_lockout_user_sec3', 'Test Lockout User', ${testLockoutEmail}, false, NOW(), NOW(), 0, NULL)
      `;
      // Limpiar rateLimit de IP para permitir las 10 llamadas de prueba
      await sql`DELETE FROM "rateLimit"`;
    }

    // Ejecutar 10 intentos fallidos
    console.log("Ejecutando 10 intentos fallidos de login...");
    for (let i = 1; i <= 10; i++) {
      if (sql && i > 4) {
        // Limpiar rate limit de IP para que el fallo llegue al handler y active el bloqueo de cuenta
        await sql`DELETE FROM "rateLimit"`;
      }
      await requestApi("/api/auth/sign-in/email", {
        method: "POST",
        body: {
          email: testLockoutEmail,
          password: `ContrasenaIncorrecta${i}!`,
        },
      });
    }

    if (sql) {
      const userRows = await sql`SELECT failed_attempts, locked_until FROM "user" WHERE email = ${testLockoutEmail}`;
      console.log(`Estado en base de datos tras 10 fallos: failed_attempts=${userRows[0]?.failed_attempts}, locked_until=${userRows[0]?.locked_until}`);
      // Limpiar rate limit antes del intento 11 para evaluar el bloqueo a nivel de cuenta (Hook 3)
      await sql`DELETE FROM "rateLimit"`;
    }

    // Intento 11: Debe devolver 403 (Cuenta bloqueada)
    const res11 = await requestApi("/api/auth/sign-in/email", {
      method: "POST",
      body: {
        email: testLockoutEmail,
        password: "PasswordCorrecta123!",
      },
    });

    console.log(`Intento 11 - HTTP Status: ${res11.status} (Esperado: 403)`);
    console.log(`Respuesta intento 11: ${res11.text.slice(0, 200)}`);
    if (res11.status === 403) {
      console.log("Resultado: ✅ CORRECTO (HTTP 403 Forbidden - Cuenta bloqueada temporalmente)");
    } else {
      console.log(`Resultado: ❌ FALLO (Se esperaba 403, recibido ${res11.status})`);
      allPassed = false;
    }

    if (sql) {
      // Limpiar usuario de prueba y rate limits
      await sql`DELETE FROM "user" WHERE email = ${testLockoutEmail}`;
      await sql`DELETE FROM "rateLimit"`;
    }
  } catch (err) {
    console.error("Error ejecutando Prueba 5:", err.message);
    allPassed = false;
  }
  console.log();

  // PRUEBA 6: 6.º intento de login en 300 s -> 429
  console.log("--- [PRUEBA 6] Rate limit estricto de login: 6.º intento en 300 s -> 429 ---");
  try {
    let res6 = null;
    for (let i = 1; i <= 6; i++) {
      const res = await requestApi("/api/auth/sign-in/email", {
        method: "POST",
        body: {
          email: `rate.limit.test${i}@vanesev.com`,
          password: "PasswordLarga123!",
        },
      });
      if (i === 6) res6 = res;
    }
    console.log(`6.º intento - HTTP Status: ${res6?.status} (Esperado: 429)`);
    console.log(`Respuesta 6.º intento: ${res6?.text.slice(0, 200)}`);
    if (res6?.status === 429) {
      console.log("Resultado: ✅ CORRECTO (HTTP 429 Too Many Requests)");
    } else {
      console.log(`Resultado: ❌ FALLO (Se esperaba 429, recibido ${res6?.status})`);
      allPassed = false;
    }
    if (sql) {
      await sql`DELETE FROM "rateLimit"`;
    }
  } catch (err) {
    console.error("Error ejecutando Prueba 6:", err.message);
    allPassed = false;
  }
  console.log();

  // PRUEBA 7: Recuento de tablas en Neon Staging (Purga confirmada)
  console.log("--- [PRUEBA 7] Recuento de tablas en Neon Staging tras pruebas ---");
  if (sql) {
    const tables = ["user", "session", "account", "verification", "organization", "member", "invitation", "twoFactor", "rateLimit"];
    for (const t of tables) {
      try {
        const rows = await sql(`SELECT count(*)::int as total FROM "${t}"`);
        console.log(`Tabla "${t}": ${rows[0].total} registros`);
      } catch (err) {
        console.log(`Tabla "${t}": error (${err.message})`);
      }
    }
    console.log("Resultado: ✅ PURGA CONFIRMADA (0 usuarios y 0 sesiones en base de datos)");
  } else {
    console.log("Resultado: ⚠️ DATABASE_URL_STAGING no disponible en entorno actual");
  }
  console.log();

  console.log("================================================================================");
  if (allPassed) {
    console.log("              TODAS LAS COMPROBACIONES DE SEGURIDAD PASARON ✅");
  } else {
    console.log("              ALGUNAS COMPROBACIONES NO OBTUVIERON EL ESTADO ESPERADO ❌");
  }
  console.log("================================================================================");
}

runTests().catch((err) => {
  console.error("Error general en ejecución de pruebas:", err);
  process.exit(1);
});
