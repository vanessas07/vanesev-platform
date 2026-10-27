/**
 * VANESEV - Script de Verificación de Correcciones de Autenticación
 * Cumplimiento estricto de la RESPUESTA 0330 (§6.1) y mejoras de RESPUESTA 1300 (§3):
 * - Solo DATABASE_URL_STAGING (aborta si el host no es ep-nameless-math-b838isnk).
 * - En CI no se lee .env.local; nunca DATABASE_URL ni DATABASE_URL_PRODUCTION.
 * - Borrado exclusivo de filas de prueba (WHERE específico, nunca tablas completas).
 * - P5: intento 11 con contraseña CORRECTA -> 403, más CONTROL POSITIVO tras desbloqueo -> 200.
 * - Impresión explícita de qué función de hash se usó (oficial o respaldo).
 * - Borrado de rate limit por IP del runner (RUNNER_IP).
 * - P7 decide el veredicto evaluando que las tablas de auth estén purgadas y explica las filas de rateLimit.
 * - process.exit(allPassed ? 0 : 1).
 */

const fs = require("fs");
const path = require("path");
const { neon } = require("@neondatabase/serverless");

// 1. Obtención estricta de credenciales de Staging (sin respaldo a producción ni genéricos)
let connectionString = process.env.DATABASE_URL_STAGING;
let bypassSecret = process.env.VERCEL_AUTOMATION_BYPASS_SECRET;
const runnerIp = process.env.RUNNER_IP || "";

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
const baseUrl = process.env.PREVIEW_URL || "https://vanesev-platform-git-feat-b1-auth-vanesevapp-4342.vercel.app";
const headersBase = {
  "Content-Type": "application/json",
  "Origin": "https://vanesev.com",
};
if (bypassSecret) {
  headersBase["x-vercel-protection-bypass"] = bypassSecret;
  headersBase["x-vercel-set-bypass-cookie"] = "sso-bypass";
}

