import { useState } from 'react';

interface Subscription {
  id: string;
  name: string;
  plan: 'basic' | 'pro' | 'premium';
  price: number;
  billingCycle: 'monthly' | 'yearly';
  status: 'active' | 'cancelled' | 'expired';
  nextBilling: string;
  features: string[];
}

export default function SubscriptionsPanel() {
  const [subscriptions] = useState<Subscription[]>([
    {
      id: '1',
      name: 'Plan Pro',
      plan: 'pro',
      price: 29.99,
      billingCycle: 'monthly',
      status: 'active',
      nextBilling: '2024-02-15',
      features: ['Proyectos ilimitados', 'Soporte prioritario', '50 GB almacenamiento']
    },
    {
      id: '2',
      name: 'Plan Básico',
      plan: 'basic',
      price: 9.99,
      billingCycle: 'monthly',
      status: 'cancelled',
      nextBilling: '2024-01-30',
      features: ['5 proyectos', 'Soporte estándar', '10 GB almacenamiento']
    }
  ]);

  const getPlanColor = (plan: string) => {
    switch (plan) {
      case 'basic': return 'border-gray-300';
      case 'pro': return 'border-cyan-300';
      case 'premium': return 'border-magenta-300';
      default: return 'border-gray-300';
    }
  };

  const getPlanGradient = (plan: string) => {
    switch (plan) {
      case 'basic': return 'bg-gray-100';
      case 'pro': return 'bg-gradient-to-r from-cyan-50 to-cyan-100';
      case 'premium': return 'bg-gradient-to-r from-magenta-50 to-magenta-100';
      default: return 'bg-gray-100';
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active': return 'badge-new';
      case 'cancelled': return 'badge-hot';
      case 'expired': return 'text-gray-400';
      default: return '';
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-3xl font-bold text-gradient-secondary">Suscripciones</h2>
        <button className="btn btn-secondary">
          Explorar Planes
        </button>
      </div>

      <div className="space-y-8">
        {subscriptions.map((sub) => (
          <div 
            key={sub.id} 
            className={`card border-2 ${getPlanColor(sub.plan)} p-6`}
          >
            <div className="flex justify-between items-start mb-4">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="text-2xl font-bold text-gray-900">
                    {sub.name}
                  </h3>
                  <span className={`badge ${getStatusBadge(sub.status)}`}>
                    {sub.status}
                  </span>
                </div>
                <p className="text-sm text-gray-500">
                  Facturación {sub.billingCycle === 'monthly' ? 'mensual' : 'anual'}
                </p>
              </div>
              <div className="text-right">
                <p className="text-3xl font-bold text-magenta-500">
                  ${sub.price}
                </p>
                <p className="text-sm text-gray-500">
                  /{sub.billingCycle === 'monthly' ? 'mes' : 'año'}
                </p>
              </div>
            </div>

            <div className={`p-4 rounded-lg ${getPlanGradient(sub.plan)} mb-4`}>
              <p className="text-sm font-medium text-gray-700 mb-2">Características incluidas:</p>
              <ul className="space-y-1">
                {sub.features.map((feature, index) => (
                  <li key={index} className="text-sm text-gray-600 flex items-start gap-2">
                    <span className="text-cyan-500 mt-0.5">✓</span>
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="flex items-center justify-between mb-4 p-3 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600">
                Próxima facturación
              </p>
              <p className="text-sm font-semibold text-gray-900">
                {new Date(sub.nextBilling).toLocaleDateString()}
              </p>
            </div>

            <div className="flex gap-2 mt-4">
              {sub.status === 'active' ? (
                <>
                  <button className="btn btn-outline btn-sm flex-1">Cambiar Plan</button>
                  <button className="btn btn-ghost btn-sm flex-1 text-red-500">Cancelar</button>
                </>
              ) : (
                <button className="btn btn-secondary btn-sm flex-1">Reactivar</button>
              )}
            </div>
          </div>
        ))}
      </div>

      {subscriptions.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500 mb-4">No tienes suscripciones activas</p>
          <button className="btn btn-secondary">Ver planes disponibles</button>
        </div>
      )}

      <div className="card bg-gradient-rainbow text-white p-8">
        <h3 className="text-xl font-bold mb-2">Ahorra con el plan anual</h3>
        <p className="text-white/90 mb-4">
          Obtén 2 meses gratis al cambiar a facturación anual
        </p>
        <button className="btn bg-white text-gray-900 hover:bg-gray-100">
          Ver oferta
        </button>
      </div>
    </div>
  );
}