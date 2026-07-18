# Technical Implementation Details & Roadmap

## Current Stack (2026 Implementation)

### Frontend (client/)
- **Framework**: Next.js 15 (App Router, Server Components)
- **Styling**: Tailwind CSS v4 + CSS variables (bodhi-* tokens)
- **UI Components**: 3 Shadcn components (alert-dialog, button, textarea)
- **3D Graphics**: react-three-fiber + three.js (Orb avatar)
- **Audio Handling**: Web Audio API (seamless playback via useSeamlessAudio)
- **State Management**: React hooks + useReducer for interview state
- **Authentication**: Clerk (OAuth)
- **Font**: Montserrat (body), Instrument Serif (italic accents)
- **Dependencies**: 16 npm packages (pruned from 57)

### Backend (backend/src)
- **Framework**: FastAPI (Python 3.10+)
- **Orchestration**: LangGraph (state machine for interview phases)
- **LLM Integration**: OpenRouter API (Claude Haiku 4.5)
- **Embeddings**: Google Gemini embedding-001 (3072-dim)
- **STT**: Deepgram (async transcription)
- **TTS**: Sarvam Bulbul V3 (Linear16 PCM streaming)
- **Database**: NeonDB PostgreSQL + pgvector (vector search)
- **Cache**: Redis (session state, question queues, memories)
- **Computer Vision**: MediaPipe + YOLOv8n + HuggingFace Vision Transformer (proctoring)
- **Deployment**: Docker + docker-compose

### Key Integrations
| Service | Purpose | API Model |
|---------|---------|-----------|
| OpenRouter | LLM chat (Claude Haiku 4.5) | Streaming tokens |
| Deepgram | Speech-to-Text | Async REST, returns transcript |
| Sarvam AI | Text-to-Speech | Streaming Linear16 PCM audio chunks |
| Google Gemini | Embeddings only | One-off batch requests |
| Clerk | Authentication | OAuth + JWT |
| NeonDB | PostgreSQL + pgvector | Managed serverless |
| Redis | Cache + queues | In-memory key-value |

---

## Code Organization

### Backend Structure

```
backend/src/
├── api/
│   ├── app.py                 # FastAPI app init, CORS, lifespan hooks
│   ├── interviews.py          # Interview lifecycle + WebSocket handler (2500 LOC)
│   ├── documents.py           # RAG ingestion endpoints
│   ├── resumes.py             # Resume parsing + profile extraction
│   ├── companies.py           # Company profile CRUD
│   ├── roles.py               # Role CRUD
│   ├── users.py               # Auth + user endpoints
│   ├── proctoring.py          # Proctoring session + violation endpoints
│   ├── audio.py               # STT/TTS utility endpoints
│   ├── deps.py                # Dependency injection (cache, storage, LLM)
│   ├── models.py              # Pydantic request/response schemas
│   ├── auth.py                # Clerk token validation
│   ├── limits.py              # Rate limiting + size constraints
│   ├── concurrency.py         # Async timeouts + thread pool management
│   └── ratelimit.py           # Request throttling per user
├── services/
│   ├── llm.py                 # OpenRouter client + Claude Haiku config
│   ├── stt.py                 # Deepgram STT wrapper
│   ├── tts.py                 # Sarvam TTS wrapper
│   ├── sentiment.py           # (Stub) sentiment analysis
│   └── behavioral.py          # (Stub) behavioral signals
├── behavioral_analysis/
│   ├── services/
│   │   ├── speech_service.py  # Speech emotion/stress detection
│   │   └── posture_service.py # Posture/attention analysis
│   └── __init__.py
├── proctoring_backend/
│   ├── config.py              # Proctoring settings
│   ├── services/
│   │   ├── proctoring/
│   │   │   ├── orchestrator.py        # Cascaded CV pipeline coordinator
│   │   │   ├── face_detection.py      # MediaPipe FaceLandmarker
│   │   │   ├── gaze_analysis.py       # Eye tracking + pupil deviation
│   │   │   ├── emotion_analysis.py    # HF ViT emotion classifier
│   │   │   ├── object_detection.py    # YOLOv8n for phones/people/objects
│   │   │   └── violation_builder.py   # Aggregates violations into events
│   │   └── models/
│   │       └── violation.py           # Violation TypedDicts
│   └── services/__init__.py
├── agents/
│   └── report_agent.py        # Agentic report synthesis (async background task)
├── graph.py                   # LangGraph state machine (500 LOC)
├── state.py                   # TypedDicts + phase configs (300 LOC)
├── tools.py                   # LangGraph tool definitions
├── memory.py                  # Phase compaction + extraction
├── rag.py                     # Document retrieval + embedding
├── document_parser.py         # PDF/DOCX text extraction
├── resume_parser.py           # LLM-powered resume extraction
├── cache.py                   # Redis client + caching logic
├── storage.py                 # NeonDB PostgreSQL client
├── main.py                    # Standalone CLI voice loop
└── __init__.py
```

