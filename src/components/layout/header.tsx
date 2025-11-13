// Header.tsx - Versión actualizada con búsqueda integrada
import { useState, useEffect, useRef, memo, useCallback } from 'react';
import SearchDropdown from '../navigation/SearchDropdown';
import Icon from '../ui/Icon';
import { useAuth } from '../../components/hooks/useAuth';
import { useStore } from '@nanostores/react';
import {
  cartStore,
  updateCartItemQuantity,
  removeFromCart,
  getCartItemCount,
} from '../../store/cartStore';
import { categories, type MenuCategory, type MenuSubcategory } from '../../data/categories';
import CustomizationDetails from '../cart/CustomizationDetails';

// ✅ DESPUÉS (sin error de hidratación)
function CartBadge() {
  const [count, setCount] = useState(0);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Solo ejecutar en el cliente después de montar
    setMounted(true);

    const updateCount = () => {
      const state = cartStore.get();
      const total = state.items.reduce((sum, item) => sum + item.quantity, 0);
      setCount(total);
    };

    updateCount();

    // Suscribirse a cambios del carrito
    const unsubscribe = cartStore.listen(updateCount);

    return () => unsubscribe();
  }, []);

  // No renderizar hasta que esté montado en el cliente
  if (!mounted || count === 0) return null;

  return (
    <span
      className="absolute bg-red-500 text-white text-xs rounded-full flex items-center justify-center"
      style={{ top: '-0.25rem', right: '-0.25rem', width: '1rem', height: '1rem' }}
    >
      {count}
    </span>
  );
}

