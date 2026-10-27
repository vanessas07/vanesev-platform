const path = require("path");
const fs = require("fs");
const { neon } = require("@neondatabase/serverless");

let connectionString = process.env.DATABASE_URL_STAGING;

if (!process.env.CI) {
  const envPath = path.join(__dirname, "../.env.local");
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, "utf8");
    for (const line of envContent.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eqIdx = trimmed.indexOf("=");
      if (eqIdx !== -1) {
        const k = trimmed.slice(0, eqIdx).trim();
        const v = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, "");
        if (k === "DATABASE_URL_STAGING" && !connectionString) {
          connectionString = v;
        }
      }
    }
  }
}

if (!connectionString) {
  console.error("[FATAL] DATABASE_URL_STAGING no encontrada.");
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
  console.error(`[FATAL] Host no autorizado: "${dbHost}". Se exige exclusivamente ep-nameless-math-b838isnk.`);
  process.exit(1);
}

const sql = neon(connectionString);

async function main() {
  const tables = ["user", "session", "account", "verification", "organization", "member", "invitation", "twoFactor", "rateLimit"];
  console.log("=== RECUENTO DE TABLAS EN NEON STAGING ===");
  for (const t of tables) {
    try {
      const res = await sql(`SELECT count(*)::int as total FROM "${t}"`);
      console.log(`Tabla "${t}": ${res[0].total} registros`);
    } catch (err) {
      console.log(`Tabla "${t}": no existe o error (${err.message})`);
    }
  }
}

main().catch((err) => {
  console.error("Error al consultar:", err.message);
  process.exit(1);
});