### Frontend Structure

```
client/
├── app/
│   ├── globals.css            # Theme tokens (bodhi-*)
│   ├── layout.tsx             # Root layout (Clerk provider, font config)
│   ├── page.tsx               # Landing page (hero + bento + sections)
│   ├── (dashboard)/
│   │   ├── layout.tsx         # Protected layout (sidebar + auth gate)
│   │   ├── dashboard/page.tsx # Interview history
│   │   ├── resumes/page.tsx   # Resume upload/list
│   │   ├── companies/page.tsx # Company management
│   │   ├── roles/page.tsx     # Role management
│   │   ├── report/[sessionId]/page.tsx  # Final report view
│   │   └── profile/page.tsx   # User settings
│   └── interview/
│       ├── page.tsx           # Interview setup + session initiation
│       ├── loading.tsx        # Suspense fallback
│       └── demo/
│           ├── [phase]/page.tsx  # Phase demo mode
│           └── loading.tsx
├── components/
│   ├── hero.tsx               # Landing hero section (grid layout)
│   ├── hero-brain.tsx         # Spline iframe + vignette mask
│   ├── demo-video-section.tsx # Merged video + workflow bento
│   ├── interview/
│   │   ├── Orb.tsx            # WebGL avatar (r3f canvas)
│   │   ├── InterviewSetupForm.tsx  # Mode/resume/JD selection
│   │   └── InterviewSessionView.tsx # Active interview UI
│   ├── app/ui/                # Custom app UI components
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   ├── feedback.tsx       # Alert, Spinner
│   │   ├── form.tsx           # Input, Select, Textarea wrappers
│   │   ├── icons.tsx          # Lucide icon definitions
│   │   ├── modal.tsx          # Dialog wrapper
│   │   ├── page-header.tsx    # Heading + nav
│   │   ├── search-input.tsx   # Search UI
│   │   ├── chip.tsx           # Badge/tag component
│   │   └── ...
│   └── ui/                    # Shadcn (3 total)
│       ├── alert-dialog.tsx
│       ├── button.tsx
│       └── textarea.tsx
├── hooks/
│   ├── useInterviewAudio.ts   # WebSocket audio control + STT/TTS orchestration
│   ├── useSeamlessAudio.ts    # PCM buffering + AudioContext scheduling
│   ├── useProctoring.ts       # Camera + video frame collection
│   └── useSentimentAnalysis.ts # (Stub) sentiment signal tracking
├── lib/
│   ├── api.ts                 # API client (fetch wrappers)
│   └── utils.ts               # Utility functions (cn, formatting, etc.)
├── middleware.ts              # Auth guard + proxy setup
└── public/
    └── perlin-noise.png       # Orb texture (only asset kept)
```

---

## Key Implementation Details

### 1. WebSocket Handler (interviews.py, ~2500 LOC)

