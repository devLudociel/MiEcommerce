import { useState, useEffect, useMemo } from 'react';
import {
  Download,
  FileArchive,
  FileImage,
  FileText,
  File,
  Loader,
  Package,
  Search,
  Filter,
  X,
  Eye,
  Clock,
  HardDrive,
  ShoppingBag,
  Calendar,
  ArrowUpDown,
  ChevronDown,
} from 'lucide-react';
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

type SortOption = 'date-desc' | 'date-asc' | 'name-asc' | 'name-desc';
type FilterOption = 'all' | 'image' | 'pdf' | 'zip' | 'other';

export default function DownloadsLibrary() {
  const [downloads, setDownloads] = useState<DigitalAccess[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloadingFileId, setDownloadingFileId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<FilterOption>('all');
  const [sortBy, setSortBy] = useState<SortOption>('date-desc');
  const [previewImage, setPreviewImage] = useState<{ url: string; name: string } | null>(null);
  const [showFilters, setShowFilters] = useState(false);

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

  const handleDownloadAll = async (download: DigitalAccess) => {
    notify.info(`Descargando ${download.files.length} archivo(s)...`);
    for (const file of download.files) {
      await handleDownload(download.id, file.id, file.name);
      // Small delay between downloads to avoid overwhelming the system
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  };

  const getTotalSize = (files: DigitalFile[]): number => {
    return files.reduce((sum, file) => sum + file.fileSize, 0);
  };

  const getFileIcon = (format: string, className: string = 'w-5 h-5') => {
    switch (format) {
      case 'image':
        return <FileImage className={`${className} text-blue-500`} />;
      case 'pdf':
        return <FileText className={`${className} text-red-500`} />;
      case 'zip':
        return <FileArchive className={`${className} text-yellow-500`} />;
      default:
        return <File className={`${className} text-gray-500`} />;
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

  const formatDateShort = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  // Filtered and sorted downloads
  const filteredDownloads = useMemo(() => {
    let filtered = downloads;

    // Apply search
    if (searchQuery) {
      filtered = filtered.filter(
        (download) =>
          download.productName.toLowerCase().includes(searchQuery.toLowerCase()) ||
          download.files.some((file) => file.name.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    }

    // Apply filter by type
    if (filterType !== 'all') {
      filtered = filtered.filter((download) =>
        download.files.some((file) => file.format === filterType)
      );
    }

    // Apply sorting
    const sorted = [...filtered].sort((a, b) => {
      switch (sortBy) {
        case 'date-desc':
          return new Date(b.purchasedAt).getTime() - new Date(a.purchasedAt).getTime();
        case 'date-asc':
          return new Date(a.purchasedAt).getTime() - new Date(b.purchasedAt).getTime();
        case 'name-asc':
          return a.productName.localeCompare(b.productName);
        case 'name-desc':
          return b.productName.localeCompare(a.productName);
        default:
          return 0;
      }
    });

    return sorted;
  }, [downloads, searchQuery, filterType, sortBy]);

  // Stats
  const stats = useMemo(() => {
    const totalProducts = downloads.length;
    const totalFiles = downloads.reduce((sum, d) => sum + d.files.length, 0);
    const totalSize = downloads.reduce((sum, d) => sum + getTotalSize(d.files), 0);
    const totalDownloads = downloads.reduce((sum, d) => sum + d.totalDownloads, 0);

    return { totalProducts, totalFiles, totalSize, totalDownloads };
  }, [downloads]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader className="w-12 h-12 animate-spin text-blue-600 mb-4" />
        <p className="text-gray-600">Cargando tus descargas...</p>
      </div>
    );
  }

  if (downloads.length === 0) {
    return (
      <div className="text-center py-16 px-4">
        <div className="max-w-md mx-auto">
          <div className="w-24 h-24 mx-auto mb-6 bg-gradient-to-br from-blue-100 to-purple-100 rounded-full flex items-center justify-center">
            <Package className="w-12 h-12 text-blue-600" />
          </div>
          <h3 className="text-2xl font-bold text-gray-900 mb-3">
            No tienes descargas aún
          </h3>
          <p className="text-gray-600 mb-8 leading-relaxed">
            Los productos digitales que compres aparecerán aquí. Tendrás acceso permanente e
            ilimitado a todos tus archivos.
          </p>
          <a
            href="/productos/digitales"
            className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-semibold hover:from-blue-700 hover:to-purple-700 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105"
          >
            <ShoppingBag className="w-5 h-5" />
            Explorar Productos Digitales
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-6 md:p-8 text-white shadow-xl">
        <h1 className="text-3xl md:text-4xl font-black mb-2">📚 Mi Biblioteca Digital</h1>
        <p className="text-blue-100 text-lg">
          Accede a todos tus productos digitales. Descargas ilimitadas, para siempre.
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        <div className="bg-white rounded-xl p-4 md:p-6 border border-gray-200 hover:border-blue-300 transition-colors">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <ShoppingBag className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl md:text-3xl font-bold text-gray-900">{stats.totalProducts}</p>
              <p className="text-xs md:text-sm text-gray-600">Productos</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 md:p-6 border border-gray-200 hover:border-purple-300 transition-colors">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <File className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-2xl md:text-3xl font-bold text-gray-900">{stats.totalFiles}</p>
              <p className="text-xs md:text-sm text-gray-600">Archivos</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 md:p-6 border border-gray-200 hover:border-green-300 transition-colors">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <HardDrive className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl md:text-3xl font-bold text-gray-900">
                {formatFileSize(stats.totalSize)}
              </p>
              <p className="text-xs md:text-sm text-gray-600">Tamaño Total</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 md:p-6 border border-gray-200 hover:border-orange-300 transition-colors">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
              <Download className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <p className="text-2xl md:text-3xl font-bold text-gray-900">{stats.totalDownloads}</p>
              <p className="text-xs md:text-sm text-gray-600">Descargas</p>
            </div>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-xl p-4 md:p-6 border border-gray-200 space-y-4">
        {/* Search Bar */}
        <div className="flex flex-col md:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar productos o archivos..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>

          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-6 py-3 rounded-lg border-2 font-medium transition-all ${
              showFilters || filterType !== 'all'
                ? 'border-blue-500 bg-blue-50 text-blue-700'
                : 'border-gray-300 hover:border-gray-400 text-gray-700'
            }`}
          >
            <Filter className="w-5 h-5" />
            <span className="hidden md:inline">Filtros</span>
            {filterType !== 'all' && (
              <span className="w-2 h-2 bg-blue-600 rounded-full"></span>
            )}
          </button>
        </div>

        {/* Filter Options */}
        {showFilters && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 pt-4 border-t border-gray-200 animate-in slide-in-from-top duration-200">
            {(['all', 'image', 'pdf', 'zip', 'other'] as FilterOption[]).map((type) => (
              <button
                key={type}
                onClick={() => setFilterType(type)}
                className={`px-4 py-3 rounded-lg font-medium transition-all ${
                  filterType === type
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {type === 'all' && 'Todos'}
                {type === 'image' && '🖼️ Imágenes'}
                {type === 'pdf' && '📄 PDFs'}
                {type === 'zip' && '📦 ZIPs'}
                {type === 'other' && '📁 Otros'}
              </button>
            ))}
          </div>
        )}

        {/* Sort Options */}
        <div className="flex items-center gap-3 pt-4 border-t border-gray-200">
          <ArrowUpDown className="w-5 h-5 text-gray-400" />
          <span className="text-sm font-medium text-gray-700">Ordenar por:</span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortOption)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm"
          >
            <option value="date-desc">Más reciente</option>
            <option value="date-asc">Más antiguo</option>
            <option value="name-asc">Nombre (A-Z)</option>
            <option value="name-desc">Nombre (Z-A)</option>
          </select>
        </div>
      </div>

      {/* Results Count */}
      {(searchQuery || filterType !== 'all') && (
        <div className="flex items-center justify-between px-4 py-3 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-blue-800 font-medium">
            {filteredDownloads.length} resultado{filteredDownloads.length !== 1 ? 's' : ''}{' '}
            encontrado{filteredDownloads.length !== 1 ? 's' : ''}
          </p>
          {(searchQuery || filterType !== 'all') && (
            <button
              onClick={() => {
                setSearchQuery('');
                setFilterType('all');
              }}
              className="text-blue-600 hover:text-blue-700 font-medium text-sm"
            >
              Limpiar filtros
            </button>
          )}
        </div>
      )}

      {/* Downloads List */}
      {filteredDownloads.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
          <Search className="w-16 h-16 mx-auto text-gray-300 mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            No se encontraron resultados
          </h3>
          <p className="text-gray-600 mb-6">
            Intenta cambiar los filtros o el término de búsqueda
          </p>
          <button
            onClick={() => {
              setSearchQuery('');
              setFilterType('all');
            }}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Ver todo
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredDownloads.map((download) => (
            <div
              key={download.id}
              className="bg-white border-2 border-gray-200 rounded-2xl overflow-hidden hover:border-blue-300 hover:shadow-lg transition-all duration-300"
            >
              {/* Product Header */}
              <div className="bg-gradient-to-r from-gray-50 to-blue-50 px-6 py-4 border-b border-gray-200">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-gray-900 mb-2">
                      {download.productName}
                    </h3>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-gray-600">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        {formatDateShort(download.purchasedAt)}
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <File className="w-4 h-4" />
                        {download.files.length} archivo{download.files.length !== 1 ? 's' : ''}
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <HardDrive className="w-4 h-4" />
                        {formatFileSize(getTotalSize(download.files))}
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <Download className="w-4 h-4" />
                        {download.totalDownloads} descarga{download.totalDownloads !== 1 ? 's' : ''}
                      </span>
                    </div>
                  </div>

                  {download.files.length > 1 && (
                    <button
                      onClick={() => handleDownloadAll(download)}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm flex items-center gap-2 whitespace-nowrap"
                    >
                      <Download className="w-4 h-4" />
                      Descargar Todo
                    </button>
                  )}
                </div>
              </div>

              {/* Files Grid */}
              <div className="p-6">
                <div className="grid grid-cols-1 gap-3">
                  {download.files.map((file) => (
                    <div
                      key={file.id}
                      className="group relative flex flex-col sm:flex-row items-start sm:items-center gap-4 p-4 bg-gray-50 hover:bg-blue-50 rounded-xl transition-all duration-300 border-2 border-transparent hover:border-blue-200"
                    >
                      {/* File Icon/Preview */}
                      <div className="flex-shrink-0">
                        {file.format === 'image' ? (
                          <div className="relative">
                            <img
                              src={file.fileUrl}
                              alt={file.name}
                              className="w-16 h-16 object-cover rounded-lg border-2 border-gray-200 group-hover:border-blue-300 transition-colors"
                            />
                            <button
                              onClick={() => setPreviewImage({ url: file.fileUrl, name: file.name })}
                              className="absolute inset-0 bg-black bg-opacity-0 hover:bg-opacity-40 rounded-lg transition-all duration-300 flex items-center justify-center opacity-0 group-hover:opacity-100"
                            >
                              <Eye className="w-6 h-6 text-white" />
                            </button>
                          </div>
                        ) : (
                          <div className="w-16 h-16 bg-white rounded-lg border-2 border-gray-200 group-hover:border-blue-300 flex items-center justify-center transition-colors">
                            {getFileIcon(file.format, 'w-8 h-8')}
                          </div>
                        )}
                      </div>

                      {/* File Info */}
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-gray-900 mb-1 truncate group-hover:text-blue-600 transition-colors">
                          {file.name}
                        </h4>
                        {file.description && (
                          <p className="text-sm text-gray-600 mb-1 line-clamp-2">{file.description}</p>
                        )}
                        <div className="flex items-center gap-3 text-xs text-gray-500">
                          <span className="font-medium">{formatFileSize(file.fileSize)}</span>
                          <span>•</span>
                          <span className="uppercase">{file.format}</span>
                        </div>
                      </div>

                      {/* Download Button */}
                      <button
                        onClick={() => handleDownload(download.id, file.id, file.name)}
                        disabled={downloadingFileId === file.id}
                        className="flex-shrink-0 w-full sm:w-auto px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 font-medium flex items-center justify-center gap-2 shadow-md hover:shadow-lg transform hover:scale-105"
                      >
                        {downloadingFileId === file.id ? (
                          <>
                            <Loader className="w-5 h-5 animate-spin" />
                            <span>Descargando...</span>
                          </>
                        ) : (
                          <>
                            <Download className="w-5 h-5" />
                            <span>Descargar</span>
                          </>
                        )}
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Footer */}
              <div className="px-6 py-3 bg-gray-50 border-t border-gray-200">
                <div className="flex flex-wrap items-center gap-4 text-xs text-gray-500">
                  <span className="font-mono">Pedido #{download.orderId.slice(-8)}</span>
                  {download.lastDownloadAt && (
                    <>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        Última descarga: {formatDateShort(download.lastDownloadAt)}
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Info Card */}
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 border-2 border-blue-200 rounded-2xl p-6">
        <h4 className="font-bold text-blue-900 mb-3 flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <span className="text-white">💡</span>
          </div>
          Información sobre las descargas
        </h4>
        <ul className="space-y-2 text-sm text-blue-800">
          <li className="flex items-start gap-2">
            <span className="text-green-600 font-bold">✓</span>
            <span>Descargas ilimitadas de todos tus archivos, sin restricciones</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-green-600 font-bold">✓</span>
            <span>Acceso permanente sin fecha de caducidad</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-green-600 font-bold">✓</span>
            <span>Descarga directa con diálogo de guardado del sistema</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-green-600 font-bold">✓</span>
            <span>Tus archivos están siempre disponibles desde esta página</span>
          </li>
        </ul>
      </div>

      {/* Image Preview Modal */}
      {previewImage && (
        <div
          className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center p-4 animate-in fade-in duration-300"
          onClick={() => setPreviewImage(null)}
        >
          <button
            onClick={() => setPreviewImage(null)}
            className="absolute top-4 right-4 w-12 h-12 bg-white bg-opacity-20 hover:bg-opacity-30 rounded-full flex items-center justify-center text-white transition-all"
          >
            <X className="w-6 h-6" />
          </button>
          <div className="max-w-6xl max-h-[90vh] w-full" onClick={(e) => e.stopPropagation()}>
            <img
              src={previewImage.url}
              alt={previewImage.name}
              className="w-full h-full object-contain rounded-lg"
            />
            <p className="text-white text-center mt-4 text-lg font-medium">{previewImage.name}</p>
          </div>
        </div>
      )}
    </div>
  );
}
