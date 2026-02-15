/**
 * Security integration tests for POST /api/stripe-webhook
 *
 * Coverage:
 * - Signature verification: missing header, invalid signature, valid signature
 * - Idempotency: duplicate event ID returns 200 without reprocessing
 * - payment_intent.succeeded: updates order to processing status
 * - payment_intent.payment_failed: releases stock and wallet reservations, deletes order
 * - Amount mismatch guard: webhook amount != order totalCents is not processed
 * - Currency mismatch guard: webhook currency != order paymentCurrency is not processed
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createMockFirebase } from '../../helpers/mock-firebase';

// ---------------------------------------------------------------------------
// Module mocks — vi.mock factories are hoisted; use only lazy references
// ---------------------------------------------------------------------------

const __firebase = createMockFirebase();

vi.mock('../../../src/lib/firebase-admin', () => ({
  getAdminDb: () => __firebase.db,
  getAdminAuth: () => __firebase.auth,
}));

vi.mock('firebase-admin/firestore', () => ({
  FieldValue: {
    serverTimestamp: () => new Date(),
    increment: (n: number) => ({ __inc: n }),
  },
  Timestamp: {
    fromMillis: (ms: number) => new Date(ms),
  },
}));

vi.mock('../../../src/lib/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

vi.mock('../../../src/lib/utils/apiLogger', () => ({
  createScopedLogger: () => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  }),
}));

vi.mock('../../../src/lib/orders/finalizeOrder', () => ({
  finalizeOrder: vi.fn(async () => {}),
}));

vi.mock('../../../src/lib/orders/stock', () => ({
  validateStockAvailability: vi.fn(async () => ({ ok: true })),
  expireReservedOrder: vi.fn(async () => {}),
  releaseReservedStock: vi.fn(async () => {}),
}));

vi.mock('../../../src/lib/orders/walletReservations', () => ({
  reserveWalletFunds: vi.fn(async () => {}),
  releaseWalletReservation: vi.fn(async () => {}),
}));

import { createMockStripe } from '../../helpers/mock-stripe';
const __stripeInstance = createMockStripe();

vi.mock('stripe', () => {
  // Use getters to defer access to __stripeInstance until the handler actually
  // calls stripe.webhooks.constructEvent(), stripe.paymentIntents.retrieve(), etc.
  // This avoids the TDZ issue since `new Stripe()` is called at module import time.
  class StripeMock {
    get paymentIntents() { return __stripeInstance.paymentIntents; }
    get webhooks() { return __stripeInstance.webhooks; }
    get refunds() { return __stripeInstance.refunds; }
    constructor(..._args: unknown[]) {}
  }
  return { default: StripeMock };
});

function getMockStripe() {
  return __stripeInstance;
}

// ---------------------------------------------------------------------------
// Imports after mocks
// ---------------------------------------------------------------------------

import { POST as WEBHOOK_POST } from '../../../src/pages/api/stripe-webhook';
import { releaseReservedStock } from '../../../src/lib/orders/stock';
import { releaseWalletReservation } from '../../../src/lib/orders/walletReservations';
import {
  generateWebhookSignature,
  generateInvalidWebhookSignature,
  createWebhookEvent,
} from '../../helpers/mock-stripe';
import { API_URLS } from '../../helpers/constants';
import { USERS } from '../../helpers/auth-factory';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const URL = API_URLS.STRIPE_WEBHOOK;

/**
 * The webhook secret must match what the endpoint reads from the environment.
 * vitest.security.config.ts defines STRIPE_WEBHOOK_SECRET as this exact value.
 */
const WEBHOOK_SECRET = 'whsec_test_fake_secret';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getMockDb() {
  return __firebase.db as unknown as {
    data: Record<string, Record<string, unknown>>;
    __clear: () => void;
  };
}

/**
 * Build a raw webhook request with an optional Stripe-Signature header.
 */
function buildWebhookRequest(body: string, signature?: string): Request {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (signature !== undefined) {
    headers['stripe-signature'] = signature;
  }
  return new Request(URL, { method: 'POST', headers, body });
}

/**
 * Serialize a Stripe webhook event payload and generate a valid signature.
 */
function signedWebhookRequest(event: Record<string, unknown>): Request {
  const body = JSON.stringify(event);
  const sig = generateWebhookSignature(body, WEBHOOK_SECRET);
  return buildWebhookRequest(body, sig);
}

/**
 * Seed a minimal order ready for webhook processing.
 */
