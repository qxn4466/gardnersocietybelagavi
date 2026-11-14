# -*- coding: utf-8 -*-
"""Remove lease/session code; wire Generate->reserve and Reset->release. Contains-based."""
import io, sys

def load(p):
    with io.open(p, 'r', encoding='utf-8', newline='') as f:
        return f.read().split('\r\n')

def save(p, lines):
    with io.open(p, 'w', encoding='utf-8', newline='') as f:
        f.write('\r\n'.join(lines))

def replace_line(lines, old_frag, new_line, label):
    idx = [i for i, l in enumerate(lines) if old_frag in l]
    if len(idx) != 1:
        print(f'FAIL {label}: {len(idx)} matches')
        sys.exit(1)
    lines[idx[0]] = new_line
    print(f'OK   {label}')

def drop_lines_containing(lines, frag, label):
    before = len(lines)
    lines[:] = [l for l in lines if frag not in l]
    removed = before - len(lines)
    print(f'OK   {label} (removed {removed} line(s) containing {frag!r})')

def replace_block(lines, start_frag, count, new_lines, label):
    idx = [i for i, l in enumerate(lines) if start_frag in l]
    if len(idx) != 1:
        print(f'FAIL {label}: {len(idx)} matches')
        sys.exit(1)
    lines[idx[0]:idx[0] + count] = new_lines
    print(f'OK   {label}')

def drop_block(lines, start_frag, end_frag, label):
    s = [i for i, l in enumerate(lines) if start_frag in l]
    e = [i for i, l in enumerate(lines) if end_frag in l]
    if len(s) != 1 or len(e) != 1 or e[0] <= s[0]:
        print(f'FAIL {label}: start={s} end={e}')
        sys.exit(1)
    del lines[s[0]:e[0]]
    print(f'OK   {label} (removed {e[0]-s[0]} lines)')

# ═══ CreditAccountForm ═══
p = 'frontend/src/pages/CreditAccountForm.tsx'
lines = load(p)

replace_line(lines, '  acquireEditLock,', '  reserveTransactionReference,', 'import acquire -> reserve')
replace_line(lines, '  releaseEditLock,', '  releaseTransactionReference,', 'import release -> release')
drop_lines_containing(lines, "getSessionId } from", 'session import (credit)')

i = [k for k, l in enumerate(lines) if 'const [attachments, setAttachments]' in l]
if len(i) != 1:
    print('FAIL state anchor'); sys.exit(1)
lines.insert(i[0] + 1, "  const [generatedRef, setGeneratedRef] = useState<{ nature: 'CREDIT' | 'DEBIT'; number: string } | null>(null);")
print('OK   generatedRef state')

replace_line(lines, "await fetchNextReference(form.date, form.entry_nature, getSessionId())",
             "await reserveTransactionReference(form.date, form.entry_nature)", 'generate -> reserve')
replace_line(lines, "setAlert({ type: 'success', msg: `${form.entry_nature === 'CREDIT' ? 'Bill' : 'Voucher'} number ${reference_no} generated.` });",
             "setGeneratedRef({ nature: form.entry_nature, number: reference_no });\r\n      setAlert({ type: 'success', msg: `${form.entry_nature === 'CREDIT' ? 'Bill' : 'Voucher'} number ${reference_no} generated and reserved.` });",
             'generate sets generatedRef')

replace_block(lines, "void acquireEditLock('transaction', editingDraftId", 4,
              ["        setGeneratedRef(null);"], 'handleSave lease removal')

replace_line(lines, "void releaseEditLock('transaction', editingDraftId, user?.username || 'unknown', getSessionId()).catch(() => {});",
             "if (generatedRef) {\r\n      void releaseTransactionReference(generatedRef.number, generatedRef.nature).catch(() => {});\r\n    }\r\n    setGeneratedRef(null);",
             'handleReset release')

