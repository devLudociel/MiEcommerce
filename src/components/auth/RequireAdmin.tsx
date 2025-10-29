import { useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../../lib/firebase';

interface Props {
  children: React.ReactNode;
  redirectTo?: string; // dónde enviar si no es admin
}

/**
 * Componente de protección para rutas de administrador
 *
 * SEGURIDAD:
 * - Verifica primero custom claims (admin: true) del token de Firebase
 * - Fallback a verificación por email si no hay claims configurados
 * - Consistente con verificación de backend
 *
 * IMPORTANTE:
 * - Los custom claims se actualizan cuando el usuario cierra sesión y vuelve a entrar
 * - Para asignar claims, usar /api/admin/set-admin-claims
 */
export default function RequireAdmin({ children, redirectTo = '/account' }: Props) {
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  const adminEmails = (import.meta.env.PUBLIC_ADMIN_EMAILS || '')
    .split(',')
    .map((s: string) => s.trim().toLowerCase())
    .filter(Boolean);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      setLoading(true);

      // Si no hay usuario, redirigir a login
      if (!user) {
        if (typeof window !== 'undefined') {
          const params = new URLSearchParams();
          params.set('redirect', window.location.pathname + window.location.search);
          window.location.href = `/login?${params.toString()}`;
        }
        return;
      }

      try {
        // MÉTODO 1 (RECOMENDADO): Verificar custom claims en el token
        const tokenResult = await user.getIdTokenResult();

        // Si tiene el claim admin: true, permitir acceso
        if (tokenResult.claims.admin === true) {
          console.log('[RequireAdmin] Acceso permitido por custom claim');
          setAllowed(true);
          setLoading(false);
          return;
        }

        // MÉTODO 2 (FALLBACK): Verificar por email en lista de admins
        // Esto es útil mientras se migra al sistema de claims o como backup
        const email = (user.email || '').toLowerCase();
        const allowedByEmail = !!email && adminEmails.includes(email);

        if (allowedByEmail) {
          console.log('[RequireAdmin] Acceso permitido por email (considera asignar custom claims)');
          setAllowed(true);
          setLoading(false);
          return;
        }

        // Si no cumple ninguna condición, denegar acceso
        console.warn('[RequireAdmin] Acceso denegado:', {
          email,
          hasAdminClaim: tokenResult.claims.admin === true,
          isInAdminEmails: allowedByEmail,
        });

        if (typeof window !== 'undefined') {
          // Mostrar mensaje antes de redirigir
          alert('No tienes permisos de administrador. Serás redirigido.');
          window.location.replace(redirectTo);
        }
      } catch (e) {
        console.error('[RequireAdmin] Error validando permisos:', e);

        // En caso de error, denegar acceso por seguridad
        if (typeof window !== 'undefined') {
          window.location.replace(redirectTo);
        }
      } finally {
        setLoading(false);
      }
    });

    return () => unsub();
  }, [redirectTo]);

  // Mostrar loading mientras se verifica
  if (loading || allowed === null) {
    return (
      <section className="py-20" style={{ background: 'white' }}>
        <div className="container">
          <div className="text-center py-12">
            <div className="loading-spinner"></div>
            <p className="mt-4 text-gray-600">Verificando permisos de administrador...</p>
          </div>
        </div>
      </section>
    );
  }

  // Solo renderizar children si está permitido
  return allowed ? <>{children}</> : null;
}
