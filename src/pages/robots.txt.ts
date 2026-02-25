import type { APIRoute } from 'astro';

export const GET: APIRoute = () => {
  const site =
    (import.meta.env.PUBLIC_SITE_URL || 'https://example.com').replace(/\/$/, '');

  const body = [
    'User-agent: *',
    'Allow: /',
    'Disallow: /admin/',
    'Disallow: /account/',
    'Disallow: /cuenta/',
    'Disallow: /login',
    'Disallow: /cart',
    'Disallow: /checkout',
    'Disallow: /confirmacion',
    'Disallow: /test-',
    'Disallow: /debug-',
    'Disallow: /fix-product',
    'Disallow: /lp/',
    'Disallow: /d/',
    `Sitemap: ${site}/sitemap.xml`,
    '',
  ].join('\n');

  return new Response(body, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
};
