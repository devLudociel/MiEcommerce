import { useEffect, useState } from 'react';
import { collection, doc, getDocs, updateDoc, setDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { logger } from '../../lib/logger';
import { notify } from '../../lib/notifications';
import type { CustomizationSchema, ProductCategory } from '../../types/customization';
import { exampleSchemas, schemaOptions } from '../../data/exampleSchemas';
import SchemaEditor from './SchemaEditor';
import {
  loadAllCustomizationSchemas,
  saveCustomizationSchema,
  deleteCustomizationSchema,
} from '../../lib/customization/schemas';

interface CategoryWithSchema extends ProductCategory {
  customizationSchema?: CustomizationSchema;
}

interface NewCategoryForm {
  id: string;
  name: string;
  slug: string;
  description: string;
  icon: string;
}

export default function AdminCustomizationPanel() {
  const [categories, setCategories] = useState<CategoryWithSchema[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<CategoryWithSchema | null>(null);
  const [editingSchema, setEditingSchema] = useState(false);
  const [showNewCategoryModal, setShowNewCategoryModal] = useState(false);
  const [newCategoryForm, setNewCategoryForm] = useState<NewCategoryForm>({
    id: '',
    name: '',
    slug: '',
    description: '',
    icon: '📦',
  });

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    setLoading(true);
    try {
      // Load schemas from Firebase
      const savedSchemas = await loadAllCustomizationSchemas();

      // Load custom categories from Firestore
      const customCategoriesSnapshot = await getDocs(collection(db, 'customization_categories'));
      const customCategories: CategoryWithSchema[] = customCategoriesSnapshot.docs.map(doc => ({
        id: doc.id,
        name: doc.data().name,
        slug: doc.data().slug,
        description: doc.data().description,
        icon: doc.data().icon,
        active: doc.data().active,
        customizationSchema: savedSchemas[doc.id]?.schema || undefined,
      }));

      // Default categories (built-in)
      const defaultCategories: CategoryWithSchema[] = [
        {
          id: 'cat_camisetas',
          name: 'Camisetas Personalizadas (básico)',
          slug: 'camisetas',
          description: 'Camisetas con diseño genérico',
          icon: '👕',
          active: true,
          customizationSchema: savedSchemas['cat_camisetas']?.schema || undefined,
        },
        {
          id: 'cat_camisetas_pro',
          name: 'Camisetas Pro (front/back)',
          slug: 'camisetas-pro',
          description: 'Camisetas con diseño frontal y trasero independiente',
          icon: '👕',
          active: true,
          customizationSchema: savedSchemas['cat_camisetas_pro']?.schema || undefined,
        },
        {
          id: 'cat_hoodies',
          name: 'Hoodies / Sudaderas',
          slug: 'hoodies',
          description: 'Sudaderas personalizadas con front/back',
          icon: '🧥',
          active: true,
          customizationSchema: savedSchemas['cat_hoodies']?.schema || undefined,
        },
        {
          id: 'cat_bolsas',
          name: 'Bolsas / Tote Bags',
          slug: 'bolsas',
          description: 'Bolsas de tela personalizadas',
          icon: '🛍️',
          active: true,
          customizationSchema: savedSchemas['cat_bolsas']?.schema || undefined,
        },
        {
          id: 'cat_cuadros',
          name: 'Cuadros Decorativos',
          slug: 'cuadros',
          description: 'Cuadros con flores personalizadas',
          icon: '🖼️',
          active: true,
          customizationSchema: savedSchemas['cat_cuadros']?.schema || undefined,
        },
        {
          id: 'cat_resina',
          name: 'Figuras de Resina',
          slug: 'resina',
          description: 'Figuras en cajas premium',
          icon: '💎',
          active: true,
          customizationSchema: savedSchemas['cat_resina']?.schema || undefined,
        },
        {
          id: 'cat_tazas',
          name: 'Tazas Sublimadas',
          slug: 'tazas',
          description: 'Tazas con diseño personalizado',
          icon: '☕',
          active: true,
          customizationSchema: savedSchemas['cat_tazas']?.schema || undefined,
        },
      ];

      // Combinar categorías por defecto con las personalizadas
      const allCategories = [...defaultCategories, ...customCategories];

      setCategories(allCategories);
      logger.info('[AdminCustomizationPanel] Categories loaded from Firebase', {
        defaultCount: defaultCategories.length,
        customCount: customCategories.length,
        totalCount: allCategories.length,
        schemasCount: Object.keys(savedSchemas).length,
      });
    } catch (error) {
      logger.error('[AdminCustomizationPanel] Error loading categories', error);
      notify.error('Error al cargar las categorías');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectCategory = (category: CategoryWithSchema) => {
    setSelectedCategory(category);
    setEditingSchema(false);
  };

  const handleApplyTemplate = async (categoryId: string, templateKey: string) => {
    try {
      const template = exampleSchemas[templateKey as keyof typeof exampleSchemas];
      if (!template) {
        notify.error('Template no encontrado');
        return;
      }

      const category = categories.find((c) => c.id === categoryId);
      if (!category) {
        notify.error('Categoría no encontrada');
        return;
      }

      // Save to Firebase
      await saveCustomizationSchema(categoryId, category.name, template);

      // Update local state
      const updatedCategories = categories.map((cat) =>
        cat.id === categoryId ? { ...cat, customizationSchema: template } : cat
      );

      setCategories(updatedCategories);
      setSelectedCategory(updatedCategories.find((c) => c.id === categoryId) || null);

      notify.success('Template aplicado y guardado en Firebase');
      logger.info('[AdminCustomizationPanel] Template applied and saved', { categoryId, templateKey });
    } catch (error) {
      logger.error('[AdminCustomizationPanel] Error applying template', error);
      notify.error('Error al aplicar el template');
    }
  };

  const handleSaveSchema = async (schema: CustomizationSchema) => {
    if (!selectedCategory) return;

    try {
      // Save to Firebase
      await saveCustomizationSchema(selectedCategory.id, selectedCategory.name, schema);

      // Update local state
      const updatedCategories = categories.map((cat) =>
        cat.id === selectedCategory.id ? { ...cat, customizationSchema: schema } : cat
      );

      setCategories(updatedCategories);
      setSelectedCategory({ ...selectedCategory, customizationSchema: schema });
      setEditingSchema(false);

      notify.success('Schema guardado en Firebase exitosamente');
      logger.info('[AdminCustomizationPanel] Schema saved to Firebase', {
        categoryId: selectedCategory.id,
        fieldsCount: schema.fields.length,
      });
    } catch (error) {
      logger.error('[AdminCustomizationPanel] Error saving schema', error);
      notify.error('Error al guardar el schema en Firebase');
    }
  };

  const handleRemoveSchema = async (categoryId: string) => {
    if (!confirm('¿Estás seguro de eliminar la configuración de personalización de Firebase?')) {
      return;
    }

    try {
      // Delete from Firebase
      await deleteCustomizationSchema(categoryId);

      // Update local state
      const updatedCategories = categories.map((cat) =>
        cat.id === categoryId ? { ...cat, customizationSchema: undefined } : cat
      );

      setCategories(updatedCategories);
      if (selectedCategory?.id === categoryId) {
        setSelectedCategory({ ...selectedCategory, customizationSchema: undefined });
      }

      notify.success('Configuración eliminada de Firebase');
      logger.info('[AdminCustomizationPanel] Schema removed from Firebase', { categoryId });
    } catch (error) {
      logger.error('[AdminCustomizationPanel] Error removing schema', error);
      notify.error('Error al eliminar la configuración de Firebase');
    }
  };

  const handleCreateCategory = async () => {
    // Validaciones
    if (!newCategoryForm.id || !newCategoryForm.name || !newCategoryForm.slug) {
      notify.error('Por favor completa todos los campos obligatorios');
      return;
    }

    // Validar formato de ID (debe comenzar con cat_)
    if (!newCategoryForm.id.startsWith('cat_')) {
      notify.error('El ID debe comenzar con "cat_" (ejemplo: cat_termos)');
      return;
    }

    // Verificar que no exista ya
    if (categories.find(cat => cat.id === newCategoryForm.id)) {
      notify.error('Ya existe una categoría con ese ID');
      return;
    }

    try {
      const newCategory: CategoryWithSchema = {
        id: newCategoryForm.id,
        name: newCategoryForm.name,
        slug: newCategoryForm.slug,
        description: newCategoryForm.description,
        icon: newCategoryForm.icon || '📦',
        active: true,
      };

      // Guardar categoría en Firestore (colección customization_categories)
      await setDoc(doc(db, 'customization_categories', newCategory.id), {
        name: newCategory.name,
        slug: newCategory.slug,
        description: newCategory.description,
        icon: newCategory.icon,
        active: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // Actualizar estado local
      setCategories([...categories, newCategory]);

      // Resetear formulario y cerrar modal
      setNewCategoryForm({
        id: '',
        name: '',
        slug: '',
        description: '',
        icon: '📦',
      });
      setShowNewCategoryModal(false);

      notify.success('Nueva categoría creada exitosamente');
      logger.info('[AdminCustomizationPanel] New category created', { categoryId: newCategory.id });
    } catch (error) {
      logger.error('[AdminCustomizationPanel] Error creating category', error);
      notify.error('Error al crear la categoría');
    }
  };

  const suggestSlug = (name: string) => {
    return name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Quitar acentos
      .replace(/[^a-z0-9\s-]/g, '') // Quitar caracteres especiales
      .replace(/\s+/g, '-') // Espacios a guiones
      .replace(/-+/g, '-'); // Múltiples guiones a uno solo
  };

  const suggestId = (name: string) => {
    const slug = suggestSlug(name);
    return `cat_${slug}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando categorías...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                🎨 Configuración de Personalización
              </h1>
              <p className="text-sm text-gray-600 mt-1">
                Gestiona los campos de personalización para cada categoría
              </p>
            </div>
            <a
              href="/admin"
              className="px-4 py-2 text-gray-600 hover:text-gray-900 font-medium transition-colors"
            >
              ← Volver al Dashboard
            </a>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Sidebar - Lista de categorías */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden sticky top-24">
              <div className="p-4 bg-gradient-to-r from-purple-500 to-cyan-500">
                <div className="flex items-center justify-between mb-2">
                  <h2 className="text-lg font-bold text-white">Categorías</h2>
                  <button
                    onClick={() => setShowNewCategoryModal(true)}
                    className="px-3 py-1.5 bg-white text-purple-600 hover:bg-purple-50 rounded-lg font-semibold text-sm transition-colors flex items-center gap-1"
                  >
                    <span className="text-lg">➕</span>
                    Nueva
                  </button>
                </div>
                <p className="text-sm text-purple-100">
                  {categories.length} categorías disponibles
                </p>
              </div>

              <div className="divide-y divide-gray-200 max-h-[calc(100vh-12rem)] overflow-y-auto">
                {categories.map((category) => (
                  <button
                    key={category.id}
                    onClick={() => handleSelectCategory(category)}
                    className={`w-full p-4 text-left transition-colors hover:bg-gray-50 ${
                      selectedCategory?.id === category.id ? 'bg-purple-50 border-l-4 border-purple-500' : ''
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="text-3xl">{category.icon}</div>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-gray-900 truncate">
                          {category.name}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          {category.customizationSchema ? (
                            <span className="text-green-600 font-medium">
                              ✓ {category.customizationSchema.fields.length} campos configurados
                            </span>
                          ) : (
                            <span className="text-orange-600">Sin configurar</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-2">
            {!selectedCategory ? (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
                <div className="text-6xl mb-4">👈</div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">
                  Selecciona una categoría
                </h3>
                <p className="text-gray-600">
                  Elige una categoría de la lista para configurar sus campos de personalización
                </p>
              </div>
            ) : editingSchema ? (
              <SchemaEditor
                category={selectedCategory}
                initialSchema={selectedCategory.customizationSchema}
                onSave={handleSaveSchema}
                onCancel={() => setEditingSchema(false)}
              />
            ) : (
              <div className="space-y-6">
                {/* Category Info Card */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-4">
                      <div className="text-5xl">{selectedCategory.icon}</div>
                      <div>
                        <h2 className="text-2xl font-bold text-gray-900">
                          {selectedCategory.name}
                        </h2>
                        <p className="text-gray-600">{selectedCategory.description}</p>
                      </div>
                    </div>
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-bold ${
                        selectedCategory.active
                          ? 'bg-green-100 text-green-700'
                          : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {selectedCategory.active ? 'Activa' : 'Inactiva'}
                    </span>
                  </div>

                  {/* Quick Actions */}
                  <div className="flex gap-3">
                    <button
                      onClick={() => setEditingSchema(true)}
                      className="flex-1 px-4 py-3 bg-purple-500 text-white rounded-lg font-semibold hover:bg-purple-600 transition-colors"
                    >
                      {selectedCategory.customizationSchema ? '✏️ Editar Schema' : '➕ Crear Schema'}
                    </button>
                    {selectedCategory.customizationSchema && (
                      <button
                        onClick={() => handleRemoveSchema(selectedCategory.id)}
                        className="px-4 py-3 bg-red-500 text-white rounded-lg font-semibold hover:bg-red-600 transition-colors"
                      >
                        🗑️ Eliminar
                      </button>
                    )}
                  </div>
                </div>

                {/* Current Schema */}
                {selectedCategory.customizationSchema ? (
                  <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <h3 className="text-lg font-bold text-gray-900 mb-4">
                      📋 Schema Actual
                    </h3>

                    <div className="space-y-3">
                      {selectedCategory.customizationSchema.fields.map((field, idx) => (
                        <div
                          key={field.id}
                          className="p-4 bg-gray-50 rounded-lg border border-gray-200"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-bold text-gray-900">{idx + 1}.</span>
                                <span className="font-semibold text-gray-900">{field.label}</span>
                                {field.required && (
                                  <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-bold">
                                    Requerido
                                  </span>
                                )}
                              </div>
                              <div className="text-sm text-gray-600">
                                Tipo: <code className="bg-white px-2 py-0.5 rounded">{field.fieldType}</code>
                              </div>
                              {field.priceModifier > 0 && (
                                <div className="text-sm text-purple-600 font-medium mt-1">
                                  +€{field.priceModifier.toFixed(2)}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                      <p className="text-sm text-blue-800">
                        <span className="font-bold">Total de campos:</span>{' '}
                        {selectedCategory.customizationSchema.fields.length}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <h3 className="text-lg font-bold text-gray-900 mb-4">
                      🚀 Aplicar Template Rápido
                    </h3>
                    <p className="text-gray-600 mb-4">
                      Empieza con un template predefinido y personalízalo después
                    </p>

                    <div className="grid grid-cols-2 gap-3">
                      {schemaOptions
                        .filter((opt) => opt.value !== 'custom')
                        .map((option) => (
                          <button
                            key={option.value}
                            onClick={() => handleApplyTemplate(selectedCategory.id, option.value)}
                            className="p-4 border-2 border-gray-200 rounded-lg hover:border-purple-500 hover:bg-purple-50 transition-all text-left"
                          >
                            <div className="font-semibold text-gray-900">{option.label}</div>
                            <div className="text-xs text-gray-500 mt-1">
                              {exampleSchemas[option.value as keyof typeof exampleSchemas]?.fields.length || 0} campos
                            </div>
                          </button>
                        ))}
                    </div>
                  </div>
                )}

                {/* Test Link */}
                {selectedCategory.customizationSchema && (
                  <div className="bg-gradient-to-r from-green-50 to-cyan-50 rounded-xl border-2 border-green-200 p-6">
                    <h3 className="text-lg font-bold text-gray-900 mb-2">
                      ✅ ¡Schema Configurado!
                    </h3>
                    <p className="text-gray-700 mb-4">
                      Tu categoría ya tiene campos de personalización configurados. Pruébalo en acción:
                    </p>
                    <a
                      href="/test-customizer"
                      target="_blank"
                      className="inline-flex items-center gap-2 px-6 py-3 bg-green-500 text-white rounded-lg font-semibold hover:bg-green-600 transition-colors"
                    >
                      🧪 Probar Customizer
                      <span className="text-xs">↗</span>
                    </a>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal: Nueva Categoría */}
      {showNewCategoryModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="sticky top-0 bg-gradient-to-r from-purple-500 to-cyan-500 p-6 rounded-t-2xl">
              <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                ➕ Crear Nueva Categoría de Personalización
              </h2>
              <p className="text-purple-100 text-sm mt-1">
                Define una nueva categoría para productos personalizables (ej: termos, vasos, gorras)
              </p>
            </div>

            {/* Body */}
            <div className="p-6 space-y-6">
              {/* Nombre */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Nombre de la categoría *
                </label>
                <input
                  type="text"
                  value={newCategoryForm.name}
                  onChange={(e) => {
                    const name = e.target.value;
                    setNewCategoryForm({
                      ...newCategoryForm,
                      name,
                      // Auto-sugerir slug e id basado en el nombre
                      slug: suggestSlug(name),
                      id: suggestId(name),
                    });
                  }}
                  placeholder="Ej: Termos Personalizados"
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-purple-500 focus:outline-none transition-colors"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Nombre descriptivo que verás en el panel de admin
                </p>
              </div>

              {/* ID */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  ID de la categoría *
                </label>
                <input
                  type="text"
                  value={newCategoryForm.id}
                  onChange={(e) => setNewCategoryForm({ ...newCategoryForm, id: e.target.value })}
                  placeholder="cat_termos"
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-purple-500 focus:outline-none transition-colors font-mono"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Debe comenzar con "cat_" y ser único (sin espacios ni caracteres especiales)
                </p>
              </div>

              {/* Slug */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Slug (URL amigable) *
                </label>
                <input
                  type="text"
                  value={newCategoryForm.slug}
                  onChange={(e) => setNewCategoryForm({ ...newCategoryForm, slug: e.target.value })}
                  placeholder="termos-personalizados"
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-purple-500 focus:outline-none transition-colors font-mono"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Se usa en las URLs (solo letras minúsculas, números y guiones)
                </p>
              </div>

              {/* Descripción */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Descripción
                </label>
                <textarea
                  value={newCategoryForm.description}
                  onChange={(e) => setNewCategoryForm({ ...newCategoryForm, description: e.target.value })}
                  placeholder="Termos térmicos con diseño personalizado"
                  rows={3}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-purple-500 focus:outline-none transition-colors resize-none"
                />
              </div>

              {/* Icono */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Icono (emoji)
                </label>
                <div className="flex items-center gap-4">
                  <input
                    type="text"
                    value={newCategoryForm.icon}
                    onChange={(e) => setNewCategoryForm({ ...newCategoryForm, icon: e.target.value })}
                    placeholder="🍵"
                    maxLength={2}
                    className="w-20 px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-purple-500 focus:outline-none transition-colors text-center text-2xl"
                  />
                  <div className="flex-1">
                    <p className="text-sm text-gray-600">
                      Emoji que aparecerá junto al nombre de la categoría
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      Sugerencias: 🍵 ☕ 🥤 🧴 🧢 👒 🎒
                    </p>
                  </div>
                </div>
              </div>

              {/* Preview */}
              <div className="p-4 bg-purple-50 border-2 border-purple-200 rounded-lg">
                <p className="text-sm font-bold text-purple-900 mb-2">Vista previa:</p>
                <div className="bg-white p-4 rounded-lg border border-purple-200">
                  <div className="flex items-center gap-3">
                    <div className="text-3xl">{newCategoryForm.icon || '📦'}</div>
                    <div>
                      <div className="font-bold text-gray-900">
                        {newCategoryForm.name || 'Nombre de la categoría'}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        {newCategoryForm.description || 'Descripción de la categoría'}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="sticky bottom-0 bg-gray-50 px-6 py-4 rounded-b-2xl border-t border-gray-200 flex items-center justify-end gap-3">
              <button
                onClick={() => {
                  setShowNewCategoryModal(false);
                  setNewCategoryForm({
                    id: '',
                    name: '',
                    slug: '',
                    description: '',
                    icon: '📦',
                  });
                }}
                className="px-6 py-2.5 text-gray-700 hover:bg-gray-200 rounded-lg font-semibold transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleCreateCategory}
                className="px-6 py-2.5 bg-gradient-to-r from-purple-500 to-cyan-500 text-white rounded-lg font-semibold hover:from-purple-600 hover:to-cyan-600 transition-all shadow-lg"
              >
                Crear Categoría
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
