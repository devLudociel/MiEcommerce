import { describe, it, expect } from 'vitest';
import {
  generateConfiguratorPreviewHTML,
  generateCustomizationSummary,
  generateDesignPreviewHTML,
} from '../designPreview';

/** Personalización flat como la guarda el configurador V2 en el pedido */
const flatSendLater = {
  configuratorId: 'W1y3TaQCGL10vhJOs3L3',
  option_color: 'negro',
  option_color_label: 'Negro',
  option_print_type: 'dtf',
  option_print_type_label: 'DTF',
  designMode: 'send-later',
  placement: 'pecho_pequeno',
  placementLabel: 'Pecho pequeño (8–12 cm)',
};

describe('generateConfiguratorPreviewHTML', () => {
  it('renderiza aviso destacado para designMode send-later', () => {
    const html = generateConfiguratorPreviewHTML(flatSendLater);
    expect(html).toContain('Diseño pendiente de envío');
    expect(html).toContain('Te contactaremos para recibirlo');
  });

  it('renderiza opciones con label legible y posición', () => {
    const html = generateConfiguratorPreviewHTML(flatSendLater);
    expect(html).toContain('Negro');
    expect(html).toContain('DTF');
    expect(html).toContain('Pecho pequeño (8–12 cm)');
    expect(html).toContain('print type'); // option_print_type_label → "print type"
  });

  it('renderiza servicio de diseño para need-design con notas escapadas', () => {
    const html = generateConfiguratorPreviewHTML({
      option_color_label: 'Rojo',
      designMode: 'need-design',
      designNotes: 'Logo <script>alert(1)</script> & "texto"',
    });
    expect(html).toContain('Servicio de diseño incluido');
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
    expect(html).toContain('&amp;');
  });

  it('renderiza imagen subida para designMode ready con URL https', () => {
    const html = generateConfiguratorPreviewHTML({
      option_color_label: 'Azul',
      designMode: 'ready',
      uploadedImage: 'https://firebasestorage.googleapis.com/x/design.png',
    });
    expect(html).toContain('https://firebasestorage.googleapis.com/x/design.png');
    expect(html).toContain('Tu diseño subido');
  });

  it('ignora uploadedImage que no sea URL http(s)', () => {
    const html = generateConfiguratorPreviewHTML({
      designMode: 'ready',
      uploadedImage: 'javascript:alert(1)',
    });
    expect(html).not.toContain('javascript:alert');
  });

  it('devuelve vacío para personalización legacy (con fields)', () => {
    const html = generateConfiguratorPreviewHTML({
      fields: { color: { type: 'select', label: 'Color', value: 'rojo' } },
    });
    expect(html).toBe('');
  });

  it('devuelve vacío para objeto sin datos del configurador', () => {
    expect(generateConfiguratorPreviewHTML({})).toBe('');
    expect(generateConfiguratorPreviewHTML(null)).toBe('');
    expect(generateConfiguratorPreviewHTML(undefined)).toBe('');
  });
});

describe('generateCustomizationSummary — formato flat', () => {
  it('resume opciones y estado del diseño', () => {
    const summary = generateCustomizationSummary(flatSendLater as never);
    expect(summary).toContain('opciones');
    expect(summary).toContain('diseño pendiente de envío');
  });

  it('sigue funcionando con formato legacy', () => {
    const summary = generateCustomizationSummary({
      fields: {
        color: { type: 'select', label: 'Color', value: 'rojo' },
        nombre: { type: 'text', label: 'Nombre', value: 'Ana' },
      },
    });
    expect(summary).toContain('1 texto');
    expect(summary).toContain('1 opción');
  });

  it('devuelve vacío para objeto vacío', () => {
    expect(generateCustomizationSummary({} as never)).toBe('');
  });
});

describe('generateDesignPreviewHTML — no interfiere con formato flat', () => {
  it('devuelve vacío para personalización flat (sin fields)', () => {
    expect(generateDesignPreviewHTML('Camiseta', flatSendLater as never)).toBe('');
  });
});
