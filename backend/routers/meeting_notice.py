import random
from datetime import date, datetime, timedelta
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, or_

from database import get_db
from models import MeetingNotice
from schemas import MeetingNoticeCreate, MeetingNoticeOut

router = APIRouter(prefix="/accountant/meeting-notices", tags=["Meeting Notices"])


@router.get("/next-notice-no")
def get_next_notice_no(db: Session = Depends(get_db)):
    year_str = str(date.today().year)
    count = db.query(MeetingNotice).filter(MeetingNotice.notice_no.like(f"MN-{year_str}-%")).count()
    next_seq = count + 1
    return {"notice_no": f"MN-{year_str}-{next_seq:03d}"}


@router.get("", response_model=List[MeetingNoticeOut])
def list_meeting_notices(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db)
):
    query = db.query(MeetingNotice)

    if start_date and start_date.strip():
        query = query.filter(MeetingNotice.meeting_date >= date.fromisoformat(start_date))
    if end_date and end_date.strip():
        query = query.filter(MeetingNotice.meeting_date <= date.fromisoformat(end_date))
    if search and search.strip():
        term = f"%{search.strip()}%"
        query = query.filter(
            or_(
                MeetingNotice.recipient_name.ilike(term),
                MeetingNotice.notice_no.ilike(term),
                MeetingNotice.agenda_subjects.ilike(term)
            )
        )

    return query.order_by(MeetingNotice.meeting_date.desc(), MeetingNotice.id.desc()).all()


@router.post("", response_model=MeetingNoticeOut, status_code=201)
def create_meeting_notice(payload: MeetingNoticeCreate, db: Session = Depends(get_db)):
    notice_no = payload.notice_no
    if not notice_no:
        year_str = str(date.today().year)
        count = db.query(MeetingNotice).filter(MeetingNotice.notice_no.like(f"MN-{year_str}-%")).count()
        notice_no = f"MN-{year_str}-{count + 1:03d}"

    record = MeetingNotice(
        notice_no=notice_no,
        meeting_date=payload.meeting_date,
        meeting_time=payload.meeting_time,
        time_of_day=payload.time_of_day,
        recipient_name=payload.recipient_name,
        meeting_type=payload.meeting_type,
        agenda_subjects=payload.agenda_subjects,
        doc_path=payload.doc_path,
        created_by=payload.created_by or "accountant"
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return record


@router.put("/{id}", response_model=MeetingNoticeOut)
def update_meeting_notice(id: int, payload: MeetingNoticeCreate, db: Session = Depends(get_db)):
    record = db.query(MeetingNotice).filter(MeetingNotice.id == id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Meeting notice not found")

    record.meeting_date = payload.meeting_date
    record.meeting_time = payload.meeting_time
    record.time_of_day = payload.time_of_day
    record.recipient_name = payload.recipient_name
    record.meeting_type = payload.meeting_type
    record.agenda_subjects = payload.agenda_subjects
    record.doc_path = payload.doc_path

    db.commit()
    db.refresh(record)
    return record


@router.delete("/{id}")
def delete_meeting_notice(id: int, db: Session = Depends(get_db)):
    record = db.query(MeetingNotice).filter(MeetingNotice.id == id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Meeting notice not found")

    db.delete(record)
    db.commit()
    return {"message": "Meeting notice deleted successfully"}


@router.post("/generate-30-days-test-data")
def generate_30_days_meeting_notices(db: Session = Depends(get_db)):
    db.query(MeetingNotice).filter(MeetingNotice.created_by == "Test Generator").delete()
    db.commit()

    today_dt = date.today()
    sample_recipients = [
        ("Shri Avinash Suregaonkar", "श्री अविनाश सुरेगावकर"),
        ("Shri Ramesh Patil", "श्री रमेश पाटील"),
        ("Smt. Sunita Kulkarni", "सौ. सुनिता कुलकर्णी"),
        ("Shri Mahesh Pawar", "श्री महेश पवार"),
        ("Shri Suresh Deshmukh", "श्री सुरेश देशमुख")
    ]

    sample_agendas = [
        "1. वार्षिक अंदाजपत्रक मंजुरीबाबत (Annual Budget Approval)\n2. खते व औषधे खरेदीबाबत चर्चा\n3. सभासद अर्ज मंजुरी",
        "1. नवीन दुकान भाडे करार नूतनीकरण\n2. ऑडिट अहवाल आढावा\n3. इतर विषय अध्यक्षांच्या परवानगीने",
        "1. संचालक मंडळ सभा कामकाज\n2. कोल्ड स्टोरेज विस्तार योजना\n3. शेतकरी प्रशिक्षण शिबिर आयोजन",
        "1. बँकेतील मुदत ठेव नूतनीकरण\n2. कामगार बोनस वाटप निर्णय\n3. कीटकनाशके दरपत्रक पुनरावलोकन"
    ]

    created_count = 0
    for i in range(30):
        entry_date = today_dt - timedelta(days=i)
        rec = sample_recipients[i % len(sample_recipients)]
        agenda = sample_agendas[i % len(sample_agendas)]
        notice_no = f"MN-{entry_date.strftime('%Y')}-{i+1:03d}"

        notice = MeetingNotice(
            notice_no=notice_no,
            meeting_date=entry_date,
            meeting_time="11:00 AM" if i % 2 == 0 else "04:30 PM",
            time_of_day="सकाळी" if i % 2 == 0 else "संध्याकाळी",
            recipient_name=rec[1],
            meeting_type="सर्व्ह सोसायटीची मॅ. कमिटी मिटिंग",
            agenda_subjects=agenda,
            created_by="Test Generator"
        )
        db.add(notice)
        created_count += 1

    db.commit()
    return {"message": f"Successfully generated {created_count} meeting notices test data!", "count": created_count}


@router.delete("/delete-test-data")
def delete_30_days_test_data(db: Session = Depends(get_db)):
    deleted = db.query(MeetingNotice).filter(MeetingNotice.created_by == "Test Generator").delete()
    db.commit()
    return {"message": "Test data deleted successfully", "deleted_count": deleted}
