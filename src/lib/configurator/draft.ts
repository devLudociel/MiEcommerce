// src/lib/configurator/draft.ts
/**
 * Persistencia local del borrador del configurador.
 *
 * Guarda las selecciones del usuario en localStorage para que, si abandona
 * el configurador (navegación, refresco, cierre), pueda retomar donde iba.
 * Los objetos File no son serializables: un borrador restaurado nunca
 * incluye el archivo de diseño subido.
 */

import type { DesignMode } from '../../types/configurator';

export interface ConfiguratorDraft {
  v: 1;
  savedAt: number;
  currentStep: number;
  options: Record<string, string>;
  designMode: DesignMode;
  designNotes?: string;
  placement?: string;
  placementSize?: string;
  quantity: number;
  sizeQuantities: Record<string, number>;
}

const DRAFT_PREFIX = 'imprimearte:configurator-draft:';
/** Borradores con más de 7 días se descartan */
const DRAFT_TTL_MS = 7 * 24 * 60 * 60 * 1000;

const draftKey = (productId: string) => `${DRAFT_PREFIX}${productId}`;

export function saveConfiguratorDraft(
  productId: string,
  draft: Omit<ConfiguratorDraft, 'v' | 'savedAt'>
): void {
  if (typeof window === 'undefined') return;
  try {
    const payload: ConfiguratorDraft = { v: 1, savedAt: Date.now(), ...draft };
    localStorage.setItem(draftKey(productId), JSON.stringify(payload));
  } catch {
    // Storage lleno o bloqueado — el borrador es un extra, nunca debe romper el flujo
  }
}

export function loadConfiguratorDraft(productId: string): ConfiguratorDraft | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(draftKey(productId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ConfiguratorDraft;
    if (parsed?.v !== 1 || typeof parsed.savedAt !== 'number') return null;
    if (Date.now() - parsed.savedAt > DRAFT_TTL_MS) {
      clearConfiguratorDraft(productId);
      return null;
    }
    if (typeof parsed.options !== 'object' || parsed.options === null) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function clearConfiguratorDraft(productId: string): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(draftKey(productId));
  } catch {
    // ignorar
  }
}
