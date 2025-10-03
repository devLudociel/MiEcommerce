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
      if (!u || !u.email) { setUid(null); return; }
      setUid(u.uid);
      await ensureUserDoc(u.uid, u.email, u.displayName ?? undefined);
    });
    return () => unsub();
  }, []);

  async function syncToCloud() {
    if (!uid) return;
    setSaving(true);
    try { await saveWishlist(uid, wishlist.items.map(i => ({ id: String(i.id), name: i.name, price: i.price, image: i.image })) ); }
    finally { setSaving(false); }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Mis Favoritos</h2>
        <button disabled={!uid || saving} onClick={syncToCloud} className="px-4 py-2 bg-gradient-primary text-white rounded-lg disabled:opacity-60">
          {saving ? 'Sincronizando…' : 'Guardar en mi cuenta'}
        </button>
      </div>
      {wishlist.items.length === 0 ? (
        <div className="p-6 bg-white rounded-xl border text-gray-600">No tienes productos en favoritos.</div>
      ) : (
        <div className="grid gap-3">
          {wishlist.items.map((p) => (
            <div key={String(p.id)} className="p-4 bg-white rounded-xl border flex items-center gap-3">
              {p.image ? (<img src={p.image} alt={p.name} className="w-12 h-12 rounded-lg object-cover" />) : (<div className="w-12 h-12 bg-gray-100 rounded-lg" />)}
              <div className="flex-1 min-w-0">
                <div className="font-medium truncate">{p.name}</div>
                {typeof p.price === 'number' && <div className="text-sm text-cyan-600 font-bold">${p.price.toFixed(2)}</div>}
              </div>
              <a href="#" className="px-3 py-2 border rounded-lg">Ver</a>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

