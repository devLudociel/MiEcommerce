import { useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../../lib/firebase';

export default function AccountMenu() {
  const [email, setEmail] = useState<string | null>(null);
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => setEmail(u?.email ?? null));
    return () => unsub();
  }, []);

  return (
    <aside className="space-y-6">
      <div className="p-4 bg-white rounded-xl border text-sm text-gray-600">{email || 'Sesión no iniciada'}</div>
      <nav className="space-y-6">
        <div>
          <h3 className="px-1 mb-2 text-gray-900 font-bold">Cuenta</h3>
          <div className="grid gap-1">
            <a href="/account" className="px-4 py-2 rounded-lg bg-white border hover:border-cyan-400 hover:bg-cyan-50 transition">Panel de control</a>
            <a href="/account" className="px-4 py-2 rounded-lg bg-white border hover:border-cyan-400 hover:bg-cyan-50 transition">Perfil de la cuenta</a>
          </div>
        </div>

        <div>
          <h3 className="px-1 mb-2 text-gray-900 font-bold">Espacio de trabajo</h3>
          <div className="grid gap-1">
            <a href="/account/wishlist" className="px-4 py-2 rounded-lg bg-white border hover:border-cyan-400 hover:bg-cyan-50 transition">Mis favoritos</a>
            <a href="/account/addresses" className="px-4 py-2 rounded-lg bg-white border hover:border-cyan-400 hover:bg-cyan-50 transition">Mis direcciones</a>
          </div>
        </div>

        <div>
          <h3 className="px-1 mb-2 text-gray-900 font-bold">Pedidos</h3>
          <div className="grid gap-1">
            <a href="/account/orders" className="px-4 py-2 rounded-lg bg-white border hover:border-cyan-400 hover:bg-cyan-50 transition">Historial de compras</a>
          </div>
        </div>

        <div>
          <h3 className="px-1 mb-2 text-gray-900 font-bold">Configuración</h3>
          <div className="grid gap-1">
            <a href="/account" className="px-4 py-2 rounded-lg bg-white border hover:border-cyan-400 hover:bg-cyan-50 transition">Configuración de la cuenta</a>
            <a href="/account/addresses" className="px-4 py-2 rounded-lg bg-white border hover:border-cyan-400 hover:bg-cyan-50 transition">Pago y envío</a>
          </div>
        </div>
      </nav>
    </aside>
  );
}


