"""
CampusIQ — Grounded Prompt Builder
===================================
Constructs the system + context + history prompt fed to the LLM.
Strict grounding rules prevent hallucination.
"""

from typing import List, Dict, Any, Tuple, Optional

REFUSAL_MESSAGE = (
    "I couldn't find sufficient information in the available campus documents to answer your question. "
    "Please contact the campus administration directly, or try rephrasing your question."
)

SYSTEM_INSTRUCTION = """\
You are CampusIQ, an AI-Powered College Knowledge Assistant for MITS (Madanapalle Institute of Technology & Science).

Your ONLY job is to answer student questions using the official campus documents provided in the CONTEXT blocks below.

STRICT RULES — YOU MUST FOLLOW ALL OF THESE:
1. Answer ONLY using facts stated verbatim or directly implied in the CONTEXT blocks.
2. If the exact answer is not present in the CONTEXT, respond exactly with:
   "I couldn't find that information in the uploaded official college documents. Please contact the campus administration or refine your query."
3. NEVER invent, fabricate, or guess:
   - Fee amounts
   - Exam policies
   - Dates, times, or deadlines
   - Hostel rules
   - Staff names or phone numbers
   - Company names or placement figures
4. NEVER add information from your training data about other colleges or general knowledge.
5. Scope your answer precisely to what was asked:
   - For a specific question (e.g. "library hours"), give a direct, concise answer.
   - For a broad question (e.g. "tell me about hostel"), give a structured overview.
6. Do NOT output raw markdown headers (##, ###) in your response unless explicitly organizing a multi-section overview.
7. Maintain a professional, helpful tone suitable for students, faculty, and administrators.
8. If the question is a follow-up (e.g. "What about fees?", "And 2nd year?"), resolve it using the CONVERSATION HISTORY context.
"""


def build_grounded_prompt(
    user_query: str,
    qualified_chunks: List[Dict[str, Any]],
    conversation_history: Optional[List[Dict[str, Any]]] = None,
    confidence: float = 1.0,
    debug_meta: Optional[Dict[str, Any]] = None,
) -> Tuple[str, bool]:
    """
    Constructs a strict grounded system prompt for the LLM.
    Returns (prompt_string, is_refusal_required).

    Args:
        user_query: The current user question.
        qualified_chunks: Reranked, confidence-filtered chunks from retrieval.
        conversation_history: List of previous message dicts (sender_type, content).
        confidence: Overall confidence score (0–1) from retrieval engine.
        debug_meta: Optional dict with expanded_query, resolved_intent, etc.
    """
    if not qualified_chunks:
        return REFUSAL_MESSAGE, True

    # ── Build context blocks ───────────────────────────────────────────────
    context_parts: List[str] = []
    for idx, c in enumerate(qualified_chunks, 1):
        meta = c.get("metadata", {})
        doc_name = meta.get("document_name", meta.get("document", "Official_Document"))
        page_num = meta.get("page_number", 1)
        section = meta.get("section", "")
        heading = meta.get("heading_title", "")
        reranker_score = c.get("reranker_score", c.get("score", 0.0))
        content = c.get("content", "").strip()

        header = f"[CONTEXT {idx}] Source: {doc_name}"
        if heading:
            header += f" | Section: {heading}"
        if page_num and page_num > 1:
            header += f" | Page {page_num}"
        header += f" | Relevance: {reranker_score:.3f}"

        context_parts.append(f"{header}\n{content}")

    context_text = "\n\n".join(context_parts)

    # ── Build conversation history block ──────────────────────────────────
    history_text = ""
    if conversation_history:
        # Take the last 6 turns (3 user + 3 assistant)
        recent = conversation_history[-12:]
        history_lines = []
        for msg in recent:
            role = "Student" if msg.get("sender_type") == "user" else "CampusIQ"
            content = str(msg.get("content", "")).strip()
            if content:
                history_lines.append(f"{role}: {content}")
        if history_lines:
            history_text = "\n--- CONVERSATION HISTORY (most recent last) ---\n" + "\n".join(history_lines) + "\n"

    # ── Optional confidence guidance ──────────────────────────────────────
    confidence_note = ""
    if confidence < 0.55:
        confidence_note = (
            "\n[SYSTEM NOTE: Retrieval confidence is LOW for this query. "
            "If you cannot derive the answer directly from the context, acknowledge it honestly.]\n"
        )

    # ── Assemble final prompt ─────────────────────────────────────────────
    full_prompt = (
        f"{SYSTEM_INSTRUCTION}\n"
        f"{confidence_note}"
        f"\n--- RETRIEVED CONTEXT (use ONLY this to answer) ---\n"
        f"{context_text}\n"
        f"{history_text}"
        f"\n--- CURRENT QUESTION ---\n"
        f"Student: {user_query}\n"
        f"CampusIQ:"
    )

    return full_prompt, False
