import { useState } from 'react';

export default function PoliticaPrivacidadComponent() {
  const [activeSection, setActiveSection] = useState<string>('');

  const sections = [
    {
      id: 'responsable',
      icon: '👤',
      title: 'Responsable del Tratamiento',
      content: (
        <div className="space-y-4">
          <p>
            De conformidad con el Reglamento (UE) 2016/679 del Parlamento Europeo y del Consejo de
            27 de abril de 2016 (RGPD) y la Ley Orgánica 3/2018, de 5 de diciembre, de Protección de
            Datos Personales y garantía de los derechos digitales (LOPDGDD), le informamos que:
          </p>
          <div className="bg-gradient-to-br from-cyan-50 to-purple-50 rounded-xl p-6 border-2 border-cyan-200">
            <h3 className="font-bold text-lg mb-4 text-gray-800">📋 Datos del Responsable</h3>
            <ul className="space-y-2">
              <li>
                <strong>Identidad:</strong> ImprimeArte S.L.
              </li>
              <li>
                <strong>CIF:</strong> B12345678
              </li>
              <li>
                <strong>Dirección:</strong> Calle Principal 123, Santa Cruz de Tenerife, España
              </li>
              <li>
                <strong>Email:</strong> privacidad@imprimarte.com
              </li>
              <li>
                <strong>Teléfono:</strong> +34 645 341 452
              </li>
              <li>
                <strong>Delegado de Protección de Datos:</strong> dpo@imprimarte.com
              </li>
            </ul>
          </div>
          <p>
            ImprimeArte S.L. es el responsable del tratamiento de los datos personales que nos
            facilite y se compromete a garantizar su confidencialidad y seguridad conforme a la
            normativa vigente.
          </p>
        </div>
      ),
    },
    {
      id: 'datos',
      icon: '📊',
      title: 'Datos que Recopilamos',
      content: (
        <div className="space-y-4">
          <p>
            Recopilamos y tratamos diferentes tipos de datos personales según la finalidad y
            relación con nuestros servicios:
          </p>

          <div className="space-y-4">
            <div className="bg-white border-l-4 border-cyan-500 p-4 rounded">
              <h4 className="font-bold text-gray-800 mb-2">🛒 Datos de Clientes y Pedidos</h4>
              <ul className="list-disc ml-6 space-y-1 text-sm">
                <li>Nombre y apellidos</li>
                <li>DNI/NIE/NIF (para facturación)</li>
                <li>Dirección postal y de envío</li>
                <li>Email y teléfono</li>
                <li>Datos de pago (procesados por pasarelas seguras)</li>
                <li>Historial de pedidos y preferencias</li>
              </ul>
            </div>

            <div className="bg-white border-l-4 border-magenta-500 p-4 rounded">
              <h4 className="font-bold text-gray-800 mb-2">👤 Datos de Cuenta de Usuario</h4>
              <ul className="list-disc ml-6 space-y-1 text-sm">
                <li>Usuario y contraseña (encriptada)</li>
                <li>Preferencias de personalización</li>
                <li>Diseños guardados</li>
                <li>Dirección de envío guardadas</li>
              </ul>
            </div>

            <div className="bg-white border-l-4 border-yellow-500 p-4 rounded">
              <h4 className="font-bold text-gray-800 mb-2">🌐 Datos de Navegación</h4>
              <ul className="list-disc ml-6 space-y-1 text-sm">
                <li>Dirección IP</li>
                <li>Tipo de navegador y dispositivo</li>
                <li>Páginas visitadas y tiempo de navegación</li>
                <li>Cookies y tecnologías similares</li>
                <li>Datos de interacción con la web</li>
              </ul>
            </div>

            <div className="bg-white border-l-4 border-purple-500 p-4 rounded">
              <h4 className="font-bold text-gray-800 mb-2">📧 Datos de Newsletter y Marketing</h4>
              <ul className="list-disc ml-6 space-y-1 text-sm">
                <li>Email</li>
                <li>Nombre (opcional)</li>
                <li>Preferencias de comunicación</li>
                <li>Interacciones con nuestros emails</li>
              </ul>
            </div>
          </div>

          <p className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded">
            <strong>📌 Importante:</strong> Solo recopilamos los datos estrictamente necesarios para
            cada finalidad. No solicitamos información sensible ni tratamos datos de menores sin el
            consentimiento parental correspondiente.
          </p>
        </div>
      ),
    },
    {
      id: 'finalidad',
      icon: '🎯',
      title: 'Finalidad y Base Legal',
      content: (
        <div className="space-y-4">
          <p>
            Tratamos sus datos personales para las siguientes finalidades, con su correspondiente
            base legal:
          </p>

          <div className="space-y-4">
            <div className="bg-gradient-to-r from-cyan-50 to-cyan-100 p-6 rounded-xl">
              <h4 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
                <span>🛍️</span> Gestión de Pedidos y Ventas
              </h4>
              <p className="text-sm mb-2">
                <strong>Base legal:</strong> Ejecución de contrato
              </p>
              <p className="text-sm">
                Procesamiento de pedidos, gestión de pagos, fabricación de productos personalizados,
                envío y entrega, gestión de devoluciones y garantías, atención al cliente.
              </p>
            </div>

            <div className="bg-gradient-to-r from-magenta-50 to-magenta-100 p-6 rounded-xl">
              <h4 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
                <span>📄</span> Obligaciones Legales
              </h4>
              <p className="text-sm mb-2">
                <strong>Base legal:</strong> Cumplimiento legal
              </p>
              <p className="text-sm">
                Emisión de facturas, obligaciones fiscales y contables, prevención de fraude,
                respuesta a requerimientos judiciales o administrativos.
              </p>
            </div>

            <div className="bg-gradient-to-r from-yellow-50 to-yellow-100 p-6 rounded-xl">
              <h4 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
                <span>📧</span> Marketing y Comunicaciones
              </h4>
              <p className="text-sm mb-2">
                <strong>Base legal:</strong> Consentimiento expreso
              </p>
              <p className="text-sm">
                Envío de newsletter, ofertas personalizadas, información sobre nuevos productos,
                promociones exclusivas. Puedes darte de baja en cualquier momento.
              </p>
            </div>

            <div className="bg-gradient-to-r from-purple-50 to-purple-100 p-6 rounded-xl">
              <h4 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
                <span>📊</span> Análisis y Mejora
              </h4>
              <p className="text-sm mb-2">
                <strong>Base legal:</strong> Interés legítimo
              </p>
              <p className="text-sm">
                Análisis de uso de la web, mejora de servicios, desarrollo de nuevos productos,
                estadísticas internas, optimización de la experiencia de usuario.
              </p>
            </div>

            <div className="bg-gradient-to-r from-green-50 to-green-100 p-6 rounded-xl">
              <h4 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
                <span>🔒</span> Seguridad
              </h4>
              <p className="text-sm mb-2">
                <strong>Base legal:</strong> Interés legítimo
              </p>
              <p className="text-sm">
                Prevención de fraude, detección de actividades sospechosas, protección de sistemas,
                cumplimiento de políticas internas de seguridad.
              </p>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 'conservacion',
      icon: '⏰',
      title: 'Plazo de Conservación',
      content: (
        <div className="space-y-4">
          <p>
            Conservamos sus datos personales durante el tiempo necesario para cumplir con las
            finalidades para las que fueron recabados:
          </p>

          <div className="space-y-3">
            <div className="bg-white border-2 border-gray-200 rounded-xl p-4">
              <div className="flex items-center gap-3 mb-2">
                <span className="text-2xl">📦</span>
                <h4 className="font-bold text-gray-800">Datos de Pedidos</h4>
              </div>
              <p className="text-sm text-gray-700">
                <strong>Durante la relación comercial</strong> y posteriormente durante{' '}
                <strong>6 años</strong>
                para cumplir con obligaciones fiscales y contables (según normativa mercantil y
                tributaria).
              </p>
            </div>

            <div className="bg-white border-2 border-gray-200 rounded-xl p-4">
              <div className="flex items-center gap-3 mb-2">
                <span className="text-2xl">👤</span>
                <h4 className="font-bold text-gray-800">Cuenta de Usuario</h4>
              </div>
              <p className="text-sm text-gray-700">
                Hasta que solicite su baja o <strong>2 años de inactividad</strong>. Podrá reactivar
                su cuenta en cualquier momento.
              </p>
            </div>

            <div className="bg-white border-2 border-gray-200 rounded-xl p-4">
              <div className="flex items-center gap-3 mb-2">
                <span className="text-2xl">📧</span>
                <h4 className="font-bold text-gray-800">Newsletter y Marketing</h4>
              </div>
              <p className="text-sm text-gray-700">
                Hasta que retire su consentimiento dándose de baja. Eliminamos automáticamente tras
                <strong>3 años sin interacción</strong> con nuestras comunicaciones.
              </p>
            </div>

            <div className="bg-white border-2 border-gray-200 rounded-xl p-4">
              <div className="flex items-center gap-3 mb-2">
                <span className="text-2xl">🌐</span>
                <h4 className="font-bold text-gray-800">Datos de Navegación</h4>
              </div>
              <p className="text-sm text-gray-700">
                Las cookies se conservan según los plazos especificados en nuestra política de
                cookies. Generalmente entre <strong>1 mes y 2 años</strong> según el tipo.
              </p>
            </div>
          </div>

          <p className="bg-yellow-50 border-l-4 border-yellow-500 p-4 rounded">
            <strong>⚠️ Nota:</strong> Transcurridos estos plazos, procedemos a la eliminación segura
            de los datos o a su anonimización para fines estadísticos, salvo obligación legal de
            conservación.
          </p>
        </div>
      ),
    },
    {
      id: 'destinatarios',
      icon: '🔗',
      title: 'Destinatarios de los Datos',
      content: (
        <div className="space-y-4">
          <p>
            Sus datos personales pueden ser comunicados a terceros únicamente en los siguientes
            casos:
          </p>

          <div className="space-y-3">
            <div className="bg-cyan-50 border-l-4 border-cyan-500 p-4 rounded">
              <h4 className="font-bold mb-2">🚚 Empresas de Transporte</h4>
              <p className="text-sm">
                Compartimos nombre, dirección y teléfono con empresas de mensajería para la entrega
                de pedidos (SEUR, Correos, MRW, etc.).
              </p>
            </div>

            <div className="bg-magenta-50 border-l-4 border-magenta-500 p-4 rounded">
              <h4 className="font-bold mb-2">💳 Pasarelas de Pago</h4>
              <p className="text-sm">
                Utilizamos servicios de pago seguros (Stripe, PayPal) que procesan los datos de pago
                según sus propias políticas de privacidad. No almacenamos datos de tarjetas.
              </p>
            </div>

            <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4 rounded">
              <h4 className="font-bold mb-2">📧 Servicios de Email Marketing</h4>
              <p className="text-sm">
                Utilizamos plataformas de email marketing (Mailchimp, SendGrid) para gestionar
                newsletters, siempre bajo nuestras instrucciones y con garantías de seguridad.
              </p>
            </div>

            <div className="bg-purple-50 border-l-4 border-purple-500 p-4 rounded">
              <h4 className="font-bold mb-2">☁️ Servicios Cloud</h4>
              <p className="text-sm">
                Utilizamos servicios de alojamiento y almacenamiento en la nube (AWS, Google Cloud)
                con servidores ubicados en la UE que cumplen con el RGPD.
              </p>
            </div>

            <div className="bg-green-50 border-l-4 border-green-500 p-4 rounded">
              <h4 className="font-bold mb-2">⚖️ Autoridades y Organismos</h4>
              <p className="text-sm">
                Podemos comunicar datos a autoridades competentes cuando sea legalmente requerido
                (Hacienda, Fuerzas de Seguridad, tribunales).
              </p>
            </div>
          </div>

          <p className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded">
            <strong>🔒 Garantía:</strong> Todos nuestros proveedores están sujetos a acuerdos de
            confidencialidad y tratamiento de datos que garantizan la seguridad de su información
            conforme al RGPD.
          </p>

          <p className="text-sm text-gray-600">
            <strong>Transferencias Internacionales:</strong> En caso de transferencias fuera del
            EEE, nos aseguramos de que existan garantías adecuadas (Cláusulas Contractuales Tipo,
            Privacy Shield, etc.).
          </p>
        </div>
      ),
    },
    {
      id: 'derechos',
      icon: '✋',
      title: 'Tus Derechos',
      content: (
        <div className="space-y-4">
          <p>Tienes derecho a ejercer los siguientes derechos sobre tus datos personales:</p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white border-2 border-cyan-200 rounded-xl p-5">
              <div className="text-3xl mb-2">👁️</div>
              <h4 className="font-bold text-gray-800 mb-2">Derecho de Acceso</h4>
              <p className="text-sm text-gray-700">
                Conocer qué datos tenemos sobre ti, para qué los usamos y a quién se han comunicado.
              </p>
            </div>

            <div className="bg-white border-2 border-magenta-200 rounded-xl p-5">
              <div className="text-3xl mb-2">✏️</div>
              <h4 className="font-bold text-gray-800 mb-2">Derecho de Rectificación</h4>
              <p className="text-sm text-gray-700">Modificar datos incorrectos o incompletos.</p>
            </div>

            <div className="bg-white border-2 border-yellow-200 rounded-xl p-5">
              <div className="text-3xl mb-2">🗑️</div>
              <h4 className="font-bold text-gray-800 mb-2">Derecho de Supresión</h4>
              <p className="text-sm text-gray-700">
                Solicitar la eliminación de tus datos cuando ya no sean necesarios.
              </p>
            </div>

            <div className="bg-white border-2 border-purple-200 rounded-xl p-5">
              <div className="text-3xl mb-2">🚫</div>
              <h4 className="font-bold text-gray-800 mb-2">Derecho de Oposición</h4>
              <p className="text-sm text-gray-700">
                Oponerte al tratamiento de tus datos, especialmente para marketing directo.
              </p>
            </div>

            <div className="bg-white border-2 border-green-200 rounded-xl p-5">
              <div className="text-3xl mb-2">⏸️</div>
              <h4 className="font-bold text-gray-800 mb-2">Derecho de Limitación</h4>
              <p className="text-sm text-gray-700">
                Solicitar la limitación del tratamiento en determinadas circunstancias.
              </p>
            </div>

            <div className="bg-white border-2 border-blue-200 rounded-xl p-5">
              <div className="text-3xl mb-2">📦</div>
              <h4 className="font-bold text-gray-800 mb-2">Derecho de Portabilidad</h4>
              <p className="text-sm text-gray-700">
                Recibir tus datos en formato estructurado para transferirlos a otro responsable.
              </p>
            </div>
          </div>

          <div className="bg-gradient-to-r from-cyan-50 to-purple-50 rounded-xl p-6 border-2 border-cyan-200">
            <h4 className="font-bold text-gray-800 mb-4 text-lg">📝 ¿Cómo ejercer tus derechos?</h4>
            <p className="text-sm mb-4">Puedes ejercer tus derechos de forma gratuita mediante:</p>
            <ul className="space-y-2 text-sm">
              <li className="flex items-center gap-2">
                <span className="text-cyan-500">✓</span>
                <strong>Email:</strong> privacidad@imprimarte.com
              </li>
              <li className="flex items-center gap-2">
                <span className="text-cyan-500">✓</span>
                <strong>Correo postal:</strong> Calle Principal 123, Santa Cruz de Tenerife
              </li>
              <li className="flex items-center gap-2">
                <span className="text-cyan-500">✓</span>
                <strong>Panel de usuario:</strong> Desde tu cuenta, sección "Privacidad"
              </li>
            </ul>
            <p className="text-sm mt-4 text-gray-700">
              Deberás acreditar tu identidad adjuntando copia del DNI. Responderemos en un plazo
              máximo de <strong>1 mes</strong> desde la recepción de la solicitud.
            </p>
          </div>

          <p className="text-sm text-gray-600">
            Si consideras que no hemos atendido correctamente tus derechos, puedes presentar una
            reclamación ante la <strong>Agencia Española de Protección de Datos</strong>{' '}
            (www.aepd.es).
          </p>
        </div>
      ),
    },
    {
      id: 'seguridad',
      icon: '🔐',
      title: 'Seguridad de los Datos',
      content: (
        <div className="space-y-4">
          <p>
            En ImprimeArte implementamos medidas técnicas y organizativas para garantizar la
            seguridad de tus datos personales:
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-gradient-to-br from-cyan-500 to-cyan-600 p-6 rounded-xl text-white">
              <div className="text-4xl mb-3">🔒</div>
              <h4 className="font-bold mb-2">Encriptación SSL/TLS</h4>
              <p className="text-sm text-white/90">
                Toda la comunicación está cifrada con certificados SSL para proteger la transmisión
                de datos.
              </p>
            </div>

            <div className="bg-gradient-to-br from-magenta-500 to-magenta-600 p-6 rounded-xl text-white">
              <div className="text-4xl mb-3">🛡️</div>
              <h4 className="font-bold mb-2">Firewall y Antivirus</h4>
              <p className="text-sm text-white/90">
                Sistemas de protección perimetral y antivirus actualizados constantemente.
              </p>
            </div>

            <div className="bg-gradient-to-br from-yellow-500 to-yellow-600 p-6 rounded-xl text-white">
              <div className="text-4xl mb-3">🔑</div>
              <h4 className="font-bold mb-2">Contraseñas Seguras</h4>
              <p className="text-sm text-white/90">
                Almacenamiento de contraseñas mediante algoritmos de hash seguros (bcrypt).
              </p>
            </div>

            <div className="bg-gradient-to-br from-purple-500 to-purple-600 p-6 rounded-xl text-white">
              <div className="text-4xl mb-3">💾</div>
              <h4 className="font-bold mb-2">Copias de Seguridad</h4>
              <p className="text-sm text-white/90">
                Backups diarios automáticos con redundancia geográfica.
              </p>
            </div>

            <div className="bg-gradient-to-br from-green-500 to-green-600 p-6 rounded-xl text-white">
              <div className="text-4xl mb-3">👥</div>
              <h4 className="font-bold mb-2">Control de Acceso</h4>
              <p className="text-sm text-white/90">
                Acceso restringido solo a personal autorizado con autenticación de dos factores.
              </p>
            </div>

            <div className="bg-gradient-to-br from-blue-500 to-blue-600 p-6 rounded-xl text-white">
              <div className="text-4xl mb-3">📊</div>
              <h4 className="font-bold mb-2">Auditorías Regulares</h4>
              <p className="text-sm text-white/90">
                Revisiones periódicas de seguridad y cumplimiento normativo.
              </p>
            </div>
          </div>

          <p className="bg-red-50 border-l-4 border-red-500 p-4 rounded">
            <strong>⚠️ Importante:</strong> A pesar de nuestras medidas de seguridad, ningún sistema
            es 100% infalible. En caso de brecha de seguridad que afecte a tus datos, te
            notificaremos en un plazo máximo de 72 horas conforme al RGPD.
          </p>
        </div>
      ),
    },
    {
      id: 'cookies',
      icon: '🍪',
      title: 'Cookies y Tecnologías',
      content: (
        <div className="space-y-4">
          <p>
            Utilizamos cookies y tecnologías similares para mejorar tu experiencia de navegación.
            Puedes gestionar tus preferencias en cualquier momento.
          </p>

          <div className="space-y-3">
            <div className="bg-white border-2 border-gray-200 rounded-xl p-5">
              <h4 className="font-bold text-gray-800 mb-2 flex items-center gap-2">
                <span>✅</span> Cookies Técnicas (Necesarias)
              </h4>
              <p className="text-sm text-gray-700 mb-2">
                Esenciales para el funcionamiento de la web. No requieren consentimiento.
              </p>
              <p className="text-xs text-gray-500">
                Ejemplos: cookies de sesión, carrito de compra, preferencias de idioma
              </p>
            </div>

            <div className="bg-white border-2 border-gray-200 rounded-xl p-5">
              <h4 className="font-bold text-gray-800 mb-2 flex items-center gap-2">
                <span>📊</span> Cookies Analíticas
              </h4>
              <p className="text-sm text-gray-700 mb-2">
                Nos permiten analizar el uso de la web para mejorar su rendimiento. Requieren
                consentimiento.
              </p>
              <p className="text-xs text-gray-500">
                Ejemplos: Google Analytics (anonimizado), Hotjar, estadísticas internas
              </p>
            </div>

            <div className="bg-white border-2 border-gray-200 rounded-xl p-5">
              <h4 className="font-bold text-gray-800 mb-2 flex items-center gap-2">
                <span>🎯</span> Cookies de Publicidad
              </h4>
              <p className="text-sm text-gray-700 mb-2">
                Muestran publicidad personalizada según tus intereses. Requieren consentimiento.
              </p>
              <p className="text-xs text-gray-500">
                Ejemplos: Google Ads, Facebook Pixel, remarketing
              </p>
            </div>
          </div>

          <div className="bg-gradient-to-r from-cyan-50 to-purple-50 rounded-xl p-6 border-2 border-cyan-200">
            <h4 className="font-bold text-gray-800 mb-3">⚙️ Gestión de Cookies</h4>
            <p className="text-sm mb-3">Puedes gestionar o eliminar cookies a través de:</p>
            <ul className="space-y-2 text-sm">
              <li className="flex items-center gap-2">
                <span className="text-cyan-500">✓</span>
                Nuestro panel de configuración de cookies
              </li>
              <li className="flex items-center gap-2">
                <span className="text-cyan-500">✓</span>
                La configuración de tu navegador
              </li>
              <li className="flex items-center gap-2">
                <span className="text-cyan-500">✓</span>
                Herramientas de terceros como Your Online Choices
              </li>
            </ul>
          </div>

          <p className="text-sm text-gray-600">
            Para más información, consulta nuestra{' '}
            <a href="/politica-cookies" className="text-cyan-600 font-bold hover:underline">
              Política de Cookies
            </a>{' '}
            completa.
          </p>
        </div>
      ),
    },
    {
      id: 'menores',
      icon: '👶',
      title: 'Datos de Menores',
      content: (
        <div className="space-y-4">
          <p>
            Nuestros servicios están dirigidos a mayores de 18 años. No recopilamos
            intencionadamente datos personales de menores de edad.
          </p>
          <p>
            <strong>Si eres menor de 18 años:</strong> Necesitas el consentimiento de tus padres o
            tutores legales para utilizar nuestros servicios y proporcionarnos tus datos personales.
          </p>
          <p>
            <strong>Si eres padre/madre/tutor:</strong> Si descubres que tu hijo menor de 18 años ha
            proporcionado datos personales sin tu consentimiento, contáctanos inmediatamente y
            procederemos a eliminarlos.
          </p>
          <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4 rounded">
            <p className="text-sm">
              <strong>⚠️ Compromiso:</strong> Si detectamos que hemos recopilado datos de un menor
              sin el consentimiento parental adecuado, eliminaremos dicha información de nuestros
              sistemas de forma inmediata.
            </p>
          </div>
        </div>
      ),
    },
    {
      id: 'cambios',
      icon: '🔄',
      title: 'Cambios en la Política',
      content: (
        <div className="space-y-4">
          <p>
            Nos reservamos el derecho de modificar esta Política de Privacidad en cualquier momento
            para adaptarla a cambios legislativos o en nuestros servicios.
          </p>
          <p>
            <strong>Te notificaremos cualquier cambio mediante:</strong>
          </p>
          <ul className="list-disc ml-6 space-y-2">
            <li>Aviso destacado en nuestra web</li>
            <li>Email a usuarios registrados (para cambios sustanciales)</li>
            <li>Actualización de la fecha de "Última actualización"</li>
          </ul>
          <p>
            Te recomendamos revisar periódicamente esta política para estar informado sobre cómo
            protegemos tus datos.
          </p>
          <p className="text-sm text-gray-600">
            <strong>Última actualización:</strong> Octubre 2024
          </p>
        </div>
      ),
    },
    {
      id: 'contacto',
      icon: '📧',
      title: 'Contacto y DPO',
      content: (
        <div className="space-y-4">
          <p>
            Para cualquier consulta sobre esta Política de Privacidad o sobre cómo tratamos tus
            datos, puedes contactar con nosotros o con nuestro Delegado de Protección de Datos:
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-gradient-to-br from-cyan-50 to-cyan-100 p-6 rounded-xl border-2 border-cyan-200">
              <h4 className="font-bold text-gray-800 mb-4">📞 Contacto General</h4>
              <ul className="space-y-2 text-sm">
                <li>
                  <strong>Email:</strong> privacidad@imprimarte.com
                </li>
                <li>
                  <strong>Teléfono:</strong> +34 645 341 452
                </li>
                <li>
                  <strong>Dirección:</strong> Calle Principal 123, Santa Cruz de Tenerife
                </li>
              </ul>
            </div>

            <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-6 rounded-xl border-2 border-purple-200">
              <h4 className="font-bold text-gray-800 mb-4">
                👤 Delegado de Protección de Datos (DPO)
              </h4>
              <ul className="space-y-2 text-sm">
                <li>
                  <strong>Email:</strong> dpo@imprimarte.com
                </li>
                <li>
                  <strong>Horario:</strong> Lunes a Viernes, 9:00 - 18:00
                </li>
                <li>
                  <strong>Respuesta:</strong> Máximo 30 días hábiles
                </li>
              </ul>
            </div>
          </div>

          <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded">
            <p className="text-sm">
              <strong>📋 Autoridad de Control:</strong> Si consideras que no hemos atendido
              correctamente tus derechos, puedes presentar una reclamación ante la Agencia Española
              de Protección de Datos (AEPD):
            </p>
            <ul className="mt-2 space-y-1 text-sm">
              <li>
                Web:{' '}
                <a
                  href="https://www.aepd.es"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-cyan-600 font-bold hover:underline"
                >
                  www.aepd.es
                </a>
              </li>
              <li>
                Sede electrónica:{' '}
                <a
                  href="https://sedeagpd.gob.es"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-cyan-600 font-bold hover:underline"
                >
                  sedeagpd.gob.es
                </a>
              </li>
              <li>Dirección: C/ Jorge Juan, 6, 28001 Madrid</li>
            </ul>
          </div>
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
            <span>🔒</span>
            <span>RGPD Compliant</span>
          </div>

          <h1 className="text-4xl md:text-5xl font-black text-gray-800 mb-4">
            Política de Privacidad
          </h1>

          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Tu privacidad es importante para nosotros. Conoce cómo protegemos y utilizamos tus datos
            personales
          </p>

          <p className="text-sm text-gray-500 mt-4">
            Última actualización: Octubre 2024 | Conforme al RGPD (UE) 2016/679
          </p>
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
          <h2 className="text-3xl font-black text-gray-800 mb-4">¿Dudas sobre tu privacidad?</h2>
          <p className="text-lg text-gray-600 mb-8">
            Estamos comprometidos con la protección de tus datos. Contáctanos para cualquier
            consulta
          </p>

          <div className="flex flex-wrap justify-center gap-4">
            <a
              href="mailto:privacidad@imprimarte.com"
              className="px-8 py-4 bg-gradient-rainbow text-white font-bold rounded-xl shadow-lg hover:shadow-2xl transform hover:scale-105 transition-all duration-300"
            >
              📧 Email Privacidad
            </a>
            <a
              href="/contacto"
              className="px-8 py-4 bg-white text-gray-700 font-bold rounded-xl border-2 border-gray-300 hover:border-cyan-500 transform hover:scale-105 transition-all duration-300"
            >
              💬 Contacto General
            </a>
          </div>
        </div>

        {/* Quick Links */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <a
            href="/terminos-condiciones"
            className="bg-white rounded-2xl p-6 border-2 border-gray-200 hover:border-cyan-500 transition-all duration-300 group"
          >
            <div className="text-4xl mb-3">📜</div>
            <h3 className="font-bold text-lg text-gray-800 mb-2 group-hover:text-cyan-600">
              Términos y Condiciones
            </h3>
            <p className="text-sm text-gray-600">Consulta nuestras condiciones de uso y servicio</p>
          </a>

          <a
            href="/politica-cookies"
            className="bg-white rounded-2xl p-6 border-2 border-gray-200 hover:border-cyan-500 transition-all duration-300 group"
          >
            <div className="text-4xl mb-3">🍪</div>
            <h3 className="font-bold text-lg text-gray-800 mb-2 group-hover:text-cyan-600">
              Política de Cookies
            </h3>
            <p className="text-sm text-gray-600">Información detallada sobre el uso de cookies</p>
          </a>

          <a
            href="/devoluciones"
            className="bg-white rounded-2xl p-6 border-2 border-gray-200 hover:border-cyan-500 transition-all duration-300 group"
          >
            <div className="text-4xl mb-3">↩️</div>
            <h3 className="font-bold text-lg text-gray-800 mb-2 group-hover:text-cyan-600">
              Devoluciones
            </h3>
            <p className="text-sm text-gray-600">Política de cambios y devoluciones</p>
          </a>
        </div>
      </div>
    </div>
  );
}
