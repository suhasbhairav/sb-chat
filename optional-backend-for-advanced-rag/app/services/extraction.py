from __future__ import annotations

import hashlib
import os
import re
from pathlib import Path
from typing import Any


def _normalize_text(text: str) -> str:
    return re.sub(r"\n{3,}", "\n\n", re.sub(r"[ \t\u00a0]+", " ", text or "")).strip()


def _element_id(document_id: str, index: int, text: str) -> str:
    digest = hashlib.sha1(f"{document_id}:{index}:{text[:500]}".encode("utf-8")).hexdigest()[:12]
    return f"{document_id}:element:{index}:{digest}"


def _category_to_type(category: str) -> str:
    value = (category or "paragraph").lower()
    if "table" in value:
      return "table"
    if "image" in value or "figure" in value:
      return "figure"
    if "title" in value or "header" in value:
      return "section"
    if "footer" in value:
      return "footer"
    return "paragraph"


def extract_structure(file_path: str, file_name: str, document_id: str, options: dict[str, Any] | None = None) -> dict[str, Any]:
    options = options or {}
    suffix = Path(file_name or file_path).suffix.lower()

    try:
        from unstructured.partition.auto import partition

        strategy = options.get("strategy") or ("hi_res" if suffix == ".pdf" else "auto")
        elements = partition(
            filename=file_path,
            strategy=strategy,
            infer_table_structure=True,
            include_page_breaks=True,
            languages=options.get("languages") or ["eng"],
        )
        structured = []
        for index, element in enumerate(elements):
            text = _normalize_text(str(element))
            if not text:
                continue
            metadata = getattr(element, "metadata", None)
            meta = metadata.to_dict() if metadata and hasattr(metadata, "to_dict") else {}
            category = getattr(element, "category", element.__class__.__name__)
            structured.append({
                "id": _element_id(document_id, index, text),
                "index": index,
                "type": _category_to_type(category),
                "category": str(category),
                "text": text,
                "page": meta.get("page_number"),
                "coordinates": meta.get("coordinates"),
                "metadata": {
                    "filename": meta.get("filename") or os.path.basename(file_name),
                    "languages": meta.get("languages"),
                    "lastModified": meta.get("last_modified"),
                    "filetype": meta.get("filetype"),
                },
            })
        return {
            "engine": "unstructured",
            "document": {
                "id": document_id,
                "name": file_name,
                "structure": {
                    "elements": structured,
                    "pages": sorted({item["page"] for item in structured if item.get("page") is not None}),
                },
            },
            "text": "\n\n".join(item["text"] for item in structured),
            "elements": structured,
            "warnings": [],
        }
    except Exception as exc:
        raw = Path(file_path).read_bytes()
        text = _normalize_text(raw.decode("utf-8", errors="ignore"))
        return {
            "engine": "fallback-text",
            "document": {
                "id": document_id,
                "name": file_name,
                "structure": {
                    "elements": [{
                        "id": _element_id(document_id, 0, text),
                        "index": 0,
                        "type": "paragraph",
                        "category": "FallbackText",
                        "text": text,
                        "page": None,
                        "metadata": {"filename": file_name},
                    }] if text else [],
                    "pages": [],
                },
            },
            "text": text,
            "elements": [{
                "id": _element_id(document_id, 0, text),
                "index": 0,
                "type": "paragraph",
                "category": "FallbackText",
                "text": text,
                "page": None,
                "metadata": {"filename": file_name},
            }] if text else [],
            "warnings": [f"Unstructured extraction unavailable or failed: {exc}"],
        }


def structure_chunks(elements: list[dict[str, Any]], chunk_size: int = 1800, overlap: int = 220) -> list[dict[str, Any]]:
    chunks: list[dict[str, Any]] = []
    for element in elements:
        text = _normalize_text(element.get("text", ""))
        if not text:
            continue
        if len(text) <= chunk_size:
            chunks.append({
                "content": text,
                "sourceElementIds": [element.get("id")],
                "pageStart": element.get("page"),
                "pageEnd": element.get("page"),
                "elementType": element.get("type", "paragraph"),
                "metadata": element.get("metadata") or {},
            })
            continue
        cursor = 0
        while cursor < len(text):
            end = min(len(text), cursor + chunk_size)
            part = text[cursor:end].strip()
            if part:
                chunks.append({
                    "content": part,
                    "sourceElementIds": [element.get("id")],
                    "pageStart": element.get("page"),
                    "pageEnd": element.get("page"),
                    "elementType": element.get("type", "paragraph"),
                    "metadata": element.get("metadata") or {},
                })
            if end >= len(text):
                break
            cursor = max(end - overlap, cursor + 1)
    return chunks
