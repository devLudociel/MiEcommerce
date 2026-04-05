import type {
  AttributeStepId,
  ConfiguratorStepId,
  ConfiguratorV2,
  ConfiguratorV2StepId,
  DesignConfig,
  OptionDisplayType,
  OptionGroup,
  OptionValue,
  PlacementConfig,
  PricingTier,
  ProductConfigurator,
  ProductConfiguratorAttribute,
  ProductConfiguratorAttributeOption,
  ProductConfiguratorAttributeType,
  ProductConfiguratorConditionMap,
  ProductConfiguratorDefaultWhenRule,
  ProductConfiguratorImportMeta,
  ProductConfiguratorPriceResult,
  ProductConfiguratorPricing,
  ProductConfiguratorPricingMatrix,
  ProductConfiguratorPricingQuantityInput,
  ProductConfiguratorPricingSheetMatrix,
  ProductConfiguratorPricingRule,
  ProductConfiguratorSelection,
  ProductConfiguratorSheetPricingRule,
  QuantityConfig,
  SizeConfig,
  VariantConfig,
  VariantOption,
} from '../../types/configurator';

const DEFAULT_MIN_QUANTITY = 1;
const DEFAULT_STEP_QUANTITY = 1;

const DEFAULT_DESIGN: DesignConfig = {
  formats: ['PNG', 'PDF'],
  minDpi: 300,
  requireTransparentBg: false,
  designServicePrice: 0,
  designServiceLabel: 'Servicio de diseño',
};

export interface ConfiguratorValidationIssue {
  code:
    | 'INVALID_FORMAT'
    | 'DUPLICATE_ATTRIBUTE_ID'
    | 'DUPLICATE_OPTION_ID'
    | 'DUPLICATE_RULE_MATCH'
    | 'UNKNOWN_ATTRIBUTE_IN_RULE'
    | 'UNKNOWN_OPTION_IN_RULE'
    | 'UNKNOWN_ATTRIBUTE_IN_CONDITION'
    | 'UNKNOWN_OPTION_IN_CONDITION'
    | 'UNKNOWN_ATTRIBUTE_IN_STEP'
    | 'MISSING_TIERS'
    | 'INVALID_TIERS'
    | 'INVALID_QUANTITY_INPUT'
    | 'INVALID_UNITS_PER_SHEET';
  message: string;
  path?: string;
}

export interface ResolvedConditionalAttributeState {
  attributeId: string;
  visible: boolean;
  enabled: boolean;
  appliedDefault?: string;
}

export interface ConditionalAttributeResolutionResult {
  selection: ProductConfiguratorSelection;
  attributes: ResolvedConditionalAttributeState[];
}

export interface ConfiguratorValidationResult {
  valid: boolean;
  errors: ConfiguratorValidationIssue[];
  warnings: ConfiguratorValidationIssue[];
  normalized: ConfiguratorV2;
}

export interface ConvertTableToPricingMatrixOptions {
  quantityKey?: string;
  priceKey?: string;
  attributeKeys?: string[];
}

export interface PricingMatrixConversionResult {
  attributeKeys: string[];
  quantityInput: ProductConfiguratorPricingQuantityInput;
  rules: ProductConfiguratorPricingRule[];
  skippedRows: number;
}

export interface BuildConfigurableProductFromTableInput<
  TProductMeta extends Record<string, unknown> = Record<string, unknown>,
> {
  productMeta: TProductMeta;
  attributes: ProductConfiguratorAttribute[];
  rows: Array<Record<string, unknown>>;
  design: DesignConfig;
  placement?: PlacementConfig;
  steps?: ConfiguratorV2StepId[];
  quantityInput?: Partial<ProductConfiguratorPricingQuantityInput>;
  importMeta?: ProductConfiguratorImportMeta;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function deepClone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function asString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function asNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value.replace(',', '.'));
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

function toPositiveInt(value: unknown, fallback: number): number {
  const parsed = asNumber(value);
  if (parsed === null) return fallback;
  const intValue = Math.floor(parsed);
  return intValue > 0 ? intValue : fallback;
}

