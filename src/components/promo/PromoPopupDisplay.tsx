// src/components/promo/PromoPopupDisplay.tsx
// Componente para mostrar popups promocionales

import React, { useState, useEffect, useCallback } from 'react';
import { X, Gift, Sparkles, Truck, Tag } from 'lucide-react';
import {
  type PromoPopup,
  getActivePopups,
  shouldShowPopup,
  setPopupDismissed,
  setPopupLastShown,
  incrementPopupStat,
} from '../../lib/promoPopups';
import { useAuth } from '../hooks/useAuth';

export default function PromoPopupDisplay() {
  const { user, loading: authLoading } = useAuth();
  const [activePopup, setActivePopup] = useState<PromoPopup | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [popups, setPopups] = useState<PromoPopup[]>([]);
  const [currentPath, setCurrentPath] = useState('/');

  // Get current path
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setCurrentPath(window.location.pathname);
    }
  }, []);

  // Load active popups
  useEffect(() => {
    const loadPopups = async () => {
      const loaded = await getActivePopups();
      setPopups(loaded);
    };
    loadPopups();
  }, []);

  // Find and show appropriate popup
  useEffect(() => {
    if (authLoading || popups.length === 0) return;

    const isLoggedIn = !!user;

    // Find the first popup that should be shown
    for (const popup of popups) {
      if (shouldShowPopup(popup, currentPath, isLoggedIn)) {
        // Handle different triggers
        if (popup.trigger === 'immediate') {
          showPopup(popup);
          break;
        } else if (popup.trigger === 'delay' && popup.triggerDelay) {
          const timer = setTimeout(() => {
            showPopup(popup);
          }, popup.triggerDelay * 1000);
          return () => clearTimeout(timer);
        } else if (popup.trigger === 'scroll' && popup.triggerScrollPercent) {
          const handleScroll = () => {
            const scrollPercent = (window.scrollY / (document.body.scrollHeight - window.innerHeight)) * 100;
            if (scrollPercent >= (popup.triggerScrollPercent || 50)) {
              showPopup(popup);
              window.removeEventListener('scroll', handleScroll);
            }
          };
          window.addEventListener('scroll', handleScroll);
          return () => window.removeEventListener('scroll', handleScroll);
        } else if (popup.trigger === 'exit-intent') {
          const handleMouseLeave = (e: MouseEvent) => {
            if (e.clientY <= 0) {
              showPopup(popup);
              document.removeEventListener('mouseleave', handleMouseLeave);
            }
          };
          document.addEventListener('mouseleave', handleMouseLeave);
          return () => document.removeEventListener('mouseleave', handleMouseLeave);
        }
      }
    }
  }, [authLoading, user, popups, currentPath]);

  const showPopup = useCallback((popup: PromoPopup) => {
    setActivePopup(popup);
    setIsVisible(true);
    setPopupLastShown(popup.id);
    incrementPopupStat(popup.id, 'impressions');
  }, []);

  const handleDismiss = useCallback(() => {
    if (activePopup) {
      setPopupDismissed(activePopup.id);
      incrementPopupStat(activePopup.id, 'dismissals');
    }
    setIsVisible(false);
    setTimeout(() => setActivePopup(null), 300);
  }, [activePopup]);

  const handleButtonClick = useCallback((url?: string) => {
    if (activePopup) {
      incrementPopupStat(activePopup.id, 'clicks');
    }
    if (url) {
      window.location.href = url;
    }
    handleDismiss();
  }, [activePopup, handleDismiss]);

  if (!activePopup) return null;

  // Render based on popup type
  if (activePopup.type === 'banner') {
    return (
      <BannerPopup
        popup={activePopup}
        isVisible={isVisible}
        onDismiss={handleDismiss}
        onButtonClick={handleButtonClick}
      />
    );
  }

  if (activePopup.type === 'slide-in') {
    return (
      <SlideInPopup
        popup={activePopup}
        isVisible={isVisible}
        onDismiss={handleDismiss}
        onButtonClick={handleButtonClick}
      />
    );
  }

  // Default: modal
  return (
    <ModalPopup
      popup={activePopup}
      isVisible={isVisible}
      onDismiss={handleDismiss}
      onButtonClick={handleButtonClick}
    />
  );
}

// ============================================================================
// POPUP COMPONENTS
// ============================================================================

interface PopupProps {
  popup: PromoPopup;
  isVisible: boolean;
  onDismiss: () => void;
  onButtonClick: (url?: string) => void;
}

