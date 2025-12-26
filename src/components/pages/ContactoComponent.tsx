import { useState, useEffect } from 'react';
import {
  getContactInfoWithDefaults,
  getWhatsAppUrl,
  getPhoneUrl,
  getEmailUrl,
  getSocialLinkUrl,
  getShortAddress,
  type ContactInfoInput,
} from '../../lib/contactInfo';

interface FormData {
  nombre: string;
  email: string;
  telefono: string;
  asunto: string;
  mensaje: string;
}

// Default contact info for fallback
const defaultContactCards = [
  {
    icon: '📞',
    title: 'Teléfono',
    content: '+34 645 341 452',
    action: 'tel:+34645341452',
    color: 'from-cyan-500 to-cyan-600',
  },
  {
    icon: '📧',
    title: 'Email',
    content: 'info@imprimarte.com',
    action: 'mailto:info@imprimarte.com',
    color: 'from-magenta-500 to-magenta-600',
  },
  {
    icon: '💬',
    title: 'WhatsApp',
    content: 'Chatea con nosotros',
    action: 'https://wa.me/34645341452',
    color: 'from-green-500 to-green-600',
  },
  {
    icon: '📍',
    title: 'Dirección',
    content: 'Santa Cruz de Tenerife, Canarias',
    action: null,
    color: 'from-purple-500 to-purple-600',
  },
];

const defaultSchedule = [
  { day: 'Lunes - Viernes', hours: '9:00 - 20:00' },
  { day: 'Sábados', hours: '10:00 - 14:00' },
  { day: 'Domingos', hours: 'Cerrado' },
];