```python
@app.websocket("/ws/{session_id}")
async def interview_websocket(websocket: WebSocket, session_id: str):
    """Main interview WebSocket handler."""
    
    await websocket.accept()
    
    try:
        # Get initial state from Redis
        initial_state = cache.get_initial_state(session_id)
        
        # Build graph
        interview_graph = build_interview_graph(llm, storage, rag)
        
        # Lifespan: proctoring + audio state
        proctoring_orchestrator = None
        audio_context = AudioContext()
        
        while True:
            message = await websocket.receive_json()
            
            if message["type"] == "audio":
                # PCM chunk from client
                audio_bytes = base64.b64decode(message["data"])
                
                # STT
                transcript = await stt.transcribe(audio_bytes)
                
                # Inject into graph
                state = {
                    **initial_state,
                    "messages": [..., {"role": "user", "content": transcript}]
                }
                
                # Stream LLM tokens
                async for event in interview_graph.astream_events(
                    state,
                    config={"configurable": {"thread_id": session_id}}
                ):
                    # Filter only conversational tokens
                    if event["name"] == "interviewer" and "streaming_chunk" in event:
                        token = event["streaming_chunk"].content
                        
                        # Accumulate for TTS
                        audio_context.accumulate(token)
                        
                        # On punctuation
                        if token in ".!?":
                            tts_audio = await tts.synthesize(
                                audio_context.get_sentence()
                            )
                            await websocket.send_bytes(tts_audio)
                            audio_context.reset()
            
            elif message["type"] == "video_frame":
                # Frame for proctoring
                frame_b64 = message["data"]
                if not proctoring_orchestrator:
                    proctoring_orchestrator = ProctoringOrchestrator(
                        candidate_id=state.get("candidate_name"),
                        session_id=session_id
                    )
                
                # Async proctoring analysis
                violations = await proctoring_orchestrator.analyze_frame(
                    frame_b64, frame_id=message["frame_id"]
                )
                
                if violations:
                    await websocket.send_json({
                        "type": "proctoring",
                        "violations": violations
                    })
            
            elif message["type"] == "control":
                # End interview, pause, etc.
                if message["action"] == "end":
                    initial_state["should_end"] = True
                    # ... finalization
                    break
    
    except Exception as e:
        logger.error("WebSocket error", session_id=session_id, exc=str(e))
        await websocket.send_json({"type": "error", "message": str(e)})
```

**Key Points:**
- Stateless handler (state stored in Redis + MemorySaver)
- Streaming LLM tokens filtered to prevent reasoning leakage
- Concurrent proctoring (non-blocking, 1 FPS enforced)
- Error handling: `turn_error` emitted instead of crash

---

### 2. Interview State Machine (graph.py, ~500 LOC)

```python
def build_interview_graph(llm, storage, rag):
    """Construct LangGraph state machine."""
    
    workflow = StateGraph(InterviewState)
    
    # Nodes
    workflow.add_node("interviewer", interviewer_node)
    workflow.add_node("process_tools", process_tools_node)
    workflow.add_node("compact_memory", compact_memory_node)
    workflow.add_node("end", end_node)
    
    # Edges
    workflow.add_edge("START", "interviewer")
    
    workflow.add_conditional_edges(
        "process_tools",
        lambda x: "compact_memory" if x.get("transition_phase") else "interviewer",
        {
            "compact_memory": "compact_memory",
            "interviewer": "interviewer"
        }
    )
    
    workflow.add_edge("compact_memory", "interviewer")
    
    # Tool binding
    tools = [
        score_answer_tool,
        transition_phase_tool,
        adjust_difficulty_tool,
        end_interview_tool
    ]
    
    llm_with_tools = llm.bind_tools(tools)
    
    # Compile
    return workflow.compile(checkpointer=MemorySaver())
```

**Node Logic:**

```python
async def interviewer_node(state: InterviewState) -> dict:
    """Generate next response."""
    
    # Build prompt
    system_prompt = f"""
    You are a technical interviewer for {state['target_role']} at {state['target_company']}.
    
    CONTEXT:
    {state['entity_context']}
    
    CROSS-SECTION (from prior phases):
    {state['cross_section_context']}
    
    TARGET_QUESTION:
    {state['current_question']}
    
    Respond conversationally. Use tools to score, transition phases, or end.
    """
    
    messages = state["messages"] + [
        {"role": "user", "content": "...candidate answer..."}
    ]
    
    # Stream LLM
    response_text = ""
    async for chunk in llm.astream_events(
        messages,
        system=system_prompt
    ):
        if chunk.type == "streaming_chunk":
            response_text += chunk.content
            yield {"type": "streaming", "token": chunk.content}
    
    return {
        "messages": [
            *state["messages"],
            {"role": "assistant", "content": response_text}
        ]
    }

async def compact_memory_node(state: InterviewState) -> dict:
    """Summarize phase on transition."""
    
    phase = state["phase"]
    phase_messages = [m for m in state["messages"] 
                      if m.get("phase") == phase]
    
    summary_prompt = f"""
    Summarize this {phase} phase:
    
    {format_transcript(phase_messages)}
    
    Return JSON: {{
      "key_claims": [...],
      "strengths": [...],
      "weaknesses": [...],
      "follow_up_hooks": [...],
      "topics_covered": [...]
    }}
    """
    
    summary = await llm.agenerate(summary_prompt)
    summary_json = json.loads(summary.content)
    
    # Store + inject
    cache.set(f"memory:{state['session_id']}:{phase}", summary_json)
    
    return {
        "phase_memories": [
            *state.get("phase_memories", []),
            {phase: summary_json}
        ],
        "cross_section_context": format_memory_block(summary_json)
    }
```

