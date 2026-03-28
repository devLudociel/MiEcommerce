import { useState } from 'react';
import {
  Plus,
  X,
  Trash2,
  ChevronDown,
  ChevronUp,
  Palette,
  Image as ImageIcon,
  Type,
} from 'lucide-react';
import type {
  ProductConfigurator,
  ConfiguratorStepId,
  VariantConfig,
  VariantDisplayType,
  VariantOption,
  SizeConfig,
  DesignConfig,
  QuantityConfig,
  PricingTier,
} from '../../types/configurator';

interface ConfiguratorEditorProps {
  value: ProductConfigurator | undefined;
  onChange: (value: ProductConfigurator | undefined) => void;
}

const ALL_STEPS: { id: ConfiguratorStepId; label: string; icon: string }[] = [
  { id: 'variant', label: 'Variante', icon: '🎨' },
  { id: 'size', label: 'Tamaño/Talla', icon: '📏' },
  { id: 'design', label: 'Diseño', icon: '🖼️' },
  { id: 'quantity', label: 'Cantidad', icon: '🔢' },
  { id: 'summary', label: 'Resumen', icon: '📋' },
];

const VARIANT_TYPES: { value: VariantDisplayType; label: string; icon: typeof Palette }[] = [
  { value: 'color', label: 'Colores', icon: Palette },
  { value: 'image', label: 'Imágenes', icon: ImageIcon },
  { value: 'text', label: 'Texto', icon: Type },
];

const DEFAULT_DESIGN: DesignConfig = {
  formats: ['PNG', 'PDF'],
  minDpi: 300,
  requireTransparentBg: false,
  designServicePrice: 0,
  designServiceLabel: 'Servicio de diseño',
};

const DEFAULT_QUANTITY: QuantityConfig = {
  min: 1,
  tiers: [{ from: 1, price: 0 }],
};

function createDefault(): ProductConfigurator {
  return {
    steps: ['design', 'quantity', 'summary'],
    design: { ...DEFAULT_DESIGN },
    quantity: { ...DEFAULT_QUANTITY },
  };
}

