import { useState } from 'react';
import { useConfirmDialog } from '../../hooks/useConfirmDialog';

type CampaignType = 'coupon' | 'product';

interface CouponCampaignData {
  type: 'coupon';
  couponCode: string;
  discountValue: string;
  expiryDate: string;
  description: string;
}

interface ProductCampaignData {
  type: 'product';
  productName: string;
  productDescription: string;
  productImage: string;
  productPrice: string;
  productUrl: string;
}

type CampaignData = CouponCampaignData | ProductCampaignData;

export default function NewsletterCampaignPanel() {
  const [campaignType, setCampaignType] = useState<CampaignType>('coupon');
  const [isLoading, setIsLoading] = useState(false);

  // Accessible confirmation dialog
  const { confirm, ConfirmDialog } = useConfirmDialog();
  const [showPreview, setShowPreview] = useState(false);
  const [result, setResult] = useState<{
    success: boolean;
    message: string;
    stats?: { totalRecipients: number; successCount: number; errorCount: number };
  } | null>(null);

  // Coupon form state
  const [couponCode, setCouponCode] = useState('');
  const [discountValue, setDiscountValue] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [description, setDescription] = useState('');

  // Product form state
  const [productName, setProductName] = useState('');
  const [productDescription, setProductDescription] = useState('');
  const [productImage, setProductImage] = useState('');
  const [productPrice, setProductPrice] = useState('');
  const [productUrl, setProductUrl] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setResult(null);

    // Validate form
    if (campaignType === 'coupon') {
      if (!couponCode || !discountValue || !expiryDate) {
        setResult({
          success: false,
          message: 'Por favor, completa todos los campos obligatorios',
        });
        return;
      }
    } else {
      if (!productName || !productDescription || !productImage || !productPrice || !productUrl) {
        setResult({
          success: false,
          message: 'Por favor, completa todos los campos obligatorios',
        });
        return;
      }
    }

    // Confirm before sending
    const confirmMessage =
      campaignType === 'coupon'
        ? `¿Estás seguro de enviar la campaña del cupón "${couponCode}" a todos los suscriptores?`
        : `¿Estás seguro de enviar la campaña del producto "${productName}" a todos los suscriptores?`;

    const confirmed = await confirm({
      title: '¿Enviar campaña?',
      message: confirmMessage,
      type: 'warning',
      confirmText: 'Enviar',
      cancelText: 'Cancelar',
    });
    if (!confirmed) return;

    setIsLoading(true);

    try {
      const campaignData: CampaignData =
        campaignType === 'coupon'
          ? {
              type: 'coupon',
              couponCode,
              discountValue,
              expiryDate,
              description,
            }
          : {
              type: 'product',
              productName,
              productDescription,
              productImage,
              productPrice,
              productUrl,
            };

      const response = await fetch('/api/send-campaign', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(campaignData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error enviando campaña');
      }

      setResult({
        success: true,
        message: data.message,
        stats: data.stats,
      });

      // Reset form
      if (campaignType === 'coupon') {
        setCouponCode('');
        setDiscountValue('');
        setExpiryDate('');
        setDescription('');
      } else {
        setProductName('');
        setProductDescription('');
        setProductImage('');
        setProductPrice('');
        setProductUrl('');
      }
    } catch (error) {
      console.error('[NewsletterCampaignPanel] Error:', error);
      setResult({
        success: false,
        message: error instanceof Error ? error.message : 'Error enviando campaña',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Enviar Campaña de Newsletter</h2>
        <p className="text-gray-600">
          Envía correos promocionales a todos los suscriptores de tu newsletter
        </p>
      </div>

      {/* Campaign Type Selector */}
      <div className="mb-6">
        <label className="block text-sm font-semibold text-gray-700 mb-3">Tipo de Campaña</label>
        <div className="flex gap-4">
          <button
            type="button"
            onClick={() => setCampaignType('coupon')}
            className={`flex-1 py-3 px-6 rounded-lg font-semibold transition-all ${
              campaignType === 'coupon'
                ? 'bg-gradient-to-r from-amber-500 to-red-500 text-white shadow-lg'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            🎁 Cupón de Descuento
          </button>
          <button
            type="button"
            onClick={() => setCampaignType('product')}
            className={`flex-1 py-3 px-6 rounded-lg font-semibold transition-all ${
              campaignType === 'product'
                ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            🚀 Nuevo Producto
          </button>
        </div>
      </div>

      {/* Campaign Form */}
      <form onSubmit={handleSubmit}>
        {campaignType === 'coupon' ? (
          <>
            <div className="mb-4">
              <label
                htmlFor="couponCode"
                className="block text-sm font-semibold text-gray-700 mb-2"
              >
                Código del Cupón <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="couponCode"
                value={couponCode}
                onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                placeholder="VERANO2025"
                required
              />
            </div>

            <div className="mb-4">
              <label
                htmlFor="discountValue"
                className="block text-sm font-semibold text-gray-700 mb-2"
              >
                Valor del Descuento <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="discountValue"
                value={discountValue}
                onChange={(e) => setDiscountValue(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                placeholder="20% de descuento"
                required
              />
            </div>

            <div className="mb-4">
              <label
                htmlFor="expiryDate"
                className="block text-sm font-semibold text-gray-700 mb-2"
              >
                Fecha de Expiración <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="expiryDate"
                value={expiryDate}
                onChange={(e) => setExpiryDate(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                placeholder="31 de Diciembre, 2025"
                required
              />
            </div>

            <div className="mb-6">
              <label
                htmlFor="description"
                className="block text-sm font-semibold text-gray-700 mb-2"
              >
                Descripción (opcional)
              </label>
              <textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                placeholder="Aprovecha esta oferta especial de verano..."
              />
            </div>
          </>
        ) : (
          <>
            <div className="mb-4">
              <label
                htmlFor="productName"
                className="block text-sm font-semibold text-gray-700 mb-2"
              >
                Nombre del Producto <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="productName"
                value={productName}
                onChange={(e) => setProductName(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="Camiseta Personalizada Premium"
                required
              />
            </div>

            <div className="mb-4">
              <label
                htmlFor="productDescription"
                className="block text-sm font-semibold text-gray-700 mb-2"
              >
                Descripción del Producto <span className="text-red-500">*</span>
              </label>
              <textarea
                id="productDescription"
                value={productDescription}
                onChange={(e) => setProductDescription(e.target.value)}
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="Camiseta de algodón 100% con impresión de alta calidad..."
                required
              />
            </div>

            <div className="mb-4">
              <label
                htmlFor="productImage"
                className="block text-sm font-semibold text-gray-700 mb-2"
              >
                URL de la Imagen <span className="text-red-500">*</span>
              </label>
              <input
                type="url"
                id="productImage"
                value={productImage}
                onChange={(e) => setProductImage(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="https://example.com/image.jpg"
                required
              />
            </div>

            <div className="mb-4">
              <label
                htmlFor="productPrice"
                className="block text-sm font-semibold text-gray-700 mb-2"
              >
                Precio <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="productPrice"
                value={productPrice}
                onChange={(e) => setProductPrice(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="29.99€"
                required
              />
            </div>

            <div className="mb-6">
              <label
                htmlFor="productUrl"
                className="block text-sm font-semibold text-gray-700 mb-2"
              >
                URL del Producto <span className="text-red-500">*</span>
              </label>
              <input
                type="url"
                id="productUrl"
                value={productUrl}
                onChange={(e) => setProductUrl(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="https://imprimearte.com/producto/camiseta-personalizada"
                required
              />
            </div>
          </>
        )}

        {/* Result Message */}
        {result && (
          <div
            className={`mb-6 p-4 rounded-lg ${
              result.success
                ? 'bg-green-50 border border-green-200'
                : 'bg-red-50 border border-red-200'
            }`}
          >
            <p
              className={`font-semibold mb-2 ${result.success ? 'text-green-800' : 'text-red-800'}`}
            >
              {result.success ? '✓ Éxito' : '✗ Error'}
            </p>
            <p className={result.success ? 'text-green-700' : 'text-red-700'}>{result.message}</p>
            {result.stats && (
              <div className="mt-3 grid grid-cols-3 gap-4">
                <div className="bg-white p-3 rounded border border-green-200">
                  <p className="text-sm text-gray-600">Total</p>
                  <p className="text-2xl font-bold text-gray-800">{result.stats.totalRecipients}</p>
                </div>
                <div className="bg-white p-3 rounded border border-green-200">
                  <p className="text-sm text-gray-600">Enviados</p>
                  <p className="text-2xl font-bold text-green-600">{result.stats.successCount}</p>
                </div>
                <div className="bg-white p-3 rounded border border-green-200">
                  <p className="text-sm text-gray-600">Errores</p>
                  <p className="text-2xl font-bold text-red-600">{result.stats.errorCount}</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-4">
          <button
            type="submit"
            disabled={isLoading}
            className={`flex-1 py-3 px-6 rounded-lg font-semibold text-white transition-all ${
              isLoading
                ? 'bg-gray-400 cursor-not-allowed'
                : campaignType === 'coupon'
                  ? 'bg-gradient-to-r from-amber-500 to-red-500 hover:shadow-lg transform hover:scale-105'
                  : 'bg-gradient-to-r from-purple-500 to-pink-500 hover:shadow-lg transform hover:scale-105'
            }`}
          >
            {isLoading ? '📧 Enviando...' : '📧 Enviar Campaña'}
          </button>
        </div>
      </form>

      {/* Info Box */}
      <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <p className="text-sm text-blue-800">
          <strong>💡 Información:</strong> La campaña se enviará a todos los suscriptores activos de
          tu newsletter. Asegúrate de revisar bien todos los datos antes de enviar.
        </p>
      </div>

      {/* Accessible confirmation dialog */}
      <ConfirmDialog />
    </div>
  );
}
