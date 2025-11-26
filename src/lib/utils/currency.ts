/**
 * Currency formatting utilities
 * Centralizes all currency formatting logic to avoid duplication
 */

export type SupportedCurrency = 'EUR' | 'USD' | 'GBP';
export type SupportedLocale = 'es-ES' | 'en-US' | 'en-GB';

const CURRENCY_LOCALE_MAP: Record<SupportedCurrency, SupportedLocale> = {
  EUR: 'es-ES',
  USD: 'en-US',
  GBP: 'en-GB',
};

/**
 * Formats a number as currency
 * @param amount - The amount to format
 * @param currency - The currency code (default: EUR)
 * @param locale - The locale to use (default: based on currency)
 * @returns Formatted currency string
 *
 * @example
 * formatCurrency(19.99) // "19,99 €"
 * formatCurrency(19.99, 'USD') // "$19.99"
 */
export function formatCurrency(
  amount: number,
  currency: SupportedCurrency = 'EUR',
  locale?: SupportedLocale
): string {
  const finalLocale = locale || CURRENCY_LOCALE_MAP[currency];

  return new Intl.NumberFormat(finalLocale, {
    style: 'currency',
    currency,
  }).format(amount);
}

/**
 * Formats a price with optional decimal places control
 * @param price - The price to format
 * @param options - Formatting options
 * @returns Formatted price string
 *
 * @example
 * formatPrice(19.99) // "19,99 €"
 * formatPrice(19, { showDecimals: false }) // "19 €"
 */
export function formatPrice(
  price: number,
  options?: {
    currency?: SupportedCurrency;
    locale?: SupportedLocale;
    showDecimals?: boolean;
  }
): string {
  const currency = options?.currency || 'EUR';
  const locale = options?.locale || CURRENCY_LOCALE_MAP[currency];
  const showDecimals = options?.showDecimals ?? true;

  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: showDecimals ? 2 : 0,
    maximumFractionDigits: showDecimals ? 2 : 0,
  }).format(price);
}

/**
 * Parses a currency string back to a number
 * @param currencyString - The currency string to parse
 * @returns Parsed number or null if invalid
 *
 * @example
 * parseCurrency("19,99 €") // 19.99
 * parseCurrency("$19.99") // 19.99
 */
export function parseCurrency(currencyString: string): number | null {
  // Remove currency symbols and parse
  const cleaned = currencyString.replace(/[^0-9,.]/g, '');
  const normalized = cleaned.replace(',', '.');
  const parsed = parseFloat(normalized);

  return isNaN(parsed) ? null : parsed;
}

/**
 * Calculates percentage of amount
 * @param amount - Base amount
 * @param percentage - Percentage to calculate
 * @returns Calculated amount
 *
 * @example
 * calculatePercentage(100, 10) // 10
 * calculatePercentage(50, 21) // 10.5
 */
export function calculatePercentage(amount: number, percentage: number): number {
  return (amount * percentage) / 100;
}

/**
 * Applies discount to amount
 * @param amount - Original amount
 * @param discount - Discount amount or percentage
 * @param isPercentage - Whether discount is a percentage
 * @returns Amount after discount
 *
 * @example
 * applyDiscount(100, 10, false) // 90
 * applyDiscount(100, 10, true) // 90
 */
export function applyDiscount(
  amount: number,
  discount: number,
  isPercentage: boolean = false
): number {
  if (isPercentage) {
    const discountAmount = calculatePercentage(amount, discount);
    return Math.max(0, amount - discountAmount);
  }
  return Math.max(0, amount - discount);
}

/**
 * Formats amount with thousands separators
 * @param amount - The amount to format
 * @param locale - The locale to use
 * @returns Formatted number string
 *
 * @example
 * formatNumber(1000) // "1.000"
 * formatNumber(1000, 'en-US') // "1,000"
 */
export function formatNumber(amount: number, locale: SupportedLocale = 'es-ES'): string {
  return new Intl.NumberFormat(locale).format(amount);
}