function toNonNegativeNumber(value: unknown, fallback: number): number {
  const parsed = asNumber(value);
  if (parsed === null) return fallback;
  return parsed >= 0 ? parsed : fallback;
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

function normalizeAcabadoId(value: string): string {
  const normalized = normalizeId(value, '');
  if (!normalized) return '';

  if (
    normalized === 'mate' ||
    normalized === 'matte' ||
    normalized.includes('mate')
  ) {
    return 'matte';
  }

  if (
    normalized.includes('barniz') && normalized.includes('uv')
  ) {
    return 'barniz_uv';
  }

  if (
    normalized.includes('brillo') ||
    normalized.includes('gloss')
  ) {
    return 'brillo';
  }

  return normalized;
}

function normalizeTarjetaSizeId(value: string): string | null {
  const normalized = normalizeId(value, '');
  if (!normalized) return null;

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

  return null;
}

function normalizeOptionIdForAttribute(attributeId: string, value: string): string {
  const attributeNormalized = normalizeId(attributeId, '');

  if (attributeNormalized === 'acabado') {
    return normalizeAcabadoId(value);
  }

  if (
    attributeNormalized === 'size' ||
    attributeNormalized.includes('tamano') ||
    attributeNormalized.includes('medida')
  ) {
    const tarjetaSize = normalizeTarjetaSizeId(value);
    if (tarjetaSize) return tarjetaSize;
  }

  return normalizeId(value, '');
}

function isKnownAcabadoOptionId(value: string): boolean {
  return value === 'matte' || value === 'brillo' || value === 'barniz_uv';
}

function inferAcabadoFromCandidates(values: string[]): boolean {
  return values.some((rawValue) => isKnownAcabadoOptionId(normalizeAcabadoId(rawValue)));
}

function normalizeAttributeType(value: unknown): ProductConfiguratorAttributeType {
  const type = asString(value).toLowerCase();
  if (type === 'color' || type === 'image' || type === 'text' || type === 'select') {
    return type;
  }
  return 'select';
}

function mapOptionTypeToAttributeType(type: OptionDisplayType): ProductConfiguratorAttributeType {
  return type === 'text' ? 'select' : type;
}

function mapAttributeTypeToOptionType(type: ProductConfiguratorAttributeType): OptionDisplayType {
  return type === 'select' ? 'text' : type;
}

function normalizeTierList(raw: unknown): PricingTier[] {
  if (!Array.isArray(raw)) return [];

  const byFrom = new Map<number, PricingTier>();

  for (let i = 0; i < raw.length; i += 1) {
    const entry = raw[i];
    if (!isRecord(entry)) continue;

    const from = toPositiveInt(entry.from, 0);
    const price = toNonNegativeNumber(entry.price, Number.NaN);

    if (from <= 0 || Number.isNaN(price)) continue;

    byFrom.set(from, {
      from,
      price,
      label: asString(entry.label) || undefined,
      recommended: entry.recommended === true ? true : undefined,
    });
  }

  return [...byFrom.values()].sort((a, b) => a.from - b.from);
}

function normalizeConditionMap(raw: unknown): ProductConfiguratorConditionMap | undefined {
  if (!isRecord(raw)) return undefined;

  const result: ProductConfiguratorConditionMap = {};

  for (const [attributeId, rawValues] of Object.entries(raw)) {
    const normalizedAttributeId = normalizeId(attributeId, '');
    if (!normalizedAttributeId) continue;

    const values = Array.isArray(rawValues) ? rawValues : [rawValues];
    const normalizedValues = values
      .map((value) => normalizeOptionIdForAttribute(normalizedAttributeId, asString(value)))
      .filter(Boolean);

    const uniqueValues = [...new Set(normalizedValues)];
    if (uniqueValues.length > 0) {
      result[normalizedAttributeId] = uniqueValues;
    }
  }

  return Object.keys(result).length > 0 ? result : undefined;
}

function normalizeDefaultWhenRules(
  raw: unknown,
  attributeId: string
): ProductConfiguratorDefaultWhenRule[] | undefined {
  if (!Array.isArray(raw)) return undefined;

  const normalizedRules: ProductConfiguratorDefaultWhenRule[] = [];

  for (const item of raw) {
    if (!isRecord(item)) continue;

    const when = normalizeConditionMap(item.when);
    const value = normalizeOptionIdForAttribute(attributeId, asString(item.value));
    if (!when || !value) continue;

    normalizedRules.push({ when, value });
  }

  return normalizedRules.length > 0 ? normalizedRules : undefined;
}

function normalizeDesign(raw: unknown): DesignConfig {
  if (!isRecord(raw)) return { ...DEFAULT_DESIGN };

  const formats = Array.isArray(raw.formats)
    ? raw.formats.map((item) => asString(item)).filter(Boolean)
    : DEFAULT_DESIGN.formats;

  return {
    formats: formats.length ? formats : DEFAULT_DESIGN.formats,
    minDpi: toPositiveInt(raw.minDpi, DEFAULT_DESIGN.minDpi),
    requireTransparentBg: raw.requireTransparentBg === true,
    designServicePrice: toNonNegativeNumber(raw.designServicePrice, DEFAULT_DESIGN.designServicePrice),
    designServiceLabel: asString(raw.designServiceLabel) || DEFAULT_DESIGN.designServiceLabel,
  };
}

function normalizeAttributeOptions(
  rawOptions: unknown,
  attributeType: ProductConfiguratorAttributeType,
  attributeId: string
): ProductConfiguratorAttributeOption[] {
  if (!Array.isArray(rawOptions)) return [];

  const options: ProductConfiguratorAttributeOption[] = [];

  for (let index = 0; index < rawOptions.length; index += 1) {
    const rawOption = rawOptions[index];
    if (!isRecord(rawOption)) continue;

    const label = asString(rawOption.label) || `Opcion ${index + 1}`;
    const normalizedOptionId = normalizeOptionIdForAttribute(attributeId, asString(rawOption.id) || label);
    const id = normalizedOptionId || `${attributeId}_${index + 1}`;

    const rawValue = asString(rawOption.value);
    let value: string | undefined;

    if (attributeType === 'color') {
      value = rawValue || '#000000';
    } else if (attributeType === 'image') {
      value = rawValue;
    } else if (attributeType === 'text') {
      value = rawValue || label;
    } else {
      value = rawValue || undefined;
    }

    const unitsPerSheet = toPositiveInt(rawOption.unitsPerSheet, 0);

    const rawSurcharge = typeof rawOption.surcharge === 'number' ? rawOption.surcharge : parseFloat(String(rawOption.surcharge ?? ''));
    const surcharge = rawSurcharge > 0 ? rawSurcharge : undefined;

    const rawSurchargeType = asString(rawOption.surchargeType);
    const surchargeType: 'per_unit' | 'fixed' | undefined =
      surcharge != null
        ? rawSurchargeType === 'fixed' ? 'fixed' : 'per_unit'
        : undefined;

    options.push({
      id,
      label,
      value,
      previewImage: asString(rawOption.previewImage) || undefined,
      unitsPerSheet: unitsPerSheet > 0 ? unitsPerSheet : undefined,
      surcharge,
      surchargeType,
    });
  }

  return options;
}

function inferVariantAttributeId(label: string, optionCandidates: string[] = []): string {
  const normalized = normalizeId(label, 'variant');
  if (
    normalized.includes('acabado') ||
    normalized.includes('finish') ||
    normalized.includes('terminacion')
  ) {
    return 'acabado';
  }
  if (inferAcabadoFromCandidates(optionCandidates)) {
    return 'acabado';
  }
  if (normalized.includes('color')) return 'color';
  if (normalized.includes('material')) return 'material';
  return normalized || 'variant';
}

function inferSizeAttributeId(label: string): string {
  const normalized = normalizeId(label, 'size');
  if (normalized.includes('talla') || normalized.includes('tamano') || normalized.includes('size')) {
    return 'size';
  }
  return normalized || 'size';
}

function optionGroupToAttribute(group: OptionGroup, index: number): ProductConfiguratorAttribute {
  const baseId = normalizeId(group.id || group.label, `attribute_${index + 1}`);
  const optionCandidates = group.values.flatMap((value) => [value.id, value.label].filter(Boolean));
  const inferredId = inferVariantAttributeId(group.label || group.id || baseId, optionCandidates);
  const id = inferredId === 'acabado' ? 'acabado' : baseId;
  const rawType = mapOptionTypeToAttributeType(group.type);
  const type = id === 'acabado' && rawType === 'color' ? 'select' : rawType;

  return {
    id,
    label: group.label || id,
    type,
    required: true,
    options: group.values.map((value, valueIndex) => ({
      id:
        normalizeOptionIdForAttribute(id, value.id || value.label) ||
        `${id}_${valueIndex + 1}`,
      label: value.label || value.id || `Opcion ${valueIndex + 1}`,
      value:
        value.value ||
        (type === 'color' ? '#000000' : undefined) ||
        (type === 'text' ? value.label || value.id : undefined),
      previewImage: value.previewImage || undefined,
      unitsPerSheet: value.unitsPerSheet,
    })),
  };
}

function variantToAttribute(variant: VariantConfig): ProductConfiguratorAttribute {
  const optionCandidates = variant.options.flatMap((option) => [option.id, option.label].filter(Boolean));
  const id = inferVariantAttributeId(variant.label || 'variant', optionCandidates);
  const rawType = mapOptionTypeToAttributeType(variant.type);
  // Acabado no debe modelarse como color aunque en legacy venga como "color".
  const type = id === 'acabado' && rawType === 'color' ? 'select' : rawType;

  return {
    id,
    label: variant.label || 'Variante',
    type,
    required: true,
    options: variant.options.map((option, index) => ({
      id:
        normalizeOptionIdForAttribute(id, option.id || option.label) ||
        `${id}_${index + 1}`,
      label: option.label || option.id || `Opcion ${index + 1}`,
      value:
        option.value ||
        (type === 'color' ? '#000000' : undefined) ||
        (type === 'text' ? option.label || option.id : undefined),
      previewImage: option.previewImage || undefined,
      unitsPerSheet: option.unitsPerSheet,
    })),
  };
}

function sizeToAttribute(size: SizeConfig): ProductConfiguratorAttribute {
  const id = inferSizeAttributeId(size.label || 'size');

  return {
    id,
    label: size.label || 'Talla',
    type: 'select',
    required: true,
    options: size.options.map((option, index) => ({
      id: normalizeOptionIdForAttribute(id, option) || `${id}_${index + 1}`,
      label: option,
      unitsPerSheet: size.unitsPerSheet?.[option],
    })),
  };
}

function buildOptionLookup(attributes: ProductConfiguratorAttribute[]): Map<string, string[]> {
  const lookup = new Map<string, string[]>();

  for (const attribute of attributes) {
    for (const option of attribute.options) {
      const current = lookup.get(option.id) ?? [];
      current.push(attribute.id);
      lookup.set(option.id, current);
    }
  }

  return lookup;
}

function buildMatchFromLegacyCombinationKey(
  key: string,
  attributes: ProductConfiguratorAttribute[]
): Record<string, string> {
  const values = key
    .split('+')
    .map((entry) => normalizeId(entry.trim(), ''))
    .filter(Boolean);

  if (!values.length) return {};

  const lookup = buildOptionLookup(attributes);
  const match: Record<string, string> = {};
  const usedAttributes = new Set<string>();

  for (let i = 0; i < values.length; i += 1) {
    const value = values[i];
    const candidates = lookup.get(value) ?? [];

    let attributeId = candidates.find((candidate) => !usedAttributes.has(candidate));

    if (!attributeId) {
      const fallbackAttribute = attributes[i];
      if (fallbackAttribute && !usedAttributes.has(fallbackAttribute.id)) {
        attributeId = fallbackAttribute.id;
      }
    }

    if (!attributeId) continue;

    match[attributeId] = normalizeOptionIdForAttribute(attributeId, value) || value;
    usedAttributes.add(attributeId);
  }

  return match;
}

function normalizePricingFromLegacy(
  quantityRaw: Record<string, unknown>,
  attributes: ProductConfiguratorAttribute[],
  variantAttributeId: string | null,
  sizeAttributeId: string | null
): ProductConfiguratorPricing {
  const min = toPositiveInt(quantityRaw.min, DEFAULT_MIN_QUANTITY);
  const step = toPositiveInt(quantityRaw.step, DEFAULT_STEP_QUANTITY);
  const sheetBased = quantityRaw.sheetBased === true ? true : undefined;
  const quantityLabel = asString(quantityRaw.label) || undefined;

  const legacySimpleTiers = normalizeTierList(quantityRaw.tiers);

  const rules: ProductConfiguratorPricingRule[] = [];

  if (isRecord(quantityRaw.variantPricing) && variantAttributeId) {
    for (const [variantId, tiers] of Object.entries(quantityRaw.variantPricing)) {
      const normalizedTiers = normalizeTierList(tiers);
      if (normalizedTiers.length === 0) continue;
      const normalizedVariantId = normalizeOptionIdForAttribute(variantAttributeId, variantId);
      if (!normalizedVariantId) continue;
      rules.push({
        match: { [variantAttributeId]: normalizedVariantId },
        tiers: normalizedTiers,
      });
    }
  }

  if (isRecord(quantityRaw.sizePricing) && sizeAttributeId) {
    for (const [sizeId, tiers] of Object.entries(quantityRaw.sizePricing)) {
      const normalizedTiers = normalizeTierList(tiers);
      if (normalizedTiers.length === 0) continue;
      const normalizedSizeId = normalizeOptionIdForAttribute(sizeAttributeId, sizeId);
      if (!normalizedSizeId) continue;
      rules.push({
        match: { [sizeAttributeId]: normalizedSizeId },
        tiers: normalizedTiers,
      });
    }
  }

  if (isRecord(quantityRaw.combinationPricing)) {
    for (const [key, tiers] of Object.entries(quantityRaw.combinationPricing)) {
      const normalizedTiers = normalizeTierList(tiers);
      if (normalizedTiers.length === 0) continue;

      const match = buildMatchFromLegacyCombinationKey(key, attributes);
      if (Object.keys(match).length === 0) continue;

      rules.push({ match, tiers: normalizedTiers });
    }
  }

  if (rules.length === 0) {
    const simpleTiers = legacySimpleTiers.length
      ? legacySimpleTiers
      : [{ from: min, price: 0 }];

    return {
      mode: 'simple',
      quantityInput: { min, step, label: quantityLabel, sheetBased },
      tiers: simpleTiers,
    };
  }

  return {
    mode: 'matrix',
    quantityInput: { min, step, label: quantityLabel, sheetBased },
    rules,
  };
}

function normalizePricingFromV2(
  rawPricing: Record<string, unknown>,
  rawQuantity: Record<string, unknown> | null
): ProductConfiguratorPricing {
  const rawQuantityInput = isRecord(rawPricing.quantityInput) ? rawPricing.quantityInput : {};

  const min = toPositiveInt(
    rawQuantityInput.min ?? rawQuantity?.min,
    DEFAULT_MIN_QUANTITY
  );
  const step = toPositiveInt(
    rawQuantityInput.step ?? rawQuantity?.step,
    DEFAULT_STEP_QUANTITY
  );
  const sheetBased =
    rawQuantityInput.sheetBased === true || rawQuantity?.sheetBased === true
      ? true
      : undefined;
  const quantityLabel = asString(rawQuantityInput.label ?? rawQuantity?.label) || undefined;

  const normalizedMode = asString(rawPricing.mode).toLowerCase();
  const mode: ProductConfiguratorPricing['mode'] =
    normalizedMode === 'matrix'
      ? 'matrix'
      : normalizedMode === 'sheet-matrix'
        ? 'sheet-matrix'
        : 'simple';

  if (mode === 'simple') {
    const tiers = normalizeTierList(rawPricing.tiers ?? rawQuantity?.tiers);
    return {
      mode: 'simple',
      quantityInput: { min, step, label: quantityLabel, sheetBased },
      tiers: tiers.length ? tiers : [{ from: min, price: 0 }],
    };
  }

  if (mode === 'sheet-matrix') {
    const rulesRaw = Array.isArray(rawPricing.rules) ? rawPricing.rules : [];
    const rules: ProductConfiguratorSheetPricingRule[] = [];

    for (const rawRule of rulesRaw) {
      if (!isRecord(rawRule)) continue;

      const rawMatch = isRecord(rawRule.match) ? rawRule.match : {};
      const match: Record<string, string> = {};

      for (const [attributeId, optionId] of Object.entries(rawMatch)) {
        const normalizedAttributeId = normalizeId(attributeId, '');
        const normalizedOptionId = normalizeOptionIdForAttribute(
          normalizedAttributeId,
          asString(optionId)
        );
        if (!normalizedAttributeId || !normalizedOptionId) continue;
        match[normalizedAttributeId] = normalizedOptionId;
      }

      const unitsPerSheet = toPositiveInt(rawRule.unitsPerSheet, 0);
      const sheetPricingTiers = normalizeTierList(rawRule.sheetPricingTiers ?? rawRule.tiers);

      if (
        Object.keys(match).length === 0 ||
        unitsPerSheet <= 0 ||
        sheetPricingTiers.length === 0
      ) {
        continue;
      }

      rules.push({
        match,
        unitsPerSheet,
        sheetPricingTiers,
      });
    }

    return {
      mode: 'sheet-matrix',
      quantityInput: { min, step, label: quantityLabel, sheetBased },
      rules,
    };
  }

  const rulesRaw = Array.isArray(rawPricing.rules) ? rawPricing.rules : [];
  const rules: ProductConfiguratorPricingRule[] = [];

  for (const rawRule of rulesRaw) {
    if (!isRecord(rawRule)) continue;

    const rawMatch = isRecord(rawRule.match) ? rawRule.match : {};
    const match: Record<string, string> = {};

    for (const [attributeId, optionId] of Object.entries(rawMatch)) {
      const normalizedAttributeId = normalizeId(attributeId, '');
      const normalizedOptionId = normalizeOptionIdForAttribute(
        normalizedAttributeId,
        asString(optionId)
      );
      if (!normalizedAttributeId || !normalizedOptionId) continue;
      match[normalizedAttributeId] = normalizedOptionId;
    }

    const tiers = normalizeTierList(rawRule.tiers);
    if (Object.keys(match).length === 0 || tiers.length === 0) continue;

    rules.push({ match, tiers });
  }

  return {
    mode: 'matrix',
    quantityInput: { min, step, label: quantityLabel, sheetBased },
    rules,
  };
}

function normalizeLegacyStepsToV2(
  steps: unknown,
  variantAttributeId: string | null,
  sizeAttributeId: string | null,
  attributes: ProductConfiguratorAttribute[],
  hasPlacement: boolean
): ConfiguratorV2StepId[] {
  const result: ConfiguratorV2StepId[] = [];

  if (Array.isArray(steps)) {
    for (const entry of steps) {
      const step = asString(entry);
      if (!step) continue;

      if (step === 'variant' && variantAttributeId) {
        result.push(`attribute:${variantAttributeId}` as AttributeStepId);
        continue;
      }

      if (step === 'size' && sizeAttributeId) {
        result.push(`attribute:${sizeAttributeId}` as AttributeStepId);
        continue;
      }

      if (step.startsWith('option:')) {
        const attributeId = normalizeId(step.slice(7), '');
        if (attributeId) result.push(`attribute:${attributeId}` as AttributeStepId);
        continue;
      }

      if (step.startsWith('attribute:')) {
        const attributeId = normalizeId(step.slice(10), '');
        if (attributeId) result.push(`attribute:${attributeId}` as AttributeStepId);
        continue;
      }

      if (step === 'design' || step === 'placement' || step === 'quantity' || step === 'summary') {
        result.push(step);
      }
    }
  }

  for (const attribute of attributes) {
    const step = `attribute:${attribute.id}` as AttributeStepId;
    if (!result.includes(step)) {
      result.unshift(step);
    }
  }

  if (!result.includes('design')) result.push('design');
  if (hasPlacement && !result.includes('placement')) result.push('placement');
  if (!result.includes('quantity')) result.push('quantity');
  if (!result.includes('summary')) result.push('summary');

  return result;
}

function normalizeV2Steps(
  steps: unknown,
  attributes: ProductConfiguratorAttribute[],
  hasPlacement: boolean
): ConfiguratorV2StepId[] {
  const result: ConfiguratorV2StepId[] = [];

  if (Array.isArray(steps)) {
    for (const entry of steps) {
      const step = asString(entry);
      if (!step) continue;

      if (step.startsWith('attribute:')) {
        const attributeId = normalizeId(step.slice(10), '');
        if (attributeId) result.push(`attribute:${attributeId}` as AttributeStepId);
        continue;
      }

      if (step.startsWith('option:')) {
        const attributeId = normalizeId(step.slice(7), '');
        if (attributeId) result.push(`attribute:${attributeId}` as AttributeStepId);
        continue;
      }

      if (step === 'variant') {
        const candidate = attributes.find(
          (attr) =>
            attr.id === 'variant' ||
            attr.id === 'acabado' ||
            attr.id === 'color' ||
            attr.id === 'material'
        );
        if (candidate) result.push(`attribute:${candidate.id}` as AttributeStepId);
        continue;
      }

      if (step === 'size') {
        const candidate = attributes.find((attr) => attr.id === 'size');
        if (candidate) result.push(`attribute:${candidate.id}` as AttributeStepId);
        continue;
      }

      if (step === 'design' || step === 'placement' || step === 'quantity' || step === 'summary') {
        result.push(step);
      }
    }
  }

  for (const attribute of attributes) {
    const attributeStep = `attribute:${attribute.id}` as AttributeStepId;
    if (!result.includes(attributeStep)) {
      result.unshift(attributeStep);
    }
  }

  if (!result.includes('design')) result.push('design');
  if (hasPlacement && !result.includes('placement')) result.push('placement');
  if (!result.includes('quantity')) result.push('quantity');
  if (!result.includes('summary')) result.push('summary');

  return result;
}

function toConfiguratorV2Internal(
  input: unknown,
  options: { preserveLegacySnapshot?: boolean; forceLegacyMeta?: boolean } = {}
): ConfiguratorV2 {
  const raw = isRecord(input) && isRecord(input.configurator) ? input.configurator : input;

  if (!isRecord(raw)) {
    throw new Error('Configurador invalido: se esperaba un objeto');
  }

  const looksLikeV2 =
    toPositiveInt(raw.version, 0) === 2 ||
    Array.isArray(raw.attributes) ||
    isRecord(raw.pricing);

  if (looksLikeV2) {
    let attributes: ProductConfiguratorAttribute[] = [];

    if (Array.isArray(raw.attributes)) {
      attributes = raw.attributes
        .filter((item): item is Record<string, unknown> => isRecord(item))
        .map((item, index) => {
          const label = asString(item.label) || `Atributo ${index + 1}`;
          const id = normalizeId(asString(item.id) || label, `attribute_${index + 1}`);
          const type = normalizeAttributeType(item.type);

          return {
            id,
            label,
            type,
            required: item.required !== false,
            options: normalizeAttributeOptions(item.options, type, id),
            visibleWhen: normalizeConditionMap(item.visibleWhen),
            enabledWhen: normalizeConditionMap(item.enabledWhen),
            defaultWhen: normalizeDefaultWhenRules(item.defaultWhen, id),
            defaultOptionResolver: asString(item.defaultOptionResolver) || undefined,
          };
        });
    }

    if (!attributes.length && Array.isArray(raw.options)) {
      attributes = raw.options
        .filter((item): item is OptionGroup => isRecord(item))
        .map((group, index) => optionGroupToAttribute(group, index));
    }

    if (!attributes.length && isRecord(raw.variant)) {
      attributes.push(variantToAttribute(raw.variant as VariantConfig));
    }

    if (!attributes.length && isRecord(raw.size)) {
      attributes.push(sizeToAttribute(raw.size as SizeConfig));
    }

    const rawQuantity = isRecord(raw.quantity) ? raw.quantity : null;

    const pricing = isRecord(raw.pricing)
      ? normalizePricingFromV2(raw.pricing, rawQuantity)
      : normalizePricingFromLegacy(rawQuantity ?? {}, attributes, null, null);

    const placement = isRecord(raw.placement) ? (raw.placement as PlacementConfig) : undefined;

    const importMeta = isRecord(raw.importMeta)
      ? ({ ...raw.importMeta } as ProductConfiguratorImportMeta)
      : undefined;

    if (options.forceLegacyMeta) {
      const now = new Date().toISOString();
      const merged = importMeta ? { ...importMeta } : {};
      merged.legacy = true;
      if (!merged.migratedAt) merged.migratedAt = now;
      return {
        version: 2,
        steps: normalizeV2Steps(raw.steps, attributes, !!placement),
        attributes,
        pricing,
        design: normalizeDesign(raw.design),
        placement,
        importMeta: merged,
        legacySnapshot: options.preserveLegacySnapshot ? deepClone(raw) : raw.legacySnapshot,
      };
    }

    return {
      version: 2,
      steps: normalizeV2Steps(raw.steps, attributes, !!placement),
      attributes,
      pricing,
      design: normalizeDesign(raw.design),
      placement,
      importMeta,
      legacySnapshot: options.preserveLegacySnapshot ? deepClone(raw) : raw.legacySnapshot,
    };
  }

  const optionsGroups = Array.isArray(raw.options)
    ? raw.options.filter((item): item is OptionGroup => isRecord(item))
    : [];

  const attributes: ProductConfiguratorAttribute[] = optionsGroups.map((group, index) =>
    optionGroupToAttribute(group, index)
  );

  let variantAttributeId: string | null = null;
  if (isRecord(raw.variant)) {
    const variantAttribute = variantToAttribute(raw.variant as VariantConfig);
    if (!attributes.some((attribute) => attribute.id === variantAttribute.id)) {
      attributes.push(variantAttribute);
    }
    variantAttributeId = variantAttribute.id;
  }

  let sizeAttributeId: string | null = null;
  if (isRecord(raw.size)) {
    const sizeAttribute = sizeToAttribute(raw.size as SizeConfig);
    if (!attributes.some((attribute) => attribute.id === sizeAttribute.id)) {
      attributes.push(sizeAttribute);
    }
    sizeAttributeId = sizeAttribute.id;
  }

  if (!variantAttributeId) {
    const candidate = attributes.find(
      (attribute) =>
        attribute.id === 'variant' ||
        attribute.id === 'acabado' ||
        attribute.id === 'color' ||
        attribute.id === 'material'
    );
    variantAttributeId = candidate?.id ?? null;
  }

  if (!sizeAttributeId) {
    const candidate = attributes.find((attribute) => attribute.id === 'size');
    sizeAttributeId = candidate?.id ?? null;
  }

  const rawQuantity = isRecord(raw.quantity) ? raw.quantity : {};

  const pricing = normalizePricingFromLegacy(
    rawQuantity,
    attributes,
    variantAttributeId,
    sizeAttributeId
  );

  const placement = isRecord(raw.placement) ? (raw.placement as PlacementConfig) : undefined;

  const importMeta = isRecord(raw.importMeta)
    ? ({ ...raw.importMeta } as ProductConfiguratorImportMeta)
    : {};

  const now = new Date().toISOString();
  importMeta.legacy = true;
  if (!importMeta.migratedAt) importMeta.migratedAt = now;

  return {
    version: 2,
    steps: normalizeLegacyStepsToV2(raw.steps, variantAttributeId, sizeAttributeId, attributes, !!placement),
    attributes,
    pricing,
    design: normalizeDesign(raw.design),
    placement,
    importMeta,
    legacySnapshot: options.preserveLegacySnapshot ? deepClone(raw) : raw,
  };
}

function buildAttributeOptionMap(
  attributes: ProductConfiguratorAttribute[]
): Map<string, Set<string>> {
  const attributeMap = new Map<string, Set<string>>();

  for (const attribute of attributes) {
    attributeMap.set(
      attribute.id,
      new Set(attribute.options.map((option) => option.id))
    );
  }

  return attributeMap;
}

function validateConditionMapAgainstAttributes(
  condition: ProductConfiguratorConditionMap | undefined,
  attributeMap: Map<string, Set<string>>,
  path: string,
  errors: ConfiguratorValidationIssue[]
): void {
  if (!condition) return;

  for (const [attributeId, optionIds] of Object.entries(condition)) {
    if (!attributeMap.has(attributeId)) {
      errors.push({
        code: 'UNKNOWN_ATTRIBUTE_IN_CONDITION',
        message: `La condicion usa atributo no definido: ${attributeId}`,
        path: `${path}.${attributeId}`,
      });
      continue;
    }

    const validOptions = attributeMap.get(attributeId);
    for (const optionId of optionIds) {
      if (validOptions && !validOptions.has(optionId)) {
        errors.push({
          code: 'UNKNOWN_OPTION_IN_CONDITION',
          message: `La condicion usa opcion inexistente (${optionId}) para atributo ${attributeId}`,
          path: `${path}.${attributeId}`,
        });
      }
    }
  }
}

function canonicalMatch(match: Record<string, string>): string {
  return Object.keys(match)
    .sort()
    .map((key) => `${key}=${match[key]}`)
    .join('|');
}

function sortAndValidatePricing(
  config: ConfiguratorV2,
  errors: ConfiguratorValidationIssue[]
): ConfiguratorV2 {
  const normalized = deepClone(config);
  const min = toPositiveInt(normalized.pricing.quantityInput.min, DEFAULT_MIN_QUANTITY);
  const step = toPositiveInt(normalized.pricing.quantityInput.step, DEFAULT_STEP_QUANTITY);

  normalized.pricing.quantityInput.min = min;
  normalized.pricing.quantityInput.step = step;
  if (normalized.pricing.quantityInput.label) {
    normalized.pricing.quantityInput.label = asString(normalized.pricing.quantityInput.label);
  }

  const attributeMap = buildAttributeOptionMap(normalized.attributes);

  for (let attributeIndex = 0; attributeIndex < normalized.attributes.length; attributeIndex += 1) {
    const attribute = normalized.attributes[attributeIndex];
    validateConditionMapAgainstAttributes(
      attribute.visibleWhen,
      attributeMap,
      `attributes[${attributeIndex}].visibleWhen`,
      errors
    );
    validateConditionMapAgainstAttributes(
      attribute.enabledWhen,
      attributeMap,
      `attributes[${attributeIndex}].enabledWhen`,
      errors
    );

    if (Array.isArray(attribute.defaultWhen)) {
      for (let defaultIndex = 0; defaultIndex < attribute.defaultWhen.length; defaultIndex += 1) {
        const defaultRule = attribute.defaultWhen[defaultIndex];
        validateConditionMapAgainstAttributes(
          defaultRule.when,
          attributeMap,
          `attributes[${attributeIndex}].defaultWhen[${defaultIndex}].when`,
          errors
        );

        const validCurrentOptions = attributeMap.get(attribute.id);
        if (validCurrentOptions && !validCurrentOptions.has(defaultRule.value)) {
          errors.push({
            code: 'UNKNOWN_OPTION_IN_CONDITION',
            message: `defaultWhen usa opcion inexistente (${defaultRule.value}) para atributo ${attribute.id}`,
            path: `attributes[${attributeIndex}].defaultWhen[${defaultIndex}].value`,
          });
        }
      }
    }
  }

  if (normalized.pricing.mode === 'simple') {
    normalized.pricing.tiers = normalizeTierList(normalized.pricing.tiers);

    if (normalized.pricing.tiers.length === 0) {
      errors.push({
        code: 'MISSING_TIERS',
        message: 'El pricing simple debe incluir al menos un tier',
        path: 'pricing.tiers',
      });
      normalized.pricing.tiers = [{ from: min, price: 0 }];
    }

    const firstFrom = normalized.pricing.tiers[0]?.from ?? Number.MAX_SAFE_INTEGER;
    if (firstFrom > min) {
      errors.push({
        code: 'INVALID_QUANTITY_INPUT',
        message: `quantityInput.min (${min}) no esta cubierto por pricing.tiers`,
        path: 'pricing.quantityInput.min',
      });
    }

    return normalized;
  }

  const seenRuleKeys = new Set<string>();

  if (normalized.pricing.mode === 'matrix') {
    normalized.pricing.rules = normalized.pricing.rules.map((rule, index) => {
      const tiers = normalizeTierList(rule.tiers);
      if (tiers.length === 0) {
        errors.push({
          code: 'MISSING_TIERS',
          message: `La regla ${index + 1} no tiene tiers validos`,
          path: `pricing.rules[${index}].tiers`,
        });
      }

      const canonical = canonicalMatch(rule.match);
      if (!canonical) {
        errors.push({
          code: 'INVALID_FORMAT',
          message: `La regla ${index + 1} debe incluir al menos un campo en match`,
          path: `pricing.rules[${index}].match`,
        });
      } else if (seenRuleKeys.has(canonical)) {
        errors.push({
          code: 'DUPLICATE_RULE_MATCH',
          message: `Regla duplicada para match: ${canonical}`,
          path: `pricing.rules[${index}].match`,
        });
      } else {
        seenRuleKeys.add(canonical);
      }

      for (const [attributeId, optionId] of Object.entries(rule.match)) {
        if (!attributeMap.has(attributeId)) {
          errors.push({
            code: 'UNKNOWN_ATTRIBUTE_IN_RULE',
            message: `La regla usa atributo no definido: ${attributeId}`,
            path: `pricing.rules[${index}].match.${attributeId}`,
          });
          continue;
        }

        const options = attributeMap.get(attributeId);
        if (options && !options.has(optionId)) {
          errors.push({
            code: 'UNKNOWN_OPTION_IN_RULE',
            message: `La regla usa opcion inexistente (${optionId}) para atributo ${attributeId}`,
            path: `pricing.rules[${index}].match.${attributeId}`,
          });
        }
      }

      const firstFrom = tiers[0]?.from ?? Number.MAX_SAFE_INTEGER;
      if (firstFrom > min) {
        errors.push({
          code: 'INVALID_QUANTITY_INPUT',
          message: `quantityInput.min (${min}) no esta cubierto por la regla ${index + 1}`,
          path: `pricing.rules[${index}].tiers`,
        });
      }

      return {
        match: { ...rule.match },
        tiers: tiers.length ? tiers : [{ from: min, price: 0 }],
      };
    });
  } else {
    normalized.pricing.rules = normalized.pricing.rules.map((rule, index) => {
      const canonical = canonicalMatch(rule.match);
      if (!canonical) {
        errors.push({
          code: 'INVALID_FORMAT',
          message: `La regla ${index + 1} debe incluir al menos un campo en match`,
          path: `pricing.rules[${index}].match`,
        });
      } else if (seenRuleKeys.has(canonical)) {
        errors.push({
          code: 'DUPLICATE_RULE_MATCH',
          message: `Regla duplicada para match: ${canonical}`,
          path: `pricing.rules[${index}].match`,
        });
      } else {
        seenRuleKeys.add(canonical);
      }

      for (const [attributeId, optionId] of Object.entries(rule.match)) {
        if (!attributeMap.has(attributeId)) {
          errors.push({
            code: 'UNKNOWN_ATTRIBUTE_IN_RULE',
            message: `La regla usa atributo no definido: ${attributeId}`,
            path: `pricing.rules[${index}].match.${attributeId}`,
          });
          continue;
        }

        const options = attributeMap.get(attributeId);
        if (options && !options.has(optionId)) {
          errors.push({
            code: 'UNKNOWN_OPTION_IN_RULE',
            message: `La regla usa opcion inexistente (${optionId}) para atributo ${attributeId}`,
            path: `pricing.rules[${index}].match.${attributeId}`,
          });
        }
      }

      const unitsPerSheet = toPositiveInt(rule.unitsPerSheet, 0);
      if (unitsPerSheet <= 0) {
        errors.push({
          code: 'INVALID_UNITS_PER_SHEET',
          message: `La regla ${index + 1} debe definir unitsPerSheet > 0`,
          path: `pricing.rules[${index}].unitsPerSheet`,
        });
      }

      const sheetPricingTiers = normalizeTierList(rule.sheetPricingTiers);
      if (sheetPricingTiers.length === 0) {
        errors.push({
          code: 'MISSING_TIERS',
          message: `La regla ${index + 1} no tiene sheetPricingTiers validos`,
          path: `pricing.rules[${index}].sheetPricingTiers`,
        });
      }

      const firstFrom = sheetPricingTiers[0]?.from ?? Number.MAX_SAFE_INTEGER;
      if (firstFrom > 1) {
        errors.push({
          code: 'INVALID_QUANTITY_INPUT',
          message: `La regla ${index + 1} debe cubrir desde al menos 1 hoja`,
          path: `pricing.rules[${index}].sheetPricingTiers`,
        });
      }

      return {
        match: { ...rule.match },
        unitsPerSheet: unitsPerSheet > 0 ? unitsPerSheet : 1,
        sheetPricingTiers:
          sheetPricingTiers.length > 0 ? sheetPricingTiers : [{ from: 1, price: 0 }],
      };
    });
  }

  if (normalized.pricing.rules.length === 0) {
    errors.push({
      code: 'MISSING_TIERS',
      message:
        normalized.pricing.mode === 'sheet-matrix'
          ? 'El pricing sheet-matrix debe incluir al menos una regla'
          : 'El pricing matrix debe incluir al menos una regla',
      path: 'pricing.rules',
    });
  }

  return normalized;
}

export function validateConfigurator(input: unknown): ConfiguratorValidationResult {
  const errors: ConfiguratorValidationIssue[] = [];
  const warnings: ConfiguratorValidationIssue[] = [];

  let v2: ConfiguratorV2;

  try {
    v2 = toConfiguratorV2Internal(input);
  } catch (error) {
    errors.push({
      code: 'INVALID_FORMAT',
      message: error instanceof Error ? error.message : 'Formato de configurador invalido',
      path: 'configurator',
    });

    v2 = {
      version: 2,
      steps: ['design', 'quantity', 'summary'],
      attributes: [],
      pricing: {
        mode: 'simple',
        quantityInput: { min: DEFAULT_MIN_QUANTITY, step: DEFAULT_STEP_QUANTITY },
        tiers: [{ from: DEFAULT_MIN_QUANTITY, price: 0 }],
      },
      design: { ...DEFAULT_DESIGN },
      importMeta: { legacy: false },
    };

    return {
      valid: false,
      errors,
      warnings,
      normalized: v2,
    };
  }

  const normalized = deepClone(v2);

  const seenAttributes = new Set<string>();

  normalized.attributes = normalized.attributes.map((attribute, index) => {
    const id = normalizeId(attribute.id || attribute.label, `attribute_${index + 1}`);

    if (seenAttributes.has(id)) {
      errors.push({
        code: 'DUPLICATE_ATTRIBUTE_ID',
        message: `Atributo duplicado: ${id}`,
        path: `attributes[${index}].id`,
      });
    }
    seenAttributes.add(id);

    const type = normalizeAttributeType(attribute.type);

    const options = normalizeAttributeOptions(attribute.options, type, id);
    if (options.length === 0) {
      errors.push({
        code: 'INVALID_FORMAT',
        message: `El atributo ${id} debe tener al menos una opcion`,
        path: `attributes[${index}].options`,
      });
    }
    const optionSeen = new Set<string>();

    for (let optionIndex = 0; optionIndex < options.length; optionIndex += 1) {
      const option = options[optionIndex];
      if (optionSeen.has(option.id)) {
        errors.push({
          code: 'DUPLICATE_OPTION_ID',
          message: `Opcion duplicada (${option.id}) en atributo ${id}`,
          path: `attributes[${index}].options[${optionIndex}].id`,
        });
      }
      optionSeen.add(option.id);
    }

    return {
      id,
      label: attribute.label || id,
      type,
      required: attribute.required !== false,
      options,
      visibleWhen: normalizeConditionMap(attribute.visibleWhen),
      enabledWhen: normalizeConditionMap(attribute.enabledWhen),
      defaultWhen: normalizeDefaultWhenRules(attribute.defaultWhen, id),
      defaultOptionResolver: asString(attribute.defaultOptionResolver) || undefined,
    };
  });

  const attributeIds = new Set(normalized.attributes.map((attribute) => attribute.id));

  normalized.steps = normalizeV2Steps(normalized.steps, normalized.attributes, !!normalized.placement);
  for (const step of normalized.steps) {
    if (!step.startsWith('attribute:')) continue;
    const attributeId = step.slice(10);
    if (!attributeIds.has(attributeId)) {
      errors.push({
        code: 'UNKNOWN_ATTRIBUTE_IN_STEP',
        message: `El paso referencia un atributo inexistente: ${attributeId}`,
        path: 'steps',
      });
    }
  }

  const sortedConfig = sortAndValidatePricing(normalized, errors);

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    normalized: sortedConfig,
  };
}

