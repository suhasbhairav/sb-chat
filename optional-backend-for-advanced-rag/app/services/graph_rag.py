from __future__ import annotations

import itertools
import json
import re
import urllib.request
from collections import Counter, defaultdict
from typing import Any

from neo4j import GraphDatabase

from ..config import get_settings


ENTITY_RE = re.compile(r"\b([A-Z][A-Za-z0-9&.\-]+(?:\s+[A-Z][A-Za-z0-9&.\-]+){0,5})\b")


def _canonical(name: str) -> str:
    return re.sub(r"\s+", " ", name.strip()).casefold()


def extract_entities_and_relationships(text: str, elements: list[dict[str, Any]]) -> dict[str, Any]:
    counts: Counter[str] = Counter()
    mentions: dict[str, list[dict[str, Any]]] = defaultdict(list)

    for element in elements:
        body = element.get("text") or ""
        for match in ENTITY_RE.finditer(body):
            name = match.group(1).strip()
            if len(name) < 3 or name.lower() in {"the", "this", "that"}:
                continue
            key = _canonical(name)
            counts[key] += 1
            mentions[key].append({
                "name": name,
                "elementId": element.get("id"),
                "page": element.get("page"),
            })

    entities = [
        {
            "id": f"entity:{key.replace(' ', '_')[:90]}",
            "name": Counter(item["name"] for item in refs).most_common(1)[0][0],
            "canonical": key,
            "mentionCount": count,
            "mentions": refs[:12],
            "type": "Entity",
        }
        for key, count in counts.most_common(250)
        for refs in [mentions[key]]
        if count >= 1
    ]

    by_key = {entity["canonical"]: entity for entity in entities}
    edge_counts: Counter[tuple[str, str]] = Counter()
    evidence: dict[tuple[str, str], list[dict[str, Any]]] = defaultdict(list)

    for element in elements:
        present = []
        body = element.get("text") or ""
        for match in ENTITY_RE.finditer(body):
            key = _canonical(match.group(1))
            if key in by_key:
                present.append(key)
        for a, b in itertools.combinations(sorted(set(present)), 2):
            edge_counts[(a, b)] += 1
            evidence[(a, b)].append({"elementId": element.get("id"), "page": element.get("page")})

    relationships = [
        {
            "source": by_key[a]["id"],
            "target": by_key[b]["id"],
            "type": "CO_OCCURS_WITH",
            "weight": weight,
            "evidence": evidence[(a, b)][:8],
        }
        for (a, b), weight in edge_counts.most_common(500)
    ]

    return {"entities": entities, "relationships": relationships}


