// src/components/sections/CustomerReviews.tsx
// Reseñas Google con foto de perfil + fondo gradiente CMYK
// API key server-side en /api/google-reviews

import { useState, useEffect } from 'react';

const FALLBACK_REVIEWS = [
  {
    id: 'g1',
    customerName: 'María L.',
    location: 'Los Llanos',
    rating: 5,
    text: 'Pedí una taza con la foto de mi padre por su cumpleaños. La calidad es brutal y me la tuvieron lista en 48h. Repetiré seguro.',
    timeAgo: '',
    profilePhoto: null as string | null,
  },
  {
    id: 'g2',
    customerName: 'Carlos R.',
    location: 'Santa Cruz de La Palma',
    rating: 5,
    text: 'Encargué camisetas para nuestra asociación. Asesoramiento de 10, llegaron antes de lo prometido y al precio justo.',
    timeAgo: '',
    profilePhoto: null as string | null,
  },
  {
    id: 'g3',
    customerName: 'Andrea P.',
    location: 'Breña Alta',
    rating: 5,
    text: 'Las invitaciones de mi boda quedaron preciosas. Me ayudaron con el diseño desde cero — gente paciente y con buen gusto.',
    timeAgo: '',
    profilePhoto: null as string | null,
  },
];

interface ReviewItem {
  id: string;
  customerName: string;
  location?: string;
  rating: number;
  text: string;
  timeAgo?: string;
  profilePhoto?: string | null;
}

// Iniciales para avatar fallback
function getInitials(name: string) {
  return name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();
}

// Colores CMYK para avatares sin foto
const AVATAR_COLORS = ['#EC008C', '#00AEEF', '#FFF200'];
const AVATAR_TEXT_COLORS = ['#fff', '#fff', '#1A1A1A'];

function Avatar({ name, photo, index }: { name: string; photo?: string | null; index: number }) {
  const bg = AVATAR_COLORS[index % AVATAR_COLORS.length];
  const fg = AVATAR_TEXT_COLORS[index % AVATAR_TEXT_COLORS.length];

  if (photo) {
    return (
      <img
        src={photo}
        alt={name}
        style={{
          width: 44,
          height: 44,
          borderRadius: '50%',
          objectFit: 'cover',
          border: '2px solid rgba(255,255,255,0.15)',
          flexShrink: 0,
        }}
      />
    );
  }
  return (
    <div style={{
      width: 44,
      height: 44,
      borderRadius: '50%',
      backgroundColor: bg,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
      fontFamily: "'Montserrat', sans-serif",
      fontWeight: 800,
      fontSize: '0.8rem',
      color: fg,
    }}>
      {getInitials(name)}
    </div>
  );
}

function StarRating({ rating }: { rating: number }) {
  return (
    <div style={{ display: 'flex', gap: 3 }}>
      {[1, 2, 3, 4, 5].map((i) => (
        <svg key={i} width="13" height="13" viewBox="0 0 14 14" fill={i <= rating ? '#FFF200' : 'rgba(255,255,255,0.18)'}>
          <path d="M7 1l1.545 3.13 3.455.502-2.5 2.437.59 3.44L7 8.885 3.91 10.51l.59-3.44L2 4.632l3.455-.502L7 1z"/>
        </svg>
      ))}
    </div>
  );
}

