// src/components/account/WalletPanel.tsx
import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { logger } from '../../lib/logger';
import { notify } from '../../lib/notifications';

interface WalletTransaction {
  id: string;
  type: 'credit' | 'debit' | 'cashback' | 'refund';
  amount: number;
  description: string;
  orderId?: string;
  createdAt: Date;
}

interface WalletData {
  balance: number;
  promoBalance?: number;
  promoMinPurchase?: number;
  transactions: WalletTransaction[];
}

export default function WalletPanel() {
  const { user } = useAuth();
  const [wallet, setWallet] = useState<WalletData>({ balance: 0, transactions: [] });
  const [loading, setLoading] = useState(true);

  const loadWallet = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);
      logger.info('[WalletPanel] Loading wallet data', { userId: user.uid });

      const token = await user.getIdToken();
      if (!token) {
        throw new Error('No se pudo obtener el token de autenticación');
      }

      const authHeaders = {
        Authorization: `Bearer ${token}`,
      };

      // Fetch wallet balance
      const balanceResponse = await fetch(`/api/get-wallet-balance?userId=${user.uid}`, {
        headers: authHeaders,
      });
      if (!balanceResponse.ok) {
        throw new Error('Error al cargar el saldo');
      }

      const balanceData = await balanceResponse.json();
      const balance = balanceData.balance || 0;
      const promoBalance = balanceData.promoBalance || 0;
      const promoMinPurchase = Number(balanceData.promoMinPurchase || 50);

      // Fetch transactions
      const transactionsResponse = await fetch(`/api/get-wallet-transactions?userId=${user.uid}`, {
        headers: authHeaders,
      });
      if (!transactionsResponse.ok) {
        throw new Error('Error al cargar las transacciones');
      }

      const transactionsData = await transactionsResponse.json();
      interface TransactionData {
        id?: string;
        type?: string;
        amount?: number;
        description?: string;
        createdAt?: string;
      }
      const transactions = (transactionsData.transactions || []).map((t: TransactionData) => ({
        ...t,
        createdAt: new Date(t.createdAt || ''),
      }));

      setWallet({ balance, promoBalance, promoMinPurchase, transactions });
      logger.info('[WalletPanel] Wallet loaded', {
        balance,
        transactionCount: transactions.length,
      });
    } catch (error) {
      logger.error('[WalletPanel] Error loading wallet', error);
      notify.error('Error al cargar el monedero');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    loadWallet();
  }, [loadWallet, user]);

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'credit':
        return '💰';
      case 'debit':
        return '🛍️';
      case 'cashback':
        return '🎁';
      case 'refund':
        return '↩️';
      default:
        return '💳';
    }
  };

  const getTransactionColor = (type: string) => {
    switch (type) {
      case 'credit':
      case 'cashback':
      case 'refund':
        return 'text-green-600';
      case 'debit':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-cyan-500 border-r-transparent"></div>
          <p className="mt-4 text-gray-600">Cargando monedero...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="card p-6 text-center">
        <p className="text-gray-600">Inicia sesión para ver tu monedero</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 mt-32 md:mt-40 px-6 py-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-black text-gradient-primary">Mi Monedero</h1>
        <p className="text-gray-600 mt-2">Gestiona tu saldo y transacciones</p>
      </div>

      {/* Balance Card */}
      <div className="card card-cyan p-8">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600 mb-2">Saldo disponible</p>
            <p className="text-5xl font-black text-gray-900">€{wallet.balance.toFixed(2)}</p>
            {wallet.promoBalance && wallet.promoBalance > 0 && (
              <p className="mt-2 text-sm text-purple-700 font-semibold">
                Bono de bienvenida: €{wallet.promoBalance.toFixed(2)} (usable en compras ≥{' '}
                {wallet.promoMinPurchase || 50} €)
              </p>
            )}
          </div>
          <div className="text-6xl">💰</div>
        </div>
        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4 pt-6 border-t border-cyan-200">
          <div className="text-center">
            <p className="text-xs text-gray-600 mb-1">Cashback disponible</p>
            <p className="text-lg font-bold text-green-600">
              €
              {wallet.transactions
                .filter((t) => t.type === 'cashback')
                .reduce((sum, t) => sum + t.amount, 0)
                .toFixed(2)}
            </p>
          </div>
          <div className="text-center">
            <p className="text-xs text-gray-600 mb-1">Total gastado</p>
            <p className="text-lg font-bold text-gray-900">
              €
              {wallet.transactions
                .filter((t) => t.type === 'debit')
                .reduce((sum, t) => sum + t.amount, 0)
                .toFixed(2)}
            </p>
          </div>
          <div className="text-center">
            <p className="text-xs text-gray-600 mb-1">Total transacciones</p>
            <p className="text-lg font-bold text-gray-900">{wallet.transactions.length}</p>
          </div>
        </div>
      </div>

      {/* How it works */}
      <div className="card card-magenta p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-3">¿Cómo funciona?</h3>
        <ul className="space-y-2 text-sm text-gray-700">
          <li className="flex items-start gap-2">
            <span className="text-green-500 mt-0.5">✓</span>
            <span>
              Recibe <strong>5% de cashback</strong> en cada compra que realices
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-green-500 mt-0.5">✓</span>
            <span>Usa tu saldo para pagar en el checkout (parcial o totalmente)</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-green-500 mt-0.5">✓</span>
            <span>Los reembolsos se abonan automáticamente a tu monedero</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-green-500 mt-0.5">✓</span>
            <span>Sin fechas de caducidad - tu saldo no expira nunca</span>
          </li>
        </ul>
      </div>

      {/* Transactions History */}
      <div className="card p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900">Historial de Transacciones</h3>
          {wallet.transactions.length > 0 && (
            <button
              onClick={loadWallet}
              className="text-sm text-cyan-600 hover:text-cyan-700 font-semibold"
            >
              Actualizar
            </button>
          )}
        </div>

        {wallet.transactions.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">💳</div>
            <p className="text-gray-600">No hay transacciones aún</p>
            <p className="text-sm text-gray-500 mt-2">
              Realiza tu primera compra para empezar a acumular cashback
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {wallet.transactions.map((transaction) => (
              <div
                key={transaction.id}
                className="flex items-center justify-between p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="text-3xl">{getTransactionIcon(transaction.type)}</div>
                  <div>
                    <p className="font-semibold text-gray-900">{transaction.description}</p>
                    <p className="text-xs text-gray-500">{formatDate(transaction.createdAt)}</p>
                    {transaction.orderId && (
                      <a
                        href={`/account/orders?id=${transaction.orderId}`}
                        className="text-xs text-cyan-600 hover:underline"
                      >
                        Ver pedido →
                      </a>
                    )}
                  </div>
                </div>
                <div className={`text-lg font-bold ${getTransactionColor(transaction.type)}`}>
                  {transaction.type === 'debit' ? '-' : '+'}€{transaction.amount.toFixed(2)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
