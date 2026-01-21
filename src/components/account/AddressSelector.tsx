import { useEffect, useMemo, useState } from 'react';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { auth } from '../../lib/firebase';
import type { Address } from '../../lib/userProfile';

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

  const fetchAddresses = async (currentUser: User): Promise<Address[]> => {
    const token = await currentUser.getIdToken();
    const response = await fetch('/api/addresses', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    if (!response.ok) return [];
    const data = await response.json();
    return data?.addresses ?? [];
  };

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (!u || !u.email) {
        setUid(null);
        setAddresses([]);
        return;
      }
      setUid(u.uid);
      const list = await fetchAddresses(u);
      setAddresses(list);
      const defShip = list.find((a) => a.isDefaultShipping)?.id;
      const defBill = list.find((a) => a.isDefaultBilling)?.id;
      setShippingId(defShip ?? 'none');
      setBillingId(defBill ?? defShip ?? 'none');
      setSameAsShipping(!defBill || defBill === defShip);
    });
    return () => unsub();
  }, []);

  const shipping = useMemo(
    () => addresses.find((a) => a.id === shippingId) ?? null,
    [addresses, shippingId]
  );
  const billing = useMemo(
    () => (sameAsShipping ? shipping : (addresses.find((a) => a.id === billingId) ?? null)),
    [addresses, billingId, sameAsShipping, shipping]
  );

  useEffect(() => {
    onChange?.({ shipping, billing });
  }, [shipping, billing, onChange]);

  if (!uid) return <div className="card p-6">Inicia sesión para seleccionar direcciones.</div>;

  return (
    <div className="card card-cyan p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-bold text-gray-900">{title}</h3>
        <a href="/account/addresses" className="text-sm text-cyan-600 hover:underline">
          Gestionar direcciones
        </a>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label
            className="block text-sm font-medium text-gray-700 mb-2"
            htmlFor="address-selector-shipping"
          >
            Dirección de envío
          </label>
          <select
            id="address-selector-shipping"
            className="input"
            value={shippingId}
            onChange={(e) => setShippingId(e.target.value)}
          >
            <option value="none">Selecciona una dirección…</option>
            {addresses.map((a) => (
              <option key={a.id} value={a.id}>
                {a.label || 'Dirección'} — {a.city}
                {a.state ? `, ${a.state}` : ''}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label
            className="block text-sm font-medium text-gray-700 mb-2"
            htmlFor="address-selector-billing"
          >
            Dirección de facturación
          </label>
          <label className="flex items-center gap-2 mb-3 text-sm text-gray-600">
            <input
              type="checkbox"
              checked={sameAsShipping}
              onChange={(e) => setSameAsShipping(e.target.checked)}
              className="w-4 h-4"
            />
            Igual que dirección de envío
          </label>
          <select
            id="address-selector-billing"
            className="input"
            value={sameAsShipping ? shippingId || 'none' : billingId}
            onChange={(e) => setBillingId(e.target.value)}
            disabled={sameAsShipping}
          >
            <option value="none">Selecciona una dirección…</option>
            {addresses.map((a) => (
              <option key={a.id} value={a.id}>
                {a.label || 'Dirección'} — {a.city}
                {a.state ? `, ${a.state}` : ''}
              </option>
            ))}
          </select>
        </div>
      </div>

      {addresses.length === 0 && (
        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-sm text-yellow-800">
            No tienes direcciones guardadas.{' '}
            <a href="/account/addresses" className="underline font-medium">
              Añade una dirección
            </a>{' '}
            para continuar.
          </p>
        </div>
      )}
    </div>
  );
}
