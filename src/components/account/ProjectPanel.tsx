import { useState } from 'react';

interface Project {
  id: string;
  name: string;
  status: 'active' | 'completed' | 'draft';
  createdAt: string;
  thumbnail?: string;
}

export default function ProjectsPanel() {
  const [projects] = useState<Project[]>([
    {
      id: '1',
      name: 'Proyecto Web Corporativo',
      status: 'active',
      createdAt: '2024-01-15',
      thumbnail: 'https://via.placeholder.com/150',
    },
    {
      id: '2',
      name: 'Diseño de Logo',
      status: 'completed',
      createdAt: '2024-01-10',
      thumbnail: 'https://via.placeholder.com/150',
    },
  ]);

  const getStatusClass = (status: string) => {
    switch (status) {
      case 'active':
        return 'badge-new';
      case 'completed':
        return 'badge-sale';
      case 'draft':
        return 'text-gray-500';
      default:
        return '';
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-3xl font-bold text-gradient-primary">Mis Proyectos</h2>
        <button className="btn btn-primary">+ Nuevo Proyecto</button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-1 gap-8">
        {projects.map((project) => (
          <div key={project.id} className="card card-cyan p-6">
            <div className="flex gap-4">
              {project.thumbnail && (
                <img
                  src={project.thumbnail}
                  alt={project.name}
                  className="w-24 h-24 rounded-lg object-cover"
                />
              )}
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{project.name}</h3>
                <span className={`badge ${getStatusClass(project.status)}`}>{project.status}</span>
                <p className="text-sm text-gray-500 mt-2">
                  Creado: {new Date(project.createdAt).toLocaleDateString()}
                </p>
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <button className="btn btn-outline btn-sm flex-1">Ver</button>
              <button className="btn btn-ghost btn-sm flex-1">Editar</button>
            </div>
          </div>
        ))}
      </div>

      {projects.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500 mb-4">No tienes proyectos todavía</p>
          <button className="btn btn-primary">Crear tu primer proyecto</button>
        </div>
      )}
    </div>
  );
}
