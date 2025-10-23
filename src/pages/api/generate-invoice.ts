// src/pages/api/generate-invoice.ts
import type { APIRoute } from 'astro';
import { db } from '../../lib/firebase.server';
import { doc, getDoc, setDoc, runTransaction } from 'firebase/firestore';
import { generateInvoiceDefinition } from '../../lib/invoiceGenerator';
import type { InvoiceData } from '../../lib/invoiceGenerator';
import type { OrderData } from '../../lib/firebase';
import pdfMake from 'pdfmake/build/pdfmake';
import pdfFonts from 'pdfmake/build/vfs_fonts';

// Configurar fuentes VFS
pdfMake.vfs = pdfFonts.pdfMake.vfs;

// Información de la empresa (puedes moverla a variables de entorno)
const COMPANY_INFO = {
  name: 'Mi E-commerce',
  address: 'Calle Principal 123',
  city: 'Madrid',
  zipCode: '28001',
  taxId: 'B12345678',
  email: 'contacto@miecommerce.com',
  phone: '+34 912 345 678',
};

async function getNextInvoiceNumber(): Promise<string> {
  const counterRef = doc(db, 'system', 'invoiceCounter');

  let invoiceNumber = '';

  await runTransaction(db, async (transaction) => {
    const counterDoc = await transaction.get(counterRef);

    let currentNumber = 1;
    if (counterDoc.exists()) {
      currentNumber = (counterDoc.data().current || 0) + 1;
    }

    // Formato: FAC-YYYY-0001
    const year = new Date().getFullYear();
    const paddedNumber = currentNumber.toString().padStart(4, '0');
    invoiceNumber = `FAC-${year}-${paddedNumber}`;

    transaction.set(counterRef, { current: currentNumber, lastUpdated: new Date() }, { merge: true });
  });

  return invoiceNumber;
}

export const GET: APIRoute = async ({ request, url }) => {
  try {
    const orderId = url.searchParams.get('orderId');

    if (!orderId) {
      return new Response(JSON.stringify({ error: 'Se requiere orderId' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Obtener datos del pedido
    const orderRef = doc(db, 'orders', orderId);
    const orderSnap = await getDoc(orderRef);

    if (!orderSnap.exists()) {
      return new Response(JSON.stringify({ error: 'Pedido no encontrado' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const order = { id: orderSnap.id, ...orderSnap.data() } as OrderData;

    // Verificar si ya tiene factura
    let invoiceNumber = order.invoiceNumber as string | undefined;

    if (!invoiceNumber) {
      // Generar nuevo número de factura
      invoiceNumber = await getNextInvoiceNumber();

      // Actualizar pedido con número de factura
      await setDoc(orderRef, {
        invoiceNumber,
        invoiceDate: new Date(),
        updatedAt: new Date()
      }, { merge: true });
    }

    // Preparar datos para la factura
    const invoiceData: InvoiceData = {
      invoiceNumber,
      invoiceDate: order.invoiceDate?.toDate ? order.invoiceDate.toDate() : new Date(),
      order,
      companyInfo: COMPANY_INFO,
    };

    // Generar definición del PDF
    const docDefinition = generateInvoiceDefinition(invoiceData);

    // Crear el PDF usando pdfMake
    const pdfDocGenerator = pdfMake.createPdf(docDefinition);

    // Generar el buffer del PDF
    return new Promise((resolve, reject) => {
      pdfDocGenerator.getBuffer((buffer: Buffer) => {
        resolve(new Response(buffer, {
          status: 200,
          headers: {
            'Content-Type': 'application/pdf',
            'Content-Disposition': `attachment; filename="Factura-${invoiceNumber}.pdf"`,
          },
        }));
      });
    });

  } catch (error) {
    console.error('Error generando factura:', error);
    return new Response(
      JSON.stringify({
        error: 'Error generando factura',
        details: error instanceof Error ? error.message : String(error)
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
};
