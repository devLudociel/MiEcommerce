import type { ConfiguratorV2, PricingTier, ProductConfiguratorPricingRule } from '../../types/configurator';
import { toConfiguratorV2 } from './engine';

const TARJETAS_ACABADO_OPTIONS = [
  { id: 'matte', label: 'Matte' },
  { id: 'brillo', label: 'Brillo' },
  { id: 'barniz_uv', label: 'Barniz UV' },
] as const;

const TARJETAS_SIZE_ORDER = [
  'estandar_85x55mm',
  'cuadrado_65x65mm',
  'delgada_85x40mm',
] as const;

const TARJETAS_SIZE_LABELS: Record<string, string> = {
  estandar_85x55mm: 'Estandar 85x55mm',
  cuadrado_65x65mm: 'Cuadrado 65x65mm',
  delgada_85x40mm: 'Delgada 85x40mm',
};

function asString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeId(value: string, fallback: string): string {
  const normalized = value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');

  return normalized || fallback;
}

export function normalizeTarjetasAcabadoOptionId(value: string): string {
  const normalized = normalizeId(value, '');

  if (
    normalized === 'mate' ||
    normalized === 'matte' ||
    normalized.includes('mate')
  ) {
    return 'matte';
  }

  if (
    normalized.includes('barniz') &&
    normalized.includes('uv')
  ) {
    return 'barniz_uv';
  }

  if (normalized.includes('brillo') || normalized.includes('gloss')) {
    return 'brillo';
  }

  return normalized;
}

export function normalizeTarjetasSizeOptionId(value: string): string {
  const normalized = normalizeId(value, '');

  if (!normalized) return '';

  if (
    normalized === 'estandar_85x55mm' ||
    normalized.includes('85x55')
  ) {
    return 'estandar_85x55mm';
  }

  if (
    normalized === 'cuadrado_65x65mm' ||
    normalized.includes('65x65')
  ) {
    return 'cuadrado_65x65mm';
  }

  if (
    normalized === 'delgada_85x40mm' ||
    normalized.includes('85x40')
  ) {
    return 'delgada_85x40mm';
  }

  return normalized;
}

function inferAcabadoFromName(name: string): string {
  const normalizedName = normalizeId(name, '');
  if (!normalizedName) return '';

  if (normalizedName.includes('barniz') && normalizedName.includes('uv')) {
    return 'barniz_uv';
  }

  if (normalizedName.includes('brillo') || normalizedName.includes('gloss')) {
    return 'brillo';
  }

  if (normalizedName.includes('mate') || normalizedName.includes('matte')) {
    return 'matte';
  }

  return '';
}

function findAttributeId(configurator: ConfiguratorV2, candidates: string[]): string | null {
  const normalizedCandidates = candidates.map((candidate) => normalizeId(candidate, candidate));

  for (const attribute of configurator.attributes) {
    const attrId = normalizeId(attribute.id, attribute.id);
    if (normalizedCandidates.includes(attrId)) {
      return attribute.id;
    }
  }

  for (const attribute of configurator.attributes) {
    const attrLabel = normalizeId(attribute.label, '');
    if (
      normalizedCandidates.some((candidate) => attrLabel.includes(candidate))
    ) {
      return attribute.id;
    }
  }

  return null;
}

function mergeAndSortTiers(tiers: PricingTier[]): PricingTier[] {
  const byFrom = new Map<number, PricingTier>();

  for (const tier of tiers) {
    if (!Number.isFinite(tier.from) || tier.from <= 0) continue;
    if (!Number.isFinite(tier.price) || tier.price < 0) continue;

    byFrom.set(tier.from, {
      from: Math.floor(tier.from),
      price: tier.price,
      label: tier.label,
      recommended: tier.recommended,
    });
  }

  return [...byFrom.values()].sort((a, b) => a.from - b.from);
}

function rulesKey(match: Record<string, string>): string {
  return `acabado:${match.acabado}|size:${match.size}`;
}

