import type { APIRoute } from 'astro';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';

// Static pages with their priorities and change frequencies
const staticPages = [
  { url: '', changefreq: 'daily', priority: 1.0 }, // Home
  { url: 'sobre-nosotros', changefreq: 'monthly', priority: 0.8 },
  { url: 'contacto', changefreq: 'monthly', priority: 0.8 },
  { url: 'como-personalizar', changefreq: 'monthly', priority: 0.9 },
  { url: 'guia-materiales', changefreq: 'monthly', priority: 0.7 },
  { url: 'faq', changefreq: 'weekly', priority: 0.7 },
  { url: 'ofertas', changefreq: 'daily', priority: 0.9 },
  { url: 'terminos-condiciones', changefreq: 'yearly', priority: 0.3 },
  { url: 'politica-privacidad', changefreq: 'yearly', priority: 0.3 },
  { url: 'devoluciones', changefreq: 'monthly', priority: 0.6 },
  { url: 'cart', changefreq: 'always', priority: 0.5 },
];

export const GET: APIRoute = async ({ site }) => {
  const baseUrl = site?.toString() || 'https://tudominio.com';

  // Get all products from Firestore
  let products: Array<{ slug: string; updatedAt?: any }> = [];

  try {
    const productsRef = collection(db, 'products');
    const productsSnapshot = await getDocs(productsRef);

    products = productsSnapshot.docs
      .map(doc => {
        const data = doc.data();
        return {
          slug: data.slug || doc.id,
          updatedAt: data.updatedAt || data.createdAt,
        };
      })
      .filter(p => p.slug); // Only include products with slugs
  } catch (error) {
    console.error('Error fetching products for sitemap:', error);
  }

  // Build XML
  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${staticPages
  .map(
    page => `  <url>
    <loc>${baseUrl}${page.url}</loc>
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority}</priority>
  </url>`
  )
  .join('\n')}
${products
  .map(product => {
    const lastmod = product.updatedAt?.toDate
      ? product.updatedAt.toDate().toISOString().split('T')[0]
      : new Date().toISOString().split('T')[0];

    return `  <url>
    <loc>${baseUrl}producto/${product.slug}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`;
  })
  .join('\n')}
</urlset>`;

  return new Response(sitemap, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
    },
  });
};
