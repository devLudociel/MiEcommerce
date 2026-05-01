// src/components/sections/CategoriesShowcase.tsx
import { useState, useEffect, useMemo } from 'react';
import { db } from '../../lib/firebase';
import { collection, onSnapshot } from 'firebase/firestore';
import { categories as navbarCategories } from '../../data/categories';

interface Category {
  id: string;
  name: string;
  slug: string;
  image?: string;
}

// Las 6 técnicas que se muestran en el showcase (en orden)
const SHOWCASE_SLUGS = [
  'graficos-impresos',
  'textiles',
  'sublimados',
  'corte-grabado',
  'impresion-3d',
  'papeleria',
];

const CATEGORY_META: Record<string, { desc: string }> = {
  'graficos-impresos': { desc: 'Flyers, carteles, etiquetas' },
  textiles:            { desc: 'Camisetas, sudaderas, totes' },
  sublimados:          { desc: 'Tazas, cojines, fundas' },
  'corte-grabado':     { desc: 'Madera, metacrilato, cuero' },
  'impresion-3d':      { desc: 'Filamento, resina, figuras' },
  papeleria:           { desc: 'Invitaciones, libretas, tarjetas' },
};

const allCategoriesMap = new Map(
  navbarCategories.map(({ id, name, slug }) => [slug, { id, name, slug }])
);

const MAIN_CATEGORIES: Category[] = SHOWCASE_SLUGS
  .map((slug) => allCategoriesMap.get(slug))
  .filter((c): c is Category => !!c);

const MAIN_CATEGORY_SLUGS = new Set(MAIN_CATEGORIES.map((c) => c.slug));

// Warm placeholder colors per category slot
const PLACEHOLDER_COLORS = [
  '#ddd8cc', '#c8d4ce', '#d8c8c0',
  '#c8ccd4', '#d4c8d0', '#ccd4c8',
];