export function validateTarjetasMatrixRules(rules: ProductConfiguratorPricingRule[]): void {
  for (const rule of rules) {
    const acabado = asString(rule.match.acabado);
    const size = asString(rule.match.size);
    if (!acabado || !size) {
      throw new Error('Todas las reglas de tarjetas deben incluir match.acabado y match.size');
    }
    if (!Array.isArray(rule.tiers) || rule.tiers.length === 0) {
      throw new Error('Todas las reglas de tarjetas deben incluir tiers');
    }
  }
}

export interface TarjetasSourceProduct extends Record<string, unknown> {
  id?: string;
  name?: string;
  description?: string;
  configurator?: unknown;
}

function extractProductRules(product: TarjetasSourceProduct): ProductConfiguratorPricingRule[] {
  if (!product.configurator) return [];

  const cfg = toConfiguratorV2(product.configurator);
  const acabadoAttributeId =
    findAttributeId(cfg, ['acabado', 'finish']) ??
    findAttributeId(cfg, ['variant', 'color']);
  const sizeAttributeId =
    findAttributeId(cfg, ['size', 'tamano', 'talla', 'medida']) ?? null;

  const fallbackAcabado =
    inferAcabadoFromName(asString(product.name)) ||
    (acabadoAttributeId
      ? normalizeTarjetasAcabadoOptionId(cfg.attributes.find((a) => a.id === acabadoAttributeId)?.options[0]?.id || '')
      : '');

  const fallbackSize =
    sizeAttributeId
      ? normalizeTarjetasSizeOptionId(
          cfg.attributes.find((a) => a.id === sizeAttributeId)?.options[0]?.id || ''
        )
      : '';

  if (cfg.pricing.mode === 'simple') {
    if (!fallbackAcabado || !fallbackSize) {
      return [];
    }

    return [
      {
        match: {
          acabado: fallbackAcabado,
          size: fallbackSize,
        },
        tiers: mergeAndSortTiers(cfg.pricing.tiers),
      },
    ];
  }

  const rules: ProductConfiguratorPricingRule[] = [];

  for (const rule of cfg.pricing.rules) {
    const acabadoRaw =
      (acabadoAttributeId ? asString(rule.match[acabadoAttributeId]) : '') ||
      fallbackAcabado;

    const sizeRaw =
      (sizeAttributeId ? asString(rule.match[sizeAttributeId]) : '') ||
      fallbackSize;

    const acabado = normalizeTarjetasAcabadoOptionId(acabadoRaw);
    const size = normalizeTarjetasSizeOptionId(sizeRaw);

    if (!acabado || !size) continue;

    rules.push({
      match: {
        acabado,
        size,
      },
      tiers:
        'sheetPricingTiers' in rule
          ? mergeAndSortTiers(rule.sheetPricingTiers)
          : mergeAndSortTiers(rule.tiers),
    });
  }

  return rules;
}

