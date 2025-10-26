import React, { useEffect, useMemo, useState } from 'react';
import { useStore } from '@nanostores/react';
import {
  cartStore,
  updateCartItemQuantity,
  removeFromCart,
  clearCart,
} from '../../store/cartStore';
import { autocompleteStreetES, debounce, lookupZipES } from '../../utils/address';

type Provincia =
  | 'Álava'
  | 'Albacete'
  | 'Alicante'
  | 'Almería'
  | 'Asturias'
  | 'Ávila'
  | 'Badajoz'
  | 'Barcelona'
  | 'Burgos'
  | 'Cáceres'
  | 'Cádiz'
  | 'Cantabria'
  | 'Castellón'
  | 'Ciudad Real'
  | 'Córdoba'
  | 'La Coruña'
  | 'Cuenca'
  | 'Girona'
  | 'Granada'
  | 'Guadalajara'
  | 'Guipúzcoa'
  | 'Huelva'
  | 'Huesca'
  | 'Islas Baleares'
  | 'Jaén'
  | 'León'
  | 'Lérida'
  | 'Lugo'
  | 'Madrid'
  | 'Málaga'
  | 'Murcia'
  | 'Navarra'
  | 'Ourense'
  | 'Palencia'
  | 'Las Palmas'
  | 'Pontevedra'
  | 'La Rioja'
  | 'Salamanca'
  | 'Segovia'
  | 'Sevilla'
  | 'Soria'
  | 'Tarragona'
  | 'Santa Cruz de Tenerife'
  | 'Teruel'
  | 'Toledo'
  | 'Valencia'
  | 'Valladolid'
  | 'Vizcaya'
  | 'Zamora'
  | 'Zaragoza'
  | '';

interface DirBase {
  nombre: string;
  apellidos: string;
  empresa: string;
  pais: string;
  direccion: string;
  apartamento: string;
  ciudad: string;
  provincia: Provincia | string;
  codigoPostal: string;
}

interface Facturacion extends DirBase {
  nif: string;
}
interface Envio extends DirBase {
  telefono: string;
}

interface FormData {
  email: string;
  telefono: string;
  facturacion: Facturacion;
  envio: Envio;
  mismasDirecciones: boolean;
  guardarInfo: boolean;
  metodoEnvio: 'estandar' | 'express' | 'urgente';
  metodoPago: 'tarjeta' | 'paypal' | 'transferencia' | 'contra-reembolso';
  // Datos de tarjeta
  cardNumber: string;
  cardName: string;
  cardExpiry: string;
  cardCVV: string;
}

type Errors = Record<string, string>;
type CheckoutStep = 1 | 2 | 3;

const provinciasEspana: Provincia[] = [
  'Álava',
  'Albacete',
  'Alicante',
  'Almería',
  'Asturias',
  'Ávila',
  'Badajoz',
  'Barcelona',
  'Burgos',
  'Cáceres',
  'Cádiz',
  'Cantabria',
  'Castellón',
  'Ciudad Real',
  'Córdoba',
  'La Coruña',
  'Cuenca',
  'Girona',
  'Granada',
  'Guadalajara',
  'Guipúzcoa',
  'Huelva',
  'Huesca',
  'Islas Baleares',
  'Jaén',
  'León',
  'Lérida',
  'Lugo',
  'Madrid',
  'Málaga',
  'Murcia',
  'Navarra',
  'Ourense',
  'Palencia',
  'Las Palmas',
  'Pontevedra',
  'La Rioja',
  'Salamanca',
  'Segovia',
  'Sevilla',
  'Soria',
  'Tarragona',
  'Santa Cruz de Tenerife',
  'Teruel',
  'Toledo',
  'Valencia',
  'Valladolid',
  'Vizcaya',
  'Zamora',
  'Zaragoza',
  '',
];