function ModalPopup({ popup, isVisible, onDismiss, onButtonClick }: PopupProps) {
  const bgColor = popup.backgroundColor || '#ffffff';
  const textColor = popup.textColor || '#1f2937';
  const accentColor = popup.accentColor || '#0891b2';

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-black/50 z-50 transition-opacity duration-300 ${
          isVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onDismiss}
      />

      {/* Modal */}
      <div
        className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-all duration-300 ${
          isVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-95 pointer-events-none'
        }`}
      >
        <div
          className="relative max-w-md w-full rounded-2xl shadow-2xl overflow-hidden"
          style={{ backgroundColor: bgColor }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Close button */}
          <button
            onClick={onDismiss}
            className="absolute top-3 right-3 p-2 rounded-full hover:bg-black/10 transition-colors z-10"
            aria-label="Cerrar"
          >
            <X className="w-5 h-5" style={{ color: textColor }} />
          </button>

          {/* Image */}
          {popup.imageUrl && (
            <div className="w-full h-48 overflow-hidden">
              <img
                src={popup.imageUrl}
                alt={popup.title}
                className="w-full h-full object-cover"
              />
            </div>
          )}

          {/* Content */}
          <div className="p-6 text-center">
            {/* Icon */}
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
              style={{ backgroundColor: `${accentColor}20` }}
            >
              <Sparkles className="w-8 h-8" style={{ color: accentColor }} />
            </div>

            <h3 className="text-2xl font-bold mb-2" style={{ color: textColor }}>
              {popup.title}
            </h3>
            <p className="text-base mb-6 opacity-80" style={{ color: textColor }}>
              {popup.message}
            </p>

            {/* Buttons */}
            <div className="space-y-3">
              {popup.buttonText && (
                <button
                  onClick={() => onButtonClick(popup.buttonUrl)}
                  className="w-full py-3 px-6 rounded-lg font-semibold text-white transition-transform hover:scale-105"
                  style={{ backgroundColor: accentColor }}
                >
                  {popup.buttonText}
                </button>
              )}
              {popup.secondaryButtonText && (
                <button
                  onClick={() => onButtonClick(popup.secondaryButtonUrl)}
                  className="w-full py-3 px-6 rounded-lg font-semibold transition-colors hover:bg-black/5"
                  style={{ color: textColor }}
                >
                  {popup.secondaryButtonText}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function BannerPopup({ popup, isVisible, onDismiss, onButtonClick }: PopupProps) {
  const bgColor = popup.backgroundColor || '#0891b2';
  const textColor = popup.textColor || '#ffffff';
  const position = popup.position === 'bottom' ? 'bottom-0' : 'top-0';

  return (
    <div
      className={`fixed left-0 right-0 z-50 transition-transform duration-300 ${position} ${
        isVisible
          ? 'translate-y-0'
          : popup.position === 'bottom'
          ? 'translate-y-full'
          : '-translate-y-full'
      }`}
      style={{ backgroundColor: bgColor }}
    >
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 flex-1">
            <Gift className="w-5 h-5 flex-shrink-0" style={{ color: textColor }} />
            <div className="flex-1">
              <span className="font-semibold" style={{ color: textColor }}>
                {popup.title}
              </span>
              <span className="ml-2 opacity-90" style={{ color: textColor }}>
                {popup.message}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {popup.buttonText && (
              <button
                onClick={() => onButtonClick(popup.buttonUrl)}
                className="px-4 py-1.5 rounded-full font-semibold text-sm transition-transform hover:scale-105"
                style={{
                  backgroundColor: textColor,
                  color: bgColor,
                }}
              >
                {popup.buttonText}
              </button>
            )}
            <button
              onClick={onDismiss}
              className="p-1 rounded-full hover:bg-white/20 transition-colors"
              aria-label="Cerrar"
            >
              <X className="w-5 h-5" style={{ color: textColor }} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function SlideInPopup({ popup, isVisible, onDismiss, onButtonClick }: PopupProps) {
  const bgColor = popup.backgroundColor || '#ffffff';
  const textColor = popup.textColor || '#1f2937';
  const accentColor = popup.accentColor || '#0891b2';

  const positionClasses = {
    'bottom-right': 'bottom-4 right-4',
    'bottom-left': 'bottom-4 left-4',
    center: 'bottom-4 right-4',
    top: 'top-4 right-4',
    bottom: 'bottom-4 right-4',
  };

  const slideClasses = {
    'bottom-right': isVisible ? 'translate-x-0' : 'translate-x-full',
    'bottom-left': isVisible ? 'translate-x-0' : '-translate-x-full',
    center: isVisible ? 'translate-x-0' : 'translate-x-full',
    top: isVisible ? 'translate-y-0' : '-translate-y-full',
    bottom: isVisible ? 'translate-y-0' : 'translate-y-full',
  };

  return (
    <div
      className={`fixed z-50 transition-transform duration-300 ${positionClasses[popup.position]} ${slideClasses[popup.position]}`}
    >
      <div
        className="w-80 rounded-xl shadow-2xl overflow-hidden border border-gray-200"
        style={{ backgroundColor: bgColor }}
      >
        {/* Close button */}
        <button
          onClick={onDismiss}
          className="absolute top-2 right-2 p-1.5 rounded-full hover:bg-black/10 transition-colors z-10"
          aria-label="Cerrar"
        >
          <X className="w-4 h-4" style={{ color: textColor }} />
        </button>

        {/* Image */}
        {popup.imageUrl && (
          <div className="w-full h-32 overflow-hidden">
            <img
              src={popup.imageUrl}
              alt={popup.title}
              className="w-full h-full object-cover"
            />
          </div>
        )}

        {/* Content */}
        <div className="p-4">
          <div className="flex items-start gap-3">
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: `${accentColor}20` }}
            >
              <Tag className="w-5 h-5" style={{ color: accentColor }} />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="font-bold text-sm mb-1" style={{ color: textColor }}>
                {popup.title}
              </h4>
              <p className="text-xs opacity-75 mb-3" style={{ color: textColor }}>
                {popup.message}
              </p>

              {popup.buttonText && (
                <button
                  onClick={() => onButtonClick(popup.buttonUrl)}
                  className="w-full py-2 px-4 rounded-lg font-semibold text-sm text-white transition-transform hover:scale-105"
                  style={{ backgroundColor: accentColor }}
                >
                  {popup.buttonText}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
