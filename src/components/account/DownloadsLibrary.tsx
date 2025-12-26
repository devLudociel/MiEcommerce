import { useState, useEffect } from 'react';
import { Download, FileArchive, FileImage, FileText, File, Loader, Package } from 'lucide-react';
import { auth } from '../../lib/firebase';
import { logger } from '../../lib/logger';
import { notify } from '../../lib/notifications';

interface DigitalFile {
  id: string;
  name: string;
  description?: string;
  fileUrl: string;
  fileSize: number;
  fileType: string;
  format: 'image' | 'pdf' | 'zip' | 'other';
  uploadedAt: string;
}

interface DigitalAccess {
  id: string;
  userId: string;
  userEmail: string;
  productId: string;
  productName: string;
  orderId: string;
  files: DigitalFile[];
  purchasedAt: string;
  totalDownloads: number;
  lastDownloadAt?: string;
}

export default function DownloadsLibrary() {
  const [downloads, setDownloads] = useState<DigitalAccess[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloadingFileId, setDownloadingFileId] = useState<string | null>(null);

  useEffect(() => {
    fetchDownloads();
  }, []);

  const fetchDownloads = async () => {
    try {
      setLoading(true);

      const user = auth.currentUser;
      if (!user) {
        notify.error('Debes iniciar sesión para ver tus descargas');
        return;
      }

      const token = await user.getIdToken();

      const response = await fetch('/api/digital/get-my-downloads', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Error al obtener descargas');
      }

      const data = await response.json();
      setDownloads(data.downloads || []);
    } catch (error) {
      logger.error('[DownloadsLibrary] Error fetching downloads', error);
      notify.error('Error al cargar tus descargas');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (digitalAccessId: string, fileId: string, fileName: string) => {
    try {
      setDownloadingFileId(fileId);

      const user = auth.currentUser;
      if (!user) {
        notify.error('Debes iniciar sesión para descargar');
        return;
      }

      const token = await user.getIdToken();

      logger.info('[DownloadsLibrary] Requesting download', { digitalAccessId, fileId });

      const response = await fetch('/api/digital/download-file', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ digitalAccessId, fileId }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al generar descarga');
      }

      // Get the file as a blob (same as invoice download)
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);

      notify.success(`Descargando: ${fileName}`);

      // Refresh downloads to update stats
      fetchDownloads();
    } catch (error) {
      logger.error('[DownloadsLibrary] Error downloading file', error);
      notify.error(error instanceof Error ? error.message : 'Error al descargar archivo');
    } finally {
      setDownloadingFileId(null);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  };

  const getFileIcon = (format: string) => {
    switch (format) {
      case 'image':
        return <FileImage className="w-5 h-5 text-blue-500" />;
      case 'pdf':
        return <FileText className="w-5 h-5 text-red-500" />;
      case 'zip':
        return <FileArchive className="w-5 h-5 text-yellow-500" />;
      default:
        return <File className="w-5 h-5 text-gray-500" />;
    }
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (downloads.length === 0) {
    return (
      <div className="text-center py-12">
        <Package className="w-16 h-16 mx-auto text-gray-400 mb-4" />
        <h3 className="text-xl font-semibold text-gray-900 mb-2">No tienes descargas aún</h3>
        <p className="text-gray-600 mb-6">Los productos digitales que compres aparecerán aquí</p>
        <a
          href="/productos?categoria=digital"
          className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Explorar productos digitales
        </a>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Mis Descargas</h2>
        <p className="text-gray-600">
          Accede a todos tus productos digitales. Descargas ilimitadas, acceso permanente.
        </p>
      </div>

      <div className="space-y-6">
        {downloads.map((download) => (
          <div
            key={download.id}
            className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow"
          >
            {/* Product Header */}
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-1">{download.productName}</h3>
              <div className="flex items-center gap-4 text-sm text-gray-600">
                <span>Comprado: {formatDate(download.purchasedAt)}</span>
                <span>•</span>
                <span>{download.files.length} archivo(s)</span>
                <span>•</span>
                <span>{download.totalDownloads} descarga(s)</span>
              </div>
            </div>

            {/* Files List */}
            <div className="space-y-3">
              {download.files.map((file) => (
                <div
                  key={file.id}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    {getFileIcon(file.format)}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 truncate">{file.name}</p>
                      {file.description && (
                        <p className="text-sm text-gray-600 truncate">{file.description}</p>
                      )}
                      <p className="text-xs text-gray-500">{formatFileSize(file.fileSize)}</p>
                    </div>
                  </div>

                  <button
                    onClick={() => handleDownload(download.id, file.id, file.name)}
                    disabled={downloadingFileId === file.id}
                    className="ml-4 flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {downloadingFileId === file.id ? (
                      <>
                        <Loader className="w-4 h-4 animate-spin" />
                        Descargando...
                      </>
                    ) : (
                      <>
                        <Download className="w-4 h-4" />
                        Descargar
                      </>
                    )}
                  </button>
                </div>
              ))}
            </div>

            {/* Order Reference */}
            <div className="mt-4 pt-4 border-t border-gray-200">
              <p className="text-xs text-gray-500">
                Pedido #{download.orderId.slice(-8)}
                {download.lastDownloadAt && (
                  <span className="ml-4">
                    Última descarga: {formatDate(download.lastDownloadAt)}
                  </span>
                )}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Info Card */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h4 className="font-semibold text-blue-900 mb-2">💡 Información sobre las descargas</h4>
        <ul className="space-y-1 text-sm text-blue-800">
          <li>✓ Descargas ilimitadas de todos tus archivos</li>
          <li>✓ Acceso permanente sin fecha de caducidad</li>
          <li>✓ Los enlaces de descarga son válidos por 1 hora desde que los generas</li>
          <li>✓ Tus archivos están siempre disponibles desde esta página</li>
        </ul>
      </div>
    </div>
  );
}
