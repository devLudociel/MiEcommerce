// src/components/products/ProductCard.tsx
import React, { useCallback } from 'react';

// Placeholder de imagen - ajusta según tu ubicación real
const FALLBACK_IMG_400x300 = '/placeholder-product.jpg';

interface Product {
  id: string;
  name: string;
  description: string;
  basePrice: number;
  images: string[];
  attributes: { attributeId: string; value: string }[];
  tags: string[];
  featured: boolean;
  slug: string;
}

interface ProductCardProps {
  product: Product;
  onClick?: () => void;
}

// PERFORMANCE: Move static styles outside component to prevent recreation
const cardStyle: React.CSSProperties = {
  background: 'white',
  borderRadius: '12px',
  overflow: 'hidden',
  boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
  border: '1px solid var(--color-gray-200)',
  transition: 'all 0.3s ease',
  cursor: 'pointer',
};

const imageContainerStyle: React.CSSProperties = {
  position: 'relative',
  paddingBottom: '60%',
  overflow: 'hidden',
};

const imageStyle: React.CSSProperties = {
  position: 'absolute',
  top: 0,
  left: 0,
  width: '100%',
  height: '100%',
  objectFit: 'cover',
};

const featuredBadgeStyle: React.CSSProperties = {
  position: 'absolute',
  top: '0.5rem',
  right: '0.5rem',
  background: 'var(--color-cyan-600)',
  color: 'white',
  padding: '0.25rem 0.5rem',
  borderRadius: '4px',
  fontSize: '0.75rem',
  fontWeight: '500',
};

const contentStyle: React.CSSProperties = {
  padding: '1rem',
};

const titleStyle: React.CSSProperties = {
  fontSize: '1.1rem',
  fontWeight: '600',
  marginBottom: '0.5rem',
  color: 'var(--color-gray-800)',
  lineHeight: '1.3',
};

const descriptionStyle: React.CSSProperties = {
  fontSize: '0.875rem',
  color: 'var(--color-gray-600)',
  marginBottom: '0.75rem',
  lineHeight: '1.4',
  display: '-webkit-box',
  WebkitLineClamp: 2,
  WebkitBoxOrient: 'vertical',
  overflow: 'hidden',
};

const attributeContainerStyle: React.CSSProperties = {
  marginBottom: '0.75rem',
};

const flexWrapStyle: React.CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: '0.25rem',
};

const attributeBadgeStyle: React.CSSProperties = {
  fontSize: '0.75rem',
  background: 'var(--color-gray-100)',
  color: 'var(--color-gray-700)',
  padding: '0.125rem 0.5rem',
  borderRadius: '12px',
};

const moreAttributesStyle: React.CSSProperties = {
  fontSize: '0.75rem',
  color: 'var(--color-gray-500)',
  padding: '0.125rem 0.5rem',
};

const tagBadgeStyle: React.CSSProperties = {
  fontSize: '0.75rem',
  background: 'var(--color-cyan-50)',
  color: 'var(--color-cyan-700)',
  padding: '0.125rem 0.5rem',
  borderRadius: '12px',
  border: '1px solid var(--color-cyan-200)',
};

const priceContainerStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
};

const priceStyle: React.CSSProperties = {
  fontSize: '1.25rem',
  fontWeight: '700',
  color: 'var(--color-gray-900)',
};

const priceSubtextStyle: React.CSSProperties = {
  fontSize: '0.75rem',
  color: 'var(--color-gray-500)',
  marginLeft: '0.25rem',
};

const buttonStyle: React.CSSProperties = {
  background: 'var(--color-cyan-600)',
  color: 'white',
  border: 'none',
  padding: '0.5rem 1rem',
  borderRadius: '6px',
  fontSize: '0.875rem',
  fontWeight: '500',
  cursor: 'pointer',
  transition: 'background-color 0.2s ease',
};

// PERFORMANCE: Memoize component to prevent unnecessary re-renders
const ProductCard: React.FC<ProductCardProps> = React.memo(({ product, onClick }) => {
  // PERFORMANCE: Wrap click handler in useCallback
  const handleClick = useCallback(() => {
    if (onClick) {
      onClick();
    } else {
      window.location.href = `/producto/${product.slug}`;
    }
  }, [onClick, product.slug]);

  const handleImageError = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    img.onerror = null;
    img.src = FALLBACK_IMG_400x300;
  }, []);

  const handleCardMouseEnter = useCallback((e: React.MouseEvent<HTMLElement>) => {
    e.currentTarget.style.transform = 'translateY(-4px)';
    e.currentTarget.style.boxShadow = '0 8px 25px rgba(0,0,0,0.15)';
  }, []);

  const handleCardMouseLeave = useCallback((e: React.MouseEvent<HTMLElement>) => {
    e.currentTarget.style.transform = 'translateY(0)';
    e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)';
  }, []);

  const handleButtonMouseEnter = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    e.currentTarget.style.backgroundColor = 'var(--color-cyan-700)';
  }, []);

  const handleButtonMouseLeave = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    e.currentTarget.style.backgroundColor = 'var(--color-cyan-600)';
  }, []);

  const handleButtonClick = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    console.log('Añadir al carrito:', product.id);
  }, [product.id]);

  return (
    <article
      style={cardStyle}
      onClick={handleClick}
      onMouseEnter={handleCardMouseEnter}
      onMouseLeave={handleCardMouseLeave}
    >
      {/* Imagen del producto */}
      <div style={imageContainerStyle}>
        <img
          src={product.images[0] || FALLBACK_IMG_400x300}
          alt={product.name}
          loading="lazy"
          style={imageStyle}
          onError={handleImageError}
        />

        {product.featured && (
          <div style={featuredBadgeStyle}>
            Destacado
          </div>
        )}
      </div>

      {/* Contenido del producto */}
      <div style={contentStyle}>
        <h3 style={titleStyle}>
          {product.name}
        </h3>

        <p style={descriptionStyle}>
          {product.description}
        </p>

        {/* Atributos destacados */}
        {product.attributes.length > 0 && (
          <div style={attributeContainerStyle}>
            <div style={flexWrapStyle}>
              {product.attributes.slice(0, 3).map((attr, index) => (
                <span key={index} style={attributeBadgeStyle}>
                  {attr.value}
                </span>
              ))}
              {product.attributes.length > 3 && (
                <span style={moreAttributesStyle}>
                  +{product.attributes.length - 3} más
                </span>
              )}
            </div>
          </div>
        )}

        {/* Tags */}
        {product.tags.length > 0 && (
          <div style={attributeContainerStyle}>
            <div style={flexWrapStyle}>
              {product.tags.slice(0, 2).map((tag) => (
                <span key={tag} style={tagBadgeStyle}>
                  #{tag}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Precio y botón */}
        <div style={priceContainerStyle}>
          <div>
            <span style={priceStyle}>
              €{product.basePrice.toFixed(2)}
            </span>
            <span style={priceSubtextStyle}>
              desde
            </span>
          </div>

          <button
            style={buttonStyle}
            onMouseEnter={handleButtonMouseEnter}
            onMouseLeave={handleButtonMouseLeave}
            onClick={handleButtonClick}
          >
            Ver detalles
          </button>
        </div>
      </div>
    </article>
  );
});

// Add display name for debugging
ProductCard.displayName = 'ProductCard';

export default ProductCard;
