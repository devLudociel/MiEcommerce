import { useState } from 'react';

interface DesignService {
  id: string;
  name: string;
  type: 'logo' | 'branding' | 'ui/ux' | 'illustration';
  status: 'pending' | 'in-progress' | 'completed';
  price: number;
  deliveryDate: string;
}

export default function DesignPanel() {
  const [services] = useState<DesignService[]>([
    {
      id: '1',
      name: 'Diseño de Identidad Corporativa',
      type: 'branding',
      status: 'in-progress',
      price: 1500,
      deliveryDate: '2024-02-20'
    },
    {
      id: '2',
      name: 'Rediseño de Logo',
      type: 'logo',
      status: 'completed',
      price: 500,
      deliveryDate: '2024-01-15'
    }
  ]);

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'logo': return 'text-cyan-500';
      case 'branding': return 'text-magenta-500';
      case 'ui/ux': return 'text-purple';
      case 'illustration': return 'text-yellow-500';
      default: return 'text-gray-500';
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending': return 'badge-hot';
      case 'in-progress': return 'badge-new';
      case 'completed': return 'badge-sale';
      default: return '';
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-3xl font-bold text-gradient-secondary">Servicios de Diseño</h2>
        <button className="btn btn-secondary">
          + Solicitar Servicio
        </button>
      </div>

      <div className="space-y-6">
        {services.map((service) => (
          <div key={service.id} className="card card-magenta p-6">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  {service.name}
                </h3>
                <p className={`text-sm font-medium ${getTypeColor(service.type)}`}>
                  {service.type.toUpperCase()}
                </p>
              </div>
              <span className={`badge ${getStatusBadge(service.status)}`}>
                {service.status}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <p className="text-sm text-gray-500">Precio</p>
                <p className="text-lg font-bold text-magenta-500">
                  ${service.price}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Entrega estimada</p>
                <p className="text-sm font-medium text-gray-900">
                  {new Date(service.deliveryDate).toLocaleDateString()}
                </p>
              </div>
            </div>

            <div className="flex gap-2 mt-4">
              <button className="btn btn-outline btn-sm flex-1">Ver Detalles</button>
              <button className="btn btn-ghost btn-sm flex-1">Descargar</button>
            </div>
          </div>
        ))}
      </div>

      {services.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500 mb-4">No tienes servicios de diseño activos</p>
          <button className="btn btn-secondary">Explorar servicios</button>
        </div>
      )}
    </div>
  );
}