export function unifyTarjetasPresentacionProducts(
  products: TarjetasSourceProduct[]
): Record<string, unknown> {
  if (!Array.isArray(products) || products.length === 0) {
    throw new Error('Debes enviar al menos un producto para unificar');
  }

  const first = products[0];

  const allRulesRaw = products.flatMap((product) => extractProductRules(product));

  if (!allRulesRaw.length) {
    throw new Error('No se pudieron extraer reglas de pricing desde los productos de origen');
  }

  const groupedRules = new Map<string, ProductConfiguratorPricingRule>();

  for (const rule of allRulesRaw) {
    const key = rulesKey(rule.match);
    const existing = groupedRules.get(key);

    if (!existing) {
      groupedRules.set(key, {
        match: { ...rule.match },
        tiers: mergeAndSortTiers(rule.tiers),
      });
      continue;
    }

    existing.tiers = mergeAndSortTiers([...existing.tiers, ...rule.tiers]);
  }

  const rules = [...groupedRules.values()].sort((a, b) => {
    const acabadoOrder = TARJETAS_ACABADO_OPTIONS.map((option) => option.id);
    const acabadoA = acabadoOrder.indexOf(a.match.acabado);
    const acabadoB = acabadoOrder.indexOf(b.match.acabado);
    const acabadoRankA = acabadoA === -1 ? Number.MAX_SAFE_INTEGER : acabadoA;
    const acabadoRankB = acabadoB === -1 ? Number.MAX_SAFE_INTEGER : acabadoB;
    if (acabadoRankA !== acabadoRankB) return acabadoRankA - acabadoRankB;

    const sizeA = TARJETAS_SIZE_ORDER.indexOf(a.match.size as (typeof TARJETAS_SIZE_ORDER)[number]);
    const sizeB = TARJETAS_SIZE_ORDER.indexOf(b.match.size as (typeof TARJETAS_SIZE_ORDER)[number]);
    const sizeRankA = sizeA === -1 ? Number.MAX_SAFE_INTEGER : sizeA;
    const sizeRankB = sizeB === -1 ? Number.MAX_SAFE_INTEGER : sizeB;
    return sizeRankA - sizeRankB;
  });
  validateTarjetasMatrixRules(rules);

  const sizeIds = new Set<string>();
  for (const rule of rules) {
    sizeIds.add(rule.match.size);
  }

  const orderedSizeIds = [
    ...TARJETAS_SIZE_ORDER.filter((id) => sizeIds.has(id)),
    ...[...sizeIds]
      .filter((id) => !TARJETAS_SIZE_ORDER.includes(id as (typeof TARJETAS_SIZE_ORDER)[number]))
      .sort(),
  ];

  const minFrom = Math.min(
    ...rules
      .flatMap((rule) => rule.tiers)
      .map((tier) => tier.from)
      .filter((from) => Number.isFinite(from) && from > 0)
  );

  let design: ConfiguratorV2['design'] = {
    formats: ['PNG', 'PDF', 'JPG'],
    minDpi: 300,
    requireTransparentBg: false,
    designServicePrice: 0,
    designServiceLabel: 'Servicio de diseño',
  };

  try {
    if (first?.configurator) {
      design = toConfiguratorV2(first.configurator).design;
    }
  } catch {
    // Mantiene defaults si el primer producto no tiene un configurador valido.
  }

  const unifiedConfigurator: ConfiguratorV2 = {
    version: 2,
    steps: ['attribute:acabado', 'attribute:size', 'design', 'quantity', 'summary'],
    attributes: [
      {
        id: 'acabado',
        label: 'Acabado',
        type: 'select',
        required: true,
        options: TARJETAS_ACABADO_OPTIONS.map((option) => ({ ...option })),
      },
      {
        id: 'size',
        label: 'Tamaño',
        type: 'select',
        required: true,
        options: orderedSizeIds.map((sizeId) => ({
          id: sizeId,
          label: TARJETAS_SIZE_LABELS[sizeId] || sizeId,
        })),
      },
    ],
    pricing: {
      mode: 'matrix',
      quantityInput: {
        min: Number.isFinite(minFrom) ? minFrom : 1,
        step: 1,
      },
      rules,
    },
    design,
    importMeta: {
      legacy: true,
      source: 'merge',
      mergedAt: new Date().toISOString(),
      mergedProductIds: products.map((product) => asString(product.id)).filter(Boolean),
    },
    legacySnapshot: products.map((product) => ({
      id: product.id,
      name: product.name,
      configurator: product.configurator,
    })),
  };

  const unifiedProduct: Record<string, unknown> = {
    ...first,
    id: 'cfg_tarjetas_presentacion_v2',
    name: 'Tarjetas de presentación',
    description:
      asString(first.description) ||
      'Tarjetas de presentación personalizadas',
    configurator: unifiedConfigurator,
  };

  return unifiedProduct;
}
