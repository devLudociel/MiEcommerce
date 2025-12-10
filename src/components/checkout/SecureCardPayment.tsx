// src/components/checkout/SecureCardPayment.tsx
import { useState } from 'react';
import { useStripe, useElements, CardElement } from '@stripe/react-stripe-js';
import type { Stripe, StripeElements } from '@stripe/stripe-js';
import { logger } from '../../lib/logger';
import { withRetry } from '../../lib/resilience';
import StripeCardElement from './StripeCardElement';

interface SecureCardPaymentProps {
  orderId: string;
  orderTotal: number;
  billingDetails: {
    name: string;
    email: string;
    phone: string;
    address: {
      line1: string;
      city: string;
      postal_code: string;
      state: string;
      country: string;
    };
  };
  onSuccess: (paymentIntentId: string, orderId: string) => void;
  onError: (error: string) => void;
}

/**
 * PCI-DSS Compliant Card Payment Component
 *
 * SECURITY: This component handles card payments WITHOUT card data touching your server
 * - Uses Stripe Elements (hosted iframe)
 * - Creates Payment Method client-side
 * - Card data goes directly from browser to Stripe
 * - Your server only sees payment tokens
 *
 * Flow:
 * 1. User enters card in Stripe Elements (secure iframe)
 * 2. Create PaymentMethod client-side (card → Stripe)
 * 3. Create PaymentIntent server-side (with order validation)
 * 4. Confirm payment client-side (PaymentMethod + PaymentIntent)
 * 5. Webhook handles success/failure
 */
export default function SecureCardPayment({
  orderId,
  orderTotal,
  billingDetails,
  onSuccess,
  onError,
}: SecureCardPaymentProps) {
  const stripe = useStripe();
  const elements = useElements();

  const [cardComplete, setCardComplete] = useState(false);
  const [cardError, setCardError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);

  const handleCardComplete = (complete: boolean) => {
    setCardComplete(complete);
  };

  const handleCardError = (error: string | null) => {
    setCardError(error);
  };

  /**
   * Process payment using Stripe Elements (PCI-DSS compliant)
   */
  const processPayment = async (
    orderIdOverride?: string
  ): Promise<{ success: boolean; error?: string }> => {
    if (!stripe || !elements) {
      logger.error('[SecureCardPayment] Stripe.js has not loaded yet');
      return { success: false, error: 'Sistema de pago no inicializado' };
    }

    if (!cardComplete) {
      return { success: false, error: 'Por favor completa los datos de la tarjeta' };
    }

    setProcessing(true);

    try {
      const effectiveOrderId = orderIdOverride || orderId;

      if (!effectiveOrderId) {
        logger.error('[SecureCardPayment] Missing orderId for payment');
        return { success: false, error: 'No se pudo identificar la orden para el pago' };
      }

      logger.info('[SecureCardPayment] Creating PaymentMethod', { orderId: effectiveOrderId });

      // Step 1: Create PaymentMethod from card element (CLIENT-SIDE ONLY)
      const cardElement = elements.getElement(CardElement);
      if (!cardElement) {
        throw new Error('Card element not found');
      }

      const { error: pmError, paymentMethod } = await stripe.createPaymentMethod({
        type: 'card',
        card: cardElement,
        billing_details: billingDetails,
      });

      if (pmError || !paymentMethod) {
        logger.error('[SecureCardPayment] Error creating PaymentMethod', pmError);
        throw new Error(pmError?.message || 'Error procesando los datos de la tarjeta');
      }

      logger.info('[SecureCardPayment] PaymentMethod created', {
        orderId: effectiveOrderId,
        paymentMethodId: paymentMethod.id,
        last4: (paymentMethod.card as any)?.last4,
      });

      // Step 2: Create PaymentIntent on server (with order validation)
      logger.info('[SecureCardPayment] Creating PaymentIntent', {
        orderId: effectiveOrderId,
        orderTotal,
      });

      const paymentIntentData = await withRetry(
        async () => {
          const paymentIntentResponse = await fetch('/api/create-payment-intent', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              orderId: effectiveOrderId,
              amount: Number(orderTotal.toFixed(2)),
              currency: 'eur',
            }),
          });

          const data = await paymentIntentResponse.json();

          if (!paymentIntentResponse.ok) {
            logger.error('[SecureCardPayment] Error creating PaymentIntent', data);
            const error = new Error(data.error || 'Error al iniciar el pago') as Error & { status?: number };
            error.status = paymentIntentResponse.status;
            throw error;
          }

          return data;
        },
        {
          context: 'Create PaymentIntent',
          maxAttempts: 3,
          backoffMs: 1000,
        }
      );

      const { clientSecret, paymentIntentId } = paymentIntentData;
      logger.info('[SecureCardPayment] PaymentIntent created', {
        orderId: effectiveOrderId,
        paymentIntentId,
      });

      // Step 3: Confirm payment with PaymentMethod (CLIENT-SIDE ONLY)
      logger.info('[SecureCardPayment] Confirming payment', { paymentIntentId });

      const confirmation = await stripe.confirmCardPayment(clientSecret, {
        payment_method: paymentMethod.id,
      });

      if (confirmation.error) {
        logger.error('[SecureCardPayment] Payment confirmation failed', confirmation.error);
        throw new Error(
          confirmation.error.message ||
            'El pago fue rechazado. Verifica los datos e intenta nuevamente.'
        );
      }

      const status = confirmation.paymentIntent?.status;
      logger.info('[SecureCardPayment] Payment confirmed', {
        orderId: effectiveOrderId,
        paymentIntentId,
        status,
      });

      if (status !== 'succeeded' && status !== 'processing' && status !== 'requires_capture') {
        throw new Error(
          `El pago tiene estado "${status || 'desconocido'}". Por favor contacta con soporte.`
        );
      }

      logger.info('[SecureCardPayment] ✅ Payment completed successfully', {
        orderId: effectiveOrderId,
        paymentIntentId,
        status,
      });

      onSuccess(paymentIntentId, effectiveOrderId);
      return { success: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error procesando el pago';
      logger.error('[SecureCardPayment] Payment failed', error);
      onError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setProcessing(false);
    }
  };

  return {
    CardElement: (
      <StripeCardElement onCardComplete={handleCardComplete} onError={handleCardError} />
    ),
    processPayment,
    isReady: cardComplete && !cardError && !processing,
    processing,
    error: cardError,
  };
}

/**
 * Hook to use SecureCardPayment
 */
export function useSecureCardPayment(props: SecureCardPaymentProps) {
  return SecureCardPayment(props);
}
