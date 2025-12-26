// src/components/customizer/mug/MugOptionsPanel.tsx

import React from 'react';
import { Check } from 'lucide-react';
import type { MugCustomizationData } from './types';
import { MUG_MATERIALS, MUG_PRINT_AREAS, MUG_COLORS, MUG_SIZES } from './mugConfig';

interface MugOptionsPanelProps {
  customization: MugCustomizationData;
  onUpdate: (updates: Partial<MugCustomizationData>) => void;
  basePrice: number;
}

export default function MugOptionsPanel({
  customization,
  onUpdate,
  basePrice,
}: MugOptionsPanelProps) {
  const selectedMaterial = MUG_MATERIALS.find((m) => m.id === customization.material);
  const selectedPrintArea = MUG_PRINT_AREAS.find((p) => p.id === customization.printArea);
  const selectedColor = MUG_COLORS.find((c) => c.id === customization.color);
  const selectedSize = MUG_SIZES.find((s) => s.value === customization.size);

  // Calcular precio total
  const totalPriceModifier =
    (selectedMaterial?.priceModifier || 0) +
    (selectedPrintArea?.priceModifier || 0) +
    (selectedColor?.priceModifier || 0) +
    (selectedSize?.priceModifier || 0);

  const totalPrice = basePrice + totalPriceModifier;
  const originalPrice = totalPrice * 1.43; // Simular descuento

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR',
    }).format(price);
  };

  return (
    <div className="bg-white rounded-2xl shadow-xl border-2 border-gray-200 p-6 space-y-6">
      <h2 className="text-2xl font-bold text-gray-800">Opciones del producto</h2>

      {/* Material */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-3">Material</label>
        <div className="grid grid-cols-2 gap-3">
          {MUG_MATERIALS.map((material) => {
            const isSelected = customization.material === material.id;
            const isDisabled = material.id === 'magic' && selectedColor?.isMagic === false;

            return (
              <button
                key={material.id}
                onClick={() => !isDisabled && onUpdate({ material: material.id })}
                disabled={isDisabled}
                className={`relative p-4 rounded-xl border-2 transition-all text-left ${
                  isSelected
                    ? 'border-purple-500 bg-purple-50 shadow-md'
                    : isDisabled
                      ? 'border-gray-200 bg-gray-50 opacity-50 cursor-not-allowed'
                      : 'border-gray-300 hover:border-purple-300 hover:shadow-sm'
                }`}
              >
                {isSelected && (
                  <div className="absolute top-2 right-2 w-6 h-6 bg-purple-500 rounded-full flex items-center justify-center">
                    <Check className="w-4 h-4 text-white" />
                  </div>
                )}
                <div className="text-2xl mb-2">{material.icon}</div>
                <div className="font-bold text-gray-800">{material.name}</div>
                <div className="text-xs text-gray-600 mt-1">{material.description}</div>
                {material.priceModifier !== 0 && (
                  <div className="text-xs font-semibold text-purple-600 mt-2">
                    {material.priceModifier > 0 ? '+' : ''}
                    {formatPrice(material.priceModifier)}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Área de diseño */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-3">Área de diseño</label>
        <div className="grid grid-cols-2 gap-3">
          {MUG_PRINT_AREAS.map((area) => {
            const isSelected = customization.printArea === area.id;

            return (
              <button
                key={area.id}
                onClick={() => onUpdate({ printArea: area.id })}
                className={`relative p-4 rounded-xl border-2 transition-all text-left ${
                  isSelected
                    ? 'border-purple-500 bg-purple-50 shadow-md'
                    : 'border-gray-300 hover:border-purple-300 hover:shadow-sm'
                }`}
              >
                {isSelected && (
                  <div className="absolute top-2 right-2 w-6 h-6 bg-purple-500 rounded-full flex items-center justify-center">
                    <Check className="w-4 h-4 text-white" />
                  </div>
                )}
                <div className="font-bold text-gray-800">{area.name}</div>
                <div className="text-xs text-gray-600 mt-1">{area.description}</div>
                {area.priceModifier !== 0 && (
                  <div className="text-xs font-semibold text-purple-600 mt-2">
                    {area.priceModifier > 0 ? '+' : ''}
                    {formatPrice(area.priceModifier)}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Color */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-3">Color</label>
        <div className="grid grid-cols-2 gap-3">
          {MUG_COLORS.filter((c) =>
            customization.material === 'magic' ? c.isMagic : !c.isMagic
          ).map((color) => {
            const isSelected = customization.color === color.id;

            return (
              <button
                key={color.id}
                onClick={() => onUpdate({ color: color.id })}
                className={`relative p-4 rounded-xl border-2 transition-all text-left ${
                  isSelected
                    ? 'border-purple-500 bg-purple-50 shadow-md'
                    : 'border-gray-300 hover:border-purple-300 hover:shadow-sm'
                }`}
              >
                {isSelected && (
                  <div className="absolute top-2 right-2 w-6 h-6 bg-purple-500 rounded-full flex items-center justify-center">
                    <Check className="w-4 h-4 text-white" />
                  </div>
                )}
                <div className="flex items-center gap-3 mb-2">
                  <div
                    className="w-8 h-8 rounded-lg border-2 border-gray-300 shadow-sm"
                    style={{
                      background: color.accentColor
                        ? `linear-gradient(135deg, ${color.primaryColor} 50%, ${color.accentColor} 50%)`
                        : color.primaryColor,
                    }}
                  />
                  <div className="font-bold text-gray-800 text-sm">{color.name}</div>
                </div>
                {color.priceModifier !== 0 && (
                  <div className="text-xs font-semibold text-purple-600">
                    {color.priceModifier > 0 ? '+' : ''}
                    {formatPrice(color.priceModifier)}
                    {color.priceModifier > 3 && '/unidad'}
                  </div>
                )}
                {color.priceModifier === 0 && color.id === customization.color && (
                  <div className="text-xs text-gray-500">Precio base</div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Colores personalizables 3D */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-3">
          Colores de la taza 3D
        </label>
        <div className="space-y-3">
          {/* Body color */}
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <span className="text-sm font-medium text-gray-700">Cuerpo</span>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={customization.mugColors?.body || '#ffffff'}
                onChange={(e) =>
                  onUpdate({
                    mugColors: {
                      body: e.target.value,
                      handle: customization.mugColors?.handle || '#ffffff',
                      interior: customization.mugColors?.interior || '#ffffff',
                    },
                  })
                }
                className="w-12 h-8 rounded border-2 border-gray-300 cursor-pointer"
              />
              <span className="text-xs font-mono text-gray-500 w-20">
                {customization.mugColors?.body || '#ffffff'}
              </span>
            </div>
          </div>

          {/* Handle color */}
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <span className="text-sm font-medium text-gray-700">Asa</span>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={customization.mugColors?.handle || '#ffffff'}
                onChange={(e) =>
                  onUpdate({
                    mugColors: {
                      body: customization.mugColors?.body || '#ffffff',
                      handle: e.target.value,
                      interior: customization.mugColors?.interior || '#ffffff',
                    },
                  })
                }
                className="w-12 h-8 rounded border-2 border-gray-300 cursor-pointer"
              />
              <span className="text-xs font-mono text-gray-500 w-20">
                {customization.mugColors?.handle || '#ffffff'}
              </span>
            </div>
          </div>

          {/* Interior color */}
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <span className="text-sm font-medium text-gray-700">Interior</span>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={customization.mugColors?.interior || '#ffffff'}
                onChange={(e) =>
                  onUpdate({
                    mugColors: {
                      body: customization.mugColors?.body || '#ffffff',
                      handle: customization.mugColors?.handle || '#ffffff',
                      interior: e.target.value,
                    },
                  })
                }
                className="w-12 h-8 rounded border-2 border-gray-300 cursor-pointer"
              />
              <span className="text-xs font-mono text-gray-500 w-20">
                {customization.mugColors?.interior || '#ffffff'}
              </span>
            </div>
          </div>

          {/* Presets */}
          <div className="pt-2">
            <div className="text-xs text-gray-600 mb-2">Presets:</div>
            <div className="flex gap-2">
              <button
                onClick={() =>
                  onUpdate({
                    mugColors: { body: '#ffffff', handle: '#ffffff', interior: '#ffffff' },
                  })
                }
                className="px-3 py-1.5 text-xs bg-white border-2 border-gray-300 rounded-lg hover:border-purple-400 transition-colors font-medium"
                title="Blanco"
              >
                🤍 Blanco
              </button>
              <button
                onClick={() =>
                  onUpdate({
                    mugColors: { body: '#000000', handle: '#000000', interior: '#ff0000' },
                  })
                }
                className="px-3 py-1.5 text-xs bg-gray-800 text-white border-2 border-gray-800 rounded-lg hover:border-purple-400 transition-colors font-medium"
                title="Negro con interior rojo"
              >
                🖤 Negro
              </button>
              <button
                onClick={() =>
                  onUpdate({
                    mugColors: { body: '#FFB6C1', handle: '#FF69B4', interior: '#FFC0CB' },
                  })
                }
                className="px-3 py-1.5 text-xs bg-pink-200 border-2 border-pink-300 rounded-lg hover:border-purple-400 transition-colors font-medium"
                title="Pastel rosa"
              >
                💗 Pastel
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Tamaño (opcional) */}
      {customization.size !== undefined && (
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-3">Tamaño</label>
          <div className="space-y-2">
            {MUG_SIZES.map((size) => {
              const isSelected = customization.size === size.value;

              return (
                <button
                  key={size.id}
                  onClick={() => onUpdate({ size: size.value as any })}
                  className={`w-full p-3 rounded-xl border-2 transition-all text-left flex items-center justify-between ${
                    isSelected
                      ? 'border-purple-500 bg-purple-50'
                      : 'border-gray-300 hover:border-purple-300'
                  }`}
                >
                  <div>
                    <div className="font-bold text-gray-800">{size.label}</div>
                    <div className="text-xs text-gray-600">
                      {size.dimensions.height}cm × ⌀{size.dimensions.diameter}cm
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {size.priceModifier !== 0 && (
                      <span className="text-sm font-semibold text-purple-600">
                        {size.priceModifier > 0 ? '+' : ''}
                        {formatPrice(size.priceModifier)}
                      </span>
                    )}
                    {isSelected && (
                      <div className="w-6 h-6 bg-purple-500 rounded-full flex items-center justify-center">
                        <Check className="w-4 h-4 text-white" />
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Resumen de precio */}
      <div className="border-t-2 border-gray-200 pt-6">
        <div className="bg-gradient-to-r from-purple-50 to-cyan-50 rounded-xl p-5">
          <div className="flex items-baseline justify-between mb-2">
            <span className="text-gray-600 font-medium">1 por</span>
            <div className="flex items-baseline gap-2">
              <span className="text-gray-500 line-through text-lg">
                {formatPrice(originalPrice)}
              </span>
              <span className="text-3xl font-bold text-purple-600">{formatPrice(totalPrice)}</span>
            </div>
          </div>
          <div className="text-xs text-gray-500 text-right">(IVA incl.)</div>

          {/* Desglose */}
          {totalPriceModifier !== 0 && (
            <div className="mt-4 pt-4 border-t border-purple-200 space-y-1 text-sm">
              <div className="flex justify-between text-gray-600">
                <span>Precio base:</span>
                <span>{formatPrice(basePrice)}</span>
              </div>
              {selectedMaterial && selectedMaterial.priceModifier !== 0 && (
                <div className="flex justify-between text-gray-600">
                  <span>{selectedMaterial.name}:</span>
                  <span>
                    {selectedMaterial.priceModifier > 0 ? '+' : ''}
                    {formatPrice(selectedMaterial.priceModifier)}
                  </span>
                </div>
              )}
              {selectedPrintArea && selectedPrintArea.priceModifier !== 0 && (
                <div className="flex justify-between text-gray-600">
                  <span>{selectedPrintArea.name}:</span>
                  <span>
                    {selectedPrintArea.priceModifier > 0 ? '+' : ''}
                    {formatPrice(selectedPrintArea.priceModifier)}
                  </span>
                </div>
              )}
              {selectedColor && selectedColor.priceModifier !== 0 && (
                <div className="flex justify-between text-gray-600">
                  <span>{selectedColor.name}:</span>
                  <span>
                    {selectedColor.priceModifier > 0 ? '+' : ''}
                    {formatPrice(selectedColor.priceModifier)}
                  </span>
                </div>
              )}
              {selectedSize && selectedSize.priceModifier !== 0 && (
                <div className="flex justify-between text-gray-600">
                  <span>{selectedSize.label}:</span>
                  <span>
                    {selectedSize.priceModifier > 0 ? '+' : ''}
                    {formatPrice(selectedSize.priceModifier)}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
