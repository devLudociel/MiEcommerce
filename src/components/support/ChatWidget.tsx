// src/components/support/ChatWidget.tsx
// Floating chat widget with multiple contact options

import { useState, useEffect, useRef } from 'react';
import { MessageCircle, X, Send, Phone, Mail, HelpCircle, ChevronRight, Loader2 } from 'lucide-react';
import { db } from '../../lib/firebase';
import { collection, addDoc, Timestamp } from 'firebase/firestore';
import { useAuth } from '../hooks/useAuth';
import { notify } from '../../lib/notifications';

// ============================================================================
// TYPES
// ============================================================================

interface QuickQuestion {
  id: string;
  question: string;
  answer: string;
}

interface ContactFormData {
  name: string;
  email: string;
  subject: string;
  message: string;
}

type WidgetView = 'closed' | 'main' | 'faq' | 'faq-detail' | 'contact';

// ============================================================================
// CONSTANTS
// ============================================================================

const WHATSAPP_NUMBER = '34645341452';
const WHATSAPP_MESSAGE = '¡Hola ImprimeArte! 👋 Tengo una consulta sobre sus servicios de impresión y personalización. ¿Podrían ayudarme?';
const SUPPORT_EMAIL = 'soporte@imprimeartes.com';

const QUICK_QUESTIONS: QuickQuestion[] = [
  {
    id: '1',
    question: '¿Cuánto tarda un pedido?',
    answer: 'Los tiempos de producción varían según el producto. Generalmente: productos estándar 2-3 días laborables, personalizados 3-5 días laborables. El envío añade 1-3 días adicionales según la zona.'
  },
  {
    id: '2',
    question: '¿Cómo puedo personalizar mi producto?',
    answer: 'Selecciona el producto que deseas, haz clic en "Personalizar" y sigue los pasos del configurador. Puedes subir tu imagen, añadir texto y elegir colores. Verás una vista previa antes de añadir al carrito.'
  },
  {
    id: '3',
    question: '¿Cuáles son los métodos de pago?',
    answer: 'Aceptamos tarjetas de crédito/débito (Visa, Mastercard, American Express) a través de Stripe. El pago es 100% seguro y tus datos están protegidos.'
  },
  {
    id: '4',
    question: '¿Puedo devolver un producto personalizado?',
    answer: 'Los productos personalizados no admiten devolución salvo defecto de fabricación. Revisa bien tu diseño antes de confirmar. Si hay un error de producción, te lo reemplazamos sin costo.'
  },
  {
    id: '5',
    question: '¿Hacen envíos internacionales?',
    answer: 'Actualmente enviamos a toda España peninsular y Baleares. Para Canarias, Ceuta, Melilla y otros países, contáctanos directamente para calcular el envío.'
  },
  {
    id: '6',
    question: '¿Cómo puedo seguir mi pedido?',
    answer: 'Una vez enviado tu pedido, recibirás un email con el número de seguimiento. También puedes ver el estado en "Mi cuenta" → "Mis pedidos".'
  },
];

// ============================================================================
// COMPONENT
// ============================================================================

