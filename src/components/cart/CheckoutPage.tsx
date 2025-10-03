import React, { useEffect, useMemo, useState } from 'react';
import { useCart } from '../../store/cartStore';
import { autocompleteStreetES, debounce, lookupZipES } from '../../utils/address';

type Provincia =
  | 'Álava' | 'Albacete' | 'Alicante' | 'Almería' | 'Asturias' | 'Ávila' | 'Badajoz'
  | 'Barcelona' | 'Burgos' | 'Cáceres' | 'Cádiz' | 'Cantabria' | 'Castellón'
  | 'Ciudad Real' | 'Córdoba' | 'La Coruña' | 'Cuenca' | 'Girona' | 'Granada'
  | 'Guadalajara' | 'Guipúzcoa' | 'Huelva' | 'Huesca' | 'Islas Baleares'
  | 'Jaén' | 'León' | 'Lérida' | 'Lugo' | 'Madrid' | 'Málaga' | 'Murcia'
  | 'Navarra' | 'Ourense' | 'Palencia' | 'Las Palmas' | 'Pontevedra' | 'La Rioja'
  | 'Salamanca' | 'Segovia' | 'Sevilla' | 'Soria' | 'Tarragona' | 'Santa Cruz de Tenerife'
  | 'Teruel' | 'Toledo' | 'Valencia' | 'Valladolid' | 'Vizcaya' | 'Zamora' | 'Zaragoza' | '';

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

interface Facturacion extends DirBase { nif: string; }
interface Envio extends DirBase { telefono: string; }

interface FormData {
  email: string;
  telefono: string;
  facturacion: Facturacion;
  envio: Envio;
  mismasDirecciones: boolean;
  guardarInfo: boolean;
  metodoEnvio: 'estandar' | 'express' | 'urgente';
  metodoPago: 'tarjeta' | 'transferencia' | 'contra-reembolso';
}

type Errors = Record<string, string>;

const provinciasEspana: Provincia[] = [
  'Álava','Albacete','Alicante','Almería','Asturias','Ávila','Badajoz','Barcelona','Burgos','Cáceres','Cádiz','Cantabria','Castellón','Ciudad Real','Córdoba','La Coruña','Cuenca','Girona','Granada','Guadalajara','Guipúzcoa','Huelva','Huesca','Islas Baleares','Jaén','León','Lérida','Lugo','Madrid','Málaga','Murcia','Navarra','Ourense','Palencia','Las Palmas','Pontevedra','La Rioja','Salamanca','Segovia','Sevilla','Soria','Tarragona','Santa Cruz de Tenerife','Teruel','Toledo','Valencia','Valladolid','Vizcaya','Zamora','Zaragoza','',
];

