import { useState } from 'react';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage, auth } from '../../lib/firebase';
import { withRetry } from '../../lib/resilience';
import MockupPreview from './MockupPreview';

interface Mockup {
  id: string;
  name: string;
  category: 'apparel' | 'home' | 'accessories';
  image: string;
  color: string;
}

const MOCKUPS: Mockup[] = [
  {
    id: 'shirt-black',
    name: 'Camiseta Negra',
    category: 'apparel',
    image: '👕',
    color: 'bg-black',
  },
  {
    id: 'shirt-white',
    name: 'Camiseta Blanca',
    category: 'apparel',
    image: '👕',
    color: 'bg-white border-2 border-gray-300',
  },
  {
    id: 'hoodie',
    name: 'Sudadera',
    category: 'apparel',
    image: '🧥',
    color: 'bg-gray-800',
  },
  {
    id: 'mug',
    name: 'Taza',
    category: 'home',
    image: '☕',
    color: 'bg-white border-2 border-gray-300',
  },
  {
    id: 'canvas',
    name: 'Cuadro',
    category: 'home',
    image: '🖼️',
    color: 'bg-gray-100 border-4 border-gray-400',
  },
  {
    id: 'cap',
    name: 'Gorra',
    category: 'accessories',
    image: '🧢',
    color: 'bg-blue-600',
  },
];

