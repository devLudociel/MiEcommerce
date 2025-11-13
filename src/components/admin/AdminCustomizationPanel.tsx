import { useEffect, useState } from 'react';
import { collection, doc, getDocs, updateDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { logger } from '../../lib/logger';
import { notify } from '../../lib/notifications';
import type { CustomizationSchema, ProductCategory } from '../../types/customization';
import { exampleSchemas, schemaOptions } from '../../data/exampleSchemas';
import SchemaEditor from './SchemaEditor';

interface CategoryWithSchema extends ProductCategory {
  customizationSchema?: CustomizationSchema;
}

export default function AdminCustomizationPanel() {
  const [categories, setCategories] = useState<CategoryWithSchema[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<CategoryWithSchema | null>(null);
  const [editingSchema, setEditingSchema] = useState(false);

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    setLoading(true);
    try {
      // Para este prototipo, usamos categorías hardcodeadas
      // En producción, estas vendrían de Firestore
      const mockCategories: CategoryWithSchema[] = [
        {
          id: 'cat_camisetas',
          name: 'Camisetas Personalizadas',
          slug: 'camisetas',
          description: 'Crea tu camiseta única',
          icon: '👕',
          active: true,
          customizationSchema: exampleSchemas.camisetas,
        },
        {
          id: 'cat_cuadros',
          name: 'Cuadros Decorativos',
          slug: 'cuadros',
          description: 'Cuadros con flores personalizadas',
          icon: '🖼️',
          active: true,
          customizationSchema: exampleSchemas.cuadros,
        },
        {
          id: 'cat_resina',
          name: 'Figuras de Resina',
          slug: 'resina',
          description: 'Figuras en cajas premium',
          icon: '💎',
          active: true,
          customizationSchema: exampleSchemas.resina,
        },
        {
          id: 'cat_tazas',
          name: 'Tazas Sublimadas',
          slug: 'tazas',
          description: 'Tazas con diseño personalizado',
          icon: '☕',
          active: true,
          customizationSchema: exampleSchemas.tazas,
        },
        {
          id: 'cat_nueva',
          name: 'Nueva Categoría',
          slug: 'nueva',
          description: 'Categoría sin configurar',
          icon: '📦',
          active: false,
        },
      ];

      setCategories(mockCategories);
      logger.info('[AdminCustomizationPanel] Categories loaded', { count: mockCategories.length });
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

      // Actualizar categoría con el template
      const updatedCategories = categories.map((cat) =>
        cat.id === categoryId ? { ...cat, customizationSchema: template } : cat
      );

      setCategories(updatedCategories);
      setSelectedCategory(updatedCategories.find((c) => c.id === categoryId) || null);

      notify.success('Template aplicado correctamente');
      logger.info('[AdminCustomizationPanel] Template applied', { categoryId, templateKey });

      // TODO: Guardar en Firestore
      // await updateDoc(doc(db, 'categories', categoryId), {
      //   customizationSchema: template
      // });
    } catch (error) {
      logger.error('[AdminCustomizationPanel] Error applying template', error);
      notify.error('Error al aplicar el template');
    }
  };

  const handleSaveSchema = async (schema: CustomizationSchema) => {
    if (!selectedCategory) return;

    try {
      // Actualizar categoría con el nuevo schema
      const updatedCategories = categories.map((cat) =>
        cat.id === selectedCategory.id ? { ...cat, customizationSchema: schema } : cat
      );

      setCategories(updatedCategories);
      setSelectedCategory({ ...selectedCategory, customizationSchema: schema });
      setEditingSchema(false);

      notify.success('Schema guardado correctamente');
      logger.info('[AdminCustomizationPanel] Schema saved', {
        categoryId: selectedCategory.id,
        fieldsCount: schema.fields.length,
      });

      // TODO: Guardar en Firestore
      // await updateDoc(doc(db, 'categories', selectedCategory.id), {
      //   customizationSchema: schema
      // });
    } catch (error) {
      logger.error('[AdminCustomizationPanel] Error saving schema', error);
      notify.error('Error al guardar el schema');
    }
  };

  const handleRemoveSchema = async (categoryId: string) => {
    if (!confirm('¿Estás seguro de eliminar la configuración de personalización?')) {
      return;
    }

    try {
      const updatedCategories = categories.map((cat) =>
        cat.id === categoryId ? { ...cat, customizationSchema: undefined } : cat
      );

      setCategories(updatedCategories);
      if (selectedCategory?.id === categoryId) {
        setSelectedCategory({ ...selectedCategory, customizationSchema: undefined });
      }

      notify.success('Configuración eliminada');
      logger.info('[AdminCustomizationPanel] Schema removed', { categoryId });
    } catch (error) {
      logger.error('[AdminCustomizationPanel] Error removing schema', error);
      notify.error('Error al eliminar la configuración');
    }
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
                <h2 className="text-lg font-bold text-white">Categorías</h2>
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
    </div>
  );
}
