import { useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../../lib/firebase';

export default function AccountMenu() {
  const [email, setEmail] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<string>('');

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => setEmail(u?.email ?? null));
    return () => unsub();
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setActiveSection(window.location.pathname);
    }
  }, []);

  const isActive = (path: string) => activeSection === path;

  return (
    <aside className="space-y-8">
      <nav className="space-y-8">
        {/* Sección Mi Cuenta */}
        <div>
          <h3 className="mb-3 text-gray-900 font-bold text-base">Mi Cuenta</h3>
          <div className="space-y-2">
            <a
              href="/account"
              className={`block px-0 py-2 text-sm transition-colors rounded-lg ${
                isActive('/account')
                  ? 'text-cyan-600 font-semibold bg-cyan-50'
                  : 'text-gray-700 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              Dashboard
            </a>
            <a
              href="/account/profile"
              className={`block px-0 py-2 text-sm transition-colors rounded-lg ${
                isActive('/account/profile')
                  ? 'text-cyan-600 font-semibold bg-cyan-50'
                  : 'text-gray-700 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              Perfil
            </a>
            <a
              href="/account/wishlist"
              className={`block px-0 py-2 text-sm transition-colors rounded-lg ${
                isActive('/account/wishlist')
                  ? 'text-cyan-600 font-semibold bg-cyan-50'
                  : 'text-gray-700 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              Favoritos
            </a>
          </div>
        </div>

        {/* Sección Mis Pedidos */}
        <div>
          <h3 className="mb-3 text-gray-900 font-bold text-base">Mis Pedidos</h3>
          <div className="space-y-2">
            <a
              href="/account/orders"
              className={`block px-0 py-2 text-sm transition-colors rounded-lg ${
                isActive('/account/orders')
                  ? 'text-cyan-600 font-semibold bg-cyan-50'
                  : 'text-gray-700 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              Historial de Pedidos
            </a>
            <a
              href="/account/addresses"
              className={`block px-0 py-2 text-sm transition-colors rounded-lg ${
                isActive('/account/addresses')
                  ? 'text-cyan-600 font-semibold bg-cyan-50'
                  : 'text-gray-700 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              Direcciones de Envío
            </a>
          </div>
        </div>

        {/* Sección Mis Diseños */}
        <div>
          <h3 className="mb-3 text-gray-900 font-bold text-base">Mis Diseños</h3>
          <div className="space-y-2">
            <a
              href="/account/designs"
              className={`block px-0 py-2 text-sm transition-colors rounded-lg ${
                isActive('/account/designs')
                  ? 'text-cyan-600 font-semibold bg-cyan-50'
                  : 'text-gray-700 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              Diseños Guardados
            </a>
            <a
              href="/account/files"
              className={`block px-0 py-2 text-sm transition-colors rounded-lg ${
                isActive('/account/files')
                  ? 'text-cyan-600 font-semibold bg-cyan-50'
                  : 'text-gray-700 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              Archivos Subidos
            </a>
            <a
              href="/account/customizer"
              className={`block px-0 py-2 text-sm transition-colors rounded-lg ${
                isActive('/account/customizer')
                  ? 'text-cyan-600 font-semibold bg-cyan-50'
                  : 'text-gray-700 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              Personalizador
            </a>
          </div>
        </div>

        {/* Sección Configuración */}
        <div>
          <h3 className="mb-3 text-gray-900 font-bold text-base">Configuración</h3>
          <div className="space-y-2">
            <a
              href="/account/settings"
              className={`block px-0 py-2 text-sm transition-colors rounded-lg ${
                isActive('/account/settings')
                  ? 'text-cyan-600 font-semibold bg-cyan-50'
                  : 'text-gray-700 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              Ajustes de Cuenta
            </a>
            <a
              href="/account/wallet"
              className={`block px-0 py-2 text-sm transition-colors rounded-lg ${
                isActive('/account/wallet')
                  ? 'text-cyan-600 font-semibold bg-cyan-50'
                  : 'text-gray-700 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              Monedero
            </a>
          </div>
        </div>
      </nav>
    </aside>
  );
}
