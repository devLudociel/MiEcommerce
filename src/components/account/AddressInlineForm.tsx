import { useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../../lib/firebase';
import type { Address } from '../../lib/userProfile';
import { ensureUserDoc, getUserData, saveAddresses } from '../../lib/userProfile';

function empty(): Address {
  return {
    id: Math.random().toString(36).slice(2),
    label: '',
    fullName: '',
    phone: '',
    street: '',
    number: '',
    floor: '',
    apartment: '',
    locality: '',
    city: '',
    state: '',
    zip: '',
    country: 'España',
    isDefaultBilling: false,
    isDefaultShipping: false,
    line1: '',
    line2: '',
    notes: '',
  };
}

export default function AddressInlineForm() {
  const [uid, setUid] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [items, setItems] = useState<Address[]>([]);
  const [form, setForm] = useState<Address>(empty());

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (!u || !u.email) { setUid(null); return; }
      setUid(u.uid);
      await ensureUserDoc(u.uid, u.email, u.displayName ?? undefined);
      const data = await getUserData(u.uid);
      setItems(data?.addresses ?? []);
    });
    return () => unsub();
  }, []);

  function onChange<K extends keyof Address>(key: K, val: Address[K]) {
    setForm((prev) => {
      const next: Address = { ...prev, [key]: val } as Address;
      const street = key === 'street' ? String(val || '') : (prev.street || '');
      const number = key === 'number' ? String(val || '') : (prev.number || '');
      const floor = key === 'floor' ? String(val || '') : (prev.floor || '');
      const apartment = key === 'apartment' ? String(val || '') : (prev.apartment || '');
      next.line1 = `${street} ${number}`.trim();
      next.line2 = `${floor ? `Piso ${floor}` : ''}${apartment ? `${floor ? ' · ' : ''}Depto ${apartment}` : ''}`.trim();
      return next;
    });
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!uid) return;
    setSaving(true);
    try {
      const next = [form, ...items];
      await saveAddresses(uid, next);
      setItems(next);
      setForm(empty());
      alert('Dirección guardada');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="p-6 bg-white rounded-2xl border space-y-3" style={{ marginTop: '16px' }}>
      <div className="font-bold text-lg">Nueva dirección</div>
      <input className="input" placeholder="Etiqueta (Casa, Trabajo)" value={form.label || ''} onChange={e => onChange('label', e.target.value)} />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        <input className="input" placeholder="Nombre completo" value={form.fullName || ''} onChange={e => onChange('fullName', e.target.value)} required />
        <input className="input" placeholder="Teléfono" value={form.phone || ''} onChange={e => onChange('phone', e.target.value)} />
      </div>
      <div className="grid grid-cols-3 gap-2">
        <input className="input" placeholder="Calle" value={form.street || ''} onChange={e => onChange('street', e.target.value)} required />
        <input className="input" placeholder="Número" value={form.number || ''} onChange={e => onChange('number', e.target.value)} />
        <input className="input" placeholder="Piso/Depto" value={form.floor || ''} onChange={e => onChange('floor', e.target.value)} />
      </div>
      <div className="grid grid-cols-3 gap-2">
        <input className="input" placeholder="Puerta" value={form.apartment || ''} onChange={e => onChange('apartment', e.target.value)} />
        <input className="input" placeholder="Población/Localidad" value={form.locality || form.city || ''} onChange={e => { onChange('locality', e.target.value); onChange('city', e.target.value as any); }} required />
        <input className="input" placeholder="Provincia" value={form.state || ''} onChange={e => onChange('state', e.target.value)} />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <input className="input" placeholder="Código postal" value={form.zip || ''} onChange={e => onChange('zip', e.target.value)} />
        <input className="input" placeholder="País" value={form.country || ''} onChange={e => onChange('country', e.target.value)} required />
      </div>
      <textarea className="input" placeholder="Notas de entrega (opcional)" value={form.notes || ''} onChange={e => onChange('notes', e.target.value)} />
      <div className="grid grid-cols-1 gap-2 text-sm">
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={!!form.isDefaultShipping} onChange={e => onChange('isDefaultShipping', e.target.checked)} />
          Envío predeterminado
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={!!form.isDefaultBilling} onChange={e => onChange('isDefaultBilling', e.target.checked)} />
          Facturación predeterminada
        </label>
      </div>
      <div className="flex gap-2 justify-end">
        <button type="button" onClick={() => setForm(empty())} className="px-4 py-2 border rounded-lg">Limpiar</button>
        <button disabled={saving || !uid} className="px-4 py-2 bg-gradient-primary text-white rounded-lg">{saving ? 'Guardando…' : 'Guardar dirección'}</button>
      </div>
    </form>
  );
}

