# Batuk Optional Python Backend for Advanced RAG

This service is optional. The Next.js Batuk app continues to work without it.
Enable it when you want Python-native document intelligence, Graph RAG, and
local ML guardrails.

## Capabilities

- Advanced PDF and document extraction through Unstructured.
- Structure-aware output: pages, sections, paragraphs, tables, figures, and metadata.
- Page-level citations and source element IDs for RAG chunks.
- Optional Graph RAG extraction with entity extraction, relationship extraction,
  entity resolution, community summaries, and Neo4j writes.
- Optional local PII and sensitivity scans with GLiNER when the model is available.
- FastAPI service protected by `X-Internal-Secret`.

## Run Locally

```bash
cd optional-backend-for-advanced-rag
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

Set these in the main Batuk `.env` or `.env.enterprise`:

```env
BATUK_ADVANCED_RAG_ENABLED=true
BATUK_PYTHON_API_URL=http://localhost:8000
BATUK_PYTHON_INTERNAL_SECRET=change_me

# Optional Neo4j for Graph RAG
NEO4J_URI=neo4j://localhost:7687
NEO4J_USERNAME=neo4j
NEO4J_PASSWORD=change_me
NEO4J_DATABASE=neo4j

# Optional GLiNER
BATUK_GLINER_MODEL=urchade/gliner_multi_pii-v1

# Optional OpenAI-compatible endpoint for LLM graph extraction
BATUK_GRAPH_RAG_LLM_ENDPOINT=https://api.openai.com/v1
BATUK_GRAPH_RAG_LLM_API_KEY=
BATUK_GRAPH_RAG_LLM_MODEL=gpt-4o-mini
```

## Docker Compose

From the main `sb-chat` folder:

```bash
docker compose --profile advanced-rag up --build
```

To include local Neo4j:

```bash
docker compose --profile advanced-rag --profile neo4j up --build
```

For production, keep FastAPI private on the Docker network. Browser requests
should go to Next.js; Next.js calls this service internally.
