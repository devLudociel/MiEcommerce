// src/lib/reviews.ts
// Sistema de reseñas de clientes con moderación

import { db } from './firebase';
import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  getDoc,
  query,
  where,
  orderBy,
  limit,
  Timestamp,
  onSnapshot,
  type Unsubscribe
} from 'firebase/firestore';

// ============================================================================
// TYPES
// ============================================================================

export type ReviewStatus = 'pending' | 'approved' | 'rejected';

export interface CustomerReview {
  id: string;

  // Customer info
  customerId: string;        // Firebase Auth UID
  customerName: string;
  customerEmail: string;
  customerAvatar?: string;   // Optional profile picture

  // Order info (optional - for verified purchases)
  orderId?: string;
  orderDate?: Timestamp;
  productIds?: string[];     // Products in the order

  // Review content
  rating: number;            // 1-5 stars
  title: string;
  text: string;

  // Media (optional)
  images?: string[];         // Customer uploaded images

  // Moderation
  status: ReviewStatus;
  moderatedBy?: string;      // Admin who moderated
  moderatedAt?: Timestamp;
  rejectionReason?: string;

  // Display
  featured: boolean;         // Show prominently
  displayOrder: number;      // For sorting featured reviews

  // Metadata
  createdAt: Timestamp;
  updatedAt: Timestamp;

  // Response from business (optional)
  businessResponse?: {
    text: string;
    respondedBy: string;
    respondedAt: Timestamp;
  };
}

export type CustomerReviewInput = Omit<CustomerReview, 'id' | 'createdAt' | 'updatedAt' | 'status' | 'moderatedBy' | 'moderatedAt' | 'featured' | 'displayOrder'>;

export interface ReviewStats {
  totalReviews: number;
  averageRating: number;
  ratingDistribution: {
    1: number;
    2: number;
    3: number;
    4: number;
    5: number;
  };
  pendingCount: number;
  approvedCount: number;
  rejectedCount: number;
}

// ============================================================================
// COLLECTION NAME
// ============================================================================

const COLLECTION_NAME = 'customer_reviews';

// ============================================================================
// CRUD OPERATIONS
// ============================================================================

/**
 * Submit a new review (from customer)
 * Status defaults to 'pending' for moderation
 */
export async function submitReview(review: CustomerReviewInput): Promise<string> {
  try {
    const reviewsRef = collection(db, COLLECTION_NAME);
    const docRef = await addDoc(reviewsRef, {
      ...review,
      status: 'pending',
      featured: false,
      displayOrder: 0,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    });
    return docRef.id;
  } catch (error) {
    console.error('Error submitting review:', error);
    throw error;
  }
}

/**
 * Get all reviews (for admin)
 */
export async function getAllReviews(): Promise<CustomerReview[]> {
  try {
    const reviewsRef = collection(db, COLLECTION_NAME);
    const snapshot = await getDocs(reviewsRef);

    const reviews = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as CustomerReview));

    // Sort by createdAt descending (newest first)
    return reviews.sort((a, b) =>
      b.createdAt.toMillis() - a.createdAt.toMillis()
    );
  } catch (error) {
    console.error('Error fetching all reviews:', error);
    return [];
  }
}

/**
 * Get reviews by status (for admin filtering)
 */
export async function getReviewsByStatus(status: ReviewStatus): Promise<CustomerReview[]> {
  try {
    const reviewsRef = collection(db, COLLECTION_NAME);
    const snapshot = await getDocs(reviewsRef);

    const reviews = snapshot.docs
      .map(doc => ({
        id: doc.id,
        ...doc.data()
      } as CustomerReview))
      .filter(review => review.status === status);

    return reviews.sort((a, b) =>
      b.createdAt.toMillis() - a.createdAt.toMillis()
    );
  } catch (error) {
    console.error('Error fetching reviews by status:', error);
    return [];
  }
}

/**
 * Get approved reviews (for public display)
 */
export async function getApprovedReviews(maxResults?: number): Promise<CustomerReview[]> {
  try {
    const reviewsRef = collection(db, COLLECTION_NAME);
    const snapshot = await getDocs(reviewsRef);

    let reviews = snapshot.docs
      .map(doc => ({
        id: doc.id,
        ...doc.data()
      } as CustomerReview))
      .filter(review => review.status === 'approved');

    // Sort: featured first, then by displayOrder, then by rating, then by date
    reviews.sort((a, b) => {
      if (a.featured !== b.featured) return b.featured ? 1 : -1;
      if (a.displayOrder !== b.displayOrder) return a.displayOrder - b.displayOrder;
      if (a.rating !== b.rating) return b.rating - a.rating;
      return b.createdAt.toMillis() - a.createdAt.toMillis();
    });

    if (maxResults) {
      reviews = reviews.slice(0, maxResults);
    }

    return reviews;
  } catch (error) {
    console.error('Error fetching approved reviews:', error);
    return [];
  }
}

