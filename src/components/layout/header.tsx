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
import { useBundleDiscounts } from '../../lib/bundleDiscounts';

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

  // Calculate bundle discounts
  const bundleDiscounts = useBundleDiscounts(cart.items);

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
      className="cart-dropdown absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-2xl border border-gray-200 z-50"
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

      {/* Bundle Discount Banner */}
      {bundleDiscounts.appliedDiscounts.length > 0 && (
        <div className="mx-4 mb-2 p-2 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center gap-2 text-green-700">
            <span className="text-lg">🎁</span>
            <div className="flex-1">
              {bundleDiscounts.appliedDiscounts.map((discount, idx) => (
                <div key={idx} className="text-xs font-medium">
                  {discount.bundleName}: <span className="text-green-600">-€{discount.savedAmount.toFixed(2)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="border-t p-3">
        {/* Price breakdown with bundle discount */}
        <div className="space-y-1 mb-2">
          {bundleDiscounts.totalDiscount > 0 && (
            <>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Subtotal:</span>
                <span className="text-gray-500 line-through">€{bundleDiscounts.originalTotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-green-600">Descuento pack:</span>
                <span className="font-semibold text-green-600">-€{bundleDiscounts.totalDiscount.toFixed(2)}</span>
              </div>
            </>
          )}
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Total:</span>
            <span className="font-bold text-cyan-700">€{bundleDiscounts.finalTotal.toFixed(2)}</span>
          </div>
        </div>

        <div className="flex gap-2">
          <a href="/cart" className="flex-1 px-3 py-2 text-sm text-center rounded border hover:bg-gray-50">
            Ver carrito
          </a>
          <a
            href="/checkout"
            className="flex-1 px-3 py-2 text-sm text-center rounded bg-cyan-600 text-white hover:bg-cyan-700"
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
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isMobile, setIsMobile] = useState(true); // Inicializar en true para evitar flash
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
  // Automatically set admin claim if user is admin by email but doesn't have claim
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
          const { getIdTokenResult, getIdToken } = await import('firebase/auth');
          const token = await getIdTokenResult(user, true);
          byClaim = !!token.claims?.admin;

          // If admin by email but missing claim, set it automatically
          if (byEmail && !byClaim) {
            try {
              const idToken = await getIdToken(user);
              const response = await fetch('/api/admin/set-admin-claim', {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${idToken}`,
                  'Content-Type': 'application/json'
                }
              });
              if (response.ok) {
                // Refresh the token to get the new claim
                await getIdTokenResult(user, true);
                console.log('[Header] Admin claim set successfully');
              }
            } catch (claimError) {
              console.debug('[Header] Could not set admin claim:', claimError);
            }
          }
        }
      } catch (e) {
        // Non-critical: will fallback to email check
        console.debug('[Header] Could not get admin claim:', e);
      }
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

  // Detectar si estamos en móvil/tablet (< 1024px = lg breakpoint)
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Bloquear scroll del body cuando el modal de búsqueda móvil está abierto
  useEffect(() => {
    if (isMobileSearchOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isMobileSearchOpen]);

  return (
    <header
      ref={headerRef}
      className="fixed top-0 left-0 right-0 z-50 bg-white shadow-sm"
    >
      {/* Barra principal */}
      <div className="bg-white relative z-50 border-b border-gray-100">
        <div className="container mx-auto px-4">
          <nav className="flex items-center justify-between gap-2 md:gap-4 py-3 md:py-4">
            {/* Logo */}
            <a href="/" className="flex items-center gap-2 flex-shrink-0 hover:opacity-80 transition-opacity">
              <div className="w-10 h-10 md:w-12 md:h-12 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-xl flex items-center justify-center text-white font-bold text-lg md:text-xl shadow-md">
                IA
              </div>
              <div className="hidden md:block">
                <h1 className="text-lg md:text-xl font-bold text-gray-800 leading-tight">ImprimeArte</h1>
                <p className="text-xs text-gray-600">Impresión y personalización</p>
              </div>
            </a>

            {/* Barra de búsqueda central con dropdown integrado - SOLO DESKTOP */}
            <div className="hidden lg:flex flex-1 max-w-lg">
              <SearchDropdown
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                isSearchFocused={isSearchFocused}
                onSearchFocus={setIsSearchFocused}
              />
            </div>

            {/* Iconos de usuario */}
            <div className="flex items-center gap-3 flex-shrink-0">
              {/* Búsqueda móvil - Solo visible en móvil/tablet */}
              <button
                onClick={() => setIsMobileSearchOpen(true)}
                className="lg:hidden flex items-center text-gray-600 hover:text-cyan-600 transition-colors"
                aria-label="Buscar"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </button>

              {/* WhatsApp */}
              <a
                href="https://wa.me/34645341452?text=¡Hola%20ImprimeArte!%20👋%20Tengo%20una%20consulta%20sobre%20sus%20servicios%20de%20impresión%20y%20personalización.%20¿Podrían%20ayudarme?"
                target="_blank"
                rel="noopener noreferrer"
                className="hidden lg:flex items-center gap-2 text-gray-600 hover:text-green-600 transition-all hover:scale-105"
              >
                <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
                <div className="text-sm">
                  <div>¿Necesitas ayuda?</div>
                  <div className="text-green-600 font-medium">WhatsApp</div>
                </div>
              </a>

              {/* Favoritos */}
              <a
                href="/account/wishlist"
                className="hidden lg:flex items-center gap-2 text-gray-600 hover:text-cyan-600 transition-colors"
              >
                <Icon name="heart" className="w-5 h-5" />
                <span className="text-sm">Mis favoritos</span>
              </a>

              {/* Cuenta */}
              <div className="relative">
                <button
                  onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                  className="flex items-center gap-2 text-gray-600 hover:text-gray-800 transition-colors"
                >
                  <Icon name="user" className="w-5 h-5" />
                  <span className="text-sm hidden lg:block">Mi cuenta</span>
                </button>

                {isUserMenuOpen && (
                  <div
                    className="absolute top-full right-0 mt-2 w-72 bg-white rounded-lg shadow-xl border border-gray-200 z-50"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {isAuthenticated ? (
                      <>
                        {/* Header con info del usuario */}
                        <div className="p-4 border-b border-gray-200">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 flex items-center justify-center rounded-full bg-cyan-100 text-cyan-700 font-semibold text-lg">
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
                            <a
                              href="/admin/banners"
                              className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                              onClick={() => setIsUserMenuOpen(false)}
                            >
                              🖼️ Banners del Carrusel
                            </a>
                            <a
                              href="/admin/faqs"
                              className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                              onClick={() => setIsUserMenuOpen(false)}
                            >
                              ❓ Preguntas Frecuentes
                            </a>
                            <a
                              href="/admin/testimonios"
                              className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                              onClick={() => setIsUserMenuOpen(false)}
                            >
                              ⭐ Testimonios y Estadísticas
                            </a>
                            <a
                              href="/admin/contacto"
                              className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                              onClick={() => setIsUserMenuOpen(false)}
                            >
                              📞 Info de Contacto
                            </a>
                            <a
                              href="/admin/resenas"
                              className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                              onClick={() => setIsUserMenuOpen(false)}
                            >
                              💬 Reseñas de Clientes
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
                            href="/login?mode=register"
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

      {/* Búsqueda móvil - ELIMINADA: Ahora se usa solo el modal de búsqueda activado por el icono */}

      {/* Menú de categorías */}
      <div className="bg-white border-b border-gray-200 relative">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between py-2">
            {/* Botón móvil */}
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="lg:hidden flex items-center gap-2 text-gray-700 hover:text-cyan-600 py-4 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              </svg>
              <span className="text-sm font-medium">Todas las categorías</span>
            </button>

            {/* Navegación desktop - NUEVO CON TAILWIND PURO */}
            <nav className="hidden lg:flex items-center gap-0.5 xl:gap-1 flex-wrap relative" style={{ overflowY: 'visible' }}>
              {categories.map((category) => (
                <div
                  key={category.id}
                  className="flex-shrink-0"
                  style={{ position: 'static' }}
                  onMouseEnter={() => setActiveMenu(category.id)}
                  onMouseLeave={(e) => {
                    // Solo cerrar si el mouse realmente salió del área
                    const relatedTarget = e.relatedTarget as HTMLElement | null;
                    if (!relatedTarget || typeof relatedTarget.closest !== 'function' || !relatedTarget.closest('[data-mega-menu]')) {
                      setActiveMenu(null);
                    }
                  }}
                >
                  <button
                    className="px-1.5 xl:px-2.5 py-2 text-[11px] xl:text-xs 2xl:text-sm font-medium text-gray-700 hover:text-cyan-600 hover:bg-gray-50 rounded-lg transition-all whitespace-nowrap flex items-center gap-0.5"
                    onClick={() => (window.location.href = `/categoria/${category.slug}`)}
                  >
                    {category.name}
                    <svg className="w-3 h-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {/* Mega menú - UI MEJORADA */}
                  {activeMenu === category.id && (
                    <>
                      {/* Puente invisible para mantener el menú abierto */}
                      <div
                        data-mega-menu
                        className="fixed"
                        style={{
                          zIndex: 9998,
                          top: '130px',
                          left: 0,
                          right: 0,
                          height: '50px',
                          background: 'transparent'
                        }}
                        onMouseEnter={() => setActiveMenu(category.id)}
                      />
                      {/* Menú visible */}
                      <div
                        data-mega-menu
                        className="fixed bg-white border border-gray-200 shadow-2xl rounded-xl p-4 md:p-8 w-[95vw] md:w-auto"
                        style={{
                          zIndex: 9999,
                          minWidth: 'auto',
                          maxWidth: '900px',
                          top: '155px',
                          left: '50%',
                          transform: 'translateX(-50%)'
                        }}
                        onMouseEnter={() => setActiveMenu(category.id)}
                        onMouseLeave={() => setActiveMenu(null)}
                      >
                      {category.subcategories && category.subcategories.length > 0 ? (
                        <div className={`grid gap-6 ${
                          category.subcategories.length === 1
                            ? 'grid-cols-1'
                            : category.subcategories.length === 2
                            ? 'grid-cols-2'
                            : 'grid-cols-2 lg:grid-cols-3'
                        }`}>
                          {category.subcategories.map((subcategory) => (
                            <a
                              key={subcategory.id}
                              href={`/categoria/${category.slug}/${subcategory.slug}`}
                              className="block p-4 border border-gray-200 rounded-lg hover:border-cyan-500 hover:bg-cyan-50/50 hover:shadow-md transition-all duration-300 group"
                            >
                              <div className="flex items-start gap-3 mb-2">
                                <span className="text-3xl flex-shrink-0">{subcategory.icon}</span>
                                <div className="flex-1 min-w-0">
                                  <h4 className="text-base font-semibold text-gray-800 group-hover:text-cyan-600 transition-colors mb-1">
                                    {subcategory.name}
                                  </h4>
                                  <p className="text-sm text-gray-600 leading-relaxed">
                                    {subcategory.description}
                                  </p>
                                </div>
                              </div>
                            </a>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center text-gray-500 py-8">
                          No hay subcategorías disponibles
                        </div>
                      )}

                      {/* Footer del mega menú */}
                      <div className="mt-6 pt-6 border-t border-gray-200 text-center">
                        <a
                          href={`/categoria/${category.slug}`}
                          className="inline-flex items-center gap-2 text-cyan-600 font-medium hover:text-cyan-700 hover:gap-3 transition-all"
                        >
                          Ver todos los productos de {category.name}
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </a>
                      </div>
                    </div>
                    </>
                  )}
                </div>
              ))}

              {/* Enlaces adicionales - TAILWIND PURO */}
              <div className="flex items-center gap-1 xl:gap-2 flex-shrink-0">
                <a
                  href="/productos/digitales"
                  className="flex items-center gap-1 px-1.5 xl:px-2.5 py-2 text-[11px] xl:text-xs 2xl:text-sm font-medium text-cyan-600 hover:text-cyan-700 hover:bg-cyan-50 rounded-lg transition-all whitespace-nowrap"
                >
                  <svg className="w-3.5 h-3.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                  <span className="hidden 2xl:inline">Productos Digitales</span>
                  <span className="2xl:hidden">Digitales</span>
                </a>
                <a
                  href="/ofertas"
                  className="px-1.5 xl:px-2.5 py-2 text-[11px] xl:text-xs 2xl:text-sm font-medium text-red-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all whitespace-nowrap"
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
        className="bg-black text-white text-center relative overflow-hidden z-30 py-3"
      >
        <div className="container">
          <div
            className="flex flex-wrap items-center justify-center text-sm text-center"
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

      {/* Modal de búsqueda móvil */}
      {isMobileSearchOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-[9999] lg:hidden"
          onClick={() => {
            setIsMobileSearchOpen(false);
            setSearchQuery('');
          }}
        >
          <div
            className="bg-white h-full overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header del modal */}
            <div className="sticky top-0 bg-white border-b border-gray-200 p-4 flex items-center gap-3 shadow-sm">
              <button
                onClick={() => {
                  setIsMobileSearchOpen(false);
                  setSearchQuery('');
                }}
                className="flex-shrink-0 text-gray-600 hover:text-gray-800 transition-colors"
                aria-label="Cerrar búsqueda"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
              <div className="flex-1" onClick={(e) => e.stopPropagation()}>
                <SearchDropdown
                  searchQuery={searchQuery}
                  onSearchChange={setSearchQuery}
                  isSearchFocused={true}
                  onSearchFocus={() => {}}
                />
              </div>
            </div>

            {/* Contenido del modal - resultados de búsqueda se muestran aquí */}
            <div className="p-4">
              {!searchQuery && (
                <div className="text-center text-gray-500 mt-8">
                  <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <p className="text-sm">Busca productos, categorías y más...</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
};

export default Header;
