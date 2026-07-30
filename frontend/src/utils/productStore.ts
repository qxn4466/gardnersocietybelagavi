import { PESTICIDE_PRODUCT_LIST } from '../types';
import { createPesticideProduct } from '../api/client';
import { getMarathiItem, phoneticTransliterate } from './translator';

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
 * Add a new product to stored product list AND save both English & Marathi names in backend DB!
 */
export const addStoredProduct = (newProduct: string, marathiName?: string): string[] => {
  if (!newProduct || !newProduct.trim()) return getStoredProducts();
  const trimmed = newProduct.trim();

  // Determine Marathi translation
  const marathiVal = marathiName && marathiName.trim()
    ? marathiName.trim()
    : (getMarathiItem(trimmed) !== trimmed ? getMarathiItem(trimmed) : phoneticTransliterate(trimmed));

  // Save to backend database asynchronously
  createPesticideProduct(trimmed, marathiVal).catch(err => {
    console.warn("Failed to persist product to DB:", err);
  });

  const current = getStoredProducts();
  if (!current.some(p => p.toLowerCase() === trimmed.toLowerCase())) {
    const updated = [...current, trimmed];
    try {
      // Store custom additions in localStorage as well
      const customOnly = updated.filter(p => !PESTICIDE_PRODUCT_LIST.includes(p));
      localStorage.setItem(STORAGE_KEY, JSON.stringify(customOnly));
    } catch {
      // Ignore localStorage errors
    }
    return updated;
  }
  return current;
};
