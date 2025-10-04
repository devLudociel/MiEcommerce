import { useState } from 'react';

interface File {
  id: string;
  name: string;
  type: 'image' | 'document' | 'video' | 'other';
  size: number;
  uploadedAt: string;
  url: string;
}

export default function FilesPanel() {
  const [files] = useState<File[]>([
    {
      id: '1',
      name: 'presentacion-proyecto.pdf',
      type: 'document',
      size: 2500000,
      uploadedAt: '2024-01-20',
      url: '#'
    },
    {
      id: '2',
      name: 'logo-final.png',
      type: 'image',
      size: 850000,
      uploadedAt: '2024-01-18',
      url: '#'
    },
    {
      id: '3',
      name: 'video-demo.mp4',
      type: 'video',
      size: 15000000,
      uploadedAt: '2024-01-15',
      url: '#'
    }
  ]);

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1048576) return (bytes / 1024).toFixed(2) + ' KB';
    return (bytes / 1048576).toFixed(2) + ' MB';
  };

  const getFileTypeColor = (type: string) => {
    switch (type) {
      case 'image': return 'text-cyan-500';
      case 'document': return 'text-magenta-500';
      case 'video': return 'text-purple';
      case 'other': return 'text-gray-500';
      default: return 'text-gray-500';
    }
  };

  const getFileTypeIcon = (type: string) => {
    switch (type) {
      case 'image': return '🖼️';
      case 'document': return '📄';
      case 'video': return '🎥';
      case 'other': return '📦';
      default: return '📄';
    }
  };

  const totalSize = files.reduce((acc, file) => acc + file.size, 0);
  const storageLimit = 5 * 1024 * 1024 * 1024; // 5 GB
  const storagePercentage = (totalSize / storageLimit) * 100;

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-3xl font-bold text-gradient-primary">Mis Archivos</h2>
        <button className="btn btn-primary">
          + Subir Archivo
        </button>
      </div>

      {/* Storage indicator */}
      <div className="card card-cyan p-6">
        <div className="mb-3">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-gray-700">Espacio usado</span>
            <span className="text-sm font-bold text-cyan-600">
              {formatFileSize(totalSize)} / {formatFileSize(storageLimit)}
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div 
              className="bg-gradient-primary h-3 rounded-full transition-all"
              style={{ width: `${Math.min(storagePercentage, 100)}%` }}
            />
          </div>
        </div>
        <p className="text-xs text-gray-500">
          {(100 - storagePercentage).toFixed(1)}% disponible
        </p>
      </div>

      {/* Files list */}
      <div className="space-y-4">
        {files.map((file) => (
          <div key={file.id} className="card p-6">
            <div className="flex items-center gap-4">
              <div className={`text-3xl ${getFileTypeColor(file.type)}`}>
                {getFileTypeIcon(file.type)}
              </div>
              
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900 mb-1">
                  {file.name}
                </h3>
                <div className="flex items-center gap-3 text-sm text-gray-500">
                  <span className={getFileTypeColor(file.type)}>
                    {file.type}
                  </span>
                  <span>•</span>
                  <span>{formatFileSize(file.size)}</span>
                  <span>•</span>
                  <span>{new Date(file.uploadedAt).toLocaleDateString()}</span>
                </div>
              </div>

              <div className="flex gap-2">
                <button className="btn btn-outline btn-sm">Ver</button>
                <button className="btn btn-ghost btn-sm">Descargar</button>
                <button className="btn btn-ghost btn-sm text-red-500">Eliminar</button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {files.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500 mb-4">No tienes archivos subidos</p>
          <button className="btn btn-primary">Sube tu primer archivo</button>
        </div>
      )}
    </div>
  );
}