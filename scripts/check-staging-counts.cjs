const path = require("path");
const fs = require("fs");
const { neon } = require("@neondatabase/serverless");

const envPath = path.join(__dirname, "../.env.local");
let connectionString = process.env.DATABASE_URL_STAGING || process.env.DATABASE_URL;

if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, "utf8");
  for (const line of envContent.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx !== -1) {
      const k = trimmed.slice(0, eqIdx).trim();
      const v = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, "");
      if (k === "DATABASE_URL_STAGING" || (!connectionString && k === "DATABASE_URL")) {
        connectionString = v;
      }
    }
  }
}

if (!connectionString) {
  console.error("No se encontró DATABASE_URL_STAGING ni DATABASE_URL.");
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
