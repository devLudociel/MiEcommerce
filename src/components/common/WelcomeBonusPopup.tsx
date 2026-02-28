import { useEffect, useState } from 'react';
import AccessibleModal from './AccessibleModal';

const STORAGE_KEY = 'welcome_bonus_popup';

interface BonusPayload {
  amount: number;
  minPurchase: number;
}

export default function WelcomeBonusPopup() {
  const [payload, setPayload] = useState<BonusPayload | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as Partial<BonusPayload>;
      if (typeof parsed.amount !== 'number') return;
      const minPurchase = typeof parsed.minPurchase === 'number' ? parsed.minPurchase : 50;
      setPayload({ amount: parsed.amount, minPurchase });
      setIsOpen(true);
    } catch {
      // ignore malformed data
    }
  }, []);

  const handleClose = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(STORAGE_KEY);
    }
    setIsOpen(false);
  };

  if (!payload) return null;

  return (
    <AccessibleModal
      isOpen={isOpen}
      onClose={handleClose}
      type="success"
      title="¡Bono de bienvenida activado!"
      confirmText="Entendido"
    >
      <p className="text-gray-700 text-sm leading-relaxed">
        Te regalamos <strong>€{payload.amount.toFixed(2)}</strong> en tu monedero.
      </p>
      <p className="text-gray-700 text-sm mt-2">
        Puedes usarlo en compras de <strong>€{payload.minPurchase.toFixed(2)}</strong> o más.
      </p>
      <p className="text-xs text-gray-500 mt-3">
        Guarda este saldo para cuando quieras aprovecharlo.
      </p>
    </AccessibleModal>
  );
}
