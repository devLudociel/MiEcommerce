import { useState, useRef } from 'react';
import { Plus, Trash2, Palette, Upload, Loader } from 'lucide-react';
import type { ColorOption } from '../../../types/customization';
import { storage, auth } from '../../../lib/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { notify } from '../../../lib/notifications';
import { logger } from '../../../lib/logger';

interface ColorSelectorConfigEditorProps {
  colors: ColorOption[];
  onChange: (colors: ColorOption[]) => void;
}

export default function ColorSelectorConfigEditor({
  colors,
  onChange,
}: ColorSelectorConfigEditorProps) {
  const [showAddColor, setShowAddColor] = useState(false);
  const [newColor, setNewColor] = useState<ColorOption>({
    id: '',
    name: '',
    hex: '#000000',
  });
  const [uploadingColorId, setUploadingColorId] = useState<string | null>(null);
  const [uploadingFrontColorId, setUploadingFrontColorId] = useState<string | null>(null);
  const [uploadingBackColorId, setUploadingBackColorId] = useState<string | null>(null);
  const [uploadingNewColor, setUploadingNewColor] = useState(false);
  const [uploadingNewColorFront, setUploadingNewColorFront] = useState(false);
  const [uploadingNewColorBack, setUploadingNewColorBack] = useState(false);
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const frontFileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const backFileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const newColorFileInputRef = useRef<HTMLInputElement>(null);
  const newColorFrontInputRef = useRef<HTMLInputElement>(null);
  const newColorBackInputRef = useRef<HTMLInputElement>(null);

  const handleAddColor = () => {
    if (!newColor.name.trim() || !newColor.hex) {
      alert('Completa todos los campos');
      return;
    }

    const colorId = newColor.name.toLowerCase().replace(/\s+/g, '_');
    onChange([...colors, { ...newColor, id: colorId }]);

    // Reset form
    setNewColor({ id: '', name: '', hex: '#000000' });
    setShowAddColor(false);
  };

  const handleRemoveColor = (colorId: string) => {
    onChange(colors.filter((c) => c.id !== colorId));
  };

  const handleUpdateColor = (colorId: string, updates: Partial<ColorOption>) => {
    onChange(
      colors.map((c) =>
        c.id === colorId
          ? {
              ...c,
              ...updates,
              id: updates.name ? updates.name.toLowerCase().replace(/\s+/g, '_') : c.id,
            }
          : c
      )
    );
  };

  const handleUploadImage = async (colorId: string, file: File) => {
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

    setUploadingColorId(colorId);

    try {
      // Upload to Firebase Storage
      const timestamp = Date.now();
      const fileName = `${timestamp}_${file.name}`;
      const storageRef = ref(storage, `product-previews/${user.uid}/${fileName}`);

      const snapshot = await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(snapshot.ref);

      logger.info('[ColorSelectorConfigEditor] Image uploaded:', downloadURL);

      // Update color with new preview image URL
      handleUpdateColor(colorId, { previewImage: downloadURL });

      notify.success('Imagen subida correctamente');
    } catch (error) {
      logger.error('[ColorSelectorConfigEditor] Error uploading image:', error);
      notify.error('Error al subir la imagen');
    } finally {
      setUploadingColorId(null);
    }
  };

  const handleUploadFrontImage = async (colorId: string, file: File) => {
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

    setUploadingFrontColorId(colorId);

    try {
      const timestamp = Date.now();
      const fileName = `front_${timestamp}_${file.name}`;
      const storageRef = ref(storage, `product-previews/${user.uid}/${fileName}`);

      const snapshot = await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(snapshot.ref);

      logger.info('[ColorSelectorConfigEditor] Front image uploaded:', downloadURL);

      // Update color with front preview image
      const color = colors.find((c) => c.id === colorId);
      handleUpdateColor(colorId, {
        previewImages: {
          ...(color?.previewImages || {}),
          front: downloadURL,
        },
      });

      notify.success('Imagen frontal subida correctamente');
    } catch (error) {
      logger.error('[ColorSelectorConfigEditor] Error uploading front image:', error);
      notify.error('Error al subir la imagen frontal');
    } finally {
      setUploadingFrontColorId(null);
    }
  };

  const handleUploadBackImage = async (colorId: string, file: File) => {
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

    setUploadingBackColorId(colorId);

    try {
      const timestamp = Date.now();
      const fileName = `back_${timestamp}_${file.name}`;
      const storageRef = ref(storage, `product-previews/${user.uid}/${fileName}`);

      const snapshot = await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(snapshot.ref);

      logger.info('[ColorSelectorConfigEditor] Back image uploaded:', downloadURL);

      // Update color with back preview image
      const color = colors.find((c) => c.id === colorId);
      handleUpdateColor(colorId, {
        previewImages: {
          ...(color?.previewImages || {}),
          back: downloadURL,
        },
      });

      notify.success('Imagen trasera subida correctamente');
    } catch (error) {
      logger.error('[ColorSelectorConfigEditor] Error uploading back image:', error);
      notify.error('Error al subir la imagen trasera');
    } finally {
      setUploadingBackColorId(null);
    }
  };

  const handleUploadNewColorImage = async (file: File) => {
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

    setUploadingNewColor(true);

    try {
      const timestamp = Date.now();
      const fileName = `${timestamp}_${file.name}`;
      const storageRef = ref(storage, `product-previews/${user.uid}/${fileName}`);

      const snapshot = await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(snapshot.ref);

      logger.info('[ColorSelectorConfigEditor] New color image uploaded:', downloadURL);

      setNewColor({ ...newColor, previewImage: downloadURL });
      notify.success('Imagen subida correctamente');
    } catch (error) {
      logger.error('[ColorSelectorConfigEditor] Error uploading new color image:', error);
      notify.error('Error al subir la imagen');
    } finally {
      setUploadingNewColor(false);
    }
  };

  const handleUploadNewColorFront = async (file: File) => {
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

    setUploadingNewColorFront(true);

    try {
      const timestamp = Date.now();
      const fileName = `front_${timestamp}_${file.name}`;
      const storageRef = ref(storage, `product-previews/${user.uid}/${fileName}`);

      const snapshot = await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(snapshot.ref);

      logger.info('[ColorSelectorConfigEditor] New color front image uploaded:', downloadURL);

      setNewColor({
        ...newColor,
        previewImages: {
          ...(newColor.previewImages || {}),
          front: downloadURL,
        },
      });
      notify.success('Imagen frontal subida correctamente');
    } catch (error) {
      logger.error('[ColorSelectorConfigEditor] Error uploading new color front image:', error);
      notify.error('Error al subir la imagen frontal');
    } finally {
      setUploadingNewColorFront(false);
    }
  };

  const handleUploadNewColorBack = async (file: File) => {
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

    setUploadingNewColorBack(true);

    try {
      const timestamp = Date.now();
      const fileName = `back_${timestamp}_${file.name}`;
      const storageRef = ref(storage, `product-previews/${user.uid}/${fileName}`);

      const snapshot = await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(snapshot.ref);

      logger.info('[ColorSelectorConfigEditor] New color back image uploaded:', downloadURL);

      setNewColor({
        ...newColor,
        previewImages: {
          ...(newColor.previewImages || {}),
          back: downloadURL,
        },
      });
      notify.success('Imagen trasera subida correctamente');
    } catch (error) {
      logger.error('[ColorSelectorConfigEditor] Error uploading new color back image:', error);
      notify.error('Error al subir la imagen trasera');
    } finally {
      setUploadingNewColorBack(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="font-semibold text-gray-900 flex items-center gap-2">
          <Palette className="w-4 h-4" />
          Colores Disponibles
        </h4>
        <button
          onClick={() => setShowAddColor(!showAddColor)}
          className="text-sm px-3 py-1 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors"
        >
          <Plus className="w-4 h-4 inline mr-1" />
          Agregar Color
        </button>
      </div>

      {/* Colors Grid */}
      <div className="grid grid-cols-1 gap-3">
        {colors.map((color) => (
          <div
            key={color.id}
            className="border-2 border-gray-200 rounded-lg p-4 hover:border-purple-300 transition-colors"
          >
            <div className="flex items-start gap-3 mb-3">
              {/* Color Preview */}
              <div
                className="w-16 h-16 rounded-lg border-2 border-gray-300 flex-shrink-0"
                style={{ backgroundColor: color.hex }}
                title={color.hex}
              />

              {/* Color Info */}
              <div className="flex-1 min-w-0">
                <input
                  type="text"
                  value={color.name}
                  onChange={(e) => handleUpdateColor(color.id, { name: e.target.value })}
                  className="w-full px-3 py-2 text-sm font-medium border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent mb-2"
                  placeholder="Nombre del color"
                />
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={color.hex}
                    onChange={(e) => handleUpdateColor(color.id, { hex: e.target.value })}
                    className="flex-1 px-3 py-2 text-xs font-mono border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="#000000"
                  />
                  <input
                    type="color"
                    value={color.hex}
                    onChange={(e) => handleUpdateColor(color.id, { hex: e.target.value })}
                    className="w-20 h-10 cursor-pointer rounded-lg border border-gray-300"
                  />
                </div>
              </div>

              {/* Remove Button */}
              <button
                onClick={() => handleRemoveColor(color.id)}
                className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                title="Eliminar color"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            </div>

            {/* Preview Images Section */}
            <div className="space-y-2 border-t pt-3">
              <div className="text-xs font-semibold text-gray-700 mb-2">
                👕 Imágenes de Preview (Para textiles)
              </div>

              {/* Front Image */}
              <div className="bg-blue-50 p-2 rounded-lg">
                <label className="block text-xs font-medium text-gray-700 mb-1 flex items-center gap-1">
                  <span>🔵</span>
                  Vista Frontal
                </label>
                <div className="flex gap-1">
                  <input
                    type="text"
                    value={color.previewImages?.front || ''}
                    onChange={(e) =>
                      handleUpdateColor(color.id, {
                        previewImages: {
                          ...(color.previewImages || {}),
                          front: e.target.value,
                        },
                      })
                    }
                    className="flex-1 px-2 py-1 text-xs border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="URL frontal"
                  />
                  <input
                    type="file"
                    ref={(el) => (frontFileInputRefs.current[color.id] = el)}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleUploadFrontImage(color.id, file);
                    }}
                    accept="image/*"
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => frontFileInputRefs.current[color.id]?.click()}
                    disabled={uploadingFrontColorId === color.id}
                    className="px-2 py-1 bg-blue-500 text-white rounded text-xs hover:bg-blue-600 transition-colors disabled:opacity-50 flex items-center gap-1"
                    title="Subir imagen frontal"
                  >
                    {uploadingFrontColorId === color.id ? (
                      <Loader className="w-3 h-3 animate-spin" />
                    ) : (
                      <Upload className="w-3 h-3" />
                    )}
                  </button>
                </div>
              </div>

              {/* Back Image */}
              <div className="bg-red-50 p-2 rounded-lg">
                <label className="block text-xs font-medium text-gray-700 mb-1 flex items-center gap-1">
                  <span>🔴</span>
                  Vista Trasera
                </label>
                <div className="flex gap-1">
                  <input
                    type="text"
                    value={color.previewImages?.back || ''}
                    onChange={(e) =>
                      handleUpdateColor(color.id, {
                        previewImages: {
                          ...(color.previewImages || {}),
                          back: e.target.value,
                        },
                      })
                    }
                    className="flex-1 px-2 py-1 text-xs border border-gray-300 rounded focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    placeholder="URL trasera"
                  />
                  <input
                    type="file"
                    ref={(el) => (backFileInputRefs.current[color.id] = el)}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleUploadBackImage(color.id, file);
                    }}
                    accept="image/*"
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => backFileInputRefs.current[color.id]?.click()}
                    disabled={uploadingBackColorId === color.id}
                    className="px-2 py-1 bg-red-500 text-white rounded text-xs hover:bg-red-600 transition-colors disabled:opacity-50 flex items-center gap-1"
                    title="Subir imagen trasera"
                  >
                    {uploadingBackColorId === color.id ? (
                      <Loader className="w-3 h-3 animate-spin" />
                    ) : (
                      <Upload className="w-3 h-3" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Add Color Form */}
      {showAddColor && (
        <div className="border-2 border-dashed border-purple-300 rounded-lg p-4 bg-purple-50">
          <h5 className="font-semibold text-gray-900 mb-3">Nuevo Color</h5>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nombre del Color
              </label>
              <input
                type="text"
                value={newColor.name}
                onChange={(e) => setNewColor({ ...newColor, name: e.target.value })}
                placeholder="Ej: Rojo Intenso"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Código de Color (Hex)
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newColor.hex}
                  onChange={(e) => setNewColor({ ...newColor, hex: e.target.value })}
                  placeholder="#FF0000"
                  className="flex-1 px-3 py-2 font-mono text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
                <input
                  type="color"
                  value={newColor.hex}
                  onChange={(e) => setNewColor({ ...newColor, hex: e.target.value })}
                  className="w-20 h-10 cursor-pointer rounded-lg border border-gray-300"
                />
              </div>
            </div>

            {/* Preview Images for Textiles */}
            <div className="border-t pt-3">
              <div className="text-sm font-semibold text-gray-700 mb-2">
                👕 Imágenes de Preview (Para textiles - Opcional)
              </div>

              {/* Front Image */}
              <div className="mb-3">
                <label className="block text-xs font-medium text-gray-700 mb-1 flex items-center gap-1">
                  <span>🔵</span>
                  Vista Frontal
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newColor.previewImages?.front || ''}
                    onChange={(e) =>
                      setNewColor({
                        ...newColor,
                        previewImages: {
                          ...(newColor.previewImages || {}),
                          front: e.target.value,
                        },
                      })
                    }
                    placeholder="https://ejemplo.com/camiseta-roja-frente.jpg"
                    className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <input
                    type="file"
                    ref={newColorFrontInputRef}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleUploadNewColorFront(file);
                    }}
                    accept="image/*"
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => newColorFrontInputRef.current?.click()}
                    disabled={uploadingNewColorFront}
                    className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 flex items-center gap-2"
                    title="Subir imagen frontal"
                  >
                    {uploadingNewColorFront ? (
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

              {/* Back Image */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1 flex items-center gap-1">
                  <span>🔴</span>
                  Vista Trasera
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newColor.previewImages?.back || ''}
                    onChange={(e) =>
                      setNewColor({
                        ...newColor,
                        previewImages: {
                          ...(newColor.previewImages || {}),
                          back: e.target.value,
                        },
                      })
                    }
                    placeholder="https://ejemplo.com/camiseta-roja-espalda.jpg"
                    className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  />
                  <input
                    type="file"
                    ref={newColorBackInputRef}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleUploadNewColorBack(file);
                    }}
                    accept="image/*"
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => newColorBackInputRef.current?.click()}
                    disabled={uploadingNewColorBack}
                    className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50 flex items-center gap-2"
                    title="Subir imagen trasera"
                  >
                    {uploadingNewColorBack ? (
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
            </div>

            {/* Preview */}
            <div className="flex items-center gap-3 p-3 bg-white rounded-lg border border-gray-200">
              <div
                className="w-16 h-16 rounded-lg border-2 border-gray-300"
                style={{ backgroundColor: newColor.hex }}
              />
              <div>
                <div className="text-sm font-medium text-gray-900">
                  {newColor.name || 'Nombre del color'}
                </div>
                <div className="text-xs font-mono text-gray-500">{newColor.hex}</div>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleAddColor}
                className="flex-1 px-4 py-2 bg-purple-500 text-white rounded-lg font-semibold hover:bg-purple-600 transition-colors"
              >
                ✓ Agregar Color
              </button>
              <button
                onClick={() => setShowAddColor(false)}
                className="px-4 py-2 border-2 border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {colors.length === 0 && !showAddColor && (
        <div className="text-center py-8 text-gray-500">
          <Palette className="w-12 h-12 mx-auto mb-2 text-gray-400" />
          <p className="text-sm">No hay colores configurados</p>
          <p className="text-xs mt-1">Haz clic en "Agregar Color" para empezar</p>
        </div>
      )}
    </div>
  );
}
