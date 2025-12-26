// src/components/admin/AdminContactInfoPanel.tsx
// Panel de administración para información de contacto

import { useState, useEffect } from 'react';
import {
  subscribeToContactInfo,
  saveContactInfo,
  DEFAULT_CONTACT_INFO,
  SOCIAL_PLATFORMS,
  getPlatformInfo,
  isValidPhone,
  isValidEmail,
  isValidUrl,
  type ContactInfoInput,
  type SocialLink,
  type ScheduleItem,
} from '../../lib/contactInfo';

type TabType = 'basic' | 'social' | 'schedule' | 'company';

export default function AdminContactInfoPanel() {
  const [activeTab, setActiveTab] = useState<TabType>('basic');
  const [contactInfo, setContactInfo] = useState<ContactInfoInput>(DEFAULT_CONTACT_INFO);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Load contact info
  useEffect(() => {
    const unsubscribe = subscribeToContactInfo((info) => {
      if (info) {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { updatedAt, ...rest } = info;
        setContactInfo(rest);
      } else {
        setContactInfo(DEFAULT_CONTACT_INFO);
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Handle form changes
  const handleChange = (field: keyof ContactInfoInput, value: unknown) => {
    setContactInfo((prev) => ({ ...prev, [field]: value }));
    setHasChanges(true);
    setError(null);
    setSuccess(null);
  };

  // Save changes
  const handleSave = async () => {
    // Validation
    if (!isValidPhone(contactInfo.phone)) {
      setError('El número de teléfono no es válido');
      return;
    }
    if (!isValidEmail(contactInfo.email)) {
      setError('El email no es válido');
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      await saveContactInfo(contactInfo);
      setSuccess('Información guardada correctamente');
      setHasChanges(false);
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error('Error saving contact info:', err);
      setError('Error al guardar la información');
    } finally {
      setIsSaving(false);
    }
  };

  // Reset to defaults
  const handleResetDefaults = () => {
    if (confirm('¿Estás seguro de que quieres restaurar los valores por defecto?')) {
      setContactInfo(DEFAULT_CONTACT_INFO);
      setHasChanges(true);
    }
  };

  // Social links handlers
  const handleAddSocialLink = () => {
    const newLink: SocialLink = {
      id: Date.now().toString(),
      platform: 'Instagram',
      icon: '📷',
      url: '',
      active: true,
      order: contactInfo.socialLinks.length,
    };
    handleChange('socialLinks', [...contactInfo.socialLinks, newLink]);
  };

  const handleUpdateSocialLink = (id: string, updates: Partial<SocialLink>) => {
    const updated = contactInfo.socialLinks.map((link) =>
      link.id === id ? { ...link, ...updates } : link
    );
    handleChange('socialLinks', updated);
  };

  const handleDeleteSocialLink = (id: string) => {
    const filtered = contactInfo.socialLinks.filter((link) => link.id !== id);
    handleChange('socialLinks', filtered);
  };

  const handleMoveSocialLink = (id: string, direction: 'up' | 'down') => {
    const links = [...contactInfo.socialLinks];
    const index = links.findIndex((l) => l.id === id);
    if (direction === 'up' && index > 0) {
      [links[index], links[index - 1]] = [links[index - 1], links[index]];
    } else if (direction === 'down' && index < links.length - 1) {
      [links[index], links[index + 1]] = [links[index + 1], links[index]];
    }
    // Update order values
    links.forEach((link, i) => (link.order = i));
    handleChange('socialLinks', links);
  };

  // Schedule handlers
  const handleAddScheduleItem = () => {
    const newItem: ScheduleItem = {
      id: Date.now().toString(),
      day: '',
      hours: '',
      order: contactInfo.schedule.length,
    };
    handleChange('schedule', [...contactInfo.schedule, newItem]);
  };

  const handleUpdateScheduleItem = (id: string, updates: Partial<ScheduleItem>) => {
    const updated = contactInfo.schedule.map((item) =>
      item.id === id ? { ...item, ...updates } : item
    );
    handleChange('schedule', updated);
  };

  const handleDeleteScheduleItem = (id: string) => {
    const filtered = contactInfo.schedule.filter((item) => item.id !== id);
    handleChange('schedule', filtered);
  };

  const handleMoveScheduleItem = (id: string, direction: 'up' | 'down') => {
    const items = [...contactInfo.schedule];
    const index = items.findIndex((i) => i.id === id);
    if (direction === 'up' && index > 0) {
      [items[index], items[index - 1]] = [items[index - 1], items[index]];
    } else if (direction === 'down' && index < items.length - 1) {
      [items[index], items[index + 1]] = [items[index + 1], items[index]];
    }
    items.forEach((item, i) => (item.order = i));
    handleChange('schedule', items);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-cyan-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 mt-32">
      <div className="container mx-auto px-4 max-w-4xl">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">Información de Contacto</h1>
            <p className="text-gray-600 mt-1">
              Gestiona la información de contacto que aparece en toda la web
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleResetDefaults}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
            >
              Restaurar valores
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving || !hasChanges}
              className="px-6 py-2 bg-cyan-600 text-white font-medium rounded-lg hover:bg-cyan-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
            >
              {isSaving ? (
                <>
                  <span className="animate-spin">⏳</span>
                  Guardando...
                </>
              ) : (
                <>💾 Guardar Cambios</>
              )}
            </button>
          </div>
        </div>

        {/* Messages */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg flex items-center gap-2">
            <span>❌</span> {error}
          </div>
        )}

        {success && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 text-green-700 rounded-lg flex items-center gap-2">
            <span>✅</span> {success}
          </div>
        )}

        {hasChanges && (
          <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 text-yellow-700 rounded-lg flex items-center gap-2">
            <span>⚠️</span> Tienes cambios sin guardar
          </div>
        )}

        {/* Tabs */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="flex border-b border-gray-200 overflow-x-auto">
            {[
              { id: 'basic', label: 'Contacto Básico', icon: '📞' },
              { id: 'social', label: 'Redes Sociales', icon: '🌐' },
              { id: 'schedule', label: 'Horarios', icon: '🕐' },
              { id: 'company', label: 'Empresa', icon: '🏢' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as TabType)}
                className={`flex items-center gap-2 px-6 py-4 font-medium transition-colors whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'text-cyan-600 border-b-2 border-cyan-600 bg-cyan-50'
                    : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
                }`}
              >
                <span>{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </div>

          <div className="p-6">
            {/* Basic Contact Tab */}
            {activeTab === 'basic' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Teléfono (formato internacional)
                    </label>
                    <input
                      type="text"
                      value={contactInfo.phone}
                      onChange={(e) => handleChange('phone', e.target.value)}
                      placeholder="+34645341452"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                    />
                    <p className="text-xs text-gray-500 mt-1">Sin espacios, con código de país</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Teléfono (formato display)
                    </label>
                    <input
                      type="text"
                      value={contactInfo.phoneDisplay}
                      onChange={(e) => handleChange('phoneDisplay', e.target.value)}
                      placeholder="645 341 452"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                    />
                    <p className="text-xs text-gray-500 mt-1">Como se mostrará al usuario</p>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                  <input
                    type="email"
                    value={contactInfo.email}
                    onChange={(e) => handleChange('email', e.target.value)}
                    placeholder="info@imprimarte.com"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      WhatsApp (solo número)
                    </label>
                    <input
                      type="text"
                      value={contactInfo.whatsapp}
                      onChange={(e) => handleChange('whatsapp', e.target.value)}
                      placeholder="34645341452"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                    />
                    <p className="text-xs text-gray-500 mt-1">Código de país + número, sin +</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Mensaje por defecto WhatsApp
                    </label>
                    <input
                      type="text"
                      value={contactInfo.whatsappMessage}
                      onChange={(e) => handleChange('whatsappMessage', e.target.value)}
                      placeholder="¡Hola! Tengo una consulta..."
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                    />
                  </div>
                </div>

                <hr className="border-gray-200" />

                <h3 className="font-semibold text-gray-800">Dirección</h3>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Dirección (calle y número)
                  </label>
                  <input
                    type="text"
                    value={contactInfo.address}
                    onChange={(e) => handleChange('address', e.target.value)}
                    placeholder="Calle Principal, 123"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                  />
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Ciudad</label>
                    <input
                      type="text"
                      value={contactInfo.city}
                      onChange={(e) => handleChange('city', e.target.value)}
                      placeholder="Santa Cruz de Tenerife"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Provincia
                    </label>
                    <input
                      type="text"
                      value={contactInfo.province}
                      onChange={(e) => handleChange('province', e.target.value)}
                      placeholder="Canarias"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Código Postal
                    </label>
                    <input
                      type="text"
                      value={contactInfo.postalCode}
                      onChange={(e) => handleChange('postalCode', e.target.value)}
                      placeholder="38001"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">País</label>
                    <input
                      type="text"
                      value={contactInfo.country}
                      onChange={(e) => handleChange('country', e.target.value)}
                      placeholder="España"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    URL de Google Maps Embed
                  </label>
                  <input
                    type="text"
                    value={contactInfo.googleMapsEmbed}
                    onChange={(e) => handleChange('googleMapsEmbed', e.target.value)}
                    placeholder="https://www.google.com/maps/embed?pb=..."
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Ve a Google Maps → Compartir → Incorporar un mapa → Copia la URL del src
                  </p>
                </div>
              </div>
            )}

            {/* Social Media Tab */}
            {activeTab === 'social' && (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <p className="text-sm text-gray-600">
                    Gestiona los enlaces a tus redes sociales. El enlace de WhatsApp se genera
                    automáticamente.
                  </p>
                  <button
                    onClick={handleAddSocialLink}
                    className="px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 transition-colors flex items-center gap-2"
                  >
                    <span>+</span> Añadir Red Social
                  </button>
                </div>

                <div className="space-y-4">
                  {contactInfo.socialLinks
                    .sort((a, b) => a.order - b.order)
                    .map((link, index) => (
                      <div
                        key={link.id}
                        className={`p-4 border rounded-lg ${
                          link.active ? 'border-gray-200 bg-white' : 'border-gray-100 bg-gray-50'
                        }`}
                      >
                        <div className="flex items-start gap-4">
                          <div className="flex flex-col gap-1">
                            <button
                              onClick={() => handleMoveSocialLink(link.id, 'up')}
                              disabled={index === 0}
                              className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30"
                            >
                              ▲
                            </button>
                            <button
                              onClick={() => handleMoveSocialLink(link.id, 'down')}
                              disabled={index === contactInfo.socialLinks.length - 1}
                              className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30"
                            >
                              ▼
                            </button>
                          </div>

                          <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-4">
                            <div>
                              <label className="block text-xs font-medium text-gray-500 mb-1">
                                Plataforma
                              </label>
                              <select
                                value={link.platform}
                                onChange={(e) => {
                                  const platform = getPlatformInfo(e.target.value);
                                  handleUpdateSocialLink(link.id, {
                                    platform: e.target.value,
                                    icon: platform.icon,
                                  });
                                }}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500"
                              >
                                {SOCIAL_PLATFORMS.map((p) => (
                                  <option key={p.value} value={p.value}>
                                    {p.icon} {p.label}
                                  </option>
                                ))}
                              </select>
                            </div>

                            <div className="md:col-span-2">
                              <label className="block text-xs font-medium text-gray-500 mb-1">
                                URL {link.platform === 'WhatsApp' && '(se genera automáticamente)'}
                              </label>
                              <input
                                type="text"
                                value={link.url}
                                onChange={(e) =>
                                  handleUpdateSocialLink(link.id, { url: e.target.value })
                                }
                                placeholder={
                                  link.platform === 'WhatsApp'
                                    ? 'Automático desde WhatsApp'
                                    : 'https://...'
                                }
                                disabled={link.platform === 'WhatsApp'}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 disabled:bg-gray-100"
                              />
                            </div>

                            <div className="flex items-end gap-2">
                              <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={link.active}
                                  onChange={(e) =>
                                    handleUpdateSocialLink(link.id, { active: e.target.checked })
                                  }
                                  className="w-4 h-4 text-cyan-600 rounded focus:ring-cyan-500"
                                />
                                <span className="text-sm text-gray-600">Activo</span>
                              </label>
                              <button
                                onClick={() => handleDeleteSocialLink(link.id)}
                                className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                title="Eliminar"
                              >
                                🗑️
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}

                  {contactInfo.socialLinks.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      No hay redes sociales configuradas. Haz clic en "Añadir Red Social" para
                      empezar.
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Schedule Tab */}
            {activeTab === 'schedule' && (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <p className="text-sm text-gray-600">
                    Configura los horarios de atención que se mostrarán a los clientes.
                  </p>
                  <button
                    onClick={handleAddScheduleItem}
                    className="px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 transition-colors flex items-center gap-2"
                  >
                    <span>+</span> Añadir Horario
                  </button>
                </div>

                <div className="space-y-3">
                  {contactInfo.schedule
                    .sort((a, b) => a.order - b.order)
                    .map((item, index) => (
                      <div
                        key={item.id}
                        className="flex items-center gap-4 p-4 bg-white border border-gray-200 rounded-lg"
                      >
                        <div className="flex flex-col gap-1">
                          <button
                            onClick={() => handleMoveScheduleItem(item.id, 'up')}
                            disabled={index === 0}
                            className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30"
                          >
                            ▲
                          </button>
                          <button
                            onClick={() => handleMoveScheduleItem(item.id, 'down')}
                            disabled={index === contactInfo.schedule.length - 1}
                            className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30"
                          >
                            ▼
                          </button>
                        </div>

                        <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs font-medium text-gray-500 mb-1">
                              Día(s)
                            </label>
                            <input
                              type="text"
                              value={item.day}
                              onChange={(e) =>
                                handleUpdateScheduleItem(item.id, { day: e.target.value })
                              }
                              placeholder="Lunes - Viernes"
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-medium text-gray-500 mb-1">
                              Horario
                            </label>
                            <input
                              type="text"
                              value={item.hours}
                              onChange={(e) =>
                                handleUpdateScheduleItem(item.id, { hours: e.target.value })
                              }
                              placeholder="9:00 - 20:00"
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500"
                            />
                          </div>
                        </div>

                        <button
                          onClick={() => handleDeleteScheduleItem(item.id)}
                          className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                          title="Eliminar"
                        >
                          🗑️
                        </button>
                      </div>
                    ))}

                  {contactInfo.schedule.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      No hay horarios configurados. Haz clic en "Añadir Horario" para empezar.
                    </div>
                  )}
                </div>

                {/* Preview */}
                {contactInfo.schedule.length > 0 && (
                  <div className="mt-8 p-6 bg-gray-50 rounded-xl">
                    <h4 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                      <span>👁️</span> Vista previa
                    </h4>
                    <div className="space-y-2">
                      {contactInfo.schedule.map((item) => (
                        <div
                          key={item.id}
                          className="flex justify-between py-2 border-b border-gray-200 last:border-0"
                        >
                          <span className="font-medium text-gray-700">{item.day}</span>
                          <span className="text-cyan-600">{item.hours}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Company Tab */}
            {activeTab === 'company' && (
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nombre de la empresa
                  </label>
                  <input
                    type="text"
                    value={contactInfo.companyName}
                    onChange={(e) => handleChange('companyName', e.target.value)}
                    placeholder="ImprimeArte"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Eslogan</label>
                  <input
                    type="text"
                    value={contactInfo.companySlogan}
                    onChange={(e) => handleChange('companySlogan', e.target.value)}
                    placeholder="Impresión y personalización"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Descripción de la empresa
                  </label>
                  <textarea
                    value={contactInfo.companyDescription}
                    onChange={(e) => handleChange('companyDescription', e.target.value)}
                    placeholder="Especialistas en impresión y personalización..."
                    rows={4}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent resize-none"
                  />
                </div>

                {/* Preview Card */}
                <div className="mt-8 p-6 bg-gray-900 rounded-xl text-white">
                  <h4 className="font-semibold mb-4 flex items-center gap-2 text-cyan-400">
                    <span>👁️</span> Vista previa (como se verá en el footer)
                  </h4>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-xl flex items-center justify-center text-white font-black text-xl">
                      {contactInfo.companyName.substring(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="text-xl font-black">{contactInfo.companyName || 'Nombre'}</h3>
                      <p className="text-sm text-gray-400">
                        {contactInfo.companySlogan || 'Eslogan'}
                      </p>
                    </div>
                  </div>
                  <p className="text-gray-400 text-sm">
                    {contactInfo.companyDescription || 'Descripción de la empresa...'}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
