// hooks/useAuth.ts
import { useEffect, useState } from 'react';
import { onAuthStateChanged, signOut, getIdTokenResult } from 'firebase/auth';
import { auth } from '../../lib/firebase';
import { syncCartWithUser } from '../../store/cartStore';
import { syncWishlistWithUser } from '../../store/wishlistStore';

export function useAuth() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isAdminClaim, setIsAdminClaim] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setLoading(true);
      setUser(currentUser);
      try {
        if (currentUser) {
          const token = await getIdTokenResult(currentUser, true);
          setIsAdminClaim(!!(token.claims as any)?.admin);

          // Sync cart and wishlist with authenticated user
          await Promise.all([
            syncCartWithUser(currentUser.uid),
            syncWishlistWithUser(currentUser.uid),
          ]);
        } else {
          setIsAdminClaim(false);

          // Clear cart and wishlist when user logs out
          await Promise.all([syncCartWithUser(null), syncWishlistWithUser(null)]);
        }
      } catch {
        setIsAdminClaim(false);
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
