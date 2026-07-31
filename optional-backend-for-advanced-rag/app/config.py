import os
from functools import lru_cache


class Settings:
    internal_secret: str = os.getenv("BATUK_PYTHON_INTERNAL_SECRET", "")
    gliner_model: str = os.getenv("BATUK_GLINER_MODEL", "urchade/gliner_multi_pii-v1")
    neo4j_uri: str = os.getenv("NEO4J_URI", "")
    neo4j_username: str = os.getenv("NEO4J_USERNAME", "neo4j")
    neo4j_password: str = os.getenv("NEO4J_PASSWORD", "")
    neo4j_database: str = os.getenv("NEO4J_DATABASE", "neo4j")
    llm_endpoint: str = os.getenv("BATUK_GRAPH_RAG_LLM_ENDPOINT", "")
    llm_api_key: str = os.getenv("BATUK_GRAPH_RAG_LLM_API_KEY", "")
    llm_model: str = os.getenv("BATUK_GRAPH_RAG_LLM_MODEL", "")


@lru_cache
def get_settings() -> Settings:
    return Settings()
