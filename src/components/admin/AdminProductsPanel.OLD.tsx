import { useEffect, useMemo, useState } from 'react';
import { db, storage, auth } from '../../lib/firebase';
import { FALLBACK_IMG_400x300 } from '../../lib/placeholders';
import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  onSnapshot,
  Timestamp,
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, listAll, deleteObject } from 'firebase/storage';
import { signOut } from 'firebase/auth';
import VariantImageManager from './VariantImageManager';
import { productSchema } from '../../lib/validation/schemas';
import { useSimpleFormValidation } from '../../hooks/useFormValidation';
import { notify } from '../../lib/notifications';
import { logger } from '../../lib/logger';

// Tipos actualizados
interface ProductCategory {
  id: string;
  name: string;
  slug: string;
  description: string;
  active: boolean;
}

interface ProductSubcategory {
  id: string;
  categoryId: string;
  name: string;
  slug: string;
  description: string;
  active: boolean;
}

interface ProductAttribute {
  id: string;
  name: string;
  type: 'select' | 'number' | 'text' | 'boolean';
  required: boolean;
  options?: AttributeOption[];
}

interface AttributeOption {
  id: string;
  value: string;
  priceModifier: number;
}

interface SubcategoryAttribute {
  subcategoryId: string;
  attributeId: string;
}

interface ProductAttributeValue {
  attributeId: string;
  value: string;
}

interface FirebaseProduct {
  id?: string;
  name: string;
  description: string;
  categoryId: string;
  subcategoryId: string;
  basePrice: number;
  images: string[];
  attributes: ProductAttributeValue[];
  tags: string[];
  featured: boolean;
  onSale: boolean;
  salePrice?: number;
  slug: string;
  active: boolean;

  // 🎯 Campos para filtros públicos (compatibilidad con FilterPanel)
  category?: string; // Simple string: 'camisetas', 'sudaderas', 'resina', etc.
  colors?: string[]; // Array de IDs de colores: ['white', 'black', 'red']
  sizes?: string[]; // Array de tallas: ['S', 'M', 'L', 'XL']

  // 🎯 Campos de Oferta Especial
  isSpecialOffer?: boolean;
  specialOfferEndDate?: any; // Timestamp
  specialOfferDiscount?: number; // Porcentaje (0-100)
  urgencyLevel?: 'low' | 'medium' | 'high' | 'critical';
  flashSale?: boolean;
  maxStock?: number; // Stock máximo para mostrar barra de progreso

  createdAt?: any;
  updatedAt?: any;
}

type DraftProduct = Omit<FirebaseProduct, 'id' | 'createdAt' | 'updatedAt'> & {
  id?: string;
  customizerType?: 'shirt' | 'frame' | 'resin' | 'default';
};

const emptyProduct: DraftProduct = {
  name: '',
  description: '',
  categoryId: '',
  subcategoryId: '',
  basePrice: 0,
  images: [],
  attributes: [],
  tags: [],
  featured: false,
  onSale: false,
  salePrice: undefined,
  slug: '',
  active: true,
  category: '',
  colors: [],
  sizes: [],
  isSpecialOffer: false,
  specialOfferEndDate: undefined,
  specialOfferDiscount: undefined,
  urgencyLevel: 'low',
  flashSale: false,
  maxStock: 100,
  customizerType: 'default',
};

// 🎯 Categorías simples para filtrado público (compatibles con FilterPanel)
const simpleCategories = [
  { id: 'camisetas', name: 'Camisetas', needsSizes: true },
  { id: 'sudaderas', name: 'Sudaderas', needsSizes: true },
  { id: 'tazas', name: 'Tazas', needsSizes: false },
  { id: 'gorras', name: 'Gorras', needsSizes: true },
  { id: 'bolsas', name: 'Bolsas', needsSizes: false },
  { id: 'marcos', name: 'Marcos', needsSizes: false },
  { id: 'resina', name: 'Cajas Resina', needsSizes: false },
  { id: 'regalos', name: 'Regalos', needsSizes: false },
  { id: 'textil', name: 'Textil', needsSizes: true },
  { id: 'otros', name: 'Otros', needsSizes: false },
];

// 🎨 Colores disponibles (compatible con FilterPanel)
const availableColors = [
  { id: 'white', name: 'Blanco', hex: '#FFFFFF' },
  { id: 'black', name: 'Negro', hex: '#000000' },
  { id: 'red', name: 'Rojo', hex: '#EF4444' },
  { id: 'blue', name: 'Azul', hex: '#3B82F6' },
  { id: 'green', name: 'Verde', hex: '#10B981' },
  { id: 'yellow', name: 'Amarillo', hex: '#F59E0B' },
  { id: 'pink', name: 'Rosa', hex: '#EC4899' },
  { id: 'gray', name: 'Gris', hex: '#6B7280' },
];

// 📏 Tallas disponibles (compatible con FilterPanel)
const availableSizes = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];

// Datos de categorías y subcategorías según tu clasificación
const categories: ProductCategory[] = [
  {
    id: '1',
    name: 'Productos Gráficos e Impresos',
    slug: 'graficos-impresos',
    description: 'Tarjetas, etiquetas, carteles',
    active: true,
  },
  {
    id: '2',
    name: 'Productos Textiles',
    slug: 'textiles',
    description: 'Camisetas, sudaderas, totebags',
    active: true,
  },
  {
    id: '3',
    name: 'Productos de Papelería',
    slug: 'papeleria',
    description: 'Libretas, cuadernos, bolsas',
    active: true,
  },
  {
    id: '4',
    name: 'Productos Sublimados',
    slug: 'sublimados',
    description: 'Tazas, vasos, termos',
    active: true,
  },
  {
    id: '5',
    name: 'Corte y Grabado Láser',
    slug: 'corte-grabado',
    description: 'Llaveros, decoración en madera',
    active: true,
  },
  {
    id: '6',
    name: 'Eventos y Celebraciones',
    slug: 'eventos',
    description: 'Packaging para eventos',
    active: true,
  },
  {
    id: '7',
    name: 'Impresión 3D',
    slug: 'impresion-3d',
    description: 'Figuras en resina y filamento',
    active: true,
  },
  {
    id: '8',
    name: 'Servicios Digitales',
    slug: 'servicios-digitales',
    description: 'Diseño gráfico, desarrollo web',
    active: true,
  },
];

