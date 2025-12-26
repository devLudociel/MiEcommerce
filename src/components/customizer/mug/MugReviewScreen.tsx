// src/components/customizer/mug/MugReviewScreen.tsx

import React, { useState } from 'react';
import { X, RotateCw } from 'lucide-react';
import type { MugCustomizationData, MugDesignElement } from './types';

interface MugReviewScreenProps {
  customization: MugCustomizationData;
  onConfirm: () => void;
  onBack: () => void;
  productName?: string;
}

export default function MugReviewScreen({
  customization,
  onConfirm,
  onBack,
  productName = 'Taza personalizada',
}: MugReviewScreenProps) {
  const [confirmed, setConfirmed] = useState(false);
  const [activeView, setActiveView] = useState<'front' | 'back'>('front');
  const [rotation, setRotation] = useState(0);

  const isPrint360 = customization.printArea === '360';

  const renderElements = (elements: MugDesignElement[]) => {
    return elements.map((element) => {
      const style: React.CSSProperties = {
        position: 'absolute',
        left: `${element.x}%`,
        top: `${element.y}%`,
        width: `${element.width}%`,
        height: `${element.height}%`,
        transform: `translate(-50%, -50%) rotate(${element.rotation}deg)`,
        zIndex: element.zIndex,
      };

      switch (element.type) {
        case 'text':
          return (
            <div
              key={element.id}
              style={{
                ...style,
                fontFamily: element.fontFamily || 'Arial',
                fontSize: `${element.fontSize || 16}px`,
                color: element.color || '#000000',
                fontWeight: element.bold ? 'bold' : 'normal',
                fontStyle: element.italic ? 'italic' : 'normal',
                textAlign: element.align || 'left',
                display: 'flex',
                alignItems: 'center',
                justifyContent:
                  element.align === 'center'
                    ? 'center'
                    : element.align === 'right'
                      ? 'flex-end'
                      : 'flex-start',
                whiteSpace: 'pre-wrap',
              }}
            >
              {element.text}
            </div>
          );

        case 'image':
        case 'clipart':
          return (
            <div key={element.id} style={style}>
              <img
                src={element.imageUrl || element.imageData}
                alt="Design element"
                style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                draggable={false}
              />
            </div>
          );

        case 'background':
          return (
            <div
              key={element.id}
              style={{
                position: 'absolute',
                inset: 0,
                backgroundColor: element.backgroundColor || 'transparent',
                backgroundImage: element.backgroundPattern
                  ? `url(${element.backgroundPattern})`
                  : undefined,
                backgroundSize: 'cover',
                zIndex: element.zIndex,
              }}
            />
          );

        default:
          return null;
      }
    });
  };

  const handleConfirm = () => {
    if (confirmed) {
      onConfirm();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between z-10">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">Revisa tu diseño</h2>
            <p className="text-sm text-gray-600 mt-1">
              Se imprimirá según aparece en la vista previa. Asegúrate de que todo esté correcto
              antes de continuar.
            </p>
          </div>
          <button
            onClick={onBack}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            title="Cerrar"
          >
            <X className="w-6 h-6 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="grid lg:grid-cols-2 gap-8">
            {/* Preview */}
            <div>
              <div className="bg-gray-100 rounded-xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-gray-800">Vista Previa</h3>
                  <button
                    onClick={() => setRotation((r) => (r + 45) % 360)}
                    className="p-2 bg-white hover:bg-gray-50 rounded-lg transition-colors"
                    title="Rotar para ver"
                  >
                    <RotateCw className="w-5 h-5 text-gray-600" />
                    <span className="sr-only">Arrastra para rotar</span>
                  </button>
                </div>

                {/* Tabs para doble cara */}
                {!isPrint360 && (
                  <div className="flex gap-2 mb-4">
                    <button
                      onClick={() => setActiveView('front')}
                      className={`flex-1 py-2 px-4 rounded-lg font-semibold transition-colors ${
                        activeView === 'front'
                          ? 'bg-white text-purple-600 shadow-sm'
                          : 'bg-transparent text-gray-600 hover:bg-white/50'
                      }`}
                    >
                      Parte delantera
                    </button>
                    <button
                      onClick={() => setActiveView('back')}
                      className={`flex-1 py-2 px-4 rounded-lg font-semibold transition-colors ${
                        activeView === 'back'
                          ? 'bg-white text-purple-600 shadow-sm'
                          : 'bg-transparent text-gray-600 hover:bg-white/50'
                      }`}
                    >
                      Parte trasera
                    </button>
                  </div>
                )}

                {/* Preview Canvas */}
                <div
                  className="relative bg-white rounded-lg shadow-inner overflow-hidden"
                  style={{
                    aspectRatio: isPrint360 ? '21.5 / 8' : '1 / 1',
                    minHeight: '300px',
                  }}
                >
                  <div
                    className="absolute inset-0"
                    style={{
                      transform: `rotate(${rotation}deg)`,
                      transition: 'transform 0.3s ease',
                    }}
                  >
                    {isPrint360
                      ? renderElements(customization.elements || [])
                      : renderElements(
                          activeView === 'front'
                            ? customization.frontElements || []
                            : customization.backElements || []
                        )}
                  </div>
                </div>

                <p className="text-xs text-gray-500 mt-3 text-center italic">Arrastra para rotar</p>
              </div>
            </div>

            {/* Checklist */}
            <div>
              <div className="bg-gradient-to-br from-purple-50 to-cyan-50 rounded-xl p-6">
                <h3 className="font-bold text-gray-800 mb-4 text-lg">Lista de verificación</h3>

                <ul className="space-y-3 mb-6">
                  <li className="flex items-start gap-3">
                    <div className="w-5 h-5 rounded-full bg-purple-500 text-white flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-xs">•</span>
                    </div>
                    <span className="text-gray-700">
                      ¿Son el texto y las imágenes claros y fáciles de leer?
                    </span>
                  </li>
                  <li className="flex items-start gap-3">
                    <div className="w-5 h-5 rounded-full bg-purple-500 text-white flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-xs">•</span>
                    </div>
                    <span className="text-gray-700">
                      ¿Encajan los elementos de diseño en el área de seguridad?
                    </span>
                  </li>
                  <li className="flex items-start gap-3">
                    <div className="w-5 h-5 rounded-full bg-purple-500 text-white flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-xs">•</span>
                    </div>
                    <span className="text-gray-700">¿Llega el fondo hasta los bordes?</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <div className="w-5 h-5 rounded-full bg-purple-500 text-white flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-xs">•</span>
                    </div>
                    <span className="text-gray-700">¿Está todo bien escrito?</span>
                  </li>
                </ul>

                <div className="bg-white rounded-lg p-4 mb-6">
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={confirmed}
                      onChange={(e) => setConfirmed(e.target.checked)}
                      className="w-5 h-5 text-purple-600 rounded border-gray-300 focus:ring-purple-500 mt-0.5 flex-shrink-0"
                    />
                    <span className="text-gray-700 font-medium">
                      He comprobado mi diseño y lo apruebo.
                    </span>
                  </label>
                </div>

                <div className="space-y-3">
                  <button
                    onClick={handleConfirm}
                    disabled={!confirmed}
                    className="w-full bg-gradient-to-r from-purple-500 to-cyan-500 text-white py-4 rounded-xl font-bold hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-none"
                  >
                    Continuar
                  </button>
                  <button
                    onClick={onBack}
                    className="w-full bg-white text-gray-700 py-4 rounded-xl font-bold border-2 border-gray-300 hover:border-gray-400 hover:bg-gray-50 transition-all"
                  >
                    Modificar mi diseño
                  </button>
                </div>
              </div>

              {/* Product Info */}
              <div className="mt-4 bg-white rounded-xl p-4 border border-gray-200">
                <h4 className="font-semibold text-gray-800 mb-2">{productName}</h4>
                <div className="text-sm text-gray-600 space-y-1">
                  <p>Material: {customization.material === 'magic' ? 'Mágica' : 'Estándar'}</p>
                  <p>Área: {customization.printArea === '360' ? 'Impresión 360°' : 'Doble cara'}</p>
                  {customization.size && (
                    <p>
                      Tamaño:{' '}
                      {customization.size === 'small'
                        ? 'Pequeña'
                        : customization.size === 'medium'
                          ? 'Mediana'
                          : 'Grande'}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
