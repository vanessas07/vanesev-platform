// Shared CORS security filter for VANESEV APIs
// Restricts allowed origins strictly to vanesev.com domains and Vercel preview environments
export function applyCors(req: any, res: any) {
  const origin = (req.headers?.origin || '').trim();
  const allowed =
    /^https:\/\/([a-z0-9-]+\.)?vanesev\.com$/.test(origin) ||
    (process.env.VERCEL_URL && origin === `https://${process.env.VERCEL_URL}`) ||
    (process.env.VERCEL_ENV !== 'production' && /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin));

  if (allowed) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST,PATCH,DELETE');
    res.setHeader(
      'Access-Control-Allow-Headers',
      'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
    );
  }
}
