import type { APIRoute } from 'astro';
import { getBlogPosts } from '../lib/pages';

const SITE = 'https://imprimearte.es';

const staticRoutes: { url: string; priority: string; changefreq: string }[] = [
  { url: '/', priority: '1.0', changefreq: 'weekly' },
  { url: '/productos', priority: '0.9', changefreq: 'daily' },
  { url: '/productos/ofertas', priority: '0.8', changefreq: 'daily' },
  { url: '/blog', priority: '0.8', changefreq: 'weekly' },
  { url: '/sobre-nosotros', priority: '0.7', changefreq: 'monthly' },
  { url: '/como-funciona', priority: '0.7', changefreq: 'monthly' },
  { url: '/contacto', priority: '0.7', changefreq: 'monthly' },
  { url: '/faq', priority: '0.6', changefreq: 'monthly' },
  { url: '/guia-materiales', priority: '0.6', changefreq: 'monthly' },
  { url: '/devoluciones', priority: '0.5', changefreq: 'yearly' },
  { url: '/politica-privacidad', priority: '0.3', changefreq: 'yearly' },
  { url: '/terminos-condiciones', priority: '0.3', changefreq: 'yearly' },
];

const escapeXml = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');

export const GET: APIRoute = async () => {
  const today = new Date().toISOString().split('T')[0];

  const staticUrls = staticRoutes.map(
    ({ url, priority, changefreq }) =>
      `<url><loc>${SITE}${url}</loc><lastmod>${today}</lastmod><changefreq>${changefreq}</changefreq><priority>${priority}</priority></url>`
  );

  let blogUrls: string[] = [];
  try {
    const posts = await getBlogPosts();
    blogUrls = posts.map((post) => {
      const lastmod = post.updatedAt
        ? new Date(post.updatedAt.seconds * 1000).toISOString().split('T')[0]
        : post.publishedAt
          ? new Date(post.publishedAt.seconds * 1000).toISOString().split('T')[0]
          : today;
      return `<url><loc>${SITE}/blog/${escapeXml(post.slug)}</loc><lastmod>${lastmod}</lastmod><changefreq>monthly</changefreq><priority>0.7</priority></url>`;
    });
  } catch (error) {
    console.error('[sitemap] Error loading blog posts:', error);
  }

  const urls = [...staticUrls, ...blogUrls].join('');

  const body =
    `<?xml version="1.0" encoding="UTF-8"?>` +
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}</urlset>`;

  return new Response(body, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=86400',
    },
  });
};
