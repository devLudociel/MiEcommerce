/**
 * Debounce utility
 *
 * Creates a debounced function that delays invoking the provided function
 * until after `delay` milliseconds have elapsed since the last time it was invoked.
 *
 * @param fn - The function to debounce
 * @param delay - The number of milliseconds to delay
 * @returns A debounced version of the function
 *
 * @example
 * const debouncedSave = debounce((data) => saveToServer(data), 500);
 * debouncedSave(userData); // Will only execute after 500ms of no calls
 */
export function debounce<T extends (...args: any[]) => any>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout>;

  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  };
}

/**
 * Debounce with leading edge option
 *
 * @param fn - The function to debounce
 * @param delay - The number of milliseconds to delay
 * @param leading - If true, invokes the function on the leading edge instead of trailing
 * @returns A debounced version of the function
 *
 * @example
 * const debouncedClick = debounce((e) => handleClick(e), 300, true);
 * debouncedClick(); // Executes immediately, then blocks for 300ms
 */
export function debounceLeading<T extends (...args: any[]) => any>(
  fn: T,
  delay: number,
  leading = false
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  return (...args: Parameters<T>) => {
    const callNow = leading && !timeoutId;

    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    timeoutId = setTimeout(() => {
      timeoutId = null;
      if (!leading) {
        fn(...args);
      }
    }, delay);

    if (callNow) {
      fn(...args);
    }
  };
}
