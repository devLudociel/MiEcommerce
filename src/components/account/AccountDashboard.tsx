import { useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../../lib/firebase';
import type { UserDataDoc } from '../../lib/userProfile';
import { ensureUserDoc, getUserData } from '../../lib/userProfile';
import { useWishlist } from '../../store/wishlistStore';

export default function AccountDashboard() {
  const [user, setUser] = useState<{ uid: string; email: string; displayName?: string } | null>(null);
  const [data, setData] = useState<UserDataDoc | null>(null);
  const wishlist = useWishlist();

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (!u || !u.email) { setUser(null); setData(null); return; }
      setUser({ uid: u.uid, email: u.email, displayName: u.displayName ?? undefined });
      await ensureUserDoc(u.uid, u.email, u.displayName ?? undefined);
      const d = await getUserData(u.uid);
      setData(d);
    });
    return () => unsub();
  }, []);

  if (!user) return <div className="p-6 bg-white rounded-xl border">Inicia sesión para ver tu cuenta.</div>;

  return (
    <div className="space-y-8">
      {/* Encabezado */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black">Hola{user.displayName ? `, ${user.displayName}` : ''}.</h1>
          <p className="text-gray-600">Esto es lo que está pasando en tu cuenta.</p>
        </div>
        <a href="/account" className="px-4 py-2 rounded-lg border bg-white hover:bg-gray-50">Configuración de la cuenta</a>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Columna principal */}
        <div className="lg:col-span-2 space-y-6">
          <h2 className="text-2xl font-black">Información de la cuenta</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <a href="/account/orders" className="p-6 bg-gray-50 rounded-2xl border hover:bg-gray-100 transition">
              <div className="text-gray-600">Pedidos</div>
              <div className="text-2xl font-black mt-1">{0}</div>
              <div className="text-sm text-cyan-700 mt-2">Ver historial</div>
            </a>
            <a href="/account/wishlist" className="p-6 bg-gray-50 rounded-2xl border hover:bg-gray-100 transition">
              <div className="text-gray-600">Favoritos</div>
              <div className="text-2xl font-black mt-1">{wishlist.count}</div>
              <div className="text-sm text-cyan-700 mt-2">Ver favoritos</div>
            </a>
            <a href="/account/addresses" className="p-6 bg-gray-50 rounded-2xl border hover:bg-gray-100 transition">
              <div className="text-gray-600">Direcciones guardadas</div>
              <div className="text-2xl font-black mt-1">{data?.addresses?.length ?? 0}</div>
              <div className="text-sm text-cyan-700 mt-2">Gestionar direcciones</div>
            </a>
            <a href="/" className="p-6 bg-gray-50 rounded-2xl border hover:bg-gray-100 transition">
              <div className="text-gray-600">Tienda</div>
              <div className="text-2xl font-black mt-1">Catálogo</div>
              <div className="text-sm text-cyan-700 mt-2">Seguir comprando</div>
            </a>
          </div>

          {/* Últimos favoritos como “proyectos recientes” */}
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-black">Últimos favoritos</h2>
            <a href="/account/wishlist" className="text-sm underline">Ver todo</a>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {wishlist.items.slice(0, 6).map((p) => (
              <div key={String(p.id)} className="bg-white rounded-2xl border p-3 flex items-center gap-3">
                {p.image ? (
                  <img src={p.image} alt={p.name} className="w-16 h-16 rounded-lg object-cover" />
                ) : (
                  <div className="w-16 h-16 rounded-lg bg-gray-100" />
                )}
                <div className="min-w-0">
                  <div className="font-semibold truncate">{p.name}</div>
                  {typeof p.price === 'number' && <div className="text-sm text-cyan-600 font-bold">${p.price.toFixed(2)}</div>}
                </div>
              </div>
            ))}
            {wishlist.items.length === 0 && (
              <div className="p-6 bg-white rounded-2xl border text-gray-600">Aún no tienes favoritos.</div>
            )}
          </div>
        </div>

        {/* Lateral de pedidos */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-black">Pedidos</h2>
            <a href="/account/orders" className="text-sm underline">Ver todo</a>
          </div>
          <div className="space-y-3">
            {/* Placeholder a falta de conectar orders */}
            <div className="p-4 bg-white rounded-2xl border flex gap-3 items-center">
              <div className="w-12 h-12 bg-gray-100 rounded-lg" />
              <div className="flex-1 min-w-0">
                <div className="font-semibold truncate">No hay pedidos aún</div>
                <div className="text-xs text-gray-600">Cuando compres, verás el estado aquí.</div>
              </div>
              <a href="/" className="px-3 py-2 border rounded-lg">Comprar</a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