function attributeToOptionGroup(attribute: ProductConfiguratorAttribute): OptionGroup {
  return {
    id: attribute.id,
    label: attribute.label,
    type: mapAttributeTypeToOptionType(attribute.type),
    values: attribute.options.map((option): OptionValue => ({
      id: option.id,
      label: option.label,
      value:
        option.value ||
        (attribute.type === 'text' || attribute.type === 'select' ? option.label : '') ||
        (attribute.type === 'color' ? '#000000' : ''),
      previewImage: option.previewImage,
      unitsPerSheet: option.unitsPerSheet,
    })),
  };
}

function buildCombinationPricingFromRules(
  rules: ProductConfiguratorPricingRule[],
  attributes: ProductConfiguratorAttribute[]
): Record<string, PricingTier[]> {
  const attributeOrder = attributes.map((attribute) => attribute.id);
  const combinationPricing: Record<string, PricingTier[]> = {};

  for (const rule of rules) {
    const orderedKeys = attributeOrder.filter((attributeId) => attributeId in rule.match);
    if (!orderedKeys.length) continue;

    const key = orderedKeys.map((attributeId) => rule.match[attributeId]).join('+');
    if (!key) continue;

    combinationPricing[key] = deepClone(rule.tiers);

    if (orderedKeys.length === 1) {
      const singleValue = rule.match[orderedKeys[0]];
      if (singleValue) {
        combinationPricing[singleValue] = deepClone(rule.tiers);
      }
    }
  }

  return combinationPricing;
}

