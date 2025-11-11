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

const DEFAULT_FALLBACK = '/placeholder-product.jpg';

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

  const handleError = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    if (!imageError) {
      setImageError(true);
      img.src = fallbackSrc;
    }
  }, [imageError, fallbackSrc]);

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
