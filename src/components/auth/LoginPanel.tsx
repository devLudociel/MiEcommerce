import { useEffect, useState } from 'react';
import { GoogleAuthProvider, signInWithPopup, onAuthStateChanged, signOut } from 'firebase/auth';
import { auth } from '../../lib/firebase';

export default function LoginPanel() {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (user) setUserEmail(user.email || null);
      else setUserEmail(null);
    });
    return () => unsub();
  }, []);

  async function signInWithGoogle(selectAccount = false) {
    try {
      setError(null);
      setLoading(true);
      const provider = new GoogleAuthProvider();
      if (selectAccount) provider.setCustomParameters({ prompt: 'select_account' });
      await signInWithPopup(auth, provider);
      await redirectAfterLogin();
    } catch (err: any) {
      setError(err?.message || 'Error iniciando sesión');
    } finally {
      setLoading(false);
    }
  }

  async function redirectAfterLogin() {
    const adminEmails = (import.meta.env.PUBLIC_ADMIN_EMAILS || '')
      .split(',')
      .map((s: string) => s.trim().toLowerCase())
      .filter(Boolean);

    const u = auth.currentUser;
    if (!u || typeof window === 'undefined') return;
    const email = (u.email || '').toLowerCase();
    const allowedByEmail = !!email && adminEmails.includes(email);
    const url = new URL(window.location.href);
    const desired = url.searchParams.get('redirect') || '/admin/products';
    // Si NO es admin, redirige al panel de cuenta
    const target = allowedByEmail ? desired : '/account';
    console.log('[LoginPanel] redirectAfterLogin', {
      email,
      allowedByEmail,
      desired,
      target,
    });
    window.location.replace(target);
  }

  async function changeAccount() {
    try {
      setError(null);
      setLoading(true);
      await signOut(auth);
      await signInWithGoogle(true);
    } catch (err: any) {
      setError(err?.message || 'No se pudo cambiar de cuenta');
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="py-20" style={{ background: 'white' }}>
      <div className="container" style={{ maxWidth: 480 }}>
        <div className="card" style={{ padding: 24 }}>
          <h1 className="text-3xl font-bold text-gray-800 mb-4">Iniciar sesión</h1>
          <p className="text-gray-600 mb-6">Accede al panel de administración</p>

          {error && (
            <div className="error-box mb-4">
              <strong>Error:</strong> {error}
            </div>
          )}

          {userEmail ? (
            <div>
              <p className="text-gray-700 mb-4">
                Sesión actual: <strong>{userEmail}</strong>
              </p>
              <div className="flex" style={{ gap: 12 }}>
                <button className="btn btn-primary" onClick={redirectAfterLogin} disabled={loading}>
                  Continuar
                </button>
                <button className="btn btn-ghost" onClick={changeAccount} disabled={loading}>
                  Cambiar de cuenta
                </button>
              </div>
            </div>
          ) : (
            <button
              className="btn btn-primary"
              onClick={() => signInWithGoogle(true)}
              disabled={loading}
            >
              {loading ? 'Conectando...' : 'Continuar con Google'}
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
