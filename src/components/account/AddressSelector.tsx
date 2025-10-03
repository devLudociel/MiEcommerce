import { useEffect, useMemo, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../../lib/firebase';
import type { Address } from '../../lib/userProfile';
import { ensureUserDoc, getUserData } from '../../lib/userProfile';

interface Props {
  onChange?: (sel: { shipping: Address | null; billing: Address | null }) => void;
  title?: string;
}

export default function AddressSelector({ onChange, title = 'Direcciones' }: Props) {
  const [uid, setUid] = useState<string | null>(null);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [shippingId, setShippingId] = useState<string | 'none'>('none');
  const [billingId, setBillingId] = useState<string | 'none'>('none');
  const [sameAsShipping, setSameAsShipping] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (!u || !u.email) { setUid(null); setAddresses([]); return; }
      setUid(u.uid);
      await ensureUserDoc(u.uid, u.email, u.displayName ?? undefined);
      const d = await getUserData(u.uid);
      const list = d?.addresses ?? [];
      setAddresses(list);
      const defShip = list.find(a => a.isDefaultShipping)?.id;
      const defBill = list.find(a => a.isDefaultBilling)?.id;
      setShippingId(defShip ?? 'none');
      setBillingId(defBill ?? (defShip ?? 'none'));
      setSameAsShipping(!defBill || defBill === defShip);
    });
    return () => unsub();
  }, []);

  const shipping = useMemo(() => addresses.find(a => a.id === shippingId) ?? null, [addresses, shippingId]);
  const billing = useMemo(() => (sameAsShipping ? shipping : addresses.find(a => a.id === billingId) ?? null), [addresses, billingId, sameAsShipping, shipping]);

  useEffect(() => { onChange?.({ shipping, billing }); }, [shipping, billing]);

  if (!uid) return <div className="p-4 bg-white rounded-xl border">Inicia sesión para seleccionar direcciones.</div>;

  return (
    <div className="p-4 bg-white rounded-xl border space-y-4">
      <div className="font-bold text-lg">{title}</div>
      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">Dirección de envío</label>
          <select className="input" value={shippingId} onChange={e => setShippingId(e.target.value)}>
            <option value="none">Selecciona…</option>
            {addresses.map(a => (
              <option key={a.id} value={a.id}>
                {(a.label || 'Dirección')} — {a.city}{a.state ? `, ${a.state}` : ''}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Dirección de facturación</label>
          <div className="flex items-center justify-between gap-2 mb-2">
            <label className="text-sm flex items-center gap-2">
              <input type="checkbox" checked={sameAsShipping} onChange={e => setSameAsShipping(e.target.checked)} />
              Igual que envío
            </label>
          </div>
          <select className="input" value={sameAsShipping ? (shippingId || 'none') : billingId} onChange={e => setBillingId(e.target.value)} disabled={sameAsShipping}>
            <option value="none">Selecciona…</option>
            {addresses.map(a => (
              <option key={a.id} value={a.id}>
                {(a.label || 'Dirección')} — {a.city}{a.state ? `, ${a.state}` : ''}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="text-xs text-gray-500">Gestiona tus direcciones en <a href="/account/addresses" className="underline">Mi cuenta → Mis direcciones</a>.</div>
    </div>
  );
}

