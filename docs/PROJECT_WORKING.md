# Bodhi — Project Overview & Current Implementation

## What Bodhi Is

Bodhi is a **voice-first AI Mock Interviewer** that conducts realistic, adaptive technical and behavioral interviews entirely through natural conversation. Candidates practice by voice, receiving real-time feedback and a comprehensive final report with behavioral analysis and hiring recommendations.

### Core Capabilities

| Feature | Description | Example |
|---------|-------------|---------|
| **Voice-First Interface** | Hands-free, conversational interview with natural latency | Candidate speaks → STT → LLM → TTS → audio response, all within 2-3s |
| **Dynamic Curriculum** | Pre-staged questions adapted to resume/JD match and seniority | Junior candidate gets "What is Docker?" (conceptual); Senior gets "Design a multi-region deployment" (expert) |
| **Resume Parsing** | Structured extraction of skills, experience, education from PDF/DOCX | Resume → Gemini LLM → `{skills: ["Python", "PostgreSQL"], experience: [{role, company, duration}]}` |
| **Gap Analysis** | Automatic comparison of resume skills vs. job description requirements | Resume claims "REST APIs" but JD requires "gRPC" → probe more deeply on unfamiliar tech |
| **Multi-Dimensional Scoring** | Evaluates Accuracy, Depth, Communication, Confidence (weighted avg → grade) | Answer: "I used Redis for caching" → Accuracy: 4/5, Depth: 3/5 (missing eviction policy), Comm: 4/5, Conf: 4/5 |
| **Memory Compaction** | Phase summaries injected into next phase context for natural follow-ups | Technical phase: "Candidate strong on distributed systems, weak on databases" → Behavioral phase: "Tell me about a time you had to learn a new technology quickly" (probe databases indirectly) |
| **Proctoring** | Computer vision monitoring: face detection, gaze tracking, object detection, emotion analysis | Detects: multiple faces, phone in frame, looking away repeatedly → flags violation in real-time |
| **Quick Demo Mode** | 1-2 questions per phase for users to preview system without full commitment | Candidate clicks "Just demo" → interview runs 10 min instead of 45 min, same flow |

---

## System Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                         Next.js Frontend                         │
│  Landing Page → Interview Setup → WebSocket Session → Report     │
│  Theme: Bodhi warm palette (#FAF6F0 bg, #D97757 clay accent)    │
│  Components: Hero (Spline 3D brain), Bento workflow demo,        │
│             WebGL Orb avatar, dashboard, session view            │
└──────────────────────────────────────────────────────────────────┘
                              │
                       (WebSocket /ws/{id})
                              │
         ┌────────────────────▼────────────────────┐
         │       FastAPI Backend (30+ routes)      │
         │  LangGraph Interview Orchestration       │
         │  Real-time audio/video streaming        │
         └────────────────────┬────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
   ┌────▼─────┐      ┌────────▼─────────┐   ┌──────▼──────┐
   │  Redis   │      │   NeonDB (+ pgvector)  │ Deepgram   │
   │  Cache   │      │   PostgreSQL    │      │ STT/TTS    │
   │  Queues  │      │   (Persistent)  │      │ (Linear16) │
   └──────────┘      └─────────────────┘      └────────────┘
```

**Why This Stack:**
- **Real-time responsiveness**: Deepgram STT for low-latency transcription; Linear16 PCM TTS for sample-accurate audio scheduling.
- **State durability**: Three-tier storage (MemorySaver → Redis → PostgreSQL) ensures no data loss and sub-millisecond latency on the hot path.
- **Scalability**: Stateless FastAPI + Redis queue system allows horizontal scaling; NeonDB pgvector enables semantic retrieval without external ML infra.

---

## User Flows

### Flow 1: Complete Interview
```
1. User visits bodhi.example.com
   ↓
2. Clicks "Start practicing" or "Resume based"
   ↓ Interview Setup Form
3. Selects mode (Company-based, Resume-based, JD Gap Analysis)
   - Upload resume (PDF/DOCX) → backend extracts profile → Redis cache
   - Choose company/role or paste JD
   - Optional: Quick demo toggle (activate for 1-2 Q/phase)
   ↓
4. Click "Continue"
   ↓ POST /api/interviews/prepare
5. Backend:
   - Retrieves company/role RAG context from NeonDB
   - Parses resume, generates gap map
   - Extracts JD topics, fetches cached topic_questions
   - Stages initial state + question queues in Redis
   ↓
6. Frontend opens WebSocket to /ws/{sessionId}
   ↓
7. Interview Loop (per turn, ~2-3s cycle):
   a) Candidate speaks → frontend VAD detects silence
   b) Audio chunk sent as binary over WebSocket
   c) Backend routes to Deepgram STT → transcript
   d) LangGraph invokes interviewer node:
      - Injects TARGET_QUESTION block (next queued Q)
      - Injects CROSS_SECTION_CONTEXT (prior phase memories)
      - System prompt: 12K token context window
   e) Gemini (via OpenRouter API) streams tokens
   f) Backend filters only conversational tokens (not tool invocations, reasoning)
   g) Sentences accumulated by punctuation → sent to Sarvam TTS
   h) Audio chunks streamed back to client → autoplay
   i) Concurrent: score_answer tool invoked, answer stored in NeonDB
   ↓
