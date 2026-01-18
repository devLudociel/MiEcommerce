import { useMemo } from 'react';
import { useProducts } from '../../hooks/react-query/useProducts';
import ProductGrid from '../products/ProductGrid';
import { FALLBACK_IMG_400x300 } from '../../lib/placeholders';
import ErrorMessage from '../errors/ErrorMessage';

export default function ReadyToBuyPage() {
  const {
    data: rawProducts = [],
    isLoading: loading,
    error: queryError,
  } = useProducts({
    readyMade: true,
  });

  const error = queryError ? (queryError as Error).message : null;

  const products = useMemo(() => {
    return rawProducts
      .filter((doc) => (doc as any).isDigital !== true)
      .map((doc) => {
      const variants = Array.isArray((doc as any).variants) ? (doc as any).variants : [];
      const variantPrices = variants
        .map((variant: Record<string, unknown>) => Number(variant.price))
        .filter((price: number) => Number.isFinite(price));
      const basePrice = Number((doc as any).basePrice || doc.price) || 0;
      const price = variantPrices.length ? Math.min(...variantPrices) : basePrice;
      return {
        id: doc.id,
        name: doc.name || 'Diseño listo',
        description: doc.description || '',
        basePrice: price,
        images: doc.images && doc.images.length > 0 ? doc.images : [FALLBACK_IMG_400x300],
        attributes: [],
        tags: (doc as any).tags || [],
        featured: doc.featured || false,
        slug: doc.slug || doc.id,
        trackInventory: (doc as any).trackInventory,
        stock: (doc as any).stock,
        lowStockThreshold: (doc as any).lowStockThreshold,
        allowBackorder: (doc as any).allowBackorder,
      };
      });
  }, [rawProducts]);

  return (
    <section className="py-16 bg-white">
      <div className="container mx-auto px-6">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-sm font-bold uppercase tracking-wider rounded-full mb-4">
            Listos para comprar
          </div>
          <h1 className="text-4xl md:text-5xl font-black text-gray-800 mb-4">
            Diseños listos para ti
          </h1>
          <p className="text-lg text-gray-600 max-w-3xl mx-auto">
            Elige un diseño terminado y compra al instante, sin necesidad de personalizar.
          </p>
        </div>

        {loading && (
          <div className="text-center py-12">
            <div className="loading-spinner" />
            <p className="mt-4 text-gray-600">Cargando productos...</p>
          </div>
        )}

        {!loading && error && (
          <div className="max-w-2xl mx-auto">
            <ErrorMessage error={error} onRetry={() => window.location.reload()} variant="card" />
          </div>
        )}

        {!loading && !error && <ProductGrid products={products} />}
      </div>
    </section>
  );
}
