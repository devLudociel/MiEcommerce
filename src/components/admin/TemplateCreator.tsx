import React, { useState } from 'react';
import { Sparkles, Plus, Save, Loader } from 'lucide-react';
import { logger } from '../../lib/logger';
import { notify } from '../../lib/notifications';

const CATEGORIES = ['camisetas', 'tazas', 'marcos', 'cojines', 'posters'];
const SUBCATEGORIES = [
  'Cumpleaños',
  'Aniversarios',
  'Bodas',
  'Graduaciones',
  'Empresarial',
  'Deportes',
  'Humor',
  'Romántico',
  'Infantil',
  'Navidad',
];

export default function TemplateCreator() {
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: 'camisetas',
    subcategory: 'Cumpleaños',
    tags: '',
    thumbnail: '',
    isPremium: false,
    templateFieldsJson: '[]',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim() || !formData.description.trim()) {
      notify.error('Nombre y descripción son obligatorios');
      return;
    }

    // Validate JSON
    let templateFields;
    try {
      templateFields = JSON.parse(formData.templateFieldsJson);
      if (!Array.isArray(templateFields)) {
        throw new Error('El JSON debe ser un array');
      }
    } catch (error) {
      notify.error('El JSON de campos no es válido');
      return;
    }

    setSaving(true);

    try {
      const templateData = {
        name: formData.name.trim(),
        description: formData.description.trim(),
        category: formData.category,
        subcategory: formData.subcategory,
        tags: formData.tags
          .split(',')
          .map((t) => t.trim())
          .filter((t) => t),
        thumbnail: formData.thumbnail.trim() || 'https://via.placeholder.com/400',
        isPremium: formData.isPremium,
        popularity: 0,
        template: {
          fields: templateFields,
          previewImage: formData.thumbnail.trim(),
        },
      };

      const response = await fetch('/api/admin/templates/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(templateData),
      });

      if (response.ok) {
        const data = await response.json();
        notify.success('¡Plantilla creada correctamente!');
        logger.info('[TemplateCreator] Template created:', data.templateId);

        // Reset form
        setFormData({
          name: '',
          description: '',
          category: 'camisetas',
          subcategory: 'Cumpleaños',
          tags: '',
          thumbnail: '',
          isPremium: false,
          templateFieldsJson: '[]',
        });
      } else {
        const error = await response.json();
        notify.error(error.error || 'Error al crear plantilla');
      }
    } catch (error) {
      logger.error('[TemplateCreator] Error:', error);
      notify.error('Error al crear plantilla');
    } finally {
      setSaving(false);
    }
  };

  const exampleJson = `[
  {
    "fieldId": "field_1234567890",
    "value": "Texto de ejemplo",
    "displayValue": "Texto de ejemplo"
  },
  {
    "fieldId": "field_0987654321",
    "value": "red",
    "displayValue": "Rojo"
  }
]`;

  return (
    <div className="bg-white rounded-xl border-2 border-pink-200 p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-3 bg-pink-100 rounded-lg">
          <Sparkles className="w-6 h-6 text-pink-600" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Crear Plantilla</h2>
          <p className="text-sm text-gray-600">Añade nuevas plantillas predefinidas</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Name */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Nombre <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="Ej: Cumpleaños Elegante"
            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
          />
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Descripción <span className="text-red-500">*</span>
          </label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="Describe esta plantilla..."
            rows={3}
            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
          />
        </div>

        {/* Category & Subcategory */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Categoría</label>
            <select
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
            >
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Subcategoría</label>
            <select
              value={formData.subcategory}
              onChange={(e) => setFormData({ ...formData, subcategory: e.target.value })}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
            >
              {SUBCATEGORIES.map((subcat) => (
                <option key={subcat} value={subcat}>
                  {subcat}
                </option>
              ))}
            </select>
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
            placeholder="Ej: cumpleaños, elegante, dorado, fiesta"
            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
          />
        </div>

        {/* Thumbnail URL */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            URL de Thumbnail (imagen de preview)
          </label>
          <input
            type="url"
            value={formData.thumbnail}
            onChange={(e) => setFormData({ ...formData, thumbnail: e.target.value })}
            placeholder="https://..."
            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
          />
          {formData.thumbnail && (
            <img
              src={formData.thumbnail}
              alt="Preview"
              className="mt-2 w-32 h-32 object-cover rounded-lg border-2 border-gray-200"
            />
          )}
        </div>

        {/* Template Fields JSON */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Campos de la Plantilla (JSON) <span className="text-red-500">*</span>
          </label>
          <textarea
            value={formData.templateFieldsJson}
            onChange={(e) => setFormData({ ...formData, templateFieldsJson: e.target.value })}
            placeholder={exampleJson}
            rows={10}
            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent font-mono text-sm"
          />
          <details className="mt-2">
            <summary className="text-xs text-gray-600 cursor-pointer hover:text-gray-800">
              Ver ejemplo de JSON
            </summary>
            <pre className="mt-2 p-3 bg-gray-50 rounded text-xs overflow-x-auto">{exampleJson}</pre>
          </details>
        </div>

        {/* Premium Checkbox */}
        <div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.isPremium}
              onChange={(e) => setFormData({ ...formData, isPremium: e.target.checked })}
              className="w-4 h-4 text-pink-600 border-gray-300 rounded focus:ring-pink-500"
            />
            <span className="text-sm text-gray-700">Plantilla Premium (requiere pago)</span>
          </label>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={saving}
          className="w-full bg-gradient-to-r from-pink-500 to-purple-500 text-white py-3 px-6 rounded-lg font-bold hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {saving ? (
            <>
              <Loader className="w-5 h-5 animate-spin" />
              Guardando...
            </>
          ) : (
            <>
              <Plus className="w-5 h-5" />
              Crear Plantilla
            </>
          )}
        </button>
      </form>
    </div>
  );
}