8. Phase Transitions:
   - LLM calls transition_phase tool
   - compact_memory node summarizes completed phase:
     ```json
     {
       "strengths": ["Strong systems design knowledge"],
       "weaknesses": ["Vague on database indexing"],
       "topics_covered": ["distributed systems", "caching"],
       "follow_up_hooks": ["Probe DB optimization strategies"]
     }
     ```
   - Summary stored in Redis + injected into next phase
   ↓
9. Interview End (after wrapup phase or user disconnect):
   - Backend detects [END_INTERVIEW] token
   - Frontend routes to report page (instant load)
   - Background tasks scheduled:
     a) Flush all phase_memories to NeonDB
     b) Flush all answer_scores to NeonDB
     c) Invoke Report Agent: send full transcript → LLM generates final insights
     d) Compile final report: scores + agent synthesis
   ↓
10. User views Report:
    - Overall score, grade distribution
    - Strengths/weaknesses summary
    - Phase breakdown with questions/answers/scores
    - Hiring recommendation
```

### Flow 2: Quick Demo (New Feature)
```
1. User on /interview page, clicks "Just demo" toggle button
   - Button highlights (clay-tinted pill)
   - Subtitle updates: "Quick demo active — 1–2 questions per phase"
   ↓
2. User fills form normally (company, role, resume, etc.)
   ↓
3. Click "Continue"
   ↓
4. Backend receives quick_demo=true flag in request body
   - Sets initial_state["quick_demo"] = true
   - Graph config: QUICK_DEMO_PHASE_CONFIG caps max_questions per phase at 1-2
   ↓
5. Interview runs end-to-end but truncated:
   - intro: 1 question (self-introduce) → auto-advance
   - technical: 1 question → auto-advance
   - behavioral: 1 question → auto-advance
   - dsa: 1 question → auto-advance
   - project: skipped
   - wrapup: 1 question → end
   ↓
6. ~10 min interview vs. ~45 min full interview
   - Same quality feedback/scoring
   - Perfect for feature preview or quick warm-up
```

### Flow 3: Proctoring & Violations
```
1. Interview starts with camera permission request
   ↓
2. Frontend captures frames at 2-3s intervals, sends Base64 via WebSocket
   ↓
3. Backend ProctoringOrchestrator applies 1 FPS rate limit
   ↓
4. Cascaded CV Pipeline:
   a) MediaPipe FaceLandmarker:
      - Face detection (bounding box)
      - Iris landmarks (3D pupil position)
      - Head pose (yaw, pitch, roll)
   b) YOLOv8n Object Detection:
      - Detects: person, mobile phone, laptop, book, headphones
      - Returns class + confidence for each object
   c) Hugging Face Vision Transformer (face emotion):
      - Crops to face region
      - Classifies: happy, sad, neutral, fear, anger, surprise, disgust
   d) Violation Builder assembles findings:
      ```json
      {
        "frame_id": "frame_12345",
        "violations": [
          {
            "type": "multiple_faces",
            "description": "2 people detected in frame",
            "confidence": 0.98,
            "severity": "high"
          },
          {
            "type": "phone_detected",
            "description": "Mobile phone visible",
            "severity": "medium"
          },
          {
            "type": "excessive_gaze_deviation",
            "description": "Eyes off-screen for >5s",
            "severity": "medium"
          }
        ]
      }
      ```
   ↓
