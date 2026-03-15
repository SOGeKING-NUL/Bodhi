"""NeonDB PostgreSQL persistence layer (Tier 3) — permanent interview records."""

import json
import os
from datetime import datetime, timezone

import psycopg2
import psycopg2.extras


def _default_database_url() -> str:
    return os.getenv("DATABASE_URL", "")


_DDL = """
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS sessions (
    id              TEXT PRIMARY KEY,
    candidate_name  TEXT NOT NULL,
    target_company  TEXT NOT NULL,
    target_role     TEXT NOT NULL,
    clerk_user_id   TEXT,
    user_profile_id UUID,
    started_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ended_at        TIMESTAMPTZ,
    overall_score   REAL,
    summary         TEXT,
    report_data     JSONB
);

CREATE TABLE IF NOT EXISTS transcripts (
    id          SERIAL PRIMARY KEY,
    session_id  TEXT NOT NULL REFERENCES sessions(id),
    role        TEXT NOT NULL,
    content     TEXT NOT NULL,
    phase       TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS phase_results (
    id                 SERIAL PRIMARY KEY,
    session_id         TEXT NOT NULL REFERENCES sessions(id),
    phase              TEXT NOT NULL,
    score              REAL,
    question_count     INT,
    difficulty_reached INT,
    feedback_json      TEXT
);

CREATE TABLE IF NOT EXISTS entities (
    id               SERIAL PRIMARY KEY,
    company_name     TEXT NOT NULL UNIQUE,
    description      TEXT,
    hiring_patterns  TEXT,
    tech_stack       TEXT,
    contributed_by   TEXT,
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS company_profiles (
    id              SERIAL PRIMARY KEY,
    company_name    TEXT NOT NULL,
    role            TEXT NOT NULL,
    description     TEXT,
    hiring_patterns TEXT,
    tech_stack      TEXT,
    contributed_by  TEXT,
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(company_name, role)
);

CREATE TABLE IF NOT EXISTS company_documents (
    id              SERIAL PRIMARY KEY,
    company_name    TEXT NOT NULL,
    role            TEXT NOT NULL,
    chunk_text      TEXT NOT NULL,
    chunk_index     INT NOT NULL,
    source_label    TEXT DEFAULT '',
    embedding       vector(3072) NOT NULL,
    contributed_by  TEXT DEFAULT '',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS role_profiles (
    id              SERIAL PRIMARY KEY,
    role_name       TEXT NOT NULL UNIQUE,
    description     TEXT DEFAULT '',
    focus_areas     TEXT DEFAULT '',
    typical_topics  TEXT DEFAULT '',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS phase_memories (
    id          SERIAL PRIMARY KEY,
    session_id  TEXT NOT NULL REFERENCES sessions(id),
    phase       TEXT NOT NULL,
    summary     JSONB NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(session_id, phase)
);

CREATE TABLE IF NOT EXISTS answer_scores (
    id            SERIAL PRIMARY KEY,
    session_id    TEXT NOT NULL REFERENCES sessions(id),
    phase         TEXT NOT NULL,
    question_num  INT NOT NULL,
    accuracy      INT,
    depth         INT,
    communication INT,
    confidence    INT,
    composite     REAL,
    feedback      TEXT,
    probed        BOOLEAN DEFAULT FALSE,
    probe_reason  TEXT DEFAULT '',
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS proctoring_violations (
    id              SERIAL PRIMARY KEY,
    session_id      TEXT NOT NULL REFERENCES sessions(id),
    violation_type  TEXT NOT NULL,
    severity        TEXT NOT NULL,
    message         TEXT,
    timestamp       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sentiment_data (
    id                  SERIAL PRIMARY KEY,
    session_id          TEXT NOT NULL REFERENCES sessions(id),
    emotion             TEXT,
    sentiment           TEXT,
    confidence_score    INT,
    speaking_rate_wpm   INT,
    filler_rate         REAL,
    posture             TEXT,
    gaze_direction      TEXT,
    spine_score         INT,
    flags               TEXT[],
    timestamp           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_transcripts_session ON transcripts(session_id);
CREATE INDEX IF NOT EXISTS idx_phase_results_session ON phase_results(session_id);
CREATE INDEX IF NOT EXISTS idx_entities_company ON entities(company_name);
CREATE INDEX IF NOT EXISTS idx_company_docs_lookup ON company_documents(company_name, role);
CREATE INDEX IF NOT EXISTS idx_role_profiles_name ON role_profiles(role_name);
CREATE INDEX IF NOT EXISTS idx_phase_memories_session ON phase_memories(session_id);
CREATE INDEX IF NOT EXISTS idx_answer_scores_session ON answer_scores(session_id);
CREATE INDEX IF NOT EXISTS idx_proctoring_violations_session ON proctoring_violations(session_id);
CREATE INDEX IF NOT EXISTS idx_sentiment_data_session ON sentiment_data(session_id);
"""


