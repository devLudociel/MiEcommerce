// src/components/ui/Pagination.tsx
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PaginationProps {
  currentPage: number;
  totalPages?: number;
  hasMore: boolean;
  hasPrevious: boolean;
  onNextPage: () => void;
  onPreviousPage: () => void;
  onPageChange?: (page: number) => void;
  itemsPerPage?: number;
  totalItems?: number;
  isLoading?: boolean;
}

export default function Pagination({
  currentPage,
  totalPages,
  hasMore,
  hasPrevious,
  onNextPage,
  onPreviousPage,
  onPageChange,
  itemsPerPage,
  totalItems,
  isLoading = false,
}: PaginationProps) {
  // Calcular rango de items mostrados
  const startItem = totalItems !== undefined ? (currentPage - 1) * (itemsPerPage || 20) + 1 : null;
  const endItem =
    totalItems !== undefined ? Math.min(currentPage * (itemsPerPage || 20), totalItems) : null;

  return (
    <div className="flex items-center justify-between px-4 py-3 bg-white border-t border-gray-200 sm:px-6">
      {/* Info de items (móvil) */}
      <div className="flex justify-between flex-1 sm:hidden">
        <button
          onClick={onPreviousPage}
          disabled={!hasPrevious || isLoading}
          className="relative inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Anterior
        </button>
        <button
          onClick={onNextPage}
          disabled={!hasMore || isLoading}
          className="relative inline-flex items-center px-4 py-2 ml-3 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Siguiente
        </button>
      </div>

      {/* Desktop */}
      <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
        {/* Info de items */}
        <div>
          <p className="text-sm text-gray-700">
            {startItem && endItem && totalItems ? (
              <>
                Mostrando <span className="font-medium">{startItem}</span> a{' '}
                <span className="font-medium">{endItem}</span> de{' '}
                <span className="font-medium">{totalItems}</span> resultados
              </>
            ) : (
              <>
                Página <span className="font-medium">{currentPage}</span>
                {totalPages && (
                  <>
                    {' '}
                    de <span className="font-medium">{totalPages}</span>
                  </>
                )}
              </>
            )}
          </p>
        </div>

        {/* Controles de paginación */}
        <div>
          <nav
            className="relative z-0 inline-flex -space-x-px rounded-md shadow-sm"
            aria-label="Pagination"
          >
            {/* Botón Anterior */}
            <button
              onClick={onPreviousPage}
              disabled={!hasPrevious || isLoading}
              className="relative inline-flex items-center px-2 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-l-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span className="sr-only">Anterior</span>
              <ChevronLeft className="w-5 h-5" aria-hidden="true" />
            </button>

            {/* Números de página (si tenemos totalPages) */}
            {totalPages &&
              onPageChange &&
              renderPageNumbers(currentPage, totalPages, onPageChange, isLoading)}

            {/* Indicador de página actual (si NO tenemos totalPages) */}
            {!totalPages && (
              <span className="relative inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300">
                {currentPage}
              </span>
            )}

            {/* Botón Siguiente */}
            <button
              onClick={onNextPage}
              disabled={!hasMore || isLoading}
              className="relative inline-flex items-center px-2 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-r-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span className="sr-only">Siguiente</span>
              <ChevronRight className="w-5 h-5" aria-hidden="true" />
            </button>
          </nav>
        </div>
      </div>
    </div>
  );
}

/**
 * Renderiza los números de página con elipsis inteligente
 */
function renderPageNumbers(
  currentPage: number,
  totalPages: number,
  onPageChange: (page: number) => void,
  isLoading: boolean
) {
  const pages: (number | 'ellipsis')[] = [];

  if (totalPages <= 7) {
    // Si hay 7 o menos páginas, mostrar todas
    for (let i = 1; i <= totalPages; i++) {
      pages.push(i);
    }
  } else {
    // Mostrar con elipsis
    // Siempre mostrar primera página
    pages.push(1);

    if (currentPage > 3) {
      pages.push('ellipsis');
    }

    // Mostrar páginas alrededor de la actual
    const start = Math.max(2, currentPage - 1);
    const end = Math.min(totalPages - 1, currentPage + 1);

    for (let i = start; i <= end; i++) {
      pages.push(i);
    }

    if (currentPage < totalPages - 2) {
      pages.push('ellipsis');
    }

    // Siempre mostrar última página
    pages.push(totalPages);
  }

  return pages.map((page, index) => {
    if (page === 'ellipsis') {
      return (
        <span
          key={`ellipsis-${index}`}
          className="relative inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300"
        >
          ...
        </span>
      );
    }

    const isActive = page === currentPage;

    return (
      <button
        key={page}
        onClick={() => onPageChange(page)}
        disabled={isLoading}
        className={`
          relative inline-flex items-center px-4 py-2 text-sm font-medium border
          ${
            isActive
              ? 'z-10 bg-cyan-50 border-cyan-500 text-cyan-600'
              : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
          }
          disabled:opacity-50 disabled:cursor-not-allowed
        `}
      >
        {page}
      </button>
    );
  });
}
