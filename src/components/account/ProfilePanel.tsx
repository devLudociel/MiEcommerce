import { useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../../lib/firebase';
import type { UserProfile } from '../../lib/userProfile';
import { ensureUserDoc, getUserData, upsertProfile } from '../../lib/userProfile';

export default function ProfilePanel() {
  const [uid, setUid] = useState<string | null>(null);
  const [email, setEmail] = useState<string>('');
  const [profile, setProfile] = useState<UserProfile>({ firstName: '', lastName: '', phone: '' });
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (!u || !u.email) { setUid(null); setLoaded(true); return; }
      setUid(u.uid);
      setEmail(u.email);
      await ensureUserDoc(u.uid, u.email, u.displayName ?? undefined);
      const d = await getUserData(u.uid);
      setProfile({
        firstName: d?.profile?.firstName || (u.displayName?.split(' ')[0] ?? ''),
        lastName: d?.profile?.lastName || (u.displayName?.split(' ').slice(1).join(' ') ?? ''),
        phone: d?.profile?.phone || '',
      });
      setLoaded(true);
    });
    return () => unsub();
  }, []);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!uid) return;
    setSaving(true);
    try { await upsertProfile(uid, profile); }
    finally { setSaving(false); }
  }

  if (!loaded) return <div className="p-6 bg-white rounded-xl border">Cargando…</div>;
  if (!uid) return <div className="p-6 bg-white rounded-xl border">Inicia sesión para editar tu perfil.</div>;

  return (
    <form onSubmit={save} className="space-y-4">
      <h1 className="text-3xl font-black">Perfil de la cuenta</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">Nombre</label>
          <input className="input" value={profile.firstName || ''} onChange={e => setProfile({ ...profile, firstName: e.target.value })} />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Apellidos</label>
          <input className="input" value={profile.lastName || ''} onChange={e => setProfile({ ...profile, lastName: e.target.value })} />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Correo</label>
          <input className="input" value={email} disabled />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Teléfono</label>
          <input className="input" value={profile.phone || ''} onChange={e => setProfile({ ...profile, phone: e.target.value })} />
        </div>
      </div>
      <div className="flex gap-2">
        <button disabled={saving} className="px-4 py-2 bg-gradient-primary text-white rounded-lg">{saving ? 'Guardando…' : 'Guardar cambios'}</button>
      </div>
    </form>
  );
}