function buildCombinationPricingFromSheetRules(
  rules: ProductConfiguratorSheetPricingRule[],
  attributes: ProductConfiguratorAttribute[]
): Record<string, PricingTier[]> {
  const attributeOrder = attributes.map((attribute) => attribute.id);
  const combinationPricing: Record<string, PricingTier[]> = {};

  for (const rule of rules) {
    const orderedKeys = attributeOrder.filter((attributeId) => attributeId in rule.match);
    if (!orderedKeys.length) continue;

    const key = orderedKeys.map((attributeId) => rule.match[attributeId]).join('+');
    if (!key) continue;

    combinationPricing[key] = deepClone(rule.sheetPricingTiers);
  }

  return combinationPricing;
}

function findSizeAttribute(attributes: ProductConfiguratorAttribute[]): ProductConfiguratorAttribute | undefined {
  return attributes.find(
    (attribute) =>
      attribute.id === 'size' ||
      /size|talla|tamano/.test(normalizeId(attribute.label, attribute.id))
  );
}

function findVariantAttribute(attributes: ProductConfiguratorAttribute[]): ProductConfiguratorAttribute | undefined {
  const sizeAttribute = findSizeAttribute(attributes);

  const preferred = attributes.find(
    (attribute) =>
      attribute.id === 'variant' ||
      attribute.id === 'acabado' ||
      attribute.id === 'color' ||
      attribute.id === 'material'
  );
  if (preferred && preferred !== sizeAttribute) return preferred;

  return attributes.find((attribute) => attribute !== sizeAttribute);
}

