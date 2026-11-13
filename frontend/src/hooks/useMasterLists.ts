import { useCallback, useEffect, useState } from 'react';
import { fetchPesticideProducts, createPesticideProduct, fetchListOptions, createListOption } from '../api/client';
import { PESTICIDE_PRODUCT_LIST } from '../types';
import { getStoredProducts, addStoredProduct } from '../utils/productStore';

/**
 * Server-driven product master list (pesticide_product_master).
 * - Loads from the API on mount (merged with local inventory names so nothing is lost)
 * - addProduct() persists to the server, then refreshes so the new item shows everywhere
 */
export const useProductList = () => {
  const [productList, setProductList] = useState<string[]>(() => getStoredProducts());

  const refresh = useCallback(async () => {
    try {
      const server = await fetchPesticideProducts();
      const serverNames = (server || []).map((p: { name_en: string }) => p.name_en).filter(Boolean);
      setProductList(Array.from(new Set([...serverNames, ...PESTICIDE_PRODUCT_LIST, ...getStoredProducts()])));
    } catch {
      // Offline: keep the local list
    }
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);

  const addProduct = useCallback(async (name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const localList = addStoredProduct(trimmed);   // local merge (also fires its own POST)
    setProductList(prev => Array.from(new Set([...prev, trimmed, ...localList])));
    try {
      await createPesticideProduct(trimmed);       // idempotent on the server (dedupe by name)
      await refresh();                             // refresh so the new item is listed everywhere
    } catch {
      // Offline: the local list already includes the new item
    }
  }, [refresh]);

  return { productList, setProductList, addProduct, refresh };
};

/**
 * Generic persisted dropdown options (list_options_master) merged with static defaults.
 */
export const usePersistentOptions = (category: string, staticDefaults: string[]) => {
  const [options, setOptions] = useState<string[]>(staticDefaults);

  useEffect(() => {
    let alive = true;
    fetchListOptions(category)
      .then(server => {
        if (alive && Array.isArray(server)) {
          setOptions(Array.from(new Set([...staticDefaults, ...server])));
        }
      })
      .catch(() => {});
    return () => { alive = false; };
  }, [category]);

  const addOption = useCallback(async (raw: string) => {
    const name = raw.trim();
    if (!name) return;
    setOptions(prev => Array.from(new Set([...prev, name])));   // show immediately
    try {
      const server = await createListOption(category, name);    // persist + authoritative list back
      setOptions(Array.from(new Set([...staticDefaults, ...server])));
    } catch {
      // Offline: the local addition remains visible
    }
  }, [category]);

  return { options, addOption };
};
