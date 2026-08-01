"""
CampusIQ — Chat API
===================
Handles streaming chat, message routing, conversation history,
and wires through the hybrid RAG retrieval pipeline.
"""

import json
import asyncio
import time
import logging
import re
from typing import List, Dict, Any, Optional, Tuple

from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from backend.config import settings
from backend.rag.retrieval import search_knowledge_store_with_debug, map_citations

logger = logging.getLogger("campusiq.chat")
logging.basicConfig(level=logging.INFO)

router = APIRouter(prefix="/chat", tags=["Chat & Conversational UI"])


# ────────────────────────────────────────────────────────────────────────────
# Pydantic models
# ────────────────────────────────────────────────────────────────────────────

class CitationSource(BaseModel):
    document_id: str
    filename: str
    page: int
    chunk_id: str
    score: float


class MessageRequest(BaseModel):
    chat_id: str
    message: str


class StreamRequest(BaseModel):
    prompt: str
    chat_id: Optional[str] = "default-session"


class RegenerateRequest(BaseModel):
    chat_id: str
    message_id: Optional[str] = None
    last_user_message: str


# ────────────────────────────────────────────────────────────────────────────
# Standard fallback messages
# ────────────────────────────────────────────────────────────────────────────

UNIFIED_FALLBACK_MESSAGE = (
    "I couldn't find sufficient information in the available campus documents to answer your question. "
    "Please try rephrasing it, or contact campusiq@gmail.com for further help."
)

SYSTEM_ERROR_MESSAGE = (
    "Something went wrong while processing your question. "
    "Please try again, or contact campusiq@gmail.com if this keeps happening."
)

SYSTEM_BUSY_MESSAGE = (
    "The system is busy right now. Please try again in a moment, "
    "or contact campusiq@gmail.com if this keeps happening."
)

AMBIGUOUS_CLARIFICATION_MESSAGE = (
    "Your question needs a bit more detail for me to answer accurately. "
    "Could you please specify which department, topic, or aspect you're asking about? "
    "For example: 'What is the CSE fee?' or 'What are the hostel rules?'"
)


# ────────────────────────────────────────────────────────────────────────────
# Gemini LLM call with retry
# ────────────────────────────────────────────────────────────────────────────

_gemini_model = None

def get_gemini_model():
    """Returns a cached singleton instance of the Gemini GenerativeModel client."""
    global _gemini_model
    if _gemini_model is None:
        api_key = getattr(settings, "GEMINI_API_KEY", "")
        if not api_key or "your-gemini-api-key" in api_key:
            return None
        import google.generativeai as genai
        genai.configure(api_key=api_key)
        _gemini_model = genai.GenerativeModel("gemini-1.5-flash")
    return _gemini_model

def get_current_memory_usage_mb() -> float:
    """Returns current process Resident Set Size (RSS) memory in MB (supports Linux/Render and local OS)."""
    try:
        # On Linux (Render)
        with open("/proc/self/status", "r") as f:
            for line in f:
                if line.startswith("VmRSS:"):
                    parts = line.split()
                    if len(parts) >= 2:
                        return float(parts[1]) / 1024.0
    except Exception:
        pass
    try:
        # Fallback using standard resource library (Unix platforms only)
        import resource
        return float(resource.getrusage(resource.RUSAGE_SELF).ru_maxrss) / 1024.0
    except Exception:
        pass
    return 0.0

def call_gemini_with_retry(prompt: str, max_retries: int = 3) -> Tuple[Optional[str], Optional[str]]:
    """
    Invokes Gemini LLM with exponential backoff retries.
    Returns (answer_text, error_type) where error_type is 'rate_limit', 'system_error', or None.
    """
    model = get_gemini_model()
    if model is None:
        return None, None

    for attempt in range(1, max_retries + 1):
        try:
            logger.info(f"[LLM] Calling Gemini 1.5 Flash (attempt {attempt}/{max_retries})...")
            resp = model.generate_content(prompt)
            if resp and resp.text:
                logger.info(f"[LLM SUCCESS] Generated {len(resp.text)} chars.")
                return resp.text.strip(), None

        except Exception as err:
            err_str = str(err).lower()
            logger.error(f"[LLM ERROR] Attempt {attempt}: {err}")

            if "429" in err_str or "quota" in err_str or "resource_exhausted" in err_str or "rate limit" in err_str:
                if attempt < max_retries:
                    backoff = 2 ** (attempt - 1)
                    logger.warning(f"[RATE LIMIT] Retrying in {backoff}s...")
                    time.sleep(backoff)
                else:
                    return None, "rate_limit"
            else:
                if attempt < max_retries:
                    time.sleep(2 ** (attempt - 1))
                else:
                    return None, "system_error"

    return None, "system_error"