5. Violations sent back to client via WebSocket
   ↓
6. Frontend displays real-time warning overlay
   ↓
7. Violation counts tracked in session sidebar
   - 3+ violations → optional auto-end interview (configured)
```

---

## Data Model

### Core Tables (NeonDB)

| Table | Purpose | Key Columns |
|-------|---------|-------------|
| `sessions` | Interview lifecycle | id, user_id, company, role, mode, phase, should_end, created_at, ended_at |
| `phase_memories` | Compacted phase summaries | session_id, phase, summary (JSONB: strengths, weaknesses, follow_up_hooks) |
| `answer_scores` | Per-answer evaluation | session_id, phase, question_num, accuracy, depth, communication, confidence, composite, feedback, probed |
| `company_profiles` | Indexed company data | company_name, description, technologies, roles, embeddings |
| `role_profiles` | Role specifications | company_name, role_name, requirements, level, technologies |
| `user_profiles` | Candidate resumes | user_id, name, skills[], experience[], education[], summary, embeddings |
| `document_chunks` | RAG corpus | id, document_id, chunk_text, embedding (3072-dim Gemini) |
| `topic_questions` | Cached question bank | topic, question, tier (conceptual/practical/expert), created_at |

### Cache (Redis)

| Key Pattern | Value | TTL |
|-------------|-------|-----|
| `initial_state:{session_id}` | Full InterviewState dict | 24h |
| `question_queue:{session_id}:{phase}` | [Q1, Q2, Q3, ...] | 24h |
| `memory:{session_id}:{phase}` | Compacted phase JSON | 24h |
| `candidate_profile:{session_id}` | Resume extracted profile | 24h |

---

## Key Subprocesses

### Subprocess A: Audio I/O Pipeline

```
SEND (Candidate Speech):
  1. Frontend: microphone → PCM 16kHz 16-bit stream
  2. VAD energy gating detects speech
  3. Audio chunk (typically 1-2s) → binary frame over WebSocket
  4. Backend receives frame → queue for STT

PROCESS:
  1. Backend: binary audio → Deepgram API (async)
  2. Deepgram returns transcript: "I used Redis for caching"
  3. LangGraph injects into interviewer node

RECEIVE (TTS Output):
  1. Interviewer node generates reply: "Tell me about eviction policies..."
  2. Streaming tokens flow to TTS accumulator
  3. On punctuation (., !, ?):
     - Accumulated sentence → Sarvam Bulbul TTS
     - Returns Linear16 PCM chunks
  4. PCM buffered, then streamed over WebSocket to client
  5. Client autoplays audio (seamless playback)

LATENCY BUDGET:
  - VAD detection: 200ms
  - STT round-trip: 500ms
  - LLM first token: 800ms
  - TTS per sentence: 300ms
  - Total: ~1.8-2.5s perceived latency
```

### Subprocess B: Scoring Engine

```
INVOCATION:
  1. LLM response generated for candidate answer
  2. LangGraph tool call: score_answer(answer_text, dimension)
  3. Claude LLM (brief context) scores 1-5 per dimension

DIMENSIONS:
  - Accuracy (30%): Factual correctness of technical claim
  - Depth (25%): Trade-offs, edge cases, alternatives mentioned
  - Communication (20%): Clarity of explanation
  - Confidence (15%): Certainty vs. hedging ("I think..." vs. "I know...")

EXAMPLE SCORING:
  Candidate: "I implemented a caching layer using Redis."
  ├─ Accuracy: 4/5 (correct concept, no errors)
  ├─ Depth: 2/5 (no eviction policy, TTL, or invalidation mentioned)
  ├─ Communication: 4/5 (clear statement, well-structured)
  └─ Confidence: 4/5 (direct assertion)
  Composite: (4×0.30 + 2×0.25 + 4×0.20 + 4×0.15) = 3.5/5 = 70% = C+

