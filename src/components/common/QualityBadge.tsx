/**
 * Badge de calidad de impresión
 * Muestra visualmente la calidad esperada del diseño impreso
 */

import React from 'react';
import { AlertTriangle, CheckCircle, AlertCircle } from 'lucide-react';

export interface QualityBadgeProps {
  quality: 'low' | 'medium' | 'high';
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
  showDPI?: boolean;
  dpi?: number;
  className?: string;
}

const qualityConfig = {
  high: {
    color: 'bg-green-100 text-green-800 border-green-300',
    label: 'Excelente',
    icon: CheckCircle,
    iconColor: 'text-green-600',
    description: 'Tu diseño se imprimirá con máxima calidad',
  },
  medium: {
    color: 'bg-yellow-100 text-yellow-800 border-yellow-300',
    label: 'Aceptable',
    icon: AlertCircle,
    iconColor: 'text-yellow-600',
    description: 'Calidad adecuada para la mayoría de usos',
  },
  low: {
    color: 'bg-red-100 text-red-800 border-red-300',
    label: 'Baja calidad',
    icon: AlertTriangle,
    iconColor: 'text-red-600',
    description: 'Puede verse pixelada. Usa una imagen de mayor resolución',
  },
};

const sizeConfig = {
  sm: {
    padding: 'px-2 py-1',
    text: 'text-xs',
    icon: 'w-3 h-3',
  },
  md: {
    padding: 'px-3 py-1.5',
    text: 'text-sm',
    icon: 'w-4 h-4',
  },
  lg: {
    padding: 'px-4 py-2',
    text: 'text-base',
    icon: 'w-5 h-5',
  },
};

export function QualityBadge({
  quality,
  size = 'md',
  showIcon = true,
  showDPI = false,
  dpi,
  className = '',
}: QualityBadgeProps) {
  const config = qualityConfig[quality];
  const sizeStyle = sizeConfig[size];
  const Icon = config.icon;

  return (
    <div
      className={`
        inline-flex items-center gap-2
        ${sizeStyle.padding} ${sizeStyle.text}
        rounded-full border font-medium
        ${config.color}
        ${className}
      `}
      role="status"
      aria-label={`Calidad de impresión: ${config.label}`}
    >
      {showIcon && (
        <Icon
          className={`${sizeStyle.icon} ${config.iconColor} flex-shrink-0`}
          aria-hidden="true"
        />
      )}
      <span>
        Calidad: <strong>{config.label}</strong>
      </span>
      {showDPI && dpi && <span className="ml-1 opacity-75">({dpi} DPI)</span>}
    </div>
  );
}

/**
 * Badge expandible con descripción completa
 */
export function QualityBadgeDetailed({
  quality,
  dpi,
  message,
  recommendation,
  className = '',
}: {
  quality: 'low' | 'medium' | 'high';
  dpi?: number;
  message: string;
  recommendation?: string;
  className?: string;
}) {
  const config = qualityConfig[quality];
  const Icon = config.icon;

  return (
    <div
      className={`
        ${config.color}
        border rounded-lg p-4
        ${className}
      `}
      role="alert"
      aria-live="polite"
    >
      <div className="flex items-start gap-3">
        <Icon className={`w-5 h-5 ${config.iconColor} flex-shrink-0 mt-0.5`} aria-hidden="true" />
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-semibold">Calidad de impresión: {config.label}</span>
            {dpi && <span className="text-xs opacity-75">({dpi} DPI)</span>}
          </div>
          <p className="text-sm mb-1">{message}</p>
          {recommendation && <p className="text-sm font-medium mt-2">💡 {recommendation}</p>}
        </div>
      </div>
    </div>
  );
}

/**
 * Badge simple solo con icono (para espacios reducidos)
 */
export function QualityIcon({
  quality,
  size = 'md',
  className = '',
}: {
  quality: 'low' | 'medium' | 'high';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}) {
  const config = qualityConfig[quality];
  const sizeStyle = sizeConfig[size];
  const Icon = config.icon;

  return (
    <div
      className={`
        inline-flex items-center justify-center
        w-8 h-8 rounded-full
        ${config.color}
        ${className}
      `}
      title={`Calidad: ${config.label} - ${config.description}`}
      role="img"
      aria-label={`Calidad de impresión: ${config.label}`}
    >
      <Icon className={`${sizeStyle.icon} ${config.iconColor}`} aria-hidden="true" />
    </div>
  );
}
