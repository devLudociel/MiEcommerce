import { memo, useCallback, useRef, useState } from 'react';
import { FALLBACK_IMG_400x300 } from '../../lib/placeholders';

interface ProductImage {
  id: number;
  url: string;
  alt: string;
  color?: string;
}

interface ProductGalleryProps {
  images: ProductImage[];
  productName: string;
  selectedImage: number;
  onImageChange: (index: number) => void;
}

/**
 * PERFORMANCE OPTIMIZED: Memoized gallery component
 * Prevents re-renders when parent state changes unrelated to images
 */
export const ProductGallery = memo(function ProductGallery({
  images,
  productName,
  selectedImage,
  onImageChange,
}: ProductGalleryProps) {
  const [isZoomed, setIsZoomed] = useState(false);
  const imageRef = useRef<HTMLDivElement>(null);

  const currentImage = images[selectedImage] || images[0];

  const handleImageZoom = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!imageRef.current || !isZoomed) return;
    const r = imageRef.current.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width) * 100;
    const y = ((e.clientY - r.top) / r.height) * 100;
    imageRef.current.style.transformOrigin = `${x}% ${y}%`;
  };

  const handlePrevImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    onImageChange((selectedImage - 1 + images.length) % images.length);
  };

  const handleNextImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    onImageChange((selectedImage + 1) % images.length);
  };

  const handleToggleZoom = useCallback(() => {
    setIsZoomed((prev) => !prev);
  }, []);

  const handleZoomKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        handleToggleZoom();
      }
    },
    [handleToggleZoom]
  );

  return (
    <div className="space-y-4 lg:space-y-6">
      {/* Main Image with Zoom */}
      <div className="relative group">
        <div
          ref={imageRef}
          className={`relative bg-white rounded-3xl overflow-hidden shadow-xl border-4 border-transparent ${
            isZoomed ? 'cursor-zoom-out' : 'cursor-zoom-in'
          } hover:border-cyan-500/50 transition-all duration-500`}
          onClick={handleToggleZoom}
          onKeyDown={handleZoomKeyDown}
          onMouseMove={handleImageZoom}
          role="button"
          tabIndex={0}
          aria-pressed={isZoomed}
          aria-label={isZoomed ? 'Reducir zoom de la imagen' : 'Ampliar zoom de la imagen'}
        >
          <img
            src={currentImage?.url || FALLBACK_IMG_400x300}
            alt={currentImage?.alt || productName}
            loading="eager"
            decoding="async"
            className={`w-full h-80 md:h-[380px] lg:h-[420px] object-cover transition-all duration-700 ${
              isZoomed ? 'scale-150' : 'scale-100 group-hover:scale-105'
            }`}
            onError={(e) => {
              const img = e.currentTarget as HTMLImageElement;
              img.onerror = null;
              img.src = FALLBACK_IMG_400x300;
            }}
          />

          {/* Zoom Icon */}
          <div
            className={`absolute top-4 right-4 p-2 bg-black/50 text-white rounded-full transition-opacity duration-300 ${
              isZoomed ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
            }`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>

          {/* Image Counter */}
          <div className="absolute bottom-4 left-4 px-3 py-1 bg-black/50 text-white text-sm rounded-full backdrop-blur-sm">
            {selectedImage + 1} / {images.length}
          </div>

          {/* Navigation Buttons */}
          <button
            onClick={handlePrevImage}
            className="absolute left-4 top-1/2 -translate-y-1/2 p-3 bg-white/20 backdrop-blur-sm rounded-full text-white hover:bg-white/30 transition-all opacity-0 group-hover:opacity-100"
            aria-label="Imagen anterior"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </button>
          <button
            onClick={handleNextImage}
            className="absolute right-4 top-1/2 -translate-y-1/2 p-3 bg-white/20 backdrop-blur-sm rounded-full text-white hover:bg-white/30 transition-all opacity-0 group-hover:opacity-100"
            aria-label="Imagen siguiente"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>

      {/* Thumbnails */}
      <div className="grid grid-cols-4 sm:grid-cols-5 gap-3">
        {images.map((img, idx) => (
          <button
            key={img.id}
            onClick={() => onImageChange(idx)}
            className={`relative rounded-2xl overflow-hidden border-3 transition-all duration-300 hover:scale-105 ${
              idx === selectedImage
                ? 'border-cyan-500 ring-4 ring-cyan-500/30 shadow-lg'
                : 'border-gray-200 hover:border-cyan-300'
            }`}
          >
            <img
              src={img.url || FALLBACK_IMG_400x300}
              alt={img.alt}
              loading="lazy"
              decoding="async"
              className="w-full h-20 sm:h-24 object-cover"
              onError={(e) => {
                const imgEl = e.currentTarget as HTMLImageElement;
                imgEl.onerror = null;
                imgEl.src = FALLBACK_IMG_400x300;
              }}
            />
            {idx === selectedImage && (
              <div className="absolute inset-0 bg-cyan-500/20 flex items-center justify-center">
                <svg
                  className="w-6 h-6 text-white drop-shadow-lg"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
            )}
          </button>
        ))}
      </div>
    </div>
  );
});
