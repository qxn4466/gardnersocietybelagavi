# -*- coding: utf-8 -*-
"""Remove edit-lease blocking & reservations. New design: Generate persists a placeholder
row immediately; Save fills/updates the row matching the Bill/Voucher No."""
import io, sys

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

# ═══ 1. models.py: drop EditLock + NumberReservation ═══
patch('backend/models.py', [(
'''class EditLock(Base):
    """Advisory edit lease — one member/browser edits a record at a time (5-min TTL, stealable)."""
    __tablename__ = "edit_locks"

    id = Column(Integer, primary_key=True, index=True)
    entity_type = Column(String(30), nullable=False, index=True)  # "transaction" | "rent_bill"
    entity_id = Column(Integer, nullable=False, index=True)
    locked_by = Column(String(100), nullable=False)               # display name
    session_id = Column(String(64), nullable=True, index=True)    # per-browser identity
    locked_at = Column(DateTime, nullable=False, default=func.now())
    __table_args__ = (UniqueConstraint("entity_type", "entity_id", name="uq_edit_lock_entity"),)


class NumberReservation(Base):
    """Short-lived reservation of a generated B.No./V.No. so two members never see the same preview."""
    __tablename__ = "number_reservations"

    id = Column(Integer, primary_key=True, index=True)
    kind = Column(String(40), nullable=False, index=True)   # "rent_bill" | "txn_credit" | "txn_debit"
    number = Column(String(50), nullable=False, index=True)
    session_id = Column(String(64), nullable=False, index=True)
    created_at = Column(DateTime, nullable=False, default=func.now())
    __table_args__ = (UniqueConstraint("kind", "number", name="uq_number_reservation"),)
''',
'')])

# ═══ 2. schemas.py: drop edit-lock schemas ═══
patch('backend/schemas.py', [(
'''class EditLockRequest(BaseModel):
    entity_type: str
    entity_id: int
    locked_by: str = "unknown"
    session_id: Optional[str] = ""


class EditLockStatus(BaseModel):
    locked: bool                 # True = BLOCKED (someone else holds a fresh lease)
    locked_by: Optional[str] = None
    locked_at: Optional[datetime] = None
    seconds_remaining: int = 0
''',
'')])

# ═══ 3. numbering.py: drop reservations (keep lock + ensure_free) ═══
with io.open('backend/numbering.py', 'r', encoding='utf-8', newline='') as f:
    num_content = f.read()
marker = '\n\n# ─── Preview number reservations'
cut = num_content.find(marker)
if cut == -1:
    print('FAIL numbering.py: reservation section not found')
    sys.exit(1)
with io.open('backend/numbering.py', 'w', encoding='utf-8', newline='') as f:
    f.write(num_content[:cut] + '\r\n')
print('OK   backend/numbering.py (reservations removed)')

# ═══ 4. main.py: unregister edit-locks router ═══
patch('backend/main.py', [
(
'''from routers import masters, transactions, cashbook, ledger, auth, customers, translations, cashier, shopkeeper, meeting_notice, audit_reports, edit_locks
''',
'''from routers import masters, transactions, cashbook, ledger, auth, customers, translations, cashier, shopkeeper, meeting_notice, audit_reports
'''),
(
'''app.include_router(audit_reports.router, prefix="/api")
app.include_router(edit_locks.router, prefix="/api")
''',
'''app.include_router(audit_reports.router, prefix="/api")
'''),
])

# ═══ 5. delete the router file ═══
import os
if os.path.exists('backend/routers/edit_locks.py'):
    os.remove('backend/routers/edit_locks.py')
    print('OK   backend/routers/edit_locks.py (deleted)')

