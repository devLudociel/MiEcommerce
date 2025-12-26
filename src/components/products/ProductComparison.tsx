import { useCompare, type CompareItem } from '../../store/compareStore';
import { GitCompareArrows, X, ShoppingCart, ExternalLink, ArrowLeft, Trash2 } from 'lucide-react';
import { addToCart } from '../../store/cartStore';
import { notify } from '../../lib/notifications';

// ============================================================================
// TYPES
// ============================================================================

interface ComparisonRow {
  label: string;
  key: keyof CompareItem | 'actions';
  render?: (item: CompareItem) => React.ReactNode;
}

// ============================================================================
// COMPONENT
// ============================================================================

export default function ProductComparison() {
  const { items, count, remove, clear } = useCompare();

  // Comparison rows configuration
  const comparisonRows: ComparisonRow[] = [
    {
      label: 'Imagen',
      key: 'image',
      render: (item) => (
        <div className="w-full aspect-square rounded-lg overflow-hidden bg-gray-100">
          {item.image ? (
            <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-400">
              Sin imagen
            </div>
          )}
        </div>
      ),
    },
    {
      label: 'Nombre',
      key: 'name',
      render: (item) => (
        <a
          href={`/producto/${item.slug}`}
          className="font-semibold text-gray-800 hover:text-purple-600 transition-colors line-clamp-2"
        >
          {item.name}
        </a>
      ),
    },
    {
      label: 'Precio',
      key: 'price',
      render: (item) => (
        <div>
          <span className="text-2xl font-bold text-gray-900">€{item.price.toFixed(2)}</span>
          {item.originalPrice && item.originalPrice > item.price && (
            <span className="ml-2 text-sm text-gray-400 line-through">
              €{item.originalPrice.toFixed(2)}
            </span>
          )}
          {item.originalPrice && item.originalPrice > item.price && (
            <span className="ml-2 text-sm text-green-600 font-medium">
              -{Math.round((1 - item.price / item.originalPrice) * 100)}%
            </span>
          )}
        </div>
      ),
    },
    {
      label: 'Categoría',
      key: 'category',
      render: (item) => (
        <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded-lg text-sm capitalize">
          {item.category || 'Sin categoría'}
        </span>
      ),
    },
    {
      label: 'Descripción',
      key: 'description',
      render: (item) => (
        <p className="text-sm text-gray-600 line-clamp-4">
          {item.description || 'Sin descripción disponible'}
        </p>
      ),
    },
    {
      label: 'Etiquetas',
      key: 'tags',
      render: (item) => (
        <div className="flex flex-wrap gap-1">
          {item.tags && item.tags.length > 0 ? (
            item.tags.slice(0, 4).map((tag, idx) => (
              <span key={idx} className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs">
                {tag}
              </span>
            ))
          ) : (
            <span className="text-gray-400 text-sm">Sin etiquetas</span>
          )}
        </div>
      ),
    },
    {
      label: 'Acciones',
      key: 'actions',
      render: (item) => (
        <div className="space-y-2">
          <button
            onClick={() => {
              addToCart({
                productId: item.id,
                name: item.name,
                price: item.price,
                quantity: 1,
                image: item.image,
              });
              notify.success(`${item.name} agregado al carrito`);
            }}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-purple-500 to-cyan-500 text-white rounded-lg font-semibold hover:shadow-lg transition-all"
          >
            <ShoppingCart className="w-4 h-4" />
            Agregar
          </button>
          <a
            href={`/producto/${item.slug}`}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 border-2 border-gray-200 text-gray-700 rounded-lg font-semibold hover:border-purple-300 hover:text-purple-600 transition-all"
          >
            <ExternalLink className="w-4 h-4" />
            Ver Producto
          </a>
        </div>
      ),
    },
  ];

  // Empty state
  if (count === 0) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-8">
          <div className="w-20 h-20 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <GitCompareArrows className="w-10 h-10 text-purple-500" />
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-3">No hay productos para comparar</h2>
          <p className="text-gray-600 mb-6">
            Agrega productos al comparador desde las páginas de productos o el catálogo para ver sus
            características lado a lado.
          </p>
          <a
            href="/productos"
            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-500 to-cyan-500 text-white rounded-xl font-semibold hover:shadow-lg transition-all"
          >
            <ArrowLeft className="w-5 h-5" />
            Ver Productos
          </a>
        </div>
      </div>
    );
  }

  // Need at least 2 products
  if (count === 1) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-8">
          <div className="w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <GitCompareArrows className="w-10 h-10 text-amber-500" />
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-3">Agrega más productos</h2>
          <p className="text-gray-600 mb-6">
            Necesitas al menos 2 productos para poder compararlos. Actualmente tienes 1 producto
            seleccionado.
          </p>
          <div className="flex items-center justify-center gap-4 mb-6">
            <div className="w-16 h-16 rounded-lg overflow-hidden border-2 border-purple-300">
              {items[0].image ? (
                <img
                  src={items[0].image}
                  alt={items[0].name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gray-100" />
              )}
            </div>
            <span className="text-2xl text-gray-300">+</span>
            <div className="w-16 h-16 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center">
              <span className="text-gray-400">?</span>
            </div>
          </div>
          <a
            href="/productos"
            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-500 to-cyan-500 text-white rounded-xl font-semibold hover:shadow-lg transition-all"
          >
            <ArrowLeft className="w-5 h-5" />
            Agregar Más Productos
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
            <GitCompareArrows className="w-8 h-8 text-purple-500" />
            Comparar Productos
          </h1>
          <p className="text-gray-600 mt-1">Comparando {count} productos lado a lado</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={clear}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            Limpiar
          </button>
          <a
            href="/productos"
            className="flex items-center gap-2 px-4 py-2 bg-purple-100 text-purple-700 rounded-lg font-medium hover:bg-purple-200 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Volver
          </a>
        </div>
      </div>

      {/* Comparison Table */}
      <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gradient-to-r from-purple-50 to-cyan-50">
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600 w-40">
                  Característica
                </th>
                {items.map((item) => (
                  <th key={item.id} className="px-4 py-4 text-center relative min-w-[200px]">
                    <button
                      onClick={() => remove(item.id)}
                      className="absolute top-2 right-2 p-1.5 bg-red-100 text-red-500 rounded-full hover:bg-red-500 hover:text-white transition-colors"
                      title="Quitar del comparador"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {comparisonRows.map((row, rowIdx) => (
                <tr key={row.key} className={rowIdx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}>
                  <td className="px-6 py-4 font-medium text-gray-700 align-top">{row.label}</td>
                  {items.map((item) => (
                    <td key={item.id} className="px-4 py-4 align-top">
                      {row.render ? row.render(item) : (item[row.key] as string) || '-'}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile hint */}
      <p className="text-center text-sm text-gray-500 mt-4 md:hidden">
        Desliza horizontalmente para ver todos los productos
      </p>
    </div>
  );
}
