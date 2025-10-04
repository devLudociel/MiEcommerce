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
        {/* Sección Cuenta */}
        <div>
          <h3 className="mb-3 text-gray-900 font-bold text-base">Cuenta</h3>
          <div className="space-y-2">
            <a 
              href="/account" 
              className={`block px-0 py-2 text-sm transition-colors rounded-lg ${
                isActive('/account') 
                  ? 'text-cyan-600 font-semibold bg-cyan-50' 
                  : 'text-gray-700 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              Panel de control
            </a>
            <a 
              href="/account/profile" 
              className={`block px-0 py-2 text-sm transition-colors rounded-lg ${
                isActive('/account/profile') 
                  ? 'text-cyan-600 font-semibold bg-cyan-50' 
                  : 'text-gray-700 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              Perfil de la cuenta
            </a>
          </div>
        </div>

        {/* Sección Espacio de trabajo */}
        <div>
          <h3 className="mb-3 text-gray-900 font-bold text-base">Espacio de trabajo</h3>
          <div className="space-y-2">
            <a 
              href="/account/projects" 
              className={`block px-0 py-2 text-sm transition-colors rounded-lg ${
                isActive('/account/projects') 
                  ? 'text-cyan-600 font-semibold bg-cyan-50' 
                  : 'text-gray-700 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              Mis proyectos
            </a>
            <a 
              href="/account/design" 
              className={`block px-0 py-2 text-sm transition-colors rounded-lg ${
                isActive('/account/design') 
                  ? 'text-cyan-600 font-semibold bg-cyan-50' 
                  : 'text-gray-700 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              Mis servicios de diseño
            </a>
            <a 
              href="/account/websites" 
              className={`block px-0 py-2 text-sm transition-colors rounded-lg ${
                isActive('/account/websites') 
                  ? 'text-cyan-600 font-semibold bg-cyan-50' 
                  : 'text-gray-700 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              Páginas web y productos digitales
            </a>
            <a 
              href="/account/brand-kit" 
              className={`block px-0 py-2 text-sm transition-colors rounded-lg ${
                isActive('/account/brand-kit') 
                  ? 'text-cyan-600 font-semibold bg-cyan-50' 
                  : 'text-gray-700 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              Kit de marca
            </a>
            <a 
              href="/account/files" 
              className={`block px-0 py-2 text-sm transition-colors rounded-lg ${
                isActive('/account/files') 
                  ? 'text-cyan-600 font-semibold bg-cyan-50' 
                  : 'text-gray-700 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              Mis archivos subidos
            </a>
            <a 
              href="/account/wishlist" 
              className={`block px-0 py-2 text-sm transition-colors rounded-lg ${
                isActive('/account/wishlist') 
                  ? 'text-cyan-600 font-semibold bg-cyan-50' 
                  : 'text-gray-700 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              Mis favoritos
            </a>
          </div>
        </div>

        {/* Sección Pedidos */}
        <div>
          <h3 className="mb-3 text-gray-900 font-bold text-base">Pedidos</h3>
          <div className="space-y-2">
            <a 
              href="/account/orders" 
              className={`block px-0 py-2 text-sm transition-colors rounded-lg ${
                isActive('/account/orders') 
                  ? 'text-cyan-600 font-semibold bg-cyan-50' 
                  : 'text-gray-700 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              Historial de compras
            </a>
            <a 
              href="/account/subscriptions" 
              className={`block px-0 py-2 text-sm transition-colors rounded-lg ${
                isActive('/account/subscriptions') 
                  ? 'text-cyan-600 font-semibold bg-cyan-50' 
                  : 'text-gray-700 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              Suscripciones
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
              Configuración de la cuenta
            </a>
            <a 
              href="/account/addresses" 
              className={`block px-0 py-2 text-sm transition-colors rounded-lg ${
                isActive('/account/addresses') 
                  ? 'text-cyan-600 font-semibold bg-cyan-50' 
                  : 'text-gray-700 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              Pago y envío
            </a>
          </div>
        </div>
      </nav>
    </aside>
  );
}