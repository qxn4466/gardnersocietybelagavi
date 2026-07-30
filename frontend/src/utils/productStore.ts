import { PESTICIDE_PRODUCT_LIST } from '../types';

const STORAGE_KEY = 'gardner_custom_pesticide_products';

/**
 * Get all available products (default + user added custom products)
 */
export const getStoredProducts = (): string[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const customList: string[] = JSON.parse(raw);
      if (Array.isArray(customList)) {
        // Merge default list with custom list ensuring unique values
        const merged = Array.from(new Set([...PESTICIDE_PRODUCT_LIST, ...customList]));
        return merged;
      }
    }
  } catch {
    // Ignore localStorage parse errors
  }
  return [...PESTICIDE_PRODUCT_LIST];
};

/**
 * Add a new product to stored product list
 */
export const addStoredProduct = (newProduct: string): string[] => {
  if (!newProduct || !newProduct.trim()) return getStoredProducts();
  const trimmed = newProduct.trim();

  const current = getStoredProducts();
  if (!current.some(p => p.toLowerCase() === trimmed.toLowerCase())) {
    const updated = [...current, trimmed];
    try {
      // Store only custom additions beyond defaults
      const customOnly = updated.filter(p => !PESTICIDE_PRODUCT_LIST.includes(p));
      localStorage.setItem(STORAGE_KEY, JSON.stringify(customOnly));
    } catch {
      // Ignore localStorage errors
    }
    return updated;
  }
  return current;
};