function buildLegacyVariant(attribute: ProductConfiguratorAttribute | undefined): VariantConfig | undefined {
  if (!attribute) return undefined;

  const type = mapAttributeTypeToOptionType(attribute.type);

  const options: VariantOption[] = attribute.options.map((option) => ({
    id: option.id,
    label: option.label,
    value:
      option.value ||
      (type === 'text' ? option.label : '') ||
      (type === 'color' ? '#000000' : ''),
    previewImage: option.previewImage,
    unitsPerSheet: option.unitsPerSheet,
  }));

  return {
    label: attribute.label,
    type,
    options,
  };
}

function buildLegacySize(attribute: ProductConfiguratorAttribute | undefined): SizeConfig | undefined {
  if (!attribute) return undefined;

  const unitsPerSheet: Record<string, number> = {};

  for (const option of attribute.options) {
    if (option.unitsPerSheet && option.unitsPerSheet > 0) {
      unitsPerSheet[option.label] = option.unitsPerSheet;
    }
  }

  return {
    label: attribute.label,
    options: attribute.options.map((option) => option.label),
    unitsPerSheet: Object.keys(unitsPerSheet).length ? unitsPerSheet : undefined,
  };
}

function buildCompatibilityQuantityWithAttributeOrder(
  pricing: ProductConfiguratorPricing,
  attributes: ProductConfiguratorAttribute[]
): QuantityConfig {
  if (pricing.mode === 'simple') {
    return {
      min: pricing.quantityInput.min,
      step: pricing.quantityInput.step,
      sheetBased: pricing.quantityInput.sheetBased,
      tiers: deepClone(pricing.tiers),
    };
  }

  if (pricing.mode === 'sheet-matrix') {
    const tiers =
      pricing.rules[0]?.sheetPricingTiers
        ? deepClone(pricing.rules[0].sheetPricingTiers)
        : [{ from: 1, price: 0 }];

    return {
      min: pricing.quantityInput.min,
      step: pricing.quantityInput.step,
      sheetBased: false,
      tiers,
      combinationPricing: buildCombinationPricingFromSheetRules(pricing.rules, attributes),
    };
  }

  const tiers =
    pricing.rules[0]?.tiers
      ? deepClone(pricing.rules[0].tiers)
      : [{ from: pricing.quantityInput.min, price: 0 }];

  return {
    min: pricing.quantityInput.min,
    step: pricing.quantityInput.step,
    sheetBased: pricing.quantityInput.sheetBased,
    tiers,
    combinationPricing: buildCombinationPricingFromRules(pricing.rules, attributes),
  };
}

