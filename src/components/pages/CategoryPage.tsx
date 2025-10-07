// src/pages/CategoryPage.tsx
import React, { useState, useEffect, useMemo } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../../lib/firebase'; // Ajusta esta ruta según tu estructura
import Breadcrumbs from '../navigation/Breadcrumbs';
import ProductFilters from '../products/ProductFilters';
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
  images: string[];
  attributes: { attributeId: string; value: string }[];
  tags: string[];
  featured: boolean;
  slug: string;
  active: boolean;
}

interface FilterState {
  priceRange: [number, number];
  attributes: { [attributeId: string]: string[] };
  tags: string[];
  sortBy: 'price-asc' | 'price-desc' | 'name' | 'featured';
}

// Datos de categorías (mismo que en navbar)
const categories = [
  { id: '1', name: 'Productos Gráficos', slug: 'graficos-impresos' },
  { id: '2', name: 'Productos Textiles', slug: 'textiles' },
  { id: '3', name: 'Productos de Papelería', slug: 'papeleria' },
  { id: '4', name: 'Productos Sublimados', slug: 'sublimados' },
  { id: '5', name: 'Corte y Grabado Láser', slug: 'corte-grabado' },
  { id: '6', name: 'Eventos y Celebraciones', slug: 'eventos' },
  { id: '7', name: 'Impresión 3D', slug: 'impresion-3d' },
  { id: '8', name: 'Servicios Digitales', slug: 'servicios-digitales' },
];

const subcategories = [
  { id: '1', categoryId: '1', name: 'Tarjetas de Visita', slug: 'tarjetas-visita' },
  { id: '2', categoryId: '1', name: 'Etiquetas y Pegatinas', slug: 'etiquetas-pegatinas' },
  { id: '3', categoryId: '1', name: 'Carteles para Eventos', slug: 'carteles-eventos' },
  { id: '4', categoryId: '2', name: 'Ropa Personalizada', slug: 'ropa-personalizada' },
  { id: '5', categoryId: '2', name: 'Complementos Textiles', slug: 'complementos-textiles' },
  { id: '6', categoryId: '3', name: 'Cuadernos y Libretas', slug: 'cuadernos-libretas' },
  { id: '7', categoryId: '3', name: 'Packaging Corporativo', slug: 'packaging-corporativo' },
  { id: '8', categoryId: '4', name: 'Vajilla Personalizada', slug: 'vajilla-personalizada' },
  { id: '9', categoryId: '4', name: 'Decoración Sublimada', slug: 'decoracion-sublimada' },
  { id: '10', categoryId: '5', name: 'Llaveros Personalizados', slug: 'llaveros' },
  { id: '11', categoryId: '5', name: 'Decoración en Madera', slug: 'decoracion-madera-eventos' },
  { id: '12', categoryId: '5', name: 'Cuadros de Madera', slug: 'cuadros-madera' },
  { id: '13', categoryId: '6', name: 'Packaging para Eventos', slug: 'packaging-eventos' },
  { id: '14', categoryId: '7', name: 'Impresión en Resina', slug: 'impresion-resina' },
  { id: '15', categoryId: '7', name: 'Impresión en Filamento', slug: 'impresion-filamento' },
  { id: '16', categoryId: '8', name: 'Diseño Gráfico', slug: 'diseno-grafico' },
  { id: '17', categoryId: '8', name: 'Desarrollo Web', slug: 'desarrollo-web' },
];

const attributes = [
  { id: '1', name: 'Forma', options: [{ value: 'Standard' }, { value: 'Cuadrada' }] },
  { id: '2', name: 'Acabado', options: [{ value: 'Mate' }, { value: 'Brillo' }] },
  { id: '3', name: 'Tipo de Prenda', options: [{ value: 'Camiseta' }, { value: 'Sudadera' }, { value: 'Polo' }] },
  { id: '4', name: 'Técnica', options: [{ value: 'DTF' }, { value: 'Vinilo' }, { value: 'Bordado' }] },
  { id: '6', name: 'Material', options: [{ value: 'Papel' }, { value: 'Vinilo' }, { value: 'UV DTF' }] },
  { id: '8', name: 'Producto', options: [{ value: 'Taza' }, { value: 'Vaso' }, { value: 'Termo' }] },
  { id: '10', name: 'Material Base', options: [{ value: 'Madera' }, { value: 'Metal' }] },
  { id: '11', name: 'Material Impresión', options: [{ value: 'Resina' }, { value: 'PLA' }, { value: 'ABS' }] },
];

