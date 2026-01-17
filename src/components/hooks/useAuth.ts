// hooks/useAuth.ts
import { useEffect, useState } from 'react';
import { onAuthStateChanged, signOut, getIdTokenResult } from 'firebase/auth';
import type { User } from 'firebase/auth';
import { auth } from '../../lib/firebase';
import { syncCartWithUser } from '../../store/cartStore';
import { syncWishlistWithUser } from '../../store/wishlistStore';

// TYPES: Firebase token claims structure
interface FirebaseTokenClaims {
  admin?: boolean;
  [key: string]: unknown;
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdminClaim, setIsAdminClaim] = useState(false);

  const syncSessionCookie = async (token: string | null) => {
    if (typeof window === 'undefined') return;
    try {
      const endpoint = token ? '/api/auth/session' : '/api/auth/logout';
      const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};
      await fetch(endpoint, { method: 'POST', headers });
    } catch {
      // Non-blocking; session cookie is best-effort
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setLoading(true);
      setUser(currentUser);
      try {
        if (currentUser) {
          const tokenResult = await getIdTokenResult(currentUser, true);
          const claims = tokenResult.claims as FirebaseTokenClaims;
          setIsAdminClaim(!!claims.admin);
          await syncSessionCookie(tokenResult.token);

          // Sync cart and wishlist with authenticated user
          await Promise.all([
            syncCartWithUser(currentUser.uid),
            syncWishlistWithUser(currentUser.uid),
          ]);
        } else {
          setIsAdminClaim(false);
          await syncSessionCookie(null);

          // Clear cart and wishlist when user logs out
          await Promise.all([syncCartWithUser(null), syncWishlistWithUser(null)]);
        }
      } catch {
        setIsAdminClaim(false);
        await syncSessionCookie(null);
        // Still sync cart and wishlist even if token check fails
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

    return () => unsubscribe();
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