export default function ConfiguratorEditor({ value, onChange }: ConfiguratorEditorProps) {
  const [expandedSection, setExpandedSection] = useState<string | null>(null);

  const isEnabled = !!value;
  const config = value || createDefault();

  const toggleEnabled = () => {
    onChange(isEnabled ? undefined : createDefault());
  };

  const update = (partial: Partial<ProductConfigurator>) => {
    onChange({ ...config, ...partial });
  };

  const toggleStep = (stepId: ConfiguratorStepId) => {
    // design, quantity, summary are always required
    if (['design', 'quantity', 'summary'].includes(stepId)) return;

    const steps = [...config.steps];
    const idx = steps.indexOf(stepId);

    if (idx >= 0) {
      steps.splice(idx, 1);
      const partial: Partial<ProductConfigurator> = { steps };
      if (stepId === 'variant') partial.variant = undefined;
      if (stepId === 'size') partial.size = undefined;
      update(partial);
    } else {
      // Insert before 'design' to maintain order
      const order: ConfiguratorStepId[] = ['variant', 'size', 'design', 'quantity', 'summary'];
      const newSteps: ConfiguratorStepId[] = [];
      for (const s of order) {
        if (steps.includes(s) || s === stepId) newSteps.push(s);
      }

      const partial: Partial<ProductConfigurator> = { steps: newSteps };
      if (stepId === 'variant' && !config.variant) {
        partial.variant = { label: 'Color', type: 'color', options: [] };
      }
      if (stepId === 'size' && !config.size) {
        partial.size = { label: 'Talla', options: [] };
      }
      update(partial);
    }
  };

  const toggle = (section: string) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  if (!isEnabled) {
    return (
      <div className="bg-indigo-50 rounded-xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="font-semibold text-gray-800 flex items-center gap-2">
            <span className="text-lg">🛠️</span>
            Configurador paso a paso
          </h4>
          <button
            type="button"
            onClick={toggleEnabled}
            className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors"
          >
            Activar configurador
          </button>
        </div>
        <p className="text-sm text-gray-600">
          Activa el configurador para que los clientes personalicen este producto paso a paso
          en <code className="bg-white px-1.5 py-0.5 rounded text-indigo-600 text-xs">/configurar/[id]</code>
        </p>
      </div>
    );
  }

  return (
    <div className="bg-indigo-50 rounded-xl p-4 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h4 className="font-semibold text-gray-800 flex items-center gap-2">
          <span className="text-lg">🛠️</span>
          Configurador paso a paso
        </h4>
        <button
          type="button"
          onClick={toggleEnabled}
          className="px-3 py-1.5 bg-red-100 text-red-700 text-sm font-medium rounded-lg hover:bg-red-200 transition-colors"
        >
          Desactivar
        </button>
      </div>

      {/* Steps selector */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Pasos activos</label>
        <div className="flex flex-wrap gap-2">
          {ALL_STEPS.map((step) => {
            const isActive = config.steps.includes(step.id);
            const isRequired = ['design', 'quantity', 'summary'].includes(step.id);
            return (
              <button
                key={step.id}
                type="button"
                onClick={() => toggleStep(step.id)}
                disabled={isRequired}
                className={`
                  flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all
                  ${isActive
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'bg-white text-gray-600 border border-gray-300 hover:border-indigo-400'
                  }
                  ${isRequired ? 'opacity-80 cursor-default' : ''}
                `}
              >
                <span>{step.icon}</span>
                {step.label}
                {isRequired && <span className="text-xs opacity-70">(fijo)</span>}
              </button>
            );
          })}
        </div>
        <p className="mt-2 text-xs text-gray-500">
          Diseño, Cantidad y Resumen son obligatorios. Variante y Tamaño son opcionales.
        </p>
      </div>

      {/* Variant config */}
      {config.steps.includes('variant') && config.variant && (
        <SectionCollapsible
          title="Variante"
          icon="🎨"
          isOpen={expandedSection === 'variant'}
          onToggle={() => toggle('variant')}
        >
          <VariantEditor
            config={config.variant}
            onChange={(variant) => update({ variant })}
          />
        </SectionCollapsible>
      )}

      {/* Size config */}
      {config.steps.includes('size') && config.size && (
        <SectionCollapsible
          title="Tamaño / Talla"
          icon="📏"
          isOpen={expandedSection === 'size'}
          onToggle={() => toggle('size')}
        >
          <SizeEditor
            config={config.size}
            onChange={(size) => update({ size })}
          />
        </SectionCollapsible>
      )}

      {/* Design config */}
      <SectionCollapsible
        title="Diseño"
        icon="🖼️"
        isOpen={expandedSection === 'design'}
        onToggle={() => toggle('design')}
      >
        <DesignEditor
          config={config.design}
          onChange={(design) => update({ design })}
        />
      </SectionCollapsible>

      {/* Quantity config */}
      <SectionCollapsible
        title="Cantidad y precios"
        icon="🔢"
        isOpen={expandedSection === 'quantity'}
        onToggle={() => toggle('quantity')}
      >
        <QuantityEditor
          config={config.quantity}
          onChange={(quantity) => update({ quantity })}
        />
      </SectionCollapsible>
    </div>
  );
}

// ============================================================================
// COLLAPSIBLE SECTION
// ============================================================================

function SectionCollapsible({
  title,
  icon,
  isOpen,
  onToggle,
  children,
}: {
  title: string;
  icon: string;
  isOpen: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-lg border border-indigo-200 overflow-hidden">
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors"
      >
        <span className="flex items-center gap-2 text-sm font-semibold text-gray-800">
          <span>{icon}</span>
          {title}
        </span>
        {isOpen ? (
          <ChevronUp className="w-4 h-4 text-gray-500" />
        ) : (
          <ChevronDown className="w-4 h-4 text-gray-500" />
        )}
      </button>
      {isOpen && <div className="px-4 pb-4 space-y-4 border-t border-gray-100 pt-4">{children}</div>}
    </div>
  );
}

// ============================================================================
// VARIANT EDITOR
// ============================================================================

function VariantEditor({
  config,
  onChange,
}: {
  config: VariantConfig;
  onChange: (c: VariantConfig) => void;
}) {
  const update = (partial: Partial<VariantConfig>) => onChange({ ...config, ...partial });

  const addOption = () => {
    const newOpt: VariantOption = {
      id: `opt_${Date.now()}`,
      label: '',
      value: config.type === 'color' ? '#000000' : '',
    };
    update({ options: [...config.options, newOpt] });
  };

  const updateOption = (index: number, partial: Partial<VariantOption>) => {
    const opts = [...config.options];
    opts[index] = { ...opts[index], ...partial };
    update({ options: opts });
  };

  const removeOption = (index: number) => {
    update({ options: config.options.filter((_, i) => i !== index) });
  };

  return (
    <div className="space-y-4">
      {/* Label */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Etiqueta del paso
        </label>
        <input
          type="text"
          value={config.label}
          onChange={(e) => update({ label: e.target.value })}
          placeholder='Ej: "Color", "Tipo de taza", "Modelo"'
          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
        />
      </div>

      {/* Type */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Tipo de selector</label>
        <div className="flex gap-2">
          {VARIANT_TYPES.map((vt) => (
            <button
              key={vt.value}
              type="button"
              onClick={() => update({ type: vt.value })}
              className={`
                flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all
                ${config.type === vt.value
                  ? 'bg-indigo-100 text-indigo-700 border-2 border-indigo-400'
                  : 'bg-gray-100 text-gray-600 border-2 border-transparent hover:border-gray-300'
                }
              `}
            >
              <vt.icon className="w-4 h-4" />
              {vt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Options */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Opciones ({config.options.length})
        </label>
        <div className="space-y-2">
          {config.options.map((opt, i) => (
            <div key={opt.id} className="flex items-center gap-2 bg-gray-50 rounded-lg p-2">
              {config.type === 'color' && (
                <input
                  type="color"
                  value={opt.value}
                  onChange={(e) => updateOption(i, { value: e.target.value })}
                  className="w-8 h-8 rounded border-0 cursor-pointer"
                />
              )}
              <input
                type="text"
                value={opt.label}
                onChange={(e) => updateOption(i, { label: e.target.value })}
                placeholder="Nombre (ej: Rojo)"
                className="flex-1 px-2 py-1.5 text-sm border border-gray-300 rounded-lg"
              />
              {config.type !== 'color' && (
                <input
                  type="text"
                  value={opt.value}
                  onChange={(e) => updateOption(i, { value: e.target.value })}
                  placeholder={config.type === 'image' ? 'URL de imagen' : 'Descripción'}
                  className="flex-1 px-2 py-1.5 text-sm border border-gray-300 rounded-lg"
                />
              )}
              <button
                type="button"
                onClick={() => removeOption(i)}
                className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={addOption}
          className="mt-2 flex items-center gap-1 text-sm text-indigo-600 font-medium hover:text-indigo-700"
        >
          <Plus className="w-4 h-4" />
          Añadir opción
        </button>
      </div>
    </div>
  );
}

// ============================================================================
// SIZE EDITOR
// ============================================================================

function SizeEditor({
  config,
  onChange,
}: {
  config: SizeConfig;
  onChange: (c: SizeConfig) => void;
}) {
  const [newSize, setNewSize] = useState('');

  const addSize = () => {
    const trimmed = newSize.trim();
    if (!trimmed || config.options.includes(trimmed)) return;
    onChange({ ...config, options: [...config.options, trimmed] });
    setNewSize('');
  };

  const removeSize = (index: number) => {
    onChange({ ...config, options: config.options.filter((_, i) => i !== index) });
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Etiqueta del paso
        </label>
        <input
          type="text"
          value={config.label}
          onChange={(e) => onChange({ ...config, label: e.target.value })}
          placeholder='Ej: "Talla", "Tamaño", "Formato"'
          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Opciones</label>
        <div className="flex flex-wrap gap-2 mb-3">
          {config.options.map((size, i) => (
            <span
              key={size}
              className="flex items-center gap-1 bg-indigo-100 text-indigo-800 px-3 py-1.5 rounded-lg text-sm font-medium"
            >
              {size}
              <button
                type="button"
                onClick={() => removeSize(i)}
                className="ml-1 text-indigo-500 hover:text-red-500"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </span>
          ))}
          {config.options.length === 0 && (
            <span className="text-sm text-gray-400">Sin opciones aún</span>
          )}
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            value={newSize}
            onChange={(e) => setNewSize(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addSize())}
            placeholder="Ej: S, M, L, XL o A4, A3..."
            className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg"
          />
          <button
            type="button"
            onClick={addSize}
            className="px-3 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700"
          >
            Añadir
          </button>
        </div>
      </div>

      {/* Quick presets */}
      <div>
        <p className="text-xs text-gray-500 mb-2">Presets rápidos:</p>
        <div className="flex flex-wrap gap-2">
          {[
            { label: 'Tallas ropa', values: ['XS', 'S', 'M', 'L', 'XL', 'XXL'] },
            { label: 'Formatos papel', values: ['A6', 'A5', 'A4', 'A3'] },
            { label: 'Tamaños taza', values: ['Pequeña (200ml)', 'Mediana (350ml)', 'Grande (500ml)'] },
          ].map((preset) => (
            <button
              key={preset.label}
              type="button"
              onClick={() => onChange({ ...config, options: preset.values })}
              className="px-2.5 py-1 bg-gray-100 text-gray-600 text-xs rounded-lg hover:bg-gray-200 transition-colors"
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// DESIGN EDITOR
// ============================================================================

function DesignEditor({
  config,
  onChange,
}: {
  config: DesignConfig;
  onChange: (c: DesignConfig) => void;
}) {
  const [newFormat, setNewFormat] = useState('');
  const update = (partial: Partial<DesignConfig>) => onChange({ ...config, ...partial });

  const COMMON_FORMATS = ['PNG', 'JPG', 'PDF', 'AI', 'SVG', 'PSD', 'EPS'];

  const toggleFormat = (fmt: string) => {
    const formats = config.formats.includes(fmt)
      ? config.formats.filter((f) => f !== fmt)
      : [...config.formats, fmt];
    update({ formats });
  };

  return (
    <div className="space-y-4">
      {/* Formats */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Formatos aceptados</label>
        <div className="flex flex-wrap gap-2">
          {COMMON_FORMATS.map((fmt) => (
            <button
              key={fmt}
              type="button"
              onClick={() => toggleFormat(fmt)}
              className={`
                px-3 py-1.5 rounded-lg text-sm font-medium transition-all
                ${config.formats.includes(fmt)
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }
              `}
            >
              {fmt}
            </button>
          ))}
        </div>
      </div>

      {/* DPI & Transparent */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">DPI mínimo</label>
          <input
            type="number"
            value={config.minDpi}
            onChange={(e) => update({ minDpi: parseInt(e.target.value) || 0 })}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg"
          />
        </div>
        <div className="flex items-end">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={config.requireTransparentBg}
              onChange={(e) => update({ requireTransparentBg: e.target.checked })}
              className="w-4 h-4 text-indigo-600 rounded"
            />
            <span className="text-sm text-gray-700">Requiere fondo transparente</span>
          </label>
        </div>
      </div>

      {/* Design service */}
      <div className="bg-amber-50 rounded-lg p-3 space-y-3">
        <p className="text-sm font-medium text-amber-800">Servicio de diseño</p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-gray-600 mb-1">Precio del servicio</label>
            <div className="relative">
              <input
                type="number"
                step="0.01"
                value={config.designServicePrice}
                onChange={(e) => update({ designServicePrice: parseFloat(e.target.value) || 0 })}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg pr-8"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">€</span>
            </div>
            <p className="text-xs text-gray-500 mt-1">0 = sin servicio de diseño</p>
          </div>
          <div>
            <label className="block text-xs text-gray-600 mb-1">Etiqueta</label>
            <input
              type="text"
              value={config.designServiceLabel || ''}
              onChange={(e) => update({ designServiceLabel: e.target.value })}
              placeholder="Servicio de diseño"
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// QUANTITY EDITOR
// ============================================================================

function QuantityEditor({
  config,
  onChange,
}: {
  config: QuantityConfig;
  onChange: (c: QuantityConfig) => void;
}) {
  const addTier = () => {
    const lastTier = config.tiers[config.tiers.length - 1];
    const newFrom = lastTier ? lastTier.from * 2 : 1;
    const newPrice = lastTier ? Math.max(0, lastTier.price - 0.5) : 1;
    onChange({
      ...config,
      tiers: [...config.tiers, { from: newFrom, price: newPrice }],
    });
  };

  const updateTier = (index: number, partial: Partial<PricingTier>) => {
    const tiers = [...config.tiers];
    tiers[index] = { ...tiers[index], ...partial };
    onChange({ ...config, tiers });
  };

  const removeTier = (index: number) => {
    if (config.tiers.length <= 1) return;
    onChange({ ...config, tiers: config.tiers.filter((_, i) => i !== index) });
  };

  return (
    <div className="space-y-4">
      {/* Min quantity */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Pedido mínimo</label>
        <input
          type="number"
          min={1}
          value={config.min}
          onChange={(e) => onChange({ ...config, min: parseInt(e.target.value) || 1 })}
          className="w-32 px-3 py-2 text-sm border border-gray-300 rounded-lg"
        />
      </div>

      {/* Tiers */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Tramos de precio ({config.tiers.length})
        </label>
        <div className="space-y-2">
          <div className="grid grid-cols-[1fr_1fr_auto] gap-2 text-xs font-medium text-gray-500 px-2">
            <span>Desde (uds.)</span>
            <span>Precio/ud. (€)</span>
            <span className="w-8" />
          </div>
          {config.tiers.map((tier, i) => (
            <div key={i} className="grid grid-cols-[1fr_1fr_auto] gap-2 items-center">
              <input
                type="number"
                min={1}
                value={tier.from}
                onChange={(e) => updateTier(i, { from: parseInt(e.target.value) || 1 })}
                className="px-3 py-2 text-sm border border-gray-300 rounded-lg"
              />
              <input
                type="number"
                min={0}
                step="0.01"
                value={tier.price}
                onChange={(e) => updateTier(i, { price: parseFloat(e.target.value) || 0 })}
                className="px-3 py-2 text-sm border border-gray-300 rounded-lg"
              />
              <button
                type="button"
                onClick={() => removeTier(i)}
                disabled={config.tiers.length <= 1}
                className="p-2 text-red-500 hover:bg-red-50 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={addTier}
          className="mt-2 flex items-center gap-1 text-sm text-indigo-600 font-medium hover:text-indigo-700"
        >
          <Plus className="w-4 h-4" />
          Añadir tramo
        </button>
        <p className="mt-2 text-xs text-gray-500">
          Ordena los tramos de menor a mayor cantidad. El precio se aplica desde la cantidad indicada.
        </p>
      </div>
    </div>
  );
}
