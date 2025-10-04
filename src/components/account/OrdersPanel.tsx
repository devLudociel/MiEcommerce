import { useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../../lib/firebase';

interface OrderSummary {
  id: string;
  createdAt?: any;
  total: number;
  status: 'pending' | 'paid' | 'shipped' | 'delivered' | 'cancelled';
}

export default function OrdersPanel() {
  const [uid, setUid] = useState<string | null>(null);
  const [orders, setOrders] = useState<OrderSummary[]>([]);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (!u) { setUid(null); setOrders([]); return; }
      setUid(u.uid);
      // TODO: fetch orders from Firestore
      setOrders([]);
    });
    return () => unsub();
  }, []);

  if (!uid) return <div className="card p-6">Inicia sesión para ver tus pedidos.</div>;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending': return 'badge-hot';
      case 'paid': return 'badge-new';
      case 'shipped': return 'badge-new';
      case 'delivered': return 'badge-sale';
      case 'cancelled': return 'text-gray-400';
      default: return '';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending': return 'Pendiente';
      case 'paid': return 'Pagado';
      case 'shipped': return 'Enviado';
      case 'delivered': return 'Entregado';
      case 'cancelled': return 'Cancelado';
      default: return status;
    }
  };

  return (
    <div className="space-y-8">
      <div className="mb-6">
        <h2 className="text-3xl font-bold text-gradient-primary">Mis Pedidos</h2>
        <p className="text-gray-600 mt-2">Historial de compras y volver a pedir</p>
      </div>

      {orders.length === 0 ? (
        <div className="card p-8 text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
            </svg>
          </div>
          <p className="text-gray-600 mb-4">Todavía no tienes pedidos.</p>
          <a href="/" className="btn btn-primary inline-block">
            Ir a la tienda
          </a>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((o) => (
            <div key={o.id} className="card p-6">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="font-bold text-lg">Pedido #{o.id}</h3>
                    <span className={`badge ${getStatusBadge(o.status)}`}>
                      {getStatusText(o.status)}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600">
                    Total: <span className="font-bold text-gray-900">${o.total.toFixed(2)}</span>
                  </p>
                </div>
                <a href={`/account/orders/${o.id}`} className="btn btn-outline btn-sm">
                  Ver detalle
                </a>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}