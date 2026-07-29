"""
Translation router — cache-first translation via IndicTrans2 microservice.

Endpoints:
  GET  /api/translations/lookup          — check cache for a single text
  POST /api/translations/translate       — smart translate (cache → microservice → store)
  POST /api/translations/translate-batch — batch translate multiple texts
"""

import os
import httpx
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from typing import List, Optional
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
async def call_indictrans2(text: str, target_lang: str) -> str:
    """Call the IndicTrans2 service and return translated text."""
    if not text or not text.strip():
        return text
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                INDICTRANS2_URL,
                json={"text": text, "target_lang": target_lang},
                headers={"Content-Type": "application/json"},
            )
            response.raise_for_status()
            data = response.json()
            # IndicTrans2 may return {"translated_text": "..."} or {"translation": "..."} or plain string
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
        # Fallback: return original text if microservice is unavailable
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

    # Step 1: Cache lookup
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

    # Step 2: Call IndicTrans2 microservice
    translated = await call_indictrans2(text, payload.target_lang)

    # Step 3: Store in cache (ignore if duplicate race condition)
    try:
        entry = TranslationCache(
            source_text=text,
            target_lang=payload.target_lang,
            translated_text=translated,
        )
        db.add(entry)
        db.commit()
    except IntegrityError:
        db.rollback()
        # Another request already cached this — fetch the cached version
        cached = (
            db.query(TranslationCache)
            .filter(
                TranslationCache.source_text == text,
                TranslationCache.target_lang == payload.target_lang,
            )
            .first()
        )
        if cached:
            translated = cached.translated_text

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
