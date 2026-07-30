from typing import List, Optional
from datetime import date
from decimal import Decimal
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from database import get_db
from models import ShopSellingRateEntry, ShopTaxInvoice, ShopRetailBill, PesticideSaleEntry, PesticideProductMaster
from schemas import (
    ShopSellingRateCreate, ShopSellingRateOut,
    ShopTaxInvoiceCreate, ShopTaxInvoiceOut,
    ShopRetailBillCreate, ShopRetailBillOut,
    PesticideSaleEntryCreate, PesticideSaleEntryOut,
    ShopkeeperAuditSummary, PesticideProductCreate, PesticideProductOut
)

router = APIRouter(prefix="/shopkeeper", tags=["shopkeeper"])


PESTICIDE_KEYWORDS = [
    "pesticide", "boric acid", "chlorpyrifos", "monocrotophos", "mancozeb",
    "neem oil", "malathion", "copper oxychloride", "carbendazim", "imidacloprid",
    "cypermethrin", "spray pump", "nozzle", "acid"
]


def check_and_auto_post_pesticide(
    db: Session,
    date_val: date,
    customer_name: str,
    prod_name: str,
    qty_val: Decimal,
    rate_val: Decimal,
    amt_val: Decimal,
    source_ref: str,
    created_by: Optional[str]
):
    lowered = prod_name.lower()
    if any(k in lowered for k in PESTICIDE_KEYWORDS):
        pest_entry = PesticideSaleEntry(
            date=date_val,
            customer_name=customer_name,
            product_name=prod_name,
            qty=qty_val,
            rate=rate_val,
            amount=amt_val,
            remarks=f"Auto-posted from {source_ref}",
            created_by=created_by
        )
        db.add(pest_entry)


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

    # ── Auto-Post to Pesticide Sale Register if Pesticide ──────────────────────
    check_and_auto_post_pesticide(
        db=db,
        date_val=payload.date,
        customer_name=payload.name,
        prod_name=payload.particulars,
        qty_val=payload.qty,
        rate_val=payload.selling_rate or payload.net_rate,
        amt_val=payload.total_amount,
        source_ref="Selling Rate Book",
        created_by=payload.created_by
    )

    db.commit()
    db.refresh(record)
    return record


