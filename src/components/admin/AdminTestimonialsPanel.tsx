// src/components/admin/AdminTestimonialsPanel.tsx
// Panel de administración para testimonios y estadísticas sociales

import React, { useState, useEffect, useRef } from 'react';
import {
  Plus,
  Edit2,
  Trash2,
  Eye,
  EyeOff,
  Save,
  X,
  Star,
  Upload,
  Users,
  BarChart3,
  AlertCircle,
  CheckCircle,
  Loader2,
  RefreshCw,
  ChevronUp,
  ChevronDown,
} from 'lucide-react';
import {
  type Testimonial,
  type SocialStat,
  type TestimonialInput,
  type SocialStatInput,
  subscribeToTestimonials,
  subscribeToStats,
  createTestimonial,
  updateTestimonial,
  deleteTestimonial,
  createStat,
  updateStat,
  deleteStat,
  uploadTestimonialImage,
  getNextTestimonialOrder,
  getNextStatOrder,
  migrateDefaultTestimonials,
} from '../../lib/testimonials';

// Common emoji options for testimonials
const EMOJI_OPTIONS = ['👩', '👨', '👩‍🦰', '👨‍🦱', '👩‍🦳', '👨‍🦳', '👱‍♀️', '👱‍♂️', '🧑', '👴', '👵'];