PROBING LOGIC:
  If any dimension < 3 OR composite < 2.5:
    → Set needs_probing = true
    → LLM must ask follow-up before advancing

STORAGE:
  answer_scores table stores atomic scores + composite + feedback
  Persisted after phase end (background task)
```

### Subprocess C: Memory Compaction (Cross-Phase Context)

```
TRIGGER:
  When transition_phase tool called (e.g., technical → behavioral)

PROCESS:
  1. compact_memory node receives completed phase transcript
  2. LLM prompt: "Summarize this technical interview phase"
  3. Structured extraction:
     {
       "key_claims": [
         "Candidate built a distributed cache",
         "Used Lua scripts for atomicity"
       ],
       "strengths": [
         "Strong Redis internals knowledge",
         "Considered trade-offs (consistency vs. latency)"
       ],
       "weaknesses": [
         "Didn't mention monitoring/observability",
         "No discussion of failure modes"
       ],
       "follow_up_hooks": [
         "In behavioral: ask about debugging distributed systems",
         "In DSA: probe complexity analysis for cache algorithms"
       ],
       "topics_covered": ["caching", "distributed systems", "lua scripting"]
     }
  4. Store in Redis: memory:{session_id}:{phase}
  5. Inject into next phase system prompt as CROSS_SECTION_CONTEXT block

USAGE IN NEXT PHASE:
  System prompt (Behavioral phase):
  ```
  CROSS_SECTION_CONTEXT:
  In the technical phase, the candidate demonstrated:
  - Strengths: Strong Redis knowledge
  - Weaknesses: Didn't mention observability
  - Follow-up directives: Probe failure handling in distributed systems
  
  Use this context to ask insightful behavioral questions that naturally
  connect to their technical strengths/gaps.
  ```

RESULT:
  Behavioral Q: "Tell me about a time you had to debug an issue in a
  production distributed system. How did you approach monitoring?"
  → Naturally probes the observability gap from technical phase
```

### Subprocess D: Resume → Gap Analysis

```
INPUT:
  User uploads resume.pdf

PROCESS:
  1. document_parser.py extracts text (PyPDF2 + python-docx)
  2. LLM-powered extraction (Gemini):
     - Parses resume structure
     - Extracts skills, experience, education, projects
     - Returns structured JSON:
       {
         "name": "Alice Chen",
         "skills": ["Python", "PostgreSQL", "Docker", "AWS", "React"],
         "experience": [
           {"role": "Backend Engineer", "company": "Stripe", "duration": "2021-2023"},
           ...
         ],
         "education": [{"degree": "BS Computer Science", "school": "Stanford", "year": 2020}]
       }
  3. Stored in user_profiles table + Redis cache
  4. Embedding generated (Gemini embedding-001, 3072-dim) → pgvector

  LATER (at interview start):
  5. Interview selected: role="Systems Engineer at Meta" with JD text
  6. JD topics extracted: ["Distributed systems", "C++", "Scale", "MapReduce", "Protobufs"]
  7. Gap map generated:
     {
       "resume_skills": ["Python", "PostgreSQL", "Docker", "AWS", "React"],
       "jd_requirements": ["C++", "Distributed systems", "MapReduce", "Protobufs"],
       "gaps": [
         {"skill": "C++", "coverage": 0%, "difficulty_tier": "practical"},
         {"skill": "Protobufs", "coverage": 0%, "difficulty_tier": "conceptual"}
       ],
       "matches": [
         {"skill": "Distributed systems", "coverage": 60%, "difficulty_tier": "expert"}
       ]
     }
  8. Tier selector (tier_for_topic):
     - C++ (0% coverage, gap) → cap at "conceptual"
     - Distributed systems (60% coverage, claimed strength) → up to "practical"
     - Final selected tier: min(candidate_seniority, gap_tier)
       - Candidate "Mid-Level", C++ gap → "conceptual"
       - Candidate "Mid-Level", Dist Sys strength → "practical"

RESULT:
  Technical question queue:
  [
    "Conceptual: Describe the basics of C++. What problems does it solve?",
    "Practical: In your experience with distributed systems, how would you handle node failures?",
    "Practical: Design a MapReduce-like system for processing terabytes of data"
  ]
