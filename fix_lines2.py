# -*- coding: utf-8 -*-
"""Finish RentBillForm rework + remove stray session import lines."""
import io, sys

def load(p):
    with io.open(p, 'r', encoding='utf-8', newline='') as f:
        return f.read().split('\r\n')

def save(p, lines):
    with io.open(p, 'w', encoding='utf-8', newline='') as f:
        f.write('\r\n'.join(lines))

# ── CreditAccountForm: remove the stray session import line ──
p = 'frontend/src/pages/CreditAccountForm.tsx'
lines = load(p)
idx = [i for i, l in enumerate(lines) if 'getSessionId' in l or 'utils/session' in l]
print('credit form stray lines:', [(i + 1, lines[i].strip()) for i in idx])
for i in sorted(idx, reverse=True):
    del lines[i]
save(p, lines)
print('OK credit form cleaned')

# ── RentBillForm ──
p = 'frontend/src/components/cashier/RentBillForm.tsx'
lines = load(p)

# show current lease-related lines for the log
for i, l in enumerate(lines):
    if 'releaseEditLock' in l or 'getSessionId' in l or 'fetchRentNextReference' in l:
        print('  current', i + 1, repr(l[:110]))

# 1) import swap
old_imp = "fetchNextRentInvoiceNo, fetchRentNextReference, createRentBill, updateRentBill, fetchRentBills, deleteRentBill, generate30DaysCashierTestData, delete30DaysCashierTestData, acquireEditLock, releaseEditLock"
new_imp = "fetchNextRentInvoiceNo, createRentBill, updateRentBill, fetchRentBills, deleteRentBill, generate30DaysCashierTestData, delete30DaysCashierTestData, reserveRentReference, releaseRentReference"
idx = [i for i, l in enumerate(lines) if old_imp in l]
if len(idx) != 1:
    print(f'FAIL import swap: {len(idx)}'); sys.exit(1)
lines[idx[0]] = lines[idx[0]].replace(old_imp, new_imp)
print('OK import swap')

# 2) drop session import line if present
for i, l in enumerate(lines):
    if 'getSessionId' in l:
        print('   dropping session import line', i + 1, repr(l[:80]))
        del lines[i]
        break

# 3) generatedRef state after billNo
i = [k for k, l in enumerate(lines) if 'const [billNo, setBillNo]' in l]
if len(i) != 1:
    print(f'FAIL state: {len(i)}'); sys.exit(1)
lines.insert(i[0] + 1, "  const [generatedRef, setGeneratedRef] = useState<string | null>(null);")
print('OK state')

# 4) generate -> reserve (3 lines: res/setBillNo/setMsg)
i = [k for k, l in enumerate(lines) if 'await fetchRentNextReference(' in l]
if len(i) != 1:
    print(f'FAIL generate: {len(i)}'); sys.exit(1)
lines[i[0]:i[0] + 3] = [
    "      const res = await reserveRentReference(date);",
    "      setGeneratedRef(res.reference_no);",
    "      setBillNo(res.reference_no);",
    "      setMsg({ type: 'success', text: (lang === 'mr' ? 'बिल क्र. तयार केला व राखीव ठेवला: ' : 'Bill/Voucher No. generated and reserved: ') + res.reference_no });",
]
print('OK generate -> reserve')

# 5) drop openRentBillForEdit wrapper
s = [k for k, l in enumerate(lines) if 'One member edits a rent bill at a time' in l]
e = [k for k, l in enumerate(lines) if 'const handleEdit = (b: RentBill) => {' in l]
if len(s) != 1 or len(e) != 1 or e[0] <= s[0]:
    print(f'FAIL wrapper: {s} {e}'); sys.exit(1)
del lines[s[0]:e[0]]
print('OK wrapper removed')

# 6) callers
i = [k for k, l in enumerate(lines) if 'void openRentBillForEdit(row)' in l]
if len(i) != 1:
    print(f'FAIL row caller: {len(i)}'); sys.exit(1)
lines[i[0]] = lines[i[0]].replace('void openRentBillForEdit(row)', 'handleEdit(row)')
print('OK row caller')
i = [k for k, l in enumerate(lines) if 'void openRentBillForEdit(match);' in l]
if len(i) != 1:
    print(f'FAIL match caller: {len(i)}'); sys.exit(1)
lines[i[0]] = '        handleEdit(match);'
print('OK match caller')

# 7) two identical releaseEditLock lines -> first = consume, second = handleReset block
rel = [k for k, l in enumerate(lines) if "void releaseEditLock('rent_bill', editingId" in l]
print('releaseEditLock lines at:', [k + 1 for k in rel])
if len(rel) != 2:
    print(f'FAIL releases: {len(rel)}'); sys.exit(1)
first, second = rel[0], rel[1]
lines[first] = '        setGeneratedRef(null);'
lines[second:second + 1] = [
    "    if (billNo && !editingId) {",
    "      void releaseRentReference(billNo).catch(() => {});",
    "    }",
    "    setGeneratedRef(null);",
]
print('OK releases rewired')

# 8) create path consumes reservation
i = [k for k, l in enumerate(lines) if 'const created = await createRentBill(payload);' in l]
if len(i) != 1:
    print(f'FAIL create: {len(i)}'); sys.exit(1)
lines.insert(i[0] + 1, "        setGeneratedRef(null);")
print('OK create consume')

save(p, lines)
print('RENTBILL COMPLETE')
