/**
 * Mock Stripe for security tests
 * Provides mock Stripe class and webhook signature generation
 */

import { createHmac } from 'crypto';

interface MockPaymentIntent {
  id: string;
  amount: number;
  currency: string;
  status: string;
  client_secret: string;
  metadata: Record<string, string>;
}

/**
 * In-memory store for mock payment intents
 */
const paymentIntents: Record<string, MockPaymentIntent> = {};
let piSeq = 1;

/**
 * Create a mock Stripe class matching the real Stripe SDK interface
 */
export function createMockStripe() {
  return {
    paymentIntents: {
      create: async (params: {
        amount: number;
        currency: string;
        metadata?: Record<string, string>;
        idempotencyKey?: string;
      }) => {
        const id = `pi_test_${piSeq++}`;
        const pi: MockPaymentIntent = {
          id,
          amount: params.amount,
          currency: params.currency,
          status: 'requires_payment_method',
          client_secret: `${id}_secret_test`,
          metadata: params.metadata || {},
        };
        paymentIntents[id] = pi;
        return pi;
      },
      retrieve: async (id: string) => {
        const pi = paymentIntents[id];
        if (!pi) {
          throw new Error(`No such payment_intent: ${id}`);
        }
        return pi;
      },
      update: async (id: string, params: Partial<MockPaymentIntent>) => {
        const pi = paymentIntents[id];
        if (!pi) {
          throw new Error(`No such payment_intent: ${id}`);
        }
        Object.assign(pi, params);
        return pi;
      },
      cancel: async (id: string) => {
        const pi = paymentIntents[id];
        if (!pi) {
          throw new Error(`No such payment_intent: ${id}`);
        }
        pi.status = 'canceled';
        return pi;
      },
    },
    refunds: {
      create: async (params: { payment_intent: string; amount?: number }) => {
        return {
          id: `re_test_${piSeq++}`,
          payment_intent: params.payment_intent,
          amount: params.amount || 0,
          status: 'succeeded',
        };
      },
    },
    webhooks: {
      constructEvent: (body: string, signature: string, secret: string) => {
        // Verify the signature matches
        const valid = verifyWebhookSignature(body, signature, secret);
        if (!valid) {
          throw new Error('Webhook signature verification failed.');
        }
        return JSON.parse(body);
      },
    },
    /** Clear all mock data */
    __clear() {
      for (const key of Object.keys(paymentIntents)) {
        delete paymentIntents[key];
      }
      piSeq = 1;
    },
  };
}

/**
 * Generate a valid Stripe webhook signature
 * Uses Stripe's algorithm: t=timestamp,v1=HMAC_SHA256(secret, "{timestamp}.{payload}")
 */
export function generateWebhookSignature(payload: string, secret: string): string {
  const timestamp = Math.floor(Date.now() / 1000);
  const signedPayload = `${timestamp}.${payload}`;
  const signature = createHmac('sha256', secret).update(signedPayload).digest('hex');
  return `t=${timestamp},v1=${signature}`;
}

/**
 * Generate an INVALID webhook signature
 */
export function generateInvalidWebhookSignature(): string {
  const timestamp = Math.floor(Date.now() / 1000);
  return `t=${timestamp},v1=invalid_signature_abcdef1234567890abcdef1234567890`;
}

/**
 * Verify webhook signature
 */
function verifyWebhookSignature(payload: string, signature: string, secret: string): boolean {
  try {
    const parts = signature.split(',');
    const timestampPart = parts.find((p) => p.startsWith('t='));
    const sigPart = parts.find((p) => p.startsWith('v1='));

    if (!timestampPart || !sigPart) return false;

    const timestamp = timestampPart.replace('t=', '');
    const sig = sigPart.replace('v1=', '');

    const signedPayload = `${timestamp}.${payload}`;
    const expectedSig = createHmac('sha256', secret).update(signedPayload).digest('hex');

    return sig === expectedSig;
  } catch {
    return false;
  }
}

/**
 * Create a mock Stripe webhook event
 */
export function createWebhookEvent(
  type: string,
  data: Record<string, any>
): Record<string, any> {
  return {
    id: `evt_test_${piSeq++}`,
    type,
    data: {
      object: data,
    },
    created: Math.floor(Date.now() / 1000),
    livemode: false,
  };
}
