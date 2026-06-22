# File System & Architecture Design

This document details the architectural flow and file system design of Bodhi, the AI Mock Interviewer platform.

## System Architecture Overview

Bodhi is designed for ultra-low latency, real-time voice streaming, and stateful AI orchestration.

```text
┌─────────────┐     ┌──────────────────────┐     ┌──────────┐
│  Next.js UI │────▶│ FastAPI (30+ routes) │────▶│  Gemini  │
│  (client/)  │◀────│ LangGraph Orchestr.  │◀────│   LLM    │
└──────┬──────┘     └──────────┬───────────┘     └──────────┘
       │                       │
 (WS Video/Audio)      ┌───────┼───────┐
       │               │               │
┌──────▼──────┐ ┌─────▼──────┐ ┌──────▼──────┐
│  Proctoring │ │   Redis    │ │  NeonDB     │
│   Worker    │ │  (Queues & │ │ PostgreSQL  │
│  (1 FPS CV) │ │   Cache)   │ │ + pgvector  │
└─────────────┘ └────────────┘ └─────────────┘
```

## Core Components

### 1. The Real-Time Voice Pipeline (WebSocket)
To achieve natural conversational latency:
- The frontend captures audio via microphone, utilizing an energy-gated VAD (Voice Activity Detection) system to identify speech segments.
- Audio chunks are sent to the FastAPI backend via WebSockets.
- The backend routes the audio to the STT engine (Saaras V3).
- The resulting text is streamed into LangGraph. As Gemini generates tokens, punctuation triggers sentence-level chunking, which is immediately sent to the TTS engine (Bulbul V3). 
- Audio chunks are returned over the WebSocket and autoplayed.

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
│   ├── .env                     # Secrets (Gemini, Sarvam, NeonDB, Redis)
│   ├── .env.example             # Template for .env
│   └── src/                     # Backend Source Code
│       ├── api/                 # FastAPI routes and server logic
│       │   ├── app.py           # Application entrypoint & CORS
│       │   ├── interviews.py    # Session lifecycle & WebSocket handler
│       │   ├── documents.py     # RAG ingestion endpoints
│       │   └── ...
│       ├── services/            # External API integrations
│       │   ├── llm.py           # Gemini Langchain setup
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

1. **Pre-flight (`/prepare`)**: User posts their Role, Company, and Resume/JD. Bodhi pulls RAG context, parses the resume, generates a gap map, pre-generates 2 Technical and 2 DSA questions, and stages this in Redis.
2. **Connection**: Frontend opens a WebSocket connection to the backend.
3. **User Turn**: User speaks. VAD detects silence and sends audio to STT.
4. **LLM Evaluation**: LangGraph injects the transcript. Gemini evaluates the response, optionally uses the `score_answer` tool, checks the target question queue, and generates a reply.
5. **Streaming Output**: Tokens are filtered. Only conversational tokens are sent to TTS. Audio plays on the client.
6. **Phase Transition**: If `transition_phase` is invoked, the `compact_memory` node runs, summarizes the phase, saves to Redis, and moves the state machine forward.
