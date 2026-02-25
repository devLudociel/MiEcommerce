import type { APIRoute } from 'astro';

const staticRoutes = [
  '/',
  '/productos',
  '/productos/ofertas',
  '/productos/digitales',
  '/ofertas',
  '/listos-para-comprar',
  '/como-funciona',
  '/como-personalizar',
  '/guia-materiales',
  '/galeria',
  '/faq',
  '/contacto',
  '/sobre-nosotros',
  '/devoluciones',
  '/terminos-condiciones',
  '/politica-privacidad',
  '/politica-cookies',
  '/blog',
];

export const GET: APIRoute = () => {
  const site =
    (import.meta.env.PUBLIC_SITE_URL || 'https://example.com').replace(/\/$/, '');
  const lastmod = new Date().toISOString();

  const urls = staticRoutes
    .map((path) => {
      const loc = `${site}${path}`;
      return `<url><loc>${loc}</loc><lastmod>${lastmod}</lastmod></url>`;
    })
    .join('');

  const body =
    `<?xml version="1.0" encoding="UTF-8"?>` +
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}</urlset>`;

  return new Response(body, {
    headers: { 'Content-Type': 'application/xml; charset=utf-8' },
  });
};
