import { useEffect, useState, useCallback, useMemo } from 'react';
import { getProductReviewStats, db } from '../../lib/firebase';
import { collection, query, where, limit, getDocs, orderBy } from 'firebase/firestore';
import type { FirebaseProduct, InspirationImage, ProductVariant } from '../../types/firebase';
import { FALLBACK_IMG_400x300, safeImageSrc } from '../../lib/placeholders';
import { addToCart } from '../../store/cartStore';
import { useWishlist, toggleWishlist } from '../../store/wishlistStore';
import AccessibleModal from '../common/AccessibleModal';
import Icon from '../ui/Icon';
// PERFORMANCE: Memoized components for better re-render control
import { ProductGallery } from '../products/ProductGallery';
import { ProductInfo } from '../products/ProductInfo';
import { ProductTabs } from '../products/ProductTabs';
import { RelatedProducts } from '../products/RelatedProducts';
import NotifyWhenAvailable from '../products/NotifyWhenAvailable';
// Analytics tracking
import {
  trackProductView,
  trackAddToCart as trackAnalyticsAddToCart,
  trackCustomizeProduct,
} from '../../lib/analytics';
import { klaviyoViewedProduct } from '../../lib/klaviyo';
// React Query hooks
import { useProduct, useRelatedProducts } from '../../hooks/react-query/useProducts';

interface ProductImage {
  id: number;
  url: string;
  alt: string;
  color?: string;
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
  readyMade?: boolean;
  configuratorId?: string;
}

interface Props {
  id?: string;
  slug?: string;
}

function toUIProduct(data: FirebaseProduct & { id: string }): UIProduct {
  const onSale = !!(data as any).onSale;
  const salePrice = (data as any).salePrice ? Number((data as any).salePrice) : undefined;
  const active = (data as any).active ?? true;
  const readyMade = (data as any).readyMade === true;
  const explicitCustomizable = (data as any).customizable;
  const customizable =
    readyMade ? false : typeof explicitCustomizable === 'boolean' ? explicitCustomizable : Boolean((data as any).configuratorId);
  const images: ProductImage[] = Array.isArray(data.images)
    ? data.images.map((url, i) => ({
        id: i + 1,
        url: safeImageSrc(url),
        alt: `${data.name} ${i + 1}`,
      }))
    : [{ id: 1, url: FALLBACK_IMG_400x300, alt: data.name }];
  const rawVariants = Array.isArray((data as any).variants) ? (data as any).variants : [];
  const normalizedVariants: ProductVariant[] = rawVariants
    .map((variant: Record<string, unknown>, index: number) => {
      const price = Number(variant.price);
      if (!Number.isFinite(price)) return null;
      const color = typeof variant.color === 'string' ? variant.color : '#4B5563';
      const colorName =
        typeof variant.colorName === 'string' ? variant.colorName : 'Estándar';
      const stock = Number(variant.stock);
      const originalPriceRaw = variant.originalPrice;
      const originalPriceParsed =
        originalPriceRaw !== undefined ? Number(originalPriceRaw) : undefined;
      const originalPrice = Number.isFinite(originalPriceParsed)
        ? originalPriceParsed
        : undefined;
      return {
        id: Number(variant.id) || index + 1,
        name: String(variant.name || 'Variante'),
        price,
        originalPrice,
        color,
        colorName,
        stock: Number.isFinite(stock) ? stock : active ? 15 : 0,
        sku: String(variant.sku || (data as any).slug || data.id),
      };
    })
    .filter((variant): variant is ProductVariant => !!variant);
  const variantPrices = normalizedVariants.map((variant) => variant.price);
  const basePriceRaw = Number((data as any).basePrice) || 0;
  const basePrice =
    basePriceRaw > 0 ? basePriceRaw : variantPrices.length ? Math.min(...variantPrices) : 0;
  const currentPrice = onSale && salePrice && normalizedVariants.length === 0 ? salePrice : basePrice;
  const variants: ProductVariant[] =
    normalizedVariants.length > 0
      ? normalizedVariants
      : [
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
      : readyMade
        ? ['Listo para comprar', 'Calidad garantizada']
        : [customizable ? 'Personalizable' : 'Calidad garantizada', 'Hecho a medida'];
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
    customizable,
    productionTime: (data as any).productionTime || '3-5 días hábiles',
    categoryId: (data as any).categoryId,
    slug: (data as any).slug,
    onSale,
    salePrice,
    basePrice,
    readyMade,
    configuratorId: (data as any).configuratorId,
  };
}

