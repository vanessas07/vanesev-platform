/**
 * VANESEV - Script de Verificación de Correcciones de Autenticación
 * Cumplimiento estricto de la RESPUESTA 0330 (§6.1):
 * - Solo DATABASE_URL_STAGING (aborta si el host no es ep-nameless-math-b838isnk).
 * - En CI no se lee .env.local; nunca DATABASE_URL ni DATABASE_URL_PRODUCTION.
 * - Borrado exclusivo de filas de prueba (WHERE específico, nunca tablas completas).
 * - P5 crea fila user y account con hash real de Better Auth; intento 11 con contraseña CORRECTA -> 403.
 * - P7 decide el veredicto evaluando estrictamente que el recuento sea 0.
 * - process.exit(allPassed ? 0 : 1).
 */

const fs = require("fs");
const path = require("path");
const { neon } = require("@neondatabase/serverless");

// 1. Obtención estricta de credenciales de Staging (sin respaldo a producción ni genéricos)
let connectionString = process.env.DATABASE_URL_STAGING;
let bypassSecret = process.env.VERCEL_AUTOMATION_BYPASS_SECRET;

// En CI está terminantemente prohibido leer .env.local
if (!process.env.CI) {
  const envPath = path.join(__dirname, "../.env.local");
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, "utf8");
    for (const line of content.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eqIdx = trimmed.indexOf("=");
      if (eqIdx !== -1) {
        const k = trimmed.slice(0, eqIdx).trim();
        const v = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, "");
        if (k === "DATABASE_URL_STAGING" && !connectionString) {
          connectionString = v;
        }
        if (k === "VERCEL_AUTOMATION_BYPASS_SECRET" && !bypassSecret) {
          bypassSecret = v;
        }
      }
    }
  }
}

// 2. Validación de seguridad de base de datos: Staging exclusivo ep-nameless-math-b838isnk
if (!connectionString) {
  console.error("[FATAL] DATABASE_URL_STAGING no está definida en las variables de entorno.");
  process.exit(1);
}

let dbHost = "";
try {
  const parsedUrl = new URL(connectionString);
  dbHost = parsedUrl.hostname;
} catch (err) {
  console.error("[FATAL] Error parseando DATABASE_URL_STAGING:", err.message);
  process.exit(1);
}

if (!dbHost.includes("ep-nameless-math-b838isnk")) {
  console.error(`[FATAL] Host de base de datos no autorizado: "${dbHost}". Se exige estrictamente la rama de staging "ep-nameless-math-b838isnk". Abortando inmediatamente.`);
  process.exit(1);
}

const sql = neon(connectionString);

// 3. Configuración de cliente HTTP hacia la vista previa
const baseUrl = process.env.PREVIEW_URL || "https://vanesev-platform-git-spike-better-auth-vanesevapp-4342.vercel.app";
const headersBase = {
  "Content-Type": "application/json",
  "Origin": "https://vanesev.com",
};
if (bypassSecret) {
  headersBase["x-vercel-protection-bypass"] = bypassSecret;
}

