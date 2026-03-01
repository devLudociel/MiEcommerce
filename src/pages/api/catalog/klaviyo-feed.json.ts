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
        id: doc.id,
        title: data.name || '',
        description: data.description || '',
        link: productUrl,
        image_link: imageUrl,
        price: `${price.toFixed(2)} EUR`,
        category: data.category || '',
        in_stock: data.trackInventory ? (data.stock || 0) > 0 : true,
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
