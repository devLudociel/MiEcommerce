import { describe, expect, it } from 'vitest';
import {
  buildConfigurableProductFromTable,
  convertTableToPricingMatrix,
  getSheetMatrixPrice,
  getSheetsNeeded,
  getUnitPrice,
  migrateLegacyProduct,
  normalizeConfigurator,
  resolveConditionalAttributes,
  unifyTarjetasPresentacionProducts,
  validateSheetMatrixPricing,
  validateTarjetasMatrixRules,
  validateConfigurator,
} from '../index';

const BASE_DESIGN = {
  formats: ['PNG', 'PDF'],
  minDpi: 300,
  requireTransparentBg: false,
  designServicePrice: 5,
  designServiceLabel: 'Servicio de diseño',
};

describe('configurator engine', () => {
  const SHEET_MATRIX_CONFIG = {
    version: 2,
    steps: [
      'attribute:material',
      'attribute:tamano',
      'attribute:acabado',
      'design',
      'quantity',
      'summary',
    ],
    attributes: [
      {
        id: 'material',
        label: 'Material',
        type: 'select',
        options: [
          { id: 'papel_fotografico', label: 'Papel fotografico' },
          { id: 'vinilo', label: 'Vinilo' },
        ],
      },
      {
        id: 'tamano',
        label: 'Tamano',
        type: 'select',
        options: [{ id: 'circular_3_8', label: 'Circular 3.8 cm' }],
      },
      {
        id: 'acabado',
        label: 'Acabado',
        type: 'select',
        options: [
          { id: 'none', label: 'No aplica' },
          { id: 'mate', label: 'Mate' },
          { id: 'brillo', label: 'Brillo' },
          { id: 'transparente', label: 'Transparente' },
        ],
        visibleWhen: {
          material: ['vinilo'],
        },
        defaultWhen: [
          {
            when: { material: ['papel_fotografico'] },
            value: 'none',
          },
        ],
      },
    ],
    pricing: {
      mode: 'sheet-matrix',
      quantityInput: { min: 1, step: 1, label: 'Cantidad' },
      rules: [
        {
          match: {
            material: 'papel_fotografico',
            tamano: 'circular_3_8',
            acabado: 'none',
          },
          unitsPerSheet: 24,
          sheetPricingTiers: [
            { from: 1, price: 9 },
            { from: 2, price: 16.5 },
            { from: 3, price: 24.5 },
            { from: 4, price: 29.5 },
          ],
        },
        {
          match: {
            material: 'vinilo',
            tamano: 'circular_3_8',
            acabado: 'mate',
          },
          unitsPerSheet: 20,
          sheetPricingTiers: [
            { from: 1, price: 11 },
            { from: 2, price: 20 },
            { from: 3, price: 28 },
          ],
        },
      ],
    },
    design: BASE_DESIGN,
  };

  it('resuelve producto simple con tiers por cantidad', () => {
    const config = {
      steps: ['design', 'quantity', 'summary'],
      design: BASE_DESIGN,
      quantity: {
        min: 1,
        tiers: [
          { from: 1, price: 15 },
          { from: 5, price: 13 },
          { from: 10, price: 12.5 },
        ],
      },
    };

    const normalized = normalizeConfigurator(config);

    expect(normalized.pricing?.mode).toBe('simple');

    const price = getUnitPrice(config, {}, 7);
    expect(price.ok).toBe(true);
    expect(price.unitPrice).toBe(13);
    expect(price.appliedTier?.from).toBe(5);
  });

  it('migra sizePricing legacy a pricing matrix', () => {
    const config = {
      steps: ['size', 'design', 'quantity', 'summary'],
      size: {
        label: 'Talla',
        options: ['S', 'L'],
      },
      design: BASE_DESIGN,
      quantity: {
        min: 1,
        tiers: [{ from: 1, price: 20 }],
        sizePricing: {
          S: [
            { from: 1, price: 19 },
            { from: 10, price: 17 },
          ],
          L: [
            { from: 1, price: 22 },
            { from: 10, price: 20 },
          ],
        },
      },
    };

    const normalized = normalizeConfigurator(config);
    expect(normalized.pricing?.mode).toBe('matrix');

    const price = getUnitPrice(config, { size: 'l' }, 10);
    expect(price.ok).toBe(true);
    expect(price.unitPrice).toBe(20);
    expect(price.matchedRule?.match).toEqual({ size: 'l' });
  });

  it('resuelve matrix completa por combinacion de atributos + cantidad', () => {
    const config = {
      version: 2,
      steps: [
        'attribute:tipo',
        'attribute:tamano',
        'attribute:acabado',
        'design',
        'quantity',
        'summary',
      ],
      attributes: [
        {
          id: 'tipo',
          label: 'Tipo',
          type: 'select',
          options: [
            { id: 'vinilo_blanco', label: 'Vinilo blanco' },
            { id: 'papel', label: 'Papel' },
          ],
        },
        {
          id: 'tamano',
          label: 'Tamano',
          type: 'select',
          options: [
            { id: '5x5', label: '5x5 cm' },
            { id: '10x10', label: '10x10 cm' },
          ],
        },
        {
          id: 'acabado',
          label: 'Acabado',
          type: 'select',
          options: [
            { id: 'mate', label: 'Mate' },
            { id: 'brillo', label: 'Brillo' },
          ],
        },
      ],
      pricing: {
        mode: 'matrix',
        quantityInput: { min: 10, step: 1 },
        rules: [
          {
            match: {
              tipo: 'vinilo_blanco',
              tamano: '5x5',
              acabado: 'mate',
            },
            tiers: [
              { from: 10, price: 1 },
              { from: 50, price: 0.8 },
              { from: 100, price: 0.6 },
            ],
          },
        ],
      },
      design: BASE_DESIGN,
    };

    const result = getUnitPrice(
      config,
      {
        tipo: 'vinilo_blanco',
        tamano: '5x5',
        acabado: 'mate',
      },
      100
    );

    expect(result.ok).toBe(true);
    expect(result.unitPrice).toBe(0.6);
    expect(result.appliedTier?.from).toBe(100);
  });

  it('devuelve error controlado cuando falta seleccion obligatoria', () => {
    const config = {
      version: 2,
      steps: ['attribute:tipo', 'design', 'quantity', 'summary'],
      attributes: [
        {
          id: 'tipo',
          label: 'Tipo',
          type: 'select',
          options: [{ id: 'vinilo', label: 'Vinilo' }],
        },
      ],
      pricing: {
        mode: 'simple',
        quantityInput: { min: 1, step: 1 },
        tiers: [{ from: 1, price: 10 }],
      },
      design: BASE_DESIGN,
    };

    const result = getUnitPrice(config, {}, 1);

    expect(result.ok).toBe(false);
    expect(result.error?.code).toBe('MISSING_ATTRIBUTE');
  });

  it('devuelve error controlado cuando no existe combinacion de precio', () => {
    const config = {
      version: 2,
      steps: ['attribute:acabado', 'design', 'quantity', 'summary'],
      attributes: [
        {
          id: 'acabado',
          label: 'Acabado',
          type: 'select',
          options: [
            { id: 'mate', label: 'Mate' },
            { id: 'brillo', label: 'Brillo' },
          ],
        },
      ],
      pricing: {
        mode: 'matrix',
        quantityInput: { min: 1, step: 1 },
        rules: [
          {
            match: { acabado: 'mate' },
            tiers: [{ from: 1, price: 1.2 }],
          },
        ],
      },
      design: BASE_DESIGN,
    };

    const result = getUnitPrice(config, { acabado: 'brillo' }, 10);

    expect(result.ok).toBe(false);
    expect(result.error?.code).toBe('NO_MATCHING_RULE');
  });

  it('permite matrix sin rules cuando existe engravingSurcharge', () => {
    const config = {
      version: 2,
      steps: ['attribute:texto_grabado', 'design', 'quantity', 'summary'],
      attributes: [
        {
          id: 'texto_grabado',
          label: 'Texto grabado',
          type: 'freetext',
          options: [],
          required: false,
        },
      ],
      pricing: {
        mode: 'matrix',
        quantityInput: { min: 1, step: 1 },
        engravingSurcharge: 8,
        rules: [],
      },
      design: BASE_DESIGN,
    };

    const validation = validateConfigurator(config);

    expect(validation.valid).toBe(true);
    expect(validation.errors).toHaveLength(0);
    expect(validation.normalized.pricing.mode).toBe('matrix');
    if (validation.normalized.pricing.mode === 'matrix') {
      expect(validation.normalized.pricing.rules).toHaveLength(0);
      expect(validation.normalized.pricing.engravingSurcharge).toBe(8);
    }
  });

  it('getUnitPrice devuelve ok en matrix sin rules cuando hay engravingSurcharge', () => {
    const config = {
      version: 2,
      steps: ['attribute:texto_grabado', 'design', 'quantity', 'summary'],
      attributes: [
        {
          id: 'texto_grabado',
          label: 'Texto grabado',
          type: 'freetext',
          options: [],
          required: false,
        },
      ],
      pricing: {
        mode: 'matrix',
        quantityInput: { min: 1, step: 1 },
        engravingSurcharge: 8,
        rules: [],
      },
      design: BASE_DESIGN,
    };

    const result = getUnitPrice(config, { texto_grabado: 'HUGO' }, 3);

    expect(result.ok).toBe(true);
    expect(result.pricingMode).toBe('matrix');
    expect(result.unitPrice).toBe(0);
    expect(result.totalPrice).toBe(0);
    expect(result.error).toBeNull();
  });

  it('ordena tiers desordenados durante validacion', () => {
    const config = {
      version: 2,
      steps: ['attribute:tamano', 'design', 'quantity', 'summary'],
      attributes: [
        {
          id: 'tamano',
          label: 'Tamano',
          type: 'select',
          options: [{ id: 'a4', label: 'A4' }],
        },
      ],
      pricing: {
        mode: 'simple',
        quantityInput: { min: 1, step: 1 },
        tiers: [
          { from: 10, price: 8 },
          { from: 1, price: 10 },
          { from: 5, price: 9 },
        ],
      },
      design: BASE_DESIGN,
    };

    const validation = validateConfigurator(config);

    expect(validation.valid).toBe(true);
    expect(validation.normalized.pricing.mode).toBe('simple');
    if (validation.normalized.pricing.mode === 'simple') {
      expect(validation.normalized.pricing.tiers.map((t) => t.from)).toEqual([1, 5, 10]);
    }
  });

  it('migra producto legacy a version 2 con snapshot', () => {
    const legacyProduct = {
      id: 'prod_camiseta',
      name: 'Camiseta',
      configurator: {
        steps: ['variant', 'size', 'design', 'placement', 'quantity', 'summary'],
        variant: {
          label: 'Color',
          type: 'color',
          options: [
            { id: 'blanco', label: 'Blanco', value: '#ffffff' },
            { id: 'negro', label: 'Negro', value: '#000000' },
          ],
        },
        size: {
          label: 'Talla',
          options: ['XS', 'S'],
        },
        design: BASE_DESIGN,
        placement: {
          label: 'Posicion',
          options: [{ id: 'frente', label: 'Frente' }],
          allowSize: false,
          sizeOptions: [],
        },
        quantity: {
          min: 1,
          tiers: [
            { from: 1, price: 15 },
            { from: 5, price: 13 },
          ],
        },
      },
    };

    const migrated = migrateLegacyProduct(legacyProduct);

    expect(migrated.configurator.version).toBe(2);
    expect(migrated.configurator.importMeta?.legacy).toBe(true);
    expect(migrated.configurator.legacySnapshot).toBeDefined();
    expect(migrated.configurator.attributes.some((a) => a.id === 'color')).toBe(true);
    expect(migrated.configurator.pricing.mode).toBe('simple');
  });

  it('normaliza acabados legacy aunque vengan bajo variante de color', () => {
    const legacy = {
      steps: ['variant', 'design', 'quantity', 'summary'],
      variant: {
        label: 'Color',
        type: 'color',
        options: [
          { id: 'mate', label: 'Mate', value: '#ffffff' },
          { id: 'brillo', label: 'Brillo', value: '#f5f5f5' },
        ],
      },
      design: BASE_DESIGN,
      quantity: {
        min: 1,
        tiers: [{ from: 1, price: 3 }],
      },
    };

    const normalized = normalizeConfigurator(legacy);
    const acabado = normalized.attributes?.find((attribute) => attribute.id === 'acabado');

    expect(acabado).toBeDefined();
    expect(acabado?.type).toBe('select');
    expect(acabado?.options.map((option) => option.id)).toEqual(['matte', 'brillo']);
  });

  it('convierte tabla y unifica tarjetas en un producto matrix', () => {
    const rows = [
      { acabado: 'matte', size: '85x55', cantidad: 100, precio: 0.16 },
      { acabado: 'matte', size: '85x55', cantidad: 250, precio: 0.12 },
      { acabado: 'brillo', size: '85x55', cantidad: 100, precio: 0.18 },
      { acabado: 'brillo', size: '85x55', cantidad: 250, precio: 0.14 },
    ];

    const matrix = convertTableToPricingMatrix(rows, {
      attributeKeys: ['acabado', 'size'],
    });

    expect(matrix.rules).toHaveLength(2);
    expect(matrix.rules[0]?.match.size).toBe('estandar_85x55mm');

    const built = buildConfigurableProductFromTable({
      productMeta: {
        id: 'cfg_tarjetas_presentacion_v2',
        name: 'Tarjetas de presentacion',
        description: 'Tarjetas de presentacion personalizadas',
      },
      attributes: [
        {
          id: 'acabado',
          label: 'Acabado',
          type: 'select',
          options: [
            { id: 'matte', label: 'Matte' },
            { id: 'brillo', label: 'Brillo' },
          ],
        },
        {
          id: 'size',
          label: 'Tamaño',
          type: 'select',
          options: [{ id: 'estandar_85x55mm', label: 'Estándar 85x55mm' }],
        },
      ],
      rows,
      design: BASE_DESIGN,
      quantityInput: { min: 100, step: 1 },
    });

    expect(built.configurator.version).toBe(2);
    expect(built.configurator.pricing.mode).toBe('matrix');

    const price = getUnitPrice(
      built.configurator,
      { acabado: 'matte', size: '85x55' },
      250
    );

    expect(price.ok).toBe(true);
    expect(price.unitPrice).toBe(0.12);
  });

  it('unifica matte, brillo y barniz uv en una sola matriz por acabado + size', () => {
    const matte = {
      id: 'cfg_tarjetas_matte',
      name: 'Tarjetas de presentación matte',
      description: 'Tarjetas matte',
      configurator: {
        steps: ['size', 'design', 'quantity', 'summary'],
        size: {
          label: 'Tamaño',
          options: ['85x55', '65x65', '85x40'],
        },
        design: BASE_DESIGN,
        quantity: {
          min: 100,
          tiers: [{ from: 100, price: 0.16 }],
          sizePricing: {
            '85x55': [{ from: 100, price: 0.16 }, { from: 250, price: 0.12 }],
            '65x65': [{ from: 100, price: 0.18 }, { from: 250, price: 0.14 }],
            '85x40': [{ from: 100, price: 0.2 }, { from: 250, price: 0.15 }],
          },
        },
      },
    };

    const brillo = {
      id: 'cfg_tarjetas_brillo',
      name: 'Tarjetas de presentación brillo',
      description: 'Tarjetas brillo',
      configurator: {
        steps: ['size', 'design', 'quantity', 'summary'],
        size: {
          label: 'Tamaño',
          options: ['85x55', '65x65', '85x40'],
        },
        design: BASE_DESIGN,
        quantity: {
          min: 100,
          tiers: [{ from: 100, price: 0.18 }],
          sizePricing: {
            '85x55': [{ from: 100, price: 0.18 }, { from: 250, price: 0.14 }],
            '65x65': [{ from: 100, price: 0.2 }, { from: 250, price: 0.16 }],
            '85x40': [{ from: 100, price: 0.22 }, { from: 250, price: 0.17 }],
          },
        },
      },
    };

    const barnizUv = {
      id: 'cfg_tarjetas_barniz_uv',
      name: 'Tarjetas de presentación barniz UV',
      description: 'Tarjetas barniz UV',
      configurator: {
        steps: ['size', 'design', 'quantity', 'summary'],
        size: {
          label: 'Tamaño',
          options: ['85x55', '65x65', '85x40'],
        },
        design: BASE_DESIGN,
        quantity: {
          min: 100,
          tiers: [{ from: 100, price: 0.22 }],
          sizePricing: {
            '85x55': [{ from: 100, price: 0.22 }, { from: 250, price: 0.18 }],
            '65x65': [{ from: 100, price: 0.24 }, { from: 250, price: 0.2 }],
            '85x40': [{ from: 100, price: 0.26 }, { from: 250, price: 0.22 }],
          },
        },
      },
    };

    const unified = unifyTarjetasPresentacionProducts([matte, brillo, barnizUv]);
    const unifiedConfigurator = normalizeConfigurator(unified.configurator);

    expect(unified.id).toBe('cfg_tarjetas_presentacion_v2');
    expect(unified.name).toBe('Tarjetas de presentación');
    expect(unifiedConfigurator.attributes?.map((attribute) => attribute.id)).toEqual([
      'acabado',
      'size',
    ]);
    expect(unifiedConfigurator.attributes?.[1]?.options.map((option) => option.id)).toEqual([
      'estandar_85x55mm',
      'cuadrado_65x65mm',
      'delgada_85x40mm',
    ]);
    expect(unifiedConfigurator.pricing?.mode).toBe('matrix');

    if (unifiedConfigurator.pricing?.mode === 'matrix') {
      expect(unifiedConfigurator.pricing.rules).toHaveLength(9);
      for (const rule of unifiedConfigurator.pricing.rules) {
        expect(Object.keys(rule.match).sort()).toEqual(['acabado', 'size']);
        expect(rule.match.acabado).toBeTruthy();
        expect(rule.match.size).toBeTruthy();
      }
    }

    const price = getUnitPrice(
      unifiedConfigurator,
      { acabado: 'barniz_uv', size: 'cuadrado_65x65mm' },
      250
    );

    expect(price.ok).toBe(true);
    expect(price.unitPrice).toBe(0.2);
  });

  it('valida que tarjetas use reglas por combinacion real de acabado + size', () => {
    expect(() =>
      validateTarjetasMatrixRules([
        {
          match: { size: 'estandar_85x55mm' },
          tiers: [{ from: 100, price: 0.16 }],
        },
      ])
    ).toThrow(/acabado y match\.size/i);
  });

  it('calcula hojas necesarias y redondea hacia arriba', () => {
    expect(getSheetsNeeded(24, 24)).toBe(1);
    expect(getSheetsNeeded(25, 24)).toBe(2);
    expect(getSheetsNeeded(50, 24)).toBe(3);
  });

  it('resuelve precio sheet-matrix por hojas y precio unitario efectivo', () => {
    const result = getSheetMatrixPrice(
      SHEET_MATRIX_CONFIG,
      {
        material: 'papel_fotografico',
        tamano: 'circular_3_8',
      },
      50
    );

    expect(result.ok).toBe(true);
    expect(result.pricingMode).toBe('sheet-matrix');
    expect(result.unitsPerSheet).toBe(24);
    expect(result.sheetsNeeded).toBe(3);
    expect(result.totalPrice).toBe(24.5);
    expect(result.effectiveUnitPrice).toBeCloseTo(0.49, 2);
    expect(result.matchedTier?.from).toBe(3);
  });

  it('getUnitPrice soporta sheet-matrix y devuelve total efectivo', () => {
    const result = getUnitPrice(
      SHEET_MATRIX_CONFIG,
      {
        material: 'papel_fotografico',
        tamano: 'circular_3_8',
      },
      50
    );

    expect(result.ok).toBe(true);
    expect(result.pricingMode).toBe('sheet-matrix');
    expect(result.totalPrice).toBe(24.5);
    expect(result.unitPrice).toBeCloseTo(0.49, 2);
  });

  it('resuelve atributos condicionales: acabado oculto en papel y visible en vinilo', () => {
    const paperResolved = resolveConditionalAttributes(SHEET_MATRIX_CONFIG, {
      material: 'papel_fotografico',
      tamano: 'circular_3_8',
    });
    const paperAcabado = paperResolved.attributes.find((item) => item.attributeId === 'acabado');

    expect(paperAcabado?.visible).toBe(false);
    expect(paperResolved.selection.acabado).toBe('none');

    const viniloResolved = resolveConditionalAttributes(SHEET_MATRIX_CONFIG, {
      material: 'vinilo',
      tamano: 'circular_3_8',
    });
    const viniloAcabado = viniloResolved.attributes.find((item) => item.attributeId === 'acabado');
    expect(viniloAcabado?.visible).toBe(true);
  });

  it('devuelve error controlado cuando la seleccion es invalida en sheet-matrix', () => {
    const result = getSheetMatrixPrice(
      SHEET_MATRIX_CONFIG,
      {
        material: 'metal',
        tamano: 'circular_3_8',
      },
      20
    );

    expect(result.ok).toBe(false);
    expect(result.error?.code).toBe('INVALID_SELECTION');
  });

  it('devuelve error cuando no existe regla sheet-matrix para la combinacion', () => {
    const result = getSheetMatrixPrice(
      SHEET_MATRIX_CONFIG,
      {
        material: 'vinilo',
        tamano: 'circular_3_8',
        acabado: 'brillo',
      },
      20
    );

    expect(result.ok).toBe(false);
    expect(result.error?.code).toBe('NO_MATCHING_RULE');
  });

  it('valida errores de sheet-matrix (unitsPerSheet invalido)', () => {
    const invalidConfig = {
      ...SHEET_MATRIX_CONFIG,
      pricing: {
        ...SHEET_MATRIX_CONFIG.pricing,
        rules: [
          {
            ...SHEET_MATRIX_CONFIG.pricing.rules[0],
            unitsPerSheet: 0,
          },
        ],
      },
    };

    const errors = validateSheetMatrixPricing(invalidConfig);
    expect(errors.some((error) => error.code === 'INVALID_UNITS_PER_SHEET')).toBe(true);
  });
});
