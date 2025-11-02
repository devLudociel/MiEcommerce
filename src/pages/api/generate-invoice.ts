import type { APIRoute } from 'astro';
import { getAdminDb } from '../../lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { generateInvoiceDefinition } from '../../lib/invoiceGenerator';
import type { InvoiceData } from '../../lib/invoiceGenerator';
import type { OrderData } from '../../lib/firebase';
import PdfPrinter from 'pdfmake/src/printer';
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
    // SECURITY: Verificar autenticación
    const authResult = await verifyAuthToken(request);
    if (!authResult.success) {
      return authResult.error!;
    }

    const orderId = url.searchParams.get('orderId');
    console.log('[generate-invoice] start', { orderId, userId: authResult.uid });
    if (!orderId) {
      return createErrorResponse('Se requiere orderId', 400);
    }

    // Leer pedido (Admin)
    const db = getAdminDb();
    const orderRef = db.collection('orders').doc(orderId);
    const orderSnap = await orderRef.get();
    console.log('[generate-invoice] order loaded', { exists: orderSnap.exists });
    if (!orderSnap.exists) {
      return createErrorResponse('Pedido no encontrado', 404);
    }
    const order = { id: orderSnap.id, ...orderSnap.data() } as OrderData;

    // SECURITY: Verificar autorización - solo admin o el usuario dueño del pedido
    if (!authResult.isAdmin && order.userId !== authResult.uid) {
      console.warn('[generate-invoice] Unauthorized access attempt', {
        userId: authResult.uid,
        orderId,
        orderUserId: order.userId,
      });
      return createErrorResponse('Forbidden - No tienes acceso a esta factura', 403);
    }

    // Asegurar número de factura
    let invoiceNumber = order.invoiceNumber as string | undefined;
    if (!invoiceNumber) {
      invoiceNumber = await getNextInvoiceNumber();
      console.log('[generate-invoice] assigning invoice number', { invoiceNumber });
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
    console.log('[generate-invoice] building pdf', { items: itemsLen, invoiceNumber });
    const printer = new PdfPrinter(fonts);
    const pdfDoc = printer.createPdfKitDocument(docDefinition);

    const chunks: Buffer[] = [];
    return new Promise((resolve) => {
      pdfDoc.on('data', (chunk: Buffer) => chunks.push(chunk));
      pdfDoc.on('end', () => {
        const pdfBuffer = Buffer.concat(chunks);
        console.log('[generate-invoice] pdf ready', { bytes: pdfBuffer.length, invoiceNumber });
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