async function requestApi(endpointPath, options = {}) {
  const url = `${baseUrl}${endpointPath}`;
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
  console.log("       VANESEV - VERIFICACIÓN DE AJUSTES DE SEGURIDAD (RESPUESTA 0330 §6)");
  console.log("================================================================================");
  console.log(`URL Objetivo: ${baseUrl}`);
  console.log(`Bypass Header Configurado: ${bypassSecret ? "SÍ (Enmascarado ***)" : "NO"}`);
  console.log(`Host Staging Verificado: ${dbHost} ✅`);
  console.log("--------------------------------------------------------------------------------\n");

  let allPassed = true;

  // PRUEBA 1: Registro público cerrado de staff -> HTTP 400
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

  // PRUEBA 2: PIN de clienta trivial 123456 -> HTTP 400
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

  // PRUEBA 3: Contraseña staff corta de 8 caracteres en reset -> HTTP 400
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

  // PRUEBA 4: 20 llamadas seguidas a get-session -> HTTP 200
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

  // PRUEBA 5: Bloqueo por cuenta tras 10 fallos e intento 11 con contraseña CORRECTA -> HTTP 403
  console.log("--- [PRUEBA 5] Bloqueo por cuenta tras 10 fallos e intento 11 con contraseña correcta (POST /api/auth/sign-in/email) ---");
  const testLockoutEmail = "test.lockout.sec3@vanesev.com";
  const testUserId = "test_lockout_user_sec3";
  const testAccountId = "test_lockout_account_sec3";
  const correctPassword = "PasswordValida123!";

  try {
    // 5.1 Obtener función oficial de hash de Better Auth (scrypt)
    let hashPasswordFn;
    try {
      const betterCrypto = await import("better-auth/crypto");
      hashPasswordFn = betterCrypto.hashPassword;
    } catch (importErr) {
      // Fallback cross-environment idéntico a la configuración scrypt de Better Auth
      const nodeCrypto = require("crypto");
      hashPasswordFn = async (pwd) => {
        const salt = nodeCrypto.randomBytes(16).toString("hex");
        const key = nodeCrypto.scryptSync(pwd.normalize("NFKC"), salt, 64, {
          N: 16384,
          r: 16,
          p: 1,
          maxmem: 128 * 16384 * 16 * 2,
        }).toString("hex");
        return `${key}:${salt}`;
      };
    }

    const hashedPassword = await hashPasswordFn(correctPassword);

    // 5.2 Limpieza quirúrgica de pruebas previas (SOLO filas de este test)
    await sql`DELETE FROM "account" WHERE "userId" = ${testUserId}`;
    await sql`DELETE FROM "user" WHERE id = ${testUserId} OR email = ${testLockoutEmail}`;
    await sql`DELETE FROM "rateLimit" WHERE key LIKE '%test.lockout%' OR key LIKE '%/sign-in/email%'`;

    // 5.3 Inserción de user y account con hash real
    await sql`
      INSERT INTO "user" (id, name, email, "emailVerified", "createdAt", "updatedAt", failed_attempts, locked_until)
      VALUES (${testUserId}, 'Test Lockout User', ${testLockoutEmail}, false, NOW(), NOW(), 0, NULL)
    `;
    await sql`
      INSERT INTO "account" (id, "accountId", "providerId", "userId", password, "createdAt", "updatedAt")
      VALUES (${testAccountId}, ${testUserId}, 'credential', ${testUserId}, ${hashedPassword}, NOW(), NOW())
    `;

    // 5.4 Ejecutar 10 intentos fallidos (contraseña errónea)
    console.log("Ejecutando 10 intentos fallidos de login con contraseña incorrecta...");
    for (let i = 1; i <= 10; i++) {
      if (i > 4) {
        // Limpiar rate limit de IP del test para asegurar que el fallo sea procesado a nivel de cuenta
        await sql`DELETE FROM "rateLimit" WHERE key LIKE '%/sign-in/email%'`;
      }
      await requestApi("/api/auth/sign-in/email", {
        method: "POST",
        body: {
          email: testLockoutEmail,
          password: `ContrasenaErronea${i}!`,
        },
      });
    }

    const userRows = await sql`SELECT failed_attempts, locked_until FROM "user" WHERE id = ${testUserId}`;
    console.log(`Estado en base de datos tras 10 fallos: failed_attempts=${userRows[0]?.failed_attempts}, locked_until=${userRows[0]?.locked_until}`);

    // Limpiar rate limit antes del intento 11 para que la respuesta sea evaluada por el Hook 3 de bloqueo de cuenta
    await sql`DELETE FROM "rateLimit" WHERE key LIKE '%/sign-in/email%'`;

    // 5.5 Intento 11: Realizado con la contraseña CORRECTA -> Debe retornar HTTP 403 Forbidden
    const res11 = await requestApi("/api/auth/sign-in/email", {
      method: "POST",
      body: {
        email: testLockoutEmail,
        password: correctPassword, // Contraseña correcta demostrada
      },
    });

    console.log(`Intento 11 (con contraseña correcta) - HTTP Status: ${res11.status} (Esperado: 403)`);
    console.log(`Respuesta intento 11: ${res11.text.slice(0, 200)}`);
    if (res11.status === 403) {
      console.log("Resultado: ✅ CORRECTO (HTTP 403 Forbidden - Cuenta bloqueada temporalmente pese a contraseña válida)");
    } else {
      console.log(`Resultado: ❌ FALLO (Se esperaba 403, recibido ${res11.status})`);
      allPassed = false;
    }

    // 5.6 Limpieza quirúrgica de filas de prueba (nunca tablas completas)
    await sql`DELETE FROM "account" WHERE "userId" = ${testUserId}`;
    await sql`DELETE FROM "user" WHERE id = ${testUserId}`;
    await sql`DELETE FROM "rateLimit" WHERE key LIKE '%test.lockout%' OR key LIKE '%/sign-in/email%'`;
  } catch (err) {
    console.error("Error ejecutando Prueba 5:", err.message);
    allPassed = false;
  }
  console.log();

  // PRUEBA 6: 6.º intento de login en 300 s -> HTTP 429
  console.log("--- [PRUEBA 6] Rate limit estricto de login: 6.º intento en 300 s -> 429 ---");
  try {
    let res6 = null;
    for (let i = 1; i <= 6; i++) {
      const res = await requestApi("/api/auth/sign-in/email", {
        method: "POST",
        body: {
          email: `rate.limit.test${i}@vanesev.com`,
          password: "PasswordLargaValida123!",
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

    // Limpieza quirúrgica del rateLimit de la prueba
    await sql`DELETE FROM "rateLimit" WHERE key LIKE '%rate.limit.test%' OR key LIKE '%/sign-in/email%'`;
  } catch (err) {
    console.error("Error ejecutando Prueba 6:", err.message);
    allPassed = false;
  }
  console.log();

  // PRUEBA 7: Recuento de tablas en Neon Staging tras pruebas (Confirmación estricta de Purga)
  console.log("--- [PRUEBA 7] Recuento de tablas en Neon Staging tras pruebas (Confirmación de Purga) ---");
  try {
    const tablesToCheck = ["user", "session", "account", "verification", "organization", "member", "invitation", "twoFactor"];
    let purgeClean = true;
    for (const t of tablesToCheck) {
      try {
        const rows = await sql(`SELECT count(*)::int as total FROM "${t}"`);
        const count = rows[0].total;
        console.log(`Tabla "${t}": ${count} registros`);
        if (count !== 0) {
          purgeClean = false;
        }
      } catch (err) {
        console.log(`Tabla "${t}": error (${err.message})`);
        purgeClean = false;
      }
    }

    // Consulta de rateLimit de control
    try {
      const rlRows = await sql`SELECT count(*)::int as total FROM "rateLimit"`;
      console.log(`Tabla "rateLimit": ${rlRows[0].total} registros`);
    } catch (err) {
      console.log(`Tabla "rateLimit": error (${err.message})`);
    }

    // El veredicto depende estrictamente de que el recuento sea cero
    if (purgeClean) {
      console.log("Resultado: ✅ CORRECTO (Purga confirmada: exactamente 0 registros en todas las tablas de autenticación)");
    } else {
      console.log("Resultado: ❌ FALLO (Existen registros residuales en tablas de prueba)");
      allPassed = false;
    }
  } catch (err) {
    console.error("Error ejecutando Prueba 7:", err.message);
    allPassed = false;
  }
  console.log();

  console.log("================================================================================");
  if (allPassed) {
    console.log("              TODAS LAS COMPROBACIONES DE SEGURIDAD PASARON ✅");
  } else {
    console.log("              ALGUNAS COMPROBACIONES NO OBTUVIERON EL ESTADO ESPERADO ❌");
  }
  console.log("================================================================================");

  // Veredicto final por código de salida para CI
  process.exit(allPassed ? 0 : 1);
}

runTests().catch((err) => {
  console.error("Error general en ejecución de pruebas:", err);
  process.exit(1);
});
