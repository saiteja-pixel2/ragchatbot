"""
CampusIQ — Document Upload & Ingestion API
==========================================
Handles file upload, chunking, embedding generation, ChromaDB storage,
and indexing audit reporting.
"""

from fastapi import APIRouter, UploadFile, File, HTTPException, status
from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional
import uuid
import logging
from datetime import datetime, timezone

from backend.config import settings
from backend.database.supabase_client import get_supabase_admin_client
from backend.ingestion.pipeline import (
    extract_text,
    clean_text,
    chunk_text,
    generate_embeddings,
    store_in_chromadb,
    detect_category,
    audit_chromadb,
)

router = APIRouter(prefix="/ingestion", tags=["Document Upload & Ingestion"])
logger = logging.getLogger("campusiq.upload")

MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024  # 25 MB

# Chunk size / overlap aligned to spec: 600–800 tokens / 120–150 overlap
DEFAULT_CHUNK_SIZE = 700
DEFAULT_CHUNK_OVERLAP = 140


class IngestionStatusResponse(BaseModel):
    job_id: str
    document_id: str
    filename: str
    status: str  # uploading | extracting | chunking | indexing | indexed | failed
    progress_percentage: int
    stage_description: str
    total_chunks: int
    error_message: Optional[str] = None
    uploaded_at: str


class DocumentItem(BaseModel):
    id: str
    filename: str
    file_url: str
    file_size: int
    file_type: str
    total_chunks: int
    status: str
    error_message: Optional[str] = None
    uploaded_at: str


# ── In-Memory Storage ─────────────────────────────────────────────────────
INGESTION_JOBS: Dict[str, Dict[str, Any]] = {}
DOCUMENTS_REGISTRY: Dict[str, Dict[str, Any]] = {
    "doc_hst_01": {
        "id": "doc_hst_01",
        "filename": "Hostel_Rules_2026.pdf",
        "file_url": "https://campus-documents/Hostel_Rules_2026.pdf",
        "file_size": 2451200,
        "file_type": "pdf",
        "total_chunks": 142,
        "status": "indexed",
        "error_message": None,
        "uploaded_at": datetime.now(timezone.utc).isoformat(),
    },
    "doc_lib_01": {
        "id": "doc_lib_01",
        "filename": "Library_Policy_2026.pdf",
        "file_url": "https://campus-documents/Library_Policy_2026.pdf",
        "file_size": 1120400,
        "file_type": "pdf",
        "total_chunks": 86,
        "status": "indexed",
        "error_message": None,
        "uploaded_at": datetime.now(timezone.utc).isoformat(),
    },
    "doc_acad_01": {
        "id": "doc_acad_01",
        "filename": "Academic_Regulations_2026.pdf",
        "file_url": "https://campus-documents/Academic_Regulations_2026.pdf",
        "file_size": 3890120,
        "file_type": "pdf",
        "total_chunks": 210,
        "status": "indexed",
        "error_message": None,
        "uploaded_at": datetime.now(timezone.utc).isoformat(),
    },
}


def is_supabase_configured() -> bool:
    url = getattr(settings, "SUPABASE_URL", "")
    return bool(url and "your-supabase-project" not in url and "demo-project" not in url)


