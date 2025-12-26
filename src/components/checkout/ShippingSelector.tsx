// src/components/checkout/ShippingSelector.tsx
// Componente para seleccionar método de envío en el checkout

import { useState, useEffect } from 'react';
import { Truck, Clock, Gift, MapPin, AlertCircle, Loader2 } from 'lucide-react';
import {
  calculateShipping,
  isCanaryIslandsPostalCode,
  type ShippingQuote,
  type ShippingAddress,
} from '../../lib/shipping';

// ============================================================================
// TYPES
// ============================================================================

interface ShippingSelectorProps {
  postalCode: string;
  province?: string;
  cartTotal: number;
  cartWeight?: number;
  selectedMethodId?: string;
  onSelectMethod: (quote: ShippingQuote | null) => void;
  className?: string;
}

// ============================================================================
// COMPONENT
// ============================================================================

export default function ShippingSelector({
  postalCode,
  province,
  cartTotal,
  cartWeight,
  selectedMethodId,
  onSelectMethod,
  className = '',
}: ShippingSelectorProps) {
  const [quotes, setQuotes] = useState<ShippingQuote[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Cargar opciones de envío cuando cambia el código postal
  useEffect(() => {
    const loadShippingOptions = async () => {
      // Validar código postal
      if (!postalCode || postalCode.length < 5) {
        setQuotes([]);
        setError(null);
        setIsValidPostalCode(false);
        onSelectMethod(null);
        return;
      }

      // Verificar si es de Canarias
      const isCanary = isCanaryIslandsPostalCode(postalCode);
      if (!isCanary) {
        setQuotes([]);
        setError('Lo sentimos, actualmente solo realizamos envíos a las Islas Canarias.');
        onSelectMethod(null);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const address: ShippingAddress = {
          postalCode,
          province,
        };

        const shippingQuotes = await calculateShipping(address, cartTotal, cartWeight);

        if (shippingQuotes.length === 0) {
          setError(
            'No hay métodos de envío disponibles para tu zona. Por favor, contacta con nosotros.'
          );
          setQuotes([]);
          onSelectMethod(null);
        } else {
          setQuotes(shippingQuotes);

          // Auto-seleccionar el método más barato si no hay ninguno seleccionado
          if (!selectedMethodId) {
            const cheapest = shippingQuotes.reduce((min, q) => (q.price < min.price ? q : min));
            onSelectMethod(cheapest);
          } else {
            // Mantener la selección actual si existe
            const currentSelection = shippingQuotes.find((q) => q.methodId === selectedMethodId);
            if (currentSelection) {
              onSelectMethod(currentSelection);
            } else {
              // Si el método seleccionado ya no está disponible, seleccionar el más barato
              const cheapest = shippingQuotes.reduce((min, q) => (q.price < min.price ? q : min));
              onSelectMethod(cheapest);
            }
          }
        }
      } catch (err) {
        console.error('[ShippingSelector] Error:', err);
        setError('Error al calcular los costes de envío. Por favor, inténtalo de nuevo.');
        setQuotes([]);
        onSelectMethod(null);
      } finally {
        setLoading(false);
      }
    };

    loadShippingOptions();
  }, [postalCode, province, cartTotal, cartWeight, onSelectMethod, selectedMethodId]);

  const handleSelectMethod = (quote: ShippingQuote) => {
    onSelectMethod(quote);
  };

  // No mostrar nada si no hay código postal
  if (!postalCode || postalCode.length < 5) {
    return (
      <div className={`p-4 bg-gray-50 rounded-lg border border-gray-200 ${className}`}>
        <div className="flex items-center gap-2 text-gray-500">
          <MapPin className="w-5 h-5" />
          <span>Introduce tu código postal para ver las opciones de envío</span>
        </div>
      </div>
    );
  }

  // Loading state
  if (loading) {
    return (
      <div className={`p-4 bg-gray-50 rounded-lg border border-gray-200 ${className}`}>
        <div className="flex items-center gap-2 text-gray-500">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span>Calculando opciones de envío...</span>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className={`p-4 bg-red-50 rounded-lg border border-red-200 ${className}`}>
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-red-800">Envío no disponible</p>
            <p className="text-sm text-red-600 mt-1">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  // No quotes available
  if (quotes.length === 0) {
    return (
      <div className={`p-4 bg-amber-50 rounded-lg border border-amber-200 ${className}`}>
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-amber-800">Sin opciones de envío</p>
            <p className="text-sm text-amber-600 mt-1">
              No encontramos métodos de envío para tu zona. Contacta con nosotros para más
              información.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Render shipping options
  return (
    <div className={`space-y-3 ${className}`}>
      <div className="flex items-center gap-2 text-gray-700 font-medium">
        <Truck className="w-5 h-5" />
        <span>Método de envío</span>
      </div>

      <div className="space-y-2">
        {quotes.map((quote) => (
          <label
            key={quote.methodId}
            className={`flex items-start gap-3 p-4 rounded-lg border-2 cursor-pointer transition-all ${
              selectedMethodId === quote.methodId
                ? 'border-cyan-500 bg-cyan-50'
                : 'border-gray-200 hover:border-gray-300 bg-white'
            }`}
          >
            <input
              type="radio"
              name="shipping_method"
              value={quote.methodId}
              checked={selectedMethodId === quote.methodId}
              onChange={() => handleSelectMethod(quote)}
              className="mt-1 w-4 h-4 text-cyan-500 focus:ring-cyan-500"
            />
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <span className="font-medium text-gray-900">{quote.methodName}</span>
                <span
                  className={`font-semibold ${quote.isFree ? 'text-green-600' : 'text-gray-900'}`}
                >
                  {quote.isFree ? (
                    <span className="flex items-center gap-1">
                      <Gift className="w-4 h-4" />
                      ¡Gratis!
                    </span>
                  ) : (
                    `${quote.price.toFixed(2)}€`
                  )}
                </span>
              </div>
              {quote.description && (
                <p className="text-sm text-gray-500 mt-0.5">{quote.description}</p>
              )}
              <div className="flex items-center gap-4 mt-1 text-xs text-gray-500">
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {quote.estimatedDays} días laborables
                </span>
                {quote.isFree && quote.originalPrice > 0 && (
                  <span className="line-through">{quote.originalPrice.toFixed(2)}€</span>
                )}
              </div>
            </div>
          </label>
        ))}
      </div>

      {/* Info sobre envío gratis */}
      {quotes.some((q) => !q.isFree && q.originalPrice > 0) && (
        <div className="text-xs text-gray-500 mt-2">
          * Los gastos de envío pueden variar según el peso del pedido
        </div>
      )}
    </div>
  );
}
