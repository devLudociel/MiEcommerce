// src/components/reviews/ProductReviews.tsx
// Sección de reseñas de un producto (ficha de producto).
// Lee reseñas aprobadas de customer_reviews filtradas por productIds.

import { useState, useEffect } from 'react';
import {
  getProductApprovedReviews,
  formatReviewDate,
  getInitials,
  type CustomerReview,
} from '../../lib/reviews';

interface ProductReviewsProps {
  productId: string;
  productName: string;
}

function Stars({ rating, size = 'w-4 h-4' }: { rating: number; size?: string }) {
  return (
    <div className="flex" aria-label={`${rating} de 5 estrellas`}>
      {[...Array(5)].map((_, i) => (
        <svg
          key={i}
          className={`${size} ${i < Math.round(rating) ? 'text-yellow-400' : 'text-gray-300'}`}
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
    </div>
  );
}

export default function ProductReviews({ productId, productName }: ProductReviewsProps) {
  const [reviews, setReviews] = useState<CustomerReview[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    getProductApprovedReviews(productId)
      .then((data) => {
        if (!cancelled) setReviews(data);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [productId]);

  const reviewUrl = `/dejar-resena?productId=${encodeURIComponent(productId)}&productName=${encodeURIComponent(productName)}`;

  if (loading) return null;

  const average =
    reviews.length > 0 ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length : 0;

  return (
    <section className="mt-16" id="resenas">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-2xl md:text-3xl font-black text-gray-800">Opiniones de clientes</h2>
          {reviews.length > 0 && (
            <div className="flex items-center gap-2 mt-2">
              <Stars rating={average} size="w-5 h-5" />
              <span className="font-semibold text-gray-800">{average.toFixed(1)}</span>
              <span className="text-gray-500">
                ({reviews.length} {reviews.length === 1 ? 'reseña' : 'reseñas'})
              </span>
            </div>
          )}
        </div>
        <a
          href={reviewUrl}
          className="px-5 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-medium rounded-lg hover:opacity-90 transition-opacity"
        >
          Escribir reseña
        </a>
      </div>

      {reviews.length === 0 ? (
        <div className="bg-gray-50 border border-gray-200 rounded-2xl p-8 text-center">
          <div className="text-3xl mb-2">⭐</div>
          <p className="text-gray-600">
            Este producto aún no tiene reseñas. ¡Sé el primero en opinar!
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {reviews.map((review) => (
            <article
              key={review.id}
              className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 text-white flex items-center justify-center font-bold text-sm flex-shrink-0">
                  {getInitials(review.customerName)}
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-gray-800 truncate">{review.customerName}</p>
                  <p className="text-xs text-gray-500">{formatReviewDate(review.createdAt)}</p>
                </div>
                <div className="ml-auto flex-shrink-0">
                  <Stars rating={review.rating} />
                </div>
              </div>
              <h3 className="font-semibold text-gray-800 mb-1">{review.title}</h3>
              <p className="text-sm text-gray-600 leading-relaxed">{review.text}</p>
              {review.businessResponse && (
                <div className="mt-3 pl-3 border-l-2 border-cyan-200 bg-cyan-50/50 rounded-r-lg p-3">
                  <p className="text-xs font-semibold text-cyan-700 mb-1">
                    Respuesta de ImprimeArte
                  </p>
                  <p className="text-sm text-gray-600">{review.businessResponse.text}</p>
                </div>
              )}
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
