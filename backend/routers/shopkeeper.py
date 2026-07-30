from typing import List, Optional
from datetime import date
from decimal import Decimal
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from database import get_db
from models import ShopSellingRateEntry, ShopTaxInvoice, ShopRetailBill, PesticideSaleEntry
from schemas import (
    ShopSellingRateCreate, ShopSellingRateOut,
    ShopTaxInvoiceCreate, ShopTaxInvoiceOut,
    ShopRetailBillCreate, ShopRetailBillOut,
    PesticideSaleEntryCreate, PesticideSaleEntryOut,
    ShopkeeperAuditSummary
)

router = APIRouter(prefix="/shopkeeper", tags=["shopkeeper"])


# ─── Number Generator Helpers ────────────────────────────────────────────────

def generate_shop_invoice_no(db: Session, v_date: date) -> str:
    year_str = v_date.strftime("%Y")
    prefix = f"STX-{year_str}-"
    count = db.query(ShopTaxInvoice).filter(ShopTaxInvoice.invoice_no.like(f"{prefix}%")).count()
    return f"{prefix}{count + 1:04d}"


def generate_shop_retail_bill_no(db: Session, v_date: date) -> str:
    year_str = v_date.strftime("%Y")
    prefix = f"SRB-{year_str}-"
    count = db.query(ShopRetailBill).filter(ShopRetailBill.bill_no.like(f"{prefix}%")).count()
    return f"{prefix}{count + 1:04d}"



# ─── Numbering Endpoints ─────────────────────────────────────────────────────

@router.get("/next-tax-invoice-no")
def get_next_tax_invoice_no(v_date: Optional[str] = None, db: Session = Depends(get_db)):
    d = date.fromisoformat(v_date) if v_date else date.today()
    return {"invoice_no": generate_shop_invoice_no(db, d)}


@router.get("/next-retail-bill-no")
def get_next_retail_bill_no(v_date: Optional[str] = None, db: Session = Depends(get_db)):
    d = date.fromisoformat(v_date) if v_date else date.today()
    return {"bill_no": generate_shop_retail_bill_no(db, d)}


# ─── 1. Selling Rate Book ────────────────────────────────────────────────────

@router.get("/selling-rate-entries", response_model=List[ShopSellingRateOut])
def get_selling_rate_entries(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    db: Session = Depends(get_db)
):
    query = db.query(ShopSellingRateEntry)
    if start_date:
        query = query.filter(ShopSellingRateEntry.date >= date.fromisoformat(start_date))
    if end_date:
        query = query.filter(ShopSellingRateEntry.date <= date.fromisoformat(end_date))
    return query.order_by(ShopSellingRateEntry.created_at.desc()).all()