export default function ProductDetail({ id, slug }: Props) {
  // Use React Query hook for product fetching with automatic caching
  const identifier = slug || id || '';
  const {
    data: productData,
    isLoading: productLoading,
    error: productError,
  } = useProduct(identifier, !!slug);

  // Convert React Query data to UI format
  const uiProduct = useMemo(() => {
    if (!productData) return null;
    return toUIProduct({ id: productData.id, ...productData } as any);
  }, [productData]);

  // Use category field for related products (most products use string category like 'general', 'tech')
  const categoryForRelated = uiProduct?.category;

  // Fetch related products using React Query
  const { data: relatedProductsData = [], isLoading: relatedLoading } = useRelatedProducts(
    categoryForRelated,
    uiProduct?.id,
    4
  );

  // Convert related products to UI format
  const relatedProducts = useMemo(() => {
    const mapped = relatedProductsData.map((doc) => toUIProduct({ id: doc.id, ...doc } as any));
    if (!uiProduct) return mapped;
    return mapped.filter((product) =>
      uiProduct.readyMade ? product.readyMade : product.readyMade !== true
    );
  }, [relatedProductsData, uiProduct]);

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
  const [mounted, setMounted] = useState(false);
  const [inspirationImages, setInspirationImages] = useState<InspirationImage[]>([]);

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

  // Mark component as mounted (for hydration safety)
  useEffect(() => {
    setMounted(true);
  }, []);

  // Track product view and load related data when product loads
  useEffect(() => {
    if (!uiProduct) return;

    // Track product view in analytics
    trackProductView({
      id: uiProduct.id,
      name: uiProduct.name,
      price: uiProduct.basePrice,
      category: uiProduct.category,
      brand: uiProduct.brand,
    });

    // Track product view in Klaviyo
    klaviyoViewedProduct({
      productId: uiProduct.id,
      productName: uiProduct.name,
      price: uiProduct.basePrice,
      imageUrl: uiProduct.images[0]?.url || '',
      productUrl: `https://imprimearte.es/producto/${uiProduct.slug || uiProduct.id}`,
      category: uiProduct.category,
    });

    // Reset selections when product changes
    setSelectedVariant(0);
    setSelectedImage(0);
    setQuantity(1);

    // Load review stats
    (async () => {
      try {
        const stats = await getProductReviewStats(uiProduct.id);
        setReviewStats({
          averageRating: stats.averageRating,
          totalReviews: stats.totalReviews,
        });
      } catch (reviewError) {
        console.error('Error cargando estadísticas de reseñas:', reviewError);
      }
    })();
  }, [uiProduct]);

  // Fetch inspiration images based on product category
  useEffect(() => {
    if (!uiProduct?.customizable || !uiProduct?.category) return;

    const fetchInspirationImages = async () => {
      try {
        // Map UI category to inspiration category slug
        const categoryMap: Record<string, string> = {
          textil: 'textiles',
          textiles: 'textiles',
          'productos textiles': 'textiles',
          'impresion-3d': 'impresion-3d',
          'corte-grabado': 'laser',
          laser: 'laser',
          eventos: 'eventos',
          regalos: 'packaging',
          packaging: 'packaging',
          papeleria: 'papeleria',
          'graficos-impresos': 'papeleria',
          'servicios-digitales': 'papeleria',
          bordado: 'textiles',
          digital: 'papeleria',
          sublimacion: 'sublimacion',
          sublimados: 'sublimacion',
        };
        const rawCategory =
          (uiProduct.categoryId || uiProduct.category || '').toLowerCase();
        const categorySlug = categoryMap[rawCategory] || rawCategory;

        const q = query(
          collection(db, 'inspiration_images'),
          where('categorySlug', '==', categorySlug),
          where('active', '==', true),
          orderBy('featured', 'desc'),
          orderBy('createdAt', 'desc'),
          limit(8)
        );

        const snapshot = await getDocs(q);
        const images = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as InspirationImage[];

        setInspirationImages(images);
      } catch (error) {
        console.error('Error fetching inspiration images:', error);
        // Silently fail - inspiration images are optional
      }
    };

    fetchInspirationImages();
  }, [uiProduct?.category, uiProduct?.customizable]);

  // PERFORMANCE: useCallback para prevenir re-creación de funciones en cada render
  const handleAddToCart = useCallback(async () => {
    if (!uiProduct) return;
    const product = uiProduct;
    const variant = product.variants[selectedVariant];
    const image = safeImageSrc(product.images[selectedImage]?.url);
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

      // Track add to cart in analytics
      trackAnalyticsAddToCart({
        id: product.id,
        name: product.name,
        price: variant.price,
        quantity: Math.max(1, quantity),
        category: product.category,
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
    if (!uiProduct?.configuratorId) return;
    trackCustomizeProduct(uiProduct.name);
    window.location.href = `/configurar/${uiProduct.id}`;
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
      toggleWishlist({
        id: uiProduct.id,
        name: uiProduct.name,
        image: uiProduct.images[0]?.url || '',
      });
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

  // Ejemplos de personalización - combina ejemplos del producto + imágenes de inspiración
  const allExamples = useMemo(() => {
    if (!uiProduct) return [];
    const productExamples = ((uiProduct as any).customizationExamples || [])
      .sort((a: any, b: any) => (a.order || 0) - (b.order || 0))
      .map((ex: any) => ({ id: ex.id, image: ex.image, title: ex.description }));

    const inspirationExamples = inspirationImages.map((img) => ({
      id: img.id || `insp_${Math.random()}`,
      image: img.imageUrl,
      title: img.title,
    }));

    // Product examples first, then inspiration images (max 8 total)
    return [...productExamples, ...inspirationExamples].slice(0, 8);
  }, [uiProduct, inspirationImages]);

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

  // React Query loading state
  if (productLoading)
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

  // React Query error state
  if (productError || !uiProduct)
    return (
      <section className="py-20" style={{ background: 'white' }}>
        <div className="container">
          <div className="text-center py-12">
            <div className="error-box mb-4">
              <strong>Error:</strong> {productError?.message || 'Producto no encontrado'}
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
  const whatsappMessage = `Hola ${product.brand}, tengo una consulta sobre ${product.name}.`;
  const whatsappLink = `https://wa.me/34645341452?text=${encodeURIComponent(whatsappMessage)}`;
  const trustItems = [
    {
      icon: '🏷️',
      title: 'Producción cuidada',
      text: 'Control de calidad en cada pedido para un acabado impecable.',
    },
    {
      icon: '🚚',
      title: product.freeShipping ? 'Envío gratis' : 'Envío',
      text: product.freeShipping
        ? 'Consulta condiciones y zonas disponibles en checkout.'
        : 'Calculado en el checkout según destino.',
    },
    {
      icon: '⏱️',
      title: 'Tiempo estimado',
      text: `Producción: ${product.productionTime}.`,
    },
    {
      icon: '💬',
      title: '¿Tienes prisa?',
      text: 'Escríbenos por WhatsApp y buscamos una solución rápida.',
      link: whatsappLink,
      linkLabel: 'WhatsApp',
    },
    {
      icon: '🛡️',
      title: 'Garantía',
      text: product.warranty,
    },
    {
      icon: '⭐',
      title: 'Clientes felices',
      text:
        reviewStats.totalReviews > 0
          ? `Más de ${reviewStats.totalReviews} reseñas verificadas.`
          : 'Calidad valorada por nuestros clientes.',
    },
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
            <div className="flex flex-col gap-8">
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

              <div className="hidden lg:block rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                {product.customizable && allExamples.length > 0 ? (
                  <>
                    <div className="text-center">
                      <h3 className="text-lg font-bold text-gray-800">✨ ¿Necesitas personalizarlo?</h3>
                      <p className="mt-1 text-sm text-gray-600">
                        Inspírate con ideas rápidas y añade complementos perfectos.
                      </p>
                    </div>
                    <div className="mt-6 grid grid-cols-2 gap-4">
                      {allExamples.slice(0, 4).map((example) => (
                        <div key={example.id} className="flex flex-col items-center text-center">
                          <img
                            src={example.image}
                            alt={example.title}
                            loading="lazy"
                            decoding="async"
                            className="h-24 w-24 rounded-full object-cover shadow"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = FALLBACK_IMG_400x300;
                            }}
                          />
                          <span className="mt-2 text-[11px] font-semibold uppercase tracking-wide text-gray-600">
                            {example.title || 'Idea'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <>
                    <div className="text-center">
                      <h3 className="text-lg font-bold text-gray-800">✅ Compra sin dudas</h3>
                      <p className="mt-1 text-sm text-gray-600">
                        Información clara para decidir rápido.
                      </p>
                    </div>
                    <div className="mt-5 space-y-3 text-sm text-gray-700">
                      <div className="flex items-start gap-3">
                        <span className="text-lg">🚚</span>
                        <div>
                          <div className="font-semibold text-gray-900">Envío y tiempos</div>
                          <div className="text-gray-600">
                            {product.freeShipping ? 'Envío gratis disponible.' : 'Envío calculado en checkout.'} Producción:{' '}
                            {product.productionTime}.
                          </div>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <span className="text-lg">🛡️</span>
                        <div>
                          <div className="font-semibold text-gray-900">Garantía</div>
                          <div className="text-gray-600">{product.warranty}</div>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <span className="text-lg">💬</span>
                        <div>
                          <div className="font-semibold text-gray-900">¿Necesitas ayuda?</div>
                          <div className="text-gray-600">
                            Escríbenos por{' '}
                            <a
                              href={whatsappLink}
                              target="_blank"
                              rel="noreferrer"
                              className="text-cyan-700 font-semibold hover:text-cyan-800"
                            >
                              WhatsApp
                            </a>
                            .
                          </div>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>

              <div className="hidden lg:block bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-cyan-700 mb-4">
                  <span className="px-2 py-1 bg-cyan-50 rounded-full">✔ Confianza</span>
                  <span>Compra segura</span>
                </div>
                <div className="space-y-4 text-sm text-gray-700">
                  {trustItems.map((item, index) => (
                    <div key={`${item.title}-${index}`} className="flex items-start gap-3">
                      <span className="text-lg">{item.icon}</span>
                      <div>
                        <div className="font-semibold text-gray-900">{item.title}</div>
                        <div className="text-gray-600">
                          {item.text}{' '}
                          {item.link && (
                            <a
                              href={item.link}
                              target="_blank"
                              rel="noreferrer"
                              className="text-cyan-700 font-semibold hover:text-cyan-800"
                            >
                              {item.linkLabel ?? 'Más info'}
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
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
                  <div className="flex items-center justify-center gap-2 text-xs text-gray-500">
                    <span className="text-green-600">🔒</span>
                    <span>Compra segura y protegida</span>
                  </div>

                  {/* Notify When Available - Solo visible cuando está agotado */}
                  {currentVariant.stock === 0 && uiProduct && (
                    <NotifyWhenAvailable
                      productId={uiProduct.id}
                      productName={uiProduct.name}
                      productSlug={product.slug}
                      productImage={product.images[0]?.url}
                    />
                  )}

                  <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
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
                      className="flex items-center gap-2 text-rose-600 hover:text-rose-700 font-semibold"
                    >
                      <Icon
                        name="heart"
                        className={isInWishlist ? 'w-5 h-5 text-rose-600' : 'w-5 h-5'}
                      />
                      {isInWishlist ? 'En tu lista de deseos' : 'Añade a la lista de deseos'}
                    </button>

                    <button
                      data-testid="product-share"
                      onClick={handleShare}
                      className="flex items-center gap-2 text-gray-600 hover:text-purple-600 font-semibold"
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

              {/* Qué Incluye */}
              <div className="bg-white rounded-2xl p-6 border-2 border-cyan-200">
                <h3 className="text-xl font-bold text-gray-800 mb-4">📦 Qué Incluye</h3>
                <ul className="space-y-2">
                  <li className="flex items-center gap-3">
                    <span className="text-green-500 text-xl">✓</span>
                    <span>
                      1x {product.name}
                      {product.customizable ? ' personalizado' : ''}
                    </span>
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

          {/* Galería de Ejemplos de Personalización - Ejemplos del producto + Inspiración automática */}
          {product.customizable && allExamples.length > 0 && (
            <div className="mt-16 bg-gradient-to-r from-purple-50 to-pink-50 rounded-3xl p-8 lg:hidden">
              <h3 className="text-3xl font-black text-gray-800 mb-6 text-center">
                💡 Ejemplos de Personalizaciones
              </h3>
              <p className="text-center text-gray-600 mb-8">
                Inspírate con estas ideas y crea tu diseño único
              </p>
              <div className={`grid gap-4 ${
                allExamples.length === 1 ? 'grid-cols-1 max-w-sm mx-auto' :
                allExamples.length === 2 ? 'grid-cols-2 max-w-2xl mx-auto' :
                allExamples.length === 3 ? 'grid-cols-3 max-w-4xl mx-auto' :
                'grid-cols-2 md:grid-cols-4'
              }`}>
                {allExamples.map((example) => (
                  <div
                    key={example.id}
                    className="rounded-xl overflow-hidden shadow-lg hover:scale-105 transition-transform cursor-pointer"
                  >
                    <img
                      src={example.image}
                      alt={example.title}
                      loading="lazy"
                      decoding="async"
                      className="w-full h-48 object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = FALLBACK_IMG_400x300;
                      }}
                    />
                    <div className="p-3 bg-white">
                      <p className="text-sm text-gray-700 font-medium text-center">
                        {example.title}
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
