// src/components/products/ProductGrid.tsx
import React from 'react';
import ProductCard from './ProductCard';

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

interface ProductGridProps {
  products: Product[];
}

const ProductGrid: React.FC<ProductGridProps> = ({ products }) => {
  if (products.length === 0) {
    return (
      <div
        style={{
          textAlign: 'center',
          padding: '3rem',
          background: 'var(--color-gray-50)',
          borderRadius: '12px',
          border: '2px dashed var(--color-gray-300)',
        }}
      >
        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🔍</div>
        <h3
          style={{
            fontSize: '1.25rem',
            fontWeight: '600',
            marginBottom: '0.5rem',
            color: 'var(--color-gray-800)',
          }}
        >
          No se encontraron productos
        </h3>
        <p style={{ color: 'var(--color-gray-600)' }}>
          Intenta ajustar los filtros para ver más resultados
        </p>
      </div>
    );
  }

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
        gap: '1.5rem',
      }}
    >
      {products.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );
};

export default ProductGrid;
