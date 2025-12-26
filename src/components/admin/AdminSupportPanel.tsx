// src/components/admin/AdminSupportPanel.tsx
// Admin panel for managing support messages from chat widget

import { useEffect, useState } from 'react';
import { db } from '../../lib/firebase';
import {
  collection,
  onSnapshot,
  updateDoc,
  deleteDoc,
  doc,
  Timestamp,
  query,
  orderBy,
} from 'firebase/firestore';
import { notify } from '../../lib/notifications';
import { logger } from '../../lib/logger';
import {
  MessageCircle,
  Mail,
  Clock,
  CheckCircle,
  XCircle,
  Trash2,
  Eye,
  X,
  Send,
  Filter,
  Search,
  User,
  Calendar,
  AlertCircle,
  Archive,
} from 'lucide-react';
import { useConfirmDialog } from '../../hooks/useConfirmDialog';

// ============================================================================
// TYPES
// ============================================================================

interface SupportMessage {
  id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  userId?: string | null;
  status: 'pending' | 'read' | 'replied' | 'resolved' | 'archived';
  createdAt: Date;
  readAt?: Date;
  repliedAt?: Date;
  adminNotes?: string;
  source: string;
}

type StatusFilter = 'all' | 'pending' | 'read' | 'replied' | 'resolved' | 'archived';

// ============================================================================
// CONSTANTS
// ============================================================================

const STATUS_CONFIG: Record<
  SupportMessage['status'],
  { label: string; color: string; icon: React.ReactNode }
> = {
  pending: {
    label: 'Pendiente',
    color: 'bg-yellow-100 text-yellow-800',
    icon: <Clock className="w-4 h-4" />,
  },
  read: { label: 'Leído', color: 'bg-blue-100 text-blue-800', icon: <Eye className="w-4 h-4" /> },
  replied: {
    label: 'Respondido',
    color: 'bg-purple-100 text-purple-800',
    icon: <Send className="w-4 h-4" />,
  },
  resolved: {
    label: 'Resuelto',
    color: 'bg-green-100 text-green-800',
    icon: <CheckCircle className="w-4 h-4" />,
  },
  archived: {
    label: 'Archivado',
    color: 'bg-gray-100 text-gray-800',
    icon: <Archive className="w-4 h-4" />,
  },
};

// ============================================================================
// COMPONENT
// ============================================================================

