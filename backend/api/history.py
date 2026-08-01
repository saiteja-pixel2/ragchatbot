from fastapi import APIRouter, Depends, HTTPException, status, Header
from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional
import uuid
import logging
from datetime import datetime, timezone, timedelta

from backend.config import settings
from backend.database.supabase_client import get_supabase_client, get_supabase_admin_client

router = APIRouter(prefix="/chat/history", tags=["Conversation History"])

class CreateChatRequest(BaseModel):
    title: Optional[str] = "New Conversation"

class UpdateChatTitleRequest(BaseModel):
    title: str = Field(..., min_length=1, max_length=150)

class ChatSessionItem(BaseModel):
    id: str
    title: str
    last_message_at: str
    created_at: str
    group: str  # "Today" | "Yesterday" | "Previous 7 Days" | "Older"

class GroupedHistoryResponse(BaseModel):
    groups: Dict[str, List[ChatSessionItem]]
    all_chats: List[ChatSessionItem]

class MessageItem(BaseModel):
    id: str
    chat_id: str
    sender_type: str
    content: str
    sources: List[Dict[str, Any]] = []
    created_at: str

# In-Memory Storage for zero-config local development
NOW = datetime.now(timezone.utc)

DEMO_CHATS: Dict[str, Dict[str, Any]] = {
    "chat_session_01": {
        "id": "chat_session_01",
        "user_id": "demo-user-01",
        "title": "Hostel Fee Rules & Rent Schedule 2026",
        "last_message_at": NOW.isoformat(),
        "created_at": NOW.isoformat(),
    },
    "chat_session_02": {
        "id": "chat_session_02",
        "user_id": "demo-user-01",
        "title": "Library Timings & Borrowing Limits",
        "last_message_at": (NOW - timedelta(days=1)).isoformat(),
        "created_at": (NOW - timedelta(days=1)).isoformat(),
    },
    "chat_session_03": {
        "id": "chat_session_03",
        "user_id": "demo-user-01",
        "title": "Academic Attendance & Re-evaluation Code",
        "last_message_at": (NOW - timedelta(days=4)).isoformat(),
        "created_at": (NOW - timedelta(days=4)).isoformat(),
    },
    "chat_session_04": {
        "id": "chat_session_04",
        "user_id": "demo-user-01",
        "title": "AI Lab NVIDIA H100 Cluster Specs",
        "last_message_at": (NOW - timedelta(days=10)).isoformat(),
        "created_at": (NOW - timedelta(days=10)).isoformat(),
    }
}

DEMO_MESSAGES: Dict[str, List[Dict[str, Any]]] = {
    "chat_session_01": [
        {
            "id": "msg_01",
            "chat_id": "chat_session_01",
            "sender_type": "user",
            "content": "What is the hostel fee structure for 2026?",
            "sources": [],
            "created_at": NOW.isoformat()
        },
        {
            "id": "msg_02",
            "chat_id": "chat_session_01",
            "sender_type": "assistant",
            "content": "According to the **Hostel Policy & Fee Schedule 2026** [Hostel_Rules_2026.pdf - Page 4], annual accommodation fees are structured as follows:\n\n- **Single Occupancy Room**: ₹1,80,000 per academic year\n- **Double Occupancy Room**: ₹1,20,000 per academic year\n- **Mess Charges**: ₹35,000 per semester (includes 3 meals daily)\n\n### Mandatory Deadlines\n1. **Fall Semester**: Due by **August 15, 2026**\n2. **Spring Semester**: Due by **January 10, 2027**",
            "sources": [
                {"document_id": "doc_hst_01", "filename": "Hostel_Rules_2026.pdf", "page": 4, "chunk_id": "chunk_hst_04", "score": 0.94}
            ],
            "created_at": NOW.isoformat()
        }
    ],
    "chat_session_02": [
        {
            "id": "msg_03",
            "chat_id": "chat_session_02",
            "sender_type": "user",
            "content": "When does the library close on weekends?",
            "sources": [],
            "created_at": (NOW - timedelta(days=1)).isoformat()
        },
        {
            "id": "msg_04",
            "chat_id": "chat_session_02",
            "sender_type": "assistant",
            "content": "As stated in the **Central Library Operations Manual** [Library_Policy_2026.pdf - Page 2]:\n\n- **Monday – Saturday**: 8:00 AM – 11:00 PM\n- **Sunday**: 10:00 AM – 6:00 PM",
            "sources": [
                {"document_id": "doc_lib_01", "filename": "Library_Policy_2026.pdf", "page": 2, "chunk_id": "chunk_lib_02", "score": 0.92}
            ],
            "created_at": (NOW - timedelta(days=1)).isoformat()
        }
    ],
    "chat_session_03": [
        {
            "id": "msg_05",
            "chat_id": "chat_session_03",
            "sender_type": "user",
            "content": "What is the minimum attendance required for exams?",
            "sources": [],
            "created_at": (NOW - timedelta(days=4)).isoformat()
        },
        {
            "id": "msg_06",
            "chat_id": "chat_session_03",
            "sender_type": "assistant",
            "content": "Based on **Academic Regulations Section 4.2** [Academic_Regulations_2026.pdf - Page 8]:\n\n- **Minimum Requirement**: Students must maintain at least **75% attendance** in each registered course to be eligible for end-semester exams.",
            "sources": [
                {"document_id": "doc_acad_01", "filename": "Academic_Regulations_2026.pdf", "page": 8, "chunk_id": "chunk_acad_08", "score": 0.89}
            ],
            "created_at": (NOW - timedelta(days=4)).isoformat()
        }
    ],
    "chat_session_04": [
        {
            "id": "msg_07",
            "chat_id": "chat_session_04",
            "sender_type": "user",
            "content": "Tell me about the GPU cluster specs in AI Lab",
            "sources": [],
            "created_at": (NOW - timedelta(days=10)).isoformat()
        },
        {
            "id": "msg_08",
            "chat_id": "chat_session_04",
            "sender_type": "assistant",
            "content": "According to the **HPC Infrastructure Policy** [HPC_Lab_Guidelines.pdf - Page 1]:\n\n- **Hardware Specs**: The Campus AI Lab features **8x NVIDIA H100 (80GB)** node clusters connected via 100Gbps InfiniBand.",
            "sources": [
                {"document_id": "doc_hpc_01", "filename": "HPC_Lab_Guidelines.pdf", "page": 1, "chunk_id": "chunk_hpc_01", "score": 0.95}
            ],
            "created_at": (NOW - timedelta(days=10)).isoformat()
        }
    ]
}

