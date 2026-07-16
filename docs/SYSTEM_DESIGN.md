# File System & Architecture Design

This document details the architectural flow and file system design of Bodhi, the AI Mock Interviewer platform.

## System Architecture Overview

Bodhi is designed for ultra-low latency, real-time voice streaming, and stateful AI orchestration.

```text
┌─────────────┐     ┌──────────────────────┐     ┌────────────────┐
│  Next.js UI │────▶│ FastAPI (30+ routes) │────▶│  OpenRouter    │
│  (client/)  │◀────│ LangGraph Orchestr.  │◀────│ Claude Haiku 4.5│
└──────┬──────┘     └──────────┬───────────┘     └────────────────┘
       │                       │
 (WS Video/Audio)      ┌───────┼───────┐
       │               │               │
┌──────▼──────┐ ┌─────▼──────┐ ┌──────▼──────┐
│  Proctoring │ │   Redis    │ │  NeonDB     │
│   Worker    │ │  (Queues & │ │ PostgreSQL  │
│  (1 FPS CV) │ │   Cache)   │ │ + pgvector  │
└─────────────┘ └────────────┘ └─────────────┘
```

> **LLM note:** the conversational/interview model is routed through OpenRouter
> (`anthropic/claude-haiku-4.5`) via `services/llm.py`. This is a single-choke-point
> swap — every caller goes through `create_llm()`. The previous Gemini path is
> commented out in place for easy revert. Embeddings for RAG still use Google's
> `gemini-embedding-001` (see §3), which is unaffected by the chat-model swap.

## Core Components

### 1. The Real-Time Voice Pipeline (WebSocket)
To achieve natural conversational latency:
- The frontend captures audio via microphone, utilizing an energy-gated VAD (Voice Activity Detection) system to identify speech segments.
- Audio chunks are sent to the FastAPI backend via WebSockets.
- The backend routes the audio to the STT engine (Saaras V3).
- The resulting text is streamed into LangGraph. As the LLM generates its reply, punctuation triggers sentence-level chunking, which is immediately sent to the TTS engine (Bulbul V3). 
- Audio chunks are returned over the WebSocket and autoplayed.
- **Turn resilience:** if a turn fails (LLM error after its retries, or a TTS stream fault), the WebSocket handler catches it and emits a `turn_error` control event instead of letting the background task die silently. The client shows a short recovery line and resumes listening, so a single failed turn no longer leaves the session permanently dead (previously the socket stayed open but nothing further was ever generated — the failure looked like "TTS stopped working").

### 2. LangGraph Orchestration & Tools
The interview flow is represented as a state graph (`backend/src/graph.py`).
- **Nodes**: `interviewer`, `process_tools`, `compact_memory`.
- **Tools Available to LLM**: `transition_phase`, `score_answer`, `adjust_difficulty`, `end_interview`.
- **Phases**: `intro` → `technical` → `behavioral` → `dsa` → `project` → `wrapup`.

### 3. RAG Pipeline & Document Parsing
The system supports semantic search across documents.
- Uploaded PDFs/DOCXs are parsed (`document_parser.py`), chunked, and embedded via `gemini-embedding-001`.
- Vectors are stored in NeonDB using `pgvector`.
- When an interview starts, relevant Company and Role context is retrieved, merged, and placed in the system prompt.

### 3a. JD-Driven Personalized Question Engine (`rag.py` + `topic_questions` table)
Instead of asking the LLM to invent generic technical questions per interview, the
curriculum is assembled from the candidate's actual context:

- **Topic extraction** — `extract_jd_topics()` pulls the concrete technologies a job
  description actually requires (e.g. `docker`, `ci-cd`, `aws-elb`, `typescript`) and
  normalizes phrasing variants onto canonical keys (`_normalize_topic`).
- **Cached question bank** — `get_topic_questions()` is a cache-or-generate lookup against
  the `topic_questions` table (`topic`, `question`, `tier`). A topic is researched by the
  LLM **once** (miss), stored, then reused by every future candidate who hits it (hit).
  This offloads the expensive per-interview generation to a one-time cost per topic.
  This table is written **only** by LLM generation — never from candidate transcripts —
  so it cannot be poisoned by what a candidate says during a session.
