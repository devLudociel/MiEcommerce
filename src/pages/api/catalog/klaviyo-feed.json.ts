// ============================================
// 📦 Feed de Catálogo para Klaviyo
// Archivo: src/pages/api/catalog/klaviyo-feed.json.ts
//
// Este endpoint devuelve todos los productos activos
// en formato JSON para que Klaviyo los sincronice.
// ============================================

import type { APIRoute } from 'astro';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../../../lib/firebase';

export const GET: APIRoute = async () => {
  try {
    // Obtener solo productos activos
    const productsRef = collection(db, 'products');
    const q = query(productsRef, where('active', '==', true));
    const snapshot = await getDocs(q);

    const products = snapshot.docs.map((doc) => {
      const data = doc.data();
      const productUrl = `https://imprimearte.es/producto/${data.slug || doc.id}`;
      const imageUrl = data.images?.[0] || '';

      // Calcular precio mínimo si hay variantes
      let price = data.basePrice || 0;
      if (data.variants && data.variants.length > 0) {
        const prices = data.variants
          .map((v: any) => v.price)
          .filter((p: any) => typeof p === 'number' && p > 0);
        if (prices.length > 0) {
          price = Math.min(...prices);
        }
      }

      return {
        // Campos requeridos por Klaviyo
        id: doc.id,
        title: data.name || '',
        link: productUrl,
        description: data.description || '',
        image_link: imageUrl,
        price: `${price.toFixed(2)} EUR`,

        // Campos opcionales pero utiles
        categories: data.category ? [data.category] : [],
        tags: data.tags || [],
        inventory_quantity: data.trackInventory ? data.stock || 0 : null,
        featured: data.featured || false,
        customizable: data.customizable || false,

        // Imagenes adicionales
        additional_image_links: data.images?.slice(1) || [],

        // Variantes
        variants:
          data.variants?.map((v: any, index: number) => ({
            id: `${doc.id}-variant-${index}`,
            title: `${data.name} - ${v.name || v.color || v.size || ''}`.trim(),
            price: `${(v.price || price).toFixed(2)} EUR`,
            inventory_quantity: v.stock || null,
            option_values: {
              ...(v.size && { size: v.size }),
              ...(v.color && { color: v.color }),
              ...(v.name && { name: v.name }),
            },
          })) || [],

        // SEO
        meta_title: data.metaTitle || data.name || '',
        meta_description: data.metaDescription || data.description || '',

        // Estado
        in_stock: data.trackInventory ? (data.stock || 0) > 0 : true,
        is_digital: data.isDigital || false,
      };
    });

    return new Response(JSON.stringify(products), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch (error: any) {
    console.error('❌ Error generando feed de catalogo:', error);
    return new Response(JSON.stringify({ error: 'Error al obtener productos' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