const subcategories: ProductSubcategory[] = [
  // Productos Gráficos e Impresos
  {
    id: '1',
    categoryId: '1',
    name: 'Tarjetas de Visita',
    slug: 'tarjetas-visita',
    description: 'Tarjetas personalizadas',
    active: true,
  },
  {
    id: '2',
    categoryId: '1',
    name: 'Etiquetas y Pegatinas',
    slug: 'etiquetas-pegatinas',
    description: 'Etiquetas en varios materiales',
    active: true,
  },
  {
    id: '3',
    categoryId: '1',
    name: 'Carteles para Eventos',
    slug: 'carteles-eventos',
    description: 'Carteles para bodas, bautizos',
    active: true,
  },

  // Productos Textiles
  {
    id: '4',
    categoryId: '2',
    name: 'Ropa Personalizada',
    slug: 'ropa-personalizada',
    description: 'Camisetas, sudaderas, polos',
    active: true,
  },
  {
    id: '5',
    categoryId: '2',
    name: 'Complementos Textiles',
    slug: 'complementos-textiles',
    description: 'Totebags y otros textiles',
    active: true,
  },

  // Productos de Papelería
  {
    id: '6',
    categoryId: '3',
    name: 'Cuadernos y Libretas',
    slug: 'cuadernos-libretas',
    description: 'Libretas personalizadas',
    active: true,
  },
  {
    id: '7',
    categoryId: '3',
    name: 'Packaging Corporativo',
    slug: 'packaging-corporativo',
    description: 'Bolsas de papel empresas',
    active: true,
  },

  // Productos Sublimados
  {
    id: '8',
    categoryId: '4',
    name: 'Vajilla Personalizada',
    slug: 'vajilla-personalizada',
    description: 'Tazas, vasos, termos',
    active: true,
  },
  {
    id: '9',
    categoryId: '4',
    name: 'Decoración Sublimada',
    slug: 'decoracion-sublimada',
    description: 'Cuadros metálicos',
    active: true,
  },

  // Corte y Grabado Láser
  {
    id: '10',
    categoryId: '5',
    name: 'Llaveros Personalizados',
    slug: 'llaveros',
    description: 'Llaveros en madera y metal',
    active: true,
  },
  {
    id: '11',
    categoryId: '5',
    name: 'Decoración en Madera para Eventos',
    slug: 'decoracion-madera-eventos',
    description: 'Nombres, figuras para bodas',
    active: true,
  },
  {
    id: '12',
    categoryId: '5',
    name: 'Cuadros Decorativos de Madera',
    slug: 'cuadros-madera',
    description: 'Cuadros estilo visor con flores',
    active: true,
  },

  // Eventos y Celebraciones
  {
    id: '13',
    categoryId: '6',
    name: 'Packaging para Eventos',
    slug: 'packaging-eventos',
    description: 'Cajas, empaques personalizados',
    active: true,
  },

  // Impresión 3D
  {
    id: '14',
    categoryId: '7',
    name: 'Impresión en Resina',
    slug: 'impresion-resina',
    description: 'Figuras, personajes detallados',
    active: true,
  },
  {
    id: '15',
    categoryId: '7',
    name: 'Impresión en Filamento',
    slug: 'impresion-filamento',
    description: 'Piezas funcionales y decorativas',
    active: true,
  },

  // Servicios Digitales
  {
    id: '16',
    categoryId: '8',
    name: 'Diseño Gráfico',
    slug: 'diseno-grafico',
    description: 'Logos, identidad corporativa',
    active: true,
  },
  {
    id: '17',
    categoryId: '8',
    name: 'Desarrollo Web',
    slug: 'desarrollo-web',
    description: 'Páginas web básicas',
    active: true,
  },
];

const attributes: ProductAttribute[] = [
  // Atributos para Tarjetas de Visita
  {
    id: '1',
    name: 'Forma',
    type: 'select',
    required: true,
    options: [
      { id: '1', value: 'Standard', priceModifier: 0 },
      { id: '2', value: 'Cuadrada', priceModifier: 2.5 },
    ],
  },
  {
    id: '2',
    name: 'Acabado',
    type: 'select',
    required: true,
    options: [
      { id: '3', value: 'Mate', priceModifier: 0 },
      { id: '4', value: 'Brillo', priceModifier: 1.5 },
    ],
  },

  // Atributos para Textiles
  {
    id: '3',
    name: 'Tipo de Prenda',
    type: 'select',
    required: true,
    options: [
      { id: '5', value: 'Camiseta', priceModifier: 0 },
      { id: '6', value: 'Sudadera', priceModifier: 8 },
      { id: '7', value: 'Polo', priceModifier: 3 },
      { id: '8', value: 'Totebag', priceModifier: -2 },
    ],
  },
  {
    id: '4',
    name: 'Técnica de Personalización',
    type: 'select',
    required: true,
    options: [
      { id: '9', value: 'DTF', priceModifier: 0 },
      { id: '10', value: 'Vinilo', priceModifier: -1 },
      { id: '11', value: 'Bordado', priceModifier: 3 },
    ],
  },
  {
    id: '5',
    name: 'Talla',
    type: 'select',
    required: true,
    options: [
      { id: '12', value: 'XS', priceModifier: 0 },
      { id: '13', value: 'S', priceModifier: 0 },
      { id: '14', value: 'M', priceModifier: 0 },
      { id: '15', value: 'L', priceModifier: 0 },
      { id: '16', value: 'XL', priceModifier: 1 },
      { id: '17', value: 'XXL', priceModifier: 2 },
      { id: '18', value: 'XXXL', priceModifier: 3 },
    ],
  },

  // Atributos para Etiquetas
  {
    id: '6',
    name: 'Material',
    type: 'select',
    required: true,
    options: [
      { id: '19', value: 'Papel', priceModifier: 0 },
      { id: '20', value: 'Vinilo', priceModifier: 1.5 },
      { id: '21', value: 'UV DTF', priceModifier: 2 },
    ],
  },
  {
    id: '7',
    name: 'Forma',
    type: 'select',
    required: true,
    options: [
      { id: '22', value: 'Redonda', priceModifier: 0 },
      { id: '23', value: 'Personalizada', priceModifier: 1 },
    ],
  },

  // Atributos para Sublimación
  {
    id: '8',
    name: 'Producto',
    type: 'select',
    required: true,
    options: [
      { id: '24', value: 'Taza', priceModifier: 0 },
      { id: '25', value: 'Vaso', priceModifier: -1 },
      { id: '26', value: 'Termo', priceModifier: 5 },
    ],
  },
  {
    id: '9',
    name: 'Tipo Especial',
    type: 'select',
    required: false,
    options: [
      { id: '27', value: 'Normal', priceModifier: 0 },
      { id: '28', value: 'Mágica', priceModifier: 3 },
    ],
  },

  // Atributos para Láser
  {
    id: '10',
    name: 'Material Base',
    type: 'select',
    required: true,
    options: [
      { id: '29', value: 'Madera', priceModifier: 0 },
      { id: '30', value: 'Metal', priceModifier: 2 },
    ],
  },

  // Atributos para 3D
  {
    id: '11',
    name: 'Material Impresión',
    type: 'select',
    required: true,
    options: [
      { id: '31', value: 'Resina', priceModifier: 3 },
      { id: '32', value: 'PLA', priceModifier: 0 },
      { id: '33', value: 'ABS', priceModifier: 1 },
      { id: '34', value: 'PETG', priceModifier: 1.5 },
      { id: '35', value: 'TPU', priceModifier: 2 },
    ],
  },

  // Atributos generales
  { id: '12', name: 'Tamaño', type: 'text', required: false },
  { id: '13', name: 'Cantidad', type: 'number', required: true },
  { id: '14', name: 'Color Base', type: 'text', required: false },
];

// Relación subcategoría -> atributos
const subcategoryAttributes: SubcategoryAttribute[] = [
  // Tarjetas de Visita
  { subcategoryId: '1', attributeId: '1' },
  { subcategoryId: '1', attributeId: '2' },
  { subcategoryId: '1', attributeId: '13' },

  // Etiquetas y Pegatinas
  { subcategoryId: '2', attributeId: '6' },
  { subcategoryId: '2', attributeId: '7' },
  { subcategoryId: '2', attributeId: '12' },
  { subcategoryId: '2', attributeId: '13' },

  // Ropa Personalizada
  { subcategoryId: '4', attributeId: '3' },
  { subcategoryId: '4', attributeId: '4' },
  { subcategoryId: '4', attributeId: '5' },
  { subcategoryId: '4', attributeId: '14' },

  // Complementos Textiles
  { subcategoryId: '5', attributeId: '4' },
  { subcategoryId: '5', attributeId: '12' },
  { subcategoryId: '5', attributeId: '14' },

  // Vajilla Personalizada
  { subcategoryId: '8', attributeId: '8' },
  { subcategoryId: '8', attributeId: '9' },
  { subcategoryId: '8', attributeId: '13' },

  // Llaveros
  { subcategoryId: '10', attributeId: '10' },
  { subcategoryId: '10', attributeId: '12' },
  { subcategoryId: '10', attributeId: '13' },

  // Impresión 3D
  { subcategoryId: '14', attributeId: '11' },
  { subcategoryId: '15', attributeId: '11' },
  { subcategoryId: '14', attributeId: '12' },
  { subcategoryId: '15', attributeId: '12' },
  { subcategoryId: '14', attributeId: '14' },
  { subcategoryId: '15', attributeId: '14' },
];

