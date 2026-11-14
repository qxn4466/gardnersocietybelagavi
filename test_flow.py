# -*- coding: utf-8 -*-
"""End-to-end test: Generate reserves a placeholder row; Save fills it; Reset releases it."""
import os, sys, tempfile

BACKEND = os.path.abspath('backend')
sys.path.insert(0, BACKEND)
os.chdir(tempfile.mkdtemp())

from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

# 1) Generate in browser A -> reserves 0001
r1 = client.post('/api/transactions/reference/reserve', json={'txn_date': '2026-11-14', 'entry_nature': 'CREDIT'})
print('1) reserve A:', r1.status_code, r1.json())
n1, draft1 = r1.json()['reference_no'], r1.json()['draft_id']

# 2) Generate in browser B -> must get a DIFFERENT number
r2 = client.post('/api/transactions/reference/reserve', json={'txn_date': '2026-11-14', 'entry_nature': 'CREDIT'})
print('2) reserve B:', r2.status_code, r2.json())
assert r2.json()['reference_no'] != n1, 'two sessions got the same number!'
n2 = r2.json()['reference_no']

# 3) Save in browser A (bill_no = 0001) -> must FILL the placeholder row (same id)
payload = {
    'date': '2026-11-14', 'customer_name': 'Test Member', 'particulars': 'Rent',
    'transaction_type_id': 1, 'entry_nature': 'CREDIT', 'payment_mode': 'CASH',
    'bill_no': n1, 'amount_rs': 500, 'amount_ps': 0, 'created_by': 'smoke', 'status': 'POSTED',
}
r3 = client.post('/api/transactions/', json=payload)
print('3) save A:', r3.status_code)
assert r3.status_code == 201
saved = r3.json()
print('   saved id:', saved['id'], '| draft row id was:', draft1, '| same row:', saved['id'] == draft1)
assert saved['id'] == draft1, 'placeholder row was not reused!'

# 4) No duplicates, no leftover placeholders
txns = client.get('/api/transactions/', params={'start_date': '2026-11-01', 'end_date': '2026-11-30'}).json()
with_ref = [t for t in txns if t['bill_no'] == n1]
reserved = [t for t in txns if t['customer_name'] == '(reserved)']
print('4) transactions with bill_no 0001:', len(with_ref), '| leftover reserved placeholders:', len(reserved))
assert len(with_ref) == 1 and len(reserved) == 0

# 5) Browser B saves with its number
payload['bill_no'] = n2
r4 = client.post('/api/transactions/', json=payload)
print('5) save B:', r4.status_code, '| id:', r4.json()['id'])
assert r4.status_code == 201

# 6) Reset: reserve then release an unused number
r5 = client.post('/api/transactions/reference/reserve', json={'txn_date': '2026-11-14', 'entry_nature': 'CREDIT'})
n3, draft3 = r5.json()['reference_no'], r5.json()['draft_id']
r6 = client.post('/api/transactions/reference/release', json={'number': n3, 'entry_nature': 'CREDIT'})
print('6) release unused:', r6.status_code, r6.json())
gone = client.get(f'/api/transactions/{draft3}')
print('   placeholder after release:', gone.status_code, '(404 = removed)')
assert gone.status_code == 404

# 7) Rent bill flow: reserve -> save fills placeholder -> history + scroll show bill no
r7 = client.post('/api/cashier/rent-reference/reserve', json={'v_date': '2026-11-14'})
print('7) rent reserve:', r7.status_code, r7.json())
rn = r7.json()['reference_no']
rent_payload = {
    'date': '2026-11-14', 'invoice_no': r7.json()['invoice_no'], 'bill_no': rn,
    'consignee_name': 'Rentee One', 'particulars': 'Stall Rent', 'gst_rate': 18,
    'qty': 1, 'rate': 1000, 'per': 'Month', 'amount': 1000,
    'igst_amount': 0, 'sgst_amount': 90, 'cgst_amount': 90, 'total_amount': 1180,
    'payment_mode': 'CASH', 'created_by': 'smoke', 'status': 'POSTED',
}
r8 = client.post('/api/cashier/rent-bills', json=rent_payload)
print('8) rent save:', r8.status_code, '| bill_no:', r8.json().get('bill_no'))
assert r8.status_code == 201 and r8.json().get('bill_no') == rn
bills = client.get('/api/cashier/rent-bills', params={'start_date': '2026-11-01', 'end_date': '2026-11-30'}).json()
print('   rent bills visible:', len(bills), '| first bill_no:', bills[0]['bill_no'])
assert len(bills) == 1 and bills[0]['bill_no'] == rn
scroll = client.get('/api/cashier/cash-scroll-entries', params={'start_date': '2026-11-01', 'end_date': '2026-11-30'}).json()
mine = [s for s in scroll if s['voucher_no'] == rn]
print('   scroll entry with bill no as voucher:', len(mine), mine[0]['received_amount'] if mine else None)
assert len(mine) == 1

# cleanup test rows
for t in client.get('/api/transactions/', params={'start_date': '2026-11-01', 'end_date': '2026-11-30'}).json():
    client.delete(f"/api/transactions/{t['id']}")
for b in bills:
    client.delete(f"/api/cashier/rent-bills/{b['id']}")

print('\nFLOW TEST PASS')