/**
 * Get featured reviews (for homepage/social proof)
 */
export async function getFeaturedReviews(maxResults: number = 6): Promise<CustomerReview[]> {
  try {
    const reviewsRef = collection(db, COLLECTION_NAME);
    const snapshot = await getDocs(reviewsRef);

    const reviews = snapshot.docs
      .map(doc => ({
        id: doc.id,
        ...doc.data()
      } as CustomerReview))
      .filter(review => review.status === 'approved' && review.featured)
      .sort((a, b) => a.displayOrder - b.displayOrder)
      .slice(0, maxResults);

    return reviews;
  } catch (error) {
    console.error('Error fetching featured reviews:', error);
    return [];
  }
}

/**
 * Get reviews by customer
 */
export async function getCustomerReviews(customerId: string): Promise<CustomerReview[]> {
  try {
    const reviewsRef = collection(db, COLLECTION_NAME);
    const snapshot = await getDocs(reviewsRef);

    const reviews = snapshot.docs
      .map(doc => ({
        id: doc.id,
        ...doc.data()
      } as CustomerReview))
      .filter(review => review.customerId === customerId);

    return reviews.sort((a, b) =>
      b.createdAt.toMillis() - a.createdAt.toMillis()
    );
  } catch (error) {
    console.error('Error fetching customer reviews:', error);
    return [];
  }
}

/**
 * Get a single review by ID
 */
export async function getReviewById(reviewId: string): Promise<CustomerReview | null> {
  try {
    const docRef = doc(db, COLLECTION_NAME, reviewId);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      return {
        id: docSnap.id,
        ...docSnap.data()
      } as CustomerReview;
    }
    return null;
  } catch (error) {
    console.error('Error fetching review:', error);
    return null;
  }
}

/**
 * Approve a review (admin action)
 */
export async function approveReview(
  reviewId: string,
  adminId: string,
  featured: boolean = false
): Promise<void> {
  try {
    const docRef = doc(db, COLLECTION_NAME, reviewId);
    await updateDoc(docRef, {
      status: 'approved',
      moderatedBy: adminId,
      moderatedAt: Timestamp.now(),
      featured,
      updatedAt: Timestamp.now()
    });
  } catch (error) {
    console.error('Error approving review:', error);
    throw error;
  }
}

/**
 * Reject a review (admin action)
 */
export async function rejectReview(
  reviewId: string,
  adminId: string,
  reason?: string
): Promise<void> {
  try {
    const docRef = doc(db, COLLECTION_NAME, reviewId);
    await updateDoc(docRef, {
      status: 'rejected',
      moderatedBy: adminId,
      moderatedAt: Timestamp.now(),
      rejectionReason: reason || '',
      updatedAt: Timestamp.now()
    });
  } catch (error) {
    console.error('Error rejecting review:', error);
    throw error;
  }
}

/**
 * Toggle featured status
 */
export async function toggleFeatured(reviewId: string, featured: boolean): Promise<void> {
  try {
    const docRef = doc(db, COLLECTION_NAME, reviewId);
    await updateDoc(docRef, {
      featured,
      updatedAt: Timestamp.now()
    });
  } catch (error) {
    console.error('Error toggling featured:', error);
    throw error;
  }
}

/**
 * Update display order for featured reviews
 */
export async function updateDisplayOrder(reviewId: string, order: number): Promise<void> {
  try {
    const docRef = doc(db, COLLECTION_NAME, reviewId);
    await updateDoc(docRef, {
      displayOrder: order,
      updatedAt: Timestamp.now()
    });
  } catch (error) {
    console.error('Error updating display order:', error);
    throw error;
  }
}

/**
 * Add business response to a review
 */
export async function addBusinessResponse(
  reviewId: string,
  responseText: string,
  adminId: string
): Promise<void> {
  try {
    const docRef = doc(db, COLLECTION_NAME, reviewId);
    await updateDoc(docRef, {
      businessResponse: {
        text: responseText,
        respondedBy: adminId,
        respondedAt: Timestamp.now()
      },
      updatedAt: Timestamp.now()
    });
  } catch (error) {
    console.error('Error adding business response:', error);
    throw error;
  }
}