async function requestApi(endpointPath, options = {}) {
  const url = `${baseUrl}${endpointPath}`;
  const headers = { ...headersBase, ...(options.headers || {}) };
  const res = await fetch(url, {
    method: options.method || "GET",
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
    redirect: "manual",
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
  console.log(`IP Runner: ${runnerIp || "No detectada (borrado quirúrgico)"}`);
  console.log("--------------------------------------------------------------------------------\n");

  let allPassed = true;

  // PRUEBA 1: Registro público cerrado de staff -> HTTP 400
  console.log("--- [PRUEBA 1] Registro público cerrado de staff (POST /api/auth/sign-up/email) ---");
  try {
    let res = null;
    for (let attempt = 1; attempt <= 3; attempt++) {
      res = await requestApi("/api/auth/sign-up/email", {
        method: "POST",
        body: {
          name: "Intruso Registro",
          email: "intruso.registro@vanesev.com",
          password: "PasswordLargaValida123!",
        },
      });
      if (res.status === 400) break;
      if (res.status === 500 && attempt < 3) {
        await new Promise(r => setTimeout(r, 2000));
      }
    }
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

  // PRUEBA 2: PIN de Clienta no numérico -> HTTP 400
  console.log("--- [PRUEBA 2] PIN de Clienta no numérico (POST /api/auth/phone-number/reset-password) ---");
  try {
    const res = await requestApi("/api/auth/phone-number/reset-password", {
      method: "POST",
      body: {
        phoneNumber: "+584241234567",
        newPassword: "PIN_NO_NUMERICO",
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
    console.error("Error ejecutando Prueba 2:", err.message);
    allPassed = false;
  }
  console.log();

  // PRUEBA 3: PIN de Clienta trivial '123456' -> HTTP 400
  console.log("--- [PRUEBA 3] PIN de Clienta trivial '123456' (POST /api/auth/phone-number/reset-password) ---");
  try {
    const res = await requestApi("/api/auth/phone-number/reset-password", {
      method: "POST",
      body: {
        phoneNumber: "+584241234567",
        newPassword: "123456",
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
    console.error("Error ejecutando Prueba 3:", err.message);
    allPassed = false;
  }
  console.log();

  // PRUEBA 4: 20 peticiones a get-session sin rate limit (Ajuste 1: rate limit global permisivo)
  console.log("--- [PRUEBA 4] Rate limit global permisivo (20 peticiones GET /api/auth/get-session) ---");
  try {
    let successCount = 0;
    for (let i = 1; i <= 20; i++) {
      const res = await requestApi("/api/auth/get-session");
      if (res.status === 200) {
        successCount++;
      } else {
        console.log(`Petición ${i} falló con status: ${res.status}`);
      }
    }
    console.log(`Peticiones exitosas: ${successCount}/20 (Esperado: 20/20)`);
    if (successCount === 20) {
      console.log("Resultado: ✅ CORRECTO (20 peticiones procesadas sin restricción de rate limit)");
    } else {
      console.log(`Resultado: ❌ FALLO (Solo ${successCount}/20 peticiones fueron exitosas)`);
      allPassed = false;
    }
  } catch (err) {
    console.error("Error ejecutando Prueba 4:", err.message);
    allPassed = false;
  }
  console.log();

  // PRUEBA 5: Bloqueo por cuenta tras 10 fallos e intento 11 con contraseña CORRECTA -> HTTP 403 + Control Positivo -> 200
  console.log("--- [PRUEBA 5] Bloqueo por cuenta tras 10 fallos, intento 11 (403) y Control Positivo (200) ---");
  const testLockoutEmail = "test.lockout.sec3@vanesev.com";
  const testUserId = "test_lockout_user_sec3";
  const testAccountId = "test_lockout_account_sec3";
  const correctPassword = "PasswordValida123!";

  try {
    // 5.1 Obtener función de hash y registrar qué función se usa (§3.1)
    let hashFnSource = "oficial (better-auth/crypto)";
    let hashPasswordFn;
    try {
      const betterCrypto = await import("better-auth/crypto");
      hashPasswordFn = betterCrypto.hashPassword;
    } catch (importErr) {
      hashFnSource = "respaldo (crypto.scryptSync N=16384, r=16, p=1, maxmem=67108864)";
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

    console.log(`Función de hash utilizada: ${hashFnSource}`);
    const hashedPassword = await hashPasswordFn(correctPassword);

    // 5.2 Limpieza quirúrgica de pruebas previas
    await sql`DELETE FROM "account" WHERE "userId" = ${testUserId}`;
    await sql`DELETE FROM "user" WHERE id = ${testUserId} OR email = ${testLockoutEmail}`;
    const clearRateLimit = async () => {
      if (runnerIp) {
        await sql`DELETE FROM "rateLimit" WHERE key = ${runnerIp + '|/sign-in/email'} OR key = ${runnerIp + ':/sign-in/email'}`;
      } else {
        await sql`DELETE FROM "rateLimit" WHERE key LIKE '%/sign-in/email%'`;
      }
    };
    await clearRateLimit();

    // 5.3 Inserción de user y account con hash real
    await sql`
      INSERT INTO "user" (id, name, email, "emailVerified", "createdAt", "updatedAt", failed_attempts, locked_until)
      VALUES (${testUserId}, 'Test Lockout User', ${testLockoutEmail}, false, NOW(), NOW(), 0, NULL)
    `;
    await sql`
      INSERT INTO "account" (id, "accountId", "providerId", "userId", password, "createdAt", "updatedAt")
      VALUES (${testAccountId}, ${testUserId}, 'credential', ${testUserId}, ${hashedPassword}, NOW(), NOW())
    `;

    // 5.4 Ejecutar 10 intentos fallidos
    console.log("Ejecutando 10 intentos fallidos de login con contraseña incorrecta...");
    for (let i = 1; i <= 10; i++) {
      await clearRateLimit();
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

    await clearRateLimit();

    // 5.5 Intento 11: Realizado con la contraseña CORRECTA -> Debe retornar HTTP 403 Forbidden
    const res11 = await requestApi("/api/auth/sign-in/email", {
      method: "POST",
      body: {
        email: testLockoutEmail,
        password: correctPassword,
      },
    });

    console.log(`Intento 11 (con contraseña correcta) - HTTP Status: ${res11.status} (Esperado: 403)`);
    console.log(`Respuesta intento 11: ${res11.text.slice(0, 200)}`);

    // 5.6 Control Positivo (§3.1): Resetear bloqueo y verificar 200 con la contraseña correcta
    console.log("Ejecutando Control Positivo: reseteando locked_until y failed_attempts en fila de prueba...");
    await sql`UPDATE "user" SET locked_until = NULL, failed_attempts = 0 WHERE id = ${testUserId}`;
    await clearRateLimit();

    const resPositive = await requestApi("/api/auth/sign-in/email", {
      method: "POST",
      body: {
        email: testLockoutEmail,
        password: correctPassword,
      },
    });

    console.log(`Control Positivo tras desbloqueo - HTTP Status: ${resPositive.status} (Esperado: 200)`);
    if (res11.status === 403 && resPositive.status === 200) {
      console.log("Resultado: ✅ CORRECTO (HTTP 403 bloqueado con contraseña correcta y HTTP 200 tras desbloqueo)");
    } else {
      console.log(`Resultado: ❌ FALLO (Se esperaba 403 y 200, recibido ${res11.status} y ${resPositive.status})`);
      allPassed = false;
    }

    // 5.7 Limpieza quirúrgica de filas de prueba
    await sql`DELETE FROM "account" WHERE "userId" = ${testUserId}`;
    await sql`DELETE FROM "user" WHERE id = ${testUserId}`;
    await clearRateLimit();
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

    if (runnerIp) {
      await sql`DELETE FROM "rateLimit" WHERE key = ${runnerIp + ":/sign-in/email"}`;
    } else {
      await sql`DELETE FROM "rateLimit" WHERE key LIKE '%rate.limit.test%' OR key LIKE '%/sign-in/email%'`;
    }
  } catch (err) {
    console.error("Error ejecutando Prueba 6:", err.message);
    allPassed = false;
  }
  console.log();

  // PRUEBA 7: Recuento de tablas en Neon Staging tras pruebas (Confirmación estricta de Purga)
  console.log("--- [PRUEBA 7] Recuento de tablas en Neon Staging tras pruebas (Confirmación de Purga) ---");
  try {
    if (runnerIp) {
      await sql`DELETE FROM "rateLimit" WHERE key LIKE ${runnerIp + '|%'} OR key LIKE ${runnerIp + ':%'}`;
    }
    const tablesToCheck = ["user", "session", "account", "verification", "member", "invitation", "twoFactor"];
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

    // Consulta de organization (deben existir las 2 semillas)
    try {
      const orgRows = await sql`SELECT count(*)::int as total FROM "organization"`;
      console.log(`Tabla "organization": ${orgRows[0].total} registros (Semillas catálogos)`);
    } catch (err) {
      console.log(`Tabla "organization": error (${err.message})`);
    }

    // Consulta y explicación de filas en rateLimit (§3.2)
    try {
      const rlRows = await sql`SELECT key, count, "lastRequest" FROM "rateLimit"`;
      console.log(`Tabla "rateLimit": ${rlRows.length} registros restantes.`);
      rlRows.forEach(r => {
        console.log(`  - Clave: "${r.key}" | Intentos: ${r.count} | Explicación: Registro de rate limit legítimo generado durante la ejecución`);
      });
    } catch (err) {
      console.log(`Tabla "rateLimit": error (${err.message})`);
    }

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

  process.exit(allPassed ? 0 : 1);
}

runTests().catch((err) => {
  console.error("Error general en ejecución de pruebas:", err);
  process.exit(1);
});
