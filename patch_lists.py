# -*- coding: utf-8 -*-
"""Persist every 'Add New' dropdown item: server-driven product lists + generic options master."""
import io, re, sys

def T(s):
    return s.replace('\r\n', '\n').replace('\n', '\r\n')

def patch(path, edits):
    with io.open(path, 'r', encoding='utf-8', newline='') as f:
        content = f.read()
    for i, (old, new) in enumerate(edits):
        o, n = T(old), T(new)
        cnt = content.count(o)
        if cnt != 1:
            print(f'FAIL {path} edit#{i}: found {cnt} matches')
            sys.exit(1)
        content = content.replace(o, n)
    with io.open(path, 'w', encoding='utf-8', newline='') as f:
        f.write(content)
    print(f'OK   {path} ({len(edits)} edits)')

def rex(path, content, pattern, repl, expected, label):
    new_content, n = re.subn(pattern, repl, content, flags=re.S)
    if n != expected:
        print(f'FAIL {path} regex[{label}]: expected {expected}, replaced {n}')
        sys.exit(1)
    print(f'OK   {path} regex[{label}]: {n} replacements')
    return new_content

def load(p):
    with io.open(p, 'r', encoding='utf-8', newline='') as f:
        return f.read()

def save(p, c):
    with io.open(p, 'w', encoding='utf-8', newline='') as f:
        f.write(c)

# ══ 1. Backend: ListOptionMaster model ══
patch('backend/models.py', [(
'''class AccountMaster(Base):
    __tablename__ = "account_master"

    id = Column(Integer, primary_key=True, index=True)
    account_name = Column(String(100), nullable=False, unique=True)
''',
'''class AccountMaster(Base):
    __tablename__ = "account_master"

    id = Column(Integer, primary_key=True, index=True)
    account_name = Column(String(100), nullable=False, unique=True)


class ListOptionMaster(Base):
    """Generic persisted dropdown options (rent categories, voucher particulars, ...)."""
    __tablename__ = "list_options_master"

    id = Column(Integer, primary_key=True, index=True)
    category = Column(String(50), nullable=False, index=True)   # e.g. "rent", "receipt", "payment"
    name = Column(String(200), nullable=False)
    created_at = Column(DateTime, server_default=func.now())
''')])

# ══ 2. Backend: schema ══
patch('backend/schemas.py', [(
'''class TransactionTypeCreate(BaseModel):
    name: str
    entry_type: Optional[str] = "CREDIT"  # "CREDIT", "DEBIT" or "BOTH"
''',
'''class TransactionTypeCreate(BaseModel):
    name: str
    entry_type: Optional[str] = "CREDIT"  # "CREDIT", "DEBIT" or "BOTH"


class ListOptionCreate(BaseModel):
    category: str
    name: str
''')])

# ══ 3. Backend: masters endpoints ══
patch('backend/routers/masters.py', [
(
'''from models import OfficeMaster, TransactionTypeMaster, AccountMaster
''',
'''from models import OfficeMaster, TransactionTypeMaster, AccountMaster, ListOptionMaster
'''),
(
'''from schemas import OfficeMasterOut, TransactionTypeOut, TransactionTypeCreate, AccountMasterOut
''',
'''from schemas import OfficeMasterOut, TransactionTypeOut, TransactionTypeCreate, AccountMasterOut, ListOptionCreate
'''),
(
'''    db.add(new_type)
    db.commit()
    db.refresh(new_type)
    return new_type
''',
'''    db.add(new_type)
    db.commit()
    db.refresh(new_type)
    return new_type


@router.get("/options", response_model=List[str])
def get_list_options(category: str, db: Session = Depends(get_db)):
    """Persisted dropdown options for a category (e.g. rent, receipt, payment particulars)."""
    rows = (
        db.query(ListOptionMaster)
        .filter(ListOptionMaster.category == category)
        .order_by(ListOptionMaster.name.asc())
        .all()
    )
    return [r.name for r in rows]


@router.post("/options", response_model=List[str])
def create_list_option(payload: ListOptionCreate, db: Session = Depends(get_db)):
    """Persist a new dropdown option so it appears in the list for every user after refresh."""
    category = (payload.category or "").strip()
    name = (payload.name or "").strip()
    if not category or not name:
        raise HTTPException(status_code=400, detail="category and name are required")

    existing = (
        db.query(ListOptionMaster)
        .filter(
            ListOptionMaster.category == category,
            func.lower(ListOptionMaster.name) == name.lower(),
        )
        .first()
    )
    if not existing:
        db.add(ListOptionMaster(category=category, name=name))
        db.commit()

    rows = (
        db.query(ListOptionMaster)
        .filter(ListOptionMaster.category == category)
        .order_by(ListOptionMaster.name.asc())
        .all()
    )
    return [r.name for r in rows]
'''),
])

