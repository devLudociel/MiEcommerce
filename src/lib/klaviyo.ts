// Klaviyo event tracking helpers for Imprime Arte
// Sends events for Added to Cart, Started Checkout, Placed Order, Viewed Product

type KlaviyoItem = {
  ProductID: string;
  ProductName: string;
  Quantity: number;
  ItemPrice: number;
  ImageURL?: string;
  ProductURL?: string;
  Categories?: string[];
};

const isKlaviyoReady = () => typeof window !== 'undefined' && typeof window.klaviyo !== 'undefined';

export function klaviyoIdentify(email: string, firstName?: string, lastName?: string) {
  if (!isKlaviyoReady()) return;

  window.klaviyo.push([
    'identify',
    {
      email,
      ...(firstName && { first_name: firstName }),
      ...(lastName && { last_name: lastName }),
    },
  ]);
}

export function klaviyoAddedToCart(item: {
  productId: string;
  productName: string;
  price: number;
  quantity: number;
  imageUrl?: string;
  productUrl?: string;
  category?: string;
}) {
  if (!isKlaviyoReady()) return;

  window.klaviyo.push([
    'track',
    'Added to Cart',
    {
      ProductID: item.productId,
      ProductName: item.productName,
      Quantity: item.quantity,
      ItemPrice: item.price,
      ImageURL: item.imageUrl || '',
      ProductURL: item.productUrl || `https://imprimearte.es/producto/${item.productId}`,
      Categories: item.category ? [item.category] : [],
      AddedAt: new Date().toISOString(),
    },
  ]);
}

export function klaviyoStartedCheckout(data: {
  items: KlaviyoItem[];
  totalPrice: number;
  itemCount: number;
  checkoutUrl?: string;
}) {
  if (!isKlaviyoReady()) return;

  window.klaviyo.push([
    'track',
    'Started Checkout',
    {
      $value: data.totalPrice,
      ItemNames: data.items.map((i) => i.ProductName),
      Items: data.items,
      ItemCount: data.itemCount,
      CheckoutURL: data.checkoutUrl || 'https://imprimearte.es/checkout',
      StartedAt: new Date().toISOString(),
    },
  ]);
}

export function klaviyoPlacedOrder(data: {
  orderId: string;
  items: KlaviyoItem[];
  totalPrice: number;
  itemCount: number;
  paymentMethod?: string;
}) {
  if (!isKlaviyoReady()) return;

  window.klaviyo.push([
    'track',
    'Placed Order',
    {
      $value: data.totalPrice,
      OrderID: data.orderId,
      ItemNames: data.items.map((i) => i.ProductName),
      Items: data.items,
      ItemCount: data.itemCount,
      PaymentMethod: data.paymentMethod || '',
      OrderedAt: new Date().toISOString(),
    },
  ]);

  data.items.forEach((item) => {
    window.klaviyo.push([
      'track',
      'Ordered Product',
      {
        $value: item.ItemPrice * item.Quantity,
        ProductID: item.ProductID,
        ProductName: item.ProductName,
        Quantity: item.Quantity,
        ItemPrice: item.ItemPrice,
        ImageURL: item.ImageURL || '',
        ProductURL: item.ProductURL || '',
      },
    ]);
  });
}

export function klaviyoViewedProduct(product: {
  productId: string;
  productName: string;
  price: number;
  imageUrl?: string;
  productUrl?: string;
  category?: string;
}) {
  if (!isKlaviyoReady()) return;

  window.klaviyo.push([
    'track',
    'Viewed Product',
    {
      ProductID: product.productId,
      ProductName: product.productName,
      ItemPrice: product.price,
      ImageURL: product.imageUrl || '',
      ProductURL: product.productUrl || `https://imprimearte.es/producto/${product.productId}`,
      Categories: product.category ? [product.category] : [],
      ViewedAt: new Date().toISOString(),
    },
  ]);
}

declare global {
  interface Window {
    klaviyo: {
      push: (...args: any[]) => void;
    };
  }
}
