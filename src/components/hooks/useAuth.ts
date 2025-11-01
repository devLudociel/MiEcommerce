// hooks/useAuth.ts
import { useEffect, useState } from 'react';
import { onAuthStateChanged, signOut, getIdTokenResult } from 'firebase/auth';
import { auth } from '../../lib/firebase';
import { syncCartWithUser } from '../../store/cartStore';

export function useAuth() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isAdminClaim, setIsAdminClaim] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      setLoading(false);
      try {
        if (currentUser) {
          const token = await getIdTokenResult(currentUser, true);
          setIsAdminClaim(!!(token.claims as any)?.admin);

          // Sync cart with authenticated user
          await syncCartWithUser(currentUser.uid);
        } else {
          setIsAdminClaim(false);

          // Clear cart when user logs out
          await syncCartWithUser(null);
        }
      } catch {
        setIsAdminClaim(false);
        // Still sync cart even if token check fails
        if (currentUser) {
          await syncCartWithUser(currentUser.uid);
        } else {
          await syncCartWithUser(null);
        }
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
