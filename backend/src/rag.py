"""RAG system for company profile knowledge base.

Handles document chunking, embedding, ingestion, retrieval, and
post-interview contribution via pgvector on NeonDB.
"""

from __future__ import annotations

import os
from typing import TYPE_CHECKING

from src.embeddings import get_embedding, get_embeddings

if TYPE_CHECKING:
    from src.storage import BodhiStorage


def chunk_text(
    text: str,
    chunk_size: int = 500,
    overlap: int = 50,
) -> list[str]:
    """Split text into overlapping word-level chunks."""
    words = text.split()
    if len(words) <= chunk_size:
        return [text.strip()] if text.strip() else []
    chunks: list[str] = []
    start = 0
    while start < len(words):
        end = start + chunk_size
        chunks.append(" ".join(words[start:end]))
        start = end - overlap
    return chunks


def ingest_document(
    company: str,
    role: str,
    text: str,
    storage: BodhiStorage,
    source_label: str = "",
    contributed_by: str = "",
) -> int:
    """Chunk, embed, and store a document for a company+role.
    Returns the number of chunks inserted."""
    chunks = chunk_text(text)
    if not chunks:
        return 0

    embeddings = get_embeddings(chunks)
    rows = [
        (chunk, idx, emb)
        for idx, (chunk, emb) in enumerate(zip(chunks, embeddings))
    ]
    return storage.insert_document_chunks(
        company, role, rows,
        source_label=source_label,
        contributed_by=contributed_by,
    )


def retrieve_context(
    company: str,
    role: str,
    storage: BodhiStorage,
    query: str | None = None,
    top_k: int = 5,
) -> str:
    """Embed a query and return merged role-only + company-specific context.

    When company is provided, search_similar_chunks already fetches both
    company-specific and role-only general docs (company='general'). When
    company is empty or 'general', only role-level docs are returned.
    """
    effective_company = company if company and company.lower() != "general" else "general"
    if query is None:
        query = f"{effective_company} {role} interview preparation"
    query_emb = get_embedding(query)
    results = storage.search_similar_chunks(effective_company, role, query_emb, top_k=top_k)
    if not results:
        return ""
    return "\n\n".join(r["chunk_text"] for r in results)


_TOPICS_PROMPT = """\
You are an expert interview coach. Given the following document about a {role} position \
{company_clause}, extract 10-15 concrete interview topics or questions that an interviewer \
should explore. Focus on technical skills, domain knowledge, and behavioral competencies \
mentioned in the material.

Output ONLY a numbered list (one topic per line). No preamble, no summary.

DOCUMENT:
{text}
"""


def extract_topics(
    text: str,
    company: str,
    role: str,
) -> list[str]:
    """Use Gemini to extract 10-15 interview topics from document text."""
    if not text or len(text) < 50:
        return []

    from src.services.llm import create_llm, _extract_text
    from langchain_core.messages import HumanMessage

    company_clause = f"at {company}" if company and company.lower() != "general" else "(general)"
    llm = create_llm(api_key=os.getenv("GOOGLE_API_KEY", ""))
    prompt = _TOPICS_PROMPT.format(
        role=role, company_clause=company_clause, text=text[:8000],
    )
    response = llm.invoke([HumanMessage(content=prompt)])
    raw = _extract_text(response.content).strip()

    topics: list[str] = []
    for line in raw.splitlines():
        line = line.strip().lstrip("0123456789.)-] ").strip()
        if line:
            topics.append(line)
    return topics[:15]


_PROFILE_PROMPT = """\
You are an expert technical recruiter analyzing a document about a {role} position {company_clause}.
Extract the following exact fields into a valid JSON object ONLY:
- "description": A concise overview of what the company/role entails based on the text.
- "tech_stack": A comma-separated list of the core technologies mentioned.
- "hiring_patterns": Any specific interview rounds, types of questions, or candidate traits they look for.

If any field is completely absent from the text, use an empty string.
Output ONLY standard JSON, with no markdown code blocks or additional text.

DOCUMENT:
{text}
"""

