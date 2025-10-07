import { useEffect, useState, useRef } from 'react';
import { doc, getDoc, collection, query, where, limit, getDocs } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import type { FirebaseProduct } from '../../types/firebase';
import { FALLBACK_IMG_400x300 } from '../../lib/placeholders';
import { addToCart } from '../../store/cartStore';

interface CustomizationOptions {
  uploadedImage: string | null;
  uploadedImageFile: File | null;
  text: string;
  textColor: string;
  textFont: string;
  textSize: number;
  backgroundColor: string;
  selectedColor: string;
  selectedSize: string;
  selectedMaterial: string;
  selectedFinish: string;
  quantity: number;
  position: { x: number; y: number };
  rotation: number;
  scale: number;
}

interface Props {
  slug?: string;
}

const FONTS = [
  { name: 'Arial', value: 'Arial, sans-serif' },
  { name: 'Helvetica', value: 'Helvetica, sans-serif' },
  { name: 'Times New Roman', value: 'Times New Roman, serif' },
  { name: 'Georgia', value: 'Georgia, serif' },
  { name: 'Courier', value: 'Courier, monospace' },
  { name: 'Verdana', value: 'Verdana, sans-serif' },
  { name: 'Impact', value: 'Impact, sans-serif' },
  { name: 'Comic Sans', value: 'Comic Sans MS, cursive' },
];

const COLORS = [
  { name: 'Negro', value: '#000000' },
  { name: 'Blanco', value: '#FFFFFF' },
  { name: 'Rojo', value: '#EF4444' },
  { name: 'Azul', value: '#3B82F6' },
  { name: 'Verde', value: '#10B981' },
  { name: 'Amarillo', value: '#F59E0B' },
  { name: 'Rosa', value: '#EC4899' },
  { name: 'Morado', value: '#8B5CF6' },
  { name: 'Naranja', value: '#F97316' },
  { name: 'Cyan', value: '#06B6D4' },
];

const SIZES = ['XS', 'S', 'M', 'L', 'XL', '2XL', '3XL'];
const MATERIALS = ['Papel', 'Vinilo', 'Canvas', 'Acrílico', 'Madera', 'Metal'];
const FINISHES = ['Mate', 'Brillo', 'Satinado'];