@router.put("/selling-rate-entries/{id}", response_model=ShopSellingRateOut)
def update_selling_rate_entry(id: int, payload: ShopSellingRateCreate, db: Session = Depends(get_db)):
    record = db.query(ShopSellingRateEntry).filter(ShopSellingRateEntry.id == id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Selling rate entry not found")
    
    record.date = payload.date
    record.name = payload.name
    record.particulars = payload.particulars
    record.qty = payload.qty
    record.amount = payload.amount
    record.sgst = payload.sgst
    record.cgst = payload.cgst
    record.hmall = payload.hmall
    record.motor_rent = payload.motor_rent
    record.total_amount = payload.total_amount
    record.net_rate = payload.net_rate
    record.selling_rate = payload.selling_rate
    record.stock_book_no = payload.stock_book_no
    record.sign_status = payload.sign_status or "Signed"
    
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

    # ── Auto-Post to Pesticide Sale Register if Pesticide ──────────────────────
    check_and_auto_post_pesticide(
        db=db,
        date_val=payload.date,
        customer_name=payload.customer_name,
        prod_name=payload.product_name,
        qty_val=payload.qty,
        rate_val=payload.rate,
        amt_val=payload.amount,
        source_ref=f"Tax Invoice {inv_no}",
        created_by=payload.created_by
    )

    db.commit()
    db.refresh(record)
    return record


@router.put("/tax-invoices/{id}", response_model=ShopTaxInvoiceOut)
def update_shop_tax_invoice(id: int, payload: ShopTaxInvoiceCreate, db: Session = Depends(get_db)):
    record = db.query(ShopTaxInvoice).filter(ShopTaxInvoice.id == id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Shop tax invoice not found")
    
    record.invoice_no = payload.invoice_no or record.invoice_no
    record.date = payload.date
    record.customer_name = payload.customer_name
    record.customer_phone = payload.customer_phone
    record.product_name = payload.product_name
    record.hsn_code = payload.hsn_code or "3808"
    record.qty = payload.qty
    record.rate = payload.rate
    record.amount = payload.amount
    
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

    # ── Auto-Post to Pesticide Sale Register if Pesticide ──────────────────────
    check_and_auto_post_pesticide(
        db=db,
        date_val=payload.date,
        customer_name=payload.customer_name,
        prod_name=payload.particulars,
        qty_val=Decimal("1.0"),
        rate_val=payload.rate,
        amt_val=payload.amount,
        source_ref=f"Retail Bill {b_no}",
        created_by=payload.created_by
    )

    db.commit()
    db.refresh(record)
    return record


@router.put("/retail-bills/{id}", response_model=ShopRetailBillOut)
def update_shop_retail_bill(id: int, payload: ShopRetailBillCreate, db: Session = Depends(get_db)):
    record = db.query(ShopRetailBill).filter(ShopRetailBill.id == id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Retail bill not found")
    
    record.bill_no = payload.bill_no or record.bill_no
    record.date = payload.date
    record.tin_no = payload.tin_no or "29540268502"
    record.customer_name = payload.customer_name
    record.particulars = payload.particulars
    record.rate = payload.rate
    record.amount = payload.amount
    record.seller_signature = payload.seller_signature or "Seller Signed"
    
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
        doc_path=payload.doc_path,
        created_by=payload.created_by
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return record


@router.put("/pesticide-sales/{id}", response_model=PesticideSaleEntryOut)
def update_pesticide_sale(id: int, payload: PesticideSaleEntryCreate, db: Session = Depends(get_db)):
    record = db.query(PesticideSaleEntry).filter(PesticideSaleEntry.id == id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Pesticide sale entry not found")
    record.date = payload.date
    record.customer_name = payload.customer_name
    record.product_name = payload.product_name
    record.qty = payload.qty
    record.rate = payload.rate
    record.amount = payload.amount
    record.batch_no = payload.batch_no
    record.remarks = payload.remarks
    record.doc_path = payload.doc_path
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
    try:
        s_date = date.fromisoformat(start_date) if (start_date and start_date.strip()) else date(2020, 1, 1)
    except Exception:
        s_date = date(2020, 1, 1)

    try:
        e_date = date.fromisoformat(end_date) if (end_date and end_date.strip()) else date(2035, 12, 31)
    except Exception:
        e_date = date(2035, 12, 31)

    if s_date > e_date:
        s_date, e_date = e_date, s_date

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
        grand_shop_sales_total=grand_total,

        total_receipt_vouchers_count=0,
        total_receipt_amount=Decimal("0.00"),
        total_rent_bills_count=0,
        total_rent_bill_amount=Decimal("0.00"),
        total_scroll_received=Decimal("0.00"),
        total_scroll_paid=Decimal("0.00"),
        total_scroll_cheque=Decimal("0.00"),
        total_cheques_issued_count=0,
        total_cheques_issued_amount=Decimal("0.00")
    )


# ─── 6. Product Master Endpoints & Seeding ─────────────────────────────────────

DEFAULT_PESTICIDE_PRODUCTS = [
    # Insecticides (कीटकनाशके)
    {"category": "Insecticides", "name_en": "Chlorpyriphos", "name_mr": "क्लोरपायरीफॉस"},
    {"category": "Insecticides", "name_en": "Imidacloprid", "name_mr": "इमिडाक्लोप्रिड"},
    {"category": "Insecticides", "name_en": "Thiamethoxam", "name_mr": "थायमेथॉक्साम"},
    {"category": "Insecticides", "name_en": "Acetamiprid", "name_mr": "अॅसिटामिप्रिड"},
    {"category": "Insecticides", "name_en": "Fipronil", "name_mr": "फिप्रोनिल"},
    {"category": "Insecticides", "name_en": "Lambda Cyhalothrin", "name_mr": "लॅम्ब्डा सायहॅलोथ्रीन"},
    {"category": "Insecticides", "name_en": "Cypermethrin", "name_mr": "सायपरमेथ्रीन"},
    {"category": "Insecticides", "name_en": "Profenofos", "name_mr": "प्रोफेनोफॉस"},
    {"category": "Insecticides", "name_en": "Emamectin Benzoate", "name_mr": "इमामेक्टीन बेन्झोएट"},
    {"category": "Insecticides", "name_en": "Spinosad", "name_mr": "स्पिनोसॅड"},
    {"category": "Insecticides", "name_en": "Indoxacarb", "name_mr": "इंडॉक्साकार्ब"},
    {"category": "Insecticides", "name_en": "Cartap Hydrochloride", "name_mr": "कार्टॅप हायड्रोक्लोराईड"},
    {"category": "Insecticides", "name_en": "Diafenthiuron", "name_mr": "डायाफेन्थीयुरॉन"},
    {"category": "Insecticides", "name_en": "Buprofezin", "name_mr": "बुप्रोफेझिन"},
    {"category": "Insecticides", "name_en": "Dinotefuran", "name_mr": "डिनोटेफ्युरान"},
    {"category": "Insecticides", "name_en": "Clothianidin", "name_mr": "क्लोथियानिडीन"},
    {"category": "Insecticides", "name_en": "Acephate", "name_mr": "अॅसिफेट"},
    {"category": "Insecticides", "name_en": "Quinalphos", "name_mr": "क्विनालफॉस"},
    {"category": "Insecticides", "name_en": "Novaluron", "name_mr": "नोव्हॅल्युरॉन"},
    {"category": "Insecticides", "name_en": "Tolfenpyrad", "name_mr": "टॉल्फेनपायरॅड"},
    {"category": "Insecticides", "name_en": "Monocrotophos 36% SL", "name_mr": "मोनोक्रोटोफॉस ३६% एसएल"},
    {"category": "Insecticides", "name_en": "Malathion 50% EC", "name_mr": "मॅलाथिऑन ५०% ईसी"},

    # Fungicides (बुरशीनाशके)
    {"category": "Fungicides", "name_en": "Mancozeb", "name_mr": "मॅन्कोझेब"},
    {"category": "Fungicides", "name_en": "Carbendazim", "name_mr": "कार्बेन्डाझिम"},
    {"category": "Fungicides", "name_en": "Copper Oxychloride", "name_mr": "कॉपर ऑक्सीक्लोराईड"},
    {"category": "Fungicides", "name_en": "Metalaxyl + Mancozeb", "name_mr": "मेटॅलॅक्सिल + मॅन्कोझेब"},
    {"category": "Fungicides", "name_en": "Hexaconazole", "name_mr": "हेक्झाकोनाझोल"},
    {"category": "Fungicides", "name_en": "Propiconazole", "name_mr": "प्रोपिकोनाझोल"},
    {"category": "Fungicides", "name_en": "Azoxystrobin", "name_mr": "अॅझॉक्सीस्ट्रोबिन"},
    {"category": "Fungicides", "name_en": "Tebuconazole", "name_mr": "टेबुकोनाझोल"},
    {"category": "Fungicides", "name_en": "Tricyclazole", "name_mr": "ट्रायसायक्लाझोल"},
    {"category": "Fungicides", "name_en": "Sulphur 80% WDG", "name_mr": "सल्फर ८०% WDG"},
    {"category": "Fungicides", "name_en": "Captan", "name_mr": "कॅप्टन"},
    {"category": "Fungicides", "name_en": "Cymoxanil", "name_mr": "सायमोक्सानिल"},
    {"category": "Fungicides", "name_en": "Validamycin", "name_mr": "व्हॅलिडामायसिन"},
    {"category": "Fungicides", "name_en": "Kasugamycin", "name_mr": "कासुगामायसिन"},
    {"category": "Fungicides", "name_en": "Fosetyl Aluminium", "name_mr": "फोसेटिल अॅल्युमिनियम"},

    # Herbicides (तणनाशके)
    {"category": "Herbicides", "name_en": "Glyphosate", "name_mr": "ग्लायफोसेट"},
    {"category": "Herbicides", "name_en": "Pendimethalin", "name_mr": "पेंडीमेथालिन"},
    {"category": "Herbicides", "name_en": "Butachlor", "name_mr": "ब्यूटाक्लोर"},
    {"category": "Herbicides", "name_en": "Atrazine", "name_mr": "अॅट्राझीन"},
    {"category": "Herbicides", "name_en": "Oxyfluorfen", "name_mr": "ऑक्सीफ्लुओर्फेन"},
    {"category": "Herbicides", "name_en": "Paraquat Dichloride", "name_mr": "पॅराक्वॉट डाय-क्लोराईड"},
    {"category": "Herbicides", "name_en": "Pretilachlor", "name_mr": "प्रीटिलाक्लोर"},
    {"category": "Herbicides", "name_en": "2,4-D Amine Salt", "name_mr": "२,४-डी अमाईन सॉल्ट"},
    {"category": "Herbicides", "name_en": "Metribuzin", "name_mr": "मेट्रीब्युझिन"},
    {"category": "Herbicides", "name_en": "Pyrazosulfuron Ethyl", "name_mr": "पायराझोसल्फ्युरॉन इथाइल"},
    {"category": "Herbicides", "name_en": "Bispyribac Sodium", "name_mr": "बिस्पायरिबॅक सोडियम"},
    {"category": "Herbicides", "name_en": "Imazethapyr", "name_mr": "इमाझेथापायर"},
    {"category": "Herbicides", "name_en": "Quizalofop Ethyl", "name_mr": "क्विझालोफॉप इथाइल"},
    {"category": "Herbicides", "name_en": "Fenoxaprop-P-Ethyl", "name_mr": "फेनॉक्साप्रॉप-पी-इथाइल"},

    # Rodenticides (उंदीरनाशके)
    {"category": "Rodenticides", "name_en": "Zinc Phosphide", "name_mr": "झिंक फॉस्फाईड"},
    {"category": "Rodenticides", "name_en": "Bromadiolone", "name_mr": "ब्रोमॅडिओलोन"},
    {"category": "Rodenticides", "name_en": "Ratol Cake", "name_mr": "रॅटॉल केक"},
    {"category": "Rodenticides", "name_en": "Ratol Paste", "name_mr": "रॅटॉल पेस्ट"},
    {"category": "Rodenticides", "name_en": "Ratol Powder", "name_mr": "रॅटॉल पावडर"},
    {"category": "Rodenticides", "name_en": "Ratol Pellets", "name_mr": "रॅटॉल पेलेट्स"},

    # Bio-Pesticides (जैविक कीटकनाशके)
    {"category": "Bio-Pesticides", "name_en": "Neem Oil", "name_mr": "कडुनिंब तेल"},
    {"category": "Bio-Pesticides", "name_en": "Beauveria bassiana", "name_mr": "ब्यूव्हेरिया बॅसियाना"},
    {"category": "Bio-Pesticides", "name_en": "Metarhizium anisopliae", "name_mr": "मेटारायझियम अॅनिसोप्ली"},
    {"category": "Bio-Pesticides", "name_en": "Verticillium lecanii", "name_mr": "व्हर्टिसिलियम लेकॅनी"},
    {"category": "Bio-Pesticides", "name_en": "Bacillus thuringiensis (Bt)", "name_mr": "बॅसिलस थुरिंजिएन्सिस (बीटी)"},
    {"category": "Bio-Pesticides", "name_en": "Trichoderma viride", "name_mr": "ट्रायकोडर्मा व्हिरिडी"},
    {"category": "Bio-Pesticides", "name_en": "Pseudomonas fluorescens", "name_mr": "स्यूडोमोनास फ्लुरोसेन्स"},
    {"category": "Bio-Pesticides", "name_en": "Paecilomyces lilacinus", "name_mr": "पेसिलोमायसिस लिलासिनस"},

    # Plant Growth Regulators (वनस्पती वाढ नियामके)
    {"category": "PGR", "name_en": "Gibberellic Acid (GA3)", "name_mr": "जिबरेलिक अॅसिड (GA3)"},
    {"category": "PGR", "name_en": "Naphthalene Acetic Acid (NAA)", "name_mr": "नॅफ्थलीन अॅसिटिक अॅसिड (NAA)"},
    {"category": "PGR", "name_en": "Triacontanol", "name_mr": "ट्रायकोंटॅनॉल"},
    {"category": "PGR", "name_en": "Seaweed Extract", "name_mr": "समुद्री शैवाल अर्क"},
    {"category": "PGR", "name_en": "Humic Acid", "name_mr": "ह्युमिक अॅसिड"},
    {"category": "PGR", "name_en": "Amino Acid Liquid", "name_mr": "अमिनो अॅसिड द्रावण"},
    {"category": "PGR", "name_en": "Fulvic Acid", "name_mr": "फुल्विक अॅसिड"},

    # Common Agricultural Products (इतर कृषी उत्पादने)
    {"category": "General", "name_en": "Boric Acid", "name_mr": "बोरीक ॲसिड"},
    {"category": "General", "name_en": "Boric Powder", "name_mr": "बोरिक पावडर"},
    {"category": "General", "name_en": "Terminose", "name_mr": "टर्मिनोज"},
    {"category": "General", "name_en": "Amish-B", "name_mr": "अमिश-बी"},
    {"category": "General", "name_en": "Amish-C", "name_mr": "अमिश-सी"},
    {"category": "General", "name_en": "Trichoderma", "name_mr": "ट्रायकोडर्मा"},
    {"category": "General", "name_en": "Spray Pump Battery 16L", "name_mr": "स्प्रे पंप बॅटरी १६ लि"},
    {"category": "General", "name_en": "Brass Nozzle Set", "name_mr": "ब्रास नोझल संच"},
]


def seed_pesticide_products_if_needed(db: Session):
    for item in DEFAULT_PESTICIDE_PRODUCTS:
        existing = db.query(PesticideProductMaster).filter(
            func.lower(PesticideProductMaster.name_en) == item["name_en"].lower()
        ).first()
        if not existing:
            new_prod = PesticideProductMaster(
                category=item["category"],
                name_en=item["name_en"],
                name_mr=item["name_mr"]
            )
            db.add(new_prod)
    db.commit()


@router.get("/products", response_model=List[PesticideProductOut])
def get_pesticide_products(db: Session = Depends(get_db)):
    seed_pesticide_products_if_needed(db)
    return db.query(PesticideProductMaster).order_by(PesticideProductMaster.name_en.asc()).all()


@router.post("/products", response_model=PesticideProductOut, status_code=status.HTTP_201_CREATED)
def create_pesticide_product(payload: PesticideProductCreate, db: Session = Depends(get_db)):
    seed_pesticide_products_if_needed(db)

    trimmed_en = payload.name_en.strip()
    if not trimmed_en:
        raise HTTPException(status_code=400, detail="English product name is required")

    existing = db.query(PesticideProductMaster).filter(
        func.lower(PesticideProductMaster.name_en) == trimmed_en.lower()
    ).first()
    if existing:
        if payload.name_mr and payload.name_mr.strip():
            existing.name_mr = payload.name_mr.strip()
            db.commit()
            db.refresh(existing)
        return existing

    name_mr_val = payload.name_mr.strip() if (payload.name_mr and payload.name_mr.strip()) else trimmed_en

    new_prod = PesticideProductMaster(
        category=payload.category or "General",
        name_en=trimmed_en,
        name_mr=name_mr_val
    )
    db.add(new_prod)
    db.commit()
    db.refresh(new_prod)
    return new_prod


# ─── 7. Test Data Generator Endpoint ──────────────────────────────────────────

from datetime import timedelta
import random

@router.post("/generate-30-days-test-data")
def generate_30_days_test_data(db: Session = Depends(get_db)):
    # Clear existing test data to avoid unique constraint key collisions
    db.query(ShopSellingRateEntry).filter(ShopSellingRateEntry.created_by == "Test Generator").delete()
    db.query(ShopTaxInvoice).filter(ShopTaxInvoice.created_by == "Test Generator").delete()
    db.query(ShopRetailBill).filter(ShopRetailBill.created_by == "Test Generator").delete()
    db.query(PesticideSaleEntry).filter(PesticideSaleEntry.created_by == "Test Generator").delete()
    db.commit()

    today_dt = date.today()
    sample_customers = ["Avinash Suregaonkar", "Ramesh Patil", "Suresh Pawar", "Mahesh Deshmukh", "Ganesh Kulkarni"]
    sample_products = ["Chlorpyriphos", "Imidacloprid", "Mancozeb", "Neem Oil", "Boric Acid", "Gibberellic Acid (GA3)"]

    selling_count = 0
    tax_count = 0
    retail_count = 0
    pesticide_count = 0

    for i in range(30):
        entry_date = today_dt - timedelta(days=i)
        cust = sample_customers[i % len(sample_customers)]
        prod = sample_products[i % len(sample_products)]
        qty_val = Decimal(str(random.randint(1, 10)))
        rate_val = Decimal(str(random.randint(150, 850)))
        base_amt = qty_val * rate_val

        # 1. Selling Rate Entry
        sr_entry = ShopSellingRateEntry(
            date=entry_date,
            name=cust,
            particulars=prod,
            qty=qty_val,
            amount=base_amt,
            sgst=base_amt * Decimal("0.09"),
            cgst=base_amt * Decimal("0.09"),
            hmall=Decimal("20.00"),
            motor_rent=Decimal("50.00"),
            total_amount=base_amt * Decimal("1.18") + Decimal("70.00"),
            net_rate=rate_val,
            selling_rate=rate_val * Decimal("1.2"),
            stock_book_no=f"SB-{entry_date.strftime('%Y%m')}-{i+1:03d}",
            created_by="Test Generator"
        )
        db.add(sr_entry)
        selling_count += 1

        # 2. Shop Tax Invoice
        rnd_tag = random.randint(10000, 99999)
        inv_no = f"STX-{entry_date.strftime('%Y%m%d')}-{i+1:02d}-{rnd_tag}"
        tax_inv = ShopTaxInvoice(
            invoice_no=inv_no,
            date=entry_date,
            customer_name=cust,
            product_name=prod,
            hsn_code="3808",
            qty=qty_val,
            rate=rate_val,
            amount=base_amt * Decimal("1.18"),
            created_by="Test Generator"
        )
        db.add(tax_inv)
        tax_count += 1

        # 3. Shop Retail Bill
        bill_no = f"RET-{entry_date.strftime('%Y%m%d')}-{i+1:02d}-{rnd_tag}"
        ret_bill = ShopRetailBill(
            bill_no=bill_no,
            date=entry_date,
            customer_name=cust,
            particulars=prod,
            rate=rate_val,
            amount=base_amt,
            created_by="Test Generator"
        )
        db.add(ret_bill)
        retail_count += 1

        # 4. Pesticide Sale Entry
        pest_entry = PesticideSaleEntry(
            date=entry_date,
            customer_name=cust,
            product_name=prod,
            qty=qty_val,
            rate=rate_val,
            amount=base_amt,
            batch_no=f"BATCH-{i+1:03d}",
            remarks="Generated 30-day test sale",
            created_by="Test Generator"
        )
        db.add(pest_entry)
        pesticide_count += 1

    db.commit()

    return {
        "message": "Successfully generated 30 days of test data across all shop forms!",
        "selling_rate_entries": selling_count,
        "tax_invoices": tax_count,
        "retail_bills": retail_count,
        "pesticide_sales": pesticide_count
    }


@router.delete("/delete-test-data")
def delete_test_data(db: Session = Depends(get_db)):
    sr_deleted = db.query(ShopSellingRateEntry).filter(ShopSellingRateEntry.created_by == "Test Generator").delete()
    stx_deleted = db.query(ShopTaxInvoice).filter(ShopTaxInvoice.created_by == "Test Generator").delete()
    srb_deleted = db.query(ShopRetailBill).filter(ShopRetailBill.created_by == "Test Generator").delete()
    pest_deleted = db.query(PesticideSaleEntry).filter(PesticideSaleEntry.created_by == "Test Generator").delete()

    db.commit()

    return {
        "message": "Successfully deleted test data!",
        "selling_rate_deleted": sr_deleted,
        "tax_invoices_deleted": stx_deleted,
        "retail_bills_deleted": srb_deleted,
        "pesticide_sales_deleted": pest_deleted
    }



