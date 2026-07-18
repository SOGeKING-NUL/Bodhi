"""LangGraph interview orchestration graph."""

import logging
import os
from datetime import datetime, timezone

from langchain_core.messages import SystemMessage
from langgraph.checkpoint.memory import MemorySaver
from langgraph.graph import END, StateGraph
from langgraph.prebuilt import ToolNode, tools_condition

from src.memory import build_cross_section_context, compact_phase
from src.prompts import build_jd_targeted_prompt, build_resume_based_prompt, build_system_prompt
from src.state import PHASE_CONFIG, QUICK_DEMO_PHASE_CONFIG, InterviewState
from src.tools import ALL_TOOLS

log = logging.getLogger("bodhi.graph")


def _pop_next_question(state: dict, phase: str) -> str:
    """Pop the next question from the queued_questions for a given phase.
    Returns the question string, or '' if the queue is empty or missing."""
    queued = state.get("queued_questions", {})
    if not isinstance(queued, dict):
        return ""
    phase_q = queued.get(phase, [])
    if not phase_q:
        return ""
    # Pop the first question
    next_q = phase_q[0]
    # Update the queue (remove the popped question)
    new_queued = dict(queued)
    new_queued[phase] = phase_q[1:]
    state["queued_questions"] = new_queued
    log.info(f"[QUEUE] Popped question for {phase}: {next_q}")
    log.info(f"[QUEUE] Remaining {phase} questions: {len(phase_q) - 1}")
    return next_q