@router.post("/selling-rate-entries", response_model=ShopSellingRateOut, status_code=201)
def create_selling_rate_entry(payload: ShopSellingRateCreate, db: Session = Depends(get_db)):
    record = ShopSellingRateEntry(
        date=payload.date,
        name=payload.name,
        particulars=payload.particulars,
        qty=payload.qty,
        amount=payload.amount,
        sgst=payload.sgst,
        cgst=payload.cgst,
        hmall=payload.hmall,
        motor_rent=payload.motor_rent,
        total_amount=payload.total_amount,
        net_rate=payload.net_rate,
        selling_rate=payload.selling_rate,
        stock_book_no=payload.stock_book_no,
        sign_status=payload.sign_status or "Signed",
        created_by=payload.created_by
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return record


@router.delete("/selling-rate-entries/{id}")
def delete_selling_rate_entry(id: int, db: Session = Depends(get_db)):
    record = db.query(ShopSellingRateEntry).filter(ShopSellingRateEntry.id == id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Selling rate entry not found")
    db.delete(record)
    db.commit()
    return {"message": "Selling rate entry deleted successfully"}


# ─── 2. Shop Tax Invoices ────────────────────────────────────────────────────

@router.get("/tax-invoices", response_model=List[ShopTaxInvoiceOut])
def get_shop_tax_invoices(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    db: Session = Depends(get_db)
):
    query = db.query(ShopTaxInvoice)
    if start_date:
        query = query.filter(ShopTaxInvoice.date >= date.fromisoformat(start_date))
    if end_date:
        query = query.filter(ShopTaxInvoice.date <= date.fromisoformat(end_date))
    return query.order_by(ShopTaxInvoice.created_at.desc()).all()


@router.post("/tax-invoices", response_model=ShopTaxInvoiceOut, status_code=201)
def create_shop_tax_invoice(payload: ShopTaxInvoiceCreate, db: Session = Depends(get_db)):
    inv_no = payload.invoice_no or generate_shop_invoice_no(db, payload.date)
    record = ShopTaxInvoice(
        invoice_no=inv_no,
        date=payload.date,
        customer_name=payload.customer_name,
        customer_phone=payload.customer_phone,
        product_name=payload.product_name,
        hsn_code=payload.hsn_code or "3808",
        qty=payload.qty,
        rate=payload.rate,
        amount=payload.amount,
        created_by=payload.created_by
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return record


@router.delete("/tax-invoices/{id}")
def delete_shop_tax_invoice(id: int, db: Session = Depends(get_db)):
    record = db.query(ShopTaxInvoice).filter(ShopTaxInvoice.id == id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Shop tax invoice not found")
    db.delete(record)
    db.commit()
    return {"message": "Shop tax invoice deleted successfully"}


# ─── 3. Retail Cash Bills (PPO / INSAT / BLG/48) ─────────────────────────────

@router.get("/retail-bills", response_model=List[ShopRetailBillOut])
def get_shop_retail_bills(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    db: Session = Depends(get_db)
):
    query = db.query(ShopRetailBill)
    if start_date:
        query = query.filter(ShopRetailBill.date >= date.fromisoformat(start_date))
    if end_date:
        query = query.filter(ShopRetailBill.date <= date.fromisoformat(end_date))
    return query.order_by(ShopRetailBill.created_at.desc()).all()


@router.post("/retail-bills", response_model=ShopRetailBillOut, status_code=201)
def create_shop_retail_bill(payload: ShopRetailBillCreate, db: Session = Depends(get_db)):
    b_no = payload.bill_no or generate_shop_retail_bill_no(db, payload.date)
    record = ShopRetailBill(
        bill_no=b_no,
        date=payload.date,
        tin_no=payload.tin_no or "29540268502",
        customer_name=payload.customer_name,
        particulars=payload.particulars,
        rate=payload.rate,
        amount=payload.amount,
        seller_signature=payload.seller_signature or "Seller Signed",
        created_by=payload.created_by
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return record


@router.delete("/retail-bills/{id}")
def delete_shop_retail_bill(id: int, db: Session = Depends(get_db)):
    record = db.query(ShopRetailBill).filter(ShopRetailBill.id == id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Retail bill not found")
    db.delete(record)
    db.commit()
    return {"message": "Retail bill deleted successfully"}


# ─── 4. Pesticide Sale Register ──────────────────────────────────────────────

@router.get("/pesticide-sales", response_model=List[PesticideSaleEntryOut])
def get_pesticide_sales(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    db: Session = Depends(get_db)
):
    query = db.query(PesticideSaleEntry)
    if start_date:
        query = query.filter(PesticideSaleEntry.date >= date.fromisoformat(start_date))
    if end_date:
        query = query.filter(PesticideSaleEntry.date <= date.fromisoformat(end_date))
    return query.order_by(PesticideSaleEntry.created_at.desc()).all()


@router.post("/pesticide-sales", response_model=PesticideSaleEntryOut, status_code=201)
def create_pesticide_sale(payload: PesticideSaleEntryCreate, db: Session = Depends(get_db)):
    record = PesticideSaleEntry(
        date=payload.date,
        customer_name=payload.customer_name,
        product_name=payload.product_name,
        qty=payload.qty,
        rate=payload.rate,
        amount=payload.amount,
        batch_no=payload.batch_no,
        remarks=payload.remarks,
        created_by=payload.created_by
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return record


@router.delete("/pesticide-sales/{id}")
def delete_pesticide_sale(id: int, db: Session = Depends(get_db)):
    record = db.query(PesticideSaleEntry).filter(PesticideSaleEntry.id == id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Pesticide sale entry not found")
    db.delete(record)
    db.commit()
    return {"message": "Pesticide sale entry deleted successfully"}


# ─── 5. Shopkeeper Audit Summary ──────────────────────────────────────────────

@router.get("/audit-summary", response_model=ShopkeeperAuditSummary)
def get_shopkeeper_audit_summary(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    db: Session = Depends(get_db)
):
    s_date = date.fromisoformat(start_date) if start_date else date(date.today().year, 1, 1)
    e_date = date.fromisoformat(end_date) if end_date else date.today()

    sr_query = db.query(ShopSellingRateEntry).filter(ShopSellingRateEntry.date >= s_date, ShopSellingRateEntry.date <= e_date)
    stx_query = db.query(ShopTaxInvoice).filter(ShopTaxInvoice.date >= s_date, ShopTaxInvoice.date <= e_date)
    srb_query = db.query(ShopRetailBill).filter(ShopRetailBill.date >= s_date, ShopRetailBill.date <= e_date)
    pest_query = db.query(PesticideSaleEntry).filter(PesticideSaleEntry.date >= s_date, PesticideSaleEntry.date <= e_date)

    sr_count = sr_query.count()
    sr_sum = db.query(func.coalesce(func.sum(ShopSellingRateEntry.total_amount), 0)).filter(ShopSellingRateEntry.date >= s_date, ShopSellingRateEntry.date <= e_date).scalar()

    stx_count = stx_query.count()
    stx_sum = db.query(func.coalesce(func.sum(ShopTaxInvoice.amount), 0)).filter(ShopTaxInvoice.date >= s_date, ShopTaxInvoice.date <= e_date).scalar()

    srb_count = srb_query.count()
    srb_sum = db.query(func.coalesce(func.sum(ShopRetailBill.amount), 0)).filter(ShopRetailBill.date >= s_date, ShopRetailBill.date <= e_date).scalar()

    pest_count = pest_query.count()
    pest_sum = db.query(func.coalesce(func.sum(PesticideSaleEntry.amount), 0)).filter(PesticideSaleEntry.date >= s_date, PesticideSaleEntry.date <= e_date).scalar()

    grand_total = Decimal(str(sr_sum)) + Decimal(str(stx_sum)) + Decimal(str(srb_sum)) + Decimal(str(pest_sum))

    return ShopkeeperAuditSummary(
        start_date=s_date.isoformat(),
        end_date=e_date.isoformat(),
        total_selling_rate_entries_count=sr_count,
        total_selling_rate_amount=Decimal(str(sr_sum)),
        total_tax_invoices_count=stx_count,
        total_tax_invoice_amount=Decimal(str(stx_sum)),
        total_retail_bills_count=srb_count,
        total_retail_bill_amount=Decimal(str(srb_sum)),
        total_pesticide_sales_count=pest_count,
        total_pesticide_sale_amount=Decimal(str(pest_sum)),
        grand_shop_sales_total=grand_total
    )
