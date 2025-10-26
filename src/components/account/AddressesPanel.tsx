import { useEffect, useMemo, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../../lib/firebase';
import type { Address } from '../../lib/userProfile';
import {
  ensureUserDoc,
  getUserData,
  saveAddresses,
  saveTaxIds,
  updateUserSettings,
} from '../../lib/userProfile';
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
    country: 'ES',
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
      if (!u || !u.email) {
        setUid(null);
        setItems([]);
        setLoading(false);
        return;
      }
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

  useEffect(() => {
    if (!loading && uid && items.length === 0 && !editing) {
      startCreate();
    }
  }, [loading, uid, items.length]);

  const hasDefaultShipping = useMemo(() => items.some((a) => a.isDefaultShipping), [items]);
  const hasDefaultBilling = useMemo(() => items.some((a) => a.isDefaultBilling), [items]);

  async function persist(next: Address[]) {
    if (!uid) return;
    setSaving(true);
    try {
      await saveAddresses(uid, next);
      setItems(next);
    } finally {
      setSaving(false);
      setEditing(null);
    }
  }

  function startCreate() {
    setEditing(emptyAddress());
  }
  function startEdit(a: Address) {
    setEditing({ ...a });
  }
  async function remove(id: string) {
    await persist(items.filter((a) => a.id !== id));
  }

  function onChange<K extends keyof Address>(key: K, val: Address[K]) {
    if (!editing) return;
    const next: Address = { ...editing, [key]: val } as Address;
    const street = key === 'street' ? String(val || '') : editing.street || '';
    const number = key === 'number' ? String(val || '') : editing.number || '';
    const floor = key === 'floor' ? String(val || '') : editing.floor || '';
    const apartment = key === 'apartment' ? String(val || '') : editing.apartment || '';
    next.line1 = `${street} ${number}`.trim();
    next.line2 =
      `${floor ? `Piso ${floor}` : ''}${apartment ? `${floor ? ' · ' : ''}Depto ${apartment}` : ''}`.trim();
    setEditing(next);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!editing) return;
    let next = [...items];
    const idx = next.findIndex((a) => a.id === editing.id);
    if (editing.isDefaultShipping)
      next = next.map((a) => ({ ...a, isDefaultShipping: a.id === editing.id }));
    if (editing.isDefaultBilling)
      next = next.map((a) => ({ ...a, isDefaultBilling: a.id === editing.id }));
    if (idx >= 0) next[idx] = editing;
    else next.unshift(editing);
    await persist(next);
  }

  // Tax IDs
  async function persistTax(next: TaxId[]) {
    if (!uid) return;
    setSaving(true);
    try {
      await saveTaxIds(uid, next);
      setTaxIds(next);
    } finally {
      setSaving(false);
      setEditingTax(null);
    }
  }
  function startCreateTax() {
    setEditingTax({ id: Math.random().toString(36).slice(2), label: '', value: '', country: 'ES' });
  }
  function startEditTax(t: TaxId) {
    setEditingTax({ ...t });
  }
  async function removeTax(id: string) {
    await persistTax(taxIds.filter((t) => t.id !== id));
  }
  function onChangeTax<K extends keyof TaxId>(key: K, val: TaxId[K]) {
    if (editingTax) setEditingTax({ ...editingTax, [key]: val });
  }
  async function submitTax(e: React.FormEvent) {
    e.preventDefault();
    if (!editingTax) return;
    const next = [...taxIds];
    const idx = next.findIndex((t) => t.id === editingTax.id);
    if (idx >= 0) next[idx] = editingTax;
    else next.unshift(editingTax);
    await persistTax(next);
  }

  // White label shipping toggle
  async function toggleWhiteLabel(val: boolean) {
    if (!uid) return;
    setWhiteLabel(val);
    await updateUserSettings(uid, { whiteLabelShipping: val });
  }

  if (loading) return <div className="card p-6">Cargando direcciones…</div>;
  if (!uid) return <div className="card p-6">Inicia sesión para gestionar tus direcciones.</div>;

  return (
    <div className="space-y-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gradient-primary">Pago y envío</h1>
        <p className="text-gray-600 mt-2">
          Gestiona tus direcciones, métodos de pago y facturación
        </p>
      </div>

      {/* Direcciones guardadas */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900">Direcciones guardadas</h2>
          <button onClick={startCreate} className="btn btn-primary">
            + Nueva dirección
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-1 lg:grid-cols-1 gap-6">
          {items.map((a) => (
            <div key={a.id} className="card card-cyan p-6">
              <div className="flex items-start justify-between gap-4 mb-4">
                <div className="flex-1">
                  <div className="font-bold text-lg text-gray-900 mb-2">
                    {a.label || 'Dirección'}
                  </div>
                  <div className="text-sm text-gray-900 mb-1">{a.fullName}</div>
                  {a.phone && <div className="text-sm text-gray-600 mb-2">{a.phone}</div>}
                  <div className="text-sm text-gray-700">
                    {a.line1 || `${a.street || ''} ${a.number || ''}`}
                  </div>
                  {(a.line2 || a.floor || a.apartment) && (
                    <div className="text-sm text-gray-700">
                      {a.line2 ||
                        `${a.floor ? `Piso ${a.floor}` : ''}${a.apartment ? `${a.floor ? ' · ' : ''}Depto ${a.apartment}` : ''}`}
                    </div>
                  )}
                  <div className="text-sm text-gray-700">
                    {a.locality || a.city}
                    {a.state || a.city ? `, ${a.state || ''}` : ''} {a.zip || ''}
                  </div>
                  <div className="text-sm text-gray-700">{a.country}</div>
                  {a.notes && (
                    <div className="text-xs text-gray-500 mt-2 p-2 bg-gray-50 rounded">
                      Notas: {a.notes}
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  {a.isDefaultShipping && (
                    <div className="badge badge-new">Envío predeterminado</div>
                  )}
                  {a.isDefaultBilling && (
                    <div className="badge badge-sale">Facturación predeterminada</div>
                  )}
                </div>
              </div>
              <div className="flex gap-2 mt-4">
                <button onClick={() => startEdit(a)} className="btn btn-outline btn-sm flex-1">
                  Editar
                </button>
                <button
                  onClick={() => remove(a.id)}
                  className="btn btn-ghost btn-sm flex-1 text-red-500"
                >
                  Eliminar
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Pagos guardados */}
      <div className="space-y-4">
        <h2 className="text-xl font-bold text-gray-900">Pagos guardados</h2>
        <div className="card p-8 text-center text-gray-600">
          <p>Todavía no has guardado ningún método de pago.</p>
        </div>
      </div>

      {/* Números de identificación fiscal */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900">Números fiscales</h2>
          <button onClick={startCreateTax} className="btn btn-secondary">
            + Añadir número
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-1 gap-6">
          {taxIds.length === 0 && (
            <div className="card p-8 text-center text-gray-600">
              No tienes números fiscales guardados.
            </div>
          )}
          {taxIds.map((t) => (
            <div key={t.id} className="card card-magenta p-6">
              <div className="mb-4">
                <div className="font-bold text-lg text-gray-900">{t.label || 'Número fiscal'}</div>
                <div className="text-sm text-gray-700 mt-1">
                  {t.value} {t.country ? `• ${t.country}` : ''}
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => startEditTax(t)} className="btn btn-outline btn-sm flex-1">
                  Editar
                </button>
                <button
                  onClick={() => removeTax(t.id)}
                  className="btn btn-ghost btn-sm flex-1 text-red-500"
                >
                  Eliminar
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Crédito y marca blanca */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="card card-yellow p-6">
          <div className="text-3xl font-bold text-yellow-600 mb-2">0,00 €</div>
          <div className="text-sm text-gray-600 mb-3">Créditos disponibles</div>
          <a href="#" className="text-sm text-yellow-600 hover:underline font-medium">
            Historial de transacciones →
          </a>
        </div>
        <div className="card p-6">
          <div className="flex items-center justify-between mb-3">
            <div className="font-bold text-gray-900">Envío con marca blanca</div>
            <label className="inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                className="sr-only"
                checked={whiteLabel}
                onChange={(e) => toggleWhiteLabel(e.target.checked)}
              />
              <div
                className={`w-12 h-7 rounded-full transition ${whiteLabel ? 'bg-cyan-500' : 'bg-gray-300'}`}
              >
                <div
                  className={`w-6 h-6 bg-white rounded-full shadow mt-0.5 transform transition ${whiteLabel ? 'translate-x-6' : 'translate-x-1'}`}
                />
              </div>
            </label>
          </div>
          <p className="text-sm text-gray-600">
            Entrega tus pedidos sin marca y con etiqueta genérica de remitente.
          </p>
        </div>
      </div>

      {/* Modal dirección */}
      {editing && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <form
            onSubmit={onSubmit}
            className="w-full max-w-2xl bg-white rounded-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto"
          >
            <h3 className="text-xl font-bold text-gray-900">
              {items.some((a) => a.id === editing.id) ? 'Editar dirección' : 'Nueva dirección'}
            </h3>

            <input
              className="input"
              placeholder="Etiqueta (Casa, Trabajo)"
              value={editing.label || ''}
              onChange={(e) => onChange('label', e.target.value)}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input
                className="input"
                placeholder="Nombre completo"
                value={editing.fullName}
                onChange={(e) => onChange('fullName', e.target.value)}
                required
              />
              <input
                className="input"
                placeholder="Teléfono"
                value={editing.phone || ''}
                onChange={(e) => onChange('phone', e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <input
                className="input col-span-2"
                placeholder="Calle"
                value={editing.street || ''}
                onChange={(e) => onChange('street', e.target.value)}
                required
              />
              <input
                className="input"
                placeholder="Número"
                value={editing.number || ''}
                onChange={(e) => onChange('number', e.target.value)}
              />
              <input
                className="input"
                placeholder="Piso"
                value={editing.floor || ''}
                onChange={(e) => onChange('floor', e.target.value)}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <input
                className="input"
                placeholder="Puerta/Depto"
                value={editing.apartment || ''}
                onChange={(e) => onChange('apartment', e.target.value)}
              />
              <input
                className="input"
                placeholder="Localidad"
                value={editing.locality || editing.city || ''}
                onChange={(e) => {
                  onChange('locality', e.target.value);
                  onChange('city', e.target.value as any);
                }}
                required
              />
              <input
                className="input"
                placeholder="Provincia"
                value={editing.state || ''}
                onChange={(e) => onChange('state', e.target.value)}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input
                className="input"
                placeholder="Código postal"
                value={editing.zip || ''}
                onChange={(e) => onChange('zip', e.target.value)}
              />
              <input
                className="input"
                placeholder="País"
                value={editing.country}
                onChange={(e) => onChange('country', e.target.value)}
                required
              />
            </div>

            <textarea
              className="input"
              rows={3}
              placeholder="Notas de entrega (opcional)"
              value={editing.notes || ''}
              onChange={(e) => onChange('notes', e.target.value)}
            />

            <div className="space-y-3">
              <label className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100">
                <input
                  type="checkbox"
                  checked={!!editing.isDefaultShipping}
                  onChange={(e) => onChange('isDefaultShipping', e.target.checked)}
                  className="w-5 h-5"
                />
                <span className="text-sm font-medium">
                  Usar como dirección de envío predeterminada
                </span>
              </label>
              <label className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100">
                <input
                  type="checkbox"
                  checked={!!editing.isDefaultBilling}
                  onChange={(e) => onChange('isDefaultBilling', e.target.checked)}
                  className="w-5 h-5"
                />
                <span className="text-sm font-medium">
                  Usar como dirección de facturación predeterminada
                </span>
              </label>
            </div>

            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={() => setEditing(null)}
                className="btn btn-ghost flex-1"
              >
                Cancelar
              </button>
              <button type="submit" disabled={saving} className="btn btn-primary flex-1">
                {saving ? 'Guardando…' : 'Guardar dirección'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modal número fiscal */}
      {editingTax && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <form onSubmit={submitTax} className="w-full max-w-md bg-white rounded-2xl p-6 space-y-4">
            <h3 className="text-xl font-bold text-gray-900">
              {taxIds.some((t) => t.id === editingTax.id)
                ? 'Editar número fiscal'
                : 'Nuevo número fiscal'}
            </h3>
            <input
              className="input"
              placeholder="Etiqueta (Empresa, Personal)"
              value={editingTax.label || ''}
              onChange={(e) => onChangeTax('label', e.target.value)}
            />
            <input
              className="input"
              placeholder="Número (CIF/NIF/DNI)"
              value={editingTax.value}
              onChange={(e) => onChangeTax('value', e.target.value)}
              required
            />
            <input
              className="input"
              placeholder="País"
              value={editingTax.country || ''}
              onChange={(e) => onChangeTax('country', e.target.value)}
            />
            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={() => setEditingTax(null)}
                className="btn btn-ghost flex-1"
              >
                Cancelar
              </button>
              <button type="submit" disabled={saving} className="btn btn-secondary flex-1">
                {saving ? 'Guardando…' : 'Guardar'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
