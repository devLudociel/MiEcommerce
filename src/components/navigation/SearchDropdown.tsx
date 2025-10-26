import React, { useRef, useEffect } from 'react';
import { useSearch } from '../../components/hooks/useSearch';
import type { SearchResult } from '../../components/hooks/useSearch';

interface SearchDropdownProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  isSearchFocused: boolean;
  onSearchFocus: (focused: boolean) => void;
}

const SearchDropdown: React.FC<SearchDropdownProps> = ({
  searchQuery,
  onSearchChange,
  isSearchFocused,
  onSearchFocus,
}) => {
  const {
    searchQuery: _hookQuery,
    searchResults,
    isLoading,
    error,
    isSearchFocused: _hookFocused,
    handleInputChange: hookHandleInputChange,
    handleInputFocus: hookHandleInputFocus,
    handleSearchSubmit: hookHandleSearchSubmit,
    handleResultClick,
    clearSearch,
  } = useSearch();

  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Manejar clic fuera del componente
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        onSearchFocus(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onSearchFocus]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onSearchChange(e.target.value);
    hookHandleInputChange(e);
  };

  const handleInputFocus = () => {
    onSearchFocus(true);
    hookHandleInputFocus();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    hookHandleSearchSubmit(e);
    if (e.key === 'Enter') {
      e.preventDefault();
      if (searchQuery.trim()) {
        // Navegar a página de resultados
        window.location.href = `/buscar?q=${encodeURIComponent(searchQuery)}`;
      }
    }
    if (e.key === 'Escape') {
      onSearchFocus(false);
      inputRef.current?.blur();
    }
  };

  const handleResultClickInternal = (result: SearchResult) => {
    handleResultClick(result);
    onSearchFocus(false);
    // Navegar al producto
    const target = result.slug || result.id;
    window.location.href = `/producto/${target}`;
  };

  const handleViewAllResults = () => {
    onSearchFocus(false);
    window.location.href = `/buscar?q=${encodeURIComponent(searchQuery)}`;
  };

  const showDropdown = isSearchFocused && searchQuery.trim().length > 0;

  return (
    <div ref={dropdownRef} style={{ position: 'relative', width: '100%' }}>
      {/* Input de búsqueda */}
      <div style={{ position: 'relative' }}>
        <input
          ref={inputRef}
          type="text"
          placeholder="Buscar productos, categorías..."
          value={searchQuery}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          onKeyDown={handleKeyDown}
          style={{
            width: '100%',
            padding: '12px 20px',
            paddingLeft: '44px',
            paddingRight: searchQuery ? '44px' : '20px',
            border: '1px solid var(--color-gray-300)',
            borderRadius: '8px',
            fontSize: '16px',
            outline: 'none',
            transition: 'all 0.2s ease',
            borderColor: isSearchFocused ? 'var(--color-cyan-500)' : 'var(--color-gray-300)',
            boxShadow: isSearchFocused ? '0 0 0 3px rgba(6, 182, 212, 0.1)' : 'none',
          }}
        />

        {/* Icono de búsqueda */}
        <div
          style={{
            position: 'absolute',
            left: '14px',
            top: '50%',
            transform: 'translateY(-50%)',
            color: 'var(--color-gray-400)',
            pointerEvents: 'none',
          }}
        >
          <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="m21 21-6-6m2-5a7 7 0 1 1-14 0 7 7 0 0 1 14 0Z"
            />
          </svg>
        </div>

        {/* Botón limpiar */}
        {searchQuery && (
          <button
            onClick={() => {
              onSearchChange('');
              clearSearch();
              inputRef.current?.focus();
            }}
            style={{
              position: 'absolute',
              right: '14px',
              top: '50%',
              transform: 'translateY(-50%)',
              background: 'none',
              border: 'none',
              color: 'var(--color-gray-400)',
              cursor: 'pointer',
              padding: '2px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        )}
      </div>

      {/* Dropdown de resultados */}
      {showDropdown && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            background: 'white',
            borderRadius: '8px',
            boxShadow: '0 10px 25px rgba(0, 0, 0, 0.15)',
            border: '1px solid var(--color-gray-200)',
            zIndex: 1000,
            marginTop: '4px',
            maxHeight: '500px',
            overflowY: 'auto',
          }}
        >
          {/* Estado de carga */}
          {isLoading && (
            <div
              style={{
                padding: '20px',
                textAlign: 'center',
                color: 'var(--color-gray-500)',
              }}
            >
              <div
                style={{
                  display: 'inline-block',
                  width: '20px',
                  height: '20px',
                  border: '2px solid var(--color-gray-200)',
                  borderTop: '2px solid var(--color-cyan-500)',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite',
                  marginBottom: '8px',
                }}
              ></div>
              <p style={{ margin: 0, fontSize: '14px' }}>Buscando productos...</p>
            </div>
          )}

          {/* Error */}
          {error && (
            <div
              style={{
                padding: '20px',
                textAlign: 'center',
                color: 'var(--color-red-600)',
                fontSize: '14px',
              }}
            >
              <p style={{ margin: 0 }}>❌ {error}</p>
            </div>
          )}

          {/* Resultados */}
          {!isLoading && !error && searchResults.length > 0 && (
            <>
              {/* Header de resultados */}
              <div
                style={{
                  padding: '12px 16px',
                  borderBottom: '1px solid var(--color-gray-100)',
                  background: 'var(--color-gray-50)',
                  fontSize: '13px',
                  color: 'var(--color-gray-600)',
                  fontWeight: '500',
                }}
              >
                {searchResults.length} resultado{searchResults.length !== 1 ? 's' : ''} para "
                {searchQuery}"
              </div>

              {/* Lista de resultados */}
              <div style={{ maxHeight: '360px', overflowY: 'auto' }}>
                {searchResults.slice(0, 8).map((result) => (
                  <div
                    key={result.id}
                    onMouseDown={() => {
                      handleResultClick(result);
                      onSearchFocus(false);
                      const t = result.slug || result.id;
                      window.location.href = `/producto/${t}`;
                    }}
                    style={{
                      padding: '12px 16px',
                      borderBottom: '1px solid var(--color-gray-100)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      transition: 'background-color 0.2s ease',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = 'var(--color-gray-50)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }}
                  >
                    {/* Imagen del producto */}
                    {result.image && (
                      <img
                        src={result.image}
                        alt=<a
                          href={'/producto/' + (result.slug || result.id)}
                          style={{ color: 'inherit', textDecoration: 'none' }}
                        >
                          {result.name}
                        </a>
                        style={{
                          width: '48px',
                          height: '48px',
                          objectFit: 'cover',
                          borderRadius: '6px',
                          border: '1px solid var(--color-gray-200)',
                          flexShrink: 0,
                        }}
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                    )}

                    {/* Contenido del resultado */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <h4
                        style={{
                          margin: 0,
                          fontSize: '14px',
                          fontWeight: '500',
                          color: 'var(--color-gray-800)',
                          marginBottom: '2px',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        <a
                          href={'/producto/' + (result.slug || result.id)}
                          style={{ color: 'inherit', textDecoration: 'none' }}
                        >
                          {result.name}
                        </a>
                      </h4>

                      {result.description && (
                        <p
                          style={{
                            margin: 0,
                            fontSize: '12px',
                            color: 'var(--color-gray-600)',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {result.description}
                        </p>
                      )}

                      {result.category && (
                        <span
                          style={{
                            fontSize: '11px',
                            color: 'var(--color-cyan-600)',
                            backgroundColor: 'var(--color-cyan-50)',
                            padding: '2px 6px',
                            borderRadius: '4px',
                            marginTop: '4px',
                            display: 'inline-block',
                          }}
                        >
                          {result.category}
                        </span>
                      )}
                    </div>

                    {/* Precio */}
                    {result.price && (
                      <div
                        style={{
                          fontSize: '14px',
                          fontWeight: '600',
                          color: 'var(--color-gray-800)',
                          flexShrink: 0,
                        }}
                      >
                        €{result.price.toFixed(2)}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Footer - Ver todos los resultados */}
              {searchResults.length > 0 && (
                <div
                  style={{
                    padding: '12px 16px',
                    borderTop: '1px solid var(--color-gray-100)',
                    background: 'var(--color-gray-50)',
                  }}
                >
                  <button
                    onClick={handleViewAllResults}
                    style={{
                      width: '100%',
                      background: 'none',
                      border: 'none',
                      color: 'var(--color-cyan-600)',
                      fontSize: '14px',
                      fontWeight: '500',
                      cursor: 'pointer',
                      padding: '8px',
                      borderRadius: '6px',
                      transition: 'background-color 0.2s ease',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = 'var(--color-cyan-50)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }}
                  >
                    Ver todos los resultados ({searchResults.length}) →
                  </button>
                </div>
              )}
            </>
          )}

          {/* Sin resultados */}
          {!isLoading && !error && searchQuery.trim() && searchResults.length === 0 && (
            <div
              style={{
                padding: '32px 16px',
                textAlign: 'center',
                color: 'var(--color-gray-500)',
              }}
            >
              <div style={{ fontSize: '32px', marginBottom: '12px' }}>🔍</div>
              <p style={{ margin: 0, fontSize: '16px', fontWeight: '500', marginBottom: '8px' }}>
                No se encontraron resultados
              </p>
              <p style={{ margin: 0, fontSize: '14px', marginBottom: '16px' }}>
                Intenta con términos más generales o verifica la ortografía
              </p>
              <button
                onClick={handleViewAllResults}
                style={{
                  background: 'var(--color-cyan-500)',
                  color: 'white',
                  border: 'none',
                  padding: '8px 16px',
                  borderRadius: '6px',
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: 'pointer',
                  transition: 'background-color 0.2s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--color-cyan-600)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--color-cyan-500)';
                }}
              >
                Buscar en toda la tienda
              </button>
            </div>
          )}
        </div>
      )}

      {/* Estilos para la animaci�n de carga */}
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default SearchDropdown;