- **Seniority- and gap-aware difficulty** — each topic has three difficulty tiers
  (`conceptual` → `practical` → `expert`). `tier_for_topic()` selects one bounded by
  **both** the candidate's seniority (a hard ceiling — an intern never exceeds
  `conceptual`) **and** the resume/JD gap map (skills the candidate never claimed are
  awareness-checked at `conceptual`; claimed strengths are verified deeply). Final tier is
  the lower of the two, so a junior applying to an advanced role is asked *what* a
  technology is, not *how to optimize it at scale*.

These JD-topic questions are merged (with priority) into the technical phase queue in
`generate_interview_curriculum()`.

### 4. Background Processing & Proctoring
- **Proctoring**: Frontend video chunks are sent via WebSocket. A strict 1 FPS rate limit applies. Frames pass through a cascaded pipeline: MediaPipe (Face/Gaze) → YOLOv8n (Objects/Phones) → ViT (Emotion/Stress). 
- **Report Generation**: On session end (`[END_INTERVIEW]` token detected), the backend instantly routes the frontend to a completion page while scheduling a `BackgroundTasks` run to flush Redis memories to NeonDB and invoke the Report Agent (`backend/src/agents/report_agent.py`) for qualitative synthesis.

## File System Structure

```text
Bodhi/
├── client/                      # Next.js UI Application
├── backend/                     # Deployable backend (self-contained)
│   ├── Dockerfile               # Container build (context = backend/)
│   ├── docker-compose.yml       # API + Redis orchestration
│   ├── requirements.txt         # Python dependencies
│   ├── .env                     # Secrets (OpenRouter, Gemini embeddings, Sarvam, NeonDB, Redis)
│   ├── .env.example             # Template for .env
│   └── src/                     # Backend Source Code
│       ├── api/                 # FastAPI routes and server logic
│       │   ├── app.py           # Application entrypoint & CORS
│       │   ├── interviews.py    # Session lifecycle & WebSocket handler
│       │   ├── documents.py     # RAG ingestion endpoints
│       │   └── ...
│       ├── services/            # External API integrations
│       │   ├── llm.py           # Chat LLM setup (OpenRouter/Claude Haiku; Gemini path retained, commented)
│       │   ├── stt.py           # Speech-to-Text (Saaras V3)
│       │   └── tts.py           # Text-to-Speech (Bulbul V3)
│       ├── graph.py             # LangGraph state machine definition
│       ├── state.py             # TypedDict definitions and Phase configurations
│       ├── tools.py             # LangGraph bound tools (scoring, transitioning)
│       ├── memory.py            # Phase memory compaction and extraction
│       ├── report.py            # Final analytical report generation
│       ├── rag.py               # Document retrieval and pgvector queries
│       ├── document_parser.py   # PDF and Word document text extraction
│       ├── cache.py             # Redis connection and caching logic
│       ├── storage.py           # NeonDB connection and SQL execution
│       ├── main.py              # Standalone CLI voice loop entrypoint
│       └── resume_parser.py     # Specialized LLM resume extraction logic
├── Makefile                     # run / cli / dev targets
└── docs/                        # Architecture & technical docs
```

## Data Flow: Interview Start & Turn Execution

1. **Pre-flight (`/prepare`)**: User posts their Role, Company, and Resume/JD. Bodhi pulls RAG context, parses the resume, and generates a gap map. It then extracts concrete topics from the JD and assembles the technical queue from the seniority- and gap-tiered `topic_questions` cache (see §3a), alongside pre-generated DSA questions, and stages this in Redis.
2. **Connection**: Frontend opens a WebSocket connection to the backend.
3. **User Turn**: User speaks. VAD detects silence and sends audio to STT.
4. **LLM Evaluation**: LangGraph injects the transcript. The LLM (Claude Haiku 4.5 via OpenRouter) evaluates the response, optionally uses the `score_answer` tool, checks the target question queue, and generates a reply.
5. **Streaming Output**: Tokens are filtered. Only conversational tokens are sent to TTS. Audio plays on the client.
6. **Phase Transition**: If `transition_phase` is invoked, the `compact_memory` node runs, summarizes the phase, saves to Redis, and moves the state machine forward.