export default function ContactoComponent() {
  const [formData, setFormData] = useState<FormData>({
    nombre: '',
    email: '',
    telefono: '',
    asunto: '',
    mensaje: '',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [contactData, setContactData] = useState<ContactInfoInput | null>(null);

  // Load contact info from Firebase
  useEffect(() => {
    async function loadContactInfo() {
      try {
        const info = await getContactInfoWithDefaults();
        setContactData(info);
      } catch (error) {
        console.error('Error loading contact info:', error);
      }
    }
    loadContactInfo();
  }, []);

  // Build dynamic contact cards
  const contactInfo = contactData
    ? [
        {
          icon: '📞',
          title: 'Teléfono',
          content: contactData.phoneDisplay ? `+34 ${contactData.phoneDisplay}` : '+34 645 341 452',
          action: getPhoneUrl(contactData.phone),
          color: 'from-cyan-500 to-cyan-600',
        },
        {
          icon: '📧',
          title: 'Email',
          content: contactData.email,
          action: getEmailUrl(contactData.email),
          color: 'from-magenta-500 to-magenta-600',
        },
        {
          icon: '💬',
          title: 'WhatsApp',
          content: 'Chatea con nosotros',
          action: getWhatsAppUrl(contactData.whatsapp, contactData.whatsappMessage),
          color: 'from-green-500 to-green-600',
        },
        {
          icon: '📍',
          title: 'Dirección',
          content: getShortAddress(contactData),
          action: null,
          color: 'from-purple-500 to-purple-600',
        },
      ]
    : defaultContactCards;

  // Build dynamic schedule
  const schedule =
    contactData?.schedule?.length > 0
      ? contactData.schedule
          .sort((a, b) => a.order - b.order)
          .map((s) => ({ day: s.day, hours: s.hours }))
      : defaultSchedule;

  // Build dynamic social links
  const socialLinks = contactData?.socialLinks
    ? contactData.socialLinks
        .filter((link) => link.active)
        .sort((a, b) => a.order - b.order)
        .map((link) => ({
          icon: link.icon,
          name: link.platform,
          url: getSocialLinkUrl(link, contactData),
          color:
            link.platform === 'Facebook'
              ? 'hover:bg-blue-500'
              : link.platform === 'Instagram'
                ? 'hover:bg-pink-500'
                : link.platform === 'Twitter'
                  ? 'hover:bg-sky-500'
                  : link.platform === 'LinkedIn'
                    ? 'hover:bg-blue-700'
                    : link.platform === 'WhatsApp'
                      ? 'hover:bg-green-500'
                      : link.platform === 'TikTok'
                        ? 'hover:bg-black'
                        : link.platform === 'YouTube'
                          ? 'hover:bg-red-500'
                          : 'hover:bg-gray-500',
        }))
    : [
        { icon: '📘', name: 'Facebook', url: '#', color: 'hover:bg-blue-500' },
        { icon: '📸', name: 'Instagram', url: '#', color: 'hover:bg-pink-500' },
        { icon: '🐦', name: 'Twitter', url: '#', color: 'hover:bg-sky-500' },
        { icon: '💼', name: 'LinkedIn', url: '#', color: 'hover:bg-blue-700' },
      ];

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    // Simular envío - Aquí conectarías con tu backend
    setTimeout(() => {
      setIsSubmitting(false);
      setSubmitStatus('success');
      setFormData({ nombre: '', email: '', telefono: '', asunto: '', mensaje: '' });

      setTimeout(() => setSubmitStatus('idle'), 5000);
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white py-16 mt-32">
      <div className="container mx-auto px-6">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-rainbow text-white font-bold text-sm rounded-full mb-4">
            <span>📧</span>
            <span>Contacto</span>
          </div>

          <h1 className="text-4xl md:text-5xl font-black text-gray-800 mb-4">
            ¿Cómo podemos ayudarte?
          </h1>

          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Estamos aquí para responder todas tus preguntas y ayudarte con tu proyecto
          </p>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 mb-16">
          {/* Contact Form */}
          <div className="bg-white rounded-3xl p-8 border-2 border-gray-200 shadow-lg">
            <h2 className="text-2xl font-black text-gray-800 mb-6">Envíanos un mensaje</h2>

            {submitStatus === 'success' && (
              <div className="mb-6 p-4 bg-green-50 border-2 border-green-500 rounded-xl flex items-center gap-3">
                <span className="text-2xl">✅</span>
                <div>
                  <p className="font-bold text-green-700">¡Mensaje enviado!</p>
                  <p className="text-sm text-green-600">Te responderemos pronto</p>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label
                  className="block text-sm font-bold text-gray-700 mb-2"
                  htmlFor="contact-full-name"
                >
                  Nombre completo *
                </label>
                <input
                  id="contact-full-name"
                  type="text"
                  name="nombre"
                  value={formData.nombre}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-cyan-500 focus:outline-none transition-all"
                  placeholder="Tu nombre"
                />
              </div>

              <div>
                <label
                  className="block text-sm font-bold text-gray-700 mb-2"
                  htmlFor="contact-email"
                >
                  Email *
                </label>
                <input
                  id="contact-email"
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-cyan-500 focus:outline-none transition-all"
                  placeholder="tu@email.com"
                />
              </div>

              <div>
                <label
                  className="block text-sm font-bold text-gray-700 mb-2"
                  htmlFor="contact-phone"
                >
                  Teléfono
                </label>
                <input
                  id="contact-phone"
                  type="tel"
                  name="telefono"
                  value={formData.telefono}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-cyan-500 focus:outline-none transition-all"
                  placeholder="+34 600 000 000"
                />
              </div>

              <div>
                <label
                  className="block text-sm font-bold text-gray-700 mb-2"
                  htmlFor="contact-subject"
                >
                  Asunto *
                </label>
                <select
                  id="contact-subject"
                  name="asunto"
                  value={formData.asunto}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-cyan-500 focus:outline-none transition-all"
                >
                  <option value="">Selecciona un asunto</option>
                  <option value="pedido">Consulta sobre pedido</option>
                  <option value="presupuesto">Solicitar presupuesto</option>
                  <option value="personalizar">Ayuda para personalizar</option>
                  <option value="envio">Información de envío</option>
                  <option value="devolucion">Devolución o cambio</option>
                  <option value="otro">Otro asunto</option>
                </select>
              </div>

              <div>
                <label
                  className="block text-sm font-bold text-gray-700 mb-2"
                  htmlFor="contact-message"
                >
                  Mensaje *
                </label>
                <textarea
                  id="contact-message"
                  name="mensaje"
                  value={formData.mensaje}
                  onChange={handleChange}
                  required
                  rows={5}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-cyan-500 focus:outline-none transition-all resize-none"
                  placeholder="Cuéntanos en qué podemos ayudarte..."
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-4 bg-gradient-rainbow text-white font-bold rounded-xl shadow-lg hover:shadow-2xl transform hover:scale-105 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? '⏳ Enviando...' : '📤 Enviar Mensaje'}
              </button>
            </form>
          </div>

          {/* Contact Info & Schedule */}
          <div className="space-y-8">
            {/* Contact Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {contactInfo.map((info, index) => (
                <a
                  key={index}
                  href={info.action || '#'}
                  target={info.action?.startsWith('http') ? '_blank' : undefined}
                  rel={info.action?.startsWith('http') ? 'noopener noreferrer' : undefined}
                  className={`bg-gradient-to-br ${info.color} p-6 rounded-2xl text-white shadow-lg hover:shadow-2xl transform hover:scale-105 transition-all duration-300 ${!info.action && 'cursor-default'}`}
                >
                  <div className="text-4xl mb-3">{info.icon}</div>
                  <h3 className="font-bold text-lg mb-1">{info.title}</h3>
                  <p className="text-white/90 text-sm">{info.content}</p>
                </a>
              ))}
            </div>

            {/* Schedule */}
            <div className="bg-white rounded-3xl p-8 border-2 border-gray-200 shadow-lg">
              <h3 className="text-2xl font-black text-gray-800 mb-6 flex items-center gap-3">
                <span>🕐</span>
                Horario de Atención
              </h3>
              <div className="space-y-4">
                {schedule.map((item, index) => (
                  <div
                    key={index}
                    className="flex justify-between items-center py-3 border-b border-gray-100 last:border-0"
                  >
                    <span className="font-bold text-gray-700">{item.day}</span>
                    <span className="text-cyan-600 font-bold">{item.hours}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Social Media */}
            <div className="bg-white rounded-3xl p-8 border-2 border-gray-200 shadow-lg">
              <h3 className="text-2xl font-black text-gray-800 mb-6">Síguenos en redes</h3>
              <div className="grid grid-cols-4 gap-3">
                {socialLinks.map((social, index) => (
                  <a
                    key={index}
                    href={social.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`aspect-square flex items-center justify-center text-3xl bg-gray-100 rounded-xl hover:text-white ${social.color} transform hover:scale-110 transition-all duration-300`}
                    title={social.name}
                  >
                    {social.icon}
                  </a>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Map Section */}
        <div className="bg-white rounded-3xl p-8 border-2 border-gray-200 shadow-lg mb-16">
          <h2 className="text-2xl font-black text-gray-800 mb-6 flex items-center gap-3">
            <span>🗺️</span>
            Encuéntranos
          </h2>
          <div
            className="bg-gradient-to-br from-cyan-100 to-purple-100 rounded-2xl overflow-hidden"
            style={{ height: '400px' }}
          >
            <iframe
              src={
                contactData?.googleMapsEmbed ||
                'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d111551.9926778267!2d-16.402524!3d28.463888!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0xc41ccfda44fc0fd%3A0x10340f3be4bc8c0!2sSanta%20Cruz%20de%20Tenerife!5e0!3m2!1ses!2ses!4v1234567890'
              }
              width="100%"
              height="100%"
              style={{ border: 0 }}
              allowFullScreen
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              title="Mapa de ubicación"
            />
          </div>
        </div>

        {/* CTA Section */}
        <div className="bg-gradient-to-r from-cyan-50 via-purple-50 to-pink-50 rounded-3xl p-8 md:p-12 text-center border-2 border-cyan-200 mb-12">
          <h2 className="text-3xl font-black text-gray-800 mb-4">
            ¿Prefieres hablar directamente?
          </h2>
          <p className="text-lg text-gray-600 mb-8">
            Llámanos o escríbenos por WhatsApp para una atención más rápida
          </p>

          <div className="flex flex-wrap justify-center gap-4">
            <a
              href={
                contactData
                  ? getWhatsAppUrl(contactData.whatsapp, contactData.whatsappMessage)
                  : 'https://wa.me/34645341452'
              }
              target="_blank"
              rel="noopener noreferrer"
              className="px-8 py-4 bg-green-500 text-white font-bold rounded-xl shadow-lg hover:shadow-2xl transform hover:scale-105 transition-all duration-300"
            >
              💬 Abrir WhatsApp
            </a>
            <a
              href={contactData ? getPhoneUrl(contactData.phone) : 'tel:+34645341452'}
              className="px-8 py-4 bg-gradient-primary text-white font-bold rounded-xl shadow-lg hover:shadow-2xl transform hover:scale-105 transition-all duration-300"
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
            <p className="text-sm text-gray-600">
              Encuentra respuestas rápidas a las dudas más comunes
            </p>
          </a>

          <a
            href="/como-personalizar"
            className="bg-white rounded-2xl p-6 border-2 border-gray-200 hover:border-cyan-500 transition-all duration-300 group"
          >
            <div className="text-4xl mb-3">🎨</div>
            <h3 className="font-bold text-lg text-gray-800 mb-2 group-hover:text-cyan-600">
              Cómo Personalizar
            </h3>
            <p className="text-sm text-gray-600">
              Aprende a crear tus diseños perfectos paso a paso
            </p>
          </a>

          <a
            href="/sobre-nosotros"
            className="bg-white rounded-2xl p-6 border-2 border-gray-200 hover:border-cyan-500 transition-all duration-300 group"
          >
            <div className="text-4xl mb-3">🏢</div>
            <h3 className="font-bold text-lg text-gray-800 mb-2 group-hover:text-cyan-600">
              Sobre Nosotros
            </h3>
            <p className="text-sm text-gray-600">
              Conoce nuestra historia y compromiso con la calidad
            </p>
          </a>
        </div>
      </div>
    </div>
  );
}
