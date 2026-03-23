/**
 * n8n webhook integration helper
 * Triggers n8n workflows from the ecommerce backend
 */

export interface N8nWebhookPayload {
  event: string;
  orderId?: string;
  customerPhone?: string;
  customerName?: string;
  customerEmail?: string;
  [key: string]: unknown;
}

/**
 * Triggers an n8n webhook with a payload.
 * Fails silently to avoid breaking the main request flow.
 */
export async function triggerN8nWebhook(
  webhookUrl: string,
  payload: N8nWebhookPayload
): Promise<void> {
  if (!webhookUrl) return;

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(5000), // 5s timeout
    });

    if (!response.ok) {
      console.warn('[n8n] Webhook call failed', {
        url: webhookUrl,
        status: response.status,
        event: payload.event,
      });
    }
  } catch (err) {
    // Non-critical: never break the main flow if n8n is down
    console.warn('[n8n] Webhook error (non-critical):', err instanceof Error ? err.message : err);
  }
}
