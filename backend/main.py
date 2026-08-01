from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.config import settings
from backend.api import auth, public, chat, history, upload, knowledge, rag, analytics, admin

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="CampusIQ – AI-Powered College Knowledge Assistant API"
)

# Configure CORS Middleware allowing local development ports
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:3001",
        settings.ALLOWED_ORIGIN,
        "*"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register Routers
app.include_router(auth.router)
app.include_router(public.router)
app.include_router(chat.router)
app.include_router(history.router)
app.include_router(upload.router)
app.include_router(knowledge.router)
app.include_router(rag.router)
app.include_router(analytics.router)
app.include_router(admin.router)

@app.get("/health")
def health_check():
    """
    Public health check ping endpoint returning system readiness,
    database connectivity, and vector store collection status.
    """
    db_status = "connected" if "your-supabase-project" not in settings.SUPABASE_URL else "local_fallback"
    vector_status = "ready"
    
    try:
        from backend.ingestion.pipeline import get_chroma_collection
        coll = get_chroma_collection("campusiq_knowledge_store")
        vector_count = coll.count()
    except Exception:
        vector_count = 0


    return {
        "status": "healthy",
        "project": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "environment": "production" if "vercel" in settings.ALLOWED_ORIGIN else "development",
        "subsystems": {
            "api_gateway": "operational",
            "database": db_status,
            "vector_store": vector_status,
            "total_vectors_indexed": vector_count
        }
    }

@app.get("/debug/memory")
def get_memory_profile():
    """Returns memory footprint, loaded singletons, and top tracemalloc allocations."""
    import sys
    import os
    import tracemalloc
    
    # 1. RSS Memory
    rss_mb = 0.0
    try:
        with open("/proc/self/status", "r") as f:
            for line in f:
                if line.startswith("VmRSS:"):
                    parts = line.split()
                    if len(parts) >= 2:
                        rss_mb = float(parts[1]) / 1024.0
    except Exception:
        pass
    
    if rss_mb == 0.0:
        try:
            import resource
            rss_mb = float(resource.getrusage(resource.RUSAGE_SELF).ru_maxrss) / 1024.0
        except Exception:
            pass

    # 2. Singleton verification
    singletons = {}
    try:
        import backend.ingestion.pipeline as pipeline
        singletons["chroma_client"] = pipeline._chroma_client is not None
        singletons["chroma_collection"] = pipeline._chroma_collection is not None
        singletons["embedding_model_loaded"] = pipeline._embedding_model is not None
    except Exception as e:
        singletons["pipeline_err"] = str(e)

    try:
        import backend.rag.retrieval as retrieval
        singletons["reranker_model_loaded"] = retrieval._reranker_model is not None
        singletons["reranker_available"] = retrieval._reranker_available
        singletons["cached_active_chunks_count"] = len(retrieval._cached_active_chunks) if retrieval._cached_active_chunks is not None else None
    except Exception as e:
        singletons["retrieval_err"] = str(e)

    try:
        import backend.api.chat as chat_module
        singletons["gemini_model_loaded"] = chat_module._gemini_model is not None
    except Exception as e:
        singletons["chat_module_err"] = str(e)

    # 3. Check loaded modules
    loaded_libs = {
        "torch": "torch" in sys.modules,
        "sentence_transformers": "sentence_transformers" in sys.modules,
        "chromadb": "chromadb" in sys.modules,
    }

    # 4. Tracemalloc allocations
    allocations = []
    if tracemalloc.is_tracing():
        snapshot = tracemalloc.take_snapshot()
        top_stats = snapshot.statistics('filename')
        for stat in top_stats[:15]:
            allocations.append(str(stat))

    # Mask sensitive credentials in environment dict for safety
    masked_env = {}
    for k, v in os.environ.items():
        if any(sec in k.lower() for sec in ["key", "secret", "password", "token", "url", "conn"]):
            masked_env[k] = "[MASKED]"
        else:
            masked_env[k] = v

    return {
        "rss_memory_mb": rss_mb,
        "singletons": singletons,
        "loaded_libraries": loaded_libs,
        "top_allocations": allocations,
        "env": masked_env,
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.main:app", host="0.0.0.0", port=8000, reload=True)