```

---

## Theme & UI Architecture

### Warm Palette (CSS Variables in globals.css)

```css
--bodhi-bg:      #faf6f0   /* Cream background */
--bodhi-surface: #fffdfb   /* Off-white surfaces */
--bodhi-clay:    #d97757   /* Terracotta accent */
--bodhi-line:    rgba(55, 50, 47, 0.12)  /* Subtle dividers */
```

Applied throughout:
- **Landing page**: Hero (cream bg, clay CTAs), bento workflow (white container, bodhi-line dividers)
- **Interview page**: Dark sidebar (#1a1a1a), orb avatar with clay gradient
- **Dashboard**: Light surfaces, clay highlights for scores/badges
- **Theme consistency**: All components use `bg-bodhi-*`, `border-bodhi-*`, `text-bodhi-clay`

### UI Components (Kept After Cleanup)

| Component | Purpose |
|-----------|---------|
| `components/ui/alert-dialog` | Modal confirmations (e.g., end interview) |
| `components/ui/button` | All CTAs, form submissions |
| `components/ui/textarea` | JD input, feedback display |
| `components/interview/Orb` | WebGL avatar, animated by phase state |
| `components/demo-video-section` | Asymmetric bento: video left (tilted), workflow steps right |
| `components/hero` | Landing: headline, CTAs, Spline brain visual |
| `components/hero-brain` | Spline embedded brain iframe with vignette mask |

### Orb Avatar (WebGL, react-three-fiber)

```tsx
// Phase-driven color animations
const colorMap = {
  "talking": { primary: "#D97757", secondary: "#F2C4A8" },  // clay warm
  "listening": { primary: "#E8A87C", secondary: "#F7DEC8" }, // sand tones
  "thinking": { primary: "#C9B29B", secondary: "#EBDFD2" }   // muted taupe
}

// Orb surface: perlin noise texture + radial gradient
// Real-time state sync: interview phase → Orb color → automatic
```

---

## Deployment & Infrastructure

### Environment Variables (.env)

```bash
# LLM (OpenRouter)
OPENROUTER_API_KEY=...
OPENROUTER_MODEL=anthropic/claude-haiku-4.5

# Embeddings (Google)
GOOGLE_GEMINI_API_KEY=...

# STT/TTS (Deepgram Linear16)
DEEPGRAM_API_KEY=...
SARVAM_API_KEY=...

# Database
DATABASE_URL=postgresql://user:pass@db.neon.tech/bodhi

# Redis
REDIS_URL=redis://localhost:6379

# Auth
CLERK_SECRET_KEY=...
CLERK_FRONTEND_API_KEY=...

# Proctoring
PROCTORING_ENABLED=true
```

### Docker Deployment

```bash
cd backend && docker build -t bodhi-backend .
docker-compose up  # Starts API + Redis
```

Frontend (Next.js):
```bash
cd client && npm run build && npm start
```

---

## Current Session Work (Latest)

### 1. Frontend Refactor
- **Hero section**: Tightened to 1360px centered grid, headline 84px (from 64px)
- **Workflow merge**: demo-video-section + workflow-steps → single asymmetric bento box
- **Font**: Inter → Montserrat (bolder, more practical)
- **Quick demo toggle**: Button-based, not URL param; carries through form submit

### 2. Cleanup
- **Components**: Deleted 48 unused shadcn/ui components (kept only alert-dialog, textarea, button)
- **NPM deps**: 57 → 16 packages (removed react-hook-form, zod, framer-motion, tailwindcss-animate, etc.)
- **Assets**: Cleaned 41 unused template images from public/
- **Backend modules**: Removed duplicate main.py, WebSockets/, behavioral_analysis test harness

### 3. Code Quality
- All processes verified end-to-end
- Clean build (both client & backend compile)
- No dangling imports
- Three commits documenting changes

---

## Next Priorities

1. **Quick demo refinement**: Add skip button mid-interview, clearer timing indicators
2. **Proctoring UI**: Visual violation display during interview (overlay + sidebar badges)
3. **Report sharing**: PDF/HTML export with formatted scores and recommendations
4. **Mobile responsiveness**: Optimize interview view for tablet + phone
5. **Session replay**: Archive full audio + transcript for post-interview review
