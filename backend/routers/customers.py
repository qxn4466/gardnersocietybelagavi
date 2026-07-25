import os
import uuid
import shutil
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_, func

from database import get_db
from models import Customer, Transaction
from schemas import CustomerCreate, CustomerOut

router = APIRouter(prefix="/api/customers", tags=["customers"])

UPLOAD_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)


def generate_10digit_customer_id(db: Session) -> str:
    """Generate a unique 10-digit sequential Customer ID starting at 1000000001"""
    last_cust = db.query(Customer).order_by(Customer.id.desc()).first()
    if not last_cust:
        return "1000000001"
    
    # Try parsing last_cust.customer_id
    try:
        last_num = int(last_cust.customer_id)
        if 1000000000 <= last_num < 9999999999:
            next_num = last_num + 1
            return str(next_num)
    except (ValueError, TypeError):
        pass

    # Fallback if non-numeric ID exists: count + 1000000001
    count = db.query(Customer).count()
    return str(1000000001 + count)


@router.get("/next-id")
def get_next_customer_id(db: Session = Depends(get_db)):
    next_id = generate_10digit_customer_id(db)
    return {"customer_id": next_id}


@router.post("/upload")
def upload_customer_document(
    file: UploadFile = File(...),
    doc_type: Optional[str] = Form("document")
):
    """Upload Aadhaar or PAN card scan/image"""
    ext = os.path.splitext(file.filename)[1] if file.filename else ".png"
    unique_filename = f"{doc_type}_{uuid.uuid4().hex[:8]}{ext}"
    file_path = os.path.join(UPLOAD_DIR, unique_filename)

    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    relative_url = f"/uploads/{unique_filename}"
    return {"filename": file.filename, "filepath": relative_url}


@router.post("/", response_model=CustomerOut, status_code=201)
def create_customer(payload: CustomerCreate, db: Session = Depends(get_db)):
    cust_id = payload.customer_id.strip() if payload.customer_id and payload.customer_id.strip() else generate_10digit_customer_id(db)

    # Check for duplicate customer_id
    existing = db.query(Customer).filter(Customer.customer_id == cust_id).first()
    if existing:
        raise HTTPException(status_code=400, detail=f"Customer ID {cust_id} already exists.")

    # Construct full name cleanly
    name_parts = [payload.salutation, payload.first_name, payload.middle_name, payload.last_name]
    full_name = " ".join([p.strip() for p in name_parts if p and p.strip()])

    customer = Customer(
        customer_id=cust_id,
        salutation=payload.salutation or "Mr.",
        first_name=payload.first_name.strip(),
        middle_name=payload.middle_name.strip() if payload.middle_name else None,
        last_name=payload.last_name.strip(),
        full_name=full_name,
        mobile_no=payload.mobile_no.strip() if payload.mobile_no else None,
        address=payload.address.strip() if payload.address else None,
        aadhaar_no=payload.aadhaar_no.strip() if payload.aadhaar_no else None,
        aadhaar_doc_path=payload.aadhaar_doc_path,
        pan_no=payload.pan_no.strip() if payload.pan_no else None,
        pan_doc_path=payload.pan_doc_path,
        opening_balance=payload.opening_balance or 0,
        status=payload.status or "ACTIVE",
    )

    db.add(customer)
    db.commit()
    db.refresh(customer)
    return customer


@router.get("/", response_model=List[CustomerOut])
def list_customers(
    q: Optional[str] = Query(None, description="Search query by ID, Name, Mobile, Aadhaar, PAN"),
    db: Session = Depends(get_db)
):
    query = db.query(Customer)
    if q and q.strip():
        search = f"%{q.strip()}%"
        query = query.filter(
            or_(
                Customer.customer_id.ilike(search),
                Customer.full_name.ilike(search),
                Customer.first_name.ilike(search),
                Customer.last_name.ilike(search),
                Customer.mobile_no.ilike(search),
                Customer.aadhaar_no.ilike(search),
                Customer.pan_no.ilike(search),
            )
        )
    return query.order_by(Customer.id.desc()).all()


@router.get("/{customer_id}", response_model=CustomerOut)
def get_customer(customer_id: str, db: Session = Depends(get_db)):
    cust = db.query(Customer).filter(
        or_(Customer.customer_id == customer_id, Customer.id == int(customer_id) if customer_id.isdigit() else False)
    ).first()
    if not cust:
        raise HTTPException(status_code=404, detail="Customer savings account not found.")
    return cust


@router.put("/{id}", response_model=CustomerOut)
def update_customer(id: int, payload: CustomerCreate, db: Session = Depends(get_db)):
    cust = db.query(Customer).filter(Customer.id == id).first()
    if not cust:
        raise HTTPException(status_code=404, detail="Customer savings account not found.")

    name_parts = [payload.salutation, payload.first_name, payload.middle_name, payload.last_name]
    full_name = " ".join([p.strip() for p in name_parts if p and p.strip()])

    cust.salutation = payload.salutation or "Mr."
    cust.first_name = payload.first_name.strip()
    cust.middle_name = payload.middle_name.strip() if payload.middle_name else None
    cust.last_name = payload.last_name.strip()
    cust.full_name = full_name
    cust.mobile_no = payload.mobile_no.strip() if payload.mobile_no else None
    cust.address = payload.address.strip() if payload.address else None
    cust.aadhaar_no = payload.aadhaar_no.strip() if payload.aadhaar_no else None
    if payload.aadhaar_doc_path:
        cust.aadhaar_doc_path = payload.aadhaar_doc_path
    cust.pan_no = payload.pan_no.strip() if payload.pan_no else None
    if payload.pan_doc_path:
        cust.pan_doc_path = payload.pan_doc_path
    if payload.opening_balance is not None:
        cust.opening_balance = payload.opening_balance
    if payload.status:
        cust.status = payload.status

    db.commit()
    db.refresh(cust)
    return cust
