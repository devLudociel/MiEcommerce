// src/components/checkout/StripeProvider.tsx
import { Elements } from '@stripe/react-stripe-js';
import { stripePromise } from '../../lib/stripe';

interface StripeProviderProps {
  children: React.ReactNode;
}

/**
 * Stripe Elements Provider
 * Wraps components that need access to Stripe Elements
 */
export default function StripeProvider({ children }: StripeProviderProps) {
  const appearance = {
    theme: 'stripe' as const,
    variables: {
      colorPrimary: '#06b6d4',
      colorBackground: '#ffffff',
      colorText: '#1e293b',
      colorDanger: '#ef4444',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      borderRadius: '12px',
    },
  };

  const options = {
    appearance,
    locale: 'es' as const,
  };

  return (
    <Elements stripe={stripePromise} options={options}>
      {children}
    </Elements>
  );
}