export default function CategoriesShowcase() {
  const [categoryImages, setCategoryImages] = useState<Record<string, string>>({});

  const categories = useMemo(
    () =>
      MAIN_CATEGORIES.map((category, idx) => ({
        ...category,
        image: categoryImages[category.slug],
        num: String(idx + 1).padStart(2, '0'),
        desc: CATEGORY_META[category.slug]?.desc ?? '',
        placeholderColor: PLACEHOLDER_COLORS[idx % PLACEHOLDER_COLORS.length],
      })),
    [categoryImages]
  );

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'categories'), (snapshot) => {
      const imagesBySlug = snapshot.docs.reduce<Record<string, string>>((acc, doc) => {
        const data = doc.data() as Category;
        if (MAIN_CATEGORY_SLUGS.has(data.slug) && data.image) {
          acc[data.slug] = data.image;
        }
        return acc;
      }, {});
      setCategoryImages(imagesBySlug);
    });
    return () => unsub();
  }, []);

  return (
    <section style={{ backgroundColor: '#F5F0E8', padding: '5rem 0' }}>
      <div style={{ maxWidth: 1280, margin: '0 auto', padding: '0 1.5rem' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: '2.5rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <p style={{
              fontFamily: "'Montserrat', sans-serif",
              fontSize: '0.7rem',
              fontWeight: 700,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color: '#EC008C',
              marginBottom: '0.6rem',
            }}>
              Qué hacemos
            </p>
            <h2 style={{
              fontFamily: "'Cormorant Garamond', Georgia, serif",
              fontSize: 'clamp(1.9rem, 3.5vw, 2.8rem)',
              fontWeight: 500,
              lineHeight: 1.15,
              color: '#1A1A1A',
              margin: 0,
            }}>
              Seis técnicas, una{' '}
              <em style={{ fontStyle: 'italic' }}>sola promesa</em>:{' '}
              <br className="hidden md:block" />
              que el regalo se sienta tuyo.
            </h2>
          </div>
          <a
            href="/productos"
            style={{
              fontFamily: "'Montserrat', sans-serif",
              fontSize: '0.85rem',
              fontWeight: 600,
              color: '#1A1A1A',
              border: '1.5px solid #1A1A1A',
              borderRadius: 50,
              padding: '10px 22px',
              whiteSpace: 'nowrap',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              textDecoration: 'none',
              transition: 'background 0.2s, color 0.2s',
            }}
            onMouseEnter={(e) => { const a = e.currentTarget as HTMLAnchorElement; a.style.backgroundColor = '#1A1A1A'; a.style.color = '#fff'; }}
            onMouseLeave={(e) => { const a = e.currentTarget as HTMLAnchorElement; a.style.backgroundColor = 'transparent'; a.style.color = '#1A1A1A'; }}
          >
            Ver todo el catálogo
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M2 7h10M8 3l4 4-4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </a>
        </div>

        {/* Grid 3×2 */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '1rem',
        }}
          className="categories-grid"
        >
          {categories.map((cat) => (
            <a
              key={cat.id}
              href={`/categoria/${cat.slug}`}
              style={{ textDecoration: 'none', display: 'block' }}
              className="category-card-link"
            >
              <div
                className="category-card"
                style={{
                  backgroundColor: '#fff',
                  borderRadius: 16,
                  overflow: 'hidden',
                  cursor: 'pointer',
                  transition: 'transform 0.25s ease, box-shadow 0.25s ease',
                }}
                onMouseEnter={(e) => {
                  const el = e.currentTarget as HTMLDivElement;
                  el.style.transform = 'translateY(-4px)';
                  el.style.boxShadow = '0 16px 48px rgba(0,0,0,0.1)';
                }}
                onMouseLeave={(e) => {
                  const el = e.currentTarget as HTMLDivElement;
                  el.style.transform = 'translateY(0)';
                  el.style.boxShadow = 'none';
                }}
              >
                {/* Foto */}
                <div style={{
                  position: 'relative',
                  aspectRatio: '4/3',
                  backgroundColor: cat.placeholderColor,
                  overflow: 'hidden',
                }}>
                  {cat.image ? (
                    <img
                      src={cat.image}
                      alt={cat.name}
                      style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                    />
                  ) : (
                    <div style={{
                      width: '100%',
                      height: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}>
                      <span style={{
                        fontFamily: "'Montserrat', sans-serif",
                        fontSize: '0.65rem',
                        color: 'rgba(26,26,26,0.35)',
                        letterSpacing: '0.1em',
                        textTransform: 'uppercase',
                      }}>
                        [ foto · {cat.name.toLowerCase()} ]
                      </span>
                    </div>
                  )}
                  {/* Número */}
                  <div style={{
                    position: 'absolute',
                    top: 12,
                    left: 14,
                    fontFamily: "'Montserrat', sans-serif",
                    fontSize: '0.68rem',
                    fontWeight: 700,
                    color: 'rgba(26,26,26,0.5)',
                    letterSpacing: '0.05em',
                  }}>
                    {cat.num} / {String(categories.length).padStart(2, '0')}
                  </div>
                </div>

                {/* Info */}
                <div style={{ padding: '14px 16px 16px' }}>
                  <h3 style={{
                    fontFamily: "'Cormorant Garamond', Georgia, serif",
                    fontSize: '1.15rem',
                    fontWeight: 600,
                    color: '#1A1A1A',
                    margin: '0 0 4px',
                    lineHeight: 1.2,
                  }}>
                    {cat.name}
                  </h3>
                  <p style={{
                    fontFamily: "'Montserrat', sans-serif",
                    fontSize: '0.72rem',
                    color: '#888',
                    margin: 0,
                    letterSpacing: '0.01em',
                  }}>
                    {cat.desc}
                  </p>
                </div>
              </div>
            </a>
          ))}
        </div>
      </div>

      <style>{`
        @media (max-width: 768px) {
          .categories-grid {
            grid-template-columns: repeat(2, 1fr) !important;
          }
        }
        @media (max-width: 480px) {
          .categories-grid {
            grid-template-columns: 1fr 1fr !important;
            gap: 0.6rem !important;
          }
        }
      `}</style>
    </section>
  );
}
