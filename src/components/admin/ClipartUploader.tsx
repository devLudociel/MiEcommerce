import React, { useState } from 'react';
import { Upload, Plus, Save, Loader, Image as ImageIcon } from 'lucide-react';
import { logger } from '../../lib/logger';
import { notify } from '../../lib/notifications';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { initializeApp } from 'firebase/app';

// Firebase config from env
const firebaseConfig = {
  apiKey: import.meta.env.PUBLIC_FIREBASE_API_KEY,
  authDomain: import.meta.env.PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.PUBLIC_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
const storage = getStorage(app);

const CATEGORIES = [
  'Iconos',
  'Animales',
  'Deportes',
  'Naturaleza',
  'Celebraciones',
  'Profesiones',
  'Emojis',
  'Formas',
  'Marcos',
];

export default function ClipartUploader() {
  const [uploading, setUploading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    category: 'Iconos',
    subcategory: '',
    tags: '',
    isPremium: false,
    format: 'png' as 'png' | 'svg',
    hasTransparency: true,
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);

      // Auto-detect format
      const extension = file.name.split('.').pop()?.toLowerCase();
      if (extension === 'svg') {
        setFormData((prev) => ({ ...prev, format: 'svg' }));
      }
    }
  };

  const uploadImageToStorage = async (file: File): Promise<string> => {
    const timestamp = Date.now();
    const fileName = `cliparts/${timestamp}_${file.name}`;
    const storageRef = ref(storage, fileName);

    await uploadBytes(storageRef, file);
    const downloadURL = await getDownloadURL(storageRef);
    return downloadURL;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!imageFile) {
      notify.error('Por favor, selecciona una imagen');
      return;
    }

    if (!formData.name.trim()) {
      notify.error('El nombre es obligatorio');
      return;
    }

    setUploading(true);

    try {
      // Upload image to Firebase Storage
      logger.info('[ClipartUploader] Uploading image...');
      const imageUrl = await uploadImageToStorage(imageFile);
      logger.info('[ClipartUploader] Image uploaded:', imageUrl);

      // Create clipart via API
      const clipartData = {
        name: formData.name.trim(),
        category: formData.category,
        subcategory: formData.subcategory.trim() || formData.category,
        tags: formData.tags
          .split(',')
          .map((t) => t.trim())
          .filter((t) => t),
        imageUrl,
        thumbnailUrl: imageUrl, // Same for now, could generate thumbnail
        isPremium: formData.isPremium,
        usageCount: 0,
        format: formData.format,
        hasTransparency: formData.hasTransparency,
        dimensions: { width: 512, height: 512 }, // Default, could read from image
        colors: [], // Could extract dominant colors
      };

      const response = await fetch('/api/admin/cliparts/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(clipartData),
      });

      if (response.ok) {
        const data = await response.json();
        notify.success('¡Clipart creado correctamente!');
        logger.info('[ClipartUploader] Clipart created:', data.clipartId);

        // Reset form
        setFormData({
          name: '',
          category: 'Iconos',
          subcategory: '',
          tags: '',
          isPremium: false,
          format: 'png',
          hasTransparency: true,
        });
        setImageFile(null);
        setImagePreview('');
      } else {
        const error = await response.json();
        notify.error(error.error || 'Error al crear clipart');
      }
    } catch (error) {
      logger.error('[ClipartUploader] Error:', error);
      notify.error('Error al subir clipart');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="bg-white rounded-xl border-2 border-purple-200 p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-3 bg-purple-100 rounded-lg">
          <Upload className="w-6 h-6 text-purple-600" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Subir Clipart</h2>
          <p className="text-sm text-gray-600">Añade nuevos cliparts a la galería</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Image Upload */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Imagen <span className="text-red-500">*</span>
          </label>
          <div className="flex items-start gap-4">
            <div className="flex-1">
              <input
                type="file"
                accept="image/png,image/jpeg,image/svg+xml"
                onChange={handleImageChange}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-purple-50 file:text-purple-700 hover:file:bg-purple-100"
              />
              <p className="text-xs text-gray-500 mt-1">PNG, SVG o JPG. Recomendado: 512x512px</p>
            </div>
            {imagePreview && (
              <div className="w-24 h-24 border-2 border-gray-200 rounded-lg overflow-hidden bg-gray-50 flex items-center justify-center">
                <img
                  src={imagePreview}
                  alt="Preview"
                  className="max-w-full max-h-full object-contain"
                />
              </div>
            )}
          </div>
        </div>

        {/* Name */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Nombre <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="Ej: Corazón Rojo"
            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          />
        </div>

        {/* Category & Subcategory */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Categoría</label>
            <select
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            >
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Subcategoría (opcional)
            </label>
            <input
              type="text"
              value={formData.subcategory}
              onChange={(e) => setFormData({ ...formData, subcategory: e.target.value })}
              placeholder="Ej: Amor, Fiesta"
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Tags */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Tags (separados por coma)
          </label>
          <input
            type="text"
            value={formData.tags}
            onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
            placeholder="Ej: corazón, amor, rojo, romántico"
            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          />
          <p className="text-xs text-gray-500 mt-1">
            Los tags ayudan a encontrar el clipart en búsquedas
          </p>
        </div>

        {/* Format & Options */}
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Formato</label>
            <select
              value={formData.format}
              onChange={(e) =>
                setFormData({ ...formData, format: e.target.value as 'png' | 'svg' })
              }
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            >
              <option value="png">PNG</option>
              <option value="svg">SVG</option>
            </select>
          </div>
          <div>
            <label className="flex items-center gap-2 cursor-pointer pt-8">
              <input
                type="checkbox"
                checked={formData.hasTransparency}
                onChange={(e) => setFormData({ ...formData, hasTransparency: e.target.checked })}
                className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
              />
              <span className="text-sm text-gray-700">Tiene transparencia</span>
            </label>
          </div>
          <div>
            <label className="flex items-center gap-2 cursor-pointer pt-8">
              <input
                type="checkbox"
                checked={formData.isPremium}
                onChange={(e) => setFormData({ ...formData, isPremium: e.target.checked })}
                className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
              />
              <span className="text-sm text-gray-700">Premium</span>
            </label>
          </div>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={uploading}
          className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white py-3 px-6 rounded-lg font-bold hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {uploading ? (
            <>
              <Loader className="w-5 h-5 animate-spin" />
              Subiendo...
            </>
          ) : (
            <>
              <Plus className="w-5 h-5" />
              Crear Clipart
            </>
          )}
        </button>
      </form>
    </div>
  );
}
