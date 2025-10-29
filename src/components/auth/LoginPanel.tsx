import { useEffect, useState } from 'react';
import {
  GoogleAuthProvider,
  GithubAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  onAuthStateChanged,
  signOut,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  sendSignInLinkToEmail,
  isSignInWithEmailLink,
  signInWithEmailLink,
} from 'firebase/auth';
import { auth } from '../../lib/firebase';

export default function LoginPanel() {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState<'login' | 'register' | 'magic'>('login');

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
      try {
        await signInWithPopup(auth, provider);
      } catch (e: any) {
        const code = e?.code || '';
        if (
          code.includes('auth/popup-blocked') ||
          code.includes('auth/popup-closed-by-user') ||
          code.includes('auth/cancelled-popup-request')
        ) {
          await signInWithRedirect(auth, provider);
          return;
        }
        throw e;
      }
      await redirectAfterLogin();
    } catch (err: any) {
      setError(err?.message || 'Error iniciando sesión');
    } finally {
      setLoading(false);
    }
  }

  async function signInWithGithub() {
    try {
      setError(null);
      setLoading(true);
      const provider = new GithubAuthProvider();
      try {
        await signInWithPopup(auth, provider);
      } catch (e: any) {
        const code = e?.code || '';
        const isProd = (import.meta as any).env.PROD === true;
        if (
          isProd && (
            code.includes('auth/popup-blocked') ||
            code.includes('auth/popup-closed-by-user') ||
            code.includes('auth/cancelled-popup-request')
          )
        ) {
          await signInWithRedirect(auth, provider);
          return;
        }
        throw e;
      }
      await redirectAfterLogin();
    } catch (err: any) {
      setError(err?.message || 'Error iniciando sesión con GitHub');
    } finally {
      setLoading(false);
    }
  }

  async function handleEmailPasswordLogin() {
    try {
      setError(null);
      setLoading(true);
      if (mode === 'register') {
        await createUserWithEmailAndPassword(auth, email.trim(), password);
      } else {
        await signInWithEmailAndPassword(auth, email.trim(), password);
      }
      await redirectAfterLogin();
    } catch (err: any) {
      setError(err?.message || 'Error de autenticación');
    } finally {
      setLoading(false);
    }
  }

  function mapAuthError(e: any): string {
    const code = e?.code || '';
    if (code.includes('auth/invalid-email')) return 'Email inválido.';
    if (code.includes('auth/missing-email')) return 'Ingresa tu email.';
    if (code.includes('auth/user-not-found')) return 'No existe una cuenta con ese email.';
    if (code.includes('auth/invalid-continue-uri')) return 'Configuración de URL de retorno inválida.';
    if (code.includes('auth/unauthorized-continue-uri')) return 'El dominio de retorno no está autorizado en Firebase.';
    return e?.message || 'Ocurrió un error al procesar la solicitud.';
  }

  async function handleForgotPassword() {
    try {
      setError(null);
      setLoading(true);
      const origin = typeof window !== 'undefined' ? window.location.origin : '';
      const actionCodeSettings = {
        url: `${(import.meta as any).env.PUBLIC_APP_URL || origin}/login`,
        handleCodeInApp: false,
      } as const;
      const target = email.trim();
      if (!target) throw { code: 'auth/missing-email' };
      await sendPasswordResetEmail(auth, target, actionCodeSettings);
      alert('Te enviamos un email para restablecer tu contraseña. Revisa tu bandeja.');
    } catch (err: any) {
      setError(mapAuthError(err));
    } finally {
      setLoading(false);
    }
  }

  async function handleMagicLink() {
    try {
      setError(null);
      setLoading(true);
      const origin = typeof window !== 'undefined' ? window.location.origin : '';
      const actionCodeSettings = {
        url: `${(import.meta as any).env.PUBLIC_APP_URL || origin}/login`,
        handleCodeInApp: true,
      } as const;
      const target = email.trim();
      if (!target) throw new Error('Ingresa tu email');
      window.localStorage.setItem('emailForSignIn', target);
      await sendSignInLinkToEmail(auth, target, actionCodeSettings);
      alert('Te enviamos un enlace de acceso. Revisa tu bandeja.');
    } catch (err: any) {
      setError(err?.message || 'No se pudo enviar el enlace');
    } finally {
      setLoading(false);
    }
  }

  // Completar sign-in por enlace mágico si llega con el link
  useEffect(() => {
    try {
      if (typeof window === 'undefined') return;
      if (isSignInWithEmailLink(auth, window.location.href)) {
        let stored = window.localStorage.getItem('emailForSignIn') || '';
        if (!stored) {
          stored = window.prompt('Confirma tu email para iniciar sesión') || '';
        }
        if (stored) {
          signInWithEmailLink(auth, stored, window.location.href)
            .then(async () => {
              window.localStorage.removeItem('emailForSignIn');
              await redirectAfterLogin();
            })
            .catch((e) => setError(e?.message || 'Error con el enlace'));
        }
      }
    } catch {}
  }, []);

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
            <div className="space-y-4">
              <div className="grid gap-3">
                <button className="btn btn-primary" onClick={() => signInWithGoogle(true)} disabled={loading}>
                  {loading ? 'Conectando...' : 'Continuar con Google'}
                </button>
                <button className="btn btn-ghost" onClick={signInWithGithub} disabled={loading}>
                  {loading ? 'Conectando...' : 'Continuar con GitHub'}
                </button>
              </div>

              <div className="text-center text-gray-500">o</div>

              <div className="space-y-3">
                <div className="grid gap-2">
                  <input
                    type="email"
                    className="input"
                    placeholder="tu@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                  {mode !== 'magic' && (
                    <input
                      type="password"
                      className="input"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                  )}
                </div>

                {mode === 'magic' ? (
                  <div className="grid gap-2">
                    <button className="btn btn-primary" onClick={handleMagicLink} disabled={loading}>
                      Enviar enlace de acceso
                    </button>
                    <button className="btn btn-ghost" onClick={() => setMode('login')} disabled={loading}>
                      Usar contraseña
                    </button>
                  </div>
                ) : (
                  <div className="grid gap-2">
                    <button className="btn btn-primary" onClick={handleEmailPasswordLogin} disabled={loading}>
                      {mode === 'register' ? 'Crear cuenta' : 'Iniciar sesión'}
                    </button>
                    <div className="flex justify-between text-sm">
                      <button className="link" onClick={() => setMode(mode === 'register' ? 'login' : 'register')}>
                        {mode === 'register' ? 'Ya tengo cuenta' : 'Crear una cuenta'}
                      </button>
                      <button className="link" onClick={() => setMode('magic')}>
                        Acceder con enlace
                      </button>
                    </div>
                    <button className="btn btn-ghost" onClick={handleForgotPassword} disabled={loading}>
                      Olvidé mi contraseña
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
