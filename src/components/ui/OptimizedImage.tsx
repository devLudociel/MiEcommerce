/**
 * PERFORMANCE: Optimized Image Component
 *
 * Features:
 * - Native lazy loading
 * - Async decoding
 * - Error handling with fallback
 * - Loading priority control
 * - Responsive image support
 */

import { memo, useState, useCallback, ImgHTMLAttributes } from 'react';

interface OptimizedImageProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, 'loading'> {
  src: string;
  alt: string;
  fallbackSrc?: string;
  priority?: boolean; // true for above-the-fold images
  className?: string;
  onLoadComplete?: () => void;
}

// Inline SVG placeholder — no network request, no redirect loop
const DEFAULT_FALLBACK =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='300' fill='%23f3f4f6'%3E%3Crect width='400' height='300'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-family='sans-serif' font-size='14' fill='%239ca3af'%3ESin imagen%3C/text%3E%3C/svg%3E";

export const OptimizedImage = memo(function OptimizedImage({
  src,
  alt,
  fallbackSrc = DEFAULT_FALLBACK,
  priority = false,
  className = '',
  onLoadComplete,
  ...props
}: OptimizedImageProps) {
  const [imageError, setImageError] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  const handleError = useCallback(
    (e: React.SyntheticEvent<HTMLImageElement>) => {
      const img = e.currentTarget;
      if (!imageError) {
        setImageError(true);
        img.src = fallbackSrc;
      }
    },
    [imageError, fallbackSrc]
  );

  const handleLoad = useCallback(() => {
    setIsLoaded(true);
    onLoadComplete?.();
  }, [onLoadComplete]);

  return (
    <img
      src={src}
      alt={alt}
      loading={priority ? 'eager' : 'lazy'}
      decoding="async"
      className={`${className} ${!isLoaded ? 'opacity-0' : 'opacity-100'} transition-opacity duration-300`}
      onError={handleError}
      onLoad={handleLoad}
      {...props}
    />
  );
});

OptimizedImage.displayName = 'OptimizedImage';
