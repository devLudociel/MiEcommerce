import { useEffect, useState } from 'react';
import { onAuthStateChanged, getIdTokenResult } from 'firebase/auth';
import { auth } from '../../lib/firebase';

interface Props {
  children: React.ReactNode;
  redirectTo?: string; // dónde enviar si no es admin
}

/**
 * SECURITY FIX: Removed PUBLIC_ADMIN_EMAILS exposure to client-side code.
 * Admin verification now relies ONLY on Firebase custom claims (token.claims.admin).
 * This prevents exposing admin email addresses to potential attackers.
 *
 * To grant admin access, use the /api/admin/set-admin-claims endpoint with ADMIN_SETUP_SECRET.
 */
export default function RequireAdmin({ children, redirectTo = '/account' }: Props) {
  const [allowed, setAllowed] = useState<boolean | null>(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        if (typeof window !== 'undefined') {
          const params = new URLSearchParams();
          params.set('redirect', window.location.pathname + window.location.search);
          window.location.href = `/login?${params.toString()}`;
        }
        return;
      }
      try {
        // SECURITY: Only check Firebase custom claims for admin access
        // Do NOT use email-based checks on the client side
        let allowedByClaim = false;
        try {
          const token = await getIdTokenResult(user, true);
          allowedByClaim = !!token.claims?.admin;
          // Don't log claims in production for security
          if (import.meta.env.DEV) {
            console.log('[RequireAdmin] Admin claim:', !!token.claims?.admin);
          }
        } catch (e) {
          console.warn('[RequireAdmin] Could not get token claims:', e);
        }

        if (allowedByClaim) {
          setAllowed(true);
        } else {
          if (typeof window !== 'undefined') {
            console.warn('[RequireAdmin] Access denied - no admin claim');
            window.location.replace(redirectTo);
          }
        }
      } catch (e) {
        console.error('[RequireAdmin] Error validating permissions', e);
        if (typeof window !== 'undefined') {
          window.location.replace(redirectTo);
        }
      }
    });
    return () => unsub();
  }, [redirectTo]);

  if (allowed === null) {
    return (
      <section className="py-20" style={{ background: 'white' }}>
        <div className="container">
          <div className="text-center py-12">
            <div className="loading-spinner"></div>
            <p className="mt-4 text-gray-600">Verificando permisos...</p>
          </div>
        </div>
      </section>
    );
  }

  return allowed ? <>{children}</> : null;
}
