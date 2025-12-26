// src/components/pages/CategoryPageOptimized.tsx
import React, { useState, useEffect, useMemo } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import Breadcrumbs from '../navigation/Breadcrumbs';
import ProductGrid from '../products/ProductGrid';

interface CategoryPageProps {
  categorySlug?: string;
  subcategorySlug?: string;
}

interface Product {
  id: string;
  name: string;
  description: string;
  categoryId: string;
  subcategoryId: string;
  basePrice: number;
  salePrice?: number;
  onSale?: boolean;
  images: string[];
  tags: string[];
  featured: boolean;
  slug: string;
  active: boolean;
  category?: string;
}

interface FilterState {
  priceRange: [number, number];
  tags: string[];
  sortBy: 'price-asc' | 'price-desc' | 'name' | 'featured' | 'newest';
  onSale: boolean;
}

// Datos de categorías (sincronizado con src/data/categories.ts)
const categories = [
  { id: '1', name: 'Productos Gráficos', slug: 'graficos-impresos' },
  { id: '2', name: 'Productos Textiles', slug: 'textiles' },
  { id: '3', name: 'Papelería', slug: 'papeleria' },
  { id: '4', name: 'Sublimación', slug: 'sublimados' },
  { id: '5', name: 'Corte Láser', slug: 'corte-grabado' },
  { id: '6', name: 'Eventos', slug: 'eventos' },
  { id: '7', name: 'Impresión 3D', slug: 'impresion-3d' },
  { id: '8', name: 'Packaging Personalizado', slug: 'packaging' },
  { id: '9', name: 'Servicios Digitales', slug: 'servicios-digitales' },
];

const subcategories = [
  // Productos Gráficos (categoryId: '1')
  { id: '1', categoryId: '1', name: 'Tarjetas de Visita', slug: 'tarjetas-visita' },
  { id: '2', categoryId: '1', name: 'Etiquetas y Pegatinas', slug: 'etiquetas-pegatinas' },
  { id: '3', categoryId: '1', name: 'Carteles para Eventos', slug: 'carteles-eventos' },
  // Productos Textiles (categoryId: '2')
  { id: '4', categoryId: '2', name: 'Ropa Personalizada', slug: 'ropa-personalizada' },
  { id: '5', categoryId: '2', name: 'Complementos Textiles', slug: 'complementos-textiles' },
  // Papelería (categoryId: '3')
  { id: '6', categoryId: '3', name: 'Cuadernos y Libretas', slug: 'cuadernos-libretas' },
  { id: '7', categoryId: '3', name: 'Packaging Corporativo', slug: 'packaging-corporativo' },
  // Sublimación (categoryId: '4')
  { id: '8', categoryId: '4', name: 'Vajilla Personalizada', slug: 'vajilla-personalizada' },
  { id: '9', categoryId: '4', name: 'Decoración Sublimada', slug: 'decoracion-sublimada' },
  // Corte Láser (categoryId: '5')
  { id: '10', categoryId: '5', name: 'Llaveros Personalizados', slug: 'llaveros' },
  { id: '11', categoryId: '5', name: 'Decoración en Madera', slug: 'decoracion-madera-eventos' },
  { id: '12', categoryId: '5', name: 'Cuadros de Madera', slug: 'cuadros-madera' },
  // Eventos (categoryId: '6')
  { id: '13', categoryId: '6', name: 'Packaging para Eventos', slug: 'packaging-eventos' },
  // Impresión 3D (categoryId: '7')
  { id: '14', categoryId: '7', name: 'Impresión en Resina', slug: 'impresion-resina' },
  { id: '15', categoryId: '7', name: 'Impresión en Filamento', slug: 'impresion-filamento' },
  // Packaging Personalizado (categoryId: '8')
  { id: '18', categoryId: '8', name: 'Cajas Personalizadas', slug: 'cajas-personalizadas' },
  { id: '19', categoryId: '8', name: 'Bolsas de Papel', slug: 'bolsas-papel' },
  { id: '20', categoryId: '8', name: 'Bolsas de Tela', slug: 'bolsas-tela' },
  { id: '21', categoryId: '8', name: 'Packaging para Eventos', slug: 'packaging-eventos' },
  { id: '22', categoryId: '8', name: 'Etiquetas Adhesivas', slug: 'etiquetas-adhesivas' },
  { id: '23', categoryId: '8', name: 'Papel de Regalo', slug: 'papel-regalo' },
  // Servicios Digitales (categoryId: '9')
  { id: '24', categoryId: '9', name: 'Diseño Gráfico', slug: 'diseno-grafico' },
  { id: '25', categoryId: '9', name: 'Desarrollo Web', slug: 'desarrollo-web' },
  { id: '26', categoryId: '9', name: 'Productos Digitales', slug: 'productos-digitales' },
];