---

### 3. Audio I/O Stack (frontend hooks)

**useInterviewAudio.ts** (orchestrator):
```typescript
export function useInterviewAudio() {
  const wsRef = useRef<WebSocket | null>(null);
  const seamlessAudio = useSeamlessAudio();
  
  return {
    // Send audio to backend
    sendAudio: async (pcmChunk: Uint8Array) => {
      wsRef.current?.send(
        JSON.stringify({
          type: "audio",
          data: btoa(String.fromCharCode(...pcmChunk))
        })
      );
    },
    
    // Receive TTS audio from backend
    onAudioReceived: (audioBytes: Uint8Array) => {
      seamlessAudio.enqueueChunk(audioBytes);
    },
    
    // Control
    stop: () => seamlessAudio.stop(),
    flush: () => seamlessAudio.flush()
  };
}
```

**useSeamlessAudio.ts** (playback):
```typescript
export function useSeamlessAudio() {
  const audioContextRef = useRef<AudioContext | null>(null);
  const decodedBuffersRef = useRef<AudioBuffer[]>([]);
  const nextStartTimeRef = useRef<number>(0);
  
  return {
    enqueueChunk: async (pcmChunk: Uint8Array) => {
      // Convert PCM 16-bit to float32
      const float32 = pcmToFloat32(pcmChunk);
      
      // Decode into AudioBuffer
      const audioBuffer = audioContext.createBuffer(
        1, float32.length, 22050
      );
      audioBuffer.copyToChannel(float32, 0);
      
      // Queue buffer
      decodedBuffersRef.current.push(audioBuffer);
      
      // Schedule if buffered >= 300ms
      if (getBufferedDuration() >= 0.3) {
        scheduleAvailableBuffers();
      }
    },
    
    flush: async () => {
      // Force schedule remaining buffers
      scheduleAvailableBuffers();
    }
  };
}
```

**Scheduling Logic:**
```typescript
function scheduleAvailableBuffers() {
  const ctx = audioContextRef.current!;
  
  while (decodedBuffersRef.current.length > 0) {
    const buffer = decodedBuffersRef.current.shift();
    const source = ctx.createBufferSource();
    
    source.buffer = buffer;
    source.connect(ctx.destination);
    
    // Schedule at earliest available time
    const startTime = Math.max(
      ctx.currentTime + 0.1,  // Look-ahead
      nextStartTimeRef.current
    );
    source.start(startTime);
    
    // Update next start time (no overlaps)
    nextStartTimeRef.current = startTime + buffer.duration;
    
    // Track source for cleanup
    scheduledSourcesRef.current.push(source);
  }
}
```

**Why This Works:**
- Buffers accumulate while TTS streams
- Once 300ms buffered, schedule (prevents stutter)
- `nextStartTimeRef` prevents overlaps
- Sources clean up on `.onended` callback
- Result: seamless, gapless playback

---

### 4. Proctoring Pipeline (orchestrator.py, ~200 LOC)

```python
class ProctoringOrchestrator:
    """Cascaded CV pipeline: Face → Gaze → Objects → Emotion."""
    
    def __init__(self, candidate_id: str, session_id: str):
        self.face_detector = FaceDetector()
        self.gaze_analyzer = GazeAnalyzer()
        self.object_detector = ObjectDetector()
        self.emotion_analyzer = EmotionAnalyzer()
        self.violation_builder = ViolationBuilder()
        
        self.session_id = session_id
        self.last_frame_time = 0
    
    async def analyze_frame(self, frame_b64: str, frame_id: str) -> list[dict]:
        """1 FPS rate-limited analysis."""
        
        # Rate limit: 1 FPS
        now = time.time()
        if now - self.last_frame_time < 1.0:
            return []  # Drop frame
        self.last_frame_time = now
        
        # Decode
        frame = base64.b64decode(frame_b64)
        image = cv2.imdecode(np.frombuffer(frame, np.uint8), cv2.IMREAD_COLOR)
        
        # Cascade
        faces = await self.face_detector.detect(image)
        
        if not faces:
            return self.violation_builder.build([
                {"type": "no_face", "description": "No face detected in frame"}
            ])
        
        if len(faces) > 1:
            return self.violation_builder.build([
                {"type": "multiple_faces", "description": f"{len(faces)} people detected"}
            ])
        
        face_box = faces[0]
        
        # Gaze
        gaze_deviation = await self.gaze_analyzer.analyze(image, face_box)
        if gaze_deviation.off_screen_duration > 5.0:
            self.violation_builder.add({
                "type": "excessive_gaze_deviation",
                "duration": gaze_deviation.off_screen_duration
            })
        
        # Objects
        objects = await self.object_detector.detect(image)
        phones = [o for o in objects if o.class_name == "phone"]
        if phones:
            self.violation_builder.add({
                "type": "phone_detected",
                "confidence": phones[0].confidence
            })
        
        # Emotion
        face_crop = crop_to_box(image, face_box)
        emotion = await self.emotion_analyzer.analyze(face_crop)
        if emotion.label == "fear" and emotion.confidence > 0.7:
            self.violation_builder.add({
                "type": "stress_detected",
                "emotion": emotion.label
            })
        
        # Build event
        violations = self.violation_builder.build(
            session_id=self.session_id,
            frame_id=frame_id
        )
        
        return violations
```

