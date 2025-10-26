// src/components/wallet/WalletBalance.tsx
import { useState, useEffect } from 'react';
import { getWalletBalance, getWalletTransactions } from '../../lib/firebase';
import type { WalletTransaction } from '../../types/firebase';
import { useAuth } from '../hooks/useAuth';

interface WalletBalanceProps {
  showTransactions?: boolean;
  compact?: boolean;
}

export default function WalletBalance({ showTransactions = false, compact = false }: WalletBalanceProps) {
  const { user, loading: authLoading } = useAuth();
  const [balance, setBalance] = useState<number>(0);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [showHistory, setShowHistory] = useState(showTransactions);

  useEffect(() => {
    loadWalletData();
  }, [user]);

  const loadWalletData = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const [walletBalance, walletTransactions] = await Promise.all([
        getWalletBalance(user.uid),
        showTransactions ? getWalletTransactions(user.uid, 20) : Promise.resolve([]),
      ]);

      setBalance(walletBalance);
      setTransactions(walletTransactions);
    } catch (error) {
      console.error('Error cargando wallet:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (timestamp: any): string => {
    if (!timestamp) return 'Fecha desconocida';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (authLoading || loading) {
    return (
      <div className="text-center py-4">
        <div className="inline-block h-6 w-6 animate-spin rounded-full border-4 border-solid border-cyan-500 border-r-transparent"></div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  if (compact) {
    // Vista compacta para mostrar en checkout
    return (
      <div className="bg-gradient-to-r from-cyan-50 to-magenta-50 rounded-xl p-4 border-2 border-cyan-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-cyan-500 to-magenta-500 rounded-full flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-600">Tu Monedero</p>
              <p className="text-2xl font-black text-gray-800">${balance.toFixed(2)}</p>
            </div>
          </div>
          <p className="text-xs text-gray-500 max-w-[150px]">
            Disponible para usar en esta compra
          </p>
        </div>
      </div>
    );
  }

  // Vista completa
  return (
    <div className="bg-white rounded-2xl shadow-lg border-2 border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-cyan-500 to-magenta-500 p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold opacity-90 mb-1">Saldo Disponible</h3>
            <p className="text-4xl font-black">${balance.toFixed(2)}</p>
          </div>
          <div className="w-16 h-16 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
            <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
        </div>
        <p className="text-sm opacity-80 mt-2">
          Ganas 5% de cashback en cada compra
        </p>
      </div>

      {/* Botón para mostrar historial */}
      {!showTransactions && (
        <div className="p-4 border-b">
          <button
            onClick={() => {
              setShowHistory(!showHistory);
              if (!showHistory && transactions.length === 0) {
                loadWalletData();
              }
            }}
            className="w-full px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-xl font-semibold text-gray-700 transition-colors"
          >
            {showHistory ? 'Ocultar' : 'Ver'} Historial de Transacciones
          </button>
        </div>
      )}

      {/* Historial de transacciones */}
      {showHistory && (
        <div className="p-6">
          <h4 className="font-bold text-gray-800 mb-4">Últimas Transacciones</h4>

          {transactions.length === 0 ? (
            <div className="text-center py-8">
              <svg className="mx-auto w-16 h-16 text-gray-300 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="text-gray-500">No hay transacciones aún</p>
              <p className="text-sm text-gray-400 mt-1">Realiza tu primera compra para ganar cashback</p>
            </div>
          ) : (
            <div className="space-y-3">
              {transactions.map((tx) => (
                <div
                  key={tx.id}
                  className={`p-4 rounded-xl border-2 ${
                    tx.type === 'earn'
                      ? 'border-green-200 bg-green-50'
                      : tx.type === 'spend'
                      ? 'border-orange-200 bg-orange-50'
                      : 'border-blue-200 bg-blue-50'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        {tx.type === 'earn' && (
                          <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                          </svg>
                        )}
                        {tx.type === 'spend' && (
                          <svg className="w-5 h-5 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                          </svg>
                        )}
                        {tx.type === 'refund' && (
                          <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                          </svg>
                        )}
                        <span className="font-semibold text-gray-800">
                          {tx.type === 'earn' && 'Cashback recibido'}
                          {tx.type === 'spend' && 'Saldo usado'}
                          {tx.type === 'refund' && 'Reembolso'}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600">{tx.description}</p>
                      <p className="text-xs text-gray-500 mt-1">{formatDate(tx.createdAt)}</p>
                    </div>
                    <div className="text-right">
                      <p className={`text-xl font-black ${
                        tx.type === 'earn' || tx.type === 'refund' ? 'text-green-600' : 'text-orange-600'
                      }`}>
                        {tx.type === 'earn' || tx.type === 'refund' ? '+' : '-'}${tx.amount.toFixed(2)}
                      </p>
                      <p className="text-xs text-gray-500">Saldo: ${tx.balance.toFixed(2)}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