const CategoryPageOptimized: React.FC<CategoryPageProps> = ({ categorySlug, subcategorySlug }) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showMobileFilters, setShowMobileFilters] = useState(false);

  // Encontrar categoría y subcategoría actuales
  const currentCategory = categories.find((cat) => cat.slug === categorySlug);
  const currentSubcategory = subcategories.find(
    (sub) => sub.slug === subcategorySlug && sub.categoryId === currentCategory?.id
  );

  // Estado de filtros con valores iniciales dinámicos
  const [filters, setFilters] = useState<FilterState>({
    priceRange: [0, 1000],
    tags: [],
    sortBy: 'featured',
    onSale: false,
  });

  // Cargar productos desde Firebase
  useEffect(() => {
    if (!categorySlug) {
      setError('Categoría no encontrada');
      setLoading(false);
      return;
    }

    console.log('🔍 Buscando productos para:');
    console.log('  Category slug:', categorySlug);
    if (subcategorySlug) {
      console.log('  Subcategory slug:', subcategorySlug);
    }

    setLoading(true);

    // Buscar por el slug de categoría directamente (más simple y confiable)
    let productQuery = query(
      collection(db, 'products'),
      where('category', '==', categorySlug),
      where('active', '==', true)
    );

    // Si hay subcategoría, filtrar también por ella
    if (subcategorySlug) {
      productQuery = query(
        collection(db, 'products'),
        where('category', '==', categorySlug),
        where('subcategory', '==', subcategorySlug),
        where('active', '==', true)
      );
    }

    const unsubscribe = onSnapshot(
      productQuery,
      (snapshot) => {
        console.log('📦 Productos encontrados:', snapshot.size);

        const productList: Product[] = snapshot.docs.map(
          (doc) =>
            ({
              id: doc.id,
              ...doc.data(),
            }) as Product
        );

        // Log de los primeros 3 productos para debug
        productList.slice(0, 3).forEach((p) => {
          console.log(
            '  -',
            p.name,
            '| category:',
            p.category,
            '| subcategory:',
            (p as any).subcategory
          );
        });

        setProducts(productList);
        setLoading(false);

        // Actualizar rango de precios basado en productos reales
        if (productList.length > 0) {
          const prices = productList.map((p) => p.basePrice);
          const minPrice = Math.floor(Math.min(...prices));
          const maxPrice = Math.ceil(Math.max(...prices));
          setFilters((prev) => ({
            ...prev,
            priceRange: [minPrice, maxPrice],
          }));
        }
      },
      (err) => {
        console.error('Error cargando productos:', err);
        setError('Error cargando productos');
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [categorySlug, subcategorySlug]);

  // Extraer tags únicos de los productos (dinámicamente)
  const availableTags = useMemo(() => {
    const allTags = new Set<string>();
    products.forEach((product) => {
      if (product.tags && Array.isArray(product.tags)) {
        product.tags.forEach((tag) => {
          if (tag && typeof tag === 'string') {
            allTags.add(tag);
          }
        });
      }
    });
    return Array.from(allTags).sort();
  }, [products]);

  // Calcular rango de precios real
  const realPriceRange = useMemo<[number, number]>(() => {
    if (products.length === 0) return [0, 1000];
    const prices = products.map((p) => p.basePrice);
    return [Math.floor(Math.min(...prices)), Math.ceil(Math.max(...prices))];
  }, [products]);

  // Filtrar y ordenar productos
  const filteredProducts = useMemo(() => {
    const filtered = products.filter((product) => {
      // Filtro por precio
      if (product.basePrice < filters.priceRange[0] || product.basePrice > filters.priceRange[1]) {
        return false;
      }

      // Filtro por tags
      if (filters.tags.length > 0) {
        const hasMatchingTag = filters.tags.some((tag) => product.tags?.includes(tag));
        if (!hasMatchingTag) return false;
      }

      // Filtro por ofertas
      if (filters.onSale && !product.onSale) {
        return false;
      }

      return true;
    });

    // Ordenar
    switch (filters.sortBy) {
      case 'price-asc':
        filtered.sort((a, b) => a.basePrice - b.basePrice);
        break;
      case 'price-desc':
        filtered.sort((a, b) => b.basePrice - a.basePrice);
        break;
      case 'name':
        filtered.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case 'featured':
        filtered.sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0));
        break;
      case 'newest':
        // Si tienes campo createdAt, úsalo aquí
        break;
    }

    return filtered;
  }, [products, filters]);

  const toggleTag = (tag: string) => {
    setFilters((prev) => ({
      ...prev,
      tags: prev.tags.includes(tag) ? prev.tags.filter((t) => t !== tag) : [...prev.tags, tag],
    }));
  };

  const clearFilters = () => {
    setFilters({
      priceRange: realPriceRange,
      tags: [],
      sortBy: 'featured',
      onSale: false,
    });
  };

  const activeFiltersCount = filters.tags.length + (filters.onSale ? 1 : 0);

  if (error) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', marginTop: '200px' }}>
        <h2>Error</h2>
        <p>{error}</p>
        <a href="/" style={{ color: 'var(--color-cyan-600)' }}>
          Volver al inicio
        </a>
      </div>
    );
  }

  return (
    <div style={{ marginTop: '200px', minHeight: '100vh', background: '#f9fafb' }}>
      <div className="container" style={{ padding: '2rem 1rem' }}>
        {/* Breadcrumbs */}
        <Breadcrumbs category={currentCategory} subcategory={currentSubcategory} />

        {/* Encabezado */}
        <div
          style={{
            marginBottom: '2rem',
            background: 'white',
            padding: '2rem',
            borderRadius: '12px',
          }}
        >
          <h1
            style={{
              fontSize: '2.5rem',
              fontWeight: 'bold',
              marginBottom: '0.5rem',
              color: 'var(--color-gray-800)',
            }}
          >
            {currentSubcategory ? currentSubcategory.name : currentCategory?.name}
          </h1>
          <p style={{ color: 'var(--color-gray-600)', fontSize: '1.1rem' }}>
            {filteredProducts.length} producto{filteredProducts.length !== 1 ? 's' : ''} encontrado
            {filteredProducts.length !== 1 ? 's' : ''}
          </p>
        </div>

        {/* Botón móvil de filtros */}
        <div className="lg:hidden mb-4">
          <button
            onClick={() => setShowMobileFilters(!showMobileFilters)}
            style={{
              width: '100%',
              padding: '12px 20px',
              background: 'white',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: '16px',
              fontWeight: '500',
              cursor: 'pointer',
            }}
          >
            <span>Filtros {activeFiltersCount > 0 && `(${activeFiltersCount})`}</span>
            <svg
              style={{
                width: '20px',
                height: '20px',
                transform: showMobileFilters ? 'rotate(180deg)' : 'none',
                transition: 'transform 0.2s',
              }}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </button>
        </div>

        {/* Layout responsive */}
        <div className="lg:grid lg:grid-cols-4 lg:gap-8">
          {/* Panel de filtros */}
          <aside
            className={`lg:block ${showMobileFilters ? 'block' : 'hidden'}`}
            style={{ marginBottom: showMobileFilters ? '1.5rem' : '0' }}
          >
            <div
              style={{
                background: 'white',
                borderRadius: '12px',
                padding: '1.5rem',
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                position: 'sticky',
                top: '220px',
              }}
            >
              {/* Header de filtros */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '1.5rem',
                }}
              >
                <h3 style={{ fontSize: '1.125rem', fontWeight: '600', margin: 0 }}>Filtros</h3>
                {activeFiltersCount > 0 && (
                  <button
                    onClick={clearFilters}
                    style={{
                      fontSize: '0.875rem',
                      color: 'var(--color-cyan-600)',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      fontWeight: '500',
                    }}
                  >
                    Limpiar ({activeFiltersCount})
                  </button>
                )}
              </div>

              {/* Ordenar por */}
              <div
                style={{
                  marginBottom: '1.5rem',
                  paddingBottom: '1.5rem',
                  borderBottom: '1px solid #e5e7eb',
                }}
              >
                <label
                  style={{
                    display: 'block',
                    fontWeight: '500',
                    marginBottom: '0.5rem',
                    fontSize: '0.875rem',
                    color: '#374151',
                  }}
                >
                  Ordenar por
                </label>
                <select
                  value={filters.sortBy}
                  onChange={(e) =>
                    setFilters({ ...filters, sortBy: e.target.value as FilterState['sortBy'] })
                  }
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '14px',
                  }}
                >
                  <option value="featured">Destacados</option>
                  <option value="price-asc">Precio: Menor a Mayor</option>
                  <option value="price-desc">Precio: Mayor a Menor</option>
                  <option value="name">Nombre A-Z</option>
                </select>
              </div>

              {/* Rango de precio */}
              <div
                style={{
                  marginBottom: '1.5rem',
                  paddingBottom: '1.5rem',
                  borderBottom: '1px solid #e5e7eb',
                }}
              >
                <label
                  style={{
                    display: 'block',
                    fontWeight: '500',
                    marginBottom: '0.5rem',
                    fontSize: '0.875rem',
                    color: '#374151',
                  }}
                >
                  Precio: €{filters.priceRange[0]} - €{filters.priceRange[1]}
                </label>
                <input
                  type="range"
                  min={realPriceRange[0]}
                  max={realPriceRange[1]}
                  value={filters.priceRange[1]}
                  onChange={(e) =>
                    setFilters({
                      ...filters,
                      priceRange: [filters.priceRange[0], parseInt(e.target.value)],
                    })
                  }
                  style={{ width: '100%' }}
                />
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontSize: '12px',
                    color: '#6b7280',
                    marginTop: '4px',
                  }}
                >
                  <span>€{realPriceRange[0]}</span>
                  <span>€{realPriceRange[1]}</span>
                </div>
              </div>

              {/* Filtro de ofertas */}
              <div
                style={{
                  marginBottom: '1.5rem',
                  paddingBottom: '1.5rem',
                  borderBottom: '1px solid #e5e7eb',
                }}
              >
                <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={filters.onSale}
                    onChange={(e) => setFilters({ ...filters, onSale: e.target.checked })}
                    style={{ marginRight: '8px', width: '16px', height: '16px', cursor: 'pointer' }}
                  />
                  <span style={{ fontSize: '14px', fontWeight: '500' }}>Solo ofertas</span>
                </label>
              </div>

              {/* Tags dinámicos */}
              {availableTags.length > 0 && (
                <div>
                  <label
                    style={{
                      display: 'block',
                      fontWeight: '500',
                      marginBottom: '0.75rem',
                      fontSize: '0.875rem',
                      color: '#374151',
                    }}
                  >
                    Etiquetas ({availableTags.length})
                  </label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                    {availableTags.map((tag) => (
                      <button
                        key={tag}
                        onClick={() => toggleTag(tag)}
                        style={{
                          padding: '6px 12px',
                          fontSize: '13px',
                          borderRadius: '20px',
                          border: filters.tags.includes(tag)
                            ? '2px solid var(--color-cyan-500)'
                            : '1px solid #d1d5db',
                          background: filters.tags.includes(tag) ? 'var(--color-cyan-50)' : 'white',
                          color: filters.tags.includes(tag) ? 'var(--color-cyan-700)' : '#374151',
                          cursor: 'pointer',
                          fontWeight: filters.tags.includes(tag) ? '600' : '400',
                          transition: 'all 0.2s',
                        }}
                      >
                        {tag}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </aside>

          {/* Grid de productos */}
          <main className="lg:col-span-3">
            {loading ? (
              <div
                style={{
                  textAlign: 'center',
                  padding: '3rem',
                  background: 'white',
                  borderRadius: '12px',
                }}
              >
                <div className="loading-spinner"></div>
                <p style={{ marginTop: '1rem', color: '#6b7280' }}>Cargando productos...</p>
              </div>
            ) : filteredProducts.length === 0 ? (
              <div
                style={{
                  textAlign: 'center',
                  padding: '3rem',
                  background: 'white',
                  borderRadius: '12px',
                }}
              >
                <p style={{ fontSize: '1.25rem', color: '#6b7280', marginBottom: '1rem' }}>
                  No se encontraron productos con estos filtros
                </p>
                <button
                  onClick={clearFilters}
                  style={{
                    padding: '10px 20px',
                    background: 'var(--color-cyan-500)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontWeight: '500',
                  }}
                >
                  Limpiar filtros
                </button>
              </div>
            ) : (
              <ProductGrid products={filteredProducts} />
            )}
          </main>
        </div>
      </div>
    </div>
  );
};

export default CategoryPageOptimized;
