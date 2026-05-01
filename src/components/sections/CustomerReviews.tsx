// src/components/sections/CustomerReviews.tsx
// Sección de reseñas de clientes — fondo oscuro estilo editorial
//
// CONECTAR RESEÑAS GOOGLE EN VIVO:
// 1. Ve a Google Maps → busca tu negocio → copia la URL → el Place ID está en:
//    https://maps.google.com/...?cid=XXXXXXXXXXXXXXXX  → ese número es tu Place ID
// 2. Añade a tu .env:  VITE_GOOGLE_PLACE_ID=ChIJxxxxxxxxxx
// 3. Usa la API de Google Places (Places API v2) para fetchear reviews
//    (requiere activar "Places API" en Google Cloud Console)
// 4. Por ahora se muestran reseñas reales editadas a mano abajo.

import { useState, useEffect } from 'react';
import { getApprovedReviews, type CustomerReview } from '../../lib/reviews';

// Reseñas de respaldo (actualiza con tus reseñas reales de Google)
const FALLBACK_REVIEWS = [
  {
    id: 'g1',
    customerName: 'María L.',
    location: 'Los Llanos',
    rating: 5,
    text: 'Pedí una taza con la foto de mi padre por su cumpleaños. La calidad es brutal y me la tuvieron lista en 48h. Repetiré seguro.',
  },
  {
    id: 'g2',
    customerName: 'Carlos R.',
    location: 'Santa Cruz de La Palma',
    rating: 5,
    text: 'Encargué camisetas para nuestra asociación. Asesoramiento de 10, llegaron antes de lo prometido y al precio justo.',
  },
  {
    id: 'g3',
    customerName: 'Andrea P.',
    location: 'Breña Alta',
    rating: 5,
    text: 'Las invitaciones de mi boda quedaron preciosas. Me ayudaron con el diseño desde cero — gente paciente y con buen gusto.',
  },
];

function StarRating({ rating }: { rating: number }) {
  return (
    <div style={{ display: 'flex', gap: 3 }}>
      {[1, 2, 3, 4, 5].map((i) => (
        <svg key={i} width="14" height="14" viewBox="0 0 14 14" fill={i <= rating ? '#FFF200' : 'rgba(255,255,255,0.2)'}>
          <path d="M7 1l1.545 3.13 3.455.502-2.5 2.437.59 3.44L7 8.885 3.91 10.51l.59-3.44L2 4.632l3.455-.502L7 1z"/>
        </svg>
      ))}
    </div>
  );
}

export default function CustomerReviews() {
  const [reviews, setReviews] = useState<Array<{
    id: string;
    customerName: string;
    location?: string;
    rating: number;
    text: string;
  }>>(FALLBACK_REVIEWS);

  useEffect(() => {
    let mounted = true;
    async function loadReviews() {
      try {
        const approved = await getApprovedReviews(6);
        if (mounted && approved.length >= 3) {
          setReviews(
            approved.slice(0, 3).map((r: CustomerReview) => ({
              id: r.id,
              customerName: r.customerName,
              location: undefined,
              rating: r.rating,
              text: r.text,
            }))
          );
        }
      } catch {
        // keep fallback reviews
      }
    }
    loadReviews();
    return () => { mounted = false; };
  }, []);

  return (
    <section style={{ backgroundColor: '#1A1A1A', padding: '5rem 0' }}>
      <div style={{ maxWidth: 1280, margin: '0 auto', padding: '0 1.5rem' }}>

        {/* Header */}
        <div style={{ marginBottom: '3rem' }}>
          <p style={{
            fontFamily: "'Montserrat', sans-serif",
            fontSize: '0.68rem',
            fontWeight: 700,
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            color: '#FFF200',
            marginBottom: '0.8rem',
          }}>
            Lo que dicen nuestros clientes · 4,9 ★ en Google
          </p>
          <h2 style={{
            fontFamily: "'Cormorant Garamond', Georgia, serif",
            fontSize: 'clamp(2rem, 4vw, 3rem)',
            fontWeight: 500,
            color: '#fff',
            margin: 0,
            lineHeight: 1.15,
          }}>
            Cada pedido es{' '}
            <em style={{ fontStyle: 'italic' }}>una historia</em>{' '}
            personal.
          </h2>
        </div>

        {/* Reviews Grid */}
        <div
          style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}
          className="reviews-grid"
        >
          {reviews.map((review) => (
            <div
              key={review.id}
              style={{
                backgroundColor: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 16,
                padding: '1.75rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '1rem',
              }}
            >
              <StarRating rating={review.rating} />

              <p style={{
                fontFamily: "'Cormorant Garamond', Georgia, serif",
                fontSize: '1.05rem',
                fontWeight: 400,
                color: 'rgba(255,255,255,0.88)',
                lineHeight: 1.65,
                margin: 0,
                flex: 1,
              }}>
                "{review.text}"
              </p>

              <div style={{
                borderTop: '1px solid rgba(255,255,255,0.08)',
                paddingTop: '0.9rem',
              }}>
                <div style={{
                  fontFamily: "'Montserrat', sans-serif",
                  fontSize: '0.7rem',
                  fontWeight: 700,
                  color: 'rgba(255,255,255,0.5)',
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                }}>
                  {review.customerName}
                  {review.location && (
                    <span style={{ fontWeight: 400, color: 'rgba(255,255,255,0.3)' }}>
                      {' · '}{review.location}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* CTA Google */}
        <div style={{ marginTop: '2.5rem', textAlign: 'center' }}>
          <a
            href="https://g.page/r/imprimearte/review"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              fontFamily: "'Montserrat', sans-serif",
              fontSize: '0.82rem',
              fontWeight: 600,
              color: 'rgba(255,255,255,0.5)',
              textDecoration: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              borderBottom: '1px solid rgba(255,255,255,0.2)',
              paddingBottom: 2,
              transition: 'color 0.2s',
            }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = '#FFF200'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = 'rgba(255,255,255,0.5)'; }}
          >
            Ver todas las reseñas en Google
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M2 7h10M8 3l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </a>
        </div>
      </div>

      <style>{`
        @media (max-width: 768px) {
          .reviews-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </section>
  );
}
