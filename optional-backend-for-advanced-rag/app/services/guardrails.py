from __future__ import annotations

import re
from functools import lru_cache
from typing import Any

from ..config import get_settings

SECRET_PATTERNS = [
    ("aws_access_key", re.compile(r"\bAKIA[0-9A-Z]{16}\b")),
    ("generic_api_key", re.compile(r"(?i)\b(api[_-]?key|secret|token)\b\s*[:=]\s*['\"]?([a-z0-9_\-]{24,})")),
    ("private_key", re.compile(r"-----BEGIN (RSA |EC |OPENSSH |)PRIVATE KEY-----")),
]

PII_LABELS = [
    "person",
    "email",
    "phone number",
    "address",
    "passport number",
    "social security number",
    "credit card number",
    "iban",
    "ip address",
    "date of birth",
]


@lru_cache
def _gliner():
    try:
        from gliner import GLiNER

        return GLiNER.from_pretrained(get_settings().gliner_model)
    except Exception:
        return None


def scan_text(text: str, *, pii: bool = True, secrets: bool = True, language: bool = True, sensitivity: bool = True) -> dict[str, Any]:
    findings: list[dict[str, Any]] = []
    value = text or ""

    if secrets:
        for label, pattern in SECRET_PATTERNS:
            for match in pattern.finditer(value):
                findings.append({
                    "type": "secret",
                    "label": label,
                    "start": match.start(),
                    "end": match.end(),
                    "score": 0.99,
                })

    if pii:
        model = _gliner()
        if model:
            try:
                for entity in model.predict_entities(value[:20000], PII_LABELS, threshold=0.45):
                    findings.append({
                        "type": "pii",
                        "label": entity.get("label"),
                        "text": entity.get("text"),
                        "start": entity.get("start"),
                        "end": entity.get("end"),
                        "score": entity.get("score"),
                    })
            except Exception as exc:
                findings.append({"type": "system", "label": "gliner_error", "message": str(exc), "score": 0})
        else:
            for label, pattern in [
                ("email", re.compile(r"\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b", re.I)),
                ("phone", re.compile(r"\+?\d[\d\s().-]{7,}\d")),
            ]:
                for match in pattern.finditer(value):
                    findings.append({"type": "pii", "label": label, "start": match.start(), "end": match.end(), "score": 0.75})

    detected_language = None
    if language:
        try:
            from langdetect import detect

            detected_language = detect(value[:5000]) if value.strip() else None
        except Exception:
            detected_language = None

    sensitivity_labels = []
    if sensitivity:
        lowered = value.lower()
        for label, words in {
            "financial": ["iban", "invoice", "bank account", "balance sheet", "profit", "loss"],
            "legal": ["contract", "liability", "warranty", "indemnity", "gdpr"],
            "health": ["diagnosis", "patient", "medical", "prescription"],
            "credentials": ["password", "api key", "secret", "token"],
        }.items():
            if any(word in lowered for word in words):
                sensitivity_labels.append(label)

    return {
        "findings": findings,
        "language": detected_language,
        "sensitivity": sensitivity_labels,
        "piiModelLoaded": _gliner() is not None if pii else False,
        "risk": "high" if any(f["type"] in {"secret", "pii"} and (f.get("score") or 0) >= 0.9 for f in findings) else ("medium" if findings or sensitivity_labels else "low"),
    }