async function seedWebhookOrder(
  orderId: string,
  paymentIntentId: string,
  overrides: Record<string, unknown> = {}
) {
  const db = await getMockDb();
  db.data.orders[orderId] = {
    userId: USERS.USER.uid,
    email: USERS.USER.email,
    status: 'pending',
    paymentStatus: 'pending',
    paymentIntentId,
    stockReservationStatus: 'reserved',
    stockReservationExpiresAt: new Date(Date.now() + 15 * 60 * 1000),
    stockReservedItems: [{ productId: 'prod-webhook-1', quantity: 1 }],
    items: [{ productId: 'prod-webhook-1', quantity: 1, name: 'Test Product' }],
    total: 34.99,
    totalCents: 3499,
    paymentCurrency: 'eur',
    walletReservationStatus: '',
    walletReservedAmount: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------

describe('Security: POST /api/stripe-webhook', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Clear Firestore and Stripe mock state
    const db = getMockDb();
    db.__clear();
    getMockStripe().__clear();

    // Reset mocked modules
    vi.mocked(releaseReservedStock).mockResolvedValue(undefined as any);
    vi.mocked(releaseWalletReservation).mockResolvedValue(undefined as any);
  });

  // -------------------------------------------------------------------------
  // 1. Signature Header Validation
  // -------------------------------------------------------------------------

  it('SIG-1: returns 400 when stripe-signature header is absent', async () => {
    const body = JSON.stringify({ id: 'evt_no_sig', type: 'payment_intent.succeeded' });
    const req = buildWebhookRequest(body);  // no signature header

    const res = await WEBHOOK_POST({ request: req } as any);

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBeTruthy();
  });

  it('SIG-2: returns 400 when stripe-signature header contains an invalid signature', async () => {
    const body = JSON.stringify({ id: 'evt_bad_sig', type: 'payment_intent.succeeded' });
    const invalidSig = generateInvalidWebhookSignature();
    const req = buildWebhookRequest(body, invalidSig);

    const res = await WEBHOOK_POST({ request: req } as any);

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/signature|invalid/i);
  });

  it('SIG-3: returns 400 when stripe-signature uses wrong secret', async () => {
    const body = JSON.stringify({ id: 'evt_wrong_secret', type: 'payment_intent.succeeded' });
    const wrongSig = generateWebhookSignature(body, 'wrong-secret-entirely');
    const req = buildWebhookRequest(body, wrongSig);

    const res = await WEBHOOK_POST({ request: req } as any);

    expect(res.status).toBe(400);
  });

  // -------------------------------------------------------------------------
  // 2. Idempotency
  // -------------------------------------------------------------------------

  it('IDEMPOTENCY-1: duplicate event ID returns 200 without reprocessing', async () => {
    const db = await getMockDb();
    const eventId = 'evt_duplicate_idempotency_test';
    const orderId = 'order-idem-1';
    const paymentIntentId = 'pi_idem_1';

    await seedWebhookOrder(orderId, paymentIntentId);

    // Pre-populate the stripe_events collection to simulate already-processed event
    db.data.stripe_events[eventId] = {
      processedAt: new Date(),
      type: 'payment_intent.succeeded',
      orderId,
    };

    const event = createWebhookEvent('payment_intent.succeeded', {
      id: paymentIntentId,
      amount: 3499,
      currency: 'eur',
      status: 'succeeded',
      metadata: { orderId },
    });
    // Override the event id with our pre-seeded one
    event.id = eventId;

    const req = signedWebhookRequest(event);
    const res = await WEBHOOK_POST({ request: req } as any);

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.duplicate).toBe(true);

    // Order should NOT have been modified (still pending)
    expect(db.data.orders[orderId]?.paymentStatus).toBe('pending');
  });

  // -------------------------------------------------------------------------
  // 3. payment_intent.succeeded — happy path
  // -------------------------------------------------------------------------

  it('SUCCEEDED-1: payment_intent.succeeded updates order status to "processing" and paymentStatus to "paid"', async () => {
    const orderId = 'order-success-1';
    const paymentIntentId = 'pi_succeeded_001';

    await seedWebhookOrder(orderId, paymentIntentId);

    const event = createWebhookEvent('payment_intent.succeeded', {
      id: paymentIntentId,
      amount: 3499,
      currency: 'eur',
      status: 'succeeded',
      metadata: { orderId },
    });

    const req = signedWebhookRequest(event);
    const res = await WEBHOOK_POST({ request: req } as any);

    expect(res.status).toBe(200);

    const db = await getMockDb();
    const updatedOrder = db.data.orders[orderId];
    expect(updatedOrder?.paymentStatus).toBe('paid');
    expect(updatedOrder?.status).toBe('processing');
  });

  it('SUCCEEDED-2: payment_intent.succeeded event is recorded in stripe_events for idempotency', async () => {
    const orderId = 'order-success-2';
    const paymentIntentId = 'pi_succeeded_002';

    await seedWebhookOrder(orderId, paymentIntentId);

    const event = createWebhookEvent('payment_intent.succeeded', {
      id: paymentIntentId,
      amount: 3499,
      currency: 'eur',
      status: 'succeeded',
      metadata: { orderId },
    });

    const req = signedWebhookRequest(event);
    await WEBHOOK_POST({ request: req } as any);

    const db = await getMockDb();
    const processedEvent = db.data.stripe_events[event.id];
    expect(processedEvent).toBeDefined();
    expect(processedEvent?.type).toBe('payment_intent.succeeded');
    expect(processedEvent?.orderId).toBe(orderId);
  });

  // -------------------------------------------------------------------------
  // 4. payment_intent.payment_failed — releases reservations
  // -------------------------------------------------------------------------

  it('FAILED-1: payment_intent.payment_failed releases stock reservations', async () => {
    const orderId = 'order-failed-1';
    const paymentIntentId = 'pi_failed_001';

    await seedWebhookOrder(orderId, paymentIntentId, {
      stockReservationStatus: 'reserved',
      stockReservedItems: [{ productId: 'prod-1', quantity: 2 }],
    });

    const event = createWebhookEvent('payment_intent.payment_failed', {
      id: paymentIntentId,
      amount: 3499,
      currency: 'eur',
      status: 'failed',
      metadata: { orderId },
    });

    const req = signedWebhookRequest(event);
    const res = await WEBHOOK_POST({ request: req } as any);

    expect(res.status).toBe(200);
    expect(vi.mocked(releaseReservedStock)).toHaveBeenCalledWith(
      expect.objectContaining({
        items: expect.arrayContaining([
          expect.objectContaining({ productId: 'prod-1', quantity: 2 }),
        ]),
      })
    );
  });

  it('FAILED-2: payment_intent.payment_failed releases wallet reservation when present', async () => {
    const orderId = 'order-failed-wallet-1';
    const paymentIntentId = 'pi_failed_wallet_001';

    await seedWebhookOrder(orderId, paymentIntentId, {
      walletReservationStatus: 'reserved',
      walletReservedAmount: 10.0,
      stockReservationStatus: 'reserved',
      stockReservedItems: [],
    });

    const event = createWebhookEvent('payment_intent.payment_failed', {
      id: paymentIntentId,
      amount: 3499,
      currency: 'eur',
      status: 'failed',
      metadata: { orderId },
    });

    const req = signedWebhookRequest(event);
    const res = await WEBHOOK_POST({ request: req } as any);

    expect(res.status).toBe(200);
    expect(vi.mocked(releaseWalletReservation)).toHaveBeenCalledWith(
      expect.objectContaining({
        orderId,
        userId: USERS.USER.uid,
        amount: 10.0,
      })
    );
  });

  // -------------------------------------------------------------------------
  // 5. Amount Mismatch Guard
  // -------------------------------------------------------------------------

  it('MISMATCH-1: does not finalize order when payment amount differs from order totalCents', async () => {
    const orderId = 'order-mismatch-amount-1';
    const paymentIntentId = 'pi_mismatch_amount_001';

    // Order expects 3499 cents (34.99 EUR)
    await seedWebhookOrder(orderId, paymentIntentId, { totalCents: 3499 });

    // Webhook sends 100 cents (1.00 EUR — attacker trying to pay less)
    const event = createWebhookEvent('payment_intent.succeeded', {
      id: paymentIntentId,
      amount: 100,
      currency: 'eur',
      status: 'succeeded',
      metadata: { orderId },
    });

    const req = signedWebhookRequest(event);
    const res = await WEBHOOK_POST({ request: req } as any);

    // Webhook should acknowledge receipt but not finalize the order
    expect(res.status).toBe(200);

    const db = await getMockDb();
    const updatedOrder = db.data.orders[orderId];
    // Order must NOT have been marked as paid
    expect(updatedOrder?.paymentStatus).toBe('pending');
    // A mismatch flag should be recorded
    expect(updatedOrder?.paymentMismatch).toBe(true);
    expect(updatedOrder?.paymentMismatchReason).toBe('amount_mismatch');
  });

  it('MISMATCH-2: does not finalize order when payment currency differs from order paymentCurrency', async () => {
    const orderId = 'order-mismatch-currency-1';
    const paymentIntentId = 'pi_mismatch_currency_001';

    // Order expects EUR
    await seedWebhookOrder(orderId, paymentIntentId, {
      paymentCurrency: 'eur',
      totalCents: 3499,
    });

    // Webhook reports USD — currency mismatch
    const event = createWebhookEvent('payment_intent.succeeded', {
      id: paymentIntentId,
      amount: 3499,
      currency: 'usd',
      status: 'succeeded',
      metadata: { orderId },
    });

    const req = signedWebhookRequest(event);
    const res = await WEBHOOK_POST({ request: req } as any);

    expect(res.status).toBe(200);

    const db = await getMockDb();
    const updatedOrder = db.data.orders[orderId];
    expect(updatedOrder?.paymentStatus).toBe('pending');
    expect(updatedOrder?.paymentMismatch).toBe(true);
    expect(updatedOrder?.paymentMismatchReason).toBe('currency_mismatch');
  });

  // -------------------------------------------------------------------------
  // 6. Missing orderId in Metadata
  // -------------------------------------------------------------------------

  it('METADATA-1: returns 200 and logs warning when event metadata has no orderId', async () => {
    const event = createWebhookEvent('payment_intent.succeeded', {
      id: 'pi_no_metadata_001',
      amount: 3499,
      currency: 'eur',
      status: 'succeeded',
      metadata: {}, // no orderId
    });

    const req = signedWebhookRequest(event);
    const res = await WEBHOOK_POST({ request: req } as any);

    // Webhook should acknowledge gracefully (Stripe retries on non-2xx)
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.received).toBe(true);
  });
});