export default function CheckoutPage() {
  const cart = useCart();

  const [formData, setFormData] = useState<FormData>({
    email: '',
    telefono: '',
    facturacion: {
      nombre: '', apellidos: '', empresa: '', pais: 'España', direccion: '', apartamento: '', ciudad: '', provincia: '', codigoPostal: '', nif: ''
    },
    envio: {
      nombre: '', apellidos: '', empresa: '', pais: 'España', direccion: '', apartamento: '', ciudad: '', provincia: '', codigoPostal: '', telefono: ''
    },
    mismasDirecciones: true,
    guardarInfo: false,
    metodoEnvio: 'estandar',
    metodoPago: 'tarjeta'
  });
  const [errors, setErrors] = useState<Errors>({});
  const [loading, setLoading] = useState(false);
  const [citySuggestions, setCitySuggestions] = useState<{ facturacion: string[]; envio: string[] }>({ facturacion: [], envio: [] });
  const [streetSuggestions, setStreetSuggestions] = useState<{ facturacion: any[]; envio: any[] }>({ facturacion: [], envio: [] });
  const [zipLoading, setZipLoading] = useState<{ facturacion: boolean; envio: boolean }>({ facturacion: false, envio: false });

  const handleInputChange = (section: 'facturacion' | 'envio', field: keyof (Facturacion & Envio), value: string) => {
    setFormData(prev => ({
      ...prev,
      [section]: {
        ...(prev as any)[section],
        [field]: value,
      }
    }));
  };

  const handleGeneralChange = (field: keyof FormData, value: any) => {
    setFormData(prev => {
      const next: FormData = { ...prev, [field]: value } as any;
      if (field === 'mismasDirecciones' && value) {
        next.envio = { ...prev.envio, ...prev.facturacion, telefono: prev.telefono } as Envio;
      }
      return next;
    });
  };

  const validateForm = (): boolean => {
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

  // Auto-rellenar ciudad/provincia a partir del CP (ES)
  useEffect(() => {
    const zip = (formData.facturacion.codigoPostal || '').trim();
    if (!/^\d{5}$/.test(zip)) {
      setCitySuggestions((s) => ({ ...s, facturacion: [] }));
      return;
    }
    let cancelled = false;
    setZipLoading((z) => ({ ...z, facturacion: true }));
    lookupZipES(zip).then((info) => {
      if (cancelled || !info) return;
      if (info.province && !formData.facturacion.provincia) {
        setFormData((prev) => ({ ...prev, facturacion: { ...prev.facturacion, provincia: info.province || '' } }));
      }
      if (info.cities.length === 1) {
        setFormData((prev) => ({ ...prev, facturacion: { ...prev.facturacion, ciudad: info.cities[0] } }));
        setCitySuggestions((s) => ({ ...s, facturacion: [] }));
      } else if (info.cities.length > 1) {
        setCitySuggestions((s) => ({ ...s, facturacion: info.cities }));
      }
    }).finally(() => setZipLoading((z) => ({ ...z, facturacion: false })));
    return () => { cancelled = true; };
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
    lookupZipES(zip).then((info) => {
      if (cancelled || !info) return;
      if (info.province && !formData.envio.provincia) {
        setFormData((prev) => ({ ...prev, envio: { ...prev.envio, provincia: info.province || '' } }));
      }
      if (info.cities.length === 1) {
        setFormData((prev) => ({ ...prev, envio: { ...prev.envio, ciudad: info.cities[0] } }));
        setCitySuggestions((s) => ({ ...s, envio: [] }));
      } else if (info.cities.length > 1) {
        setCitySuggestions((s) => ({ ...s, envio: info.cities }));
      }
    }).finally(() => setZipLoading((z) => ({ ...z, envio: false })));
    return () => { cancelled = true; };
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
    const ctxZip = section === 'facturacion' ? formData.facturacion.codigoPostal : formData.envio.codigoPostal;
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
    if (!validateForm()) return;
    setLoading(true);
    await new Promise(r => setTimeout(r, 1200));
    // Aquí podrías persistir la orden en Firestore
    alert('¡Pedido procesado!');
    setLoading(false);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 md:px-6" style={{ marginTop: '200px' }}>
      <div className="text-center mb-10">
        <h1 className="text-3xl font-black mb-3">Finalizar compra</h1>
        <div className="flex items-center justify-center gap-6 text-sm">
          <div className="flex items-center gap-2"><span className="w-8 h-8 rounded-full bg-cyan-600 text-white grid place-items-center font-bold">1</span><span>Información</span></div>
          <div className="flex items-center gap-2 opacity-70"><span className="w-8 h-8 rounded-full bg-gray-200 grid place-items-center font-bold">2</span><span>Envío</span></div>
          <div className="flex items-center gap-2 opacity-70"><span className="w-8 h-8 rounded-full bg-gray-200 grid place-items-center font-bold">3</span><span>Pago</span></div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start ">
        {/* Columna izquierda */}
        <div className="space-y-6">
          {/* Información de contacto */}
          <section className="bg-white rounded-2xl border p-6 space-y-4">
            <h2 className="text-xl font-bold">Información de contacto</h2>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Email *</label>
                <input type="email" className={`input ${errors.email ? 'border-red-400' : ''}`} value={formData.email} onChange={e => handleGeneralChange('email', e.target.value)} placeholder="tu@email.com" />
                {errors.email && <span className="text-red-500 text-xs">{errors.email}</span>}
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Teléfono</label>
                <input type="tel" className="input" value={formData.telefono} onChange={e => handleGeneralChange('telefono', e.target.value)} placeholder="+34 600 000 000" />
              </div>
            </div>
          </section>

          {/* Dirección de facturación */}
          <section className="bg-white rounded-2xl border p-6 space-y-4">
            <h2 className="text-xl font-bold">Dirección de facturación</h2>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Nombre *</label>
                <input className={`input ${errors['facturacion.nombre'] ? 'border-red-400' : ''}`} value={formData.facturacion.nombre} onChange={e => handleInputChange('facturacion','nombre', e.target.value)} />
                {errors['facturacion.nombre'] && <span className="text-red-500 text-xs">{errors['facturacion.nombre']}</span>}
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Apellidos *</label>
                <input className={`input ${errors['facturacion.apellidos'] ? 'border-red-400' : ''}`} value={formData.facturacion.apellidos} onChange={e => handleInputChange('facturacion','apellidos', e.target.value)} />
                {errors['facturacion.apellidos'] && <span className="text-red-500 text-xs">{errors['facturacion.apellidos']}</span>}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Empresa (opcional)</label>
              <input className="input" value={formData.facturacion.empresa} onChange={e => handleInputChange('facturacion','empresa', e.target.value)} />
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">País</label>
                <select className="input" value={formData.facturacion.pais} onChange={e => handleInputChange('facturacion','pais', e.target.value)}>
                  {['España','Portugal','Francia','Alemania','Italia'].map(p => (<option key={p} value={p}>{p}</option>))}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Dirección *</label>
              <input className={`input ${errors['facturacion.direccion'] ? 'border-red-400' : ''}`} placeholder="Calle, número" value={formData.facturacion.direccion} onChange={e => handleInputChange('facturacion','direccion', e.target.value)} />
              {errors['facturacion.direccion'] && <span className="text-red-500 text-xs">{errors['facturacion.direccion']}</span>}
              {streetSuggestions.facturacion.length > 0 && (
                <div className="mt-1 border rounded-lg bg-white shadow-sm max-h-48 overflow-auto">
                  {streetSuggestions.facturacion.map((s, idx) => (
                    <button type="button" key={idx} className="w-full text-left px-3 py-2 hover:bg-gray-50" onClick={() => applyAddressSuggestion('facturacion', s)}>
                      {s.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Apartamento, local, etc. (opcional)</label>
              <input className="input" placeholder="Piso, puerta" value={formData.facturacion.apartamento} onChange={e => handleInputChange('facturacion','apartamento', e.target.value)} />
            </div>
            <div className="grid md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Ciudad *</label>
                <input className={`input ${errors['facturacion.ciudad'] ? 'border-red-400' : ''}`} value={formData.facturacion.ciudad} onChange={e => handleInputChange('facturacion','ciudad', e.target.value)} />
                {zipLoading.facturacion && <div className="text-xs text-gray-500 mt-1">Buscando por codigo postal...</div>}
                {citySuggestions.facturacion.length > 1 && (
                  <div className="mt-1 border rounded-lg bg-white shadow-sm max-h-40 overflow-auto">
                    {citySuggestions.facturacion.map((c) => (
                      <button type="button" key={c} className="w-full text-left px-3 py-2 hover:bg-gray-50" onClick={() => { setFormData(prev => ({ ...prev, facturacion: { ...prev.facturacion, ciudad: c } })); setCitySuggestions(s => ({ ...s, facturacion: [] })); }}>
                        {c}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Provincia</label>
                <select className="input" value={formData.facturacion.provincia} onChange={e => handleInputChange('facturacion','provincia', e.target.value)}>
                  <option value="">Seleccionar provincia</option>
                  {provinciasEspana.map(p => (<option key={p} value={p}>{p}</option>))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Código postal *</label>
                <input className={`input ${errors['facturacion.codigoPostal'] ? 'border-red-400' : ''}`} placeholder="28001" value={formData.facturacion.codigoPostal} onChange={e => handleInputChange('facturacion','codigoPostal', e.target.value.replace(/[^\d]/g, '').slice(0,5))} />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">NIF/CIF (opcional)</label>
              <input className="input" placeholder="12345678Z" value={formData.facturacion.nif} onChange={e => handleInputChange('facturacion','nif', e.target.value)} />
            </div>
          </section>

          {/* Checkbox misma dirección */}
          <div className="bg-white rounded-2xl border p-6">
            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" checked={formData.mismasDirecciones} onChange={e => handleGeneralChange('mismasDirecciones', e.target.checked)} />
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
                  <input className={`input ${errors['envio.nombre'] ? 'border-red-400' : ''}`} value={formData.envio.nombre} onChange={e => handleInputChange('envio','nombre', e.target.value)} />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Apellidos *</label>
                  <input className={`input ${errors['envio.apellidos'] ? 'border-red-400' : ''}`} value={formData.envio.apellidos} onChange={e => handleInputChange('envio','apellidos', e.target.value)} />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Empresa (opcional)</label>
                <input className="input" value={formData.envio.empresa} onChange={e => handleInputChange('envio','empresa', e.target.value)} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Dirección *</label>
                <input className={`input ${errors['envio.direccion'] ? 'border-red-400' : ''}`} placeholder="Calle, número" value={formData.envio.direccion} onChange={e => handleInputChange('envio','direccion', e.target.value)} />
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Ciudad *</label>
                  <input className={`input ${errors['envio.ciudad'] ? 'border-red-400' : ''}`} value={formData.envio.ciudad} onChange={e => handleInputChange('envio','ciudad', e.target.value)} />
                  {zipLoading.envio && <div className="text-xs text-gray-500 mt-1">Buscando por codigo postal...</div>}
                  {citySuggestions.envio.length > 1 && (
                    <div className="mt-1 border rounded-lg bg-white shadow-sm max-h-40 overflow-auto">
                      {citySuggestions.envio.map((c) => (
                        <button type="button" key={c} className="w-full text-left px-3 py-2 hover:bg-gray-50" onClick={() => { setFormData(prev => ({ ...prev, envio: { ...prev.envio, ciudad: c } })); setCitySuggestions(s => ({ ...s, envio: [] })); }}>
                          {c}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Código postal *</label>
                  <input className={`input ${errors['envio.codigoPostal'] ? 'border-red-400' : ''}`} value={formData.envio.codigoPostal} onChange={e => handleInputChange('envio','codigoPostal', e.target.value.replace(/[^\\d]/g, '').slice(0,5))} />
                </div>
              </div>
            </section>
          )}

          {/* Método de envío */}
          <section className="bg-white rounded-2xl border p-6 space-y-3">
            <h2 className="text-xl font-bold">Método de envío</h2>
            <div className="space-y-3">
              {[
                { id: 'estandar', name: 'Envío Estándar', time: '5-7 días laborables', price: 'Gratis' },
                { id: 'express', name: 'Envío Express', time: '2-3 días laborables', price: '€4.95' },
                { id: 'urgente', name: 'Envío Urgente', time: '24h', price: '€9.95' },
              ].map(opt => (
                <label key={opt.id} className="flex gap-3 items-start p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                  <input type="radio" name="metodoEnvio" checked={formData.metodoEnvio === (opt.id as any)} onChange={() => handleGeneralChange('metodoEnvio', opt.id)} />
                  <div className="flex-1">
                    <div className="font-semibold">{opt.name}</div>
                    <div className="text-sm text-gray-600">{opt.time}</div>
                  </div>
                  <div className="font-semibold text-green-600">{opt.price}</div>
                </label>
              ))}
            </div>
          </section>
        </div>

        {/* Columna derecha - resumen */}
        <aside className="bg-white rounded-2xl border p-6 sticky top-36 md:top-40 space-y-4">
          <h3 className="text-xl font-bold">Resumen del pedido</h3>
          <div className="space-y-3">
            {cart.items.length === 0 && (
              <div className="text-gray-500 text-sm">Tu carrito está vacío.</div>
            )}
            {cart.items.map((item) => (
              <div key={`${item.id}-${item.variantId ?? 'v'}`} className="flex gap-3 border-b pb-3 items-center">
                {item.image ? (
                  <img src={item.image} alt={item.name} className="w-14 h-14 rounded-lg object-cover" />
                ) : (
                  <div className="w-14 h-14 rounded-lg bg-gray-100" />
                )}
                <div className="flex-1">
                  <div className="font-medium">{item.name}</div>
                  {item.variantName && (
                    <div className="text-xs text-gray-500">{item.variantName}</div>
                  )}
                    <div className="text-sm text-gray-600">Cantidad: {item.quantity}</div>
                    <div className="flex items-center gap-2 mt-1">
                      <button className="w-6 h-6 rounded border text-gray-700 hover:bg-gray-50" onClick={() => cart.update(item.id, Math.max(0, item.quantity - 1), item.variantId)} aria-label="Disminuir">−</button>
                      <span className="text-sm text-gray-700 w-6 text-center">{item.quantity}</span>
                      <button className="w-6 h-6 rounded border text-gray-700 hover:bg-gray-50" onClick={() => cart.update(item.id, item.quantity + 1, item.variantId)} aria-label="Aumentar">+</button>
                      <button className="ml-2 text-xs text-red-600 hover:underline" onClick={() => cart.remove(item.id, item.variantId)}>Eliminar</button>
                    </div>
                </div>
                <div className="font-semibold text-cyan-700">€{(item.price * item.quantity).toFixed(2)}</div>
              </div>
            ))}
          </div>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between"><span>Subtotal</span><span>€{subtotal.toFixed(2)}</span></div>
            <div className="flex justify-between"><span>Envío</span><span>{shippingCost === 0 ? 'Gratis' : `€${shippingCost.toFixed(2)}`}</span></div>
            <div className="flex justify-between"><span>IVA (21%)</span><span>€{iva.toFixed(2)}</span></div>
            <div className="flex justify-between font-bold pt-2 border-t"><span>Total</span><span>€{total.toFixed(2)}</span></div>
          </div>
          <button type="submit" disabled={loading || cart.items.length === 0} className={`w-full py-3 rounded-xl text-white font-bold ${loading ? 'bg-cyan-400' : 'bg-gradient-primary hover:bg-gradient-secondary'} `}>
            {loading ? 'Procesando…' : 'Continuar al pago'}
          </button>
          <div className="flex items-center justify-center gap-2 text-xs text-gray-600">
            <span>🔒 Pago Seguro</span>
            <span>•</span>
            <span>✅ SSL</span>
          </div>
        </aside>
      </form>
    </div>
  );
}