export default function AdminSupportPanel() {
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMessage, setSelectedMessage] = useState<SupportMessage | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [adminNotes, setAdminNotes] = useState('');

  const { confirm, ConfirmDialog } = useConfirmDialog();

  // ============================================================================
  // LOAD DATA
  // ============================================================================

  useEffect(() => {
    const q = query(collection(db, 'support_messages'), orderBy('createdAt', 'desc'));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const items = snapshot.docs.map((doc) => {
          const data = doc.data();
          return {
            id: doc.id,
            ...data,
            createdAt: data.createdAt?.toDate() || new Date(),
            readAt: data.readAt?.toDate(),
            repliedAt: data.repliedAt?.toDate(),
          } as SupportMessage;
        });
        setMessages(items);
        setLoading(false);
      },
      (error) => {
        console.error('[AdminSupportPanel] Firestore error:', error.code, error.message);
        logger.error('[AdminSupportPanel] Error loading messages', error);
        setLoading(false);
        notify.error('Error cargando mensajes de soporte');
      }
    );

    return () => unsubscribe();
  }, []);

  // ============================================================================
  // HANDLERS
  // ============================================================================

  const handleUpdateStatus = async (messageId: string, newStatus: SupportMessage['status']) => {
    try {
      const updates: Record<string, unknown> = { status: newStatus };

      if (newStatus === 'read') {
        updates.readAt = Timestamp.now();
      } else if (newStatus === 'replied') {
        updates.repliedAt = Timestamp.now();
      }

      await updateDoc(doc(db, 'support_messages', messageId), updates);
      notify.success(`Estado actualizado a "${STATUS_CONFIG[newStatus].label}"`);
    } catch (error) {
      logger.error('[AdminSupportPanel] Error updating status', error);
      notify.error('Error al actualizar el estado');
    }
  };

  const handleSaveNotes = async (messageId: string) => {
    try {
      await updateDoc(doc(db, 'support_messages', messageId), {
        adminNotes,
      });
      notify.success('Notas guardadas');
    } catch (error) {
      logger.error('[AdminSupportPanel] Error saving notes', error);
      notify.error('Error al guardar las notas');
    }
  };

  const handleDelete = async (messageId: string) => {
    const confirmed = await confirm({
      title: '¿Eliminar mensaje?',
      message: 'Esta acción no se puede deshacer. El mensaje se eliminará permanentemente.',
      type: 'danger',
      confirmText: 'Eliminar',
      cancelText: 'Cancelar',
    });

    if (confirmed) {
      try {
        await deleteDoc(doc(db, 'support_messages', messageId));
        setSelectedMessage(null);
        notify.success('Mensaje eliminado');
      } catch (error) {
        logger.error('[AdminSupportPanel] Error deleting message', error);
        notify.error('Error al eliminar el mensaje');
      }
    }
  };

  const handleOpenMessage = (message: SupportMessage) => {
    setSelectedMessage(message);
    setAdminNotes(message.adminNotes || '');

    // Mark as read if pending
    if (message.status === 'pending') {
      handleUpdateStatus(message.id, 'read');
    }
  };

  const handleReplyByEmail = (message: SupportMessage) => {
    const subject = `Re: ${message.subject || 'Tu consulta en ImprimeArte'}`;
    const body = `Hola ${message.name},\n\nGracias por contactarnos.\n\n---\nTu mensaje:\n${message.message}\n---\n\n`;
    window.location.href = `mailto:${message.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    handleUpdateStatus(message.id, 'replied');
  };

  // ============================================================================
  // FILTER & SEARCH
  // ============================================================================

  const filteredMessages = messages.filter((msg) => {
    // Status filter
    if (statusFilter !== 'all' && msg.status !== statusFilter) {
      return false;
    }

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        msg.name.toLowerCase().includes(query) ||
        msg.email.toLowerCase().includes(query) ||
        msg.subject?.toLowerCase().includes(query) ||
        msg.message.toLowerCase().includes(query)
      );
    }

    return true;
  });

  // Stats
  const stats = {
    total: messages.length,
    pending: messages.filter((m) => m.status === 'pending').length,
    today: messages.filter((m) => {
      const today = new Date();
      return m.createdAt.toDateString() === today.toDateString();
    }).length,
  };

  // ============================================================================
  // RENDER
  // ============================================================================

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <ConfirmDialog />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <MessageCircle className="w-7 h-7 text-cyan-500" />
            Mensajes de Soporte
          </h1>
          <p className="text-gray-500 mt-1">Gestiona las consultas de los clientes</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-cyan-100 rounded-lg">
              <MessageCircle className="w-5 h-5 text-cyan-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total mensajes</p>
              <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <AlertCircle className="w-5 h-5 text-yellow-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Pendientes</p>
              <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <Calendar className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Hoy</p>
              <p className="text-2xl font-bold text-gray-900">{stats.today}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por nombre, email o mensaje..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
            />
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-gray-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
            >
              <option value="all">Todos los estados</option>
              <option value="pending">Pendientes</option>
              <option value="read">Leídos</option>
              <option value="replied">Respondidos</option>
              <option value="resolved">Resueltos</option>
              <option value="archived">Archivados</option>
            </select>
          </div>
        </div>
      </div>

      {/* Messages List */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {filteredMessages.length === 0 ? (
          <div className="p-12 text-center">
            <MessageCircle className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">No hay mensajes que mostrar</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {filteredMessages.map((message) => (
              <div
                key={message.id}
                onClick={() => handleOpenMessage(message)}
                className={`p-4 hover:bg-gray-50 cursor-pointer transition-colors ${
                  message.status === 'pending' ? 'bg-yellow-50/50' : ''
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-gray-900">{message.name}</span>
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs ${STATUS_CONFIG[message.status].color}`}
                      >
                        {STATUS_CONFIG[message.status].icon}
                        {STATUS_CONFIG[message.status].label}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500 mb-1">{message.email}</p>
                    {message.subject && (
                      <p className="text-sm font-medium text-gray-700 mb-1">{message.subject}</p>
                    )}
                    <p className="text-sm text-gray-600 line-clamp-2">{message.message}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-xs text-gray-500">
                      {message.createdAt.toLocaleDateString('es-ES', {
                        day: '2-digit',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Message Detail Modal */}
      {selectedMessage && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50">
              <h2 className="text-lg font-semibold text-gray-900">Detalle del mensaje</h2>
              <button
                onClick={() => setSelectedMessage(null)}
                className="p-1 hover:bg-gray-200 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
              {/* Sender Info */}
              <div className="flex items-start gap-4 mb-6">
                <div className="w-12 h-12 bg-cyan-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <User className="w-6 h-6 text-cyan-600" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900">{selectedMessage.name}</h3>
                  <a
                    href={`mailto:${selectedMessage.email}`}
                    className="text-sm text-cyan-600 hover:underline"
                  >
                    {selectedMessage.email}
                  </a>
                  <p className="text-xs text-gray-500 mt-1">
                    {selectedMessage.createdAt.toLocaleDateString('es-ES', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
                <span
                  className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm ${STATUS_CONFIG[selectedMessage.status].color}`}
                >
                  {STATUS_CONFIG[selectedMessage.status].icon}
                  {STATUS_CONFIG[selectedMessage.status].label}
                </span>
              </div>

              {/* Subject */}
              {selectedMessage.subject && (
                <div className="mb-4">
                  <p className="text-sm text-gray-500 mb-1">Asunto</p>
                  <p className="font-medium text-gray-900">{selectedMessage.subject}</p>
                </div>
              )}

              {/* Message */}
              <div className="mb-6">
                <p className="text-sm text-gray-500 mb-1">Mensaje</p>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-gray-700 whitespace-pre-wrap">{selectedMessage.message}</p>
                </div>
              </div>

              {/* Admin Notes */}
              <div className="mb-6">
                <p className="text-sm text-gray-500 mb-1">
                  Notas internas (solo visible para admins)
                </p>
                <textarea
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 resize-none"
                  placeholder="Añade notas sobre este mensaje..."
                />
                <button
                  onClick={() => handleSaveNotes(selectedMessage.id)}
                  className="mt-2 px-4 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  Guardar notas
                </button>
              </div>

              {/* Status Change */}
              <div>
                <p className="text-sm text-gray-500 mb-2">Cambiar estado</p>
                <div className="flex flex-wrap gap-2">
                  {(Object.keys(STATUS_CONFIG) as SupportMessage['status'][]).map((status) => (
                    <button
                      key={status}
                      onClick={() => handleUpdateStatus(selectedMessage.id, status)}
                      className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm transition-colors ${
                        selectedMessage.status === status
                          ? STATUS_CONFIG[status].color
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {STATUS_CONFIG[status].icon}
                      {STATUS_CONFIG[status].label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between p-4 border-t border-gray-200 bg-gray-50">
              <button
                onClick={() => handleDelete(selectedMessage.id)}
                className="inline-flex items-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                Eliminar
              </button>
              <div className="flex gap-2">
                <button
                  onClick={() => setSelectedMessage(null)}
                  className="px-4 py-2 text-gray-600 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  Cerrar
                </button>
                <button
                  onClick={() => handleReplyByEmail(selectedMessage)}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-cyan-500 text-white rounded-lg hover:bg-cyan-600 transition-colors"
                >
                  <Mail className="w-4 h-4" />
                  Responder por email
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
