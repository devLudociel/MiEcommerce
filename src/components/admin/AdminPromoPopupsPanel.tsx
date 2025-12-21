// src/components/admin/AdminPromoPopupsPanel.tsx
// Panel de administración para popups promocionales

import React, { useState, useEffect } from 'react';
import {
  Plus,
  Edit2,
  Trash2,
  Eye,
  EyeOff,
  Copy,
  Sparkles,
  BarChart3,
  Calendar,
  MousePointerClick,
  X as XIcon,
  Monitor,
  Smartphone,
  ChevronDown,
  ChevronUp,
  Save,
  AlertTriangle,
} from 'lucide-react';
import {
  type PromoPopup,
  type PromoPopupInput,
  type PopupType,
  type PopupTrigger,
  type PopupPosition,
  getAllPopups,
  createPopup,
  updatePopup,
  deletePopup,
  POPUP_TEMPLATES,
} from '../../lib/promoPopups';
import { Timestamp } from 'firebase/firestore';

export default function AdminPromoPopupsPanel() {
  const [popups, setPopups] = useState<PromoPopup[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingPopup, setEditingPopup] = useState<PromoPopup | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState<PromoPopupInput>({
    title: '',
    message: '',
    imageUrl: '',
    buttonText: '',
    buttonUrl: '',
    secondaryButtonText: '',
    secondaryButtonUrl: '',
    type: 'modal',
    position: 'center',
    backgroundColor: '#ffffff',
    textColor: '#1f2937',
    accentColor: '#0891b2',
    trigger: 'delay',
    triggerDelay: 5,
    triggerScrollPercent: 50,
    startDate: null,
    endDate: null,
    showOnPages: [],
    excludePages: [],
    showToLoggedIn: null,
    showOnce: true,
    showFrequency: 0,
    active: true,
    priority: 50,
  });

  useEffect(() => {
    loadPopups();
  }, []);

  const loadPopups = async () => {
    setLoading(true);
    const loaded = await getAllPopups();
    setPopups(loaded);
    setLoading(false);
  };

  const resetForm = () => {
    setFormData({
      title: '',
      message: '',
      imageUrl: '',
      buttonText: '',
      buttonUrl: '',
      secondaryButtonText: '',
      secondaryButtonUrl: '',
      type: 'modal',
      position: 'center',
      backgroundColor: '#ffffff',
      textColor: '#1f2937',
      accentColor: '#0891b2',
      trigger: 'delay',
      triggerDelay: 5,
      triggerScrollPercent: 50,
      startDate: null,
      endDate: null,
      showOnPages: [],
      excludePages: [],
      showToLoggedIn: null,
      showOnce: true,
      showFrequency: 0,
      active: true,
      priority: 50,
    });
  };

  const handleCreate = () => {
    resetForm();
    setIsCreating(true);
    setEditingPopup(null);
  };

  const handleEdit = (popup: PromoPopup) => {
    setFormData({
      title: popup.title,
      message: popup.message,
      imageUrl: popup.imageUrl || '',
      buttonText: popup.buttonText || '',
      buttonUrl: popup.buttonUrl || '',
      secondaryButtonText: popup.secondaryButtonText || '',
      secondaryButtonUrl: popup.secondaryButtonUrl || '',
      type: popup.type,
      position: popup.position,
      backgroundColor: popup.backgroundColor || '#ffffff',
      textColor: popup.textColor || '#1f2937',
      accentColor: popup.accentColor || '#0891b2',
      trigger: popup.trigger,
      triggerDelay: popup.triggerDelay || 5,
      triggerScrollPercent: popup.triggerScrollPercent || 50,
      startDate: popup.startDate || null,
      endDate: popup.endDate || null,
      showOnPages: popup.showOnPages || [],
      excludePages: popup.excludePages || [],
      showToLoggedIn: popup.showToLoggedIn ?? null,
      showOnce: popup.showOnce,
      showFrequency: popup.showFrequency || 0,
      active: popup.active,
      priority: popup.priority,
    });
    setEditingPopup(popup);
    setIsCreating(false);
  };

  const handleSave = async () => {
    if (!formData.title || !formData.message) {
      alert('Titulo y mensaje son obligatorios');
      return;
    }

    try {
      if (editingPopup) {
        await updatePopup(editingPopup.id, formData);
      } else {
        await createPopup(formData);
      }
      await loadPopups();
      setEditingPopup(null);
      setIsCreating(false);
      resetForm();
    } catch (error) {
      console.error('Error saving popup:', error);
      alert('Error al guardar el popup');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Estas seguro de eliminar este popup?')) return;
    try {
      await deletePopup(id);
      await loadPopups();
    } catch (error) {
      console.error('Error deleting popup:', error);
    }
  };

  const handleToggleActive = async (popup: PromoPopup) => {
    try {
      await updatePopup(popup.id, { active: !popup.active });
      await loadPopups();
    } catch (error) {
      console.error('Error toggling popup:', error);
    }
  };

  const handleDuplicate = async (popup: PromoPopup) => {
    const newPopup: PromoPopupInput = {
      title: `${popup.title} (copia)`,
      message: popup.message,
      imageUrl: popup.imageUrl,
      buttonText: popup.buttonText,
      buttonUrl: popup.buttonUrl,
      secondaryButtonText: popup.secondaryButtonText,
      secondaryButtonUrl: popup.secondaryButtonUrl,
      type: popup.type,
      position: popup.position,
      backgroundColor: popup.backgroundColor,
      textColor: popup.textColor,
      accentColor: popup.accentColor,
      trigger: popup.trigger,
      triggerDelay: popup.triggerDelay,
      triggerScrollPercent: popup.triggerScrollPercent,
      startDate: null,
      endDate: null,
      showOnPages: popup.showOnPages,
      excludePages: popup.excludePages,
      showToLoggedIn: popup.showToLoggedIn,
      showOnce: popup.showOnce,
      showFrequency: popup.showFrequency,
      active: false,
      priority: popup.priority,
    };
    try {
      await createPopup(newPopup);
      await loadPopups();
    } catch (error) {
      console.error('Error duplicating popup:', error);
    }
  };

  const handleApplyTemplate = (template: Partial<PromoPopupInput>) => {
    setFormData({
      ...formData,
      ...template,
    });
  };

  const formatDate = (timestamp: Timestamp | null | undefined) => {
    if (!timestamp) return 'Sin fecha';
    return timestamp.toDate().toLocaleDateString('es-ES', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const getTriggerLabel = (trigger: PopupTrigger) => {
    const labels: Record<PopupTrigger, string> = {
      immediate: 'Inmediato',
      delay: 'Con retraso',
      'exit-intent': 'Al salir',
      scroll: 'Al hacer scroll',
    };
    return labels[trigger] || trigger;
  };

  const getTypeLabel = (type: PopupType) => {
    const labels: Record<PopupType, string> = {
      modal: 'Modal',
      banner: 'Banner',
      'slide-in': 'Slide-in',
    };
    return labels[type] || type;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  // Show form if editing or creating
  if (isCreating || editingPopup) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-bold text-gray-900">
            {editingPopup ? 'Editar Popup' : 'Crear Popup'}
          </h3>
          <button
            onClick={() => {
              setIsCreating(false);
              setEditingPopup(null);
              resetForm();
            }}
            className="px-4 py-2 text-gray-600 hover:text-gray-900"
          >
            Cancelar
          </button>
        </div>

        {/* Templates */}
        {!editingPopup && (
          <div className="bg-purple-50 rounded-xl p-4 border border-purple-200">
            <h4 className="font-medium text-purple-900 mb-3">Plantillas rapidas</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {POPUP_TEMPLATES.map((template, idx) => (
                <button
                  key={idx}
                  onClick={() => handleApplyTemplate(template)}
                  className="px-3 py-2 bg-white rounded-lg border border-purple-200 text-sm font-medium text-purple-700 hover:bg-purple-100 transition-colors text-left"
                >
                  {template.title}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Form */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-6">
          {/* Basic Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Titulo *
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="Bienvenido a nuestra tienda"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Mensaje *
              </label>
              <textarea
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                rows={3}
                placeholder="Aprovecha nuestras ofertas especiales..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                URL de imagen (opcional)
              </label>
              <input
                type="url"
                value={formData.imageUrl}
                onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="https://..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Prioridad
              </label>
              <input
                type="number"
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) || 0 })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                min="0"
                max="100"
              />
              <p className="text-xs text-gray-500 mt-1">Mayor numero = mayor prioridad</p>
            </div>
          </div>

          {/* Buttons */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Texto boton principal
              </label>
              <input
                type="text"
                value={formData.buttonText}
                onChange={(e) => setFormData({ ...formData, buttonText: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="Ver ofertas"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                URL boton principal
              </label>
              <input
                type="text"
                value={formData.buttonUrl}
                onChange={(e) => setFormData({ ...formData, buttonUrl: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="/productos"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Texto boton secundario
              </label>
              <input
                type="text"
                value={formData.secondaryButtonText}
                onChange={(e) => setFormData({ ...formData, secondaryButtonText: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="No gracias"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                URL boton secundario
              </label>
              <input
                type="text"
                value={formData.secondaryButtonUrl}
                onChange={(e) => setFormData({ ...formData, secondaryButtonUrl: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Appearance */}
          <div>
            <h4 className="font-medium text-gray-900 mb-3">Apariencia</h4>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value as PopupType })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                >
                  <option value="modal">Modal</option>
                  <option value="banner">Banner</option>
                  <option value="slide-in">Slide-in</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Posicion</label>
                <select
                  value={formData.position}
                  onChange={(e) => setFormData({ ...formData, position: e.target.value as PopupPosition })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                >
                  <option value="center">Centro</option>
                  <option value="top">Arriba</option>
                  <option value="bottom">Abajo</option>
                  <option value="bottom-right">Abajo derecha</option>
                  <option value="bottom-left">Abajo izquierda</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Fondo</label>
                <input
                  type="color"
                  value={formData.backgroundColor}
                  onChange={(e) => setFormData({ ...formData, backgroundColor: e.target.value })}
                  className="w-full h-10 rounded-lg cursor-pointer"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Texto</label>
                <input
                  type="color"
                  value={formData.textColor}
                  onChange={(e) => setFormData({ ...formData, textColor: e.target.value })}
                  className="w-full h-10 rounded-lg cursor-pointer"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Acento</label>
                <input
                  type="color"
                  value={formData.accentColor}
                  onChange={(e) => setFormData({ ...formData, accentColor: e.target.value })}
                  className="w-full h-10 rounded-lg cursor-pointer"
                />
              </div>
            </div>
          </div>

          {/* Trigger */}
          <div>
            <h4 className="font-medium text-gray-900 mb-3">Activacion</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Disparador</label>
                <select
                  value={formData.trigger}
                  onChange={(e) => setFormData({ ...formData, trigger: e.target.value as PopupTrigger })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                >
                  <option value="immediate">Inmediato</option>
                  <option value="delay">Con retraso</option>
                  <option value="scroll">Al hacer scroll</option>
                  <option value="exit-intent">Al intentar salir</option>
                </select>
              </div>
              {formData.trigger === 'delay' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Segundos de retraso
                  </label>
                  <input
                    type="number"
                    value={formData.triggerDelay}
                    onChange={(e) => setFormData({ ...formData, triggerDelay: parseInt(e.target.value) || 5 })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    min="1"
                  />
                </div>
              )}
              {formData.trigger === 'scroll' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    % de scroll
                  </label>
                  <input
                    type="number"
                    value={formData.triggerScrollPercent}
                    onChange={(e) => setFormData({ ...formData, triggerScrollPercent: parseInt(e.target.value) || 50 })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    min="1"
                    max="100"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Frequency */}
          <div>
            <h4 className="font-medium text-gray-900 mb-3">Frecuencia</h4>
            <div className="grid grid-cols-2 gap-4">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.showOnce}
                  onChange={(e) => setFormData({ ...formData, showOnce: e.target.checked })}
                  className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
                />
                <span className="text-sm text-gray-700">Mostrar solo una vez por usuario</span>
              </label>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Mostrar cada X horas (0 = siempre)
                </label>
                <input
                  type="number"
                  value={formData.showFrequency}
                  onChange={(e) => setFormData({ ...formData, showFrequency: parseInt(e.target.value) || 0 })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  min="0"
                />
              </div>
            </div>
          </div>

          {/* Targeting */}
          <div>
            <h4 className="font-medium text-gray-900 mb-3">Segmentacion</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Mostrar a
                </label>
                <select
                  value={formData.showToLoggedIn === null ? 'all' : formData.showToLoggedIn ? 'logged-in' : 'guests'}
                  onChange={(e) => {
                    const value = e.target.value;
                    setFormData({
                      ...formData,
                      showToLoggedIn: value === 'all' ? null : value === 'logged-in',
                    });
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                >
                  <option value="all">Todos</option>
                  <option value="logged-in">Solo usuarios registrados</option>
                  <option value="guests">Solo visitantes</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Solo en paginas (separar con comas)
                </label>
                <input
                  type="text"
                  value={formData.showOnPages?.join(', ') || ''}
                  onChange={(e) => setFormData({
                    ...formData,
                    showOnPages: e.target.value ? e.target.value.split(',').map(s => s.trim()) : []
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="/, /productos"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Excluir paginas
                </label>
                <input
                  type="text"
                  value={formData.excludePages?.join(', ') || ''}
                  onChange={(e) => setFormData({
                    ...formData,
                    excludePages: e.target.value ? e.target.value.split(',').map(s => s.trim()) : []
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="/checkout, /confirmacion"
                />
              </div>
            </div>
          </div>

          {/* Active toggle */}
          <div className="flex items-center gap-3 pt-4 border-t border-gray-200">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.active}
                onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                className="w-5 h-5 text-purple-600 rounded focus:ring-purple-500"
              />
              <span className="font-medium text-gray-900">Popup activo</span>
            </label>
          </div>

          {/* Save button */}
          <div className="flex justify-end gap-3 pt-4">
            <button
              onClick={() => setShowPreview(!showPreview)}
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 flex items-center gap-2"
            >
              <Eye className="w-4 h-4" />
              Vista previa
            </button>
            <button
              onClick={handleSave}
              className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              Guardar
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Popups Promocionales</h2>
          <p className="text-gray-600 mt-1">Gestiona banners, modales y notificaciones promocionales</p>
        </div>
        <button
          onClick={handleCreate}
          className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Crear Popup
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="text-2xl font-bold text-gray-900">{popups.length}</div>
          <div className="text-sm text-gray-600">Total popups</div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="text-2xl font-bold text-green-600">
            {popups.filter(p => p.active).length}
          </div>
          <div className="text-sm text-gray-600">Activos</div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="text-2xl font-bold text-cyan-600">
            {popups.reduce((sum, p) => sum + (p.impressions || 0), 0).toLocaleString()}
          </div>
          <div className="text-sm text-gray-600">Impresiones totales</div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="text-2xl font-bold text-purple-600">
            {popups.reduce((sum, p) => sum + (p.clicks || 0), 0).toLocaleString()}
          </div>
          <div className="text-sm text-gray-600">Clicks totales</div>
        </div>
      </div>

      {/* Popups list */}
      {popups.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <Sparkles className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No hay popups</h3>
          <p className="text-gray-600 mb-4">Crea tu primer popup promocional</p>
          <button
            onClick={handleCreate}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
          >
            Crear Popup
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {popups.map((popup) => (
            <div
              key={popup.id}
              className={`bg-white rounded-xl border ${
                popup.active ? 'border-green-200' : 'border-gray-200'
              } overflow-hidden`}
            >
              {/* Header */}
              <div className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  {/* Status indicator */}
                  <div
                    className={`w-3 h-3 rounded-full ${
                      popup.active ? 'bg-green-500' : 'bg-gray-300'
                    }`}
                  />

                  {/* Type badge */}
                  <span
                    className={`px-2 py-1 rounded-full text-xs font-medium ${
                      popup.type === 'modal'
                        ? 'bg-purple-100 text-purple-700'
                        : popup.type === 'banner'
                        ? 'bg-cyan-100 text-cyan-700'
                        : 'bg-orange-100 text-orange-700'
                    }`}
                  >
                    {getTypeLabel(popup.type)}
                  </span>

                  {/* Title */}
                  <div>
                    <h3 className="font-semibold text-gray-900">{popup.title}</h3>
                    <p className="text-sm text-gray-500 truncate max-w-md">{popup.message}</p>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                  {/* Stats */}
                  <div className="flex items-center gap-4 text-sm text-gray-500 mr-4">
                    <span className="flex items-center gap-1">
                      <Eye className="w-4 h-4" />
                      {popup.impressions || 0}
                    </span>
                    <span className="flex items-center gap-1">
                      <MousePointerClick className="w-4 h-4" />
                      {popup.clicks || 0}
                    </span>
                  </div>

                  <button
                    onClick={() => handleToggleActive(popup)}
                    className={`p-2 rounded-lg ${
                      popup.active
                        ? 'bg-green-100 text-green-600 hover:bg-green-200'
                        : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                    }`}
                    title={popup.active ? 'Desactivar' : 'Activar'}
                  >
                    {popup.active ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                  </button>
                  <button
                    onClick={() => handleDuplicate(popup)}
                    className="p-2 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200"
                    title="Duplicar"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleEdit(popup)}
                    className="p-2 rounded-lg bg-blue-100 text-blue-600 hover:bg-blue-200"
                    title="Editar"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(popup.id)}
                    className="p-2 rounded-lg bg-red-100 text-red-600 hover:bg-red-200"
                    title="Eliminar"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setExpandedId(expandedId === popup.id ? null : popup.id)}
                    className="p-2 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200"
                  >
                    {expandedId === popup.id ? (
                      <ChevronUp className="w-4 h-4" />
                    ) : (
                      <ChevronDown className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* Expanded details */}
              {expandedId === popup.id && (
                <div className="px-4 pb-4 border-t border-gray-100">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 text-sm">
                    <div>
                      <span className="text-gray-500">Disparador:</span>
                      <span className="ml-2 font-medium">{getTriggerLabel(popup.trigger)}</span>
                      {popup.trigger === 'delay' && (
                        <span className="text-gray-500"> ({popup.triggerDelay}s)</span>
                      )}
                    </div>
                    <div>
                      <span className="text-gray-500">Posicion:</span>
                      <span className="ml-2 font-medium">{popup.position}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Prioridad:</span>
                      <span className="ml-2 font-medium">{popup.priority}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Una sola vez:</span>
                      <span className="ml-2 font-medium">{popup.showOnce ? 'Si' : 'No'}</span>
                    </div>
                    {popup.buttonText && (
                      <div className="col-span-2">
                        <span className="text-gray-500">Boton:</span>
                        <span className="ml-2 font-medium">{popup.buttonText}</span>
                        {popup.buttonUrl && (
                          <span className="text-gray-400 ml-1">({popup.buttonUrl})</span>
                        )}
                      </div>
                    )}
                    <div>
                      <span className="text-gray-500">Creado:</span>
                      <span className="ml-2 font-medium">{formatDate(popup.createdAt)}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
