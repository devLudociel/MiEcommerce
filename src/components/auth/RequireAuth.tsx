import { useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import type { User } from 'firebase/auth';
import { auth } from '../../lib/firebase';

interface Props {
  children: React.ReactNode;
  redirectTo?: string;
}

export default function RequireAuth({ children, redirectTo = '/login' }: Props) {
  const [user, setUser] = useState<User | null | undefined>(undefined);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => setUser(u));
    return () => unsub();
  }, []);

  if (user === undefined) {
    return (
      <section className="py-20" style={{ background: 'white' }}>
        <div className="container">
          <div className="text-center py-12">
            <div className="loading-spinner"></div>
            <p className="mt-4 text-gray-600">Comprobando sesión...</p>
          </div>
        </div>
      </section>
    );
  }

  if (!user) {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams();
      params.set('redirect', window.location.pathname + window.location.search);
      window.location.href = `${redirectTo}?${params.toString()}`;
    }
    return null;
  }

  return <>{children}</>;
}
