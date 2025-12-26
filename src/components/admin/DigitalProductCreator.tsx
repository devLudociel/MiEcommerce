import { useState } from 'react';
import {
  Upload,
  Plus,
  Trash2,
  Save,
  Loader,
  FileArchive,
  X,
  Image as ImageIcon,
  CheckCircle,
} from 'lucide-react';
import { logger } from '../../lib/logger';
import { notify } from '../../lib/notifications';
import { storage, auth } from '../../lib/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

interface DigitalFile {
  id: string;
  name: string;
  description: string;
  fileUrl: string;
  fileSize: number;
  fileType: string;
  format: 'image' | 'pdf' | 'zip' | 'other';
}

export default function DigitalProductCreator() {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    basePrice: '',
    tags: '',
    featured: false,
  });

  const [productImages, setProductImages] = useState<string[]>([]);
  const [uploadingPreview, setUploadingPreview] = useState(false);

  const [digitalFiles, setDigitalFiles] = useState<DigitalFile[]>([]);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [creating, setCreating] = useState(false);

  // Upload file to Firebase Storage
  const uploadFileToStorage = async (
    file: File,
    folder: string
  ): Promise<{ url: string; size: number; type: string }> => {
    // Get current user ID
    const currentUser = auth.currentUser;
    if (!currentUser) {
      throw new Error('Debes estar autenticado para subir archivos');
    }

    const timestamp = Date.now();
    // Use userId in path to match existing Firebase Storage rules: folder/{userId}/{filename}
    const fileName = `${folder}/${currentUser.uid}/${timestamp}_${file.name}`;
    const storageRef = ref(storage, fileName);

    await uploadBytes(storageRef, file);
    const downloadURL = await getDownloadURL(storageRef);

    return {
      url: downloadURL,
      size: file.size,
      type: file.type,
    };
  };

  // Upload preview image
  const handlePreviewUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate image
    if (!file.type.startsWith('image/')) {
      notify.error('Solo se permiten imágenes');
      return;
    }

    try {
      setUploadingPreview(true);

      // Upload to Firebase Storage
      const { url } = await uploadFileToStorage(file, 'product-previews');

      setProductImages((prev) => [...prev, url]);
      notify.success('Imagen de preview subida correctamente');
    } catch (error) {
      logger.error('[DigitalProductCreator] Error uploading preview', error);
      notify.error('Error al subir imagen de preview');
    } finally {
      setUploadingPreview(false);
      // Reset input
      e.target.value = '';
    }
  };

  // Upload digital file
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploadingFile(true);

      // Upload to Firebase Storage
      const { url, size, type } = await uploadFileToStorage(file, 'digital-products');

      // Detect format
      let format: 'image' | 'pdf' | 'zip' | 'other' = 'other';
      if (type.startsWith('image/')) {
        format = 'image';
      } else if (type === 'application/pdf') {
        format = 'pdf';
      } else if (type === 'application/zip' || type === 'application/x-zip-compressed') {
        format = 'zip';
      }

      const newFile: DigitalFile = {
        id: `file_${Date.now()}`,
        name: file.name,
        description: '',
        fileUrl: url,
        fileSize: size,
        fileType: type,
        format,
      };

      setDigitalFiles((prev) => [...prev, newFile]);
      notify.success(`Archivo "${file.name}" subido correctamente`);
    } catch (error) {
      logger.error('[DigitalProductCreator] Error uploading file', error);
      notify.error('Error al subir archivo');
    } finally {
      setUploadingFile(false);
      // Reset input
      e.target.value = '';
    }
  };

  const removeFile = (fileId: string) => {
    setDigitalFiles((prev) => prev.filter((f) => f.id !== fileId));
    notify.success('Archivo eliminado');
  };

  const updateFileDescription = (fileId: string, description: string) => {
    setDigitalFiles((prev) => prev.map((f) => (f.id === fileId ? { ...f, description } : f)));
  };

  const removeProductImage = (index: number) => {
    setProductImages((prev) => prev.filter((_, i) => i !== index));
    notify.success('Imagen eliminada');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!formData.name.trim()) {
      notify.error('El nombre es requerido');
      return;
    }

    if (!formData.description.trim()) {
      notify.error('La descripción es requerida');
      return;
    }

    if (!formData.basePrice || Number(formData.basePrice) <= 0) {
      notify.error('El precio debe ser mayor a 0');
      return;
    }

    if (productImages.length === 0) {
      notify.error('Debes agregar al menos una imagen del producto');
      return;
    }

    if (digitalFiles.length === 0) {
      notify.error('Debes subir al menos un archivo descargable');
      return;
    }

    try {
      setCreating(true);

      const tags = formData.tags
        .split(',')
        .map((t) => t.trim())
        .filter((t) => t.length > 0);

      const requestBody = {
        name: formData.name.trim(),
        description: formData.description.trim(),
        basePrice: Number(formData.basePrice),
        images: productImages,
        tags,
        featured: formData.featured,
        digitalFiles: digitalFiles.map((f) => ({
          id: f.id,
          name: f.name,
          description: f.description,
          fileUrl: f.fileUrl,
          fileSize: f.fileSize,
          fileType: f.fileType,
          format: f.format,
        })),
      };

      logger.info('[DigitalProductCreator] Creating product', requestBody);

      const response = await fetch('/api/admin/digital/create-product', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al crear producto');
      }

      const data = await response.json();
      notify.success('Producto digital creado correctamente');

      // Reset form
      setFormData({
        name: '',
        description: '',
        basePrice: '',
        tags: '',
        featured: false,
      });
      setProductImages([]);
      setDigitalFiles([]);
    } catch (error) {
      logger.error('[DigitalProductCreator] Error creating product', error);
      notify.error(error instanceof Error ? error.message : 'Error al crear producto');
    } finally {
      setCreating(false);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Crear Producto Digital</h2>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Product Info */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Nombre del producto *
          </label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Ej: Pack de 100 cliparts de cumpleaños"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Descripción *</label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            rows={4}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Describe el contenido del pack, qué incluye, para qué sirve, etc."
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Precio (€) *</label>
          <input
            type="number"
            step="0.01"
            min="0"
            value={formData.basePrice}
            onChange={(e) => setFormData({ ...formData, basePrice: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="9.99"
          />
        </div>

        {/* Product Images (Preview Images) */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Imágenes del producto * (preview para la tienda)
          </label>
          <p className="text-xs text-gray-500 mb-3">
            Sube imágenes que muestren el contenido del pack. Los clientes verán estas imágenes en
            la tienda.
          </p>

          <label className="flex items-center justify-center w-full px-4 py-6 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-blue-500 transition-colors mb-3">
            <div className="text-center">
              {uploadingPreview ? (
                <>
                  <Loader className="w-8 h-8 mx-auto mb-2 animate-spin text-blue-600" />
                  <p className="text-sm text-gray-600">Subiendo imagen...</p>
                </>
              ) : (
                <>
                  <ImageIcon className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                  <p className="text-sm text-gray-600">Click para subir imagen de preview</p>
                  <p className="text-xs text-gray-500">PNG, JPG, JPEG</p>
                </>
              )}
            </div>
            <input
              type="file"
              onChange={handlePreviewUpload}
              className="hidden"
              disabled={uploadingPreview}
              accept="image/png,image/jpeg,image/jpg"
            />
          </label>

          {productImages.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {productImages.map((url, index) => (
                <div
                  key={index}
                  className="relative group rounded-lg overflow-hidden border border-gray-200"
                >
                  <img
                    src={url}
                    alt={`Preview ${index + 1}`}
                    className="w-full h-32 object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => removeProductImage(index)}
                    className="absolute top-2 right-2 p-1 bg-red-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="w-4 h-4" />
                  </button>
                  <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white text-xs p-1 text-center">
                    Imagen {index + 1}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Tags (separados por coma)
          </label>
          <input
            type="text"
            value={formData.tags}
            onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="cumpleaños, cliparts, decoración, PNG"
          />
        </div>

        <div className="flex items-center">
          <input
            type="checkbox"
            id="featured"
            checked={formData.featured}
            onChange={(e) => setFormData({ ...formData, featured: e.target.checked })}
            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
          />
          <label htmlFor="featured" className="ml-2 text-sm text-gray-700">
            Producto destacado
          </label>
        </div>

        {/* Digital Files */}
        <div className="border-t border-gray-200 pt-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Archivos descargables * (lo que recibe el cliente)
          </label>
          <p className="text-xs text-gray-500 mb-3">
            Sube los archivos que el cliente podrá descargar después de la compra (ZIP, PNG, JPG,
            PDF, SVG)
          </p>

          <div className="mb-4">
            <label className="flex items-center justify-center w-full px-4 py-6 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-blue-500 transition-colors">
              <div className="text-center">
                {uploadingFile ? (
                  <>
                    <Loader className="w-8 h-8 mx-auto mb-2 animate-spin text-blue-600" />
                    <p className="text-sm text-gray-600">Subiendo archivo...</p>
                  </>
                ) : (
                  <>
                    <Upload className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                    <p className="text-sm text-gray-600">Click para subir archivo descargable</p>
                    <p className="text-xs text-gray-500">ZIP, PNG, JPG, PDF, SVG (máx 100MB)</p>
                  </>
                )}
              </div>
              <input
                type="file"
                onChange={handleFileUpload}
                className="hidden"
                disabled={uploadingFile}
                accept=".zip,.png,.jpg,.jpeg,.pdf,.svg"
              />
            </label>
          </div>

          {digitalFiles.length > 0 && (
            <div className="space-y-3">
              {digitalFiles.map((file) => (
                <div key={file.id} className="p-4 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2 flex-1">
                      <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 truncate">{file.name}</p>
                        <p className="text-xs text-gray-500">
                          {formatFileSize(file.fileSize)} • {file.format.toUpperCase()}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeFile(file.id)}
                      className="ml-2 text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <input
                    type="text"
                    value={file.description}
                    onChange={(e) => updateFileDescription(file.id, e.target.value)}
                    placeholder="Descripción del archivo (opcional)"
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Submit Button */}
        <div className="flex items-center justify-end gap-4 pt-6 border-t border-gray-200">
          <button
            type="submit"
            disabled={creating || uploadingFile || uploadingPreview}
            className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {creating ? (
              <>
                <Loader className="w-5 h-5 animate-spin" />
                Creando...
              </>
            ) : (
              <>
                <Save className="w-5 h-5" />
                Crear Producto Digital
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