def determine_time_group(iso_timestamp: str) -> str:
    """Categorizes a timestamp string into Today, Yesterday, Previous 7 Days, or Older."""
    try:
        dt = datetime.fromisoformat(iso_timestamp.replace("Z", "+00:00"))
        now = datetime.now(timezone.utc)
        diff_days = (now.date() - dt.date()).days

        if diff_days <= 0:
            return "Today"
        elif diff_days == 1:
            return "Yesterday"
        elif diff_days <= 7:
            return "Previous 7 Days"
        else:
            return "Older"
    except Exception:
        return "Today"

def is_supabase_configured() -> bool:
    url = getattr(settings, "SUPABASE_URL", "")
    return bool(url and "your-supabase-project" not in url and "demo-project" not in url)

@router.get("", response_model=GroupedHistoryResponse)
def get_chat_history(authorization: Optional[str] = Header(None)):
    """
    Returns chronologically categorized chat sessions for the user.
    Categories: Today, Yesterday, Previous 7 Days, Older.
    """
    if is_supabase_configured():
        try:
            supabase = get_supabase_admin_client()
            resp = supabase.table("chats").select("*").order("last_message_at", desc=True).execute()
            if resp.data:
                chats = resp.data
                session_items: List[ChatSessionItem] = []
                groups: Dict[str, List[ChatSessionItem]] = {
                    "Today": [],
                    "Yesterday": [],
                    "Previous 7 Days": [],
                    "Older": []
                }
                for c in chats:
                    group = determine_time_group(c["last_message_at"])
                    item = ChatSessionItem(
                        id=str(c["id"]),
                        title=c.get("title", "New Conversation"),
                        last_message_at=c.get("last_message_at", c.get("created_at")),
                        created_at=c.get("created_at"),
                        group=group
                    )
                    session_items.append(item)
                    groups[group].append(item)
                return GroupedHistoryResponse(groups=groups, all_chats=session_items)
        except Exception as err:
            logging.warning(f"Supabase fetch history error/fallback: {err}")

    # Fallback to local memory store
    sorted_chats = sorted(
        DEMO_CHATS.values(),
        key=lambda x: x["last_message_at"],
        reverse=True
    )

    groups: Dict[str, List[ChatSessionItem]] = {
        "Today": [],
        "Yesterday": [],
        "Previous 7 Days": [],
        "Older": []
    }
    session_items: List[ChatSessionItem] = []

    for c in sorted_chats:
        group = determine_time_group(c["last_message_at"])
        item = ChatSessionItem(
            id=c["id"],
            title=c["title"],
            last_message_at=c["last_message_at"],
            created_at=c["created_at"],
            group=group
        )
        session_items.append(item)
        groups[group].append(item)

    return GroupedHistoryResponse(groups=groups, all_chats=session_items)

