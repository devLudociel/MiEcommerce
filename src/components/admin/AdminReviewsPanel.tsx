// src/components/admin/AdminReviewsPanel.tsx
// Panel de administración para moderar reseñas de clientes

import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import {
  subscribeToReviews,
  approveReview,
  rejectReview,
  deleteReview,
  toggleFeatured,
  addBusinessResponse,
  getReviewStats,
  formatReviewDate,
  getTimeAgo,
  getInitials,
  type CustomerReview,
  type ReviewStatus,
  type ReviewStats
} from '../../lib/reviews';

type TabType = 'pending' | 'approved' | 'rejected' | 'all';

export default function AdminReviewsPanel() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('pending');
  const [reviews, setReviews] = useState<CustomerReview[]>([]);
  const [stats, setStats] = useState<ReviewStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());
  const [expandedReview, setExpandedReview] = useState<string | null>(null);
  const [responseText, setResponseText] = useState('');
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectModal, setShowRejectModal] = useState<string | null>(null);

  // Load reviews
  useEffect(() => {
    const unsubscribe = subscribeToReviews((data) => {
      setReviews(data);
      setIsLoading(false);
    });

    // Load stats
    getReviewStats().then(setStats);

    return () => unsubscribe();
  }, []);

  // Refresh stats when reviews change
  useEffect(() => {
    getReviewStats().then(setStats);
  }, [reviews]);

  // Filter reviews by tab
  const filteredReviews = reviews.filter(review => {
    if (activeTab === 'all') return true;
    return review.status === activeTab;
  });

  // Handle approve
  const handleApprove = async (reviewId: string, featured: boolean = false) => {
    if (!user?.uid) return;

    setProcessingIds(prev => new Set(prev).add(reviewId));
    try {
      await approveReview(reviewId, user.uid, featured);
    } catch (error) {
      console.error('Error approving review:', error);
    } finally {
      setProcessingIds(prev => {
        const next = new Set(prev);
        next.delete(reviewId);
        return next;
      });
    }
  };

  // Handle reject
  const handleReject = async (reviewId: string) => {
    if (!user?.uid) return;

    setProcessingIds(prev => new Set(prev).add(reviewId));
    try {
      await rejectReview(reviewId, user.uid, rejectReason);
      setShowRejectModal(null);
      setRejectReason('');
    } catch (error) {
      console.error('Error rejecting review:', error);
    } finally {
      setProcessingIds(prev => {
        const next = new Set(prev);
        next.delete(reviewId);
        return next;
      });
    }
  };

  // Handle delete
  const handleDelete = async (reviewId: string) => {
    if (!confirm('¿Estás seguro de que quieres eliminar esta reseña permanentemente?')) return;

    setProcessingIds(prev => new Set(prev).add(reviewId));
    try {
      await deleteReview(reviewId);
    } catch (error) {
      console.error('Error deleting review:', error);
    } finally {
      setProcessingIds(prev => {
        const next = new Set(prev);
        next.delete(reviewId);
        return next;
      });
    }
  };

  // Handle toggle featured
  const handleToggleFeatured = async (reviewId: string, currentFeatured: boolean) => {
    setProcessingIds(prev => new Set(prev).add(reviewId));
    try {
      await toggleFeatured(reviewId, !currentFeatured);
    } catch (error) {
      console.error('Error toggling featured:', error);
    } finally {
      setProcessingIds(prev => {
        const next = new Set(prev);
        next.delete(reviewId);
        return next;
      });
    }
  };

  // Handle business response
  const handleAddResponse = async (reviewId: string) => {
    if (!user?.uid || !responseText.trim()) return;

    setProcessingIds(prev => new Set(prev).add(reviewId));
    try {
      await addBusinessResponse(reviewId, responseText.trim(), user.uid);
      setResponseText('');
      setExpandedReview(null);
    } catch (error) {
      console.error('Error adding response:', error);
    } finally {
      setProcessingIds(prev => {
        const next = new Set(prev);
        next.delete(reviewId);
        return next;
      });
    }
  };

  // Render stars
  const renderStars = (rating: number) => {
    return (
      <span className="text-yellow-400">
        {'⭐'.repeat(rating)}{'☆'.repeat(5 - rating)}
      </span>
    );
  };

  // Get status badge
  const getStatusBadge = (status: ReviewStatus) => {
    const badges = {
      pending: 'bg-yellow-100 text-yellow-800',
      approved: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800'
    };
    const labels = {
      pending: 'Pendiente',
      approved: 'Aprobada',
      rejected: 'Rechazada'
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${badges[status]}`}>
        {labels[status]}
      </span>
    );
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-cyan-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 mt-32">
      <div className="container mx-auto px-4 max-w-6xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800">Reseñas de Clientes</h1>
          <p className="text-gray-600 mt-1">Modera y gestiona las reseñas de tus clientes</p>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
            <div className="bg-white rounded-xl p-4 border border-gray-200">
              <div className="text-2xl font-bold text-gray-800">{stats.totalReviews}</div>
              <div className="text-sm text-gray-600">Total</div>
            </div>
            <div className="bg-yellow-50 rounded-xl p-4 border border-yellow-200">
              <div className="text-2xl font-bold text-yellow-700">{stats.pendingCount}</div>
              <div className="text-sm text-yellow-600">Pendientes</div>
            </div>
            <div className="bg-green-50 rounded-xl p-4 border border-green-200">
              <div className="text-2xl font-bold text-green-700">{stats.approvedCount}</div>
              <div className="text-sm text-green-600">Aprobadas</div>
            </div>
            <div className="bg-red-50 rounded-xl p-4 border border-red-200">
              <div className="text-2xl font-bold text-red-700">{stats.rejectedCount}</div>
              <div className="text-sm text-red-600">Rechazadas</div>
            </div>
            <div className="bg-cyan-50 rounded-xl p-4 border border-cyan-200">
              <div className="text-2xl font-bold text-cyan-700">{stats.averageRating || '-'}</div>
              <div className="text-sm text-cyan-600">Puntuación media</div>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="flex border-b border-gray-200 overflow-x-auto">
            {[
              { id: 'pending', label: 'Pendientes', count: stats?.pendingCount },
              { id: 'approved', label: 'Aprobadas', count: stats?.approvedCount },
              { id: 'rejected', label: 'Rechazadas', count: stats?.rejectedCount },
              { id: 'all', label: 'Todas', count: stats?.totalReviews },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as TabType)}
                className={`flex items-center gap-2 px-6 py-4 font-medium transition-colors whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'text-cyan-600 border-b-2 border-cyan-600 bg-cyan-50'
                    : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
                }`}
              >
                {tab.label}
                {tab.count !== undefined && tab.count > 0 && (
                  <span className={`px-2 py-0.5 rounded-full text-xs ${
                    activeTab === tab.id ? 'bg-cyan-100 text-cyan-700' : 'bg-gray-100 text-gray-600'
                  }`}>
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Reviews List */}
          <div className="p-6">
            {filteredReviews.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <div className="text-4xl mb-3">📝</div>
                <p>No hay reseñas en esta categoría</p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredReviews.map(review => (
                  <div
                    key={review.id}
                    className={`border rounded-xl p-5 transition-all ${
                      review.featured ? 'border-yellow-300 bg-yellow-50/50' : 'border-gray-200 bg-white'
                    } ${processingIds.has(review.id) ? 'opacity-50' : ''}`}
                  >
                    {/* Review Header */}
                    <div className="flex items-start justify-between gap-4 mb-3">
                      <div className="flex items-center gap-3">
                        {/* Avatar */}
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white font-medium">
                          {getInitials(review.customerName)}
                        </div>
                        <div>
                          <div className="font-medium text-gray-800">{review.customerName}</div>
                          <div className="text-xs text-gray-500">{review.customerEmail}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {review.featured && (
                          <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs font-medium">
                            ⭐ Destacada
                          </span>
                        )}
                        {getStatusBadge(review.status)}
                      </div>
                    </div>

                    {/* Rating & Date */}
                    <div className="flex items-center gap-3 mb-2">
                      {renderStars(review.rating)}
                      <span className="text-sm text-gray-500">
                        {getTimeAgo(review.createdAt)}
                      </span>
                      {review.orderId && (
                        <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                          Pedido #{review.orderId.slice(0, 8)}
                        </span>
                      )}
                    </div>

                    {/* Review Content */}
                    <h4 className="font-semibold text-gray-800 mb-1">{review.title}</h4>
                    <p className="text-gray-600 text-sm mb-4">{review.text}</p>

                    {/* Business Response */}
                    {review.businessResponse && (
                      <div className="bg-cyan-50 border border-cyan-200 rounded-lg p-3 mb-4">
                        <div className="text-xs font-medium text-cyan-700 mb-1">
                          Respuesta de ImprimeArte:
                        </div>
                        <p className="text-sm text-cyan-800">{review.businessResponse.text}</p>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-gray-100">
                      {/* Pending Actions */}
                      {review.status === 'pending' && (
                        <>
                          <button
                            onClick={() => handleApprove(review.id)}
                            disabled={processingIds.has(review.id)}
                            className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
                          >
                            ✓ Aprobar
                          </button>
                          <button
                            onClick={() => handleApprove(review.id, true)}
                            disabled={processingIds.has(review.id)}
                            className="px-4 py-2 bg-yellow-500 text-white text-sm font-medium rounded-lg hover:bg-yellow-600 disabled:opacity-50 transition-colors"
                          >
                            ⭐ Aprobar y Destacar
                          </button>
                          <button
                            onClick={() => setShowRejectModal(review.id)}
                            disabled={processingIds.has(review.id)}
                            className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
                          >
                            ✕ Rechazar
                          </button>
                        </>
                      )}

                      {/* Approved Actions */}
                      {review.status === 'approved' && (
                        <>
                          <button
                            onClick={() => handleToggleFeatured(review.id, review.featured)}
                            disabled={processingIds.has(review.id)}
                            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                              review.featured
                                ? 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                : 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'
                            }`}
                          >
                            {review.featured ? '☆ Quitar destacado' : '⭐ Destacar'}
                          </button>
                          {!review.businessResponse && (
                            <button
                              onClick={() => setExpandedReview(expandedReview === review.id ? null : review.id)}
                              className="px-4 py-2 bg-cyan-100 text-cyan-700 text-sm font-medium rounded-lg hover:bg-cyan-200 transition-colors"
                            >
                              💬 Responder
                            </button>
                          )}
                        </>
                      )}

                      {/* Rejected - show reason */}
                      {review.status === 'rejected' && review.rejectionReason && (
                        <span className="text-sm text-red-600">
                          Motivo: {review.rejectionReason}
                        </span>
                      )}

                      {/* Delete (always available) */}
                      <button
                        onClick={() => handleDelete(review.id)}
                        disabled={processingIds.has(review.id)}
                        className="ml-auto px-3 py-2 text-red-600 hover:bg-red-50 text-sm rounded-lg transition-colors"
                      >
                        🗑️
                      </button>
                    </div>

                    {/* Response Form */}
                    {expandedReview === review.id && (
                      <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                        <textarea
                          value={responseText}
                          onChange={(e) => setResponseText(e.target.value)}
                          placeholder="Escribe tu respuesta..."
                          rows={3}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent resize-none mb-3"
                        />
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => {
                              setExpandedReview(null);
                              setResponseText('');
                            }}
                            className="px-4 py-2 text-gray-600 hover:text-gray-800 text-sm"
                          >
                            Cancelar
                          </button>
                          <button
                            onClick={() => handleAddResponse(review.id)}
                            disabled={!responseText.trim() || processingIds.has(review.id)}
                            className="px-4 py-2 bg-cyan-600 text-white text-sm font-medium rounded-lg hover:bg-cyan-700 disabled:opacity-50"
                          >
                            Enviar Respuesta
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Reject Modal */}
        {showRejectModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl p-6 max-w-md w-full">
              <h3 className="text-lg font-bold text-gray-800 mb-4">Rechazar Reseña</h3>
              <p className="text-sm text-gray-600 mb-4">
                ¿Por qué rechazas esta reseña? (opcional)
              </p>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Ej: Contenido inapropiado, spam, etc."
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent resize-none mb-4"
              />
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => {
                    setShowRejectModal(null);
                    setRejectReason('');
                  }}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => handleReject(showRejectModal)}
                  className="px-4 py-2 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700"
                >
                  Rechazar Reseña
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
