import { PESTICIDE_PRODUCT_LIST } from '../types';
import { createPesticideProduct } from '../api/client';
import { getMarathiItem, phoneticTransliterate } from './translator';

const STORAGE_KEY = 'gardner_custom_pesticide_products';
const INVENTORY_PRODUCTS_KEY = 'bgs_inventory_products_v1';
const PURCHASES_KEY = 'bgs_inventory_purchases_v1';
const SALES_KEY = 'bgs_inventory_sales_v1';

export interface InventoryProduct {
  id: string;
  name: string;
  pack_size: string;
  selling_price: number;
  current_stock: number;
}

export interface PurchaseRecord {
  id: string;
  product_id: string;
  product_name: string;
  qty_purchased: number;
  purchase_price: number;
  date: string;
  total_cost: number;
}

export interface SalesRecord {
  id: string;
  product_id: string;
  product_name: string;
  qty_sold: number;
  selling_price: number;
  date: string;
  total_revenue: number;
}

const DEFAULT_INVENTORY_PRODUCTS: InventoryProduct[] = [
  { id: 'p1', name: 'Chlorpyrifos 20% EC', pack_size: '1 Ltr', selling_price: 480.00, current_stock: 50 },
  { id: 'p2', name: 'Imidacloprid 17.8% SL', pack_size: '250 ml', selling_price: 320.00, current_stock: 40 },
  { id: 'p3', name: 'Thiamethoxam 25% WG', pack_size: '100 gm', selling_price: 250.00, current_stock: 30 },
  { id: 'p4', name: 'Mancozeb 75% WP', pack_size: '1 Kg', selling_price: 390.00, current_stock: 60 },
  { id: 'p5', name: 'Glyphosate 41% SL', pack_size: '1 Ltr', selling_price: 550.00, current_stock: 25 },
  { id: 'p6', name: 'Neem Oil 1500 PPM', pack_size: '500 ml', selling_price: 210.00, current_stock: 45 },
];

/**
 * Get stored string product names list
 */
export const getStoredProducts = (): string[] => {
  const inv = getInventoryProducts();
  const names = inv.map(p => p.name);
  const merged = Array.from(new Set([...names, ...PESTICIDE_PRODUCT_LIST]));
  return merged;
};

/**
 * Add product name string to master list
 */
export const addStoredProduct = (newProduct: string, marathiName?: string): string[] => {
  if (!newProduct || !newProduct.trim()) return getStoredProducts();
  const trimmed = newProduct.trim();

  const marathiVal = marathiName && marathiName.trim()
    ? marathiName.trim()
    : (getMarathiItem(trimmed) !== trimmed ? getMarathiItem(trimmed) : phoneticTransliterate(trimmed));

  createPesticideProduct(trimmed, marathiVal).catch(() => {});

  const currentInv = getInventoryProducts();
  if (!currentInv.some(p => p.name.toLowerCase() === trimmed.toLowerCase())) {
    addOrUpdateInventoryProduct({
      id: 'p_' + Date.now(),
      name: trimmed,
      pack_size: '500 ml',
      selling_price: 250,
      current_stock: 20
    });
  }

  return getStoredProducts();
};

// ─── Inventory Management Core Functions ────────────────────────────────────

export const getInventoryProducts = (): InventoryProduct[] => {
  try {
    const raw = localStorage.getItem(INVENTORY_PRODUCTS_KEY);
    if (raw) {
      const parsed: InventoryProduct[] = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {
    // ignore
  }
  // Initialize default
  saveInventoryProducts(DEFAULT_INVENTORY_PRODUCTS);
  return DEFAULT_INVENTORY_PRODUCTS;
};

export const saveInventoryProducts = (products: InventoryProduct[]): void => {
  try {
    localStorage.setItem(INVENTORY_PRODUCTS_KEY, JSON.stringify(products));
  } catch {
    // ignore
  }
};

export const addOrUpdateInventoryProduct = (product: InventoryProduct): InventoryProduct[] => {
  const products = getInventoryProducts();
  const idx = products.findIndex(p => p.id === product.id || p.name.toLowerCase() === product.name.toLowerCase());
  if (idx >= 0) {
    products[idx] = { ...products[idx], ...product };
  } else {
    products.push(product);
  }
  saveInventoryProducts(products);
  return products;
};

// ─── Purchase Records (Increases Stock Automatically) ───────────────────────

export const getPurchaseRecords = (): PurchaseRecord[] => {
  try {
    const raw = localStorage.getItem(PURCHASES_KEY);
    if (raw) {
      const parsed: PurchaseRecord[] = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {
    // ignore
  }
  return [];
};

export const recordPurchase = (
  productId: string,
  qtyPurchased: number,
  purchasePrice: number,
  dateStr: string
): { success: boolean; message: string; updatedStock: number } => {
  const products = getInventoryProducts();
  const prod = products.find(p => p.id === productId || p.name === productId);
  if (!prod) {
    return { success: false, message: 'Product not found', updatedStock: 0 };
  }

  // 1. Stock increases automatically
  prod.current_stock += qtyPurchased;
  saveInventoryProducts(products);

  // 2. Log purchase record
  const newRecord: PurchaseRecord = {
    id: 'pur_' + Date.now(),
    product_id: prod.id,
    product_name: prod.name,
    qty_purchased: qtyPurchased,
    purchase_price: purchasePrice,
    date: dateStr,
    total_cost: qtyPurchased * purchasePrice
  };

  const purchases = getPurchaseRecords();
  purchases.unshift(newRecord);
  try {
    localStorage.setItem(PURCHASES_KEY, JSON.stringify(purchases));
  } catch {
    // ignore
  }

  return {
    success: true,
    message: `Purchase recorded successfully. Current stock of ${prod.name} increased to ${prod.current_stock}.`,
    updatedStock: prod.current_stock
  };
};

// ─── Sales Records (Decreases Stock Automatically) ──────────────────────────

export const getSalesRecords = (): SalesRecord[] => {
  try {
    const raw = localStorage.getItem(SALES_KEY);
    if (raw) {
      const parsed: SalesRecord[] = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {
    // ignore
  }
  return [];
};

export const recordSale = (
  productId: string,
  qtySold: number,
  sellingPrice: number,
  dateStr: string
): { success: boolean; message: string; updatedStock: number } => {
  const products = getInventoryProducts();
  const prod = products.find(p => p.id === productId || p.name === productId);
  if (!prod) {
    return { success: false, message: 'Product not found', updatedStock: 0 };
  }

  if (prod.current_stock < qtySold) {
    return {
      success: false,
      message: `Insufficient stock! Current stock for ${prod.name} is ${prod.current_stock}, but requested ${qtySold}.`,
      updatedStock: prod.current_stock
    };
  }

  // 1. Stock decreases automatically
  prod.current_stock -= qtySold;
  saveInventoryProducts(products);

  // 2. Log sales record
  const newRecord: SalesRecord = {
    id: 'sale_' + Date.now(),
    product_id: prod.id,
    product_name: prod.name,
    qty_sold: qtySold,
    selling_price: sellingPrice,
    date: dateStr,
    total_revenue: qtySold * sellingPrice
  };

  const sales = getSalesRecords();
  sales.unshift(newRecord);
  try {
    localStorage.setItem(SALES_KEY, JSON.stringify(sales));
  } catch {
    // ignore
  }

  return {
    success: true,
    message: `Sale recorded successfully. Current stock of ${prod.name} decreased to ${prod.current_stock}.`,
    updatedStock: prod.current_stock
  };
};