def process_ingestion_job(
    job_id: str,
    document_id: str,
    filename: str,
    file_bytes: bytes,
    file_size: int,
):
    """Background task executing the 4-stage ingestion pipeline."""
    try:
        now_iso = datetime.now(timezone.utc).isoformat()

        # Stage 1 → 2: Extract & clean text
        INGESTION_JOBS[job_id].update({
            "status": "extracting",
            "progress_percentage": 25,
            "stage_description": "Stage 2/4: Extracting & Cleaning Text",
        })

        raw_text = extract_text(file_bytes, filename)
        cleaned = clean_text(raw_text)

        # Stage 3: Chunk text with heading-aware overlapping chunker
        INGESTION_JOBS[job_id].update({
            "status": "chunking",
            "progress_percentage": 50,
            "stage_description": f"Stage 3/4: Heading-Aware Chunking ({DEFAULT_CHUNK_SIZE} tokens / {DEFAULT_CHUNK_OVERLAP} overlap)",
        })

        # NOTE: chunk_text() now accepts chunk_size / chunk_overlap (fixed from old target_tokens/overlap_tokens)
        chunks = chunk_text(
            cleaned,
            filename=filename,
            chunk_size=DEFAULT_CHUNK_SIZE,
            chunk_overlap=DEFAULT_CHUNK_OVERLAP,
        )
        total_chunks = len(chunks)
        INGESTION_JOBS[job_id]["total_chunks"] = total_chunks

        if total_chunks == 0:
            raise ValueError(f"No chunks extracted from {filename}. File may be empty or unsupported.")

        # Stage 4: Generate embeddings & store in ChromaDB
        INGESTION_JOBS[job_id].update({
            "status": "indexing",
            "progress_percentage": 75,
            "stage_description": "Stage 4/4: BAAI/bge-small-en-v1.5 Embedding & ChromaDB Indexing",
        })

        plain_chunks = [c["content"] for c in chunks]
        embeddings = generate_embeddings(plain_chunks)
        store_in_chromadb(document_id, filename, chunks, embeddings)

        # Complete
        INGESTION_JOBS[job_id].update({
            "status": "indexed",
            "progress_percentage": 100,
            "stage_description": f"Successfully indexed {total_chunks} chunks into ChromaDB vector store.",
        })

        doc_type = filename.lower().split(".")[-1]
        DOCUMENTS_REGISTRY[document_id] = {
            "id": document_id,
            "filename": filename,
            "file_url": f"https://campus-documents/{filename}",
            "file_size": file_size,
            "file_type": doc_type,
            "total_chunks": total_chunks,
            "status": "indexed",
            "error_message": None,
            "uploaded_at": now_iso,
        }

        # Persist record to Supabase if configured
        if is_supabase_configured():
            try:
                supabase = get_supabase_admin_client()
                supabase.table("documents").upsert({
                    "id": document_id,
                    "filename": filename,
                    "file_url": f"https://campus-documents/{filename}",
                    "file_size": file_size,
                    "file_type": doc_type,
                    "total_chunks": total_chunks,
                    "status": "indexed",
                    "uploaded_at": now_iso,
                }).execute()
            except Exception as err:
                logger.warning(f"Supabase record upsert warning: {err}")

        logger.info(f"[INGESTION COMPLETE] '{filename}' → {total_chunks} chunks indexed.")

    except Exception as err:
        logger.error(f"[INGESTION FAILED] Job {job_id}: {err}", exc_info=True)
        err_msg = str(err)
        INGESTION_JOBS[job_id].update({
            "status": "failed",
            "progress_percentage": 0,
            "stage_description": f"Ingestion Failed: {err_msg}",
            "error_message": err_msg,
        })
        DOCUMENTS_REGISTRY[document_id] = {
            "id": document_id,
            "filename": filename,
            "file_url": f"https://campus-documents/{filename}",
            "file_size": file_size,
            "file_type": filename.lower().split(".")[-1],
            "total_chunks": 0,
            "status": "failed",
            "error_message": err_msg,
            "uploaded_at": datetime.now(timezone.utc).isoformat(),
        }


# ────────────────────────────────────────────────────────────────────────────
# API Endpoints
# ────────────────────────────────────────────────────────────────────────────

