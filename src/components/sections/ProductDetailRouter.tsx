import { useMemo } from 'react';
import ProductDetail from './ProductDetail';

export default function ProductDetailRouter() {
  const params = useMemo(() => {
    try {
      const url = new URL(window.location.href);
      const id = url.searchParams.get('id') || undefined;
      const slug = url.searchParams.get('slug') || undefined;
      return { id, slug };
    } catch {
      return { id: undefined, slug: undefined };
    }
  }, []);

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

