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

  if (!loaded) return <div className="card p-6">Cargando…</div>;
  if (!uid) return <div className="card p-6">Inicia sesión para editar tu perfil.</div>;

  return (
    <form onSubmit={save} className="space-y-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gradient-primary">Perfil de la cuenta</h1>
        <p className="text-gray-600 mt-2">Actualiza tu información personal</p>
      </div>

      <div className="card card-cyan p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Información personal</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="form-label">Nombre</label>
            <input 
              className="input" 
              value={profile.firstName || ''} 
              onChange={e => setProfile({ ...profile, firstName: e.target.value })} 
              placeholder="Tu nombre"
            />
          </div>
          <div>
            <label className="form-label">Apellidos</label>
            <input 
              className="input" 
              value={profile.lastName || ''} 
              onChange={e => setProfile({ ...profile, lastName: e.target.value })} 
              placeholder="Tus apellidos"
            />
          </div>
        </div>
      </div>

      <div className="card card-magenta p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Información de contacto</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="form-label">Correo electrónico</label>
            <input 
              className="input" 
              value={email} 
              disabled 
            />
            <p className="text-xs text-gray-500 mt-1">El correo no se puede modificar</p>
          </div>
          <div>
            <label className="form-label">Teléfono</label>
            <input 
              className="input" 
              value={profile.phone || ''} 
              onChange={e => setProfile({ ...profile, phone: e.target.value })} 
              placeholder="+34 600 000 000"
            />
          </div>
        </div>
      </div>

      <div className="flex gap-3">
        <button 
          type="submit"
          disabled={saving} 
          className="btn btn-primary"
        >
          {saving ? 'Guardando…' : 'Guardar cambios'}
        </button>
        <button 
          type="button"
          className="btn btn-ghost"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}