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

  const performSearch = async (q: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const coll = collection(db, 'products');

      let snap;
      try {
        // Intento 1: prefijo por nombre (requiere índice compuesto active/name)
        const q1 = fsQuery(
          coll,
          where('active', '==', true),
          orderBy('name'),
          startAt(q),
          endAt(q + '\uf8ff'),
          fsLimit(8)
        );
        snap = await getDocs(q1);
      } catch (_) {
        // Fallback: traer un subconjunto y filtrar en cliente
        const q2 = fsQuery(coll, where('active', '==', true), fsLimit(25));
        snap = await getDocs(q2);
      }

      const term = q.trim().toLowerCase();
      const res: SearchResult[] = [];
      snap.forEach((doc) => {
        const data: any = doc.data();
        const name: string = data?.name || '';
        const desc: string = data?.description || '';
        const tags: string[] = data?.tags || [];
        const matches =
          term.length === 0 ||
          name.toLowerCase().includes(term) ||
          desc.toLowerCase().includes(term) ||
          tags.some((t) => t?.toLowerCase().includes(term));

        if (matches) {
          res.push({
            id: doc.id,
            slug: data?.slug,
            name,
            description: desc,
            price: data?.basePrice ?? 0,
            image: (data?.images && data.images[0]) || FALLBACK_IMG_400x300,
            category: '',
          });
        }
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
