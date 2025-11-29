import { useState, useEffect } from 'react';

export interface FilterOptions {
  categories: string[];
  priceRange: { min: number; max: number };
  colors: string[];
  sizes: string[];
  tags?: string[]; // ✅ NUEVO: Filtrar por tags (camisetas, tazas, etc.)
  minRating: number;
  inStock: boolean;
  sortBy: 'price-asc' | 'price-desc' | 'name' | 'rating' | 'newest';
}

interface Product {
  id: string;
  category: string;
  price: number;
  salePrice?: number;
  colors?: string[];
  sizes?: string[];
  rating: number;
  inStock: boolean;
}

interface FilterPanelProps {
  onFilterChange: (filters: FilterOptions) => void;
  totalResults?: number;
  allProducts?: Product[];
  currentFilters?: FilterOptions;
}

export default function FilterPanel({
  onFilterChange,
  totalResults = 0,
  allProducts = [],
  currentFilters,
}: FilterPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedCategories, setSelectedCategories] = useState<string[]>(
    currentFilters?.categories || []
  );
  const [priceRange, setPriceRange] = useState(
    currentFilters?.priceRange || { min: 0, max: 200 }
  );
  const [selectedColors, setSelectedColors] = useState<string[]>(currentFilters?.colors || []);
  const [selectedSizes, setSelectedSizes] = useState<string[]>(currentFilters?.sizes || []);
  const [minRating, setMinRating] = useState(currentFilters?.minRating || 0);
  const [inStock, setInStock] = useState(currentFilters?.inStock || false);
  const [sortBy, setSortBy] = useState<FilterOptions['sortBy']>(
    currentFilters?.sortBy || 'newest'
  );

  // Calculate categories dynamically from products
  const getCategoriesWithCount = () => {
    const categoryMap = new Map<string, number>();

    allProducts.forEach((product) => {
      const category = product.category || 'otros';
      categoryMap.set(category, (categoryMap.get(category) || 0) + 1);
    });

    // Map to friendly names (handles any category from Firebase)
    const categoryNames: Record<string, string> = {
      camisetas: 'Camisetas',
      sudaderas: 'Sudaderas',
      tazas: 'Tazas',
      gorras: 'Gorras',
      bolsas: 'Bolsas',
      marcos: 'Marcos',
      resina: 'Cajas Resina',
      'cajas-resina': 'Cajas Resina',
      regalos: 'Regalos',
      textil: 'Textil',
      otros: 'Otros',
    };

    return Array.from(categoryMap.entries())
      .map(([id, count]) => ({
        id,
        name: categoryNames[id] || id.charAt(0).toUpperCase() + id.slice(1),
        count,
      }))
      .sort((a, b) => b.count - a.count);
  };

  const categories = getCategoriesWithCount();

  // Calculate colors dynamically from products
  const getAvailableColors = () => {
    const colorSet = new Set<string>();
    allProducts.forEach((product) => {
      if (product.colors && Array.isArray(product.colors)) {
        product.colors.forEach((color) => colorSet.add(color));
      }
    });
    return Array.from(colorSet);
  };

  const availableColorIds = getAvailableColors();

  const allColors = [
    { id: 'white', name: 'Blanco', hex: '#FFFFFF' },
    { id: 'black', name: 'Negro', hex: '#000000' },
    { id: 'red', name: 'Rojo', hex: '#EF4444' },
    { id: 'blue', name: 'Azul', hex: '#3B82F6' },
    { id: 'green', name: 'Verde', hex: '#10B981' },
    { id: 'yellow', name: 'Amarillo', hex: '#F59E0B' },
    { id: 'pink', name: 'Rosa', hex: '#EC4899' },
    { id: 'gray', name: 'Gris', hex: '#6B7280' },
  ];

  // Only show colors that exist in products
  const colors = allColors.filter((color) => availableColorIds.includes(color.id));

  // Calculate sizes dynamically from products
  const getAvailableSizes = () => {
    const sizeSet = new Set<string>();
    allProducts.forEach((product) => {
      if (product.sizes && Array.isArray(product.sizes)) {
        product.sizes.forEach((size) => sizeSet.add(size));
      }
    });
    return Array.from(sizeSet);
  };

  const availableSizesList = getAvailableSizes();

  // Standard size order
  const sizeOrder = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];
  const sizes = sizeOrder.filter((size) => availableSizesList.includes(size));

  // Check if we should show size/color filters based on selected categories
  const shouldShowSizeFilter = () => {
    if (selectedCategories.length === 0) return sizes.length > 0;
    const textilCategories = ['camisetas', 'sudaderas', 'gorras', 'bolsas', 'textil'];
    return selectedCategories.some((cat) => textilCategories.includes(cat)) && sizes.length > 0;
  };

  const shouldShowColorFilter = () => {
    if (selectedCategories.length === 0) return colors.length > 0;
    // Most categories can have colors except maybe some specific ones
    return colors.length > 0;
  };

  // Auto-apply filters whenever any filter changes
  useEffect(() => {
    onFilterChange({
      categories: selectedCategories,
      priceRange,
      colors: selectedColors,
      sizes: selectedSizes,
      tags: currentFilters?.tags, // ✅ Preservar tags de URL
      minRating,
      inStock,
      sortBy,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    selectedCategories,
    priceRange,
    selectedColors,
    selectedSizes,
    minRating,
    inStock,
    sortBy,
    currentFilters?.tags, // ✅ Añadir como dependencia
    // onFilterChange is stable (useCallback), not needed in deps
  ]);

  const resetFilters = () => {
    setSelectedCategories([]);
    setPriceRange({ min: 0, max: 200 });
    setSelectedColors([]);
    setSelectedSizes([]);
    setMinRating(0);
    setInStock(false);
    setSortBy('newest');
    // useEffect will handle applying the filters
  };

  const toggleCategory = (category: string) => {
    const newCategories = selectedCategories.includes(category)
      ? selectedCategories.filter((c) => c !== category)
      : [...selectedCategories, category];
    setSelectedCategories(newCategories);
  };

  const toggleColor = (color: string) => {
    const newColors = selectedColors.includes(color)
      ? selectedColors.filter((c) => c !== color)
      : [...selectedColors, color];
    setSelectedColors(newColors);
  };

  const toggleSize = (size: string) => {
    const newSizes = selectedSizes.includes(size)
      ? selectedSizes.filter((s) => s !== size)
      : [...selectedSizes, size];
    setSelectedSizes(newSizes);
  };

  const activeFiltersCount =
    selectedCategories.length +
    selectedColors.length +
    selectedSizes.length +
    (minRating > 0 ? 1 : 0) +
    (inStock ? 1 : 0);

  return (
    <div className="relative">
      {/* Mobile Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="lg:hidden w-full mb-4 flex items-center justify-between px-4 py-3 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
      >
        <span className="font-semibold text-gray-700">
          Filtros {activeFiltersCount > 0 && `(${activeFiltersCount})`}
        </span>
        <svg
          className={`w-5 h-5 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {/* Filter Panel */}
      <div
        className={`lg:block ${isOpen ? 'block' : 'hidden'} bg-white rounded-lg border border-gray-200 p-6 sticky top-24`}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-bold text-gray-800">Filtros</h3>
          {activeFiltersCount > 0 && (
            <button
              onClick={resetFilters}
              className="text-sm text-cyan-600 hover:text-cyan-700 font-medium"
            >
              Limpiar todo
            </button>
          )}
        </div>

        {/* Results Count */}
        {totalResults > 0 && (
          <div className="mb-6 px-4 py-3 bg-cyan-50 rounded-lg">
            <p className="text-sm text-cyan-800">
              <span className="font-bold">{totalResults}</span> productos encontrados
            </p>
          </div>
        )}

        {/* Sort By */}
        <div className="mb-6 pb-6 border-b border-gray-200">
          <label className="block text-sm font-semibold text-gray-700 mb-3">Ordenar por</label>
          <select
            value={sortBy}
            onChange={(e) => {
              setSortBy(e.target.value as FilterOptions['sortBy']);
            }}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none"
          >
            <option value="newest">Más recientes</option>
            <option value="price-asc">Precio: Menor a mayor</option>
            <option value="price-desc">Precio: Mayor a menor</option>
            <option value="rating">Mejor valorados</option>
            <option value="name">Nombre A-Z</option>
          </select>
        </div>

        {/* Categories */}
        <div className="mb-6 pb-6 border-b border-gray-200">
          <h4 className="text-sm font-semibold text-gray-700 mb-3">Categorías</h4>
          <div className="space-y-2">
            {categories.map((category) => (
              <label key={category.id} className="flex items-center cursor-pointer group">
                <input
                  type="checkbox"
                  checked={selectedCategories.includes(category.id)}
                  onChange={() => {
                    toggleCategory(category.id);
                  }}
                  className="w-4 h-4 text-cyan-600 border-gray-300 rounded focus:ring-cyan-500"
                />
                <span className="ml-3 text-sm text-gray-700 group-hover:text-cyan-600">
                  {category.name}
                </span>
                <span className="ml-auto text-xs text-gray-400">({category.count})</span>
              </label>
            ))}
          </div>
        </div>

        {/* Price Range */}
        <div className="mb-6 pb-6 border-b border-gray-200">
          <h4 className="text-sm font-semibold text-gray-700 mb-3">Rango de precio</h4>
          <div className="space-y-4">
            <div>
              <input
                type="range"
                min="0"
                max="200"
                value={priceRange.max}
                onChange={(e) => {
                  setPriceRange({ ...priceRange, max: parseInt(e.target.value) });
                }}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-cyan-600"
              />
              <div className="flex items-center justify-between mt-2">
                <span className="text-sm text-gray-600">€{priceRange.min}</span>
                <span className="text-sm font-semibold text-cyan-600">€{priceRange.max}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Colors - Only show if relevant */}
        {shouldShowColorFilter() && (
          <div className="mb-6 pb-6 border-b border-gray-200">
            <h4 className="text-sm font-semibold text-gray-700 mb-3">Color</h4>
            <div className="grid grid-cols-4 gap-2">
              {colors.map((color) => (
              <button
                key={color.id}
                onClick={() => {
                  toggleColor(color.id);
                }}
                className={`relative w-10 h-10 rounded-full border-2 transition-all ${
                  selectedColors.includes(color.id)
                    ? 'border-cyan-600 ring-2 ring-cyan-200'
                    : 'border-gray-300 hover:border-gray-400'
                }`}
                style={{ backgroundColor: color.hex }}
                title={color.name}
              >
                {selectedColors.includes(color.id) && (
                  <svg
                    className="absolute inset-0 m-auto w-5 h-5 text-white drop-shadow"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                )}
              </button>
              ))}
            </div>
          </div>
        )}

        {/* Sizes - Only show for textile categories */}
        {shouldShowSizeFilter() && (
          <div className="mb-6 pb-6 border-b border-gray-200">
            <h4 className="text-sm font-semibold text-gray-700 mb-3">Talla</h4>
            <div className="grid grid-cols-3 gap-2">
              {sizes.map((size) => (
              <button
                key={size}
                onClick={() => {
                  toggleSize(size);
                }}
                className={`px-3 py-2 text-sm font-medium rounded-lg border transition-all ${
                  selectedSizes.includes(size)
                    ? 'bg-cyan-600 text-white border-cyan-600'
                    : 'bg-white text-gray-700 border-gray-300 hover:border-cyan-600'
                }`}
              >
                {size}
              </button>
              ))}
            </div>
          </div>
        )}

        {/* Rating */}
        <div className="mb-6 pb-6 border-b border-gray-200">
          <h4 className="text-sm font-semibold text-gray-700 mb-3">Valoración mínima</h4>
          <div className="space-y-2">
            {[4, 3, 2, 1].map((rating) => (
              <label key={rating} className="flex items-center cursor-pointer group">
                <input
                  type="radio"
                  name="rating"
                  checked={minRating === rating}
                  onChange={() => {
                    setMinRating(rating);
                  }}
                  className="w-4 h-4 text-cyan-600 border-gray-300 focus:ring-cyan-500"
                />
                <div className="ml-3 flex items-center gap-1">
                  {[...Array(5)].map((_, i) => (
                    <svg
                      key={i}
                      className={`w-4 h-4 ${i < rating ? 'text-yellow-400' : 'text-gray-300'}`}
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  ))}
                  <span className="text-sm text-gray-600 ml-1">y más</span>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Stock */}
        <div className="mb-6">
          <label className="flex items-center cursor-pointer group">
            <input
              type="checkbox"
              checked={inStock}
              onChange={(e) => {
                setInStock(e.target.checked);
              }}
              className="w-4 h-4 text-cyan-600 border-gray-300 rounded focus:ring-cyan-500"
            />
            <span className="ml-3 text-sm text-gray-700 group-hover:text-cyan-600">
              Solo productos en stock
            </span>
          </label>
        </div>

        {/* Close Button (Mobile) */}
        <button
          onClick={() => setIsOpen(false)}
          className="lg:hidden w-full px-6 py-3 bg-cyan-600 text-white font-semibold rounded-lg hover:bg-cyan-700 transition-colors"
        >
          Cerrar filtros
        </button>
      </div>
    </div>
  );
}