/**
 * Delete a review (admin action)
 */
export async function deleteReview(reviewId: string): Promise<void> {
  try {
    const docRef = doc(db, COLLECTION_NAME, reviewId);
    await deleteDoc(docRef);
  } catch (error) {
    console.error('Error deleting review:', error);
    throw error;
  }
}

/**
 * Get review statistics
 */
export async function getReviewStats(): Promise<ReviewStats> {
  try {
    const reviews = await getAllReviews();

    const stats: ReviewStats = {
      totalReviews: reviews.length,
      averageRating: 0,
      ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
      pendingCount: 0,
      approvedCount: 0,
      rejectedCount: 0
    };

    if (reviews.length === 0) return stats;

    let totalRating = 0;

    reviews.forEach(review => {
      // Count by status
      if (review.status === 'pending') stats.pendingCount++;
      else if (review.status === 'approved') stats.approvedCount++;
      else if (review.status === 'rejected') stats.rejectedCount++;

      // Rating distribution (only for approved)
      if (review.status === 'approved') {
        totalRating += review.rating;
        const ratingKey = review.rating as 1 | 2 | 3 | 4 | 5;
        if (ratingKey >= 1 && ratingKey <= 5) {
          stats.ratingDistribution[ratingKey]++;
        }
      }
    });

    if (stats.approvedCount > 0) {
      stats.averageRating = Math.round((totalRating / stats.approvedCount) * 10) / 10;
    }

    return stats;
  } catch (error) {
    console.error('Error calculating review stats:', error);
    return {
      totalReviews: 0,
      averageRating: 0,
      ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
      pendingCount: 0,
      approvedCount: 0,
      rejectedCount: 0
    };
  }
}

// ============================================================================
// REAL-TIME SUBSCRIPTIONS
// ============================================================================

/**
 * Subscribe to all reviews (for admin panel)
 */
export function subscribeToReviews(
  callback: (reviews: CustomerReview[]) => void
): Unsubscribe {
  const reviewsRef = collection(db, COLLECTION_NAME);

  return onSnapshot(reviewsRef, (snapshot) => {
    const reviews = snapshot.docs
      .map(doc => ({
        id: doc.id,
        ...doc.data()
      } as CustomerReview))
      .sort((a, b) => b.createdAt.toMillis() - a.createdAt.toMillis());

    callback(reviews);
  }, (error) => {
    console.error('Error in reviews subscription:', error);
    callback([]);
  });
}

/**
 * Subscribe to pending reviews count (for admin badge)
 */
export function subscribeToPendingCount(
  callback: (count: number) => void
): Unsubscribe {
  const reviewsRef = collection(db, COLLECTION_NAME);

  return onSnapshot(reviewsRef, (snapshot) => {
    const pendingCount = snapshot.docs
      .filter(doc => doc.data().status === 'pending')
      .length;

    callback(pendingCount);
  }, (error) => {
    console.error('Error in pending count subscription:', error);
    callback(0);
  });
}

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Check if customer has already reviewed (to prevent duplicates)
 */
export async function hasCustomerReviewed(customerId: string, orderId?: string): Promise<boolean> {
  try {
    const reviews = await getCustomerReviews(customerId);

    if (orderId) {
      return reviews.some(r => r.orderId === orderId);
    }

    // If no orderId, just check if they have any reviews
    return reviews.length > 0;
  } catch (error) {
    console.error('Error checking if customer reviewed:', error);
    return false;
  }
}

/**
 * Format date for display
 */
export function formatReviewDate(timestamp: Timestamp): string {
  const date = timestamp.toDate();
  return date.toLocaleDateString('es-ES', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

/**
 * Get time ago string
 */
export function getTimeAgo(timestamp: Timestamp): string {
  const now = new Date();
  const date = timestamp.toDate();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Hoy';
  if (diffDays === 1) return 'Ayer';
  if (diffDays < 7) return `Hace ${diffDays} días`;
  if (diffDays < 30) return `Hace ${Math.floor(diffDays / 7)} semanas`;
  if (diffDays < 365) return `Hace ${Math.floor(diffDays / 30)} meses`;
  return `Hace ${Math.floor(diffDays / 365)} años`;
}

/**
 * Get initials from name
 */
export function getInitials(name: string): string {
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}