function mapV2StepsToCompatibility(steps: ConfiguratorV2StepId[]): ConfiguratorStepId[] {
  return steps.map((step) => {
    if (step.startsWith('attribute:')) {
      return `option:${step.slice(10)}` as ConfiguratorStepId;
    }
    return step;
  });
}

function convertV2ToCompatibility(config: ConfiguratorV2): ProductConfigurator {
  const options = config.attributes.map(attributeToOptionGroup);
  const variantAttribute = findVariantAttribute(config.attributes);
  const sizeAttribute = findSizeAttribute(config.attributes);

  const variant = buildLegacyVariant(variantAttribute);
  const size = buildLegacySize(sizeAttribute);

  const quantity = buildCompatibilityQuantityWithAttributeOrder(config.pricing, config.attributes);

  return {
    version: 2,
    steps: mapV2StepsToCompatibility(config.steps),
    options,
    variant,
    size,
    design: config.design,
    placement: config.placement,
    quantity,
    attributes: deepClone(config.attributes),
    pricing: deepClone(config.pricing),
    importMeta: config.importMeta ? { ...config.importMeta } : undefined,
    legacySnapshot: config.legacySnapshot,
  };
}

export function normalizeConfigurator(input: unknown): ProductConfigurator {
  const validation = validateConfigurator(input);

  if (!validation.valid) {
    const firstError = validation.errors[0];
    throw new Error(firstError?.message || 'Configurador invalido');
  }

  return convertV2ToCompatibility(validation.normalized);
}

function pickTierForQuantity(tiers: PricingTier[], quantity: number): PricingTier | null {
  if (!tiers.length) return null;

  let selected: PricingTier | null = tiers[0] ?? null;

  for (const tier of tiers) {
    if (quantity >= tier.from) {
      selected = tier;
    }
  }

  return selected;
}

function conditionMatchesSelection(
  condition: ProductConfiguratorConditionMap | undefined,
  selection: ProductConfiguratorSelection
): boolean {
  if (!condition) return true;

  for (const [attributeId, allowedValues] of Object.entries(condition)) {
    const selectedValue = asString(selection[attributeId]);
    if (!selectedValue) return false;
    if (!allowedValues.includes(selectedValue)) return false;
  }

  return true;
}

function normalizeSelectionAgainstAttributes(
  attributes: ProductConfiguratorAttribute[],
  selection: ProductConfiguratorSelection
): { selection: ProductConfiguratorSelection; invalidAttributes: string[] } {
  const normalizedSelection: ProductConfiguratorSelection = {};
  const invalidAttributes: string[] = [];

  const normalizedKeyValue = new Map<string, string>();
  for (const [rawKey, rawValue] of Object.entries(selection ?? {})) {
    const key = normalizeId(rawKey, '');
    const value = asString(rawValue);
    if (!key || !value) continue;
    normalizedKeyValue.set(key, value);
  }

  for (const attribute of attributes) {
    const rawSelected =
      asString(selection[attribute.id]) ||
      asString(normalizedKeyValue.get(attribute.id));
    if (!rawSelected) continue;

    const normalizedSelectedId = normalizeOptionIdForAttribute(attribute.id, rawSelected);
    const exactMatch = attribute.options.find((option) => option.id === rawSelected);
    const normalizedMatch = attribute.options.find(
      (option) => option.id === normalizedSelectedId
    );

    if (exactMatch) {
      normalizedSelection[attribute.id] = exactMatch.id;
      continue;
    }

    if (normalizedMatch) {
      normalizedSelection[attribute.id] = normalizedMatch.id;
      continue;
    }

    invalidAttributes.push(attribute.id);
  }

  return { selection: normalizedSelection, invalidAttributes };
}

function applyConditionalDefaults(
  attributes: ProductConfiguratorAttribute[],
  selection: ProductConfiguratorSelection
): { selection: ProductConfiguratorSelection; states: ResolvedConditionalAttributeState[] } {
  const resolvedSelection: ProductConfiguratorSelection = { ...selection };
  const states: ResolvedConditionalAttributeState[] = [];

  for (const attribute of attributes) {
    const visible = conditionMatchesSelection(attribute.visibleWhen, resolvedSelection);
    const enabled = conditionMatchesSelection(attribute.enabledWhen, resolvedSelection);
    let appliedDefault: string | undefined;

    if (Array.isArray(attribute.defaultWhen) && attribute.defaultWhen.length > 0) {
      for (const defaultRule of attribute.defaultWhen) {
        if (!conditionMatchesSelection(defaultRule.when, resolvedSelection)) continue;
        const exists = attribute.options.some((option) => option.id === defaultRule.value);
        if (!exists) continue;
        resolvedSelection[attribute.id] = defaultRule.value;
        appliedDefault = defaultRule.value;
        break;
      }
    }

    if (!resolvedSelection[attribute.id] && attribute.defaultOptionResolver) {
      const firstOption = attribute.options[0];
      if (firstOption) {
        resolvedSelection[attribute.id] = firstOption.id;
        appliedDefault = firstOption.id;
      }
    }

    if (!visible && !appliedDefault && !attribute.defaultWhen?.length) {
      delete resolvedSelection[attribute.id];
    }

    states.push({
      attributeId: attribute.id,
      visible,
      enabled,
      appliedDefault,
    });
  }

  return {
    selection: resolvedSelection,
    states,
  };
}

function findBestMatchingRule<TRule extends { match: Record<string, string> }>(
  rules: TRule[],
  selection: ProductConfiguratorSelection
): TRule | null {
  const matchingRules = rules.filter((rule) =>
    Object.entries(rule.match).every(
      ([attributeId, optionId]) => selection[attributeId] === optionId
    )
  );

  const sortedRules = [...matchingRules].sort((a, b) =>
    Object.keys(b.match).length - Object.keys(a.match).length
  );

  return sortedRules[0] ?? null;
}

