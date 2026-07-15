import { describe, it, expect } from 'vitest';
import {
  buildCatalogBlock,
  buildFaqBlock,
  buildSystemBlocks,
  sanitizeMessages,
  MAX_HISTORY_MESSAGES,
  MAX_MESSAGE_CHARS,
  STATIC_SYSTEM_PROMPT,
} from '../chatbot-prompt';

describe('buildCatalogBlock', () => {
  it('genera una línea por producto con precio y enlace', () => {
    const block = buildCatalogBlock([
      { name: 'Taza mágica', basePrice: 14.5, category: 'tazas', slug: 'taza-magica' },
    ]);

    expect(block).toContain('Taza mágica');
    expect(block).toContain('14.50 €');
    expect(block).toContain('https://imprimearte.es/producto/taza-magica');
  });

  it('omite productos sin nombre o slug y devuelve vacío si no queda ninguno', () => {
    expect(buildCatalogBlock([{ name: 'Sin slug' }, { slug: 'sin-nombre' }])).toBe('');
  });

  it('marca "consultar" cuando no hay precio válido', () => {
    const block = buildCatalogBlock([{ name: 'Servicio láser', slug: 'laser', basePrice: 0 }]);
    expect(block).toContain('consultar');
  });
});

describe('buildFaqBlock', () => {
  it('formatea pregunta y respuesta', () => {
    const block = buildFaqBlock([{ question: '¿Cuánto tarda?', answer: '3-5 días.' }]);
    expect(block).toContain('P: ¿Cuánto tarda?');
    expect(block).toContain('R: 3-5 días.');
  });

  it('devuelve vacío sin FAQs completas', () => {
    expect(buildFaqBlock([{ question: 'Solo pregunta' }])).toBe('');
  });
});

describe('buildSystemBlocks', () => {
  it('sin contexto: un único bloque estático con cache_control', () => {
    const blocks = buildSystemBlocks('');
    expect(blocks).toHaveLength(1);
    expect(blocks[0].text).toBe(STATIC_SYSTEM_PROMPT);
    expect(blocks[0].cache_control).toEqual({ type: 'ephemeral' });
  });

  it('con contexto: dos bloques y cache_control solo en el último', () => {
    const blocks = buildSystemBlocks('CATÁLOGO...');
    expect(blocks).toHaveLength(2);
    expect(blocks[0].cache_control).toBeUndefined();
    expect(blocks[1].cache_control).toEqual({ type: 'ephemeral' });
  });
});

describe('sanitizeMessages', () => {
  it('acepta un historial válido', () => {
    const result = sanitizeMessages([
      { role: 'user', content: 'Hola' },
      { role: 'assistant', content: 'Buenas' },
      { role: 'user', content: '¿Precio de tazas?' },
    ]);
    expect(result).toHaveLength(3);
  });

  it('rechaza payloads que no son array o están vacíos', () => {
    expect(sanitizeMessages(null)).toBeNull();
    expect(sanitizeMessages('hola')).toBeNull();
    expect(sanitizeMessages([])).toBeNull();
  });

  it('rechaza roles desconocidos y contenidos no string', () => {
    expect(sanitizeMessages([{ role: 'system', content: 'x' }])).toBeNull();
    expect(sanitizeMessages([{ role: 'user', content: 42 }])).toBeNull();
  });

  it('rechaza si el último mensaje no es del usuario', () => {
    expect(
      sanitizeMessages([
        { role: 'user', content: 'Hola' },
        { role: 'assistant', content: 'Buenas' },
      ])
    ).toBeNull();
  });

  it('recorta historiales largos a los últimos mensajes', () => {
    const long = Array.from({ length: 30 }, (_, i) => ({
      role: i % 2 === 0 ? 'user' : 'assistant',
      content: `msg ${i}`,
    }));
    // Termina en índice 29 (assistant) → añadimos uno de usuario
    long.push({ role: 'user', content: 'último' });

    const result = sanitizeMessages(long);
    expect(result).not.toBeNull();
    expect(result!.length).toBeLessThanOrEqual(MAX_HISTORY_MESSAGES);
    expect(result![result!.length - 1].content).toBe('último');
    expect(result![0].role).toBe('user');
  });

  it('trunca mensajes de usuario demasiado largos', () => {
    const result = sanitizeMessages([{ role: 'user', content: 'a'.repeat(2000) }]);
    expect(result).not.toBeNull();
    expect(result![0].content.length).toBe(MAX_MESSAGE_CHARS);
  });

  it('rechaza mensajes vacíos tras recortar espacios', () => {
    expect(sanitizeMessages([{ role: 'user', content: '   ' }])).toBeNull();
  });
});
