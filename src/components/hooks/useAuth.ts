// hooks/useAuth.ts
import { useEffect, useState } from 'react';
import { onAuthStateChanged, signOut, getIdTokenResult } from 'firebase/auth';
import type { User } from 'firebase/auth';
import { auth } from '../../lib/firebase';
import { syncCartWithUser } from '../../store/cartStore';
import { syncWishlistWithUser } from '../../store/wishlistStore';

const AUTH_COOKIE_NAME = 'auth_token';

function setAuthCookie(token: string | null): void {
  if (typeof document === 'undefined') return;
  if (!token) {
    document.cookie = `${AUTH_COOKIE_NAME}=; Max-Age=0; Path=/; SameSite=Lax`;
    return;
  }
  const encoded = encodeURIComponent(token);
  document.cookie = `${AUTH_COOKIE_NAME}=${encoded}; Max-Age=3600; Path=/; SameSite=Lax`;
}

// TYPES: Firebase token claims structure
interface FirebaseTokenClaims {
  admin?: boolean;
  [key: string]: unknown;
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdminClaim, setIsAdminClaim] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setLoading(true);
      setUser(currentUser);
      try {
        if (currentUser) {
          const tokenResult = await getIdTokenResult(currentUser, true);
          const claims = tokenResult.claims as FirebaseTokenClaims;
          setIsAdminClaim(!!claims.admin);
          setAuthCookie(tokenResult.token);

          // Sync cart and wishlist with authenticated user
          await Promise.all([
            syncCartWithUser(currentUser.uid),
            syncWishlistWithUser(currentUser.uid),
          ]);
        } else {
          setIsAdminClaim(false);
          setAuthCookie(null);

          // Clear cart and wishlist when user logs out
          await Promise.all([syncCartWithUser(null), syncWishlistWithUser(null)]);
        }
      } catch {
        setIsAdminClaim(false);
        setAuthCookie(null);
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
      setAuthCookie(null);
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
