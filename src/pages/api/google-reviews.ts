// src/pages/api/google-reviews.ts
// Endpoint server-side: la API key NUNCA llega al cliente
// Requiere env var: GOOGLE_PLACES_API_KEY (sin prefijo VITE_)
// Añadir en Vercel → Settings → Environment Variables

import type { APIRoute } from 'astro';

const PLACE_QUERY = 'Imprime Arte Los Llanos de Aridane La Palma Canarias';

export const GET: APIRoute = async () => {
  const apiKey = import.meta.env.GOOGLE_PLACES_API_KEY;

  // Sin API key → devuelve vacío (componente usa fallback estático)
  if (!apiKey) {
    return new Response(JSON.stringify({ reviews: [], rating: null, total: null }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    // Paso 1: buscar Place ID por nombre/dirección
    const findUrl = `https://maps.googleapis.com/maps/api/place/findplacefromtext/json?input=${encodeURIComponent(PLACE_QUERY)}&inputtype=textquery&fields=place_id&key=${apiKey}`;
    const findRes = await fetch(findUrl);
    const findData = await findRes.json();
    const placeId = findData.candidates?.[0]?.place_id;

    if (!placeId) {
      return new Response(JSON.stringify({ reviews: [], rating: null, total: null, error: 'place_not_found' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Paso 2: obtener reseñas + rating global
    const detailsUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=reviews,rating,user_ratings_total&language=es&key=${apiKey}`;
    const detailsRes = await fetch(detailsUrl);
    const detailsData = await detailsRes.json();

    const rawReviews: any[] = detailsData.result?.reviews || [];
    const rating: number | null = detailsData.result?.rating ?? null;
    const total: number | null = detailsData.result?.user_ratings_total ?? null;

    // Mapear al formato que usa CustomerReviews
    const reviews = rawReviews
      .filter((r) => r.rating >= 4) // solo 4 y 5 estrellas
      .slice(0, 3)
      .map((r) => ({
        id: r.time?.toString() ?? Math.random().toString(),
        customerName: r.author_name ?? 'Cliente',
        location: undefined as string | undefined,
        rating: r.rating,
        text: r.text ?? '',
        timeAgo: r.relative_time_description ?? '',
      }));

    return new Response(JSON.stringify({ reviews, rating, total }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        // Cachear 2h para no gastar cuota innecesariamente
        'Cache-Control': 'public, s-maxage=7200, stale-while-revalidate=3600',
      },
    });
  } catch (err) {
    return new Response(JSON.stringify({ reviews: [], rating: null, total: null, error: 'fetch_error' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
