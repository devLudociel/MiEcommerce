import { useState } from 'react';

interface BrandElement {
  id: string;
  type: 'logo' | 'color' | 'typography' | 'icon';
  name: string;
  value: string;
  format?: string;
}

export default function BrandKitPanel() {
  const [brandElements] = useState<BrandElement[]>([
    {
      id: '1',
      type: 'logo',
      name: 'Logo Principal',
      value: 'logo-principal.svg',
      format: 'SVG'
    },
    {
      id: '2',
      type: 'color',
      name: 'Color Primario',
      value: '#00d7fa',
      format: 'HEX'
    },
    {
      id: '3',
      type: 'typography',
      name: 'Tipografía Principal',
      value: 'Inter',
      format: 'Google Fonts'
    }
  ]);

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'logo': return '🎨';
      case 'color': return '🎨';
      case 'typography': return '📝';
      case 'icon': return '✨';
      default: return '📦';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'logo': return 'border-cyan-200';
      case 'color': return 'border-magenta-200';
      case 'typography': return 'border-yellow-200';
      case 'icon': return 'border-purple';
      default: return 'border-gray-200';
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-3xl font-bold text-gradient-primary">Kit de Marca</h2>
        <button className="btn btn-accent">
          + Añadir Elemento
        </button>
      </div>

      <div className="card bg-gradient-rainbow text-white p-8 mb-8">
        <h3 className="text-xl font-bold mb-2">Tu Identidad de Marca</h3>
        <p className="text-white/90">
          Centraliza todos los elementos visuales de tu marca en un solo lugar
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-1 gap-8">
        {brandElements.map((element) => (
          <div 
            key={element.id} 
            className={`card border-2 ${getTypeColor(element.type)} p-6`}
          >
            <div className="flex items-center gap-3 mb-4">
              <span className="text-2xl">{getTypeIcon(element.type)}</span>
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider">
                  {element.type}
                </p>
                <h3 className="font-semibold text-gray-900">
                  {element.name}
                </h3>
              </div>
            </div>

            {element.type === 'color' && (
              <div className="mb-4">
                <div 
                  className="w-full h-24 rounded-lg border-2 border-gray-200"
                  style={{ backgroundColor: element.value }}
                />
                <p className="text-sm font-mono text-gray-700 mt-3">
                  {element.value}
                </p>
              </div>
            )}

            {element.type !== 'color' && (
              <div className="mb-4">
                <p className="text-sm text-gray-700 font-medium">
                  {element.value}
                </p>
                {element.format && (
                  <p className="text-xs text-gray-500 mt-2">
                    Formato: {element.format}
                  </p>
                )}
              </div>
            )}

            <div className="flex gap-2 mt-4">
              <button className="btn btn-outline btn-sm flex-1">Editar</button>
              <button className="btn btn-ghost btn-sm flex-1">Descargar</button>
            </div>
          </div>
        ))}
      </div>

      {brandElements.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500 mb-4">Tu kit de marca está vacío</p>
          <button className="btn btn-accent">Comenzar a construir tu marca</button>
        </div>
      )}
    </div>
  );
}