def _process_tool_results(state: InterviewState) -> dict:
    """Graph node: interpret tool outputs and update state accordingly.

    Handles the new multi-dimensional SCORE format:
      SCORE:{composite}:{a},{d},{c},{conf}:{PROBE|NOPROBE}:{probe_reason}:{feedback}

    On TRANSITION: pops the first question from the new phase queue.
    On SCORE: pops the next question from the current phase queue; tracks probing.
    
    Demo mode: Prevents phase transitions when demo_mode=True.
    """
    updates: dict = {}
    last_msg = state["messages"][-1] if state["messages"] else None

    if last_msg is None:
        return updates

    content = last_msg.content if hasattr(last_msg, "content") else str(last_msg)

    if content.startswith("TRANSITION:"):
        # Block transitions in demo mode
        if state.get("demo_mode", False):
            log.info("[GRAPH] Demo mode: blocking phase transition")
            return updates
        
        new_phase = content.split(":", 1)[1]
        updates["current_phase"] = new_phase
        # Pop first question for the new phase
        next_q = _pop_next_question(state, new_phase)
        updates["target_question"] = next_q
        updates["queued_questions"] = state.get("queued_questions", {})
        updates["phase_question_count"] = 0
        updates["phase_start_time"] = datetime.now(timezone.utc).isoformat()
        updates["pending_probe"] = ""
        log.info(f"[GRAPH] Phase transition → {new_phase}, target_question: {next_q[:80] if next_q else '(ad-hoc)'}")

    elif content.startswith("SCORE:"):
        # Parse: SCORE:{composite}:{a},{d},{c},{conf}:{PROBE|NOPROBE}:{probe_reason}:{feedback}
        parts = content.split(":", 5)
        try:
            composite = float(parts[1])
            metrics_str = parts[2] if len(parts) > 2 else "3,3,3,3"
            metrics = [int(x) for x in metrics_str.split(",")]
            accuracy = metrics[0] if len(metrics) > 0 else 3
            depth_score = metrics[1] if len(metrics) > 1 else 3
            comm = metrics[2] if len(metrics) > 2 else 3
            conf = metrics[3] if len(metrics) > 3 else 3
        except (ValueError, IndexError):
            composite = 3.0
            accuracy = depth_score = comm = conf = 3

        probe_flag = parts[3] if len(parts) > 3 else "NOPROBE"
        probe_reason = parts[4] if len(parts) > 4 else ""
        feedback = parts[5] if len(parts) > 5 else ""

        phase = state["current_phase"]
        scores = dict(state.get("phase_scores", {}))
        prev = scores.get(phase, {"total_score": 0, "questions": 0, "feedback": []})
        prev = dict(prev)
        prev["total_score"] = prev.get("total_score", 0) + composite
        prev["questions"] = prev.get("questions", 0) + 1
        prev["feedback"] = list(prev.get("feedback", [])) + [feedback]
        scores[phase] = prev
        updates["phase_scores"] = scores

        # Track per-question score details
        answer_scores = list(state.get("answer_scores", []))
        q_count = state.get("phase_question_count", 0) + 1
        answer_scores.append({
            "phase": phase,
            "question_num": q_count,
            "accuracy": accuracy,
            "depth": depth_score,
            "communication": comm,
            "confidence": conf,
            "composite": composite,
            "feedback": feedback,
            "probed": probe_flag == "PROBE",
            "probe_reason": probe_reason,
        })
        updates["answer_scores"] = answer_scores
        updates["phase_question_count"] = q_count

        # Handle probing
        if probe_flag == "PROBE" and probe_reason:
            updates["pending_probe"] = probe_reason
            log.info(f"[GRAPH] Probe requested: {probe_reason}")
        else:
            updates["pending_probe"] = ""

        # Pop next question from current phase queue (only if not probing)
        if probe_flag != "PROBE":
            next_q = _pop_next_question(state, phase)
            updates["target_question"] = next_q
            updates["queued_questions"] = state.get("queued_questions", {})
        
        # In demo mode, auto-end after max questions
        if state.get("demo_mode", False):
            from src.state import DEMO_PHASE_CONFIG
            demo_phase = state.get("demo_phase", phase)
            max_q = DEMO_PHASE_CONFIG.get(demo_phase, {}).get("max_questions", 3)
            if q_count >= max_q:
                updates["should_end"] = True
                log.info(f"[GRAPH] Demo mode: reached max questions ({max_q}), ending session")

        # In quick_demo mode, auto-transition after max questions per phase
        if state.get("quick_demo", False):
            qd_max = QUICK_DEMO_PHASE_CONFIG.get(phase, {}).get("max_questions", 2)
            if q_count >= qd_max:
                from src.state import PHASES
                phase_idx = PHASES.index(phase) if phase in PHASES else -1
                if phase_idx >= 0 and phase_idx < len(PHASES) - 1:
                    # Force transition to the next phase
                    next_phase = PHASES[phase_idx + 1]
                    updates["current_phase"] = next_phase
                    next_q = _pop_next_question(state, next_phase)
                    updates["target_question"] = next_q
                    updates["queued_questions"] = state.get("queued_questions", {})
                    updates["phase_question_count"] = 0
                    updates["phase_start_time"] = datetime.now(timezone.utc).isoformat()
                    updates["pending_probe"] = ""
                    from langchain_core.messages import HumanMessage
                    updates["messages"] = [HumanMessage(content="[continue]")]
                    log.info(f"[GRAPH] Quick demo: phase {phase} done ({q_count} Qs), → {next_phase}")
                else:
                    # Last phase — end the session
                    updates["should_end"] = True
                    from langchain_core.messages import HumanMessage
                    updates["messages"] = [HumanMessage(content="[continue] The interview is now complete. Please provide a brief closing statement to the candidate and end the session. Do NOT ask any more questions.")]
                    log.info(f"[GRAPH] Quick demo: final phase {phase} done, ending session")

        log.info(f"[GRAPH] Score: {composite} (A:{accuracy} D:{depth_score} C:{comm} Cf:{conf}) "
                 f"for {phase} Q{q_count}")

    elif content.startswith("DIFFICULTY:"):
        direction = content.split(":", 1)[1]
        level = state.get("difficulty_level", 3)
        if direction == "up":
            updates["difficulty_level"] = min(5, level + 1)
        elif direction == "down":
            updates["difficulty_level"] = max(1, level - 1)

    elif content.startswith("END:"):
        updates["should_end"] = True

    return updates