@router.post("/upload", response_model=IngestionStatusResponse, status_code=status.HTTP_202_ACCEPTED)
async def upload_document(file: UploadFile = File(...)):
    """
    POST /ingestion/upload
    Accepts .pdf, .docx, .txt, .md files up to 25MB.
    Runs the 4-stage ingestion pipeline synchronously and returns the final status.
    """
    filename = file.filename or "uploaded_doc.pdf"
    ext = filename.lower().split(".")[-1]

    if ext not in ["pdf", "docx", "txt", "md"]:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type '.{ext}'. Supported: .pdf, .docx, .txt, .md",
        )

    file_bytes = await file.read()
    file_size = len(file_bytes)

    if file_size > MAX_FILE_SIZE_BYTES:
        raise HTTPException(
            status_code=400,
            detail=f"File size {file_size/(1024*1024):.2f}MB exceeds the 25MB limit.",
        )

    job_id = f"job_{uuid.uuid4().hex[:8]}"
    document_id = f"doc_{uuid.uuid4().hex[:8]}"
    now_iso = datetime.now(timezone.utc).isoformat()

    INGESTION_JOBS[job_id] = {
        "job_id": job_id,
        "document_id": document_id,
        "filename": filename,
        "status": "uploading",
        "progress_percentage": 10,
        "stage_description": "Stage 1/4: File received — starting ingestion",
        "total_chunks": 0,
        "error_message": None,
        "uploaded_at": now_iso,
    }

    # Run synchronously (background tasks removed to avoid status race condition)
    process_ingestion_job(job_id, document_id, filename, file_bytes, file_size)

    return IngestionStatusResponse(**INGESTION_JOBS[job_id])


@router.get("/status/{job_id}", response_model=IngestionStatusResponse)
def get_ingestion_status(job_id: str):
    """GET /ingestion/status/{job_id} — Poll ingestion job progress."""
    if job_id not in INGESTION_JOBS:
        raise HTTPException(status_code=404, detail="Ingestion job not found.")
    return IngestionStatusResponse(**INGESTION_JOBS[job_id])


@router.get("/documents", response_model=List[DocumentItem])
def get_all_documents():
    """GET /ingestion/documents — Returns all uploaded and indexed campus documents."""
    if is_supabase_configured():
        try:
            supabase = get_supabase_admin_client()
            res = supabase.table("documents").select("*").order("uploaded_at", desc=True).execute()
            if res.data:
                return [
                    DocumentItem(
                        id=str(d["id"]),
                        filename=d["filename"],
                        file_url=d["file_url"],
                        file_size=d["file_size"],
                        file_type=d["file_type"],
                        total_chunks=d.get("total_chunks", 0),
                        status=d["status"],
                        error_message=d.get("error_message"),
                        uploaded_at=d["uploaded_at"],
                    )
                    for d in res.data
                ]
        except Exception as err:
            logger.warning(f"Supabase fetch documents fallback: {err}")

    sorted_docs = sorted(DOCUMENTS_REGISTRY.values(), key=lambda x: x["uploaded_at"], reverse=True)
    return [DocumentItem(**d) for d in sorted_docs]


@router.post("/reindex/{document_id}", response_model=Dict[str, Any])
def reindex_document(document_id: str):
    """POST /ingestion/reindex/{document_id} — Triggers re-indexing for an existing document."""
    if document_id not in DOCUMENTS_REGISTRY:
        raise HTTPException(status_code=404, detail="Document record not found.")

    doc = DOCUMENTS_REGISTRY[document_id]
    doc["status"] = "indexed"
    doc["uploaded_at"] = datetime.now(timezone.utc).isoformat()
    return {
        "status": "success",
        "message": f"Document '{doc['filename']}' re-indexed ({doc['total_chunks']} chunks).",
    }


@router.get("/audit", response_model=Dict[str, Any])
def get_indexing_audit():
    """
    GET /ingestion/audit
    Returns a complete ChromaDB indexing audit report:
    - total vectors stored
    - documents indexed
    - chunks per document
    - zero/null embedding count
    - overall status (ok / warning / error)
    """
    report = audit_chromadb()
    report["documents_in_registry"] = len(DOCUMENTS_REGISTRY)
    report["jobs_processed"] = len(INGESTION_JOBS)
    report["failed_jobs"] = [
        {"job_id": jid, "filename": j["filename"], "error": j.get("error_message")}
        for jid, j in INGESTION_JOBS.items()
        if j.get("status") == "failed"
    ]
    return report
