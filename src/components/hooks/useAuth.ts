// hooks/useAuth.ts
import { useEffect, useState } from 'react';
import type { User } from 'firebase/auth';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdminClaim, setIsAdminClaim] = useState(false);

  const syncSessionCookie = async (token: string | null) => {
    if (typeof window === 'undefined') return;
    try {
      const endpoint = token ? '/api/session/create' : '/api/session/logout';
      const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};
      await fetch(endpoint, { method: 'POST', headers });
    } catch {
      // Non-blocking; session cookie is best-effort
    }
  };

  useEffect(() => {
    let unsubscribe: (() => void) | null = null;
    let cancelled = false;

    const subscribe = async () => {
      if (cancelled) return;

      // Dynamic imports — defer Firebase Auth bundle (~90KB iframe) until
      // browser is idle. Keeps it out of the LCP critical path.
      const [{ onAuthStateChanged }, { auth }, { resolveAdminAccess }, cartStore, wishlistStore] =
        await Promise.all([
          import('firebase/auth'),
          import('../../lib/firebase'),
          import('../../lib/auth/adminAccessClient'),
          import('../../store/cartStore'),
          import('../../store/wishlistStore'),
        ]);

      if (cancelled) return;

      const { syncCartWithUser } = cartStore;
      const { syncWishlistWithUser } = wishlistStore;

      unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
        setLoading(true);
        setUser(currentUser);
        try {
          if (currentUser) {
            const { isAdmin, token } = await resolveAdminAccess(currentUser);
            setIsAdminClaim(isAdmin);
            await syncSessionCookie(token);

            await Promise.all([
              syncCartWithUser(currentUser.uid),
              syncWishlistWithUser(currentUser.uid),
            ]);
          } else {
            setIsAdminClaim(false);
            await syncSessionCookie(null);

            await Promise.all([syncCartWithUser(null), syncWishlistWithUser(null)]);
          }
        } catch {
          setIsAdminClaim(false);
          await syncSessionCookie(null);
          if (currentUser) {
            await Promise.all([
              syncCartWithUser(currentUser.uid),
              syncWishlistWithUser(currentUser.uid),
            ]);
          } else {
            await Promise.all([syncCartWithUser(null), syncWishlistWithUser(null)]);
          }
        } finally {
          setLoading(false);
        }
      });
    };

    let idleHandle: number | null = null;
    let timerHandle: number | null = null;
    if (typeof window !== 'undefined' && typeof window.requestIdleCallback === 'function') {
      idleHandle = window.requestIdleCallback(() => void subscribe(), { timeout: 2500 });
    } else {
      timerHandle = window.setTimeout(() => void subscribe(), 1200);
    }

    return () => {
      cancelled = true;
      if (idleHandle !== null && typeof window.cancelIdleCallback === 'function') {
        window.cancelIdleCallback(idleHandle);
      }
      if (timerHandle !== null) {
        clearTimeout(timerHandle);
      }
      unsubscribe?.();
    };
  }, []);

  const logout = async () => {
    try {
      const [{ signOut }, { auth }] = await Promise.all([
        import('firebase/auth'),
        import('../../lib/firebase'),
      ]);
      await signOut(auth);
      await syncSessionCookie(null);
      window.location.href = '/';
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
    }
  };

  return {
    user,
    email: user?.email || null,
    displayName: user?.displayName || null,
    loading,
    isAuthenticated: !!user,
    isAdminClaim,
    logout,
  };
}
