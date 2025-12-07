import { useEffect, useState } from 'react';
import Icon from '../ui/Icon';
import type { OrderData } from '../../lib/firebase';
import AccessibleModal from '../common/AccessibleModal';
import { useAuth } from '../hooks/useAuth';
import { notify } from '../../lib/notifications';
import { logger } from '../../lib/logger';
import OrderItemPreview from './OrderItemPreview';
import { FRONT_POSITIONS, BACK_POSITIONS, getContainerTransform, type PresetPosition } from '../../constants/textilePositions';
import JSZip from 'jszip';

const statusLabels: Record<string, string> = {
  pending: 'Pendiente',
  paid: 'Pagado',
  processing: 'En producción',
  shipped: 'Enviado',
  delivered: 'Entregado',
  cancelled: 'Cancelado',
};

const eur = (v: number | string | null | undefined) => '€' + Number(v ?? 0).toFixed(2);

/**
 * Detecta si las coordenadas coinciden con alguna posición preset
 */
function detectPresetPosition(
  transform: { x: number; y: number; scale: number; rotation: number },
  fieldLabel: string
): PresetPosition | null {
  // Determinar si es front o back basándose en el label del campo
  const labelLower = fieldLabel.toLowerCase();
  const isFront =
    labelLower.includes('front') ||
    labelLower.includes('frontal') ||
    labelLower.includes('frente') ||
    labelLower.includes('delantera');
  const isBack =
    labelLower.includes('back') ||
    labelLower.includes('trasera') ||
    labelLower.includes('espalda');

  // Si no podemos determinar el lado, no detectamos preset
  if (!isFront && !isBack) return null;

  const positions = isFront ? FRONT_POSITIONS : BACK_POSITIONS;
  const tolerance = 3; // Margen de error en porcentaje
  const scaleTolerance = 0.05; // Margen de error en escala

  for (const preset of positions) {
    const containerTransform = getContainerTransform(preset);

    // Comparar coordenadas con tolerancia
    const xMatch = Math.abs(transform.x - containerTransform.x) <= tolerance;
    const yMatch = Math.abs(transform.y - containerTransform.y) <= tolerance;
    const scaleMatch = Math.abs(transform.scale - containerTransform.scale) <= scaleTolerance;

    if (xMatch && yMatch && scaleMatch) {
      return preset;
    }
  }

  return null;
}

