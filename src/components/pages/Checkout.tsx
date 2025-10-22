import { useEffect, useState } from 'react';
import { useStore } from '@nanostores/react';
import { cartStore, clearCart } from '../../store/cartStore';
import type { CartItem } from '../../store/cartStore';
import { FALLBACK_IMG_400x300 } from '../../lib/placeholders';
import { stripePromise } from '../../lib/stripe';

interface ShippingInfo {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  notes?: string;
}

interface PaymentInfo {
  method: 'card' | 'paypal' | 'transfer' | 'cash';
  cardNumber?: string;
  cardName?: string;
  cardExpiry?: string;
  cardCVV?: string;
}

type CheckoutStep = 1 | 2 | 3;

const SHIPPING_COST = 5.99;
const FREE_SHIPPING_THRESHOLD = 50;

export default function Checkout() {
  const cart = useStore(cartStore);
  const [currentStep, setCurrentStep] = useState<CheckoutStep>(1);
  const [isProcessing, setIsProcessing] = useState(false);
  
  const [shippingInfo, setShippingInfo] = useState<ShippingInfo>({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    zipCode: '',
    country: 'España',
    notes: '',
  });

  const [paymentInfo, setPaymentInfo] = useState<PaymentInfo>({
    method: 'card',
    cardNumber: '',
    cardName: '',
    cardExpiry: '',
    cardCVV: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [acceptTerms, setAcceptTerms] = useState(false);

  useEffect(() => {
    if (cart.items.length === 0 && typeof window !== 'undefined') {
      window.location.href = '/';
    }
  }, [cart.items.length]);

  const subtotal = cart.total;
  const shippingCost = subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_COST;
  const total = subtotal + shippingCost;

  const validateStep1 = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!shippingInfo.firstName.trim()) newErrors.firstName = 'Nombre requerido';
    if (!shippingInfo.lastName.trim()) newErrors.lastName = 'Apellido requerido';
    if (!shippingInfo.email.trim()) {
      newErrors.email = 'Email requerido';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(shippingInfo.email)) {
      newErrors.email = 'Email inválido';
    }
    if (!shippingInfo.phone.trim()) newErrors.phone = 'Teléfono requerido';
    if (!shippingInfo.address.trim()) newErrors.address = 'Dirección requerida';
    if (!shippingInfo.city.trim()) newErrors.city = 'Ciudad requerida';
    if (!shippingInfo.state.trim()) newErrors.state = 'Provincia requerida';
    if (!shippingInfo.zipCode.trim()) newErrors.zipCode = 'Código postal requerido';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateStep2 = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (paymentInfo.method === 'card') {
      if (!paymentInfo.cardNumber?.trim()) {
        newErrors.cardNumber = 'Número de tarjeta requerido';
      } else if (paymentInfo.cardNumber.replace(/\s/g, '').length < 16) {
        newErrors.cardNumber = 'Número de tarjeta inválido';
      }
      if (!paymentInfo.cardName?.trim()) newErrors.cardName = 'Nombre requerido';
      if (!paymentInfo.cardExpiry?.trim()) newErrors.cardExpiry = 'Fecha requerida';
      if (!paymentInfo.cardCVV?.trim()) newErrors.cardCVV = 'CVV requerido';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNextStep = () => {
    if (currentStep === 1) {
      if (validateStep1()) {
        setCurrentStep(2);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    } else if (currentStep === 2) {
      if (validateStep2()) {
        setCurrentStep(3);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }
  };

  const handlePreviousStep = () => {
    if (currentStep > 1) {
      setCurrentStep((currentStep - 1) as CheckoutStep);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handlePlaceOrder = async () => {
    if (!acceptTerms) {
      alert('Debes aceptar los términos y condiciones');
      return;
    }
    setIsProcessing(true);

    try {
      // Por ahora todos los pedidos se crean como "pending"
      // El pago con Stripe se procesará después cuando el admin apruebe
      const paymentStatus = 'pending';

      // Crear objeto de pedido
      const orderData = {
        items: cart.items,
        shippingInfo,
        paymentInfo: {
          method: paymentInfo.method,
          cardLast4: paymentInfo.method === 'card'
            ? paymentInfo.cardNumber?.slice(-4)
            : undefined,
        },
        subtotal,
        shipping: shippingCost,
        total,
        status: paymentStatus,
        paymentStatus,
      };

      console.log('📦 Guardando pedido:', orderData);

      // Guardar pedido en Firestore
      const saveResponse = await fetch('/api/save-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderData),
      });

      if (!saveResponse.ok) {
        const errorText = await saveResponse.text();
        console.error('❌ Error del servidor:', errorText);
        throw new Error('Error al guardar el pedido en el servidor');
      }

      const responseData = await saveResponse.json();
      console.log('✅ Respuesta del servidor:', responseData);

      if (responseData.error) {
        throw new Error(responseData.error);
      }

      if (!responseData.orderId) {
        throw new Error('No se recibió ID de pedido');
      }

      // Limpiar carrito y redirigir
      console.log('✅ Pedido guardado con ID:', responseData.orderId);
      clearCart();
      window.location.href = `/confirmacion?orderId=${responseData.orderId}`;

    } catch (error: any) {
      console.error('❌ Error al procesar el pedido:', error);
      alert(error.message || 'Hubo un error al procesar tu pedido. Por favor, intenta de nuevo.');
    } finally {
      setIsProcessing(false);
    }
  };

  const formatCardNumber = (value: string) => {
    const cleaned = value.replace(/\s/g, '');
    const formatted = cleaned.match(/.{1,4}/g)?.join(' ') || cleaned;
    return formatted.substring(0, 19);
  };

  if (cart.items.length === 0) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white py-8 mt-32">
      <div className="container mx-auto px-6 mb-8">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-4">
            {[
              { step: 1, label: 'Envío' },
              { step: 2, label: 'Pago' },
              { step: 3, label: 'Confirmar' },
            ].map((item, index) => (
              <div key={item.step} className="flex items-center flex-1">
                <div className="flex items-center">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold transition-all duration-300 ${currentStep >= item.step ? 'bg-gradient-primary text-white shadow-lg scale-110' : 'bg-gray-200 text-gray-500'}`}>
                    {currentStep > item.step ? '✓' : item.step}
                  </div>
                  <span className={`ml-2 font-bold text-sm ${currentStep >= item.step ? 'text-cyan-600' : 'text-gray-400'}`}>
                    {item.label}
                  </span>
                </div>
                {index < 2 && (
                  <div className={`flex-1 h-1 mx-4 rounded transition-all duration-300 ${currentStep > item.step ? 'bg-gradient-primary' : 'bg-gray-200'}`} />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <div className="bg-white rounded-3xl shadow-2xl p-8 border border-gray-200">
              
              {currentStep === 1 && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-3xl font-black text-gray-800 mb-2">Información de Envío</h2>
                    <p className="text-gray-600">Completa tus datos para recibir tu pedido</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-2">Nombre *</label>
                      <input type="text" value={shippingInfo.firstName} onChange={(e) => setShippingInfo({ ...shippingInfo, firstName: e.target.value })} className={`w-full px-4 py-3 border-2 rounded-xl focus:border-cyan-500 focus:ring-2 focus:ring-cyan-200 outline-none transition-all ${errors.firstName ? 'border-red-500' : 'border-gray-300'}`} placeholder="Juan" />
                      {errors.firstName && <p className="text-red-500 text-sm mt-1">{errors.firstName}</p>}
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-2">Apellidos *</label>
                      <input type="text" value={shippingInfo.lastName} onChange={(e) => setShippingInfo({ ...shippingInfo, lastName: e.target.value })} className={`w-full px-4 py-3 border-2 rounded-xl focus:border-cyan-500 focus:ring-2 focus:ring-cyan-200 outline-none transition-all ${errors.lastName ? 'border-red-500' : 'border-gray-300'}`} placeholder="García" />
                      {errors.lastName && <p className="text-red-500 text-sm mt-1">{errors.lastName}</p>}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-2">Email *</label>
                      <input type="email" value={shippingInfo.email} onChange={(e) => setShippingInfo({ ...shippingInfo, email: e.target.value })} className={`w-full px-4 py-3 border-2 rounded-xl focus:border-cyan-500 focus:ring-2 focus:ring-cyan-200 outline-none transition-all ${errors.email ? 'border-red-500' : 'border-gray-300'}`} placeholder="tu@email.com" />
                      {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email}</p>}
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-2">Teléfono *</label>
                      <input type="tel" value={shippingInfo.phone} onChange={(e) => setShippingInfo({ ...shippingInfo, phone: e.target.value })} className={`w-full px-4 py-3 border-2 rounded-xl focus:border-cyan-500 focus:ring-2 focus:ring-cyan-200 outline-none transition-all ${errors.phone ? 'border-red-500' : 'border-gray-300'}`} placeholder="612 345 678" />
                      {errors.phone && <p className="text-red-500 text-sm mt-1">{errors.phone}</p>}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Dirección *</label>
                    <input type="text" value={shippingInfo.address} onChange={(e) => setShippingInfo({ ...shippingInfo, address: e.target.value })} className={`w-full px-4 py-3 border-2 rounded-xl focus:border-cyan-500 focus:ring-2 focus:ring-cyan-200 outline-none transition-all ${errors.address ? 'border-red-500' : 'border-gray-300'}`} placeholder="Calle Principal, 123, Piso 2" />
                    {errors.address && <p className="text-red-500 text-sm mt-1">{errors.address}</p>}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-2">Ciudad *</label>
                      <input type="text" value={shippingInfo.city} onChange={(e) => setShippingInfo({ ...shippingInfo, city: e.target.value })} className={`w-full px-4 py-3 border-2 rounded-xl focus:border-cyan-500 focus:ring-2 focus:ring-cyan-200 outline-none transition-all ${errors.city ? 'border-red-500' : 'border-gray-300'}`} placeholder="Madrid" />
                      {errors.city && <p className="text-red-500 text-sm mt-1">{errors.city}</p>}
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-2">Provincia *</label>
                      <input type="text" value={shippingInfo.state} onChange={(e) => setShippingInfo({ ...shippingInfo, state: e.target.value })} className={`w-full px-4 py-3 border-2 rounded-xl focus:border-cyan-500 focus:ring-2 focus:ring-cyan-200 outline-none transition-all ${errors.state ? 'border-red-500' : 'border-gray-300'}`} placeholder="Madrid" />
                      {errors.state && <p className="text-red-500 text-sm mt-1">{errors.state}</p>}
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-2">CP *</label>
                      <input type="text" value={shippingInfo.zipCode} onChange={(e) => setShippingInfo({ ...shippingInfo, zipCode: e.target.value })} className={`w-full px-4 py-3 border-2 rounded-xl focus:border-cyan-500 focus:ring-2 focus:ring-cyan-200 outline-none transition-all ${errors.zipCode ? 'border-red-500' : 'border-gray-300'}`} placeholder="28001" />
                      {errors.zipCode && <p className="text-red-500 text-sm mt-1">{errors.zipCode}</p>}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Notas adicionales (opcional)</label>
                    <textarea value={shippingInfo.notes} onChange={(e) => setShippingInfo({ ...shippingInfo, notes: e.target.value })} className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:border-cyan-500 focus:ring-2 focus:ring-cyan-200 outline-none transition-all" rows={3} placeholder="Ej: Dejar en portería, llamar antes de entregar..." />
                  </div>

                  <button onClick={handleNextStep} className="w-full py-4 bg-gradient-rainbow text-white rounded-2xl font-black text-lg shadow-lg hover:shadow-2xl transform hover:scale-105 transition-all duration-300">
                    Continuar al Pago →
                  </button>
                </div>
              )}

              {currentStep === 2 && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-3xl font-black text-gray-800 mb-2">Método de Pago</h2>
                    <p className="text-gray-600">Elige cómo quieres pagar tu pedido</p>
                  </div>

                  <div className="space-y-4">
                    {[
                      { method: 'card', icon: '💳', label: 'Tarjeta de Crédito/Débito', description: 'Pago seguro con tarjeta' },
                      { method: 'paypal', icon: '🅿️', label: 'PayPal', description: 'Pago rápido y seguro' },
                      { method: 'transfer', icon: '🏦', label: 'Transferencia Bancaria', description: 'Te enviaremos los datos' },
                      { method: 'cash', icon: '💵', label: 'Contra Reembolso', description: 'Paga al recibir (+3€)' },
                    ].map((option) => (
                      <button key={option.method} onClick={() => setPaymentInfo({ ...paymentInfo, method: option.method as any })} className={`w-full p-4 rounded-xl border-2 transition-all duration-300 text-left ${paymentInfo.method === option.method ? 'border-cyan-500 bg-cyan-50 shadow-lg scale-105' : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'}`}>
                        <div className="flex items-center gap-4">
                          <div className="text-3xl">{option.icon}</div>
                          <div className="flex-1">
                            <div className="font-bold text-gray-800">{option.label}</div>
                            <div className="text-sm text-gray-500">{option.description}</div>
                          </div>
                          {paymentInfo.method === option.method && (
                            <div className="w-6 h-6 bg-cyan-500 rounded-full flex items-center justify-center text-white">✓</div>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>

                  {paymentInfo.method === 'card' && (
                    <div className="space-y-4 mt-6 p-6 bg-gray-50 rounded-2xl border-2 border-gray-200">
                      <h3 className="font-bold text-gray-800 mb-4">Datos de la Tarjeta</h3>
                      <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">Número de Tarjeta *</label>
                        <input type="text" value={paymentInfo.cardNumber} onChange={(e) => setPaymentInfo({ ...paymentInfo, cardNumber: formatCardNumber(e.target.value) })} className={`w-full px-4 py-3 border-2 rounded-xl focus:border-cyan-500 focus:ring-2 focus:ring-cyan-200 outline-none transition-all font-mono ${errors.cardNumber ? 'border-red-500' : 'border-gray-300'}`} placeholder="1234 5678 9012 3456" maxLength={19} />
                        {errors.cardNumber && <p className="text-red-500 text-sm mt-1">{errors.cardNumber}</p>}
                      </div>
                      <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">Nombre en la Tarjeta *</label>
                        <input type="text" value={paymentInfo.cardName} onChange={(e) => setPaymentInfo({ ...paymentInfo, cardName: e.target.value.toUpperCase() })} className={`w-full px-4 py-3 border-2 rounded-xl focus:border-cyan-500 focus:ring-2 focus:ring-cyan-200 outline-none transition-all ${errors.cardName ? 'border-red-500' : 'border-gray-300'}`} placeholder="JUAN GARCIA" />
                        {errors.cardName && <p className="text-red-500 text-sm mt-1">{errors.cardName}</p>}
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-bold text-gray-700 mb-2">Fecha de Vencimiento *</label>
                          <input type="text" value={paymentInfo.cardExpiry} onChange={(e) => { let value = e.target.value.replace(/\D/g, ''); if (value.length >= 2) { value = value.slice(0, 2) + '/' + value.slice(2, 4); } setPaymentInfo({ ...paymentInfo, cardExpiry: value }); }} className={`w-full px-4 py-3 border-2 rounded-xl focus:border-cyan-500 focus:ring-2 focus:ring-cyan-200 outline-none transition-all font-mono ${errors.cardExpiry ? 'border-red-500' : 'border-gray-300'}`} placeholder="MM/AA" maxLength={5} />
                          {errors.cardExpiry && <p className="text-red-500 text-sm mt-1">{errors.cardExpiry}</p>}
                        </div>
                        <div>
                          <label className="block text-sm font-bold text-gray-700 mb-2">CVV *</label>
                          <input type="text" value={paymentInfo.cardCVV} onChange={(e) => setPaymentInfo({ ...paymentInfo, cardCVV: e.target.value.replace(/\D/g, '').slice(0, 4) })} className={`w-full px-4 py-3 border-2 rounded-xl focus:border-cyan-500 focus:ring-2 focus:ring-cyan-200 outline-none transition-all font-mono ${errors.cardCVV ? 'border-red-500' : 'border-gray-300'}`} placeholder="123" maxLength={4} />
                          {errors.cardCVV && <p className="text-red-500 text-sm mt-1">{errors.cardCVV}</p>}
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="flex gap-4">
                    <button onClick={handlePreviousStep} className="flex-1 py-4 bg-gray-200 text-gray-700 rounded-2xl font-bold text-lg hover:bg-gray-300 transition-all duration-300">← Volver</button>
                    <button onClick={handleNextStep} className="flex-1 py-4 bg-gradient-rainbow text-white rounded-2xl font-black text-lg shadow-lg hover:shadow-2xl transform hover:scale-105 transition-all duration-300">Revisar Pedido →</button>
                  </div>
                </div>
              )}

              {currentStep === 3 && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-3xl font-black text-gray-800 mb-2">Revisar Pedido</h2>
                    <p className="text-gray-600">Confirma que todo está correcto antes de finalizar</p>
                  </div>

                  <div className="bg-gray-50 rounded-2xl p-6 border-2 border-gray-200">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-bold text-gray-800">📦 Envío a:</h3>
                      <button onClick={() => setCurrentStep(1)} className="text-cyan-600 hover:text-cyan-700 font-bold text-sm">Editar</button>
                    </div>
                    <div className="space-y-1 text-gray-700">
                      <p className="font-bold">{shippingInfo.firstName} {shippingInfo.lastName}</p>
                      <p>{shippingInfo.address}</p>
                      <p>{shippingInfo.zipCode} {shippingInfo.city}, {shippingInfo.state}</p>
                      <p>{shippingInfo.country}</p>
                      <p className="pt-2">{shippingInfo.email}</p>
                      <p>{shippingInfo.phone}</p>
                      {shippingInfo.notes && <p className="pt-2 text-sm italic text-gray-600">Nota: {shippingInfo.notes}</p>}
                    </div>
                  </div>

                  <div className="bg-gray-50 rounded-2xl p-6 border-2 border-gray-200">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-bold text-gray-800">💳 Método de Pago:</h3>
                      <button onClick={() => setCurrentStep(2)} className="text-cyan-600 hover:text-cyan-700 font-bold text-sm">Editar</button>
                    </div>
                    <p className="text-gray-700 font-medium">
                      {paymentInfo.method === 'card' && '💳 Tarjeta de Crédito/Débito'}
                      {paymentInfo.method === 'paypal' && '🅿️ PayPal'}
                      {paymentInfo.method === 'transfer' && '🏦 Transferencia Bancaria'}
                      {paymentInfo.method === 'cash' && '💵 Contra Reembolso'}
                    </p>
                  </div>

                  <div className="bg-blue-50 rounded-2xl p-6 border-2 border-blue-200">
                    <label className="flex items-start gap-3 cursor-pointer">
                      <input type="checkbox" checked={acceptTerms} onChange={(e) => setAcceptTerms(e.target.checked)} className="mt-1 w-5 h-5 text-cyan-600 border-gray-300 rounded focus:ring-cyan-500" />
                      <span className="text-sm text-gray-700">He leído y acepto los <a href="/terminos" className="text-cyan-600 hover:underline font-bold">términos y condiciones</a> y la <a href="/privacidad" className="text-cyan-600 hover:underline font-bold">política de privacidad</a></span>
                    </label>
                  </div>

                  <div className="flex gap-4">
                    <button onClick={handlePreviousStep} className="flex-1 py-4 bg-gray-200 text-gray-700 rounded-2xl font-bold text-lg hover:bg-gray-300 transition-all duration-300">← Volver</button>
                    <button onClick={handlePlaceOrder} disabled={!acceptTerms || isProcessing} className={`flex-1 py-4 rounded-2xl font-black text-lg transition-all duration-300 ${!acceptTerms || isProcessing ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : 'bg-gradient-rainbow text-white shadow-lg hover:shadow-2xl transform hover:scale-105'}`}>
                      {isProcessing ? <span className="flex items-center justify-center gap-2"><div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />Procesando...</span> : `✓ Realizar Pedido - €${total.toFixed(2)}`}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="lg:sticky lg:top-8 h-fit">
            <div className="bg-white rounded-3xl shadow-2xl p-6 border border-gray-200">
              <h2 className="text-2xl font-black text-gray-800 mb-6">Resumen del Pedido</h2>
              <div className="space-y-4 mb-6 max-h-96 overflow-y-auto">
                {cart.items.map((item: CartItem) =>(
                  <div key={`${item.id}-${item.variantId}`} className="flex gap-3 p-3 bg-gray-50 rounded-xl">
                    <img src={item.image || FALLBACK_IMG_400x300} alt={item.name} className="w-20 h-20 object-cover rounded-lg" onError={(e) => { const img = e.currentTarget as HTMLImageElement; img.onerror = null; img.src = FALLBACK_IMG_400x300; }} />
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-gray-800 text-sm truncate">{item.name}</h3>
                      {item.variantName && <p className="text-xs text-gray-500 truncate">{item.variantName}</p>}
                      {item.customization && <p className="text-xs text-purple-600 font-medium">✨ Personalizado</p>}
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-sm text-gray-600">x{item.quantity}</span>
                        <span className="font-bold text-cyan-600">€{(item.price * item.quantity).toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="space-y-3 py-4 border-t-2 border-gray-200">
                <div className="flex justify-between text-gray-700">
                  <span>Subtotal ({cart.items.length} {cart.items.length === 1 ? 'producto' : 'productos'})</span>
                  <span className="font-bold">€{subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-gray-700">
                  <span>Envío</span>
                  {shippingCost === 0 ? <span className="font-bold text-green-500">GRATIS ✓</span> : <span className="font-bold">€{shippingCost.toFixed(2)}</span>}
                </div>
                {subtotal < FREE_SHIPPING_THRESHOLD && (
                  <div className="text-xs text-orange-600 bg-orange-50 p-2 rounded-lg">💡 ¡Añade €{(FREE_SHIPPING_THRESHOLD - subtotal).toFixed(2)} más para envío GRATIS!</div>
                )}
                <div className="flex justify-between text-xl font-black text-gray-800 pt-3 border-t-2 border-gray-200">
                  <span>Total</span>
                  <span className="text-cyan-600">€{total.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}