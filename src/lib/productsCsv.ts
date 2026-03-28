// src/lib/productsCsv.ts
// Utilidades para importar/exportar productos en formato CSV

// NOTE: Keep this module decoupled from app-specific Product types to avoid
// mismatches when the product schema evolves in the admin UI.

// ============================================================================
// TIPOS
// ============================================================================

export interface CsvProduct {
  id?: string;
  name: string;
  description: string;
  category?: string; // Slug (textiles, sublimados, etc.)
  categoryId?: string; // ID numérico del navbar (1..9)
  subcategory?: string; // Slug de subcategoría (ropa-personalizada, etc.)
  subcategoryId?: string; // ID numérico de subcategoría
  basePrice: number;
  images: string[]; // URLs separadas por |
  customizable?: boolean; // Legacy
  readyMade?: boolean;
  tags: string[];
  featured: boolean;
  slug: string;
  active: boolean;
  onSale?: boolean;
  salePrice?: number;
  isDigital?: boolean; // Digital product
  trackInventory?: boolean;
  stock?: number;
  lowStockThreshold?: number;
  allowBackorder?: boolean;
  metaTitle?: string;
  metaDescription?: string;
}

export interface ImportResult {
  success: number;
  errors: { row: number; message: string; data?: string }[];
  total: number;
}

// ============================================================================
// CONSTANTES
// ============================================================================

const CSV_HEADERS = [
  'id',
  'name',
  'description',
  'category',
  'categoryId',
  'subcategory',
  'subcategoryId',
  'basePrice',
  'images',
  'customizable',
  'readyMade',
  'tags',
  'featured',
  'slug',
  'active',
  'onSale',
  'salePrice',
  'isDigital',
  'trackInventory',
  'stock',
  'lowStockThreshold',
  'allowBackorder',
  'metaTitle',
  'metaDescription',
];

const LEGACY_CATEGORIES = [
  'textil',
  'impresion-3d',
  'laser',
  'eventos',
  'regalos',
  'bordado',
  'digital',
];

const NAVBAR_CATEGORIES = [
  'graficos-impresos',
  'textiles',
  'papeleria',
  'sublimados',
  'corte-grabado',
  'eventos',
  'impresion-3d',
  'packaging',
  'servicios-digitales',
];

const DEFAULT_VALID_CATEGORIES = Array.from(new Set([...LEGACY_CATEGORIES, ...NAVBAR_CATEGORIES]));

// ============================================================================
// EXPORTAR PRODUCTOS A CSV
// ============================================================================

export function exportProductsToCsv(products: CsvProduct[]): string {
  const rows: string[] = [];

  // Añadir cabeceras
  rows.push(CSV_HEADERS.join(','));

  // Añadir cada producto
  for (const product of products) {
    const customizable = product.customizable ?? !product.readyMade;
    const row = [
      escapeCSV(product.id || ''),
      escapeCSV(product.name),
      escapeCSV(product.description || ''),
      escapeCSV(product.category || ''),
      escapeCSV(product.categoryId || ''),
      escapeCSV(product.subcategory || ''),
      escapeCSV(product.subcategoryId || ''),
      product.basePrice?.toString() || '0',
      escapeCSV((product.images || []).join('|')), // Separar imágenes con |
      customizable ? 'true' : 'false',
      product.readyMade ? 'true' : 'false',
      escapeCSV((product.tags || []).join('|')), // Separar tags con |
      product.featured ? 'true' : 'false',
      escapeCSV(product.slug),
      product.active ? 'true' : 'false',
      product.onSale ? 'true' : 'false',
      (product.salePrice ?? '').toString(),
      product.isDigital ? 'true' : 'false',
      product.trackInventory ? 'true' : 'false',
      (product.stock ?? '').toString(),
      (product.lowStockThreshold ?? '').toString(),
      product.allowBackorder ? 'true' : 'false',
      escapeCSV(product.metaTitle || ''),
      escapeCSV(product.metaDescription || ''),
    ];
    rows.push(row.join(','));
  }

  return rows.join('\n');
}

// ============================================================================
// IMPORTAR PRODUCTOS DESDE CSV
// ============================================================================

