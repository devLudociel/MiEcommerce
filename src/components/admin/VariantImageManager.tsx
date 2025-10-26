// src/components/admin/VariantImageManager.tsx
import { useState, useEffect } from 'react';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { storage } from '../../lib/firebase';

type ProductType = 'camisetas' | 'cuadros' | 'cajas';

interface Variant {
  key: string;
  name: string;
  emoji: string;
}

const VARIANTS: Record<ProductType, Variant[]> = {
  camisetas: [
    { key: 'blanco', name: 'Blanco', emoji: '⚪' },
    { key: 'negro', name: 'Negro', emoji: '⚫' },
    { key: 'amarillo', name: 'Amarillo', emoji: '🟡' },
    { key: 'rojo', name: 'Rojo', emoji: '🔴' },
    { key: 'azul', name: 'Azul', emoji: '🔵' },
    { key: 'verde', name: 'Verde', emoji: '🟢' },
    { key: 'rosa', name: 'Rosa', emoji: '🌸' },
    { key: 'gris', name: 'Gris', emoji: '⚫' },
  ],
  cuadros: [
    { key: 'flores-rosa', name: 'Flores Rosas', emoji: '🌸' },
    { key: 'flores-rojo', name: 'Flores Rojas', emoji: '🌹' },
    { key: 'flores-morado', name: 'Flores Moradas', emoji: '💜' },
    { key: 'flores-amarillo', name: 'Flores Amarillas', emoji: '🌼' },
    { key: 'flores-blanco', name: 'Flores Blancas', emoji: '🤍' },
    { key: 'flores-azul', name: 'Flores Azules', emoji: '💙' },
    { key: 'flores-naranja', name: 'Flores Naranjas', emoji: '🧡' },
  ],
  cajas: [
    { key: 'azul', name: 'Azul', emoji: '💙' },
    { key: 'rosa', name: 'Rosa', emoji: '💗' },
    { key: 'dorado', name: 'Dorado', emoji: '⭐' },
    { key: 'plata', name: 'Plata', emoji: '⚪' },
    { key: 'negro', name: 'Negro', emoji: '🖤' },
    { key: 'blanco', name: 'Blanco', emoji: '🤍' },
    { key: 'verde', name: 'Verde', emoji: '💚' },
    { key: 'morado', name: 'Morado', emoji: '💜' },
  ],
};

