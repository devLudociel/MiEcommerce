import { useEffect, useMemo, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../../lib/firebase';
import type { Address } from '../../lib/userProfile';
import { ensureUserDoc, getUserData, saveAddresses, saveTaxIds, updateUserSettings } from '../../lib/userProfile';
import type { TaxId } from '../../lib/userProfile';

function emptyAddress(): Address {
  return {
    id: Math.random().toString(36).slice(2),
    label: '',
    fullName: '',
    phone: '',
    line1: '',
    line2: '',
    street: '',
    number: '',
    floor: '',
    apartment: '',
    locality: '',
    city: '',
    state: '',
    zip: '',
    country: 'AR',
    isDefaultBilling: false,
    isDefaultShipping: false,
    notes: '',
  };
}

export default function AddressesPanel() {
  const [uid, setUid] = useState<string | null>(null);
  const [items, setItems] = useState<Address[]>([]);
  const [taxIds, setTaxIds] = useState<TaxId[]>([]);
  const [whiteLabel, setWhiteLabel] = useState<boolean>(false);
  const [editing, setEditing] = useState<Address | null>(null);
  const [editingTax, setEditingTax] = useState<TaxId | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (!u || !u.email) { setUid(null); setItems([]); setLoading(false); return; }
      setUid(u.uid);
      await ensureUserDoc(u.uid, u.email, u.displayName ?? undefined);
      const data = await getUserData(u.uid);
      setItems(data?.addresses ?? []);
      setTaxIds(data?.taxIds ?? []);
      setWhiteLabel(!!data?.whiteLabelShipping);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  // Si no hay direcciones, abre el formulario automáticamente
  useEffect(() => {
    if (!loading && uid && items.length === 0 && !editing) {
      startCreate();
    }
  }, [loading, uid, items.length]);

  const hasDefaultShipping = useMemo(() => items.some(a => a.isDefaultShipping), [items]);
  const hasDefaultBilling = useMemo(() => items.some(a => a.isDefaultBilling), [items]);

  async function persist(next: Address[]) {
    if (!uid) return;
    setSaving(true);
    try { await saveAddresses(uid, next); setItems(next); }
    finally { setSaving(false); setEditing(null); }
  }

  function startCreate() { setEditing(emptyAddress()); }
  function startEdit(a: Address) { setEditing({ ...a }); }
  async function remove(id: string) { await persist(items.filter(a => a.id !== id)); }

  function onChange<K extends keyof Address>(key: K, val: Address[K]) {
    if (!editing) return;
    // Mantener compatibilidad line1/line2 con campos detallados
    const next: Address = { ...editing, [key]: val } as Address;
    const street = (key === 'street' ? String(val || '') : (editing.street || ''));
    const number = (key === 'number' ? String(val || '') : (editing.number || ''));
    const floor = (key === 'floor' ? String(val || '') : (editing.floor || ''));
    const apartment = (key === 'apartment' ? String(val || '') : (editing.apartment || ''));
    next.line1 = `${street} ${number}`.trim();
    next.line2 = `${floor ? `Piso ${floor}` : ''}${apartment ? `${floor ? ' · ' : ''}Depto ${apartment}` : ''}`.trim();
    setEditing(next);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!editing) return;
    let next = [...items];
    const idx = next.findIndex(a => a.id === editing.id);
    if (editing.isDefaultShipping) next = next.map(a => ({ ...a, isDefaultShipping: a.id === editing.id }));
    if (editing.isDefaultBilling) next = next.map(a => ({ ...a, isDefaultBilling: a.id === editing.id }));
    if (idx >= 0) next[idx] = editing; else next.unshift(editing);
    await persist(next);
  }

  // Tax IDs
  async function persistTax(next: TaxId[]) {
    if (!uid) return;
    setSaving(true);
    try { await saveTaxIds(uid, next); setTaxIds(next); }
    finally { setSaving(false); setEditingTax(null); }
  }
  function startCreateTax() { setEditingTax({ id: Math.random().toString(36).slice(2), label: '', value: '', country: 'AR' }); }
  function startEditTax(t: TaxId) { setEditingTax({ ...t }); }
  async function removeTax(id: string) { await persistTax(taxIds.filter(t => t.id !== id)); }
  function onChangeTax<K extends keyof TaxId>(key: K, val: TaxId[K]) { if (editingTax) setEditingTax({ ...editingTax, [key]: val }); }
  async function submitTax(e: React.FormEvent) { e.preventDefault(); if (!editingTax) return; const next = [...taxIds]; const idx = next.findIndex(t => t.id === editingTax.id); if (idx >= 0) next[idx] = editingTax; else next.unshift(editingTax); await persistTax(next); }

  // White label shipping toggle
  async function toggleWhiteLabel(val: boolean) {
    if (!uid) return;
    setWhiteLabel(val);
    await updateUserSettings(uid, { whiteLabelShipping: val });
  }

  if (loading) return <div className="p-6 bg-white rounded-xl border">Cargando direcciones…</div>;
  if (!uid) return <div className="p-6 bg-white rounded-xl border">Inicia sesión para gestionar tus direcciones.</div>;

  return (
    <div className="space-y-10">
      <h1 className="text-3xl font-black">Pago y envío</h1>

      {/* Direcciones guardadas */}
      <div className="space-y-4">
        <h2 className="text-xl font-bold">Direcciones guardadas</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <button onClick={startCreate} className="p-6 rounded-2xl border-2 border-dashed hover:bg-gray-50 transition text-left">
            + Añadir una nueva dirección
          </button>
          {items.map((a) => (
            <div key={a.id} className="p-6 bg-white rounded-2xl border">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="font-bold">{a.label || 'Dirección'}</div>
                  <div className="text-sm text-gray-900">{a.fullName}</div>
                  {a.phone && <div className="text-sm text-gray-600">{a.phone}</div>}
                  <div className="text-sm text-gray-700">{a.line1 || `${a.street || ''} ${a.number || ''}`}</div>
                  {(a.line2 || a.floor || a.apartment) && (
                    <div className="text-sm text-gray-700">{a.line2 || `${a.floor ? `Piso ${a.floor}` : ''}${a.apartment ? `${a.floor ? ' · ' : ''}Depto ${a.apartment}` : ''}`}</div>
                  )}
                  <div className="text-sm text-gray-700">{a.locality || a.city}{(a.state || a.city) ? `, ${a.state || ''}` : ''} {a.zip || ''}</div>
                  <div className="text-sm text-gray-700">{a.country}</div>
                  {a.notes && <div className="text-xs text-gray-500 mt-1">Notas: {a.notes}</div>}
                </div>
                <div className="text-xs mt-1 space-y-1 text-right">
                  {a.isDefaultShipping && <div className="inline-block px-2 py-0.5 bg-green-100 text-green-700 rounded">Predeterminado envío</div>}
                  {a.isDefaultBilling && <div className="inline-block ml-2 px-2 py-0.5 bg-purple-100 text-purple-700 rounded">Predeterminado facturación</div>}
                </div>
              </div>
              <div className="mt-3 text-sm flex gap-4">
                <button onClick={() => startEdit(a)} className="underline">Editar</button>
                <button onClick={() => remove(a.id)} className="underline text-red-600">Eliminar</button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Pagos guardados */}
      <div className="space-y-2">
        <h2 className="text-xl font-bold">Pagos guardados</h2>
        <div className="p-6 bg-white rounded-2xl border text-gray-600">Todavía no has guardado ningún pago.</div>
      </div>

      {/* Números de identificación fiscal */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold">Números fiscales</h2>
          <button onClick={startCreateTax} className="px-4 py-2 border rounded-lg">Añadir número</button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {taxIds.length === 0 && (
            <div className="p-6 bg-white rounded-2xl border text-gray-600">No tienes números fiscales guardados.</div>
          )}
          {taxIds.map(t => (
            <div key={t.id} className="p-6 bg-white rounded-2xl border">
              <div className="font-bold">{t.label || 'Número fiscal'}</div>
              <div className="text-sm text-gray-700">{t.value} {t.country ? `• ${t.country}` : ''}</div>
              <div className="mt-2 text-sm flex gap-4">
                <button onClick={() => startEditTax(t)} className="underline">Editar</button>
                <button onClick={() => removeTax(t.id)} className="underline text-red-600">Eliminar</button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Crédito y marca blanca */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-6 bg-white rounded-2xl border">
          <div className="text-xl font-black text-green-600">0,00 €</div>
          <div className="text-sm text-gray-600">Créditos disponibles</div>
          <a href="#" className="text-sm underline mt-2 inline-block">Historial de transacciones</a>
        </div>
        <div className="p-6 bg-white rounded-2xl border">
          <div className="flex items-center justify-between">
            <div className="font-bold">Envío con marca blanca</div>
            <label className="inline-flex items-center cursor-pointer">
              <input type="checkbox" className="sr-only" checked={whiteLabel} onChange={e => toggleWhiteLabel(e.target.checked)} />
              <div className={`w-10 h-6 rounded-full transition ${whiteLabel ? 'bg-cyan-500' : 'bg-gray-300'}`}>
                <div className={`w-6 h-6 bg-white rounded-full shadow -mt-0.5 transform transition ${whiteLabel ? 'translate-x-4' : 'translate-x-0'}`} />
              </div>
            </label>
          </div>
          <p className="text-sm text-gray-600 mt-2">Entrega tus pedidos sin marca y con etiqueta genérica de remitente.</p>
        </div>
      </div>

      {/* Modal dirección */}
      {editing && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <form onSubmit={onSubmit} className="w-full max-w-lg p-5 bg-white rounded-2xl border space-y-3">
            <div className="font-bold text-lg">{items.some(a => a.id === editing.id) ? 'Editar dirección' : 'Nueva dirección'}</div>
            <input className="input" placeholder="Etiqueta (Casa, Trabajo)" value={editing.label || ''} onChange={e => onChange('label', e.target.value)} />
            <input className="input" placeholder="Nombre completo" value={editing.fullName} onChange={e => onChange('fullName', e.target.value)} required />
            <input className="input" placeholder="Teléfono" value={editing.phone || ''} onChange={e => onChange('phone', e.target.value)} />

            <div className="grid grid-cols-3 gap-2">
              <input className="input" placeholder="Calle" value={editing.street || ''} onChange={e => onChange('street', e.target.value)} required />
              <input className="input" placeholder="Número" value={editing.number || ''} onChange={e => onChange('number', e.target.value)} />
              <input className="input" placeholder="Piso/Depto" value={editing.floor || ''} onChange={e => onChange('floor', e.target.value)} />
            </div>
            <div className="grid grid-cols-3 gap-2">
              <input className="input" placeholder="Puerta" value={editing.apartment || ''} onChange={e => onChange('apartment', e.target.value)} />
              <input className="input" placeholder="Población/Localidad" value={editing.locality || editing.city || ''} onChange={e => { onChange('locality', e.target.value); onChange('city', e.target.value as any); }} required />
              <input className="input" placeholder="Provincia" value={editing.state || ''} onChange={e => onChange('state', e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <input className="input" placeholder="Código postal" value={editing.zip || ''} onChange={e => onChange('zip', e.target.value)} />
              <input className="input" placeholder="País" value={editing.country} onChange={e => onChange('country', e.target.value)} required />
            </div>
            <textarea className="input" placeholder="Notas de entrega (opcional)" value={editing.notes || ''} onChange={e => onChange('notes', e.target.value)} />
            <div className="grid grid-cols-1 gap-2 text-sm">
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={!!editing.isDefaultShipping} onChange={e => onChange('isDefaultShipping', e.target.checked)} />
                Envío predeterminado
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={!!editing.isDefaultBilling} onChange={e => onChange('isDefaultBilling', e.target.checked)} />
                Facturación predeterminada
              </label>
            </div>
            <div className="flex gap-2 justify-end">
              <button type="button" onClick={() => setEditing(null)} className="px-4 py-2 border rounded-lg">Cancelar</button>
              <button disabled={saving} className="px-4 py-2 bg-gradient-primary text-white rounded-lg">{saving ? 'Guardando…' : 'Guardar'}</button>
            </div>
          </form>
        </div>
      )}

      {/* Modal número fiscal */}
      {editingTax && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <form onSubmit={submitTax} className="w-full max-w-md p-5 bg-white rounded-2xl border space-y-3">
            <div className="font-bold text-lg">{taxIds.some(t => t.id === editingTax.id) ? 'Editar número fiscal' : 'Nuevo número fiscal'}</div>
            <input className="input" placeholder="Etiqueta (Empresa, Personal)" value={editingTax.label || ''} onChange={e => onChangeTax('label', e.target.value)} />
            <input className="input" placeholder="Número (CUIT/CIF/NIF)" value={editingTax.value} onChange={e => onChangeTax('value', e.target.value)} required />
            <input className="input" placeholder="País" value={editingTax.country || ''} onChange={e => onChangeTax('country', e.target.value)} />
            <div className="flex gap-2 justify-end">
              <button type="button" onClick={() => setEditingTax(null)} className="px-4 py-2 border rounded-lg">Cancelar</button>
              <button disabled={saving} className="px-4 py-2 bg-gradient-primary text-white rounded-lg">{saving ? 'Guardando…' : 'Guardar'}</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
