// src/components/common/ProductTagBadge.tsx
// Reusable component for displaying product tags with custom colors

import { useEffect, useState } from 'react';
import { db } from '../../lib/firebase';
import { collection, getDocs } from 'firebase/firestore';
import type { ProductTag } from '../../types/firebase';

// ============================================================================
// TIPOS
// ============================================================================

interface ProductTagBadgeProps {
  /** Tag slug or name to display */
  tag: string;
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
  /** Optional click handler */
  onClick?: () => void;
  /** Show as link */
  href?: string;
}

interface TagsCache {
  [slug: string]: ProductTag;
}

// ============================================================================
// CACHÉ GLOBAL DE TAGS
// ============================================================================

let tagsCache: TagsCache = {};
let cacheInitialized = false;
let subscribers: ((cache: TagsCache) => void)[] = [];

// Single fetch on idle — tags rarely change, no live listener needed.
function initTagsCache() {
  if (cacheInitialized) return;
  cacheInitialized = true;

  if (typeof window === 'undefined') return;

  const load = () => {
    getDocs(collection(db, 'productTags'))
      .then((snapshot) => {
        const newCache: TagsCache = {};
        snapshot.docs.forEach((doc) => {
          const data = doc.data() as ProductTag;
          if (data.active) {
            newCache[data.slug] = { ...data, id: doc.id };
            newCache[data.name.toLowerCase()] = { ...data, id: doc.id };
          }
        });
        tagsCache = newCache;
        subscribers.forEach((cb) => cb(newCache));
      })
      .catch((error: { code?: string }) => {
        console.debug('[ProductTagBadge] Could not load custom tags:', error?.code);
      });
  };

  if (typeof window.requestIdleCallback === 'function') {
    window.requestIdleCallback(load, { timeout: 3000 });
  } else {
    setTimeout(load, 1500);
  }
}

function useTagsCache(): TagsCache {
  const [cache, setCache] = useState<TagsCache>(tagsCache);

  useEffect(() => {
    initTagsCache();

    const callback = (newCache: TagsCache) => setCache(newCache);
    subscribers.push(callback);

    // Set initial state if cache already loaded
    if (Object.keys(tagsCache).length > 0) {
      setCache(tagsCache);
    }

    return () => {
      subscribers = subscribers.filter((cb) => cb !== callback);
    };
  }, []);

  return cache;
}

// ============================================================================
// COLORES POR DEFECTO PARA TAGS NO DEFINIDOS
// ============================================================================

const DEFAULT_TAG_COLORS: { [key: string]: { bg: string; text: string; icon: string } } = {
  nuevo: { bg: '#22C55E', text: '#FFFFFF', icon: '✨' },
  new: { bg: '#22C55E', text: '#FFFFFF', icon: '✨' },
  oferta: { bg: '#EF4444', text: '#FFFFFF', icon: '🔥' },
  sale: { bg: '#EF4444', text: '#FFFFFF', icon: '🔥' },
  destacado: { bg: '#F59E0B', text: '#000000', icon: '⭐' },
  featured: { bg: '#F59E0B', text: '#000000', icon: '⭐' },
  exclusivo: { bg: '#A855F7', text: '#FFFFFF', icon: '💎' },
  exclusive: { bg: '#A855F7', text: '#FFFFFF', icon: '💎' },
  limitado: { bg: '#EC4899', text: '#FFFFFF', icon: '⏰' },
  limited: { bg: '#EC4899', text: '#FFFFFF', icon: '⏰' },
  'best-seller': { bg: '#3B82F6', text: '#FFFFFF', icon: '👑' },
  bestseller: { bg: '#3B82F6', text: '#FFFFFF', icon: '👑' },
};

// ============================================================================
// COMPONENTE
// ============================================================================

export default function ProductTagBadge({ tag, size = 'sm', onClick, href }: ProductTagBadgeProps) {
  const cache = useTagsCache();

  // Look up tag in cache (by slug or name)
  const tagKey = tag.toLowerCase().replace(/\s+/g, '-');
  const tagData = cache[tagKey] || cache[tag.toLowerCase()];

  // Get colors (from cache, defaults, or fallback)
  const defaultColors = DEFAULT_TAG_COLORS[tagKey];
  const bgColor = tagData?.color || defaultColors?.bg || '#6B7280';
  const textColor = tagData?.textColor || defaultColors?.text || '#FFFFFF';
  const icon = tagData?.icon || defaultColors?.icon || '';
  const displayName = tagData?.name || tag;

  // Size classes
  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5 gap-1',
    md: 'text-sm px-2.5 py-1 gap-1.5',
    lg: 'text-base px-3 py-1.5 gap-2',
  };

  const content = (
    <>
      {icon && <span>{icon}</span>}
      {displayName}
    </>
  );

  const className = `inline-flex items-center ${sizeClasses[size]} rounded-full font-semibold transition-transform hover:scale-105`;
  const style = { backgroundColor: bgColor, color: textColor };

  if (href) {
    return (
      <a href={href} className={className} style={style}>
        {content}
      </a>
    );
  }

  if (onClick) {
    return (
      <button onClick={onClick} className={className} style={style}>
        {content}
      </button>
    );
  }

  return (
    <span className={className} style={style}>
      {content}
    </span>
  );
}

// ============================================================================
// COMPONENTE PARA LISTA DE TAGS
// ============================================================================

interface ProductTagsListProps {
  tags: string[];
  size?: 'sm' | 'md' | 'lg';
  maxVisible?: number;
  onTagClick?: (tag: string) => void;
}

export function ProductTagsList({
  tags,
  size = 'sm',
  maxVisible = 3,
  onTagClick,
}: ProductTagsListProps) {
  const visibleTags = tags.slice(0, maxVisible);
  const hiddenCount = tags.length - maxVisible;

  return (
    <div className="flex flex-wrap gap-1">
      {visibleTags.map((tag) => (
        <ProductTagBadge
          key={tag}
          tag={tag}
          size={size}
          onClick={onTagClick ? () => onTagClick(tag) : undefined}
        />
      ))}
      {hiddenCount > 0 && (
        <span className="inline-flex items-center text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
          +{hiddenCount}
        </span>
      )}
    </div>
  );
}
