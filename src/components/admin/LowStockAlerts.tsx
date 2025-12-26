import { useEffect, useState } from 'react';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { AlertTriangle, Package, ExternalLink, RefreshCw } from 'lucide-react';

interface LowStockProduct {
  id: string;
  name: string;
  stock: number;
  lowStockThreshold: number;
  images: string[];
  slug: string;
  allowBackorder: boolean;
}

export default function LowStockAlerts() {
  const [lowStockProducts, setLowStockProducts] = useState<LowStockProduct[]>([]);
  const [outOfStockProducts, setOutOfStockProducts] = useState<LowStockProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadStockData = async () => {
    setLoading(true);
    setError(null);

    try {
      // Query products that track inventory
      const productsRef = collection(db, 'products');
      const q = query(
        productsRef,
        where('trackInventory', '==', true),
        where('active', '==', true)
      );

      const snapshot = await getDocs(q);
      const products: LowStockProduct[] = snapshot.docs.map((doc) => ({
        id: doc.id,
        name: doc.data().name || 'Sin nombre',
        stock: doc.data().stock || 0,
        lowStockThreshold: doc.data().lowStockThreshold || 5,
        images: doc.data().images || [],
        slug: doc.data().slug || doc.id,
        allowBackorder: doc.data().allowBackorder || false,
      }));

      // Separate out of stock and low stock
      const outOfStock = products.filter((p) => p.stock === 0);
      const lowStock = products.filter((p) => p.stock > 0 && p.stock <= p.lowStockThreshold);

      // Sort by stock (lowest first)
      outOfStock.sort((a, b) => a.stock - b.stock);
      lowStock.sort((a, b) => a.stock - b.stock);

      setOutOfStockProducts(outOfStock);
      setLowStockProducts(lowStock);
    } catch (err) {
      console.error('[LowStockAlerts] Error loading stock data:', err);
      setError('Error al cargar datos de inventario');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStockData();
  }, []);

  const totalAlerts = outOfStockProducts.length + lowStockProducts.length;

  if (loading) {
    return (
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="space-y-3">
            <div className="h-16 bg-gray-100 rounded"></div>
            <div className="h-16 bg-gray-100 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 rounded-xl p-6 border border-red-200">
        <p className="text-red-700">{error}</p>
        <button
          onClick={loadStockData}
          className="mt-2 text-sm text-red-600 hover:text-red-800 underline"
        >
          Reintentar
        </button>
      </div>
    );
  }

  if (totalAlerts === 0) {
    return (
      <div className="bg-green-50 rounded-xl p-6 border border-green-200">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
            <Package className="w-5 h-5 text-green-600" />
          </div>
          <div>
            <h3 className="font-semibold text-green-800">Stock OK</h3>
            <p className="text-sm text-green-600">Todos los productos tienen stock suficiente</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-amber-500 to-red-500 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-white text-lg">Alertas de Stock</h3>
              <p className="text-white/80 text-sm">
                {totalAlerts} producto{totalAlerts !== 1 ? 's' : ''} requiere
                {totalAlerts !== 1 ? 'n' : ''} atención
              </p>
            </div>
          </div>
          <button
            onClick={loadStockData}
            className="p-2 bg-white/20 rounded-lg hover:bg-white/30 transition-colors"
            title="Actualizar"
          >
            <RefreshCw className="w-4 h-4 text-white" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 max-h-[400px] overflow-y-auto">
        {/* Out of Stock */}
        {outOfStockProducts.length > 0 && (
          <div className="mb-4">
            <h4 className="text-sm font-semibold text-red-700 mb-2 flex items-center gap-2">
              <span className="w-2 h-2 bg-red-500 rounded-full"></span>
              Sin Stock ({outOfStockProducts.length})
            </h4>
            <div className="space-y-2">
              {outOfStockProducts.map((product) => (
                <div
                  key={product.id}
                  className="flex items-center gap-3 p-3 bg-red-50 rounded-lg border border-red-200"
                >
                  {product.images[0] ? (
                    <img
                      src={product.images[0]}
                      alt={product.name}
                      className="w-12 h-12 object-cover rounded-lg"
                    />
                  ) : (
                    <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                      <Package className="w-6 h-6 text-red-400" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 truncate">{product.name}</p>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-red-700 bg-red-100 px-2 py-0.5 rounded">
                        AGOTADO
                      </span>
                      {product.allowBackorder && (
                        <span className="text-xs text-amber-700 bg-amber-100 px-2 py-0.5 rounded">
                          Bajo pedido
                        </span>
                      )}
                    </div>
                  </div>
                  <a
                    href={`/admin/products?edit=${product.id}`}
                    className="p-2 text-gray-500 hover:text-gray-700 hover:bg-red-100 rounded-lg transition-colors"
                    title="Editar producto"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Low Stock */}
        {lowStockProducts.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold text-amber-700 mb-2 flex items-center gap-2">
              <span className="w-2 h-2 bg-amber-500 rounded-full"></span>
              Stock Bajo ({lowStockProducts.length})
            </h4>
            <div className="space-y-2">
              {lowStockProducts.map((product) => (
                <div
                  key={product.id}
                  className="flex items-center gap-3 p-3 bg-amber-50 rounded-lg border border-amber-200"
                >
                  {product.images[0] ? (
                    <img
                      src={product.images[0]}
                      alt={product.name}
                      className="w-12 h-12 object-cover rounded-lg"
                    />
                  ) : (
                    <div className="w-12 h-12 bg-amber-100 rounded-lg flex items-center justify-center">
                      <Package className="w-6 h-6 text-amber-400" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 truncate">{product.name}</p>
                    <p className="text-sm text-amber-700">
                      <span className="font-bold">{product.stock}</span> unidades restantes
                      <span className="text-gray-500 text-xs ml-1">
                        (umbral: {product.lowStockThreshold})
                      </span>
                    </p>
                  </div>
                  <a
                    href={`/admin/products?edit=${product.id}`}
                    className="p-2 text-gray-500 hover:text-gray-700 hover:bg-amber-100 rounded-lg transition-colors"
                    title="Editar producto"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="bg-gray-50 px-6 py-3 border-t border-gray-200">
        <a
          href="/admin/products"
          className="text-sm text-purple-600 hover:text-purple-800 font-medium flex items-center gap-1"
        >
          Ver todos los productos
          <ExternalLink className="w-3 h-3" />
        </a>
      </div>
    </div>
  );
}
