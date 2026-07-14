import type { APIRoute } from 'astro';
import { getAdminDb } from '../lib/firebase-admin';

/**
 * Feed de productos para Google Merchant Center (RSS 2.0 + namespace g:).
 * URL: https://imprimearte.es/google-feed.xml
 * Misma fuente y filtros que meta-feed.csv.ts, formato XML que exige Google.
 * Productos personalizados sin GTIN/MPN → g:identifier_exists = no.
 */

type Product = {
  active?: boolean;
  allowBackorder?: boolean;
  basePrice?: number;
  category?: string;
  subcategory?: string;
  description?: string;
  images?: string[];
  metaDescription?: string;
  metaTitle?: string;
  name?: string;
  slug?: string;
  stock?: number;
  trackInventory?: boolean;
};

export const prerender = false;

const SITE_URL = 'https://imprimearte.es';

function escapeXml(value: unknown): string {
  return String(value ?? '')
    .replace(/[\r\n\t]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function truncate(value: string, max: number): string {
  return value.length > max ? `${value.slice(0, max - 1)}…` : value;
}

// Google usa snake_case: in_stock | out_of_stock | backorder
function getAvailability(product: Product): string {
  if (product.trackInventory === true) {
    const stock = Number(product.stock ?? 0);

    if (stock > 0) return 'in_stock';
    if (product.allowBackorder === true) return 'backorder';

    return 'out_of_stock';
  }

  return 'in_stock';
}

function getDescription(product: Product): string {
  return (
    product.metaDescription ||
    product.description ||
    product.name ||
    'Producto personalizado de Imprime Arte'
  );
}

function getProductType(product: Product): string {
  const category = product.category || 'personalizados';
  const subcategory = product.subcategory || '';

  return subcategory ? `${category} > ${subcategory}` : category;
}

function getPrice(product: Product): string {
  const price = Number(product.basePrice ?? 0);
  const safePrice = Number.isFinite(price) ? price : 0;

  return `${safePrice.toFixed(2)} EUR`;
}

function getFirstImage(product: Product): string {
  if (!Array.isArray(product.images)) return '';

  return product.images[0] || '';
}

// Google solo admite g:postal_code / g:region en envíos para AU, EE.UU. y Japón;
// para España el feed solo puede declarar país. La venta real sigue limitada a
// Canarias en el checkout (shipping_zones en Firestore) y las campañas de Ads
// deben segmentarse geográficamente a Canarias.
const SHIPPING_BASE_PRICE = 4.99;
const FREE_SHIPPING_THRESHOLD = 50;

function getShippingXml(product: Product): string {
  const price = Number(product.basePrice ?? 0);
  const shippingPrice = price >= FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_BASE_PRICE;

  return `      <g:shipping>
        <g:country>ES</g:country>
        <g:service>Envío estándar</g:service>
        <g:price>${shippingPrice.toFixed(2)} EUR</g:price>
        <g:min_handling_time>2</g:min_handling_time>
        <g:max_handling_time>5</g:max_handling_time>
        <g:min_transit_time>2</g:min_transit_time>
        <g:max_transit_time>7</g:max_transit_time>
      </g:shipping>`;
}

export const GET: APIRoute = async () => {
  try {
    const db = getAdminDb();
    const snapshot = await db.collection('products').where('active', '==', true).get();

    const items = snapshot.docs
      .map((doc) => {
        const product = doc.data() as Product;

        if (product.category === 'servicios-digitales') return null;

        const image = getFirstImage(product);
        if (!image) return null;

        const slug = product.slug || doc.id;
        // Google limita g:id a 50 caracteres; el recorte debe ser estable entre ejecuciones
        const feedId = slug.slice(0, 50);
        const title = truncate(product.name || product.metaTitle || slug, 150);
        const link = `${SITE_URL}/producto/${slug}`;
        const description = truncate(getDescription(product), 5000);

        return `    <item>
      <g:id>${escapeXml(feedId)}</g:id>
      <g:title>${escapeXml(title)}</g:title>
      <g:description>${escapeXml(description)}</g:description>
      <g:link>${escapeXml(link)}</g:link>
      <g:image_link>${escapeXml(image)}</g:image_link>
      <g:availability>${getAvailability(product)}</g:availability>
      <g:price>${getPrice(product)}</g:price>
      <g:condition>new</g:condition>
      <g:brand>Imprime Arte</g:brand>
      <g:identifier_exists>no</g:identifier_exists>
      <g:product_type>${escapeXml(getProductType(product))}</g:product_type>
${getShippingXml(product)}
    </item>`;
      })
      .filter((item): item is string => Boolean(item));

    const body = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">
  <channel>
    <title>Imprime Arte</title>
    <link>${SITE_URL}</link>
    <description>Impresión personalizada en La Palma, Canarias: DTF, bordado, sublimación, láser e impresión 3D.</description>
${items.join('\n')}
  </channel>
</rss>
`;

    return new Response(body, {
      status: 200,
      headers: {
        'Content-Type': 'application/xml; charset=utf-8',
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch (error) {
    console.error('Error generating Google Merchant feed:', error);

    return new Response('Error generating Google Merchant feed', {
      status: 500,
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
      },
    });
  }
};
