// src/pages/api/chat.ts
// Chatbot de la web: recibe el historial del widget, añade contexto del negocio
// (catálogo + FAQs desde Firestore, cacheados) y responde con Claude Haiku.
import type { APIRoute } from 'astro';
import { getAdminDb } from '../../lib/firebase-admin';
import {
  checkRateLimit,
  createRateLimitResponse,
  RATE_LIMIT_CONFIGS,
} from '../../lib/rate-limiter';
import { validateCSRF, createCSRFErrorResponse } from '../../lib/csrf';
import { createScopedLogger } from '../../lib/utils/apiLogger';
import {
  buildCatalogBlock,
  buildFaqBlock,
  buildSystemBlocks,
  sanitizeMessages,
  type CatalogFaq,
  type CatalogProduct,
} from '../../lib/chatbot-prompt';

export const prerender = false;

const logger = createScopedLogger('chat');

const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages';
const MODEL = 'claude-haiku-4-5-20251001';
const MAX_TOKENS = 600;
const API_TIMEOUT_MS = 25_000;

// Contexto (catálogo + FAQs) cacheado en memoria de la instancia serverless
const CONTEXT_TTL_MS = 10 * 60 * 1000;
const CONTEXT_ERROR_TTL_MS = 2 * 60 * 1000;

let contextCache: { block: string; expires: number } | null = null;

async function getContextBlock(): Promise<string> {
  const now = Date.now();
  if (contextCache && contextCache.expires > now) {
    return contextCache.block;
  }

  try {
    const db = getAdminDb();
    const [productsSnap, faqsSnap] = await Promise.all([
      db.collection('products').where('active', '==', true).get(),
      db.collection('faqs').where('active', '==', true).get(),
    ]);

    const products = productsSnap.docs.map((doc) => {
      const data = doc.data() as CatalogProduct & { slug?: string };
      return { ...data, slug: data.slug || doc.id };
    });
    const faqs = faqsSnap.docs.map((doc) => doc.data() as CatalogFaq);

    const block = [buildFaqBlock(faqs), buildCatalogBlock(products)].filter(Boolean).join('\n\n');

    contextCache = { block, expires: now + CONTEXT_TTL_MS };
    logger.info('Contexto del chatbot refrescado', {
      products: products.length,
      faqs: faqs.length,
    });
    return block;
  } catch (error) {
    // Sin contexto el bot sigue funcionando con el prompt estático
    logger.error('No se pudo cargar el contexto del chatbot', error);
    contextCache = { block: '', expires: now + CONTEXT_ERROR_TTL_MS };
    return '';
  }
}

function jsonResponse(body: Record<string, unknown>, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

export const POST: APIRoute = async ({ request }) => {
  // SECURITY: Rate limiting (endpoint público que consume una API de pago)
  const rateLimitResult = await checkRateLimit(request, RATE_LIMIT_CONFIGS.STRICT, 'chat');
  if (!rateLimitResult.allowed) {
    logger.warn('Rate limit excedido');
    return createRateLimitResponse(rateLimitResult);
  }

  // SECURITY: CSRF / same-origin
  const csrfCheck = validateCSRF(request);
  if (!csrfCheck.valid) {
    logger.warn('CSRF inválido', { reason: csrfCheck.reason });
    return createCSRFErrorResponse();
  }

  const apiKey = import.meta.env.ANTHROPIC_API_KEY as string | undefined;
  if (!apiKey) {
    logger.error('ANTHROPIC_API_KEY no configurada');
    return jsonResponse({ error: 'Servicio no disponible' }, 503);
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return jsonResponse({ error: 'JSON inválido' }, 400);
  }

  const { messages: rawMessages, sessionId } = (payload ?? {}) as {
    messages?: unknown;
    sessionId?: unknown;
  };

  const messages = sanitizeMessages(rawMessages);
  if (!messages) {
    return jsonResponse({ error: 'Historial de mensajes inválido' }, 400);
  }

  const contextBlock = await getContextBlock();

  try {
    const res = await fetch(ANTHROPIC_URL, {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: MAX_TOKENS,
        system: buildSystemBlocks(contextBlock),
        messages,
      }),
      signal: AbortSignal.timeout(API_TIMEOUT_MS),
    });

    if (!res.ok) {
      const errorBody = await res.text().catch(() => '');
      logger.error('Error de la API de Anthropic', { status: res.status, body: errorBody });
      return jsonResponse({ error: 'No se pudo generar la respuesta' }, 502);
    }

    const data = (await res.json()) as {
      content?: Array<{ type: string; text?: string }>;
      usage?: Record<string, unknown>;
    };

    const reply = data.content?.find((block) => block.type === 'text')?.text?.trim();
    if (!reply) {
      logger.error('Respuesta de la API sin texto', { content: data.content });
      return jsonResponse({ error: 'Respuesta vacía' }, 502);
    }

    logger.info('Respuesta generada', {
      sessionId: typeof sessionId === 'string' ? sessionId.slice(0, 40) : undefined,
      usage: data.usage,
    });

    return jsonResponse({ reply }, 200);
  } catch (error) {
    const isTimeout = error instanceof Error && error.name === 'TimeoutError';
    logger.error(isTimeout ? 'Timeout llamando a Anthropic' : 'Fallo llamando a Anthropic', error);
    return jsonResponse({ error: 'No se pudo generar la respuesta' }, isTimeout ? 504 : 502);
  }
};