def _compact_memory_node(state: InterviewState) -> dict:
    """Graph node: fires on phase transitions to compact the old phase's memory.

    Uses the LLM to summarise the conversation from the phase that just ended,
    stores it in phase_memories for cross-section context in later phases.
    """
    # The phase has ALREADY been updated by _process_tool_results,
    # so we need to figure out which phase just ended.
    # We look at phase_memories to see what's already compacted.
    phase_memories = dict(state.get("phase_memories", {}))
    current_phase = state.get("current_phase", "intro")
    messages = state.get("messages", [])

    from src.state import PHASES
    current_idx = PHASES.index(current_phase) if current_phase in PHASES else 0
    if current_idx == 0:
        return {}

    old_phase = PHASES[current_idx - 1]

    # Skip if already compacted
    if old_phase in phase_memories:
        return {}

    # Use a lightweight LLM for compaction
    try:
        from src.services.llm import create_llm
        import os
        compact_llm = create_llm(api_key=os.getenv("GOOGLE_API_KEY", ""))
        memory = compact_phase(old_phase, messages, compact_llm)
        phase_memories[old_phase] = memory
        log.info(f"[GRAPH] Compacted memory for phase '{old_phase}' "
                 f"({len(memory.get('key_claims', []))} claims, "
                 f"{len(memory.get('follow_up_hooks', []))} hooks)")
        return {"phase_memories": phase_memories}
    except Exception as e:
        log.error(f"[GRAPH] Memory compaction failed for '{old_phase}': {e}")
        return {}


def create_durable_checkpointer(database_url: str | None):
    """Build a Postgres-backed checkpointer so interview state survives restarts
    and can be shared across multiple workers/containers.

    Returns None (caller should fall back to in-memory) if the optional
    dependencies aren't installed or the connection can't be established — the
    app must still boot. Install 'langgraph-checkpoint-postgres' and
    'psycopg[binary,pool]' to enable durable state.
    """
    if not database_url:
        return None
    # The sync PostgresSaver is incompatible with the async streaming path
    # (graph.astream_events → aget_tuple raises NotImplementedError). Until the
    # graph is migrated to an async checkpointer, durable state is opt-in; by
    # default we use the in-memory MemorySaver which supports both sync + async.
    if os.getenv("DURABLE_CHECKPOINTER", "").strip().lower() not in ("1", "true", "yes"):
        log.info(
            "Durable checkpointer disabled (set DURABLE_CHECKPOINTER=true once the "
            "async checkpointer migration is done). Using in-memory interview state."
        )
        return None
    try:
        from langgraph.checkpoint.postgres import PostgresSaver
        from psycopg_pool import ConnectionPool
    except ImportError as e:
        log.warning(
            "Durable checkpointer unavailable (%s); using in-memory state. "
            "Interview sessions will be LOST on restart and cannot be shared "
            "across workers. Install langgraph-checkpoint-postgres + psycopg[pool].",
            e,
        )
        return None
    try:
        pool = ConnectionPool(
            conninfo=database_url,
            max_size=int(os.getenv("CHECKPOINT_POOL_MAX", "10")),
            open=True,
            # NeonDB (and most managed Postgres) drop idle connections, which
            # would otherwise hand a dead connection to graph.invoke ("SSL
            # connection has been closed unexpectedly"). check_connection
            # validates each connection on checkout and discards stale ones;
            # max_lifetime/max_idle recycle them before Neon times them out.
            check=ConnectionPool.check_connection,
            max_lifetime=300,
            max_idle=120,
            kwargs={"autocommit": True},
        )
        checkpointer = PostgresSaver(pool)
        checkpointer.setup()  # idempotent — creates checkpoint tables if missing
        log.info("Using PostgresSaver for durable interview state.")
        return checkpointer
    except Exception as e:
        log.warning(
            "Failed to initialize PostgresSaver (%s); using in-memory state.", e
        )
        return None