class BodhiStorage:
    """Thin wrapper around psycopg2 for NeonDB operations."""

    def __init__(self, database_url: str | None = None):
        self._url = database_url or _default_database_url()
        if not self._url:
            raise ValueError(
                "DATABASE_URL not set. Add your NeonDB connection string to .env"
            )
        self.conn = self._connect()

    def _connect(self):
        conn = psycopg2.connect(
            self._url,
            keepalives=1,
            keepalives_idle=30,
            keepalives_interval=10,
            keepalives_count=5,
        )
        conn.autocommit = True
        return conn

    def _ensure_conn(self):
        """Reconnect if the connection was dropped by the server."""
        try:
            with self.conn.cursor() as cur:
                cur.execute("SELECT 1")
        except Exception:
            try:
                self.conn.close()
            except Exception:
                pass
            self.conn = self._connect()

    def init_tables(self) -> None:
        """Create tables if they don't exist."""
        self._ensure_conn()
        with self.conn.cursor() as cur:
            cur.execute(_DDL)
            # Safe migrations for existing databases
            for stmt in [
                "ALTER TABLE sessions ADD COLUMN IF NOT EXISTS clerk_user_id TEXT;",
                "ALTER TABLE sessions ADD COLUMN IF NOT EXISTS report_data JSONB;",
            ]:
                try:
                    cur.execute(stmt)
                except Exception:
                    pass

            # user_profiles table (separate execute for clear error visibility)
            try:
                cur.execute("ALTER TABLE sessions ADD COLUMN IF NOT EXISTS user_profile_id UUID;")
            except Exception:
                pass

            try:
                cur.execute(
                    "CREATE INDEX IF NOT EXISTS idx_sessions_user_profile ON sessions(user_profile_id);"
                )
            except Exception:
                pass

            # Execute the user_profiles table separately so any failure is visible.
            # (psycopg2 multi-statement execute only surfaces the last statement's error.)
            cur.execute("""
                CREATE TABLE IF NOT EXISTS user_profiles (
                    user_id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    clerk_user_id   TEXT,
                    resume_raw_text TEXT NOT NULL,
                    professional_summary JSONB NOT NULL,
                    created_at      TIMESTAMPTZ DEFAULT NOW(),
                    updated_at      TIMESTAMPTZ DEFAULT NOW()
                )
            """)

            try:
                cur.execute("ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS clerk_user_id TEXT;")
            except Exception:
                pass

            cur.execute(
                "CREATE UNIQUE INDEX IF NOT EXISTS idx_user_profiles_clerk_user_id "
                "ON user_profiles(clerk_user_id) WHERE clerk_user_id IS NOT NULL;"
            )

            # Add FK for sessions.user_profile_id -> user_profiles.user_id
            try:
                cur.execute(
                    "ALTER TABLE sessions "
                    "ADD CONSTRAINT sessions_user_profile_id_fkey "
                    "FOREIGN KEY (user_profile_id) REFERENCES user_profiles(user_id);"
                )
            except Exception:
                pass

            # ── Gamification tables ──────────────────────────────────────
            try:
                cur.execute("""
                    CREATE TABLE IF NOT EXISTS user_stats (
                        clerk_user_id   TEXT PRIMARY KEY,
                        display_name    TEXT,
                        total_xp        INT NOT NULL DEFAULT 0,
                        total_sessions  INT NOT NULL DEFAULT 0,
                        best_score_pct  REAL NOT NULL DEFAULT 0,
                        avg_score_pct   REAL NOT NULL DEFAULT 0,
                        current_streak  INT NOT NULL DEFAULT 0,
                        longest_streak  INT NOT NULL DEFAULT 0,
                        last_session_date DATE,
                        streak_shields  INT NOT NULL DEFAULT 0,
                        rank_tier       TEXT NOT NULL DEFAULT 'Novice',
                        updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
                    )
                """)
            except Exception:
                pass

            try:
                cur.execute("""
                    CREATE TABLE IF NOT EXISTS xp_log (
                        id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                        clerk_user_id   TEXT NOT NULL,
                        session_id      TEXT NOT NULL,
                        xp_earned       INT NOT NULL,
                        breakdown       JSONB NOT NULL DEFAULT '{}',
                        created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
                    )
                """)
            except Exception:
                pass

            try:
                cur.execute("""
                    CREATE TABLE IF NOT EXISTS user_badges (
                        id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                        clerk_user_id   TEXT NOT NULL,
                        badge_id        TEXT NOT NULL,
                        session_id      TEXT,
                        earned_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                        UNIQUE(clerk_user_id, badge_id)
                    )
                """)
            except Exception:
                pass

            try:
                cur.execute("""
                    CREATE TABLE IF NOT EXISTS weekly_challenges (
                        id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                        week_start      DATE NOT NULL,
                        week_end        DATE NOT NULL,
                        title           TEXT NOT NULL,
                        description     TEXT NOT NULL,
                        challenge_type  TEXT NOT NULL,
                        criteria        JSONB NOT NULL DEFAULT '{}',
                        prize_description TEXT NOT NULL,
                        recruiter_info  JSONB,
                        max_winners     INT NOT NULL DEFAULT 3,
                        status          TEXT NOT NULL DEFAULT 'active',
                        created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                        UNIQUE(week_start)
                    )
                """)
            except Exception:
                pass

            try:
                cur.execute("""
                    CREATE TABLE IF NOT EXISTS challenge_entries (
                        id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                        challenge_id    UUID NOT NULL,
                        clerk_user_id   TEXT NOT NULL,
                        session_id      TEXT NOT NULL,
                        qualifying_score REAL NOT NULL,
                        rank            INT,
                        is_winner       BOOL NOT NULL DEFAULT FALSE,
                        submitted_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                        UNIQUE(challenge_id, clerk_user_id)
                    )
                """)
            except Exception:
                pass

            try:
                cur.execute("CREATE INDEX IF NOT EXISTS idx_xp_log_user ON xp_log(clerk_user_id, created_at DESC);")
                cur.execute("CREATE INDEX IF NOT EXISTS idx_user_badges_user ON user_badges(clerk_user_id);")
                cur.execute("CREATE INDEX IF NOT EXISTS idx_challenge_entries_challenge ON challenge_entries(challenge_id, qualifying_score DESC);")
                cur.execute("CREATE INDEX IF NOT EXISTS idx_weekly_challenges_week ON weekly_challenges(week_start);")
            except Exception:
                pass

            # Seed weekly challenges if none exist
            try:
                self._seed_challenges_if_empty(cur)
            except Exception:
                pass

    def migrate_embedding_dimension(self) -> None:
        """One-time migration: drop and recreate company_documents for new vector(3072) dim.
        WARNING: This drops all existing embedded document data."""
        self._ensure_conn()
        with self.conn.cursor() as cur:
            cur.execute("DROP TABLE IF EXISTS company_documents;")
            cur.execute("""
                CREATE TABLE company_documents (
                    id              SERIAL PRIMARY KEY,
                    company_name    TEXT NOT NULL,
                    role            TEXT NOT NULL,
                    chunk_text      TEXT NOT NULL,
                    chunk_index     INT NOT NULL,
                    source_label    TEXT DEFAULT '',
                    embedding       vector(3072) NOT NULL,
                    contributed_by  TEXT DEFAULT '',
                    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
                );
                CREATE INDEX IF NOT EXISTS idx_company_docs_lookup ON company_documents(company_name, role);
            """)

    def close(self) -> None:
        self.conn.close()

    # ── Sessions ──────────────────────────────────────────────────────────────

    def create_session(
        self,
        session_id: str,
        candidate_name: str,
        target_company: str,
        target_role: str,
        clerk_user_id: str | None = None,
        user_profile_id: str | None = None,
    ) -> None:
        self._ensure_conn()
        with self.conn.cursor() as cur:
            cur.execute(
                "INSERT INTO sessions (id, candidate_name, target_company, target_role, clerk_user_id, user_profile_id) "
                "VALUES (%s, %s, %s, %s, %s, %s) ON CONFLICT (id) DO NOTHING",
                (session_id, candidate_name, target_company, target_role, clerk_user_id, user_profile_id),
            )

    def end_session(
        self,
        session_id: str,
        overall_score: float | None = None,
        summary: str = "",
        report_data: dict | None = None,
    ) -> None:
        self._ensure_conn()
        with self.conn.cursor() as cur:
            cur.execute(
                "UPDATE sessions SET ended_at = %s, overall_score = %s, summary = %s, report_data = %s "
                "WHERE id = %s",
                (
                    datetime.now(timezone.utc),
                    overall_score,
                    summary,
                    json.dumps(report_data) if report_data else None,
                    session_id,
                ),
            )

    def get_session_info(self, session_id: str) -> dict | None:
        """Retrieve basic session information."""
        self._ensure_conn()
        with self.conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute("SELECT * FROM sessions WHERE id = %s", (session_id,))
            row = cur.fetchone()
        return dict(row) if row else None

    def get_session_report_data(self, session_id: str) -> dict | None:
        """Retrieve the stored report data for a session."""
        self._ensure_conn()
        with self.conn.cursor() as cur:
            cur.execute("SELECT report_data FROM sessions WHERE id = %s", (session_id,))
            row = cur.fetchone()
        return row[0] if row and row[0] else None

    # ── Transcripts ───────────────────────────────────────────────────────────

    def save_transcript_batch(
        self,
        session_id: str,
        messages: list[dict],
        phase: str,
    ) -> None:
        """Bulk-insert messages. Each dict has 'role' and 'content'."""
        if not messages:
            return
        self._ensure_conn()
        rows = [
            (session_id, m["role"], m["content"], phase) for m in messages
        ]
        with self.conn.cursor() as cur:
            psycopg2.extras.execute_values(
                cur,
                "INSERT INTO transcripts (session_id, role, content, phase) VALUES %s",
                rows,
            )

    # ── Phase results ─────────────────────────────────────────────────────────

    def save_phase_result(
        self,
        session_id: str,
        phase: str,
        score: float | None = None,
        question_count: int = 0,
        difficulty_reached: int = 3,
        feedback: list[str] | None = None,
    ) -> None:
        self._ensure_conn()
        with self.conn.cursor() as cur:
            cur.execute(
                "INSERT INTO phase_results "
                "(session_id, phase, score, question_count, difficulty_reached, feedback_json) "
                "VALUES (%s, %s, %s, %s, %s, %s)",
                (
                    session_id,
                    phase,
                    score,
                    question_count,
                    difficulty_reached,
                    json.dumps(feedback or []),
                ),
            )

    # ── Phase memories (compacted context) ───────────────────────────────────

    def save_phase_memory(
        self,
        session_id: str,
        phase: str,
        memory: dict,
    ) -> None:
        """Persist a compacted phase memory summary."""
        self._ensure_conn()
        with self.conn.cursor() as cur:
            cur.execute(
                "INSERT INTO phase_memories (session_id, phase, summary) "
                "VALUES (%s, %s, %s) "
                "ON CONFLICT (session_id, phase) DO UPDATE SET summary = EXCLUDED.summary",
                (session_id, phase, json.dumps(memory)),
            )

    def get_phase_memories(self, session_id: str) -> dict:
        """Load all phase memories for a session from Neon."""
        self._ensure_conn()
        with self.conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute(
                "SELECT phase, summary FROM phase_memories WHERE session_id = %s",
                (session_id,),
            )
            result = {}
            for row in cur.fetchall():
                summary = row["summary"]
                if isinstance(summary, str):
                    summary = json.loads(summary)
                result[row["phase"]] = summary
            return result

    # ── Answer scores (granular per-question scores) ──────────────────────────

    def save_answer_score(
        self,
        session_id: str,
        phase: str,
        question_num: int,
        accuracy: int,
        depth: int,
        communication: int,
        confidence: int,
        composite: float,
        feedback: str = "",
        probed: bool = False,
        probe_reason: str = "",
    ) -> None:
        """Persist a single answer score."""
        self._ensure_conn()
        with self.conn.cursor() as cur:
            cur.execute(
                "INSERT INTO answer_scores "
                "(session_id, phase, question_num, accuracy, depth, communication, "
                "confidence, composite, feedback, probed, probe_reason) "
                "VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)",
                (session_id, phase, question_num, accuracy, depth,
                 communication, confidence, composite, feedback, probed, probe_reason),
            )

    def get_answer_scores(self, session_id: str) -> list[dict]:
        """Retrieve all answer scores for a session."""
        self._ensure_conn()
        with self.conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute(
                "SELECT * FROM answer_scores WHERE session_id = %s ORDER BY phase, question_num",
                (session_id,),
            )
            return [dict(r) for r in cur.fetchall()]

    # ── Proctoring violations ─────────────────────────────────────────────────

    def save_proctoring_violation(
        self,
        session_id: str,
        violation_type: str,
        severity: str,
        message: str,
    ) -> None:
        """Store a proctoring violation."""
        self._ensure_conn()
        with self.conn.cursor() as cur:
            cur.execute(
                "INSERT INTO proctoring_violations (session_id, violation_type, severity, message) "
                "VALUES (%s, %s, %s, %s)",
                (session_id, violation_type, severity, message),
            )

    def get_proctoring_violations(self, session_id: str) -> list[dict]:
        """Retrieve all proctoring violations for a session."""
        self._ensure_conn()
        with self.conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute(
                "SELECT * FROM proctoring_violations WHERE session_id = %s ORDER BY timestamp",
                (session_id,),
            )
            return [dict(r) for r in cur.fetchall()]

    # ── Sentiment data ────────────────────────────────────────────────────────

    def save_sentiment_data(
        self,
        session_id: str,
        emotion: str | None = None,
        sentiment: str | None = None,
        confidence_score: int | None = None,
        speaking_rate_wpm: int | None = None,
        filler_rate: float | None = None,
        posture: str | None = None,
        gaze_direction: str | None = None,
        spine_score: int | None = None,
        flags: list[str] | None = None,
    ) -> None:
        """Store sentiment and behavioral analysis data."""
        self._ensure_conn()
        with self.conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO sentiment_data
                (session_id, emotion, sentiment, confidence_score, speaking_rate_wpm, filler_rate,
                 posture, gaze_direction, spine_score, flags)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                """,
                (session_id, emotion, sentiment, confidence_score, speaking_rate_wpm, filler_rate,
                 posture, gaze_direction, spine_score, flags),
            )

    def get_sentiment_data(self, session_id: str) -> list[dict]:
        """Retrieve all sentiment data for a session."""
        self._ensure_conn()
        with self.conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute(
                "SELECT * FROM sentiment_data WHERE session_id = %s ORDER BY timestamp",
                (session_id,),
            )
            return [dict(r) for r in cur.fetchall()]

    # ── Entities ──────────────────────────────────────────────────────────────

    def get_entity(self, company_name: str) -> dict | None:
        self._ensure_conn()
        with self.conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute(
                "SELECT * FROM entities WHERE LOWER(company_name) = LOWER(%s)",
                (company_name,),
            )
            row = cur.fetchone()
            return dict(row) if row else None

    def upsert_entity(
        self,
        company_name: str,
        description: str = "",
        hiring_patterns: str = "",
        tech_stack: str = "",
        contributed_by: str = "",
    ) -> None:
        self._ensure_conn()
        with self.conn.cursor() as cur:
            cur.execute(
                "INSERT INTO entities (company_name, description, hiring_patterns, tech_stack, contributed_by, updated_at) "
                "VALUES (%s, %s, %s, %s, %s, %s) "
                "ON CONFLICT (company_name) DO UPDATE SET "
                "description = EXCLUDED.description, "
                "hiring_patterns = EXCLUDED.hiring_patterns, "
                "tech_stack = EXCLUDED.tech_stack, "
                "contributed_by = EXCLUDED.contributed_by, "
                "updated_at = EXCLUDED.updated_at",
                (
                    company_name,
                    description,
                    hiring_patterns,
                    tech_stack,
                    contributed_by,
                    datetime.now(timezone.utc),
                ),
            )

    # ── Company profiles (company+role granularity) ───────────────────────────

    def upsert_company_profile(
        self,
        company_name: str,
        role: str,
        description: str = "",
        hiring_patterns: str = "",
        tech_stack: str = "",
        contributed_by: str = "",
    ) -> None:
        self._ensure_conn()
        with self.conn.cursor() as cur:
            cur.execute(
                "INSERT INTO company_profiles "
                "(company_name, role, description, hiring_patterns, tech_stack, contributed_by, updated_at) "
                "VALUES (%s, %s, %s, %s, %s, %s, %s) "
                "ON CONFLICT (company_name, role) DO UPDATE SET "
                "description = EXCLUDED.description, "
                "hiring_patterns = EXCLUDED.hiring_patterns, "
                "tech_stack = EXCLUDED.tech_stack, "
                "contributed_by = EXCLUDED.contributed_by, "
                "updated_at = EXCLUDED.updated_at",
                (
                    company_name, role, description, hiring_patterns,
                    tech_stack, contributed_by, datetime.now(timezone.utc),
                ),
            )

    # ── Company documents (RAG vector store) ──────────────────────────────────

    def insert_document_chunks(
        self,
        company_name: str,
        role: str,
        chunks_with_embeddings: list[tuple[str, int, list[float]]],
        source_label: str = "",
        contributed_by: str = "",
    ) -> int:
        """Insert chunked+embedded documents. Each tuple: (chunk_text, chunk_index, embedding).
        Returns number of rows inserted."""
        if not chunks_with_embeddings:
            return 0
        self._ensure_conn()
        rows = [
            (company_name, role, text, idx, source_label, str(emb), contributed_by)
            for text, idx, emb in chunks_with_embeddings
        ]
        with self.conn.cursor() as cur:
            psycopg2.extras.execute_values(
                cur,
                "INSERT INTO company_documents "
                "(company_name, role, chunk_text, chunk_index, source_label, embedding, contributed_by) "
                "VALUES %s",
                rows,
            )
        return len(rows)

    def search_similar_chunks(
        self,
        company_name: str,
        role: str,
        query_embedding: list[float],
        top_k: int = 5,
    ) -> list[dict]:
        """Cosine-similarity search, merging role-only general docs + company-specific docs."""
        self._ensure_conn()
        emb_str = str(query_embedding)
        with self.conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute(
                "SELECT chunk_text, 1 - (embedding <=> %s::vector) AS similarity "
                "FROM company_documents "
                "WHERE ("
                "  (LOWER(company_name) = LOWER(%s) AND (LOWER(role) = LOWER(%s) OR role = 'general'))"
                "  OR"
                "  (company_name = 'general' AND LOWER(role) = LOWER(%s))"
                ") "
                "ORDER BY embedding <=> %s::vector "
                "LIMIT %s",
                (emb_str, company_name, role, role, emb_str, top_k),
            )
            return [dict(row) for row in cur.fetchall()]

    # ── Role profiles ─────────────────────────────────────────────────────────

    def create_role(
        self,
        role_name: str,
        description: str = "",
        focus_areas: str = "",
        typical_topics: str = "",
    ) -> dict:
        self._ensure_conn()
        with self.conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute(
                "INSERT INTO role_profiles (role_name, description, focus_areas, typical_topics) "
                "VALUES (%s, %s, %s, %s) RETURNING *",
                (role_name, description, focus_areas, typical_topics),
            )
            return dict(cur.fetchone())

    def list_roles(self) -> list[dict]:
        self._ensure_conn()
        with self.conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute("SELECT * FROM role_profiles ORDER BY role_name")
            return [dict(row) for row in cur.fetchall()]

    def get_role(self, role_name: str) -> dict | None:
        self._ensure_conn()
        with self.conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute(
                "SELECT * FROM role_profiles WHERE LOWER(role_name) = LOWER(%s)",
                (role_name,),
            )
            row = cur.fetchone()
            return dict(row) if row else None

    def update_role(self, role_name: str, **fields) -> dict | None:
        allowed = {"description", "focus_areas", "typical_topics"}
        updates = {k: v for k, v in fields.items() if k in allowed and v is not None}
        if not updates:
            return self.get_role(role_name)
        self._ensure_conn()
        set_clause = ", ".join(f"{k} = %s" for k in updates)
        values = list(updates.values()) + [role_name]
        with self.conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute(
                f"UPDATE role_profiles SET {set_clause}, updated_at = NOW() "
                "WHERE LOWER(role_name) = LOWER(%s) RETURNING *",
                values,
            )
            row = cur.fetchone()
            return dict(row) if row else None

    def delete_role(self, role_name: str) -> bool:
        self._ensure_conn()
        with self.conn.cursor() as cur:
            cur.execute(
                "DELETE FROM role_profiles WHERE LOWER(role_name) = LOWER(%s)",
                (role_name,),
            )
            return cur.rowcount > 0

    # ── Company profiles — list / get / delete ────────────────────────────────

    def list_company_profiles(self) -> list[dict]:
        self._ensure_conn()
        with self.conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute("SELECT * FROM company_profiles ORDER BY company_name, role")
            return [dict(row) for row in cur.fetchall()]

    def get_company_profiles(self, company_name: str) -> list[dict]:
        self._ensure_conn()
        with self.conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute(
                "SELECT * FROM company_profiles WHERE LOWER(company_name) = LOWER(%s) ORDER BY role",
                (company_name,),
            )
            return [dict(row) for row in cur.fetchall()]

    def delete_company_profile(self, company_name: str, role: str) -> bool:
        self._ensure_conn()
        with self.conn.cursor() as cur:
            cur.execute(
                "DELETE FROM company_profiles "
                "WHERE LOWER(company_name) = LOWER(%s) AND LOWER(role) = LOWER(%s)",
                (company_name, role),
            )
            return cur.rowcount > 0

    # ── User profiles (resume-based) ──────────────────────────────────────────

    def create_user_profile(
        self,
        resume_raw_text: str,
        professional_summary: dict,
        clerk_user_id: str | None = None,
    ) -> str:
        """Store a parsed resume profile. Returns the generated user_id (UUID string)."""
        self._ensure_conn()
        with self.conn.cursor() as cur:
            if clerk_user_id:
                cur.execute(
                    "SELECT user_id::text FROM user_profiles WHERE clerk_user_id = %s",
                    (clerk_user_id,),
                )
                row = cur.fetchone()
                if row:
                    cur.execute(
                        "UPDATE user_profiles SET resume_raw_text = %s, "
                        "professional_summary = %s, updated_at = NOW() "
                        "WHERE clerk_user_id = %s",
                        (
                            resume_raw_text,
                            psycopg2.extras.Json(professional_summary),
                            clerk_user_id,
                        ),
                    )
                    return row[0]

                cur.execute(
                    "INSERT INTO user_profiles (clerk_user_id, resume_raw_text, professional_summary) "
                    "VALUES (%s, %s, %s) RETURNING user_id::text",
                    (
                        clerk_user_id,
                        resume_raw_text,
                        psycopg2.extras.Json(professional_summary),
                    ),
                )
            else:
                cur.execute(
                    "INSERT INTO user_profiles (resume_raw_text, professional_summary) "
                    "VALUES (%s, %s) RETURNING user_id::text",
                    (resume_raw_text, psycopg2.extras.Json(professional_summary)),
                )
            return cur.fetchone()[0]

    def get_user_profile_id_by_clerk_user_id(self, clerk_user_id: str) -> str | None:
        """Fetch a user_id by Clerk user_id. Returns None if not found."""
        if not clerk_user_id:
            return None
        self._ensure_conn()
        with self.conn.cursor() as cur:
            cur.execute(
                "SELECT user_id::text FROM user_profiles WHERE clerk_user_id = %s",
                (clerk_user_id,),
            )
            row = cur.fetchone()
            return row[0] if row else None

    def ensure_user_profile_for_clerk(self, clerk_user_id: str) -> str:
        """Ensure a user_profile row exists for the Clerk user. Returns user_id."""
        if not clerk_user_id:
            raise ValueError("clerk_user_id is required")
        self._ensure_conn()
        with self.conn.cursor() as cur:
            cur.execute(
                "SELECT user_id::text FROM user_profiles WHERE clerk_user_id = %s",
                (clerk_user_id,),
            )
            row = cur.fetchone()
            if row:
                return row[0]

            cur.execute(
                "INSERT INTO user_profiles (clerk_user_id, resume_raw_text, professional_summary) "
                "VALUES (%s, %s, %s) RETURNING user_id::text",
                (clerk_user_id, "", psycopg2.extras.Json({})),
            )
            return cur.fetchone()[0]

    def get_user_profile_status_by_clerk_user_id(self, clerk_user_id: str) -> tuple[str, bool] | None:
        """Return (user_id, has_resume) for the Clerk user, or None if missing."""
        if not clerk_user_id:
            return None
        self._ensure_conn()
        with self.conn.cursor() as cur:
            cur.execute(
                "SELECT user_id::text, "
                "(resume_raw_text IS NOT NULL AND resume_raw_text <> '') AS has_resume "
                "FROM user_profiles WHERE clerk_user_id = %s",
                (clerk_user_id,),
            )
            row = cur.fetchone()
            if not row:
                return None
            return row[0], bool(row[1])


    def get_user_profile(self, user_id: str) -> dict | None:
        """Fetch a stored user profile by UUID. Returns None if not found or invalid UUID."""
        import uuid as _uuid
        try:
            _uuid.UUID(user_id)
        except (ValueError, AttributeError):
            return None
        self._ensure_conn()
        with self.conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute(
                "SELECT user_id::text, clerk_user_id, resume_raw_text, professional_summary, "
                "created_at, updated_at FROM user_profiles WHERE user_id = %s::uuid",
                (user_id,),
            )
            row = cur.fetchone()
            if not row:
                return None
            result = dict(row)
            if isinstance(result["professional_summary"], str):
                result["professional_summary"] = json.loads(result["professional_summary"])
            return result

    # ── Gamification ─────────────────────────────────────────────────────────

    def get_user_stats(self, clerk_user_id: str) -> dict:
        """Get user gamification stats, creating defaults if not found."""
        self._ensure_conn()
        with self.conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute("SELECT * FROM user_stats WHERE clerk_user_id = %s", (clerk_user_id,))
            row = cur.fetchone()
        if row:
            return dict(row)
        return {
            "clerk_user_id": clerk_user_id,
            "display_name": None,
            "total_xp": 0,
            "total_sessions": 0,
            "best_score_pct": 0.0,
            "avg_score_pct": 0.0,
            "current_streak": 0,
            "longest_streak": 0,
            "last_session_date": None,
            "streak_shields": 0,
            "rank_tier": "Novice",
        }

    def upsert_user_stats(
        self,
        clerk_user_id: str,
        total_xp: int,
        total_sessions: int,
        best_score_pct: float,
        avg_score_pct: float,
        current_streak: int,
        longest_streak: int,
        last_session_date,
        rank_tier: str,
        display_name: str | None = None,
    ) -> None:
        """Insert or update user stats row."""
        self._ensure_conn()
        with self.conn.cursor() as cur:
            cur.execute("""
                INSERT INTO user_stats
                    (clerk_user_id, display_name, total_xp, total_sessions, best_score_pct,
                     avg_score_pct, current_streak, longest_streak, last_session_date, rank_tier, updated_at)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, NOW())
                ON CONFLICT (clerk_user_id) DO UPDATE SET
                    display_name      = COALESCE(EXCLUDED.display_name, user_stats.display_name),
                    total_xp          = EXCLUDED.total_xp,
                    total_sessions    = EXCLUDED.total_sessions,
                    best_score_pct    = EXCLUDED.best_score_pct,
                    avg_score_pct     = EXCLUDED.avg_score_pct,
                    current_streak    = EXCLUDED.current_streak,
                    longest_streak    = EXCLUDED.longest_streak,
                    last_session_date = EXCLUDED.last_session_date,
                    rank_tier         = EXCLUDED.rank_tier,
                    updated_at        = NOW()
            """, (
                clerk_user_id, display_name, total_xp, total_sessions,
                best_score_pct, avg_score_pct, current_streak, longest_streak,
                last_session_date, rank_tier,
            ))

    def log_xp(self, clerk_user_id: str, session_id: str, xp_earned: int, breakdown: dict) -> None:
        """Record an XP event for a session."""
        self._ensure_conn()
        with self.conn.cursor() as cur:
            cur.execute("""
                INSERT INTO xp_log (clerk_user_id, session_id, xp_earned, breakdown)
                VALUES (%s, %s, %s, %s)
                ON CONFLICT DO NOTHING
            """, (clerk_user_id, session_id, xp_earned, json.dumps(breakdown)))

    def get_session_xp(self, session_id: str) -> dict | None:
        """Get the XP log entry for a specific session."""
        self._ensure_conn()
        with self.conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute("SELECT * FROM xp_log WHERE session_id = %s", (session_id,))
            row = cur.fetchone()
        return dict(row) if row else None

    def get_user_badges(self, clerk_user_id: str) -> list[dict]:
        """Get all badges for a user."""
        self._ensure_conn()
        with self.conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute(
                "SELECT badge_id, session_id, earned_at FROM user_badges "
                "WHERE clerk_user_id = %s ORDER BY earned_at",
                (clerk_user_id,),
            )
            return [dict(r) for r in cur.fetchall()]

    def award_badge(self, clerk_user_id: str, badge_id: str, session_id: str | None = None) -> bool:
        """Award a badge. Returns True if newly awarded, False if already had it."""
        self._ensure_conn()
        with self.conn.cursor() as cur:
            cur.execute("""
                INSERT INTO user_badges (clerk_user_id, badge_id, session_id)
                VALUES (%s, %s, %s)
                ON CONFLICT (clerk_user_id, badge_id) DO NOTHING
            """, (clerk_user_id, badge_id, session_id))
            return cur.rowcount > 0

    def get_clean_session_count(self, clerk_user_id: str) -> int:
        """Count sessions with zero proctoring violations for a user."""
        self._ensure_conn()
        with self.conn.cursor() as cur:
            cur.execute("""
                SELECT COUNT(*) FROM sessions s
                WHERE s.clerk_user_id = %s
                  AND s.ended_at IS NOT NULL
                  AND NOT EXISTS (
                      SELECT 1 FROM proctoring_violations pv WHERE pv.session_id = s.id
                  )
            """, (clerk_user_id,))
            return cur.fetchone()[0]

    def get_global_leaderboard(self, limit: int = 100) -> list[dict]:
        """All-time XP leaderboard."""
        self._ensure_conn()
        with self.conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute("""
                SELECT
                    us.clerk_user_id,
                    COALESCE(us.display_name, up.professional_summary->>'name', 'Anonymous') AS display_name,
                    us.total_xp,
                    us.total_sessions,
                    us.best_score_pct,
                    us.current_streak,
                    us.rank_tier
                FROM user_stats us
                LEFT JOIN user_profiles up ON up.clerk_user_id = us.clerk_user_id
                ORDER BY us.total_xp DESC
                LIMIT %s
            """, (limit,))
            rows = cur.fetchall()
        return [dict(r) for r in rows]

    def get_weekly_leaderboard(self, limit: int = 100) -> list[dict]:
        """XP earned in the last 7 days, ranked."""
        self._ensure_conn()
        with self.conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute("""
                SELECT
                    xl.clerk_user_id,
                    COALESCE(us.display_name, up.professional_summary->>'name', 'Anonymous') AS display_name,
                    SUM(xl.xp_earned) AS weekly_xp,
                    us.rank_tier,
                    us.total_xp
                FROM xp_log xl
                LEFT JOIN user_stats us ON us.clerk_user_id = xl.clerk_user_id
                LEFT JOIN user_profiles up ON up.clerk_user_id = xl.clerk_user_id
                WHERE xl.created_at >= NOW() - INTERVAL '7 days'
                GROUP BY xl.clerk_user_id, us.display_name, up.professional_summary, us.rank_tier, us.total_xp
                ORDER BY weekly_xp DESC
                LIMIT %s
            """, (limit,))
            rows = cur.fetchall()
        return [dict(r) for r in rows]

    def get_user_session_history(self, clerk_user_id: str, limit: int = 20) -> list[dict]:
        """Get recent completed sessions for a user."""
        self._ensure_conn()
        with self.conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute("""
                SELECT
                    s.id AS session_id,
                    s.target_company,
                    s.target_role,
                    s.overall_score,
                    s.started_at,
                    s.ended_at,
                    COALESCE(xl.xp_earned, 0) AS xp_earned
                FROM sessions s
                LEFT JOIN xp_log xl ON xl.session_id = s.id
                WHERE s.clerk_user_id = %s AND s.ended_at IS NOT NULL
                ORDER BY s.started_at DESC
                LIMIT %s
            """, (clerk_user_id, limit))
            return [dict(r) for r in cur.fetchall()]

    def get_active_challenge(self) -> dict | None:
        """Get the currently active weekly challenge."""
        self._ensure_conn()
        with self.conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute("""
                SELECT id::text, week_start, week_end, title, description,
                       challenge_type, criteria, prize_description, recruiter_info,
                       max_winners, status, created_at
                FROM weekly_challenges
                WHERE status = 'active'
                  AND week_start <= CURRENT_DATE
                  AND week_end >= CURRENT_DATE
                ORDER BY week_start DESC
                LIMIT 1
            """)
            row = cur.fetchone()
        return dict(row) if row else None

    def get_past_challenges(self, limit: int = 10) -> list[dict]:
        """Get past completed challenges with winners."""
        self._ensure_conn()
        with self.conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute("""
                SELECT wc.id::text, wc.week_start, wc.week_end, wc.title,
                       wc.description, wc.prize_description, wc.recruiter_info,
                       wc.max_winners, wc.status
                FROM weekly_challenges wc
                WHERE wc.week_end < CURRENT_DATE
                ORDER BY wc.week_start DESC
                LIMIT %s
            """, (limit,))
            challenges = [dict(r) for r in cur.fetchall()]

        # Attach winners to each challenge
        for ch in challenges:
            with self.conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
                cur.execute("""
                    SELECT
                        ce.clerk_user_id,
                        COALESCE(us.display_name, up.professional_summary->>'name', 'Anonymous') AS display_name,
                        ce.qualifying_score,
                        ce.rank,
                        ce.is_winner
                    FROM challenge_entries ce
                    LEFT JOIN user_stats us ON us.clerk_user_id = ce.clerk_user_id
                    LEFT JOIN user_profiles up ON up.clerk_user_id = ce.clerk_user_id
                    WHERE ce.challenge_id = %s::uuid AND ce.is_winner = TRUE
                    ORDER BY ce.rank
                """, (ch["id"],))
                ch["winners"] = [dict(r) for r in cur.fetchall()]

        return challenges

    def get_challenge_leaderboard(self, challenge_id: str) -> list[dict]:
        """Get entries for a specific challenge, ranked by score."""
        self._ensure_conn()
        with self.conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute("""
                SELECT
                    ce.clerk_user_id,
                    COALESCE(us.display_name, up.professional_summary->>'name', 'Anonymous') AS display_name,
                    ce.qualifying_score,
                    ce.is_winner,
                    ce.submitted_at,
                    us.rank_tier
                FROM challenge_entries ce
                LEFT JOIN user_stats us ON us.clerk_user_id = ce.clerk_user_id
                LEFT JOIN user_profiles up ON up.clerk_user_id = ce.clerk_user_id
                WHERE ce.challenge_id = %s::uuid
                ORDER BY ce.qualifying_score DESC
            """, (challenge_id,))
            return [dict(r) for r in cur.fetchall()]

    def try_enter_challenge(
        self,
        challenge_id: str,
        clerk_user_id: str,
        session_id: str,
        qualifying_score: float,
    ) -> bool:
        """
        Try to enter a challenge. Returns True if entered, False if already entered.
        No re-entry: one entry per user per challenge.
        """
        self._ensure_conn()
        with self.conn.cursor() as cur:
            cur.execute("""
                INSERT INTO challenge_entries (challenge_id, clerk_user_id, session_id, qualifying_score)
                VALUES (%s::uuid, %s, %s, %s)
                ON CONFLICT (challenge_id, clerk_user_id) DO NOTHING
            """, (challenge_id, clerk_user_id, session_id, qualifying_score))
            return cur.rowcount > 0

    def get_user_challenge_entry(self, challenge_id: str, clerk_user_id: str) -> dict | None:
        """Get user's entry for a specific challenge."""
        self._ensure_conn()
        with self.conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute("""
                SELECT ce.*, wc.title, wc.prize_description
                FROM challenge_entries ce
                JOIN weekly_challenges wc ON wc.id = ce.challenge_id
                WHERE ce.challenge_id = %s::uuid AND ce.clerk_user_id = %s
            """, (challenge_id, clerk_user_id))
            row = cur.fetchone()
        return dict(row) if row else None

    def _seed_challenges_if_empty(self, cur) -> None:
        """Seed 8 weeks of challenges if the table is empty. Uses cursor from init_tables."""
        cur.execute("SELECT COUNT(*) FROM weekly_challenges")
        if cur.fetchone()[0] > 0:
            return

        from src.gamification import get_challenge_templates
        from datetime import date, timedelta

        # Find the most recent Monday on or before today
        today = date.today()
        days_since_monday = today.weekday()  # 0 = Monday
        week_start = today - timedelta(days=days_since_monday)

        templates = get_challenge_templates()
        for i, tmpl in enumerate(templates):
            ws = week_start + timedelta(weeks=i)
            we = ws + timedelta(days=6)
            status = "active" if ws <= today <= we else ("completed" if we < today else "active")
            cur.execute("""
                INSERT INTO weekly_challenges
                    (week_start, week_end, title, description, challenge_type,
                     criteria, prize_description, max_winners, status)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT (week_start) DO NOTHING
            """, (
                ws, we,
                tmpl["title"], tmpl["description"], tmpl["challenge_type"],
                json.dumps(tmpl["criteria"]), tmpl["prize_description"],
                tmpl["max_winners"], status,
            ))
