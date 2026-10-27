import { fromNodeHeaders } from 'better-auth/node';
import { auth } from './_better-auth.js';
import { getDb } from './_db.js';

export interface AuthSuccess {
  status: 200;
  user: any;
  session: any;
  role?: string;
  error: null;
}

export interface AuthFailure {
  status: 400 | 401 | 403 | 503;
  error: string;
  code?: string;
  user: null;
  session: null;
  role?: undefined;
}

export type AuthResult = AuthSuccess | AuthFailure;

/**
 * Valida la sesión del usuario mediante Better Auth usando fromNodeHeaders(req.headers).
 * Soporta de forma nativa tanto cookies firmadas como cabecera 'Authorization: Bearer <token>'.
 * Si el usuario tiene la bandera must_reset = true, rechaza de forma tajante con HTTP 403 MUST_RESET.
 * Sin SQL manual de tokens.
 */
export async function requireSession(req: any): Promise<AuthResult> {
  try {
    const headers = fromNodeHeaders(req.headers || {});
    const session = await auth.api.getSession({ headers });

    if (!session || !session.user) {
      return {
        status: 401,
        error: 'Unauthorized: Sesión requerida para acceder a este recurso.',
        user: null,
        session: null,
      };
    }

    const user = session.user as any;
    if (user.must_reset) {
      return {
        status: 403,
        error: 'Forbidden: Debe restablecer su contraseña antes de continuar (MUST_RESET).',
        code: 'MUST_RESET',
        user: null,
        session: null,
      };
    }

    return {
      status: 200,
      user,
      session: session.session,
      error: null,
    };
  } catch (err: any) {
    return {
      status: 401,
      error: 'Unauthorized: Error al validar la sesión de usuario.',
      user: null,
      session: null,
    };
  }
}

/**
 * Exige sesión activa y membresía en la organización especificada con uno de los roles permitidos,
 * o bien rol de plataforma superadmin_decisivo.
 */
export async function requireTenantRole(
  req: any,
  tenantId: string,
  allowedRoles: string[]
): Promise<AuthResult> {
  const sessionResult = await requireSession(req);
  if (sessionResult.status !== 200) {
    return sessionResult;
  }

  const { user, session } = sessionResult;

  // Superadmin de plataforma tiene acceso irrestricto
  if (user.platform_role === 'superadmin_decisivo') {
    return {
      status: 200,
      user,
      session,
      role: 'superadmin_decisivo',
      error: null,
    };
  }

  const cleanTenant = String(tenantId || '').trim().toLowerCase();
  if (!cleanTenant) {
    return {
      status: 400,
      error: 'Bad Request: Identificador de salón (tenant) requerido.',
      user: null,
      session: null,
    };
  }

  const sql = getDb();
  if (!sql) {
    return {
      status: 503,
      error: 'Service Unavailable: Base de datos no disponible.',
      user: null,
      session: null,
    };
  }

  try {
    const memberRows = await sql`
      SELECT m.role 
      FROM "member" m
      JOIN "organization" o ON m."organizationId" = o.id
      WHERE m."userId" = ${user.id} AND o.slug = ${cleanTenant}
      LIMIT 1;
    `;

    if (memberRows.length === 0) {
      return {
        status: 403,
        error: `Forbidden: No pertenece a la organización '${cleanTenant}'.`,
        user: null,
        session: null,
      };
    }

    const memberRole = String(memberRows[0].role).toLowerCase();
    const cleanAllowed = allowedRoles.map((r) => r.toLowerCase());

    if (!cleanAllowed.includes(memberRole)) {
      return {
        status: 403,
        error: `Forbidden: Rol insuficiente ('${memberRole}'). Se requiere uno de: ${allowedRoles.join(', ')}.`,
        user: null,
        session: null,
      };
    }

    return {
      status: 200,
      user,
      session,
      role: memberRole,
      error: null,
    };
  } catch (err: any) {
    return {
      status: 403,
      error: 'Forbidden: Error al verificar permisos en la organización.',
      user: null,
      session: null,
    };
  }
}

/**
 * Exige rol superadmin_decisivo y validación estricta de 2FA en la sesión para Central.
 * Rechaza sesiones creadas antes de la activación de 2FA.
 */
export async function requireCentral(req: any): Promise<AuthResult> {
  const sessionResult = await requireSession(req);
  if (sessionResult.status !== 200) {
    return sessionResult;
  }

  const { user, session } = sessionResult;

  if (user.platform_role !== 'superadmin_decisivo') {
    return {
      status: 403,
      error: 'Forbidden: Requiere rol superadmin_decisivo para acceder a Central.',
      user: null,
      session: null,
    };
  }

  const sql = getDb();
  if (!sql) {
    return {
      status: 503,
      error: 'Service Unavailable: Base de datos no disponible.',
      user: null,
      session: null,
    };
  }

  try {
    const tfRows = await sql`
      SELECT "updatedAt", verified 
      FROM "twoFactor" 
      WHERE "userId" = ${user.id} AND (verified = true OR verified IS NULL)
      LIMIT 1;
    `;

    if (tfRows.length === 0 || !user.twoFactorEnabled) {
      return {
        status: 403,
        error: 'Forbidden: Se requiere autenticación de dos factores (2FA) configurada y verificada en la cuenta.',
        user: null,
        session: null,
      };
    }

    const tf = tfRows[0];
    const sessCreated = new Date(session.createdAt || session.created_at || Date.now()).getTime();
    const tfTimestamp = tf.updatedAt ? new Date(tf.updatedAt).getTime() : 0;

    // Si la sesión fue creada antes de activar o actualizar el 2FA, se rechaza
    if (tfTimestamp > 0 && sessCreated < tfTimestamp - 5000) {
      return {
        status: 403,
        error: 'Forbidden: Sesión creada antes de activar 2FA. Inicie sesión nuevamente con su segundo factor.',
        user: null,
        session: null,
      };
    }

    return {
      status: 200,
      user,
      session,
      role: 'superadmin_decisivo',
      error: null,
    };
  } catch (err: any) {
    return {
      status: 403,
      error: 'Forbidden: Error validando segundo factor de autenticación para Central.',
      user: null,
      session: null,
    };
  }
}
