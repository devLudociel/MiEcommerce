import { useState, useRef } from 'react';
import {
  Plus,
  X,
  Trash2,
  ChevronDown,
  ChevronUp,
  Palette,
  Image as ImageIcon,
  Type,
  Upload,
  Loader,
} from 'lucide-react';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../../lib/firebase';
import { notify } from '../../lib/notifications';
import type {
  ProductConfigurator,
  ConfiguratorStepId,
  VariantConfig,
  VariantDisplayType,
  VariantOption,
  SizeConfig,
  DesignConfig,
  PlacementConfig,
  PlacementOption,
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
  { id: 'placement', label: 'Posición diseño', icon: '📍' },
  { id: 'quantity', label: 'Cantidad', icon: '🔢' },
  { id: 'summary', label: 'Resumen', icon: '📋' },
];

const FIXED_STEPS: ConfiguratorStepId[] = ['design', 'quantity', 'summary'];

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

const DEFAULT_PLACEMENT: PlacementConfig = {
  label: 'Posición del diseño',
  options: [
    { id: 'front-full', label: 'Frente grande', icon: '👕' },
    { id: 'front-center', label: 'Frente centro', icon: '🎯' },
    { id: 'front-pocket', label: 'Bolsillo / Pecho izq.', icon: '📌' },
    { id: 'back-full', label: 'Espalda grande', icon: '🔙' },
    { id: 'back-center', label: 'Espalda centro', icon: '⬛' },
  ],
  allowSize: true,
  sizeOptions: ['Pequeño (~10cm)', 'Mediano (~20cm)', 'Grande (~30cm)', 'Máximo'],
};

