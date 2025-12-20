import { useState, useEffect } from 'react';
import { GitCompareArrows, Check, X } from 'lucide-react';
import { useCompare, type CompareItem } from '../../store/compareStore';
import { notify } from '../../lib/notifications';

// ============================================================================
// TYPES
// ============================================================================

interface CompareButtonProps {
  product: CompareItem;
  variant?: 'icon' | 'button' | 'mini';
  className?: string;
  showLabel?: boolean;
}

// ============================================================================
// COMPONENT
// ============================================================================

export default function CompareButton({
  product,
  variant = 'icon',
  className = '',
  showLabel = true,
}: CompareButtonProps) {
  const { items, isInCompare, toggle, isFull, maxItems } = useCompare();
  const [isComparing, setIsComparing] = useState(false);

  // Update state when items change
  useEffect(() => {
    setIsComparing(isInCompare(product.id));
  }, [items, product.id, isInCompare]);

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const result = toggle(product);

    if (result.added) {
      notify.success(`${product.name} agregado al comparador`);
    } else if (result.atMax) {
      notify.error(`Máximo ${maxItems} productos para comparar`);
    } else {
      notify.info(`${product.name} removido del comparador`);
    }
  };

  // Mini variant - just a small icon
  if (variant === 'mini') {
    return (
      <button
        onClick={handleClick}
        className={`p-1.5 rounded-lg transition-all ${
          isComparing
            ? 'bg-purple-500 text-white'
            : 'bg-gray-100 text-gray-600 hover:bg-purple-100 hover:text-purple-600'
        } ${isFull && !isComparing ? 'opacity-50 cursor-not-allowed' : ''} ${className}`}
        title={isComparing ? 'Quitar del comparador' : 'Agregar al comparador'}
        disabled={isFull && !isComparing}
      >
        <GitCompareArrows className="w-4 h-4" />
      </button>
    );
  }

  // Icon variant - medium size
  if (variant === 'icon') {
    return (
      <button
        onClick={handleClick}
        className={`p-2 rounded-lg transition-all flex items-center gap-2 ${
          isComparing
            ? 'bg-purple-500 text-white shadow-lg shadow-purple-500/30'
            : 'bg-white text-gray-600 hover:bg-purple-50 hover:text-purple-600 border border-gray-200'
        } ${isFull && !isComparing ? 'opacity-50 cursor-not-allowed' : ''} ${className}`}
        title={isComparing ? 'Quitar del comparador' : 'Agregar al comparador'}
        disabled={isFull && !isComparing}
      >
        {isComparing ? (
          <Check className="w-5 h-5" />
        ) : (
          <GitCompareArrows className="w-5 h-5" />
        )}
        {showLabel && (
          <span className="text-sm font-medium">
            {isComparing ? 'Comparando' : 'Comparar'}
          </span>
        )}
      </button>
    );
  }

  // Button variant - full width
  return (
    <button
      onClick={handleClick}
      className={`w-full py-2.5 px-4 rounded-lg transition-all flex items-center justify-center gap-2 font-semibold ${
        isComparing
          ? 'bg-purple-500 text-white shadow-lg'
          : 'bg-white text-gray-700 hover:bg-purple-50 hover:text-purple-600 border-2 border-gray-200 hover:border-purple-300'
      } ${isFull && !isComparing ? 'opacity-50 cursor-not-allowed' : ''} ${className}`}
      disabled={isFull && !isComparing}
    >
      {isComparing ? (
        <>
          <Check className="w-5 h-5" />
          En Comparador
        </>
      ) : (
        <>
          <GitCompareArrows className="w-5 h-5" />
          Agregar al Comparador
        </>
      )}
    </button>
  );
}