export default function CheckoutPage() {
  const cart = useStore(cartStore);
  const [currentStep, setCurrentStep] = useState<CheckoutStep>(1);
  const [acceptTerms, setAcceptTerms] = useState(false);

  const [formData, setFormData] = useState<FormData>({
    email: '',
    telefono: '',
    facturacion: {
      nombre: '',
      apellidos: '',
      empresa: '',
      pais: 'España',
      direccion: '',
      apartamento: '',
      ciudad: '',
      provincia: '',
      codigoPostal: '',
      nif: '',
    },
    envio: {
      nombre: '',
      apellidos: '',
      empresa: '',
      pais: 'España',
      direccion: '',
      apartamento: '',
      ciudad: '',
      provincia: '',
      codigoPostal: '',
      telefono: '',
    },
    mismasDirecciones: true,
    guardarInfo: false,
    metodoEnvio: 'estandar',
    metodoPago: 'tarjeta',
    cardNumber: '',
    cardName: '',
    cardExpiry: '',
    cardCVV: '',
  });

  const [errors, setErrors] = useState<Errors>({});
  const [loading, setLoading] = useState(false);
  const [citySuggestions, setCitySuggestions] = useState<{
    facturacion: string[];
    envio: string[];
  }>({ facturacion: [], envio: [] });
  const [streetSuggestions, setStreetSuggestions] = useState<{ facturacion: any[]; envio: any[] }>({
    facturacion: [],
    envio: [],
  });
  const [zipLoading, setZipLoading] = useState<{ facturacion: boolean; envio: boolean }>({
    facturacion: false,
    envio: false,
  });

  // Redirigir si el carrito está vacío
  useEffect(() => {
    if (cart.items.length === 0 && typeof window !== 'undefined') {
      window.location.href = '/';
    }
  }, [cart.items.length]);

  const handleInputChange = (
    section: 'facturacion' | 'envio',
    field: keyof (Facturacion & Envio),
    value: string
  ) => {
    setFormData((prev) => ({
      ...prev,
      [section]: {
        ...(prev as any)[section],
        [field]: value,
      },
    }));
  };

  const handleGeneralChange = (field: keyof FormData, value: any) => {
    setFormData((prev) => {
      const next: FormData = { ...prev, [field]: value } as any;
      if (field === 'mismasDirecciones' && value) {
        next.envio = { ...prev.envio, ...prev.facturacion, telefono: prev.telefono } as Envio;
      }
      return next;
    });
  };

  const validateStep1 = (): boolean => {
    const e: Errors = {};
    if (!formData.email || !/\S+@\S+\.\S+/.test(formData.email)) e.email = 'Email válido requerido';
    const f = formData.facturacion;
    if (!f.nombre) e['facturacion.nombre'] = 'Nombre requerido';
    if (!f.apellidos) e['facturacion.apellidos'] = 'Apellidos requeridos';
    if (!f.direccion) e['facturacion.direccion'] = 'Dirección requerida';
    if (!f.ciudad) e['facturacion.ciudad'] = 'Ciudad requerida';
    if (!f.codigoPostal) e['facturacion.codigoPostal'] = 'Código postal requerido';
    if (!formData.mismasDirecciones) {
      const s = formData.envio;
      if (!s.nombre) e['envio.nombre'] = 'Nombre requerido';
      if (!s.apellidos) e['envio.apellidos'] = 'Apellidos requeridos';
      if (!s.direccion) e['envio.direccion'] = 'Dirección requerida';
      if (!s.ciudad) e['envio.ciudad'] = 'Ciudad requerida';
      if (!s.codigoPostal) e['envio.codigoPostal'] = 'Código postal requerido';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const validateStep2 = (): boolean => {
    const e: Errors = {};
    if (formData.metodoPago === 'tarjeta') {
      if (!formData.cardNumber?.trim()) {
        e.cardNumber = 'Número de tarjeta requerido';
      } else if (formData.cardNumber.replace(/\s/g, '').length < 16) {
        e.cardNumber = 'Número de tarjeta inválido';
      }
      if (!formData.cardName?.trim()) e.cardName = 'Nombre requerido';
      if (!formData.cardExpiry?.trim()) e.cardExpiry = 'Fecha requerida';
      if (!formData.cardCVV?.trim()) e.cardCVV = 'CVV requerido';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
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

  const formatCardNumber = (value: string) => {
    const cleaned = value.replace(/\s/g, '');
    const formatted = cleaned.match(/.{1,4}/g)?.join(' ') || cleaned;
    return formatted.substring(0, 19);
  };

  // Auto-rellenar ciudad/provincia a partir del CP (ES)
  useEffect(() => {
    const zip = (formData.facturacion.codigoPostal || '').trim();
    if (!/^\d{5}$/.test(zip)) {
      setCitySuggestions((s) => ({ ...s, facturacion: [] }));
      return;
    }
    let cancelled = false;
    setZipLoading((z) => ({ ...z, facturacion: true }));
    lookupZipES(zip)
      .then((info) => {
        if (cancelled || !info) return;
        if (info.province && !formData.facturacion.provincia) {
          setFormData((prev) => ({
            ...prev,
            facturacion: { ...prev.facturacion, provincia: info.province || '' },
          }));
        }
        if (info.cities.length === 1) {
          setFormData((prev) => ({
            ...prev,
            facturacion: { ...prev.facturacion, ciudad: info.cities[0] },
          }));
          setCitySuggestions((s) => ({ ...s, facturacion: [] }));
        } else if (info.cities.length > 1) {
          setCitySuggestions((s) => ({ ...s, facturacion: info.cities }));
        }
      })
      .finally(() => setZipLoading((z) => ({ ...z, facturacion: false })));
    return () => {
      cancelled = true;
    };
  }, [formData.facturacion.codigoPostal, formData.facturacion.provincia]);

  useEffect(() => {
    if (formData.mismasDirecciones) return;
    const zip = (formData.envio.codigoPostal || '').trim();
    if (!/^\d{5}$/.test(zip)) {
      setCitySuggestions((s) => ({ ...s, envio: [] }));
      return;
    }
    let cancelled = false;
    setZipLoading((z) => ({ ...z, envio: true }));
    lookupZipES(zip)
      .then((info) => {
        if (cancelled || !info) return;
        if (info.province && !formData.envio.provincia) {
          setFormData((prev) => ({
            ...prev,
            envio: { ...prev.envio, provincia: info.province || '' },
          }));
        }
        if (info.cities.length === 1) {
          setFormData((prev) => ({ ...prev, envio: { ...prev.envio, ciudad: info.cities[0] } }));
          setCitySuggestions((s) => ({ ...s, envio: [] }));
        } else if (info.cities.length > 1) {
          setCitySuggestions((s) => ({ ...s, envio: info.cities }));
        }
      })
      .finally(() => setZipLoading((z) => ({ ...z, envio: false })));
    return () => {
      cancelled = true;
    };
  }, [formData.envio.codigoPostal, formData.envio.provincia, formData.mismasDirecciones]);

  const applyAddressSuggestion = (section: 'facturacion' | 'envio', s: any) => {
    setFormData((prev) => {
      const current = { ...(prev as any)[section] } as any;
      const direccion = [s.street, s.houseNumber].filter(Boolean).join(' ');
      return {
        ...prev,
        [section]: {
          ...current,
          direccion: direccion || current.direccion,
          codigoPostal: s.postcode || current.codigoPostal,
          ciudad: s.city || current.ciudad,
          provincia: s.province || current.provincia,
        },
      } as any;
    });
    setStreetSuggestions((st) => ({ ...st, [section]: [] }));
  };

  const debouncedStreet = debounce(async (section: 'facturacion' | 'envio', text: string) => {
    const ctxZip =
      section === 'facturacion' ? formData.facturacion.codigoPostal : formData.envio.codigoPostal;
    const ctxCity = section === 'facturacion' ? formData.facturacion.ciudad : formData.envio.ciudad;
    const list = await autocompleteStreetES(text, { postcode: ctxZip, city: ctxCity });
    setStreetSuggestions((st) => ({ ...st, [section]: list }));
  }, 350);

  useEffect(() => {
    const v = (formData.facturacion.direccion || '').trim();
    if (v.length >= 3) {
      debouncedStreet('facturacion', v);
    } else {
      setStreetSuggestions((st) => ({ ...st, facturacion: [] }));
    }
  }, [formData.facturacion.direccion]);

  useEffect(() => {
    if (formData.mismasDirecciones) return;
    const v = (formData.envio.direccion || '').trim();
    if (v.length >= 3) {
      debouncedStreet('envio', v);
    } else {
      setStreetSuggestions((st) => ({ ...st, envio: [] }));
    }
  }, [formData.envio.direccion, formData.mismasDirecciones]);

  const shippingCost = useMemo(() => {
    if (formData.metodoEnvio === 'express') return 4.95;
    if (formData.metodoEnvio === 'urgente') return 9.95;
    return 0;
  }, [formData.metodoEnvio]);

  const subtotal = cart.items.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const iva = subtotal * 0.21;
  const total = subtotal + shippingCost + iva;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!acceptTerms) {
      alert('Debes aceptar los términos y condiciones');
      return;
    }
    setLoading(true);
    try {
      await new Promise((r) => setTimeout(r, 2000));
      const order = {
        id: `ORDER-${Date.now()}`,
        date: new Date().toISOString(),
        items: cart.items,
        shippingInfo: formData.mismasDirecciones ? formData.facturacion : formData.envio,
        paymentInfo: { method: formData.metodoPago },
        subtotal,
        shipping: shippingCost,
        iva,
        total,
        status: 'pending',
      };
      const orders = JSON.parse(localStorage.getItem('orders') || '[]');
      orders.push(order);
      localStorage.setItem('orders', JSON.stringify(orders));
      clearCart();
      window.location.href = `/confirmacion?orderId=${order.id}`;
    } catch (error) {
      console.error('Error al procesar el pedido:', error);
      alert('Hubo un error al procesar tu pedido. Por favor, intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  if (cart.items.length === 0) {
    return null;
  }

  return (
    <div className="max-w-6xl mx-auto px-4 md:px-6">
      {/* Barra de progreso */}
      <div className="mb-10">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-4">
            {[
              { step: 1, label: 'Información' },
              { step: 2, label: 'Pago' },
              { step: 3, label: 'Confirmar' },
            ].map((item, index) => (
              <div key={item.step} className="flex items-center flex-1">
                <div className="flex items-center">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center font-bold transition-all duration-300 ${currentStep >= item.step ? 'bg-gradient-primary text-white shadow-lg scale-110' : 'bg-gray-200 text-gray-500'}`}
                  >
                    {currentStep > item.step ? '✓' : item.step}
                  </div>
                  <span
                    className={`ml-2 font-bold text-sm ${currentStep >= item.step ? 'text-cyan-600' : 'text-gray-400'}`}
                  >
                    {item.label}
                  </span>
                </div>
                {index < 2 && (
                  <div
                    className={`flex-1 h-1 mx-4 rounded transition-all duration-300 ${currentStep > item.step ? 'bg-gradient-primary' : 'bg-gray-200'}`}
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Columna izquierda - Formulario */}
        <div className="lg:col-span-2 space-y-6">
          {/* PASO 1: Información y Envío */}
          {currentStep === 1 && (
            <>
              {/* Información de contacto */}
              <section className="bg-white rounded-2xl border p-6 space-y-4">
                <h2 className="text-xl font-bold">Información de contacto</h2>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Email *</label>
                    <input
                      type="email"
                      className={`input ${errors.email ? 'border-red-400' : ''}`}
                      value={formData.email}
                      onChange={(e) => handleGeneralChange('email', e.target.value)}
                      placeholder="tu@email.com"
                    />
                    {errors.email && <span className="text-red-500 text-xs">{errors.email}</span>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Teléfono</label>
                    <input
                      type="tel"
                      className="input"
                      value={formData.telefono}
                      onChange={(e) => handleGeneralChange('telefono', e.target.value)}
                      placeholder="+34 600 000 000"
                    />
                  </div>
                </div>
              </section>

              {/* Dirección de facturación */}
              <section className="bg-white rounded-2xl border p-6 space-y-4">
                <h2 className="text-xl font-bold">Dirección de facturación</h2>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Nombre *</label>
                    <input
                      className={`input ${errors['facturacion.nombre'] ? 'border-red-400' : ''}`}
                      value={formData.facturacion.nombre}
                      onChange={(e) => handleInputChange('facturacion', 'nombre', e.target.value)}
                    />
                    {errors['facturacion.nombre'] && (
                      <span className="text-red-500 text-xs">{errors['facturacion.nombre']}</span>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Apellidos *</label>
                    <input
                      className={`input ${errors['facturacion.apellidos'] ? 'border-red-400' : ''}`}
                      value={formData.facturacion.apellidos}
                      onChange={(e) =>
                        handleInputChange('facturacion', 'apellidos', e.target.value)
                      }
                    />
                    {errors['facturacion.apellidos'] && (
                      <span className="text-red-500 text-xs">
                        {errors['facturacion.apellidos']}
                      </span>
                    )}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Empresa (opcional)</label>
                  <input
                    className="input"
                    value={formData.facturacion.empresa}
                    onChange={(e) => handleInputChange('facturacion', 'empresa', e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Dirección *</label>
                  <input
                    className={`input ${errors['facturacion.direccion'] ? 'border-red-400' : ''}`}
                    placeholder="Calle, número"
                    value={formData.facturacion.direccion}
                    onChange={(e) => handleInputChange('facturacion', 'direccion', e.target.value)}
                  />
                  {errors['facturacion.direccion'] && (
                    <span className="text-red-500 text-xs">{errors['facturacion.direccion']}</span>
                  )}
                  {streetSuggestions.facturacion.length > 0 && (
                    <div className="mt-1 border rounded-lg bg-white shadow-sm max-h-48 overflow-auto">
                      {streetSuggestions.facturacion.map((s, idx) => (
                        <button
                          type="button"
                          key={idx}
                          className="w-full text-left px-3 py-2 hover:bg-gray-50"
                          onClick={() => applyAddressSuggestion('facturacion', s)}
                        >
                          {s.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Apartamento, local, etc. (opcional)
                  </label>
                  <input
                    className="input"
                    placeholder="Piso, puerta"
                    value={formData.facturacion.apartamento}
                    onChange={(e) =>
                      handleInputChange('facturacion', 'apartamento', e.target.value)
                    }
                  />
                </div>
                <div className="grid md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Ciudad *</label>
                    <input
                      className={`input ${errors['facturacion.ciudad'] ? 'border-red-400' : ''}`}
                      value={formData.facturacion.ciudad}
                      onChange={(e) => handleInputChange('facturacion', 'ciudad', e.target.value)}
                    />
                    {zipLoading.facturacion && (
                      <div className="text-xs text-gray-500 mt-1">
                        Buscando por codigo postal...
                      </div>
                    )}
                    {citySuggestions.facturacion.length > 1 && (
                      <div className="mt-1 border rounded-lg bg-white shadow-sm max-h-40 overflow-auto">
                        {citySuggestions.facturacion.map((c) => (
                          <button
                            type="button"
                            key={c}
                            className="w-full text-left px-3 py-2 hover:bg-gray-50"
                            onClick={() => {
                              setFormData((prev) => ({
                                ...prev,
                                facturacion: { ...prev.facturacion, ciudad: c },
                              }));
                              setCitySuggestions((s) => ({ ...s, facturacion: [] }));
                            }}
                          >
                            {c}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Provincia</label>
                    <select
                      className="input"
                      value={formData.facturacion.provincia}
                      onChange={(e) =>
                        handleInputChange('facturacion', 'provincia', e.target.value)
                      }
                    >
                      <option value="">Seleccionar provincia</option>
                      {provinciasEspana.map((p) => (
                        <option key={p} value={p}>
                          {p}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Código postal *</label>
                    <input
                      className={`input ${errors['facturacion.codigoPostal'] ? 'border-red-400' : ''}`}
                      placeholder="28001"
                      value={formData.facturacion.codigoPostal}
                      onChange={(e) =>
                        handleInputChange(
                          'facturacion',
                          'codigoPostal',
                          e.target.value.replace(/[^\d]/g, '').slice(0, 5)
                        )
                      }
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">NIF/CIF (opcional)</label>
                  <input
                    className="input"
                    placeholder="12345678Z"
                    value={formData.facturacion.nif}
                    onChange={(e) => handleInputChange('facturacion', 'nif', e.target.value)}
                  />
                </div>
              </section>

              {/* Checkbox misma dirección */}
              <div className="bg-white rounded-2xl border p-6">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.mismasDirecciones}
                    onChange={(e) => handleGeneralChange('mismasDirecciones', e.target.checked)}
                  />
                  <span>La dirección de envío es la misma que la de facturación</span>
                </label>
              </div>

              {/* Dirección de envío */}
              {!formData.mismasDirecciones && (
                <section className="bg-white rounded-2xl border p-6 space-y-4">
                  <h2 className="text-xl font-bold">Dirección de envío</h2>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">Nombre *</label>
                      <input
                        className={`input ${errors['envio.nombre'] ? 'border-red-400' : ''}`}
                        value={formData.envio.nombre}
                        onChange={(e) => handleInputChange('envio', 'nombre', e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Apellidos *</label>
                      <input
                        className={`input ${errors['envio.apellidos'] ? 'border-red-400' : ''}`}
                        value={formData.envio.apellidos}
                        onChange={(e) => handleInputChange('envio', 'apellidos', e.target.value)}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Dirección *</label>
                    <input
                      className={`input ${errors['envio.direccion'] ? 'border-red-400' : ''}`}
                      placeholder="Calle, número"
                      value={formData.envio.direccion}
                      onChange={(e) => handleInputChange('envio', 'direccion', e.target.value)}
                    />
                  </div>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">Ciudad *</label>
                      <input
                        className={`input ${errors['envio.ciudad'] ? 'border-red-400' : ''}`}
                        value={formData.envio.ciudad}
                        onChange={(e) => handleInputChange('envio', 'ciudad', e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Código postal *</label>
                      <input
                        className={`input ${errors['envio.codigoPostal'] ? 'border-red-400' : ''}`}
                        value={formData.envio.codigoPostal}
                        onChange={(e) =>
                          handleInputChange(
                            'envio',
                            'codigoPostal',
                            e.target.value.replace(/[^\d]/g, '').slice(0, 5)
                          )
                        }
                      />
                    </div>
                  </div>
                </section>
              )}

              {/* Método de envío */}
              <section className="bg-white rounded-2xl border p-6 space-y-3">
                <h2 className="text-xl font-bold">Método de envío</h2>
                <div className="space-y-3">
                  {[
                    {
                      id: 'estandar',
                      name: 'Envío Estándar',
                      time: '5-7 días laborables',
                      price: 'Gratis',
                    },
                    {
                      id: 'express',
                      name: 'Envío Express',
                      time: '2-3 días laborables',
                      price: '€4.95',
                    },
                    { id: 'urgente', name: 'Envío Urgente', time: '24h', price: '€9.95' },
                  ].map((opt) => (
                    <label
                      key={opt.id}
                      className={`flex gap-3 items-start p-4 border-2 rounded-xl cursor-pointer transition-all ${formData.metodoEnvio === opt.id ? 'border-cyan-500 bg-cyan-50' : 'border-gray-200 hover:bg-gray-50'}`}
                    >
                      <input
                        type="radio"
                        name="metodoEnvio"
                        checked={formData.metodoEnvio === (opt.id as any)}
                        onChange={() => handleGeneralChange('metodoEnvio', opt.id)}
                      />
                      <div className="flex-1">
                        <div className="font-semibold">{opt.name}</div>
                        <div className="text-sm text-gray-600">{opt.time}</div>
                      </div>
                      <div className="font-semibold text-green-600">{opt.price}</div>
                    </label>
                  ))}
                </div>
              </section>

              <button
                type="button"
                onClick={handleNextStep}
                className="w-full py-4 bg-gradient-rainbow text-white rounded-2xl font-black text-lg shadow-lg hover:shadow-2xl transform hover:scale-105 transition-all duration-300"
              >
                Continuar al Pago →
              </button>
            </>
          )}

          {/* PASO 2: Método de Pago */}
          {currentStep === 2 && (
            <>
              <section className="bg-white rounded-2xl border p-6 space-y-4">
                <h2 className="text-xl font-bold">Método de Pago</h2>
                <div className="space-y-3">
                  {[
                    {
                      method: 'tarjeta',
                      icon: '💳',
                      label: 'Tarjeta de Crédito/Débito',
                      description: 'Pago seguro con tarjeta',
                    },
                    {
                      method: 'paypal',
                      icon: '🅿️',
                      label: 'PayPal',
                      description: 'Pago rápido y seguro',
                    },
                    {
                      method: 'transferencia',
                      icon: '🏦',
                      label: 'Transferencia Bancaria',
                      description: 'Te enviaremos los datos',
                    },
                    {
                      method: 'contra-reembolso',
                      icon: '💵',
                      label: 'Contra Reembolso',
                      description: 'Paga al recibir (+3€)',
                    },
                  ].map((option) => (
                    <button
                      type="button"
                      key={option.method}
                      onClick={() => handleGeneralChange('metodoPago', option.method)}
                      className={`w-full p-4 rounded-xl border-2 transition-all duration-300 text-left ${formData.metodoPago === option.method ? 'border-cyan-500 bg-cyan-50 shadow-lg' : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'}`}
                    >
                      <div className="flex items-center gap-4">
                        <div className="text-3xl">{option.icon}</div>
                        <div className="flex-1">
                          <div className="font-bold text-gray-800">{option.label}</div>
                          <div className="text-sm text-gray-500">{option.description}</div>
                        </div>
                        {formData.metodoPago === option.method && (
                          <div className="w-6 h-6 bg-cyan-500 rounded-full flex items-center justify-center text-white">
                            ✓
                          </div>
                        )}
                      </div>
                    </button>
                  ))}
                </div>

                {/* Formulario de tarjeta */}
                {formData.metodoPago === 'tarjeta' && (
                  <div className="space-y-4 mt-6 p-6 bg-gray-50 rounded-2xl border-2 border-gray-200">
                    <h3 className="font-bold text-gray-800 mb-4">Datos de la Tarjeta</h3>
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-2">
                        Número de Tarjeta *
                      </label>
                      <input
                        type="text"
                        value={formData.cardNumber}
                        onChange={(e) =>
                          handleGeneralChange('cardNumber', formatCardNumber(e.target.value))
                        }
                        className={`w-full px-4 py-3 border-2 rounded-xl focus:border-cyan-500 focus:ring-2 focus:ring-cyan-200 outline-none transition-all font-mono ${errors.cardNumber ? 'border-red-500' : 'border-gray-300'}`}
                        placeholder="1234 5678 9012 3456"
                        maxLength={19}
                      />
                      {errors.cardNumber && (
                        <p className="text-red-500 text-sm mt-1">{errors.cardNumber}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-2">
                        Nombre en la Tarjeta *
                      </label>
                      <input
                        type="text"
                        value={formData.cardName}
                        onChange={(e) =>
                          handleGeneralChange('cardName', e.target.value.toUpperCase())
                        }
                        className={`w-full px-4 py-3 border-2 rounded-xl focus:border-cyan-500 focus:ring-2 focus:ring-cyan-200 outline-none transition-all ${errors.cardName ? 'border-red-500' : 'border-gray-300'}`}
                        placeholder="JUAN GARCIA"
                      />
                      {errors.cardName && (
                        <p className="text-red-500 text-sm mt-1">{errors.cardName}</p>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">
                          Fecha de Vencimiento *
                        </label>
                        <input
                          type="text"
                          value={formData.cardExpiry}
                          onChange={(e) => {
                            let value = e.target.value.replace(/\D/g, '');
                            if (value.length >= 2) {
                              value = value.slice(0, 2) + '/' + value.slice(2, 4);
                            }
                            handleGeneralChange('cardExpiry', value);
                          }}
                          className={`w-full px-4 py-3 border-2 rounded-xl focus:border-cyan-500 focus:ring-2 focus:ring-cyan-200 outline-none transition-all font-mono ${errors.cardExpiry ? 'border-red-500' : 'border-gray-300'}`}
                          placeholder="MM/AA"
                          maxLength={5}
                        />
                        {errors.cardExpiry && (
                          <p className="text-red-500 text-sm mt-1">{errors.cardExpiry}</p>
                        )}
                      </div>
                      <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">CVV *</label>
                        <input
                          type="text"
                          value={formData.cardCVV}
                          onChange={(e) =>
                            handleGeneralChange(
                              'cardCVV',
                              e.target.value.replace(/\D/g, '').slice(0, 4)
                            )
                          }
                          className={`w-full px-4 py-3 border-2 rounded-xl focus:border-cyan-500 focus:ring-2 focus:ring-cyan-200 outline-none transition-all font-mono ${errors.cardCVV ? 'border-red-500' : 'border-gray-300'}`}
                          placeholder="123"
                          maxLength={4}
                        />
                        {errors.cardCVV && (
                          <p className="text-red-500 text-sm mt-1">{errors.cardCVV}</p>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </section>

              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={handlePreviousStep}
                  className="flex-1 py-4 bg-gray-200 text-gray-700 rounded-2xl font-bold text-lg hover:bg-gray-300 transition-all duration-300"
                >
                  ← Volver
                </button>
                <button
                  type="button"
                  onClick={handleNextStep}
                  className="flex-1 py-4 bg-gradient-rainbow text-white rounded-2xl font-black text-lg shadow-lg hover:shadow-2xl transform hover:scale-105 transition-all duration-300"
                >
                  Revisar Pedido →
                </button>
              </div>
            </>
          )}

          {/* PASO 3: Confirmación */}
          {currentStep === 3 && (
            <>
              <section className="bg-white rounded-2xl border p-6 space-y-4">
                <h2 className="text-xl font-bold">Revisar Pedido</h2>

                <div className="bg-gray-50 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-bold">📦 Envío a:</h3>
                    <button
                      type="button"
                      onClick={() => setCurrentStep(1)}
                      className="text-cyan-600 hover:text-cyan-700 font-bold text-sm"
                    >
                      Editar
                    </button>
                  </div>
                  <div className="space-y-1 text-sm text-gray-700">
                    <p className="font-bold">
                      {formData.facturacion.nombre} {formData.facturacion.apellidos}
                    </p>
                    <p>{formData.facturacion.direccion}</p>
                    <p>
                      {formData.facturacion.codigoPostal} {formData.facturacion.ciudad},{' '}
                      {formData.facturacion.provincia}
                    </p>
                    <p>{formData.email}</p>
                  </div>
                </div>

                <div className="bg-gray-50 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-bold">💳 Método de Pago:</h3>
                    <button
                      type="button"
                      onClick={() => setCurrentStep(2)}
                      className="text-cyan-600 hover:text-cyan-700 font-bold text-sm"
                    >
                      Editar
                    </button>
                  </div>
                  <p className="text-sm text-gray-700 font-medium">
                    {formData.metodoPago === 'tarjeta' && '💳 Tarjeta de Crédito/Débito'}
                    {formData.metodoPago === 'paypal' && '🅿️ PayPal'}
                    {formData.metodoPago === 'transferencia' && '🏦 Transferencia Bancaria'}
                    {formData.metodoPago === 'contra-reembolso' && '💵 Contra Reembolso'}
                  </p>
                </div>

                <div className="bg-gray-50 rounded-xl p-4">
                  <h3 className="font-bold mb-2">🚚 Envío:</h3>
                  <p className="text-sm text-gray-700">
                    {formData.metodoEnvio === 'estandar' && 'Envío Estándar (5-7 días)'}
                    {formData.metodoEnvio === 'express' && 'Envío Express (2-3 días)'}
                    {formData.metodoEnvio === 'urgente' && 'Envío Urgente (24h)'}
                  </p>
                </div>

                <div className="bg-blue-50 rounded-xl p-4 border-2 border-blue-200">
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={acceptTerms}
                      onChange={(e) => setAcceptTerms(e.target.checked)}
                      className="mt-1 w-5 h-5 text-cyan-600 border-gray-300 rounded focus:ring-cyan-500"
                    />
                    <span className="text-sm text-gray-700">
                      He leído y acepto los{' '}
                      <a href="/terminos" className="text-cyan-600 hover:underline font-bold">
                        términos y condiciones
                      </a>{' '}
                      y la{' '}
                      <a href="/privacidad" className="text-cyan-600 hover:underline font-bold">
                        política de privacidad
                      </a>
                    </span>
                  </label>
                </div>
              </section>

              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={handlePreviousStep}
                  className="flex-1 py-4 bg-gray-200 text-gray-700 rounded-2xl font-bold text-lg hover:bg-gray-300 transition-all duration-300"
                >
                  ← Volver
                </button>
                <button
                  type="submit"
                  disabled={!acceptTerms || loading}
                  className={`flex-1 py-4 rounded-2xl font-black text-lg transition-all duration-300 ${!acceptTerms || loading ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : 'bg-gradient-rainbow text-white shadow-lg hover:shadow-2xl transform hover:scale-105'}`}
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Procesando...
                    </span>
                  ) : (
                    `✓ Realizar Pedido - €${total.toFixed(2)}`
                  )}
                </button>
              </div>
            </>
          )}
        </div>

        {/* Resumen del Pedido - Sidebar */}
        <aside className="bg-white rounded-2xl border p-6 lg:sticky lg:top-8 h-fit space-y-4">
          <h3 className="text-xl font-bold">Resumen del pedido</h3>
          <div className="space-y-3 max-h-80 overflow-y-auto">
            {cart.items.map((item) => (
              <div
                key={`${item.id}-${item.variantId ?? 'v'}`}
                className="flex gap-3 p-3 bg-gray-50 rounded-xl"
              >
                <img
                  src={item.image}
                  alt={item.name}
                  className="w-16 h-16 rounded-lg object-cover"
                  onError={(e) => {
                    const img = e.currentTarget as HTMLImageElement;
                    img.onerror = null;
                    img.src = 'https://placehold.co/400x300/e2e8f0/94a3b8?text=Sin+Imagen';
                  }}
                />
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm truncate">{item.name}</div>
                  {item.variantName && (
                    <div className="text-xs text-gray-500 truncate">{item.variantName}</div>
                  )}
                  <div className="flex items-center gap-2 mt-2">
                    <button
                      type="button"
                      className="w-6 h-6 rounded border border-gray-300 text-gray-700 hover:bg-gray-100 flex items-center justify-center"
                      onClick={() =>
                        updateCartItemQuantity(
                          item.id,
                          item.variantId,
                          Math.max(1, item.quantity - 1)
                        )
                      }
                    >
                      −
                    </button>
                    <span className="text-sm text-gray-700 w-8 text-center">{item.quantity}</span>
                    <button
                      type="button"
                      className="w-6 h-6 rounded border border-gray-300 text-gray-700 hover:bg-gray-100 flex items-center justify-center"
                      onClick={() =>
                        updateCartItemQuantity(item.id, item.variantId, item.quantity + 1)
                      }
                    >
                      +
                    </button>
                    <button
                      type="button"
                      className="ml-auto text-xs text-red-600 hover:underline"
                      onClick={() => removeFromCart(item.id, item.variantId)}
                    >
                      Eliminar
                    </button>
                  </div>
                  <div className="font-bold text-cyan-600 text-sm text-right mt-1">
                    €{(item.price * item.quantity).toFixed(2)}
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="space-y-2 pt-4 border-t">
            <div className="flex justify-between text-sm">
              <span>Subtotal</span>
              <span className="font-bold">€{subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Envío</span>
              <span className="font-bold">
                {shippingCost === 0 ? 'Gratis' : `€${shippingCost.toFixed(2)}`}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span>IVA (21%)</span>
              <span className="font-bold">€{iva.toFixed(2)}</span>
            </div>
            <div className="flex justify-between font-black text-xl pt-2 border-t">
              <span>Total</span>
              <span className="text-cyan-600">€{total.toFixed(2)}</span>
            </div>
          </div>
        </aside>
      </form>
    </div>
  );
}
