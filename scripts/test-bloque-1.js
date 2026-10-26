// ==============================================================================
// VANESEV Bloque 1 Security & Authentication Verification Test Matrix (ESM)
// Tests OK/MAL cases for system_superadmins, 2FA, Cookies, Central Lock, Revocation.
// ==============================================================================
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment from .env.local
const envPath = path.resolve(__dirname, '../.env.local');
if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, 'utf8');
  content.split(/\r?\n/).forEach(line => {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      const val = match[2].trim().replace(/^["']|["']$/g, '');
      if (!process.env[key]) process.env[key] = val;
    }
  });
}

// Target Staging DB for these tests
if (process.env.DATABASE_URL_STAGING) {
  process.env.DATABASE_URL = process.env.DATABASE_URL_STAGING;
}

import { neon } from '@neondatabase/serverless';
import { computeTOTP } from '../api/_auth.js';
import authHandler from '../api/auth.ts';
import centralHandler from '../api/central.ts';

function createMockReqRes({ method = 'GET', query = {}, body = {}, headers = {} } = {}) {
  const req = {
    method,
    query,
    body,
    headers: {
      origin: 'https://vanesev.com',
      'user-agent': 'VanesevSecurityTester/1.0',
      ...headers,
    },
    socket: { remoteAddress: '127.0.0.1' },
  };

  let statusCode = 200;
  let responseData = null;
  const responseHeaders = {};

  const res = {
    setHeader(key, val) {
      responseHeaders[key.toLowerCase()] = val;
      return res;
    },
    getHeader(key) {
      return responseHeaders[key.toLowerCase()];
    },
    status(code) {
      statusCode = code;
      return res;
    },
    json(data) {
      responseData = data;
      return res;
    },
    end() {
      return res;
    },
  };

  return { req, res, getResult: () => ({ status: statusCode, data: responseData, headers: responseHeaders }) };
}

