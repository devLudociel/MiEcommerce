// src/hooks/useRouter.ts
import { useEffect, useState } from 'react';

export interface RouteParams {
  categorySlug?: string;
  subcategorySlug?: string;
  productSlug?: string;
}

export function useRouter() {
  const [currentPath, setCurrentPath] = useState(window.location.pathname);
  const [params, setParams] = useState<RouteParams>({});

  useEffect(() => {
    const handlePopState = () => {
      setCurrentPath(window.location.pathname);
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  useEffect(() => {
    parseCurrentPath();
  }, [currentPath]);

  const parseCurrentPath = () => {
    const path = currentPath;

    // Parsear rutas de categorías: /categoria/textiles/ropa-personalizada
    const categoryMatch = path.match(/^\/categoria\/([^/]+)(?:\/([^/]+))?$/);
    if (categoryMatch) {
      setParams({
        categorySlug: categoryMatch[1],
        subcategorySlug: categoryMatch[2] || undefined,
      });
      return;
    }

    // Parsear rutas de productos: /producto/slug-del-producto
    const productMatch = path.match(/^\/producto\/([^/]+)$/);
    if (productMatch) {
      setParams({
        productSlug: productMatch[1],
      });
      return;
    }

    setParams({});
  };

  const navigate = (path: string) => {
    window.history.pushState({}, '', path);
    setCurrentPath(path);
  };

  return {
    currentPath,
    params,
    navigate,
    isCategory: currentPath.startsWith('/categoria'),
    isProduct: currentPath.startsWith('/producto'),
    isHome: currentPath === '/',
  };
}