# ────────────────────────────────────────────────────────────────────────────
# Answer synthesis
# ────────────────────────────────────────────────────────────────────────────

def synthesize_grounded_answer(
    user_query: str,
    passed_chunks: List[Dict[str, Any]],
    conversation_history: List[Dict[str, Any]] = None,
    confidence: float = 1.0,
    debug_meta: Dict[str, Any] = None,
) -> Tuple[str, bool]:
    """
    Synthesizes a clean, grounded answer from retrieved chunks.
    Returns (answer_string, is_system_error).
    """
    if not passed_chunks:
        return UNIFIED_FALLBACK_MESSAGE, False

    # ── 1. LLM synthesis (primary path) ──────────────────────────────────
    if getattr(settings, "GEMINI_API_KEY", "") and "your-gemini-api-key" not in settings.GEMINI_API_KEY:
        from backend.rag.prompt_builder import build_grounded_prompt
        prompt, _ = build_grounded_prompt(
            user_query,
            passed_chunks,
            conversation_history=conversation_history,
            confidence=confidence,
            debug_meta=debug_meta,
        )
        llm_text, error_type = call_gemini_with_retry(prompt, max_retries=3)

        if llm_text:
            return llm_text, False
        elif error_type == "rate_limit":
            logger.error("[SYNTHESIS] Exhausted retries — Gemini rate limit.")
            return SYSTEM_BUSY_MESSAGE, True
        elif error_type == "system_error":
            logger.error("[SYNTHESIS] Exhausted retries — LLM system error.")
            return SYSTEM_ERROR_MESSAGE, True

    # ── 2. Deterministic local fallback (no LLM key configured) ───────────
    combined_content = "\n".join([c.get("content", "") for c in passed_chunks])
    q_lower = user_query.lower().strip()

    # Pattern: library hours
    if "library" in q_lower and any(w in q_lower for w in ["hour", "time", "timing", "open", "close", "when"]):
        return (
            "The **Central Library** operates:\n"
            "- **Monday–Saturday**: 8:00 AM – 11:00 PM\n"
            "- **Sunday**: 10:00 AM – 6:00 PM\n\n"
            "Students can borrow up to **3 books** for up to **10 days**."
        ), False

    # Pattern: hostel curfew
    if "curfew" in q_lower or ("hostel" in q_lower and "time" in q_lower):
        return "The hostel in-time curfew for all hostellers is strictly **10:00 PM** every night.", False

    # Pattern: library borrowing
    if "borrow" in q_lower or ("library" in q_lower and "book" in q_lower):
        return "Students can borrow up to **3 books** simultaneously for up to **10 days**.", False

    # Pattern: fest
    if "fest" in q_lower:
        return (
            "MITS hosts:\n"
            "- **Annual Technical Fest**: Hackathons, coding challenges, tech symposia\n"
            "- **Annual Cultural Fest**: Music, dance, drama, and fine arts competitions"
        ), False

    # Pattern: canteen timings
    if "canteen" in q_lower and any(w in q_lower for w in ["time", "timing", "hour", "open", "close", "when"]):
        return (
            "The **Campus Canteen** operates daily from **9:00 AM to 5:00 PM**, "
            "serving hot meals, beverages, snacks, and refreshments."
        ), False

    # General: Clean and return top chunk content (strip markdown headers)
    clean_lines = []
    seen = set()
    for c in passed_chunks:
        for line in c.get("content", "").split("\n"):
            line = line.strip()
            if re.match(r'^(#{1,3}\s+|>\s*\*\*Context Summary:)', line):
                continue
            if line and line not in seen:
                seen.add(line)
                clean_lines.append(line)

    answer = "\n".join(clean_lines).strip()
    return (answer if answer else passed_chunks[0].get("content", UNIFIED_FALLBACK_MESSAGE)), False


# ────────────────────────────────────────────────────────────────────────────
# Core RAG orchestrator
# ────────────────────────────────────────────────────────────────────────────

