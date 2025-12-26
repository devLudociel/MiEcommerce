import { useEffect, useState } from 'react';
import { db } from '../../lib/firebase';
import { FALLBACK_IMG_400x300 } from '../../lib/placeholders';
import {
  collection,
  getDocs,
  query as fsQuery,
  where,
  orderBy,
  startAt,
  endAt,
  limit as fsLimit,
} from 'firebase/firestore';

export interface SearchResult {
  id: string;
  slug?: string;
  name: string;
  description: string;
  price: number;
  image: string;
  category: string;
  [key: string]: any;
}

export interface UseSearchReturn {
  searchQuery: string;
  searchResults: SearchResult[];
  isLoading: boolean;
  error: string | null;
  isSearchFocused: boolean;
  handleInputChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  handleInputFocus: () => void;
  handleSearchSubmit: (event: React.KeyboardEvent<HTMLInputElement>) => void;
  handleResultClick: (result: SearchResult) => void;
  clearSearch: () => void;
}

export const useSearch = (): UseSearchReturn => {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isSearchFocused, setIsSearchFocused] = useState<boolean>(false);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      setError(null);
      return;
    }

    const timeoutId = setTimeout(() => {
      performSearch(searchQuery);
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  /**
   * Normaliza texto para búsqueda: elimina tildes, convierte a minúsculas
   * Ejemplo: "Camión" → "camion", "Ñandú" → "ñandu"
   */
  const normalizeText = (text: string): string => {
    return text
      .toLowerCase()
      .normalize('NFD') // Descompone caracteres acentuados
      .replace(/[\u0300-\u036f]/g, ''); // Elimina marcas diacríticas (tildes)
  };

  /**
   * Verifica si el texto contiene todas las palabras de búsqueda
   * Ejemplo: searchText="figura hello" matchea "Figura resina de Hello Kitty"
   */
  const matchesSearchTerms = (text: string, searchTerms: string[]): boolean => {
    const normalizedText = normalizeText(text);
    // Todas las palabras de búsqueda deben aparecer en el texto
    return searchTerms.every((term) => normalizedText.includes(term));
  };

  const performSearch = async (q: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const coll = collection(db, 'products');

      // Siempre usar fallback: traer más productos y filtrar en cliente
      // Esto permite búsqueda flexible sin necesidad de índices complejos
      const q2 = fsQuery(coll, where('active', '==', true), fsLimit(50));
      const snap = await getDocs(q2);

      // Normalizar términos de búsqueda y dividir en palabras
      const searchTerms = normalizeText(q.trim())
        .split(/\s+/) // Dividir por espacios
        .filter((term) => term.length > 0); // Eliminar términos vacíos

      const res: SearchResult[] = [];
      snap.forEach((doc) => {
        const data: any = doc.data();
        const name: string = data?.name || '';
        const desc: string = data?.description || '';
        const tags: string[] = data?.tags || [];
        const category: string = data?.category || '';

        // Buscar en múltiples campos
        const searchableText = `${name} ${desc} ${tags.join(' ')} ${category}`;

        // El producto matchea si contiene TODAS las palabras de búsqueda
        const matches = searchTerms.length === 0 || matchesSearchTerms(searchableText, searchTerms);

        if (matches) {
          res.push({
            id: doc.id,
            slug: data?.slug,
            name,
            description: desc,
            price: data?.basePrice ?? 0,
            image: (data?.images && data.images[0]) || FALLBACK_IMG_400x300,
            category: category,
          });
        }
      });

      // Ordenar por relevancia: productos cuyo nombre comienza con el término primero
      const firstTerm = searchTerms[0] || '';
      res.sort((a, b) => {
        const aNameNorm = normalizeText(a.name);
        const bNameNorm = normalizeText(b.name);
        const aStartsWith = aNameNorm.startsWith(firstTerm);
        const bStartsWith = bNameNorm.startsWith(firstTerm);

        if (aStartsWith && !bStartsWith) return -1;
        if (!aStartsWith && bStartsWith) return 1;
        return 0; // Mantener orden original
      });

      setSearchResults(res.slice(0, 8));
    } catch (err) {
      setError('Error al buscar productos');
      setSearchResults([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(event.target.value);
  };

  const handleInputFocus = () => {
    setIsSearchFocused(true);
  };

  const handleSearchSubmit = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      if (searchQuery.trim()) {
        performSearch(searchQuery);
      }
    }
  };

  const handleResultClick = (result: SearchResult) => {
    console.log('Selected result:', result);
  };

  const clearSearch = () => {
    setSearchQuery('');
    setSearchResults([]);
    setError(null);
    setIsSearchFocused(false);
  };

  return {
    searchQuery,
    searchResults,
    isLoading,
    error,
    isSearchFocused,
    handleInputChange,
    handleInputFocus,
    handleSearchSubmit,
    handleResultClick,
    clearSearch,
  };
};