export default function ProductCustomizer({ slug }: Props) {
  const [product, setProduct] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'upload' | 'text' | 'colors' | 'options'>('upload');
  const [customization, setCustomization] = useState<CustomizationOptions>({
    uploadedImage: null,
    uploadedImageFile: null,
    text: '',
    textColor: '#000000',
    textFont: 'Arial, sans-serif',
    textSize: 32,
    backgroundColor: '#FFFFFF',
    selectedColor: '#000000',
    selectedSize: 'M',
    selectedMaterial: 'Vinilo',
    selectedFinish: 'Mate',
    quantity: 1,
    position: { x: 50, y: 50 },
    rotation: 0,
    scale: 1,
  });
  const [isDragging, setIsDragging] = useState(false);
  const [isAddingToCart, setIsAddingToCart] = useState(false);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function loadProduct() {
      try {
        setLoading(true);
        setError(null);
        
        if (!slug) {
          setError('No se especificó el producto');
          return;
        }

        // Buscar por slug
        const q = query(collection(db, 'products'), where('slug', '==', slug), limit(1));
        const snap = await getDocs(q);
        
        let productData = null;
        if (!snap.empty) {
          const doc = snap.docs[0];
          productData = { id: doc.id, ...doc.data() };
        } else {
          // Intentar buscar por ID
          try {
            const ref = doc(db, 'products', slug);
            const docSnap = await getDoc(ref);
            if (docSnap.exists()) {
              productData = { id: docSnap.id, ...docSnap.data() };
            }
          } catch {}
        }

        if (!productData) {
          setError('Producto no encontrado');
          return;
        }

        setProduct(productData);
      } catch (e: any) {
        setError(e?.message || 'Error cargando producto');
      } finally {
        setLoading(false);
      }
    }

    loadProduct();
  }, [slug]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validar tipo de archivo
    if (!file.type.startsWith('image/')) {
      alert('Por favor, sube solo archivos de imagen');
      return;
    }

    // Validar tamaño (máx 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('La imagen no debe superar los 5MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      setCustomization(prev => ({
        ...prev,
        uploadedImage: event.target?.result as string,
        uploadedImageFile: file,
      }));
    };
    reader.readAsDataURL(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const file = e.dataTransfer.files[0];
    if (!file || !file.type.startsWith('image/')) {
      alert('Por favor, suelta solo archivos de imagen');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert('La imagen no debe superar los 5MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      setCustomization(prev => ({
        ...prev,
        uploadedImage: event.target?.result as string,
        uploadedImageFile: file,
      }));
    };
    reader.readAsDataURL(file);
  };

  const calculatePrice = () => {
    if (!product) return 0;
    const basePrice = Number(product.basePrice) || 0;
    let total = basePrice;

    // Precio por cantidad
    total *= customization.quantity;

    // Recargo por personalización (10%)
    if (customization.uploadedImage || customization.text) {
      total *= 1.1;
    }

    // Recargo por material premium
    if (customization.selectedMaterial === 'Acrílico' || customization.selectedMaterial === 'Metal') {
      total *= 1.2;
    }

    return Math.round(total * 100) / 100;
  };

  const handleAddToCart = async () => {
    if (!product) return;

    setIsAddingToCart(true);
    
    try {
      // Crear descripción de la personalización
      const customDetails = [];
      if (customization.text) customDetails.push(`Texto: "${customization.text}"`);
      if (customization.uploadedImage) customDetails.push('Con logo personalizado');
      if (customization.selectedColor) customDetails.push(`Color: ${customization.selectedColor}`);
      if (customization.selectedSize) customDetails.push(`Talla: ${customization.selectedSize}`);
      if (customization.selectedMaterial) customDetails.push(`Material: ${customization.selectedMaterial}`);
      if (customization.selectedFinish) customDetails.push(`Acabado: ${customization.selectedFinish}`);

      addToCart({
        id: `${product.id}-custom-${Date.now()}`,
        name: `${product.name} (Personalizado)`,
        price: calculatePrice() / customization.quantity,
        quantity: customization.quantity,
        image: product.images?.[0] || FALLBACK_IMG_400x300,
        variantId: 1,
        variantName: customDetails.join(' • '),
        customization: {
          ...customization,
          // No guardar el File object en el carrito
          uploadedImageFile: null,
        }
      });

      setShowSuccessMessage(true);
      setTimeout(() => setShowSuccessMessage(false), 3000);
    } finally {
      setTimeout(() => setIsAddingToCart(false), 600);
    }
  };

  const handleSaveDesign = () => {
    // Guardar en localStorage por ahora (en producción, guardarías en Firebase)
    const designs = JSON.parse(localStorage.getItem('savedDesigns') || '[]');
    designs.push({
      id: Date.now(),
      productId: product.id,
      productName: product.name,
      customization: {
        ...customization,
        uploadedImageFile: null, // No guardar el File object
      },
      date: new Date().toISOString(),
    });
    localStorage.setItem('savedDesigns', JSON.stringify(designs));
    alert('✓ Diseño guardado correctamente');
  };

  const resetCustomization = () => {
    if (confirm('¿Estás seguro de que quieres reiniciar la personalización?')) {
      setCustomization({
        uploadedImage: null,
        uploadedImageFile: null,
        text: '',
        textColor: '#000000',
        textFont: 'Arial, sans-serif',
        textSize: 32,
        backgroundColor: '#FFFFFF',
        selectedColor: '#000000',
        selectedSize: 'M',
        selectedMaterial: 'Vinilo',
        selectedFinish: 'Mate',
        quantity: 1,
        position: { x: 50, y: 50 },
        rotation: 0,
        scale: 1,
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-white">
        <div className="text-center">
          <div className="loading-spinner mb-4" />
          <p className="text-gray-600">Cargando personalizador...</p>
        </div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-white">
        <div className="text-center">
          <div className="text-6xl mb-4">😢</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Producto no encontrado</h2>
          <p className="text-gray-600 mb-6">{error || 'No se pudo cargar el producto'}</p>
          <a href="/" className="px-6 py-3 bg-gradient-primary text-white rounded-xl font-bold hover:shadow-lg transition-all">
            Volver al inicio
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white py-8 mt-32">
      {/* Header */}
      <div className="container mx-auto px-6 mb-8">
        <div className="flex items-center justify-between">
          <div>
            <nav className="flex items-center gap-2 text-sm text-gray-500 mb-2">
              <a href="/" className="hover:text-cyan-500">Inicio</a>
              <span>›</span>
              <a href={`/producto/${product.slug || product.id}`} className="hover:text-cyan-500">{product.name}</a>
              <span>›</span>
              <span className="text-gray-800 font-medium">Personalizar</span>
            </nav>
            <h1 className="text-3xl md:text-4xl font-black text-gray-800 flex items-center gap-3">
              🎨 Personaliza tu {product.name}
            </h1>
          </div>
          <button
            onClick={() => window.location.href = `/producto/${product.slug || product.id}`}
            className="px-4 py-2 text-gray-600 hover:text-gray-800 font-medium transition-colors"
          >
            ← Volver al producto
          </button>
        </div>
      </div>

      {/* Success Message */}
      {showSuccessMessage && (
        <div className="fixed top-4 right-4 z-50 bg-green-500 text-white px-6 py-4 rounded-xl shadow-2xl flex items-center gap-3 animate-in slide-in-from-top">
          <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
          <span className="font-bold">¡Añadido al carrito!</span>
        </div>
      )}

      <div className="container mx-auto px-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Preview Area - 2 columnas */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-3xl shadow-2xl p-8 border-4 border-gray-100">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-black text-gray-800">Vista Previa</h2>
                <div className="flex gap-2">
                  <button
                    onClick={handleSaveDesign}
                    className="px-4 py-2 bg-purple-100 text-purple-600 rounded-xl font-bold hover:bg-purple-200 transition-colors flex items-center gap-2"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                    </svg>
                    Guardar
                  </button>
                  <button
                    onClick={resetCustomization}
                    className="px-4 py-2 bg-red-100 text-red-600 rounded-xl font-bold hover:bg-red-200 transition-colors flex items-center gap-2"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Reiniciar
                  </button>
                </div>
              </div>

              {/* Canvas de Preview */}
              <div 
                ref={canvasRef}
                className="relative w-full aspect-square bg-gradient-to-br from-gray-100 to-gray-200 rounded-2xl overflow-hidden shadow-inner"
                style={{ backgroundColor: customization.backgroundColor }}
              >
                {/* Imagen del producto base */}
                <img
                  src={product.images?.[0] || FALLBACK_IMG_400x300}
                  alt={product.name}
                  className="absolute inset-0 w-full h-full object-cover opacity-40"
                />

                {/* Grid de ayuda */}
                <div className="absolute inset-0 opacity-10 pointer-events-none">
                  <div className="grid grid-cols-10 grid-rows-10 h-full w-full">
                    {[...Array(100)].map((_, i) => (
                      <div key={i} className="border border-gray-400" />
                    ))}
                  </div>
                </div>

                {/* Imagen subida */}
                {customization.uploadedImage && (
                  <div
                    className="absolute cursor-move"
                    style={{
                      left: `${customization.position.x}%`,
                      top: `${customization.position.y}%`,
                      transform: `translate(-50%, -50%) rotate(${customization.rotation}deg) scale(${customization.scale})`,
                      maxWidth: '60%',
                      maxHeight: '60%',
                    }}
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.effectAllowed = 'move';
                    }}
                    onDragEnd={(e) => {
                      if (!canvasRef.current) return;
                      const rect = canvasRef.current.getBoundingClientRect();
                      const x = ((e.clientX - rect.left) / rect.width) * 100;
                      const y = ((e.clientY - rect.top) / rect.height) * 100;
                      setCustomization(prev => ({
                        ...prev,
                        position: { 
                          x: Math.max(10, Math.min(90, x)), 
                          y: Math.max(10, Math.min(90, y)) 
                        }
                      }));
                    }}
                  >
                    <img
                      src={customization.uploadedImage}
                      alt="Logo personalizado"
                      className="max-w-full max-h-full object-contain shadow-2xl"
                      style={{ pointerEvents: 'none' }}
                    />
                  </div>
                )}

                {/* Texto personalizado */}
                {customization.text && (
                  <div
                    className="absolute cursor-move whitespace-nowrap"
                    style={{
                      left: `${customization.position.x}%`,
                      top: customization.uploadedImage ? `${customization.position.y + 20}%` : `${customization.position.y}%`,
                      transform: `translate(-50%, -50%) rotate(${customization.rotation}deg) scale(${customization.scale})`,
                      color: customization.textColor,
                      fontFamily: customization.textFont,
                      fontSize: `${customization.textSize}px`,
                      fontWeight: 'bold',
                      textShadow: '2px 2px 4px rgba(0,0,0,0.3)',
                    }}
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.effectAllowed = 'move';
                    }}
                    onDragEnd={(e) => {
                      if (!canvasRef.current) return;
                      const rect = canvasRef.current.getBoundingClientRect();
                      const x = ((e.clientX - rect.left) / rect.width) * 100;
                      const y = ((e.clientY - rect.top) / rect.height) * 100;
                      setCustomization(prev => ({
                        ...prev,
                        position: { 
                          x: Math.max(10, Math.min(90, x)), 
                          y: Math.max(10, Math.min(90, y)) 
                        }
                      }));
                    }}
                  >
                    {customization.text}
                  </div>
                )}

                {/* Ayuda visual si está vacío */}
                {!customization.uploadedImage && !customization.text && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="text-center">
                      <div className="text-6xl mb-4 opacity-50">🎨</div>
                      <p className="text-xl font-bold text-gray-400">
                        Agrega tu diseño aquí
                      </p>
                      <p className="text-sm text-gray-400 mt-2">
                        Sube una imagen o añade texto
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Controles de transformación */}
              {(customization.uploadedImage || customization.text) && (
                <div className="mt-6 bg-gray-50 rounded-2xl p-6 space-y-4">
                  <h3 className="font-bold text-gray-800 mb-4">Ajustar diseño</h3>
                  
                  <div>
                    <label className="flex items-center justify-between text-sm font-medium text-gray-700 mb-2">
                      <span>Tamaño</span>
                      <span className="text-cyan-600">{Math.round(customization.scale * 100)}%</span>
                    </label>
                    <input
                      type="range"
                      min="0.5"
                      max="2"
                      step="0.1"
                      value={customization.scale}
                      onChange={(e) => setCustomization(prev => ({ ...prev, scale: parseFloat(e.target.value) }))}
                      className="w-full"
                    />
                  </div>

                  <div>
                    <label className="flex items-center justify-between text-sm font-medium text-gray-700 mb-2">
                      <span>Rotación</span>
                      <span className="text-cyan-600">{customization.rotation}°</span>
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="360"
                      value={customization.rotation}
                      onChange={(e) => setCustomization(prev => ({ ...prev, rotation: parseInt(e.target.value) }))}
                      className="w-full"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-2 block">
                      Color de fondo
                    </label>
                    <div className="flex items-center gap-3">
                      <input
                        type="color"
                        value={customization.backgroundColor}
                        onChange={(e) => setCustomization(prev => ({ ...prev, backgroundColor: e.target.value }))}
                        className="w-16 h-10 rounded-lg border-2 border-gray-300 cursor-pointer"
                      />
                      <input
                        type="text"
                        value={customization.backgroundColor}
                        onChange={(e) => setCustomization(prev => ({ ...prev, backgroundColor: e.target.value }))}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg font-mono text-sm"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Panel de Personalización - 1 columna */}
          <div className="space-y-6">
            
            {/* Tabs */}
            <div className="bg-white rounded-2xl shadow-lg p-2 border border-gray-200">
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 'upload', icon: '📤', label: 'Subir' },
                  { id: 'text', icon: '✏️', label: 'Texto' },
                  { id: 'colors', icon: '🎨', label: 'Colores' },
                  { id: 'options', icon: '⚙️', label: 'Opciones' },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`py-3 px-4 rounded-xl font-bold transition-all duration-300 ${
                      activeTab === tab.id
                        ? 'bg-gradient-primary text-white shadow-lg scale-105'
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    <span className="mr-2">{tab.icon}</span>
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Panel de Contenido */}
            <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-200">
              
              {/* Tab: Subir Imagen */}
              {activeTab === 'upload' && (
                <div className="space-y-4">
                  <h3 className="text-xl font-black text-gray-800 mb-4">📤 Subir Logo/Imagen</h3>
                  
                  <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-300 ${
                      isDragging
                        ? 'border-cyan-500 bg-cyan-50'
                        : 'border-gray-300 hover:border-cyan-400 hover:bg-gray-50'
                    }`}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                    />
                    <div className="text-6xl mb-4">📁</div>
                    <p className="font-bold text-gray-800 mb-2">
                      Arrastra tu imagen aquí
                    </p>
                    <p className="text-sm text-gray-500 mb-4">
                      o haz clic para seleccionar
                    </p>
                    <p className="text-xs text-gray-400">
                      PNG, JPG, GIF (máx. 5MB)
                    </p>
                  </div>

                  {customization.uploadedImage && (
                    <div className="bg-green-50 border-2 border-green-200 rounded-xl p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-bold text-green-800">✓ Imagen cargada</span>
                        <button
                          onClick={() => setCustomization(prev => ({ 
                            ...prev, 
                            uploadedImage: null, 
                            uploadedImageFile: null 
                          }))}
                          className="text-red-500 hover:text-red-700 font-bold"
                        >
                          Eliminar
                        </button>
                      </div>
                      <img
                        src={customization.uploadedImage}
                        alt="Preview"
                        className="w-full h-32 object-contain bg-white rounded-lg"
                      />
                    </div>
                  )}

                  <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4">
                    <p className="text-sm text-blue-800 font-medium">
                      💡 <strong>Consejo:</strong> Para mejores resultados, usa imágenes con fondo transparente (PNG).
                    </p>
                  </div>
                </div>
              )}

              {/* Tab: Texto */}
              {activeTab === 'text' && (
                <div className="space-y-4">
                  <h3 className="text-xl font-black text-gray-800 mb-4">✏️ Texto Personalizado</h3>
                  
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">
                      Tu texto
                    </label>
                    <textarea
                      value={customization.text}
                      onChange={(e) => setCustomization(prev => ({ ...prev, text: e.target.value }))}
                      placeholder="Escribe tu texto aquí..."
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:border-cyan-500 focus:ring-2 focus:ring-cyan-200 outline-none transition-all"
                      rows={3}
                      maxLength={50}
                    />
                    <p className="text-xs text-gray-500 mt-1 text-right">
                      {customization.text.length}/50 caracteres
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">
                      Fuente
                    </label>
                    <select
                      value={customization.textFont}
                      onChange={(e) => setCustomization(prev => ({ ...prev, textFont: e.target.value }))}
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:border-cyan-500 outline-none"
                    >
                      {FONTS.map((font) => (
                        <option key={font.value} value={font.value} style={{ fontFamily: font.value }}>
                          {font.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="flex items-center justify-between text-sm font-bold text-gray-700 mb-2">
                      <span>Tamaño del texto</span>
                      <span className="text-cyan-600">{customization.textSize}px</span>
                    </label>
                    <input
                      type="range"
                      min="16"
                      max="64"
                      value={customization.textSize}
                      onChange={(e) => setCustomization(prev => ({ ...prev, textSize: parseInt(e.target.value) }))}
                      className="w-full"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">
                      Color del texto
                    </label>
                    <div className="grid grid-cols-5 gap-2 mb-3">
                      {COLORS.map((color) => (
                        <button
                          key={color.value}
                          onClick={() => setCustomization(prev => ({ ...prev, textColor: color.value }))}
                          className={`w-full aspect-square rounded-lg border-4 transition-all ${
                            customization.textColor === color.value
                              ? 'border-cyan-500 scale-110'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                          style={{ backgroundColor: color.value }}
                          title={color.name}
                        />
                      ))}
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={customization.textColor}
                        onChange={(e) => setCustomization(prev => ({ ...prev, textColor: e.target.value }))}
                        className="w-12 h-10 rounded-lg border-2 border-gray-300 cursor-pointer"
                      />
                      <input
                        type="text"
                        value={customization.textColor}
                        onChange={(e) => setCustomization(prev => ({ ...prev, textColor: e.target.value }))}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg font-mono text-sm"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Tab: Colores */}
              {activeTab === 'colors' && (
                <div className="space-y-4">
                  <h3 className="text-xl font-black text-gray-800 mb-4">🎨 Colores del Producto</h3>
                  
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-3">
                      Color principal
                    </label>
                    <div className="grid grid-cols-5 gap-3">
                      {COLORS.map((color) => (
                        <button
                          key={color.value}
                          onClick={() => setCustomization(prev => ({ ...prev, selectedColor: color.value }))}
                          className={`w-full aspect-square rounded-xl border-4 transition-all hover:scale-105 ${
                            customization.selectedColor === color.value
                              ? 'border-cyan-500 scale-110 shadow-lg'
                              : 'border-gray-200'
                          }`}
                          style={{ backgroundColor: color.value }}
                          title={color.name}
                        >
                          {customization.selectedColor === color.value && (
                            <div className="w-full h-full flex items-center justify-center">
                              <span className="text-2xl drop-shadow-lg">✓</span>
                            </div>
                          )}
                        </button>
                      ))}
                    </div>
                    <p className="text-sm text-gray-500 mt-3">
                      Seleccionado: <strong>{COLORS.find(c => c.value === customization.selectedColor)?.name || 'Personalizado'}</strong>
                    </p>
                  </div>
                </div>
              )}

              {/* Tab: Opciones */}
              {activeTab === 'options' && (
                <div className="space-y-6">
                  <h3 className="text-xl font-black text-gray-800 mb-4">⚙️ Opciones Adicionales</h3>
                  
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-3">
                      Talla / Tamaño
                    </label>
                    <div className="grid grid-cols-4 gap-2">
                      {SIZES.map((size) => (
                        <button
                          key={size}
                          onClick={() => setCustomization(prev => ({ ...prev, selectedSize: size }))}
                          className={`py-3 px-4 rounded-xl font-bold transition-all ${
                            customization.selectedSize === size
                              ? 'bg-gradient-primary text-white shadow-lg scale-105'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                        >
                          {size}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-3">
                      Material
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      {MATERIALS.map((material) => (
                        <button
                          key={material}
                          onClick={() => setCustomization(prev => ({ ...prev, selectedMaterial: material }))}
                          className={`py-3 px-4 rounded-xl font-bold transition-all ${
                            customization.selectedMaterial === material
                              ? 'bg-gradient-primary text-white shadow-lg'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                        >
                          {material}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-3">
                      Acabado
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {FINISHES.map((finish) => (
                        <button
                          key={finish}
                          onClick={() => setCustomization(prev => ({ ...prev, selectedFinish: finish }))}
                          className={`py-3 px-4 rounded-xl font-bold transition-all ${
                            customization.selectedFinish === finish
                              ? 'bg-gradient-primary text-white shadow-lg'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                        >
                          {finish}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-3">
                      Cantidad
                    </label>
                    <div className="flex items-center gap-4">
                      <button
                        onClick={() => setCustomization(prev => ({ ...prev, quantity: Math.max(1, prev.quantity - 1) }))}
                        className="w-12 h-12 rounded-xl bg-gray-100 hover:bg-gray-200 font-bold text-xl transition-all"
                      >
                        −
                      </button>
                      <div className="flex-1 text-center">
                        <div className="text-3xl font-black text-gray-800">{customization.quantity}</div>
                        <div className="text-sm text-gray-500">unidades</div>
                      </div>
                      <button
                        onClick={() => setCustomization(prev => ({ ...prev, quantity: Math.min(100, prev.quantity + 1) }))}
                        className="w-12 h-12 rounded-xl bg-gray-100 hover:bg-gray-200 font-bold text-xl transition-all"
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Resumen y precio */}
            <div className="bg-gradient-to-r from-cyan-50 to-magenta-50 rounded-2xl shadow-lg p-6 border-2 border-cyan-200">
              <h3 className="text-xl font-black text-gray-800 mb-4">💰 Resumen del Pedido</h3>
              
              <div className="space-y-3 mb-6">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Producto base</span>
                  <span className="font-bold">${product.basePrice}</span>
                </div>
                {(customization.uploadedImage || customization.text) && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Personalización (+10%)</span>
                    <span className="font-bold">+${Math.round(product.basePrice * 0.1 * 100) / 100}</span>
                  </div>
                )}
                {(customization.selectedMaterial === 'Acrílico' || customization.selectedMaterial === 'Metal') && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Material premium (+20%)</span>
                    <span className="font-bold">+${Math.round(product.basePrice * 0.2 * 100) / 100}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Cantidad</span>
                  <span className="font-bold">× {customization.quantity}</span>
                </div>
                <div className="border-t-2 border-gray-300 pt-3 flex justify-between">
                  <span className="text-xl font-black text-gray-800">Total</span>
                  <span className="text-3xl font-black text-cyan-600">${calculatePrice()}</span>
                </div>
              </div>

              <button
                onClick={handleAddToCart}
                disabled={isAddingToCart || (!customization.uploadedImage && !customization.text)}
                className={`w-full py-4 px-6 rounded-2xl font-black text-lg transition-all duration-300 ${
                  !customization.uploadedImage && !customization.text
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-gradient-rainbow text-white shadow-lg hover:shadow-2xl transform hover:scale-105'
                }`}
              >
                {isAddingToCart ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Agregando...
                  </span>
                ) : !customization.uploadedImage && !customization.text ? (
                  '⚠️ Agrega un diseño primero'
                ) : (
                  `🛒 Agregar al Carrito - $${calculatePrice()}`
                )}
              </button>

              {(!customization.uploadedImage && !customization.text) && (
                <p className="text-xs text-center text-gray-500 mt-3">
                  Necesitas agregar al menos una imagen o texto para continuar
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}