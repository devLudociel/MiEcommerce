import { useState, useRef } from 'react';
import { Plus, Trash2, LayoutGrid, Upload, Loader, Image, Eye } from 'lucide-react';
import type { CardOption } from '../../../types/customization';
import { storage, auth } from '../../../lib/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { notify } from '../../../lib/notifications';
import { logger } from '../../../lib/logger';

interface CardSelectorConfigEditorProps {
  options: CardOption[];
  onChange: (options: CardOption[]) => void;
}

export default function CardSelectorConfigEditor({
  options,
  onChange,
}: CardSelectorConfigEditorProps) {
  const [showAddCard, setShowAddCard] = useState(false);
  const [newCard, setNewCard] = useState<CardOption>({
    value: '',
    label: '',
    imageUrl: '',
    previewImage: '',
    icon: '',
    badge: '',
    priceModifier: 0,
    description: '',
  });

  // Upload states for existing cards
  const [uploadingImageCardId, setUploadingImageCardId] = useState<string | null>(null);
  const [uploadingPreviewCardId, setUploadingPreviewCardId] = useState<string | null>(null);

  // Upload states for new card
  const [uploadingNewCardImage, setUploadingNewCardImage] = useState(false);
  const [uploadingNewCardPreview, setUploadingNewCardPreview] = useState(false);

  // File input refs
  const imageInputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const previewInputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const newCardImageInputRef = useRef<HTMLInputElement>(null);
  const newCardPreviewInputRef = useRef<HTMLInputElement>(null);

  const handleAddCard = () => {
    if (!newCard.label.trim()) {
      notify.error('Debes poner un nombre a la opción');
      return;
    }

    const cardValue = newCard.value || newCard.label.toLowerCase().replace(/\s+/g, '_');
    onChange([...options, { ...newCard, value: cardValue }]);

    // Reset form
    setNewCard({
      value: '',
      label: '',
      imageUrl: '',
      previewImage: '',
      icon: '',
      badge: '',
      priceModifier: 0,
      description: '',
    });
    setShowAddCard(false);
    notify.success('Opción agregada correctamente');
  };

  const handleRemoveCard = (cardValue: string) => {
    onChange(options.filter((c) => c.value !== cardValue));
    notify.success('Opción eliminada');
  };

  const handleUpdateCard = (cardValue: string, updates: Partial<CardOption>) => {
    onChange(
      options.map((c) =>
        c.value === cardValue
          ? {
              ...c,
              ...updates,
              value: updates.label ? updates.label.toLowerCase().replace(/\s+/g, '_') : c.value,
            }
          : c
      )
    );
  };

  const handleUploadImage = async (
    cardValue: string,
    file: File,
    type: 'imageUrl' | 'previewImage'
  ) => {
    const user = auth.currentUser;
    if (!user) {
      notify.error('Debes iniciar sesión para subir imágenes');
      return;
    }

    // Validate file type
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      notify.error('Solo se permiten imágenes (JPG, PNG, WEBP)');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      notify.error('La imagen debe pesar menos de 5MB');
      return;
    }

    if (type === 'imageUrl') {
      setUploadingImageCardId(cardValue);
    } else {
      setUploadingPreviewCardId(cardValue);
    }

    try {
      const timestamp = Date.now();
      const prefix = type === 'previewImage' ? 'preview_' : 'thumb_';
      const fileName = `${prefix}${timestamp}_${file.name}`;
      const storageRef = ref(storage, `card-options/${user.uid}/${fileName}`);

      const snapshot = await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(snapshot.ref);

      logger.info(`[CardSelectorConfigEditor] ${type} uploaded:`, downloadURL);

      handleUpdateCard(cardValue, { [type]: downloadURL });
      notify.success(
        type === 'imageUrl'
          ? 'Miniatura subida correctamente'
          : 'Imagen de preview subida correctamente'
      );
    } catch (error) {
      logger.error(`[CardSelectorConfigEditor] Error uploading ${type}:`, error);
      notify.error('Error al subir la imagen');
    } finally {
      if (type === 'imageUrl') {
        setUploadingImageCardId(null);
      } else {
        setUploadingPreviewCardId(null);
      }
    }
  };

  const handleUploadNewCardImage = async (file: File, type: 'imageUrl' | 'previewImage') => {
    const user = auth.currentUser;
    if (!user) {
      notify.error('Debes iniciar sesión para subir imágenes');
      return;
    }

    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      notify.error('Solo se permiten imágenes (JPG, PNG, WEBP)');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      notify.error('La imagen debe pesar menos de 5MB');
      return;
    }

    if (type === 'imageUrl') {
      setUploadingNewCardImage(true);
    } else {
      setUploadingNewCardPreview(true);
    }

    try {
      const timestamp = Date.now();
      const prefix = type === 'previewImage' ? 'preview_' : 'thumb_';
      const fileName = `${prefix}${timestamp}_${file.name}`;
      const storageRef = ref(storage, `card-options/${user.uid}/${fileName}`);

      const snapshot = await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(snapshot.ref);

      logger.info(`[CardSelectorConfigEditor] New card ${type} uploaded:`, downloadURL);

      setNewCard({ ...newCard, [type]: downloadURL });
      notify.success(
        type === 'imageUrl'
          ? 'Miniatura subida correctamente'
          : 'Imagen de preview subida correctamente'
      );
    } catch (error) {
      logger.error(`[CardSelectorConfigEditor] Error uploading new card ${type}:`, error);
      notify.error('Error al subir la imagen');
    } finally {
      if (type === 'imageUrl') {
        setUploadingNewCardImage(false);
      } else {
        setUploadingNewCardPreview(false);
      }
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="font-semibold text-gray-900 flex items-center gap-2">
          <LayoutGrid className="w-4 h-4" />
          Opciones de Temáticas/Cards
        </h4>
        <button
          onClick={() => setShowAddCard(!showAddCard)}
          className="text-sm px-3 py-1 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors"
        >
          <Plus className="w-4 h-4 inline mr-1" />
          Agregar Opción
        </button>
      </div>

      <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-800">
        <strong>💡 Tip:</strong> La <strong>miniatura</strong> es la imagen pequeña que aparece en
        el selector de cards. La <strong>imagen de preview</strong> es la imagen grande que se
        muestra en la vista previa del producto cuando el cliente selecciona esta opción.
      </div>

      {/* Options Grid */}
      <div className="grid grid-cols-1 gap-4">
        {options.map((card) => (
          <div
            key={card.value}
            className="border-2 border-gray-200 rounded-lg p-4 hover:border-purple-300 transition-colors"
          >
            <div className="flex items-start gap-3 mb-3">
              {/* Card Thumbnail Preview */}
              <div className="w-20 h-20 rounded-lg border-2 border-gray-300 bg-gray-100 flex-shrink-0 overflow-hidden">
                {card.imageUrl ? (
                  <img
                    src={card.imageUrl}
                    alt={card.label}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400">
                    <Image className="w-8 h-8" />
                  </div>
                )}
              </div>

              {/* Card Info */}
              <div className="flex-1 min-w-0">
                <input
                  type="text"
                  value={card.label}
                  onChange={(e) => handleUpdateCard(card.value, { label: e.target.value })}
                  className="w-full px-3 py-2 text-sm font-medium border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent mb-2"
                  placeholder="Nombre de la opción (ej: Unicornio)"
                />
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={card.badge || ''}
                    onChange={(e) => handleUpdateCard(card.value, { badge: e.target.value })}
                    className="flex-1 px-3 py-2 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="Badge (ej: Popular)"
                  />
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-gray-500">+€</span>
                    <input
                      type="number"
                      value={card.priceModifier || 0}
                      onChange={(e) =>
                        handleUpdateCard(card.value, {
                          priceModifier: parseFloat(e.target.value) || 0,
                        })
                      }
                      className="w-16 px-2 py-2 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      min="0"
                      step="0.01"
                    />
                  </div>
                </div>
              </div>

              {/* Remove Button */}
              <button
                onClick={() => handleRemoveCard(card.value)}
                className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                title="Eliminar opción"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            </div>

            {/* Images Upload Section */}
            <div className="space-y-3 border-t pt-3">
              {/* Thumbnail Image (imageUrl) */}
              <div className="bg-blue-50 p-3 rounded-lg">
                <label className="block text-xs font-semibold text-gray-700 mb-2 flex items-center gap-1">
                  <Image className="w-4 h-4" />
                  Miniatura (imagen pequeña del selector)
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={card.imageUrl || ''}
                    onChange={(e) => handleUpdateCard(card.value, { imageUrl: e.target.value })}
                    className="flex-1 px-3 py-2 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="URL de la miniatura"
                  />
                  <input
                    type="file"
                    ref={(el) => (imageInputRefs.current[card.value] = el)}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleUploadImage(card.value, file, 'imageUrl');
                    }}
                    accept="image/*"
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => imageInputRefs.current[card.value]?.click()}
                    disabled={uploadingImageCardId === card.value}
                    className="px-3 py-2 bg-blue-500 text-white rounded-lg text-xs hover:bg-blue-600 transition-colors disabled:opacity-50 flex items-center gap-1"
                    title="Subir miniatura"
                  >
                    {uploadingImageCardId === card.value ? (
                      <Loader className="w-4 h-4 animate-spin" />
                    ) : (
                      <Upload className="w-4 h-4" />
                    )}
                    Subir
                  </button>
                </div>
              </div>

              {/* Preview Image (previewImage) */}
              <div className="bg-green-50 p-3 rounded-lg">
                <label className="block text-xs font-semibold text-gray-700 mb-2 flex items-center gap-1">
                  <Eye className="w-4 h-4" />
                  Imagen de Preview (imagen grande del producto)
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={card.previewImage || ''}
                    onChange={(e) => handleUpdateCard(card.value, { previewImage: e.target.value })}
                    className="flex-1 px-3 py-2 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="URL de la imagen de preview"
                  />
                  <input
                    type="file"
                    ref={(el) => (previewInputRefs.current[card.value] = el)}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleUploadImage(card.value, file, 'previewImage');
                    }}
                    accept="image/*"
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => previewInputRefs.current[card.value]?.click()}
                    disabled={uploadingPreviewCardId === card.value}
                    className="px-3 py-2 bg-green-500 text-white rounded-lg text-xs hover:bg-green-600 transition-colors disabled:opacity-50 flex items-center gap-1"
                    title="Subir imagen de preview"
                  >
                    {uploadingPreviewCardId === card.value ? (
                      <Loader className="w-4 h-4 animate-spin" />
                    ) : (
                      <Upload className="w-4 h-4" />
                    )}
                    Subir
                  </button>
                </div>
                {card.previewImage && (
                  <div className="mt-2 flex items-center gap-2">
                    <img
                      src={card.previewImage}
                      alt="Preview"
                      className="w-24 h-24 object-cover rounded border border-green-300"
                    />
                    <span className="text-xs text-green-700">
                      Esta imagen se mostrará en el preview del producto
                    </span>
                  </div>
                )}
              </div>

              {/* Description (optional) */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Descripción (opcional)
                </label>
                <input
                  type="text"
                  value={card.description || ''}
                  onChange={(e) => handleUpdateCard(card.value, { description: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="Descripción breve de esta opción"
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Add Card Form */}
      {showAddCard && (
        <div className="border-2 border-dashed border-purple-300 rounded-lg p-4 bg-purple-50">
          <h5 className="font-semibold text-gray-900 mb-3">Nueva Opción de Temática</h5>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nombre de la Opción *
              </label>
              <input
                type="text"
                value={newCard.label}
                onChange={(e) => setNewCard({ ...newCard, label: e.target.value })}
                placeholder="Ej: Unicornio, Dinosaurio, Princesas..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Badge (opcional)
                </label>
                <input
                  type="text"
                  value={newCard.badge || ''}
                  onChange={(e) => setNewCard({ ...newCard, badge: e.target.value })}
                  placeholder="Ej: Popular, Nuevo"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Precio extra (€)
                </label>
                <input
                  type="number"
                  value={newCard.priceModifier || 0}
                  onChange={(e) =>
                    setNewCard({ ...newCard, priceModifier: parseFloat(e.target.value) || 0 })
                  }
                  min="0"
                  step="0.01"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Thumbnail Upload */}
            <div className="bg-blue-50 p-3 rounded-lg">
              <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-1">
                <Image className="w-4 h-4" />
                Miniatura (imagen pequeña del selector)
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newCard.imageUrl || ''}
                  onChange={(e) => setNewCard({ ...newCard, imageUrl: e.target.value })}
                  placeholder="URL de la miniatura"
                  className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <input
                  type="file"
                  ref={newCardImageInputRef}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleUploadNewCardImage(file, 'imageUrl');
                  }}
                  accept="image/*"
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => newCardImageInputRef.current?.click()}
                  disabled={uploadingNewCardImage}
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 flex items-center gap-2"
                  title="Subir miniatura"
                >
                  {uploadingNewCardImage ? (
                    <>
                      <Loader className="w-4 h-4 animate-spin" />
                      Subiendo...
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4" />
                      Subir
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Preview Image Upload */}
            <div className="bg-green-50 p-3 rounded-lg">
              <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-1">
                <Eye className="w-4 h-4" />
                Imagen de Preview (imagen grande del producto)
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newCard.previewImage || ''}
                  onChange={(e) => setNewCard({ ...newCard, previewImage: e.target.value })}
                  placeholder="URL de la imagen de preview"
                  className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
                <input
                  type="file"
                  ref={newCardPreviewInputRef}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleUploadNewCardImage(file, 'previewImage');
                  }}
                  accept="image/*"
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => newCardPreviewInputRef.current?.click()}
                  disabled={uploadingNewCardPreview}
                  className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors disabled:opacity-50 flex items-center gap-2"
                  title="Subir imagen de preview"
                >
                  {uploadingNewCardPreview ? (
                    <>
                      <Loader className="w-4 h-4 animate-spin" />
                      Subiendo...
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4" />
                      Subir
                    </>
                  )}
                </button>
              </div>
              <p className="mt-1 text-xs text-green-700">
                💡 Esta imagen se mostrará en la vista previa del producto cuando el cliente
                seleccione esta opción
              </p>
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Descripción (opcional)
              </label>
              <input
                type="text"
                value={newCard.description || ''}
                onChange={(e) => setNewCard({ ...newCard, description: e.target.value })}
                placeholder="Descripción breve de esta opción"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>

            {/* Preview */}
            {(newCard.label || newCard.imageUrl) && (
              <div className="flex items-center gap-3 p-3 bg-white rounded-lg border border-gray-200">
                <div className="w-16 h-16 rounded-lg border-2 border-gray-300 bg-gray-100 overflow-hidden">
                  {newCard.imageUrl ? (
                    <img
                      src={newCard.imageUrl}
                      alt={newCard.label}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400">
                      <Image className="w-6 h-6" />
                    </div>
                  )}
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-900">
                    {newCard.label || 'Nombre de la opción'}
                  </div>
                  {newCard.badge && (
                    <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">
                      {newCard.badge}
                    </span>
                  )}
                  {newCard.priceModifier > 0 && (
                    <span className="text-xs text-green-600 ml-2">+{newCard.priceModifier}€</span>
                  )}
                </div>
              </div>
            )}

            <div className="flex gap-2">
              <button
                onClick={handleAddCard}
                className="flex-1 px-4 py-2 bg-purple-500 text-white rounded-lg font-semibold hover:bg-purple-600 transition-colors"
              >
                ✓ Agregar Opción
              </button>
              <button
                onClick={() => setShowAddCard(false)}
                className="px-4 py-2 border-2 border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {options.length === 0 && !showAddCard && (
        <div className="text-center py-8 text-gray-500">
          <LayoutGrid className="w-12 h-12 mx-auto mb-2 text-gray-400" />
          <p className="text-sm">No hay opciones configuradas</p>
          <p className="text-xs mt-1">Haz clic en "Agregar Opción" para empezar</p>
        </div>
      )}
    </div>
  );
}
