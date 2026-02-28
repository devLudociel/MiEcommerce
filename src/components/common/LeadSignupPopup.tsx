import { useEffect, useState } from 'react';
import { useAuth } from '../hooks/useAuth';

const HOME_PATH = '/';

export default function LeadSignupPopup() {
  const { user, loading } = useAuth();
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (loading) return;
    if (user) return;

    const path = window.location.pathname || '/';
    if (path !== HOME_PATH) return;

    setIsOpen(true);
  }, [loading, user]);

  const handleClose = () => setIsOpen(false);

  const handleRegister = () => {
    if (typeof window !== 'undefined') {
      window.location.href = '/login?mode=register';
    }
  };

  const handleLogin = () => {
    if (typeof window !== 'undefined') {
      window.location.href = '/login';
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-50 bg-black/60"
        onClick={handleClose}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            handleClose();
          }
        }}
        role="button"
        tabIndex={0}
        aria-label="Cerrar promocion"
      />

      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="relative w-full max-w-lg overflow-hidden rounded-3xl bg-white shadow-2xl">
          <div className="bg-gradient-to-br from-fuchsia-500 via-pink-500 to-amber-400 px-6 py-5 text-white">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <img
                  src="/logoFac.png"
                  alt="ImprimeArte"
                  className="h-10 w-10 rounded-xl bg-white/20 object-contain p-1"
                />
                <span className="text-lg font-black tracking-tight">ImprimeArte</span>
              </div>
              <button
                onClick={handleClose}
                className="rounded-full bg-white/20 px-3 py-1 text-sm font-semibold hover:bg-white/30"
                aria-label="Cerrar"
              >
                X
              </button>
            </div>
            <h2 className="mt-4 text-3xl font-black leading-tight">Te regalamos 5 EUR</h2>
            <p className="mt-2 text-sm text-white/90">
              Registrate hoy y recibe saldo para tus compras personalizadas.
            </p>
          </div>

          <div className="px-6 py-5">
            <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-700">
              <div className="font-semibold text-gray-900">Como funciona</div>
              <ul className="mt-2 list-disc pl-5">
                <li>Bono de bienvenida de 5 EUR en tu monedero.</li>
                <li>Usalo en compras de 50 EUR o mas.</li>
                <li>Unico por usuario y correo.</li>
              </ul>
            </div>

            <div className="mt-5 grid gap-3">
              <button
                onClick={handleRegister}
                className="w-full rounded-xl bg-cyan-600 px-4 py-3 text-base font-semibold text-white transition-colors hover:bg-cyan-700"
              >
                Crear cuenta y recibir bono
              </button>
              <button
                onClick={handleLogin}
                className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-base font-semibold text-gray-700 transition-colors hover:bg-gray-50"
              >
                Ya tengo cuenta
              </button>
              <button
                onClick={handleClose}
                className="w-full rounded-xl px-4 py-2 text-sm font-medium text-gray-400 hover:text-gray-600"
              >
                Ver mas tarde
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
