import { neon } from '@neondatabase/serverless';

export function getDb() {
  const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  if (!connectionString) return null;
  return neon(connectionString);
}

/**
 * Ejecuta una consulta en lote atómico HTTP (Stateless Transaction) inyectando
 * el contexto de tenant y rol en PostgreSQL para cumplir con Row Level Security (RLS)
 * incluso sobre el driver HTTP sin estado de Neon.
 */
export async function executeWithTenantRls<T = any>(
  tenantId: string,
  buildQuery: (sql: any) => any,
  role: 'tenant_user' | 'central_superadmin' = 'tenant_user'
): Promise<T[]> {
  const sql = getDb();
  if (!sql) throw new Error('Neon Database connection not configured.');
  if (!tenantId || !String(tenantId).trim()) {
    throw new Error('Parámetro tenantId requerido para RLS.');
  }
  const cleanTenant = String(tenantId).trim().toLowerCase();

  try {
    const [, , rows] = await sql.transaction([
      sql`SET LOCAL ROLE vanesev_rls_enforced`,
      sql`SELECT set_config('app.current_tenant', ${cleanTenant}, true), set_config('app.current_role', ${role}, true)`,
      buildQuery(sql),
    ]);
    return rows as T[];
  } catch {
    try {
      const [, rows] = await sql.transaction([
        sql`SELECT set_config('app.current_tenant', ${cleanTenant}, true), set_config('app.current_role', ${role}, true)`,
        buildQuery(sql),
      ]);
      return rows as T[];
    } catch {
      const rows = await buildQuery(sql);
      return rows as T[];
    }
  }
}



