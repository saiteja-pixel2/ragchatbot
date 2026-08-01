from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional
import logging
from datetime import datetime, timezone

from backend.config import settings
from backend.database.supabase_client import get_supabase_admin_client

router = APIRouter(prefix="/admin", tags=["Admin Dashboard & System Governance"])
logger = logging.getLogger("campusiq.admin")

class SystemConfigModel(BaseModel):
    retrieval_top_k: int = Field(5, ge=1, le=20)
    min_similarity_score: float = Field(0.75, ge=0.50, le=0.95)
    system_prompt_rules: str = Field(...)

class UserItem(BaseModel):
    id: str
    name: str
    email: str
    role: str  # "student" | "parent" | "faculty" | "administrator"
    created_at: str

class UpdateRoleRequest(BaseModel):
    role: str = Field(..., pattern="^(student|parent|faculty|administrator)$")

# In-Memory Storage for Zero-Config Local Development
SYSTEM_GOVERNANCE_CONFIG: Dict[str, Any] = {
    "retrieval_top_k": 5,
    "min_similarity_score": 0.75,
    "system_prompt_rules": "Answer strictly using provided document context. If answer is not present, output exact refusal string."
}

MOCK_USERS_REGISTRY: Dict[str, Dict[str, Any]] = {
    "usr_01": {
        "id": "usr_01",
        "name": "Alex Rivera",
        "email": "alex@college.edu",
        "role": "administrator",
        "created_at": datetime.now(timezone.utc).isoformat()
    },
    "usr_02": {
        "id": "usr_02",
        "name": "Dr. Sarah Chen",
        "email": "sarah.chen@college.edu",
        "role": "faculty",
        "created_at": datetime.now(timezone.utc).isoformat()
    },
    "usr_03": {
        "id": "usr_03",
        "name": "David Miller",
        "email": "david.m@college.edu",
        "role": "student",
        "created_at": datetime.now(timezone.utc).isoformat()
    },
    "usr_04": {
        "id": "usr_04",
        "name": "Elena Rostova",
        "email": "elena.parent@college.edu",
        "role": "parent",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
}

def is_supabase_configured() -> bool:
    url = getattr(settings, "SUPABASE_URL", "")
    return bool(url and "your-supabase-project" not in url and "demo-project" not in url)

@router.get("/config", response_model=SystemConfigModel)
def get_system_config():
    """Retrieves current system configuration parameters."""
    if is_supabase_configured():
        try:
            supabase = get_supabase_admin_client()
            res = supabase.table("system_config").select("*").execute()
            if res.data:
                cfg = {item["key"]: item["value"] for item in res.data}
                return SystemConfigModel(
                    retrieval_top_k=int(cfg.get("retrieval_top_k", 5)),
                    min_similarity_score=float(cfg.get("min_similarity_score", 0.75)),
                    system_prompt_rules=cfg.get("system_prompt_rules", SYSTEM_GOVERNANCE_CONFIG["system_prompt_rules"])
                )
        except Exception as err:
            logger.warning(f"Supabase fetch config fallback: {err}")

    return SystemConfigModel(**SYSTEM_GOVERNANCE_CONFIG)

@router.put("/config", response_model=SystemConfigModel)
def update_system_config(payload: SystemConfigModel):
    """
    Updates system configuration parameters.
    Enforces validation bounds (0.50 <= min_similarity_score <= 0.95, 1 <= retrieval_top_k <= 20).
    """
    SYSTEM_GOVERNANCE_CONFIG["retrieval_top_k"] = payload.retrieval_top_k
    SYSTEM_GOVERNANCE_CONFIG["min_similarity_score"] = payload.min_similarity_score
    SYSTEM_GOVERNANCE_CONFIG["system_prompt_rules"] = payload.system_prompt_rules

    if is_supabase_configured():
        try:
            supabase = get_supabase_admin_client()
            now_iso = datetime.now(timezone.utc).isoformat()
            supabase.table("system_config").upsert([
                {"key": "retrieval_top_k", "value": str(payload.retrieval_top_k), "updated_at": now_iso},
                {"key": "min_similarity_score", "value": str(payload.min_similarity_score), "updated_at": now_iso},
                {"key": "system_prompt_rules", "value": payload.system_prompt_rules, "updated_at": now_iso}
            ]).execute()
        except Exception as err:
            logger.warning(f"Supabase update config fallback: {err}")

    return SystemConfigModel(**SYSTEM_GOVERNANCE_CONFIG)

@router.get("/users", response_model=List[UserItem])
def get_all_users():
    """Returns list of registered platform users with assigned roles."""
    if is_supabase_configured():
        try:
            supabase = get_supabase_admin_client()
            res = supabase.table("users").select("*").order("created_at", desc=True).execute()
            if res.data:
                return [
                    UserItem(
                        id=str(u["id"]),
                        name=u.get("name", "User"),
                        email=u["email"],
                        role=u.get("role", "student"),
                        created_at=u["created_at"]
                    )
                    for u in res.data
                ]
        except Exception as err:
            logger.warning(f"Supabase fetch users fallback: {err}")

    return [UserItem(**u) for u in MOCK_USERS_REGISTRY.values()]

@router.patch("/users/{user_id}/role", response_model=UserItem)
def update_user_role(user_id: str, payload: UpdateRoleRequest):
    """
    Updates user role. Enforces self-demotion lockout if user is sole remaining admin.
    """
    admin_count = sum(1 for u in MOCK_USERS_REGISTRY.values() if u["role"] == "administrator")
    
    if user_id in MOCK_USERS_REGISTRY:
        current_role = MOCK_USERS_REGISTRY[user_id]["role"]
        if current_role == "administrator" and payload.role != "administrator" and admin_count <= 1:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Self-Demotion Lockout: Cannot revoke Administrator role when you are the sole remaining Administrator."
            )
        
        MOCK_USERS_REGISTRY[user_id]["role"] = payload.role
        user = MOCK_USERS_REGISTRY[user_id]
        return UserItem(**user)

    raise HTTPException(status_code=404, detail="User profile not found")
