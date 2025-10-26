import { useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../../lib/firebase';
import { useWishlist } from '../../store/wishlistStore';
import { ensureUserDoc, saveWishlist } from '../../lib/userProfile';

export default function WishlistPanel() {
  const wishlist = useWishlist();
  const [uid, setUid] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (!u || !u.email) {
        setUid(null);
        return;
      }
      setUid(u.uid);
      await ensureUserDoc(u.uid, u.email, u.displayName ?? undefined);
    });
    return () => unsub();
  }, []);

  async function syncToCloud() {
    if (!uid) return;
    setSaving(true);
    try {
      await saveWishlist(
        uid,
        wishlist.items.map((i) => ({
          id: String(i.id),
          name: i.name,
          price: i.price,
          image: i.image,
        }))
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-8 lg:mt-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-3xl font-bold text-gradient-primary">Mis Favoritos</h2>
          <p className="text-gray-600 mt-2">{wishlist.items.length} productos guardados</p>
        </div>
        <button
          disabled={!uid || saving}
          onClick={syncToCloud}
          className="btn btn-primary disabled:opacity-60"
        >
          {saving ? 'Sincronizando…' : 'Guardar en mi cuenta'}
        </button>
      </div>

      {wishlist.items.length === 0 ? (
        <div className="card p-8 text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-8 h-8 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
              />
            </svg>
          </div>
          <p className="text-gray-600 mb-4">No tienes productos en favoritos.</p>
          <a href="/" className="btn btn-primary inline-block">
            Explorar productos
          </a>
        </div>
      ) : (
        <div className="space-y-4">
          {wishlist.items.map((p) => (
            <div key={String(p.id)} className="card p-6">
              <div className="flex items-center gap-4">
                {p.image ? (
                  <img
                    src={p.image}
                    alt={p.name}
                    className="w-20 h-20 rounded-lg object-cover flex-shrink-0"
                  />
                ) : (
                  <div className="w-20 h-20 bg-gray-100 rounded-lg flex-shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-lg text-gray-900 truncate mb-1">{p.name}</h3>
                  {typeof p.price === 'number' && (
                    <p className="text-lg font-bold text-cyan-600">${p.price.toFixed(2)}</p>
                  )}
                </div>
                <div className="flex gap-2">
                  <a href="#" className="btn btn-primary btn-sm">
                    Ver
                  </a>
                  <button
                    onClick={() => wishlist.remove(p.id)}
                    className="btn btn-ghost btn-sm text-red-500"
                  >
                    Eliminar
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
