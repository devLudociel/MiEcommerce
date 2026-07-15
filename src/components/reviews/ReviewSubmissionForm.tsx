// src/components/reviews/ReviewSubmissionForm.tsx
// Formulario para que los clientes envíen reseñas

import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { submitReview, hasCustomerReviewed, type CustomerReviewInput } from '../../lib/reviews';

interface ReviewSubmissionFormProps {
  orderId?: string;
  productId?: string;
  productName?: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export default function ReviewSubmissionForm({
  orderId,
  productId,
  productName,
  onSuccess,
  onCancel,
}: ReviewSubmissionFormProps) {
  const { user, email, displayName, isAuthenticated } = useAuth();

  // productId/productName pueden venir por props o por URL (?productId=...&productName=...)
  // Se leen tras el montaje (no en render) para no romper la hidratación SSR.
  const [urlProduct, setUrlProduct] = useState<{ id?: string; name?: string }>({});
  const [loginRedirect, setLoginRedirect] = useState('/dejar-resena');
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setUrlProduct({
      id: params.get('productId') || undefined,
      name: params.get('productName') || undefined,
    });
    setLoginRedirect(window.location.pathname + window.location.search);
  }, []);
  const finalProductId = productId ?? urlProduct.id;
  const finalProductName = productName ?? urlProduct.name;

  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [title, setTitle] = useState('');
  const [text, setText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [alreadyReviewed, setAlreadyReviewed] = useState(false);
  const [isChecking, setIsChecking] = useState(true);

  // Check if already reviewed
  useEffect(() => {
    async function checkExisting() {
      if (user?.uid) {
        const reviewed = await hasCustomerReviewed(user.uid, orderId, finalProductId);
        setAlreadyReviewed(reviewed);
      }
      setIsChecking(false);
    }
    checkExisting();
  }, [user?.uid, orderId, finalProductId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isAuthenticated || !user) {
      setError('Debes iniciar sesión para enviar una reseña');
      return;
    }

    if (rating < 1 || rating > 5) {
      setError('Por favor, selecciona una puntuación');
      return;
    }

    if (!title.trim()) {
      setError('Por favor, añade un título a tu reseña');
      return;
    }

    if (text.trim().length < 20) {
      setError('Por favor, escribe al menos 20 caracteres en tu reseña');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const reviewData: CustomerReviewInput = {
        customerId: user.uid,
        customerName: displayName || email?.split('@')[0] || 'Cliente',
        customerEmail: email || '',
        orderId: orderId,
        ...(finalProductId ? { productIds: [finalProductId] } : {}),
        rating,
        title: title.trim(),
        text: text.trim(),
      };

      await submitReview(reviewData);
      setSuccess(true);

      // Clear form
      setRating(5);
      setTitle('');
      setText('');

      if (onSuccess) {
        setTimeout(onSuccess, 2000);
      }
    } catch (err) {
      console.error('Error submitting review:', err);
      setError('Error al enviar la reseña. Por favor, inténtalo de nuevo.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="bg-white rounded-2xl p-8 border border-gray-200 shadow-sm text-center">
        <div className="text-4xl mb-4">🔐</div>
        <h3 className="text-xl font-bold text-gray-800 mb-2">Inicia sesión para opinar</h3>
        <p className="text-gray-600 mb-6">Necesitas iniciar sesión para dejar una reseña</p>
        <a
          href={`/login?redirect=${encodeURIComponent(loginRedirect)}`}
          className="inline-block px-6 py-3 bg-cyan-600 text-white font-medium rounded-lg hover:bg-cyan-700 transition-colors"
        >
          Iniciar Sesión
        </a>
      </div>
    );
  }

  if (isChecking) {
    return (
      <div className="bg-white rounded-2xl p-8 border border-gray-200 shadow-sm text-center">
        <div className="animate-spin w-8 h-8 border-4 border-cyan-500 border-t-transparent rounded-full mx-auto" />
        <p className="text-gray-600 mt-4">Cargando...</p>
      </div>
    );
  }

  if (alreadyReviewed) {
    return (
      <div className="bg-white rounded-2xl p-8 border border-gray-200 shadow-sm text-center">
        <div className="text-4xl mb-4">✅</div>
        <h3 className="text-xl font-bold text-gray-800 mb-2">Ya has enviado una reseña</h3>
        <p className="text-gray-600">
          {orderId
            ? 'Ya has dejado una reseña para este pedido.'
            : finalProductId
              ? 'Ya has dejado una reseña para este producto.'
              : 'Ya has dejado una reseña anteriormente.'}
        </p>
      </div>
    );
  }

  if (success) {
    return (
      <div className="bg-white rounded-2xl p-8 border border-green-200 shadow-sm text-center">
        <div className="text-5xl mb-4">🎉</div>
        <h3 className="text-xl font-bold text-green-700 mb-2">¡Gracias por tu reseña!</h3>
        <p className="text-gray-600">
          Tu opinión es muy importante para nosotros. La revisaremos y la publicaremos pronto.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl p-8 border border-gray-200 shadow-sm">
      <h2 className="text-2xl font-bold text-gray-800 mb-2">Deja tu opinión</h2>
      {finalProductName && (
        <p className="text-sm font-medium text-cyan-700 mb-1">Sobre: {finalProductName}</p>
      )}
      <p className="text-gray-600 mb-6">
        Tu reseña ayuda a otros clientes a tomar mejores decisiones
      </p>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Star Rating */}
        <div>
          <p className="block text-sm font-medium text-gray-700 mb-3">
            ¿Cómo calificarías tu experiencia?
          </p>
          <div className="flex items-center gap-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => setRating(star)}
                onMouseEnter={() => setHoverRating(star)}
                onMouseLeave={() => setHoverRating(0)}
                className="text-4xl transition-transform hover:scale-110 focus:outline-none"
              >
                {(hoverRating || rating) >= star ? '⭐' : '☆'}
              </button>
            ))}
            <span className="ml-3 text-lg font-medium text-gray-700">
              {rating === 5 && 'Excelente'}
              {rating === 4 && 'Muy bueno'}
              {rating === 3 && 'Bueno'}
              {rating === 2 && 'Regular'}
              {rating === 1 && 'Malo'}
            </span>
          </div>
        </div>

        {/* Title */}
        <div>
          <label htmlFor="review-title" className="block text-sm font-medium text-gray-700 mb-2">
            Título de tu reseña
          </label>
          <input
            id="review-title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ej: ¡Excelente calidad y servicio!"
            maxLength={100}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all"
          />
          <p className="text-xs text-gray-500 mt-1">{title.length}/100 caracteres</p>
        </div>

        {/* Review Text */}
        <div>
          <label htmlFor="review-text" className="block text-sm font-medium text-gray-700 mb-2">
            Tu opinión
          </label>
          <textarea
            id="review-text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Cuéntanos tu experiencia con nuestros productos y servicio..."
            rows={5}
            maxLength={1000}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all resize-none"
          />
          <p className="text-xs text-gray-500 mt-1">{text.length}/1000 caracteres (mínimo 20)</p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg flex items-center gap-2">
            <span>❌</span> {error}
          </div>
        )}

        {/* Info Notice */}
        <div className="p-4 bg-blue-50 border border-blue-200 text-blue-700 rounded-lg text-sm">
          <p className="flex items-center gap-2">
            <span>ℹ️</span>
            Tu reseña será revisada antes de publicarse para garantizar la calidad del contenido.
          </p>
        </div>

        {/* Buttons */}
        <div className="flex gap-3">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancelar
            </button>
          )}
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex-1 px-6 py-3 bg-cyan-600 text-white font-medium rounded-lg hover:bg-cyan-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <>
                <span className="animate-spin">⏳</span>
                Enviando...
              </>
            ) : (
              <>📤 Enviar Reseña</>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