export default function AdminProductsPanel() {
  const [products, setProducts] = useState<FirebaseProduct[]>([]);
  const [draft, setDraft] = useState<DraftProduct>({ ...emptyProduct });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [uploadFiles, setUploadFiles] = useState<File[]>([]);
  const [imagesToRemove, setImagesToRemove] = useState<string[]>([]);

  // Validación con Zod
  const productValidation = useSimpleFormValidation(productSchema);

  const logInfo = (...args: any[]) => logger.info.bind(logger, '[AdminProductsPanel]');
  const logError = (label: string, err: any) => {
    logger.error('[AdminProductsPanel]', label, {
      name: err?.name,
      code: err?.code,
      message: err?.message,
      stack: err?.stack,
    });
  };

  useEffect(() => {
    try {
      const u = auth.currentUser;
      logInfo('Auth currentUser at mount:', { uid: u?.uid, email: u?.email });
    } catch (e) {
      logError('reading auth.currentUser', e);
    }
    logInfo('Mount: subscribe products');
    const unsub = onSnapshot(
      collection(db, 'products'),
      (snapshot) => {
        const list: FirebaseProduct[] = snapshot.docs.map((d) => ({
          id: d.id,
          ...(d.data() as any),
        }));
        logInfo('onSnapshot received products:', list.length);
        setProducts(list);
      },
      (err) => {
        logError('onSnapshot products error', err);
        setError(err?.message || 'Error leyendo productos');
      }
    );
    return () => {
      logInfo('Unmount: unsubscribe products');
      unsub();
    };
  }, []);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      logger.info('🔄 Estado de autenticación cambió:', {
        user: !!user,
        uid: user?.uid,
        email: user?.email,
      });
    });

    return unsubscribe;
  }, []);

  const isEditing = useMemo(() => !!draft.id, [draft.id]);

  const availableSubcategories = useMemo(() => {
    if (!draft.categoryId) return [];
    return subcategories.filter((sub) => sub.categoryId === draft.categoryId && sub.active);
  }, [draft.categoryId]);

  const availableAttributes = useMemo(() => {
    if (!draft.subcategoryId) return [];
    const subcatAttrIds = subcategoryAttributes
      .filter((sa) => sa.subcategoryId === draft.subcategoryId)
      .map((sa) => sa.attributeId);
    return attributes.filter((attr) => subcatAttrIds.includes(attr.id));
  }, [draft.subcategoryId]);

  const totalPrice = useMemo(() => {
    let total = draft.basePrice;

    draft.attributes.forEach((attrValue) => {
      const attribute = attributes.find((attr) => attr.id === attrValue.attributeId);
      if (attribute?.options) {
        const option = attribute.options.find((opt) => opt.value === attrValue.value);
        if (option) {
          total += option.priceModifier;
        }
      }
    });

    return total;
  }, [draft.basePrice, draft.attributes]);

  function resetForm() {
    setDraft({ ...emptyProduct });
    setUploadFiles([]);
    setImagesToRemove([]);
    setError(null);
    setSuccess(null);
  }

  useEffect(() => {
    if (draft.subcategoryId && !isEditing) {
      const newAttributes = availableAttributes
        .filter((attr) => attr.required)
        .map((attr) => ({
          attributeId: attr.id,
          value: attr.options?.[0]?.value || '',
        }));

      setDraft((prev) => ({ ...prev, attributes: newAttributes }));
    }
  }, [draft.subcategoryId, isEditing, availableAttributes]);

  function updateAttributeValue(attributeId: string, value: string) {
    setDraft((prev) => ({
      ...prev,
      attributes: prev.attributes.map((attr) =>
        attr.attributeId === attributeId ? { ...attr, value } : attr
      ),
    }));
  }

  function addAttribute(attributeId: string) {
    const attribute = attributes.find((attr) => attr.id === attributeId);
    if (!attribute) return;

    const defaultValue = attribute.options?.[0]?.value || '';
    setDraft((prev) => ({
      ...prev,
      attributes: [...prev.attributes, { attributeId, value: defaultValue }],
    }));
  }

  function removeAttribute(attributeId: string) {
    setDraft((prev) => ({
      ...prev,
      attributes: prev.attributes.filter((attr) => attr.attributeId !== attributeId),
    }));
  }

  async function testStorageConnection() {
    try {
      logger.info('🧪 Probando conexión a Storage...');
      const user = auth.currentUser;
      if (!user) {
        logger.info('❌ No hay usuario autenticado');
        setError('No hay usuario autenticado para probar Storage');
        return;
      }

      logger.info('👤 Usuario autenticado:', {
        uid: user.uid,
        email: user.email,
        emailVerified: user.emailVerified,
      });

      const token = await user.getIdToken(true);
      logger.info('🔑 Token obtenido, longitud:', token.length);

      const testFile = new Blob(['test-' + Date.now()], { type: 'text/plain' });
      const testRef = ref(storage, `products/test-upload-${Date.now()}.txt`);

      logger.info('📍 Intentando subir a:', testRef.fullPath);

      const snapshot = await uploadBytes(testRef, testFile);
      logger.info('✅ Upload de prueba exitoso:', snapshot.metadata.name);

      const url = await getDownloadURL(testRef);
      logger.info('✅ URL de prueba obtenida:', url);

      await deleteObject(testRef);
      logger.info('✅ Archivo de prueba eliminado');

      setSuccess('✅ Conexión a Storage funcionando correctamente');
    } catch (error: any) {
      logger.error('❌ Error en test de Storage:', {
        name: error.name,
        code: error.code,
        message: error.message,
        serverResponse: error.serverResponse,
      });

      if (error.code === 'storage/unauthorized') {
        setError('❌ Error de autorización en Storage. Verifica las reglas de Firebase.');
      } else if (error.message?.includes('CORS')) {
        setError('❌ Error de CORS. Necesitas configurar CORS en Firebase Storage.');
      } else {
        setError(`❌ Error en Storage: ${error.message}`);
      }
    }
  }

  async function quickTestCreate() {
    try {
      setLoading(true);
      setError(null);
      setSuccess(null);
      logger.info('[AdminProductsPanel] quickTestCreate start');
      const createdAt = Timestamp.now();
      const docRef = await addDoc(collection(db, 'products'), {
        name: 'Test producto',
        description: 'Creado desde botón de prueba',
        categoryId: '1',
        subcategoryId: '1',
        basePrice: 10,
        images: [],
        attributes: [
          { attributeId: '1', value: 'Standard' },
          { attributeId: '2', value: 'Mate' },
          { attributeId: '13', value: '100' },
        ],
        tags: ['test'],
        featured: false,
        onSale: false,
        salePrice: null,
        slug: 'test-producto-' + Date.now(),
        active: true,
        category: 'otros',
        colors: [],
        sizes: [],
        createdAt,
        updatedAt: createdAt,
      });
      logger.info('[AdminProductsPanel] quickTestCreate created id=', docRef.id);
      setSuccess('Producto de prueba creado: ' + docRef.id);
    } catch (e: any) {
      logger.error('[AdminProductsPanel] quickTestCreate error:', {
        code: e?.code,
        message: e?.message,
        name: e?.name,
      });
      if (e?.code === 'permission-denied') {
        setError('Permisos insuficientes (Firestore rules). Ver consola para detalles.');
      } else {
        setError(e?.message || 'Error creando test');
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    logger.info('[AdminProductsPanel] Form submitted');
    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      // Validar con Zod
      const validationResult = await productValidation.validate({
        ...draft,
        tags: (draft.tags || []).map((t) => t.trim()).filter(Boolean),
      });

      if (!validationResult.success) {
        const firstError = Object.values(validationResult.errors!)[0];
        logger.warn('[AdminProductsPanel] Validation failed', validationResult.errors);
        setError(firstError || 'Error de validación');
        setLoading(false);
        return;
      }

      // Validar atributos requeridos (lógica específica no incluida en Zod)
      const requiredAttributes = availableAttributes.filter((attr) => attr.required);
      for (const reqAttr of requiredAttributes) {
        const hasValue = draft.attributes.some(
          (attr) => attr.attributeId === reqAttr.id && attr.value.trim() !== ''
        );
        if (!hasValue) {
          const errorMsg = `El atributo "${reqAttr.name}" es obligatorio`;
          logger.warn('[AdminProductsPanel] Required attribute missing', {
            attribute: reqAttr.name,
          });
          setError(errorMsg);
          notify.error(errorMsg);
          setLoading(false);
          return;
        }
      }

      const normalized: DraftProduct = {
        ...draft,
        tags: (draft.tags || []).map((t) => t.trim()).filter(Boolean),
      };

      if (!isEditing) {
        const createdAt = Timestamp.now();
        const updatedAt = createdAt;
        logger.debug('[AdminProductsPanel] Creating product', {
          name: normalized.name,
          categoryId: normalized.categoryId,
        });
        const docRef = await addDoc(collection(db, 'products'), {
          ...normalized,
          images: [],
          customizerType: draft.customizerType || 'default',
          // 🎯 Campos para filtros públicos
          category: draft.category || 'otros',
          colors: draft.colors || [],
          sizes: draft.sizes || [],
          // 🎯 Campos de Oferta Especial
          isSpecialOffer: !!normalized.isSpecialOffer,
          specialOfferEndDate:
            normalized.isSpecialOffer && normalized.specialOfferEndDate
              ? Timestamp.fromDate(new Date(normalized.specialOfferEndDate))
              : null,
          specialOfferDiscount:
            normalized.isSpecialOffer && normalized.salePrice && normalized.basePrice
              ? Math.round((1 - normalized.salePrice / normalized.basePrice) * 100)
              : null,
          urgencyLevel: normalized.isSpecialOffer ? normalized.urgencyLevel || 'low' : null,
          flashSale: normalized.isSpecialOffer ? !!normalized.flashSale : false,
          maxStock: normalized.isSpecialOffer ? Number(normalized.maxStock) || 100 : null,
          createdAt,
          updatedAt,
        });
        logger.info('[AdminProductsPanel] Product created', { productId: docRef.id });

        let imageUrls: string[] = [];
        if (uploadFiles.length) {
          try {
            logger.info('[AdminProductsPanel] Uploading images', { count: uploadFiles.length });
            imageUrls = await uploadImages(docRef.id, uploadFiles);
            logger.info('[AdminProductsPanel] Images uploaded successfully');
          } catch (e: any) {
            logger.error('[AdminProductsPanel] Error uploading images', e);

            if (e.message?.includes('CORS') || e.code === 'storage/unauthorized') {
              throw new Error('Error de permisos en Storage. Verifica las reglas de Firebase.');
            }

            throw new Error(`Error subiendo imágenes: ${e.message}`);
          }
        }

        if (imageUrls.length) {
          await updateDoc(doc(db, 'products', docRef.id), {
            images: imageUrls,
            updatedAt: Timestamp.now(),
          });
        }

        setSuccess('Producto creado exitosamente');
        notify.success('¡Producto creado exitosamente!');
        logger.info('[AdminProductsPanel] Product creation completed');
        resetForm();
      } else {
        const id = draft.id!;

        const remainingImages = (draft.images || []).filter((url) => !imagesToRemove.includes(url));
        let newUploads: string[] = [];
        if (uploadFiles.length) {
          try {
            logger.info('[AdminProductsPanel] Uploading new images', { count: uploadFiles.length });
            newUploads = await uploadImages(id, uploadFiles);
            logger.info('[AdminProductsPanel] New images uploaded successfully');
          } catch (e: any) {
            logger.error('[AdminProductsPanel] Error uploading new images', e);
            throw new Error(`Error subiendo nuevas imágenes: ${e.message}`);
          }
        }
        const nextImages = [...remainingImages, ...newUploads];

        await updateDoc(doc(db, 'products', id), {
          name: draft.name,
          description: draft.description,
          categoryId: draft.categoryId,
          subcategoryId: draft.subcategoryId,
          basePrice: Number(draft.basePrice) || 0,
          attributes: draft.attributes,
          tags: (draft.tags || []).map((t) => t.trim()).filter(Boolean),
          featured: !!draft.featured,
          onSale: !!draft.onSale,
          salePrice: draft.onSale && draft.salePrice ? Number(draft.salePrice) : null,
          slug: draft.slug,
          active: !!draft.active,
          images: nextImages,
          customizerType: draft.customizerType || 'default',
          // 🎯 Campos para filtros públicos
          category: draft.category || 'otros',
          colors: draft.colors || [],
          sizes: draft.sizes || [],
          // 🎯 Campos de Oferta Especial
          isSpecialOffer: !!draft.isSpecialOffer,
          specialOfferEndDate:
            draft.isSpecialOffer && draft.specialOfferEndDate
              ? Timestamp.fromDate(new Date(draft.specialOfferEndDate))
              : null,
          specialOfferDiscount:
            draft.isSpecialOffer && draft.salePrice && draft.basePrice
              ? Math.round((1 - draft.salePrice / draft.basePrice) * 100)
              : null,
          urgencyLevel: draft.isSpecialOffer ? draft.urgencyLevel || 'low' : null,
          flashSale: draft.isSpecialOffer ? !!draft.flashSale : false,
          maxStock: draft.isSpecialOffer ? Number(draft.maxStock) || 100 : null,
          updatedAt: Timestamp.now(),
        });
        logger.info('[AdminProductsPanel] Product updated', { productId: id });

        await Promise.all(
          imagesToRemove.map(async (url) => {
            try {
              const path = storagePathFromUrl(url);
              if (path) await deleteObject(ref(storage, path));
            } catch (_) {}
          })
        );

        setSuccess('Producto actualizado exitosamente');
        notify.success('¡Producto actualizado exitosamente!');
        logger.info('[AdminProductsPanel] Product update completed');
        resetForm();
      }
    } catch (err: any) {
      logger.error('[AdminProductsPanel] Error in handleSubmit', err);
      if (err?.code === 'permission-denied') {
        const errorMsg = 'Permisos insuficientes (Firestore rules)';
        setError(errorMsg);
        notify.error(errorMsg);
      } else {
        const errorMsg = err?.message || 'Error guardando el producto';
        setError(errorMsg);
        notify.error(errorMsg);
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleEdit(p: FirebaseProduct) {
    setDraft({
      id: p.id!,
      name: p.name,
      description: p.description,
      categoryId: p.categoryId,
      subcategoryId: p.subcategoryId,
      basePrice: p.basePrice,
      images: p.images || [],
      attributes: p.attributes || [],
      tags: p.tags || [],
      featured: p.featured,
      onSale: p.onSale || false,
      salePrice: p.salePrice || undefined,
      slug: p.slug,
      active: p.active,
      customizerType: (p as any).customizerType || 'default',
      // 🎯 Campos para filtros públicos
      category: p.category || 'otros',
      colors: p.colors || [],
      sizes: p.sizes || [],
      // 🎯 Campos de Oferta Especial
      isSpecialOffer: p.isSpecialOffer || false,
      specialOfferEndDate: p.specialOfferEndDate || undefined,
      specialOfferDiscount: p.specialOfferDiscount || undefined,
      urgencyLevel: p.urgencyLevel || 'low',
      flashSale: p.flashSale || false,
      maxStock: p.maxStock || 100,
    });
    setUploadFiles([]);
    setImagesToRemove([]);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function handleDelete(p: FirebaseProduct) {
    if (!p.id) return;
    if (!confirm(`¿Eliminar producto "${p.name}"?`)) return;
    try {
      setLoading(true);
      await deleteDoc(doc(db, 'products', p.id));
      await deleteAllInFolder(`products/${p.id}`);
      setSuccess('Producto eliminado');
    } catch (err: any) {
      setError(err?.message || 'Error eliminando el producto');
    } finally {
      setLoading(false);
    }
  }

  function storagePathFromUrl(url: string): string | null {
    try {
      const u = new URL(url);
      const m = u.pathname.match(/\/o\/([^?]+)/);
      if (!m) return null;
      return decodeURIComponent(m[1]);
    } catch {
      return null;
    }
  }

  function guessImageContentType(name: string): string {
    const lower = name.toLowerCase();
    if (lower.endsWith('.png')) return 'image/png';
    if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg';
    if (lower.endsWith('.webp')) return 'image/webp';
    if (lower.endsWith('.gif')) return 'image/gif';
    if (lower.endsWith('.svg')) return 'image/svg+xml';
    return 'image/jpeg';
  }

  async function uploadImages(productId: string, files: File[]): Promise<string[]> {
    const currentUser = auth.currentUser;
    logger.info('🔐 Estado de autenticación:', {
      user: currentUser,
      uid: currentUser?.uid,
      email: currentUser?.email,
      isSignedIn: !!currentUser,
    });

    if (!currentUser) {
      throw new Error('❌ Usuario NO autenticado - no se puede subir a Storage');
    }

    try {
      const token = await currentUser.getIdToken();
      logger.info('✅ Token de autenticación obtenido correctamente');
    } catch (tokenError) {
      logger.error('❌ Error obteniendo token:', tokenError);
      throw new Error('Sesión de usuario inválida');
    }

    const urls: string[] = [];

    for (const file of files) {
      logger.info(`📤 Procesando archivo: ${file.name} (${file.size} bytes, tipo: ${file.type})`);

      const providedType = (file.type || '').toLowerCase();
      const isImage = providedType.startsWith('image/');
      const contentType = isImage ? providedType : guessImageContentType(file.name);

      if (!contentType.startsWith('image/')) {
        throw new Error(`El archivo ${file.name} no es una imagen válida`);
      }

      const key = `${Date.now()}_${file.name}`.replace(/\s+/g, '_');
      const storagePath = `products/${productId}/${key}`;

      logger.info(`📍 Intentando subir a: ${storagePath}`);

      try {
        const objectRef = ref(storage, storagePath);
        logger.info('📋 Referencia de Storage creada');

        const snapshot = await uploadBytes(objectRef, file, { contentType });
        logger.info('✅ uploadBytes exitoso:', snapshot.metadata);

        const url = await getDownloadURL(objectRef);
        logger.info('🔗 getDownloadURL exitoso:', url);

        urls.push(url);
      } catch (uploadError: any) {
        logger.error('❌ Error específico en upload:', {
          name: uploadError.name,
          code: uploadError.code,
          message: uploadError.message,
          serverResponse: uploadError.serverResponse,
          customData: uploadError.customData,
        });
        throw uploadError;
      }
    }

    return urls;
  }

  async function deleteAllInFolder(prefix: string) {
    try {
      const folderRef = ref(storage, prefix);
      const res = await listAll(folderRef);
      await Promise.all([
        ...res.items.map((i) => deleteObject(i)),
        ...res.prefixes.map((sub) => deleteAllInFolder(sub.fullPath)),
      ]);
    } catch (e: any) {
      logger.error('[AdminProductsPanel] deleteAllInFolder error:', {
        code: e?.code,
        message: e?.message,
      });
    }
  }

  function getCategoryName(categoryId: string): string {
    return categories.find((cat) => cat.id === categoryId)?.name || 'Sin categoría';
  }

  function getSubcategoryName(subcategoryId: string): string {
    return subcategories.find((sub) => sub.id === subcategoryId)?.name || 'Sin subcategoría';
  }

  function getAttributeDisplayValue(attributeId: string, value: string): string {
    const attribute = attributes.find((attr) => attr.id === attributeId);
    if (!attribute) return value;

    if (attribute.options) {
      const option = attribute.options.find((opt) => opt.value === value);
      return option ? `${value} (+€${option.priceModifier})` : value;
    }

    return value;
  }

  return (
    <section className="py-20" style={{ background: 'white', marginTop: '200px' }}>
      <div className="container">
        <div
          className="text-center mb-10"
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '12px',
          }}
        >
          <div style={{ textAlign: 'left' }}>
            <h2 className="text-4xl font-bold text-gray-800 mb-2">Admin Productos</h2>
            <p className="text-gray-600">Crea, edita y elimina productos con atributos dinámicos</p>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button className="btn btn-secondary" onClick={testStorageConnection}>
              🧪 Test Storage
            </button>
            <button
              className="btn btn-ghost"
              onClick={async () => {
                await signOut(auth);
                await fetch('/api/session/logout', { method: 'POST' });
              }}
            >
              Cerrar sesión
            </button>
          </div>
        </div>

        <div style={{ marginBottom: '32px' }}>
          <VariantImageManager />
        </div>

        {error && (
          <div className="error-box mb-6">
            <strong>Error:</strong> {error}
          </div>
        )}
        {success && (
          <div
            className=""
            style={{
              background: '#ecfdf5',
              border: '1px solid #a7f3d0',
              color: '#065f46',
              padding: '12px',
              borderRadius: '12px',
              marginBottom: '16px',
            }}
          >
            {success}
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          className="card"
          style={{
            padding: '16px',
            borderRadius: '16px',
            boxShadow: 'var(--shadow-md)',
            background: 'white',
            marginBottom: '24px',
          }}
        >
          <div className="grid grid-auto-fit" style={{ gap: '12px' }}>
            <div>
              <label>Nombre *</label>
              <input
                className="input"
                value={draft.name}
                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                required
              />
            </div>

            <div>
              <label>Slug *</label>
              <input
                className="input"
                value={draft.slug}
                onChange={(e) => setDraft({ ...draft, slug: e.target.value })}
                required
              />
            </div>

            <div>
              <label>Categoría *</label>
              <select
                className="input"
                value={draft.categoryId}
                onChange={(e) => {
                  setDraft({
                    ...draft,
                    categoryId: e.target.value,
                    subcategoryId: '',
                    attributes: [],
                  });
                }}
                required
              >
                <option value="">Seleccionar categoría</option>
                {categories
                  .filter((cat) => cat.active)
                  .map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
              </select>
            </div>

            <div>
              <label>Subcategoría *</label>
              <select
                className="input"
                value={draft.subcategoryId}
                onChange={(e) => {
                  setDraft({
                    ...draft,
                    subcategoryId: e.target.value,
                    attributes: [],
                  });
                }}
                required
                disabled={!draft.categoryId}
              >
                <option value="">Seleccionar subcategoría</option>
                {availableSubcategories.map((sub) => (
                  <option key={sub.id} value={sub.id}>
                    {sub.name}
                  </option>
                ))}
              </select>
            </div>

            {/* 🎯 CATEGORÍA SIMPLE PARA FILTROS PÚBLICOS */}
            <div style={{ gridColumn: '1 / -1' }}>
              <div
                style={{
                  background: '#fef3c7',
                  border: '2px solid #f59e0b',
                  borderRadius: '12px',
                  padding: '16px',
                }}
              >
                <label
                  style={{
                    fontWeight: 'bold',
                    fontSize: '16px',
                    marginBottom: '8px',
                    display: 'block',
                  }}
                >
                  🏷️ Categoría para Filtros Públicos *
                </label>
                <p style={{ fontSize: '14px', color: '#92400e', marginBottom: '12px' }}>
                  Esta categoría simple se usa para filtrar productos en la página pública. Elige la
                  que mejor represente tu producto.
                </p>
                <select
                  className="input"
                  value={draft.category || ''}
                  onChange={(e) => setDraft({ ...draft, category: e.target.value })}
                  required
                  style={{ fontSize: '16px', fontWeight: 'bold' }}
                >
                  <option value="">Seleccionar categoría pública...</option>
                  {simpleCategories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* 🎨 COLORES */}
            <div style={{ gridColumn: '1 / -1' }}>
              <label
                style={{
                  fontWeight: 'bold',
                  fontSize: '16px',
                  marginBottom: '8px',
                  display: 'block',
                }}
              >
                🎨 Colores Disponibles
              </label>
              <p style={{ fontSize: '14px', color: '#666', marginBottom: '12px' }}>
                Selecciona los colores en los que está disponible este producto (opcional)
              </p>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
                  gap: '12px',
                }}
              >
                {availableColors.map((color) => (
                  <label
                    key={color.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '8px 12px',
                      border: draft.colors?.includes(color.id)
                        ? '2px solid #06b6d4'
                        : '1px solid #d1d5db',
                      borderRadius: '8px',
                      background: draft.colors?.includes(color.id) ? '#ecfeff' : 'white',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={draft.colors?.includes(color.id) || false}
                      onChange={(e) => {
                        const currentColors = draft.colors || [];
                        if (e.target.checked) {
                          setDraft({ ...draft, colors: [...currentColors, color.id] });
                        } else {
                          setDraft({
                            ...draft,
                            colors: currentColors.filter((c) => c !== color.id),
                          });
                        }
                      }}
                    />
                    <div
                      style={{
                        width: '24px',
                        height: '24px',
                        borderRadius: '50%',
                        backgroundColor: color.hex,
                        border: '2px solid #e5e7eb',
                      }}
                    />
                    <span style={{ fontSize: '14px', fontWeight: '500' }}>{color.name}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* 📏 TALLAS (solo si es categoría textil) */}
            {draft.category &&
              simpleCategories.find((c) => c.id === draft.category)?.needsSizes && (
                <div style={{ gridColumn: '1 / -1' }}>
                  <label
                    style={{
                      fontWeight: 'bold',
                      fontSize: '16px',
                      marginBottom: '8px',
                      display: 'block',
                    }}
                  >
                    📏 Tallas Disponibles
                  </label>
                  <p style={{ fontSize: '14px', color: '#666', marginBottom: '12px' }}>
                    Selecciona las tallas disponibles para este producto textil (opcional)
                  </p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
                    {availableSizes.map((size) => (
                      <label
                        key={size}
                        style={{
                          padding: '10px 20px',
                          border: draft.sizes?.includes(size)
                            ? '2px solid #06b6d4'
                            : '1px solid #d1d5db',
                          borderRadius: '8px',
                          background: draft.sizes?.includes(size) ? '#ecfeff' : 'white',
                          cursor: 'pointer',
                          fontWeight: 'bold',
                          fontSize: '14px',
                          transition: 'all 0.2s',
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={draft.sizes?.includes(size) || false}
                          onChange={(e) => {
                            const currentSizes = draft.sizes || [];
                            if (e.target.checked) {
                              setDraft({ ...draft, sizes: [...currentSizes, size] });
                            } else {
                              setDraft({ ...draft, sizes: currentSizes.filter((s) => s !== size) });
                            }
                          }}
                          style={{ marginRight: '8px' }}
                        />
                        {size}
                      </label>
                    ))}
                  </div>
                </div>
              )}

            <div>
              <label>Precio base (€) *</label>
              <input
                type="number"
                step="0.01"
                className="input"
                value={draft.basePrice}
                onChange={(e) => setDraft({ ...draft, basePrice: Number(e.target.value) })}
                required
              />
            </div>

            {totalPrice !== draft.basePrice && (
              <div style={{ gridColumn: '1 / -1' }}>
                <div
                  style={{
                    background: '#f0f9ff',
                    border: '1px solid #0ea5e9',
                    color: '#0c4a6e',
                    padding: '12px',
                    borderRadius: '8px',
                    fontSize: '16px',
                    fontWeight: 'bold',
                  }}
                >
                  💰 Precio total con modificadores: €{totalPrice.toFixed(2)}
                </div>
              </div>
            )}

            <div style={{ gridColumn: '1 / -1' }}>
              <label>Descripción *</label>
              <textarea
                className="input"
                rows={3}
                value={draft.description}
                onChange={(e) => setDraft({ ...draft, description: e.target.value })}
                required
              />
            </div>

            {availableAttributes.length > 0 && (
              <div style={{ gridColumn: '1 / -1' }}>
                <h3 style={{ margin: '16px 0 12px 0', fontSize: '18px', fontWeight: 'bold' }}>
                  🔧 Atributos del Producto
                </h3>

                <div
                  className="grid grid-auto-fit"
                  style={{
                    gap: '12px',
                    background: '#f8fafc',
                    padding: '16px',
                    borderRadius: '8px',
                  }}
                >
                  {availableAttributes.map((attribute) => {
                    const currentValue = draft.attributes.find(
                      (attr) => attr.attributeId === attribute.id
                    );
                    const hasAttribute = !!currentValue;

                    return (
                      <div
                        key={attribute.id}
                        style={{
                          border: attribute.required ? '2px solid #fbbf24' : '1px solid #d1d5db',
                          borderRadius: '8px',
                          padding: '12px',
                          background: 'white',
                        }}
                      >
                        <div
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginBottom: '8px',
                          }}
                        >
                          <label
                            style={{
                              fontWeight: 'bold',
                              color: attribute.required ? '#f59e0b' : '#374151',
                            }}
                          >
                            {attribute.name} {attribute.required && '*'}
                          </label>

                          {!attribute.required && (
                            <button
                              type="button"
                              className={`btn btn-sm ${hasAttribute ? 'btn-secondary' : 'btn-primary'}`}
                              onClick={() =>
                                hasAttribute
                                  ? removeAttribute(attribute.id)
                                  : addAttribute(attribute.id)
                              }
                            >
                              {hasAttribute ? '❌' : '➕'}
                            </button>
                          )}
                        </div>

                        {(hasAttribute || attribute.required) && (
                          <>
                            {attribute.type === 'select' && attribute.options ? (
                              <select
                                className="input"
                                value={currentValue?.value || ''}
                                onChange={(e) => updateAttributeValue(attribute.id, e.target.value)}
                                required={attribute.required}
                              >
                                <option value="">Seleccionar...</option>
                                {attribute.options.map((option) => (
                                  <option key={option.id} value={option.value}>
                                    {option.value}{' '}
                                    {option.priceModifier !== 0 && `(+€${option.priceModifier})`}
                                  </option>
                                ))}
                              </select>
                            ) : attribute.type === 'number' ? (
                              <input
                                type="number"
                                className="input"
                                value={currentValue?.value || ''}
                                onChange={(e) => updateAttributeValue(attribute.id, e.target.value)}
                                required={attribute.required}
                                placeholder="Cantidad..."
                              />
                            ) : (
                              <input
                                type="text"
                                className="input"
                                value={currentValue?.value || ''}
                                onChange={(e) => updateAttributeValue(attribute.id, e.target.value)}
                                required={attribute.required}
                                placeholder={`Ingresa ${attribute.name.toLowerCase()}...`}
                              />
                            )}
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div>
              <label>Tags (separadas por coma)</label>
              <input
                className="input"
                value={draft.tags.join(', ')}
                onChange={(e) => setDraft({ ...draft, tags: e.target.value.split(',') })}
                placeholder="etiqueta1, etiqueta2, etiqueta3"
              />
            </div>

            <div className="flex" style={{ gap: '12px', alignItems: 'center' }}>
              <label className="flex items-center" style={{ gap: '8px' }}>
                <input
                  type="checkbox"
                  checked={draft.active}
                  onChange={(e) => setDraft({ ...draft, active: e.target.checked })}
                />{' '}
                Activo
              </label>
              <label className="flex items-center" style={{ gap: '8px' }}>
                <input
                  type="checkbox"
                  checked={draft.featured}
                  onChange={(e) => setDraft({ ...draft, featured: e.target.checked })}
                />{' '}
                Destacado
              </label>
              <label className="flex items-center" style={{ gap: '8px' }}>
                <input
                  type="checkbox"
                  checked={draft.onSale}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      onSale: e.target.checked,
                      salePrice: e.target.checked ? draft.salePrice : undefined,
                    })
                  }
                />{' '}
                🔥 En Oferta
              </label>
            </div>

            {/* Precio de oferta - solo mostrar si está en oferta */}
            {draft.onSale && (
              <div>
                <label>Precio de Oferta (€)</label>
                <input
                  type="number"
                  step="0.01"
                  value={draft.salePrice || ''}
                  onChange={(e) =>
                    setDraft({ ...draft, salePrice: parseFloat(e.target.value) || undefined })
                  }
                  placeholder="Ej: 19.99"
                />
                {draft.salePrice && draft.basePrice && draft.salePrice >= draft.basePrice && (
                  <p style={{ color: 'orange', fontSize: '0.875rem', marginTop: '4px' }}>
                    ⚠️ El precio de oferta debe ser menor que el precio base (€{draft.basePrice})
                  </p>
                )}
                {draft.salePrice && draft.basePrice && draft.salePrice < draft.basePrice && (
                  <p style={{ color: 'green', fontSize: '0.875rem', marginTop: '4px' }}>
                    ✓ Descuento: {Math.round((1 - draft.salePrice / draft.basePrice) * 100)}%
                  </p>
                )}
              </div>
            )}

            {/* 🎯 SECCIÓN DE OFERTA ESPECIAL */}
            <div style={{ gridColumn: '1 / -1', marginTop: '20px' }}>
              <div
                style={{
                  border: '2px solid #06b6d4',
                  borderRadius: '12px',
                  padding: '20px',
                  backgroundColor: '#f0fdfa',
                }}
              >
                <label className="flex items-center" style={{ gap: '8px', marginBottom: '16px' }}>
                  <input
                    type="checkbox"
                    checked={draft.isSpecialOffer || false}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        isSpecialOffer: e.target.checked,
                        specialOfferEndDate: e.target.checked
                          ? draft.specialOfferEndDate
                          : undefined,
                      })
                    }
                  />
                  <span style={{ fontSize: '18px', fontWeight: 'bold', color: '#0e7490' }}>
                    ⭐ OFERTA ESPECIAL - Aparecerá en la página principal
                  </span>
                </label>

                {draft.isSpecialOffer && (
                  <div style={{ display: 'grid', gap: '16px' }}>
                    {/* Fecha de fin de oferta */}
                    <div>
                      <label>Fecha de fin de la oferta</label>
                      <input
                        type="datetime-local"
                        value={
                          draft.specialOfferEndDate
                            ? draft.specialOfferEndDate.toDate
                              ? new Date(
                                  draft.specialOfferEndDate.toDate().getTime() -
                                    new Date().getTimezoneOffset() * 60000
                                )
                                  .toISOString()
                                  .slice(0, 16)
                              : new Date(
                                  new Date(draft.specialOfferEndDate).getTime() -
                                    new Date().getTimezoneOffset() * 60000
                                )
                                  .toISOString()
                                  .slice(0, 16)
                            : ''
                        }
                        onChange={(e) => {
                          const date = e.target.value ? new Date(e.target.value) : undefined;
                          setDraft({ ...draft, specialOfferEndDate: date });
                        }}
                      />
                      <p style={{ fontSize: '0.875rem', color: '#666', marginTop: '4px' }}>
                        📅 Los usuarios verán un contador regresivo hasta esta fecha
                      </p>
                    </div>

                    {/* Nivel de urgencia */}
                    <div>
                      <label>Nivel de Urgencia</label>
                      <select
                        value={draft.urgencyLevel || 'low'}
                        onChange={(e) =>
                          setDraft({
                            ...draft,
                            urgencyLevel: e.target.value as 'low' | 'medium' | 'high' | 'critical',
                          })
                        }
                      >
                        <option value="low">🟢 Baja - Verde</option>
                        <option value="medium">🟡 Media - Amarillo</option>
                        <option value="high">🟠 Alta - Naranja</option>
                        <option value="critical">🔴 Crítica - Rojo (Parpadeante)</option>
                      </select>
                      <p style={{ fontSize: '0.875rem', color: '#666', marginTop: '4px' }}>
                        Afecta el color del borde y efectos visuales
                      </p>
                    </div>

                    {/* Flash Sale */}
                    <div>
                      <label className="flex items-center" style={{ gap: '8px' }}>
                        <input
                          type="checkbox"
                          checked={draft.flashSale || false}
                          onChange={(e) => setDraft({ ...draft, flashSale: e.target.checked })}
                        />
                        <span>⚡ Flash Sale (Badge especial)</span>
                      </label>
                    </div>

                    {/* Stock máximo (para barra de progreso) */}
                    <div>
                      <label>Stock Máximo (para visualización)</label>
                      <input
                        type="number"
                        min="1"
                        value={draft.maxStock || 100}
                        onChange={(e) =>
                          setDraft({ ...draft, maxStock: parseInt(e.target.value) || 100 })
                        }
                        placeholder="100"
                      />
                      <p style={{ fontSize: '0.875rem', color: '#666', marginTop: '4px' }}>
                        Usado para calcular el % de stock restante en la barra de progreso
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div style={{ gridColumn: '1 / -1' }}>
              <label>Imágenes</label>
              <input
                type="file"
                multiple
                accept="image/*"
                onChange={(e) => setUploadFiles(Array.from(e.target.files || []))}
              />
              {uploadFiles.length > 0 && (
                <div style={{ marginTop: '8px', fontSize: '14px', color: '#666' }}>
                  📁 {uploadFiles.length} archivo(s) seleccionado(s):{' '}
                  {uploadFiles.map((f) => f.name).join(', ')}
                </div>
              )}

              {draft.images?.length ? (
                <div className="grid grid-auto-fit" style={{ marginTop: '12px', gap: '12px' }}>
                  {draft.images.map((url) => (
                    <div key={url} className="card" style={{ padding: '8px' }}>
                      <img
                        src={url}
                        alt="Imagen"
                        style={{
                          width: '100%',
                          height: '140px',
                          objectFit: 'cover',
                          borderRadius: '12px',
                        }}
                      />
                      <button
                        type="button"
                        className={`btn mt-2 ${imagesToRemove.includes(url) ? 'btn-primary' : 'btn-secondary'}`}
                        onClick={() =>
                          setImagesToRemove((prev) =>
                            prev.includes(url) ? prev.filter((u) => u !== url) : [...prev, url]
                          )
                        }
                      >
                        {imagesToRemove.includes(url) ? '↩️ Mantener' : '❌ Quitar'}
                      </button>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          </div>

          <div style={{ gridColumn: '1 / -1', marginTop: '24px' }}>
            <div
              style={{
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: 'white',
                padding: '16px',
                borderRadius: '12px',
                marginBottom: '16px',
              }}
            >
              <h3 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '8px' }}>
                ✨ Configuración de Personalización
              </h3>
              <p style={{ fontSize: '14px', opacity: 0.9 }}>
                Define cómo los clientes podrán personalizar este producto
              </p>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ fontWeight: 'bold', marginBottom: '8px', display: 'block' }}>
                Tipo de Personalizador
              </label>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                  gap: '12px',
                }}
              >
                {(
                  [
                    {
                      value: 'shirt' as const,
                      label: '👕 Camisetas/Ropa',
                      desc: 'Para textiles personalizables',
                    },
                    {
                      value: 'frame' as const,
                      label: '🖼️ Cuadros',
                      desc: 'Para cuadros de flores',
                    },
                    {
                      value: 'resin' as const,
                      label: '🎨 Figuras Resina',
                      desc: 'Para figuras 3D personalizadas',
                    },
                    {
                      value: 'default' as const,
                      label: '📦 Estándar',
                      desc: 'Sin personalización especial',
                    },
                  ] as const
                ).map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setDraft({ ...draft, customizerType: option.value })}
                    style={{
                      padding: '16px',
                      borderRadius: '12px',
                      border:
                        draft.customizerType === option.value
                          ? '3px solid #8b5cf6'
                          : '2px solid #d1d5db',
                      background: draft.customizerType === option.value ? '#f5f3ff' : 'white',
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'all 0.2s',
                    }}
                  >
                    <div style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '4px' }}>
                      {option.label}
                    </div>
                    <div style={{ fontSize: '12px', color: '#6b7280' }}>{option.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {draft.customizerType && draft.customizerType !== 'default' && (
              <div
                style={{
                  background: '#dbeafe',
                  border: '2px solid #3b82f6',
                  borderRadius: '12px',
                  padding: '16px',
                  marginTop: '16px',
                }}
              >
                <div style={{ fontWeight: 'bold', color: '#1e40af', marginBottom: '8px' }}>
                  💡 Subida de Imágenes de Variantes
                </div>
                <p style={{ fontSize: '14px', color: '#1e3a8a', marginBottom: '12px' }}>
                  {draft.customizerType === 'shirt' &&
                    'Sube imágenes para cada color de camiseta (blanco, negro, amarillo, rojo, azul, verde, rosa, gris)'}
                  {draft.customizerType === 'frame' &&
                    'Sube imágenes de cuadros con diferentes colores de flores (rosa, rojo, morado, amarillo, blanco, azul, naranja)'}
                  {draft.customizerType === 'resin' &&
                    'Sube imágenes de cajas en diferentes colores (azul, rosa, dorado, plata, negro, blanco, verde, morado)'}
                </p>

                <div
                  style={{
                    background: '#fef3c7',
                    border: '1px solid #f59e0b',
                    borderRadius: '8px',
                    padding: '12px',
                    fontSize: '13px',
                    color: '#92400e',
                  }}
                >
                  <strong>⚠️ Importante:</strong> Por ahora, las imágenes de variantes se suben
                  manualmente a Firebase Storage.
                  <br />
                  📍 Ruta:{' '}
                  <code
                    style={{
                      background: 'white',
                      padding: '2px 6px',
                      borderRadius: '4px',
                      fontSize: '12px',
                    }}
                  >
                    variants/
                    {draft.customizerType === 'shirt'
                      ? 'camisetas'
                      : draft.customizerType === 'frame'
                        ? 'cuadros'
                        : 'cajas'}
                    /[color]/preview.jpg
                  </code>
                </div>

                <details style={{ marginTop: '12px' }}>
                  <summary
                    style={{
                      cursor: 'pointer',
                      fontWeight: 'bold',
                      color: '#1e40af',
                      padding: '8px',
                      background: 'white',
                      borderRadius: '8px',
                    }}
                  >
                    📚 Ver estructura completa de carpetas
                  </summary>
                  <pre
                    style={{
                      background: '#1e293b',
                      color: '#e2e8f0',
                      padding: '12px',
                      borderRadius: '8px',
                      fontSize: '12px',
                      marginTop: '8px',
                      overflow: 'auto',
                    }}
                  >
                    {`variants/
├── camisetas/
│   ├── blanco/preview.jpg
│   ├── negro/preview.jpg
│   ├── amarillo/preview.jpg
│   ├── rojo/preview.jpg
│   ├── azul/preview.jpg
│   ├── verde/preview.jpg
│   ├── rosa/preview.jpg
│   └── gris/preview.jpg
├── cuadros/
│   ├── flores-rosa/preview.jpg
│   ├── flores-rojo/preview.jpg
│   ├── flores-morado/preview.jpg
│   ├── flores-amarillo/preview.jpg
│   ├── flores-blanco/preview.jpg
│   ├── flores-azul/preview.jpg
│   └── flores-naranja/preview.jpg
└── cajas/
    ├── azul/preview.jpg
    ├── rosa/preview.jpg
    ├── dorado/preview.jpg
    ├── plata/preview.jpg
    ├── negro/preview.jpg
    ├── blanco/preview.jpg
    ├── verde/preview.jpg
    └── morado/preview.jpg`}
                  </pre>
                </details>
              </div>
            )}
          </div>

          <div className="flex" style={{ gap: '12px', marginTop: '16px' }}>
            <button className="btn btn-primary" type="submit" disabled={loading}>
              {loading ? '⏳ Guardando...' : isEditing ? 'Guardar cambios' : 'Crear producto'}
            </button>
            <button className="btn btn-ghost" type="button" onClick={resetForm} disabled={loading}>
              Limpiar
            </button>
            <button
              className="btn btn-secondary"
              type="button"
              onClick={quickTestCreate}
              disabled={loading}
            >
              Crear de prueba
            </button>
          </div>
        </form>

        <div className="grid grid-auto-fit">
          {products.map((p) => (
            <div key={p.id} className="card card-product">
              <img
                src={p.images?.[0] || FALLBACK_IMG_400x300}
                alt={p.name}
                onError={(e) => {
                  const img = e.currentTarget as HTMLImageElement;
                  img.onerror = null;
                  img.src = FALLBACK_IMG_400x300;
                }}
              />
              <div className="card-content">
                <h3 className="text-xl font-bold text-gray-800 mb-2">{p.name}</h3>
                <p className="text-gray-600 mb-2">€{p.basePrice?.toFixed?.(2) || p.basePrice}</p>

                <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '8px' }}>
                  📂 {getCategoryName(p.categoryId)} → {getSubcategoryName(p.subcategoryId)}
                </div>

                {/* 🏷️ Simple category for public filters */}
                {p.category && (
                  <div
                    style={{
                      fontSize: '13px',
                      color: '#06b6d4',
                      marginBottom: '8px',
                      fontWeight: 'bold',
                    }}
                  >
                    🏷️ Categoría pública:{' '}
                    {simpleCategories.find((c) => c.id === p.category)?.name || p.category}
                  </div>
                )}

                {/* 🎨 Colors */}
                {p.colors && p.colors.length > 0 && (
                  <div
                    style={{
                      fontSize: '12px',
                      color: '#4b5563',
                      marginBottom: '8px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                    }}
                  >
                    🎨 Colores:
                    <div style={{ display: 'flex', gap: '4px' }}>
                      {p.colors.map((colorId) => {
                        const color = availableColors.find((c) => c.id === colorId);
                        return color ? (
                          <div
                            key={colorId}
                            title={color.name}
                            style={{
                              width: '20px',
                              height: '20px',
                              borderRadius: '50%',
                              backgroundColor: color.hex,
                              border: '2px solid #e5e7eb',
                            }}
                          />
                        ) : null;
                      })}
                    </div>
                  </div>
                )}

                {/* 📏 Sizes */}
                {p.sizes && p.sizes.length > 0 && (
                  <div style={{ fontSize: '12px', color: '#4b5563', marginBottom: '8px' }}>
                    📏 Tallas: {p.sizes.join(', ')}
                  </div>
                )}

                {p.attributes && p.attributes.length > 0 && (
                  <div style={{ fontSize: '12px', color: '#4b5563', marginBottom: '8px' }}>
                    🔧{' '}
                    {p.attributes
                      .map((attr) => {
                        const attribute = attributes.find((a) => a.id === attr.attributeId);
                        return attribute ? `${attribute.name}: ${attr.value}` : null;
                      })
                      .filter(Boolean)
                      .join(' • ')}
                  </div>
                )}

                <div
                  className="flex"
                  style={{ gap: '8px', flexWrap: 'wrap', marginBottom: '12px' }}
                >
                  {p.active ? (
                    <span className="tag">✅ Activo</span>
                  ) : (
                    <span className="tag">❌ Inactivo</span>
                  )}
                  {p.featured ? <span className="tag">⭐ Destacado</span> : null}
                  {p.tags?.map((tag) => (
                    <span key={tag} className="tag" style={{ fontSize: '11px' }}>
                      {tag}
                    </span>
                  ))}
                </div>

                <div className="flex" style={{ gap: '8px' }}>
                  <button className="btn btn-secondary" onClick={() => handleEdit(p)}>
                    ✏️ Editar
                  </button>
                  <button className="btn btn-ghost" onClick={() => handleDelete(p)}>
                    🗑️ Eliminar
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {products.length === 0 && (
          <div
            style={{
              textAlign: 'center',
              padding: '40px',
              color: '#6b7280',
              background: '#f9fafb',
              borderRadius: '12px',
              border: '2px dashed #d1d5db',
            }}
          >
            <h3 style={{ fontSize: '18px', marginBottom: '8px' }}>No hay productos</h3>
            <p>Crea tu primer producto usando el formulario de arriba</p>
          </div>
        )}
      </div>
    </section>
  );
}
