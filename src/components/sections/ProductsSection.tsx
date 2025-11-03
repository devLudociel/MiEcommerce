import { useEffect, useState } from 'react';
import { db } from '../../lib/firebase';
import { FALLBACK_IMG_400x300 } from '../../lib/placeholders';
import { collection, query, where, limit, getDocs, addDoc, Timestamp } from 'firebase/firestore';
import AccessibleModal from '../common/AccessibleModal';

export default function ProductsSection() {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal state
  const [modal, setModal] = useState<{
    isOpen: boolean;
    type: 'info' | 'warning' | 'error' | 'success';
    title: string;
    message: string;
  }>({
    isOpen: false,
    type: 'info',
    title: '',
    message: '',
  });

  const showModal = (
    type: 'info' | 'warning' | 'error' | 'success',
    title: string,
    message: string
  ) => {
    setModal({ isOpen: true, type, title, message });
  };

  const closeModal = () => {
    setModal({ ...modal, isOpen: false });
  };

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    try {
      console.log('📦 Cargando productos desde Firebase...');
      setLoading(true);
      setError(null);

      const q = query(collection(db, 'products'), where('active', '==', true), limit(6));

      const querySnapshot = await getDocs(q);
      const productsData: any[] = [];

      querySnapshot.forEach((doc: any) => {
        productsData.push({
          id: doc.id,
          ...doc.data(),
        });
      });

      console.log(`📊 ${productsData.length} productos encontrados`);
      setProducts(productsData);
    } catch (err) {
      console.error('❌ Error cargando productos:', err);
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  };

  const createSampleProducts = async () => {
    try {
      console.log('🌱 Creando productos de ejemplo...');

      // db ya está inicializado desde el SDK modular

      const sampleProducts = [
        {
          name: 'Camiseta Personalizada',
          description: 'Camiseta de algodón 100% con tu diseño personalizado.',
          category: 'textil',
          basePrice: 8.0,
          images: ['https://via.placeholder.com/400x300/3b82f6/white?text=Camiseta+Personalizada'],
          customizable: true,
          tags: ['camiseta', 'estampado'],
          featured: true,
          slug: 'camiseta-personalizada',
          active: true,
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
        },
        {
          name: 'Sudadera Premium',
          description: 'Sudadera de alta calidad con diseño personalizado.',
          category: 'textil',
          basePrice: 25.0,
          images: ['https://via.placeholder.com/400x300/f59e0b/white?text=Sudadera+Premium'],
          customizable: true,
          tags: ['sudadera', 'premium'],
          featured: true,
          slug: 'sudadera-premium',
          active: true,
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
        },
        {
          name: 'Cuadro Personalizado',
          description: 'Cuadro impreso en alta calidad con marco incluido.',
          category: 'regalos',
          basePrice: 15.0,
          images: ['https://via.placeholder.com/400x300/10b981/white?text=Cuadro+Personalizado'],
          customizable: true,
          tags: ['cuadro', 'regalo'],
          featured: false,
          slug: 'cuadro-personalizado',
          active: true,
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
        },
      ];

      for (const product of sampleProducts) {
        await addDoc(collection(db, 'products'), product);
        console.log(`✅ Creado: ${product.name}`);
      }

      console.log('🎉 Productos de ejemplo creados!');

      // Recargar productos
      loadProducts();
    } catch (err) {
      console.error('❌ Error creando productos:', err);
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
      showModal(
        'error',
        'Error al crear productos',
        `No se pudieron crear los productos de ejemplo: ${errorMessage}`
      );
    }
  };

  if (loading) {
    return (
      <>
        <AccessibleModal
          isOpen={modal.isOpen}
          onClose={closeModal}
          title={modal.title}
          type={modal.type}
        >
          {modal.message}
        </AccessibleModal>

        <section className="py-20" style={{ background: 'white' }}>
          <div className="container">
            <div className="text-center mb-16">
              <h2 className="text-4xl font-bold text-gray-800 mb-4">Nuestros Productos</h2>
              <p className="text-xl text-gray-600" style={{ maxWidth: '512px', margin: '0 auto' }}>
                Productos personalizables de alta calidad
              </p>
            </div>

            <div className="text-center py-12">
              <div className="loading-spinner"></div>
              <p className="mt-4 text-gray-600">Cargando productos...</p>
            </div>
          </div>
        </section>
      </>
    );
  }

  if (error) {
    return (
      <>
        <AccessibleModal
          isOpen={modal.isOpen}
          onClose={closeModal}
          title={modal.title}
          type={modal.type}
        >
          {modal.message}
        </AccessibleModal>

        <section className="py-20" style={{ background: 'white' }}>
          <div className="container">
            <div className="text-center mb-16">
              <h2 className="text-4xl font-bold text-gray-800 mb-4">Nuestros Productos</h2>
              <p className="text-xl text-gray-600" style={{ maxWidth: '512px', margin: '0 auto' }}>
                Productos personalizables de alta calidad
              </p>
            </div>

            <div className="text-center py-12">
              <div className="error-box">
                <strong>Error:</strong> {error}
              </div>
              <button onClick={loadProducts} className="btn btn-primary mt-4">
                Intentar de nuevo
              </button>
            </div>
          </div>
        </section>
      </>
    );
  }

  return (
    <>
      <AccessibleModal
        isOpen={modal.isOpen}
        onClose={closeModal}
        title={modal.title}
        type={modal.type}
      >
        {modal.message}
      </AccessibleModal>

      <section className="py-20" style={{ background: 'white' }}>
        <div className="container">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-800 mb-4">Nuestros Productos</h2>
            <p className="text-xl text-gray-600" style={{ maxWidth: '512px', margin: '0 auto' }}>
              Productos personalizables de alta calidad
            </p>
          </div>

          {products.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500 mb-4">No hay productos disponibles</p>
              <button onClick={createSampleProducts} className="btn btn-primary">
                Crear Productos de Ejemplo
              </button>
            </div>
          ) : (
            <div className="grid grid-auto-fit">
              {products.map((product) => (
                <div key={product.id} className="card card-product">
                  <img
                    src={product.images?.[0] || FALLBACK_IMG_400x300}
                    alt={product.name || 'Producto'}
                    onError={(e) => {
                      const img = e.currentTarget as HTMLImageElement;
                      // Evita bucles: elimina el onerror y fija un placeholder confiable
                      img.onerror = null;
                      img.src = FALLBACK_IMG_400x300;
                    }}
                  />
                  <div className="card-content">
                    <h3 className="text-xl font-bold text-gray-800 mb-2">
                      {product.name || 'Sin nombre'}
                    </h3>
                    <p className="text-gray-600 mb-4">
                      {product.description
                        ? product.description.length > 100
                          ? product.description.substring(0, 100) + '...'
                          : product.description
                        : 'Sin descripción'}
                    </p>
                    <div className="flex justify-between items-center">
                      <span className="text-2xl font-bold text-brand-600">
                        €{product.basePrice || 0}
                      </span>
                      <button className="btn btn-primary btn-sm">Personalizar</button>
                    </div>
                    <div className="mt-3">
                      <span className="tag">{product.category || 'Sin categoría'}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </>
  );
}
