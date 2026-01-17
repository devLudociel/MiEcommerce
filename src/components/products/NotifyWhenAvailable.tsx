import { useEffect, useState } from 'react';
import { db, auth } from '../../lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, addDoc, query, where, getDocs, Timestamp } from 'firebase/firestore';
import { notify } from '../../lib/notifications';
import { logger } from '../../lib/logger';
import { Bell, BellRing, Mail, CheckCircle, Loader2 } from 'lucide-react';
import type { StockNotification } from '../../types/firebase';

// ============================================================================
// TIPOS
// ============================================================================

interface NotifyWhenAvailableProps {
  productId: string;
  productName: string;
  productSlug: string;
  productImage?: string;
  userEmail?: string; // Pre-fill if user is logged in
}

// ============================================================================
// COMPONENTE
// ============================================================================

export default function NotifyWhenAvailable({
  productId,
  productName,
  productSlug,
  productImage,
  userEmail,
}: NotifyWhenAvailableProps) {
  const [email, setEmail] = useState(userEmail || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(Boolean(auth.currentUser));
  const redirectPath = `/producto/${encodeURIComponent(productSlug)}`;

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setIsLoggedIn(Boolean(user));
      if (user?.email) {
        setEmail((prev) => (prev ? prev : user.email || ''));
      }
    });
    return () => unsubscribe();
  }, []);
  const [error, setError] = useState<string | null>(null);

  // ============================================================================
  // VALIDACIÓN
  // ============================================================================

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  // ============================================================================
  // HANDLERS
  // ============================================================================

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const currentUser = auth.currentUser;
    if (!currentUser) {
      setError('Debes iniciar sesión para recibir notificaciones');
      notify.info('Inicia sesión para suscribirte');
      return;
    }

    const normalizedEmail =
      (email.trim() || currentUser.email || '').toLowerCase().trim();

    // Validar email
    if (!normalizedEmail) {
      setError('Por favor, introduce tu email');
      return;
    }

    if (!validateEmail(normalizedEmail)) {
      setError('Por favor, introduce un email válido');
      return;
    }

    setIsSubmitting(true);

    try {
      // Verificar si ya existe una suscripción pendiente para este email y producto
      const existingQuery = query(
        collection(db, 'stock_notifications'),
        where('productId', '==', productId),
        where('email', '==', normalizedEmail),
        where('status', '==', 'pending')
      );
      const existingSnap = await getDocs(existingQuery);

      if (!existingSnap.empty) {
        setIsSubscribed(true);
        notify.info('Ya estás suscrito para recibir notificaciones de este producto');
        return;
      }

      // Crear nueva suscripción
      const notification: Omit<StockNotification, 'id'> = {
        productId,
        productName,
        productSlug,
        productImage,
        email: normalizedEmail,
        userId: currentUser.uid,
        status: 'pending',
        createdAt: Timestamp.now(),
      };

      await addDoc(collection(db, 'stock_notifications'), notification);

      setIsSubscribed(true);
      notify.success('Te avisaremos cuando el producto esté disponible');
      logger.info('[NotifyWhenAvailable] Subscription created', { productId, email });
    } catch (error) {
      logger.error('[NotifyWhenAvailable] Error creating subscription', error);
      setError('Error al procesar tu solicitud. Inténtalo de nuevo.');
      notify.error('Error al procesar la solicitud');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ============================================================================
  // RENDER
  // ============================================================================

  // Si ya está suscrito, mostrar mensaje de confirmación
  if (isSubscribed) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-xl p-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-green-100 rounded-full">
            <CheckCircle className="w-6 h-6 text-green-600" />
          </div>
          <div>
            <h4 className="font-semibold text-green-800">¡Te avisaremos!</h4>
            <p className="text-sm text-green-700">
              Recibirás un email en <span className="font-medium">{email}</span> cuando este
              producto vuelva a estar disponible.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Vista compacta - botón para expandir
  if (!showForm) {
    if (!isLoggedIn) {
      return (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-full">
              <Mail className="w-6 h-6 text-blue-600" />
            </div>
            <div className="flex-1">
              <h4 className="font-semibold text-blue-800">¿Quieres que te avisemos?</h4>
              <p className="text-sm text-blue-700">
                Inicia sesión para recibir un aviso cuando vuelva a estar disponible.
              </p>
            </div>
            <a
              href={`/login?redirect=${encodeURIComponent(redirectPath)}`}
              className="btn btn-outline border-2 border-blue-300 text-blue-700 px-4 py-2 rounded-xl font-bold hover:border-blue-500 hover:text-blue-800 transition-all"
            >
              Iniciar sesión
            </a>
          </div>
        </div>
      );
    }

    return (
      <button
        onClick={() => setShowForm(true)}
        className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-amber-50 border-2 border-amber-200 rounded-xl text-amber-800 font-semibold hover:bg-amber-100 hover:border-amber-300 transition-all group"
      >
        <Bell className="w-5 h-5 group-hover:animate-bounce" />
        Avísame cuando esté disponible
      </button>
    );
  }

  // Formulario expandido
  return (
    <div className="bg-amber-50 border-2 border-amber-200 rounded-xl p-4 space-y-4">
      {/* Header */}
      <div className="flex items-start gap-3">
        <div className="p-2 bg-amber-100 rounded-full">
          <BellRing className="w-6 h-6 text-amber-600" />
        </div>
        <div className="flex-1">
          <h4 className="font-semibold text-amber-900">Recibe una notificación</h4>
          <p className="text-sm text-amber-700">
            Te enviaremos un email cuando este producto vuelva a estar disponible.
          </p>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label htmlFor="notify-email" className="sr-only">
            Email
          </label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              id="notify-email"
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setError(null);
              }}
              placeholder="tu@email.com"
              className={`w-full pl-10 pr-4 py-3 border-2 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent ${
                error ? 'border-red-300 bg-red-50' : 'border-gray-200'
              }`}
              disabled={isSubmitting}
            />
          </div>
          {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
        </div>

        <div className="flex gap-2">
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-amber-500 text-white rounded-lg font-semibold hover:bg-amber-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Procesando...
              </>
            ) : (
              <>
                <Bell className="w-5 h-5" />
                Notificarme
              </>
            )}
          </button>
          <button
            type="button"
            onClick={() => setShowForm(false)}
            className="px-4 py-3 border border-gray-300 text-gray-600 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancelar
          </button>
        </div>

        <p className="text-xs text-gray-500 text-center">
          Solo usaremos tu email para notificarte sobre este producto. Puedes cancelar en cualquier
          momento.
        </p>
      </form>
    </div>
  );
}
