"""
Translation router — cache-first translation via IndicTrans2 microservice.

Endpoints:
  GET  /api/translations/lookup          — check cache for a single text
  POST /api/translations/translate       — smart translate (cache → microservice → store)
  POST /api/translations/translate-batch — batch translate multiple texts
"""

import os
import json
import urllib.request
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from pydantic import BaseModel
from database import get_db
from models import TranslationCache

router = APIRouter(prefix="/translations", tags=["translations"])

INDICTRANS2_URL = os.getenv("INDICTRANS2_URL", "http://localhost:8001/translate")
DEFAULT_TARGET_LANG = "mar_Deva"


# ─── Pydantic schemas ─────────────────────────────────────────────────────────
class TranslateRequest(BaseModel):
    text: str
    target_lang: str = DEFAULT_TARGET_LANG


class TranslateResponse(BaseModel):
    source_text: str
    translated_text: str
    target_lang: str
    from_cache: bool


class BatchTranslateRequest(BaseModel):
    texts: List[str]
    target_lang: str = DEFAULT_TARGET_LANG


class BatchTranslateResponse(BaseModel):
    translations: dict  # {source_text: translated_text}
    target_lang: str


# ─── Helper: call IndicTrans2 microservice ────────────────────────────────────
def call_indictrans2(text: str, target_lang: str) -> str:
    """Call the IndicTrans2 service and return translated text."""
    if not text or not text.strip():
        return text
    try:
        req_data = json.dumps({"text": text, "target_lang": target_lang}).encode("utf-8")
        req = urllib.request.Request(
            INDICTRANS2_URL,
            data=req_data,
            headers={"Content-Type": "application/json"},
            method="POST",
        )
        with urllib.request.urlopen(req, timeout=10) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            if isinstance(data, dict):
                return (
                    data.get("translated_text")
                    or data.get("translation")
                    or data.get("output")
                    or text
                )
            elif isinstance(data, str):
                return data
            return text
    except Exception as e:
        print(f"[TranslationService] IndicTrans2 call failed: {e}")
        return text


# ─── Endpoints ────────────────────────────────────────────────────────────────
@router.get("/lookup")
def lookup_translation(
    text: str,
    lang: str = DEFAULT_TARGET_LANG,
    db: Session = Depends(get_db),
):
    """Check if a translation exists in cache. Returns 404 if not cached."""
    if not text or not text.strip():
        raise HTTPException(status_code=400, detail="text parameter is required")

    cached = (
        db.query(TranslationCache)
        .filter(
            TranslationCache.source_text == text,
            TranslationCache.target_lang == lang,
        )
        .first()
    )
    if not cached:
        raise HTTPException(status_code=404, detail="Translation not found in cache")

    return {
        "source_text": cached.source_text,
        "translated_text": cached.translated_text,
        "target_lang": cached.target_lang,
        "from_cache": True,
    }


@router.post("/translate", response_model=TranslateResponse)
async def translate_text(
    payload: TranslateRequest,
    db: Session = Depends(get_db),
):
    """
    Smart translate endpoint:
    1. Check DB cache
    2. If miss → call IndicTrans2 microservice
    3. Store result in cache
    4. Return translation
    """
    text = payload.text.strip() if payload.text else ""
    if not text:
        return TranslateResponse(
            source_text="",
            translated_text="",
            target_lang=payload.target_lang,
            from_cache=False,
        )

    # Step 1: Cache lookup (safe against DB errors)
    if db is not None:
        try:
            cached = (
                db.query(TranslationCache)
                .filter(
                    TranslationCache.source_text == text,
                    TranslationCache.target_lang == payload.target_lang,
                )
                .first()
            )
            if cached:
                return TranslateResponse(
                    source_text=cached.source_text,
                    translated_text=cached.translated_text,
                    target_lang=cached.target_lang,
                    from_cache=True,
                )
        except Exception as db_err:
            print(f"[TranslationService] DB lookup skipped: {db_err}")

    # Step 2: Call IndicTrans2 microservice on port 8001
    translated = call_indictrans2(text, payload.target_lang)

    # Step 3: Store in cache
    if db is not None:
        try:
            entry = TranslationCache(
                source_text=text,
                target_lang=payload.target_lang,
                translated_text=translated,
            )
            db.add(entry)
            db.commit()
        except Exception:
            db.rollback()

    return TranslateResponse(
        source_text=text,
        translated_text=translated,
        target_lang=payload.target_lang,
        from_cache=False,
    )


@router.post("/translate-batch", response_model=BatchTranslateResponse)
async def translate_batch(
    payload: BatchTranslateRequest,
    db: Session = Depends(get_db),
):
    """
    Batch translate multiple texts efficiently:
    - Checks DB cache for all texts at once
    - Only calls IndicTrans2 for texts not in cache
    - Stores all new translations in DB
    """
    texts = [t.strip() for t in payload.texts if t and t.strip()]
    if not texts:
        return BatchTranslateResponse(translations={}, target_lang=payload.target_lang)

    # Step 1: Bulk cache lookup
    cached_entries = (
        db.query(TranslationCache)
        .filter(
            TranslationCache.source_text.in_(texts),
            TranslationCache.target_lang == payload.target_lang,
        )
        .all()
    )
    cache_map = {entry.source_text: entry.translated_text for entry in cached_entries}

    # Step 2: Identify texts not in cache
    missing_texts = [t for t in texts if t not in cache_map]

    # Step 3: Translate missing texts via IndicTrans2
    new_translations: dict = {}
    for text in missing_texts:
        translated = await call_indictrans2(text, payload.target_lang)
        new_translations[text] = translated

    # Step 4: Store new translations in DB
    if new_translations:
        for source, translated in new_translations.items():
            try:
                entry = TranslationCache(
                    source_text=source,
                    target_lang=payload.target_lang,
                    translated_text=translated,
                )
                db.add(entry)
                db.commit()
            except IntegrityError:
                db.rollback()

    # Merge results
    result = {**cache_map, **new_translations}
    return BatchTranslateResponse(translations=result, target_lang=payload.target_lang)
