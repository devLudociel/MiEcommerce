// src/data/landings/index.ts
// Loader de landing pages desde archivos JSON

import type { LandingPageData } from '../../types/landing';

// Importar todos los JSON de landings usando import.meta.glob de Vite
const landingModules = import.meta.glob<LandingPageData>('./*.json', { eager: true });

/** Todas las landings (activas e inactivas) */
export const allLandings: LandingPageData[] = Object.values(landingModules);

/** Solo las landings activas */
export const activeLandings: LandingPageData[] = allLandings.filter((lp) => lp.active);

/** Obtener una landing por slug */
export function getLandingBySlug(slug: string): LandingPageData | undefined {
  return activeLandings.find((lp) => lp.slug === slug);
}

/** Obtener todos los slugs activos (para getStaticPaths) */
export function getActiveSlugs(): string[] {
  return activeLandings.map((lp) => lp.slug);
}
