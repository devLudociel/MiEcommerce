import type { APIRoute } from 'astro';
import { getAdminDb } from '../lib/firebase-admin';

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
  featured?: boolean;
  onSale?: boolean;
  readyMade?: boolean;
  tags?: string[];
};

export const prerender = false;

const SITE_URL = 'https://imprimearte.es';

const headers = [
  'id',
  'title',
  'description',
  'availability',
  'condition',
  'price',
  'link',
  'image_link',
  'brand',
  'product_type',
  'custom_label_0',
  'custom_label_1',
  'custom_label_2',
  'custom_label_3',
  'custom_label_4',
];

function cleanText(value: unknown): string {
  return String(value ?? '')
    .replace(/[\r\n\t]+/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/"/g, '""')
    .trim();
}

function csv(value: unknown): string {
  return `"${cleanText(value)}"`;
}

function getAvailability(product: Product): string {
  if (product.trackInventory === true) {
    const stock = Number(product.stock ?? 0);

    if (stock > 0) return 'in stock';
    if (product.allowBackorder === true) return 'available for order';

    return 'out of stock';
  }

  return 'in stock';
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

export const GET: APIRoute = async () => {
  try {
    const db = getAdminDb();
    const snapshot = await db.collection('products').where('active', '==', true).get();

    const rows = snapshot.docs
      .map((doc) => {
        const product = doc.data() as Product;

        if (product.category === 'servicios-digitales') return null;

        const image = getFirstImage(product);
        if (!image) return null;

        const slug = product.slug || doc.id;
        const title = product.name || product.metaTitle || slug;
        const link = `${SITE_URL}/producto/${slug}`;

        return [
          slug,
          title,
          getDescription(product),
          getAvailability(product),
          'new',
          getPrice(product),
          link,
          image,
          'Imprime Arte',
          getProductType(product),
          product.category || '',
          product.subcategory || '',
          product.featured === true ? 'destacado' : '',
          product.onSale === true ? 'oferta' : '',
          product.readyMade === true ? 'listo-para-comprar' : 'personalizable',
        ]
          .map(csv)
          .join(',');
      })
      .filter((row): row is string => Boolean(row));

    const body = [headers.map(csv).join(','), ...rows].join('\n');

    return new Response(body, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch (error) {
    console.error('Error generating Meta feed:', error);

    return new Response('Error generating Meta product feed', {
      status: 500,
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
      },
    });
  }
};
