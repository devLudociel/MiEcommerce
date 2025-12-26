// src/lib/invoiceGenerator.ts
import type { TDocumentDefinitions } from 'pdfmake/interfaces';
import type { OrderData, OrderItem, ShippingInfo, BillingInfo } from '../types/firebase';
import type { Timestamp } from 'firebase/firestore';

// Extended order type for invoice generation (includes optional Firestore fields)
interface ExtendedOrderData extends Partial<OrderData> {
  items?: OrderItem[];
  shippingInfo?: ShippingInfo;
  billingInfo?: BillingInfo;
  paymentInfo?: { method?: string };
  subtotal?: number;
  shippingCost?: number;
  tax?: number;
  taxType?: string;
  taxLabel?: string;
  total?: number;
  createdAt?: Timestamp | { toDate: () => Date };
}

export interface InvoiceData {
  invoiceNumber: string;
  invoiceDate: Date;
  order: OrderData;
  companyInfo: {
    name: string;
    address: string;
    city: string;
    zipCode: string;
    taxId: string;
    email: string;
    phone: string;
  };
}

const eur = (v: unknown) => `€${Number(v ?? 0).toFixed(2)}`;
const methodText = (method?: string) => {
  const map: Record<string, string> = {
    card: 'Tarjeta de crédito/débito',
    paypal: 'PayPal',
    transfer: 'Transferencia bancaria',
    cash: 'Contra reembolso',
  };
  return method ? map[method] || method : 'N/A';
};

