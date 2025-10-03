// src/components/products/ProductCard.tsx
import React from 'react';

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

const ProductCard: React.FC<ProductCardProps> = ({ product, onClick }) => {
  const handleClick = () => {
    if (onClick) {
      onClick();
    } else {
      window.location.href = `/producto/${product.slug}`;
    }
  };

  return (
    <article 
      style={{ 
        background: 'white',
        borderRadius: '12px',
        overflow: 'hidden',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        border: '1px solid var(--color-gray-200)',
        transition: 'all 0.3s ease',
        cursor: 'pointer'
      }}
      onClick={handleClick}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-4px)';
        e.currentTarget.style.boxShadow = '0 8px 25px rgba(0,0,0,0.15)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)';
      }}
    >
      {/* Imagen del producto */}
      <div style={{ position: 'relative', paddingBottom: '60%', overflow: 'hidden' }}>
        <img
          src={product.images[0] || FALLBACK_IMG_400x300}
          alt={product.name}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover'
          }}
          onError={(e) => {
            const img = e.currentTarget as HTMLImageElement;
            img.onerror = null;
            img.src = FALLBACK_IMG_400x300;
          }}
        />
        
        {product.featured && (
          <div style={{
            position: 'absolute',
            top: '0.5rem',
            right: '0.5rem',
            background: 'var(--color-cyan-600)',
            color: 'white',
            padding: '0.25rem 0.5rem',
            borderRadius: '4px',
            fontSize: '0.75rem',
            fontWeight: '500'
          }}>
            Destacado
          </div>
        )}
      </div>

      {/* Contenido del producto */}
      <div style={{ padding: '1rem' }}>
        <h3 style={{ 
          fontSize: '1.1rem', 
          fontWeight: '600', 
          marginBottom: '0.5rem',
          color: 'var(--color-gray-800)',
          lineHeight: '1.3'
        }}>
          {product.name}
        </h3>
        
        <p style={{ 
          fontSize: '0.875rem', 
          color: 'var(--color-gray-600)', 
          marginBottom: '0.75rem',
          lineHeight: '1.4',
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden'
        }}>
          {product.description}
        </p>

        {/* Atributos destacados */}
        {product.attributes.length > 0 && (
          <div style={{ marginBottom: '0.75rem' }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem' }}>
              {product.attributes.slice(0, 3).map((attr, index) => (
                <span 
                  key={index}
                  style={{
                    fontSize: '0.75rem',
                    background: 'var(--color-gray-100)',
                    color: 'var(--color-gray-700)',
                    padding: '0.125rem 0.5rem',
                    borderRadius: '12px'
                  }}
                >
                  {attr.value}
                </span>
              ))}
              {product.attributes.length > 3 && (
                <span style={{
                  fontSize: '0.75rem',
                  color: 'var(--color-gray-500)',
                  padding: '0.125rem 0.5rem'
                }}>
                  +{product.attributes.length - 3} más
                </span>
              )}
            </div>
          </div>
        )}

        {/* Tags */}
        {product.tags.length > 0 && (
          <div style={{ marginBottom: '0.75rem' }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem' }}>
              {product.tags.slice(0, 2).map((tag) => (
                <span 
                  key={tag}
                  style={{
                    fontSize: '0.75rem',
                    background: 'var(--color-cyan-50)',
                    color: 'var(--color-cyan-700)',
                    padding: '0.125rem 0.5rem',
                    borderRadius: '12px',
                    border: '1px solid var(--color-cyan-200)'
                  }}
                >
                  #{tag}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Precio y botón */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <span style={{ 
              fontSize: '1.25rem', 
              fontWeight: '700', 
              color: 'var(--color-gray-900)' 
            }}>
              €{product.basePrice.toFixed(2)}
            </span>
            <span style={{ 
              fontSize: '0.75rem', 
              color: 'var(--color-gray-500)',
              marginLeft: '0.25rem'
            }}>
              desde
            </span>
          </div>
          
          <button 
            style={{
              background: 'var(--color-cyan-600)',
              color: 'white',
              border: 'none',
              padding: '0.5rem 1rem',
              borderRadius: '6px',
              fontSize: '0.875rem',
              fontWeight: '500',
              cursor: 'pointer',
              transition: 'background-color 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--color-cyan-700)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--color-cyan-600)';
            }}
            onClick={(e) => {
              e.stopPropagation();
              console.log('Añadir al carrito:', product.id);
            }}
          >
            Ver detalles
          </button>
        </div>
      </div>
    </article>
  );
};

export default ProductCard;