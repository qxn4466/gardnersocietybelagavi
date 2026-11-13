#!/usr/bin/env python3
"""
wipe_data_keep_credentials.py — FRESH-START data wipe, ZERO third-party dependencies.

Runs with plain system `python3` (no venv, no sqlalchemy needed):
  - PostgreSQL: shells out to the `psql` CLI using DATABASE_URL from backend/.env
  - SQLite:     uses the built-in sqlite3 module

KEEPS : users (login accounts), office_master, transaction_type_master,
        account_master, pesticide_product_master, system_balance_settings
WIPES : transactions, customers, cash_payment_vouchers, cash_receipt_vouchers,
        rent_bills, cash_scroll_book, cheque_issue_book, shop_selling_rate_book,
        shop_tax_invoices, shop_retail_bills, pesticide_sale_register,
        meeting_notices, yearly_audit_reports, translation_cache

Usage (from anywhere):
    python3 wipe_data_keep_credentials.py              # shows counts, asks you to type WIPE
    echo WIPE | python3 wipe_data_keep_credentials.py  # same, piped confirmation
    python3 wipe_data_keep_credentials.py --yes        # no prompt (for quick testing)

After wiping, restart the API so it serves clean state:
    sudo systemctl restart gardner-backend.service
"""
import os
import sqlite3
import subprocess
import sys
from urllib.parse import urlsplit, unquote

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))

KEEP_TABLES = [
    "users (login accounts)",
    "office_master (society profile)",
    "transaction_type_master (account heads)",
    "account_master",
    "pesticide_product_master (product list)",
    "system_balance_settings (opening balance)",
    "list_options_master (dropdown options)",
]

WIPE_TABLES = [
    "transactions",
    "customers",
    "cash_payment_vouchers",
    "cash_receipt_vouchers",
    "rent_bills",
    "cash_scroll_book",
    "cheque_issue_book",
    "shop_selling_rate_book",
    "shop_tax_invoices",
    "shop_retail_bills",
    "pesticide_sale_register",
    "meeting_notices",
    "yearly_audit_reports",
    "translation_cache",
]


def find_database_url() -> str:
    """DATABASE_URL from the environment, else from backend/.env (script's folder or project root)."""
    url = os.environ.get("DATABASE_URL", "").strip()
    if url:
        return url
    for candidate in (
        os.path.join(SCRIPT_DIR, ".env"),
        os.path.join(os.path.dirname(SCRIPT_DIR), ".env"),
    ):
        if os.path.isfile(candidate):
            with open(candidate, "r", encoding="utf-8") as f:
                for line in f:
                    line = line.strip()
                    if line.startswith("DATABASE_URL"):
                        _, _, val = line.partition("=")
                        val = val.strip()
                        if len(val) >= 2 and val[0] == val[-1] and val[0] in "\"'":
                            val = val[1:-1]
                        return val.strip()
    return ""


def run_psql(url: str, sql: str) -> str:
    parts = urlsplit(url)
    if parts.scheme not in ("postgres", "postgresql"):
        raise RuntimeError(f"Unsupported scheme: {parts.scheme}")
    user = unquote(parts.username or "postgres")
    password = unquote(parts.password or "")
    host = parts.hostname or "localhost"
    port = parts.port or 5432
    dbname = (parts.path or "/").lstrip("/")
    env = dict(os.environ, PGPASSWORD=password)
    cmd = [
        "psql", "-h", host, "-p", str(port), "-U", user, "-d", dbname,
        "-v", "ON_ERROR_STOP=1", "-At", "-c", sql,
    ]
    res = subprocess.run(cmd, env=env, capture_output=True, text=True)
    if res.returncode != 0:
        raise RuntimeError(res.stderr.strip() or "psql failed")
    return res.stdout.strip()


def run_sqlite(db_path: str, sql: str) -> str:
    conn = sqlite3.connect(db_path)
    try:
        cur = conn.execute(sql)
        rows = cur.fetchall()
        conn.commit()
        return "\n".join(f"{r[0]}|{r[1]}" if len(r) > 1 else str(r[0]) for r in rows)
    finally:
        conn.close()