const DEFAULT_QUANTITY = {
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

// ============================================================================
// UPLOAD helper — uploads image to configurator-variants/ and returns URL
// ============================================================================

async function uploadVariantImage(file: File): Promise<string> {
  const fileName = `${Date.now()}_${file.name.replace(/\s+/g, '_')}`;
  const path = `configurator-variants/${fileName}`;
  const fileRef = storageRef(storage, path);
  await uploadBytes(fileRef, file);
  return getDownloadURL(fileRef);
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function ConfiguratorEditor({ value, onChange }: ConfiguratorEditorProps) {
  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  const isEnabled = !!value;
  const config = value || createDefault();

  const toggleEnabled = () => onChange(isEnabled ? undefined : createDefault());

  const update = (partial: Partial<ProductConfigurator>) => onChange({ ...config, ...partial });

  const toggleStep = (stepId: ConfiguratorStepId) => {
    if (FIXED_STEPS.includes(stepId)) return;

    const steps = [...config.steps];
    const idx = steps.indexOf(stepId);

    if (idx >= 0) {
      steps.splice(idx, 1);
      const partial: Partial<ProductConfigurator> = { steps };
      if (stepId === 'variant') partial.variant = undefined;
      if (stepId === 'size') partial.size = undefined;
      if (stepId === 'placement') partial.placement = undefined;
      update(partial);
    } else {
      const order: ConfiguratorStepId[] = ['variant', 'size', 'design', 'placement', 'quantity', 'summary'];
      const newSteps: ConfiguratorStepId[] = [];
      for (const s of order) {
        if (steps.includes(s) || s === stepId) newSteps.push(s);
      }
      const partial: Partial<ProductConfigurator> = { steps: newSteps };
      if (stepId === 'variant' && !config.variant)
        partial.variant = { label: 'Color', type: 'color', options: [] };
      if (stepId === 'size' && !config.size)
        partial.size = { label: 'Talla', options: [] };
      if (stepId === 'placement' && !config.placement)
        partial.placement = { ...DEFAULT_PLACEMENT };
      update(partial);
    }
  };

  const toggle = (section: string) =>
    setExpandedSection(expandedSection === section ? null : section);

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
          Activa el configurador para que los clientes personalicen este producto paso a paso en{' '}
          <code className="bg-white px-1.5 py-0.5 rounded text-indigo-600 text-xs">/configurar/[id]</code>
        </p>
      </div>
    );
  }

  return (
    <div className="bg-indigo-50 rounded-xl p-4 space-y-5">
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

      {/* Steps */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Pasos activos</label>
        <div className="flex flex-wrap gap-2">
          {ALL_STEPS.map((step) => {
            const isActive = config.steps.includes(step.id);
            const isFixed = FIXED_STEPS.includes(step.id);
            return (
              <button
                key={step.id}
                type="button"
                onClick={() => toggleStep(step.id)}
                disabled={isFixed}
                className={`
                  flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all
                  ${isActive ? 'bg-indigo-600 text-white shadow-sm' : 'bg-white text-gray-600 border border-gray-300 hover:border-indigo-400'}
                  ${isFixed ? 'opacity-80 cursor-default' : ''}
                `}
              >
                <span>{step.icon}</span>
                {step.label}
                {isFixed && <span className="text-xs opacity-70">(fijo)</span>}
              </button>
            );
          })}
        </div>
        <p className="mt-2 text-xs text-gray-500">
          Diseño, Cantidad y Resumen son obligatorios. El resto son opcionales.
        </p>
      </div>

      {/* Variant */}
      {config.steps.includes('variant') && config.variant && (
        <SectionCollapsible title="Variante" icon="🎨" isOpen={expandedSection === 'variant'} onToggle={() => toggle('variant')}>
          <VariantEditor config={config.variant} onChange={(variant) => update({ variant })} />
        </SectionCollapsible>
      )}

      {/* Size */}
      {config.steps.includes('size') && config.size && (
        <SectionCollapsible title="Tamaño / Talla" icon="📏" isOpen={expandedSection === 'size'} onToggle={() => toggle('size')}>
          <SizeEditor config={config.size} onChange={(size) => update({ size })} />
        </SectionCollapsible>
      )}

      {/* Design */}
      <SectionCollapsible title="Diseño" icon="🖼️" isOpen={expandedSection === 'design'} onToggle={() => toggle('design')}>
        <DesignEditor config={config.design} onChange={(design) => update({ design })} />
      </SectionCollapsible>

      {/* Placement */}
      {config.steps.includes('placement') && config.placement && (
        <SectionCollapsible title="Posición del diseño" icon="📍" isOpen={expandedSection === 'placement'} onToggle={() => toggle('placement')}>
          <PlacementEditor config={config.placement} onChange={(placement) => update({ placement })} />
        </SectionCollapsible>
      )}

      {/* Quantity */}
      <SectionCollapsible title="Cantidad y precios" icon="🔢" isOpen={expandedSection === 'quantity'} onToggle={() => toggle('quantity')}>
        <QuantityEditor
          config={config.quantity}
          onChange={(quantity) => update({ quantity })}
          variantOptions={config.variant?.options.map((o) => ({ id: o.id, label: o.label }))}
        />
      </SectionCollapsible>
    </div>
  );
}

// ============================================================================
// COLLAPSIBLE SECTION
// ============================================================================

function SectionCollapsible({
  title, icon, isOpen, onToggle, children,
}: {
  title: string; icon: string; isOpen: boolean; onToggle: () => void; children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-lg border border-indigo-200 overflow-hidden">
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors"
      >
        <span className="flex items-center gap-2 text-sm font-semibold text-gray-800">
          <span>{icon}</span>{title}
        </span>
        {isOpen ? <ChevronUp className="w-4 h-4 text-gray-500" /> : <ChevronDown className="w-4 h-4 text-gray-500" />}
      </button>
      {isOpen && <div className="px-4 pb-4 space-y-4 border-t border-gray-100 pt-4">{children}</div>}
    </div>
  );
}

// ============================================================================
// VARIANT OPTION IMAGE UPLOADER
// ============================================================================

function OptionImageUpload({
  currentUrl,
  onUploaded,
  placeholder = 'Subir imagen',
}: {
  currentUrl?: string;
  onUploaded: (url: string) => void;
  placeholder?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleFile = async (file: File) => {
    setUploading(true);
    try {
      const url = await uploadVariantImage(file);
      onUploaded(url);
    } catch {
      notify.error('Error al subir la imagen');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex items-center gap-1.5">
      {currentUrl ? (
        <div className="relative group">
          <img
            src={currentUrl}
            alt="preview"
            className="w-10 h-10 rounded object-cover border border-gray-200"
          />
          <button
            type="button"
            onClick={() => onUploaded('')}
            className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white rounded-full hidden group-hover:flex items-center justify-center"
          >
            <X className="w-2.5 h-2.5" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="flex items-center gap-1 px-2 py-1.5 text-xs text-indigo-600 bg-indigo-50 border border-indigo-200 rounded-lg hover:bg-indigo-100 disabled:opacity-60 whitespace-nowrap"
        >
          {uploading ? <Loader className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
          {uploading ? 'Subiendo…' : placeholder}
        </button>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="sr-only"
        onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
      />
    </div>
  );
}

// ============================================================================
// VARIANT EDITOR
// ============================================================================

function VariantEditor({ config, onChange }: { config: VariantConfig; onChange: (c: VariantConfig) => void }) {
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

  const removeOption = (index: number) => update({ options: config.options.filter((_, i) => i !== index) });

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Etiqueta del paso</label>
        <input
          type="text"
          value={config.label}
          onChange={(e) => update({ label: e.target.value })}
          placeholder='Ej: "Color", "Tipo de taza", "Modelo de caja"'
          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Tipo de selector</label>
        <div className="flex gap-2">
          {VARIANT_TYPES.map((vt) => (
            <button
              key={vt.value}
              type="button"
              onClick={() => update({ type: vt.value })}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all
                ${config.type === vt.value
                  ? 'bg-indigo-100 text-indigo-700 border-2 border-indigo-400'
                  : 'bg-gray-100 text-gray-600 border-2 border-transparent hover:border-gray-300'}`}
            >
              <vt.icon className="w-4 h-4" />
              {vt.label}
            </button>
          ))}
        </div>
        {config.type === 'color' && (
          <p className="mt-1.5 text-xs text-gray-500">
            💡 Puedes añadir una imagen de preview por cada color (ej: la camiseta en ese color).
          </p>
        )}
        {config.type === 'image' && (
          <p className="mt-1.5 text-xs text-gray-500">
            💡 Sube la imagen de cada opción directamente — no hace falta URL.
          </p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Opciones ({config.options.length})
        </label>
        <div className="space-y-2">
          {config.options.map((opt, i) => (
            <div key={opt.id} className="flex items-center gap-2 bg-gray-50 rounded-lg p-2">
              {/* Color picker (only for color type) */}
              {config.type === 'color' && (
                <input
                  type="color"
                  value={opt.value || '#000000'}
                  onChange={(e) => updateOption(i, { value: e.target.value })}
                  className="w-8 h-8 rounded border-0 cursor-pointer shrink-0"
                  title="Color hex"
                />
              )}

              {/* Option name */}
              <input
                type="text"
                value={opt.label}
                onChange={(e) => updateOption(i, { label: e.target.value })}
                placeholder="Nombre (ej: Rojo, Caja kraft, Bolsa tela)"
                className="flex-1 min-w-0 px-2 py-1.5 text-sm border border-gray-300 rounded-lg"
              />

              {/* Image type: upload the main image */}
              {config.type === 'image' && (
                <OptionImageUpload
                  currentUrl={opt.value}
                  onUploaded={(url) => updateOption(i, { value: url })}
                  placeholder="Subir imagen"
                />
              )}

              {/* Text type: description field */}
              {config.type === 'text' && (
                <input
                  type="text"
                  value={opt.value}
                  onChange={(e) => updateOption(i, { value: e.target.value })}
                  placeholder="Descripción breve"
                  className="flex-1 min-w-0 px-2 py-1.5 text-sm border border-gray-300 rounded-lg"
                />
              )}

              {/* Preview image (for color and text types — shows the product in this option) */}
              {(config.type === 'color' || config.type === 'text') && (
                <OptionImageUpload
                  currentUrl={opt.previewImage}
                  onUploaded={(url) => updateOption(i, { previewImage: url || undefined })}
                  placeholder="+ Imagen"
                />
              )}

              <button
                type="button"
                onClick={() => removeOption(i)}
                className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors shrink-0"
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

function SizeEditor({ config, onChange }: { config: SizeConfig; onChange: (c: SizeConfig) => void }) {
  const [newSize, setNewSize] = useState('');

  const addSize = () => {
    const t = newSize.trim();
    if (!t || config.options.includes(t)) return;
    onChange({ ...config, options: [...config.options, t] });
    setNewSize('');
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Etiqueta del paso</label>
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
            <span key={size} className="flex items-center gap-1 bg-indigo-100 text-indigo-800 px-3 py-1.5 rounded-lg text-sm font-medium">
              {size}
              <button type="button" onClick={() => onChange({ ...config, options: config.options.filter((_, j) => j !== i) })} className="text-indigo-500 hover:text-red-500">
                <X className="w-3.5 h-3.5" />
              </button>
            </span>
          ))}
          {config.options.length === 0 && <span className="text-sm text-gray-400">Sin opciones</span>}
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
          <button type="button" onClick={addSize} className="px-3 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700">Añadir</button>
        </div>
      </div>
      <div>
        <p className="text-xs text-gray-500 mb-2">Presets:</p>
        <div className="flex flex-wrap gap-2">
          {[
            { label: 'Tallas ropa', values: ['XS', 'S', 'M', 'L', 'XL', 'XXL'] },
            { label: 'Formatos papel', values: ['A6', 'A5', 'A4', 'A3'] },
            { label: 'Tamaños taza', values: ['Pequeña (200ml)', 'Mediana (350ml)', 'Grande (500ml)'] },
          ].map((p) => (
            <button key={p.label} type="button" onClick={() => onChange({ ...config, options: p.values })} className="px-2.5 py-1 bg-gray-100 text-gray-600 text-xs rounded-lg hover:bg-gray-200">
              {p.label}
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

function DesignEditor({ config, onChange }: { config: DesignConfig; onChange: (c: DesignConfig) => void }) {
  const FORMATS = ['PNG', 'JPG', 'PDF', 'AI', 'SVG', 'PSD', 'EPS'];
  const update = (partial: Partial<DesignConfig>) => onChange({ ...config, ...partial });

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Formatos aceptados</label>
        <div className="flex flex-wrap gap-2">
          {FORMATS.map((fmt) => (
            <button
              key={fmt}
              type="button"
              onClick={() => update({ formats: config.formats.includes(fmt) ? config.formats.filter((f) => f !== fmt) : [...config.formats, fmt] })}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${config.formats.includes(fmt) ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
            >
              {fmt}
            </button>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">DPI mínimo</label>
          <input type="number" value={config.minDpi} onChange={(e) => update({ minDpi: parseInt(e.target.value) || 0 })} className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg" />
        </div>
        <div className="flex items-end">
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={config.requireTransparentBg} onChange={(e) => update({ requireTransparentBg: e.target.checked })} className="w-4 h-4 text-indigo-600 rounded" />
            <span className="text-sm text-gray-700">Requiere fondo transparente</span>
          </label>
        </div>
      </div>
      <div className="bg-amber-50 rounded-lg p-3 space-y-3">
        <p className="text-sm font-medium text-amber-800">Servicio de diseño</p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-gray-600 mb-1">Precio</label>
            <div className="relative">
              <input type="number" step="0.01" value={config.designServicePrice} onChange={(e) => update({ designServicePrice: parseFloat(e.target.value) || 0 })} className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg pr-8" />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">€</span>
            </div>
            <p className="text-xs text-gray-500 mt-1">0 = sin servicio</p>
          </div>
          <div>
            <label className="block text-xs text-gray-600 mb-1">Etiqueta</label>
            <input type="text" value={config.designServiceLabel || ''} onChange={(e) => update({ designServiceLabel: e.target.value })} placeholder="Servicio de diseño" className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg" />
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// PLACEMENT EDITOR
// ============================================================================

function PlacementEditor({ config, onChange }: { config: PlacementConfig; onChange: (c: PlacementConfig) => void }) {
  const [newOption, setNewOption] = useState('');
  const update = (partial: Partial<PlacementConfig>) => onChange({ ...config, ...partial });

  const addOption = () => {
    const t = newOption.trim();
    if (!t) return;
    const opt: PlacementOption = { id: `pos_${Date.now()}`, label: t, icon: '📍' };
    update({ options: [...config.options, opt] });
    setNewOption('');
  };

  const removeOption = (id: string) => update({ options: config.options.filter((o) => o.id !== id) });

  const updateOptionLabel = (id: string, label: string) =>
    update({ options: config.options.map((o) => (o.id === id ? { ...o, label } : o)) });

  const PRESET_POSITIONS: PlacementOption[] = [
    { id: 'front-full', label: 'Frente grande', icon: '👕' },
    { id: 'front-center', label: 'Frente centro', icon: '🎯' },
    { id: 'front-pocket', label: 'Bolsillo / Pecho izq.', icon: '📌' },
    { id: 'back-full', label: 'Espalda grande', icon: '🔙' },
    { id: 'back-center', label: 'Espalda centro', icon: '⬛' },
    { id: 'sleeve-left', label: 'Manga izquierda', icon: '↩️' },
    { id: 'sleeve-right', label: 'Manga derecha', icon: '↪️' },
    { id: 'neck', label: 'Cuello / Nuca', icon: '⬆️' },
  ];

  const applyPreset = () => update({ options: PRESET_POSITIONS });

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Etiqueta del paso</label>
        <input
          type="text"
          value={config.label}
          onChange={(e) => update({ label: e.target.value })}
          placeholder="Posición del diseño"
          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg"
        />
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="block text-sm font-medium text-gray-700">
            Posiciones ({config.options.length})
          </label>
          <button type="button" onClick={applyPreset} className="text-xs text-indigo-600 hover:underline">
            Cargar preset textiles
          </button>
        </div>
        <div className="space-y-2 mb-3">
          {config.options.map((opt) => (
            <div key={opt.id} className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2">
              <span className="text-lg">{opt.icon}</span>
              <input
                type="text"
                value={opt.label}
                onChange={(e) => updateOptionLabel(opt.id, e.target.value)}
                className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded-lg"
              />
              <button type="button" onClick={() => removeOption(opt.id)} className="p-1 text-red-500 hover:bg-red-50 rounded">
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            value={newOption}
            onChange={(e) => setNewOption(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addOption())}
            placeholder="Nueva posición, ej: Cuello trasero"
            className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg"
          />
          <button type="button" onClick={addOption} className="px-3 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700">
            Añadir
          </button>
        </div>
      </div>

      <div className="space-y-3 border-t pt-3">
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={config.allowSize}
            onChange={(e) => update({ allowSize: e.target.checked })}
            className="w-4 h-4 text-indigo-600 rounded"
          />
          <span className="text-sm font-medium text-gray-700">
            Permitir elegir tamaño del estampado
          </span>
        </label>

        {config.allowSize && (
          <div>
            <label className="block text-xs text-gray-600 mb-2">Opciones de tamaño</label>
            <div className="flex flex-wrap gap-2 mb-2">
              {(config.sizeOptions || []).map((s, i) => (
                <span key={i} className="flex items-center gap-1 bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded-lg text-xs font-medium">
                  {s}
                  <button type="button" onClick={() => update({ sizeOptions: config.sizeOptions.filter((_, j) => j !== i) })} className="text-indigo-400 hover:text-red-500">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <SizeOptionInput onAdd={(s) => update({ sizeOptions: [...(config.sizeOptions || []), s] })} />
            </div>
            <button
              type="button"
              onClick={() => update({ sizeOptions: ['Pequeño (~10cm)', 'Mediano (~20cm)', 'Grande (~30cm)', 'Máximo'] })}
              className="mt-2 text-xs text-indigo-600 hover:underline"
            >
              Cargar opciones por defecto
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function SizeOptionInput({ onAdd }: { onAdd: (s: string) => void }) {
  const [val, setVal] = useState('');
  return (
    <div className="flex gap-2 w-full">
      <input
        type="text"
        value={val}
        onChange={(e) => setVal(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter' && val.trim()) { e.preventDefault(); onAdd(val.trim()); setVal(''); } }}
        placeholder="Ej: Grande (~30cm)"
        className="flex-1 px-3 py-1.5 text-sm border border-gray-300 rounded-lg"
      />
      <button type="button" onClick={() => { if (val.trim()) { onAdd(val.trim()); setVal(''); } }} className="px-3 py-1.5 bg-gray-200 text-gray-700 text-sm rounded-lg hover:bg-gray-300">
        +
      </button>
    </div>
  );
}

// ============================================================================
// QUANTITY EDITOR
// ============================================================================

function TierList({
  tiers,
  onChange,
}: {
  tiers: PricingTier[];
  onChange: (tiers: PricingTier[]) => void;
}) {
  const updateTier = (i: number, p: Partial<PricingTier>) => {
    const next = [...tiers];
    next[i] = { ...next[i], ...p };
    onChange(next);
  };
  const removeTier = (i: number) => {
    if (tiers.length <= 1) return;
    onChange(tiers.filter((_, j) => j !== i));
  };
  const addTier = () => {
    const last = tiers[tiers.length - 1];
    onChange([...tiers, { from: last ? last.from * 2 : 1, price: last ? Math.max(0, last.price - 0.5) : 1 }]);
  };

  return (
    <div className="space-y-2">
      {tiers.map((tier, i) => (
        <div key={i} className="p-3 bg-gray-50 rounded-lg border border-gray-200 space-y-2">
          <div className="grid grid-cols-[1fr_1fr_auto] gap-2 items-center">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Desde (uds.)</label>
              <input type="number" min={1} value={tier.from} onChange={(e) => updateTier(i, { from: parseInt(e.target.value) || 1 })} className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg" />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Precio/ud. (€)</label>
              <input type="number" min={0} step="0.01" value={tier.price} onChange={(e) => updateTier(i, { price: parseFloat(e.target.value) || 0 })} className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg" />
            </div>
            <button type="button" onClick={() => removeTier(i)} disabled={tiers.length <= 1} className="mt-5 p-2 text-red-500 hover:bg-red-50 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2 items-center">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Etiqueta (opcional)</label>
              <input type="text" placeholder="ej: Popular, Mayorista…" value={tier.label ?? ''} onChange={(e) => updateTier(i, { label: e.target.value || undefined })} className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg" />
            </div>
            <div className="flex items-center gap-2 mt-4">
              <input type="checkbox" id={`rec-${i}`} checked={!!tier.recommended} onChange={(e) => updateTier(i, { recommended: e.target.checked || undefined })} className="w-4 h-4 accent-amber-500" />
              <label htmlFor={`rec-${i}`} className="text-sm text-gray-700 cursor-pointer">⭐ Recomendado</label>
            </div>
          </div>
        </div>
      ))}
      <button type="button" onClick={addTier} className="flex items-center gap-1 text-sm text-indigo-600 font-medium hover:text-indigo-700">
        <Plus className="w-4 h-4" />Añadir tramo
      </button>
    </div>
  );
}

function QuantityEditor({ config, onChange, variantOptions }: {
  config: QuantityConfig;
  onChange: (c: QuantityConfig) => void;
  variantOptions?: { id: string; label: string }[];
}) {
  const [showVariantPricing, setShowVariantPricing] = useState(false);

  const updateDefaultTiers = (tiers: PricingTier[]) => onChange({ ...config, tiers });

  const updateVariantTiers = (variantId: string, tiers: PricingTier[]) => {
    const variantPricing = { ...(config.variantPricing ?? {}), [variantId]: tiers };
    onChange({ ...config, variantPricing });
  };

  const removeVariantPricing = (variantId: string) => {
    const variantPricing = { ...(config.variantPricing ?? {}) };
    delete variantPricing[variantId];
    onChange({ ...config, variantPricing: Object.keys(variantPricing).length ? variantPricing : undefined });
  };

  return (
    <div className="space-y-5">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Pedido mínimo</label>
        <input type="number" min={1} value={config.min} onChange={(e) => onChange({ ...config, min: parseInt(e.target.value) || 1 })} className="w-32 px-3 py-2 text-sm border border-gray-300 rounded-lg" />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Tramos de precio (por defecto)</label>
        <TierList tiers={config.tiers} onChange={updateDefaultTiers} />
      </div>

      {/* Per-variant pricing */}
      {variantOptions && variantOptions.length > 0 && (
        <div className="border-t border-gray-200 pt-4">
          <button type="button" onClick={() => setShowVariantPricing(v => !v)} className="flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-indigo-600">
            {showVariantPricing ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            Precios distintos por variante
            {config.variantPricing && Object.keys(config.variantPricing).length > 0 && (
              <span className="ml-1 text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full">
                {Object.keys(config.variantPricing).length} configurado{Object.keys(config.variantPricing).length > 1 ? 's' : ''}
              </span>
            )}
          </button>
          {showVariantPricing && (
            <div className="mt-3 space-y-4">
              <p className="text-xs text-gray-500">Si una variante tiene sus propios tramos, se usarán en lugar de los por defecto.</p>
              {variantOptions.map((opt) => {
                const variantTiers = config.variantPricing?.[opt.id];
                return (
                  <div key={opt.id} className="border border-gray-200 rounded-xl overflow-hidden">
                    <div className="flex items-center justify-between px-4 py-3 bg-gray-50">
                      <span className="text-sm font-semibold text-gray-800">{opt.label}</span>
                      {variantTiers ? (
                        <button type="button" onClick={() => removeVariantPricing(opt.id)} className="text-xs text-red-500 hover:text-red-700">
                          Quitar precios propios
                        </button>
                      ) : (
                        <button type="button" onClick={() => updateVariantTiers(opt.id, [...config.tiers])} className="text-xs text-indigo-600 font-medium hover:text-indigo-700">
                          + Añadir precios propios
                        </button>
                      )}
                    </div>
                    {variantTiers && (
                      <div className="p-3">
                        <TierList tiers={variantTiers} onChange={(t) => updateVariantTiers(opt.id, t)} />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
