// src/components/admin/AdminFAQsPanel.tsx
// Panel de administración para FAQs (Preguntas Frecuentes)

import React, { useState, useEffect } from 'react';
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
  HelpCircle,
  Tag,
  AlertCircle,
  CheckCircle,
  Loader2,
  RefreshCw,
  Filter
} from 'lucide-react';
import {
  type FAQ,
  type FAQCategory,
  type FAQInput,
  subscribeToFAQs,
  subscribeToCategories,
  createFAQ,
  updateFAQ,
  deleteFAQ,
  toggleFAQActive,
  moveFAQUp,
  moveFAQDown,
  getNextFAQOrder,
  createCategory,
  updateCategory,
  deleteCategory,
  migrateDefaultFAQs,
  DEFAULT_CATEGORIES
} from '../../lib/faqs';

export default function AdminFAQsPanel() {
  const [faqs, setFAQs] = useState<FAQ[]>([]);
  const [categories, setCategories] = useState<FAQCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingFAQ, setEditingFAQ] = useState<FAQ | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [showCategoryManager, setShowCategoryManager] = useState(false);
  const [editingCategory, setEditingCategory] = useState<FAQCategory | null>(null);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryIcon, setNewCategoryIcon] = useState('📋');

  // Form state
  const [formData, setFormData] = useState<Omit<FAQInput, 'order'>>({
    question: '',
    answer: '',
    category: '',
    active: true,
  });

  // ============================================================================
  // EFFECTS
  // ============================================================================

  useEffect(() => {
    const unsubFAQs = subscribeToFAQs((loadedFAQs) => {
      setFAQs(loadedFAQs);
      setLoading(false);
    });

    const unsubCategories = subscribeToCategories((loadedCategories) => {
      setCategories(loadedCategories);
    });

    return () => {
      unsubFAQs();
      unsubCategories();
    };
  }, []);

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
      question: '',
      answer: '',
      category: categories[0]?.name.toLowerCase() || 'pedidos',
      active: true,
    });
  };

  const handleCreate = () => {
    resetForm();
    setIsCreating(true);
    setEditingFAQ(null);
  };

  const handleEdit = (faq: FAQ) => {
    setFormData({
      question: faq.question,
      answer: faq.answer,
      category: faq.category,
      active: faq.active,
    });
    setEditingFAQ(faq);
    setIsCreating(false);
  };

  const handleCancel = () => {
    setEditingFAQ(null);
    setIsCreating(false);
    resetForm();
  };

  const handleSave = async () => {
    if (!formData.question.trim() || !formData.answer.trim()) {
      setError('La pregunta y respuesta son obligatorias');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      if (editingFAQ) {
        await updateFAQ(editingFAQ.id, formData);
        setSuccess('FAQ actualizada correctamente');
      } else {
        const nextOrder = await getNextFAQOrder();
        await createFAQ({ ...formData, order: nextOrder });
        setSuccess('FAQ creada correctamente');
      }
      handleCancel();
    } catch (err) {
      setError('Error al guardar la FAQ');
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Estás seguro de eliminar esta FAQ?')) return;

    try {
      await deleteFAQ(id);
      setSuccess('FAQ eliminada correctamente');
    } catch (err) {
      setError('Error al eliminar la FAQ');
      console.error(err);
    }
  };

  const handleToggleActive = async (faq: FAQ) => {
    try {
      await toggleFAQActive(faq.id, !faq.active);
    } catch (err) {
      setError('Error al cambiar estado');
      console.error(err);
    }
  };

  const handleMoveUp = async (faqId: string) => {
    try {
      await moveFAQUp(faqId);
    } catch (err) {
      setError('Error al reordenar');
      console.error(err);
    }
  };

  const handleMoveDown = async (faqId: string) => {
    try {
      await moveFAQDown(faqId);
    } catch (err) {
      setError('Error al reordenar');
      console.error(err);
    }
  };

  // ============================================================================
  // CATEGORY HANDLERS
  // ============================================================================

  const handleCreateCategory = async () => {
    if (!newCategoryName.trim()) return;

    try {
      await createCategory({
        name: newCategoryName,
        icon: newCategoryIcon,
        order: categories.length
      });
      setNewCategoryName('');
      setNewCategoryIcon('📋');
      setSuccess('Categoría creada');
    } catch (err) {
      setError('Error al crear categoría');
    }
  };

  const handleUpdateCategory = async (cat: FAQCategory) => {
    try {
      await updateCategory(cat.id, { name: cat.name, icon: cat.icon });
      setEditingCategory(null);
      setSuccess('Categoría actualizada');
    } catch (err) {
      setError('Error al actualizar categoría');
    }
  };

  const handleDeleteCategory = async (id: string) => {
    const faqsInCategory = faqs.filter(f =>
      categories.find(c => c.id === id)?.name.toLowerCase() === f.category
    );

    if (faqsInCategory.length > 0) {
      setError('No puedes eliminar una categoría que tiene FAQs');
      return;
    }

    if (!confirm('¿Eliminar esta categoría?')) return;

    try {
      await deleteCategory(id);
      setSuccess('Categoría eliminada');
    } catch (err) {
      setError('Error al eliminar categoría');
    }
  };

  // ============================================================================
  // MIGRATION
  // ============================================================================

  const handleMigrate = async () => {
    if (faqs.length > 0 || categories.length > 0) {
      if (!confirm('Ya existen datos. ¿Quieres añadir los datos por defecto de todas formas?')) {
        return;
      }
    }

    setLoading(true);
    try {
      await migrateDefaultFAQs();
      setSuccess('FAQs por defecto añadidas correctamente');
    } catch (err) {
      setError('Error al migrar FAQs');
      console.error(err);
    }
  };

  // ============================================================================
  // FILTERED DATA
  // ============================================================================

  const filteredFAQs = filterCategory === 'all'
    ? faqs
    : faqs.filter(faq => faq.category === filterCategory);

  const getCategoryIcon = (categoryName: string) => {
    const cat = categories.find(c => c.name.toLowerCase() === categoryName.toLowerCase());
    return cat?.icon || '📋';
  };

  const getCategoryDisplayName = (categoryName: string) => {
    const cat = categories.find(c => c.name.toLowerCase() === categoryName.toLowerCase());
    return cat?.name || categoryName;
  };

  // ============================================================================
  // RENDER
  // ============================================================================

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex items-center gap-3 text-gray-600">
          <Loader2 className="w-6 h-6 animate-spin" />
          <span>Cargando FAQs...</span>
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
            <h1 className="text-2xl font-bold text-gray-900">Preguntas Frecuentes</h1>
            <p className="text-gray-600 mt-1">
              Gestiona las FAQs que aparecen en la página de ayuda
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {faqs.length === 0 && categories.length === 0 && (
              <button
                onClick={handleMigrate}
                className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                Cargar Por Defecto
              </button>
            )}
            <button
              onClick={() => setShowCategoryManager(!showCategoryManager)}
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            >
              <Tag className="w-4 h-4" />
              Categorías
            </button>
            <button
              onClick={handleCreate}
              className="flex items-center gap-2 px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Nueva FAQ
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

        {/* Category Manager */}
        {showCategoryManager && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-6 p-6">
            <h3 className="text-lg font-semibold mb-4">Gestionar Categorías</h3>

            {/* Add new category */}
            <div className="flex gap-2 mb-4">
              <input
                type="text"
                value={newCategoryIcon}
                onChange={(e) => setNewCategoryIcon(e.target.value)}
                className="w-16 px-3 py-2 border border-gray-300 rounded-lg text-center text-xl"
                placeholder="📋"
              />
              <input
                type="text"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                placeholder="Nombre de categoría"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg"
              />
              <button
                onClick={handleCreateCategory}
                disabled={!newCategoryName.trim()}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            {/* Category list */}
            <div className="space-y-2">
              {categories.map((cat) => (
                <div key={cat.id} className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                  {editingCategory?.id === cat.id ? (
                    <>
                      <input
                        type="text"
                        value={editingCategory.icon}
                        onChange={(e) => setEditingCategory({ ...editingCategory, icon: e.target.value })}
                        className="w-12 px-2 py-1 border border-gray-300 rounded text-center"
                      />
                      <input
                        type="text"
                        value={editingCategory.name}
                        onChange={(e) => setEditingCategory({ ...editingCategory, name: e.target.value })}
                        className="flex-1 px-2 py-1 border border-gray-300 rounded"
                      />
                      <button
                        onClick={() => handleUpdateCategory(editingCategory)}
                        className="p-1 text-green-600 hover:bg-green-50 rounded"
                      >
                        <Save className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setEditingCategory(null)}
                        className="p-1 text-gray-600 hover:bg-gray-100 rounded"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </>
                  ) : (
                    <>
                      <span className="text-xl">{cat.icon}</span>
                      <span className="flex-1 font-medium">{cat.name}</span>
                      <span className="text-sm text-gray-500">
                        {faqs.filter(f => f.category === cat.name.toLowerCase()).length} FAQs
                      </span>
                      <button
                        onClick={() => setEditingCategory(cat)}
                        className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteCategory(cat.id)}
                        className="p-1 text-red-600 hover:bg-red-50 rounded"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Form (Create/Edit) */}
        {(isCreating || editingFAQ) && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-6 overflow-hidden">
            <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">
                {editingFAQ ? 'Editar FAQ' : 'Nueva FAQ'}
              </h2>
            </div>

            <div className="p-6 space-y-4">
              {/* Category */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Categoría
                </label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                >
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.name.toLowerCase()}>
                      {cat.icon} {cat.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Question */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Pregunta *
                </label>
                <input
                  type="text"
                  value={formData.question}
                  onChange={(e) => setFormData(prev => ({ ...prev, question: e.target.value }))}
                  placeholder="¿Cómo puedo...?"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                />
              </div>

              {/* Answer */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Respuesta *
                </label>
                <textarea
                  value={formData.answer}
                  onChange={(e) => setFormData(prev => ({ ...prev, answer: e.target.value }))}
                  placeholder="Escribe una respuesta detallada..."
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                />
              </div>

              {/* Active Toggle */}
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, active: !prev.active }))}
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
                  {formData.active ? 'Visible en la web' : 'Oculta'}
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

        {/* Filter by category */}
        {categories.length > 0 && (
          <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-2">
            <Filter className="w-4 h-4 text-gray-500 flex-shrink-0" />
            <button
              onClick={() => setFilterCategory('all')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                filterCategory === 'all'
                  ? 'bg-cyan-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Todas ({faqs.length})
            </button>
            {categories.map((cat) => {
              const count = faqs.filter(f => f.category === cat.name.toLowerCase()).length;
              return (
                <button
                  key={cat.id}
                  onClick={() => setFilterCategory(cat.name.toLowerCase())}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                    filterCategory === cat.name.toLowerCase()
                      ? 'bg-cyan-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {cat.icon} {cat.name} ({count})
                </button>
              );
            })}
          </div>
        )}

        {/* FAQs List */}
        <div className="space-y-3">
          {filteredFAQs.length === 0 ? (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
              <HelpCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No hay FAQs</h3>
              <p className="text-gray-500 mb-4">
                Crea tu primera pregunta frecuente
              </p>
              <button
                onClick={handleCreate}
                className="inline-flex items-center gap-2 px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Crear FAQ
              </button>
            </div>
          ) : (
            filteredFAQs.map((faq, index) => (
              <div
                key={faq.id}
                className={`bg-white rounded-xl shadow-sm border overflow-hidden transition-all ${
                  faq.active ? 'border-gray-200' : 'border-gray-200 opacity-60'
                }`}
              >
                <div className="p-4 md:p-5">
                  <div className="flex items-start gap-4">
                    {/* Order controls */}
                    <div className="flex flex-col items-center gap-1">
                      <button
                        onClick={() => handleMoveUp(faq.id)}
                        disabled={index === 0}
                        className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30"
                      >
                        <ChevronUp className="w-4 h-4" />
                      </button>
                      <span className="text-xs text-gray-400">{index + 1}</span>
                      <button
                        onClick={() => handleMoveDown(faq.id)}
                        disabled={index === filteredFAQs.length - 1}
                        className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30"
                      >
                        <ChevronDown className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm px-2 py-0.5 bg-gray-100 rounded-full">
                          {getCategoryIcon(faq.category)} {getCategoryDisplayName(faq.category)}
                        </span>
                        {!faq.active && (
                          <span className="text-xs px-2 py-0.5 bg-gray-200 text-gray-600 rounded-full">
                            Oculta
                          </span>
                        )}
                      </div>
                      <h3 className="font-semibold text-gray-900 mb-1">{faq.question}</h3>
                      <p className="text-gray-600 text-sm line-clamp-2">{faq.answer}</p>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleToggleActive(faq)}
                        className={`p-2 rounded-lg transition-colors ${
                          faq.active
                            ? 'text-green-600 hover:bg-green-50'
                            : 'text-gray-400 hover:bg-gray-100'
                        }`}
                        title={faq.active ? 'Ocultar' : 'Mostrar'}
                      >
                        {faq.active ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
                      </button>
                      <button
                        onClick={() => handleEdit(faq)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Editar"
                      >
                        <Edit2 className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => handleDelete(faq.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Eliminar"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Stats */}
        {faqs.length > 0 && (
          <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex flex-wrap gap-4 text-sm">
              <span className="text-blue-700">
                <strong>{faqs.length}</strong> FAQs totales
              </span>
              <span className="text-green-700">
                <strong>{faqs.filter(f => f.active).length}</strong> activas
              </span>
              <span className="text-gray-600">
                <strong>{faqs.filter(f => !f.active).length}</strong> ocultas
              </span>
              <span className="text-purple-700">
                <strong>{categories.length}</strong> categorías
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