def counts_sql() -> str:
    selects = [f"SELECT '{t}' AS tbl, count(*) FROM {t}" for t in WIPE_TABLES]
    return " UNION ALL ".join(selects)


def parse_counts(output: str) -> list:
    rows = []
    for line in (output or "").splitlines():
        line = line.strip()
        if not line or "|" not in line:
            continue
        tbl, cnt = line.split("|", 1)
        rows.append((tbl.strip(), int(cnt.strip() or 0)))
    return rows


def main() -> int:
    assume_yes = "--yes" in sys.argv

    url = find_database_url()
    if not url:
        print("ERROR: DATABASE_URL not found (checked environment, backend/.env, project-root .env)")
        return 1

    is_sqlite = url.startswith("sqlite")
    engine_name = "sqlite" if is_sqlite else "postgresql"
    if is_sqlite:
        db_display = url.split("///", 1)[-1] or url
    else:
        parts = urlsplit(url)
        db_display = f"{parts.hostname}:{parts.port or 5432}/{(parts.path or '/').lstrip('/')}"

    print("=" * 68)
    print("FRESH-START DATA WIPE (wipe_data_keep_credentials.py)")
    print("=" * 68)
    print(f"Engine : {engine_name}")
    print(f"Target : {db_display}")
    if engine_name == "sqlite" and not os.path.isabs(db_display):
        db_display = os.path.abspath(db_display)
    print("\nWILL KEEP:")
    for t in KEEP_TABLES:
        print(f"  KEEP  {t}")
    print("\nWILL DELETE ALL ROWS FROM:")
    for t in WIPE_TABLES:
        print(f"  WIPE  {t}")

    try:
        if is_sqlite:
            out = run_sqlite(db_display, counts_sql())
        else:
            out = run_psql(url, counts_sql())
    except Exception as exc:
        print(f"\nERROR while reading counts: {exc}")
        return 1

    counts = parse_counts(out)
    known = dict(counts)
    for t in WIPE_TABLES:
        if t not in known:
            print(f"\nERROR: table '{t}' not found in the target database — wrong DB?")
            return 1

    total = 0
    print("\nRow counts right now:")
    for tbl, cnt in counts:
        total += cnt
        print(f"  {tbl:28s} {cnt:>7d} row(s)")

    if total == 0:
        print("\nNothing to delete — all target tables are already empty.")
        return 0

    if not assume_yes:
        try:
            answer = input(f"\nType WIPE to permanently delete {total} row(s): ").strip()
        except EOFError:
            answer = ""
        if answer != "WIPE":
            print("Aborted — nothing was deleted.")
            return 1

    try:
        if is_sqlite:
            conn = sqlite3.connect(db_display)
            try:
                for t in WIPE_TABLES:
                    conn.execute(f"DELETE FROM {t}")
                try:
                    conn.execute(
                        "DELETE FROM sqlite_sequence WHERE name IN ({})".format(
                            ",".join(f"'{t}'" for t in WIPE_TABLES)
                        )
                    )
                except sqlite3.OperationalError:
                    pass  # sqlite_sequence only exists when AUTOINCREMENT is used
                conn.commit()
            finally:
                conn.close()
        else:
            run_psql(url, "TRUNCATE {} RESTART IDENTITY;".format(", ".join(WIPE_TABLES)))
    except Exception as exc:
        print(f"\nERROR while wiping (nothing partial was committed): {exc}")
        return 1

    try:
        out = run_psql(url, counts_sql()) if not is_sqlite else run_sqlite(db_display, counts_sql())
        print("\nDone. Row counts after wipe:")
        for tbl, cnt in parse_counts(out):
            print(f"  {tbl:28s} {cnt:>7d} row(s)")
    except Exception as exc:
        print(f"\nWipe executed, but post-check failed: {exc}")

    print("\nUsers and masters were NOT touched. Restart the API to serve clean state:")
    print("  sudo systemctl restart gardner-backend.service")
    return 0


if __name__ == "__main__":
    sys.exit(main())
