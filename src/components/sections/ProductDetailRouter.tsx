import { useState, useEffect } from 'react';
import ProductDetail from './ProductDetail';

export default function ProductDetailRouter() {
  const [mounted, setMounted] = useState(false);
  const [params, setParams] = useState<{ id?: string; slug?: string }>({ 
    id: undefined, 
    slug: undefined 
  });

  useEffect(() => {
    // Solo ejecutar en el cliente después de montar
    setMounted(true);
    
    try {
      const url = new URL(window.location.href);
      const id = url.searchParams.get('id') || undefined;
      const slug = url.searchParams.get('slug') || undefined;
      setParams({ id, slug });
    } catch (error) {
      console.error('Error reading URL params:', error);
      setParams({ id: undefined, slug: undefined });
    }
  }, []);

  // Renderizar loading mientras no esté montado
  if (!mounted) {
    return (
      <section className="py-20" style={{ background: 'white' }}>
        <div className="container">
          <div className="text-center py-12">
            <div className="loading-spinner" />
            <p className="mt-4 text-gray-600">Cargando producto...</p>
          </div>
        </div>
      </section>
    );
  }

  // Después de montar, validar parámetros
  if (!params.id && !params.slug) {
    return (
      <section className="py-20" style={{ background: 'white' }}>
        <div className="container">
          <div className="text-center py-12">
            <div className="error-box mb-4">
              Falta parámetro <strong>id</strong> o <strong>slug</strong> en la URL
            </div>
            <a href="/" className="btn btn-primary">Volver al inicio</a>
          </div>
        </div>
      </section>
    );
  }

  return <ProductDetail id={params.id} slug={params.slug} />;
}