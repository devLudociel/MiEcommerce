// src/lib/imageOptimization.ts

/**
 * Image Optimization Service
 *
 * Optimizes images for different use cases:
 * - Thumbnails: 150x150 (product cards grid)
 * - Small: 400x300 (product cards, related products)
 * - Medium: 800x600 (product gallery thumbnails)
 * - Large: 1200x900 (product gallery main image)
 * - Original: Full size (zoom view)
 *
 * Supports:
 * - Firebase Storage URLs (with resize parameters)
 * - Cloudinary URLs (auto transformation)
 * - ImageKit URLs (auto transformation)
 * - Generic URLs (fallback to original)
 */

export type ImageSize = 'thumbnail' | 'small' | 'medium' | 'large' | 'original';

interface ImageDimensions {
  width: number;
  height: number;
  quality: number;
}

const IMAGE_SIZES: Record<ImageSize, ImageDimensions> = {
  thumbnail: { width: 150, height: 150, quality: 80 },
  small: { width: 400, height: 300, quality: 85 },
  medium: { width: 800, height: 600, quality: 90 },
  large: { width: 1200, height: 900, quality: 95 },
  original: { width: 0, height: 0, quality: 100 }, // No resize
};

/**
 * Optimize image URL for specific size
 *
 * @param url - Original image URL
 * @param size - Desired image size
 * @returns Optimized image URL
 *
 * @example
 * // For product card
 * const optimized = optimizeImage(product.image, 'small');
 *
 * // For gallery thumbnail
 * const thumb = optimizeImage(product.image, 'medium');
 *
 * // For main gallery image
 * const main = optimizeImage(product.image, 'large');
 */
export function optimizeImage(url: string, size: ImageSize = 'medium'): string {
  if (!url || size === 'original') return url;

  const dimensions = IMAGE_SIZES[size];

  // Cloudinary URL detection and transformation
  if (url.includes('cloudinary.com')) {
    return transformCloudinaryUrl(url, dimensions);
  }

  // ImageKit URL detection and transformation
  if (url.includes('imagekit.io')) {
    return transformImageKitUrl(url, dimensions);
  }

  // Firebase Storage URL detection and transformation
  if (url.includes('firebasestorage.googleapis.com')) {
    return transformFirebaseStorageUrl(url, dimensions);
  }

  // Imgix URL detection and transformation
  if (url.includes('imgix.net')) {
    return transformImgixUrl(url, dimensions);
  }

  // Fallback: return original URL
  return url;
}

/**
 * Transform Cloudinary URL with optimization parameters
 *
 * Example transformation:
 * https://res.cloudinary.com/demo/image/upload/sample.jpg
 * -> https://res.cloudinary.com/demo/image/upload/w_400,h_300,q_85,f_auto/sample.jpg
 */
function transformCloudinaryUrl(url: string, dimensions: ImageDimensions): string {
  const { width, height, quality } = dimensions;

  // Find the upload path to inject transformations
  const uploadIndex = url.indexOf('/upload/');
  if (uploadIndex === -1) return url;

  const beforeUpload = url.substring(0, uploadIndex + 8); // Include '/upload/'
  const afterUpload = url.substring(uploadIndex + 8);

  // Build transformation string
  const transformations = [
    `w_${width}`,
    `h_${height}`,
    `q_${quality}`,
    'c_fill', // Crop to fill dimensions
    'f_auto', // Auto format (WebP when supported)
    'g_auto', // Auto gravity (smart cropping)
  ].join(',');

  return `${beforeUpload}${transformations}/${afterUpload}`;
}

/**
 * Transform ImageKit URL with optimization parameters
 *
 * Example transformation:
 * https://ik.imagekit.io/demo/sample.jpg
 * -> https://ik.imagekit.io/demo/tr:w-400,h-300,q-85,f-auto/sample.jpg
 */
function transformImageKitUrl(url: string, dimensions: ImageDimensions): string {
  const { width, height, quality } = dimensions;

  // Find the base URL and path
  const parts = url.split('/');
  const baseIndex = parts.findIndex(part => part.includes('imagekit.io'));
  if (baseIndex === -1) return url;

  const base = parts.slice(0, baseIndex + 2).join('/'); // Base + account ID
  const path = parts.slice(baseIndex + 2).join('/');

  // Build transformation string
  const transformations = `tr:w-${width},h-${height},q-${quality},fo-auto,c-maintain_ratio`;

  return `${base}/${transformations}/${path}`;
}

