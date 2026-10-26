import { betterAuth } from "better-auth";
import { organization, twoFactor, phoneNumber } from "better-auth/plugins";
import pg from "pg";

const connectionString = process.env.DATABASE_URL || process.env.DATABASE_URL_STAGING;

const pool = new pg.Pool({
  connectionString,
  ssl: connectionString && !connectionString.includes("localhost") ? { rejectUnauthorized: false } : false,
});

export const auth = betterAuth({
  database: pool,
  secret: process.env.BETTER_AUTH_SECRET || process.env.CENTRAL_AUTH_SECRET || "vanesev_superadmin_auth_secret_key_32chars_min",
  baseURL: process.env.BETTER_AUTH_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "https://vanesev.com"),
  appName: "VANESEV",
  trustedOrigins: [
    "https://vanesev.com",
    "https://www.vanesev.com",
    "https://*.vanesev.com",
    ...(process.env.VERCEL_URL ? [`https://${process.env.VERCEL_URL}`] : []),
  ],
  rateLimit: {
    storage: "database",
    window: 10,
    max: 10,
    customRules: {
      "/sign-in/email": {
        window: 10,
        max: 3,
      },
      "/sign-in/phone-number": {
        window: 10,
        max: 3,
      },
    },
  },
  plugins: [
    organization({
      allowUserToCreateOrganization: true,
    }),
    twoFactor({
      issuer: "VANESEV Central",
    }),
    phoneNumber({
      sendOTP: async ({ phoneNumber, code }) => {
        // En preview / staging registramos el código OTP para verificar el flujo
        console.log(`[SMS-OTP-GATEWAY] Para: ${phoneNumber} | Codigo: ${code}`);
      },
      signUpOnVerification: {
        getTempEmail: (phone) => `${phone.replace(/[^0-9]/g, '')}@client.vanesev.internal`,
      },
    }),
  ],
});
