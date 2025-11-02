// src/components/checkout/StripeCardElement.tsx
import { useState } from 'react';
import { CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import type { StripeCardElementChangeEvent } from '@stripe/stripe-js';

interface StripeCardElementProps {
  onCardComplete: (complete: boolean) => void;
  onError: (error: string | null) => void;
}

/**
 * PCI-DSS Compliant Card Input using Stripe Elements
 *
 * SECURITY: Card data never touches your server
 * - Card number, expiry, CVC are handled entirely by Stripe's iframe
 * - Your server only receives a token/PaymentMethod ID
 * - Fully PCI-DSS compliant without certification
 */
export default function StripeCardElement({ onCardComplete, onError }: StripeCardElementProps) {
  const [cardError, setCardError] = useState<string | null>(null);
  const [isComplete, setIsComplete] = useState(false);

  const handleCardChange = (event: StripeCardElementChangeEvent) => {
    setIsComplete(event.complete);
    onCardComplete(event.complete);

    if (event.error) {
      const errorMsg = event.error.message || 'Error en los datos de la tarjeta';
      setCardError(errorMsg);
      onError(errorMsg);
    } else {
      setCardError(null);
      onError(null);
    }
  };

  const cardElementOptions = {
    style: {
      base: {
        fontSize: '16px',
        color: '#1e293b',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        fontSmoothing: 'antialiased',
        '::placeholder': {
          color: '#94a3b8',
        },
        iconColor: '#0891b2',
      },
      invalid: {
        color: '#ef4444',
        iconColor: '#ef4444',
      },
      complete: {
        iconColor: '#10b981',
      },
    },
    hidePostalCode: true, // We collect this separately in shipping info
  };

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700">Datos de la Tarjeta</label>

      <div
        className={`
          px-4 py-3 border-2 rounded-xl transition-all
          ${cardError ? 'border-red-500 bg-red-50' : isComplete ? 'border-green-500 bg-green-50' : 'border-gray-300 bg-white'}
          focus-within:border-cyan-500 focus-within:ring-2 focus-within:ring-cyan-200
        `}
      >
        <CardElement options={cardElementOptions} onChange={handleCardChange} />
      </div>

      {cardError && (
        <p className="text-sm text-red-600 flex items-center gap-2">
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
              clipRule="evenodd"
            />
          </svg>
          {cardError}
        </p>
      )}

      <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
        <svg
          className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0"
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path
            fillRule="evenodd"
            d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
            clipRule="evenodd"
          />
        </svg>
        <div className="text-sm text-blue-900">
          <p className="font-medium">Pago 100% seguro</p>
          <p className="text-blue-700 mt-1">
            Tus datos de tarjeta están protegidos con cifrado de nivel bancario. No almacenamos tu
            información de pago.
          </p>
        </div>
      </div>

      <div className="flex items-center justify-center gap-4 pt-2 opacity-60">
        <svg className="h-6" viewBox="0 0 38 24" fill="none">
          <rect width="38" height="24" rx="3" fill="#1434CB" />
          <path
            d="M13.764 16.803h2.47l1.544-9.52h-2.47l-1.544 9.52zm10.403-9.305c-.49-.182-1.26-.378-2.22-.378-2.448 0-4.172 1.302-4.184 3.167-.012 1.378 1.232 2.145 2.172 2.604.963.469 1.287.77 1.283 1.19-.007.642-.77.937-1.481.937-0.99 0-1.516-.145-2.327-.502l-.319-.152-.347 2.15c.578.266 1.646.498 2.755.51 2.603 0 4.294-1.285 4.31-3.273.008-1.092-.651-1.923-2.08-2.607-.866-.443-1.396-.738-1.39-1.186 0-.397.448-.823 1.415-.823.808-.013 1.393.173 1.85.367l.221.11.342-2.114zm5.425-.215h-1.91c-.592 0-1.034.17-1.294.793l-3.667 8.727h2.6s.425-1.18.522-1.44l3.176.005c.074.336.302 1.435.302 1.435h2.297l-2.006-9.52h-.02zm-6.425 0l-2.277 9.52h-2.478l2.277-9.52h2.478z"
            fill="#fff"
          />
        </svg>
        <svg className="h-6" viewBox="0 0 38 24" fill="none">
          <rect width="38" height="24" rx="3" fill="#EB001B" />
          <circle cx="14" cy="12" r="8" fill="#FF5F00" />
          <circle cx="24" cy="12" r="8" fill="#F79E1B" />
        </svg>
        <svg className="h-6" viewBox="0 0 50 32">
          <path
            fill="#00579F"
            d="M46.177 29.87H3.823C1.707 29.87 0 28.163 0 26.047V5.953C0 3.837 1.707 2.13 3.823 2.13h42.354C48.293 2.13 50 3.837 50 5.953v20.094c0 2.116-1.707 3.823-3.823 3.823z"
          />
        </svg>
      </div>
    </div>
  );
}
