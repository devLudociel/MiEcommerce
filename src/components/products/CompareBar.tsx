import { GitCompareArrows, X, Trash2, ChevronRight } from 'lucide-react';
import { useCompare } from '../../store/compareStore';

// ============================================================================
// COMPONENT
// ============================================================================

export default function CompareBar() {
  const { items, count, remove, clear, maxItems } = useCompare();

  // Don't render if no items
  if (count === 0) {
    return null;
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t-2 border-purple-200 shadow-2xl transform transition-transform duration-300 ease-out">
      <div className="max-w-7xl mx-auto px-4 py-3">
        <div className="flex items-center justify-between gap-4">
          {/* Left: Title and count */}
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <GitCompareArrows className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-800">Comparador</h3>
              <p className="text-xs text-gray-500">
                {count} de {maxItems} productos
              </p>
            </div>
          </div>

          {/* Center: Product thumbnails */}
          <div className="flex-1 flex items-center gap-2 overflow-x-auto px-4">
            {items.map((item) => (
              <div
                key={item.id}
                className="flex-shrink-0 relative group"
              >
                <div className="w-14 h-14 rounded-lg overflow-hidden border-2 border-gray-200 bg-gray-50">
                  {item.image ? (
                    <img
                      src={item.image}
                      alt={item.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">
                      Sin img
                    </div>
                  )}
                </div>
                {/* Remove button */}
                <button
                  onClick={() => remove(item.id)}
                  className="absolute -top-1 -right-1 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                  title="Quitar del comparador"
                >
                  <X className="w-3 h-3" />
                </button>
                {/* Product name tooltip */}
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
                  {item.name}
                </div>
              </div>
            ))}

            {/* Empty slots */}
            {Array.from({ length: maxItems - count }).map((_, idx) => (
              <div
                key={`empty-${idx}`}
                className="flex-shrink-0 w-14 h-14 rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 flex items-center justify-center"
              >
                <span className="text-gray-400 text-xs">+</span>
              </div>
            ))}
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={clear}
              className="p-2 text-gray-500 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
              title="Limpiar comparador"
            >
              <Trash2 className="w-5 h-5" />
            </button>
            <a
              href="/comparar"
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-semibold transition-all ${
                count >= 2
                  ? 'bg-gradient-to-r from-purple-500 to-purple-600 text-white hover:shadow-lg hover:shadow-purple-500/30'
                  : 'bg-gray-200 text-gray-500 cursor-not-allowed'
              }`}
              onClick={(e) => {
                if (count < 2) {
                  e.preventDefault();
                }
              }}
            >
              Comparar
              <ChevronRight className="w-4 h-4" />
            </a>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mt-2 h-1 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-purple-500 to-purple-600 transition-all duration-300"
            style={{ width: `${(count / maxItems) * 100}%` }}
          />
        </div>
      </div>
    </div>
  );
}