def extract_profile_data(
    text: str,
    company: str,
    role: str,
) -> dict:
    """Use Gemini to extract structured company/role profile data from document text."""
    if not text or len(text) < 50:
        return {"description": "", "tech_stack": "", "hiring_patterns": ""}

    import json
    from src.services.llm import create_llm, _extract_text
    from langchain_core.messages import HumanMessage

    company_clause = f"at {company}" if company and company.lower() != "general" else "(general)"
    llm = create_llm(api_key=os.getenv("GOOGLE_API_KEY", ""))
    prompt = _PROFILE_PROMPT.format(
        role=role, company_clause=company_clause, text=text[:16000],
    )
    response = llm.invoke([HumanMessage(content=prompt)])
    raw = _extract_text(response.content).strip()

    # Clean up standard markdown json formatting if present
    if raw.startswith("```json"):
        raw = raw[7:]
    if raw.startswith("```"):
        raw = raw[3:]
    if raw.endswith("```"):
        raw = raw[:-3]
    raw = raw.strip()

    try:
        data = json.loads(raw)
        return {
            "description": data.get("description", ""),
            "tech_stack": data.get("tech_stack", ""),
            "hiring_patterns": data.get("hiring_patterns", ""),
        }
    except Exception as e:
        print(f"Failed to parse profile JSON: {e}\nRaw output: {raw}")
        return {"description": "", "tech_stack": "", "hiring_patterns": ""}


_TOPIC_ALIASES = {
    "aws elb": "aws-elb", "elastic load balancer": "aws-elb", "aws load balancer": "aws-elb",
    "elb": "aws-elb",
    "ci/cd": "ci-cd", "cicd": "ci-cd", "continuous integration": "ci-cd",
    "continuous deployment": "ci-cd", "continuous delivery": "ci-cd",
    "message queue": "message-queues", "message queues": "message-queues", "mq": "message-queues",
    "k8s": "kubernetes",
}


def _normalize_topic(raw: str) -> str:
    """Collapse common phrasing variants onto one canonical topic key.

    ponytail: exact-key + small alias map only, no embedding-based topic
    dedup — add that if paraphrase misses become common in practice.
    """
    key = raw.strip().lower().strip(".,;:")
    return _TOPIC_ALIASES.get(key, key)


_TOPIC_EXTRACTION_PROMPT = """\
You are analyzing a job description to extract concrete technical topics an interviewer \
should test a candidate on.

List 4-8 SPECIFIC technologies, tools, or practices explicitly required or strongly implied \
by this JD (e.g. "docker", "ci-cd", "aws-elb", "typescript", "message-queues") — NOT generic \
terms like "programming", "problem solving", or "communication".

JOB DESCRIPTION:
{jd_text}

Output ONLY a JSON array of lowercase, hyphenated topic strings. No markdown, no commentary.
Example: ["docker", "ci-cd", "aws-elb", "typescript"]
"""


def extract_jd_topics(jd_text: str) -> list[str]:
    """Extract normalized, concrete technical topics from a job description."""
    if not jd_text or not jd_text.strip():
        return []

    import json
    import re
    from src.services.llm import create_llm, _extract_text
    from langchain_core.messages import HumanMessage

    llm = create_llm(api_key=os.getenv("GOOGLE_API_KEY", ""))
    prompt = _TOPIC_EXTRACTION_PROMPT.format(jd_text=jd_text[:4000])
    response = llm.invoke([HumanMessage(content=prompt)])
    raw = _extract_text(response.content).strip()

    match = re.search(r'\[.*\]', raw, re.DOTALL)
    if match:
        raw = match.group(0)
    try:
        topics = json.loads(raw)
    except json.JSONDecodeError:
        return []
    if not isinstance(topics, list):
        return []
    return [_normalize_topic(t) for t in topics if isinstance(t, str) and t.strip()][:8]


_TOPIC_QUESTIONS_PROMPT = """\
Generate technical interview questions about "{topic}" for a software engineering interview.

The three tiers MUST be clearly separated by difficulty — a beginner should be able to
answer the conceptual questions, and only an experienced engineer should be expected to
answer the expert ones. Produce exactly 2 questions per tier:
- "conceptual": for someone who has only read/heard about {topic} and never used it in
  production. Ask what it is, why/when it's used, basic terminology. NO deep optimization,
  scale, tuning, or architecture questions here.
- "practical": for someone with hands-on experience — real usage scenarios, common
  trade-offs, everyday debugging.
- "expert": for a senior engineer — failure modes at scale, performance optimization,
  edge cases, architectural decisions.

Output ONLY valid JSON with exactly these 3 keys, each a list of exactly 2 question strings:
{{"conceptual": ["Q1", "Q2"], "practical": ["Q1", "Q2"], "expert": ["Q1", "Q2"]}}
No markdown, no commentary.
"""


def _generate_topic_questions(topic: str) -> dict[str, list[str]]:
    """One-time LLM generation of a tiered question set for a topic (cache miss path)."""
    import json
    import re
    from src.services.llm import create_llm, _extract_text
    from langchain_core.messages import HumanMessage

    llm = create_llm(api_key=os.getenv("GOOGLE_API_KEY", ""))
    prompt = _TOPIC_QUESTIONS_PROMPT.format(topic=topic)
    response = llm.invoke([HumanMessage(content=prompt)])
    raw = _extract_text(response.content).strip()

    match = re.search(r'\{.*\}', raw, re.DOTALL)
    if match:
        raw = match.group(0)
    try:
        data = json.loads(raw)
    except json.JSONDecodeError:
        return {"conceptual": [], "practical": [], "expert": []}

    return {
        tier: [q for q in data.get(tier, []) if isinstance(q, str) and q.strip()][:2]
        for tier in ("conceptual", "practical", "expert")
    }


