// src/components/navigation/Breadcrumbs.tsx
import React from 'react';
import Icon from '../ui/Icon';

interface BreadcrumbsProps {
  category?: { id: string; name: string; slug: string } | null;
  subcategory?: { id: string; name: string; slug: string } | null;
  product?: { name: string; slug: string };
}

const Breadcrumbs: React.FC<BreadcrumbsProps> = ({ category, subcategory, product }) => {
  return (
    <nav style={{ marginBottom: '1.5rem' }}>
      <ol
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          fontSize: '0.875rem',
          color: 'var(--color-gray-600)',
        }}
      >
        <li>
          <a href="/" style={{ color: 'var(--color-cyan-600)', textDecoration: 'none' }}>
            Inicio
          </a>
        </li>

        {category && (
          <>
            <li>
              <Icon name="chevron-right" className="w-4 h-4" />
            </li>
            <li>
              <a
                href={`/categoria/${category.slug}`}
                style={{
                  color: subcategory || product ? 'var(--color-cyan-600)' : 'var(--color-gray-800)',
                  textDecoration: 'none',
                }}
              >
                {category.name}
              </a>
            </li>
          </>
        )}

        {subcategory && (
          <>
            <li>
              <Icon name="chevron-right" className="w-4 h-4" />
            </li>
            <li>
              <a
                href={`/categoria/${category?.slug}/${subcategory.slug}`}
                style={{
                  color: product ? 'var(--color-cyan-600)' : 'var(--color-gray-800)',
                  textDecoration: 'none',
                }}
              >
                {subcategory.name}
              </a>
            </li>
          </>
        )}

        {product && (
          <>
            <li>
              <Icon name="chevron-right" className="w-4 h-4" />
            </li>
            <li style={{ color: 'var(--color-gray-800)', fontWeight: '500' }}>{product.name}</li>
          </>
        )}
      </ol>
    </nav>
  );
};

export default Breadcrumbs;
