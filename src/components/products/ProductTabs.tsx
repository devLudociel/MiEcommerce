import { memo, useMemo, useState, useEffect } from 'react';
import ProductReviews from './ProductReviews';
import AddReviewForm from './AddReviewForm';

interface ProductTabsProps {
  productId: string;
  description: string;
  longDescription: string;
  specifications: Record<string, string>;
  activeTab: 'description' | 'specifications' | 'reviews';
  onTabChange: (tab: 'description' | 'specifications' | 'reviews') => void;
}

/**
 * PERFORMANCE OPTIMIZED: Memoized tabs component
 * Contains description, specifications, and reviews sections
 */
export const ProductTabs = memo(function ProductTabs({
  productId,
  description,
  longDescription,
  specifications,
  activeTab,
  onTabChange,
}: ProductTabsProps) {
  const tabs = [
    { id: 'description' as const, label: 'Descripción', icon: 'file-text' },
    { id: 'specifications' as const, label: 'Especificaciones', icon: 'list' },
    { id: 'reviews' as const, label: 'Reseñas', icon: 'star' },
  ];

  // Sanitize HTML to prevent XSS attacks (client-side only)
  const [sanitizedDescription, setSanitizedDescription] = useState('');

  useEffect(() => {
    if (!longDescription) {
      setSanitizedDescription('');
      return;
    }
    // Dynamic import to avoid SSR issues with jsdom
    import('dompurify').then((DOMPurify) => {
      const clean = DOMPurify.default.sanitize(longDescription, {
        ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'b', 'i', 'u', 'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'a', 'span', 'div'],
        ALLOWED_ATTR: ['href', 'target', 'rel', 'class', 'style'],
        ALLOW_DATA_ATTR: false,
      });
      setSanitizedDescription(clean);
    });
  }, [longDescription]);

  const hasSpecifications = Object.keys(specifications).length > 0;

  return (
    <div className="bg-white rounded-3xl shadow-xl p-6 md:p-10">
      {/* Tab Navigation */}
      <div className="flex flex-wrap gap-2 md:gap-4 border-b-2 border-gray-100 mb-8">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`px-6 py-4 font-semibold text-lg transition-all duration-300 border-b-4 ${
              activeTab === tab.id
                ? 'border-cyan-500 text-cyan-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="min-h-[300px]">
        {/* Description Tab */}
        {activeTab === 'description' && (
          <div className="prose prose-lg max-w-none animate-fadeIn">
            <h3 className="text-2xl font-bold text-gray-900 mb-4">Descripción del producto</h3>
            <div className="text-gray-700 leading-relaxed space-y-4">
              {sanitizedDescription ? (
                <div dangerouslySetInnerHTML={{ __html: sanitizedDescription }} />
              ) : (
                <p>{description}</p>
              )}
            </div>
          </div>
        )}

        {/* Specifications Tab */}
        {activeTab === 'specifications' && (
          <div className="animate-fadeIn">
            <h3 className="text-2xl font-bold text-gray-900 mb-6">Especificaciones técnicas</h3>
            {hasSpecifications ? (
              <div className="grid gap-4">
                {Object.entries(specifications).map(([key, value], idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between py-4 px-6 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
                  >
                    <span className="font-semibold text-gray-700">{key}</span>
                    <span className="text-gray-900">{value}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-gray-500">
                <svg
                  className="w-16 h-16 mx-auto mb-4 text-gray-300"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
                <p className="text-lg">No hay especificaciones disponibles para este producto.</p>
              </div>
            )}
          </div>
        )}

        {/* Reviews Tab */}
        {activeTab === 'reviews' && (
          <div className="animate-fadeIn space-y-8">
            <div>
              <h3 className="text-2xl font-bold text-gray-900 mb-6">Reseñas de clientes</h3>
              <ProductReviews productId={productId} />
            </div>

            <div className="border-t-2 border-gray-100 pt-8">
              <h4 className="text-xl font-bold text-gray-900 mb-4">Escribe tu reseña</h4>
              <AddReviewForm productId={productId} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
});
