import { useState } from 'react';

export default function DevolucionesComponent() {
  const [activeTab, setActiveTab] = useState<'devoluciones' | 'cambios' | 'garantia'>(
    'devoluciones'
  );

  const procesoDevoluciones = [
    {
      paso: '01',
      icon: '📧',
      title: 'Contacta con nosotros',
      description:
        'Envía un email a info@imprimearte.es o llámanos al 645 341 452 dentro de los 14 días desde la recepción',
      detalles:
        'Indica tu número de pedido y el motivo de la devolución. Te responderemos en menos de 24 horas con las instrucciones.',
    },
    {
      paso: '02',
      icon: '📦',
      title: 'Prepara el paquete',
      description:
        'Empaqueta el producto en su embalaje original con todas sus etiquetas y accesorios',
      detalles:
        'El producto debe estar en perfecto estado, sin usar y con todas sus etiquetas originales. Incluye el albarán o factura.',
    },
    {
      paso: '03',
      icon: '🚚',
      title: 'Envía el producto',
      description:
        'Te proporcionaremos una etiqueta de devolución prepagada o las instrucciones de envío',
      detalles:
        'Para productos estándar sin personalizar, los gastos de devolución son gratuitos. Guarda el comprobante de envío.',
    },
    {
      paso: '04',
      icon: '🔍',
      title: 'Revisión del producto',
      description:
        'Una vez recibido, revisaremos que el producto cumple las condiciones de devolución',
      detalles:
        'Este proceso tarda entre 2-3 días hábiles. Te notificaremos por email del estado de la revisión.',
    },
    {
      paso: '05',
      icon: '💰',
      title: 'Reembolso',
      description:
        'Procesaremos el reembolso en un máximo de 14 días desde la aprobación de la devolución',
      detalles:
        'El dinero se abonará al mismo método de pago utilizado en la compra. Recibirás confirmación por email.',
    },
  ];

  const condicionesDevoluciones = [
    {
      icon: '✅',
      tipo: 'SÍ se pueden devolver',
      items: [
        'Productos estándar sin personalizar en su embalaje original',
        'Artículos con defectos de fabricación o daños en el transporte',
        'Productos que no coinciden con lo descrito en la web',
        'Pedidos incorrectos o incompletos por error nuestro',
        'Artículos recibidos en mal estado',
      ],
      color: 'from-green-500 to-green-600',
    },
    {
      icon: '❌',
      tipo: 'NO se pueden devolver',
      items: [
        'Productos personalizados (salvo defecto de fabricación)',
        'Artículos sin embalaje original o etiquetas',
        'Productos usados o lavados',
        'Artículos dañados por mal uso del cliente',
        'Pedidos con diseño aprobado por el cliente',
      ],
      color: 'from-red-500 to-red-600',
    },
  ];

  const tiposGarantia = [
    {
      icon: '🎨',
      title: 'Garantía de Calidad',
      duracion: '12 meses',
      cubre: [
        'Defectos de impresión o personalización',
        'Problemas de adherencia del vinilo',
        'Decoloración prematura por defecto del material',
        'Errores de producción imputables a nosotros',
        'Productos que no coincidan con el diseño aprobado',
      ],
      noCubre: [
        'Desgaste natural por uso',
        'Daños por lavado incorrecto',
        'Modificaciones realizadas por el cliente',
        'Uso comercial intensivo sin mantenimiento',
      ],
    },
    {
      icon: '📦',
      title: 'Garantía de Producto',
      duracion: '24 meses',
      cubre: [
        'Defectos de fabricación del producto base',
        'Roturas o fallos estructurales',
        'Problemas de calidad del material',
        'Componentes defectuosos',
      ],
      noCubre: [
        'Accidentes o caídas',
        'Uso indebido o negligencia',
        'Desgaste estético normal',
        'Daños por agentes externos',
      ],
    },
  ];

  const motivosRechazo = [
    {
      icon: '👕',
      motivo: 'Producto usado o lavado',
      descripcion: 'El artículo muestra signos de uso o ha sido lavado',
      solucion: 'No podemos aceptar devoluciones de productos usados por motivos de higiene',
    },
    {
      icon: '🏷️',
      motivo: 'Sin embalaje o etiquetas',
      descripcion: 'El producto no incluye su embalaje original o le faltan etiquetas',
      solucion: 'El producto debe devolverse en las mismas condiciones en que se recibió',
    },
    {
      icon: '⏰',
      motivo: 'Fuera de plazo',
      descripcion: 'Han transcurrido más de 14 días desde la recepción',
      solucion: 'El derecho de desistimiento es de 14 días naturales desde la entrega',
    },
    {
      icon: '🎨',
      motivo: 'Producto personalizado',
      descripcion: 'Es un artículo fabricado bajo demanda según especificaciones del cliente',
      solucion: 'Solo aceptamos devoluciones de personalizados con defectos de fabricación',
    },
  ];

  const casosEspeciales = [
    {
      titulo: '🎁 Regalos',
      descripcion:
        'Si has recibido un producto como regalo, puedes solicitar un cambio o vale de compra del mismo valor. El reembolso se realizará a quien efectuó la compra original.',
      accion: 'Contacta con nosotros indicando el número de pedido',
    },
    {
      titulo: '💼 Pedidos Corporativos',
      descripcion:
        'Para pedidos de más de 50 unidades personalizadas, contacta con nuestro equipo de atención corporativa. Condiciones especiales según el caso.',
      accion: 'Email: info@imprimearte.es',
    },
    {
      titulo: '🚚 Producto Dañado en Transporte',
      descripcion:
        'Si recibes un producto dañado, documenta el estado con fotos antes de firmar la recepción. Reemplazaremos el producto sin coste adicional.',
      accion: 'Contacta en menos de 48h con fotos del daño',
    },
    {
      titulo: '📦 Pedido Incorrecto',
      descripcion:
        'Si recibiste un producto diferente al solicitado por error nuestro, lo reemplazaremos inmediatamente y nos haremos cargo de todos los gastos.',
      accion: 'Notifícanos dentro de las 48h siguientes a la entrega',
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white py-16 mt-32">
      <div className="container mx-auto px-6">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-rainbow text-white font-bold text-sm rounded-full mb-4">
            <span>↩️</span>
            <span>Devoluciones y Garantías</span>
          </div>

          <h1 className="text-4xl md:text-5xl font-black text-gray-800 mb-4">
            Política de Devoluciones
          </h1>

          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Tu satisfacción es nuestra prioridad. Conoce nuestra política de devoluciones, cambios y
            garantías
          </p>
        </div>

        {/* Tabs Navigation */}
        <div className="flex flex-wrap justify-center gap-4 mb-12">
          <button
            onClick={() => setActiveTab('devoluciones')}
            className={`px-8 py-4 rounded-xl font-bold transition-all duration-300 ${
              activeTab === 'devoluciones'
                ? 'bg-gradient-primary text-white shadow-lg scale-105'
                : 'bg-white text-gray-700 border-2 border-gray-200 hover:border-cyan-500'
            }`}
          >
            <span className="mr-2">↩️</span>
            Devoluciones
          </button>
          <button
            onClick={() => setActiveTab('cambios')}
            className={`px-8 py-4 rounded-xl font-bold transition-all duration-300 ${
              activeTab === 'cambios'
                ? 'bg-gradient-primary text-white shadow-lg scale-105'
                : 'bg-white text-gray-700 border-2 border-gray-200 hover:border-cyan-500'
            }`}
          >
            <span className="mr-2">🔄</span>
            Cambios
          </button>
          <button
            onClick={() => setActiveTab('garantia')}
            className={`px-8 py-4 rounded-xl font-bold transition-all duration-300 ${
              activeTab === 'garantia'
                ? 'bg-gradient-primary text-white shadow-lg scale-105'
                : 'bg-white text-gray-700 border-2 border-gray-200 hover:border-cyan-500'
            }`}
          >
            <span className="mr-2">✅</span>
            Garantía
          </button>
        </div>

        {/* Devoluciones Tab */}
        {activeTab === 'devoluciones' && (
          <div className="space-y-12">
            {/* Resumen Importante */}
            <div className="bg-gradient-to-r from-cyan-50 via-purple-50 to-pink-50 rounded-3xl p-8 border-2 border-cyan-200">
              <h2 className="text-2xl font-black text-gray-800 mb-6 flex items-center gap-3">
                <span>📌</span>
                Información Importante
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white rounded-xl p-5">
                  <div className="text-3xl mb-3">⏰</div>
                  <h3 className="font-bold text-gray-800 mb-2">14 Días</h3>
                  <p className="text-sm text-gray-600">
                    Tienes 14 días naturales desde la recepción para devolver productos estándar
                  </p>
                </div>
                <div className="bg-white rounded-xl p-5">
                  <div className="text-3xl mb-3">💰</div>
                  <h3 className="font-bold text-gray-800 mb-2">Reembolso Completo</h3>
                  <p className="text-sm text-gray-600">
                    Devolución del 100% del importe si el producto está en perfectas condiciones
                  </p>
                </div>
                <div className="bg-white rounded-xl p-5">
                  <div className="text-3xl mb-3">📦</div>
                  <h3 className="font-bold text-gray-800 mb-2">Envío Gratuito</h3>
                  <p className="text-sm text-gray-600">
                    Devoluciones gratuitas para productos estándar sin personalizar
                  </p>
                </div>
              </div>
            </div>

            {/* Proceso de Devolución */}
            <div className="bg-white rounded-3xl p-8 border-2 border-gray-200 shadow-lg">
              <h2 className="text-2xl font-black text-gray-800 mb-8 text-center">
                Proceso de Devolución Paso a Paso
              </h2>
              <div className="space-y-6">
                {procesoDevoluciones.map((paso, index) => (
                  <div key={index} className="relative">
                    <div className="flex gap-6 items-start">
                      <div className="flex-shrink-0">
                        <div className="w-16 h-16 bg-gradient-to-br from-cyan-500 to-purple-500 rounded-xl flex items-center justify-center text-white font-black text-lg">
                          {paso.paso}
                        </div>
                      </div>
                      <div className="flex-1">
                        <div className="bg-gray-50 rounded-2xl p-6 border-2 border-gray-200 hover:border-cyan-500 transition-all">
                          <div className="flex items-center gap-3 mb-3">
                            <span className="text-3xl">{paso.icon}</span>
                            <h3 className="text-lg font-bold text-gray-800">{paso.title}</h3>
                          </div>
                          <p className="text-gray-700 mb-3">{paso.description}</p>
                          <p className="text-sm text-gray-600 bg-white rounded-lg p-3 border border-gray-200">
                            <strong>ℹ️ Detalle:</strong> {paso.detalles}
                          </p>
                        </div>
                      </div>
                    </div>
                    {index < procesoDevoluciones.length - 1 && (
                      <div className="ml-8 h-8 w-0.5 bg-gradient-to-b from-cyan-500 to-purple-500"></div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Condiciones */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {condicionesDevoluciones.map((condicion, index) => (
                <div
                  key={index}
                  className="bg-white rounded-3xl p-8 border-2 border-gray-200 shadow-lg"
                >
                  <div
                    className={`inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r ${condicion.color} text-white font-bold rounded-full mb-6`}
                  >
                    <span className="text-xl">{condicion.icon}</span>
                    <span>{condicion.tipo}</span>
                  </div>
                  <ul className="space-y-3">
                    {condicion.items.map((item, idx) => (
                      <li key={idx} className="flex items-start gap-3">
                        <span className="text-lg flex-shrink-0">{condicion.icon}</span>
                        <span className="text-gray-700">{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>

            {/* Motivos de Rechazo */}
            <div className="bg-white rounded-3xl p-8 border-2 border-gray-200 shadow-lg">
              <h2 className="text-2xl font-black text-gray-800 mb-6">
                Motivos de Rechazo de Devolución
              </h2>
              <p className="text-gray-600 mb-6">
                Algunas devoluciones pueden ser rechazadas si no cumplen con nuestras condiciones:
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {motivosRechazo.map((item, index) => (
                  <div key={index} className="bg-red-50 border-2 border-red-200 rounded-xl p-5">
                    <div className="flex items-center gap-3 mb-3">
                      <span className="text-3xl">{item.icon}</span>
                      <h3 className="font-bold text-gray-800">{item.motivo}</h3>
                    </div>
                    <p className="text-sm text-gray-700 mb-2">{item.descripcion}</p>
                    <p className="text-xs text-red-600 font-medium">
                      <strong>⚠️</strong> {item.solucion}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Cambios Tab */}
        {activeTab === 'cambios' && (
          <div className="space-y-12">
            <div className="bg-white rounded-3xl p-8 border-2 border-gray-200 shadow-lg">
              <h2 className="text-2xl font-black text-gray-800 mb-6">Política de Cambios</h2>
              <div className="space-y-6">
                <div className="bg-gradient-to-r from-cyan-50 to-purple-50 rounded-xl p-6">
                  <h3 className="font-bold text-lg text-gray-800 mb-3 flex items-center gap-2">
                    <span>🔄</span> Cambio por Talla o Color
                  </h3>
                  <p className="text-gray-700 mb-4">
                    Si necesitas cambiar la talla o color de un producto estándar (sin
                    personalizar), puedes hacerlo dentro de los 14 días desde la recepción.
                  </p>
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-center gap-2">
                      <span className="text-cyan-500">✓</span>
                      El producto debe estar sin usar y con etiquetas
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="text-cyan-500">✓</span>
                      El cambio es gratuito (nosotros pagamos el envío)
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="text-cyan-500">✓</span>
                      Enviamos el nuevo producto en 24-48h tras recibir el original
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="text-cyan-500">✓</span>
                      Sujeto a disponibilidad de stock
                    </li>
                  </ul>
                </div>

                <div className="bg-gradient-to-r from-yellow-50 to-orange-50 rounded-xl p-6">
                  <h3 className="font-bold text-lg text-gray-800 mb-3 flex items-center gap-2">
                    <span>⚠️</span> Cambio de Productos Personalizados
                  </h3>
                  <p className="text-gray-700 mb-4">
                    Los productos personalizados NO admiten cambios, salvo que presenten defectos de
                    fabricación.
                  </p>
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-center gap-2">
                      <span className="text-orange-500">•</span>
                      Si el producto tiene un error de impresión, lo reemplazamos sin coste
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="text-orange-500">•</span>
                      Si el diseño no coincide con el aprobado, producimos uno nuevo gratis
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="text-orange-500">•</span>
                      No se aceptan cambios por "no me gusta el resultado" si se aprobó la prueba
                    </li>
                  </ul>
                </div>

                <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-6">
                  <h3 className="font-bold text-lg text-gray-800 mb-3 flex items-center gap-2">
                    <span>💡</span> Cómo Solicitar un Cambio
                  </h3>
                  <div className="space-y-3 text-sm">
                    <div className="flex items-start gap-3">
                      <span className="font-bold text-cyan-600">1.</span>
                      <p className="text-gray-700">
                        Contacta con nosotros en <strong>info@imprimearte.es</strong> o al
                        <strong> 645 341 452</strong>
                      </p>
                    </div>
                    <div className="flex items-start gap-3">
                      <span className="font-bold text-cyan-600">2.</span>
                      <p className="text-gray-700">
                        Indica tu número de pedido, el producto a cambiar y la nueva talla/color
                        deseada
                      </p>
                    </div>
                    <div className="flex items-start gap-3">
                      <span className="font-bold text-cyan-600">3.</span>
                      <p className="text-gray-700">
                        Te enviaremos una etiqueta de devolución y confirmaremos la disponibilidad
                      </p>
                    </div>
                    <div className="flex items-start gap-3">
                      <span className="font-bold text-cyan-600">4.</span>
                      <p className="text-gray-700">
                        Una vez recibido el producto original, enviaremos el cambio en 24-48h
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Casos Especiales */}
            <div className="bg-white rounded-3xl p-8 border-2 border-gray-200 shadow-lg">
              <h2 className="text-2xl font-black text-gray-800 mb-6">Casos Especiales</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {casosEspeciales.map((caso, index) => (
                  <div
                    key={index}
                    className="bg-gray-50 rounded-xl p-6 border-2 border-gray-200 hover:border-cyan-500 transition-all"
                  >
                    <h3 className="font-bold text-lg text-gray-800 mb-3">{caso.titulo}</h3>
                    <p className="text-gray-700 text-sm mb-4">{caso.descripcion}</p>
                    <div className="bg-cyan-50 border-l-4 border-cyan-500 p-3 rounded">
                      <p className="text-sm font-medium text-cyan-700">
                        <strong>Acción:</strong> {caso.accion}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Garantía Tab */}
        {activeTab === 'garantia' && (
          <div className="space-y-12">
            <div className="bg-gradient-to-r from-cyan-50 via-purple-50 to-pink-50 rounded-3xl p-8 border-2 border-cyan-200">
              <h2 className="text-2xl font-black text-gray-800 mb-6">
                Nuestro Compromiso de Garantía
              </h2>
              <p className="text-lg text-gray-700 mb-6">
                Todos nuestros productos están cubiertos por garantía contra defectos de
                fabricación. Tu satisfacción es nuestra prioridad y garantizamos la calidad de cada
                producto que sale de nuestro taller.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white rounded-xl p-5">
                  <div className="text-3xl mb-3">🛡️</div>
                  <h3 className="font-bold text-gray-800 mb-2">Cobertura Completa</h3>
                  <p className="text-sm text-gray-600">
                    Garantía contra defectos de fabricación y materiales
                  </p>
                </div>
                <div className="bg-white rounded-xl p-5">
                  <div className="text-3xl mb-3">🔄</div>
                  <h3 className="font-bold text-gray-800 mb-2">Reemplazo Rápido</h3>
                  <p className="text-sm text-gray-600">
                    Producción prioritaria de productos con garantía
                  </p>
                </div>
                <div className="bg-white rounded-xl p-5">
                  <div className="text-3xl mb-3">💯</div>
                  <h3 className="font-bold text-gray-800 mb-2">Sin Coste</h3>
                  <p className="text-sm text-gray-600">
                    Reemplazo o reparación gratuita durante el período de garantía
                  </p>
                </div>
              </div>
            </div>

            {/* Tipos de Garantía */}
            <div className="space-y-8">
              {tiposGarantia.map((garantia, index) => (
                <div
                  key={index}
                  className="bg-white rounded-3xl p-8 border-2 border-gray-200 shadow-lg"
                >
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-16 h-16 bg-gradient-to-br from-cyan-500 to-purple-500 rounded-xl flex items-center justify-center text-4xl">
                      {garantia.icon}
                    </div>
                    <div>
                      <h3 className="text-2xl font-black text-gray-800">{garantia.title}</h3>
                      <p className="text-cyan-600 font-bold">Duración: {garantia.duracion}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h4 className="font-bold text-green-700 mb-3 flex items-center gap-2">
                        <span>✅</span> Qué Cubre
                      </h4>
                      <ul className="space-y-2">
                        {garantia.cubre.map((item, idx) => (
                          <li key={idx} className="flex items-start gap-2 text-sm">
                            <span className="text-green-500 flex-shrink-0">✓</span>
                            <span className="text-gray-700">{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div>
                      <h4 className="font-bold text-red-700 mb-3 flex items-center gap-2">
                        <span>❌</span> Qué NO Cubre
                      </h4>
                      <ul className="space-y-2">
                        {garantia.noCubre.map((item, idx) => (
                          <li key={idx} className="flex items-start gap-2 text-sm">
                            <span className="text-red-500 flex-shrink-0">✗</span>
                            <span className="text-gray-700">{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Cómo Hacer Uso de la Garantía */}
            <div className="bg-white rounded-3xl p-8 border-2 border-gray-200 shadow-lg">
              <h2 className="text-2xl font-black text-gray-800 mb-6">
                Cómo Hacer Uso de tu Garantía
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                  <h3 className="font-bold text-lg text-gray-800 mb-4">Proceso de Reclamación</h3>
                  <ol className="space-y-4">
                    <li className="flex gap-3">
                      <span className="font-black text-cyan-600 text-xl">1</span>
                      <div>
                        <p className="font-bold text-gray-800 mb-1">Documenta el problema</p>
                        <p className="text-sm text-gray-600">
                          Toma fotos claras del defecto desde varios ángulos
                        </p>
                      </div>
                    </li>
                    <li className="flex gap-3">
                      <span className="font-black text-cyan-600 text-xl">2</span>
                      <div>
                        <p className="font-bold text-gray-800 mb-1">Contacta con nosotros</p>
                        <p className="text-sm text-gray-600">
                          Email: info@imprimearte.es o llama al 645 341 452
                        </p>
                      </div>
                    </li>
                    <li className="flex gap-3">
                      <span className="font-black text-cyan-600 text-xl">3</span>
                      <div>
                        <p className="font-bold text-gray-800 mb-1">Proporciona información</p>
                        <p className="text-sm text-gray-600">
                          Número de pedido, fotos del producto y descripción del problema
                        </p>
                      </div>
                    </li>
                    <li className="flex gap-3">
                      <span className="font-black text-cyan-600 text-xl">4</span>
                      <div>
                        <p className="font-bold text-gray-800 mb-1">Evaluación</p>
                        <p className="text-sm text-gray-600">
                          Revisaremos tu caso en menos de 24 horas
                        </p>
                      </div>
                    </li>
                    <li className="flex gap-3">
                      <span className="font-black text-cyan-600 text-xl">5</span>
                      <div>
                        <p className="font-bold text-gray-800 mb-1">Solución</p>
                        <p className="text-sm text-gray-600">
                          Reemplazo, reparación o reembolso según el caso
                        </p>
                      </div>
                    </li>
                  </ol>
                </div>

                <div>
                  <h3 className="font-bold text-lg text-gray-800 mb-4">Información Necesaria</h3>
                  <div className="space-y-3">
                    <div className="bg-cyan-50 rounded-xl p-4 border-2 border-cyan-200">
                      <p className="font-bold text-gray-800 mb-2">📋 Datos del Pedido</p>
                      <ul className="text-sm text-gray-700 space-y-1">
                        <li>• Número de pedido</li>
                        <li>• Fecha de compra</li>
                        <li>• Producto afectado</li>
                      </ul>
                    </div>

                    <div className="bg-purple-50 rounded-xl p-4 border-2 border-purple-200">
                      <p className="font-bold text-gray-800 mb-2">📸 Evidencia Visual</p>
                      <ul className="text-sm text-gray-700 space-y-1">
                        <li>• Fotos del defecto</li>
                        <li>• Imágenes del producto completo</li>
                        <li>• Etiquetas y embalaje (si aplica)</li>
                      </ul>
                    </div>

                    <div className="bg-yellow-50 rounded-xl p-4 border-2 border-yellow-200">
                      <p className="font-bold text-gray-800 mb-2">📝 Descripción</p>
                      <ul className="text-sm text-gray-700 space-y-1">
                        <li>• Cuándo se detectó el problema</li>
                        <li>• Cómo se ha usado el producto</li>
                        <li>• Condiciones de lavado (si aplica)</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-6 bg-green-50 border-2 border-green-200 rounded-xl p-6">
                <h4 className="font-bold text-green-800 mb-3 flex items-center gap-2">
                  <span>⏱️</span> Tiempos de Respuesta
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="font-bold text-gray-800">Evaluación inicial</p>
                    <p className="text-gray-600">Menos de 24 horas</p>
                  </div>
                  <div>
                    <p className="font-bold text-gray-800">Aprobación de garantía</p>
                    <p className="text-gray-600">1-2 días hábiles</p>
                  </div>
                  <div>
                    <p className="font-bold text-gray-800">Envío de reemplazo</p>
                    <p className="text-gray-600">3-5 días hábiles</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Contact CTA */}
        <div className="bg-gradient-to-r from-cyan-50 via-purple-50 to-pink-50 rounded-3xl p-8 md:p-12 text-center border-2 border-cyan-200 mb-12 mt-12">
          <h2 className="text-3xl font-black text-gray-800 mb-4">
            ¿Necesitas ayuda con una devolución?
          </h2>
          <p className="text-lg text-gray-600 mb-8">
            Nuestro equipo está aquí para ayudarte en cada paso del proceso
          </p>

          <div className="flex flex-wrap justify-center gap-4">
            <a
              href="mailto:info@imprimearte.es"
              className="px-8 py-4 bg-gradient-rainbow text-white font-bold rounded-xl shadow-lg hover:shadow-2xl transform hover:scale-105 transition-all duration-300"
            >
              📧 Email Devoluciones
            </a>
            <a
              href="https://wa.me/34645341452"
              target="_blank"
              rel="noopener noreferrer"
              className="px-8 py-4 bg-green-500 text-white font-bold rounded-xl shadow-lg hover:shadow-2xl transform hover:scale-105 transition-all duration-300"
            >
              💬 WhatsApp
            </a>
            <a
              href="tel:+34645341452"
              className="px-8 py-4 bg-white text-gray-700 font-bold rounded-xl border-2 border-gray-300 hover:border-cyan-500 transform hover:scale-105 transition-all duration-300"
            >
              📞 Llamar Ahora
            </a>
          </div>
        </div>

        {/* Quick Links */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <a
            href="/faq"
            className="bg-white rounded-2xl p-6 border-2 border-gray-200 hover:border-cyan-500 transition-all duration-300 group"
          >
            <div className="text-4xl mb-3">❓</div>
            <h3 className="font-bold text-lg text-gray-800 mb-2 group-hover:text-cyan-600">
              Preguntas Frecuentes
            </h3>
            <p className="text-sm text-gray-600">Encuentra respuestas rápidas sobre devoluciones</p>
          </a>

          <a
            href="/terminos-condiciones"
            className="bg-white rounded-2xl p-6 border-2 border-gray-200 hover:border-cyan-500 transition-all duration-300 group"
          >
            <div className="text-4xl mb-3">📜</div>
            <h3 className="font-bold text-lg text-gray-800 mb-2 group-hover:text-cyan-600">
              Términos y Condiciones
            </h3>
            <p className="text-sm text-gray-600">Lee nuestras condiciones completas de venta</p>
          </a>

          <a
            href="/contacto"
            className="bg-white rounded-2xl p-6 border-2 border-gray-200 hover:border-cyan-500 transition-all duration-300 group"
          >
            <div className="text-4xl mb-3">💬</div>
            <h3 className="font-bold text-lg text-gray-800 mb-2 group-hover:text-cyan-600">
              Contacto
            </h3>
            <p className="text-sm text-gray-600">Habla directamente con nuestro equipo</p>
          </a>
        </div>
      </div>
    </div>
  );
}
