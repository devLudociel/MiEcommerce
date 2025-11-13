// Lightweight helpers for address auto-fill in ES
// - ZIP -> city/province via Zippopotam.us (no API key)
// - Optional street autocomplete via Geoapify if `VITE_GEOAPIFY_API_KEY` is set

import { debounce } from '../lib/utils/debounce';

// Re-export debounce for backward compatibility
export { debounce };

export type ZipLookup = {
  province: string | null;
  cities: string[];
};

export async function lookupZipES(zip: string): Promise<ZipLookup | null> {
  const clean = (zip || '').trim();
  if (!/^\d{5}$/.test(clean)) return null;
  try {
    const res = await fetch(`https://api.zippopotam.us/es/${clean}`);
    if (!res.ok) return null;
    const data = await res.json();
    const province: string | null = data?.state ?? null;
    const citiesSet = new Set<string>();
    if (Array.isArray(data?.places)) {
      for (const p of data.places) {
        const name = (p['place name'] || p?.place || '').toString();
        if (name) citiesSet.add(name);
      }
    }
    return { province, cities: Array.from(citiesSet) };
  } catch {
    return null;
  }
}

export type AddressSuggestion = {
  label: string;
  street?: string;
  houseNumber?: string;
  postcode?: string;
  city?: string;
  province?: string;
  country?: string;
};

export async function autocompleteStreetES(
  query: string,
  opts?: { postcode?: string; city?: string }
): Promise<AddressSuggestion[]> {
  const q = (query || '').trim();
  if (q.length < 3) return [];
  const apiKey =
    (import.meta as any)?.env?.VITE_GEOAPIFY_API_KEY ||
    (import.meta as any)?.env?.PUBLIC_GEOAPIFY_KEY;
  if (!apiKey) return [];
  const parts = [q];
  if (opts?.postcode) parts.push(opts.postcode);
  if (opts?.city) parts.push(opts.city);
  const text = parts.join(', ');
  const url = new URL('https://api.geoapify.com/v1/geocode/autocomplete');
  url.searchParams.set('text', text);
  url.searchParams.set('filter', 'countrycode:es');
  url.searchParams.set('limit', '5');
  url.searchParams.set('apiKey', apiKey);
  try {
    const res = await fetch(url.toString());
    if (!res.ok) return [];
    const data = await res.json();
    const feats = Array.isArray(data?.features) ? data.features : [];
    return feats.map((f: any) => {
      const p = f?.properties || {};
      const label: string = p.formatted || p.address_line1 || p.name || '';
      return {
        label,
        street: p.street || p.road,
        houseNumber: p.housenumber,
        postcode: p.postcode,
        city: p.city || p.municipality || p.town || p.village,
        province: p.state || p.region,
        country: p.country,
      } as AddressSuggestion;
    });
  } catch {
    return [];
  }
}