async function runTests() {
  console.log('================================================================');
  console.log('       RUNNING VANESEV BLOQUE 1 SECURITY TEST SUITE (11 CASES)  ');
  console.log('================================================================\n');

  const testEmail = process.env.TEST_SUPERADMIN_EMAIL;
  const testPassword = process.env.TEST_SUPERADMIN_PASSWORD;

  if (!testEmail || !testPassword) {
    throw new Error(
      'FATAL: Variables de entorno obligatorias TEST_SUPERADMIN_EMAIL o TEST_SUPERADMIN_PASSWORD no configuradas. Por seguridad, no se admiten credenciales en el repositorio.'
    );
  }
  const results = [];

  // Fetch superadmin to get TOTP secret and recovery codes
  const sql = neon(process.env.DATABASE_URL);
  const users = await sql`SELECT * FROM public.system_superadmins WHERE email = ${testEmail} LIMIT 1;`;
  if (users.length === 0) {
    throw new Error('Superadmin not found in database. Run create-superadmin.cjs first.');
  }
  const superadmin = users[0];
  const totpSecret = superadmin.totp_secret;

  // ---------------------------------------------------------------------------
  // Case 1: GET /api/central without session -> 401
  // ---------------------------------------------------------------------------
  {
    const { req, res, getResult } = createMockReqRes({ method: 'GET' });
    await centralHandler(req, res);
    const r = getResult();
    const ok = r.status === 401;
    results.push({ caseId: 1, name: 'GET /api/central sin sesión', expected: 401, actual: r.status, pass: ok });
    console.log(`[Case 1] GET /api/central sin sesión -> Status: ${r.status} [${ok ? 'PASS' : 'FAIL'}]`);
  }

  // ---------------------------------------------------------------------------
  // Case 2: POST /api/central sin sesión -> 401
  // ---------------------------------------------------------------------------
  {
    const { req, res, getResult } = createMockReqRes({
      method: 'POST',
      body: { action: 'review_session', payload: { id: 'sess-1' } },
    });
    await centralHandler(req, res);
    const r = getResult();
    const ok = r.status === 401;
    results.push({ caseId: 2, name: 'POST /api/central sin sesión', expected: 401, actual: r.status, pass: ok });
    console.log(`[Case 2] POST /api/central sin sesión -> Status: ${r.status} [${ok ? 'PASS' : 'FAIL'}]`);
  }

  // ---------------------------------------------------------------------------
  // Case 3: POST /api/auth?scope=central login contraseña errónea -> 401
  // ---------------------------------------------------------------------------
  {
    const { req, res, getResult } = createMockReqRes({
      method: 'POST',
      query: { scope: 'central' },
      body: { action: 'login', email: testEmail, password: 'WrongPassword123' },
    });
    await authHandler(req, res);
    const r = getResult();
    const ok = r.status === 401;
    results.push({ caseId: 3, name: 'Login superadmin con contraseña errónea', expected: 401, actual: r.status, pass: ok });
    console.log(`[Case 3] Login con password erróneo -> Status: ${r.status} [${ok ? 'PASS' : 'FAIL'}]`);
  }

  // ---------------------------------------------------------------------------
  // Case 4: POST /api/auth?scope=central login correcto -> 200 + require2fa
  // ---------------------------------------------------------------------------
  let tempToken = '';
  {
    const { req, res, getResult } = createMockReqRes({
      method: 'POST',
      query: { scope: 'central' },
      body: { action: 'login', email: testEmail, password: testPassword },
    });
    await authHandler(req, res);
    const r = getResult();
    const ok = r.status === 200 && r.data?.require2fa === true && !!r.data?.tempToken;
    tempToken = r.data?.tempToken;
    results.push({ caseId: 4, name: 'Login con credenciales correctas (exige 2FA)', expected: 200, actual: r.status, pass: ok });
    console.log(`[Case 4] Login exitoso -> Status: ${r.status}, require2fa: ${r.data?.require2fa} [${ok ? 'PASS' : 'FAIL'}]`);
  }

  // ---------------------------------------------------------------------------
  // Case 5: POST /api/auth?scope=central verify_2fa código inválido -> 401
  // ---------------------------------------------------------------------------
  {
    const { req, res, getResult } = createMockReqRes({
      method: 'POST',
      query: { scope: 'central' },
      body: { action: 'verify_2fa', tempToken, code: '000000' },
    });
    await authHandler(req, res);
    const r = getResult();
    const ok = r.status === 401;
    results.push({ caseId: 5, name: 'Verificación 2FA con código inválido', expected: 401, actual: r.status, pass: ok });
    console.log(`[Case 5] 2FA con código falso -> Status: ${r.status} [${ok ? 'PASS' : 'FAIL'}]`);
  }

  // ---------------------------------------------------------------------------
  // Case 6: POST /api/auth?scope=central verify_2fa código TOTP válido -> 200 + Cookie vs_central
  // ---------------------------------------------------------------------------
  let validSessionCookie = '';
  {
    const currentCounter = Math.floor(Date.now() / 1000 / 30);
    const validCode = computeTOTP(totpSecret, currentCounter);
    const { req, res, getResult } = createMockReqRes({
      method: 'POST',
      query: { scope: 'central' },
      body: { action: 'verify_2fa', tempToken, code: validCode },
    });
    await authHandler(req, res);
    const r = getResult();
    const setCookie = r.headers['set-cookie'];
    const ok = r.status === 200 && r.data?.ok === true && setCookie && setCookie.includes('vs_central=') && setCookie.includes('Path=/');
    if (setCookie) {
      validSessionCookie = setCookie.split(';')[0];
    }
    results.push({ caseId: 6, name: 'Verificación 2FA TOTP válido (emite cookie Path=/)', expected: 200, actual: r.status, pass: ok });
    console.log(`[Case 6] 2FA TOTP válido -> Status: ${r.status}, Cookie: ${setCookie?.slice(0, 30)}... [${ok ? 'PASS' : 'FAIL'}]`);
  }

  // ---------------------------------------------------------------------------
  // Case 7: GET /api/central con cookie de sesión válida -> 200 OK
  // ---------------------------------------------------------------------------
  {
    const { req, res, getResult } = createMockReqRes({
      method: 'GET',
      headers: { cookie: validSessionCookie },
    });
    await centralHandler(req, res);
    const r = getResult();
    const ok = r.status === 200 && Array.isArray(r.data?.tenants);
    results.push({ caseId: 7, name: 'GET /api/central con cookie vs_central válida', expected: 200, actual: r.status, pass: ok });
    console.log(`[Case 7] GET Central con cookie -> Status: ${r.status}, Tenants: ${r.data?.tenants?.length} [${ok ? 'PASS' : 'FAIL'}]`);
  }

  // ---------------------------------------------------------------------------
  // Case 8: POST /api/central con cookie de sesión válida -> 200 OK
  // ---------------------------------------------------------------------------
  {
    const testTaskId = 'tsk-test-' + Date.now();
    const { req, res, getResult } = createMockReqRes({
      method: 'POST',
      headers: { cookie: validSessionCookie },
      body: {
        action: 'upsert_task',
        payload: {
          id: testTaskId,
          title: 'Tarea de Prueba de Seguridad',
          zone: 'Central',
          priority: 'high',
          status: 'pending',
          assignedTo: 'antigravity',
        },
      },
    });
    await centralHandler(req, res);
    const r = getResult();
    const ok = r.status === 200 && r.data?.ok === true;
    results.push({ caseId: 8, name: 'POST /api/central con cookie vs_central válida', expected: 200, actual: r.status, pass: ok });
    console.log(`[Case 8] POST Central con cookie -> Status: ${r.status} [${ok ? 'PASS' : 'FAIL'}]`);

    // Clean up test task
    await sql`DELETE FROM public.central_tasks WHERE id = ${testTaskId};`;
  }

  // ---------------------------------------------------------------------------
  // Case 9: Verificación con código de recuperación (un solo uso)
  // ---------------------------------------------------------------------------
  {
    // Inject a single-use test recovery code for deterministic testing
    const testRecoveryCode = 'TEST-' + crypto.randomBytes(2).toString('hex').toUpperCase();
    const testHash = crypto.createHash('sha256').update(testRecoveryCode).digest('hex');
    await sql`
      UPDATE public.system_superadmins
      SET recovery_codes = jsonb_set(
        COALESCE(recovery_codes, '[]'::jsonb),
        '{0}',
        ${JSON.stringify({ hash: testHash, used: false, used_at: null })}::jsonb
      )
      WHERE email = ${testEmail};
    `;

    // Generate new tempToken
    const { req: lReq, res: lRes, getResult: lGet } = createMockReqRes({
      method: 'POST',
      query: { scope: 'central' },
      body: { action: 'login', email: testEmail, password: testPassword },
    });
    await authHandler(lReq, lRes);
    const recTempToken = lGet().data?.tempToken;

    // Use recovery code
    const { req, res, getResult } = createMockReqRes({
      method: 'POST',
      query: { scope: 'central' },
      body: { action: 'verify_2fa', tempToken: recTempToken, code: testRecoveryCode },
    });
    await authHandler(req, res);
    const r = getResult();
    const okFirstUse = r.status === 200;

    // Attempt reuse of same recovery code
    const { req: rReq, res: rRes, getResult: rGet } = createMockReqRes({
      method: 'POST',
      query: { scope: 'central' },
      body: { action: 'verify_2fa', tempToken: recTempToken, code: testRecoveryCode },
    });
    await authHandler(rReq, rRes);
    const rReused = rGet();
    const okBlockedReuse = rReused.status === 401;

    const pass = okFirstUse && okBlockedReuse;
    results.push({ caseId: 9, name: 'Código de recuperación (funciona 1 vez y se quema)', expected: 200, actual: r.status, pass });
    console.log(`[Case 9] Código de recuperación -> 1er uso: ${r.status}, Reuso bloqueado: ${rReused.status} [${pass ? 'PASS' : 'FAIL'}]`);
  }

  // ---------------------------------------------------------------------------
  // Case 10: Revocación de sesiones (action = 'revoke_all') -> Token previo queda inválido (401)
  // ---------------------------------------------------------------------------
  {
    const { req: revReq, res: revRes, getResult: revGet } = createMockReqRes({
      method: 'POST',
      headers: { cookie: validSessionCookie },
      body: { action: 'revoke_all' },
    });
    await authHandler(revReq, revRes);
    const revResult = revGet();

    // Now try calling GET /api/central with the previous cookie
    const { req: cReq, res: cRes, getResult: cGet } = createMockReqRes({
      method: 'GET',
      headers: { cookie: validSessionCookie },
    });
    await centralHandler(cReq, cRes);
    const afterRevoke = cGet();
    const pass = revResult.status === 200 && afterRevoke.status === 401;
    results.push({ caseId: 10, name: 'Revocación de sesiones (session_version invalida cookies antiguas)', expected: 401, actual: afterRevoke.status, pass });
    console.log(`[Case 10] Revocación de sesiones -> Revocar: ${revResult.status}, GET con cookie vieja: ${afterRevoke.status} [${pass ? 'PASS' : 'FAIL'}]`);
  }

  // ---------------------------------------------------------------------------
  // Case 11: GET /api/central?mode=tenant_context&tenant=capra-studio -> 200 (Público)
  // ---------------------------------------------------------------------------
  {
    const { req, res, getResult } = createMockReqRes({
      method: 'GET',
      query: { mode: 'tenant_context', tenant: 'capra-studio' },
    });
    await centralHandler(req, res);
    const r = getResult();
    const ok = r.status === 200 && r.data?.tenant?.id === 'capra-studio';
    results.push({ caseId: 11, name: 'GET /api/central?mode=tenant_context público', expected: 200, actual: r.status, pass: ok });
    console.log(`[Case 11] Tenant Context público -> Status: ${r.status}, Tenant: ${r.data?.tenant?.name} [${ok ? 'PASS' : 'FAIL'}]`);
  }

  console.log('\n================================================================');
  console.log('                 MATRIZ DE RESULTADOS FINALES                   ');
  console.log('================================================================');
  console.table(results);

  const allPassed = results.every(r => r.pass);
  console.log(`\nRESULTADO GENERAL: ${allPassed ? '✅ 100% PRUEBAS PASADAS' : '❌ HAY PRUEBAS FALLIDAS'}`);
  process.exit(allPassed ? 0 : 1);
}

runTests().catch(err => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
