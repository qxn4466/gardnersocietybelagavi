from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from database import get_db
import models
import schemas

router = APIRouter(prefix="/audit-reports", tags=["Yearly Audit Reports"])


@router.post("/save", response_model=schemas.AuditReportOut)
def save_or_update_audit_report(
    report_in: schemas.AuditReportCreate,
    db: Session = Depends(get_db)
):
    """Saves or updates a yearly audit report (upsert by report_type and financial_year)."""
    existing = db.query(models.YearlyAuditReport).filter(
        models.YearlyAuditReport.report_type == report_in.report_type,
        models.YearlyAuditReport.financial_year == report_in.financial_year,
    ).first()

    if existing:
        existing.from_date = report_in.from_date
        existing.to_date = report_in.to_date
        existing.header_title_en = report_in.header_title_en
        existing.header_title_mr = report_in.header_title_mr
        existing.header_period_text = report_in.header_period_text
        existing.data_json = report_in.data_json
        existing.created_by = report_in.created_by or existing.created_by
        db.commit()
        db.refresh(existing)
        return existing
    else:
        db_obj = models.YearlyAuditReport(
            report_type=report_in.report_type,
            financial_year=report_in.financial_year,
            from_date=report_in.from_date,
            to_date=report_in.to_date,
            header_title_en=report_in.header_title_en,
            header_title_mr=report_in.header_title_mr,
            header_period_text=report_in.header_period_text,
            data_json=report_in.data_json,
            created_by=report_in.created_by,
        )
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        return db_obj


@router.get("/list", response_model=List[schemas.AuditReportOut])
def list_audit_reports(
    report_type: Optional[str] = Query(None, description="RECEIPT_PAYMENT, TRADING, PROFIT_LOSS, BALANCE_SHEET"),
    db: Session = Depends(get_db)
):
    """List all saved yearly audit reports, optionally filtered by report_type."""
    query = db.query(models.YearlyAuditReport)
    if report_type:
        query = query.filter(models.YearlyAuditReport.report_type == report_type)
    return query.order_by(models.YearlyAuditReport.financial_year.desc()).all()


@router.get("/get", response_model=schemas.AuditReportOut)
def get_audit_report(
    report_type: str = Query(..., description="RECEIPT_PAYMENT, TRADING, PROFIT_LOSS, BALANCE_SHEET"),
    financial_year: str = Query(..., description="e.g. 2025-26"),
    db: Session = Depends(get_db)
):
    """Fetch a specific saved audit report by report_type and financial_year."""
    report = db.query(models.YearlyAuditReport).filter(
        models.YearlyAuditReport.report_type == report_type,
        models.YearlyAuditReport.financial_year == financial_year,
    ).first()
    if not report:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Audit report '{report_type}' for year '{financial_year}' not found."
        )
    return report