export function generateInvoiceDefinition(data: InvoiceData): TDocumentDefinitions {
  const { invoiceNumber, invoiceDate, order, companyInfo } = data;

  // Cast to extended type for safe property access
  const extOrder = order as ExtendedOrderData;

  const items: OrderItem[] = Array.isArray(extOrder.items) ? extOrder.items : [];
  const shipping: Partial<ShippingInfo> = extOrder.shippingInfo || {};
  const billing: Partial<BillingInfo> = extOrder.billingInfo || {};
  const subtotal = Number(extOrder.subtotal ?? 0);
  const shippingCost = Number(extOrder.shippingCost ?? 0);
  const tax = Number(extOrder.tax ?? 0);
  const taxType = extOrder.taxType || 'IVA';
  const taxLabel = extOrder.taxLabel || 'IVA (21%)';
  const total = Number(extOrder.total ?? 0);

  // Log only in development (catch errors silently - debug only)
  if (import.meta.env.DEV) {
    try {
      console.log('[invoiceGenerator] data', {
        invoiceNumber,
        items: items.length,
        subtotal,
        shipping: shippingCost,
        total,
        hasShippingInfo: !!order.shippingInfo,
        method: order.paymentInfo?.method ?? undefined,
      });
    } catch (e) {
      console.debug('[invoiceGenerator] Could not log debug info:', e);
    }
  }

  return {
    pageSize: 'A4',
    pageMargins: [40, 60, 40, 60],

    content: [
      // Cabecera empresa + factura
      {
        columns: [
          {
            width: '*',
            stack: [
              { text: companyInfo.name, style: 'companyName' },
              { text: companyInfo.address, style: 'companyDetails' },
              { text: `${companyInfo.zipCode} ${companyInfo.city}`, style: 'companyDetails' },
              { text: `NIF: ${companyInfo.taxId}`, style: 'companyDetails' },
              { text: companyInfo.email, style: 'companyDetails' },
              { text: companyInfo.phone, style: 'companyDetails' },
            ],
          },
          {
            width: 'auto',
            stack: [
              { text: 'FACTURA', style: 'invoiceTitle' },
              { text: invoiceNumber, style: 'invoiceNumber' },
            ],
          },
        ],
        margin: [0, 0, 0, 30],
      },

      // Fechas
      {
        columns: [
          {
            width: '*',
            stack: [
              { text: 'Fecha de factura:', style: 'label' },
              {
                text: invoiceDate.toLocaleDateString('es-ES', {
                  day: '2-digit',
                  month: 'long',
                  year: 'numeric',
                }),
                style: 'value',
              },
            ],
          },
          {
            width: '*',
            stack: [
              { text: 'Fecha de pedido:', style: 'label' },
              {
                text:
                  extOrder.createdAt && 'toDate' in extOrder.createdAt
                    ? extOrder.createdAt.toDate().toLocaleDateString('es-ES', {
                        day: '2-digit',
                        month: 'long',
                        year: 'numeric',
                      })
                    : 'N/A',
                style: 'value',
              },
            ],
          },
        ],
        margin: [0, 0, 0, 20],
      },

      // Datos de cliente (facturación)
      { text: 'FACTURAR A:', style: 'sectionHeader' },
      {
        canvas: [
          { type: 'rect', x: 0, y: 0, w: 515, h: 100, r: 4, lineWidth: 1, lineColor: '#e2e8f0' },
        ],
      },
      {
        stack: [
          {
            text: billing?.fiscalName || `${shipping?.fullName ?? 'N/A'}`,
            style: 'customerName',
          },
          billing?.nifCif
            ? { text: `NIF/CIF: ${billing.nifCif}`, style: 'customerNif' }
            : { text: '' },
          { text: billing?.address || shipping?.address || 'N/A', style: 'customerDetails' },
          {
            text: `${billing?.zipCode || shipping?.zipCode || ''} ${billing?.city || shipping?.city || ''}, ${billing?.state || shipping?.state || ''}`.trim(),
            style: 'customerDetails',
          },
          {
            text: billing?.country || shipping?.country || '',
            style: 'customerDetails',
          },
          { text: `Email: ${shipping?.email ?? 'N/A'}`, style: 'customerDetails' },
          { text: `Teléfono: ${shipping?.phone ?? 'N/A'}`, style: 'customerDetails' },
        ],
        margin: [10, -90, 0, 0],
      },
      { text: '', margin: [0, 0, 0, 30] },

      // Tabla de productos
      { text: 'DETALLE DE PRODUCTOS Y SERVICIOS', style: 'sectionHeader' },
      {
        table: {
          headerRows: 1,
          widths: ['*', 60, 70, 70],
          body: [
            [
              { text: 'Descripción', style: 'tableHeader' },
              { text: 'Cantidad', style: 'tableHeader', alignment: 'center' },
              { text: 'Precio Unit.', style: 'tableHeader', alignment: 'right' },
              { text: 'Total', style: 'tableHeader', alignment: 'right' },
            ],
            ...items.map((item: OrderItem) => {
              const name = item.productName || 'Producto';
              const variantName = item.variantName;
              const price = Number(item.unitPrice || 0);
              const qty = Number(item.quantity || 0);
              return [
                {
                  stack: [
                    { text: name, style: 'itemName' },
                    variantName ? { text: `Variante: ${variantName}`, style: 'itemVariant' } : {},
                    item.customization ? { text: 'Personalizado', style: 'itemCustom' } : {},
                  ],
                },
                { text: String(qty), alignment: 'center' },
                { text: eur(price), alignment: 'right' },
                { text: eur(price * qty), alignment: 'right', bold: true },
              ];
            }),
          ],
        },
        layout: {
          hLineWidth: () => 0.5,
          vLineWidth: () => 0.5,
          hLineColor: () => '#e2e8f0',
          vLineColor: () => '#e2e8f0',
          paddingLeft: () => 8,
          paddingRight: () => 8,
          paddingTop: () => 8,
          paddingBottom: () => 8,
        },
        margin: [0, 10, 0, 20],
      },

      // Totales
      {
        columns: [
          { width: '*', text: '' },
          {
            width: 200,
            stack: [
              {
                columns: [
                  { text: 'Subtotal:', alignment: 'left', style: 'totalLabel' },
                  { text: eur(subtotal), alignment: 'right', style: 'totalValue' },
                ],
              },
              {
                columns: [
                  { text: 'Envío:', alignment: 'left', style: 'totalLabel' },
                  {
                    text: shippingCost === 0 ? 'GRATIS' : eur(shippingCost),
                    alignment: 'right',
                    style: 'totalValue',
                  },
                ],
              },
              {
                columns: [
                  { text: `${taxLabel}:`, alignment: 'left', style: 'totalLabel' },
                  {
                    text: tax === 0 ? 'Exento' : eur(tax),
                    alignment: 'right',
                    style: tax === 0 ? 'totalExempt' : 'totalValue',
                  },
                ],
              },
              {
                columns: [
                  { text: 'Total:', alignment: 'left', style: 'totalLabel' },
                  { text: eur(total), alignment: 'right', style: 'totalFinalValue' },
                ],
                margin: [0, 5, 0, 0],
              },
            ],
          },
        ],
      },

      // Método de pago
      { text: '', margin: [0, 30, 0, 0] },
      {
        stack: [
          { text: 'MÉTODO DE PAGO', style: 'sectionHeader' },
          { text: methodText(extOrder.paymentInfo?.method), style: 'paymentMethod' },
        ],
      },

      // Notas
      { text: '', margin: [0, 40, 0, 0] },
      {
        canvas: [
          { type: 'line', x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 1, lineColor: '#cbd5e1' },
        ],
      },
      {
        text: 'Esta factura se ha generado electrónicamente y es válida sin firma.',
        style: 'footer',
        margin: [0, 10, 0, 5],
      },
      {
        text: `Gracias por su compra. Para cualquier consulta, contacte con ${companyInfo.email}`,
        style: 'footer',
      },
    ],

    styles: {
      companyName: { fontSize: 18, bold: true, color: '#0891b2', margin: [0, 0, 0, 5] },
      companyDetails: { fontSize: 9, color: '#64748b', margin: [0, 2, 0, 0] },
      invoiceTitle: { fontSize: 28, bold: true, color: '#0891b2', alignment: 'right' },
      invoiceNumber: { fontSize: 14, color: '#64748b', alignment: 'right', margin: [0, 5, 0, 0] },
      label: { fontSize: 9, color: '#64748b', bold: true },
      value: { fontSize: 10, color: '#1e293b', margin: [0, 2, 0, 0] },
      sectionHeader: { fontSize: 11, bold: true, color: '#1e293b', margin: [0, 0, 0, 10] },
      customerName: { fontSize: 12, bold: true, color: '#1e293b', margin: [0, 5, 0, 3] },
      customerNif: { fontSize: 9, color: '#0891b2', bold: true, margin: [0, 2, 0, 3] },
      customerDetails: { fontSize: 9, color: '#64748b', margin: [0, 2, 0, 0] },
      tableHeader: { fontSize: 10, bold: true, color: '#ffffff', fillColor: '#0891b2' },
      itemName: { fontSize: 10, color: '#1e293b', bold: true },
      itemVariant: { fontSize: 8, color: '#64748b', margin: [0, 2, 0, 0] },
      itemCustom: { fontSize: 8, color: '#9333ea', margin: [0, 2, 0, 0] },
      totalLabel: { fontSize: 10, color: '#64748b' },
      totalValue: { fontSize: 10, color: '#1e293b', bold: true },
      totalExempt: { fontSize: 10, color: '#16a34a', bold: true },
      totalFinalValue: { fontSize: 14, bold: true, color: '#0891b2' },
      paymentMethod: { fontSize: 10, color: '#1e293b', margin: [0, 5, 0, 0] },
      footer: { fontSize: 8, color: '#94a3b8', alignment: 'center' },
    },
  };
}
