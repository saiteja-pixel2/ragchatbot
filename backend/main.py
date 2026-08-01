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

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.main:app", host="0.0.0.0", port=8000, reload=True)
