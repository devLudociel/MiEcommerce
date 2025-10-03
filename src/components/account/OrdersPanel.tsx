import { useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../../lib/firebase';

// Placeholder: aquí podrías conectar a una collection `orders` filtrando por userId
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
      // TODO: fetch orders from Firestore: query(collection(db,'orders'), where('userId','==',u.uid))
      setOrders([]);
    });
    return () => unsub();
  }, []);

  if (!uid) return <div className="p-6 bg-white rounded-xl border">Inicia sesión para ver tus pedidos.</div>;

  return (
    <div className="space-y-3">
      <h2 className="text-xl font-bold">Mis Pedidos</h2>
      {orders.length === 0 ? (
        <div className="p-6 bg-white rounded-xl border text-gray-600">Todavía no tienes pedidos.</div>
      ) : (
        <div className="grid gap-3">
          {orders.map((o) => (
            <div key={o.id} className="p-4 bg-white rounded-xl border flex items-center justify-between">
              <div>
                <div className="font-bold">Pedido #{o.id}</div>
                <div className="text-sm text-gray-600">Total ${o.total.toFixed(2)} • {o.status}</div>
              </div>
              <a href={`/account/orders/${o.id}`} className="px-3 py-2 border rounded-lg">Ver detalle</a>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

