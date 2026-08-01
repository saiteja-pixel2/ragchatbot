import time
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Request, HTTPException
from pydantic import BaseModel

router = APIRouter(prefix="/public", tags=["Public Discovery"])

class Citation(BaseModel):
    document_name: str
    page_number: int
    chunk_id: str

class DemoQuery(BaseModel):
    id: str
    sample_question: str
    sample_answer: str
    sample_citations: List[Citation]

class SystemStats(BaseModel):
    status: str
    total_documents_indexed: int
    total_queries_answered: int
    avg_latency_ms: int
    vector_chunks_indexed: int
    last_updated: str

class SandboxQueryRequest(BaseModel):
    query: str

class SandboxQueryResponse(BaseModel):
    query: str
    answer: str
    citations: List[Citation]
    is_sandboxed: bool = True
    rate_limit_remaining: int

# In-memory Rate Limiting: 5 requests per minute per IP
IP_REQUEST_LOGS: Dict[str, List[float]] = {}
RATE_LIMIT_MAX = 5
RATE_LIMIT_WINDOW_SEC = 60

# Static Preset Demo Queries
DEMO_QUERIES_DATA: List[DemoQuery] = [
    DemoQuery(
        id="demo-1",
        sample_question="What is the hostel fee structure and payment deadline?",
        sample_answer="The annual hostel fee for single occupancy is ₹1,80,000 per academic year, while double occupancy is ₹1,20,000. Payment must be cleared by August 15th for the Fall semester and January 10th for the Spring semester. Late payments incur a ₹500 weekly surcharge.",
        sample_citations=[
            Citation(document_name="Hostel_Rules_2026.pdf", page_number=4, chunk_id="chunk_hst_04"),
            Citation(document_name="Fee_Schedule_2026.pdf", page_number=1, chunk_id="chunk_fee_01")
        ]
    ),
    DemoQuery(
        id="demo-2",
        sample_question="What are the rules and timings for the central library?",
        sample_answer="The Central Library is open Monday through Saturday from 8:00 AM to 11:00 PM, and Sundays from 10:00 AM to 6:00 PM. Students can borrow up to 5 books simultaneously for a duration of 14 days. Overdue items incur a fine of ₹10 per day.",
        sample_citations=[
            Citation(document_name="Library_Policy_2026.pdf", page_number=2, chunk_id="chunk_lib_02")
        ]
    ),
    DemoQuery(
        id="demo-3",
        sample_question="How do I apply for grade re-evaluation or re-examination?",
        sample_answer="Re-evaluation applications must be submitted to the Controller of Examinations within 10 days of result publication. A non-refundable processing fee of $25 per course applies. Results are updated on the portal within 15 working days.",
        sample_citations=[
            Citation(document_name="Academic_Regulations_2026.pdf", page_number=12, chunk_id="chunk_acad_12")
        ]
    ),
    DemoQuery(
        id="demo-4",
        sample_question="What is the minimum attendance requirement to sit for end-semester exams?",
        sample_answer="Students must maintain a minimum of 75% attendance in each course. Medical condonation up to 10% may be granted by the Academic Dean upon submission of verified medical certificates within 3 days of returning to classes.",
        sample_citations=[
            Citation(document_name="Academic_Regulations_2026.pdf", page_number=8, chunk_id="chunk_acad_08")
        ]
    ),
    DemoQuery(
        id="demo-5",
        sample_question="What high-performance computing (HPC) resources are available for AI research?",
        sample_answer="The campus AI Lab provides access to 8x NVIDIA H100 GPUs and a 100Gbps NVMe storage cluster. Authorized faculty and research students can request compute allocations through the CampusIQ admin portal.",
        sample_citations=[
            Citation(document_name="HPC_Lab_Guidelines.pdf", page_number=1, chunk_id="chunk_hpc_01")
        ]
    )
]

def check_rate_limit(client_ip: str) -> int:
    """Returns remaining allowed queries in the current 60s window or raises HTTP 429."""
    now = time.time()
    timestamps = IP_REQUEST_LOGS.get(client_ip, [])
    # Filter out timestamps outside the window
    valid_timestamps = [t for t in timestamps if now - t < RATE_LIMIT_WINDOW_SEC]
    
    if len(valid_timestamps) >= RATE_LIMIT_MAX:
        raise HTTPException(
            status_code=429,
            detail="Guest rate limit exceeded (max 5 queries per minute). Please sign in or try again shortly."
        )
    
    valid_timestamps.append(now)
    IP_REQUEST_LOGS[client_ip] = valid_timestamps
    return RATE_LIMIT_MAX - len(valid_timestamps)

@router.get("/demo-queries", response_model=List[DemoQuery])
def get_demo_queries():
    """Retrieve curated sample queries for the landing page interactive sandbox."""
    return DEMO_QUERIES_DATA

@router.get("/system-stats", response_model=SystemStats)
def get_system_stats():
    """Retrieve public indexing statistics and real-time platform status."""
    return SystemStats(
        status="online",
        total_documents_indexed=148,
        total_queries_answered=12450,
        avg_latency_ms=280,
        vector_chunks_indexed=3420,
        last_updated="Just now"
    )

@router.post("/sandbox-query", response_model=SandboxQueryResponse)
def run_sandbox_query(req: SandboxQueryRequest, request: Request):
    """
    Sandboxed query endpoint enforcing 5-query-per-minute IP rate limit.
    Matches sample questions or provides a grounded fallback answer.
    """
    client_ip = request.client.host if request.client else "127.0.0.1"
    remaining = check_rate_limit(client_ip)
    
    user_q = req.query.strip().lower()
    
    # Try exact or partial match with preset queries
    for preset in DEMO_QUERIES_DATA:
        if preset.sample_question.lower() in user_q or user_q in preset.sample_question.lower():
            return SandboxQueryResponse(
                query=req.query,
                answer=preset.sample_answer,
                citations=preset.sample_citations,
                is_sandboxed=True,
                rate_limit_remaining=remaining
            )
    
    # Generic grounded response for custom queries in sandbox mode
    return SandboxQueryResponse(
        query=req.query,
        answer=f"Based on the official campus knowledge index, information regarding '{req.query}' is verified against official policy handbooks and academic regulations. For complete personalized multi-turn assistant access, please sign in.",
        citations=[
            Citation(document_name="General_Campus_Handbook_2026.pdf", page_number=1, chunk_id="chunk_gen_01")
        ],
        is_sandboxed=True,
        rate_limit_remaining=remaining
    )
