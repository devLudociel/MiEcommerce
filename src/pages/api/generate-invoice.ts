import type { APIRoute } from 'astro';
import { getAdminDb } from '../../lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { generateInvoiceDefinition } from '../../lib/invoiceGenerator';
import type { InvoiceData } from '../../lib/invoiceGenerator';
import type { OrderData } from '../../lib/firebase';
// PERFORMANCE: PdfPrinter se carga dinámicamente cuando se necesita (línea 133)
import { verifyAuthToken, logErrorSafely, createErrorResponse } from '../../lib/auth-helpers';

// Fuentes estándar de PDFKit (no requieren archivos externos)
const fonts = {
  Roboto: {
    normal: 'Helvetica',
    bold: 'Helvetica-Bold',
    italics: 'Helvetica-Oblique',
    bolditalics: 'Helvetica-BoldOblique',
  },
};

// Información de la empresa desde variables de entorno
const COMPANY_INFO = {
  name: import.meta.env.COMPANY_NAME || 'ImprimeArte',
  address: import.meta.env.COMPANY_ADDRESS || 'Calle Principal 123',
  city: import.meta.env.COMPANY_CITY || 'Madrid',
  zipCode: import.meta.env.COMPANY_ZIP_CODE || '28001',
  taxId: import.meta.env.COMPANY_TAX_ID || 'B12345678',
  email: import.meta.env.COMPANY_EMAIL || 'contacto@imprimearte.es',
  phone: import.meta.env.COMPANY_PHONE || '+34 912 345 678',
};

async function getNextInvoiceNumber(): Promise<string> {
  const db = getAdminDb();
  const counterRef = db.collection('system').doc('invoiceCounter');
  let invoiceNumber = '';
  await db.runTransaction(async (tx) => {
    const snap = await tx.get(counterRef);
    let current = 1;
    if (snap.exists) {
      const data = snap.data() as any;
      current = Number(data?.current || 0) + 1;
    }
    const year = new Date().getFullYear();
    const padded = String(current).padStart(4, '0');
    invoiceNumber = `FAC-${year}-${padded}`;
    tx.set(counterRef, { current, lastUpdated: FieldValue.serverTimestamp() }, { merge: true });
  });
  return invoiceNumber;
}

export const GET: APIRoute = async ({ request, url }) => {
  try {
    const orderId = url.searchParams.get('orderId');
    if (!orderId) {
      return createErrorResponse('Se requiere orderId', 400);
    }

    const guestOrderKey = request.headers.get('x-order-key')?.trim() || null;

    let authUid: string | null = null;
    let isAdmin = false;

    if (!guestOrderKey) {
      const authResult = await verifyAuthToken(request);
      if (!authResult.success) {
        return authResult.error!;
      }
      authUid = authResult.uid || null;
      isAdmin = !!authResult.isAdmin;
    }

    // Leer pedido (Admin)
    const db = getAdminDb();
    const orderRef = db.collection('orders').doc(orderId);
    const orderSnap = await orderRef.get();
    if (!orderSnap.exists) {
      return createErrorResponse('Pedido no encontrado', 404);
    }
    const order = { id: orderSnap.id, ...orderSnap.data() } as OrderData & {
      idempotencyKey?: string;
    };

    if (authUid) {
      // SECURITY: Verificar autorización - solo admin o el usuario dueño del pedido
      if (!isAdmin && order.userId !== authUid) {
        if (import.meta.env.DEV) {
          console.warn('[generate-invoice] Unauthorized access attempt');
        }
        return createErrorResponse('Forbidden - No tienes acceso a esta factura', 403);
      }
    } else {
      // Guest access path
      if (order.userId !== 'guest') {
        if (import.meta.env.DEV) {
          console.warn('[generate-invoice] Guest access rejected (non-guest order)');
        }
        return createErrorResponse('Forbidden - Se requiere autenticación', 403);
      }

      if (!guestOrderKey || order.idempotencyKey !== guestOrderKey) {
        if (import.meta.env.DEV) {
          console.warn('[generate-invoice] Guest access rejected (invalid key)');
        }
        return createErrorResponse('Forbidden - Clave de pedido inválida', 403);
      }
    }

    // Asegurar número de factura
    let invoiceNumber = order.invoiceNumber as string | undefined;
    if (!invoiceNumber) {
      invoiceNumber = await getNextInvoiceNumber();
      await orderRef.set(
        {
          invoiceNumber,
          invoiceDate: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true }
      );
    }

    const invoiceData: InvoiceData = {
      invoiceNumber,
      invoiceDate: order.invoiceDate?.toDate ? order.invoiceDate.toDate() : new Date(),
      order,
      companyInfo: COMPANY_INFO,
    };

    const docDefinition = generateInvoiceDefinition(invoiceData);
    const itemsLen = Array.isArray((order as any).items) ? (order as any).items.length : 0;

    // PERFORMANCE: Lazy load PdfPrinter solo cuando se necesita generar PDF
    // Esto mejora el cold start del servidor
    const { default: PdfPrinter } = await import('pdfmake/src/printer');
    const printer = new PdfPrinter(fonts);
    const pdfDoc = printer.createPdfKitDocument(docDefinition);

    const chunks: Buffer[] = [];
    return new Promise((resolve) => {
      pdfDoc.on('data', (chunk: Buffer) => chunks.push(chunk));
      pdfDoc.on('end', () => {
        const pdfBuffer = Buffer.concat(chunks);
        resolve(
          new Response(pdfBuffer, {
            status: 200,
            headers: {
              'Content-Type': 'application/pdf',
              'Content-Disposition': `attachment; filename="Factura-${invoiceNumber}.pdf"`,
            },
          })
        );
      });
      pdfDoc.end();
    });
  } catch (error) {
    // SECURITY: No exponer detalles internos
    logErrorSafely('generate-invoice', error);
    return createErrorResponse('Error generando factura', 500);
  }
};