@router.post("", response_model=ChatSessionItem, status_code=status.HTTP_201_CREATED)
def create_chat_session(payload: CreateChatRequest):
    """
    Creates a new chat session and initializes history thread.
    """
    new_id = f"chat_session_{uuid.uuid4().hex[:8]}"
    now_iso = datetime.now(timezone.utc).isoformat()
    title = payload.title or "New Conversation"

    if is_supabase_configured():
        try:
            supabase = get_supabase_admin_client()
            res = supabase.table("chats").insert({
                "id": new_id,
                "title": title,
                "created_at": now_iso,
                "last_message_at": now_iso
            }).execute()
            if res.data:
                c = res.data[0]
                return ChatSessionItem(
                    id=str(c["id"]),
                    title=c["title"],
                    last_message_at=c["last_message_at"],
                    created_at=c["created_at"],
                    group="Today"
                )
        except Exception as err:
            logging.warning(f"Supabase create chat error/fallback: {err}")

    new_chat = {
        "id": new_id,
        "user_id": "demo-user-01",
        "title": title,
        "last_message_at": now_iso,
        "created_at": now_iso
    }
    DEMO_CHATS[new_id] = new_chat
    DEMO_MESSAGES[new_id] = []

    return ChatSessionItem(
        id=new_id,
        title=title,
        last_message_at=now_iso,
        created_at=now_iso,
        group="Today"
    )

@router.get("/{chat_id}", response_model=List[MessageItem])
def get_chat_messages(chat_id: str):
    """
    Retrieves full message history thread for a specific chat ID.
    """
    if is_supabase_configured():
        try:
            supabase = get_supabase_admin_client()
            res = supabase.table("messages").select("*").eq("chat_id", chat_id).order("created_at", ascending=True).execute()
            if res.data:
                return [
                    MessageItem(
                        id=str(m["id"]),
                        chat_id=str(m["chat_id"]),
                        sender_type=m["sender_type"],
                        content=m["content"],
                        sources=m.get("sources", []),
                        created_at=m["created_at"]
                    )
                    for m in res.data
                ]
        except Exception as err:
            logging.warning(f"Supabase get messages error/fallback: {err}")

    messages = DEMO_MESSAGES.get(chat_id, [])
    return [
        MessageItem(
            id=m["id"],
            chat_id=m["chat_id"],
            sender_type=m["sender_type"],
            content=m["content"],
            sources=m.get("sources", []),
            created_at=m["created_at"]
        )
        for m in messages
    ]

@router.patch("/{chat_id}", response_model=ChatSessionItem)
def update_chat_title(chat_id: str, payload: UpdateChatTitleRequest):
    """
    Renames a conversation thread title.
    """
    now_iso = datetime.now(timezone.utc).isoformat()
    if is_supabase_configured():
        try:
            supabase = get_supabase_admin_client()
            res = supabase.table("chats").update({"title": payload.title, "updated_at": now_iso}).eq("id", chat_id).execute()
            if res.data:
                c = res.data[0]
                return ChatSessionItem(
                    id=str(c["id"]),
                    title=c["title"],
                    last_message_at=c.get("last_message_at", now_iso),
                    created_at=c.get("created_at", now_iso),
                    group=determine_time_group(c.get("last_message_at", now_iso))
                )
        except Exception as err:
            logging.warning(f"Supabase update title error/fallback: {err}")

    if chat_id not in DEMO_CHATS:
        raise HTTPException(status_code=404, detail="Chat session not found")

    DEMO_CHATS[chat_id]["title"] = payload.title
    c = DEMO_CHATS[chat_id]
    return ChatSessionItem(
        id=c["id"],
        title=c["title"],
        last_message_at=c["last_message_at"],
        created_at=c["created_at"],
        group=determine_time_group(c["last_message_at"])
    )

@router.delete("/{chat_id}", status_code=status.HTTP_200_OK)
def delete_chat_session(chat_id: str):
    """
    Deletes a conversation thread and all associated messages.
    """
    if is_supabase_configured():
        try:
            supabase = get_supabase_admin_client()
            supabase.table("chats").delete().eq("id", chat_id).execute()
            return {"status": "success", "message": f"Chat session {chat_id} deleted successfully"}
        except Exception as err:
            logging.warning(f"Supabase delete chat error/fallback: {err}")

    if chat_id in DEMO_CHATS:
        del DEMO_CHATS[chat_id]
    if chat_id in DEMO_MESSAGES:
        del DEMO_MESSAGES[chat_id]

    return {"status": "success", "message": f"Chat session {chat_id} deleted successfully"}
