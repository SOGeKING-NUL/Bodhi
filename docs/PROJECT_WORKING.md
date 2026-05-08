# Bodhi - Project Overview

## What the Project is About
Bodhi is a voice-first, low-latency AI Mock Interviewer designed to conduct structured, realistic mock interviews entirely by voice. The system listens to the candidate, responds naturally, and dynamically adapts the interview flow based on the candidate's answers. It operates either as a local CLI voice loop or via a full FastAPI HTTP backend coupled with a Next.js frontend interface.

## Functionality Served
Bodhi completely automates the technical and behavioral screening process. Key functionalities include:
- **Interactive Voice Loop**: Hands-free conversation using Voice Activity Detection (VAD), real-time Speech-to-Text (STT), LLM-based reasoning, and Text-to-Speech (TTS).
- **RAG-Powered Context**: Ingests Company Profiles, Role Profiles (e.g., Backend Engineer), and custom Job Descriptions to ground the AI's questioning in real-world contexts.
- **Dynamic Curriculum Generation**: Pre-generates target questions (Technical and DSA) prior to the interview while retaining the flexibility to probe answers and ask ad-hoc follow-ups.
- **Resume Parsing & Gap Analysis**: Extracts a candidate's structured profile from a PDF/DOCX resume, generating a gap map against a Job Description for highly targeted questioning.
- **Multi-Dimensional Scoring**: Evaluates candidate responses across four axes: Accuracy (30%), Depth (25%), Communication (20%), and Confidence (15%), culminating in a structured final report with agentic analysis and hiring recommendations.
- **Cross-Questioning**: Autonomously challenges candidates if answers are vague or superficial.

## The Average User
- **Job Seekers**: Individuals preparing for technical and behavioral interviews who want realistic, high-pressure practice.
- **Recruiters & HR**: Organizations seeking to conduct automated, scalable initial screening interviews that evaluate both technical aptitude and behavioral traits.
- **Hiring Managers**: Teams needing to parse resumes, automatically conduct a gap analysis against a JD, and receive a robust, quantified report on a candidate's viability.

## How the System Works & Ledger (State) Management
Bodhi utilizes an advanced **Stateful Graph Architecture** powered by LangGraph to orchestrate the interview lifecycle.

### State Management & Three-Tier Storage
Instead of a financial ledger, Bodhi maintains an **Interview State Ledger** (`InterviewState` TypedDict) which tracks messages, current phases, difficulty levels, scores, pending probes, and memories.
State is persisted across three tiers:
1. **Edge (MemorySaver)**: In-process checkpointing for zero-latency state retrieval during the active voice loop hot path.
2. **Cache (Redis)**: Sub-millisecond storage for session snapshots, entity context, suggested topics, and question queues.
3. **Persistent (NeonDB PostgreSQL)**: Permanent storage for sessions, full transcripts, phase results, company/role profiles, and vector embeddings (via `pgvector`).

### Context Memory Compaction
As the interview progresses through phases (e.g., Intro → Technical → Behavioral), Bodhi automatically triggers a `compact_memory` node. An LLM summarizes the completed phase into key claims, strengths, weaknesses, and follow-up hooks. These memories are injected into the system prompt for subsequent phases, enabling the AI to naturally reference earlier answers (e.g., *"You mentioned Redis earlier, how did you handle cache invalidation?"*).

## The AI Pipelines
- **Audio & STT**: User speech is captured (using WebRTC VAD), chunked automatically to handle API limits, and transcribed using Sarvam AI's Saaras V3.
- **LLM Reasoning**: Transcripts are streamed token-by-token to Google Gemini via LangChain/LangGraph. The system filters out background reasoning tokens and only outputs the intended conversational response.
- **TTS**: The text response is accumulated by sentences and immediately spoken aloud using Sarvam AI's Bulbul V3 for zero-latency playback.
- **Proctoring (Computer Vision)**: In the browser flow, a cascaded backend pipeline running at 1 FPS analyzes candidate behavior. It uses MediaPipe for face/iris tracking, Hugging Face Vision Transformers for emotion analysis, and YOLOv8n for detecting unauthorized objects/people in the frame. Violations are tracked in real-time.
