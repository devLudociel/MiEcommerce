// src/components/common/OptimizedImage.tsx
import { useState, useEffect, useRef } from 'react';
import { optimizeImage, generateSrcSet, type ImageSize } from '../../lib/imageOptimization';
import { FALLBACK_IMG_400x300 } from '../../lib/placeholders';

interface OptimizedImageProps {
  src: string;
  alt: string;
  size?: ImageSize;
  className?: string;
  loading?: 'lazy' | 'eager';
  onClick?: () => void;
  onError?: () => void;
  useSrcSet?: boolean;
  aspectRatio?: string; // e.g., '16/9', '1/1', '4/3'
  useIntersectionObserver?: boolean; // Enable progressive lazy loading
  rootMargin?: string; // Intersection observer root margin (default: '50px')
}

/**
 * Optimized Image Component
 *
 * Automatically optimizes images based on size and supports:
 * - Lazy loading
 * - Responsive srcset
 * - Error fallback
 * - Loading placeholder
 * - Aspect ratio preservation
 *
 * @example
 * // Product card
 * <OptimizedImage src={product.image} alt={product.name} size="small" loading="lazy" />
 *
 * // Gallery main image
 * <OptimizedImage src={image.url} alt={image.alt} size="large" loading="eager" />
 *
 * // Thumbnail
 * <OptimizedImage src={thumb.url} alt={thumb.alt} size="thumbnail" />
 */
export default function OptimizedImage({
  src,
  alt,
  size = 'medium',
  className = '',
  loading = 'lazy',
  onClick,
  onError,
  useSrcSet = true,
  aspectRatio,
  useIntersectionObserver = true,
  rootMargin = '50px',
}: OptimizedImageProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [isInView, setIsInView] = useState(!useIntersectionObserver); // If observer disabled, load immediately
  const imgRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Optimize source URL
  const optimizedSrc = optimizeImage(src || FALLBACK_IMG_400x300, size);
  const srcSet = useSrcSet ? generateSrcSet(src || FALLBACK_IMG_400x300) : undefined;

  // Intersection Observer for progressive lazy loading
  useEffect(() => {
    if (!useIntersectionObserver || !containerRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsInView(true);
            observer.disconnect(); // Stop observing after first intersection
          }
        });
      },
      {
        rootMargin, // Load images slightly before they enter viewport
        threshold: 0.01, // Trigger when even 1% is visible
      }
    );

    observer.observe(containerRef.current);

    return () => {
      observer.disconnect();
    };
  }, [useIntersectionObserver, rootMargin]);

  // Reset states when src changes
  useEffect(() => {
    setIsLoaded(false);
    setHasError(false);
  }, [src]);

  const handleLoad = () => {
    setIsLoaded(true);
  };

  const handleError = () => {
    setHasError(true);
    if (onError) onError();

    // Set fallback image
    if (imgRef.current) {
      imgRef.current.src = FALLBACK_IMG_400x300;
    }
  };

  const handleClick = onClick ? () => onClick() : undefined;
  const interactiveProps = onClick
    ? {
        role: 'button',
        tabIndex: 0,
        onClick: handleClick,
        onKeyDown: (event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            onClick();
          }
        },
      }
    : {};

  return (
    <div
      ref={containerRef}
      className={`relative overflow-hidden bg-gray-100 ${className}`}
      style={aspectRatio ? { aspectRatio } : undefined}
      {...interactiveProps}
    >
      {/* Loading placeholder */}
      {!isLoaded && !hasError && (
        <div className="absolute inset-0 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 animate-shimmer" />
      )}

      {/* Optimized image - only render when in view */}
      {isInView && (
        <img
          ref={imgRef}
          src={optimizedSrc}
          srcSet={srcSet}
          sizes={
            useSrcSet ? '(max-width: 640px) 400px, (max-width: 1024px) 800px, 1200px' : undefined
          }
          alt={alt}
          loading={loading}
          decoding="async"
          onLoad={handleLoad}
          onError={handleError}
          className={`w-full h-full object-cover transition-opacity duration-300 ${
            isLoaded ? 'opacity-100' : 'opacity-0'
          }`}
        />
      )}

      {/* Error state indicator (optional visual) */}
      {hasError && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-200">
          <svg
            className="w-12 h-12 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
        </div>
      )}
    </div>
  );
}

/**
 * Shimmer animation styles (add to tailwind.config)
 *
 * @keyframes shimmer {
 *   0% { background-position: -1000px 0; }
 *   100% { background-position: 1000px 0; }
 * }
 *
 * .animate-shimmer {
 *   animation: shimmer 2s infinite;
 *   background-size: 1000px 100%;
 * }
 */
