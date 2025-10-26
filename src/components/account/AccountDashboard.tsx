import { useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../../lib/firebase';
import type { UserDataDoc } from '../../lib/userProfile';
import { ensureUserDoc, getUserData } from '../../lib/userProfile';
import { useWishlist } from '../../store/wishlistStore';

export default function AccountDashboard() {
  const [user, setUser] = useState<{ uid: string; email: string; displayName?: string } | null>(
    null
  );
  const [data, setData] = useState<UserDataDoc | null>(null);
  const wishlist = useWishlist();

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (!u || !u.email) {
        setUser(null);
        setData(null);
        return;
      }
      setUser({ uid: u.uid, email: u.email, displayName: u.displayName ?? undefined });
      await ensureUserDoc(u.uid, u.email, u.displayName ?? undefined);
      const d = await getUserData(u.uid);
      setData(d);
    });
    return () => unsub();
  }, []);

  if (!user)
    return <div className="p-6 bg-white rounded-xl border">Inicia sesión para ver tu cuenta.</div>;

  const firstName = user.displayName ? user.displayName.split(' ')[0] : 'Usuario';

  return (
    <div className="space-y-8">
      {/* Encabezado */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-6 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Hola, {firstName}.</h1>
          <p className="text-gray-600 mt-1">Esto es lo que está pasando en tu cuenta.</p>
        </div>
        <a href="/account/settings" className="btn btn-outline whitespace-nowrap">
          Configuración de la cuenta
        </a>
      </div>

      {/* Información de la cuenta */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Información de la cuenta</h2>
        <div className="grid grid-cols-2 gap-4">
          {/* Card de Pedidos */}
          <div className="card card-cyan p-6">
            <div className="space-y-4">
              <div>
                <div className="text-sm text-gray-600 mb-1">Pedidos</div>
                <div className="text-3xl font-bold text-gray-900">0</div>
              </div>
              <a
                href="/account/orders"
                className="text-sm text-cyan-600 hover:text-cyan-700 font-medium inline-block"
              >
                Ver historial →
              </a>
            </div>
          </div>

          {/* Card de Favoritos */}
          <div className="card card-magenta p-6">
            <div className="space-y-4">
              <div>
                <div className="text-sm text-gray-600 mb-1">Favoritos</div>
                <div className="text-3xl font-bold text-gray-900">{wishlist.count}</div>
              </div>
              <a
                href="/account/wishlist"
                className="text-sm text-magenta-600 hover:text-magenta-700 font-medium inline-block"
              >
                Ver favoritos →
              </a>
            </div>
          </div>

          {/* Card de Direcciones guardadas */}
          <div className="card card-yellow p-6">
            <div className="space-y-4">
              <div>
                <div className="text-sm text-gray-600 mb-1">Direcciones guardadas</div>
                <div className="text-3xl font-bold text-gray-900">
                  {data?.addresses?.length ?? 1}
                </div>
              </div>
              <a
                href="/account/addresses"
                className="text-sm text-yellow-600 hover:text-yellow-700 font-medium inline-block"
              >
                Gestionar direcciones →
              </a>
            </div>
          </div>

          {/* Card de Tienda/Catálogo */}
          <div className="card p-6 border-2 border-purple">
            <div className="space-y-4">
              <div>
                <div className="text-sm text-gray-600 mb-1">Tienda</div>
                <div className="text-xl font-bold text-gray-900">Catálogo</div>
              </div>
              <a
                href="/"
                className="text-sm text-purple hover:text-purple font-medium inline-block"
              >
                Seguir comprando →
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Pedidos */}
      <div>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Pedidos</h2>
          <a href="/account/orders" className="text-sm text-gray-600 hover:text-gray-900 underline">
            Ver todo
          </a>
        </div>

        <div className="card p-6">
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <svg
                className="w-8 h-8 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
                />
              </svg>
            </div>
            <div className="flex-1 text-center sm:text-left">
              <h3 className="font-semibold text-gray-900">No hay pedidos aún</h3>
              <p className="text-sm text-gray-600 mt-1">Cuando compres, verás el estado aquí.</p>
            </div>
            <a href="/" className="btn btn-primary whitespace-nowrap">
              Comprar
            </a>
          </div>
        </div>
      </div>

      {/* Últimos proyectos */}
      <div>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Últimos proyectos</h2>
          <a
            href="/account/projects"
            className="text-sm text-gray-600 hover:text-gray-900 underline"
          >
            Ver todo
          </a>
        </div>

        {wishlist.items.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {wishlist.items.slice(0, 4).map((item) => (
              <div
                key={item.id}
                className="card p-0 overflow-hidden group hover:shadow-xl transition-all"
              >
                <div className="aspect-square bg-white flex items-center justify-center p-4">
                  {item.image ? (
                    <img
                      src={item.image}
                      alt={item.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    />
                  ) : (
                    <div className="w-full h-full bg-gray-100 rounded" />
                  )}
                </div>
                <div className="p-4">
                  <h3 className="font-semibold text-sm text-gray-900 truncate mb-1">{item.name}</h3>
                  <p className="text-xs text-gray-500 mb-3">Editado: Hace 1 mes</p>
                  <button className="btn btn-primary btn-sm w-full">Editar</button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="card p-8 text-center">
            <p className="text-gray-600 mb-4">Aún no tienes proyectos.</p>
            <a href="/" className="btn btn-primary inline-block">
              Crear proyecto
            </a>
          </div>
        )}
      </div>

      {/* Últimos favoritos */}
      <div>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Últimos favoritos</h2>
          <a
            href="/account/wishlist"
            className="text-sm text-gray-600 hover:text-gray-900 underline"
          >
            Ver todo
          </a>
        </div>

        {wishlist.items.length > 0 ? (
          <div className="grid grid-cols-1 gap-4">
            {wishlist.items.slice(0, 3).map((item) => (
              <div key={item.id} className="card p-4 flex items-center gap-4">
                <div className="w-20 h-20 bg-gray-50 flex items-center justify-center rounded-lg flex-shrink-0">
                  {item.image ? (
                    <img
                      src={item.image}
                      alt={item.name}
                      className="w-full h-full object-cover rounded-lg"
                    />
                  ) : (
                    <div className="w-full h-full bg-gray-100 rounded-lg" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-900 truncate">{item.name}</h3>
                  {typeof item.price === 'number' && (
                    <p className="text-sm font-bold text-cyan-600">€{item.price.toFixed(2)}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="card p-8 text-center">
            <p className="text-gray-600">Aún no tienes favoritos.</p>
          </div>
        )}
      </div>
    </div>
  );
}