export default function CustomerReviews() {
  const [reviews, setReviews] = useState<ReviewItem[]>(FALLBACK_REVIEWS);
  const [globalRating, setGlobalRating] = useState<number | null>(null);
  const [totalReviews, setTotalReviews] = useState<number | null>(null);

  useEffect(() => {
    let mounted = true;
    async function loadGoogleReviews() {
      try {
        const res = await fetch('/api/google-reviews');
        if (!res.ok) return;
        const data = await res.json();
        if (mounted && data.reviews?.length >= 1) setReviews(data.reviews);
        if (mounted && data.rating) setGlobalRating(data.rating);
        if (mounted && data.total) setTotalReviews(data.total);
      } catch {
        // keep fallback
      }
    }
    loadGoogleReviews();
    return () => { mounted = false; };
  }, []);

  return (
    <section style={{
      position: 'relative',
      padding: '5.5rem 0',
      overflow: 'hidden',
      // Fondo oscuro con gradiente CMYK sutil
      background: 'linear-gradient(135deg, #1a0010 0%, #0d1a1f 50%, #1a1a00 100%)',
    }}>

      {/* Destellos CMYK de fondo */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden',
      }}>
        {/* Magenta — arriba izquierda */}
        <div style={{
          position: 'absolute', top: '-10%', left: '-5%',
          width: '45%', aspectRatio: '1',
          background: 'radial-gradient(circle, rgba(236,0,140,0.18) 0%, transparent 70%)',
          borderRadius: '50%',
        }} />
        {/* Cyan — abajo derecha */}
        <div style={{
          position: 'absolute', bottom: '-10%', right: '-5%',
          width: '40%', aspectRatio: '1',
          background: 'radial-gradient(circle, rgba(0,174,239,0.16) 0%, transparent 70%)',
          borderRadius: '50%',
        }} />
        {/* Amarillo — centro sutil */}
        <div style={{
          position: 'absolute', top: '40%', left: '45%',
          width: '20%', aspectRatio: '1',
          background: 'radial-gradient(circle, rgba(255,242,0,0.07) 0%, transparent 70%)',
          borderRadius: '50%',
        }} />
      </div>

      <div style={{ maxWidth: 1280, margin: '0 auto', padding: '0 1.5rem', position: 'relative', zIndex: 1 }}>

        {/* Header */}
        <div style={{ marginBottom: '3rem' }}>
          {/* Badge Google */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: '1rem' }}>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 7,
              backgroundColor: 'rgba(255,255,255,0.08)',
              border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: 50,
              padding: '6px 14px',
            }}>
              {/* Google "G" icon */}
              <svg width="14" height="14" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              <span style={{
                fontFamily: "'Montserrat', sans-serif",
                fontSize: '0.68rem',
                fontWeight: 700,
                color: '#FFF200',
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
              }}>
                {globalRating ? `${globalRating.toFixed(1)} ★` : '4,9 ★'}
                {totalReviews ? ` · ${totalReviews} reseñas` : ' · Google'}
              </span>
            </div>
          </div>

          <h2 style={{
            fontFamily: "'Cormorant Garamond', Georgia, serif",
            fontSize: 'clamp(2rem, 4vw, 3rem)',
            fontWeight: 500,
            color: '#fff',
            margin: 0,
            lineHeight: 1.15,
          }}>
            Cada pedido es{' '}
            <em style={{ fontStyle: 'italic', color: '#EC008C' }}>una historia</em>{' '}
            personal.
          </h2>
        </div>

        {/* Reviews Grid */}
        <div
          style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.25rem' }}
          className="reviews-grid"
        >
          {reviews.map((review, idx) => (
            <div
              key={review.id}
              style={{
                backgroundColor: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.09)',
                borderRadius: 20,
                padding: '1.75rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '1rem',
                backdropFilter: 'blur(8px)',
                // Borde superior con color CMYK por tarjeta
                borderTop: `2px solid ${AVATAR_COLORS[idx % AVATAR_COLORS.length]}`,
              }}
            >
              <StarRating rating={review.rating} />

              <p style={{
                fontFamily: "'Cormorant Garamond', Georgia, serif",
                fontSize: '1.08rem',
                fontWeight: 400,
                color: 'rgba(255,255,255,0.9)',
                lineHeight: 1.7,
                margin: 0,
                flex: 1,
              }}>
                "{review.text}"
              </p>

              {/* Autor con foto */}
              <div style={{
                borderTop: '1px solid rgba(255,255,255,0.07)',
                paddingTop: '1rem',
                display: 'flex',
                alignItems: 'center',
                gap: 12,
              }}>
                <Avatar name={review.customerName} photo={review.profilePhoto} index={idx} />
                <div>
                  <div style={{
                    fontFamily: "'Montserrat', sans-serif",
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    color: '#fff',
                    letterSpacing: '0.04em',
                  }}>
                    {review.customerName}
                  </div>
                  {(review.location || review.timeAgo) && (
                    <div style={{
                      fontFamily: "'Montserrat', sans-serif",
                      fontSize: '0.65rem',
                      color: 'rgba(255,255,255,0.35)',
                      marginTop: 2,
                    }}>
                      {review.location && review.location}
                      {review.location && review.timeAgo && ' · '}
                      {review.timeAgo && review.timeAgo}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div style={{ marginTop: '2.5rem', textAlign: 'center' }}>
          <a
            href="https://maps.app.goo.gl/ezn288NdLtgg8ba36"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              fontFamily: "'Montserrat', sans-serif",
              fontSize: '0.82rem',
              fontWeight: 600,
              color: 'rgba(255,255,255,0.45)',
              textDecoration: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              borderBottom: '1px solid rgba(255,255,255,0.15)',
              paddingBottom: 2,
              transition: 'color 0.2s, border-color 0.2s',
            }}
            onMouseEnter={(e) => { const a = e.currentTarget as HTMLAnchorElement; a.style.color = '#FFF200'; a.style.borderBottomColor = '#FFF200'; }}
            onMouseLeave={(e) => { const a = e.currentTarget as HTMLAnchorElement; a.style.color = 'rgba(255,255,255,0.45)'; a.style.borderBottomColor = 'rgba(255,255,255,0.15)'; }}
          >
            Ver todas las reseñas en Google
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M2 7h10M8 3l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </a>
        </div>
      </div>

      <style>{`
        @media (max-width: 900px) {
          .reviews-grid { grid-template-columns: 1fr !important; }
        }
        @media (min-width: 640px) and (max-width: 900px) {
          .reviews-grid { grid-template-columns: repeat(2, 1fr) !important; }
        }
      `}</style>
    </section>
  );
}
