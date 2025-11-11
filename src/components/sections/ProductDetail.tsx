import { useEffect, useState, useCallback } from 'react';
import { doc, getDoc, collection, query, where, limit, getDocs } from 'firebase/firestore';
import { db, getProductReviewStats } from '../../lib/firebase';
import type { FirebaseProduct } from '../../types/firebase';
import { FALLBACK_IMG_400x300 } from '../../lib/placeholders';
import { addToCart } from '../../store/cartStore';
import { useWishlist, toggleWishlist } from '../../store/wishlistStore';
import AccessibleModal from '../common/AccessibleModal';
import Icon from '../ui/Icon';
// PERFORMANCE: Memoized components for better re-render control
import { ProductGallery } from '../products/ProductGallery';
import { ProductInfo } from '../products/ProductInfo';
import { ProductTabs } from '../products/ProductTabs';
import { RelatedProducts } from '../products/RelatedProducts';

interface ProductImage {
  id: number;
  url: string;
  alt: string;
  color?: string;
}
interface ProductVariant {
  id: number;
  name: string;
  price: number;
  originalPrice?: number;
  color: string;
  colorName: string;
  stock: number;
  sku: string;
}
interface ProductReview {
  id: number;
  userName: string;
  userAvatar: string;
  rating: number;
  comment: string;
  date: string;
  verified: boolean;
  helpful: number;
}
interface UIProduct {
  id: string;
  name: string;
  description: string;
  longDescription: string;
  category: string;
  brand: string;
  variants: ProductVariant[];
  images: ProductImage[];
  features: string[];
  specifications: { [k: string]: string };
  reviews: ProductReview[];
  averageRating: number;
  totalReviews: number;
  inStock: boolean;
  freeShipping: boolean;
  warranty: string;
  returnPolicy: string;
  customizable?: boolean;
  productionTime?: string;
  categoryId?: string;
  slug?: string;
  onSale: boolean;
  salePrice?: number;
  basePrice: number;
}

interface Props {
  id?: string;
  slug?: string;
}

function toUIProduct(data: FirebaseProduct & { id: string }): UIProduct {
  const basePrice = Number((data as any).basePrice) || 0;
  const onSale = !!(data as any).onSale;
  const salePrice = (data as any).salePrice ? Number((data as any).salePrice) : undefined;
  const currentPrice = onSale && salePrice ? salePrice : basePrice;
  const active = (data as any).active ?? true;
  const images: ProductImage[] = Array.isArray(data.images)
    ? data.images.map((url, i) => ({
        id: i + 1,
        url: url || FALLBACK_IMG_400x300,
        alt: `${data.name} ${i + 1}`,
      }))
    : [{ id: 1, url: FALLBACK_IMG_400x300, alt: data.name }];
  const variants: ProductVariant[] = [
    {
      id: 1,
      name: 'Estándar',
      price: currentPrice,
      originalPrice: onSale && salePrice ? basePrice : undefined,
      color: '#4B5563',
      colorName: 'Estándar',
      stock: active ? 15 : 0,
      sku: (data as any).slug || data.id,
    },
  ];
  const features: string[] =
    Array.isArray((data as any).tags) && (data as any).tags.length
      ? (data as any).tags
      : [(data as any).customizable ? 'Personalizable' : 'Calidad garantizada', 'Hecho a medida'];
  const specifications: Record<string, string> = {};
  if (Array.isArray((data as any).customizationOptions))
    for (const o of (data as any).customizationOptions)
      if (o?.name && o?.type) specifications[String(o.name)] = String(o.type);
  return {
    id: data.id,
    name: data.name,
    description: data.description || '',
    longDescription: (data as any).longDescription || data.description || '',
    category: (data as any).category || 'general',
    brand: (data as any).brand || 'PersonalizaTodo',
    variants,
    images,
    features,
    specifications,
    reviews: [],
    averageRating: 5,
    totalReviews: 0,
    inStock: !!active,
    freeShipping: true,
    warranty: 'Garantía 12 meses',
    returnPolicy: '30 días para devoluciones gratuitas',
    customizable: (data as any).customizable ?? true,
    productionTime: (data as any).productionTime || '3-5 días hábiles',
    categoryId: (data as any).categoryId,
    slug: (data as any).slug,
    onSale,
    salePrice,
    basePrice,
  };
}