# ══ 4. Frontend API client ══
patch('frontend/src/api/client.ts', [(
'''export const createPesticideProduct = (name_en: string, name_mr?: string, category?: string): Promise<DBProductItem> =>
  api.post('/shopkeeper/products', { name_en, name_mr, category }).then(r => r.data);
''',
'''export const createPesticideProduct = (name_en: string, name_mr?: string, category?: string): Promise<DBProductItem> =>
  api.post('/shopkeeper/products', { name_en, name_mr, category }).then(r => r.data);

// Generic persisted dropdown options (rent categories, voucher particulars, ...)
export const fetchListOptions = (category: string): Promise<string[]> =>
  api.get('/masters/options', { params: { category } }).then(r => r.data);

export const createListOption = (category: string, name: string): Promise<string[]> =>
  api.post('/masters/options', { category, name }).then(r => r.data);
''')])

# ══ 5. New hooks file ══
with io.open('frontend/src/hooks/useMasterLists.ts', 'w', encoding='utf-8', newline='') as f:
    f.write(T('''import { useCallback, useEffect, useState } from 'react';
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
'''))
print('OK   frontend/src/hooks/useMasterLists.ts (created)')

# ══ 6. Shop forms: server-driven product list ══
SHOP_FILES = {
    'frontend/src/components/shopkeeper/PesticideSaleRegisterForm.tsx': {
        'store_import_old': "import { getStoredProducts, addStoredProduct, recordSale } from '../../utils/productStore';",
        'store_import_new': "import { recordSale } from '../../utils/productStore';",
        'adds': 3,
    },
    'frontend/src/components/shopkeeper/SellingRateBookForm.tsx': {
        'store_import_old': "import { getStoredProducts, addStoredProduct } from '../../utils/productStore';\n",
        'store_import_new': "",
        'adds': 5,
    },
    'frontend/src/components/shopkeeper/ShopRetailBillForm.tsx': {
        'store_import_old': "import { getStoredProducts, addStoredProduct, recordSale } from '../../utils/productStore';",
        'store_import_new': "import { recordSale } from '../../utils/productStore';",
        'adds': 5,
    },
    'frontend/src/components/shopkeeper/ShopTaxInvoiceForm.tsx': {
        'store_import_old': "import { getStoredProducts, addStoredProduct, recordSale } from '../../utils/productStore';",
        'store_import_new': "import { recordSale } from '../../utils/productStore';",
        'adds': 5,
    },
}

for path, cfg in SHOP_FILES.items():
    content = load(path)
    # (a) productStore import
    o, n = T(cfg['store_import_old']), T(cfg['store_import_new'])
    if content.count(o) != 1:
        print(f'FAIL {path} store-import: {content.count(o)}')
        sys.exit(1)
    content = content.replace(o, n)
    # (b) hook import after SearchableCombobox import
    anchor = "import SearchableCombobox from '../SearchableCombobox';"
    if content.count(anchor) != 1:
        print(f'FAIL {path} combobox-import anchor: {content.count(anchor)}')
        sys.exit(1)
    content = content.replace(anchor, anchor + "\nimport { useProductList } from '../../hooks/useMasterLists';")
    # (c) state init -> hook
    init_old = T('  const [productList, setProductList] = useState<string[]>(getStoredProducts());')
    init_new = T('  const { productList, addProduct } = useProductList();')
    if content.count(init_old) != 1:
        print(f'FAIL {path} init: {content.count(init_old)}')
        sys.exit(1)
    content = content.replace(init_old, init_new)
    # (d) addStoredProduct patterns -> addProduct
    pattern = r'const updatedList = addStoredProduct\((newProd(?:\.trim\(\))?|row\.particulars\.trim\(\)|row\.product_name\.trim\(\))\);(\s*)setProductList\(updatedList\);'
    content, n = re.subn(pattern, r'void addProduct(\1);', content, flags=re.S)
    if n != cfg['adds']:
        print(f'FAIL {path} addPattern: expected {cfg["adds"]}, got {n}')
        sys.exit(1)
    save(path, content)
    print(f'OK   {path} (import+init+{n} add-sites)')

