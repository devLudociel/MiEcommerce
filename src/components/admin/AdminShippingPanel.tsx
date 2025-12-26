// src/components/admin/AdminShippingPanel.tsx
// Panel de administración para zonas y métodos de envío

import { useEffect, useState } from 'react';
import { db } from '../../lib/firebase';
import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  onSnapshot,
  Timestamp,
  writeBatch,
} from 'firebase/firestore';
import { notify } from '../../lib/notifications';
import { logger } from '../../lib/logger';
import {
  Truck,
  Plus,
  Edit2,
  Trash2,
  X,
  Save,
  MapPin,
  Package,
  Clock,
  Euro,
  AlertCircle,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  Zap,
  Gift,
} from 'lucide-react';
import { useConfirmDialog } from '../../hooks/useConfirmDialog';
import {
  DEFAULT_CANARY_ZONE,
  DEFAULT_SHIPPING_METHODS,
  isCanaryIslandsPostalCode,
  type ShippingZone,
  type ShippingMethod,
} from '../../lib/shipping';

// ============================================================================
// COMPONENT
// ============================================================================

export default function AdminShippingPanel() {
  const [zones, setZones] = useState<ShippingZone[]>([]);
  const [methods, setMethods] = useState<ShippingMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedZone, setExpandedZone] = useState<string | null>(null);

  // Modals
  const [showZoneModal, setShowZoneModal] = useState(false);
  const [showMethodModal, setShowMethodModal] = useState(false);
  const [editingZone, setEditingZone] = useState<ShippingZone | null>(null);
  const [editingMethod, setEditingMethod] = useState<ShippingMethod | null>(null);
  const [selectedZoneId, setSelectedZoneId] = useState<string | null>(null);

  // Form data
  const [zoneForm, setZoneForm] = useState({
    name: '',
    description: '',
    postalCodes: '',
    provinces: '',
    active: true,
    priority: 100,
  });

  const [methodForm, setMethodForm] = useState({
    name: '',
    description: '',
    basePrice: 0,
    pricePerKg: 0,
    maxWeight: 30,
    estimatedDays: '3-5',
    freeShippingThreshold: 0,
    active: true,
    priority: 10,
  });

  // Test postal code
  const [testPostalCode, setTestPostalCode] = useState('');
  const [testResult, setTestResult] = useState<string | null>(null);

  const { confirm, ConfirmDialog } = useConfirmDialog();

  // ============================================================================
  // LOAD DATA
  // ============================================================================

  useEffect(() => {
    const unsubZones = onSnapshot(
      collection(db, 'shipping_zones'),
      (snapshot) => {
        const items = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as ShippingZone[];
        setZones(items.sort((a, b) => b.priority - a.priority));
        setLoading(false);

        // Expandir primera zona si hay alguna
        if (items.length > 0 && !expandedZone) {
          setExpandedZone(items[0].id);
        }
      },
      (error) => {
        console.error('[AdminShippingPanel] Firestore error:', error);
        logger.error('[AdminShippingPanel] Error loading zones', error);
        setLoading(false);
        notify.error('Error cargando zonas de envío');
      }
    );

    const unsubMethods = onSnapshot(
      collection(db, 'shipping_methods'),
      (snapshot) => {
        const items = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as ShippingMethod[];
        setMethods(items.sort((a, b) => b.priority - a.priority));
      },
      (error) => {
        console.error('[AdminShippingPanel] Firestore error:', error);
        logger.error('[AdminShippingPanel] Error loading methods', error);
      }
    );

    return () => {
      unsubZones();
      unsubMethods();
    };
  }, []);

  // ============================================================================
  // HANDLERS - ZONES
  // ============================================================================

  const handleNewZone = () => {
    setEditingZone(null);
    setZoneForm({
      name: '',
      description: '',
      postalCodes: '',
      provinces: '',
      active: true,
      priority: 100,
    });
    setShowZoneModal(true);
  };

  const handleEditZone = (zone: ShippingZone) => {
    setEditingZone(zone);
    setZoneForm({
      name: zone.name,
      description: zone.description || '',
      postalCodes: zone.postalCodes?.join(', ') || '',
      provinces: zone.provinces?.join(', ') || '',
      active: zone.active,
      priority: zone.priority,
    });
    setShowZoneModal(true);
  };

  const handleSaveZone = async () => {
    if (!zoneForm.name.trim()) {
      notify.error('El nombre es obligatorio');
      return;
    }

    try {
      const data = {
        name: zoneForm.name.trim(),
        description: zoneForm.description.trim(),
        postalCodes: zoneForm.postalCodes
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
        provinces: zoneForm.provinces
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
        active: zoneForm.active,
        priority: zoneForm.priority,
        updatedAt: Timestamp.now(),
      };

      if (editingZone) {
        await updateDoc(doc(db, 'shipping_zones', editingZone.id), data);
        notify.success('Zona actualizada');
      } else {
        await addDoc(collection(db, 'shipping_zones'), {
          ...data,
          createdAt: Timestamp.now(),
        });
        notify.success('Zona creada');
      }

      setShowZoneModal(false);
    } catch (error) {
      logger.error('[AdminShippingPanel] Error saving zone', error);
      notify.error('Error al guardar la zona');
    }
  };

  const handleDeleteZone = async (zone: ShippingZone) => {
    const zoneMethods = methods.filter((m) => m.zoneId === zone.id);

    const confirmed = await confirm({
      title: '¿Eliminar zona?',
      message:
        zoneMethods.length > 0
          ? `Esta zona tiene ${zoneMethods.length} método(s) de envío que también se eliminarán.`
          : 'Esta acción no se puede deshacer.',
      type: 'danger',
      confirmText: 'Eliminar',
      cancelText: 'Cancelar',
    });

    if (confirmed) {
      try {
        const batch = writeBatch(db);

        // Eliminar métodos de la zona
        for (const method of zoneMethods) {
          batch.delete(doc(db, 'shipping_methods', method.id));
        }

        // Eliminar zona
        batch.delete(doc(db, 'shipping_zones', zone.id));

        await batch.commit();
        notify.success('Zona eliminada');
      } catch (error) {
        logger.error('[AdminShippingPanel] Error deleting zone', error);
        notify.error('Error al eliminar la zona');
      }
    }
  };

  // ============================================================================
  // HANDLERS - METHODS
  // ============================================================================

  const handleNewMethod = (zoneId: string) => {
    setSelectedZoneId(zoneId);
    setEditingMethod(null);
    setMethodForm({
      name: '',
      description: '',
      basePrice: 0,
      pricePerKg: 0,
      maxWeight: 30,
      estimatedDays: '3-5',
      freeShippingThreshold: 0,
      active: true,
      priority: 10,
    });
    setShowMethodModal(true);
  };

  const handleEditMethod = (method: ShippingMethod) => {
    setSelectedZoneId(method.zoneId);
    setEditingMethod(method);
    setMethodForm({
      name: method.name,
      description: method.description || '',
      basePrice: method.basePrice,
      pricePerKg: method.pricePerKg || 0,
      maxWeight: method.maxWeight || 30,
      estimatedDays: method.estimatedDays,
      freeShippingThreshold: method.freeShippingThreshold || 0,
      active: method.active,
      priority: method.priority,
    });
    setShowMethodModal(true);
  };

  const handleSaveMethod = async () => {
    if (!methodForm.name.trim()) {
      notify.error('El nombre es obligatorio');
      return;
    }

    if (!selectedZoneId) {
      notify.error('Debe seleccionar una zona');
      return;
    }

    try {
      const data = {
        zoneId: selectedZoneId,
        name: methodForm.name.trim(),
        description: methodForm.description.trim(),
        basePrice: methodForm.basePrice,
        pricePerKg: methodForm.pricePerKg || undefined,
        maxWeight: methodForm.maxWeight || undefined,
        estimatedDays: methodForm.estimatedDays,
        freeShippingThreshold: methodForm.freeShippingThreshold || undefined,
        active: methodForm.active,
        priority: methodForm.priority,
        updatedAt: Timestamp.now(),
      };

      if (editingMethod) {
        await updateDoc(doc(db, 'shipping_methods', editingMethod.id), data);
        notify.success('Método actualizado');
      } else {
        await addDoc(collection(db, 'shipping_methods'), {
          ...data,
          createdAt: Timestamp.now(),
        });
        notify.success('Método creado');
      }

      setShowMethodModal(false);
    } catch (error) {
      logger.error('[AdminShippingPanel] Error saving method', error);
      notify.error('Error al guardar el método');
    }
  };

  const handleDeleteMethod = async (method: ShippingMethod) => {
    const confirmed = await confirm({
      title: '¿Eliminar método de envío?',
      message: `Se eliminará "${method.name}". Esta acción no se puede deshacer.`,
      type: 'danger',
      confirmText: 'Eliminar',
      cancelText: 'Cancelar',
    });

    if (confirmed) {
      try {
        await deleteDoc(doc(db, 'shipping_methods', method.id));
        notify.success('Método eliminado');
      } catch (error) {
        logger.error('[AdminShippingPanel] Error deleting method', error);
        notify.error('Error al eliminar el método');
      }
    }
  };

  const handleToggleMethodActive = async (method: ShippingMethod) => {
    try {
      await updateDoc(doc(db, 'shipping_methods', method.id), {
        active: !method.active,
        updatedAt: Timestamp.now(),
      });
      notify.success(method.active ? 'Método desactivado' : 'Método activado');
    } catch (error) {
      logger.error('[AdminShippingPanel] Error toggling method', error);
      notify.error('Error al cambiar el estado');
    }
  };

  // ============================================================================
  // INITIALIZE DEFAULT DATA
  // ============================================================================

  const handleInitializeDefaults = async () => {
    const confirmed = await confirm({
      title: '¿Crear configuración predeterminada?',
      message:
        'Se creará la zona "Islas Canarias" con métodos de envío estándar, express y recogida en tienda.',
      type: 'info',
      confirmText: 'Crear',
      cancelText: 'Cancelar',
    });

    if (confirmed) {
      try {
        // Crear zona
        const zoneRef = await addDoc(collection(db, 'shipping_zones'), {
          ...DEFAULT_CANARY_ZONE,
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
        });

        // Crear métodos
        for (const method of DEFAULT_SHIPPING_METHODS) {
          await addDoc(collection(db, 'shipping_methods'), {
            ...method,
            zoneId: zoneRef.id,
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now(),
          });
        }

        notify.success('Configuración predeterminada creada');
      } catch (error) {
        logger.error('[AdminShippingPanel] Error initializing defaults', error);
        notify.error('Error al crear la configuración');
      }
    }
  };

  // ============================================================================
  // TEST POSTAL CODE
  // ============================================================================

  const handleTestPostalCode = () => {
    if (!testPostalCode.trim()) {
      setTestResult(null);
      return;
    }

    const isCanary = isCanaryIslandsPostalCode(testPostalCode);

    if (isCanary) {
      // Buscar si hay zona configurada
      const matchingZone = zones.find((zone) => {
        if (!zone.postalCodes) return false;
        const code = parseInt(testPostalCode, 10);

        for (const range of zone.postalCodes) {
          if (range.includes('-')) {
            const [start, end] = range.split('-').map((s) => parseInt(s.trim(), 10));
            if (code >= start && code <= end) return true;
          } else if (parseInt(range.trim(), 10) === code) {
            return true;
          }
        }
        return false;
      });

      if (matchingZone) {
        const zoneMethods = methods.filter((m) => m.zoneId === matchingZone.id && m.active);
        setTestResult(
          `✅ Código postal válido (Canarias)\n` +
            `📍 Zona: ${matchingZone.name}\n` +
            `📦 Métodos: ${zoneMethods.length > 0 ? zoneMethods.map((m) => m.name).join(', ') : 'Ninguno configurado'}`
        );
      } else {
        setTestResult('⚠️ Código postal de Canarias, pero sin zona configurada');
      }
    } else {
      setTestResult('❌ Código postal fuera de la zona de envío (solo Canarias)');
    }
  };

  // ============================================================================
  // RENDER
  // ============================================================================

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <ConfirmDialog />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Truck className="w-7 h-7 text-cyan-500" />
            Zonas de Envío
          </h1>
          <p className="text-gray-500 mt-1">Configura las zonas y métodos de envío</p>
        </div>
        <div className="flex gap-2">
          {zones.length === 0 && (
            <button
              onClick={handleInitializeDefaults}
              className="inline-flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
            >
              <Zap className="w-4 h-4" />
              Crear Canarias
            </button>
          )}
          <button
            onClick={handleNewZone}
            className="inline-flex items-center gap-2 px-4 py-2 bg-cyan-500 text-white rounded-lg hover:bg-cyan-600 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Nueva Zona
          </button>
        </div>
      </div>

      {/* Test Postal Code */}
      <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
        <h3 className="font-medium text-gray-700 mb-3 flex items-center gap-2">
          <MapPin className="w-4 h-4" />
          Probar Código Postal
        </h3>
        <div className="flex gap-3">
          <input
            type="text"
            value={testPostalCode}
            onChange={(e) => setTestPostalCode(e.target.value)}
            placeholder="Ej: 35001"
            className="flex-1 max-w-xs px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
            maxLength={5}
          />
          <button
            onClick={handleTestPostalCode}
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
          >
            Probar
          </button>
        </div>
        {testResult && (
          <pre className="mt-3 p-3 bg-gray-50 rounded-lg text-sm whitespace-pre-wrap">
            {testResult}
          </pre>
        )}
      </div>

      {/* Info Banner */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
        <div className="flex gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-amber-800">Solo envíos a Canarias</p>
            <p className="text-sm text-amber-700 mt-1">
              Actualmente solo se realizan envíos a las Islas Canarias (códigos postales 35000-35999
              y 38000-38999). Los clientes de otras zonas verán un mensaje indicando que no hay
              envío disponible.
            </p>
          </div>
        </div>
      </div>

      {/* Zones List */}
      {zones.length === 0 ? (
        <div className="bg-white rounded-xl p-12 border border-gray-200 shadow-sm text-center">
          <Truck className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 mb-4">No hay zonas de envío configuradas</p>
          <button
            onClick={handleInitializeDefaults}
            className="inline-flex items-center gap-2 px-4 py-2 bg-cyan-500 text-white rounded-lg hover:bg-cyan-600 transition-colors"
          >
            <Zap className="w-4 h-4" />
            Crear configuración para Canarias
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {zones.map((zone) => {
            const zoneMethods = methods.filter((m) => m.zoneId === zone.id);
            const isExpanded = expandedZone === zone.id;

            return (
              <div
                key={zone.id}
                className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden"
              >
                {/* Zone Header */}
                <div
                  onClick={() => setExpandedZone(isExpanded ? null : zone.id)}
                  className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        zone.active ? 'bg-cyan-100' : 'bg-gray-100'
                      }`}
                    >
                      <MapPin
                        className={`w-5 h-5 ${zone.active ? 'text-cyan-600' : 'text-gray-400'}`}
                      />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-gray-900">{zone.name}</h3>
                        {!zone.active && (
                          <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full">
                            Inactiva
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-500">
                        {zoneMethods.length} método(s) de envío
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEditZone(zone);
                      }}
                      className="p-2 text-gray-500 hover:text-cyan-600 hover:bg-cyan-50 rounded-lg transition-colors"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteZone(zone);
                      }}
                      className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    {isExpanded ? (
                      <ChevronUp className="w-5 h-5 text-gray-400" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-gray-400" />
                    )}
                  </div>
                </div>

                {/* Zone Content (Methods) */}
                {isExpanded && (
                  <div className="border-t border-gray-100 p-4 bg-gray-50">
                    {/* Zone Info */}
                    <div className="mb-4 text-sm text-gray-600">
                      <p>
                        <strong>Códigos postales:</strong>{' '}
                        {zone.postalCodes?.join(', ') || 'No definidos'}
                      </p>
                      {zone.provinces && zone.provinces.length > 0 && (
                        <p>
                          <strong>Provincias:</strong> {zone.provinces.join(', ')}
                        </p>
                      )}
                    </div>

                    {/* Methods */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium text-gray-700">Métodos de envío</h4>
                        <button
                          onClick={() => handleNewMethod(zone.id)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 text-sm bg-cyan-500 text-white rounded-lg hover:bg-cyan-600 transition-colors"
                        >
                          <Plus className="w-3 h-3" />
                          Añadir
                        </button>
                      </div>

                      {zoneMethods.length === 0 ? (
                        <p className="text-sm text-gray-500 italic">
                          No hay métodos de envío configurados para esta zona
                        </p>
                      ) : (
                        <div className="grid gap-3">
                          {zoneMethods.map((method) => (
                            <div
                              key={method.id}
                              className={`p-4 bg-white rounded-lg border ${
                                method.active ? 'border-gray-200' : 'border-gray-200 opacity-60'
                              }`}
                            >
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-1">
                                    <Package className="w-4 h-4 text-gray-400" />
                                    <span className="font-medium text-gray-900">{method.name}</span>
                                    {!method.active && (
                                      <span className="px-2 py-0.5 bg-gray-100 text-gray-500 text-xs rounded-full">
                                        Inactivo
                                      </span>
                                    )}
                                  </div>
                                  {method.description && (
                                    <p className="text-sm text-gray-500 mb-2">
                                      {method.description}
                                    </p>
                                  )}
                                  <div className="flex flex-wrap gap-3 text-sm">
                                    <span className="inline-flex items-center gap-1 text-gray-600">
                                      <Euro className="w-3 h-3" />
                                      {method.basePrice === 0
                                        ? 'Gratis'
                                        : `${method.basePrice.toFixed(2)}€`}
                                    </span>
                                    <span className="inline-flex items-center gap-1 text-gray-600">
                                      <Clock className="w-3 h-3" />
                                      {method.estimatedDays} días
                                    </span>
                                    {method.freeShippingThreshold &&
                                      method.freeShippingThreshold > 0 && (
                                        <span className="inline-flex items-center gap-1 text-green-600">
                                          <Gift className="w-3 h-3" />
                                          Gratis desde {method.freeShippingThreshold}€
                                        </span>
                                      )}
                                  </div>
                                </div>
                                <div className="flex items-center gap-1">
                                  <button
                                    onClick={() => handleToggleMethodActive(method)}
                                    className={`p-1.5 rounded-lg transition-colors ${
                                      method.active
                                        ? 'text-green-600 hover:bg-green-50'
                                        : 'text-gray-400 hover:bg-gray-100'
                                    }`}
                                    title={method.active ? 'Desactivar' : 'Activar'}
                                  >
                                    <CheckCircle className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => handleEditMethod(method)}
                                    className="p-1.5 text-gray-500 hover:text-cyan-600 hover:bg-cyan-50 rounded-lg transition-colors"
                                  >
                                    <Edit2 className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteMethod(method)}
                                    className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Zone Modal */}
      {showZoneModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">
                {editingZone ? 'Editar Zona' : 'Nueva Zona'}
              </h2>
              <button
                onClick={() => setShowZoneModal(false)}
                className="p-1 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre *</label>
                <input
                  type="text"
                  value={zoneForm.name}
                  onChange={(e) => setZoneForm({ ...zoneForm, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
                  placeholder="Ej: Islas Canarias"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
                <input
                  type="text"
                  value={zoneForm.description}
                  onChange={(e) => setZoneForm({ ...zoneForm, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
                  placeholder="Ej: Envíos a Las Palmas y Tenerife"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Códigos Postales
                </label>
                <input
                  type="text"
                  value={zoneForm.postalCodes}
                  onChange={(e) => setZoneForm({ ...zoneForm, postalCodes: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
                  placeholder="Ej: 35000-35999, 38000-38999"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Usa rangos (35000-35999) o códigos individuales separados por comas
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Provincias</label>
                <input
                  type="text"
                  value={zoneForm.provinces}
                  onChange={(e) => setZoneForm({ ...zoneForm, provinces: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
                  placeholder="Ej: Las Palmas, Santa Cruz de Tenerife"
                />
              </div>
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={zoneForm.active}
                    onChange={(e) => setZoneForm({ ...zoneForm, active: e.target.checked })}
                    className="w-4 h-4 text-cyan-500 rounded focus:ring-cyan-500"
                  />
                  <span className="text-sm text-gray-700">Zona activa</span>
                </label>
              </div>
            </div>
            <div className="flex justify-end gap-2 p-4 border-t border-gray-200 bg-gray-50">
              <button
                onClick={() => setShowZoneModal(false)}
                className="px-4 py-2 text-gray-600 hover:bg-gray-200 rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveZone}
                className="inline-flex items-center gap-2 px-4 py-2 bg-cyan-500 text-white rounded-lg hover:bg-cyan-600 transition-colors"
              >
                <Save className="w-4 h-4" />
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Method Modal */}
      {showMethodModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">
                {editingMethod ? 'Editar Método' : 'Nuevo Método de Envío'}
              </h2>
              <button
                onClick={() => setShowMethodModal(false)}
                className="p-1 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre *</label>
                <input
                  type="text"
                  value={methodForm.name}
                  onChange={(e) => setMethodForm({ ...methodForm, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
                  placeholder="Ej: Envío Estándar"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
                <input
                  type="text"
                  value={methodForm.description}
                  onChange={(e) => setMethodForm({ ...methodForm, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
                  placeholder="Ej: Entrega en 3-5 días laborables"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Precio Base (€)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={methodForm.basePrice}
                    onChange={(e) =>
                      setMethodForm({ ...methodForm, basePrice: parseFloat(e.target.value) || 0 })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Precio por kg extra (€)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={methodForm.pricePerKg}
                    onChange={(e) =>
                      setMethodForm({ ...methodForm, pricePerKg: parseFloat(e.target.value) || 0 })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tiempo estimado (días)
                  </label>
                  <input
                    type="text"
                    value={methodForm.estimatedDays}
                    onChange={(e) =>
                      setMethodForm({ ...methodForm, estimatedDays: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
                    placeholder="Ej: 3-5"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Peso máximo (kg)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={methodForm.maxWeight}
                    onChange={(e) =>
                      setMethodForm({ ...methodForm, maxWeight: parseInt(e.target.value) || 0 })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Envío gratis desde (€)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={methodForm.freeShippingThreshold}
                  onChange={(e) =>
                    setMethodForm({
                      ...methodForm,
                      freeShippingThreshold: parseFloat(e.target.value) || 0,
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
                  placeholder="Dejar en 0 para no aplicar"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Pedidos superiores a este importe tendrán envío gratis
                </p>
              </div>
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={methodForm.active}
                    onChange={(e) => setMethodForm({ ...methodForm, active: e.target.checked })}
                    className="w-4 h-4 text-cyan-500 rounded focus:ring-cyan-500"
                  />
                  <span className="text-sm text-gray-700">Método activo</span>
                </label>
              </div>
            </div>
            <div className="flex justify-end gap-2 p-4 border-t border-gray-200 bg-gray-50">
              <button
                onClick={() => setShowMethodModal(false)}
                className="px-4 py-2 text-gray-600 hover:bg-gray-200 rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveMethod}
                className="inline-flex items-center gap-2 px-4 py-2 bg-cyan-500 text-white rounded-lg hover:bg-cyan-600 transition-colors"
              >
                <Save className="w-4 h-4" />
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