export default function ImageCustomizer() {
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [selectedMockups, setSelectedMockups] = useState<string[]>([
    'shirt-black',
    'mug',
    'canvas',
  ]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !file.type.startsWith('image/')) {
      setError('Por favor selecciona una imagen válida');
      return;
    }

    try {
      setError(null);
      setUploading(true);

      const user = auth.currentUser;
      if (!user) {
        setError('Debes estar autenticado');
        return;
      }

      // Mostrar preview local inmediatamente
      setSelectedImage(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);

      // Subir a Firebase con retry logic
      const timestamp = Date.now();
      const uniqueName = `${timestamp}-${file.name}`;
      const fileRef = ref(storage, `users/${user.uid}/customizer-designs/${uniqueName}`);

      const downloadUrl = await withRetry(
        async () => {
          await uploadBytes(fileRef, file);
          return await getDownloadURL(fileRef);
        },
        {
          context: 'Upload image to Firebase Storage',
          maxAttempts: 3,
          backoffMs: 1500,
        }
      );

      setImageUrl(downloadUrl);
      console.log('Imagen subida exitosamente:', downloadUrl);
    } catch (err) {
      console.error('Error subiendo imagen:', err);
      setError('Error al subir la imagen');
    } finally {
      setUploading(false);
    }
  };

  const toggleMockup = (mockupId: string) => {
    setSelectedMockups((prev) =>
      prev.includes(mockupId) ? prev.filter((id) => id !== mockupId) : [...prev, mockupId]
    );
  };

  const getMockupsByCategory = (category: 'apparel' | 'home' | 'accessories') => {
    return MOCKUPS.filter((m) => m.category === category);
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-3xl font-bold text-gradient-primary">Personalizador de Diseños</h2>
      </div>

      {/* Sección de carga de imagen */}
      <div className="card p-8 border-2 border-dashed border-cyan-300">
        <div className="text-center">
          <div className="mb-4 text-4xl">🖼️</div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">Sube tu diseño</h3>
          <p className="text-gray-600 mb-6">PNG, JPG o WebP (máximo 10MB)</p>

          <label
            className="btn btn-primary cursor-pointer inline-block"
            style={{ opacity: uploading ? 0.6 : 1, cursor: uploading ? 'not-allowed' : 'pointer' }}
          >
            {uploading ? 'Subiendo...' : 'Seleccionar imagen'}
            <input
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              disabled={uploading}
              className="hidden"
            />
          </label>

          {selectedImage && (
            <p className="text-sm text-cyan-600 mt-4">✓ {selectedImage.name} cargado</p>
          )}

          {error && <p className="text-sm text-red-600 mt-4">✗ {error}</p>}
        </div>
      </div>

      {imagePreview && (
        <>
          {/* Vista previa de la imagen */}
          <div className="card p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Tu Diseño</h3>
            <div className="flex justify-center">
              <img
                src={imagePreview}
                alt="Preview"
                className="max-w-xs max-h-64 rounded-lg shadow-lg object-contain"
              />
            </div>
          </div>

          {/* Selector de mockups */}
          <div className="card p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-6">
              Elige los productos para visualizar
            </h3>

            <div className="space-y-6">
              {/* Ropa */}
              <div>
                <h4 className="text-sm font-semibold text-gray-700 uppercase mb-3">Ropa</h4>
                <div className="grid grid-cols-2 gap-3">
                  {getMockupsByCategory('apparel').map((mockup) => (
                    <button
                      key={mockup.id}
                      onClick={() => toggleMockup(mockup.id)}
                      className={`p-4 rounded-lg border-2 transition-all ${
                        selectedMockups.includes(mockup.id)
                          ? 'border-cyan-500 bg-cyan-50'
                          : 'border-gray-200 bg-white hover:border-gray-300'
                      }`}
                    >
                      <div className="text-2xl mb-2">{mockup.image}</div>
                      <div className="text-sm font-medium text-gray-900">{mockup.name}</div>
                      {selectedMockups.includes(mockup.id) && (
                        <div className="text-xs text-cyan-600 mt-1">✓ Seleccionado</div>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Hogar */}
              <div>
                <h4 className="text-sm font-semibold text-gray-700 uppercase mb-3">Hogar</h4>
                <div className="grid grid-cols-2 gap-3">
                  {getMockupsByCategory('home').map((mockup) => (
                    <button
                      key={mockup.id}
                      onClick={() => toggleMockup(mockup.id)}
                      className={`p-4 rounded-lg border-2 transition-all ${
                        selectedMockups.includes(mockup.id)
                          ? 'border-cyan-500 bg-cyan-50'
                          : 'border-gray-200 bg-white hover:border-gray-300'
                      }`}
                    >
                      <div className="text-2xl mb-2">{mockup.image}</div>
                      <div className="text-sm font-medium text-gray-900">{mockup.name}</div>
                      {selectedMockups.includes(mockup.id) && (
                        <div className="text-xs text-cyan-600 mt-1">✓ Seleccionado</div>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Accesorios */}
              <div>
                <h4 className="text-sm font-semibold text-gray-700 uppercase mb-3">Accesorios</h4>
                <div className="grid grid-cols-2 gap-3">
                  {getMockupsByCategory('accessories').map((mockup) => (
                    <button
                      key={mockup.id}
                      onClick={() => toggleMockup(mockup.id)}
                      className={`p-4 rounded-lg border-2 transition-all ${
                        selectedMockups.includes(mockup.id)
                          ? 'border-cyan-500 bg-cyan-50'
                          : 'border-gray-200 bg-white hover:border-gray-300'
                      }`}
                    >
                      <div className="text-2xl mb-2">{mockup.image}</div>
                      <div className="text-sm font-medium text-gray-900">{mockup.name}</div>
                      {selectedMockups.includes(mockup.id) && (
                        <div className="text-xs text-cyan-600 mt-1">✓ Seleccionado</div>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Grid de mockups */}
          {imageUrl && (
            <div className="card p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-6">Vista Previa</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {MOCKUPS.filter((m) => selectedMockups.includes(m.id)).map((mockup) => (
                  <MockupPreview
                    key={mockup.id}
                    imageUrl={imageUrl}
                    mockupType={
                      mockup.id as
                        | 'shirt-black'
                        | 'shirt-white'
                        | 'hoodie'
                        | 'mug'
                        | 'canvas'
                        | 'cap'
                    }
                    mockupName={mockup.name}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Acciones */}
          <div className="flex gap-4">
            <button className="btn btn-primary flex-1" disabled={!imageUrl || uploading}>
              Guardar Diseño
            </button>
            <button className="btn btn-secondary flex-1" disabled={!imageUrl || uploading}>
              Agregar al Carrito
            </button>
          </div>
        </>
      )}

      {!imagePreview && (
        <div className="text-center py-12 text-gray-500">
          <p>Sube una imagen para empezar a personalizar</p>
        </div>
      )}
    </div>
  );
}