export default function AdminTestimonialsPanel() {
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [stats, setStats] = useState<SocialStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'testimonials' | 'stats'>('testimonials');

  // Testimonial form
  const [editingTestimonial, setEditingTestimonial] = useState<Testimonial | null>(null);
  const [isCreatingTestimonial, setIsCreatingTestimonial] = useState(false);
  const [testimonialForm, setTestimonialForm] = useState<Omit<TestimonialInput, 'order'>>({
    name: '',
    role: 'Cliente verificado',
    image: '👩',
    rating: 5,
    text: '',
    date: 'Hace unos días',
    active: true,
  });

  // Stat form
  const [editingStat, setEditingStat] = useState<SocialStat | null>(null);
  const [isCreatingStat, setIsCreatingStat] = useState(false);
  const [statForm, setStatForm] = useState<Omit<SocialStatInput, 'order'>>({
    value: '',
    label: '',
    icon: '📊',
    active: true,
  });

  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // ============================================================================
  // EFFECTS
  // ============================================================================

  useEffect(() => {
    const unsubTestimonials = subscribeToTestimonials((loaded) => {
      setTestimonials(loaded);
      setLoading(false);
    });

    const unsubStats = subscribeToStats((loaded) => {
      setStats(loaded);
    });

    return () => {
      unsubTestimonials();
      unsubStats();
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
  // TESTIMONIAL HANDLERS
  // ============================================================================

  const resetTestimonialForm = () => {
    setTestimonialForm({
      name: '',
      role: 'Cliente verificado',
      image: '👩',
      rating: 5,
      text: '',
      date: 'Hace unos días',
      active: true,
    });
  };

  const handleCreateTestimonial = () => {
    resetTestimonialForm();
    setIsCreatingTestimonial(true);
    setEditingTestimonial(null);
  };

  const handleEditTestimonial = (t: Testimonial) => {
    setTestimonialForm({
      name: t.name,
      role: t.role,
      image: t.image,
      rating: t.rating,
      text: t.text,
      date: t.date,
      active: t.active,
    });
    setEditingTestimonial(t);
    setIsCreatingTestimonial(false);
  };

  const handleCancelTestimonial = () => {
    setEditingTestimonial(null);
    setIsCreatingTestimonial(false);
    resetTestimonialForm();
  };

  const handleSaveTestimonial = async () => {
    if (!testimonialForm.name.trim() || !testimonialForm.text.trim()) {
      setError('Nombre y texto son obligatorios');
      return;
    }

    setSaving(true);
    try {
      if (editingTestimonial) {
        await updateTestimonial(editingTestimonial.id, testimonialForm);
        setSuccess('Testimonio actualizado');
      } else {
        const order = await getNextTestimonialOrder();
        await createTestimonial({ ...testimonialForm, order });
        setSuccess('Testimonio creado');
      }
      handleCancelTestimonial();
    } catch (err) {
      setError('Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteTestimonial = async (id: string) => {
    if (!confirm('¿Eliminar este testimonio?')) return;
    try {
      await deleteTestimonial(id);
      setSuccess('Testimonio eliminado');
    } catch (err) {
      setError('Error al eliminar');
    }
  };

  const handleToggleTestimonial = async (t: Testimonial) => {
    try {
      await updateTestimonial(t.id, { active: !t.active });
    } catch (err) {
      setError('Error al cambiar estado');
    }
  };

  // Image upload
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Selecciona una imagen válida');
      return;
    }

    setUploadingImage(true);
    try {
      const url = await uploadTestimonialImage(file);
      setTestimonialForm((prev) => ({ ...prev, image: url }));
      setSuccess('Imagen subida');
    } catch (err) {
      setError('Error al subir imagen');
    } finally {
      setUploadingImage(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // ============================================================================
  // STAT HANDLERS
  // ============================================================================

  const resetStatForm = () => {
    setStatForm({
      value: '',
      label: '',
      icon: '📊',
      active: true,
    });
  };

  const handleCreateStat = () => {
    resetStatForm();
    setIsCreatingStat(true);
    setEditingStat(null);
  };

  const handleEditStat = (s: SocialStat) => {
    setStatForm({
      value: s.value,
      label: s.label,
      icon: s.icon,
      active: s.active,
    });
    setEditingStat(s);
    setIsCreatingStat(false);
  };

  const handleCancelStat = () => {
    setEditingStat(null);
    setIsCreatingStat(false);
    resetStatForm();
  };

  const handleSaveStat = async () => {
    if (!statForm.value.trim() || !statForm.label.trim()) {
      setError('Valor y etiqueta son obligatorios');
      return;
    }

    setSaving(true);
    try {
      if (editingStat) {
        await updateStat(editingStat.id, statForm);
        setSuccess('Estadística actualizada');
      } else {
        const order = await getNextStatOrder();
        await createStat({ ...statForm, order });
        setSuccess('Estadística creada');
      }
      handleCancelStat();
    } catch (err) {
      setError('Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteStat = async (id: string) => {
    if (!confirm('¿Eliminar esta estadística?')) return;
    try {
      await deleteStat(id);
      setSuccess('Estadística eliminada');
    } catch (err) {
      setError('Error al eliminar');
    }
  };

  const handleToggleStat = async (s: SocialStat) => {
    try {
      await updateStat(s.id, { active: !s.active });
    } catch (err) {
      setError('Error al cambiar estado');
    }
  };

  // ============================================================================
  // MIGRATION
  // ============================================================================

  const handleMigrate = async () => {
    setLoading(true);
    try {
      await migrateDefaultTestimonials();
      setSuccess('Datos por defecto añadidos');
    } catch (err) {
      setError('Error al migrar datos');
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
          <span>Cargando...</span>
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
            <h1 className="text-2xl font-bold text-gray-900">Testimonios y Estadísticas</h1>
            <p className="text-gray-600 mt-1">
              Gestiona las reseñas de clientes y estadísticas que aparecen en la web
            </p>
          </div>
          <div className="flex gap-2">
            {testimonials.length === 0 && stats.length === 0 && (
              <button
                onClick={handleMigrate}
                className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
              >
                <RefreshCw className="w-4 h-4" />
                Cargar Por Defecto
              </button>
            )}
          </div>
        </div>

        {/* Messages */}
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3 text-red-700">
            <AlertCircle className="w-5 h-5" />
            <span>{error}</span>
          </div>
        )}
        {success && (
          <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-3 text-green-700">
            <CheckCircle className="w-5 h-5" />
            <span>{success}</span>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setActiveTab('testimonials')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === 'testimonials'
                ? 'bg-cyan-600 text-white'
                : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
            }`}
          >
            <Users className="w-4 h-4" />
            Testimonios ({testimonials.length})
          </button>
          <button
            onClick={() => setActiveTab('stats')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === 'stats'
                ? 'bg-cyan-600 text-white'
                : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            Estadísticas ({stats.length})
          </button>
        </div>

        {/* ================================================================== */}
        {/* TESTIMONIALS TAB */}
        {/* ================================================================== */}
        {activeTab === 'testimonials' && (
          <>
            {/* Add button */}
            <div className="flex justify-end mb-4">
              <button
                onClick={handleCreateTestimonial}
                className="flex items-center gap-2 px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700"
              >
                <Plus className="w-4 h-4" />
                Nuevo Testimonio
              </button>
            </div>

            {/* Testimonial Form */}
            {(isCreatingTestimonial || editingTestimonial) && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-6 p-6">
                <h3 className="text-lg font-semibold mb-4">
                  {editingTestimonial ? 'Editar Testimonio' : 'Nuevo Testimonio'}
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Nombre *</label>
                    <input
                      type="text"
                      value={testimonialForm.name}
                      onChange={(e) =>
                        setTestimonialForm((prev) => ({ ...prev, name: e.target.value }))
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      placeholder="María González"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Rol</label>
                    <input
                      type="text"
                      value={testimonialForm.role}
                      onChange={(e) =>
                        setTestimonialForm((prev) => ({ ...prev, role: e.target.value }))
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      placeholder="Cliente verificado"
                    />
                  </div>
                </div>

                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Texto *</label>
                  <textarea
                    value={testimonialForm.text}
                    onChange={(e) =>
                      setTestimonialForm((prev) => ({ ...prev, text: e.target.value }))
                    }
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    placeholder="¡Increíble calidad! El servicio fue excepcional..."
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Avatar</label>
                    <div className="flex gap-2 flex-wrap">
                      {EMOJI_OPTIONS.map((emoji) => (
                        <button
                          key={emoji}
                          type="button"
                          onClick={() => setTestimonialForm((prev) => ({ ...prev, image: emoji }))}
                          className={`text-2xl p-2 rounded-lg border-2 transition-colors ${
                            testimonialForm.image === emoji
                              ? 'border-cyan-500 bg-cyan-50'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                    {/* Image upload option */}
                    <div className="mt-2">
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        className="hidden"
                        id="testimonial-image"
                      />
                      <label
                        htmlFor="testimonial-image"
                        className="inline-flex items-center gap-2 px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded-lg cursor-pointer hover:bg-gray-200"
                      >
                        {uploadingImage ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Upload className="w-4 h-4" />
                        )}
                        {uploadingImage ? 'Subiendo...' : 'Subir foto'}
                      </label>
                    </div>
                    {testimonialForm.image.startsWith('http') && (
                      <img
                        src={testimonialForm.image}
                        alt="Preview"
                        className="w-12 h-12 rounded-full mt-2 object-cover"
                      />
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Valoración
                    </label>
                    <div className="flex gap-1">
                      {[1, 2, 3, 4, 5].map((n) => (
                        <button
                          key={n}
                          type="button"
                          onClick={() => setTestimonialForm((prev) => ({ ...prev, rating: n }))}
                          className="text-2xl"
                        >
                          {n <= testimonialForm.rating ? '⭐' : '☆'}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Fecha</label>
                    <input
                      type="text"
                      value={testimonialForm.date}
                      onChange={(e) =>
                        setTestimonialForm((prev) => ({ ...prev, date: e.target.value }))
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      placeholder="Hace 2 semanas"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-3 mt-4">
                  <button
                    type="button"
                    onClick={() =>
                      setTestimonialForm((prev) => ({ ...prev, active: !prev.active }))
                    }
                    className={`relative w-12 h-6 rounded-full transition-colors ${
                      testimonialForm.active ? 'bg-green-500' : 'bg-gray-300'
                    }`}
                  >
                    <span
                      className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                        testimonialForm.active ? 'right-1' : 'left-1'
                      }`}
                    />
                  </button>
                  <span className="text-sm text-gray-700">
                    {testimonialForm.active ? 'Visible' : 'Oculto'}
                  </span>
                </div>

                <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
                  <button
                    onClick={handleCancelTestimonial}
                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleSaveTestimonial}
                    disabled={saving}
                    className="flex items-center gap-2 px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 disabled:opacity-50"
                  >
                    {saving ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Save className="w-4 h-4" />
                    )}
                    Guardar
                  </button>
                </div>
              </div>
            )}

            {/* Testimonials List */}
            <div className="space-y-4">
              {testimonials.length === 0 ? (
                <div className="bg-white rounded-xl p-12 text-center border">
                  <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No hay testimonios</h3>
                  <p className="text-gray-500 mb-4">Añade reseñas de tus clientes</p>
                  <button
                    onClick={handleCreateTestimonial}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-cyan-600 text-white rounded-lg"
                  >
                    <Plus className="w-4 h-4" /> Crear Testimonio
                  </button>
                </div>
              ) : (
                testimonials.map((t) => (
                  <div
                    key={t.id}
                    className={`bg-white rounded-xl border p-4 ${!t.active && 'opacity-60'}`}
                  >
                    <div className="flex items-start gap-4">
                      <div className="text-4xl">
                        {t.image.startsWith('http') ? (
                          <img
                            src={t.image}
                            alt={t.name}
                            className="w-12 h-12 rounded-full object-cover"
                          />
                        ) : (
                          t.image
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold">{t.name}</span>
                          <span className="text-sm text-gray-500">• {t.role}</span>
                          {!t.active && (
                            <span className="text-xs px-2 py-0.5 bg-gray-200 rounded-full">
                              Oculto
                            </span>
                          )}
                        </div>
                        <div className="text-yellow-400 text-sm mb-1">{'⭐'.repeat(t.rating)}</div>
                        <p className="text-gray-600 text-sm">{t.text}</p>
                        <p className="text-gray-400 text-xs mt-1">{t.date}</p>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleToggleTestimonial(t)}
                          className={`p-2 rounded-lg ${t.active ? 'text-green-600 hover:bg-green-50' : 'text-gray-400 hover:bg-gray-100'}`}
                        >
                          {t.active ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
                        </button>
                        <button
                          onClick={() => handleEditTestimonial(t)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                        >
                          <Edit2 className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => handleDeleteTestimonial(t.id)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </>
        )}

        {/* ================================================================== */}
        {/* STATS TAB */}
        {/* ================================================================== */}
        {activeTab === 'stats' && (
          <>
            <div className="flex justify-end mb-4">
              <button
                onClick={handleCreateStat}
                className="flex items-center gap-2 px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700"
              >
                <Plus className="w-4 h-4" />
                Nueva Estadística
              </button>
            </div>

            {/* Stat Form */}
            {(isCreatingStat || editingStat) && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-6 p-6">
                <h3 className="text-lg font-semibold mb-4">
                  {editingStat ? 'Editar Estadística' : 'Nueva Estadística'}
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Icono</label>
                    <input
                      type="text"
                      value={statForm.icon}
                      onChange={(e) => setStatForm((prev) => ({ ...prev, icon: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-2xl text-center"
                      placeholder="📊"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Valor *</label>
                    <input
                      type="text"
                      value={statForm.value}
                      onChange={(e) => setStatForm((prev) => ({ ...prev, value: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      placeholder="1,500+"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Etiqueta *
                    </label>
                    <input
                      type="text"
                      value={statForm.label}
                      onChange={(e) => setStatForm((prev) => ({ ...prev, label: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      placeholder="Clientes Satisfechos"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-3 mt-4">
                  <button
                    type="button"
                    onClick={() => setStatForm((prev) => ({ ...prev, active: !prev.active }))}
                    className={`relative w-12 h-6 rounded-full transition-colors ${
                      statForm.active ? 'bg-green-500' : 'bg-gray-300'
                    }`}
                  >
                    <span
                      className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                        statForm.active ? 'right-1' : 'left-1'
                      }`}
                    />
                  </button>
                  <span className="text-sm text-gray-700">
                    {statForm.active ? 'Visible' : 'Oculto'}
                  </span>
                </div>

                <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
                  <button
                    onClick={handleCancelStat}
                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleSaveStat}
                    disabled={saving}
                    className="flex items-center gap-2 px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 disabled:opacity-50"
                  >
                    {saving ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Save className="w-4 h-4" />
                    )}
                    Guardar
                  </button>
                </div>
              </div>
            )}

            {/* Stats List */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {stats.length === 0 ? (
                <div className="col-span-2 bg-white rounded-xl p-12 text-center border">
                  <BarChart3 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No hay estadísticas</h3>
                  <p className="text-gray-500 mb-4">Añade estadísticas para mostrar en la web</p>
                  <button
                    onClick={handleCreateStat}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-cyan-600 text-white rounded-lg"
                  >
                    <Plus className="w-4 h-4" /> Crear Estadística
                  </button>
                </div>
              ) : (
                stats.map((s) => (
                  <div
                    key={s.id}
                    className={`bg-white rounded-xl border p-6 ${!s.active && 'opacity-60'}`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="text-4xl">{s.icon}</div>
                        <div>
                          <div className="text-2xl font-bold text-gray-900">{s.value}</div>
                          <div className="text-gray-600">{s.label}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleToggleStat(s)}
                          className={`p-2 rounded-lg ${s.active ? 'text-green-600 hover:bg-green-50' : 'text-gray-400 hover:bg-gray-100'}`}
                        >
                          {s.active ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
                        </button>
                        <button
                          onClick={() => handleEditStat(s)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                        >
                          <Edit2 className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => handleDeleteStat(s.id)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
