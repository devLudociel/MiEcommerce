// src/lib/invoiceGenerator.ts
import type { TDocumentDefinitions } from 'pdfmake/interfaces';
import type { OrderData } from './firebase';

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

export function generateInvoiceDefinition(data: InvoiceData): TDocumentDefinitions {
  const { invoiceNumber, invoiceDate, order, companyInfo } = data;

  return {
    pageSize: 'A4',
    pageMargins: [40, 60, 40, 60],

    content: [
      // Header
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
            ]
          },
          {
            width: 'auto',
            stack: [
              { text: 'FACTURA', style: 'invoiceTitle' },
              { text: invoiceNumber, style: 'invoiceNumber' },
            ]
          }
        ],
        margin: [0, 0, 0, 30]
      },

      // Fecha e info
      {
        columns: [
          {
            width: '*',
            stack: [
              { text: 'Fecha de factura:', style: 'label' },
              { text: invoiceDate.toLocaleDateString('es-ES', {
                day: '2-digit',
                month: 'long',
                year: 'numeric'
              }), style: 'value' },
            ]
          },
          {
            width: '*',
            stack: [
              { text: 'Fecha de pedido:', style: 'label' },
              { text: order.createdAt?.toDate ? order.createdAt.toDate().toLocaleDateString('es-ES', {
                day: '2-digit',
                month: 'long',
                year: 'numeric'
              }) : 'N/A', style: 'value' },
            ]
          }
        ],
        margin: [0, 0, 0, 20]
      },

      // Cliente
      {
        text: 'FACTURAR A:', style: 'sectionHeader'
      },
      {
        canvas: [
          {
            type: 'rect',
            x: 0,
            y: 0,
            w: 515,
            h: 90,
            r: 4,
            lineWidth: 1,
            lineColor: '#e2e8f0',
          }
        ]
      },
      {
        stack: [
          { text: `${order.shippingInfo.firstName} ${order.shippingInfo.lastName}`, style: 'customerName' },
          { text: order.shippingInfo.address, style: 'customerDetails' },
          { text: `${order.shippingInfo.zipCode} ${order.shippingInfo.city}, ${order.shippingInfo.state}`, style: 'customerDetails' },
          { text: order.shippingInfo.country, style: 'customerDetails' },
          { text: `Email: ${order.shippingInfo.email}`, style: 'customerDetails' },
          { text: `Teléfono: ${order.shippingInfo.phone}`, style: 'customerDetails' },
        ],
        margin: [10, -80, 0, 0]
      },
      { text: '', margin: [0, 0, 0, 30] },

      // Tabla de productos
      {
        text: 'DETALLE DE PRODUCTOS Y SERVICIOS', style: 'sectionHeader'
      },
      {
        table: {
          headerRows: 1,
          widths: ['*', 60, 70, 70],
          body: [
            [
              { text: 'Descripción', style: 'tableHeader' },
              { text: 'Cantidad', style: 'tableHeader', alignment: 'center' },
              { text: 'Precio Unit.', style: 'tableHeader', alignment: 'right' },
              { text: 'Total', style: 'tableHeader', alignment: 'right' }
            ],
            ...order.items.map(item => [
              {
                stack: [
                  { text: item.name, style: 'itemName' },
                  item.variantName ? { text: `Variante: ${item.variantName}`, style: 'itemVariant' } : {},
                  item.customization ? { text: '✨ Personalizado', style: 'itemCustom' } : {}
                ]
              },
              { text: item.quantity.toString(), alignment: 'center' },
              { text: `€${item.price.toFixed(2)}`, alignment: 'right' },
              { text: `€${(item.price * item.quantity).toFixed(2)}`, alignment: 'right', bold: true }
            ])
          ]
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
        margin: [0, 10, 0, 20]
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
                  { text: `€${order.subtotal.toFixed(2)}`, alignment: 'right', style: 'totalValue' }
                ]
              },
              {
                columns: [
                  { text: 'Envío:', alignment: 'left', style: 'totalLabel' },
                  { text: order.shipping === 0 ? 'GRATIS' : `€${order.shipping.toFixed(2)}`, alignment: 'right', style: 'totalValue' }
                ],
                margin: [0, 5, 0, 0]
              },
              {
                canvas: [
                  {
                    type: 'line',
                    x1: 0,
                    y1: 5,
                    x2: 200,
                    y2: 5,
                    lineWidth: 1,
                    lineColor: '#1e293b'
                  }
                ],
                margin: [0, 10, 0, 10]
              },
              {
                columns: [
                  { text: 'TOTAL:', alignment: 'left', style: 'totalFinal' },
                  { text: `€${order.total.toFixed(2)}`, alignment: 'right', style: 'totalFinalValue' }
                ]
              }
            ]
          }
        ]
      },

      // Método de pago
      {
        text: '',
        margin: [0, 30, 0, 0]
      },
      {
        stack: [
          { text: 'MÉTODO DE PAGO', style: 'sectionHeader' },
          {
            text: getPaymentMethodText(order.paymentInfo.method),
            style: 'paymentMethod'
          }
        ]
      },

      // Notas legales
      {
        text: '',
        margin: [0, 40, 0, 0]
      },
      {
        canvas: [
          {
            type: 'line',
            x1: 0,
            y1: 0,
            x2: 515,
            y2: 0,
            lineWidth: 1,
            lineColor: '#cbd5e1'
          }
        ]
      },
      {
        text: 'Esta factura se ha generado electrónicamente y es válida sin firma.',
        style: 'footer',
        margin: [0, 10, 0, 5]
      },
      {
        text: `Gracias por su compra. Para cualquier consulta, contacte con ${companyInfo.email}`,
        style: 'footer'
      }
    ],

    styles: {
      companyName: {
        fontSize: 18,
        bold: true,
        color: '#0891b2',
        margin: [0, 0, 0, 5]
      },
      companyDetails: {
        fontSize: 9,
        color: '#64748b',
        margin: [0, 2, 0, 0]
      },
      invoiceTitle: {
        fontSize: 28,
        bold: true,
        color: '#0891b2',
        alignment: 'right'
      },
      invoiceNumber: {
        fontSize: 14,
        color: '#64748b',
        alignment: 'right',
        margin: [0, 5, 0, 0]
      },
      label: {
        fontSize: 9,
        color: '#64748b',
        bold: true
      },
      value: {
        fontSize: 10,
        color: '#1e293b',
        margin: [0, 2, 0, 0]
      },
      sectionHeader: {
        fontSize: 11,
        bold: true,
        color: '#1e293b',
        margin: [0, 0, 0, 10]
      },
      customerName: {
        fontSize: 12,
        bold: true,
        color: '#1e293b',
        margin: [0, 5, 0, 3]
      },
      customerDetails: {
        fontSize: 9,
        color: '#64748b',
        margin: [0, 2, 0, 0]
      },
      tableHeader: {
        fontSize: 10,
        bold: true,
        color: '#ffffff',
        fillColor: '#0891b2'
      },
      itemName: {
        fontSize: 10,
        color: '#1e293b',
        bold: true
      },
      itemVariant: {
        fontSize: 8,
        color: '#64748b',
        margin: [0, 2, 0, 0]
      },
      itemCustom: {
        fontSize: 8,
        color: '#9333ea',
        margin: [0, 2, 0, 0]
      },
      totalLabel: {
        fontSize: 10,
        color: '#64748b'
      },
      totalValue: {
        fontSize: 10,
        color: '#1e293b',
        bold: true
      },
      totalFinal: {
        fontSize: 14,
        bold: true,
        color: '#1e293b'
      },
      totalFinalValue: {
        fontSize: 14,
        bold: true,
        color: '#0891b2'
      },
      paymentMethod: {
        fontSize: 10,
        color: '#1e293b',
        margin: [0, 5, 0, 0]
      },
      footer: {
        fontSize: 8,
        color: '#94a3b8',
        alignment: 'center'
      }
    }
  };
}

function getPaymentMethodText(method: string): string {
  const methods: Record<string, string> = {
    card: '💳 Tarjeta de Crédito/Débito',
    paypal: '🅿️ PayPal',
    transfer: '🏦 Transferencia Bancaria',
    cash: '💵 Contra Reembolso'
  };
  return methods[method] || method;
}
