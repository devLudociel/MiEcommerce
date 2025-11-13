import React, { useState } from 'react';
import { Save, Loader, Check } from 'lucide-react';
import type { ProductCustomization } from '../../types/customization';
import { logger } from '../../lib/logger';
import { notify } from '../../lib/notifications';
import { useAuth } from '../hooks/useAuth';

interface SaveDesignButtonProps {
  productId: string;
  productName: string;
  categoryId: string;
  designData: ProductCustomization;
  previewImage?: string;
  variant?: 'primary' | 'secondary';
}

export default function SaveDesignButton({
  productId,
  productName,
  categoryId,
  designData,
  previewImage,
  variant = 'secondary',
}: SaveDesignButtonProps) {
  const { user, isAuthenticated } = useAuth();
  const [showModal, setShowModal] = useState(false);
  const [designName, setDesignName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = async () => {
    if (!isAuthenticated || !user) {
      notify.error('Debes iniciar sesión para guardar diseños');
      // TODO: Redirect to login
      return;
    }

    if (!designName.trim()) {
      notify.error('Por favor, ingresa un nombre para tu diseño');
      return;
    }

    setIsSaving(true);

    try {
      const response = await fetch('/api/designs/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: designName.trim(),
          productId,
          productName,
          categoryId,
          designData,
          previewImage,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        logger.info('[SaveDesign] Design saved successfully:', data.designId);
        notify.success('¡Diseño guardado correctamente!');
        setSaved(true);
        setTimeout(() => {
          setShowModal(false);
          setSaved(false);
          setDesignName('');
        }, 1500);
      } else {
        const error = await response.json();
        logger.error('[SaveDesign] Error saving design:', error);
        notify.error(error.error || 'Error al guardar el diseño');
      }
    } catch (error) {
      logger.error('[SaveDesign] Error:', error);
      notify.error('Error al guardar el diseño');
    } finally {
      setIsSaving(false);
    }
  };

  const buttonClasses =
    variant === 'primary'
      ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white'
      : 'bg-white text-gray-700 border-2 border-gray-300 hover:border-green-500 hover:text-green-600';

  return (
    <>
      {/* Save Button */}
      <button
        onClick={() => setShowModal(true)}
        className={`flex items-center gap-2 px-4 py-2 rounded-lg hover:shadow-lg transition-all font-medium ${buttonClasses}`}
      >
        <Save className="w-5 h-5" />
        Guardar Diseño
      </button>

      {/* Save Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full overflow-hidden shadow-2xl">
            {/* Header */}
            <div className="bg-gradient-to-r from-green-500 to-emerald-500 p-6">
              <h3 className="text-2xl font-bold text-white mb-2">Guardar tu Diseño</h3>
              <p className="text-green-100">
                Guarda tu diseño para usarlo más tarde o en otros productos
              </p>
            </div>

            {/* Content */}
            <div className="p-6">
              {saved ? (
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Check className="w-8 h-8 text-green-600" />
                  </div>
                  <h4 className="text-xl font-bold text-gray-900 mb-2">¡Diseño Guardado!</h4>
                  <p className="text-gray-600">
                    Puedes encontrar tu diseño en "Mi Cuenta" → "Mis Diseños"
                  </p>
                </div>
              ) : (
                <>
                  {/* Preview */}
                  {previewImage && (
                    <div className="mb-4">
                      <img
                        src={previewImage}
                        alt="Preview del diseño"
                        className="w-full h-48 object-cover rounded-lg border-2 border-gray-200"
                      />
                    </div>
                  )}

                  {/* Name Input */}
                  <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Nombre del diseño <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={designName}
                      onChange={(e) => setDesignName(e.target.value)}
                      placeholder="Ej: Cumpleaños de Ana 2025"
                      maxLength={100}
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-green-500 focus:outline-none"
                      autoFocus
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Usa un nombre descriptivo para encontrarlo fácilmente
                    </p>
                  </div>

                  {/* Product Info */}
                  <div className="mb-6 p-3 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-600">
                      <span className="font-medium">Producto:</span> {productName}
                    </p>
                    <p className="text-sm text-gray-600 mt-1">
                      <span className="font-medium">Campos personalizados:</span>{' '}
                      {designData.values.length}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-3">
                    <button
                      onClick={() => setShowModal(false)}
                      disabled={isSaving}
                      className="flex-1 px-4 py-3 border-2 border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={handleSave}
                      disabled={isSaving || !designName.trim()}
                      className="flex-1 px-4 py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-lg font-bold hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {isSaving ? (
                        <>
                          <Loader className="w-5 h-5 animate-spin" />
                          Guardando...
                        </>
                      ) : (
                        <>
                          <Save className="w-5 h-5" />
                          Guardar
                        </>
                      )}
                    </button>
                  </div>
                </>
              )}
            </div>

            {/* Footer Info */}
            {!saved && (
              <div className="px-6 py-4 bg-green-50 border-t text-center">
                <p className="text-xs text-green-700">
                  💡 Podrás usar este diseño en otros productos similares
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
