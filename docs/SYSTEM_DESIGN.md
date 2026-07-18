# System Design: Bodhi Interview Engine

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                          Next.js 15 Frontend                        │
│  Landing (Hero + Bento Workflow) → Interview Setup → WebSocket      │
│                                                                      │
│  Components:                                                         │
│  ├─ Hero: Spline 3D particle brain, headline (84px), CTAs           │
│  ├─ Bento Demo: Video (tilted left) + Workflow steps (right)        │
│  ├─ Interview: Orb avatar (WebGL), transcript, metrics              │
│  └─ Theme: Bodhi warm palette (cream #faf6f0, clay #d97757)         │
└──────────────────────────────────────┬──────────────────────────────┘
                                       │ WebSocket /ws/{sessionId}
                                       │
        ┌──────────────────────────────▼──────────────────────────┐
        │             FastAPI Backend (30+ routes)               │
        │                                                          │
        │  ┌─────────────────────────────────────────────────┐   │
        │  │       LangGraph Interview State Machine         │   │
        │  │  Nodes: interviewer, process_tools, memory      │   │
        │  │  Tools: score_answer, transition_phase, etc.    │   │
        │  └─────────────────────────────────────────────────┘   │
        │                                                          │
        │  ┌──────────────┐  ┌─────────────────┐                │
        │  │ Audio I/O    │  │ Document/Memory │                │
        │  │ (STT+TTS)    │  │ (RAG + compact) │                │
        │  └──────────────┘  └─────────────────┘                │
        └──────────────────────────────────────────────────────┘
                │                   │                   │
        ┌───────▼─────┐      ┌──────▼──────┐     ┌────▼────┐
        │  Deepgram   │      │  NeonDB     │     │  Redis  │
        │ STT / TTS   │      │ PostgreSQL  │     │  Cache  │
        │ Linear16    │      │ + pgvector  │     │  Queues │
        └─────────────┘      └─────────────┘     └─────────┘
```

---

## Core Components

### 1. Frontend Architecture (Next.js 15)

**Structure:**
```
client/
├── app/
│   ├── page.tsx                    # Landing page
│   ├── globals.css                 # Theme tokens (bodhi-*)
│   ├── layout.tsx                  # Root (Montserrat font, Clerk auth)
│   └── (dashboard)/                # Protected routes
│       ├── dashboard/page.tsx       # Interview history, scores
│       ├── resumes/page.tsx         # Resume management
│       └── report/[sessionId]/page.tsx  # Final report view
├── components/
│   ├── hero.tsx                    # Landing hero section
│   ├── hero-brain.tsx              # Spline iframe with vignette mask
│   ├── demo-video-section.tsx      # Merged demo + workflow bento
│   ├── interview/
│   │   ├── Orb.tsx                 # WebGL avatar (react-three-fiber)
│   │   ├── InterviewSetupForm.tsx  # Mode/resume/JD selection
│   │   └── InterviewSessionView.tsx # Active interview interface
│   ├── app/ui/                     # Shadcn components (3 total)
│   │   ├── alert-dialog.tsx        # Modals
│   │   ├── button.tsx              # All CTAs
│   │   └── textarea.tsx            # Text inputs
│   └── landing-background.tsx      # Gradient backgrounds
├── hooks/
│   ├── useInterviewAudio.ts        # WebSocket audio control
│   ├── useSeamlessAudio.ts         # PCM buffering + scheduling
│   ├── useProctoring.ts            # Camera + proctoring state
│   └── useSentimentAnalysis.ts     # Behavioral tracking (TBD)
├── lib/
│   ├── api.ts                      # API client (fetch wrappers)
│   └── utils.ts                    # Utility functions
└── middleware.ts                   # Auth gate + proxy
```

**Theme System (CSS Variables):**
```css
:root {
  --bodhi-bg:      #faf6f0;                       /* Page background */
  --bodhi-surface: #fffdfb;                       /* Card backgrounds */
  --bodhi-clay:    #d97757;                       /* Primary accent */
  --bodhi-line:    rgba(55, 50, 47, 0.12);       /* Dividers */
  --font-inter:    Montserrat, sans-serif;        /* Body font (was Inter) */
  --font-instrument-serif: Instrument Serif;     /* Italic accents */
}
```

All components reference these via `bg-bodhi-*`, `border-bodhi-*`, etc. One change to a CSS variable updates the entire app.

**Landing Page Layout:**
```
Hero Section (full-width)
├─ 1360px centered grid
├─ Left: Headline (84px), subtext, CTAs
└─ Right: Spline 3D brain (640px, vignette fade)

Demo Video + Workflow Bento (asymmetric)
├─ 1100px container, 1 bordered box
├─ Internal grid: 1.8fr (left) | 1fr (right)
├─ Left (wide):
│  ├─ Video (tilted -3°, hovers to 0°)
│  └─ Voice interview mic visualization
└─ Right (narrow):
   ├─ Upload resume step (tall card)
   ├─ Select role step (short card)
   ├─ Voice interview step (short card)
   └─ Scorecard step (tall card)
```

**Orb Avatar (WebGL via react-three-fiber):**
```tsx
// Uses perlin-noise.png texture, real-time color driven by phase
const phaseColors = {
  talking: { primary: "#D97757", secondary: "#F2C4A8" },
  listening: { primary: "#E8A87C", secondary: "#F7DEC8" },
  thinking: { primary: "#C9B29B", secondary: "#EBDFD2" }
}

// Canvas + Suspense boundary (texture loading)
// Fallback: radial gradient backdrop if texture loads slow
```

---

### 2. Backend Architecture (FastAPI + LangGraph)

**API Routes (30+):**

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/interviews/prepare` | POST | Prep interview: resolve profile, cache curriculum |
| `/ws/{sessionId}` | WebSocket | Real-time audio/video/control streaming |
| `/api/interviews/{id}/end` | POST | Finalize session, trigger report generation |
| `/api/documents/upload` | POST | Ingest company/role/JD documents |
| `/api/resumes/upload` | POST | Parse candidate resume |
| `/api/companies` | GET | List company profiles |
| `/api/roles/{company}` | GET | List roles for company |
| `/api/users/me` | GET | Authenticated user profile |
| `/api/proctoring/{id}/summary` | GET | Violation summary for session |
| `/api/reports/{id}` | GET | Generated report with scores |

**LangGraph State Machine:**

```python
class InterviewState(TypedDict):
    # Lifecycle
    session_id: str
    phase: Literal["intro", "technical", "behavioral", "dsa", "project", "wrapup"]
    should_end: bool
    difficulty_level: int  # 1-10
    
    # Content
    candidate_name: str
    target_company: str
    target_role: str
    messages: list[dict]  # Full transcript
    
    # Context
    entity_context: str  # RAG: company/role description
    candidate_profile: dict  # Parsed resume
    jd_context: str  # Job description
    gap_map: dict  # Resume vs JD gaps
    
    # State tracking
    current_question: str
    question_count: int  # Per phase
    max_questions: int  # Phase cap
    
    # Memory
    phase_memories: list[dict]  # Compacted prior phases
    cross_section_context: str  # Injected into prompt
    
    # Scoring
    phase_scores: dict  # {phase: [scores]}
    
    # Demo mode
    quick_demo: bool  # 1-2 Q/phase
```

**Graph Structure:**

```
              ┌─────────────────┐
              │   start: idle   │
              └────────┬────────┘
                       │
              ┌────────▼────────┐
         ┌───▶│   interviewer   │◀────────┐
         │    └────────┬────────┘         │
         │             │                  │
         │    ┌────────▼────────┐         │
         │    │  process_tools  │         │
         │    └────────┬────────┘         │
         │             │                  │
         │      ┌──────┴──────┐            │
         │      │             │            │
         │  score_answer  transition_phase │
         │  adjust_diff.  end_interview    │
         │      │             │            │
         │      └──────┬──────┘            │
         │             │                  │
         │   ┌─────────▼─────────┐        │
         │   │  compact_memory?  │        │
         │   │  (on transition)  │        │
         │   └─────────┬─────────┘        │
         │             │                  │
         └─────────────┴──────────────────┘
                       │
              ┌────────▼────────┐
              │   end: done     │
              └─────────────────┘
```

**Node Behavior:**

1. **interviewer**: Injects prompt (target Q + context), streams LLM tokens, filters conversational output
2. **process_tools**: Routes tool calls (score, transition, etc.)
3. **compact_memory**: On phase transition, LLM summarizes completed phase → JSON → Redis + next phase prompt
4. **Conditional routing**: If `should_end=true`, route to end node; else loop back to interviewer

---

### 3. Real-Time Audio Pipeline

**Latency Budget Breakdown:**

| Stage | Duration | Notes |
|-------|----------|-------|
| VAD detection | 100-200ms | Local browser, energy-gated |
| Audio chunking + WS send | 50-100ms | Binary frame over socket |
| STT (Deepgram) | 300-500ms | Async, includes network |
| LLM first token | 700-900ms | OpenRouter (Claude Haiku) |
| Sentence accumulation | 100-200ms | Wait for punctuation + buffer |
| TTS (Sarvam) | 200-400ms | Per sentence, parallel |
| Audio return + playback | 100-200ms | Streaming autplay |
| **Total (P50)** | **1.8-2.5s** | Acceptable conversational latency |

**Data Flow:**

```
SEND:
  Browser (microphone)
    ↓
  PCM 16kHz 16-bit stream
    ↓
  WebSocket binary frame
    ↓
  Backend audio_handler()
    ↓
  Deepgram STT (async)
    ↓
  Transcript → LangGraph

PROCESS:
  LangGraph interviewer node
    ↓
  OpenRouter API (Claude Haiku)
    ↓
  Token stream
    ↓
  Filter conversational tokens only (no tool markers)
    ↓
  Accumulate by sentence

RECEIVE:
  Sentence buffer + punctuation
    ↓
  Sarvam TTS (Linear16 PCM)
    ↓
  WebSocket binary stream to client
    ↓
  Browser audio context scheduling
    ↓
  Seamless playback (no gaps)
```

**Key Optimization: Seamless Audio Playback**

The `useSeamlessAudio` hook implements a two-buffer system:
```typescript
// Buffers incoming PCM chunks
decodedBuffersRef.current: AudioBuffer[]

// Scheduled sources (prevents duplicate playback)
scheduledSourcesRef.current: AudioBufferSourceNode[]

// On each chunk:
//   1. Decode PCM → AudioBuffer
//   2. Push to buffer queue
//   3. If buffered duration >= 300ms:
//      - Schedule all buffered sources for playback
//      - Update nextStartTime to prevent overlaps
```

This eliminates stutter and ensures continuous playback even if TTS chunks arrive at irregular intervals.

---

### 4. Document Storage & RAG Pipeline

**Ingestion Flow:**

```
PDF/DOCX Upload
    ↓ document_parser.py (PyPDF2 + python-docx)
  Extract text
    ↓
  Chunk by paragraph (500 token max)
    ↓
  Embed each chunk (Gemini embedding-001, 3072-dim)
    ↓
  Store in pgvector (NeonDB)
    │
    └─ Columns:
       - id, document_id
       - chunk_text (text)
       - embedding (vector, 3072)
       - contributed_by ('user' or 'bodhi_auto')
       - created_at
```

**Query (Retrieval at Interview Start):**

```python
def search_similar_chunks(session_state, query: str, top_k=5):
    # Embed query
    query_embedding = embed(query)  # 3072-dim
    
    # Semantic search (cosine similarity)
    results = db.select("""
        SELECT chunk_text, similarity 
        FROM document_chunks 
        WHERE contributed_by = 'user'  -- Anti-poisoning
        ORDER BY embedding <=> %s      -- pgvector cosine
        LIMIT %s
    """, query_embedding, top_k)
    
    # Merge into RAG context
    entity_context = "\n".join([r.chunk_text for r in results])
    return entity_context
```

**Anti-Poisoning Safeguard:**
- Only human-uploaded documents (` contributed_by = 'user'`) are retrievable
- Auto-generated summaries from candidate transcripts (tagged `'bodhi_auto'`) are excluded
- Auto-contribution writer (`extract_and_contribute`) disabled by default (`BODHI_RAG_AUTO_CONTRIBUTE=false`)
- Prevents candidates from asserting something mid-interview and having it retrieved as "company intel" for future candidates

---

### 5. Multi-Dimensional Scoring System

**Invocation:**

```python
# During LLM response generation
tool_call = LLMToolCall(
    name="score_answer",
    args={
        "answer_text": "I used Redis for distributed caching...",
        "dimension": "accuracy"  # or "depth", "communication", "confidence"
    }
)

# LangGraph routes to score_answer tool
```

**Scoring LLM Prompt (Claude Haiku):**

```
You are a technical interview evaluator.

ANSWER: "{answer_text}"
DIMENSION: {dimension}
TARGET_QUESTION: "{target_question}"

Score this answer on the {dimension} dimension (1-5 scale):
- 1: Completely wrong or missing
- 3: Partially correct, some gaps
- 5: Excellent, comprehensive

RESPONSE: {"score": 4, "justification": "..."}
```

**Aggregation:**

```
Per-answer scores:
  accuracy: 4/5 (weight 30%)
  depth: 2/5 (weight 25%)
  communication: 4/5 (weight 20%)
  confidence: 4/5 (weight 15%)

Composite = (4×0.30) + (2×0.25) + (4×0.20) + (4×0.15)
          = 1.2 + 0.5 + 0.8 + 0.6
          = 3.1/5
          = 62%
          = D+ (if < 2.5: needs probing)

Phase average = mean(answers in phase)
Final grade = weighted avg of all phases
```

**Storage:**

```sql
INSERT INTO answer_scores (
    session_id, phase, question_num,
    accuracy, depth, communication, confidence,
    composite, feedback, probed, probe_reason
) VALUES (...);
```

---

### 6. Phase Compaction & Cross-Phase Context

**Memory Compaction Node (on transition):**

```python
async def compact_memory(state: InterviewState) -> dict:
    """Summarize completed phase for next phase context."""
    
    phase = state["phase"]
    phase_transcript = extract_phase_messages(state["messages"], phase)
    
    prompt = f"""
    Summarize this {phase} interview phase:
    
    TRANSCRIPT:
    {phase_transcript}
    
    Provide JSON with:
    - key_claims: [...]
    - strengths: [...]
    - weaknesses: [...]
    - follow_up_hooks: [...recommendations for next phase...]
    - topics_covered: [...]
    """
    
    summary = await llm.agenerate(prompt)  # JSON
    
    # Store in Redis
    redis.set(f"memory:{state['session_id']}:{phase}", json.dumps(summary))
    
    # Inject into next phase
    state["cross_section_context"] = format_memory_block(summary)
    
    return state
```

**Example Output:**

```json
{
  "key_claims": [
    "Candidate built a multi-region Redis cluster",
    "Used Lua for atomic operations",
    "Familiar with replication lag issues"
  ],
  "strengths": [
    "Strong distributed systems foundation",
    "Considered trade-offs (consistency vs. latency)",
    "Production experience with caching"
  ],
  "weaknesses": [
    "Didn't mention monitoring/alerting",
    "No discussion of eviction policies",
    "Vague on failure mode recovery"
  ],
  "follow_up_hooks": [
    "In behavioral: ask about debugging under pressure",
    "In DSA: probe complexity for cache eviction algorithms",
    "In project: ask about observability in their projects"
  ],
  "topics_covered": ["distributed systems", "caching", "consistency models"]
}
```

**Injection into Next Phase:**

```
SYSTEM PROMPT (Behavioral Phase):

...base instructions...

CROSS_SECTION_CONTEXT:
From the technical phase, the candidate demonstrated:

STRENGTHS:
- Strong distributed systems foundation
- Considered trade-offs (consistency vs. latency)
- Production experience with caching

WEAKNESSES:
- Didn't mention monitoring/alerting
- No discussion of eviction policies
- Vague on failure mode recovery

FOLLOW-UP DIRECTIVES:
1. In this behavioral phase, probe how candidate debugs issues under pressure
   (they were vague on distributed failure recovery)
2. Use their Redis experience as a hook: "Tell me about a time you had to
   monitor a critical system. How did you set up alerts?"
3. This naturally connects to their technical gaps while assessing behavioral traits.

...continue with behavioral phase instructions...
```

---

### 7. Quick Demo Mode (New)

**Activation:**
```
1. User clicks "Just demo" button on /interview page
2. Button toggles: state quickDemoActive = true
3. Subtitle updates: "Quick demo active — 1–2 questions per phase"
4. User fills form normally, clicks "Continue"
5. API call includes quick_demo: true flag
```

**Backend Handling:**

```python
# In prepareInterview endpoint
initial_state_data = {
    ...
    "quick_demo": body.quick_demo,  # true or false
}

# In state.py
QUICK_DEMO_PHASE_CONFIG = {
    "intro": {"max_questions": 1},
    "technical": {"max_questions": 2},
    "behavioral": {"max_questions": 1},
    "dsa": {"max_questions": 1},
    "project": {"max_questions": 0},  # skip
    "wrapup": {"max_questions": 1},
}

# In graph.py
if state.get("quick_demo", False):
    max_q = QUICK_DEMO_PHASE_CONFIG.get(phase, {}).get("max_questions", 2)
    if q_count >= max_q:
        # Auto-transition to next phase
        state["transition_phase"] = get_next_phase(phase)
```

**Result:**
- Full-flow interview in ~10 minutes instead of ~45
- Same quality feedback and scoring
- Perfect for onboarding / feature preview

---

## Data Persistence Strategy

### Three-Tier Storage

| Tier | Technology | Purpose | Latency | TTL |
|------|-----------|---------|---------|-----|
| Edge | MemorySaver (in-process) | Current state during active turn | <1ms | Ephemeral |
| Cache | Redis | Session snapshots, question queues, memories | 1-5ms | 24h |
| Persistent | NeonDB PostgreSQL | Transcripts, scores, profiles, embeddings | 10-50ms | Forever |

**Flow:**

```
1. Interview starts
   → initial_state cached to Redis
   → MemorySaver holds working state

2. During turn
   → State mutations in MemorySaver (zero latency)
   → At checkpoints: sync to Redis (sub-ms)

3. On phase end
   → Background task: flush phase_memories to PostgreSQL
   → Background task: flush answer_scores to PostgreSQL

4. On session end
   → Background task: flush full transcript
   → Background task: invoke Report Agent
   → Background task: generate final report JSON
   → User route to /report/{sessionId}, fetch from PostgreSQL
```

---

## Security & Governance

**Authentication:**
- Clerk (OAuth via Google/GitHub) for user identity
- JWT in Authorization header for API routes
- WebSocket authenticated via session_id + user context

**Authorization:**
- `/interview` page requires auth
- `/api/interviews/` endpoints validate user owns session
- Document uploads scoped to authenticated user

**Input Validation:**
- Resume file size: max 10MB
- Document upload: allowed types (PDF, DOCX)
- Candidate name: sanitized, max 100 chars
- Transcript: stored as-is, no XSS risk (server-side rendering)

**Data Privacy:**
- Resumes stored in NeonDB, encrypted at rest (Neon feature)
- Redis cache cleared after 24h
- Transcripts retained for report access, can be deleted per GDPR
- No third-party sharing (Deepgram, Google, OpenRouter receive only necessary payloads)

---

## Monitoring & Observability

**Logging:**

```python
# Via loguru + structured JSON
logger.info("Interview session started", session_id=sid, user_id=uid, mode=mode)
logger.warning("Phase transition delayed", phase="technical", reason="LLM timeout", latency_ms=1200)
logger.error("Proctoring violation", session_id=sid, violation_type="multiple_faces")
```

**Metrics (TBD):**
- Interview duration (target ~45 min)
- Completion rate (sessions ended vs. abandoned)
- Average scores per phase
- Common weak areas (topics < 2.5 composite)

**Error Handling:**
- Turn failure → emit `turn_error` control event → client shows recovery UI
- Proctoring frame drop → continue (not fatal)
- TTS timeout → fallback to silent output (rare)
- LLM token limit → truncate context, log warning

---

## Performance Characteristics

**Typical Interview:**
- Total time: 40-50 minutes
- Total turns: 15-25 (varies by mode)
- Per-turn latency: 1.8-2.5 seconds
- Audio streaming: 24 kHz PCM (Deepgram), ~192 kbps
- Session memory: ~5-10 MB (full transcript + state)
- Database storage per session: ~50-100 KB

**Scaling:**
- Backend: Stateless FastAPI (scales horizontally)
- WebSocket: Single connection per session (no fan-out)
- Redis: Session queues + memories (cache-miss-free hot path)
- Database: Neon serverless (auto-scales, pgvector indexes queries)

---

## Summary

Bodhi's architecture prioritizes **natural conversation latency** and **state durability** through a carefully orchestrated pipeline: voice I/O at the edge → Deepgram STT → LangGraph orchestration → Claude reasoning → Sarvam TTS → seamless playback. Memory compaction ensures context flows across phases, scoring is rigorous and multidimensional, and the three-tier storage guarantees no data loss while keeping the active turn blazing fast.