/**
 * Transform Firebase Storage URL with resize parameters
 *
 * Note: Firebase Storage doesn't natively support image transformations.
 * Options:
 * 1. Use Firebase Extensions: Resize Images extension
 * 2. Use Cloud Functions to generate thumbnails
 * 3. Pre-generate thumbnails on upload
 *
 * This function assumes you have the "Resize Images" extension installed,
 * which creates resized versions with naming convention: filename_WxH.ext
 */
function transformFirebaseStorageUrl(url: string, dimensions: ImageDimensions): string {
  const { width, height } = dimensions;

  // Extract file extension and base name
  const lastDotIndex = url.lastIndexOf('.');
  const lastSlashIndex = url.lastIndexOf('/');

  if (lastDotIndex === -1 || lastSlashIndex === -1) return url;

  const baseUrl = url.substring(0, lastDotIndex);
  const extension = url.substring(lastDotIndex);

  // Check if URL already has size suffix (avoid double transformation)
  const sizePattern = /_\d+x\d+$/;
  if (sizePattern.test(baseUrl)) return url;

  // Build resized URL (assumes Resize Images extension naming)
  return `${baseUrl}_${width}x${height}${extension}`;
}

/**
 * Transform Imgix URL with optimization parameters
 *
 * Example transformation:
 * https://demo.imgix.net/sample.jpg
 * -> https://demo.imgix.net/sample.jpg?w=400&h=300&q=85&auto=format&fit=crop
 */
function transformImgixUrl(url: string, dimensions: ImageDimensions): string {
  const { width, height, quality } = dimensions;

  // Build query parameters
  const params = new URLSearchParams({
    w: width.toString(),
    h: height.toString(),
    q: quality.toString(),
    auto: 'format,compress',
    fit: 'crop',
  });

  // Check if URL already has query params
  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}${params.toString()}`;
}

/**
 * Preload critical images for better performance
 *
 * @param urls - Array of image URLs to preload
 * @param size - Size to preload (defaults to 'medium')
 *
 * @example
 * // Preload product gallery images
 * preloadImages(product.images, 'large');
 */
export function preloadImages(urls: string[], size: ImageSize = 'medium'): void {
  if (typeof window === 'undefined') return;

  urls.forEach((url) => {
    const optimizedUrl = optimizeImage(url, size);
    const link = document.createElement('link');
    link.rel = 'preload';
    link.as = 'image';
    link.href = optimizedUrl;
    document.head.appendChild(link);
  });
}

/**
 * Generate srcset for responsive images
 *
 * @param url - Original image URL
 * @returns srcset string for img tag
 *
 * @example
 * <img src={optimizeImage(url, 'medium')} srcSet={generateSrcSet(url)} />
 */
export function generateSrcSet(url: string): string {
  const sizes: Array<{ size: ImageSize; descriptor: string }> = [
    { size: 'small', descriptor: '400w' },
    { size: 'medium', descriptor: '800w' },
    { size: 'large', descriptor: '1200w' },
  ];

  return sizes
    .map(({ size, descriptor }) => `${optimizeImage(url, size)} ${descriptor}`)
    .join(', ');
}

/**
 * Calculate optimal image size based on container dimensions
 *
 * @param containerWidth - Width of the image container in pixels
 * @returns Optimal image size
 *
 * @example
 * const size = getOptimalSize(window.innerWidth);
 * const optimized = optimizeImage(url, size);
 */
export function getOptimalSize(containerWidth: number): ImageSize {
  if (containerWidth <= 200) return 'thumbnail';
  if (containerWidth <= 500) return 'small';
  if (containerWidth <= 900) return 'medium';
  return 'large';
}

/**
 * Utility: Extract filename from URL
 */
export function getFilenameFromUrl(url: string): string {
  try {
    const urlObj = new URL(url);
    const pathname = urlObj.pathname;
    return pathname.substring(pathname.lastIndexOf('/') + 1);
  } catch {
    return 'image';
  }
}

/**
 * Utility: Check if URL is already optimized
 */
export function isOptimizedUrl(url: string): boolean {
  return (
    url.includes('/upload/w_') || // Cloudinary
    url.includes('/tr:w-') || // ImageKit
    url.includes('?w=') || // Imgix
    /_\d+x\d+\./.test(url) // Firebase with size suffix
  );
}
