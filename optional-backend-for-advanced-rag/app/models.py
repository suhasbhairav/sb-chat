from typing import Any

from pydantic import BaseModel, Field


class Scope(BaseModel):
    scopeType: str = "personal"
    organizationId: str = "global"
    userId: str = "global"
    workspaceId: str | None = None


class ExtractRequest(BaseModel):
    filePath: str
    fileName: str
    documentId: str
    scope: Scope = Field(default_factory=Scope)
    options: dict[str, Any] = Field(default_factory=dict)


class GraphRequest(ExtractRequest):
    text: str | None = None
    elements: list[dict[str, Any]] = Field(default_factory=list)


class GuardrailRequest(BaseModel):
    text: str
    pii: bool = True
    secrets: bool = True
    language: bool = True
    sensitivity: bool = True


class DeleteGraphRequest(BaseModel):
    documentId: str


class AdvancedRagRequest(ExtractRequest):
    graphRag: bool = False
    pii: bool = False
    selectedModel: str | None = None
    provider: str | None = None
