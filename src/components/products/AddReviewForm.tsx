// src/components/products/AddReviewForm.tsx
import { useState, useEffect } from 'react';
import { addReview, hasUserReviewed } from '../../lib/firebase';
import { useAuth } from '../hooks/useAuth';

interface AddReviewFormProps {
  productId: string;
  onReviewAdded: () => void;
}

export default function AddReviewForm({ productId, onReviewAdded }: AddReviewFormProps) {
  const { user, loading: authLoading } = useAuth();
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [hoveredRating, setHoveredRating] = useState(0);
  const [loading, setLoading] = useState(false);
  const [hasReviewed, setHasReviewed] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    checkIfUserReviewed();
  }, [productId, user]);

  const checkIfUserReviewed = async () => {
    if (!user) {
      setChecking(false);
      return;
    }

    try {
      const reviewed = await hasUserReviewed(productId, user.uid);
      setHasReviewed(reviewed);
    } catch (error) {
      console.error('Error verificando review:', error);
    } finally {
      setChecking(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      alert('Debes iniciar sesión para dejar una reseña');
      return;
    }

    if (comment.trim().length < 10) {
      alert('La reseña debe tener al menos 10 caracteres');
      return;
    }

    try {
      setLoading(true);

      await addReview({
        productId,
        userId: user.uid,
        userName: user.displayName || 'Usuario Anónimo',
        userEmail: user.email || '',
        rating,
        comment: comment.trim(),
        verified: false, // Podrías verificar si el usuario compró el producto
      });

      alert('¡Gracias por tu reseña!');
      setComment('');
      setRating(5);
      setHasReviewed(true);
      onReviewAdded();
    } catch (error) {
      console.error('Error enviando review:', error);
      alert('Hubo un error al enviar tu reseña. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  if (checking || authLoading) {
    return (
      <div className="text-center py-4">
        <div className="inline-block h-6 w-6 animate-spin rounded-full border-4 border-solid border-cyan-500 border-r-transparent"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="bg-gray-50 rounded-2xl p-6 border-2 border-dashed border-gray-300 text-center">
        <svg
          className="mx-auto w-12 h-12 text-gray-400 mb-3"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
          />
        </svg>
        <h3 className="text-lg font-bold text-gray-800 mb-2">Inicia sesión para dejar tu reseña</h3>
        <p className="text-gray-600 mb-4">Comparte tu experiencia con este producto</p>
        <a
          href="/login"
          className="inline-block px-6 py-3 bg-gradient-to-r from-cyan-500 to-magenta-500 text-white font-bold rounded-xl hover:shadow-lg transition-all"
        >
          Iniciar Sesión
        </a>
      </div>
    );
  }

  if (hasReviewed) {
    return (
      <div className="bg-green-50 rounded-2xl p-6 border-2 border-green-200 text-center">
        <svg
          className="mx-auto w-12 h-12 text-green-500 mb-3"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        <h3 className="text-lg font-bold text-gray-800 mb-2">Ya dejaste tu reseña</h3>
        <p className="text-gray-600">Gracias por compartir tu opinión sobre este producto</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl p-6 border-2 border-gray-200">
      <h3 className="text-xl font-bold text-gray-800 mb-4">Deja tu reseña</h3>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Selector de rating */}
        <div>
          <label className="block text-base font-semibold text-gray-700 mb-3">
            Tu calificación
          </label>
          <div className="flex items-center gap-3 mb-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => {
                  console.log('Star clicked:', star);
                  setRating(star);
                }}
                onMouseEnter={() => setHoveredRating(star)}
                onMouseLeave={() => setHoveredRating(0)}
                className="focus:outline-none focus:ring-2 focus:ring-yellow-400 rounded-lg p-1 transition-transform hover:scale-125 active:scale-110"
                aria-label={`${star} estrellas`}
              >
                <svg
                  className={`w-12 h-12 transition-colors duration-200 ${
                    star <= (hoveredRating || rating) ? 'text-yellow-400' : 'text-gray-300'
                  }`}
                  fill="currentColor"
                  viewBox="0 0 20 20"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
              </button>
            ))}
          </div>
          <p className="text-base font-medium text-gray-700">
            {rating === 5 && '⭐ ¡Excelente!'}
            {rating === 4 && '⭐ Muy bueno'}
            {rating === 3 && '⭐ Bueno'}
            {rating === 2 && '⭐ Regular'}
            {rating === 1 && '⭐ Necesita mejorar'}
          </p>
        </div>

        {/* Campo de comentario */}
        <div>
          <label htmlFor="comment" className="block text-sm font-semibold text-gray-700 mb-2">
            Tu opinión
          </label>
          <textarea
            id="comment"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Cuéntanos sobre tu experiencia con este producto..."
            rows={4}
            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-cyan-500 focus:ring-2 focus:ring-cyan-200 outline-none transition-all resize-none"
            required
            minLength={10}
          />
          <p className="text-sm text-gray-500 mt-1">Mínimo 10 caracteres ({comment.length}/10)</p>
        </div>

        {/* Botón de enviar */}
        <button
          type="submit"
          disabled={loading || comment.trim().length < 10}
          className="w-full px-6 py-3 bg-gradient-to-r from-cyan-500 to-magenta-500 text-white font-bold rounded-xl hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <div className="h-5 w-5 animate-spin rounded-full border-4 border-solid border-white border-r-transparent"></div>
              Enviando...
            </span>
          ) : (
            'Publicar Reseña'
          )}
        </button>
      </form>
    </div>
  );
}