drop_block(lines, 'One member edits a record at a time', 'Load draft/transaction into form for editing', 'openForEdit removed')
replace_line(lines, 'onClick={() => void openForEdit(txn)}', 'onClick={() => loadDraftIntoForm(txn)}', 'history edit caller')
replace_line(lines, 'onClick={() => void openForEdit(d)}', 'onClick={() => loadDraftIntoForm(d)}', 'drafts modal caller')
replace_line(lines, 'void openForEdit(t);', 'loadDraftIntoForm(t);', 'url-param caller')

save(p, lines)

# ═══ RentBillForm ═══
p = 'frontend/src/components/cashier/RentBillForm.tsx'
lines = load(p)

old_import = "fetchNextRentInvoiceNo, fetchRentNextReference, createRentBill, updateRentBill, fetchRentBills, deleteRentBill, generate30DaysCashierTestData, delete30DaysCashierTestData, acquireEditLock, releaseEditLock"
new_import = "fetchNextRentInvoiceNo, createRentBill, updateRentBill, fetchRentBills, deleteRentBill, generate30DaysCashierTestData, delete30DaysCashierTestData, reserveRentReference, releaseRentReference"
replace_line(lines, old_import, new_import, 'import swap')
drop_lines_containing(lines, "getSessionId } from", 'session import (rent)')

i = [k for k, l in enumerate(lines) if 'const [billNo, setBillNo]' in l]
if len(i) != 1:
    print('FAIL state anchor'); sys.exit(1)
lines.insert(i[0] + 1, "  const [generatedRef, setGeneratedRef] = useState<string | null>(null);")
print('OK   generatedRef state')

i = [k for k, l in enumerate(lines) if 'await fetchRentNextReference(date, getSessionId())' in l]
if len(i) != 1:
    print(f'FAIL generate anchor: {len(i)}'); sys.exit(1)
lines[i[0]:i[0] + 3] = [
    "      const res = await reserveRentReference(date);",
    "      setGeneratedRef(res.reference_no);",
    "      setBillNo(res.reference_no);",
    "      setMsg({ type: 'success', text: (lang === 'mr' ? 'बिल क्र. तयार केला व राखीव ठेवला: ' : 'Bill/Voucher No. generated and reserved: ') + res.reference_no });",
]
print('OK   generate -> reserve')

s = [k for k, l in enumerate(lines) if 'One member edits a rent bill at a time' in l]
e = [k for k, l in enumerate(lines) if 'const handleEdit = (b: RentBill) => {' in l]
if len(s) != 1 or len(e) != 1 or e[0] <= s[0]:
    print(f'FAIL wrapper: start={s} end={e}'); sys.exit(1)
del lines[s[0]:e[0]]
print('OK   openRentBillForEdit removed')

replace_line(lines, 'onClick={() => void openRentBillForEdit(row)}', 'onClick={() => handleEdit(row)}', 'history edit caller')
replace_line(lines, 'void openRentBillForEdit(match);', 'handleEdit(match);', 'url-param caller')

replace_line(lines, "void releaseEditLock('rent_bill', editingId, user?.username || 'unknown', getSessionId()).catch(() => {});",
             "setGeneratedRef(null);", 'update consume (first occurrence)')

i = [k for k, l in enumerate(lines) if "void releaseEditLock('rent_bill', editingId" in l]
if len(i) != 1:
    print(f'FAIL handleReset release: {len(i)}'); sys.exit(1)
lines[i[0]:i[0] + 1] = [
    "    if (billNo && !editingId) {",
    "      void releaseRentReference(billNo).catch(() => {});",
    "    }",
    "    setGeneratedRef(null);",
]
print('OK   handleReset release')

i = [k for k, l in enumerate(lines) if 'const created = await createRentBill(payload);' in l]
if len(i) != 1:
    print(f'FAIL create anchor: {len(i)}'); sys.exit(1)
lines.insert(i[0] + 1, "        setGeneratedRef(null);")
print('OK   create consume')

save(p, lines)
print('FRONTEND LINE-FIX COMPLETE')