export function parseProductsCsv(
  csvContent: string,
  options?: {
    validCategorySlugs?: string[];
    validCategoryIds?: string[];
    validSubcategorySlugs?: string[];
    validSubcategoryIds?: string[];
  }
): {
  products: Partial<CsvProduct>[];
  errors: { row: number; message: string; data?: string }[];
} {
  const lines = csvContent.split(/\r?\n/).filter((line) => line.trim());
  const products: Partial<CsvProduct>[] = [];
  const errors: { row: number; message: string; data?: string }[] = [];

  if (lines.length < 2) {
    errors.push({ row: 0, message: 'El archivo CSV está vacío o solo tiene cabeceras' });
    return { products, errors };
  }

  // Verificar cabeceras
  const headers = parseCSVLine(lines[0]);
  const headerMap = new Map<string, number>();
  headers.forEach((header, index) => {
    headerMap.set(header.toLowerCase().trim(), index);
  });

  // Verificar columnas requeridas
  const requiredColumns = ['name', 'baseprice', 'slug'];
  for (const col of requiredColumns) {
    if (!headerMap.has(col)) {
      errors.push({ row: 1, message: `Falta la columna requerida: ${col}` });
    }
  }
  if (!headerMap.has('category') && !headerMap.has('categoryid')) {
    errors.push({
      row: 1,
      message: 'Falta la columna requerida: category o categoryId',
    });
  }

  if (errors.length > 0) {
    return { products, errors };
  }

  // Procesar cada fila
  for (let i = 1; i < lines.length; i++) {
    const rowNumber = i + 1;
    const line = lines[i];

    if (!line.trim()) continue;

    try {
      const values = parseCSVLine(line);
      const product = parseProductRow(values, headerMap, rowNumber, errors, options);

      if (product) {
        products.push(product);
      }
    } catch (error) {
      errors.push({
        row: rowNumber,
        message: `Error al procesar la fila: ${error instanceof Error ? error.message : 'Error desconocido'}`,
        data: line.substring(0, 100),
      });
    }
  }

  return { products, errors };
}

function parseProductRow(
  values: string[],
  headerMap: Map<string, number>,
  rowNumber: number,
  errors: { row: number; message: string; data?: string }[],
  options?: {
    validCategorySlugs?: string[];
    validCategoryIds?: string[];
    validSubcategorySlugs?: string[];
    validSubcategoryIds?: string[];
  }
): Partial<CsvProduct> | null {
  const getValue = (column: string): string => {
    const index = headerMap.get(column.toLowerCase());
    return index !== undefined ? (values[index] || '').trim() : '';
  };

  const getBoolValue = (column: string): boolean => {
    const val = getValue(column).toLowerCase();
    return val === 'true' || val === '1' || val === 'si' || val === 'sí' || val === 'yes';
  };

  const getNumberValue = (column: string): number | undefined => {
    const val = getValue(column);
    if (!val) return undefined;
    const num = parseFloat(val);
    return isNaN(num) ? undefined : num;
  };

  // Validar campos requeridos
  const name = getValue('name');
  if (!name) {
    errors.push({ row: rowNumber, message: 'El nombre del producto es requerido' });
    return null;
  }

  const slug = getValue('slug');
  if (!slug) {
    errors.push({ row: rowNumber, message: 'El slug es requerido' });
    return null;
  }

  const category = getValue('category');
  const categoryId = getValue('categoryid');
  const validCategories = options?.validCategorySlugs || DEFAULT_VALID_CATEGORIES;
  if (category && validCategories.length > 0 && !validCategories.includes(category)) {
    errors.push({
      row: rowNumber,
      message: `Categoría inválida: "${category}". Válidas: ${validCategories.join(', ')}`,
    });
    return null;
  }
  if (!category && !categoryId) {
    errors.push({
      row: rowNumber,
      message: 'La categoría es requerida (category o categoryId)',
    });
    return null;
  }
  if (categoryId && options?.validCategoryIds?.length) {
    if (!options.validCategoryIds.includes(categoryId)) {
      errors.push({
        row: rowNumber,
        message: `categoryId inválido: "${categoryId}". Válidos: ${options.validCategoryIds.join(
          ', '
        )}`,
      });
      return null;
    }
  }

  const basePrice = getNumberValue('baseprice');
  if (basePrice === undefined || basePrice < 0) {
    errors.push({
      row: rowNumber,
      message: 'El precio base es requerido y debe ser un número válido',
    });
    return null;
  }

  // Procesar imágenes (separadas por |)
  const imagesStr = getValue('images');
  const images = imagesStr
    ? imagesStr
        .split('|')
        .map((img) => img.trim())
        .filter(Boolean)
    : [];

  // Procesar tags (separados por |)
  const tagsStr = getValue('tags');
  const tags = tagsStr
    ? tagsStr
        .split('|')
        .map((tag) => tag.trim())
        .filter(Boolean)
    : [];

  const product: Partial<CsvProduct> = {
    name,
    description: getValue('description') || '',
    category: category || undefined,
    categoryId: categoryId || undefined,
    subcategory: getValue('subcategory') || undefined,
    subcategoryId: getValue('subcategoryid') || undefined,
    basePrice,
    images,
    customizable: getValue('customizable') ? getBoolValue('customizable') : undefined,
    readyMade: getValue('readymade') ? getBoolValue('readymade') : undefined,
    tags,
    featured: getBoolValue('featured'),
    slug,
    active: getBoolValue('active'),
    onSale: getValue('onsale') ? getBoolValue('onsale') : undefined,
    salePrice: getNumberValue('saleprice'),
  };

  // Campos opcionales
  const id = getValue('id');
  if (id) {
    product.id = id;
  }

  if (getValue('isdigital')) product.isDigital = getBoolValue('isdigital');
  if (getValue('trackinventory')) product.trackInventory = getBoolValue('trackinventory');

  const stock = getNumberValue('stock');
  if (stock !== undefined) {
    product.stock = stock;
  }

  const lowStockThreshold = getNumberValue('lowstockthreshold');
  if (lowStockThreshold !== undefined) {
    product.lowStockThreshold = lowStockThreshold;
  }

  if (getValue('allowbackorder')) product.allowBackorder = getBoolValue('allowbackorder');

  const metaTitle = getValue('metatitle');
  if (metaTitle) product.metaTitle = metaTitle;
  const metaDescription = getValue('metadescription');
  if (metaDescription) product.metaDescription = metaDescription;

  // Validar subcategorías si vienen
  const subcategory = product.subcategory;
  const subcategoryId = product.subcategoryId;
  if (subcategory && options?.validSubcategorySlugs?.length) {
    if (!options.validSubcategorySlugs.includes(subcategory)) {
      errors.push({
        row: rowNumber,
        message: `Subcategoría inválida: "${subcategory}". Válidas: ${options.validSubcategorySlugs.join(
          ', '
        )}`,
      });
      return null;
    }
  }
  if (subcategoryId && options?.validSubcategoryIds?.length) {
    if (!options.validSubcategoryIds.includes(subcategoryId)) {
      errors.push({
        row: rowNumber,
        message: `subcategoryId inválido: "${subcategoryId}". Válidos: ${options.validSubcategoryIds.join(
          ', '
        )}`,
      });
      return null;
    }
  }

  return product;
}

