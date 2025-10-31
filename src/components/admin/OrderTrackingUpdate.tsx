import { useState } from 'react';
import { updateOrderTracking, addTrackingEvent } from '../../lib/firebase';
import type { OrderData, TrackingEvent } from '../../lib/firebase';
import { notify } from '../../lib/notifications';
import { logger } from '../../lib/logger';
import { useAuth } from '../hooks/useAuth';

interface OrderTrackingUpdateProps {
  order: OrderData;
  onUpdate?: () => void;
}

export default function OrderTrackingUpdate({ order, onUpdate }: OrderTrackingUpdateProps) {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  // Form state for tracking info
  const [trackingNumber, setTrackingNumber] = useState(order.trackingNumber || '');
  const [carrier, setCarrier] = useState(order.carrier || 'correos');
  const [estimatedDelivery, setEstimatedDelivery] = useState('');

  // Form state for new event
  const [eventStatus, setEventStatus] = useState<TrackingEvent['status']>('processing');
  const [eventLocation, setEventLocation] = useState('');
  const [eventDescription, setEventDescription] = useState('');

  const carriers = [
    { value: 'correos', label: 'Correos' },
    { value: 'seur', label: 'SEUR' },
    { value: 'dhl', label: 'DHL' },
    { value: 'ups', label: 'UPS' },
    { value: 'fedex', label: 'FedEx' },
    { value: 'mrw', label: 'MRW' },
    { value: 'other', label: 'Otro' },
  ];

  const statusOptions: { value: TrackingEvent['status']; label: string; description: string }[] = [
    { value: 'pending', label: '⏳ Pendiente', description: 'Pedido recibido' },
    { value: 'confirmed', label: '✅ Confirmado', description: 'Pedido confirmado' },
    { value: 'processing', label: '⚙️ Procesando', description: 'Preparando pedido' },
    { value: 'packed', label: '📦 Empaquetado', description: 'Listo para envío' },
    { value: 'shipped', label: '🚚 Enviado', description: 'En camino' },
    { value: 'in_transit', label: '🛣️ En tránsito', description: 'Paquete en movimiento' },
    { value: 'out_for_delivery', label: '🚛 En reparto', description: 'Salió para entrega' },
    { value: 'delivered', label: '✅ Entregado', description: 'Entregado con éxito' },
    { value: 'failed', label: '❌ Fallo en entrega', description: 'No se pudo entregar' },
    { value: 'returned', label: '↩️ Devuelto', description: 'Devuelto al remitente' },
  ];

  const handleUpdateTracking = async () => {
    if (!trackingNumber.trim()) {
      notify.warning('Introduce un número de seguimiento');
      return;
    }

    setLoading(true);
    try {
      logger.info('[OrderTrackingUpdate] Actualizando tracking', {
        orderId: order.id,
        trackingNumber,
        carrier,
      });

      await updateOrderTracking(
        order.id!,
        {
          trackingNumber: trackingNumber.trim(),
          carrier,
          estimatedDelivery: estimatedDelivery ? new Date(estimatedDelivery) : undefined,
        },
        user?.uid
      );

      notify.success('✅ Información de tracking actualizada');
      onUpdate?.();
    } catch (error) {
      logger.error('[OrderTrackingUpdate] Error actualizando tracking', error);
      notify.error('Error al actualizar el tracking');
    } finally {
      setLoading(false);
    }
  };

  const handleAddEvent = async () => {
    if (!eventDescription.trim()) {
      notify.warning('Introduce una descripción del evento');
      return;
    }

    setLoading(true);
    try {
      logger.info('[OrderTrackingUpdate] Agregando evento', {
        orderId: order.id,
        status: eventStatus,
      });

      await addTrackingEvent(
        order.id!,
        {
          status: eventStatus,
          location: eventLocation.trim() || undefined,
          description: eventDescription.trim(),
        },
        user?.uid
      );

      notify.success('✅ Evento de tracking agregado');
      setEventDescription('');
      setEventLocation('');
      onUpdate?.();
    } catch (error) {
      logger.error('[OrderTrackingUpdate] Error agregando evento', error);
      notify.error('Error al agregar evento');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-4 py-3 bg-gradient-to-r from-cyan-500 to-purple-600 text-white rounded-xl font-bold hover:shadow-lg transition-all"
      >
        <span>📦 Actualizar Tracking</span>
        <span className="text-xl">{isOpen ? '▼' : '▶'}</span>
      </button>

      {isOpen && (
        <div className="space-y-6 border-2 border-gray-200 rounded-xl p-6 bg-gray-50">
          {/* Sección 1: Información de tracking */}
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-gray-900 border-b-2 border-cyan-500 pb-2">
              1️⃣ Información de Tracking
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Número de seguimiento *
                </label>
                <input
                  type="text"
                  value={trackingNumber}
                  onChange={(e) => setTrackingNumber(e.target.value)}
                  className="w-full px-4 py-2 border-2 border-gray-300 rounded-xl focus:border-cyan-500 focus:ring-2 focus:ring-cyan-200 outline-none font-mono"
                  placeholder="ABC123456789"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Transportista *
                </label>
                <select
                  value={carrier}
                  onChange={(e) => setCarrier(e.target.value)}
                  className="w-full px-4 py-2 border-2 border-gray-300 rounded-xl focus:border-cyan-500 focus:ring-2 focus:ring-cyan-200 outline-none"
                >
                  {carriers.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                Fecha estimada de entrega (opcional)
              </label>
              <input
                type="date"
                value={estimatedDelivery}
                onChange={(e) => setEstimatedDelivery(e.target.value)}
                className="w-full px-4 py-2 border-2 border-gray-300 rounded-xl focus:border-cyan-500 focus:ring-2 focus:ring-cyan-200 outline-none"
              />
            </div>

            <button
              onClick={handleUpdateTracking}
              disabled={loading}
              className="w-full px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl font-bold hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Actualizando...' : '💾 Guardar información de tracking'}
            </button>
          </div>

          {/* Sección 2: Agregar evento */}
          <div className="space-y-4 border-t-2 border-gray-300 pt-6">
            <h3 className="text-lg font-bold text-gray-900 border-b-2 border-purple-500 pb-2">
              2️⃣ Agregar Evento de Seguimiento
            </h3>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Estado *</label>
              <select
                value={eventStatus}
                onChange={(e) => setEventStatus(e.target.value as TrackingEvent['status'])}
                className="w-full px-4 py-2 border-2 border-gray-300 rounded-xl focus:border-cyan-500 focus:ring-2 focus:ring-cyan-200 outline-none"
              >
                {statusOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label} - {option.description}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                Ubicación (opcional)
              </label>
              <input
                type="text"
                value={eventLocation}
                onChange={(e) => setEventLocation(e.target.value)}
                className="w-full px-4 py-2 border-2 border-gray-300 rounded-xl focus:border-cyan-500 focus:ring-2 focus:ring-cyan-200 outline-none"
                placeholder="Ej: Madrid, Centro de distribución"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                Descripción *
              </label>
              <textarea
                value={eventDescription}
                onChange={(e) => setEventDescription(e.target.value)}
                rows={3}
                className="w-full px-4 py-2 border-2 border-gray-300 rounded-xl focus:border-cyan-500 focus:ring-2 focus:ring-cyan-200 outline-none resize-none"
                placeholder="Ej: El paquete ha salido del centro de distribución y está en camino"
              />
            </div>

            <button
              onClick={handleAddEvent}
              disabled={loading}
              className="w-full px-6 py-3 bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-xl font-bold hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Agregando...' : '➕ Agregar evento'}
            </button>
          </div>

          {/* Historial actual */}
          {order.trackingHistory && order.trackingHistory.length > 0 && (
            <div className="border-t-2 border-gray-300 pt-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">📋 Historial actual</h3>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {order.trackingHistory.map((event, index) => {
                  const statusOption = statusOptions.find((s) => s.value === event.status);
                  return (
                    <div
                      key={index}
                      className="flex items-start gap-3 p-3 bg-white rounded-lg border border-gray-200"
                    >
                      <span className="text-xl">{statusOption?.label.split(' ')[0]}</span>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-sm text-gray-900">
                          {statusOption?.description}
                        </p>
                        <p className="text-sm text-gray-600">{event.description}</p>
                        {event.location && (
                          <p className="text-xs text-gray-500">📍 {event.location}</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
