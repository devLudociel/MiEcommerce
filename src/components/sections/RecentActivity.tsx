// src/components/sections/RecentActivity.tsx
import { useState, useEffect } from 'react';

interface Activity {
  id: string;
  type: 'purchase' | 'review' | 'signup';
  user: string;
  product?: string;
  location: string;
  timestamp: string;
  rating?: number;
}

export default function RecentActivity() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  // Mock data - in production this would come from an API
  const mockActivities: Activity[] = [
    {
      id: '1',
      type: 'purchase',
      user: 'María G.',
      product: 'Camiseta personalizada',
      location: 'Los Llanos de Aridane',
      timestamp: 'Hace 5 minutos',
    },
    {
      id: '2',
      type: 'review',
      user: 'Carlos R.',
      product: 'Sudadera con bordado',
      location: 'Santa Cruz de La Palma',
      timestamp: 'Hace 12 minutos',
      rating: 5,
    },
    {
      id: '3',
      type: 'purchase',
      user: 'Ana M.',
      product: 'Taza personalizada',
      location: 'El Paso',
      timestamp: 'Hace 18 minutos',
    },
    {
      id: '4',
      type: 'signup',
      user: 'Pedro L.',
      location: 'Tazacorte',
      timestamp: 'Hace 23 minutos',
    },
    {
      id: '5',
      type: 'purchase',
      user: 'Laura S.',
      product: 'Marco de fotos',
      location: 'Breña Baja',
      timestamp: 'Hace 30 minutos',
    },
    {
      id: '6',
      type: 'review',
      user: 'Miguel T.',
      product: 'Impresión 3D',
      location: 'Los Llanos de Aridane',
      timestamp: 'Hace 35 minutos',
      rating: 5,
    },
  ];

  useEffect(() => {
    setActivities(mockActivities);
  }, []);

  // Auto-scroll through activities
  useEffect(() => {
    if (activities.length === 0) return;

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % activities.length);
    }, 3000);

    return () => clearInterval(interval);
  }, [activities.length]);

  if (activities.length === 0) return null;

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'purchase':
        return '🛍️';
      case 'review':
        return '⭐';
      case 'signup':
        return '👤';
      default:
        return '✨';
    }
  };

  const getActivityText = (activity: Activity) => {
    switch (activity.type) {
      case 'purchase':
        return `compró ${activity.product}`;
      case 'review':
        return `valoró ${activity.product} con ${activity.rating} estrellas`;
      case 'signup':
        return 'se unió a ImprimeArte';
      default:
        return '';
    }
  };

  return (
    <section className="py-16 bg-gradient-to-br from-gray-50 to-white relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-100 text-green-700 rounded-full mb-4">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
            </span>
            <span className="text-sm font-semibold">Actividad en vivo</span>
          </div>
          <h2 className="text-3xl md:text-4xl font-bold text-gray-800 mb-2">
            Únete a cientos de clientes satisfechos
          </h2>
          <p className="text-gray-600">Mira lo que está pasando ahora en ImprimeArte</p>
        </div>

        {/* Activity Feed */}
        <div className="max-w-4xl mx-auto">
          <div className="relative h-24 overflow-hidden">
            {activities.map((activity, index) => (
              <div
                key={activity.id}
                className={`absolute inset-0 transition-all duration-500 ${
                  index === currentIndex
                    ? 'opacity-100 translate-y-0'
                    : index < currentIndex
                      ? 'opacity-0 -translate-y-full'
                      : 'opacity-0 translate-y-full'
                }`}
              >
                <div className="bg-white rounded-2xl shadow-lg p-6 border-2 border-gray-100">
                  <div className="flex items-center gap-4">
                    {/* Icon */}
                    <div className="flex-shrink-0 w-14 h-14 bg-gradient-to-br from-cyan-400 to-blue-500 rounded-full flex items-center justify-center text-2xl shadow-lg">
                      {getActivityIcon(activity.type)}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <p className="text-gray-800 font-medium">
                        <span className="font-bold text-cyan-600">{activity.user}</span>{' '}
                        {getActivityText(activity)}
                      </p>
                      <div className="flex items-center gap-3 mt-1 text-sm text-gray-500">
                        <span className="flex items-center gap-1">
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                            <path
                              fillRule="evenodd"
                              d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z"
                              clipRule="evenodd"
                            />
                          </svg>
                          {activity.location}
                        </span>
                        <span className="flex items-center gap-1">
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                            <path
                              fillRule="evenodd"
                              d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z"
                              clipRule="evenodd"
                            />
                          </svg>
                          {activity.timestamp}
                        </span>
                      </div>
                    </div>

                    {/* Checkmark */}
                    <div className="flex-shrink-0">
                      <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center">
                        <svg
                          className="w-6 h-6 text-white"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={3}
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Progress Indicators */}
          <div className="flex justify-center gap-2 mt-6">
            {activities.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentIndex(index)}
                className={`h-1 rounded-full transition-all duration-300 ${
                  index === currentIndex ? 'bg-cyan-500 w-8' : 'bg-gray-300 w-2'
                }`}
                aria-label={`Ver actividad ${index + 1}`}
              />
            ))}
          </div>
        </div>

        {/* Social Proof Stats */}
        <div className="mt-12 grid grid-cols-2 md:grid-cols-4 gap-6 max-w-4xl mx-auto">
          <div className="text-center p-4 bg-white rounded-xl shadow-md">
            <div className="text-3xl font-bold text-cyan-600 mb-1">127</div>
            <div className="text-sm text-gray-600">Pedidos hoy</div>
          </div>
          <div className="text-center p-4 bg-white rounded-xl shadow-md">
            <div className="text-3xl font-bold text-green-600 mb-1">43</div>
            <div className="text-sm text-gray-600">En producción</div>
          </div>
          <div className="text-center p-4 bg-white rounded-xl shadow-md">
            <div className="text-3xl font-bold text-purple-600 mb-1">892</div>
            <div className="text-sm text-gray-600">Esta semana</div>
          </div>
          <div className="text-center p-4 bg-white rounded-xl shadow-md">
            <div className="text-3xl font-bold text-orange-600 mb-1">98%</div>
            <div className="text-sm text-gray-600">Satisfacción</div>
          </div>
        </div>
      </div>
    </section>
  );
}