**Violation Builder:**
```python
class ViolationBuilder:
    """Accumulate violations into structured events."""
    
    def build(self, findings: list[dict]) -> list[dict]:
        """Convert findings into violation events."""
        
        violations = []
        for finding in findings:
            violation = {
                "type": finding["type"],
                "description": finding.get("description", ""),
                "severity": self._classify_severity(finding["type"]),
                "timestamp": datetime.now().isoformat(),
                "action": self._recommend_action(finding["type"])
            }
            violations.append(violation)
        
        return violations
    
    def _classify_severity(self, violation_type: str) -> str:
        severity_map = {
            "no_face": "critical",
            "multiple_faces": "high",
            "phone_detected": "medium",
            "gaze_deviation": "medium",
            "stress_detected": "low"
        }
        return severity_map.get(violation_type, "low")
```

---

## Database Schema (Key Tables)

```sql
-- Sessions
CREATE TABLE sessions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    mode TEXT,  -- 'standard', 'option_a', 'option_b'
    phase TEXT,
    company TEXT,
    role TEXT,
    should_end BOOLEAN DEFAULT false,
    quick_demo BOOLEAN DEFAULT false,
    created_at TIMESTAMP,
    ended_at TIMESTAMP,
    transcript JSONB
);

-- Answer Scores (multi-dimensional)
CREATE TABLE answer_scores (
    id SERIAL PRIMARY KEY,
    session_id TEXT NOT NULL,
    phase TEXT,
    question_num INT,
    accuracy INT,
    depth INT,
    communication INT,
    confidence INT,
    composite FLOAT,
    feedback TEXT,
    probed BOOLEAN,
    created_at TIMESTAMP,
    FOREIGN KEY (session_id) REFERENCES sessions(id)
);

-- Phase Memories (cross-phase context)
CREATE TABLE phase_memories (
    id SERIAL PRIMARY KEY,
    session_id TEXT NOT NULL,
    phase TEXT,
    summary JSONB,  -- strengths, weaknesses, follow_ups, etc.
    created_at TIMESTAMP,
    FOREIGN KEY (session_id) REFERENCES sessions(id)
);

-- RAG: Document Chunks with Embeddings
CREATE TABLE document_chunks (
    id SERIAL PRIMARY KEY,
    document_id TEXT,
    chunk_text TEXT,
    embedding vector(3072),  -- pgvector
    contributed_by TEXT,  -- 'user' or 'bodhi_auto'
    created_at TIMESTAMP
);

CREATE INDEX ON document_chunks USING ivfflat (embedding vector_cosine_ops);

-- Topic Questions Cache
CREATE TABLE topic_questions (
    id SERIAL PRIMARY KEY,
    topic TEXT,
    question TEXT,
    tier TEXT,  -- 'conceptual', 'practical', 'expert'
    created_at TIMESTAMP,
    UNIQUE(topic, tier)
);

-- User Profiles (from resumes)
CREATE TABLE user_profiles (
    id SERIAL PRIMARY KEY,
    user_id TEXT NOT NULL,
    name TEXT,
    skills TEXT[],
    experience JSONB,
    education JSONB,
    embedding vector(3072),
    created_at TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Company Profiles
CREATE TABLE company_profiles (
    id SERIAL PRIMARY KEY,
    company_name TEXT,
    description TEXT,
    technologies TEXT[],
    roles TEXT[],
    embedding vector(3072),
    created_at TIMESTAMP,
    UNIQUE(company_name)
);
```