export function getSheetsNeeded(quantity: number, unitsPerSheet: number): number {
  const safeQuantity = Math.max(0, Math.ceil(quantity));
  const safeUnitsPerSheet = Math.max(1, Math.ceil(unitsPerSheet));
  return Math.max(1, Math.ceil(safeQuantity / safeUnitsPerSheet));
}

export function resolveConditionalAttributes(
  configurator: unknown,
  selection: ProductConfiguratorSelection
): ConditionalAttributeResolutionResult {
  let normalized: ProductConfigurator;
  try {
    normalized = normalizeConfigurator(configurator);
  } catch {
    return {
      selection: { ...selection },
      attributes: [],
    };
  }
  const attributes = normalized.attributes ?? [];
  const normalizedSelection = normalizeSelectionAgainstAttributes(attributes, selection).selection;
  const resolved = applyConditionalDefaults(attributes, normalizedSelection);

  return {
    selection: resolved.selection,
    attributes: resolved.states,
  };
}

export function getSheetMatrixPrice(
  configurator: unknown,
  selection: ProductConfiguratorSelection,
  quantity: number
): ProductConfiguratorPriceResult {
  let normalized: ProductConfigurator;

  try {
    normalized = normalizeConfigurator(configurator);
  } catch (error) {
    return {
      ok: false,
      pricingMode: 'sheet-matrix',
      quantity,
      unitPrice: 0,
      totalPrice: 0,
      effectiveUnitPrice: 0,
      matchedRule: null,
      appliedTier: null,
      matchedTier: null,
      error: {
        code: 'NO_TIERS_DEFINED',
        message:
          error instanceof Error
            ? error.message
            : 'No fue posible normalizar el configurador',
      },
    };
  }

  const attributes = normalized.attributes ?? [];
  const pricing = normalized.pricing;

  if (!pricing || pricing.mode !== 'sheet-matrix') {
    return {
      ok: false,
      pricingMode: 'sheet-matrix',
      quantity,
      unitPrice: 0,
      totalPrice: 0,
      effectiveUnitPrice: 0,
      matchedRule: null,
      appliedTier: null,
      matchedTier: null,
      error: {
        code: 'NO_TIERS_DEFINED',
        message: 'El configurador no define pricing en modo sheet-matrix',
      },
    };
  }

  if (quantity < pricing.quantityInput.min) {
    return {
      ok: false,
      pricingMode: 'sheet-matrix',
      quantity,
      unitPrice: 0,
      totalPrice: 0,
      effectiveUnitPrice: 0,
      matchedRule: null,
      appliedTier: null,
      matchedTier: null,
      error: {
        code: 'INVALID_QUANTITY',
        message: `La cantidad (${quantity}) es menor al minimo permitido (${pricing.quantityInput.min})`,
        details: {
          quantity,
          min: pricing.quantityInput.min,
        },
      },
    };
  }

  const normalizedSelectionResult = normalizeSelectionAgainstAttributes(attributes, selection);
  if (normalizedSelectionResult.invalidAttributes.length > 0) {
    const invalidAttributeId = normalizedSelectionResult.invalidAttributes[0];
    const invalidAttribute = attributes.find((attribute) => attribute.id === invalidAttributeId);
    return {
      ok: false,
      pricingMode: 'sheet-matrix',
      quantity,
      unitPrice: 0,
      totalPrice: 0,
      effectiveUnitPrice: 0,
      matchedRule: null,
      appliedTier: null,
      matchedTier: null,
      error: {
        code: 'INVALID_SELECTION',
        message: `Seleccion invalida para el atributo: ${invalidAttribute?.label || invalidAttributeId}`,
        details: { attributeId: invalidAttributeId },
      },
    };
  }

  const resolved = applyConditionalDefaults(attributes, normalizedSelectionResult.selection);

  for (const attribute of attributes) {
    const state = resolved.states.find((item) => item.attributeId === attribute.id);
    const required = attribute.required !== false;
    const mustBeSelected = required && (state?.visible ?? true) && (state?.enabled ?? true);
    if (!mustBeSelected) continue;

    if (!resolved.selection[attribute.id]) {
      return {
        ok: false,
        pricingMode: 'sheet-matrix',
        quantity,
        unitPrice: 0,
        totalPrice: 0,
        effectiveUnitPrice: 0,
        matchedRule: null,
        appliedTier: null,
        matchedTier: null,
        error: {
          code: 'MISSING_ATTRIBUTE',
          message: `Falta seleccionar el atributo requerido: ${attribute.label}`,
          details: {
            attributeId: attribute.id,
          },
        },
      };
    }
  }

  const matchedRule = findBestMatchingRule(pricing.rules, resolved.selection);
  if (!matchedRule) {
    return {
      ok: false,
      pricingMode: 'sheet-matrix',
      quantity,
      unitPrice: 0,
      totalPrice: 0,
      effectiveUnitPrice: 0,
      matchedRule,
      appliedTier: null,
      matchedTier: null,
      error: {
        code: 'NO_MATCHING_RULE',
        message: 'No se encontro una regla sheet-matrix para la combinacion seleccionada',
        details: { selection: resolved.selection },
      },
    };
  }

  const sheetsNeeded = getSheetsNeeded(quantity, matchedRule.unitsPerSheet);
  const matchedTier = pickTierForQuantity(matchedRule.sheetPricingTiers, sheetsNeeded);

  if (!matchedTier) {
    return {
      ok: false,
      pricingMode: 'sheet-matrix',
      quantity,
      unitPrice: 0,
      totalPrice: 0,
      effectiveUnitPrice: 0,
      unitsPerSheet: matchedRule.unitsPerSheet,
      sheetsNeeded,
      matchedRule,
      appliedTier: null,
      matchedTier: null,
      error: {
        code: 'NO_TIERS_DEFINED',
        message: 'No hay sheetPricingTiers aplicables para las hojas calculadas',
      },
    };
  }

  const totalPrice = matchedTier.price;
  const effectiveUnitPrice = quantity > 0 ? totalPrice / quantity : 0;

  return {
    ok: true,
    pricingMode: 'sheet-matrix',
    quantity,
    unitPrice: effectiveUnitPrice,
    totalPrice,
    effectiveUnitPrice,
    unitsPerSheet: matchedRule.unitsPerSheet,
    sheetsNeeded,
    matchedRule,
    appliedTier: matchedTier,
    matchedTier,
    error: null,
  };
}

export function getUnitPrice(
  configurator: unknown,
  selection: ProductConfiguratorSelection,
  quantity: number
): ProductConfiguratorPriceResult {
  let normalized: ProductConfigurator;

  try {
    normalized = normalizeConfigurator(configurator);
  } catch (error) {
    return {
      ok: false,
      pricingMode: 'simple',
      quantity,
      unitPrice: 0,
      totalPrice: 0,
      effectiveUnitPrice: 0,
      matchedRule: null,
      appliedTier: null,
      matchedTier: null,
      error: {
        code: 'NO_TIERS_DEFINED',
        message:
          error instanceof Error
            ? error.message
            : 'No fue posible normalizar el configurador',
      },
    };
  }

  const attributes = normalized.attributes ?? [];
  const pricing = normalized.pricing;

  if (!pricing) {
    return {
      ok: false,
      pricingMode: 'simple',
      quantity,
      unitPrice: 0,
      totalPrice: 0,
      effectiveUnitPrice: 0,
      matchedRule: null,
      appliedTier: null,
      matchedTier: null,
      error: {
        code: 'NO_TIERS_DEFINED',
        message: 'El configurador no define bloque de pricing',
      },
    };
  }

  if (pricing.mode === 'sheet-matrix') {
    return getSheetMatrixPrice(normalized, selection, quantity);
  }

  if (quantity < pricing.quantityInput.min) {
    return {
      ok: false,
      pricingMode: pricing.mode,
      quantity,
      unitPrice: 0,
      totalPrice: 0,
      effectiveUnitPrice: 0,
      matchedRule: null,
      appliedTier: null,
      matchedTier: null,
      error: {
        code: 'INVALID_QUANTITY',
        message: `La cantidad (${quantity}) es menor al minimo permitido (${pricing.quantityInput.min})`,
        details: {
          quantity,
          min: pricing.quantityInput.min,
        },
      },
    };
  }

  const normalizedSelectionResult = normalizeSelectionAgainstAttributes(attributes, selection);
  if (normalizedSelectionResult.invalidAttributes.length > 0) {
    const invalidAttributeId = normalizedSelectionResult.invalidAttributes[0];
    const invalidAttribute = attributes.find((attribute) => attribute.id === invalidAttributeId);
    return {
      ok: false,
      pricingMode: pricing.mode,
      quantity,
      unitPrice: 0,
      totalPrice: 0,
      effectiveUnitPrice: 0,
      matchedRule: null,
      appliedTier: null,
      matchedTier: null,
      error: {
        code: 'INVALID_SELECTION',
        message: `Seleccion invalida para el atributo: ${invalidAttribute?.label || invalidAttributeId}`,
        details: { attributeId: invalidAttributeId },
      },
    };
  }

  const resolved = applyConditionalDefaults(attributes, normalizedSelectionResult.selection);

  for (const attribute of attributes) {
    const state = resolved.states.find((item) => item.attributeId === attribute.id);
    const required = attribute.required !== false;
    const mustBeSelected = required && (state?.visible ?? true) && (state?.enabled ?? true);
    if (mustBeSelected && !resolved.selection[attribute.id]) {
      return {
        ok: false,
        pricingMode: pricing.mode,
        quantity,
        unitPrice: 0,
        totalPrice: 0,
        effectiveUnitPrice: 0,
        matchedRule: null,
        appliedTier: null,
        matchedTier: null,
        error: {
          code: 'MISSING_ATTRIBUTE',
          message: `Falta seleccionar el atributo requerido: ${attribute.label}`,
          details: {
            attributeId: attribute.id,
          },
        },
      };
    }
  }

  if (pricing.mode === 'simple') {
    const tier = pickTierForQuantity(pricing.tiers, quantity);
    if (!tier) {
      return {
        ok: false,
        pricingMode: pricing.mode,
        quantity,
        unitPrice: 0,
        totalPrice: 0,
        effectiveUnitPrice: 0,
        matchedRule: null,
        appliedTier: null,
        matchedTier: null,
        error: {
          code: 'NO_TIERS_DEFINED',
          message: 'No hay tiers configurados para pricing simple',
        },
      };
    }

    const totalPrice = tier.price * quantity;
    return {
      ok: true,
      pricingMode: 'simple',
      quantity,
      unitPrice: tier.price,
      totalPrice,
      effectiveUnitPrice: tier.price,
      matchedRule: null,
      appliedTier: tier,
      matchedTier: tier,
      error: null,
    };
  }

  const matchedRule = findBestMatchingRule(pricing.rules, resolved.selection);
  const tiers = matchedRule?.tiers ?? [];

  if (!tiers.length) {
    return {
      ok: false,
      pricingMode: 'matrix',
      quantity,
      unitPrice: 0,
      totalPrice: 0,
      effectiveUnitPrice: 0,
      matchedRule,
      appliedTier: null,
      matchedTier: null,
      error: {
        code: 'NO_MATCHING_RULE',
        message: 'No se encontro una regla de precio para la combinacion seleccionada',
        details: {
          selection: resolved.selection,
        },
      },
    };
  }

  const tier = pickTierForQuantity(tiers, quantity);
  if (!tier) {
    return {
      ok: false,
      pricingMode: 'matrix',
      quantity,
      unitPrice: 0,
      totalPrice: 0,
      effectiveUnitPrice: 0,
      matchedRule,
      appliedTier: null,
      matchedTier: null,
      error: {
        code: 'NO_TIERS_DEFINED',
        message: 'No hay un tier aplicable para la cantidad seleccionada',
      },
    };
  }

  const totalPrice = tier.price * quantity;

  return {
    ok: true,
    pricingMode: 'matrix',
    quantity,
    unitPrice: tier.price,
    totalPrice,
    effectiveUnitPrice: tier.price,
    matchedRule,
    appliedTier: tier,
    matchedTier: tier,
    error: null,
  };
}

