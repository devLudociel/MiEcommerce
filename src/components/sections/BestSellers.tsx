// src/components/sections/BestSellers.tsx
import { useMemo } from 'react';
import { useProducts } from '../../hooks/react-query/useProducts';
import { safeImageSrc } from '../../lib/placeholders';

interface Product {
  id: string;
  name: string;
  price: number;
  salePrice?: number;
  image: string;
  slug?: string;
  salesCount: number;
  isNew?: boolean;
}

// Warm placeholder colors for cards without image
const CARD_COLORS = ['#e8ddd0', '#dde8e0', '#e0dde8', '#e8e0dd'];

export default function BestSellers() {
  const { data: rawProducts = [], isLoading: loading } = useProducts({
    limit: 20,
    excludeReadyMade: true,
  });

  const products = useMemo(() => {
    const items: Product[] = rawProducts.map((doc, idx) => ({
      id: doc.id,
      name: doc.name || 'Producto',
      price: Number((doc as any).basePrice || doc.price) || 0,
      salePrice: doc.salePrice ? Number(doc.salePrice) : undefined,
      image: safeImageSrc(doc.images?.[0]),
      slug: doc.slug || doc.id,
      salesCount: (doc as any).salesCount || 0,
      isNew: idx < 2 && (doc as any).salesCount === 0,
    }));
    return items.sort((a, b) => b.salesCount - a.salesCount).slice(0, 4);
  }, [rawProducts]);

  if (loading) {
    return (
      <section style={{ backgroundColor: '#fff', padding: '5rem 0' }}>
        <div style={{ maxWidth: 1280, margin: '0 auto', padding: '0 1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '2.5rem' }}>
            <div style={{ height: 40, width: 320, backgroundColor: '#f0ebe3', borderRadius: 8, animation: 'pulse 1.5s infinite' }} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem' }}>
            {[...Array(4)].map((_, i) => (
              <div key={i} style={{ backgroundColor: '#f0ebe3', borderRadius: 16, aspectRatio: '3/4', animation: 'pulse 1.5s infinite' }} />
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (products.length === 0) return null;

  return (
    <section style={{ backgroundColor: '#fff', padding: '5rem 0' }}>
      <div style={{ maxWidth: 1280, margin: '0 auto', padding: '0 1.5rem' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: '2.5rem', flexWrap: 'wrap', gap: '1rem' }}>
          <h2 style={{
            fontFamily: "'Cormorant Garamond', Georgia, serif",
            fontSize: 'clamp(1.8rem, 3vw, 2.5rem)',
            fontWeight: 500,
            color: '#1A1A1A',
            margin: 0,
            lineHeight: 1.15,
          }}>
            Lo más pedido{' '}
            <em style={{ fontStyle: 'italic', color: '#555' }}>esta semana</em>
          </h2>
          <a
            href="/productos"
            style={{
              fontFamily: "'Montserrat', sans-serif",
              fontSize: '0.82rem',
              fontWeight: 600,
              color: '#555',
              textDecoration: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              borderBottom: '1px solid #ccc',
              paddingBottom: 2,
              whiteSpace: 'nowrap',
            }}
          >
            Ver todos los productos
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M2 7h10M8 3l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </a>
        </div>

        {/* Product Grid */}
        <div
          style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem' }}
          className="bestsellers-grid"
        >
          {products.map((product, index) => (
            <a
              key={product.id}
              href={`/producto/${product.slug}`}
              style={{ textDecoration: 'none', display: 'block' }}
            >
              <div
                style={{
                  backgroundColor: '#fff',
                  borderRadius: 16,
                  overflow: 'hidden',
                  border: '1px solid #f0ebe3',
                  transition: 'transform 0.25s ease, box-shadow 0.25s ease',
                  cursor: 'pointer',
                }}
                onMouseEnter={(e) => {
                  const el = e.currentTarget as HTMLDivElement;
                  el.style.transform = 'translateY(-4px)';
                  el.style.boxShadow = '0 16px 48px rgba(0,0,0,0.09)';
                }}
                onMouseLeave={(e) => {
                  const el = e.currentTarget as HTMLDivElement;
                  el.style.transform = 'translateY(0)';
                  el.style.boxShadow = 'none';
                }}
              >
                {/* Image area */}
                <div style={{
                  position: 'relative',
                  aspectRatio: '1/1',
                  backgroundColor: CARD_COLORS[index % CARD_COLORS.length],
                  overflow: 'hidden',
                }}>
                  {product.image ? (
                    <img
                      src={product.image}
                      alt={product.name}
                      style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                    />
                  ) : (
                    <div style={{
                      width: '100%', height: '100%',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <span style={{
                        fontFamily: "'Montserrat', sans-serif",
                        fontSize: '0.6rem',
                        color: 'rgba(26,26,26,0.3)',
                        letterSpacing: '0.1em',
                        textTransform: 'uppercase',
                      }}>
                        [ producto ]
                      </span>
                    </div>
                  )}

                  {/* Badge */}
                  {index === 0 && (
                    <div style={{
                      position: 'absolute',
                      top: 10,
                      left: 10,
                      backgroundColor: '#1A1A1A',
                      color: '#fff',
                      fontFamily: "'Montserrat', sans-serif",
                      fontSize: '0.58rem',
                      fontWeight: 700,
                      letterSpacing: '0.08em',
                      textTransform: 'uppercase',
                      padding: '4px 10px',
                      borderRadius: 50,
                    }}>
                      Top ventas
                    </div>
                  )}
                  {product.isNew && (
                    <div style={{
                      position: 'absolute',
                      top: 10,
                      left: 10,
                      backgroundColor: '#EC008C',
                      color: '#fff',
                      fontFamily: "'Montserrat', sans-serif",
                      fontSize: '0.58rem',
                      fontWeight: 700,
                      letterSpacing: '0.08em',
                      textTransform: 'uppercase',
                      padding: '4px 10px',
                      borderRadius: 50,
                    }}>
                      Nuevo
                    </div>
                  )}
                  {product.salePrice && (
                    <div style={{
                      position: 'absolute',
                      top: 10,
                      right: 10,
                      backgroundColor: '#FFF200',
                      color: '#1A1A1A',
                      fontFamily: "'Montserrat', sans-serif",
                      fontSize: '0.58rem',
                      fontWeight: 800,
                      padding: '4px 10px',
                      borderRadius: 50,
                    }}>
                      -{Math.round((1 - product.salePrice / product.price) * 100)}%
                    </div>
                  )}
                </div>

                {/* Info */}
                <div style={{ padding: '14px 14px 16px' }}>
                  <h3 style={{
                    fontFamily: "'Montserrat', sans-serif",
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    color: '#1A1A1A',
                    margin: '0 0 6px',
                    lineHeight: 1.35,
                    overflow: 'hidden',
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                  } as React.CSSProperties}>
                    {product.name}
                  </h3>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                    {product.salePrice ? (
                      <>
                        <span style={{
                          fontFamily: "'Montserrat', sans-serif",
                          fontWeight: 700,
                          fontSize: '1rem',
                          color: '#1A1A1A',
                        }}>
                          {product.salePrice.toFixed(2).replace('.', ',')} €
                        </span>
                        <span style={{
                          fontFamily: "'Montserrat', sans-serif",
                          fontSize: '0.78rem',
                          color: '#bbb',
                          textDecoration: 'line-through',
                        }}>
                          {product.price.toFixed(2).replace('.', ',')} €
                        </span>
                      </>
                    ) : (
                      <span style={{
                        fontFamily: "'Montserrat', sans-serif",
                        fontWeight: 700,
                        fontSize: '1rem',
                        color: '#1A1A1A',
                      }}>
                        {product.price > 0 ? `desde ${product.price.toFixed(2).replace('.', ',')} €` : 'Ver precio'}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </a>
          ))}
        </div>
      </div>

      <style>{`
        @media (max-width: 900px) {
          .bestsellers-grid {
            grid-template-columns: repeat(2, 1fr) !important;
          }
        }
        @media (max-width: 480px) {
          .bestsellers-grid {
            grid-template-columns: repeat(2, 1fr) !important;
            gap: 0.6rem !important;
          }
        }
      `}</style>
    </section>
  );
}
