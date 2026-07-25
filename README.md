# Belagavi Gardeners Co-op Society — 3-Level Accounting System

## Overview
A full-stack accounting application for **Belagavi Gardeners Co-op Production Supply and Sale Society Ltd.**

- **Level 1**: Credit Account Form — data entry by the clerk
- **Level 2**: Cash Book — auto-generated daily view (16 columns)
- **Level 3**: General Ledger — auto-generated monthly summary

---

## Tech Stack
- **Frontend**: React 18 + TypeScript + Vite + Lucide Icons
- **Backend**: Python + FastAPI
- **Database**: PostgreSQL
- **ORM**: SQLAlchemy

---

## Setup & Running

### 1. PostgreSQL

Create the database:
```sql
CREATE DATABASE gardner_society;
```

### 2. Backend

```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Edit .env with your Postgres credentials
# Then seed the DB:
python seed.py

# Start backend:
uvicorn main:app --reload --port 8000
```

API docs available at: http://localhost:8000/docs

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

App available at: http://localhost:5173

---

## Usage Flow

1. Open **Credit Account Form** (Level 1)
2. Enter a transaction → click **Save Transaction**
3. Open **Cash Book** (Level 2) → the transaction appears in the correct column automatically
4. Open **General Ledger** (Level 3) → select the month/year to see monthly totals

---

## Project Structure

```
Gardner_Society/
├── backend/
│   ├── main.py          FastAPI app
│   ├── database.py      DB connection
│   ├── models.py        SQLAlchemy models
│   ├── schemas.py       Pydantic schemas
│   ├── seed.py          Seed data
│   ├── .env             DB credentials
│   └── routers/
│       ├── masters.py   Office & transaction types
│       ├── transactions.py  CRUD
│       ├── cashbook.py  Daily view (computed)
│       └── ledger.py    Monthly view (computed)
└── frontend/
    └── src/
        ├── pages/
        │   ├── CreditAccountForm.tsx  Level 1
        │   ├── CashBook.tsx           Level 2
        │   └── GeneralLedger.tsx      Level 3
        ├── components/
        │   ├── Sidebar.tsx
        │   ├── Header.tsx
        │   └── PrintButton.tsx
        ├── api/client.ts
        └── types/index.ts
```