// ============================================================================
// UTILIDADES CSV
// ============================================================================

function escapeCSV(value: string): string {
  if (!value) return '';

  // Si contiene comas, comillas o saltos de línea, escapar con comillas
  if (value.includes(',') || value.includes('"') || value.includes('\n') || value.includes('\r')) {
    return `"${value.replace(/"/g, '""')}"`;
  }

  return value;
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  let i = 0;

  while (i < line.length) {
    const char = line[i];

    if (inQuotes) {
      if (char === '"') {
        // Mirar si es comilla escapada (doble comilla)
        if (i + 1 < line.length && line[i + 1] === '"') {
          current += '"';
          i += 2;
        } else {
          // Fin de campo entrecomillado
          inQuotes = false;
          i++;
        }
      } else {
        current += char;
        i++;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
        i++;
      } else if (char === ',') {
        result.push(current);
        current = '';
        i++;
      } else {
        current += char;
        i++;
      }
    }
  }

  result.push(current);
  return result;
}

// ============================================================================
// GENERAR PLANTILLA CSV
// ============================================================================

export function generateCsvTemplate(options?: {
  categories?: { id: string; slug: string }[];
  subcategories?: { id: string; slug: string; categoryId?: string }[];
}): string {
  const rows: string[] = [];

  // Cabeceras
  rows.push(CSV_HEADERS.join(','));

  const categoryExample = options?.categories?.[0];
  const subcategoryExample = options?.subcategories?.find(
    (sub) => !categoryExample || sub.categoryId === categoryExample.id
  );

  // Fila de ejemplo
  const exampleRow = [
    '', // id - vacío para nuevos productos
    'Camiseta Personalizada',
    'Camiseta de algodón 100% personalizable con tu diseño',
    categoryExample?.slug || 'textiles',
    categoryExample?.id || '2',
    subcategoryExample?.slug || 'ropa-personalizada',
    subcategoryExample?.id || '4',
    '19.99',
    'https://ejemplo.com/imagen1.jpg|https://ejemplo.com/imagen2.jpg',
    'true',
    'cat_camisetas',
    'false',
    'nuevo|oferta',
    'true',
    'camiseta-personalizada',
    'true',
    'false',
    '',
    'false',
    'true',
    '50',
    '5',
    'false',
    'Camiseta Personalizada - Tu Tienda',
    'Compra camisetas personalizadas de alta calidad. Diseño único con tu imagen.',
  ];
  rows.push(exampleRow.join(','));

  return rows.join('\n');
}

// ============================================================================
// VALIDAR SLUGS ÚNICOS
// ============================================================================

export function validateUniqueSlugs(
  products: Partial<CsvProduct>[],
  existingSlugs: Set<string>
): { row: number; message: string }[] {
  const errors: { row: number; message: string }[] = [];
  const seenSlugs = new Set<string>();

  products.forEach((product, index) => {
    const slug = product.slug;
    if (!slug) return;

    // Verificar si existe en la base de datos (solo para productos nuevos sin ID)
    if (!product.id && existingSlugs.has(slug)) {
      errors.push({
        row: index + 2, // +2 porque índice 0 + fila de cabecera
        message: `El slug "${slug}" ya existe en la base de datos`,
      });
    }

    // Verificar duplicados en el mismo CSV
    if (seenSlugs.has(slug)) {
      errors.push({
        row: index + 2,
        message: `El slug "${slug}" está duplicado en el archivo CSV`,
      });
    }

    seenSlugs.add(slug);
  });

  return errors;
}
