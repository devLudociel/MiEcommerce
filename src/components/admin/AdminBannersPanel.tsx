// src/components/admin/AdminBannersPanel.tsx
// Panel de administración para banners del carrusel hero

import React, { useState, useEffect, useRef } from 'react';
import {
  Plus,
  Edit2,
  Trash2,
  Eye,
  EyeOff,
  ChevronUp,
  ChevronDown,
  Save,
  X,
  Upload,
  Image as ImageIcon,
  Link,
  Palette,
  GripVertical,
  AlertCircle,
  CheckCircle,
  Loader2,
  ExternalLink,
  RefreshCw,
} from 'lucide-react';
import {
  type HeroBanner,
  type HeroBannerInput,
  type AccentColor,
  subscribeToBanners,
  createBanner,
  updateBanner,
  deleteBanner,
  toggleBannerActive,
  moveBannerUp,
  moveBannerDown,
  uploadBannerImage,
  getNextOrder,
  migrateDefaultBanners,
} from '../../lib/heroBanners';

// ============================================================================
// ACCENT COLOR OPTIONS
// ============================================================================

const ACCENT_COLORS: { value: AccentColor; label: string; preview: string }[] = [
  { value: 'cyan', label: 'Cyan', preview: 'bg-cyan-500' },
  { value: 'magenta', label: 'Magenta', preview: 'bg-pink-500' },
  { value: 'yellow', label: 'Amarillo', preview: 'bg-yellow-500' },
  {
    value: 'rainbow',
    label: 'Arcoíris',
    preview: 'bg-gradient-to-r from-cyan-500 via-pink-500 to-yellow-500',
  },
];

// ============================================================================
// COMPONENT
// ============================================================================