export default function ProductDetail({ id, slug }: Props) {
  const [mounted, setMounted] = useState(false);
  const [uiProduct, setUiProduct] = useState<UIProduct | null>(null);
  const [relatedProducts, setRelatedProducts] = useState<UIProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedVariant, setSelectedVariant] = useState(0);
  const [selectedImage, setSelectedImage] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [activeTab, setActiveTab] = useState<'description' | 'specifications' | 'reviews'>(
    'description'
  );
  const [isAddingToCart, setIsAddingToCart] = useState(false);
  const wishlist = useWishlist();
  const [isInWishlist, setIsInWishlist] = useState(false);
  const [reviewStats, setReviewStats] = useState({ averageRating: 0, totalReviews: 0 });

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
    setMounted(true);
  }, []);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        setError(null);
        let data: (FirebaseProduct & { id: string }) | null = null;
        if (id) {
          const ref = doc(db, 'products', id);
          const snap = await getDoc(ref);
          if (snap.exists()) data = { id: snap.id, ...(snap.data() as any) };
        } else if (slug) {
          const q = query(collection(db, 'products'), where('slug', '==', slug), limit(1));
          const snap = await getDocs(q);
          if (!snap.empty) {
            const d = snap.docs[0];
            data = { id: d.id, ...(d.data() as any) };
          } else {
            try {
              const ref = doc(db, 'products', slug);
              const byId = await getDoc(ref);
              if (byId.exists()) data = { id: byId.id, ...(byId.data() as any) };
            } catch {}
          }
        }
        if (!data) {
          setError('Producto no encontrado');
          setUiProduct(null);
          return;
        }
        const product = toUIProduct(data);
        setUiProduct(product);
        setSelectedVariant(0);
        setSelectedImage(0);
        setQuantity(1);

        // Cargar estadísticas de reseñas
        try {
          const stats = await getProductReviewStats(data.id);
          setReviewStats({
            averageRating: stats.averageRating,
            totalReviews: stats.totalReviews,
          });
        } catch (reviewError) {
          console.error('Error cargando estadísticas de reseñas:', reviewError);
        }

        // Cargar productos relacionados
        if (product.categoryId) {
          const relatedQuery = query(
            collection(db, 'products'),
            where('categoryId', '==', product.categoryId),
            where('active', '==', true),
            limit(5)
          );
          const relatedSnap = await getDocs(relatedQuery);
          const related = relatedSnap.docs
            .filter((doc) => doc.id !== product.id)
            .slice(0, 4)
            .map((doc) => toUIProduct({ id: doc.id, ...(doc.data() as any) }));
          setRelatedProducts(related);
        }
      } catch (e: any) {
        setError(e?.message || 'Error cargando producto');
        setUiProduct(null);
      } finally {
        setLoading(false);
      }
    }
    if (mounted && (id || slug)) load(); // ✅ AÑADE mounted &&
  }, [id, slug, mounted]); // ✅ AÑADE mounted a las dependencias

  // PERFORMANCE: useCallback para prevenir re-creación de funciones en cada render
  const handleAddToCart = useCallback(async () => {
    if (!uiProduct) return;
    const product = uiProduct;
    const variant = product.variants[selectedVariant];
    const image = product.images[selectedImage]?.url || FALLBACK_IMG_400x300;
    setIsAddingToCart(true);
    try {
      addToCart({
        id: product.id,
        name: product.name,
        price: variant.price,
        quantity: Math.max(1, quantity),
        image,
        variantId: variant.id,
        variantName: variant.colorName ? `${variant.name} - ${variant.colorName}` : variant.name,
      });
    } finally {
      setTimeout(() => setIsAddingToCart(false), 600);
    }
  }, [uiProduct, selectedVariant, selectedImage, quantity]);

  const handleBuyNow = useCallback(async () => {
    await handleAddToCart();
    window.location.href = '/checkout';
  }, [handleAddToCart]);

  const handleCustomize = useCallback(() => {
    if (!uiProduct) return;
    window.location.href = `/personalizar/${uiProduct.slug || uiProduct.id}`;
  }, [uiProduct]);

  const handleShare = useCallback(async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: uiProduct?.name || 'Producto',
          text: uiProduct?.description || '',
          url: window.location.href,
        });
      } catch (err) {
        console.log('Error sharing:', err);
      }
    } else {
      try {
        await navigator.clipboard.writeText(window.location.href);
        showModal('success', 'Link copiado', 'El enlace del producto se copió al portapapeles');
      } catch (err) {
        showModal('error', 'Error al copiar', 'No se pudo copiar el link al portapapeles');
      }
    }
  }, [uiProduct]);

  const handleToggleWishlist = useCallback(() => {
    if (uiProduct) {
      toggleWishlist({ id: uiProduct.id, name: uiProduct.name, image: uiProduct.images[0]?.url || '' });
    }
  }, [uiProduct]);

  useEffect(() => {
    const id = uiProduct?.id;
    if (!id) {
      setIsInWishlist(false);
      return;
    }
    setIsInWishlist(wishlist.items.some((w) => String(w.id) === String(id)));
  }, [uiProduct?.id, wishlist.items]);

  // ✅ AÑADE TODO ESTO ANTES DEL if (loading)
  if (!mounted) {
    return (
      <section className="py-20" style={{ background: 'white' }}>
        <div className="container">
          <div className="text-center py-12">
            <div className="loading-spinner" />
            <p className="mt-4 text-gray-600">Cargando producto...</p>
          </div>
        </div>
      </section>
    );
  }

  if (!id && !slug) {
    return (
      <section className="py-20" style={{ background: 'white' }}>
        <div className="container">
          <div className="text-center py-12">
            <div className="error-box mb-4">
              Falta parámetro <strong>id</strong> o <strong>slug</strong> en la URL
            </div>
            <a href="/" className="btn btn-primary">
              Volver al inicio
            </a>
          </div>
        </div>
      </section>
    );
  }

  if (loading)
    return (
      <section className="py-20" style={{ background: 'white' }}>
        <div className="container">
          <div className="text-center py-12">
            <div className="loading-spinner" />
            <p className="mt-4 text-gray-600">Cargando producto...</p>
          </div>
        </div>
      </section>
    );

  if (error || !uiProduct)
    return (
      <section className="py-20" style={{ background: 'white' }}>
        <div className="container">
          <div className="text-center py-12">
            <div className="error-box mb-4">
              <strong>Error:</strong> {error || 'Producto no encontrado'}
            </div>
            <a href="/" className="btn btn-primary">
              Volver al inicio
            </a>
          </div>
        </div>
      </section>
    );

  const product = uiProduct;
  const currentVariant = product.variants[selectedVariant] || product.variants[0];
  const currentImage = product.images[selectedImage] || product.images[0];
  const getStockStatus = (stock: number) =>
    stock === 0
      ? { text: 'Agotado', color: 'text-red-500', bg: 'bg-red-100' }
      : stock < 5
        ? { text: `Solo ${stock} disponibles`, color: 'text-orange-500', bg: 'bg-orange-100' }
        : stock < 10
          ? { text: `Últimas ${stock} unidades`, color: 'text-yellow-600', bg: 'bg-yellow-100' }
          : { text: 'En stock', color: 'text-green-500', bg: 'bg-green-100' };
  const stockStatus = getStockStatus(currentVariant.stock);

  // Ejemplos de personalización (estáticos por ahora)
  const customizationExamples = [
    { image: FALLBACK_IMG_400x300, description: 'Con logo empresarial' },
    { image: FALLBACK_IMG_400x300, description: 'Colores personalizados' },
    { image: FALLBACK_IMG_400x300, description: 'Texto personalizado' },
    { image: FALLBACK_IMG_400x300, description: 'Diseño único' },
  ];

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

      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white">
        <div className="bg-white/60 backdrop-blur-sm border-b border-gray-100 py-3 mb-4 lg:mb-6">
          <div className="container mx-auto px-6">
            <nav className="flex items-center gap-2 text-sm">
              <a href="/" className="text-gray-500 hover:text-cyan-500 transition-colors">
                Inicio
              </a>
              <span className="text-gray-400">›</span>
              <a
                href={`/categoria/${(product.category || '').toLowerCase()}`}
                className="text-gray-500 hover:text-cyan-500 transition-colors"
              >
                {product.category}
              </a>
              <span className="text-gray-400">›</span>
              <span className="text-gray-800 font-medium">{product.name}</span>
            </nav>
          </div>
        </div>

        <div className="container mx-auto px-6 py-10 md:py-12 mt-8 md:mt-12 lg:mt-120 sm:mt-160">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-14 items-start">
            {/* Galería de imágenes - PERFORMANCE: Componente memoizado */}
            <div className="relative">
              <ProductGallery
                images={product.images}
                productName={product.name}
                selectedImage={selectedImage}
                onImageChange={setSelectedImage}
              />

              {/* Badge de Oferta */}
              {product.onSale && product.salePrice && (
                <div className="absolute top-4 left-4 px-4 py-2 bg-red-500 text-white text-sm font-bold rounded-full flex items-center gap-2 shadow-lg z-20">
                  <span>🔥</span>
                  <span>
                    -{Math.round((1 - product.salePrice / product.basePrice) * 100)}% OFERTA
                  </span>
                </div>
              )}

              {/* Badge de Personalizable */}
              {product.customizable && (
                <div
                  className={`absolute ${product.onSale ? 'top-16' : 'top-4'} left-4 px-4 py-2 bg-gradient-to-r from-purple-600 via-magenta-600 to-pink-600 text-white text-sm font-bold rounded-full flex items-center gap-2 shadow-lg animate-pulse z-20`}
                >
                  <span>✨</span>
                  <span>100% Personalizable</span>
                </div>
              )}
            </div>

            {/* Información del producto */}
            <div className="space-y-8">
              <div>
                <div className="flex items-center gap-4 mb-4">
                  <span className="px-3 py-1 bg-gradient-primary text-white text-sm font-bold rounded-full">
                    {product.brand}
                  </span>
                  <span className="text-gray-500 text-sm">en {product.category}</span>
                  {product.customizable && (
                    <span className="px-3 py-1 bg-gradient-to-r from-purple-600 to-pink-600 text-white text-xs font-bold rounded-full">
                      PERSONALIZABLE
                    </span>
                  )}
                </div>
                <h1 className="text-4xl md:text-5xl font-black text-gray-800 mb-4 leading-tight">
                  {product.name}
                </h1>
                <div className="flex items-center gap-4 mb-6">
                  <div className="flex items-center gap-2">
                    <div className="flex">
                      {[...Array(5)].map((_, i) => (
                        <svg
                          key={i}
                          className={`w-5 h-5 ${i < Math.floor(reviewStats.averageRating) ? 'text-yellow-400' : 'text-gray-300'}`}
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                      ))}
                    </div>
                    <span className="text-lg font-semibold text-gray-800">
                      {reviewStats.averageRating > 0 ? reviewStats.averageRating.toFixed(1) : 'N/A'}
                    </span>
                    <span className="text-gray-500">({reviewStats.totalReviews} reseñas)</span>
                  </div>
                  <div
                    className={`px-3 py-1 rounded-full text-sm font-medium ${stockStatus.bg} ${stockStatus.color}`}
                  >
                    {stockStatus.text}
                  </div>
                </div>
                <p className="text-lg text-gray-600 leading-relaxed">{product.description}</p>
              </div>

              <div className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-2xl p-6 border border-gray-200">
                <div className="flex items-center gap-6 mb-4">
                  <div
                    className={`text-4xl font-black ${product.onSale ? 'text-red-600' : 'text-cyan-600'}`}
                  >
                    €{currentVariant.price.toFixed(2)}
                  </div>
                  {currentVariant.originalPrice && (
                    <>
                      <div className="text-xl text-gray-400 line-through">
                        €{currentVariant.originalPrice.toFixed(2)}
                      </div>
                      <div className="px-3 py-1 bg-red-500 text-white text-sm font-bold rounded-full">
                        -
                        {Math.round(
                          (1 - currentVariant.price / currentVariant.originalPrice) * 100
                        )}
                        % OFF
                      </div>
                    </>
                  )}
                </div>

                {/* Tiempo de Producción */}
                <div className="flex items-center gap-2 text-sm text-gray-600 mb-4">
                  <svg
                    className="w-5 h-5 text-cyan-500"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <span>
                    Tiempo de producción: <strong>{product.productionTime}</strong>
                  </span>
                </div>

                <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                  {product.freeShipping && (
                    <div className="flex items-center gap-1">
                      <span className="text-green-500">🚚</span>Envío gratis
                    </div>
                  )}
                  <div className="flex items-center gap-1">
                    <span className="text-blue-500">🔒</span>Compra segura
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-purple-500">↩️</span>
                    {product.returnPolicy}
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-orange-500">🛡️</span>
                    {product.warranty}
                  </div>
                </div>
              </div>

              {/* Qué Incluye */}
              <div className="bg-white rounded-2xl p-6 border-2 border-cyan-200">
                <h3 className="text-xl font-bold text-gray-800 mb-4">📦 Qué Incluye</h3>
                <ul className="space-y-2">
                  <li className="flex items-center gap-3">
                    <span className="text-green-500 text-xl">✓</span>
                    <span>1x {product.name} personalizado</span>
                  </li>
                  {product.customizable && (
                    <li className="flex items-center gap-3">
                      <span className="text-green-500 text-xl">✓</span>
                      <span>Diseño digital previo para aprobación</span>
                    </li>
                  )}
                  <li className="flex items-center gap-3">
                    <span className="text-green-500 text-xl">✓</span>
                    <span>Embalaje de protección</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <span className="text-green-500 text-xl">✓</span>
                    <span>Garantía de calidad</span>
                  </li>
                </ul>
              </div>

              <div>
                <h3 className="text-lg font-bold text-gray-800 mb-4">Elige tu modelo:</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {product.variants.map((variant, i) => (
                    <button
                      key={variant.id}
                      data-testid={`product-variant-${i}`}
                      onClick={() => setSelectedVariant(i)}
                      className={`relative p-4 rounded-xl border-2 text-left transition-all duration-300 ${i === selectedVariant ? 'border-cyan-500 bg-cyan-50 shadow-cyan' : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'} group hover:scale-105 hover:-translate-y-1`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className="w-8 h-8 rounded-full border-2 border-gray-300 shadow-md group-hover:scale-110 transition-transform"
                          style={{ backgroundColor: variant.color }}
                        />
                        <div className="flex-1">
                          <div className="font-semibold text-gray-800">{variant.colorName}</div>
                          <div className="text-sm text-gray-500">
                            {variant.name.split(' - ')[0]}
                          </div>
                          <div className="text-lg font-bold text-cyan-600">${variant.price}</div>
                        </div>
                        <div
                          className={`w-3 h-3 rounded-full ${variant.stock > 10 ? 'bg-green-500' : variant.stock > 5 ? 'bg-yellow-500' : variant.stock > 0 ? 'bg-orange-500' : 'bg-red-500'}`}
                        />
                      </div>
                      {i === selectedVariant && (
                        <div className="absolute top-2 right-2 w-6 h-6 bg-cyan-500 rounded-full flex items-center justify-center text-white text-sm animate-pulse">
                          ✓
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-bold text-gray-800 mb-4">Cantidad:</h3>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center border-2 border-gray-200 rounded-xl overflow-hidden">
                      <button
                        data-testid="product-decrease-quantity"
                        onClick={() => setQuantity(Math.max(1, quantity - 1))}
                        className="p-3 hover:bg-gray-100 transition-colors text-gray-600 hover:text-cyan-500"
                      >
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M20 12H4"
                          />
                        </svg>
                      </button>
                      <div className="px-6 py-3 bg-gray-50 text-lg font-bold text-gray-800 min-w-[60px] text-center">
                        {quantity}
                      </div>
                      <button
                        data-testid="product-increase-quantity"
                        onClick={() => setQuantity(Math.min(currentVariant.stock, quantity + 1))}
                        className="p-3 hover:bg-gray-100 transition-colors text-gray-600 hover:text-cyan-500"
                      >
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                          />
                        </svg>
                      </button>
                    </div>
                    <div className="text-sm text-gray-500">
                      Máximo: {currentVariant.stock} unidades
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  {/* Botón Personalizar - PRINCIPAL */}
                  {product.customizable && (
                    <button
                      data-testid="product-customize"
                      onClick={handleCustomize}
                      className="w-full py-4 px-8 rounded-2xl font-black text-lg bg-gradient-to-r from-purple-600 via-magenta-600 to-pink-600 text-white shadow-lg hover:shadow-2xl transform hover:scale-105 hover:-translate-y-1 transition-all duration-300 relative overflow-hidden group"
                    >
                      <span className="relative z-10 flex items-center justify-center gap-2">
                        <span>🎨</span>
                        <span>Personalizar este Producto</span>
                      </span>
                      <div className="absolute inset-0 bg-white/20 transform scale-x-0 group-hover:scale-x-100 transition-transform origin-left duration-300" />
                    </button>
                  )}

                  {/* Botón Agregar al Carrito */}
                  <button
                    data-testid="product-add-to-cart"
                    onClick={handleAddToCart}
                    disabled={isAddingToCart || currentVariant.stock === 0}
                    className={`w-full py-4 px-8 rounded-2xl font-black text-lg transition-all duration-300 ${currentVariant.stock > 0 ? 'bg-gradient-rainbow text-white shadow-lg hover:shadow-2xl transform hover:scale-105 hover:-translate-y-1' : 'bg-gray-400 text-gray-600 cursor-not-allowed'} relative overflow-hidden group`}
                  >
                    {isAddingToCart ? (
                      <div className="flex items-center justify-center gap-3">
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Agregando al carrito...
                      </div>
                    ) : currentVariant.stock === 0 ? (
                      '❌ Agotado'
                    ) : (
                      <>
                        <span className="relative z-10">🛒 Agregar al Carrito</span>
                        <div className="absolute inset-0 bg-white/20 transform scale-x-0 group-hover:scale-x-100 transition-transform origin-left duration-300" />
                      </>
                    )}
                  </button>

                  <div className="grid grid-cols-2 gap-4">
                    <button
                      data-testid="product-add-to-wishlist"
                      onClick={() => {
                        if (uiProduct)
                          toggleWishlist({
                            id: uiProduct.id,
                            name: uiProduct.name,
                            price: currentVariant.price,
                            image: product.images[0]?.url,
                          });
                      }}
                      className={`py-3 px-6 rounded-xl font-bold transition-all duration-300 ${isInWishlist ? 'bg-gradient-secondary text-white shadow-magenta' : 'bg-white border-2 border-gray-200 text-gray-700 hover:border-magenta-500 hover:text-magenta-500'} transform hover:scale-105 flex items-center justify-center gap-2`}
                    >
                      <Icon
                        name="heart"
                        className={isInWishlist ? 'w-5 h-5 text-pink-600' : 'w-5 h-5'}
                      />
                      {isInWishlist ? 'En Favoritos' : 'Favoritos'}
                    </button>

                    <button
                      data-testid="product-share"
                      onClick={handleShare}
                      className="py-3 px-6 rounded-xl font-bold bg-white border-2 border-gray-200 text-gray-700 hover:border-purple-500 hover:text-purple-500 transition-all duration-300 transform hover:scale-105 flex items-center justify-center gap-2"
                    >
                      <Icon name="share-2" className="w-5 h-5" />
                      Compartir
                    </button>
                  </div>

                  {/* Botón Comprar Ahora */}
                  <button
                    data-testid="product-buy-now"
                    onClick={handleBuyNow}
                    disabled={currentVariant.stock === 0}
                    className={`w-full py-4 px-8 rounded-2xl font-black text-lg transition-all duration-300 ${currentVariant.stock > 0 ? 'bg-gradient-to-r from-purple-600 to-purple-700 text-white shadow-purple hover:shadow-2xl transform hover:scale-105' : 'bg-gray-300 text-gray-500 cursor-not-allowed'}`}
                  >
                    ⚡ Comprar Ahora
                  </button>
                </div>
              </div>

              <div className="bg-gradient-to-r from-cyan-50 to-magenta-50 rounded-2xl p-6">
                <h3 className="text-xl font-bold text-gray-800 mb-4">
                  ⭐ Características Principales
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {(product.features || []).slice(0, 6).map((f, i) => (
                    <div key={i} className="flex items-center gap-3 text-gray-700">
                      <div className="w-2 h-2 bg-gradient-rainbow rounded-full animate-pulse" />
                      <span className="text-sm">{f}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Galería de Ejemplos de Personalización */}
          {product.customizable && (
            <div className="mt-16 bg-gradient-to-r from-purple-50 to-pink-50 rounded-3xl p-8">
              <h3 className="text-3xl font-black text-gray-800 mb-6 text-center">
                💡 Ejemplos de Personalizaciones
              </h3>
              <p className="text-center text-gray-600 mb-8">
                Inspírate con estas ideas y crea tu diseño único
              </p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {customizationExamples.map((example, i) => (
                  <div
                    key={i}
                    className="rounded-xl overflow-hidden shadow-lg hover:scale-105 transition-transform cursor-pointer"
                  >
                    <img
                      src={example.image}
                      alt={example.description}
                      loading="lazy"
                      decoding="async"
                      className="w-full h-48 object-cover"
                    />
                    <div className="p-3 bg-white">
                      <p className="text-sm text-gray-700 font-medium text-center">
                        {example.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tabs de información - PERFORMANCE: Usando componente memoizado */}
          <div className="mt-20">
            <ProductTabs
              productId={product.id}
              description={product.description}
              longDescription={product.longDescription}
              specifications={product.specifications}
              activeTab={activeTab}
              onTabChange={setActiveTab}
            />
          </div>

          {/* FAQ del Producto */}
          <div className="mt-16 bg-gradient-to-r from-blue-50 to-cyan-50 rounded-3xl p-8">
            <h3 className="text-3xl font-black text-gray-800 mb-6 text-center">
              ❓ Preguntas Frecuentes
            </h3>
            <div className="space-y-4 max-w-3xl mx-auto">
              {product.customizable && (
                <details className="bg-white rounded-xl p-5 cursor-pointer hover:shadow-md transition-shadow">
                  <summary className="font-bold text-gray-800 text-lg">
                    ¿Puedo ver el diseño antes de la producción?
                  </summary>
                  <p className="mt-3 text-gray-600 pl-4">
                    Sí, te enviamos una prueba digital para tu aprobación antes de comenzar la
                    producción.
                  </p>
                </details>
              )}
              <details className="bg-white rounded-xl p-5 cursor-pointer hover:shadow-md transition-shadow">
                <summary className="font-bold text-gray-800 text-lg">
                  ¿Cuánto tarda la personalización?
                </summary>
                <p className="mt-3 text-gray-600 pl-4">
                  {product.productionTime} más tiempo de envío según tu ubicación.
                </p>
              </details>
              <details className="bg-white rounded-xl p-5 cursor-pointer hover:shadow-md transition-shadow">
                <summary className="font-bold text-gray-800 text-lg">
                  ¿Qué métodos de pago aceptan?
                </summary>
                <p className="mt-3 text-gray-600 pl-4">
                  Aceptamos tarjetas de crédito, débito, PayPal y transferencias bancarias.
                </p>
              </details>
              <details className="bg-white rounded-xl p-5 cursor-pointer hover:shadow-md transition-shadow">
                <summary className="font-bold text-gray-800 text-lg">
                  ¿Hacen envíos a todo el país?
                </summary>
                <p className="mt-3 text-gray-600 pl-4">
                  Sí, realizamos envíos a nivel nacional e internacional.
                </p>
              </details>
            </div>
          </div>

          {/* Productos Relacionados - PERFORMANCE: Usando componente memoizado */}
          <RelatedProducts
            products={relatedProducts.map((p) => ({
              id: p.id,
              name: p.name,
              slug: p.slug,
              basePrice: p.basePrice,
              onSale: p.onSale,
              salePrice: p.salePrice,
              images: p.images,
            }))}
          />
        </div>

        {/* Barra móvil fija */}
        <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 z-50 shadow-2xl">
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <div className="text-sm text-gray-500">{currentVariant.colorName}</div>
              <div className="flex items-center gap-2">
                <div
                  className={`text-xl font-bold ${product.onSale ? 'text-red-600' : 'text-cyan-600'}`}
                >
                  €{currentVariant.price.toFixed(2)}
                </div>
                {currentVariant.originalPrice && (
                  <div className="text-sm text-gray-400 line-through">
                    €{currentVariant.originalPrice.toFixed(2)}
                  </div>
                )}
              </div>
            </div>
            {product.customizable ? (
              <button
                onClick={handleCustomize}
                className="flex-1 py-3 px-6 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold rounded-xl transform active:scale-95 transition-all"
              >
                🎨 Personalizar
              </button>
            ) : (
              <button
                onClick={handleAddToCart}
                disabled={isAddingToCart || currentVariant.stock === 0}
                className="flex-1 py-3 px-6 bg-gradient-rainbow text-white font-bold rounded-xl disabled:bg-gray-400 transform active:scale-95 transition-all"
              >
                {isAddingToCart
                  ? 'Agregando...'
                  : currentVariant.stock === 0
                    ? 'Agotado'
                    : 'Agregar'}
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
