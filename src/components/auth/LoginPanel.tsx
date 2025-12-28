import { logger } from '../../lib/logger';
import { useEffect, useState } from 'react';
import {
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  onAuthStateChanged,
  signOut,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
} from 'firebase/auth';
import { auth } from '../../lib/firebase';
import AccessibleModal from '../common/AccessibleModal';

type TabMode = 'login' | 'register';

// Type guard for Firebase Auth errors
interface FirebaseError {
  code?: string;
  message?: string;
}

function isFirebaseError(error: unknown): error is FirebaseError {
  return typeof error === 'object' && error !== null && ('code' in error || 'message' in error);
}

export default function LoginPanel() {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [tabMode, setTabMode] = useState<TabMode>(() => {
    // Check URL parameter for initial tab mode
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const mode = params.get('mode');
      if (mode === 'register') return 'register';
    }
    return 'login';
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [redirecting, setRedirecting] = useState(false);

  // Modal state
  const [modal, setModal] = useState<{
    isOpen: boolean;
    type: 'info' | 'warning' | 'error' | 'success';
    title: string;
    message: string;
  }>({
    isOpen: false,
    type: 'info',
    title: '',
    message: '',
  });

  const showModal = (
    type: 'info' | 'warning' | 'error' | 'success',
    title: string,
    message: string
  ) => {
    setModal({ isOpen: true, type, title, message });
  };

  const closeModal = () => {
    setModal({ ...modal, isOpen: false });
  };

  // Helper to detect mobile device
  const isMobileDevice = () => {
    if (typeof window === 'undefined') return false;
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent
    );
  };

  // Check for redirect result on mount (for mobile)
  useEffect(() => {
    const checkRedirectResult = async () => {
      try {
        // Check if we're expecting a redirect result
        const expectingRedirect = sessionStorage.getItem('auth_redirect_pending');

        if (expectingRedirect) {
          logger.info('[LoginPanel] 🔄 Expecting redirect result from Google...');
          setRedirecting(true); // Show loading immediately
        }

        setLoading(true);
        logger.info('[LoginPanel] Checking for redirect result...', {
          expectingRedirect: !!expectingRedirect,
          userAgent: navigator.userAgent,
          currentUrl: window.location.href,
        });

        const result = await getRedirectResult(auth);

        if (result?.user) {
          logger.info('[LoginPanel] ✅ Redirect result successful!', {
            email: result.user.email,
            uid: result.user.uid,
            providerId: result.providerId,
            operationType: result.operationType,
          });

          // Clear the redirect flag
          sessionStorage.removeItem('auth_redirect_pending');

          setRedirecting(true);

          // Wait a bit for auth state to settle
          await new Promise((resolve) => setTimeout(resolve, 500));

          // Get redirect URL
          const adminEmails = (import.meta.env.PUBLIC_ADMIN_EMAILS || '')
            .split(',')
            .map((s: string) => s.trim().toLowerCase())
            .filter(Boolean);

          const email = (result.user.email || '').toLowerCase();
          const isAdmin = adminEmails.includes(email);
          const targetUrl = isAdmin ? '/admin/products' : '/account';

          logger.info('[LoginPanel] Redirecting to:', targetUrl);
          window.location.href = targetUrl;
        } else {
          if (expectingRedirect) {
            logger.warn('[LoginPanel] ⚠️ Expected redirect result but got null', {
              authState: auth.currentUser ? 'user exists' : 'no user',
              currentUserEmail: auth.currentUser?.email,
            });

            // Clear the flag
            sessionStorage.removeItem('auth_redirect_pending');

            // Check if user is already authenticated
            if (auth.currentUser) {
              logger.info('[LoginPanel] User already authenticated, redirecting...');
              const adminEmails = (import.meta.env.PUBLIC_ADMIN_EMAILS || '')
                .split(',')
                .map((s: string) => s.trim().toLowerCase())
                .filter(Boolean);
              const email = (auth.currentUser.email || '').toLowerCase();
              const isAdmin = adminEmails.includes(email);
              const targetUrl = isAdmin ? '/admin/products' : '/account';
              window.location.href = targetUrl;
              return;
            }

            setError('No se pudo completar el inicio de sesión. Por favor intenta de nuevo.');
          } else {
            logger.info('[LoginPanel] No redirect result (normal page load)');
          }
        }
      } catch (error: unknown) {
        const firebaseError = error as {
          code?: string;
          message?: string;
          stack?: string;
          name?: string;
        };
        logger.error('[LoginPanel] ❌ Redirect result error', {
          code: firebaseError?.code,
          message: firebaseError?.message,
          stack: firebaseError?.stack,
          name: firebaseError?.name,
        });

        // Clear the redirect flag on error
        sessionStorage.removeItem('auth_redirect_pending');

        if (firebaseError?.code && !firebaseError.code.includes('auth/popup-closed-by-user')) {
          setError('Error al iniciar sesión con Google. Por favor intenta de nuevo.');
        }
      } finally {
        setLoading(false);
        setRedirecting(false);
      }
    };
    checkRedirectResult();
  }, []);

  // Debug env/context on mount
  useEffect(() => {
    try {
      const origin = typeof window !== 'undefined' ? window.location.origin : '';
      const isMobile = isMobileDevice();
      logger.info('[LoginPanel] env', {
        authDomain: import.meta.env?.PUBLIC_FIREBASE_AUTH_DOMAIN,
        projectId: import.meta.env?.PUBLIC_FIREBASE_PROJECT_ID,
        appUrl: import.meta.env?.PUBLIC_APP_URL,
        origin,
        isMobile,
      });
    } catch (e) {
      // Non-critical: debug logging only
      logger.debug('[LoginPanel] Could not log env info', e);
    }
  }, []);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      logger.info('[LoginPanel] onAuthStateChanged', {
        hasUser: !!user,
        email: user?.email || null,
        uid: user?.uid || null,
      });
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

      const isMobile = isMobileDevice();

      // Try popup first on all devices (works better with dev tunnels)
      try {
        logger.info('[LoginPanel] signInWithGoogle via popup: start', { isMobile });
        await signInWithPopup(auth, provider);
        logger.info('[LoginPanel] signInWithGoogle via popup: success');
        await redirectAfterLogin();
        return;
      } catch (e: unknown) {
        const firebaseErr = e as { code?: string; message?: string };
        const code = firebaseErr?.code || '';
        logger.warn('[LoginPanel] signInWithGoogle popup error', {
          code,
          message: firebaseErr?.message,
          isMobile,
        });

        // Only show popup-blocked error on desktop
        if (!isMobile) {
          if (
            code.includes('auth/popup-blocked') ||
            code.includes('auth/popup-closed-by-user') ||
            code.includes('auth/cancelled-popup-request')
          ) {
            setError(
              'La ventana de Google se bloqueó o se cerró. Permite pop-ups y vuelve a intentarlo.'
            );
            return;
          }
        }

        // On mobile, if popup fails, try redirect as fallback
        if (isMobile) {
          logger.info('[LoginPanel] Popup failed on mobile, trying redirect fallback...');
          // Set flag to indicate we're expecting a redirect result
          sessionStorage.setItem('auth_redirect_pending', 'true');
          await signInWithRedirect(auth, provider);
          // Redirect will happen, no need to await or call redirectAfterLogin here
          return;
        }

        // If not mobile and not a known popup error, rethrow
        throw e;
      }
    } catch (error: unknown) {
      logger.error('[LoginPanel] signInWithGoogle fatal error', error);
      setError(
        isFirebaseError(error)
          ? error.message || 'Error iniciando sesión con Google'
          : 'Error iniciando sesión con Google'
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleEmailPasswordSubmit() {
    try {
      setError(null);

      if (!email.trim()) {
        setError('Por favor ingresa tu email');
        return;
      }

      if (!password) {
        setError('Por favor ingresa tu contraseña');
        return;
      }

      if (tabMode === 'register') {
        if (password !== confirmPassword) {
          setError('Las contraseñas no coinciden');
          return;
        }
        // SECURITY FIX MED-005: Use centralized password validation
        // Requires 8+ chars, uppercase, lowercase, and number
        if (password.length < 8) {
          setError('La contraseña debe tener al menos 8 caracteres');
          return;
        }
        if (!/[A-Z]/.test(password)) {
          setError('La contraseña debe contener al menos una mayúscula');
          return;
        }
        if (!/[a-z]/.test(password)) {
          setError('La contraseña debe contener al menos una minúscula');
          return;
        }
        if (!/[0-9]/.test(password)) {
          setError('La contraseña debe contener al menos un número');
          return;
        }
      }

      setLoading(true);

      if (tabMode === 'register') {
        await createUserWithEmailAndPassword(auth, email.trim(), password);
        showModal(
          'success',
          '¡Cuenta creada!',
          'Tu cuenta ha sido creada exitosamente. Bienvenido a ImprimeArte!'
        );
      } else {
        await signInWithEmailAndPassword(auth, email.trim(), password);
      }

      await redirectAfterLogin();
    } catch (error: unknown) {
      const code = isFirebaseError(error) ? error.code || '' : '';
      let errorMessage = isFirebaseError(error)
        ? error.message || 'Error de autenticación'
        : 'Error de autenticación';

      if (code.includes('auth/email-already-in-use')) {
        errorMessage = 'Este email ya está registrado. Intenta iniciar sesión.';
      } else if (code.includes('auth/invalid-email')) {
        errorMessage = 'Email inválido';
      } else if (code.includes('auth/user-not-found')) {
        errorMessage = 'No existe una cuenta con ese email';
      } else if (code.includes('auth/wrong-password')) {
        errorMessage = 'Contraseña incorrecta';
      } else if (code.includes('auth/weak-password')) {
        errorMessage = 'La contraseña es demasiado débil';
      } else if (code.includes('auth/invalid-credential')) {
        errorMessage = 'Credenciales inválidas. Verifica tu email y contraseña.';
      }

      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }

  async function handleForgotPassword() {
    try {
      setError(null);

      if (!email.trim()) {
        setError('Ingresa tu email para recuperar la contraseña');
        return;
      }

      setLoading(true);
      const origin = typeof window !== 'undefined' ? window.location.origin : '';
      const appUrl = import.meta.env?.PUBLIC_APP_URL as string | undefined;
      const actionCodeSettings = {
        url: `${appUrl || origin}/login`,
        handleCodeInApp: false,
      } as const;

      await sendPasswordResetEmail(auth, email.trim(), actionCodeSettings);
      showModal(
        'success',
        'Email enviado',
        'Te enviamos un email para restablecer tu contraseña. Revisa tu bandeja de entrada.'
      );
    } catch (error: unknown) {
      const code = isFirebaseError(error) ? error.code || '' : '';
      let errorMessage = 'Error al enviar el email';

      if (code.includes('auth/invalid-email')) {
        errorMessage = 'Email inválido';
      } else if (code.includes('auth/user-not-found')) {
        errorMessage = 'No existe una cuenta con ese email';
      }

      setError(errorMessage);
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
    logger.info('[LoginPanel] redirectAfterLogin', {
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
    } catch (error: unknown) {
      setError(
        isFirebaseError(error)
          ? error.message || 'No se pudo cambiar de cuenta'
          : 'No se pudo cambiar de cuenta'
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <AccessibleModal
        isOpen={modal.isOpen}
        onClose={closeModal}
        title={modal.title}
        type={modal.type}
      >
        {modal.message}
      </AccessibleModal>

      <section className="min-h-screen py-20 bg-gradient-to-br from-pink-50 via-purple-50 to-blue-50 relative overflow-hidden">
        {/* Decorative background shapes */}
        <div className="absolute top-20 left-10 w-72 h-72 bg-purple-200 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob"></div>
        <div className="absolute top-40 right-10 w-72 h-72 bg-pink-200 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob animation-delay-2000"></div>
        <div className="absolute -bottom-8 left-1/2 w-72 h-72 bg-blue-200 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob animation-delay-4000"></div>

        {/* Redirecting overlay */}
        {redirecting && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl p-8 text-center max-w-sm mx-4">
              <div className="w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">¡Inicio de sesión exitoso!</h3>
              <p className="text-gray-600">Redirigiendo a tu cuenta...</p>
            </div>
          </div>
        )}

        <div className="container mx-auto px-4 relative z-10" style={{ maxWidth: 480 }}>
          <div className="bg-white rounded-3xl shadow-2xl p-8 backdrop-blur-sm bg-opacity-95">
            <div className="text-center mb-8">
              <div className="mb-4 flex justify-center">
                <img
                  src="/logoFac.png"
                  alt="ImprimeArte Logo"
                  className="w-24 h-24 object-contain animate-bounce-slow"
                />
              </div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 via-pink-600 to-blue-600 bg-clip-text text-transparent mb-2">
                ¡Bienvenido!
              </h1>
              <p className="text-gray-600">Accede a tu cuenta de ImprimeArte</p>
            </div>

            {error && (
              <div className="mb-6 p-4 bg-red-50 border-2 border-red-200 rounded-xl text-red-700 animate-shake">
                <div className="flex items-start gap-3">
                  <span className="text-2xl">⚠️</span>
                  <div>
                    <strong className="block mb-1">¡Oops!</strong>
                    <p className="text-sm">{error}</p>
                  </div>
                </div>
              </div>
            )}

            {userEmail ? (
              <div className="text-center">
                <div className="mb-6 p-6 bg-gradient-to-r from-green-50 to-emerald-50 rounded-2xl border-2 border-green-200">
                  <div className="text-4xl mb-3">✅</div>
                  <p className="text-gray-700 mb-2">Sesión iniciada como:</p>
                  <p className="font-bold text-lg text-gray-900">{userEmail}</p>
                </div>
                <div className="flex flex-col gap-3">
                  <button
                    data-testid="login-continue"
                    className="w-full py-4 px-6 bg-gradient-to-r from-purple-500 via-pink-500 to-blue-500 text-white rounded-xl font-bold text-lg shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200"
                    onClick={redirectAfterLogin}
                    disabled={loading}
                  >
                    Continuar →
                  </button>
                  <button
                    data-testid="login-change-account"
                    className="w-full py-3 px-6 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transition-colors"
                    onClick={changeAccount}
                    disabled={loading}
                  >
                    Cambiar de cuenta
                  </button>
                </div>
              </div>
            ) : (
              <div>
                {/* Tabs */}
                <div className="flex gap-2 mb-6 bg-gray-100 p-1.5 rounded-xl">
                  <button
                    onClick={() => {
                      setTabMode('login');
                      setError(null);
                      setPassword('');
                      setConfirmPassword('');
                    }}
                    className={`flex-1 py-3 px-6 rounded-lg font-bold transition-all duration-200 ${
                      tabMode === 'login'
                        ? 'bg-white text-purple-600 shadow-md transform scale-105'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    🔑 Iniciar Sesión
                  </button>
                  <button
                    onClick={() => {
                      setTabMode('register');
                      setError(null);
                      setPassword('');
                      setConfirmPassword('');
                    }}
                    className={`flex-1 py-3 px-6 rounded-lg font-bold transition-all duration-200 ${
                      tabMode === 'register'
                        ? 'bg-white text-pink-600 shadow-md transform scale-105'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    ✨ Crear Cuenta
                  </button>
                </div>

                {/* Google Sign In */}
                <button
                  data-testid="login-google"
                  className="w-full mb-6 py-4 px-6 bg-white border-2 border-gray-300 text-gray-700 rounded-xl font-semibold hover:border-purple-400 hover:shadow-lg transition-all duration-200 flex items-center justify-center gap-3 group"
                  onClick={() => signInWithGoogle(true)}
                  disabled={loading}
                >
                  <svg className="w-6 h-6" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                  </svg>
                  <span className="group-hover:scale-105 transition-transform">
                    {loading ? 'Conectando...' : 'Continuar con Google'}
                  </span>
                </button>

                <div className="relative mb-6">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t-2 border-gray-200"></div>
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-4 bg-white text-gray-500 font-medium">o usa tu email</span>
                  </div>
                </div>

                {/* Email/Password Form */}
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleEmailPasswordSubmit();
                  }}
                  className="space-y-4"
                >
                  <div>
                    <label
                      htmlFor="email"
                      className="block text-sm font-semibold text-gray-700 mb-2"
                    >
                      📧 Email
                    </label>
                    <input
                      id="email"
                      data-testid="login-email"
                      type="email"
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-purple-400 focus:ring-4 focus:ring-purple-100 transition-all outline-none"
                      placeholder="tu@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      autoComplete="email"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="password"
                      className="block text-sm font-semibold text-gray-700 mb-2"
                    >
                      🔒 Contraseña
                    </label>
                    <div className="relative">
                      <input
                        id="password"
                        data-testid="login-password"
                        type={showPassword ? 'text' : 'password'}
                        className="w-full px-4 py-3 pr-12 border-2 border-gray-200 rounded-xl focus:border-purple-400 focus:ring-4 focus:ring-purple-100 transition-all outline-none"
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        autoComplete={tabMode === 'register' ? 'new-password' : 'current-password'}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-2xl hover:scale-110 transition-transform"
                        aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                      >
                        {showPassword ? '🙈' : '👁️'}
                      </button>
                    </div>
                  </div>

                  {tabMode === 'register' && (
                    <div>
                      <label
                        htmlFor="confirmPassword"
                        className="block text-sm font-semibold text-gray-700 mb-2"
                      >
                        🔒 Confirmar Contraseña
                      </label>
                      <div className="relative">
                        <input
                          id="confirmPassword"
                          data-testid="login-confirm-password"
                          type={showConfirmPassword ? 'text' : 'password'}
                          className="w-full px-4 py-3 pr-12 border-2 border-gray-200 rounded-xl focus:border-pink-400 focus:ring-4 focus:ring-pink-100 transition-all outline-none"
                          placeholder="••••••••"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          autoComplete="new-password"
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-2xl hover:scale-110 transition-transform"
                          aria-label={
                            showConfirmPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'
                          }
                        >
                          {showConfirmPassword ? '🙈' : '👁️'}
                        </button>
                      </div>
                    </div>
                  )}

                  <button
                    type="submit"
                    data-testid="login-submit"
                    disabled={loading}
                    className={`w-full py-4 px-6 rounded-xl font-bold text-lg text-white shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 ${
                      loading
                        ? 'bg-gray-400 cursor-not-allowed'
                        : tabMode === 'login'
                          ? 'bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600'
                          : 'bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600'
                    }`}
                  >
                    {loading ? (
                      <span className="flex items-center justify-center gap-2">
                        <span className="inline-block w-5 h-5 border-3 border-white border-t-transparent rounded-full animate-spin"></span>
                        {tabMode === 'register' ? 'Creando cuenta...' : 'Iniciando sesión...'}
                      </span>
                    ) : (
                      <span>
                        {tabMode === 'register' ? '✨ Crear mi cuenta' : '🚀 Iniciar sesión'}
                      </span>
                    )}
                  </button>

                  {tabMode === 'login' && (
                    <button
                      type="button"
                      data-testid="login-forgot-password"
                      className="w-full text-center text-sm text-purple-600 hover:text-purple-700 font-semibold hover:underline transition-colors"
                      onClick={handleForgotPassword}
                      disabled={loading}
                    >
                      ¿Olvidaste tu contraseña?
                    </button>
                  )}
                </form>
              </div>
            )}
          </div>

          {/* Info message */}
          <div className="mt-6 text-center text-sm text-gray-600 bg-white bg-opacity-70 rounded-2xl p-4 backdrop-blur-sm">
            <p className="flex items-center justify-center gap-2">
              <img src="/logoFac.png" alt="ImprimeArte" className="w-5 h-5 object-contain" />
              <span>
                {tabMode === 'register'
                  ? 'Al crear una cuenta, aceptas nuestros términos de servicio'
                  : '¿Primera vez aquí? Crea una cuenta gratis'}
              </span>
            </p>
          </div>
        </div>
      </section>

      <style>
        {`
          @keyframes blob {
            0%, 100% {
              transform: translate(0px, 0px) scale(1);
            }
            33% {
              transform: translate(30px, -50px) scale(1.1);
            }
            66% {
              transform: translate(-20px, 20px) scale(0.9);
            }
          }

          .animate-blob {
            animation: blob 7s infinite;
          }

          .animation-delay-2000 {
            animation-delay: 2s;
          }

          .animation-delay-4000 {
            animation-delay: 4s;
          }

          @keyframes bounce-slow {
            0%, 100% {
              transform: translateY(0);
            }
            50% {
              transform: translateY(-10px);
            }
          }

          .animate-bounce-slow {
            animation: bounce-slow 2s ease-in-out infinite;
          }

          @keyframes shake {
            0%, 100% { transform: translateX(0); }
            10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); }
            20%, 40%, 60%, 80% { transform: translateX(5px); }
          }

          .animate-shake {
            animation: shake 0.5s ease-in-out;
          }
        `}
      </style>
    </>
  );
}
