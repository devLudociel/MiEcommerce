import { useState } from 'react';

export default function TerminosCondicionesComponent() {
  const [activeSection, setActiveSection] = useState<string>('');

  const sections = [
    {
      id: 'general',
      icon: '📋',
      title: 'Información General',
      content: (
        <div className="space-y-4">
          <p>
            Los presentes Términos y Condiciones regulan el uso de la tienda online{' '}
            <strong>ImprimeArte</strong>, ubicada en la dirección web imprimearte.es, propiedad
            de ImprimeArte S.L., con domicilio social en Santa Cruz de Tenerife, Islas Canarias,
            España.
          </p>
          <p>
            <strong>Datos de contacto:</strong>
          </p>
          <ul className="list-disc ml-6 space-y-2">
            <li>Razón Social: ImprimeArte S.L.</li>
            <li>CIF: B12345678</li>
            <li>Dirección: Calle Principal 123, Santa Cruz de Tenerife</li>
            <li>Email: info@imprimearte.es</li>
            <li>Teléfono: +34 645 341 452</li>
          </ul>
          <p>
            El uso de nuestra web implica la aceptación plena y sin reservas de todas y cada una de
            las disposiciones incluidas en estos Términos y Condiciones. Si no está de acuerdo con
            alguna de estas condiciones, debe abstenerse de utilizar nuestros servicios.
          </p>
        </div>
      ),
    },
    {
      id: 'objeto',
      icon: '🎯',
      title: 'Objeto del Servicio',
      content: (
        <div className="space-y-4">
          <p>
            ImprimeArte es una plataforma de comercio electrónico especializada en la
            personalización e impresión de productos bajo demanda. Nuestros servicios incluyen:
          </p>
          <ul className="list-disc ml-6 space-y-2">
            <li>
              <strong>Personalización de productos:</strong> Textil, vajilla, tecnología, hogar,
              regalos corporativos y más
            </li>
            <li>
              <strong>Servicios de diseño gráfico:</strong> Creación y adaptación de diseños
              profesionales
            </li>
            <li>
              <strong>Impresión con múltiples técnicas:</strong> DTF, sublimación, grabado láser, UV
              DTF, impresión 3D
            </li>
            <li>
              <strong>Venta de productos estándar:</strong> Productos sin personalizar listos para
              enviar
            </li>
          </ul>
          <p>
            Todos los productos se fabrican bajo demanda tras la confirmación del pedido y la
            aprobación del diseño por parte del cliente.
          </p>
        </div>
      ),
    },
    {
      id: 'registro',
      icon: '👤',
      title: 'Registro y Cuenta de Usuario',
      content: (
        <div className="space-y-4">
          <p>
            Para realizar pedidos en ImprimeArte, no es obligatorio crear una cuenta, aunque es
            recomendable para facilitar la gestión de pedidos y futuras compras.
          </p>
          <p>
            <strong>Si decides crear una cuenta, te comprometes a:</strong>
          </p>
          <ul className="list-disc ml-6 space-y-2">
            <li>Proporcionar información veraz, exacta y actualizada</li>
            <li>Mantener la confidencialidad de tus credenciales de acceso</li>
            <li>Notificarnos inmediatamente cualquier uso no autorizado de tu cuenta</li>
            <li>Ser el único responsable de todas las actividades realizadas con tu cuenta</li>
          </ul>
          <p>
            ImprimeArte se reserva el derecho de suspender o cancelar cualquier cuenta que incumpla
            estos términos o realice actividades fraudulentas.
          </p>
        </div>
      ),
    },
    {
      id: 'pedidos',
      icon: '🛒',
      title: 'Proceso de Pedido',
      content: (
        <div className="space-y-4">
          <p>
            <strong>1. Selección y Personalización:</strong> El cliente selecciona el producto y
            realiza la personalización mediante nuestra herramienta online o enviando su archivo de
            diseño.
          </p>
          <p>
            <strong>2. Revisión del Pedido:</strong> Antes de proceder al pago, el cliente debe
            revisar cuidadosamente todos los detalles del pedido: producto, diseño, cantidad, precio
            y datos de envío.
          </p>
          <p>
            <strong>3. Pago:</strong> Una vez confirmado el pedido, el cliente procede al pago
            mediante los métodos disponibles. El cargo se realizará en el momento de la
            confirmación.
          </p>
          <p>
            <strong>4. Prueba Digital:</strong> Para productos personalizados, enviaremos una prueba
            digital en un plazo máximo de 24 horas para su aprobación.
          </p>
          <p>
            <strong>5. Producción:</strong> Una vez aprobado el diseño, iniciamos la producción. El
            plazo de fabricación es de 3-5 días hábiles según el producto.
          </p>
          <p>
            <strong>6. Envío:</strong> Tras la fabricación, el producto se envía a la dirección
            indicada. Recibirás un número de seguimiento por email.
          </p>
          <p className="bg-yellow-50 border-l-4 border-yellow-500 p-4 rounded">
            <strong>Importante:</strong> Una vez aprobada la prueba digital e iniciada la
            producción, no será posible realizar cambios ni cancelar el pedido.
          </p>
        </div>
      ),
    },
    {
      id: 'precios',
      icon: '💰',
      title: 'Precios y Pagos',
      content: (
        <div className="space-y-4">
          <p>
            Todos los precios mostrados en nuestra web están expresados en Euros (€) e incluyen el
            IVA correspondiente, salvo que se indique lo contrario.
          </p>
          <p>
            <strong>Métodos de pago aceptados:</strong>
          </p>
          <ul className="list-disc ml-6 space-y-2">
            <li>Tarjeta de crédito/débito (Visa, Mastercard, American Express)</li>
            <li>PayPal</li>
            <li>Transferencia bancaria (para pedidos superiores a 200€)</li>
            <li>Contra reembolso (coste adicional de 3.50€)</li>
          </ul>
          <p>
            <strong>ImprimeArte se reserva el derecho de:</strong>
          </p>
          <ul className="list-disc ml-6 space-y-2">
            <li>
              Modificar los precios en cualquier momento, aunque respetaremos siempre el precio
              confirmado en tu pedido
            </li>
            <li>Aplicar descuentos y promociones especiales según condiciones específicas</li>
            <li>Rechazar pedidos en caso de error evidente de precio o datos incorrectos</li>
          </ul>
          <p>
            Los gastos de envío se calcularán según el destino y se mostrarán claramente antes de
            confirmar el pedido. Ofrecemos envío gratuito en pedidos superiores a 50€ en España
            peninsular.
          </p>
        </div>
      ),
    },
    {
      id: 'propiedad',
      icon: '©️',
      title: 'Propiedad Intelectual',
      content: (
        <div className="space-y-4">
          <p>
            <strong>Contenido de la Web:</strong> Todo el contenido de imprimearte.es,
            incluyendo textos, imágenes, logotipos, diseños, código fuente y cualquier otro
            material, está protegido por derechos de propiedad intelectual y pertenece a ImprimeArte
            o sus licenciantes.
          </p>
          <p>
            <strong>Diseños del Cliente:</strong> El cliente garantiza que:
          </p>
          <ul className="list-disc ml-6 space-y-2">
            <li>
              Es el propietario legítimo o tiene autorización para usar los diseños que proporciona
            </li>
            <li>Los diseños no infringen derechos de terceros (marcas, copyright, etc.)</li>
            <li>Asume toda la responsabilidad legal por el uso de diseños protegidos</li>
          </ul>
          <p className="bg-red-50 border-l-4 border-red-500 p-4 rounded">
            <strong>⚠️ Importante:</strong> ImprimeArte se reserva el derecho de rechazar cualquier
            diseño que pueda infringir derechos de terceros o contenga material inapropiado,
            ofensivo o ilegal. No nos hacemos responsables del uso indebido de diseños por parte del
            cliente.
          </p>
          <p>
            <strong>Uso Comercial:</strong> Si el cliente planea usar los productos con fines
            comerciales (reventa, merchandising, etc.), debe asegurarse de contar con todas las
            licencias necesarias.
          </p>
        </div>
      ),
    },
    {
      id: 'envios',
      icon: '📦',
      title: 'Envíos y Entregas',
      content: (
        <div className="space-y-4">
          <p>
            <strong>Zonas de Envío:</strong>
          </p>
          <ul className="list-disc ml-6 space-y-2">
            <li>España Peninsular y Baleares: 2-3 días hábiles</li>
            <li>Canarias, Ceuta y Melilla: 5-7 días hábiles (consultar condiciones especiales)</li>
            <li>Unión Europea: 5-10 días hábiles</li>
          </ul>
          <p>
            <strong>Tipos de Envío:</strong>
          </p>
          <ul className="list-disc ml-6 space-y-2">
            <li>
              <strong>Estándar:</strong> Gratuito en pedidos +50€, 5.99€ en pedidos inferiores
            </li>
            <li>
              <strong>Express (24-48h):</strong> 9.99€
            </li>
            <li>
              <strong>Urgente (24h):</strong> 14.99€
            </li>
          </ul>
          <p>
            Los plazos de entrega son orientativos y comienzan a contar desde la aprobación del
            diseño y finalización de la producción. No incluyen fines de semana ni festivos.
          </p>
          <p>
            <strong>Responsabilidad del Cliente:</strong>
          </p>
          <ul className="list-disc ml-6 space-y-2">
            <li>Proporcionar una dirección de envío correcta y completa</li>
            <li>Estar disponible para recibir el pedido o designar a una persona autorizada</li>
            <li>Revisar el paquete en presencia del transportista antes de firmar</li>
          </ul>
          <p className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded">
            <strong>📍 Nota:</strong> Si el pedido no puede entregarse por dirección incorrecta o
            ausencia del destinatario tras 2 intentos, se considerará abandonado y los gastos de
            reenvío correrán por cuenta del cliente.
          </p>
        </div>
      ),
    },
    {
      id: 'garantia',
      icon: '✅',
      title: 'Garantías y Calidad',
      content: (
        <div className="space-y-4">
          <p>
            ImprimeArte garantiza la calidad de todos sus productos y servicios. Todos los artículos
            están cubiertos por una garantía de 12 meses contra defectos de fabricación.
          </p>
          <p>
            <strong>La garantía cubre:</strong>
          </p>
          <ul className="list-disc ml-6 space-y-2">
            <li>Defectos de impresión o personalización</li>
            <li>Problemas de calidad en materiales</li>
            <li>Errores de producción imputables a ImprimeArte</li>
            <li>Productos que no coincidan con el diseño aprobado</li>
          </ul>
          <p>
            <strong>La garantía NO cubre:</strong>
          </p>
          <ul className="list-disc ml-6 space-y-2">
            <li>Desgaste natural por uso normal</li>
            <li>Daños causados por uso inadecuado o negligencia</li>
            <li>Productos lavados incorrectamente (no seguir instrucciones)</li>
            <li>Modificaciones realizadas por el cliente</li>
            <li>Diferencias mínimas de color entre pantalla y producto final</li>
          </ul>
          <p>
            En caso de producto defectuoso, lo reemplazaremos sin coste adicional o reembolsaremos
            el importe íntegro, según prefieras.
          </p>
        </div>
      ),
    },
    {
      id: 'responsabilidad',
      icon: '⚖️',
      title: 'Limitación de Responsabilidad',
      content: (
        <div className="space-y-4">
          <p>ImprimeArte no se hace responsable de:</p>
          <ul className="list-disc ml-6 space-y-2">
            <li>Retrasos en la entrega causados por la empresa de transporte</li>
            <li>Daños derivados del uso indebido o negligente de los productos</li>
            <li>Pérdidas económicas indirectas derivadas del uso de nuestros productos</li>
            <li>
              Infracciones de derechos de propiedad intelectual en diseños proporcionados por el
              cliente
            </li>
            <li>
              Fallos técnicos ajenos a nuestro control (caídas de servidor, problemas de conexión,
              etc.)
            </li>
          </ul>
          <p>
            Nuestra responsabilidad máxima en cualquier caso estará limitada al importe pagado por
            el producto o servicio en cuestión.
          </p>
          <p>
            El cliente es el único responsable de verificar que los diseños no infringen derechos de
            terceros y de obtener las licencias necesarias para su uso comercial.
          </p>
        </div>
      ),
    },
    {
      id: 'proteccion',
      icon: '🔒',
      title: 'Protección de Datos',
      content: (
        <div className="space-y-4">
          <p>
            En ImprimeArte cumplimos estrictamente con el Reglamento General de Protección de Datos
            (RGPD) y la Ley Orgánica de Protección de Datos (LOPD).
          </p>
          <p>
            <strong>Tratamiento de Datos:</strong>
          </p>
          <ul className="list-disc ml-6 space-y-2">
            <li>Solo recopilamos los datos necesarios para procesar tu pedido</li>
            <li>Tus datos nunca serán cedidos a terceros sin tu consentimiento</li>
            <li>Implementamos medidas de seguridad para proteger tu información</li>
            <li>Puedes ejercer tus derechos de acceso, rectificación, cancelación y oposición</li>
          </ul>
          <p>
            Para más información, consulta nuestra{' '}
            <a href="/politica-privacidad" className="text-cyan-600 font-bold hover:underline">
              Política de Privacidad
            </a>{' '}
            completa.
          </p>
        </div>
      ),
    },
    {
      id: 'modificaciones',
      icon: '🔄',
      title: 'Modificaciones',
      content: (
        <div className="space-y-4">
          <p>
            ImprimeArte se reserva el derecho de modificar estos Términos y Condiciones en cualquier
            momento. Las modificaciones entrarán en vigor desde su publicación en la web.
          </p>
          <p>
            Te recomendamos revisar periódicamente esta página para estar al tanto de posibles
            cambios. El uso continuado de nuestros servicios tras la publicación de modificaciones
            constituye tu aceptación de las mismas.
          </p>
          <p>
            Los cambios significativos serán notificados a los usuarios registrados mediante email.
          </p>
        </div>
      ),
    },
    {
      id: 'legislacion',
      icon: '📜',
      title: 'Legislación y Jurisdicción',
      content: (
        <div className="space-y-4">
          <p>Estos Términos y Condiciones se rigen por la legislación española vigente.</p>
          <p>
            Para la resolución de cualquier controversia que pudiera derivarse del acceso o uso de
            nuestra web, las partes se someten expresamente a la jurisdicción de los Juzgados y
            Tribunales de Santa Cruz de Tenerife, renunciando a cualquier otro fuero que pudiera
            corresponderles.
          </p>
          <p>
            <strong>Resolución Alternativa de Conflictos:</strong> En caso de disputa, las partes
            intentarán resolver amistosamente cualquier controversia antes de acudir a los
            tribunales.
          </p>
          <p>
            Los consumidores pueden acudir a la plataforma europea de resolución de litigios en
            línea:
            <a
              href="https://ec.europa.eu/consumers/odr"
              target="_blank"
              rel="noopener noreferrer"
              className="text-cyan-600 font-bold hover:underline ml-1"
            >
              ec.europa.eu/consumers/odr
            </a>
          </p>
        </div>
      ),
    },
  ];

  const scrollToSection = (id: string) => {
    setActiveSection(id);
    const element = document.getElementById(id);
    if (element) {
      const offset = 120;
      const elementPosition = element.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - offset;
      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth',
      });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white py-16 mt-32">
      <div className="container mx-auto px-6">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-rainbow text-white font-bold text-sm rounded-full mb-4">
            <span>📜</span>
            <span>Legal</span>
          </div>

          <h1 className="text-4xl md:text-5xl font-black text-gray-800 mb-4">
            Términos y Condiciones
          </h1>

          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Lee atentamente nuestros términos y condiciones de uso antes de realizar tu pedido
          </p>

          <p className="text-sm text-gray-500 mt-4">Última actualización: Octubre 2024</p>
        </div>

        {/* Navigation Index */}
        <div className="bg-white rounded-3xl p-6 border-2 border-gray-200 shadow-lg mb-12">
          <h2 className="text-xl font-bold text-gray-800 mb-4">📑 Índice de Contenidos</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {sections.map((section) => (
              <button
                key={section.id}
                onClick={() => scrollToSection(section.id)}
                className={`text-left px-4 py-3 rounded-xl font-medium transition-all duration-300 ${
                  activeSection === section.id
                    ? 'bg-gradient-primary text-white shadow-lg'
                    : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
                }`}
              >
                <span className="mr-2">{section.icon}</span>
                {section.title}
              </button>
            ))}
          </div>
        </div>

        {/* Content Sections */}
        <div className="space-y-8 mb-16">
          {sections.map((section) => (
            <div
              key={section.id}
              id={section.id}
              className="bg-white rounded-3xl p-8 border-2 border-gray-200 shadow-lg scroll-mt-32"
            >
              <div className="flex items-center gap-3 mb-6 pb-4 border-b-2 border-gray-100">
                <span className="text-4xl">{section.icon}</span>
                <h2 className="text-2xl font-black text-gray-800">{section.title}</h2>
              </div>
              <div className="text-gray-700 leading-relaxed">{section.content}</div>
            </div>
          ))}
        </div>

        {/* Contact Section */}
        <div className="bg-gradient-to-r from-cyan-50 via-purple-50 to-pink-50 rounded-3xl p-8 md:p-12 text-center border-2 border-cyan-200 mb-12">
          <h2 className="text-3xl font-black text-gray-800 mb-4">
            ¿Tienes dudas sobre nuestros términos?
          </h2>
          <p className="text-lg text-gray-600 mb-8">
            Estamos aquí para ayudarte. Contáctanos y te responderemos todas tus preguntas
          </p>

          <div className="flex flex-wrap justify-center gap-4">
            <a
              href="/contacto"
              className="px-8 py-4 bg-gradient-rainbow text-white font-bold rounded-xl shadow-lg hover:shadow-2xl transform hover:scale-105 transition-all duration-300"
            >
              📧 Contactar Soporte
            </a>
            <a
              href="/faq"
              className="px-8 py-4 bg-white text-gray-700 font-bold rounded-xl border-2 border-gray-300 hover:border-cyan-500 transform hover:scale-105 transition-all duration-300"
            >
              ❓ Ver FAQ
            </a>
          </div>
        </div>

        {/* Quick Links */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <a
            href="/politica-privacidad"
            className="bg-white rounded-2xl p-6 border-2 border-gray-200 hover:border-cyan-500 transition-all duration-300 group"
          >
            <div className="text-4xl mb-3">🔒</div>
            <h3 className="font-bold text-lg text-gray-800 mb-2 group-hover:text-cyan-600">
              Política de Privacidad
            </h3>
            <p className="text-sm text-gray-600">
              Cómo protegemos y utilizamos tus datos personales
            </p>
          </a>

          <a
            href="/devoluciones"
            className="bg-white rounded-2xl p-6 border-2 border-gray-200 hover:border-cyan-500 transition-all duration-300 group"
          >
            <div className="text-4xl mb-3">↩️</div>
            <h3 className="font-bold text-lg text-gray-800 mb-2 group-hover:text-cyan-600">
              Política de Devoluciones
            </h3>
            <p className="text-sm text-gray-600">Información sobre cambios y devoluciones</p>
          </a>

          <a
            href="/sobre-nosotros"
            className="bg-white rounded-2xl p-6 border-2 border-gray-200 hover:border-cyan-500 transition-all duration-300 group"
          >
            <div className="text-4xl mb-3">🏢</div>
            <h3 className="font-bold text-lg text-gray-800 mb-2 group-hover:text-cyan-600">
              Sobre Nosotros
            </h3>
            <p className="text-sm text-gray-600">Conoce nuestra empresa y valores</p>
          </a>
        </div>
      </div>
    </div>
  );
}