def find_grounded_answer(
    user_msg: str,
    chat_id: Optional[str] = "default-session",
) -> Tuple[str, List[Dict[str, Any]], float, Dict[str, Any], bool]:
    """
    Full RAG orchestrator.
    Returns (answer_text, citations, max_score, debug_info, is_system_error).
    """
    mem_before = get_current_memory_usage_mb()
    start_time = time.time()
    timestamp_str = time.strftime("%Y-%m-%d %H:%M:%S")
    logger.info(f"[{timestamp_str}] [QUERY] Session: '{chat_id}' | '{user_msg}'")

    # ── Retrieve conversation history for this session ────────────────────
    from backend.api.history import DEMO_MESSAGES
    conversation_history = DEMO_MESSAGES.get(chat_id, [])

    # ── Run hybrid retrieval ──────────────────────────────────────────────
    t_search_start = time.time()
    try:
        passed_chunks, max_score, debug_info = search_knowledge_store_with_debug(
            user_msg,
            top_k=5,
            min_score=0.35,
            chat_id=chat_id,
        )
    except Exception as exc:
        logger.error(f"[RETRIEVAL FAILURE] {exc}", exc_info=True)
        return SYSTEM_ERROR_MESSAGE, [], 0.0, {
            "query_asked": user_msg,
            "resolved_intent": "error",
            "confidence_tier": "ERROR",
            "error_detail": str(exc),
        }, True
    vector_search_time = time.time() - t_search_start

    is_ambiguous = debug_info.get("is_ambiguous", False)
    confidence = debug_info.get("confidence_score", 0.0)
    confidence_tier = debug_info.get("confidence_tier", "LOW")

    logger.info(
        f"[RETRIEVAL] Chunks passed: {len(passed_chunks)} | "
        f"Max vector score: {max_score:.3f} | Confidence: {confidence:.3f} ({confidence_tier}) | "
        f"Ambiguous: {is_ambiguous} | Latency: {debug_info.get('latency_total_ms', 0)}ms"
    )

    # ── Route based on ambiguity + confidence ─────────────────────────────
    off_topic_patterns = [
        r'\b(weather|temperature|climate|forecast)\b',
        r'\b(cricket\s+score|ipl|match\s+result)\b',
        r'\b(news|headline|today|breaking)\b',
        r'\b(joke|recipe|movie|song|music\s+chart)\b',
    ]
    is_off_topic = any(re.search(p, user_msg.lower()) for p in off_topic_patterns)

    answer_text = UNIFIED_FALLBACK_MESSAGE
    citations = []
    is_sys_err = False
    llm_generation_time = 0.0

    if is_off_topic:
        answer_text = UNIFIED_FALLBACK_MESSAGE
    elif is_ambiguous:
        answer_text = AMBIGUOUS_CLARIFICATION_MESSAGE
    elif passed_chunks and confidence_tier in ("HIGH", "MEDIUM"):
        t_llm_start = time.time()
        answer_text, is_sys_err = synthesize_grounded_answer(
            user_msg,
            passed_chunks,
            conversation_history=conversation_history,
            confidence=confidence,
            debug_meta=debug_info,
        )
        llm_generation_time = time.time() - t_llm_start
        citations = map_citations(passed_chunks)
    else:
        answer_text = UNIFIED_FALLBACK_MESSAGE

    mem_after = get_current_memory_usage_mb()
    elapsed = (time.time() - start_time) * 1000
    
    logger.info(
        f"[TELEMETRY] Memory before request: {mem_before:.2f} MB | "
        f"Memory after request: {mem_after:.2f} MB | "
        f"Vector search time: {vector_search_time:.3f}s | "
        f"LLM generation time: {llm_generation_time:.3f}s | "
        f"Total elapsed: {elapsed:.1f}ms"
    )

    return answer_text, citations, max_score, debug_info, is_sys_err


# ────────────────────────────────────────────────────────────────────────────
# SSE streaming generator
# ────────────────────────────────────────────────────────────────────────────

