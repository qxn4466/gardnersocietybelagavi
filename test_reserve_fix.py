# -*- coding: utf-8 -*-
"""Verify reserve works when master ids don't include 1 (the production bug)."""
import os, sys, tempfile

BACKEND = os.path.abspath('backend')
sys.path.insert(0, BACKEND)
os.chdir(tempfile.mkdtemp())

from fastapi.testclient import TestClient
from main import app
from database import SessionLocal
import models

# wipe the master and reseed with ids starting at 166 (like production)
db = SessionLocal()
db.query(models.Transaction).delete()
db.query(models.TransactionTypeMaster).delete()
db.add(models.TransactionTypeMaster(id=166, name='Pooja Expenses', cash_book_column='Sundary a/c', ledger_account='Pooja Expenses', entry_type='CREDIT', display_order=1))
db.commit()

client = TestClient(app)

r = client.post('/api/transactions/reference/reserve', json={'txn_date': '2026-11-14', 'entry_nature': 'CREDIT'})
print('reserve:', r.status_code, r.json())
assert r.status_code == 200, r.text
n = r.json()['reference_no']
print('number:', n)

# second session gets a different number
r2 = client.post('/api/transactions/reference/reserve', json={'txn_date': '2026-11-14', 'entry_nature': 'CREDIT'})
print('reserve B:', r2.status_code, r2.json()['reference_no'])
assert r2.json()['reference_no'] != n

# saving with the reserved number fills the placeholder
r3 = client.post('/api/transactions/', json={
    'date': '2026-11-14', 'customer_name': 'T', 'transaction_type_id': 166,
    'entry_nature': 'CREDIT', 'payment_mode': 'CASH', 'bill_no': n,
    'amount_rs': 100, 'created_by': 't', 'status': 'POSTED',
})
print('save:', r3.status_code, '| id:', r3.json()['id'], '| draft was:', r.json()['draft_id'])
assert r3.status_code == 201 and r3.json()['id'] == r.json()['draft_id']

for t in client.get('/api/transactions/').json():
    client.delete(f"/api/transactions/{t['id']}")

print('\nRESERVE FIX PASS')