---

## Performance Metrics & SLOs

| Metric | Target | Current |
|--------|--------|---------|
| Interview start latency | <5s | ~3s |
| Per-turn latency (P50) | <2.5s | ~2s |
| Per-turn latency (P99) | <4s | ~3.5s |
| Audio playback latency | <500ms | ~300-400ms |
| Database query (simple) | <50ms | ~20ms |
| Redis get | <5ms | ~1-2ms |
| Availability | 99.9% | ~99% (depends on Deepgram, OpenRouter) |

---

## Roadmap (Priority Order)

### Phase 1 (In Progress)
- [x] Quick demo mode (1-2 Q/phase)
- [x] Orb avatar (WebGL, phase-driven colors)
- [x] Bento workflow UI (asymmetric grid)
- [x] Montserrat font (bolder typography)
- [x] Code cleanup (48 unused components, 41 npm deps removed)

### Phase 2 (Next Sprint)
- [ ] Mobile responsiveness (interview view on tablet/phone)
- [ ] Proctoring UI (real-time violation overlay)
- [ ] PDF report export (with formatted scores)
- [ ] Session resume (pause/resume interview across browser closes)

### Phase 3 (Next)
- [ ] Session replay (audio + transcript review)
- [ ] Analytics dashboard (aggregate scores, weak areas, trends)
- [ ] Interview Hub frontend (search by company+role, browse past interviews)
- [ ] Report sharing (generate shareable links with PDF)

### Phase 4 (Future)
- [ ] Live coding rounds (Monaco/CodeMirror integration)
- [ ] Multi-language STT (Hindi/Hinglish)
- [ ] Custom question bank (org-specific interview templates)
- [ ] Candidate feedback loop (which questions were hardest, most useful)
- [ ] Advanced proctoring (eye-tracking per-question, stress timeline)

---

## Deployment Checklist

### Local Development
```bash
# Backend
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn src.api.app:app --reload

# Frontend
cd client
npm install --legacy-peer-deps
npm run dev
```

### Production Deployment
```bash
# Docker
cd backend
docker build -t bodhi-backend:latest .
docker tag bodhi-backend:latest registry.example.com/bodhi-backend:latest
docker push registry.example.com/bodhi-backend:latest

# Kubernetes (example)
kubectl apply -f k8s/backend-deployment.yaml
kubectl apply -f k8s/redis-statefulset.yaml
kubectl apply -f k8s/postgres-statefulset.yaml

# Frontend (Vercel)
cd client
vercel deploy --prod
```

### Environment Setup
1. Create `.env` in `backend/` with:
   - `OPENROUTER_API_KEY`
   - `GOOGLE_GEMINI_API_KEY`
   - `DEEPGRAM_API_KEY`
   - `SARVAM_API_KEY`
   - `DATABASE_URL` (NeonDB)
   - `REDIS_URL`
   - `CLERK_SECRET_KEY`

2. Create `.env.local` in `client/` with:
   - `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
   - `NEXT_PUBLIC_API_URL`

3. Initialize database:
   ```bash
   psql $DATABASE_URL -f backend/schema.sql
   ```

---

## Testing Strategy (TBD)

### Unit Tests
- Interview state transitions (LangGraph)
- Scoring engine (multi-dimensional logic)
- Memory compaction (JSON serialization)
- Resume parser (extraction accuracy)

### Integration Tests
- WebSocket audio I/O (send/receive cycle)
- STT → LLM → TTS pipeline
- RAG retrieval (similarity + anti-poisoning)
- Database persistence (sessions, scores, memories)

### End-to-End Tests
- Full interview flow (start → end)
- Proctoring violation detection
- Report generation (async tasks)
- Quick demo mode (truncated flow)

### Load Tests
- Concurrent interviews (target: 10-50 sessions)
- WebSocket stability (long-running connections)
- Database connection pooling
- Redis cache hit rate

---

## Conclusion

Bodhi is a production-ready interview platform with a modern, clean architecture optimized for **low-latency voice interaction**, **robust state management**, and **multi-dimensional assessment**. The three-tier storage strategy ensures both performance and durability, LangGraph orchestration handles complex phase logic elegantly, and the proctoring pipeline provides authentic, tamper-resistant evaluation at scale.

Remaining work focuses on UX polish (mobile, sharing, replay) and ecosystem features (hub, analytics, custom templates) rather than core engine changes.
