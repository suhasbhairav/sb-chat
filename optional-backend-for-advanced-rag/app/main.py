from fastapi import Depends, FastAPI

from .models import AdvancedRagRequest, DeleteGraphRequest, ExtractRequest, GraphRequest, GuardrailRequest
from .security import require_internal_secret
from .services.extraction import extract_structure, structure_chunks
from .services.graph_rag import build_graph_rag, delete_document_graph
from .services.guardrails import scan_text

app = FastAPI(title="Batuk Optional Advanced RAG Backend", version="1.0.0")


@app.get("/health")
def health() -> dict:
    return {"ok": True, "service": "batuk-advanced-rag-python"}


@app.post("/v1/extract", dependencies=[Depends(require_internal_secret)])
def extract(payload: ExtractRequest) -> dict:
    extracted = extract_structure(payload.filePath, payload.fileName, payload.documentId, payload.options)
    chunks = structure_chunks(
        extracted["elements"],
        int(payload.options.get("chunkSize") or 1800),
        int(payload.options.get("chunkOverlap") or 220),
    )
    return {**extracted, "chunks": chunks}


@app.post("/v1/graph-rag", dependencies=[Depends(require_internal_secret)])
def graph_rag(payload: GraphRequest) -> dict:
    text = payload.text or "\n\n".join(element.get("text", "") for element in payload.elements)
    return build_graph_rag(payload.documentId, payload.fileName, text, payload.elements, payload.scope.model_dump(), None)


@app.post("/v1/graph-rag/document/delete", dependencies=[Depends(require_internal_secret)])
def delete_graph(payload: DeleteGraphRequest) -> dict:
    return delete_document_graph(payload.documentId)


@app.post("/v1/guardrails/scan", dependencies=[Depends(require_internal_secret)])
def guardrails(payload: GuardrailRequest) -> dict:
    return scan_text(
        payload.text,
        pii=payload.pii,
        secrets=payload.secrets,
        language=payload.language,
        sensitivity=payload.sensitivity,
    )


@app.post("/v1/advanced-rag", dependencies=[Depends(require_internal_secret)])
def advanced_rag(payload: AdvancedRagRequest) -> dict:
    extracted = extract_structure(payload.filePath, payload.fileName, payload.documentId, payload.options)
    chunks = structure_chunks(
        extracted["elements"],
        int(payload.options.get("chunkSize") or 1800),
        int(payload.options.get("chunkOverlap") or 220),
    )
    graph = None
    if payload.graphRag:
        graph = build_graph_rag(
            payload.documentId,
            payload.fileName,
            extracted["text"],
            extracted["elements"],
            payload.scope.model_dump(),
            payload.selectedModel,
        )
    pii = scan_text(extracted["text"], pii=True, secrets=True, language=True, sensitivity=True) if payload.pii else None
    return {**extracted, "chunks": chunks, "graph": graph, "guardrails": pii}
