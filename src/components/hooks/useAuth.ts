// hooks/useAuth.ts
import { useEffect, useState } from 'react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import type { User } from 'firebase/auth';
import { auth } from '../../lib/firebase';
import { resolveAdminAccess } from '../../lib/auth/adminAccessClient';
import { syncCartWithUser } from '../../store/cartStore';
import { syncWishlistWithUser } from '../../store/wishlistStore';

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

    const subscribe = () => {
      if (cancelled) return;
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

    // Defer auth subscription past LCP — avoids Firebase Auth iframe blocking the critical path.
    let idleHandle: number | null = null;
    let timerHandle: number | null = null;
    if (typeof window !== 'undefined' && typeof window.requestIdleCallback === 'function') {
      idleHandle = window.requestIdleCallback(subscribe, { timeout: 2500 });
    } else {
      timerHandle = window.setTimeout(subscribe, 1200);
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