# ═══ 6. transactions.py ═══
patch('backend/routers/transactions.py', [
# imports
(
'''from datetime import date
''',
'''from datetime import date, datetime, timedelta
'''),
(
'''from sqlalchemy import func
''',
'''from sqlalchemy import func, and_
'''),
(
'''from models import Transaction, TransactionTypeMaster, CashScrollBookEntry, EditLock, NumberReservation
''',
'''from models import Transaction, TransactionTypeMaster, CashScrollBookEntry
'''),
(
'''from numbering import acquire_numbering_lock, ensure_free, reserve_sequential
''',
'''from numbering import acquire_numbering_lock, ensure_free
'''),
# next-reference -> reserve + release endpoints
(
'''@router.get("/next-reference")
def get_next_reference(
    txn_date: Optional[str] = None,
    entry_nature: str = "CREDIT",
    session_id: Optional[str] = None,
    db: Session = Depends(get_db),
):
    """Preview the next financial-year Bill or Voucher serial number.
    The number is reserved for this browser session, so two members never get the same one."""
    nature = entry_nature.upper()
    if nature not in {"CREDIT", "DEBIT"}:
        raise HTTPException(status_code=400, detail="entry_nature must be CREDIT or DEBIT")
    txn_date_value = date.fromisoformat(txn_date) if txn_date else date.today()
    column = Transaction.bill_no if nature == "CREDIT" else Transaction.voucher_no
    number = reserve_sequential(
        db,
        kind=f"txn_{nature.lower()}",
        session_id=session_id or "",
        start=generate_reference_no(db, txn_date_value, nature),
        is_taken=lambda n: db.query(Transaction.id).filter(column == n).first() is not None,
    )
    return {"reference_no": number}
''',
'''@router.post("/reference/reserve")
def reserve_reference(payload: dict, db: Session = Depends(get_db)):
    """Generate the next B.No./V.No. and IMMEDIATELY persist a DRAFT placeholder row so the
    number is consumed and unique. Saving later fills/updates the row matching the number."""
    nature = str(payload.get("entry_nature", "CREDIT")).upper()
    if nature not in {"CREDIT", "DEBIT"}:
        raise HTTPException(status_code=400, detail="entry_nature must be CREDIT or DEBIT")
    d_raw = payload.get("txn_date")
    d = date.fromisoformat(d_raw) if d_raw else date.today()

    acquire_numbering_lock(db)

    # purge stale reserved placeholders (older than 24 h)
    stale_cutoff = datetime.utcnow() - timedelta(hours=24)
    db.query(Transaction).filter(
        Transaction.status == "DRAFT",
        Transaction.customer_name == "(reserved)",
        Transaction.created_at < stale_cutoff,
    ).delete(synchronize_session=False)
    db.commit()

    column = Transaction.bill_no if nature == "CREDIT" else Transaction.voucher_no

    def taken(n: str) -> bool:
        return db.query(Transaction.id).filter(column == n).first() is not None

    number = generate_reference_no(db, d, nature)
    guard = 0
    while taken(number) and guard < 200:
        number = generate_reference_no(db, d, nature)
        guard += 1

    memo_no = generate_cash_memo_no(db, d)
    txn = Transaction(
        date=d,
        cash_memo_no=memo_no,
        bill_no=number if nature == "CREDIT" else None,
        voucher_no=number if nature == "DEBIT" else None,
        customer_name="(reserved)",
        transaction_type_id=1,
        entry_nature=nature,
        amount_rs=Decimal("0"),
        amount_ps=Decimal("0"),
        status="DRAFT",
        created_by="reference-reservation",
    )
    db.add(txn)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="Numbering conflict — please click Generate again.")
    return {"reference_no": number, "draft_id": txn.id}


@router.post("/reference/release")
def release_reference(payload: dict, db: Session = Depends(get_db)):
    """Remove an unused reserved placeholder (called on Reset)."""
    number = str(payload.get("number") or "").strip()
    nature = str(payload.get("entry_nature", "CREDIT")).upper()
    if number:
        column = Transaction.bill_no if nature == "CREDIT" else Transaction.voucher_no
        db.query(Transaction).filter(
            column == number,
            Transaction.status == "DRAFT",
            Transaction.customer_name == "(reserved)",
        ).delete(synchronize_session=False)
        db.commit()
    return {"released": True}
'''),
# create_transaction: placeholder match
(
'''    if nature == "CREDIT" and bill_no:
        bill_no = ensure_free(db, Transaction, Transaction.bill_no, bill_no,
                              lambda: generate_reference_no(db, payload.date, "CREDIT"))
    if nature == "DEBIT" and voucher_no:
        voucher_no = ensure_free(db, Transaction, Transaction.voucher_no, voucher_no,
                                 lambda: generate_reference_no(db, payload.date, "DEBIT"))

    txn = Transaction(
''',
'''    # If this Bill/Voucher No. was generated earlier, a DRAFT placeholder row already
    # exists — fill/update THAT row instead of creating a new one.
    placeholder = None
    if nature == "CREDIT" and payload.bill_no:
        placeholder = db.query(Transaction).filter(
            Transaction.bill_no == payload.bill_no,
            Transaction.status == "DRAFT",
        ).first()
    if nature == "DEBIT" and payload.voucher_no:
        placeholder = db.query(Transaction).filter(
            Transaction.voucher_no == payload.voucher_no,
            Transaction.status == "DRAFT",
        ).first()

    if placeholder:
        placeholder.date = payload.date
        placeholder.customer_id = payload.customer_id
        placeholder.mobile_no = payload.mobile_no
        placeholder.customer_name = payload.customer_name
        placeholder.particulars = payload.particulars
        placeholder.transaction_type_id = tt.id if tt else type_id
        placeholder.entry_nature = nature
        placeholder.amount_rs = payload.amount_rs
        placeholder.amount_ps = payload.amount_ps
        placeholder.payment_mode = (payload.payment_mode or "CASH").upper()
        placeholder.attachments = payload.attachments
        placeholder.remarks = payload.remarks
        placeholder.created_by = payload.created_by
        placeholder.status = payload.status or "POSTED"
        txn = placeholder
        db.flush()
        if (txn.status or "POSTED") == "POSTED":
            post_transaction_to_cash_scroll(db, txn)
        try:
            db.commit()
        except IntegrityError:
            db.rollback()
            raise HTTPException(status_code=409, detail="Could not save — please retry.")
        db.refresh(txn)
        return txn

    if nature == "CREDIT" and bill_no:
        bill_no = ensure_free(db, Transaction, Transaction.bill_no, bill_no,
                              lambda: generate_reference_no(db, payload.date, "CREDIT"))
    if nature == "DEBIT" and voucher_no:
        voucher_no = ensure_free(db, Transaction, Transaction.voucher_no, voucher_no,
                                 lambda: generate_reference_no(db, payload.date, "DEBIT"))

    txn = Transaction(
'''),
# create_transaction tail: drop reservation cleanup
(
'''    used_ref = bill_no if nature == "CREDIT" else voucher_no
    if used_ref:
        db.query(NumberReservation).filter(
            NumberReservation.kind == f"txn_{nature.lower()}",
            NumberReservation.number == used_ref,
        ).delete(synchronize_session=False)
        db.commit()
    db.refresh(txn)
    return txn
''',
'''    db.refresh(txn)
    return txn
'''),
# update_transaction: consume placeholder when the number matches one
(
'''    txn.status = payload.status or "POSTED"

    db.commit()
''',
'''    txn.status = payload.status or "POSTED"

    # If the new Bill/Voucher No. came from a Generate reservation, consume its placeholder
    ref_value = txn.bill_no if (txn.entry_nature or "CREDIT").upper() == "CREDIT" else txn.voucher_no
    if ref_value:
        ref_column = Transaction.bill_no if (txn.entry_nature or "CREDIT").upper() == "CREDIT" else Transaction.voucher_no
        db.query(Transaction).filter(
            ref_column == ref_value,
            Transaction.status == "DRAFT",
            Transaction.id != txn.id,
            Transaction.customer_name == "(reserved)",
        ).delete(synchronize_session=False)

    db.commit()
'''),
# delete_transaction: drop edit-lock cleanup
(
'''    db.query(CashScrollBookEntry).filter(
        CashScrollBookEntry.voucher_no == txn.cash_memo_no
    ).delete(synchronize_session=False)
    db.query(EditLock).filter(
        EditLock.entity_type == "transaction",
        EditLock.entity_id == txn_id,
    ).delete(synchronize_session=False)
    db.delete(txn)
    db.commit()
''',
'''    db.query(CashScrollBookEntry).filter(
        CashScrollBookEntry.voucher_no == txn.cash_memo_no
    ).delete(synchronize_session=False)
    db.delete(txn)
    db.commit()
'''),
# list_transactions: hide reserved placeholders
(
'''    q = db.query(Transaction)
''',
'''    q = db.query(Transaction).filter(
        ~and_(
            Transaction.status == "DRAFT",
            Transaction.customer_name == "(reserved)",
        )
    )
'''),
# get_drafts: hide reserved placeholders
(
'''        .filter(Transaction.status == "DRAFT")
''',
'''        .filter(
            Transaction.status == "DRAFT",
            Transaction.customer_name != "(reserved)",
        )
'''),
])

