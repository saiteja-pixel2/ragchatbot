from fastapi import APIRouter, HTTPException, status
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
import json
import asyncio

from backend.rag.retrieval import search_knowledge_store, map_citations
from backend.rag.prompt_builder import build_grounded_prompt, REFUSAL_MESSAGE

router = APIRouter(prefix="/rag", tags=["RAG Search & Retrieval Engine"])

class RetrievalRequest(BaseModel):
    query: str
    top_k: Optional[int] = 5
    min_score: Optional[float] = 0.75

class RetrievalResponse(BaseModel):
    query: str
    qualified_chunks: List[Dict[str, Any]]
    max_similarity_score: float
    is_refusal: bool

class GenerationRequest(BaseModel):
    query: str
    chat_id: Optional[str] = None
    top_k: Optional[int] = 5
    min_score: Optional[float] = 0.75

@router.post("/retrieve", response_model=RetrievalResponse)
def retrieve_rag_context(req: RetrievalRequest):
    """
    POST /rag/retrieve
    Executes 384-dim query vectorization and Cosine Similarity search in ChromaDB.
    Filters out any chunk below the 0.75 similarity score threshold guard.
    """
    chunks, max_score = search_knowledge_store(
        query_text=req.query,
        top_k=req.top_k or 5,
        min_score=req.min_score or 0.75
    )
    return RetrievalResponse(
        query=req.query,
        qualified_chunks=chunks,
        max_similarity_score=max_score,
        is_refusal=len(chunks) == 0
    )

@router.post("/generate")
async def generate_rag_response(req: GenerationRequest):
    """
    POST /rag/generate
    Runs RAG retrieval, constructs grounded prompt, and streams answer with citation metadata.
    """
    chunks, max_score = search_knowledge_store(
        query_text=req.query,
        top_k=req.top_k or 5,
        min_score=req.min_score or 0.75
    )

    if not chunks or max_score < (req.min_score or 0.75):
        answer_text = REFUSAL_MESSAGE
        citations = []
    else:
        answer_text = chunks[0]["content"]
        citations = map_citations(chunks)

    async def stream_output():
        words = answer_text.split(" ")
        for idx, word in enumerate(words):
            chunk = word + (" " if idx < len(words) - 1 else "")
            yield f"data: {json.dumps({'type': 'token', 'content': chunk})}\n\n"
            await asyncio.sleep(0.03)

        yield f"data: {json.dumps({'type': 'done', 'sources': citations})}\n\n"

    return StreamingResponse(
        stream_output(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive"
        }
    )
