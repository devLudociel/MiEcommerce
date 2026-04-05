export const FALLBACK_IMG_400x300 =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(`
  <svg xmlns="http://www.w3.org/2000/svg" width="400" height="300">
    <rect width="100%" height="100%" fill="#cccccc" />
    <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle"
      fill="#666666" font-family="sans-serif" font-size="24">Sin Imagen</text>
  </svg>
`);

/**
 * Sanitiza una URL de imagen: si es una ruta a un placeholder inexistente
 * o está vacía, devuelve el data URI de fallback en lugar de provocar
 * una request HTTP que falla con 302 → 404.
 */
export function safeImageSrc(url: string | undefined | null): string {
  if (!url) return FALLBACK_IMG_400x300;
  const normalized = url.trim().toLowerCase();
  if (!normalized) return FALLBACK_IMG_400x300;

  const isKnownMissingPlaceholder =
    /(^|\/)placeholder-product\.jpg(?:[?#].*)?$/.test(normalized) ||
    /(^|\/)placeholder\.jpg(?:[?#].*)?$/.test(normalized);

  if (isKnownMissingPlaceholder) {
    return FALLBACK_IMG_400x300;
  }
  return url;
}