# ═══ 7. cashier.py ═══
patch('backend/routers/cashier.py', [
# imports
(
'''from sqlalchemy import func
''',
'''from sqlalchemy import func, or_
'''),
(
'''from models import (
    NumberReservation,
''',
'''from models import (
'''),
(
'''from numbering import acquire_numbering_lock, ensure_free, reserve_sequential
''',
'''from numbering import acquire_numbering_lock, ensure_free
'''),
# rent-next-reference (GET, session-based) -> reserve + release endpoints
(
'''@router.get("/rent-next-reference")
def get_rent_next_reference(
    v_date: Optional[str] = None,
    session_id: Optional[str] = None,
    db: Session = Depends(get_db),
):
    """Preview the next financial-year Bill/Voucher serial for rent bills.
    The number is reserved for this browser session, so two members never get the same one."""
    d = date.fromisoformat(v_date) if v_date else date.today()
    number = reserve_sequential(
        db,
        kind="rent_bill",
        session_id=session_id or "",
        start=generate_rent_reference_no(db, d),
        is_taken=lambda n: db.query(RentBill.id).filter(RentBill.bill_no == n).first() is not None,
    )
    return {"reference_no": number}
''',
'''@router.post("/rent-reference/reserve")
def reserve_rent_reference(payload: dict, db: Session = Depends(get_db)):
    """Generate the next B.No./V.No. and IMMEDIATELY persist a DRAFT placeholder rent bill
    row so the number is consumed and unique. Saving later fills the matching row."""
    acquire_numbering_lock(db)

    d_raw = payload.get("v_date")
    d = date.fromisoformat(d_raw) if d_raw else date.today()

    # purge stale reserved placeholders (older than 24 h)
    stale_cutoff = datetime.utcnow() - timedelta(hours=24)
    db.query(RentBill).filter(
        RentBill.status == "DRAFT",
        RentBill.consignee_name == "",
        RentBill.created_at < stale_cutoff,
    ).delete(synchronize_session=False)
    db.commit()

    def taken(n: str) -> bool:
        return db.query(RentBill.id).filter(RentBill.bill_no == n).first() is not None

    bill_no = generate_rent_reference_no(db, d)
    guard = 0
    while taken(bill_no) and guard < 200:
        bill_no = generate_rent_reference_no(db, d)
        guard += 1

    inv_no = generate_rent_invoice_no(db, d)
    while db.query(RentBill.id).filter(RentBill.invoice_no == inv_no).first() is not None:
        inv_no = generate_rent_invoice_no(db, d)

    record = RentBill(
        invoice_no=inv_no,
        bill_no=bill_no,
        date=d,
        consignee_name="",
        status="DRAFT",
        gst_rate=Decimal("0"),
        qty=Decimal("0"),
        rate=Decimal("0"),
        amount=Decimal("0"),
        igst_amount=Decimal("0"),
        sgst_amount=Decimal("0"),
        cgst_amount=Decimal("0"),
        total_amount=Decimal("0"),
    )
    db.add(record)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="Numbering conflict — please click Generate again.")
    return {"reference_no": bill_no, "invoice_no": inv_no}


@router.post("/rent-reference/release")
def release_rent_reference(payload: dict, db: Session = Depends(get_db)):
    """Remove an unused reserved placeholder (called on Reset)."""
    bill_no = str(payload.get("bill_no") or "").strip()
    if bill_no:
        db.query(RentBill).filter(
            RentBill.bill_no == bill_no,
            RentBill.status == "DRAFT",
            RentBill.consignee_name == "",
        ).delete(synchronize_session=False)
        db.commit()
    return {"released": True}
'''),
# create_rent_bill: placeholder match
(
'''def create_rent_bill(payload: RentBillCreate, db: Session = Depends(get_db)):
    acquire_numbering_lock(db)
    inv_no = payload.invoice_no or generate_rent_invoice_no(db, payload.date)
    inv_no = ensure_free(db, RentBill, RentBill.invoice_no, inv_no,
                         lambda: generate_rent_invoice_no(db, payload.date))
    bill_no_final = ensure_free(db, RentBill, RentBill.bill_no, payload.bill_no,
                                lambda: generate_rent_reference_no(db, payload.date)) if payload.bill_no else None
    record = RentBill(
        invoice_no=inv_no,
        bill_no=bill_no_final,
        date=payload.date,
''',
'''def create_rent_bill(payload: RentBillCreate, db: Session = Depends(get_db)):
    acquire_numbering_lock(db)

    # If this Bill/Voucher No. was generated earlier, a DRAFT placeholder row already
    # exists — fill/update THAT row instead of creating a new one.
    placeholder = None
    if payload.bill_no:
        placeholder = db.query(RentBill).filter(
            RentBill.bill_no == payload.bill_no,
            RentBill.status == "DRAFT",
        ).first()

    inv_no = payload.invoice_no or generate_rent_invoice_no(db, payload.date)
    if not placeholder:
        inv_no = ensure_free(db, RentBill, RentBill.invoice_no, inv_no,
                             lambda: generate_rent_invoice_no(db, payload.date))

    is_cheque = (payload.payment_mode or "CASH").upper() == "CHEQUE"
    rec_amt = payload.total_amount if not is_cheque else Decimal("0.00")
    cheque_amt = payload.total_amount if is_cheque else Decimal("0.00")

    if placeholder:
        placeholder.invoice_no = inv_no
        placeholder.date = payload.date
        placeholder.consignee_name = payload.consignee_name
        placeholder.consignee_address = payload.consignee_address
        placeholder.particulars = payload.particulars
        placeholder.hsn_sac = payload.hsn_sac or "997212"
        placeholder.gst_rate = payload.gst_rate
        placeholder.qty = payload.qty
        placeholder.rate = payload.rate
        placeholder.per = payload.per or "Month"
        placeholder.amount = payload.amount
        placeholder.igst_amount = payload.igst_amount
        placeholder.sgst_amount = payload.sgst_amount
        placeholder.cgst_amount = payload.cgst_amount
        placeholder.total_amount = payload.total_amount
        placeholder.tax_amount_words = payload.tax_amount_words
        placeholder.payment_mode = payload.payment_mode or "CASH"
        placeholder.cheque_no = payload.cheque_no
        placeholder.cheque_date = payload.cheque_date
        placeholder.bank_name = payload.bank_name
        placeholder.created_by = payload.created_by
        placeholder.status = payload.status or "POSTED"
        record = placeholder
        db.flush()
    else:
        record = RentBill(
            invoice_no=inv_no,
            bill_no=payload.bill_no,
            date=payload.date,
'''),
# constructor tail + scroll: adjust closers and voucher_no
(
'''        created_by=payload.created_by,
        status=payload.status or "POSTED"
    )
    db.add(record)

    # ── Auto-Post to Cash Scroll Book ──────────────────────────────────────────
    is_cheque = (payload.payment_mode or "CASH").upper() == "CHEQUE"
    rec_amt = payload.total_amount if not is_cheque else Decimal("0.00")
    cheque_amt = payload.total_amount if is_cheque else Decimal("0.00")

    scroll_entry = CashScrollBookEntry(
        date=payload.date,
        voucher_no=(bill_no_final or inv_no),
''',
'''            created_by=payload.created_by,
            status=payload.status or "POSTED"
        )
        db.add(record)

    # ── Auto-Post to Cash Scroll Book (only when the bill is being posted) ─────
    if (payload.status or "POSTED") != "DRAFT":
        scroll_entry = CashScrollBookEntry(
            date=payload.date,
            voucher_no=(payload.bill_no or inv_no),
            from_received_paid=f"Rent Bill: {payload.consignee_name}",
            received_amount=rec_amt,
            paid_amount=Decimal("0.00"),
            cheque_amount=cheque_amt,
            created_by=payload.created_by
        )
        db.add(scroll_entry)

        # ── Auto-Post to Cheque Issue Book if Cheque Mode ──────────────────────
        if is_cheque and payload.cheque_no:
            cheque_entry = ChequeIssueBookEntry(
                issue_date=payload.cheque_date or payload.date,
                name_to_whom_issued=payload.consignee_name,
                cheque_no=payload.cheque_no,
                amount_rs=payload.total_amount,
                remarks=payload.particulars or f"Rent Bill {inv_no}",
                created_by=payload.created_by
            )
            db.add(cheque_entry)

        # ── Auto-Post to Main Transactions Table ───────────────────────────────
        sync_transaction_for_cashier_voucher(
            db=db,
            memo_no=inv_no,
            bill_no=payload.bill_no,
            v_date=payload.date,
            customer_name=payload.consignee_name,
            particulars=f"Rent Bill: {payload.particulars or 'Building Rent'}",
            nature="CREDIT",
            total_amount=payload.total_amount,
            remarks=f"Rent Invoice {inv_no}",
            created_by=payload.created_by,
            target_account_name="Rent"
        )
'''),
# old scroll/cheque/sync bodies + commit: remove originals
(
'''        from_received_paid=f"Rent Bill: {payload.consignee_name}",
        received_amount=rec_amt,
        paid_amount=Decimal("0.00"),
        cheque_amount=cheque_amt,
        created_by=payload.created_by
    )
    db.add(scroll_entry)

    # ── Auto-Post to Cheque Issue Book if Cheque Mode ──────────────────────────
    if is_cheque and payload.cheque_no:
        cheque_entry = ChequeIssueBookEntry(
            issue_date=payload.cheque_date or payload.date,
            name_to_whom_issued=payload.consignee_name,
            cheque_no=payload.cheque_no,
            amount_rs=payload.total_amount,
            remarks=payload.particulars or f"Rent Bill {inv_no}",
            created_by=payload.created_by
        )
        db.add(cheque_entry)

    # ── Auto-Post to Main Transactions Table (Updates Credit Book & General Ledger)
    sync_transaction_for_cashier_voucher(
        db=db,
        memo_no=inv_no,
        bill_no=bill_no_final,
        v_date=payload.date,
        customer_name=payload.consignee_name,
        particulars=f"Rent Bill: {payload.particulars or 'Building Rent'}",
        nature="CREDIT",
        total_amount=payload.total_amount,
        remarks=f"Rent Invoice {inv_no}",
        created_by=payload.created_by,
        target_account_name="Rent"
    )

    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="Numbering conflict with another user — please save again.")
    if bill_no_final:
        db.query(NumberReservation).filter(
            NumberReservation.kind == "rent_bill",
            NumberReservation.number == bill_no_final,
        ).delete(synchronize_session=False)
        db.commit()
    db.refresh(record)
    return record
''',
'''    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="Numbering conflict with another user — please save again.")
    db.refresh(record)
    return record
'''),
# get_rent_bills: hide placeholders
(
'''    query = db.query(RentBill)
''',
'''    query = db.query(RentBill).filter(
        or_(
            RentBill.status != "DRAFT",
            RentBill.consignee_name != "",
        )
    )
'''),
# update_rent_bill: consume placeholder when the number matches one
(
'''        db.query(Transaction).filter(
            Transaction.cash_memo_no == record.invoice_no
        ).update({"bill_no": payload.bill_no}, synchronize_session=False)
''',
'''        db.query(Transaction).filter(
            Transaction.cash_memo_no == record.invoice_no
        ).update({"bill_no": payload.bill_no}, synchronize_session=False)
        db.query(RentBill).filter(
            RentBill.bill_no == payload.bill_no,
            RentBill.status == "DRAFT",
            RentBill.consignee_name == "",
            RentBill.id != record.id,
        ).delete(synchronize_session=False)
'''),
])

print('BACKEND REWORK APPLIED')