export default function AdminBannersPanel() {
  const [banners, setBanners] = useState<HeroBanner[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingBanner, setEditingBanner] = useState<HeroBanner | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form state
  const [formData, setFormData] = useState<Omit<HeroBannerInput, 'order'>>({
    title: '',
    subtitle: '',
    description: '',
    ctaPrimaryText: '',
    ctaPrimaryUrl: '',
    ctaSecondaryText: '',
    ctaSecondaryUrl: '',
    backgroundImage: '',
    accentColor: 'cyan',
    active: true,
  });

  // ============================================================================
  // EFFECTS
  // ============================================================================

  useEffect(() => {
    const unsubscribe = subscribeToBanners((loadedBanners) => {
      setBanners(loadedBanners);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Auto-clear messages
  useEffect(() => {
    if (error || success) {
      const timer = setTimeout(() => {
        setError(null);
        setSuccess(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [error, success]);

  // ============================================================================
  // FORM HANDLERS
  // ============================================================================

  const resetForm = () => {
    setFormData({
      title: '',
      subtitle: '',
      description: '',
      ctaPrimaryText: '',
      ctaPrimaryUrl: '',
      ctaSecondaryText: '',
      ctaSecondaryUrl: '',
      backgroundImage: '',
      accentColor: 'cyan',
      active: true,
    });
  };

  const handleCreate = () => {
    resetForm();
    setIsCreating(true);
    setEditingBanner(null);
  };

  const handleEdit = (banner: HeroBanner) => {
    setFormData({
      title: banner.title,
      subtitle: banner.subtitle,
      description: banner.description,
      ctaPrimaryText: banner.ctaPrimaryText,
      ctaPrimaryUrl: banner.ctaPrimaryUrl,
      ctaSecondaryText: banner.ctaSecondaryText,
      ctaSecondaryUrl: banner.ctaSecondaryUrl,
      backgroundImage: banner.backgroundImage,
      accentColor: banner.accentColor,
      active: banner.active,
    });
    setEditingBanner(banner);
    setIsCreating(false);
  };

  const handleCancel = () => {
    setEditingBanner(null);
    setIsCreating(false);
    resetForm();
  };

  const handleSave = async () => {
    if (!formData.title || !formData.backgroundImage) {
      setError('El título y la imagen de fondo son obligatorios');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      if (editingBanner) {
        await updateBanner(editingBanner.id, formData);
        setSuccess('Banner actualizado correctamente');
      } else {
        const nextOrder = await getNextOrder();
        await createBanner({ ...formData, order: nextOrder });
        setSuccess('Banner creado correctamente');
      }
      handleCancel();
    } catch (err) {
      setError('Error al guardar el banner');
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Estás seguro de eliminar este banner?')) return;

    try {
      await deleteBanner(id);
      setSuccess('Banner eliminado correctamente');
    } catch (err) {
      setError('Error al eliminar el banner');
      console.error(err);
    }
  };

  const handleToggleActive = async (banner: HeroBanner) => {
    try {
      await toggleBannerActive(banner.id, !banner.active);
    } catch (err) {
      setError('Error al cambiar estado del banner');
      console.error(err);
    }
  };

  const handleMoveUp = async (bannerId: string) => {
    try {
      await moveBannerUp(bannerId);
    } catch (err) {
      setError('Error al reordenar');
      console.error(err);
    }
  };

  const handleMoveDown = async (bannerId: string) => {
    try {
      await moveBannerDown(bannerId);
    } catch (err) {
      setError('Error al reordenar');
      console.error(err);
    }
  };

  // ============================================================================
  // IMAGE UPLOAD
  // ============================================================================

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Por favor selecciona una imagen válida');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('La imagen no puede superar 5MB');
      return;
    }

    setUploadingImage(true);
    setError(null);

    try {
      const url = await uploadBannerImage(file);
      setFormData((prev) => ({ ...prev, backgroundImage: url }));
      setSuccess('Imagen subida correctamente');
    } catch (err) {
      setError('Error al subir la imagen');
      console.error(err);
    } finally {
      setUploadingImage(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // ============================================================================
  // MIGRATION
  // ============================================================================

  const handleMigrate = async () => {
    if (banners.length > 0) {
      if (
        !confirm('Ya existen banners. ¿Quieres añadir los banners por defecto de todas formas?')
      ) {
        return;
      }
    }

    setLoading(true);
    try {
      await migrateDefaultBanners();
      setSuccess('Banners por defecto añadidos correctamente');
    } catch (err) {
      setError('Error al migrar banners');
      console.error(err);
    }
  };

  // ============================================================================
  // RENDER
  // ============================================================================

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex items-center gap-3 text-gray-600">
          <Loader2 className="w-6 h-6 animate-spin" />
          <span>Cargando banners...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Banners del Carrusel</h1>
            <p className="text-gray-600 mt-1">
              Gestiona los banners que aparecen en el carrusel de la página principal
            </p>
          </div>
          <div className="flex gap-2">
            {banners.length === 0 && (
              <button
                onClick={handleMigrate}
                className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                Cargar Por Defecto
              </button>
            )}
            <button
              onClick={handleCreate}
              className="flex items-center gap-2 px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Nuevo Banner
            </button>
          </div>
        </div>

        {/* Messages */}
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3 text-red-700">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}
        {success && (
          <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-3 text-green-700">
            <CheckCircle className="w-5 h-5 flex-shrink-0" />
            <span>{success}</span>
          </div>
        )}

        {/* Form (Create/Edit) */}
        {(isCreating || editingBanner) && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-6 overflow-hidden">
            <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">
                {editingBanner ? 'Editar Banner' : 'Nuevo Banner'}
              </h2>
            </div>

            <div className="p-6 space-y-6">
              {/* Image Preview & Upload */}
              <div className="space-y-3">
                <label className="block text-sm font-medium text-gray-700">
                  <ImageIcon className="w-4 h-4 inline mr-2" />
                  Imagen de Fondo
                </label>
                {formData.backgroundImage ? (
                  <div className="relative rounded-lg overflow-hidden h-48 bg-gray-100">
                    <img
                      src={formData.backgroundImage}
                      alt="Preview"
                      className="w-full h-full object-cover"
                    />
                    <button
                      onClick={() => setFormData((prev) => ({ ...prev, backgroundImage: '' }))}
                      className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-full hover:bg-red-600"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-cyan-500 transition-colors">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                      id="banner-image-upload"
                    />
                    <label
                      htmlFor="banner-image-upload"
                      className="cursor-pointer flex flex-col items-center gap-3"
                    >
                      {uploadingImage ? (
                        <Loader2 className="w-10 h-10 text-cyan-500 animate-spin" />
                      ) : (
                        <Upload className="w-10 h-10 text-gray-400" />
                      )}
                      <span className="text-gray-600">
                        {uploadingImage ? 'Subiendo...' : 'Haz clic para subir una imagen'}
                      </span>
                      <span className="text-xs text-gray-400">
                        PNG, JPG hasta 5MB (Recomendado: 1920x1080)
                      </span>
                    </label>
                  </div>
                )}
                {/* URL option */}
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-500">o usa una URL:</span>
                  <input
                    type="url"
                    value={formData.backgroundImage}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, backgroundImage: e.target.value }))
                    }
                    placeholder="https://..."
                    className="flex-1 px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                  />
                </div>
              </div>

              {/* Text Content */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Título *</label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
                    placeholder="Ej: Tecnología del Futuro"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Subtítulo</label>
                  <input
                    type="text"
                    value={formData.subtitle}
                    onChange={(e) => setFormData((prev) => ({ ...prev, subtitle: e.target.value }))}
                    placeholder="Ej: Nueva Colección 2025"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
                <textarea
                  value={formData.description}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, description: e.target.value }))
                  }
                  placeholder="Ej: Descubre los productos más innovadores..."
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                />
              </div>

              {/* CTA Buttons */}
              <div className="space-y-4">
                <h3 className="text-sm font-medium text-gray-700 flex items-center gap-2">
                  <Link className="w-4 h-4" />
                  Botones de Acción
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2 p-4 bg-gray-50 rounded-lg">
                    <span className="text-xs font-medium text-gray-500 uppercase">
                      Botón Principal
                    </span>
                    <input
                      type="text"
                      value={formData.ctaPrimaryText}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, ctaPrimaryText: e.target.value }))
                      }
                      placeholder="Texto del botón"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                    />
                    <input
                      type="text"
                      value={formData.ctaPrimaryUrl}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, ctaPrimaryUrl: e.target.value }))
                      }
                      placeholder="URL (ej: /productos)"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                    />
                  </div>
                  <div className="space-y-2 p-4 bg-gray-50 rounded-lg">
                    <span className="text-xs font-medium text-gray-500 uppercase">
                      Botón Secundario
                    </span>
                    <input
                      type="text"
                      value={formData.ctaSecondaryText}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, ctaSecondaryText: e.target.value }))
                      }
                      placeholder="Texto del botón"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                    />
                    <input
                      type="text"
                      value={formData.ctaSecondaryUrl}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, ctaSecondaryUrl: e.target.value }))
                      }
                      placeholder="URL (ej: /como-funciona)"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                    />
                  </div>
                </div>
              </div>

              {/* Accent Color */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                  <Palette className="w-4 h-4" />
                  Color de Acento
                </label>
                <div className="flex flex-wrap gap-3">
                  {ACCENT_COLORS.map((color) => (
                    <button
                      key={color.value}
                      type="button"
                      onClick={() => setFormData((prev) => ({ ...prev, accentColor: color.value }))}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg border-2 transition-all ${
                        formData.accentColor === color.value
                          ? 'border-gray-900 bg-gray-100'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className={`w-5 h-5 rounded-full ${color.preview}`} />
                      <span className="text-sm">{color.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Active Toggle */}
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setFormData((prev) => ({ ...prev, active: !prev.active }))}
                  className={`relative w-12 h-6 rounded-full transition-colors ${
                    formData.active ? 'bg-green-500' : 'bg-gray-300'
                  }`}
                >
                  <span
                    className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                      formData.active ? 'right-1' : 'left-1'
                    }`}
                  />
                </button>
                <span className="text-sm text-gray-700">
                  {formData.active ? 'Activo (visible en la web)' : 'Inactivo (oculto)'}
                </span>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                <button
                  onClick={handleCancel}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex items-center gap-2 px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 transition-colors disabled:opacity-50"
                >
                  {saving ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  {saving ? 'Guardando...' : 'Guardar'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Banners List */}
        <div className="space-y-4">
          {banners.length === 0 ? (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
              <ImageIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No hay banners</h3>
              <p className="text-gray-500 mb-4">
                Crea tu primer banner para el carrusel de la página principal
              </p>
              <button
                onClick={handleCreate}
                className="inline-flex items-center gap-2 px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Crear Banner
              </button>
            </div>
          ) : (
            banners.map((banner, index) => (
              <div
                key={banner.id}
                className={`bg-white rounded-xl shadow-sm border overflow-hidden transition-all ${
                  banner.active ? 'border-gray-200' : 'border-gray-200 opacity-60'
                }`}
              >
                <div className="flex flex-col md:flex-row">
                  {/* Image Preview */}
                  <div className="md:w-64 h-40 md:h-auto relative flex-shrink-0">
                    <img
                      src={banner.backgroundImage}
                      alt={banner.title}
                      className="w-full h-full object-cover"
                    />
                    {!banner.active && (
                      <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                        <span className="text-white text-sm font-medium px-3 py-1 bg-gray-800 rounded-full">
                          Inactivo
                        </span>
                      </div>
                    )}
                    <div className="absolute top-2 left-2">
                      <span
                        className={`inline-block w-6 h-6 rounded-full text-white text-xs font-bold flex items-center justify-center ${
                          banner.active ? 'bg-cyan-600' : 'bg-gray-500'
                        }`}
                      >
                        {index + 1}
                      </span>
                    </div>
                  </div>

                  {/* Content */}
                  <div className="flex-1 p-4 md:p-6">
                    <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="text-lg font-semibold text-gray-900">{banner.title}</h3>
                          <span
                            className={`w-4 h-4 rounded-full ${
                              ACCENT_COLORS.find((c) => c.value === banner.accentColor)?.preview
                            }`}
                          />
                        </div>
                        {banner.subtitle && (
                          <p className="text-sm text-cyan-600 font-medium mb-1">
                            {banner.subtitle}
                          </p>
                        )}
                        {banner.description && (
                          <p className="text-gray-600 text-sm line-clamp-2">{banner.description}</p>
                        )}
                        {(banner.ctaPrimaryText || banner.ctaSecondaryText) && (
                          <div className="flex flex-wrap gap-2 mt-3">
                            {banner.ctaPrimaryText && (
                              <span className="inline-flex items-center gap-1 text-xs bg-cyan-100 text-cyan-700 px-2 py-1 rounded">
                                {banner.ctaPrimaryText}
                                {banner.ctaPrimaryUrl && <ExternalLink className="w-3 h-3" />}
                              </span>
                            )}
                            {banner.ctaSecondaryText && (
                              <span className="inline-flex items-center gap-1 text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">
                                {banner.ctaSecondaryText}
                                {banner.ctaSecondaryUrl && <ExternalLink className="w-3 h-3" />}
                              </span>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1">
                        {/* Order buttons */}
                        <div className="flex flex-col mr-2">
                          <button
                            onClick={() => handleMoveUp(banner.id)}
                            disabled={index === 0}
                            className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed"
                            title="Mover arriba"
                          >
                            <ChevronUp className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleMoveDown(banner.id)}
                            disabled={index === banners.length - 1}
                            className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed"
                            title="Mover abajo"
                          >
                            <ChevronDown className="w-4 h-4" />
                          </button>
                        </div>

                        <button
                          onClick={() => handleToggleActive(banner)}
                          className={`p-2 rounded-lg transition-colors ${
                            banner.active
                              ? 'text-green-600 hover:bg-green-50'
                              : 'text-gray-400 hover:bg-gray-100'
                          }`}
                          title={banner.active ? 'Desactivar' : 'Activar'}
                        >
                          {banner.active ? (
                            <Eye className="w-5 h-5" />
                          ) : (
                            <EyeOff className="w-5 h-5" />
                          )}
                        </button>

                        <button
                          onClick={() => handleEdit(banner)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Editar"
                        >
                          <Edit2 className="w-5 h-5" />
                        </button>

                        <button
                          onClick={() => handleDelete(banner.id)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Eliminar"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Help Text */}
        {banners.length > 0 && (
          <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <h4 className="text-sm font-medium text-blue-800 mb-1">Consejos</h4>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>• Usa imágenes de alta resolución (1920x1080 recomendado)</li>
              <li>• Los banners se muestran en el orden que ves aquí</li>
              <li>• Solo los banners activos se muestran en la web</li>
              <li>• Puedes usar URLs de imágenes externas o subir tus propias imágenes</li>
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