# ══ 7. Cashier forms: persisted particulars ══
CASHIER = [
    ('frontend/src/components/cashier/RentBillForm.tsx', 'RENT_PARTICULARS_OPTIONS', 'rent_particulars', 'addRentOption', 2),
    ('frontend/src/components/cashier/ReceiptVoucherForm.tsx', 'RECEIPT_PARTICULARS_OPTIONS', 'receipt_particulars', 'addReceiptOption', 2),
    ('frontend/src/components/cashier/PaymentVoucherForm.tsx', 'PAYMENT_PARTICULARS_OPTIONS', 'payment_particulars', 'addPaymentOption', 2),
]

for path, static_const, category, fn_name, expected in CASHIER:
    content = load(path)
    # (a) hook import after SearchableCombobox import
    anchor = "import SearchableCombobox from '../SearchableCombobox';"
    if content.count(anchor) != 1:
        print(f'FAIL {path} combobox-import anchor: {content.count(anchor)}')
        sys.exit(1)
    content = content.replace(anchor, anchor + "\nimport { usePersistentOptions } from '../hooks/useMasterLists';")
    # (b) state -> hook
    state_old = T(f'  const [particularsOptions, setParticularsOptions] = useState<string[]>({static_const});')
    state_new = T(f"  const {{ options: particularsOptions, addOption: {fn_name} }} = usePersistentOptions('{category}', {static_const});")
    if content.count(state_old) != 1:
        print(f'FAIL {path} state: {content.count(state_old)}')
        sys.exit(1)
    content = content.replace(state_old, state_new)
    # (c) combobox onAddNewOption handlers (2 per file, varying indentation)
    pattern = r'onAddNewOption=\{newOpt => \{\s*if \(!particularsOptions\.includes\(newOpt\)\) \{\s*setParticularsOptions\(\[\.\.\.particularsOptions, newOpt\]\);\s*\}\s*\}\}'
    content, n = re.subn(pattern, f'onAddNewOption={{newOpt => {{ void {fn_name}(newOpt); }}}}', content, flags=re.S)
    if n != expected:
        print(f'FAIL {path} comboboxes: expected {expected}, got {n}')
        sys.exit(1)
    # (d) addCustomParticular inner block
    inner_old = T('''      if (!particularsOptions.includes(trimmed)) {
        setParticularsOptions([...particularsOptions, trimmed]);
        setParticularsSelect(trimmed);
      }
''')
    inner_new = T(f'''      void {fn_name}(trimmed);
      setParticularsSelect(trimmed);
''')
    if content.count(inner_old) == 1:
        content = content.replace(inner_old, inner_new)
        inner_replaced = True
    else:
        # PaymentVoucher variant without setParticularsSelect
        inner_old2 = T('''      if (!particularsOptions.includes(trimmed)) {
        setParticularsOptions([...particularsOptions, trimmed]);
      }
''')
        inner_new2 = T(f'''      void {fn_name}(trimmed);
''')
        if content.count(inner_old2) == 1:
            content = content.replace(inner_old2, inner_new2)
            inner_replaced = True
        else:
            print(f'FAIL {path} addCustomParticular: {content.count(inner_old)}/{content.count(inner_old2)}')
            sys.exit(1)
    save(path, content)
    print(f'OK   {path} (hook+state+{n} comboboxes+prompt-handler)')

print('ALL LIST-PERSISTENCE PATCHES APPLIED')
