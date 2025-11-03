import { useState, useEffect } from 'react';
import {
  ref,
  listAll,
  getMetadata,
  deleteObject,
  uploadBytes,
  getDownloadURL,
} from 'firebase/storage';
import { storage, auth } from '../../lib/firebase';
import AccessibleModal from '../common/AccessibleModal';

interface File {
  id: string;
  name: string;
  displayName: string;
  type: 'image' | 'document' | 'video' | 'other';
  size: number;
  uploadedAt: string;
  url: string;
  downloadUrl: string;
  path: string;
}

export default function FilesPanel() {
  const [files, setFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ [key: string]: number }>({});

  // Modal state
  const [modal, setModal] = useState<{
    isOpen: boolean;
    type: 'info' | 'warning' | 'error' | 'success';
    title: string;
    message: string;
  }>({
    isOpen: false,
    type: 'info',
    title: '',
    message: '',
  });

  const showModal = (
    type: 'info' | 'warning' | 'error' | 'success',
    title: string,
    message: string
  ) => {
    setModal({ isOpen: true, type, title, message });
  };

  const closeModal = () => {
    setModal({ ...modal, isOpen: false });
  };

  // Cargar archivos al montar
  useEffect(() => {
    loadFiles();
  }, []);

  const loadFiles = async () => {
    try {
      setLoading(true);
      const user = auth.currentUser;
      if (!user) return;

      const userFilesRef = ref(storage, `users/${user.uid}/files`);
      const filesList = await listAll(userFilesRef);

      const filesData: File[] = [];

      for (const fileRef of filesList.items) {
        const metadata = await getMetadata(fileRef);
        const downloadUrl = await getDownloadURL(fileRef);

        // Extraer nombre sin timestamp: "1234567890-foto.png" -> "foto.png"
        const displayName = fileRef.name.replace(/^\d+-/, '');

        filesData.push({
          id: fileRef.name,
          name: fileRef.name,
          displayName: displayName,
          type: getFileType(fileRef.name),
          size: metadata.size || 0,
          uploadedAt: metadata.timeCreated || new Date().toISOString(),
          url: fileRef.fullPath,
          downloadUrl: downloadUrl,
          path: fileRef.fullPath,
        });
      }

      setFiles(
        filesData.sort(
          (a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime()
        )
      );
    } catch (error) {
      console.error('Error cargando archivos:', error);
    } finally {
      setLoading(false);
    }
  };

  const getFileType = (filename: string): 'image' | 'document' | 'video' | 'other' => {
    const ext = filename.split('.').pop()?.toLowerCase() || '';
    if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) return 'image';
    if (['pdf', 'doc', 'docx', 'txt', 'xlsx'].includes(ext)) return 'document';
    if (['mp4', 'avi', 'mov', 'mkv'].includes(ext)) return 'video';
    return 'other';
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFiles = event.target.files;
    if (!uploadedFiles || uploadedFiles.length === 0) return;

    try {
      setUploading(true);
      const user = auth.currentUser;
      if (!user) {
        showModal(
          'warning',
          'Autenticación requerida',
          'Debes estar autenticado para subir archivos.'
        );
        return;
      }

      for (let i = 0; i < uploadedFiles.length; i++) {
        const file = uploadedFiles[i];
        const timestamp = Date.now();
        const uniqueName = `${timestamp}-${file.name}`;
        const fileRef = ref(storage, `users/${user.uid}/files/${uniqueName}`);

        await uploadBytes(fileRef, file);
        console.log(`Archivo subido: ${file.name}`);
      }

      // Recargar la lista después de subir
      await loadFiles();

      // Limpiar el input
      event.target.value = '';
    } catch (error) {
      console.error('Error subiendo archivo:', error);
      showModal(
        'error',
        'Error al subir',
        'No se pudo subir el archivo. Por favor, intenta de nuevo.'
      );
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (filePath: string) => {
    try {
      const fileRef = ref(storage, filePath);
      await deleteObject(fileRef);
      setFiles(files.filter((f) => f.path !== filePath));
    } catch (error) {
      console.error('Error eliminando archivo:', error);
    }
  };

  const handleDownload = async (downloadUrl: string, fileName: string) => {
    try {
      const response = await fetch(downloadUrl);
      const blob = await response.blob();
      const urlBlob = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = urlBlob;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(urlBlob);
    } catch (error) {
      console.error('Error descargando archivo:', error);
      showModal(
        'error',
        'Error al descargar',
        'No se pudo descargar el archivo. Por favor, intenta de nuevo.'
      );
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1048576) return (bytes / 1024).toFixed(2) + ' KB';
    return (bytes / 1048576).toFixed(2) + ' MB';
  };

  const getFileTypeColor = (type: string) => {
    switch (type) {
      case 'image':
        return 'text-cyan-500';
      case 'document':
        return 'text-magenta-500';
      case 'video':
        return 'text-purple';
      case 'other':
        return 'text-gray-500';
      default:
        return 'text-gray-500';
    }
  };

  const getFileTypeIcon = (type: string) => {
    switch (type) {
      case 'image':
        return '🖼️';
      case 'document':
        return '📄';
      case 'video':
        return '🎥';
      case 'other':
        return '📦';
      default:
        return '📄';
    }
  };

  const totalSize = files.reduce((acc, file) => acc + file.size, 0);
  const storageLimit = 5 * 1024 * 1024 * 1024; // 5 GB
  const storagePercentage = (totalSize / storageLimit) * 100;

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <div className="w-12 h-12 rounded-full border-4 border-gray-200 border-t-cyan-500 animate-spin mb-4"></div>
        <p className="text-gray-600">Cargando archivos...</p>
      </div>
    );
  }

  return (
    <>
      <AccessibleModal
        isOpen={modal.isOpen}
        onClose={closeModal}
        title={modal.title}
        type={modal.type}
      >
        {modal.message}
      </AccessibleModal>

      <div className="space-y-8">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-3xl font-bold text-gradient-primary">Mis Archivos</h2>
          <label
            className="btn btn-primary cursor-pointer"
            style={{ cursor: uploading ? 'not-allowed' : 'pointer', opacity: uploading ? 0.6 : 1 }}
          >
            {uploading ? 'Subiendo...' : '+ Subir Archivo'}
            <input
              type="file"
              multiple
              accept="image/*,.pdf,.doc,.docx,.txt,.xlsx,.mp4,.avi,.mov,.mkv"
              onChange={handleFileUpload}
              disabled={uploading}
              className="hidden"
            />
          </label>
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
        {files.length > 0 ? (
          <div className="space-y-4">
            {files.map((file) => (
              <div key={file.id} className="card p-6">
                <div className="flex items-center gap-4">
                  {/* Miniatura o icono */}
                  <div className="w-20 h-20 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0 overflow-hidden">
                    {file.type === 'image' ? (
                      <img
                        src={file.downloadUrl}
                        alt={file.displayName}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className={`text-3xl ${getFileTypeColor(file.type)}`}>
                        {getFileTypeIcon(file.type)}
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 mb-1 truncate">
                      {file.displayName}
                    </h3>
                    <div className="flex items-center gap-3 text-sm text-gray-500 flex-wrap">
                      <span className={getFileTypeColor(file.type)}>{file.type}</span>
                      <span>•</span>
                      <span>{formatFileSize(file.size)}</span>
                      <span>•</span>
                      <span>{new Date(file.uploadedAt).toLocaleDateString()}</span>
                    </div>
                  </div>

                  <div className="flex gap-2 flex-shrink-0">
                    <button
                      className="btn btn-outline btn-sm"
                      onClick={() => handleDownload(file.downloadUrl, file.displayName)}
                    >
                      Descargar
                    </button>
                    <button
                      className="btn btn-ghost btn-sm text-red-500"
                      onClick={() => handleDelete(file.path)}
                    >
                      Eliminar
                    </button>
                  </div>
                </div>
              </div>
            ))}

            {uploading && (
              <div className="card p-6 border-2 border-cyan-300 bg-cyan-50">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full border-4 border-gray-200 border-t-cyan-500 animate-spin flex-shrink-0"></div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-gray-900">Subiendo archivo...</h4>
                    <p className="text-sm text-gray-600 mt-1">
                      Por favor espera, no cierres esta ventana
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-gray-500 mb-4">No tienes archivos subidos</p>
            <label className="btn btn-primary cursor-pointer">
              Sube tu primer archivo
              <input
                type="file"
                multiple
                accept="image/*,.pdf,.doc,.docx,.txt,.xlsx,.mp4,.avi,.mov,.mkv"
                onChange={handleFileUpload}
                disabled={uploading}
                className="hidden"
              />
            </label>
          </div>
        )}
      </div>
    </>
  );
}