def extract_with_llm(text: str, model: str | None = None) -> dict[str, Any] | None:
    settings = get_settings()
    if not settings.llm_endpoint or not settings.llm_api_key:
        return None

    prompt = (
        "Extract a knowledge graph from the complete document text. "
        "Return strict JSON with keys entities and relationships. "
        "entities must be an array of {id,name,type,canonical,mentionCount}. "
        "relationships must be an array of {source,target,type,weight,evidence}. "
        "Use stable lowercase ids and merge duplicate entities.\n\n"
        f"DOCUMENT TEXT:\n{text[:120000]}"
    )
    body = json.dumps({
        "model": model or settings.llm_model or "gpt-4o-mini",
        "temperature": 0,
        "response_format": {"type": "json_object"},
        "messages": [
            {"role": "system", "content": "You are a production Graph RAG extraction engine. Return only valid JSON."},
            {"role": "user", "content": prompt},
        ],
    }).encode("utf-8")
    request = urllib.request.Request(
        settings.llm_endpoint.rstrip("/") + "/chat/completions",
        data=body,
        headers={
            "Authorization": f"Bearer {settings.llm_api_key}",
            "Content-Type": "application/json",
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(request, timeout=180) as response:
            payload = json.loads(response.read().decode("utf-8"))
        content = payload["choices"][0]["message"]["content"]
        parsed = json.loads(content)
        entities = parsed.get("entities") or []
        relationships = parsed.get("relationships") or []
        if not isinstance(entities, list) or not isinstance(relationships, list):
            return None
        return {"entities": entities[:500], "relationships": relationships[:1000], "extractor": "llm"}
    except Exception:
        return None


def detect_communities(entities: list[dict[str, Any]], relationships: list[dict[str, Any]]) -> list[dict[str, Any]]:
    try:
        import community as community_louvain
        import networkx as nx

        graph = nx.Graph()
        for entity in entities:
            graph.add_node(entity["id"], label=entity["name"])
        for rel in relationships:
            graph.add_edge(rel["source"], rel["target"], weight=rel.get("weight", 1))
        if graph.number_of_nodes() == 0:
            return []
        partition = community_louvain.best_partition(graph, weight="weight")
        grouped: dict[int, list[str]] = defaultdict(list)
        for node, community_id in partition.items():
            grouped[community_id].append(node)
        names = {entity["id"]: entity["name"] for entity in entities}
        return [
            {
                "id": f"community:{community_id}",
                "entityIds": node_ids,
                "summary": "Related entities: " + ", ".join(names[node_id] for node_id in node_ids[:10]),
            }
            for community_id, node_ids in grouped.items()
        ]
    except Exception:
        return []


def write_neo4j(document_id: str, document_name: str, graph: dict[str, Any], scope: dict[str, Any]) -> dict[str, Any]:
    settings = get_settings()
    if not settings.neo4j_uri or not settings.neo4j_password:
        return {"enabled": False, "message": "Neo4j is not configured."}

    driver = GraphDatabase.driver(settings.neo4j_uri, auth=(settings.neo4j_username, settings.neo4j_password))
    database = settings.neo4j_database or None
    with driver.session(database=database) as session:
        session.run(
            """
            MERGE (d:BatukDocument {id: $id})
            SET d.name = $name, d.scopeType = $scopeType, d.organizationId = $organizationId,
                d.userId = $userId, d.workspaceId = $workspaceId
            """,
            id=document_id,
            name=document_name,
            **scope,
        )
        for entity in graph.get("entities", []):
            session.run(
                """
                MERGE (e:BatukEntity {id: $id})
                SET e.name = $name, e.canonical = $canonical, e.mentionCount = $mentionCount
                WITH e
                MATCH (d:BatukDocument {id: $documentId})
                MERGE (d)-[:MENTIONS]->(e)
                """,
                documentId=document_id,
                **{k: entity.get(k) for k in ["id", "name", "canonical", "mentionCount"]},
            )
        for rel in graph.get("relationships", []):
            session.run(
                """
                MATCH (a:BatukEntity {id: $source})
                MATCH (b:BatukEntity {id: $target})
                MERGE (a)-[r:CO_OCCURS_WITH]-(b)
                SET r.weight = coalesce(r.weight, 0) + $weight
                """,
                source=rel["source"],
                target=rel["target"],
                weight=rel.get("weight", 1),
            )
    driver.close()
    return {"enabled": True, "message": "Graph written to Neo4j."}


def delete_document_graph(document_id: str) -> dict[str, Any]:
    settings = get_settings()
    if not settings.neo4j_uri or not settings.neo4j_password:
        return {"enabled": False, "message": "Neo4j is not configured."}

    driver = GraphDatabase.driver(settings.neo4j_uri, auth=(settings.neo4j_username, settings.neo4j_password))
    database = settings.neo4j_database or None
    with driver.session(database=database) as session:
        session.run(
            """
            MATCH (d:BatukDocument {id: $documentId})
            DETACH DELETE d
            """,
            documentId=document_id,
        )
        session.run(
            """
            MATCH (e:BatukEntity)
            WHERE NOT (e)<-[:MENTIONS]-(:BatukDocument)
            DETACH DELETE e
            """
        )
    driver.close()
    return {"enabled": True, "message": "Document graph deleted from Neo4j."}


def build_graph_rag(document_id: str, document_name: str, text: str, elements: list[dict[str, Any]], scope: dict[str, Any], model: str | None = None) -> dict[str, Any]:
    extracted = extract_with_llm(text, model) or extract_entities_and_relationships(text, elements)
    communities = detect_communities(extracted["entities"], extracted["relationships"])
    graph = {
        **extracted,
        "communities": communities,
        "visualization": {
            "nodes": [{"id": e["id"], "label": e["name"], "type": e["type"]} for e in extracted["entities"]],
            "edges": [{"source": r["source"], "target": r["target"], "label": r["type"], "weight": r["weight"]} for r in extracted["relationships"]],
        },
        "extractor": extracted.get("extractor", "heuristic"),
    }
    graph["neo4j"] = write_neo4j(document_id, document_name, graph, scope)
    return graph
