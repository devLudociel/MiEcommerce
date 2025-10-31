import type { OrderData, TrackingEvent } from '../../lib/firebase';
import { getCarrierInfo } from '../../lib/firebase';

interface ShipmentTrackingProps {
  order: OrderData;
}

export default function ShipmentTracking({ order }: ShipmentTrackingProps) {
  const getStatusInfo = (status: string) => {
    const statusMap: Record<string, { icon: string; color: string; label: string; description: string }> = {
      pending: {
        icon: '⏳',
        color: 'yellow',
        label: 'Pendiente',
        description: 'Pedido recibido, esperando confirmación',
      },
      confirmed: {
        icon: '✅',
        color: 'blue',
        label: 'Confirmado',
        description: 'Pedido confirmado y en preparación',
      },
      processing: {
        icon: '⚙️',
        color: 'purple',
        label: 'Procesando',
        description: 'Preparando tu pedido',
      },
      packed: {
        icon: '📦',
        color: 'indigo',
        label: 'Empaquetado',
        description: 'Pedido empaquetado y listo para envío',
      },
      shipped: {
        icon: '🚚',
        color: 'cyan',
        label: 'Enviado',
        description: 'Pedido en camino',
      },
      in_transit: {
        icon: '🛣️',
        color: 'blue',
        label: 'En tránsito',
        description: 'El paquete está en movimiento',
      },
      out_for_delivery: {
        icon: '🚛',
        color: 'orange',
        label: 'En reparto',
        description: 'El paquete salió para entrega',
      },
      delivered: {
        icon: '✅',
        color: 'green',
        label: 'Entregado',
        description: 'Pedido entregado con éxito',
      },
      failed: {
        icon: '❌',
        color: 'red',
        label: 'Fallo en entrega',
        description: 'No se pudo entregar el paquete',
      },
      returned: {
        icon: '↩️',
        color: 'gray',
        label: 'Devuelto',
        description: 'Pedido devuelto al remitente',
      },
    };

    return statusMap[status] || statusMap.pending;
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return '';

    let date: Date;
    if (timestamp.toDate) {
      date = timestamp.toDate();
    } else if (timestamp instanceof Date) {
      date = timestamp;
    } else {
      date = new Date(timestamp);
    }

    return new Intl.DateTimeFormat('es-ES', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  const hasTracking = order.trackingNumber || (order.trackingHistory && order.trackingHistory.length > 0);

  if (!hasTracking) {
    return (
      <div className="card p-6 bg-gray-50 border-2 border-gray-200">
        <div className="text-center">
          <div className="text-4xl mb-3">📦</div>
          <h3 className="text-lg font-bold text-gray-900 mb-2">Sin información de envío</h3>
          <p className="text-gray-600 text-sm">
            La información de seguimiento estará disponible cuando el pedido sea enviado
          </p>
        </div>
      </div>
    );
  }

  const carrierInfo = order.trackingNumber && order.carrier
    ? getCarrierInfo(order.carrier, order.trackingNumber)
    : null;

  const sortedHistory = order.trackingHistory
    ? [...order.trackingHistory].sort((a, b) => {
        const dateA = a.timestamp?.toDate ? a.timestamp.toDate() : new Date(a.timestamp || 0);
        const dateB = b.timestamp?.toDate ? b.timestamp.toDate() : new Date(b.timestamp || 0);
        return dateB.getTime() - dateA.getTime();
      })
    : [];

  const currentStatus = sortedHistory[0]?.status || order.status;
  const statusInfo = getStatusInfo(currentStatus);

  return (
    <div className="space-y-6">
      {/* Header con estado actual */}
      <div className="card p-6 bg-gradient-to-br from-cyan-50 to-purple-50 border-2 border-cyan-200">
        <div className="flex items-center gap-4 mb-4">
          <div className="text-5xl">{statusInfo.icon}</div>
          <div className="flex-1">
            <h3 className="text-2xl font-bold text-gray-900">{statusInfo.label}</h3>
            <p className="text-gray-600">{statusInfo.description}</p>
          </div>
        </div>

        {order.trackingNumber && (
          <div className="flex flex-wrap items-center gap-4 pt-4 border-t-2 border-white">
            <div>
              <p className="text-sm text-gray-600 mb-1">Número de seguimiento</p>
              <p className="font-mono font-bold text-gray-900">{order.trackingNumber}</p>
            </div>
            {carrierInfo && (
              <div>
                <p className="text-sm text-gray-600 mb-1">Transportista</p>
                <p className="font-bold text-gray-900">{carrierInfo.name}</p>
              </div>
            )}
            {order.estimatedDelivery && (
              <div>
                <p className="text-sm text-gray-600 mb-1">Entrega estimada</p>
                <p className="font-bold text-gray-900">{formatDate(order.estimatedDelivery)}</p>
              </div>
            )}
            {carrierInfo && carrierInfo.url && (
              <div className="ml-auto">
                <a
                  href={carrierInfo.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn bg-gradient-to-r from-cyan-500 to-purple-600 text-white px-6 py-2 rounded-xl font-bold hover:shadow-lg transition-all inline-flex items-center gap-2"
                >
                  <span>Seguir en {carrierInfo.name}</span>
                  <span>→</span>
                </a>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Timeline de eventos */}
      {sortedHistory.length > 0 && (
        <div className="card p-6">
          <h3 className="text-xl font-bold text-gray-900 mb-6">Historial de seguimiento</h3>
          <div className="relative">
            {/* Línea vertical */}
            <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gradient-to-b from-cyan-500 via-purple-500 to-gray-300"></div>

            <div className="space-y-6">
              {sortedHistory.map((event, index) => {
                const info = getStatusInfo(event.status);
                const isLast = index === sortedHistory.length - 1;

                return (
                  <div key={index} className="relative pl-12">
                    {/* Punto en la línea */}
                    <div
                      className={`absolute left-0 w-8 h-8 rounded-full flex items-center justify-center text-lg border-4 border-white shadow-lg ${
                        index === 0
                          ? 'bg-gradient-to-br from-cyan-500 to-purple-600 scale-110'
                          : `bg-${info.color}-500`
                      }`}
                      style={{
                        backgroundColor:
                          index === 0
                            ? undefined
                            : info.color === 'green'
                              ? '#10b981'
                              : info.color === 'blue'
                                ? '#3b82f6'
                                : info.color === 'purple'
                                  ? '#a855f7'
                                  : info.color === 'yellow'
                                    ? '#f59e0b'
                                    : info.color === 'red'
                                      ? '#ef4444'
                                      : info.color === 'cyan'
                                        ? '#06b6d4'
                                        : info.color === 'orange'
                                          ? '#f97316'
                                          : info.color === 'indigo'
                                            ? '#6366f1'
                                            : '#6b7280',
                      }}
                    >
                      {info.icon}
                    </div>

                    {/* Contenido del evento */}
                    <div
                      className={`${
                        index === 0
                          ? 'bg-gradient-to-r from-cyan-50 to-purple-50 border-2 border-cyan-300'
                          : 'bg-gray-50 border-2 border-gray-200'
                      } rounded-xl p-4 transition-all hover:shadow-md`}
                    >
                      <div className="flex items-start justify-between gap-4 mb-2">
                        <div>
                          <h4 className="font-bold text-gray-900">{info.label}</h4>
                          {event.location && (
                            <p className="text-sm text-gray-600">
                              📍 {event.location}
                            </p>
                          )}
                        </div>
                        <span className="text-sm text-gray-500 whitespace-nowrap">
                          {formatDate(event.timestamp)}
                        </span>
                      </div>
                      <p className="text-gray-700">{event.description}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