export default function VariantImageManager() {
  const [selectedType, setSelectedType] = useState<ProductType>('camisetas');
  const [uploadingVariant, setUploadingVariant] = useState<string | null>(null);
  const [variantImages, setVariantImages] = useState<Record<string, string | null>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Cargar imágenes existentes al cambiar el tipo
  useEffect(() => {
    loadExistingImages();
  }, [selectedType]);

  async function loadExistingImages() {
    setLoading(true);
    const images: Record<string, string | null> = {};

    for (const variant of VARIANTS[selectedType]) {
      try {
        // 🔄 CAMBIO: productos/ → variants/
        const imageRef = ref(storage, `variants/${selectedType}/${variant.key}/preview.jpg`);
        const url = await getDownloadURL(imageRef);
        images[variant.key] = url;
      } catch (error) {
        // No existe la imagen, no pasa nada
        images[variant.key] = null;
      }
    }

    setVariantImages(images);
    setLoading(false);
  }

  async function handleUpload(variantKey: string, file: File) {
    try {
      setError(null);
      setSuccess(null);
      setUploadingVariant(variantKey);

      // Validar que sea imagen
      if (!file.type.startsWith('image/')) {
        throw new Error('El archivo debe ser una imagen (JPG, PNG, WEBP)');
      }

      // Validar tamaño (máx 5MB)
      if (file.size > 5 * 1024 * 1024) {
        throw new Error('La imagen no debe superar los 5MB');
      }

      // 🔄 CAMBIO: productos/ → variants/
      const storagePath = `variants/${selectedType}/${variantKey}/preview.jpg`;
      const imageRef = ref(storage, storagePath);

      await uploadBytes(imageRef, file, {
        contentType: file.type,
        customMetadata: {
          uploadedAt: new Date().toISOString(),
        },
      });

      // Obtener URL
      const url = await getDownloadURL(imageRef);

      // Actualizar estado
      setVariantImages((prev) => ({
        ...prev,
        [variantKey]: url,
      }));

      const variantName = VARIANTS[selectedType].find((v) => v.key === variantKey)?.name;
      setSuccess(`✅ Imagen de "${variantName}" subida correctamente`);
    } catch (err: any) {
      console.error('Error subiendo imagen:', err);
      setError(`Error: ${err.message}`);
    } finally {
      setUploadingVariant(null);
    }
  }

  async function handleDelete(variantKey: string) {
    if (
      !confirm(
        `¿Eliminar la imagen de ${VARIANTS[selectedType].find((v) => v.key === variantKey)?.name}?`
      )
    ) {
      return;
    }

    try {
      setError(null);
      setSuccess(null);
      setLoading(true);

      // 🔄 CAMBIO: productos/ → variants/
      const storagePath = `variants/${selectedType}/${variantKey}/preview.jpg`;
      const imageRef = ref(storage, storagePath);

      await deleteObject(imageRef);

      // Actualizar estado
      setVariantImages((prev) => ({
        ...prev,
        [variantKey]: null,
      }));

      const variantName = VARIANTS[selectedType].find((v) => v.key === variantKey)?.name;
      setSuccess(`✅ Imagen de "${variantName}" eliminada correctamente`);
    } catch (err: any) {
      console.error('Error eliminando imagen:', err);
      setError(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }

  const variants = VARIANTS[selectedType];
  const uploadedCount = Object.values(variantImages).filter(Boolean).length;
  const totalCount = variants.length;

  return (
    <div
      style={{
        background: 'white',
        borderRadius: '16px',
        padding: '24px',
        boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
        border: '2px solid #e5e7eb',
      }}
    >
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <h2
          style={{
            fontSize: '24px',
            fontWeight: 'bold',
            color: '#1f2937',
            marginBottom: '8px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
          }}
        >
          🎨 Gestor de Imágenes de Personalización
        </h2>
        <p style={{ color: '#6b7280', fontSize: '14px' }}>
          Sube y gestiona las imágenes de variantes para el personalizador
        </p>
        <div
          style={{
            marginTop: '12px',
            padding: '12px',
            background: '#dbeafe',
            border: '2px solid #3b82f6',
            borderRadius: '8px',
            fontSize: '13px',
            color: '#1e40af',
          }}
        >
          📍 <strong>Ruta de Storage:</strong>{' '}
          <code style={{ background: 'white', padding: '2px 6px', borderRadius: '4px' }}>
            variants/{selectedType}/[variante]/preview.jpg
          </code>
        </div>
      </div>

      {/* Selector de tipo */}
      <div style={{ marginBottom: '24px' }}>
        <label
          style={{
            display: 'block',
            fontWeight: 'bold',
            color: '#374151',
            marginBottom: '12px',
            fontSize: '16px',
          }}
        >
          Selecciona el tipo de producto:
        </label>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '12px',
          }}
        >
          {(['camisetas', 'cuadros', 'cajas'] as ProductType[]).map((type) => (
            <button
              key={type}
              onClick={() => setSelectedType(type)}
              style={{
                padding: '16px',
                borderRadius: '12px',
                border: selectedType === type ? '3px solid #8b5cf6' : '2px solid #d1d5db',
                background: selectedType === type ? '#f5f3ff' : 'white',
                cursor: 'pointer',
                transition: 'all 0.2s',
                fontWeight: selectedType === type ? 'bold' : 'normal',
                fontSize: '16px',
              }}
            >
              {type === 'camisetas' && '👕'}
              {type === 'cuadros' && '🖼️'}
              {type === 'cajas' && '📦'} {type.charAt(0).toUpperCase() + type.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Progress bar */}
      <div
        style={{
          background: '#f3f4f6',
          borderRadius: '12px',
          padding: '16px',
          marginBottom: '24px',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '8px',
          }}
        >
          <span style={{ fontWeight: 'bold', color: '#374151' }}>
            Progreso: {uploadedCount} / {totalCount}
          </span>
          <span
            style={{
              fontSize: '14px',
              color: uploadedCount === totalCount ? '#10b981' : '#f59e0b',
              fontWeight: 'bold',
            }}
          >
            {uploadedCount === totalCount ? '✅ Completo' : '⚠️ Incompleto'}
          </span>
        </div>
        <div
          style={{
            width: '100%',
            height: '8px',
            background: '#e5e7eb',
            borderRadius: '999px',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              width: `${(uploadedCount / totalCount) * 100}%`,
              height: '100%',
              background: 'linear-gradient(90deg, #8b5cf6, #ec4899)',
              transition: 'width 0.5s ease',
            }}
          />
        </div>
      </div>

      {/* Mensajes */}
      {error && (
        <div
          style={{
            background: '#fee2e2',
            border: '2px solid #ef4444',
            color: '#991b1b',
            padding: '12px',
            borderRadius: '8px',
            marginBottom: '16px',
            fontWeight: '500',
          }}
        >
          ❌ {error}
        </div>
      )}

      {success && (
        <div
          style={{
            background: '#d1fae5',
            border: '2px solid #10b981',
            color: '#065f46',
            padding: '12px',
            borderRadius: '8px',
            marginBottom: '16px',
            fontWeight: '500',
          }}
        >
          {success}
        </div>
      )}

      {/* Grid de variantes */}
      {loading && !uploadingVariant ? (
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <div
            style={{
              fontSize: '48px',
              marginBottom: '16px',
              animation: 'spin 1s linear infinite',
            }}
          >
            ⏳
          </div>
          <p style={{ color: '#6b7280' }}>Cargando imágenes existentes...</p>
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
            gap: '16px',
          }}
        >
          {variants.map((variant) => {
            const hasImage = !!variantImages[variant.key];
            const isUploading = uploadingVariant === variant.key;

            return (
              <div
                key={variant.key}
                style={{
                  border: hasImage ? '3px solid #10b981' : '2px dashed #d1d5db',
                  borderRadius: '12px',
                  padding: '16px',
                  background: hasImage ? '#ecfdf5' : 'white',
                  transition: 'all 0.3s',
                }}
              >
                {/* Header */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    marginBottom: '12px',
                  }}
                >
                  <span style={{ fontSize: '24px' }}>{variant.emoji}</span>
                  <span
                    style={{
                      fontWeight: 'bold',
                      fontSize: '14px',
                      color: '#374151',
                    }}
                  >
                    {variant.name}
                  </span>
                  {hasImage && (
                    <span
                      style={{
                        marginLeft: 'auto',
                        fontSize: '20px',
                      }}
                    >
                      ✅
                    </span>
                  )}
                </div>

                {/* Imagen preview */}
                <div
                  style={{
                    width: '100%',
                    aspectRatio: '1',
                    background: '#f3f4f6',
                    borderRadius: '8px',
                    marginBottom: '12px',
                    overflow: 'hidden',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {isUploading ? (
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '32px', marginBottom: '8px' }}>⏳</div>
                      <div style={{ fontSize: '12px', color: '#6b7280' }}>Subiendo...</div>
                    </div>
                  ) : hasImage ? (
                    <img
                      src={variantImages[variant.key]!}
                      alt={variant.name}
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                      }}
                    />
                  ) : (
                    <div style={{ textAlign: 'center', color: '#9ca3af' }}>
                      <div style={{ fontSize: '32px', marginBottom: '8px' }}>📷</div>
                      <div style={{ fontSize: '12px' }}>Sin imagen</div>
                    </div>
                  )}
                </div>

                {/* Botones */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label
                    style={{
                      width: '100%',
                      padding: '10px',
                      background: hasImage ? '#f59e0b' : '#8b5cf6',
                      color: 'white',
                      borderRadius: '8px',
                      textAlign: 'center',
                      cursor: 'pointer',
                      fontWeight: 'bold',
                      fontSize: '14px',
                      transition: 'all 0.2s',
                    }}
                  >
                    {hasImage ? '🔄 Reemplazar' : '📤 Subir'}
                    <input
                      type="file"
                      accept="image/*"
                      style={{ display: 'none' }}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleUpload(variant.key, file);
                      }}
                      disabled={isUploading}
                    />
                  </label>

                  {hasImage && (
                    <button
                      onClick={() => handleDelete(variant.key)}
                      disabled={isUploading}
                      style={{
                        width: '100%',
                        padding: '10px',
                        background: '#ef4444',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        fontWeight: 'bold',
                        fontSize: '14px',
                        transition: 'all 0.2s',
                      }}
                    >
                      🗑️ Eliminar
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Footer con info */}
      <div
        style={{
          marginTop: '24px',
          padding: '16px',
          background: '#fffbeb',
          border: '2px solid #fbbf24',
          borderRadius: '12px',
          fontSize: '14px',
          color: '#92400e',
        }}
      >
        <strong>💡 Consejo:</strong> Las imágenes deben ser de buena calidad (mínimo 800x800px) para
        que se vean bien en el personalizador. Los formatos aceptados son JPG, PNG y WEBP (máximo
        5MB por imagen).
      </div>
    </div>
  );
}