// PERFORMANCE: Memoize CartDropdown to prevent re-renders when header state changes
const CartDropdown = memo(function CartDropdown({ onClose }: { onClose: () => void }) {
  const cart = useStore(cartStore);

  // PERFORMANCE: Memoize handlers to prevent recreating on every render
  const handleDecrease = useCallback((id: string, variantId: number | undefined, currentQty: number) => {
    updateCartItemQuantity(id, variantId, Math.max(1, currentQty - 1));
  }, []);

  const handleIncrease = useCallback((id: string, variantId: number | undefined, currentQty: number) => {
    updateCartItemQuantity(id, variantId, currentQty + 1);
  }, []);

  const handleRemove = useCallback((id: string, variantId: number | undefined) => {
    removeFromCart(id, variantId);
  }, []);

  return (
    <div
      className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-2xl border border-gray-200 z-50"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="p-4 max-h-96 overflow-auto">
        <h4 className="font-semibold text-gray-800 mb-2">Tu carrito</h4>
        {cart.items.length === 0 ? (
          <div className="text-sm text-gray-500 py-6 text-center">
            No hay productos en el carrito
          </div>
        ) : (
          <div className="space-y-3">
            {cart.items.map((item) => (
              <div key={`${item.id}-${item.variantId ?? 'v'}`} className="flex items-start gap-3">
                {item.image ? (
                  <img
                    src={item.image}
                    alt={item.name}
                    className="w-12 h-12 rounded object-cover flex-shrink-0"
                  />
                ) : (
                  <div className="w-12 h-12 rounded bg-gray-100 flex-shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{item.name}</div>
                  {item.variantName && (
                    <div className="text-xs text-gray-500 truncate">{item.variantName}</div>
                  )}
                  <CustomizationDetails customization={item.customization} />
                  <div className="flex items-center gap-2 mt-1">
                    <button
                      type="button"
                      className="w-6 h-6 rounded border text-gray-700 hover:bg-gray-50"
                      onClick={() => handleDecrease(item.id, item.variantId, item.quantity)}
                      aria-label="Disminuir"
                    >
                      −
                    </button>
                    <span className="text-sm text-gray-700 w-6 text-center">{item.quantity}</span>
                    <button
                      type="button"
                      className="w-6 h-6 rounded border text-gray-700 hover:bg-gray-50"
                      onClick={() => handleIncrease(item.id, item.variantId, item.quantity)}
                      aria-label="Aumentar"
                    >
                      +
                    </button>
                    <button
                      type="button"
                      className="ml-2 text-xs text-red-600 hover:underline"
                      onClick={() => handleRemove(item.id, item.variantId)}
                    >
                      Eliminar
                    </button>
                  </div>
                </div>
                <div className="text-sm font-semibold text-cyan-700 whitespace-nowrap flex-shrink-0">
                  €{(item.price * item.quantity).toFixed(2)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="border-t p-3 flex items-center justify-between">
        <div className="text-sm">
          <span className="text-gray-600 mr-2">Subtotal:</span>
          <span className="font-semibold text-cyan-700">€{cart.total.toFixed(2)}</span>
        </div>
        <div className="flex gap-2">
          <a href="/cart" className="px-3 py-2 text-sm rounded border hover:bg-gray-50">
            Ver carrito
          </a>
          <a
            href="/checkout"
            className="px-3 py-2 text-sm rounded bg-cyan-600 text-white hover:bg-cyan-700"
          >
            Finalizar
          </a>
        </div>
      </div>
    </div>
  );
});

// Después de estos componentes continúa con el resto de tu Header.tsx tal cual está

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
interface HeaderProps {}

const Header: React.FC<HeaderProps> = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const headerRef = useRef<HTMLElement>(null);
  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (!headerRef.current) return;
      if (!headerRef.current.contains(e.target as Node)) {
        setIsCartOpen(false);
      }
    };
    document.addEventListener('click', onDocClick);
    return () => document.removeEventListener('click', onDocClick);
  }, []);

  const { user, email, displayName, isAuthenticated, logout } = useAuth();

  // Check if user is admin (allowlist OR custom claim)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const adminEmails = (import.meta.env.PUBLIC_ADMIN_EMAILS || '')
        .split(',')
        .map((s: string) => s.trim().toLowerCase())
        .filter(Boolean);
      const byEmail = email ? adminEmails.includes(email.toLowerCase()) : false;
      let byClaim = false;
      try {
        if (user) {
          const { getIdTokenResult } = await import('firebase/auth');
          const token = await getIdTokenResult(user, true);
          byClaim = !!(token.claims as any)?.admin;
        }
      } catch {}
      if (!cancelled) setIsAdmin(byEmail || byClaim);
    })();
    return () => {
      cancelled = true;
    };
  }, [email, user]);

  // Cerrar menús al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (headerRef.current && !headerRef.current.contains(event.target as Node)) {
        setActiveMenu(null);
        setIsUserMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Bloquear scroll del body cuando el menú móvil está abierto
  useEffect(() => {
    if (isMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isMenuOpen]);

  return (
    <header
      ref={headerRef}
      className="header"
      style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 'var(--z-fixed)' }}
    >
      {/* Barra principal */}
      <div>
        <div className="container">
          <nav className="nav">
            {/* Logo */}
            <div className="logo">
              <a href="/" className="logo">
                <div className="logo-icon">IA</div>
                <div className="logo-text">
                  <h1>ImprimeArte</h1>
                  <p>Impresión y personalización</p>
                </div>
              </a>
            </div>

            {/* Barra de búsqueda central con dropdown integrado */}
            <div
              className="md:block hidden"
              style={{
                flex: 1,
                maxWidth: '40rem',
                margin: '0 var(--spacing-12)',
              }}
            >
              <SearchDropdown
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                isSearchFocused={isSearchFocused}
                onSearchFocus={setIsSearchFocused}
              />
            </div>

            {/* Iconos de usuario */}
            <div className="flex items-center" style={{ gap: 'var(--spacing-6)' }}>
              {/* Ayuda */}
              <button
                className="lg:flex hidden items-center"
                style={{
                  gap: 'var(--spacing-3)',
                  color: 'var(--color-gray-600)',
                  transition: 'var(--transition-all)',
                }}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <div className="text-sm">
                  <div>¿Necesitas ayuda?</div>
                  <div className="text-gray-500">645 341 452</div>
                </div>
              </button>

              {/* Proyectos */}
              <a
                href="/account/projects"
                className="lg:flex hidden items-center hover:text-cyan-600"
                style={{
                  gap: 'var(--spacing-2)',
                  color: 'var(--color-gray-600)',
                  transition: 'var(--transition-all)',
                }}
              >
                <Icon name="folder" className="w-5 h-5" />
                <span className="text-sm">Mis proyectos</span>
              </a>

              {/* Favoritos */}
              <a
                href="/account/wishlist"
                className="lg:flex hidden items-center hover:text-cyan-600"
                style={{
                  gap: 'var(--spacing-2)',
                  color: 'var(--color-gray-600)',
                  transition: 'var(--transition-all)',
                }}
              >
                <Icon name="heart" className="w-5 h-5" />
                <span className="text-sm">Mis favoritos</span>
              </a>

              {/* Cuenta */}
              <div className="relative">
                <button
                  onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                  className="flex items-center"
                  style={{
                    gap: 'var(--spacing-2)',
                    color: 'var(--color-gray-600)',
                    transition: 'var(--transition-all)',
                  }}
                >
                  <Icon name="user" className="w-5 h-5" />
                  <span className="text-sm lg:block hidden">Mi cuenta</span>
                </button>

                {isUserMenuOpen && (
                  <div
                    className="absolute bg-white rounded-lg shadow-xl border z-50"
                    style={{
                      top: '100%',
                      right: 0,
                      marginTop: 'var(--spacing-2)',
                      width: '280px',
                      borderColor: 'var(--color-gray-200)',
                    }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    {isAuthenticated ? (
                      <>
                        {/* Header con info del usuario */}
                        <div
                          style={{
                            padding: 'var(--spacing-4)',
                            borderBottom: '1px solid var(--color-gray-200)',
                          }}
                        >
                          <div className="flex items-center" style={{ gap: 'var(--spacing-3)' }}>
                            <div
                              className="flex items-center justify-center rounded-full bg-cyan-100 text-cyan-700 font-semibold"
                              style={{ width: '40px', height: '40px', fontSize: '1.125rem' }}
                            >
                              {(displayName || email?.split('@')[0] || 'U').charAt(0).toUpperCase()}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="font-semibold text-gray-900 text-sm truncate">
                                Hola {displayName || email?.split('@')[0] || 'Usuario'}
                              </div>
                              <div className="text-xs text-gray-500 truncate">{email}</div>
                            </div>
                          </div>
                        </div>

                        {/* Opciones del menú */}
                        <div style={{ padding: 'var(--spacing-2) 0' }}>
                          <div
                            style={{
                              padding: '0 var(--spacing-3) var(--spacing-2) var(--spacing-3)',
                            }}
                          >
                            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                              Cuenta
                            </h4>
                          </div>
                          <a
                            href="/account"
                            className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                            onClick={() => setIsUserMenuOpen(false)}
                          >
                            Panel de control
                          </a>
                          <a
                            href="/account/profile"
                            className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                            onClick={() => setIsUserMenuOpen(false)}
                          >
                            Perfil de la cuenta
                          </a>
                        </div>

                        <div
                          style={{
                            padding: 'var(--spacing-2) 0',
                            borderTop: '1px solid var(--color-gray-100)',
                          }}
                        >
                          <div
                            style={{
                              padding: '0 var(--spacing-3) var(--spacing-2) var(--spacing-3)',
                            }}
                          >
                            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                              Mis compras
                            </h4>
                          </div>
                          <a
                            href="/account/orders"
                            className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                            onClick={() => setIsUserMenuOpen(false)}
                          >
                            Historial de compras y volver a pedir
                          </a>
                        </div>

                        {isAdmin && (
                          <div
                            style={{
                              padding: 'var(--spacing-2) 0',
                              borderTop: '1px solid var(--color-gray-100)',
                            }}
                          >
                            <div
                              style={{
                                padding: '0 var(--spacing-3) var(--spacing-2) var(--spacing-3)',
                              }}
                            >
                              <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                                Administración
                              </h4>
                            </div>
                            <a
                              href="/admin"
                              className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                              onClick={() => setIsUserMenuOpen(false)}
                            >
                              📊 Panel de administración
                            </a>
                            <a
                              href="/admin/orders"
                              className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                              onClick={() => setIsUserMenuOpen(false)}
                            >
                              📦 Gestión de pedidos
                            </a>
                            <a
                              href="/admin/products"
                              className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                              onClick={() => setIsUserMenuOpen(false)}
                            >
                              🏷️ Gestión de productos
                            </a>
                            <a
                              href="/admin/content-manager"
                              className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                              onClick={() => setIsUserMenuOpen(false)}
                            >
                              🎨 Plantillas y Cliparts
                            </a>
                            <a
                              href="/admin/digital-products"
                              className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                              onClick={() => setIsUserMenuOpen(false)}
                            >
                              📦 Productos Digitales
                            </a>
                            <a
                              href="/admin/cupones"
                              className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                              onClick={() => setIsUserMenuOpen(false)}
                            >
                              🎟️ Gestión de cupones
                            </a>
                            <a
                              href="/admin/newsletter"
                              className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                              onClick={() => setIsUserMenuOpen(false)}
                            >
                              📧 Newsletter Campaigns
                            </a>
                          </div>
                        )}

                        <div
                          style={{
                            padding: 'var(--spacing-2) 0',
                            borderTop: '1px solid var(--color-gray-100)',
                          }}
                        >
                          <div
                            style={{
                              padding: '0 var(--spacing-3) var(--spacing-2) var(--spacing-3)',
                            }}
                          >
                            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                              Mi biblioteca
                            </h4>
                          </div>
                          <a
                            href="/cuenta/descargas"
                            className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                            onClick={() => setIsUserMenuOpen(false)}
                          >
                            📥 Mis descargas
                          </a>
                          <a
                            href="/account/wishlist"
                            className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                            onClick={() => setIsUserMenuOpen(false)}
                          >
                            ❤️ Mis favoritos
                          </a>
                          <a
                            href="/account/addresses"
                            className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                            onClick={() => setIsUserMenuOpen(false)}
                          >
                            📍 Mis direcciones
                          </a>
                          <a
                            href="/account/wallet"
                            className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                            onClick={() => setIsUserMenuOpen(false)}
                          >
                            💰 Mi monedero
                          </a>
                          <a
                            href="/account"
                            className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                            onClick={() => setIsUserMenuOpen(false)}
                          >
                            ⚙️ Configuración de la cuenta
                          </a>
                        </div>

                        <div
                          style={{
                            padding: 'var(--spacing-2)',
                            borderTop: '1px solid var(--color-gray-100)',
                          }}
                        >
                          <button
                            onClick={() => {
                              setIsUserMenuOpen(false);
                              logout();
                            }}
                            className="w-full px-4 py-2 text-sm text-left text-red-600 hover:bg-red-50 rounded font-medium"
                          >
                            Cerrar sesión
                          </button>
                        </div>
                      </>
                    ) : (
                      <div style={{ padding: 'var(--spacing-4)' }}>
                        <h3 className="font-semibold text-gray-900 mb-2">¡Bienvenido!</h3>
                        <p className="text-sm text-gray-600 mb-4">
                          Inicia sesión para acceder a tu cuenta
                        </p>
                        <div className="space-y-2">
                          <a
                            href="/login"
                            className="block w-full px-4 py-2 text-sm text-center bg-cyan-600 text-white rounded hover:bg-cyan-700 font-medium"
                            onClick={() => setIsUserMenuOpen(false)}
                          >
                            Iniciar sesión
                          </a>
                          <a
                            href="/register"
                            className="block w-full px-4 py-2 text-sm text-center border border-gray-300 text-gray-700 rounded hover:bg-gray-50"
                            onClick={() => setIsUserMenuOpen(false)}
                          >
                            Crear cuenta
                          </a>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Cesta */}
              <div className="relative">
                <button
                  className="flex items-center text-gray-600 hover:text-cyan transition-colors relative"
                  style={{ gap: 'var(--spacing-2)' }}
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsCartOpen((v) => !v);
                  }}
                  aria-label="Abrir carrito"
                  aria-expanded={isCartOpen}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3 3h2l.4 2M7 13h10l4-8H5.4m0 0L7 13m0 0l-2.5 2.5M7 13l2.5 2.5M13 13h6m-6 0v6a1 1 0 001 1h4a1 1 0 001-1v-6m-6 0V9a1 1 0 011-1h4a1 1 0 011-1V9"
                    />
                  </svg>
                  <span className="text-sm lg:block hidden">Cesta</span>
                  <CartBadge />
                </button>
                {isCartOpen && <CartDropdown onClose={() => setIsCartOpen(false)} />}
              </div>
            </div>
          </nav>
        </div>
      </div>

      {/* Búsqueda móvil */}
      <div
        className="md:hidden"
        style={{ borderBottom: '1px solid var(--color-gray-200)', background: 'white' }}
      >
        <div className="container" style={{ padding: 'var(--spacing-4) var(--spacing-4)' }}>
          <SearchDropdown
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            isSearchFocused={isSearchFocused}
            onSearchFocus={setIsSearchFocused}
          />
        </div>
      </div>

      {/* Menú de categorías */}
      <div className="bg-white" style={{ borderBottom: '1px solid var(--color-gray-200)' }}>
        <div className="container-xl" style={{ padding: '0 var(--spacing-8)' }}>
          <div
            className="flex items-center justify-between"
            style={{ padding: 'var(--spacing-1) 0' }}
          >
            {/* Botón móvil */}
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="lg:hidden flex items-center text-gray-700 hover:text-cyan"
              style={{ gap: 'var(--spacing-2)', padding: 'var(--spacing-4) 0' }}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              </svg>
              <span className="text-sm">Todas las categorías</span>
            </button>

            {/* Navegación desktop */}
            <nav
              className="lg:flex hidden items-center nav-links"
              style={{ overflow: 'visible', position: 'relative' }}
            >
              {categories.map((category) => (
                <div
                  key={category.id}
                  className="nav-item"
                  style={{ position: 'relative' }}
                  onMouseEnter={() => setActiveMenu(category.id)}
                  onMouseLeave={() => setActiveMenu(null)}
                >
                  <button
                    className="nav-link has-dropdown"
                    style={{ whiteSpace: 'nowrap' }}
                    onClick={() => (window.location.href = `/categoria/${category.slug}`)}
                  >
                    {category.name}
                  </button>

                  {/* Mega menú actualizado */}
                  {activeMenu === category.id && (
                    <div
                      className="mega-menu"
                      style={{
                        position: 'absolute',
                        top: '100%',
                        left: 0,
                        background: 'white',
                        border: '1px solid var(--color-gray-200)',
                        borderTop: 'none',
                        boxShadow: 'var(--shadow-lg)',
                        zIndex: 'var(--z-dropdown)',
                      }}
                    >
                      <div
                        className="mega-content"
                        style={{
                          display: 'grid',
                          gridTemplateColumns:
                            category.subcategories.length === 1
                              ? '1fr'
                              : 'repeat(auto-fit, minmax(300px, 1fr))',
                          gap: 'var(--spacing-8)',
                          padding: 'var(--spacing-8)',
                          maxWidth: '800px',
                        }}
                      >
                        {category.subcategories.map((subcategory) => (
                          <div key={subcategory.id} className="mega-section">
                            <a
                              href={`/categoria/${category.slug}/${subcategory.slug}`}
                              className="mega-item"
                              style={{
                                display: 'block',
                                textDecoration: 'none',
                                padding: 'var(--spacing-4)',
                                borderRadius: '8px',
                                border: '1px solid var(--color-gray-200)',
                                transition: 'all 0.3s ease',
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.borderColor = 'var(--color-cyan-500)';
                                e.currentTarget.style.transform = 'translateY(-2px)';
                                e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.borderColor = 'var(--color-gray-200)';
                                e.currentTarget.style.transform = 'translateY(0)';
                                e.currentTarget.style.boxShadow = 'none';
                              }}
                            >
                              <div className="mega-item-content">
                                <div
                                  style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 'var(--spacing-3)',
                                    marginBottom: 'var(--spacing-2)',
                                  }}
                                >
                                  <span style={{ fontSize: '1.5rem' }}>{subcategory.icon}</span>
                                  <h4
                                    style={{
                                      fontSize: '1.1rem',
                                      fontWeight: '600',
                                      color: 'var(--color-gray-800)',
                                      margin: 0,
                                    }}
                                  >
                                    {subcategory.name}
                                  </h4>
                                </div>
                                <p
                                  style={{
                                    fontSize: '0.875rem',
                                    color: 'var(--color-gray-600)',
                                    margin: 0,
                                    lineHeight: '1.4',
                                  }}
                                >
                                  {subcategory.description}
                                </p>
                              </div>
                            </a>
                          </div>
                        ))}
                      </div>

                      {/* Footer del mega menú */}
                      <div
                        style={{
                          borderTop: '1px solid var(--color-gray-200)',
                          padding: 'var(--spacing-4) var(--spacing-8)',
                          background: 'var(--color-gray-50)',
                        }}
                      >
                        <a
                          href={`/categoria/${category.slug}`}
                          style={{
                            color: 'var(--color-cyan-600)',
                            fontSize: '0.875rem',
                            fontWeight: '500',
                            textDecoration: 'none',
                          }}
                        >
                          Ver todos los productos de {category.name} →
                        </a>
                      </div>
                    </div>
                  )}
                </div>
              ))}

              {/* Enlaces adicionales */}
              <div
                className="flex items-center"
                style={{ marginLeft: 'auto', gap: 'var(--spacing-6)' }}
              >
                <a
                  href="/productos/digitales"
                  className="text-sm font-medium hover:text-cyan-600 flex items-center"
                  style={{
                    color: '#0891b2',
                    padding: 'var(--spacing-5)',
                    gap: 'var(--spacing-2)',
                  }}
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                  Productos Digitales
                </a>
                <button
                  className="text-sm text-gray-700 hover:text-cyan"
                  style={{ padding: 'var(--spacing-5)' }}
                >
                  Más
                </button>
                <a
                  href="/ofertas"
                  className="text-sm font-medium hover:text-red-600"
                  style={{
                    color: '#ef4444',
                    padding: 'var(--spacing-5)',
                  }}
                >
                  Ofertas
                </a>
              </div>
            </nav>
          </div>
        </div>
      </div>

      {/* Banner promocional */}
      <div
        className="bg-black text-white text-center relative overflow-hidden"
        style={{ padding: 'var(--spacing-3) 0' }}
      >
        <div className="container">
          <div
            className="flex items-center justify-center text-sm"
            style={{ gap: 'var(--spacing-3)' }}
          >
            <button className="hover:text-white" style={{ color: 'rgba(255, 255, 255, 0.7)' }}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
            </button>
            <span>Hasta -30 € con el código PROMO</span>
            <span style={{ color: '#f87171' }}>⏰</span>
            <span className="sm:inline hidden">Hasta el 31 de diciembre de 2025</span>
            <a
              href="/ofertas"
              className="underline hover:no-underline"
              style={{ marginLeft: 'var(--spacing-2)' }}
            >
              Comprar ahora
            </a>
            <button
              className="hover:text-white"
              style={{ color: 'rgba(255, 255, 255, 0.7)', marginLeft: 'var(--spacing-2)' }}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Menú móvil actualizado */}
      {isMenuOpen && (
        <div
          className="fixed"
          style={{
            inset: 0 as unknown as string,
            background: 'rgba(0,0,0,0.2)',
            zIndex: 'var(--z-modal-backdrop)',
          }}
          onClick={() => setIsMenuOpen(false)}
        />
      )}

      {isMenuOpen && (
        <div
          className="lg:hidden bg-white absolute shadow-lg overflow-y-auto"
          style={{
            borderTop: '1px solid var(--color-gray-200)',
            top: '100%',
            left: 0,
            right: 0,
            maxHeight: '80vh',
            zIndex: 'var(--z-modal)',
          }}
        >
          <div className="container" style={{ padding: 'var(--spacing-4) var(--spacing-4)' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-1)' }}>
              {categories.map((category) => (
                <div key={category.id} style={{ borderBottom: '1px solid var(--color-gray-100)' }}>
                  <button
                    onClick={() => setActiveMenu(activeMenu === category.id ? null : category.id)}
                    className="w-full flex items-center justify-between text-left"
                    style={{ padding: 'var(--spacing-3) 0' }}
                  >
                    <span
                      className="text-sm font-medium"
                      style={{ color: 'var(--color-gray-700)' }}
                    >
                      {category.name}
                    </span>
                    <svg
                      className="w-4 h-4 transition-all"
                      style={{
                        transform: activeMenu === category.id ? 'rotate(180deg)' : 'rotate(0deg)',
                        transition: 'transform 0.3s ease',
                      }}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  </button>

                  {activeMenu === category.id && (
                    <div
                      style={{
                        paddingBottom: 'var(--spacing-3)',
                        paddingLeft: 'var(--spacing-4)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 'var(--spacing-2)',
                      }}
                    >
                      {category.subcategories.map((subcategory) => (
                        <a
                          key={subcategory.id}
                          href={`/categoria/${category.slug}/${subcategory.slug}`}
                          className="block"
                          style={{
                            padding: 'var(--spacing-3)',
                            borderRadius: '8px',
                            border: '1px solid var(--color-gray-200)',
                            textDecoration: 'none',
                            background: 'white',
                          }}
                          onClick={() => setIsMenuOpen(false)}
                        >
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 'var(--spacing-2)',
                              marginBottom: 'var(--spacing-1)',
                            }}
                          >
                            <span>{subcategory.icon}</span>
                            <span
                              className="font-medium text-sm"
                              style={{ color: 'var(--color-gray-800)' }}
                            >
                              {subcategory.name}
                            </span>
                          </div>
                          <p
                            style={{
                              fontSize: '0.75rem',
                              color: 'var(--color-gray-600)',
                              margin: 0,
                              paddingLeft: 'var(--spacing-6)',
                            }}
                          >
                            {subcategory.description}
                          </p>
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              ))}

              {/* Enlaces especiales */}
              <div style={{ borderTop: '2px solid var(--color-gray-200)', paddingTop: 'var(--spacing-4)', marginTop: 'var(--spacing-4)' }}>
                <a
                  href="/productos/digitales"
                  className="flex items-center justify-between"
                  style={{
                    padding: 'var(--spacing-4)',
                    borderRadius: '8px',
                    border: '1px solid #0891b2',
                    background: '#ecfeff',
                    textDecoration: 'none',
                    marginBottom: 'var(--spacing-3)',
                  }}
                  onClick={() => setIsMenuOpen(false)}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-2)' }}>
                    <svg className="w-5 h-5" fill="#0891b2" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                    <span className="font-medium text-sm" style={{ color: '#0891b2' }}>
                      Productos Digitales
                    </span>
                  </div>
                  <span style={{ fontSize: '0.75rem', color: '#0e7490' }}>Descarga instantánea →</span>
                </a>

                <a
                  href="/ofertas"
                  className="flex items-center justify-between"
                  style={{
                    padding: 'var(--spacing-4)',
                    borderRadius: '8px',
                    border: '1px solid #ef4444',
                    background: '#fef2f2',
                    textDecoration: 'none',
                  }}
                  onClick={() => setIsMenuOpen(false)}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-2)' }}>
                    <span style={{ fontSize: '1.25rem' }}>🔥</span>
                    <span className="font-medium text-sm" style={{ color: '#ef4444' }}>
                      Ofertas Especiales
                    </span>
                  </div>
                  <span style={{ fontSize: '0.75rem', color: '#dc2626' }}>Ver ofertas →</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};

export default Header;
