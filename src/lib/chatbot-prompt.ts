// src/lib/chatbot-prompt.ts
// Prompt y helpers puros del chatbot de la web (sin dependencias de Firebase,
// para poder testearlos de forma aislada). El endpoint /api/chat los consume.

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface CatalogProduct {
  name?: string;
  basePrice?: number;
  category?: string;
  subcategory?: string;
  slug?: string;
}

export interface CatalogFaq {
  question?: string;
  answer?: string;
}

export const SITE_URL = 'https://imprimearte.es';

// Límites del endpoint (compartidos con los tests)
export const MAX_MESSAGE_CHARS = 500;
export const MAX_ASSISTANT_CHARS = 1500;
export const MAX_HISTORY_MESSAGES = 12;

/**
 * Identidad, tono y reglas del asistente. Los datos vivos (catálogo y FAQs)
 * se inyectan en un bloque aparte con prompt caching.
 */
export const STATIC_SYSTEM_PROMPT = `Eres el asistente virtual de Imprime Arte (imprimearte.es), un taller de impresión y personalización situado en Los Llanos de Aridane, La Palma (Islas Canarias, España).

SERVICIOS:
- Impresión DTF en textil (camisetas, sudaderas, bolsas...)
- Bordado personalizado
- Impresión 3D
- Sublimación (tazas, textil, regalos)
- Corte láser y grabado
- Productos personalizados con foto, logo o texto a través del configurador online

CÓMO FUNCIONA LA WEB:
- El cliente elige un producto, pulsa "Personalizar", sube su imagen o logo, añade texto y ve una vista previa antes de comprar.
- También puede comprar ahora y enviar el diseño más tarde si aún no lo tiene listo.
- Pago seguro con tarjeta (Stripe).
- Páginas útiles: ${SITE_URL}/productos (catálogo), ${SITE_URL}/como-funciona, ${SITE_URL}/faq, ${SITE_URL}/contacto, ${SITE_URL}/galeria

PLAZOS Y ENVÍOS (orientativos):
- Producción: 3-5 días hábiles según el producto.
- Envío estándar: aprox. 4,99 €, gratis a partir de 50 €. El coste exacto se calcula en el checkout.
- Actualmente entregamos en las Islas Canarias. Para otras zonas, indica que consulten por WhatsApp.

CONTACTO HUMANO:
- WhatsApp: +34 645 341 452 (enlace: https://wa.me/34645341452)
- Email: soporte@imprimeartes.com
- Horario de atención: lunes a viernes, 9:00-18:00

REGLAS:
1. Responde SIEMPRE en el idioma del cliente (normalmente español). Sé cercano, claro y breve: 2-4 frases por respuesta.
2. Texto plano únicamente: sin markdown, sin asteriscos, sin listas con guiones largos. Las URLs escríbelas completas.
3. No inventes precios, plazos ni características. Si un dato no está en este documento, en las FAQs o en el catálogo, dilo honestamente y deriva a WhatsApp.
4. Presupuestos a medida (cantidades grandes, empresas, diseños complejos): deriva a WhatsApp o al configurador.
5. Estado de un pedido concreto: indica que pueden verlo en "Mi cuenta > Mis pedidos" o consultarlo por WhatsApp. Tú no tienes acceso a pedidos.
6. Quejas o incidencias: pide disculpas y deriva a WhatsApp o email. No prometas compensaciones.
7. Si preguntan por un producto, recomienda productos concretos del catálogo con su precio y enlace cuando encajen.
8. No hables de temas ajenos a Imprime Arte. Redirige con amabilidad a lo que sí puedes hacer.
9. El cliente ya recibió un saludo automático al abrir el chat: no te presentes de nuevo, ve al grano.`;

/** Bloque de catálogo compacto para el system prompt. */
export function buildCatalogBlock(products: CatalogProduct[]): string {
  const lines = products
    .filter((p) => p.name && p.slug)
    .map((p) => {
      const price = Number(p.basePrice);
      const priceText = Number.isFinite(price) && price > 0 ? `${price.toFixed(2)} €` : 'consultar';
      const category = [p.category, p.subcategory].filter(Boolean).join(' > ');
      return `- ${p.name} | ${priceText}${category ? ` | ${category}` : ''} | ${SITE_URL}/producto/${p.slug}`;
    });

  if (lines.length === 0) return '';

  return `CATÁLOGO ACTUAL (nombre | precio desde | categoría | enlace):\n${lines.join('\n')}`;
}

/** Bloque de FAQs oficiales (editables desde el panel admin). */
export function buildFaqBlock(faqs: CatalogFaq[]): string {
  const lines = faqs
    .filter((f) => f.question && f.answer)
    .map((f) => `P: ${f.question}\nR: ${f.answer}`);

  if (lines.length === 0) return '';

  return `PREGUNTAS FRECUENTES OFICIALES (si contradicen otro dato, estas mandan):\n${lines.join('\n\n')}`;
}

export interface SystemBlock {
  type: 'text';
  text: string;
  cache_control?: { type: 'ephemeral' };
}

/**
 * Ensambla los bloques system para la API de Claude. El último bloque lleva
 * cache_control para cachear todo el prefijo (prompt caching).
 */
export function buildSystemBlocks(contextBlock: string): SystemBlock[] {
  if (!contextBlock) {
    return [{ type: 'text', text: STATIC_SYSTEM_PROMPT, cache_control: { type: 'ephemeral' } }];
  }

  return [
    { type: 'text', text: STATIC_SYSTEM_PROMPT },
    { type: 'text', text: contextBlock, cache_control: { type: 'ephemeral' } },
  ];
}

/**
 * Valida y normaliza el historial recibido del cliente.
 * Devuelve null si el payload no es utilizable.
 */
export function sanitizeMessages(raw: unknown): ChatMessage[] | null {
  if (!Array.isArray(raw) || raw.length === 0) return null;

  const cleaned: ChatMessage[] = [];

  for (const item of raw.slice(-MAX_HISTORY_MESSAGES)) {
    if (!item || typeof item !== 'object') return null;

    const { role, content } = item as { role?: unknown; content?: unknown };
    if (role !== 'user' && role !== 'assistant') return null;
    if (typeof content !== 'string') return null;

    const maxChars = role === 'user' ? MAX_MESSAGE_CHARS : MAX_ASSISTANT_CHARS;
    const text = content.trim().slice(0, maxChars);
    if (!text) return null;

    cleaned.push({ role, content: text });
  }

  // La conversación debe terminar con un mensaje del usuario
  if (cleaned[cleaned.length - 1].role !== 'user') return null;

  // La API exige que el primer mensaje sea del usuario
  while (cleaned.length > 0 && cleaned[0].role !== 'user') {
    cleaned.shift();
  }
  if (cleaned.length === 0) return null;

  return cleaned;
}