export default function AdminOrderDetail() {
  const [order, setOrder] = useState<OrderData | null>(null);
  const [loading, setLoading] = useState(true);
  const [orderId, setOrderId] = useState<string | null>(null);
  const { user, loading: authLoading } = useAuth();

  // Modal state
  const [modal, setModal] = useState<{
    isOpen: boolean;
    type: 'info' | 'warning' | 'error' | 'success';
    title: string;
    message: string;
  }>({
    isOpen: false,
    type: 'info',
    title: '',
    message: '',
  });

  // Production notes state - track editing per item
  const [editingNotes, setEditingNotes] = useState<Record<number, boolean>>({});
  const [notesContent, setNotesContent] = useState<Record<number, string>>({});

  const showModal = (
    type: 'info' | 'warning' | 'error' | 'success',
    title: string,
    message: string
  ) => {
    setModal({ isOpen: true, type, title, message });
  };

  const closeModal = () => {
    setModal({ ...modal, isOpen: false });
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const id = params.get('id') || window.location.pathname.split('/').pop();
    if (!id) {
      window.location.href = '/admin/orders';
      return;
    }
    setOrderId(id);
  }, []);

  useEffect(() => {
    if (authLoading || !orderId) {
      return;
    }

    if (!user) {
      showModal('error', 'Acceso no autorizado', 'Debes iniciar sesión como administrador.');
      setTimeout(() => {
        window.location.href = '/login';
      }, 1500);
      return;
    }

    void loadOrder(orderId);
  }, [authLoading, user, orderId]);

  async function loadOrder(id: string) {
    if (!user) {
      return;
    }
    try {
      setLoading(true);
      const token = await user.getIdToken();
      const res = await fetch(`/api/admin/get-order?id=${encodeURIComponent(id)}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (res.status === 401 || res.status === 403) {
        showModal(
          'error',
          'Sin autorización',
          'No tienes permisos para ver este pedido.'
        );
        setTimeout(() => {
          window.location.href = '/admin/orders';
        }, 2000);
        return;
      }
      if (!res.ok) {
        showModal(
          'error',
          'Pedido no encontrado',
          'El pedido solicitado no existe o no tienes permisos para verlo.'
        );
        setTimeout(() => {
          window.location.href = '/admin/orders';
        }, 2000);
        return;
      }
      const data = await res.json();
      setOrder(data.order as OrderData);
    } catch (e) {
      console.error('Error cargando pedido:', e);
      showModal(
        'error',
        'Error al cargar',
        'No se pudo cargar el pedido. Por favor, intenta de nuevo.'
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleStatusChange(newStatus: string) {
    if (!orderId) return;
    if (!user) {
      showModal('error', 'Sesión expirada', 'Inicia sesión nuevamente para continuar.');
      return;
    }
    try {
      const token = await user.getIdToken();
      await fetch('/api/admin/update-order-status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ id: orderId, status: newStatus }),
      });
      // Notificar por email (no bloqueante)
      fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId, type: 'status-update', newStatus }),
      }).catch((emailError) => {
        // Non-blocking: log error but don't affect main flow
        console.warn('[AdminOrderDetail] Email notification failed:', emailError);
      });
      await loadOrder(orderId);
      showModal(
        'success',
        'Estado actualizado',
        'El estado del pedido se actualizó correctamente.'
      );
    } catch (e) {
      console.error('Error actualizando estado:', e);
      showModal(
        'error',
        'Error al actualizar',
        'No se pudo actualizar el estado del pedido. Por favor, intenta de nuevo.'
      );
    }
  }

  const handleInvoiceDownload = async () => {
    if (!order) {
      return;
    }

    try {
      const headers: Record<string, string> = {};

      if (user) {
        const token = await user.getIdToken();
        headers.Authorization = `Bearer ${token}`;
      }

      const response = await fetch(`/api/generate-invoice?orderId=${order.id}`, {
        headers,
      });

      if (!response.ok) {
        throw new Error('No se pudo generar la factura');
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Factura-${order.id}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      notify.success('Factura descargada correctamente');
    } catch (error) {
      logger.error('[AdminOrderDetail] Error downloading invoice', error);
      notify.error('No se pudo generar la factura. Intenta nuevamente.');
    }
  };

  /**
   * Descarga una imagen personalizada del cliente
   * Soporta URLs (Firebase Storage) y base64
   */
  const handleImageDownload = async (imageUrl: string, fieldLabel: string, itemName: string) => {
    try {
      let blob: Blob;

      // Detectar si es base64 o URL
      if (imageUrl.startsWith('data:')) {
        // Es base64 - convertir directamente a blob
        const response = await fetch(imageUrl);
        blob = await response.blob();
      } else {
        // Es URL (Firebase Storage) - descargar con CORS
        const response = await fetch(imageUrl);
        if (!response.ok) {
          throw new Error('No se pudo descargar la imagen');
        }
        blob = await response.blob();
      }

      // Crear nombre de archivo descriptivo
      const timestamp = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
      const sanitizedItemName = itemName.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase();
      const sanitizedFieldLabel = fieldLabel.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase();
      const orderIdShort = order?.id?.slice(0, 8) || 'pedido';
      const fileName = `${orderIdShort}_${sanitizedItemName}_${sanitizedFieldLabel}_${timestamp}.jpg`;

      // Descargar
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);

      notify.success(`Imagen descargada: ${fileName}`);
      logger.info('[AdminOrderDetail] Image downloaded successfully', { fileName });
    } catch (error) {
      logger.error('[AdminOrderDetail] Error downloading image', error);
      notify.error('No se pudo descargar la imagen. Intenta nuevamente.');
    }
  };

  /**
   * Guarda las notas de producción de un item específico
   */
  const handleSaveProductionNotes = async (itemIndex: number) => {
    if (!orderId || !user) return;

    try {
      const notes = notesContent[itemIndex] || '';
      const token = await user.getIdToken();

      const response = await fetch('/api/admin/update-item-notes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          orderId,
          itemIndex,
          notes,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update notes');
      }

      // Actualizar el estado local
      if (order) {
        const updatedItems = [...order.items];
        updatedItems[itemIndex] = {
          ...updatedItems[itemIndex],
          productionNotes: notes,
        };
        setOrder({ ...order, items: updatedItems });
      }

      // Salir del modo edición
      setEditingNotes({ ...editingNotes, [itemIndex]: false });
      notify.success('Notas de producción guardadas');
      logger.info('[AdminOrderDetail] Production notes saved', { itemIndex });
    } catch (error) {
      logger.error('[AdminOrderDetail] Error saving production notes', error);
      notify.error('No se pudieron guardar las notas. Intenta nuevamente.');
    }
  };

  /**
   * Inicia la edición de notas para un item
   */
  const handleStartEditNotes = (itemIndex: number, currentNotes?: string) => {
    setEditingNotes({ ...editingNotes, [itemIndex]: true });
    setNotesContent({ ...notesContent, [itemIndex]: currentNotes || '' });
  };

  /**
   * Cancela la edición de notas para un item
   */
  const handleCancelEditNotes = (itemIndex: number) => {
    setEditingNotes({ ...editingNotes, [itemIndex]: false });
  };

  /**
   * Actualiza el estado de producción de un item específico
   */
  const handleUpdateProductionStatus = async (itemIndex: number, newStatus: string) => {
    if (!orderId || !user) return;

    try {
      const token = await user.getIdToken();

      const response = await fetch('/api/admin/update-item-status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          orderId,
          itemIndex,
          status: newStatus,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update status');
      }

      // Actualizar el estado local
      if (order) {
        const updatedItems = [...order.items];
        updatedItems[itemIndex] = {
          ...updatedItems[itemIndex],
          productionStatus: newStatus as any,
        };
        setOrder({ ...order, items: updatedItems });
      }

      notify.success('Estado de producción actualizado');
      logger.info('[AdminOrderDetail] Production status updated', { itemIndex, newStatus });
    } catch (error) {
      logger.error('[AdminOrderDetail] Error updating production status', error);
      notify.error('No se pudo actualizar el estado. Intenta nuevamente.');
    }
  };

  /**
   * Descarga todas las imágenes personalizadas del pedido en un archivo ZIP
   * Útil para pedidos con múltiples productos personalizados
   */
  const handleBulkImageDownload = async () => {
    if (!order) return;

    try {
      // Buscar todas las imágenes en todos los items del pedido
      const imageData: Array<{ url: string; name: string }> = [];
      let itemIndex = 0;

      for (const item of order.items || []) {
        itemIndex++;
        if (item.customization?.values) {
          let fieldIndex = 0;
          for (const field of item.customization.values) {
            if (field.imageUrl) {
              fieldIndex++;
              const sanitizedItemName = item.name.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase();
              const sanitizedFieldLabel = field.fieldLabel.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase();
              const fileName = `${itemIndex}_${sanitizedItemName}_${fieldIndex}_${sanitizedFieldLabel}.jpg`;
              imageData.push({ url: field.imageUrl, name: fileName });
            }
          }
        }
      }

      if (imageData.length === 0) {
        notify.warning('Este pedido no tiene imágenes personalizadas para descargar');
        return;
      }

      notify.info(`Preparando ${imageData.length} imagen(es) para descargar...`);
      logger.info('[AdminOrderDetail] Starting bulk download', { count: imageData.length });

      // Crear ZIP
      const zip = new JSZip();
      const timestamp = new Date().toISOString().split('T')[0];
      const orderIdShort = order.id?.slice(0, 8) || 'pedido';

      // Descargar todas las imágenes y agregarlas al ZIP
      let successCount = 0;
      let failCount = 0;

      for (const { url, name } of imageData) {
        try {
          const response = await fetch(url);
          if (!response.ok) throw new Error('Download failed');
          const blob = await response.blob();
          zip.file(name, blob);
          successCount++;
        } catch (error) {
          logger.warn('[AdminOrderDetail] Failed to download image', { url, error });
          failCount++;
        }
      }

      if (successCount === 0) {
        notify.error('No se pudo descargar ninguna imagen. Verifica la conexión.');
        return;
      }

      // Generar archivo ZIP
      notify.info('Generando archivo ZIP...');
      const zipBlob = await zip.generateAsync({ type: 'blob' });

      // Descargar ZIP
      const zipUrl = URL.createObjectURL(zipBlob);
      const link = document.createElement('a');
      link.href = zipUrl;
      link.download = `${orderIdShort}_imagenes_pedido_${timestamp}.zip`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(zipUrl);

      const message = failCount > 0
        ? `${successCount} imágenes descargadas (${failCount} fallaron)`
        : `${successCount} imágenes descargadas correctamente`;

      notify.success(message);
      logger.info('[AdminOrderDetail] Bulk download completed', { successCount, failCount });
    } catch (error) {
      logger.error('[AdminOrderDetail] Error in bulk download', error);
      notify.error('Error al crear el archivo ZIP. Intenta nuevamente.');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Cargando pedido...</p>
        </div>
      </div>
    );
  }

  if (!order) return null;

  const orderDate = order.createdAt?.toDate ? order.createdAt.toDate() : new Date();

  return (
    <>
      <AccessibleModal
        isOpen={modal.isOpen}
        onClose={closeModal}
        title={modal.title}
        type={modal.type}
      >
        {modal.message}
      </AccessibleModal>

      <div className="min-h-screen bg-gray-50 py-8">
        <div className="container mx-auto px-6 max-w-6xl">
          <div className="mb-8">
            <a
              href="/admin/orders"
              className="inline-flex items-center gap-2 text-cyan-600 hover:text-cyan-700 font-bold mb-4"
            >
              <Icon name="arrow-left" className="w-4 h-4" /> Volver a lista de pedidos
            </a>
            <h1 className="text-4xl font-black text-gray-800 mb-2">
              Detalle del Pedido #{order.id?.slice(0, 8)}
            </h1>
            <p className="text-gray-600">
              Realizado el{' '}
              {orderDate.toLocaleDateString('es-ES', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-white rounded-2xl shadow-lg p-6">
                <h2 className="text-2xl font-black text-gray-800 mb-4 inline-flex items-center gap-2">
                  <Icon name="package" className="w-6 h-6" /> Productos
                </h2>

                {/* Resumen del progreso de producción */}
                {(() => {
                  const statusCounts = (order.items || []).reduce(
                    (acc, item) => {
                      const status = item.productionStatus || 'pending';
                      acc[status] = (acc[status] || 0) + 1;
                      return acc;
                    },
                    {} as Record<string, number>
                  );

                  const total = order.items?.length || 0;
                  const shipped = statusCounts['shipped'] || 0;
                  const ready = statusCounts['ready'] || 0;
                  const inProduction = statusCounts['in_production'] || 0;
                  const pending = statusCounts['pending'] || 0;

                  return (
                    <div className="mb-6 p-4 bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl border border-gray-200">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-sm font-bold text-gray-700">Progreso de Producción</span>
                        <span className="text-xs text-gray-500">{total} producto(s) total</span>
                      </div>

                      <div className="grid grid-cols-4 gap-3">
                        <div className="text-center p-2 bg-white rounded-lg border border-gray-200">
                          <div className="text-2xl font-black text-gray-700">{pending}</div>
                          <div className="text-xs text-gray-500 mt-1">⏳ Pendientes</div>
                        </div>
                        <div className="text-center p-2 bg-white rounded-lg border border-yellow-200">
                          <div className="text-2xl font-black text-yellow-700">{inProduction}</div>
                          <div className="text-xs text-yellow-600 mt-1">🔧 En Producción</div>
                        </div>
                        <div className="text-center p-2 bg-white rounded-lg border border-green-200">
                          <div className="text-2xl font-black text-green-700">{ready}</div>
                          <div className="text-xs text-green-600 mt-1">✅ Listos</div>
                        </div>
                        <div className="text-center p-2 bg-white rounded-lg border border-blue-200">
                          <div className="text-2xl font-black text-blue-700">{shipped}</div>
                          <div className="text-xs text-blue-600 mt-1">📦 Enviados</div>
                        </div>
                      </div>

                      {/* Barra de progreso */}
                      <div className="mt-3 h-3 bg-gray-200 rounded-full overflow-hidden flex">
                        {pending > 0 && (
                          <div
                            className="bg-gray-400 transition-all"
                            style={{ width: `${(pending / total) * 100}%` }}
                            title={`${pending} pendientes`}
                          />
                        )}
                        {inProduction > 0 && (
                          <div
                            className="bg-yellow-400 transition-all"
                            style={{ width: `${(inProduction / total) * 100}%` }}
                            title={`${inProduction} en producción`}
                          />
                        )}
                        {ready > 0 && (
                          <div
                            className="bg-green-400 transition-all"
                            style={{ width: `${(ready / total) * 100}%` }}
                            title={`${ready} listos`}
                          />
                        )}
                        {shipped > 0 && (
                          <div
                            className="bg-blue-400 transition-all"
                            style={{ width: `${(shipped / total) * 100}%` }}
                            title={`${shipped} enviados`}
                          />
                        )}
                      </div>
                    </div>
                  );
                })()}

                <div className="space-y-4">
                  {(order.items || []).map((item: any, index: number) => (
                    <div key={index} className="flex gap-4 p-4 bg-gray-50 rounded-xl">
                      <img
                        src={item.image}
                        alt={item.name}
                        className="w-24 h-24 object-cover rounded-lg"
                        width={96}
                        height={96}
                      />
                      <div className="flex-1">
                        <div className="flex items-center justify-between gap-4 mb-2">
                          <h3 className="font-bold text-gray-800 text-lg">{item.name}</h3>

                          {/* Estado de producción por producto */}
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-500 font-medium">Estado:</span>
                            <select
                              value={item.productionStatus || 'pending'}
                              onChange={(e) => handleUpdateProductionStatus(index, e.target.value)}
                              className={`px-3 py-1.5 rounded-lg text-xs font-bold border-2 outline-none transition-all ${
                                item.productionStatus === 'shipped'
                                  ? 'bg-blue-100 border-blue-300 text-blue-800'
                                  : item.productionStatus === 'ready'
                                  ? 'bg-green-100 border-green-300 text-green-800'
                                  : item.productionStatus === 'in_production'
                                  ? 'bg-yellow-100 border-yellow-300 text-yellow-800'
                                  : 'bg-gray-100 border-gray-300 text-gray-700'
                              }`}
                            >
                              <option value="pending">⏳ Pendiente</option>
                              <option value="in_production">🔧 En Producción</option>
                              <option value="ready">✅ Listo</option>
                              <option value="shipped">📦 Enviado</option>
                            </select>
                          </div>
                        </div>

                        {item.variantName && (
                          <p className="text-sm text-gray-500">Variante: {item.variantName}</p>
                        )}

                        {/* Detalles de personalización */}
                        {item.customization && (
                          <div className="mt-3 p-3 bg-purple-50 border-l-4 border-purple-500 rounded-lg">
                            <p className="text-sm text-purple-700 font-bold mb-2 flex items-center gap-2">
                              <Icon name="sparkles" className="w-4 h-4" />
                              Personalizado - {item.customization.categoryName || 'Producto'}
                            </p>

                            {/* Valores de personalización */}
                            {item.customization.values && (
                              <div className="space-y-2 mt-2">
                                {item.customization.values.map((field: any, idx: number) => (
                                  <div key={idx} className="text-sm">
                                    <span className="font-semibold text-gray-700">{field.fieldLabel}:</span>

                                    {/* Si tiene imagen, mostrarla */}
                                    {field.imageUrl ? (
                                      <div className="mt-2 ml-4">
                                        <div className="flex items-start gap-3">
                                          <img
                                            src={field.imageUrl}
                                            alt={field.fieldLabel}
                                            className="w-32 h-32 object-contain border-2 border-purple-200 rounded-lg bg-white flex-shrink-0"
                                          />

                                          {/* Botón de descarga */}
                                          <button
                                            onClick={() => handleImageDownload(field.imageUrl, field.fieldLabel, item.name)}
                                            className="px-3 py-2 bg-cyan-500 text-white rounded-lg font-bold hover:bg-cyan-600 transition-all flex items-center gap-2 text-sm flex-shrink-0"
                                            title="Descargar imagen del cliente para editar y producir"
                                          >
                                            <Icon name="download" className="w-4 h-4" />
                                            Descargar
                                          </button>
                                        </div>

                                        {/* Mostrar transformaciones si existen */}
                                        {field.imageTransform && (() => {
                                          const detectedPreset = detectPresetPosition(field.imageTransform, field.fieldLabel);
                                          return (
                                            <div className="mt-2 text-xs space-y-1">
                                              {/* Mostrar preset detectado */}
                                              {detectedPreset ? (
                                                <div className="p-2 bg-green-100 border border-green-300 rounded">
                                                  <p className="font-bold text-green-800 flex items-center gap-1">
                                                    📍 {detectedPreset.label}
                                                  </p>
                                                  <p className="text-green-700 italic">{detectedPreset.description}</p>
                                                </div>
                                              ) : (
                                                <div className="p-2 bg-yellow-100 border border-yellow-300 rounded">
                                                  <p className="font-bold text-yellow-800">
                                                    ⚠️ Posición personalizada
                                                  </p>
                                                </div>
                                              )}

                                              {/* Coordenadas técnicas */}
                                              <div className="text-gray-600 space-y-0.5">
                                                <p>• X={field.imageTransform.x.toFixed(1)}%, Y={field.imageTransform.y.toFixed(1)}%</p>
                                                <p>• Escala: {(field.imageTransform.scale * 100).toFixed(0)}%</p>
                                                {field.imageTransform.rotation !== 0 && (
                                                  <p>• Rotación: {field.imageTransform.rotation}°</p>
                                                )}
                                              </div>
                                            </div>
                                          );
                                        })()}
                                      </div>
                                    ) : (
                                      /* Si es un valor simple (color, talla, etc.) */
                                      <span className="ml-2 text-gray-600">
                                        {field.displayValue || field.value}
                                      </span>
                                    )}

                                    {/* Mostrar precio adicional si existe */}
                                    {field.priceModifier && field.priceModifier > 0 && (
                                      <span className="ml-2 text-xs text-green-600">
                                        (+{eur(field.priceModifier)})
                                      </span>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}

                            {/* Preview visual del mockup */}
                            <OrderItemPreview item={item} />
                          </div>
                        )}

                        <div className="flex items-center justify-between mt-3">
                          <span className="text-gray-600">
                            Cantidad: <strong>{item.quantity}</strong>
                          </span>
                          <span className="text-gray-600">
                            Precio unitario: <strong>{eur(item.price)}</strong>
                          </span>
                          <span className="font-bold text-cyan-600 text-lg">
                            {eur(Number(item.price ?? 0) * Number(item.quantity ?? 0))}
                          </span>
                        </div>

                        {/* Notas de producción internas */}
                        <div className="mt-4 pt-4 border-t border-gray-200">
                          <div className="flex items-center gap-2 mb-2">
                            <Icon name="pen" className="w-4 h-4 text-orange-600" />
                            <span className="font-bold text-sm text-gray-700">Notas de Producción (Interno)</span>
                          </div>

                          {editingNotes[index] ? (
                            /* Modo edición */
                            <div className="space-y-2">
                              <textarea
                                value={notesContent[index] || ''}
                                onChange={(e) => setNotesContent({ ...notesContent, [index]: e.target.value })}
                                placeholder="Ej: Usar tela premium, Cliente pidió entrega urgente, Revisar colores antes de imprimir..."
                                className="w-full px-3 py-2 border-2 border-orange-300 rounded-lg focus:border-orange-500 focus:ring-2 focus:ring-orange-200 outline-none resize-none text-sm"
                                rows={3}
                              />
                              <div className="flex gap-2">
                                <button
                                  onClick={() => handleSaveProductionNotes(index)}
                                  className="px-3 py-1.5 bg-green-500 text-white rounded-lg font-bold hover:bg-green-600 transition-all text-sm flex items-center gap-1"
                                >
                                  <Icon name="save" className="w-4 h-4" />
                                  Guardar
                                </button>
                                <button
                                  onClick={() => handleCancelEditNotes(index)}
                                  className="px-3 py-1.5 bg-gray-200 text-gray-700 rounded-lg font-bold hover:bg-gray-300 transition-all text-sm"
                                >
                                  Cancelar
                                </button>
                              </div>
                            </div>
                          ) : (
                            /* Modo lectura */
                            <div>
                              {item.productionNotes ? (
                                <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 relative group">
                                  <p className="text-sm text-gray-700 whitespace-pre-wrap">{item.productionNotes}</p>
                                  <button
                                    onClick={() => handleStartEditNotes(index, item.productionNotes)}
                                    className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity px-2 py-1 bg-orange-500 text-white rounded text-xs font-bold hover:bg-orange-600"
                                  >
                                    Editar
                                  </button>
                                </div>
                              ) : (
                                <button
                                  onClick={() => handleStartEditNotes(index)}
                                  className="w-full px-3 py-2 border-2 border-dashed border-orange-300 rounded-lg text-orange-600 hover:bg-orange-50 hover:border-orange-400 transition-all text-sm font-medium flex items-center justify-center gap-2"
                                >
                                  <Icon name="plus" className="w-4 h-4" />
                                  Agregar notas para el equipo de producción
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-6 pt-6 border-t-2 border-gray-200 space-y-2">
                  <div className="flex justify-between text-gray-700">
                    <span>Subtotal:</span>
                    <span className="font-bold">{eur(order.subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-gray-700">
                    <span>Envío:</span>
                    <span className="font-bold">
                      {Number(order.shipping ?? 0) === 0 ? 'GRATIS' : eur(order.shipping)}
                    </span>
                  </div>
                  <div className="flex justify-between text-2xl font-black text-gray-800 pt-3 border-t-2 border-gray-200">
                    <span>Total:</span>
                    <span className="text-cyan-600">{eur(order.total)}</span>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-2xl shadow-lg p-6">
                <h2 className="text-2xl font-black text-gray-800 mb-4 inline-flex items-center gap-2">
                  <Icon name="map-pin" className="w-6 h-6" /> Dirección de Envío
                </h2>
                <div className="space-y-2 text-gray-700">
                  <p className="font-bold text-lg">
                    {order.shippingInfo?.firstName || '—'} {order.shippingInfo?.lastName || ''}
                  </p>
                  <p>{order.shippingInfo?.address || '—'}</p>
                  <p>
                    {order.shippingInfo?.zipCode || ''} {order.shippingInfo?.city || ''},{' '}
                    {order.shippingInfo?.state || ''}
                  </p>
                  <p>{order.shippingInfo?.country || ''}</p>
                  <div className="pt-3 border-t border-gray-200 mt-3">
                    <p className="text-sm">
                      <strong>Email:</strong> {order.shippingInfo?.email || '—'}
                    </p>
                    <p className="text-sm">
                      <strong>Teléfono:</strong> {order.shippingInfo?.phone || '—'}
                    </p>
                  </div>
                  {order.shippingInfo?.notes && (
                    <div className="pt-3 border-t border-gray-200 mt-3">
                      <p className="text-sm font-bold">Notas del cliente:</p>
                      <p className="text-sm italic text-gray-600">{order.shippingInfo?.notes}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div className="bg-white rounded-2xl shadow-lg p-6">
                <h2 className="text-xl font-black text-gray-800 mb-4">Estado del Pedido</h2>
                <select
                  value={order.status}
                  onChange={(e) => handleStatusChange(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl font-bold text-lg focus:border-cyan-500 focus:ring-2 focus:ring-cyan-200 outline-none"
                >
                  {Object.entries(statusLabels).map(([status, label]) => (
                    <option key={status} value={status}>
                      {label}
                    </option>
                  ))}
                </select>
                <p className="text-sm text-gray-500 mt-2">
                  Última actualización:{' '}
                  {order.updatedAt?.toDate
                    ? order.updatedAt.toDate().toLocaleString('es-ES')
                    : 'No disponible'}
                </p>
              </div>

              <div className="bg-white rounded-2xl shadow-lg p-6">
                <h2 className="text-xl font-black text-gray-800 mb-4 inline-flex items-center gap-2">
                  <Icon name="credit-card" className="w-5 h-5" /> Método de Pago
                </h2>
                <p className="text-gray-700 font-medium">
                  {order.paymentInfo?.method === 'card' && 'Tarjeta'}
                  {order.paymentInfo?.method === 'paypal' && 'PayPal'}
                  {order.paymentInfo?.method === 'transfer' && 'Transferencia'}
                  {order.paymentInfo?.method === 'cash' && 'Contra Reembolso'}
                </p>
                {order.paymentInfo?.cardLast4 && (
                  <p className="text-sm text-gray-500 mt-1">
                    Tarjeta terminada en: ****{order.paymentInfo?.cardLast4}
                  </p>
                )}
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <p className="text-sm text-gray-600">
                    <strong>Estado de pago:</strong>
                  </p>
                  <span
                    className={`inline-block mt-1 px-3 py-1 rounded-full text-sm font-bold ${order.paymentStatus === 'paid' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}
                  >
                    {order.paymentStatus === 'paid' ? 'Pagado' : 'Pendiente'}
                  </span>
                </div>
              </div>

              <div className="bg-white rounded-2xl shadow-lg p-6">
                <h2 className="text-xl font-black text-gray-800 mb-4">Acciones</h2>
                <div className="space-y-3">
                  {/* Descarga masiva de imágenes - destacado */}
                  {(() => {
                    const imageCount = (order.items || []).reduce((count, item) => {
                      if (item.customization?.values) {
                        return count + item.customization.values.filter(f => f.imageUrl).length;
                      }
                      return count;
                    }, 0);

                    return imageCount > 0 ? (
                      <button
                        onClick={handleBulkImageDownload}
                        className="w-full px-4 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl font-bold hover:from-green-600 hover:to-emerald-700 transition-all flex items-center justify-center gap-2 shadow-lg"
                        title={`Descargar ${imageCount} imagen(es) en un archivo ZIP`}
                      >
                        <Icon name="download" className="w-5 h-5" />
                        Descargar Todas las Imágenes ({imageCount})
                      </button>
                    ) : null;
                  })()}

                  <button
                    onClick={() => window.print()}
                    className="w-full px-4 py-3 bg-gray-200 text-gray-700 rounded-xl font-bold hover:bg-gray-300 transition-all flex items-center justify-center gap-2"
                  >
                    <Icon name="printer" className="w-5 h-5" /> Imprimir Pedido
                  </button>
                  <button
                    onClick={handleInvoiceDownload}
                    className="w-full px-4 py-3 bg-purple-500 text-white rounded-xl font-bold hover:bg-purple-600 transition-all text-center flex items-center justify-center gap-2"
                  >
                    <Icon name="file-text" className="w-5 h-5" /> Descargar Factura PDF
                  </button>
                  <a
                    href={`mailto:${order.shippingInfo?.email || ''}?subject=Actualización de tu pedido ${order.id}`}
                    className="block w-full px-4 py-3 bg-cyan-500 text-white rounded-xl font-bold hover:bg-cyan-600 transition-all text-center flex items-center justify-center gap-2"
                  >
                    <Icon name="mail" className="w-5 h-5" /> Enviar Email
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
