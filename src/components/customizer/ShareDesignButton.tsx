import React, { useState } from 'react';
import { Share2, X, Copy, Check, MessageCircle, Mail } from 'lucide-react';
import type { ProductCustomization } from '../../types/customization';
import { logger } from '../../lib/logger';
import { notify } from '../../lib/notifications';

interface ShareDesignButtonProps {
  productId: string;
  productName: string;
  designData: ProductCustomization;
  previewImage?: string;
}

export default function ShareDesignButton({
  productId,
  productName,
  designData,
  previewImage,
}: ShareDesignButtonProps) {
  const [showModal, setShowModal] = useState(false);
  const [shareUrl, setShareUrl] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleOpenModal = async () => {
    setShowModal(true);

    // Generate shareable URL
    if (!shareUrl) {
      await generateShareUrl();
    }
  };

  const generateShareUrl = async () => {
    setIsGenerating(true);
    try {
      const response = await fetch('/api/share/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId,
          productName,
          designData,
          previewImage,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const fullUrl = `${window.location.origin}/d/${data.shareId}`;
        setShareUrl(fullUrl);
        logger.info('[ShareDesign] Share URL generated:', fullUrl);
      } else {
        const error = await response.text();
        logger.error('[ShareDesign] Error generating share URL:', error);
        notify.error('Error al generar el enlace');
      }
    } catch (error) {
      logger.error('[ShareDesign] Error:', error);
      notify.error('Error al generar el enlace');
    } finally {
      setIsGenerating(false);
    }
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      notify.success('Enlace copiado al portapapeles');

      setTimeout(() => setCopied(false), 2000);

      // Track copy action
      trackShare('link');
    } catch (error) {
      logger.error('[ShareDesign] Error copying to clipboard:', error);
      notify.error('Error al copiar el enlace');
    }
  };

  const trackShare = async (platform: string) => {
    try {
      const shareId = shareUrl.split('/').pop();
      await fetch('/api/share/track-share', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shareId, platform }),
      });
    } catch (error) {
      logger.warn('[ShareDesign] Failed to track share:', error);
    }
  };

  const shareViaWhatsApp = () => {
    const text = encodeURIComponent(
      `¡Mira mi diseño personalizado de ${productName}! 🎨\n${shareUrl}`
    );
    const whatsappUrl = `https://wa.me/?text=${text}`;
    window.open(whatsappUrl, '_blank');
    trackShare('whatsapp');
  };

  const shareViaFacebook = () => {
    const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`;
    window.open(facebookUrl, '_blank', 'width=600,height=400');
    trackShare('facebook');
  };

  const shareViaTwitter = () => {
    const text = encodeURIComponent(`¡Mira mi diseño personalizado de ${productName}! 🎨`);
    const twitterUrl = `https://twitter.com/intent/tweet?text=${text}&url=${encodeURIComponent(shareUrl)}`;
    window.open(twitterUrl, '_blank', 'width=600,height=400');
    trackShare('twitter');
  };

  const shareViaPinterest = () => {
    const media = previewImage || '';
    const description = encodeURIComponent(`Mi diseño personalizado de ${productName}`);
    const pinterestUrl = `https://www.pinterest.com/pin/create/button/?url=${encodeURIComponent(shareUrl)}&media=${encodeURIComponent(media)}&description=${description}`;
    window.open(pinterestUrl, '_blank', 'width=600,height=400');
    trackShare('pinterest');
  };

  const shareViaEmail = () => {
    const subject = encodeURIComponent(`Mira mi diseño personalizado de ${productName}`);
    const body = encodeURIComponent(
      `¡Hola!\n\nQuería compartir contigo mi diseño personalizado:\n\n${shareUrl}\n\n¡Espero que te guste!`
    );
    const mailtoUrl = `mailto:?subject=${subject}&body=${body}`;
    window.location.href = mailtoUrl;
    trackShare('email');
  };

  return (
    <>
      {/* Share Button */}
      <button
        onClick={handleOpenModal}
        className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-lg hover:shadow-lg transition-all font-medium"
      >
        <Share2 className="w-5 h-5" />
        Compartir Diseño
      </button>

      {/* Share Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full overflow-hidden shadow-2xl">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-500 to-cyan-500 p-6 relative">
              <button
                onClick={() => setShowModal(false)}
                className="absolute top-4 right-4 p-2 hover:bg-white/20 rounded-lg transition-colors"
                aria-label="Cerrar"
              >
                <X className="w-5 h-5 text-white" />
              </button>
              <h3 className="text-2xl font-bold text-white mb-2">Compartir tu Diseño</h3>
              <p className="text-blue-100">Comparte tu creación con amigos y familia</p>
            </div>

            {/* Content */}
            <div className="p-6">
              {/* Share Link */}
              {isGenerating ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2"></div>
                  <p className="text-sm text-gray-600">Generando enlace...</p>
                </div>
              ) : shareUrl ? (
                <>
                  {/* Copy Link Section */}
                  <div className="mb-6">
                    <label
                      className="block text-sm font-medium text-gray-700 mb-2"
                      htmlFor="share-link"
                    >
                      Enlace para compartir
                    </label>
                    <div className="flex gap-2">
                      <input
                        id="share-link"
                        type="text"
                        value={shareUrl}
                        readOnly
                        className="flex-1 px-3 py-2 border rounded-lg text-sm bg-gray-50"
                      />
                      <button
                        onClick={copyToClipboard}
                        className={`px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-2 ${
                          copied
                            ? 'bg-green-500 text-white'
                            : 'bg-blue-500 text-white hover:bg-blue-600'
                        }`}
                      >
                        {copied ? (
                          <>
                            <Check className="w-4 h-4" />
                            Copiado
                          </>
                        ) : (
                          <>
                            <Copy className="w-4 h-4" />
                            Copiar
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Social Media Buttons */}
                  <div className="space-y-3">
                    <p className="text-sm font-medium text-gray-700 mb-3">
                      Compartir en redes sociales
                    </p>

                    {/* WhatsApp */}
                    <button
                      onClick={shareViaWhatsApp}
                      className="w-full flex items-center gap-3 p-3 border rounded-lg hover:bg-green-50 hover:border-green-500 transition-colors group"
                    >
                      <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center">
                        <MessageCircle className="w-5 h-5 text-white" />
                      </div>
                      <div className="flex-1 text-left">
                        <p className="font-medium text-gray-900 group-hover:text-green-600">
                          WhatsApp
                        </p>
                        <p className="text-xs text-gray-500">Comparte vía WhatsApp</p>
                      </div>
                    </button>

                    {/* Facebook */}
                    <button
                      onClick={shareViaFacebook}
                      className="w-full flex items-center gap-3 p-3 border rounded-lg hover:bg-blue-50 hover:border-blue-500 transition-colors group"
                    >
                      <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
                        <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                        </svg>
                      </div>
                      <div className="flex-1 text-left">
                        <p className="font-medium text-gray-900 group-hover:text-blue-600">
                          Facebook
                        </p>
                        <p className="text-xs text-gray-500">Comparte en Facebook</p>
                      </div>
                    </button>

                    {/* Twitter */}
                    <button
                      onClick={shareViaTwitter}
                      className="w-full flex items-center gap-3 p-3 border rounded-lg hover:bg-sky-50 hover:border-sky-500 transition-colors group"
                    >
                      <div className="w-10 h-10 bg-sky-500 rounded-full flex items-center justify-center">
                        <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z" />
                        </svg>
                      </div>
                      <div className="flex-1 text-left">
                        <p className="font-medium text-gray-900 group-hover:text-sky-500">
                          Twitter / X
                        </p>
                        <p className="text-xs text-gray-500">Comparte en Twitter</p>
                      </div>
                    </button>

                    {/* Pinterest */}
                    <button
                      onClick={shareViaPinterest}
                      className="w-full flex items-center gap-3 p-3 border rounded-lg hover:bg-red-50 hover:border-red-500 transition-colors group"
                    >
                      <div className="w-10 h-10 bg-red-600 rounded-full flex items-center justify-center">
                        <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12.017 0C5.396 0 .029 5.367.029 11.987c0 5.079 3.158 9.417 7.618 11.162-.105-.949-.199-2.403.041-3.439.219-.937 1.406-5.957 1.406-5.957s-.359-.72-.359-1.781c0-1.663.967-2.911 2.168-2.911 1.024 0 1.518.769 1.518 1.688 0 1.029-.653 2.567-.992 3.992-.285 1.193.6 2.165 1.775 2.165 2.128 0 3.768-2.245 3.768-5.487 0-2.861-2.063-4.869-5.008-4.869-3.41 0-5.409 2.562-5.409 5.199 0 1.033.394 2.143.889 2.741.099.12.112.225.085.345-.09.375-.293 1.199-.334 1.363-.053.225-.172.271-.401.165-1.495-.69-2.433-2.878-2.433-4.646 0-3.776 2.748-7.252 7.92-7.252 4.158 0 7.392 2.967 7.392 6.923 0 4.135-2.607 7.462-6.233 7.462-1.214 0-2.354-.629-2.758-1.379l-.749 2.848c-.269 1.045-1.004 2.352-1.498 3.146 1.123.345 2.306.535 3.55.535 6.607 0 11.985-5.365 11.985-11.987C23.97 5.39 18.592.026 11.985.026L12.017 0z" />
                        </svg>
                      </div>
                      <div className="flex-1 text-left">
                        <p className="font-medium text-gray-900 group-hover:text-red-600">
                          Pinterest
                        </p>
                        <p className="text-xs text-gray-500">Pinealo en Pinterest</p>
                      </div>
                    </button>

                    {/* Email */}
                    <button
                      onClick={shareViaEmail}
                      className="w-full flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50 hover:border-gray-500 transition-colors group"
                    >
                      <div className="w-10 h-10 bg-gray-600 rounded-full flex items-center justify-center">
                        <Mail className="w-5 h-5 text-white" />
                      </div>
                      <div className="flex-1 text-left">
                        <p className="font-medium text-gray-900 group-hover:text-gray-600">
                          Correo Electrónico
                        </p>
                        <p className="text-xs text-gray-500">Envía por email</p>
                      </div>
                    </button>
                  </div>
                </>
              ) : null}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 bg-gray-50 border-t text-center">
              <p className="text-xs text-gray-500">
                💡 Tus amigos podrán ver tu diseño y crear el suyo propio
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