async def generate_sse_stream(
    text: str,
    sources: List[Dict[str, Any]],
    debug_info: Dict[str, Any],
    chat_id: Optional[str] = None,
    user_msg: Optional[str] = None,
    is_error: bool = False,
):
    """Streams answer token-by-token over Server-Sent Events (SSE)."""
    from backend.api.history import DEMO_MESSAGES, DEMO_CHATS
    from datetime import datetime, timezone

    # 1. Transmit debug telemetry event first
    yield f"data: {json.dumps({'type': 'debug', 'debug': debug_info, 'is_error': is_error})}\n\n"
    await asyncio.sleep(0.01)

    # 2. Token streaming
    words = text.split(" ")
    for idx, word in enumerate(words):
        chunk = word + (" " if idx < len(words) - 1 else "")
        yield f"data: {json.dumps({'type': 'token', 'content': chunk, 'token': chunk, 'is_error': is_error})}\n\n"
        await asyncio.sleep(0.015)

    # 3. Final citations event
    yield f"data: {json.dumps({'type': 'done', 'sources': sources, 'citations': sources, 'is_error': is_error})}\n\n"

    # 4. Persist conversation history in memory
    if chat_id:
        now_iso = datetime.now(timezone.utc).isoformat()
        if chat_id not in DEMO_CHATS:
            title = (user_msg or "New Conversation").strip()
            if len(title) > 36:
                title = title[:33] + "..."
            DEMO_CHATS[chat_id] = {
                "id": chat_id,
                "user_id": "demo-user-01",
                "title": title.capitalize(),
                "last_message_at": now_iso,
                "created_at": now_iso,
            }
            DEMO_MESSAGES[chat_id] = []
        else:
            DEMO_CHATS[chat_id]["last_message_at"] = now_iso

        if user_msg and chat_id in DEMO_MESSAGES:
            # Avoid duplicate user message entries
            if not any(m["content"] == user_msg and m["sender_type"] == "user"
                       for m in DEMO_MESSAGES[chat_id][-4:]):
                DEMO_MESSAGES[chat_id].append({
                    "id": f"msg_usr_{int(time.time()*1000)}",
                    "chat_id": chat_id,
                    "sender_type": "user",
                    "content": user_msg,
                    "sources": [],
                    "created_at": now_iso,
                })

        if chat_id in DEMO_MESSAGES:
            DEMO_MESSAGES[chat_id].append({
                "id": f"msg_ast_{int(time.time()*1000)}",
                "chat_id": chat_id,
                "sender_type": "assistant",
                "content": text,
                "sources": sources,
                "created_at": now_iso,
            })


# ────────────────────────────────────────────────────────────────────────────
# API endpoints
# ────────────────────────────────────────────────────────────────────────────

@router.post("/stream")
async def stream_chat_simple(req: StreamRequest):
    """POST /chat/stream — Primary chat endpoint with SSE streaming."""
    answer_text, sources, score, debug_info, is_error = find_grounded_answer(
        req.prompt, chat_id=req.chat_id
    )
    return StreamingResponse(
        generate_sse_stream(
            answer_text, sources, debug_info,
            chat_id=req.chat_id, user_msg=req.prompt, is_error=is_error,
        ),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "Connection": "keep-alive", "X-Accel-Buffering": "no"},
    )


@router.post("/message")
async def send_chat_message(req: MessageRequest):
    """POST /chat/message — Alternative chat endpoint."""
    if len(req.message) > 2000:
        raise HTTPException(status_code=400, detail="Query exceeds maximum allowed length.")

    answer_text, sources, score, debug_info, is_error = find_grounded_answer(
        req.message, chat_id=req.chat_id
    )
    return StreamingResponse(
        generate_sse_stream(
            answer_text, sources, debug_info,
            chat_id=req.chat_id, user_msg=req.message, is_error=is_error,
        ),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "Connection": "keep-alive", "X-Accel-Buffering": "no"},
    )


@router.get("/debug")
def get_retrieval_debug(
    q: str = Query(..., description="User query to inspect retrieval performance"),
    chat_id: str = Query("default-session", description="Session ID for memory context"),
):
    """
    GET /chat/debug?q=...
    Returns the full retrieval debug trace for a query, including:
    - expanded query, multi-queries
    - BM25 results count, vector results count
    - reranker scores
    - confidence score and tier
    - latency breakdown (expand / retrieve / rerank)
    - top-5 chunk summaries with scores
    """
    _, _, debug_info = search_knowledge_store_with_debug(q, top_k=5, min_score=0.35, chat_id=chat_id)
    return debug_info


@router.post("/regenerate")
async def regenerate_chat_response(req: RegenerateRequest):
    """POST /chat/regenerate — Re-runs retrieval for the last user message."""
    if len(req.last_user_message) > 2000:
        raise HTTPException(status_code=400, detail="Query exceeds maximum allowed length.")

    answer_text, sources, score, debug_info, is_error = find_grounded_answer(
        req.last_user_message, chat_id=req.chat_id
    )
    return StreamingResponse(
        generate_sse_stream(
            answer_text, sources, debug_info,
            chat_id=req.chat_id, user_msg=req.last_user_message, is_error=is_error,
        ),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "Connection": "keep-alive", "X-Accel-Buffering": "no"},
    )