const CategoryPage: React.FC<CategoryPageProps> = ({ categorySlug, subcategorySlug }) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<FilterState>({
    priceRange: [0, 1000],
    attributes: {},
    tags: [],
    sortBy: 'featured'
  });

  // Encontrar categoría y subcategoría actuales
  const currentCategory = categories.find(cat => cat.slug === categorySlug);
  const currentSubcategory = subcategories.find(sub => 
    sub.slug === subcategorySlug && sub.categoryId === currentCategory?.id
  );

  // Cargar productos desde Firebase
  useEffect(() => {
    if (!currentCategory) {
      setError('Categoría no encontrada');
      setLoading(false);
      return;
    }

    setLoading(true);
    let productQuery = query(
      collection(db, 'products'),
      where('categoryId', '==', currentCategory.id),
      where('active', '==', true)
    );

    // Si hay subcategoría específica, filtrar por ella
    if (currentSubcategory) {
      productQuery = query(
        collection(db, 'products'),
        where('categoryId', '==', currentCategory.id),
        where('subcategoryId', '==', currentSubcategory.id),
        where('active', '==', true)
      );
    }

    const unsubscribe = onSnapshot(
      productQuery,
      (snapshot) => {
        const productList: Product[] = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        } as Product));
        
        setProducts(productList);
        setLoading(false);
      },
      (err) => {
        console.error('Error cargando productos:', err);
        setError('Error cargando productos');
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [currentCategory?.id, currentSubcategory?.id]);

  // Filtrar y ordenar productos
  const filteredProducts = useMemo(() => {
    let filtered = products.filter((product: Product) => {
      // Filtro por rango de precio
      if (product.basePrice < filters.priceRange[0] || product.basePrice > filters.priceRange[1]) {
        return false;
      }

      // Filtro por atributos
      for (const [attributeId, selectedValues] of Object.entries(filters.attributes)) {
        if (selectedValues.length > 0) {
          const productAttribute = product.attributes.find((attr: any) => attr.attributeId === attributeId);
          if (!productAttribute || !selectedValues.includes(productAttribute.value)) {
            return false;
          }
        }
      }

      // Filtro por tags
      if (filters.tags.length > 0) {
        const hasMatchingTag = filters.tags.some((tag: string) => product.tags.includes(tag));
        if (!hasMatchingTag) {
          return false;
        }
      }

      return true;
    });

    // Ordenar productos
    switch (filters.sortBy) {
      case 'price-asc':
        filtered.sort((a: Product, b: Product) => a.basePrice - b.basePrice);
        break;
      case 'price-desc':
        filtered.sort((a: Product, b: Product) => b.basePrice - a.basePrice);
        break;
      case 'name':
        filtered.sort((a: Product, b: Product) => a.name.localeCompare(b.name));
        break;
      case 'featured':
        filtered.sort((a: Product, b: Product) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0));
        break;
    }

    return filtered;
  }, [products, filters]);

  // Obtener atributos disponibles para filtros
  const availableAttributes = useMemo(() => {
    const productAttributes = new Set<string>();
    products.forEach((product: Product) => {
      product.attributes.forEach((attr: any) => {
        productAttributes.add(attr.attributeId);
      });
    });

    return attributes.filter(attr => productAttributes.has(attr.id));
  }, [products]);

  // Obtener tags disponibles
  const availableTags = useMemo(() => {
    const allTags = new Set<string>();
    products.forEach((product: Product) => {
      product.tags.forEach((tag: string) => allTags.add(tag));
    });
    return Array.from(allTags);
  }, [products]);

  if (error) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', marginTop: '200px' }}>
        <h2>Error</h2>
        <p>{error}</p>
        <a href="/" style={{ color: 'var(--color-cyan-600)' }}>Volver al inicio</a>
      </div>
    );
  }

  return (
    <div style={{ marginTop: '200px', minHeight: '100vh' }}>
      <div className="container" style={{ padding: '2rem 1rem' }}>
        
        {/* Breadcrumbs */}
        <Breadcrumbs 
          category={currentCategory} 
          subcategory={currentSubcategory} 
        />

        {/* Encabezado de la página */}
        <div style={{ marginBottom: '2rem' }}>
          <h1 style={{ fontSize: '2.5rem', fontWeight: 'bold', marginBottom: '0.5rem', color: 'var(--color-gray-800)' }}>
            {currentSubcategory ? currentSubcategory.name : currentCategory?.name}
          </h1>
          <p style={{ color: 'var(--color-gray-600)', fontSize: '1.1rem' }}>
            {filteredProducts.length} producto{filteredProducts.length !== 1 ? 's' : ''} disponible{filteredProducts.length !== 1 ? 's' : ''}
          </p>
        </div>

        {/* Layout responsive */}
        <div className="lg:grid lg:grid-cols-4 lg:gap-8">
          
          {/* Panel de filtros - Desktop */}
          <aside className="lg:block hidden">
            <ProductFilters
              filters={filters}
              onFiltersChange={setFilters}
              availableAttributes={availableAttributes}
              availableTags={availableTags}
              priceRange={[
                Math.min(...products.map((p: Product) => p.basePrice)),
                Math.max(...products.map((p: Product) => p.basePrice))
              ]}
            />
          </aside>

          {/* Grid de productos */}
          <main className="lg:col-span-3">
            {loading ? (
              <div style={{ textAlign: 'center', padding: '3rem' }}>
                <div>Cargando productos...</div>
              </div>
            ) : (
              <ProductGrid products={filteredProducts} />
            )}
          </main>
        </div>

        {/* Panel de filtros - Mobile */}
        <div className="lg:hidden mt-8">
          <ProductFilters
            filters={filters}
            onFiltersChange={setFilters}
            availableAttributes={availableAttributes}
            availableTags={availableTags}
            priceRange={[
              Math.min(...products.map((p: Product) => p.basePrice)),
              Math.max(...products.map((p: Product) => p.basePrice))
            ]}
          />
        </div>
      </div>
    </div>
  );
};

export default CategoryPage;