import React from 'react';
import { AlertTriangle, CheckCircle, Info, XCircle, AlertCircle } from 'lucide-react';
import type { ImageQualityResult } from '../../lib/validation/imageQualityValidator';

interface ImageQualityBadgeProps {
  quality: ImageQualityResult;
  showDetails?: boolean;
  compact?: boolean;
}

/**
 * Badge que muestra la calidad de una imagen de manera visual
 * Usado en el customizer para alertar al usuario sobre problemas de calidad
 */
export default function ImageQualityBadge({
  quality,
  showDetails = false,
  compact = false,
}: ImageQualityBadgeProps) {
  // Configuración por nivel de calidad
  const qualityConfig = {
    excellent: {
      icon: CheckCircle,
      bgColor: 'bg-green-50',
      borderColor: 'border-green-300',
      textColor: 'text-green-800',
      iconColor: 'text-green-600',
      label: 'Excelente',
      emoji: '✨',
    },
    good: {
      icon: CheckCircle,
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-300',
      textColor: 'text-blue-800',
      iconColor: 'text-blue-600',
      label: 'Buena',
      emoji: '👍',
    },
    acceptable: {
      icon: Info,
      bgColor: 'bg-yellow-50',
      borderColor: 'border-yellow-300',
      textColor: 'text-yellow-800',
      iconColor: 'text-yellow-600',
      label: 'Aceptable',
      emoji: '⚠️',
    },
    poor: {
      icon: AlertTriangle,
      bgColor: 'bg-orange-50',
      borderColor: 'border-orange-300',
      textColor: 'text-orange-800',
      iconColor: 'text-orange-600',
      label: 'Baja',
      emoji: '⚠️',
    },
    unacceptable: {
      icon: XCircle,
      bgColor: 'bg-red-50',
      borderColor: 'border-red-300',
      textColor: 'text-red-800',
      iconColor: 'text-red-600',
      label: 'Muy Baja',
      emoji: '❌',
    },
  };

  const config = qualityConfig[quality.quality];
  const Icon = config.icon;

  // Modo compacto: solo badge pequeño
  if (compact) {
    return (
      <div
        className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg border ${config.bgColor} ${config.borderColor} ${config.textColor}`}
      >
        <Icon className={`w-3 h-3 ${config.iconColor}`} />
        <span className="text-xs font-bold">{config.label}</span>
      </div>
    );
  }

  return (
    <div className={`p-3 rounded-lg border-2 ${config.bgColor} ${config.borderColor}`}>
      {/* Header */}
      <div className="flex items-start gap-2 mb-2">
        <Icon className={`w-5 h-5 ${config.iconColor} flex-shrink-0 mt-0.5`} />
        <div className="flex-1">
          <h4 className={`font-bold text-sm ${config.textColor}`}>
            {config.emoji} Calidad: {config.label}
          </h4>
          {showDetails && (
            <div className={`text-xs mt-1 space-y-0.5 ${config.textColor} opacity-90`}>
              <p>
                • Resolución: {quality.metrics.width} x {quality.metrics.height}px
              </p>
              <p>• DPI estimado: {quality.metrics.dpi}</p>
              <p>• Megapíxeles: {quality.metrics.megapixels.toFixed(1)} MP</p>
              {quality.metrics.fileSize > 0 && (
                <p>• Tamaño: {quality.metrics.fileSize.toFixed(1)} MB</p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Errors */}
      {quality.errors.length > 0 && (
        <div className="mb-2">
          <ul className="space-y-1">
            {quality.errors.map((error, idx) => (
              <li key={idx} className="flex items-start gap-1.5 text-xs text-red-700">
                <AlertCircle className="w-3 h-3 flex-shrink-0 mt-0.5" />
                <span>{error}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Warnings */}
      {quality.warnings.length > 0 && (
        <div className="mb-2">
          <ul className="space-y-1">
            {quality.warnings.map((warning, idx) => (
              <li key={idx} className="flex items-start gap-1.5 text-xs text-orange-700">
                <AlertTriangle className="w-3 h-3 flex-shrink-0 mt-0.5" />
                <span>{warning}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Recommendations */}
      {quality.recommendations.length > 0 && showDetails && (
        <div className="pt-2 border-t border-current/20">
          <ul className="space-y-1">
            {quality.recommendations.map((rec, idx) => (
              <li
                key={idx}
                className={`flex items-start gap-1.5 text-xs ${config.textColor} opacity-80`}
              >
                <Info className="w-3 h-3 flex-shrink-0 mt-0.5" />
                <span>{rec}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
