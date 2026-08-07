import { PESTICIDE_PRODUCT_LIST } from '../types';
import { createPesticideProduct } from '../api/client';
import { getMarathiItem, phoneticTransliterate } from './translator';

const STORAGE_KEY = 'gardner_custom_pesticide_products';
const INVENTORY_PRODUCTS_KEY = 'bgs_inventory_products_v2';
const PURCHASES_KEY = 'bgs_inventory_purchases_v2';
const SALES_KEY = 'bgs_inventory_sales_v2';

export const STANDARD_PACK_SIZES = [
  '50 ml', '100 ml', '250 ml', '500 ml', '1 Ltr', '2 Ltr', '5 Ltr', '10 Ltr', '20 Ltr',
  '50 gm', '100 gm', '250 gm', '500 gm', '1 Kg', '5 Kg', '10 Kg', '25 Kg', '50 Kg',
  '1 Bottle', '1 Can', '1 Pkt', '1 Bag', '1 Box'
];

export const PRODUCT_CATEGORIES = [
  'Insecticide',
  'Fungicide',
  'Herbicide',
  'Bio-Pesticide',
  'Plant Growth Regulator (PGR)',
  'Fertilizer / Micronutrient',
  'Hybrid Seeds'
];

export interface InventoryProduct {
  id: string;
  name: string;
  category: string;
  batch_no: string;
  expiry_date: string;
  pack_size: string;
  purchase_price: number;
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

export const SAMPLE_INVENTORY_PRODUCTS: InventoryProduct[] = [
  { id: 'p1', name: 'Chlorpyrifos 20% EC', category: 'Insecticide', batch_no: 'CHL-2026-A1', expiry_date: '2027-12-31', pack_size: '1 Ltr', purchase_price: 380.00, selling_price: 480.00, current_stock: 45 },
  { id: 'p2', name: 'Imidacloprid 17.8% SL', category: 'Insecticide', batch_no: 'IMI-2026-B2', expiry_date: '2028-06-30', pack_size: '250 ml', purchase_price: 250.00, selling_price: 320.00, current_stock: 8 }, // 🟠 Low Stock
  { id: 'p3', name: 'Thiamethoxam 25% WG', category: 'Insecticide', batch_no: 'THI-2026-C3', expiry_date: '2027-09-30', pack_size: '100 gm', purchase_price: 180.00, selling_price: 250.00, current_stock: 0 }, // 🔴 Out of Stock
  { id: 'p4', name: 'Mancozeb 75% WP', category: 'Fungicide', batch_no: 'MAN-2026-D4', expiry_date: '2027-11-30', pack_size: '1 Kg', purchase_price: 310.00, selling_price: 390.00, current_stock: 60 },
  { id: 'p5', name: 'Glyphosate 41% SL', category: 'Herbicide', batch_no: 'GLY-2026-E5', expiry_date: '2028-03-31', pack_size: '1 Ltr', purchase_price: 430.00, selling_price: 550.00, current_stock: 5 }, // 🟠 Low Stock
  { id: 'p6', name: 'Neem Oil 1500 PPM', category: 'Bio-Pesticide', batch_no: 'NEE-2026-F6', expiry_date: '2027-05-31', pack_size: '500 ml', purchase_price: 150.00, selling_price: 210.00, current_stock: 50 },
  { id: 'p7', name: 'Hexaconazole 5% EC', category: 'Fungicide', batch_no: 'HEX-2026-G7', expiry_date: '2028-01-31', pack_size: '500 ml', purchase_price: 220.00, selling_price: 310.00, current_stock: 22 },
  { id: 'p8', name: 'Atrazine 50% WP', category: 'Herbicide', batch_no: 'ATR-2026-H8', expiry_date: '2027-10-31', pack_size: '500 gm', purchase_price: 190.00, selling_price: 270.00, current_stock: 0 }, // 🔴 Out of Stock
  { id: 'p9', name: 'Gibberellic Acid 0.001% L', category: 'Plant Growth Regulator (PGR)', batch_no: 'GIB-2026-I9', expiry_date: '2028-04-30', pack_size: '1 Ltr', purchase_price: 320.00, selling_price: 440.00, current_stock: 7 }, // 🟠 Low Stock
  { id: 'p10', name: 'Bio-NPK Liquid Fertilizer', category: 'Fertilizer / Micronutrient', batch_no: 'BIO-2026-J10', expiry_date: '2027-08-31', pack_size: '1 Ltr', purchase_price: 280.00, selling_price: 380.00, current_stock: 35 },
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
      category: 'Insecticide',
      batch_no: 'BAT-' + Date.now().toString().slice(-4),
      expiry_date: '2027-12-31',
      pack_size: '500 ml',
      purchase_price: 180,
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
  saveInventoryProducts(SAMPLE_INVENTORY_PRODUCTS);
  return SAMPLE_INVENTORY_PRODUCTS;
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

export const deleteInventoryProduct = (id: string): InventoryProduct[] => {
  const products = getInventoryProducts().filter(p => p.id !== id);
  saveInventoryProducts(products);
  return products;
};

// ─── Seed & Delete Test Data ────────────────────────────────────────────────

export const seedInventoryTestData = (): { productsCount: number; message: string } => {
  saveInventoryProducts(SAMPLE_INVENTORY_PRODUCTS);

  const samplePurchases: PurchaseRecord[] = [
    { id: 'pur_1', product_id: 'p1', product_name: 'Chlorpyrifos 20% EC', qty_purchased: 50, purchase_price: 380, date: '2026-08-01', total_cost: 19000 },
    { id: 'pur_2', product_id: 'p2', product_name: 'Imidacloprid 17.8% SL', qty_purchased: 20, purchase_price: 250, date: '2026-08-02', total_cost: 5000 },
    { id: 'pur_3', product_id: 'p4', product_name: 'Mancozeb 75% WP', qty_purchased: 70, purchase_price: 310, date: '2026-08-03', total_cost: 21700 },
  ];

  const sampleSales: SalesRecord[] = [
    { id: 'sale_1', product_id: 'p1', product_name: 'Chlorpyrifos 20% EC', qty_sold: 5, selling_price: 480, date: '2026-08-04', total_revenue: 2400 },
    { id: 'sale_2', product_id: 'p2', product_name: 'Imidacloprid 17.8% SL', qty_sold: 12, selling_price: 320, date: '2026-08-05', total_revenue: 3840 },
    { id: 'sale_3', product_id: 'p3', product_name: 'Thiamethoxam 25% WG', qty_sold: 30, selling_price: 250, date: '2026-08-06', total_revenue: 7500 },
  ];

  try {
    localStorage.setItem(PURCHASES_KEY, JSON.stringify(samplePurchases));
    localStorage.setItem(SALES_KEY, JSON.stringify(sampleSales));
  } catch {
    // ignore
  }

  return {
    productsCount: SAMPLE_INVENTORY_PRODUCTS.length,
    message: `Successfully seeded ${SAMPLE_INVENTORY_PRODUCTS.length} inventory products (with In Stock, Low Stock, and Out of Stock records)!`
  };
};

export const clearInventoryTestData = (): { message: string } => {
  try {
    localStorage.removeItem(INVENTORY_PRODUCTS_KEY);
    localStorage.removeItem(PURCHASES_KEY);
    localStorage.removeItem(SALES_KEY);
  } catch {
    // ignore
  }
  return {
    message: 'Inventory test data cleared successfully.'
  };
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

  // Stock increases automatically
  prod.current_stock += qtyPurchased;
  saveInventoryProducts(products);

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

  // Stock decreases automatically
  prod.current_stock -= qtySold;
  saveInventoryProducts(products);

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
