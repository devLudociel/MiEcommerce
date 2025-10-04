import { useState } from 'react';

interface Website {
  id: string;
  name: string;
  url: string;
  type: 'landing' | 'ecommerce' | 'portfolio' | 'blog';
  status: 'online' | 'offline' | 'maintenance';
  views: number;
  lastUpdate: string;
}

export default function WebsitesPanel() {
  const [websites] = useState<Website[]>([
    {
      id: '1',
      name: 'Mi Tienda Online',
      url: 'https://mitienda.com',
      type: 'ecommerce',
      status: 'online',
      views: 12450,
      lastUpdate: '2024-01-20'
    },
    {
      id: '2',
      name: 'Portfolio Personal',
      url: 'https://portfolio.com',
      type: 'portfolio',
      status: 'online',
      views: 3200,
      lastUpdate: '2024-01-18'
    }
  ]);

  const getStatusDot = (status: string) => {
    switch (status) {
      case 'online': return 'bg-green-500';
      case 'offline': return 'bg-gray-400';
      case 'maintenance': return 'bg-yellow-500';
      default: return 'bg-gray-400';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'landing': return 'text-cyan-500';
      case 'ecommerce': return 'text-magenta-500';
      case 'portfolio': return 'text-purple';
      case 'blog': return 'text-orange';
      default: return 'text-gray-500';
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-3xl font-bold text-gradient-primary">Páginas Web y Productos Digitales</h2>
        <button className="btn btn-primary">
          + Nueva Web
        </button>
      </div>

      <div className="grid grid-cols-1 gap-8">
        {websites.map((website) => (
          <div key={website.id} className="card p-6">
            <div className="flex justify-between items-start mb-4">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <div className={`w-3 h-3 rounded-full ${getStatusDot(website.status)}`} />
                  <h3 className="text-xl font-semibold text-gray-900">
                    {website.name}
                  </h3>
                </div>
                <a 
                  href={website.url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-sm text-cyan-500 hover:underline"
                >
                  {website.url}
                </a>
                <p className={`text-sm font-medium mt-2 ${getTypeColor(website.type)}`}>
                  {website.type}
                </p>
              </div>
              <span className="text-sm text-gray-500">
                {website.status}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-4 p-4 bg-gray-50 rounded-lg">
              <div>
                <p className="text-sm text-gray-500">Vistas totales</p>
                <p className="text-2xl font-bold text-gray-900">
                  {website.views.toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Última actualización</p>
                <p className="text-sm font-medium text-gray-900">
                  {new Date(website.lastUpdate).toLocaleDateString()}
                </p>
              </div>
            </div>

            <div className="flex gap-2 mt-4">
              <button className="btn btn-primary btn-sm flex-1">Editar</button>
              <button className="btn btn-outline btn-sm flex-1">Analíticas</button>
              <button className="btn btn-ghost btn-sm flex-1">Configuración</button>
            </div>
          </div>
        ))}
      </div>

      {websites.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500 mb-4">No tienes páginas web creadas</p>
          <button className="btn btn-primary">Crear tu primera página web</button>
        </div>
      )}
    </div>
  );
}