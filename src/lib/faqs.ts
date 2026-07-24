// src/lib/faqs.ts
// Sistema de gestión de FAQs (Preguntas Frecuentes)

import { db } from './firebase';
import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  Timestamp,
  onSnapshot,
  type Unsubscribe,
} from 'firebase/firestore';

// ============================================================================
// TYPES
// ============================================================================

export interface FAQCategory {
  id: string;
  name: string;
  icon: string;
  order: number;
}

export interface FAQ {
  id: string;
  question: string;
  answer: string;
  category: string;
  order: number;
  active: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export type FAQInput = Omit<FAQ, 'id' | 'createdAt' | 'updatedAt'>;

// ============================================================================
// COLLECTION NAMES
// ============================================================================

const FAQS_COLLECTION = 'faqs';
const CATEGORIES_COLLECTION = 'faq_categories';

// ============================================================================
// DEFAULT CATEGORIES
// ============================================================================

export const DEFAULT_CATEGORIES: Omit<FAQCategory, 'id'>[] = [
  { name: 'Pedidos', icon: '📦', order: 0 },
  { name: 'Envíos', icon: '🚚', order: 1 },
  { name: 'Pagos', icon: '💳', order: 2 },
  { name: 'Productos', icon: '✨', order: 3 },
  { name: 'Devoluciones', icon: '↩️', order: 4 },
  { name: 'Diseño', icon: '🎨', order: 5 },
];

// ============================================================================
// CATEGORY CRUD
// ============================================================================

export async function getAllCategories(): Promise<FAQCategory[]> {
  try {
    const categoriesRef = collection(db, CATEGORIES_COLLECTION);
    const snapshot = await getDocs(categoriesRef);

    const categories = snapshot.docs.map(
      (doc) =>
        ({
          id: doc.id,
          ...doc.data(),
        }) as FAQCategory
    );

    return categories.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  } catch (error) {
    console.error('Error fetching FAQ categories:', error);
    return [];
  }
}

export async function createCategory(input: Omit<FAQCategory, 'id'>): Promise<string> {
  try {
    const docRef = await addDoc(collection(db, CATEGORIES_COLLECTION), input);
    return docRef.id;
  } catch (error) {
    console.error('Error creating FAQ category:', error);
    throw error;
  }
}

export async function updateCategory(
  id: string,
  updates: Partial<Omit<FAQCategory, 'id'>>
): Promise<void> {
  try {
    const docRef = doc(db, CATEGORIES_COLLECTION, id);
    await updateDoc(docRef, updates);
  } catch (error) {
    console.error('Error updating FAQ category:', error);
    throw error;
  }
}

export async function deleteCategory(id: string): Promise<void> {
  try {
    const docRef = doc(db, CATEGORIES_COLLECTION, id);
    await deleteDoc(docRef);
  } catch (error) {
    console.error('Error deleting FAQ category:', error);
    throw error;
  }
}

// ============================================================================
// FAQ CRUD
// ============================================================================

export async function getAllFAQs(): Promise<FAQ[]> {
  try {
    const faqsRef = collection(db, FAQS_COLLECTION);
    const snapshot = await getDocs(faqsRef);

    const faqs = snapshot.docs.map(
      (doc) =>
        ({
          id: doc.id,
          ...doc.data(),
        }) as FAQ
    );

    return faqs.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  } catch (error) {
    console.error('Error fetching FAQs:', error);
    return [];
  }
}

export async function getActiveFAQs(): Promise<FAQ[]> {
  try {
    const faqsRef = collection(db, FAQS_COLLECTION);
    const snapshot = await getDocs(faqsRef);

    const faqs = snapshot.docs.map(
      (doc) =>
        ({
          id: doc.id,
          ...doc.data(),
        }) as FAQ
    );

    return faqs
      .filter((faq) => faq.active === true)
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  } catch (error) {
    console.error('Error fetching active FAQs:', error);
    return [];
  }
}

export function subscribeToFAQs(callback: (faqs: FAQ[]) => void): Unsubscribe {
  const faqsRef = collection(db, FAQS_COLLECTION);

  return onSnapshot(
    faqsRef,
    (snapshot) => {
      const faqs = snapshot.docs.map(
        (doc) =>
          ({
            id: doc.id,
            ...doc.data(),
          }) as FAQ
      );
      faqs.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
      callback(faqs);
    },
    (error) => {
      console.error('Error in FAQs subscription:', error);
    }
  );
}

export function subscribeToCategories(callback: (categories: FAQCategory[]) => void): Unsubscribe {
  const categoriesRef = collection(db, CATEGORIES_COLLECTION);

  return onSnapshot(
    categoriesRef,
    (snapshot) => {
      const categories = snapshot.docs.map(
        (doc) =>
          ({
            id: doc.id,
            ...doc.data(),
          }) as FAQCategory
      );
      categories.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
      callback(categories);
    },
    (error) => {
      console.error('Error in categories subscription:', error);
    }
  );
}

export async function createFAQ(input: FAQInput): Promise<string> {
  try {
    const now = Timestamp.now();
    const docRef = await addDoc(collection(db, FAQS_COLLECTION), {
      ...input,
      createdAt: now,
      updatedAt: now,
    });
    return docRef.id;
  } catch (error) {
    console.error('Error creating FAQ:', error);
    throw error;
  }
}

export async function updateFAQ(id: string, updates: Partial<FAQInput>): Promise<void> {
  try {
    const docRef = doc(db, FAQS_COLLECTION, id);
    await updateDoc(docRef, {
      ...updates,
      updatedAt: Timestamp.now(),
    });
  } catch (error) {
    console.error('Error updating FAQ:', error);
    throw error;
  }
}

export async function deleteFAQ(id: string): Promise<void> {
  try {
    const docRef = doc(db, FAQS_COLLECTION, id);
    await deleteDoc(docRef);
  } catch (error) {
    console.error('Error deleting FAQ:', error);
    throw error;
  }
}

export async function toggleFAQActive(id: string, active: boolean): Promise<void> {
  await updateFAQ(id, { active });
}

// ============================================================================
// HELPERS
// ============================================================================

export async function getNextFAQOrder(): Promise<number> {
  const faqs = await getAllFAQs();
  if (faqs.length === 0) return 0;
  return Math.max(...faqs.map((f) => f.order ?? 0)) + 1;
}

export async function moveFAQUp(faqId: string): Promise<void> {
  const faqs = await getAllFAQs();
  const index = faqs.findIndex((f) => f.id === faqId);

  if (index > 0) {
    const prevFaq = faqs[index - 1];
    const currentFaq = faqs[index];

    await Promise.all([
      updateFAQ(currentFaq.id, { order: prevFaq.order }),
      updateFAQ(prevFaq.id, { order: currentFaq.order }),
    ]);
  }
}

export async function moveFAQDown(faqId: string): Promise<void> {
  const faqs = await getAllFAQs();
  const index = faqs.findIndex((f) => f.id === faqId);

  if (index < faqs.length - 1) {
    const nextFaq = faqs[index + 1];
    const currentFaq = faqs[index];

    await Promise.all([
      updateFAQ(currentFaq.id, { order: nextFaq.order }),
      updateFAQ(nextFaq.id, { order: currentFaq.order }),
    ]);
  }
}

// ============================================================================
// MIGRATION - Default FAQs
// ============================================================================

export const DEFAULT_FAQS: Omit<FAQInput, 'order'>[] = [
  // Pedidos
  {
    category: 'pedidos',
    question: '¿Cómo puedo personalizar un producto?',
    answer:
      'Es muy sencillo: Selecciona el producto que te guste, haz clic en "Personalizar", sube tu logo o imagen, añade texto si lo deseas, y previsualiza el resultado en tiempo real. Una vez satisfecho con el diseño, agrégalo al carrito y procede con la compra. Nuestro equipo revisará tu diseño antes de producirlo.',
    active: true,
  },
  {
    category: 'pedidos',
    question: '¿Puedo ver el diseño antes de la producción?',
    answer:
      'Sí, absolutamente. Una vez que hagas tu pedido, te enviaremos una prueba digital para tu aprobación en un plazo de 24 horas. No comenzaremos la producción hasta que apruebes el diseño final. Puedes solicitar cambios sin costo adicional.',
    active: true,
  },
  {
    category: 'pedidos',
    question: '¿Qué formatos de archivo aceptan?',
    answer:
      'Aceptamos PNG, JPG, PDF, AI, SVG, EPS y PSD. Para mejores resultados, recomendamos archivos en alta resolución (mínimo 300 DPI) con fondo transparente. Si tu archivo no cumple los requisitos, nuestro equipo de diseño puede ayudarte a optimizarlo.',
    active: true,
  },
  // Envíos
  {
    category: 'envios',
    question: '¿Cuánto tarda la producción y el envío?',
    answer:
      'La producción tarda entre 3-5 días hábiles dependiendo del producto y la técnica de personalización. El envío estándar tarda 2-3 días adicionales. Ofrecemos opciones de envío express (24-48h) y urgente (24h) por un coste adicional.',
    active: true,
  },
  {
    category: 'envios',
    question: '¿Hacen envíos a toda España?',
    answer:
      'Sí, enviamos a toda España peninsular y Baleares. Para envíos a Canarias, Ceuta y Melilla, consulta las condiciones especiales en nuestra página de envíos. También realizamos envíos internacionales a la Unión Europea.',
    active: true,
  },
  {
    category: 'envios',
    question: '¿El envío es gratuito?',
    answer:
      'El envío estándar es gratuito en pedidos superiores a 50€. Para pedidos inferiores, el coste de envío es de 5.99€. Los envíos express y urgentes tienen un coste adicional independientemente del importe del pedido.',
    active: true,
  },
  // Pagos
  {
    category: 'pagos',
    question: '¿Qué métodos de pago aceptan?',
    answer:
      'Aceptamos tarjetas de crédito y débito (Visa, Mastercard, American Express), PayPal, transferencia bancaria y pago contra reembolso. Todos los pagos con tarjeta están protegidos con tecnología de encriptación SSL.',
    active: true,
  },
  {
    category: 'pagos',
    question: '¿Emiten factura?',
    answer:
      'Sí, emitimos factura para todos los pedidos. Si necesitas factura con tus datos fiscales (NIF/CIF), asegúrate de incluir esta información durante el proceso de compra. La factura se enviará por email una vez completado el pedido.',
    active: true,
  },
  // Productos
  {
    category: 'productos',
    question: '¿Qué técnicas de personalización utilizan?',
    answer:
      'Utilizamos diversas técnicas según el producto: impresión DTF y vinilo para textiles, sublimación para tazas y vajilla, UV DTF para superficies rígidas, corte y grabado láser para madera y metal, impresión offset y digital para papelería, e impresión 3D en resina y filamento.',
    active: true,
  },
  {
    category: 'productos',
    question: '¿Cuál es la calidad de los materiales?',
    answer:
      'Trabajamos únicamente con materiales de primera calidad certificados. Todos nuestros productos textiles son 100% algodón o mezclas premium, nuestros vinilos son de larga duración, y utilizamos tintas ecológicas y resistentes al lavado. Ofrecemos garantía de calidad en todos nuestros productos.',
    active: true,
  },
  // Devoluciones
  {
    category: 'devoluciones',
    question: '¿Puedo devolver un producto personalizado?',
    answer:
      'Los productos personalizados no admiten devolución salvo que presenten defectos de fabricación o no se correspondan con el diseño aprobado. En estos casos, reemplazaremos el producto sin coste adicional. Los productos estándar sin personalizar tienen 14 días de devolución.',
    active: true,
  },
  {
    category: 'devoluciones',
    question: '¿Qué garantía tienen los productos?',
    answer:
      'Todos nuestros productos tienen garantía de calidad de 12 meses contra defectos de fabricación. Si un producto personalizado presenta problemas de impresión, decoloración prematura o defectos en el material, lo reemplazaremos sin coste.',
    active: true,
  },
  // Diseño
  {
    category: 'diseno',
    question: '¿Ofrecen servicios de diseño gráfico?',
    answer:
      'Sí, tenemos un equipo de diseñadores gráficos que pueden crear o adaptar tu diseño. Este servicio tiene un coste adicional que varía según la complejidad. Consulta nuestros precios en la sección de Servicios Digitales o contáctanos para un presupuesto.',
    active: true,
  },
  {
    category: 'diseno',
    question: '¿Necesito conocimientos de diseño para personalizar?',
    answer:
      'No, nuestro sistema de personalización es muy intuitivo. Simplemente arrastra y suelta tu imagen, añade texto, ajusta el tamaño y la posición. Si necesitas ayuda, nuestro equipo está disponible por WhatsApp, email o teléfono para guiarte en el proceso.',
    active: true,
  },
];

export async function migrateDefaultFAQs(): Promise<void> {
  // Check if FAQs already exist
  const existingFAQs = await getAllFAQs();
  if (existingFAQs.length > 0) {
    console.log('FAQs already exist, skipping migration');
    return;
  }

  // Create categories first
  const existingCategories = await getAllCategories();
  if (existingCategories.length === 0) {
    console.log('Creating default categories...');
    for (const category of DEFAULT_CATEGORIES) {
      await createCategory(category);
    }
  }

  // Create FAQs
  console.log('Creating default FAQs...');
  for (let i = 0; i < DEFAULT_FAQS.length; i++) {
    await createFAQ({
      ...DEFAULT_FAQS[i],
      order: i,
    });
  }

  console.log('FAQ migration complete!');
}
