import { useEffect, useState } from 'react';
import { Plus, Edit2, Trash2, X, Save, ChevronRight } from 'lucide-react';
import { notify } from '../../lib/notifications';
import { logger } from '../../lib/logger';
import {
  loadAllConfigurators,
  saveConfigurator,
  deleteConfigurator,
  type StoredConfigurator,
} from '../../lib/configurators';
import ConfiguratorEditor from './ConfiguratorEditor';
import type { ProductConfigurator } from '../../types/configurator';

const DEFAULT_CONFIGURATOR: ProductConfigurator = {
  steps: ['design', 'quantity', 'summary'],
  design: {
    formats: ['PNG', 'PDF'],
    minDpi: 300,
    requireTransparentBg: false,
    designServicePrice: 0,
    designServiceLabel: 'Servicio de diseño',
  },
  quantity: {
    min: 1,
    tiers: [{ from: 1, price: 0 }],
  },
};

function generateId(name: string): string {
  return (
    'cfg_' +
    name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '')
      .slice(0, 40) +
    '_' +
    Date.now().toString(36)
  );
}

export default function AdminConfiguratorPanel() {
  const [configurators, setConfigurators] = useState<StoredConfigurator[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<StoredConfigurator | null>(null);

  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [configuratorValue, setConfiguratorValue] = useState<ProductConfigurator | undefined>(
    undefined
  );
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    setLoading(true);
    try {
      const list = await loadAllConfigurators();
      setConfigurators(list.sort((a, b) => a.name.localeCompare(b.name)));
    } catch (err) {
      logger.error('[AdminConfiguratorPanel] Error loading', err);
      notify.error('Error al cargar los configuradores');
    } finally {
      setLoading(false);
    }
  };

  const openCreate = () => {
    setEditing(null);
    setName('');
    setDescription('');
    setConfiguratorValue({ ...DEFAULT_CONFIGURATOR });
    setShowModal(true);
  };

  const openEdit = (cfg: StoredConfigurator) => {
    setEditing(cfg);
    setName(cfg.name);
    setDescription(cfg.description || '');
    setConfiguratorValue(cfg.configurator);
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!name.trim()) {
      notify.error('Escribe un nombre para el configurador');
      return;
    }
    if (!configuratorValue) {
      notify.error('Activa y configura el configurador antes de guardar');
      return;
    }

    setSaving(true);
    try {
      const id = editing ? editing.id : generateId(name);
      await saveConfigurator(id, name.trim(), configuratorValue, description.trim());
      notify.success(editing ? 'Configurador actualizado' : 'Configurador creado');
      setShowModal(false);
      await load();
    } catch (err) {
      logger.error('[AdminConfiguratorPanel] Error saving', err);
      notify.error('Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (cfg: StoredConfigurator) => {
    if (!confirm(`¿Eliminar el configurador "${cfg.name}"? Los productos que lo usen perderán su configurador.`)) return;
    try {
      await deleteConfigurator(cfg.id);
      notify.success('Configurador eliminado');
      setConfigurators((prev) => prev.filter((c) => c.id !== cfg.id));
    } catch (err) {
      logger.error('[AdminConfiguratorPanel] Error deleting', err);
      notify.error('Error al eliminar');
    }
  };

  const stepLabels: Record<string, string> = {
    variant: 'Variante',
    size: 'Tamaño',
    design: 'Diseño',
    quantity: 'Cantidad',
    summary: 'Resumen',
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Configuradores de producto</h1>
          <p className="text-sm text-gray-500 mt-1">
            Crea plantillas de configuración paso a paso y asígnalas a los productos.
          </p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white font-medium text-sm rounded-lg hover:bg-indigo-700 transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" />
          Nuevo configurador
        </button>
      </div>

      {/* List */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <span className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : configurators.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-gray-300">
          <p className="text-4xl mb-3">🛠️</p>
          <h3 className="text-lg font-semibold text-gray-700 mb-1">Sin configuradores</h3>
          <p className="text-gray-500 text-sm mb-5">
            Crea tu primer configurador para empezar a asignarlo a productos.
          </p>
          <button
            type="button"
            onClick={openCreate}
            className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700"
          >
            Crear configurador
          </button>
        </div>
      ) : (
        <div className="grid gap-4">
          {configurators.map((cfg) => (
            <div
              key={cfg.id}
              className="bg-white rounded-xl border border-gray-200 p-5 flex items-center gap-4 hover:border-indigo-300 transition-colors"
            >
              {/* Icon */}
              <div className="w-12 h-12 bg-indigo-50 rounded-xl flex items-center justify-center text-2xl shrink-0">
                🛠️
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-gray-900">{cfg.name}</h3>
                {cfg.description && (
                  <p className="text-sm text-gray-500 mt-0.5 truncate">{cfg.description}</p>
                )}
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {cfg.configurator.steps.map((step) => (
                    <span
                      key={step}
                      className="px-2 py-0.5 bg-indigo-50 text-indigo-700 text-xs font-medium rounded-full"
                    >
                      {stepLabels[step] || step}
                    </span>
                  ))}
                </div>
                <p className="text-xs text-gray-400 mt-2">
                  ID: <code className="bg-gray-100 px-1 rounded">{cfg.id}</code>
                  {' · '}Actualizado: {cfg.updatedAt.toLocaleDateString('es-ES')}
                </p>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => openEdit(cfg)}
                  className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
                  title="Editar"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(cfg)}
                  className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                  title="Eliminar"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div
            className="fixed inset-0 bg-black/40"
            onClick={() => setShowModal(false)}
          />
          <div className="relative min-h-full flex items-start justify-center p-4 pt-10">
            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl">
              {/* Modal header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-bold text-gray-900">
                  {editing ? 'Editar configurador' : 'Nuevo configurador'}
                </h2>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="p-1.5 text-gray-400 hover:bg-gray-100 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal body */}
              <div className="px-6 py-5 space-y-4 max-h-[75vh] overflow-y-auto">
                {/* Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nombre <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder='Ej: "Camisetas con logo", "Tazas personalizadas"'
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Descripción <span className="text-gray-400">(opcional)</span>
                  </label>
                  <input
                    type="text"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Para qué tipo de productos se usa..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>

                {/* Configurator editor */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Configuración de pasos
                  </label>
                  <ConfiguratorEditor
                    value={configuratorValue}
                    onChange={setConfiguratorValue}
                  />
                </div>
              </div>

              {/* Modal footer */}
              <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50 rounded-b-2xl">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-sm text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving}
                  className="flex items-center gap-2 px-5 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-60"
                >
                  {saving ? (
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  {editing ? 'Guardar cambios' : 'Crear configurador'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
