from fastapi import APIRouter, HTTPException, status, Query
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
import uuid
import logging
from datetime import datetime, timezone, timedelta

from backend.config import settings
from backend.database.supabase_client import get_supabase_admin_client

router = APIRouter(prefix="/analytics", tags=["Analytics & System Performance Monitoring"])
logger = logging.getLogger("campusiq.analytics")

class AnalyticsSummaryResponse(BaseModel):
    total_queries: int
    avg_latency_ms: float
    grounding_success_rate: float  # Percentage e.g. 94.2
    unanswered_gap_count: int
    active_users: int

class VolumeChartPoint(BaseModel):
    date: str
    queries: int
    unanswered: int

class TopicDistribution(BaseModel):
    category: str
    count: int
    percentage: float
    color: str

class LatencyBreakdown(BaseModel):
    component: str
    latency_ms: float
    percentage: float
    color: str

class UnansweredQueryLog(BaseModel):
    id: str
    query_text: str
    top_similarity_score: float
    attempted_at: str
    occurrence_count: int

class LogQueryRequest(BaseModel):
    chat_id: Optional[str] = None
    query_text: str
    retrieval_latency_ms: float
    llm_latency_ms: float
    top_similarity_score: float
    documents_cited: List[str] = []

# Mock Analytics Store for Zero-Config Local Execution
NOW = datetime.now(timezone.utc)

MOCK_UNANSWERED_LOGS: List[Dict[str, Any]] = [
    {
        "id": "log_unans_01",
        "query_text": "What is the bus route schedule for North Campus?",
        "top_similarity-[#7C3AED]": 0.42,
        "top_similarity_score": 0.42,
        "attempted_at": (NOW - timedelta(hours=3)).isoformat(),
        "occurrence_count": 18
    },
    {
        "id": "log_unans_02",
        "query_text": "Are sports scholarships available for swimming?",
        "top_similarity_score": 0.51,
        "attempted_at": (NOW - timedelta(hours=14)).isoformat(),
        "occurrence_count": 12
    },
    {
        "id": "log_unans_03",
        "query_text": "What is the Wi-Fi password for Guest House?",
        "top_similarity_score": 0.38,
        "attempted_at": (NOW - timedelta(days=1)).isoformat(),
        "occurrence_count": 9
    },
    {
        "id": "log_unans_04",
        "query_text": "When is the annual cultural festival auditions?",
        "top_similarity_score": 0.58,
        "attempted_at": (NOW - timedelta(days=2)).isoformat(),
        "occurrence_count": 7
    }
]

def is_supabase_configured() -> bool:
    url = getattr(settings, "SUPABASE_URL", "")
    return bool(url and "your-supabase-project" not in url and "demo-project" not in url)

@router.get("/summary", response_model=AnalyticsSummaryResponse)
def get_analytics_summary():
    """Returns high-level system performance KPIs (Total Queries, Avg Latency, Success Rate, Gaps)."""
    return AnalyticsSummaryResponse(
        total_queries=1428,
        avg_latency_ms=1120.5,
        grounding_success_rate=94.2,
        unanswered_gap_count=len(MOCK_UNANSWERED_LOGS),
        active_users=342
    )

@router.get("/charts/volume", response_model=List[VolumeChartPoint])
def get_query_volume_chart(timeframe: str = Query("7D", pattern="^(7D|30D|90D)$")):
    """Returns daily query volume time-series data for 7D, 30D, or 90D timeframes."""
    days = 7 if timeframe == "7D" else (30 if timeframe == "30D" else 90)
    result = []
    for i in range(days - 1, -1, -1):
        day_date = (NOW - timedelta(days=i)).strftime("%b %d")
        # Deterministic wave data
        base_queries = 120 + ((i * 17) % 65)
        unanswered = max(2, (i * 3) % 11)
        result.append(VolumeChartPoint(
            date=day_date,
            queries=base_queries,
            unanswered=unanswered
        ))
    return result

@router.get("/charts/topics", response_model=List[TopicDistribution])
def get_topics_distribution():
    """Returns category breakdown for top asked campus topics."""
    return [
        TopicDistribution(category="Hostel & Mess Rules", count=480, percentage=33.6, color="#7C3AED"),
        TopicDistribution(category="Fees & Payment Deadlines", count=390, percentage=27.3, color="#EC4899"),
        TopicDistribution(category="Library Operations", count=240, percentage=16.8, color="#3B82F6"),
        TopicDistribution(category="Exams & Grading Code", count=180, percentage=12.6, color="#10B981"),
        TopicDistribution(category="AI Lab & Compute Access", count=138, percentage=9.7, color="#F59E0B")
    ]

@router.get("/charts/latency", response_model=List[LatencyBreakdown])
def get_latency_breakdown():
    """Returns detailed latency distribution breakdown (Embedding, Search, LLM Generation)."""
    return [
        LatencyBreakdown(component="Embedding Generation (BAAI)", latency_ms=120.0, percentage=10.7, color="#3B82F6"),
        LatencyBreakdown(component="Vector Similarity Search (ChromaDB)", latency_ms=180.5, percentage=16.1, color="#7C3AED"),
        LatencyBreakdown(component="LLM Response Stream (Gemini 2.5)", latency_ms=820.0, percentage=73.2, color="#EC4899")
    ]

@router.get("/unanswered", response_model=List[UnansweredQueryLog])
def get_unanswered_queries():
    """Returns list of queries where vector similarity score was < 0.75 (knowledge base gaps)."""
    return [UnansweredQueryLog(**log) for log in MOCK_UNANSWERED_LOGS]

@router.post("/log", status_code=status.HTTP_201_CREATED)
def log_analytics_event(req: LogQueryRequest):
    """Records an incoming query execution log for system performance auditing."""
    is_unanswered = req.top_similarity_score < 0.75
    total_lat = req.retrieval_latency_ms + req.llm_latency_ms
    
    if is_unanswered:
        MOCK_UNANSWERED_LOGS.append({
            "id": f"log_unans_{uuid.uuid4().hex[:6]}",
            "query_text": req.query_text,
            "top_similarity_score": req.top_similarity_score,
            "attempted_at": datetime.now(timezone.utc).isoformat(),
            "occurrence_count": 1
        })

    return {"status": "success", "is_unanswered": is_unanswered}