def build_interview_graph(llm, checkpointer=None):
    """Construct and compile the interview StateGraph.

    Args:
        llm: A ChatGoogleGenerativeAI instance (from create_llm).
        checkpointer: Optional LangGraph checkpointer. If None, an in-memory
            MemorySaver is used (suitable for the CLI / tests, but NOT durable).

    Returns:
        Compiled LangGraph graph.
    """
    model_with_tools = llm.bind_tools(ALL_TOOLS)

    def interviewer_node(state: InterviewState) -> dict:
        mode = state.get("interview_mode", "standard")
        phase = state["current_phase"]
        difficulty = state["difficulty_level"]

        # Build cross-section context from compacted phase memories
        cross_context = build_cross_section_context(state.get("phase_memories", {}))
        pending_probe = state.get("pending_probe", "")

        # Phase timing info for prompt — quick_demo overrides standard budgets
        if state.get("quick_demo", False):
            config = QUICK_DEMO_PHASE_CONFIG.get(phase, {})
        else:
            config = PHASE_CONFIG.get(phase, {})
        q_count = state.get("phase_question_count", 0)
        target_q = config.get("target_questions", 5)
        max_q = config.get("max_questions", 7)

        if mode == "option_a":
            system = build_resume_based_prompt(
                candidate_profile=state.get("candidate_profile") or {},
                current_phase=phase,
                difficulty_level=difficulty,
                cross_section_context=cross_context,
                pending_probe=pending_probe,
                questions_asked=q_count,
                target_questions=target_q,
                max_questions=max_q,
            )
        elif mode == "option_b":
            system = build_jd_targeted_prompt(
                candidate_profile=state.get("candidate_profile") or {},
                jd_context=state.get("jd_context") or "",
                gap_map=state.get("gap_map") or {},
                current_phase=phase,
                difficulty_level=difficulty,
                cross_section_context=cross_context,
                pending_probe=pending_probe,
                questions_asked=q_count,
                target_questions=target_q,
                max_questions=max_q,
            )
        else:
            system = build_system_prompt(
                candidate_name=state["candidate_name"],
                target_company=state["target_company"],
                target_role=state["target_role"],
                current_phase=phase,
                difficulty_level=difficulty,
                entity_context=state.get("entity_context", ""),
                suggested_topics=state.get("suggested_topics", ""),
                target_question=state.get("target_question", ""),
                cross_section_context=cross_context,
                pending_probe=pending_probe,
                questions_asked=q_count,
                target_questions=target_q,
                max_questions=max_q,
            )
        all_messages = [SystemMessage(content=system)] + list(state["messages"])
        response = model_with_tools.invoke(all_messages)
        return {"messages": [response]}

    tool_node = ToolNode(ALL_TOOLS)

    def should_compact(state: InterviewState) -> str:
        """After process_tools, check if a phase transition just happened."""
        last_msg = state["messages"][-1] if state["messages"] else None
        if last_msg:
            content = last_msg.content if hasattr(last_msg, "content") else str(last_msg)
            if content.startswith("TRANSITION:") or content == "[continue]":
                return "compact"
        return "continue"

    builder = StateGraph(InterviewState)
    builder.add_node("interviewer", interviewer_node)
    builder.add_node("tools", tool_node)
    builder.add_node("process_tools", _process_tool_results)
    builder.add_node("compact_memory", _compact_memory_node)

    builder.set_entry_point("interviewer")
    builder.add_conditional_edges("interviewer", tools_condition)
    builder.add_edge("tools", "process_tools")
    builder.add_conditional_edges(
        "process_tools",
        should_compact,
        {"compact": "compact_memory", "continue": "interviewer"},
    )
    builder.add_edge("compact_memory", "interviewer")

    if checkpointer is None:
        checkpointer = MemorySaver()
    return builder.compile(checkpointer=checkpointer)
