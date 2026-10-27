import { betterAuth } from "better-auth";
import { organization, twoFactor, phoneNumber } from "better-auth/plugins";
import { createAuthMiddleware, APIError } from "better-auth/api";
import pg from "pg";

const connectionString = process.env.DATABASE_URL || process.env.DATABASE_URL_STAGING;

const pool = new pg.Pool({
  connectionString,
  ssl: connectionString && !connectionString.includes("localhost") ? { rejectUnauthorized: true } : false,
});

// Orden B1-a §4.2: Sin respaldo CENTRAL_AUTH_SECRET: sin BETTER_AUTH_SECRET, throw.
const authSecret = process.env.BETTER_AUTH_SECRET;
if (!authSecret) {
  throw new Error("FATAL: Variable BETTER_AUTH_SECRET no está configurada.");
}

function resolveBaseUrl(): string {
  if (process.env.BETTER_AUTH_URL) return process.env.BETTER_AUTH_URL;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "https://vanesev.com";
}

export const auth = betterAuth({
  database: pool,
  secret: authSecret,
  baseURL: resolveBaseUrl(),
  appName: "VANESEV",
  user: {
    additionalFields: {
      platform_role: {
        type: "string",
        required: false,
        defaultValue: null,
        input: false, // Endpoints públicos no pueden escribir esta columna
      },
      must_reset: {
        type: "boolean",
        required: false,
        defaultValue: false,
        input: false, // Endpoints públicos no pueden escribir esta columna
      },
    },
  },
  emailAndPassword: {
    enabled: true,
    disableSignUp: true, // Registro público cerrado: staff entra únicamente por invitación/alta central
    minPasswordLength: 6, // Base mínima del motor; staff exige 10 al fijar/cambiar mediante hook
  },
  trustedOrigins: [
    "https://vanesev.com",
    "https://www.vanesev.com",
    "https://*.vanesev.com",
    ...(process.env.VERCEL_URL ? [`https://${process.env.VERCEL_URL}`] : []),
  ],
  rateLimit: {
    storage: "database",
    window: 60,
    max: 100, // Rate limit global permisivo (100 peticiones / 60 s) para no estrangular get-session
    customRules: {
      "/sign-in/email": {
        window: 300,
        max: 5,
      },
      "/sign-in/phone-number": {
        window: 300,
        max: 5,
      },
      "/sign-up/email": {
        window: 300,
        max: 5,
      },
      "/phone-number/send-otp": {
        window: 300,
        max: 5,
      },
      "/phone-number/reset-password": {
        window: 300,
        max: 5,
      },
      "/phone-number/verify": {
        window: 300,
        max: 5,
      },
      "/phone-number/request-password-reset": {
        window: 300,
        max: 5,
      },
      "/request-password-reset": {
        window: 300,
        max: 5,
      },
      "/forget-password": {
        window: 300,
        max: 5,
      },
      "/two-factor/send-otp": {
        window: 300,
        max: 5,
      },
      "/two-factor/verify-totp": {
        window: 300,
        max: 5,
      },
      "/two-factor/verify-backup-code": {
        window: 300,
        max: 5,
      },
      "/two-factor/verify-otp": {
        window: 300,
        max: 5,
      },
    },
  },
  advanced: {
    database: {
      validateSchema: false,
    },
  },
  hooks: {
    before: createAuthMiddleware(async (ctx) => {
      // Hook 1: Validación de PIN de Clienta (6 dígitos exactos, no trivial)
      if (ctx.path.startsWith("/phone-number/reset-password") || ctx.path.startsWith("/phone-number/verify")) {
        const body = ctx.body as Record<string, any> | undefined;
        const pin = body?.newPassword || body?.password;
        if (pin !== undefined) {
          const pinStr = String(pin).trim();
          if (!/^\d{6}$/.test(pinStr)) {
            throw new APIError("BAD_REQUEST", {
              message: "El PIN de clienta debe contener exactamente 6 dígitos numéricos.",
            });
          }
          if (/^(\d)\1{5}$/.test(pinStr)) {
            throw new APIError("BAD_REQUEST", {
              message: "El PIN no puede ser una repetición trivial (ej. 000000, 111111).",
            });
          }
          const trivialSequences = [
            "012345", "123456", "234567", "345678", "456789", "567890",
            "098765", "987654", "876543", "765432", "654321", "543210"
          ];
          if (trivialSequences.includes(pinStr)) {
            throw new APIError("BAD_REQUEST", {
              message: "El PIN no puede ser una secuencia numérica trivial (ej. 123456, 654321).",
            });
          }
        }
      }

      // Hook 2: Validación de contraseña para Staff y Admin (mínimo 10 caracteres en endpoints de fijar/cambiar)
      const isPasswordCreationOrChange =
        !ctx.path.startsWith("/phone-number/") &&
        (ctx.path.startsWith("/reset-password") ||
         ctx.path.startsWith("/change-password") ||
         ctx.path.includes("invitation") ||
         ctx.path.includes("invite-member"));

      if (isPasswordCreationOrChange) {
        const body = ctx.body as Record<string, any> | undefined;
        const pwd = body?.newPassword || body?.password;
        if (pwd !== undefined && String(pwd).length < 10) {
          throw new APIError("BAD_REQUEST", {
            message: "La contraseña de personal y administración debe tener al menos 10 caracteres.",
          });
        }
      }

      // Hook 3: Comprobación de bloqueo de cuenta tras intentos fallidos reiterados
      // Si la cuenta no existe, NO se lanza 403, permitiendo que Better Auth devuelva 401 genérico
      if (ctx.path.startsWith("/sign-in/email") || ctx.path.startsWith("/sign-in/phone-number")) {
        const body = ctx.body as Record<string, any> | undefined;
        const identifier = body?.email || body?.phoneNumber;
        if (identifier) {
          try {
            const res = await pool.query(
              `SELECT id, failed_attempts, locked_until FROM "user" WHERE email = $1 OR "phoneNumber" = $1 LIMIT 1`,
              [identifier]
            );
            if (res.rows.length > 0) {
              const u = res.rows[0];
              if (u.locked_until && new Date(u.locked_until) > new Date()) {
                const mins = Math.max(1, Math.ceil((new Date(u.locked_until).getTime() - Date.now()) / 60000));
                throw new APIError("FORBIDDEN", {
                  message: `Cuenta bloqueada temporalmente por reiterados fallos. Intente de nuevo en ${mins} minuto(s) o solicite recuperación OTP.`,
                });
              }
            }
          } catch (err: any) {
            if (err instanceof APIError) throw err;
            console.error("[AUTH] Error al verificar bloqueo de cuenta en base de datos:", err?.message || "Error desconocido");
          }
        }
      }

      // Hook 4: Tope adicional de send-otp por número de teléfono (máximo 3 envíos / hora en base de datos)
      if (ctx.path.startsWith("/phone-number/send-otp") || ctx.path.startsWith("/two-factor/send-otp")) {
        const body = ctx.body as Record<string, any> | undefined;
        const rawPhone = body?.phoneNumber || body?.phone;
        if (rawPhone) {
          const cleanPhone = String(rawPhone).replace(/\D/g, "");
          const key = `phone_otp:${cleanPhone}`;
          const oneHourAgo = Date.now() - 3600 * 1000;
          try {
            const res = await pool.query(
              `SELECT id, count, "lastRequest" FROM "rateLimit" WHERE key = $1`,
              [key]
            );
            if (res.rows.length > 0) {
              const row = res.rows[0];
              const lastReq = Number(row.lastRequest);
              if (lastReq > oneHourAgo) {
                if (row.count >= 3) {
                  throw new APIError("TOO_MANY_REQUESTS", {
                    message: "Límite de 3 envíos de OTP por hora excedido para este número.",
                  });
                }
                await pool.query(
                  `UPDATE "rateLimit" SET count = count + 1, "lastRequest" = $1 WHERE id = $2`,
                  [Date.now(), row.id]
                );
              } else {
                await pool.query(
                  `UPDATE "rateLimit" SET count = 1, "lastRequest" = $1 WHERE id = $2`,
                  [Date.now(), row.id]
                );
              }
            } else {
              const id = `rl_otp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
              await pool.query(
                `INSERT INTO "rateLimit" (id, key, count, "lastRequest") VALUES ($1, $2, 1, $3)`,
                [id, key, Date.now()]
              );
            }
          } catch (err: any) {
            if (err instanceof APIError) throw err;
            console.error("[AUTH] Error en rate limit de teléfono:", err?.message || "Error desconocido");
          }
        }
      }

      // Hook 5: Control de MUST_RESET (mientras must_reset = true, toda ruta salvo change-password y sign-out retorna 403)
      const isExemptResetPath =
        ctx.path.startsWith("/change-password") ||
        ctx.path.startsWith("/reset-password") ||
        ctx.path.startsWith("/sign-out") ||
        ctx.path.startsWith("/sign-in") ||
        ctx.path.startsWith("/two-factor");

      if (!isExemptResetPath) {
        try {
          const session = await auth.api.getSession({ headers: ctx.headers });
          if (session?.user && (session.user as any).must_reset) {
            throw new APIError("FORBIDDEN", {
              message: "Debe restablecer su contraseña antes de continuar (MUST_RESET).",
            });
          }
        } catch (err: any) {
          if (err instanceof APIError) throw err;
        }
      }
    }),
    after: createAuthMiddleware(async (ctx) => {
      // Ajuste de bloqueo por cuenta tras fallos seguidos
      if (ctx.path.startsWith("/sign-in/email") || ctx.path.startsWith("/sign-in/phone-number")) {
        const body = ctx.body as Record<string, any> | undefined;
        const identifier = body?.email || body?.phoneNumber;
        if (identifier) {
          const ret = ctx.context?.returned as any;
          const status = ctx.context?.response?.status;

          const isError =
            ret instanceof Error ||
            ret?.name === "APIError" ||
            ret?.status === 401 ||
            ret?.statusCode === 401 ||
            status === 401 ||
            ret?.body?.code === "INVALID_EMAIL_OR_PASSWORD";

          const isSuccess =
            !isError &&
            (ret?.user !== undefined || ret?.session !== undefined || status === 200);

          if (isSuccess) {
            await pool.query(
              `UPDATE "user" SET failed_attempts = 0, locked_until = NULL WHERE email = $1 OR "phoneNumber" = $1`,
              [identifier]
            ).catch((err) => {
              console.error("[AUTH] Error al resetear failed_attempts tras login exitoso:", err?.message || "Error desconocido");
            });
          } else if (isError) {
            await pool.query(
              `UPDATE "user" SET 
                failed_attempts = COALESCE(failed_attempts, 0) + 1,
                locked_until = CASE WHEN COALESCE(failed_attempts, 0) + 1 >= 10 THEN NOW() + INTERVAL '15 minutes' ELSE locked_until END
               WHERE email = $1 OR "phoneNumber" = $1`,
              [identifier]
            ).catch((err) => {
              console.error("[AUTH] Error al incrementar failed_attempts tras fallo:", err?.message || "Error desconocido");
            });
          }
        }
      }

      // Al verificar OTP (desbloqueo), limpiar contador de fallos
      if (ctx.path.startsWith("/phone-number/verify")) {
        const ret = ctx.context?.returned as any;
        const status = ctx.context?.response?.status;
        const isSuccess = (ret && !(ret instanceof Error) && ret?.status !== 401) || status === 200;
        if (isSuccess) {
          const body = ctx.body as Record<string, any> | undefined;
          if (body?.phoneNumber) {
            await pool.query(
              `UPDATE "user" SET failed_attempts = 0, locked_until = NULL WHERE "phoneNumber" = $1`,
              [body.phoneNumber]
            ).catch((err) => {
              console.error("[AUTH] Error al resetear failed_attempts tras OTP:", err?.message || "Error desconocido");
            });
          }
        }
      }

      // Al cambiar la contraseña exitosamente, retirar la bandera must_reset
      if (ctx.path.startsWith("/change-password")) {
        const ret = ctx.context?.returned as any;
        const status = ctx.context?.response?.status;
        const isSuccess = (ret && !(ret instanceof Error) && ret?.status !== 400 && ret?.status !== 401 && ret?.status !== 403) || status === 200;
        if (isSuccess) {
          try {
            const session = await auth.api.getSession({ headers: ctx.headers });
            if (session?.user?.id) {
              await pool.query(`UPDATE "user" SET must_reset = false WHERE id = $1`, [session.user.id]);
            }
          } catch (e: any) {
            console.error("[AUTH] Error al limpiar must_reset tras change-password:", e?.message || "Error desconocido");
          }
        }
      }
    }),
  },
  plugins: [
    organization({
      allowUserToCreateOrganization: false, // Creación de salones restringida a Central
    }),
    twoFactor({
      issuer: "VANESEV Central",
    }),
    phoneNumber({
      sendOTP: async ({ phoneNumber, code }) => {
        if (process.env.VERCEL_ENV === "production") {
          throw new Error("Canal de envío de OTP (WhatsApp) en producción no configurado. Se activará en Fase 6.");
        }
        console.log(`[SMS-OTP-GATEWAY] Para: ${phoneNumber} | Codigo: ${code}`);
      },
      sendPasswordResetOTP: async ({ phoneNumber, code }) => {
        if (process.env.VERCEL_ENV === "production") {
          throw new Error("Canal de envío de OTP (WhatsApp) en producción no configurado. Se activará en Fase 6.");
        }
        console.log(`[SMS-RESET-GATEWAY] Para: ${phoneNumber} | Codigo: ${code}`);
      },
      signUpOnVerification: {
        getTempEmail: (phone) => `${phone.replace(/[^0-9]/g, '')}@client.vanesev.internal`,
      },
    }),
  ],
});
