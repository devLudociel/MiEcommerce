// src/components/products/ProductFilters.tsx
import React from 'react';

interface FilterState {
  priceRange: [number, number];
  attributes: { [attributeId: string]: string[] };
  tags: string[];
  sortBy: 'price-asc' | 'price-desc' | 'name' | 'featured';
}

interface ProductFiltersProps {
  filters: FilterState;
  onFiltersChange: (filters: FilterState) => void;
  availableAttributes: Array<{
    id: string;
    name: string;
    options: Array<{ value: string }>;
  }>;
  availableTags: string[];
  priceRange: [number, number];
}

const ProductFilters: React.FC<ProductFiltersProps> = ({
  filters,
  onFiltersChange,
  availableAttributes,
  availableTags,
  priceRange,
}) => {
  const updateFilter = (key: keyof FilterState, value: FilterState[keyof FilterState]) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  const toggleAttributeValue = (attributeId: string, value: string) => {
    const currentValues = filters.attributes[attributeId] || [];
    const newValues = currentValues.includes(value)
      ? currentValues.filter((v) => v !== value)
      : [...currentValues, value];

    updateFilter('attributes', {
      ...filters.attributes,
      [attributeId]: newValues,
    });
  };

  const toggleTag = (tag: string) => {
    const newTags = filters.tags.includes(tag)
      ? filters.tags.filter((t) => t !== tag)
      : [...filters.tags, tag];
    updateFilter('tags', newTags);
  };

  const clearFilters = () => {
    onFiltersChange({
      priceRange: priceRange,
      attributes: {},
      tags: [],
      sortBy: 'featured',
    });
  };

  return (
    <div
      style={{
        background: 'white',
        borderRadius: '12px',
        padding: '1.5rem',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        border: '1px solid var(--color-gray-200)',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '1.5rem',
        }}
      >
        <h3 style={{ fontSize: '1.125rem', fontWeight: '600', margin: 0 }}>Filtros</h3>
        <button
          onClick={clearFilters}
          style={{
            fontSize: '0.875rem',
            color: 'var(--color-cyan-600)',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
          }}
        >
          Limpiar
        </button>
      </div>

      {/* Ordenar por */}
      <div style={{ marginBottom: '1.5rem' }}>
        <label
          style={{
            display: 'block',
            fontWeight: '500',
            marginBottom: '0.5rem',
            fontSize: '0.875rem',
          }}
        >
          Ordenar por
        </label>
        <select
          value={filters.sortBy}
          onChange={(e) => updateFilter('sortBy', e.target.value)}
          style={{
            width: '100%',
            padding: '0.5rem',
            border: '1px solid var(--color-gray-300)',
            borderRadius: '6px',
            fontSize: '0.875rem',
          }}
        >
          <option value="featured">Destacados</option>
          <option value="price-asc">Precio: menor a mayor</option>
          <option value="price-desc">Precio: mayor a menor</option>
          <option value="name">Nombre A-Z</option>
        </select>
      </div>

      {/* Rango de precio */}
      <div style={{ marginBottom: '1.5rem' }}>
        <label
          style={{
            display: 'block',
            fontWeight: '500',
            marginBottom: '0.5rem',
            fontSize: '0.875rem',
          }}
        >
          Precio: €{filters.priceRange[0]} - €{filters.priceRange[1]}
        </label>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <input
            type="number"
            placeholder="Min"
            value={filters.priceRange[0]}
            onChange={(e) =>
              updateFilter('priceRange', [Number(e.target.value), filters.priceRange[1]])
            }
            style={{
              flex: 1,
              padding: '0.5rem',
              border: '1px solid var(--color-gray-300)',
              borderRadius: '6px',
              fontSize: '0.875rem',
            }}
          />
          <input
            type="number"
            placeholder="Max"
            value={filters.priceRange[1]}
            onChange={(e) =>
              updateFilter('priceRange', [filters.priceRange[0], Number(e.target.value)])
            }
            style={{
              flex: 1,
              padding: '0.5rem',
              border: '1px solid var(--color-gray-300)',
              borderRadius: '6px',
              fontSize: '0.875rem',
            }}
          />
        </div>
      </div>

      {/* Atributos */}
      {availableAttributes.map((attribute) => (
        <div key={attribute.id} style={{ marginBottom: '1.5rem' }}>
          <label
            style={{
              display: 'block',
              fontWeight: '500',
              marginBottom: '0.5rem',
              fontSize: '0.875rem',
            }}
          >
            {attribute.name}
          </label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {attribute.options.map((option) => (
              <label
                key={option.value}
                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}
              >
                <input
                  type="checkbox"
                  checked={(filters.attributes[attribute.id] || []).includes(option.value)}
                  onChange={() => toggleAttributeValue(attribute.id, option.value)}
                  style={{ marginRight: '0.5rem' }}
                />
                <span style={{ fontSize: '0.875rem' }}>{option.value}</span>
              </label>
            ))}
          </div>
        </div>
      ))}

      {/* Tags */}
      {availableTags.length > 0 && (
        <div style={{ marginBottom: '1.5rem' }}>
          <label
            style={{
              display: 'block',
              fontWeight: '500',
              marginBottom: '0.5rem',
              fontSize: '0.875rem',
            }}
          >
            Etiquetas
          </label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
            {availableTags.map((tag) => (
              <button
                key={tag}
                onClick={() => toggleTag(tag)}
                style={{
                  padding: '0.25rem 0.75rem',
                  fontSize: '0.75rem',
                  borderRadius: '20px',
                  border: '1px solid var(--color-gray-300)',
                  background: filters.tags.includes(tag) ? 'var(--color-cyan-100)' : 'white',
                  color: filters.tags.includes(tag)
                    ? 'var(--color-cyan-800)'
                    : 'var(--color-gray-700)',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
              >
                {tag}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductFilters;