export default function ChatWidget() {
  const [view, setView] = useState<WidgetView>('closed');
  const [selectedFaq, setSelectedFaq] = useState<QuickQuestion | null>(null);
  const [formData, setFormData] = useState<ContactFormData>({
    name: '',
    email: '',
    subject: '',
    message: ''
  });
  const [sending, setSending] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const widgetRef = useRef<HTMLDivElement>(null);

  const { user, email: userEmail, displayName } = useAuth();

  // Pre-fill form with user data
  useEffect(() => {
    if (user) {
      setFormData(prev => ({
        ...prev,
        name: displayName || prev.name,
        email: userEmail || prev.email
      }));
    }
  }, [user, userEmail, displayName]);

  // Show welcome notification after delay (only once per session)
  useEffect(() => {
    const hasShownWelcome = sessionStorage.getItem('chatWidgetWelcome');
    if (!hasShownWelcome) {
      const timer = setTimeout(() => {
        setUnreadCount(1);
        sessionStorage.setItem('chatWidgetWelcome', 'true');
      }, 10000); // Show after 10 seconds
      return () => clearTimeout(timer);
    }
  }, []);

  // Close widget when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (widgetRef.current && !widgetRef.current.contains(e.target as Node)) {
        if (view !== 'closed') {
          setView('closed');
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [view]);

  const handleOpenWidget = () => {
    setView('main');
    setUnreadCount(0);
  };

  const handleWhatsApp = () => {
    const url = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(WHATSAPP_MESSAGE)}`;
    window.open(url, '_blank');
  };

  const handleEmail = () => {
    window.location.href = `mailto:${SUPPORT_EMAIL}?subject=Consulta desde la web`;
  };

  const handleFaqClick = (faq: QuickQuestion) => {
    setSelectedFaq(faq);
    setView('faq-detail');
  };

  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || !formData.email || !formData.message) {
      notify.error('Por favor, completa todos los campos obligatorios');
      return;
    }

    setSending(true);
    try {
      await addDoc(collection(db, 'support_messages'), {
        ...formData,
        userId: user?.uid || null,
        status: 'pending',
        createdAt: Timestamp.now(),
        source: 'chat_widget'
      });

      notify.success('¡Mensaje enviado! Te responderemos pronto.');
      setFormData({ name: '', email: '', subject: '', message: '' });
      setView('main');
    } catch (error) {
      console.error('[ChatWidget] Error sending message:', error);
      notify.error('Error al enviar el mensaje. Intenta de nuevo.');
    } finally {
      setSending(false);
    }
  };

  // Render floating button when closed
  if (view === 'closed') {
    return (
      <button
        onClick={handleOpenWidget}
        className="fixed bottom-24 right-6 z-50 bg-gradient-to-r from-cyan-500 to-blue-600 text-white p-4 rounded-full shadow-lg hover:shadow-xl hover:scale-110 transition-all duration-300 group"
        aria-label="Abrir chat de soporte"
      >
        <MessageCircle className="w-6 h-6" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center animate-pulse">
            {unreadCount}
          </span>
        )}
        <span className="absolute right-full mr-3 top-1/2 -translate-y-1/2 bg-gray-900 text-white text-sm px-3 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
          ¿Necesitas ayuda?
        </span>
      </button>
    );
  }

  return (
    <div
      ref={widgetRef}
      className="fixed bottom-24 right-6 z-50 w-[360px] max-w-[calc(100vw-2rem)] bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden animate-in slide-in-from-bottom-5 duration-300"
    >
      {/* Header */}
      <div className="bg-gradient-to-r from-cyan-500 to-blue-600 text-white p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
              <MessageCircle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold">Soporte ImprimeArte</h3>
              <p className="text-sm text-white/80">
                {view === 'main' && '¿En qué podemos ayudarte?'}
                {view === 'faq' && 'Preguntas frecuentes'}
                {view === 'faq-detail' && 'Respuesta'}
                {view === 'contact' && 'Enviar mensaje'}
              </p>
            </div>
          </div>
          <button
            onClick={() => setView('closed')}
            className="p-1 hover:bg-white/20 rounded-full transition-colors"
            aria-label="Cerrar chat"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 max-h-[400px] overflow-y-auto">
        {/* Main Menu */}
        {view === 'main' && (
          <div className="space-y-3">
            {/* Quick Contact Options */}
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={handleWhatsApp}
                className="flex flex-col items-center gap-2 p-4 bg-green-50 hover:bg-green-100 rounded-xl transition-colors border border-green-200"
              >
                <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center">
                  <Phone className="w-5 h-5 text-white" />
                </div>
                <span className="text-sm font-medium text-green-700">WhatsApp</span>
                <span className="text-xs text-green-600">Respuesta rápida</span>
              </button>

              <button
                onClick={() => setView('contact')}
                className="flex flex-col items-center gap-2 p-4 bg-blue-50 hover:bg-blue-100 rounded-xl transition-colors border border-blue-200"
              >
                <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
                  <Mail className="w-5 h-5 text-white" />
                </div>
                <span className="text-sm font-medium text-blue-700">Formulario</span>
                <span className="text-xs text-blue-600">Te respondemos</span>
              </button>
            </div>

            {/* FAQ Section */}
            <div className="mt-4">
              <button
                onClick={() => setView('faq')}
                className="w-full flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 rounded-xl transition-colors"
              >
                <div className="flex items-center gap-3">
                  <HelpCircle className="w-5 h-5 text-gray-600" />
                  <span className="font-medium text-gray-700">Preguntas frecuentes</span>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            {/* Quick FAQ Preview */}
            <div className="space-y-2 mt-2">
              <p className="text-xs text-gray-500 uppercase tracking-wide">Preguntas populares</p>
              {QUICK_QUESTIONS.slice(0, 3).map((faq) => (
                <button
                  key={faq.id}
                  onClick={() => handleFaqClick(faq)}
                  className="w-full text-left p-3 bg-gray-50 hover:bg-cyan-50 rounded-lg transition-colors text-sm text-gray-700 hover:text-cyan-700"
                >
                  {faq.question}
                </button>
              ))}
            </div>

            {/* Email Link */}
            <button
              onClick={handleEmail}
              className="w-full text-center text-sm text-gray-500 hover:text-cyan-600 mt-2"
            >
              O escríbenos a {SUPPORT_EMAIL}
            </button>
          </div>
        )}

        {/* FAQ List */}
        {view === 'faq' && (
          <div className="space-y-2">
            <button
              onClick={() => setView('main')}
              className="flex items-center gap-2 text-sm text-gray-500 hover:text-cyan-600 mb-3"
            >
              ← Volver
            </button>
            {QUICK_QUESTIONS.map((faq) => (
              <button
                key={faq.id}
                onClick={() => handleFaqClick(faq)}
                className="w-full flex items-center justify-between p-3 bg-gray-50 hover:bg-cyan-50 rounded-lg transition-colors text-left"
              >
                <span className="text-sm text-gray-700">{faq.question}</span>
                <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
              </button>
            ))}
          </div>
        )}

        {/* FAQ Detail */}
        {view === 'faq-detail' && selectedFaq && (
          <div>
            <button
              onClick={() => setView('faq')}
              className="flex items-center gap-2 text-sm text-gray-500 hover:text-cyan-600 mb-3"
            >
              ← Volver a preguntas
            </button>
            <div className="bg-cyan-50 rounded-xl p-4">
              <h4 className="font-medium text-gray-800 mb-2">{selectedFaq.question}</h4>
              <p className="text-sm text-gray-600 leading-relaxed">{selectedFaq.answer}</p>
            </div>
            <div className="mt-4 p-3 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600 mb-2">¿No resolvió tu duda?</p>
              <div className="flex gap-2">
                <button
                  onClick={handleWhatsApp}
                  className="flex-1 py-2 bg-green-500 text-white text-sm rounded-lg hover:bg-green-600 transition-colors"
                >
                  WhatsApp
                </button>
                <button
                  onClick={() => setView('contact')}
                  className="flex-1 py-2 bg-cyan-500 text-white text-sm rounded-lg hover:bg-cyan-600 transition-colors"
                >
                  Contactar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Contact Form */}
        {view === 'contact' && (
          <div>
            <button
              onClick={() => setView('main')}
              className="flex items-center gap-2 text-sm text-gray-500 hover:text-cyan-600 mb-3"
            >
              ← Volver
            </button>
            <form onSubmit={handleContactSubmit} className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nombre *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 text-sm"
                  placeholder="Tu nombre"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email *
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 text-sm"
                  placeholder="tu@email.com"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Asunto
                </label>
                <input
                  type="text"
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 text-sm"
                  placeholder="¿Sobre qué es tu consulta?"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Mensaje *
                </label>
                <textarea
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 text-sm resize-none"
                  placeholder="Escribe tu mensaje aquí..."
                  required
                />
              </div>
              <button
                type="submit"
                disabled={sending}
                className="w-full py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-medium rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {sending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    Enviar mensaje
                  </>
                )}
              </button>
            </form>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-2 bg-gray-50 border-t border-gray-100 text-center">
        <p className="text-xs text-gray-500">
          Horario de atención: Lun-Vie 9:00-18:00
        </p>
      </div>
    </div>
  );
}