def get_topic_questions(topic: str, storage: "BodhiStorage", tier: str = "practical", limit: int = 2) -> list[str]:
    """Cache-or-generate lookup: reuse a topic's question bank across every
    candidate who hits that topic, instead of re-generating (and re-researching)
    it per interview. Miss once per topic, hit forever after."""
    key = _normalize_topic(topic)

    cached = storage.get_topic_questions(key, tier=tier, limit=limit)
    if cached:
        return [row["question"] for row in cached]

    generated = _generate_topic_questions(key)
    rows = [(q, t) for t, qs in generated.items() for q in qs]
    if rows:
        storage.insert_topic_questions(key, rows)

    return generated.get(tier, [])[:limit]


_TIER_ORDER = ["conceptual", "practical", "expert"]


def _seniority_cap(experience_level: str, candidate_profile: dict | None) -> int:
    """Highest tier index (into _TIER_ORDER) a candidate of this seniority should
    ever be asked. This is the hard fix for interns getting staff-level questions:
    an intern is capped at 'conceptual' no matter what the JD or gap map says.
    """
    level = (experience_level or "").lower()
    if any(k in level for k in ("intern", "fresher", "entry", "junior")):
        return 0
    if any(k in level for k in ("senior", "staff", "principal", "lead", "executive")):
        return 2
    if candidate_profile:
        sen = (candidate_profile.get("seniority_level") or "").lower()
        if sen in ("intern", "junior"):
            return 0
        if sen in ("senior", "staff", "principal", "executive"):
            return 2
    return 1  # mid-level default


def tier_for_topic(
    topic: str,
    gap_map: dict | None,
    experience_level: str = "",
    candidate_profile: dict | None = None,
) -> str:
    """Pick question depth for a topic, bounded by BOTH the candidate's seniority
    and the resume/JD gap analysis.

    Seniority sets a hard ceiling (an intern never exceeds 'conceptual'); within
    that ceiling the gap map decides:
      gaps          -> conceptual (never claimed it — awareness check only)
      partial_match -> practical
      strong_match  -> expert (claimed strength — verify real depth)
      unmatched / no gap data -> the seniority default
    Final tier = min(seniority ceiling, gap suggestion), so the lower of the two wins.
    """
    cap = _seniority_cap(experience_level, candidate_profile)

    suggested = cap  # no gap data → use the full seniority allowance
    if gap_map:
        topic_words = topic.replace("-", " ").lower()

        def _mentions(skills: list[str]) -> bool:
            return any(topic_words in s.lower() or s.lower() in topic_words for s in (skills or []))

        if _mentions(gap_map.get("gaps")):
            suggested = 0
        elif _mentions(gap_map.get("partial_match")):
            suggested = 1
        elif _mentions(gap_map.get("strong_match")):
            suggested = 2
        else:
            suggested = cap

    return _TIER_ORDER[min(cap, suggested)]


_EXTRACT_PROMPT = """\
You are an analyst extracting company-specific intelligence from an interview transcript.

Given the transcript below for a {role} position at {company}, extract ONLY concrete, \
reusable facts about the company's hiring process, technical expectations, culture, \
or interview patterns. Ignore candidate-specific details.

Output a concise paragraph (3-8 sentences). If there is nothing company-specific to \
extract, respond with exactly: NOTHING_TO_EXTRACT

TRANSCRIPT:
{transcript}
"""


def extract_and_contribute(
    company: str,
    role: str,
    transcript: str,
    storage: BodhiStorage,
) -> int:
    """Use Gemini to extract company intel from a transcript, then ingest it.
    Returns number of chunks inserted (0 if nothing extracted)."""
    if not transcript or len(transcript) < 100:
        return 0

    from src.services.llm import create_llm, _extract_text
    from langchain_core.messages import HumanMessage

    llm = create_llm(api_key=os.getenv("GOOGLE_API_KEY", ""))
    prompt = _EXTRACT_PROMPT.format(
        company=company, role=role, transcript=transcript[:8000],
    )
    response = llm.invoke([HumanMessage(content=prompt)])
    extracted = _extract_text(response.content).strip()

    if not extracted or "NOTHING_TO_EXTRACT" in extracted:
        return 0

    return ingest_document(
        company, role, extracted, storage,
        source_label="interview_extract",
        contributed_by="bodhi_auto",
    )