export function validateSheetMatrixPricing(configurator: unknown): ConfiguratorValidationIssue[] {
  const validation = validateConfigurator(configurator);

  if (validation.normalized.pricing.mode !== 'sheet-matrix') {
    return [
      {
        code: 'INVALID_FORMAT',
        message: 'El configurador no usa pricing.mode = "sheet-matrix"',
        path: 'pricing.mode',
      },
      ...validation.errors,
    ];
  }

  return validation.errors;
}

function canonicalMatchKey(match: Record<string, string>, attributeKeys: string[]): string {
  return attributeKeys.map((key) => `${key}:${match[key] ?? ''}`).join('|');
}

export function convertTableToPricingMatrix(
  rows: Array<Record<string, unknown>>,
  options: ConvertTableToPricingMatrixOptions = {}
): PricingMatrixConversionResult {
  const quantityKey = normalizeId(options.quantityKey || 'cantidad', 'cantidad');
  const priceKey = normalizeId(options.priceKey || 'precio', 'precio');

  const normalizedRows = Array.isArray(rows) ? rows.filter((row) => isRecord(row)) : [];

  const providedAttributeKeys = options.attributeKeys?.map((key) => normalizeId(key, '')).filter(Boolean) ?? [];

  const discoveredKeys = providedAttributeKeys.length
    ? providedAttributeKeys
    : (() => {
        const firstRow = normalizedRows[0];
        if (!firstRow) return [];

        return Object.keys(firstRow)
          .map((key) => normalizeId(key, ''))
          .filter((key) => key && key !== quantityKey && key !== priceKey);
      })();

  const grouped = new Map<string, { match: Record<string, string>; tiers: PricingTier[] }>();

  let skippedRows = 0;
  let globalMin = Number.POSITIVE_INFINITY;

  for (const rawRow of normalizedRows) {
    const row: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(rawRow)) {
      row[normalizeId(key, key)] = value;
    }

    const quantity = toPositiveInt(row[quantityKey], 0);
    const price = toNonNegativeNumber(row[priceKey], Number.NaN);

    if (quantity <= 0 || Number.isNaN(price)) {
      skippedRows += 1;
      continue;
    }

    const match: Record<string, string> = {};
    let invalidMatch = false;

    for (const attributeKey of discoveredKeys) {
      const optionId = normalizeOptionIdForAttribute(attributeKey, asString(row[attributeKey]));
      if (!optionId) {
        invalidMatch = true;
        break;
      }
      match[attributeKey] = optionId;
    }

    if (invalidMatch) {
      skippedRows += 1;
      continue;
    }

    const key = canonicalMatchKey(match, discoveredKeys);
    const current = grouped.get(key) ?? { match, tiers: [] };
    current.tiers.push({ from: quantity, price });
    grouped.set(key, current);

    if (quantity < globalMin) globalMin = quantity;
  }

  const rules = [...grouped.values()].map((group) => ({
    match: group.match,
    tiers: normalizeTierList(group.tiers),
  }));

  const min = Number.isFinite(globalMin) ? Math.max(DEFAULT_MIN_QUANTITY, globalMin) : DEFAULT_MIN_QUANTITY;

  return {
    attributeKeys: discoveredKeys,
    quantityInput: { min, step: DEFAULT_STEP_QUANTITY },
    rules,
    skippedRows,
  };
}

export function migrateLegacyProduct<T extends Record<string, unknown>>(
  product: T
): T & { configurator: ConfiguratorV2 } {
  if (!isRecord(product)) {
    throw new Error('Producto invalido: se esperaba un objeto');
  }

  const rawConfigurator = product.configurator;
  if (!rawConfigurator) {
    throw new Error('El producto no contiene configurator para migrar');
  }

  const isAlreadyV2 = isRecord(rawConfigurator) && toPositiveInt(rawConfigurator.version, 0) === 2;

  const migrated = toConfiguratorV2Internal(rawConfigurator, {
    preserveLegacySnapshot: !isAlreadyV2,
    forceLegacyMeta: !isAlreadyV2,
  });

  const validation = validateConfigurator(migrated);
  if (!validation.valid) {
    throw new Error(validation.errors.map((item) => item.message).join(' | '));
  }

  const normalized = validation.normalized;

  if (!isAlreadyV2) {
    normalized.importMeta = {
      ...(normalized.importMeta ?? {}),
      legacy: true,
      migratedAt: normalized.importMeta?.migratedAt || new Date().toISOString(),
    };

    if (!normalized.legacySnapshot) {
      normalized.legacySnapshot = deepClone(rawConfigurator);
    }
  }

  return {
    ...product,
    configurator: normalized,
  };
}

export function buildConfigurableProductFromTable<
  TProductMeta extends Record<string, unknown>,
>(
  config: BuildConfigurableProductFromTableInput<TProductMeta>
): TProductMeta & { configurator: ConfiguratorV2 } {
  const conversion = convertTableToPricingMatrix(config.rows, {
    attributeKeys: config.attributes.map((attribute) => attribute.id),
  });

  const quantityInput: ProductConfiguratorPricingQuantityInput = {
    min: toPositiveInt(config.quantityInput?.min, conversion.quantityInput.min),
    step: toPositiveInt(config.quantityInput?.step, conversion.quantityInput.step),
    label: asString(config.quantityInput?.label) || undefined,
    sheetBased: config.quantityInput?.sheetBased === true ? true : undefined,
  };

  const defaultSteps: ConfiguratorV2StepId[] = [
    ...config.attributes.map((attribute) => `attribute:${normalizeId(attribute.id, 'attribute')}` as AttributeStepId),
    'design',
    ...(config.placement ? (['placement'] as ConfiguratorV2StepId[]) : []),
    'quantity',
    'summary',
  ];

  const configurator: ConfiguratorV2 = {
    version: 2,
    steps: config.steps && config.steps.length ? config.steps : defaultSteps,
    attributes: deepClone(config.attributes),
    pricing: {
      mode: 'matrix',
      quantityInput,
      rules: conversion.rules,
    } as ProductConfiguratorPricingMatrix,
    design: normalizeDesign(config.design),
    placement: config.placement,
    importMeta: {
      source: 'table',
      ...(config.importMeta ?? {}),
    },
  };

  const validation = validateConfigurator(configurator);
  if (!validation.valid) {
    throw new Error(validation.errors.map((item) => item.message).join(' | '));
  }

  return {
    ...config.productMeta,
    configurator: validation.normalized,
  };
}

// Helper export opcional para capas que necesiten construir la forma legacy temporal
export function toLegacyCompatibilityConfigurator(input: unknown): ProductConfigurator {
  return normalizeConfigurator(input);
}

// Helper export opcional para persistencia en V2 canonica
export function toConfiguratorV2(input: unknown): ConfiguratorV2 {
  const validation = validateConfigurator(input);
  if (!validation.valid) {
    throw new Error(validation.errors.map((item) => item.message).join(' | '));
  }
  return validation.normalized;
}
