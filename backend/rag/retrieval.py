"""
CampusIQ — Production-Grade Hybrid RAG Retrieval Engine
========================================================
Pipeline:
  User Query
    → Conversational Memory Coreference
    → Query Expansion + Synonym Normalization
    → Multi-Query Generation (3-5 variants)
    → Metadata Pre-filter
    → BM25 Keyword Search        (rank_bm25)
    → Vector Semantic Search     (ChromaDB cosine, Top-20)
    → Merge + Deduplicate
    → Cross-Encoder Rerank       (ms-marco-MiniLM-L-6-v2, Top-5)
    → Confidence Scoring
    → LLM or Refusal
"""

import re
import math
import time
import logging
from typing import List, Dict, Any, Tuple, Optional

logger = logging.getLogger("campusiq.rag.retrieval")

# ────────────────────────────────────────────────────────────────────────────
# Constants
# ────────────────────────────────────────────────────────────────────────────

VECTOR_TOP_K = 20          # candidates from vector search
BM25_TOP_K = 20            # candidates from BM25
RERANK_TOP_N = 5           # final chunks sent to LLM after reranking
DEFAULT_MIN_SCORE = 0.35   # relaxed — reranker decides quality, not raw cosine
CONFIDENCE_THRESHOLD = 0.40  # reranker score below this → low confidence


# ────────────────────────────────────────────────────────────────────────────
# Session (Conversational) Memory
# ────────────────────────────────────────────────────────────────────────────

SESSION_MEMORY_STORE: Dict[str, Dict[str, Any]] = {}


def get_session(chat_id: Optional[str]) -> Dict[str, Any]:
    if not chat_id:
        return {}
    return SESSION_MEMORY_STORE.get(chat_id, {})


def save_session(chat_id: Optional[str], intent: str, dept: str, section: str, query: str):
    if not chat_id:
        return
    SESSION_MEMORY_STORE[chat_id] = {
        "last_intent": intent,
        "last_department": dept,
        "last_section": section,
        "last_query": query,
    }


# ────────────────────────────────────────────────────────────────────────────
# Synonym & Query Expansion
# ────────────────────────────────────────────────────────────────────────────

SYNONYMS: Dict[str, List[str]] = {
    "fee": ["fee", "fees", "tuition", "payment", "cost", "charge", "amount", "annual fee", "per year"],
    "fees": ["fee", "fees", "tuition", "payment", "cost", "charge", "amount", "annual fee", "per year"],
    "tuition": ["fee", "fees", "tuition", "payment", "cost", "charge", "annual fee"],
    "hostel": ["hostel", "accommodation", "dorm", "dormitory", "room", "staying"],
    "mess": ["mess", "canteen", "cafeteria", "food", "meals", "dining"],
    "faculty": ["faculty", "teacher", "professor", "lecturer", "staff"],
    "attendance": ["attendance", "presence", "minimum attendance", "attendance percentage"],
    "placement": ["placement", "placements", "recruitment", "hiring", "campus drive", "job"],
    "library": ["library", "central library", "reading room", "book"],
    "timing": ["timing", "timings", "hours", "working hours", "opening time", "closing time", "schedule"],
    "exam": ["exam", "examination", "test", "semester exam", "end exam"],
    "scholarship": ["scholarship", "jvd", "fee reimbursement", "concession", "discount"],
    "ragging": ["ragging", "bullying", "harassment", "anti-ragging"],
    "club": ["club", "society", "association", "student body"],
    "principal": ["principal", "head", "director", "chancellor"],
    "cgpa": ["cgpa", "gpa", "grade", "marks", "score"],
    "backlog": ["backlog", "arrear", "pending subject", "failed subject"],
    "internship": ["internship", "training", "apprenticeship", "industry training"],
}

CATEGORY_KEYWORDS: Dict[str, List[str]] = {
    "admissions": ["admission", "admissions", "eapcet", "eamcet", "entrance", "certificate", "documents",
                   "marks memo", "transfer certificate", "counseling", "quota"],
    "fees": ["fee", "fees", "tuition", "payment", "cost", "charge", "jvd", "scholarship", "refund",
             "annual fee", "semester fee", "installment", "per year"],
    "hostel": ["hostel", "mess", "room", "curfew", "dorm", "warden", "accommodation", "staying",
               "hostel fee", "hostel rent"],
    "placements": ["placement", "placements", "highest package", "average package", "package", "lpa",
                   "recruiter", "company", "companies", "visiting", "selection", "hiring", "job",
                   "cgpa cutoff", "campus drive", "offer"],
    "academics": ["academic", "credit", "curriculum", "department", "branch", "semester", "cgpa",
                  "degree", "program"],
    "examinations": ["revaluation", "internal marks", "external marks", "condonation", "attendance",
                     "presence", "backlog", "exam", "examination", "marks", "evaluation", "shortage",
                     "minimum attendance", "minimum presence"],
    "campus_facilities": ["library", "borrow", "gpu", "nvidia", "h100", "canteen", "facility",
                          "sport", "sports", "cricket", "football", "gym", "gymnasium", "medical",
                          "24/7", "ambulance", "doctor", "cafeteria", "dining",
                          "library timing", "library hours", "canteen timing", "canteen hours"],
    "clubs": ["club", "ieee", "acm", "csi", "fest", "society", "music", "dance", "drama"],
    "discipline": ["ragging", "discipline", "code of conduct", "grievance", "rule", "rules"],
    "contacts": ["principal", "dean", "hod", "security", "emergency", "contact", "phone", "number",
                 "email", "helpdesk"],
}

DEPT_PATTERNS: Dict[str, str] = {
    r'\b(cse[\s_-]*(ai|ml)|ai[\s_-]*&?[\s_-]*ml|artificial\s*intelligence)\b': "CSE_AI",
    r'\b(cse[\s_-]*(ds|data\s*science)|data\s*science)\b': "CSE_DS",
    r'\b(cse|computer\s*science)\b': "CSE",
    r'\b(ece|electronics(\s*&\s*communication)?)\b': "ECE",
    r'\b(eee|electrical(\s*&\s*electronics)?)\b': "EEE",
    r'\b(civil(\s*engineering)?)\b': "CIVIL",
    r'\b(mechanical|mech)\b': "MECHANICAL",
    r'\b(mca)\b': "MCA",
    r'\b(mba)\b': "MBA",
    r'\b(mtech|m\.tech)\b': "MTECH",
}


def expand_query(query: str) -> str:
    """
    Expands a user query by appending synonyms and related terms.
    Handles BOTH forward lookup (key in query) and reverse lookup (synonym value in query).
    Example: 'minimum presence percentage' → expands with 'attendance minimum attendance ...'
    Example: 'library timing' → expands with 'hours working hours opening time ...'
    """
    q_lower = query.lower()
    extra_terms: List[str] = []
    groups_matched: set = set()

    # Forward lookup: key appears in query
    for key, synonyms in SYNONYMS.items():
        if re.search(r'\b' + re.escape(key) + r'\b', q_lower):
            groups_matched.add(key)
            for syn in synonyms:
                if syn not in q_lower and syn not in extra_terms:
                    extra_terms.append(syn)

    # Reverse lookup: a synonym VALUE appears in query → add all group synonyms
    for key, synonyms in SYNONYMS.items():
        if key in groups_matched:
            continue
        for syn in synonyms:
            if len(syn) >= 4 and re.search(r'\b' + re.escape(syn) + r'\b', q_lower):
                groups_matched.add(key)
                # Add the key itself (canonical term) and all other synonyms
                if key not in q_lower and key not in extra_terms:
                    extra_terms.append(key)
                for other_syn in synonyms:
                    if other_syn not in q_lower and other_syn not in extra_terms:
                        extra_terms.append(other_syn)
                break

    if extra_terms:
        expanded = query + " " + " ".join(extra_terms[:14])
        return expanded
    return query


def generate_multi_queries(query: str, session: Dict[str, Any]) -> List[str]:
    """
    Generates 3-5 alternative rephrasings of the user query.
    Uses template-based expansion (no LLM call required — fast & deterministic).
    """
    q = query.strip()
    variants = [q]

    # Add session context to follow-up queries
    last_intent = session.get("last_intent", "")
    last_dept = session.get("last_department", "GENERAL")

    if last_dept != "GENERAL" and last_dept.lower() not in q.lower():
        variants.append(f"{q} {last_dept}")
        variants.append(f"{last_dept} {q}")

    # Paraphrase templates
    if "?" in q:
        variants.append(q.replace("?", "").strip())

    q_lower = q.lower()

    # Fee query variants
    if any(w in q_lower for w in ["fee", "fees", "tuition", "cost", "payment"]):
        variants += [
            q.replace("fee", "tuition fee"),
            q.replace("fees", "annual tuition fee"),
            f"annual tuition fee {q}",
        ]

    # Hostel query variants
    if any(w in q_lower for w in ["hostel", "room", "accommodation"]):
        variants += [
            f"hostel {q}",
            f"hostel room rent {q}",
        ]

    # Placement variants
    if any(w in q_lower for w in ["placement", "package", "lpa", "company"]):
        variants += [
            f"campus recruitment {q}",
            f"placement statistics {q}",
        ]

    # Library timing variants
    if "library" in q_lower and any(w in q_lower for w in ["timing", "time", "hour", "open", "close"]):
        variants += [
            "central library operating hours",
            "library monday saturday hours",
        ]

    # Attendance variants
    if "attendance" in q_lower:
        variants += [
            "minimum attendance percentage required",
            "attendance condonation rules",
        ]

    # Deduplicate while preserving order
    seen = set()
    unique = []
    for v in variants:
        v = v.strip()
        if v and v.lower() not in seen:
            seen.add(v.lower())
            unique.append(v)

    return unique[:5]


# ────────────────────────────────────────────────────────────────────────────
# Entity Extraction (for metadata pre-filter)
# ────────────────────────────────────────────────────────────────────────────

def extract_entities(query_text: str, chat_id: Optional[str] = None) -> Tuple[str, str, str, bool]:
    """
    Query Understanding & Entity Extractor + Coreference Resolver.
    Returns (intent_category, department, section, is_ambiguous).
    """
    q = query_text.lower().strip()
    session = get_session(chat_id)
    is_ambiguous = False

    # ── Department extraction ──────────────────────────────────────────────
    dept = "GENERAL"
    for pattern, dept_code in DEPT_PATTERNS.items():
        if re.search(pattern, q):
            dept = dept_code
            break

    # Coreference: if no dept found, inherit from session
    if dept == "GENERAL" and session.get("last_department") and session["last_department"] != "GENERAL":
        dept = session["last_department"]

    # ── Intent category extraction ────────────────────────────────────────
    category = "general"
    best_match_count = 0
    for cat, keywords in CATEGORY_KEYWORDS.items():
        match_count = sum(1 for kw in keywords if kw in q)
        if match_count > best_match_count:
            best_match_count = match_count
            category = cat

    # Coreference: inherit from session if no clear intent
    if category == "general" and session.get("last_intent") and session["last_intent"] != "general":
        category = session["last_intent"]

    # ── Section extraction ─────────────────────────────────────────────────
    section = "general"
    if "mess" in q: section = "mess"
    elif "revaluation" in q: section = "revaluation"
    elif any(k in q for k in ["company", "companies", "recruiter", "visiting", "hiring"]): section = "recruiters"
    elif any(k in q for k in ["highest", "package", "salary", "lpa"]): section = "statistics"
    elif any(k in q for k in ["sport", "cricket", "football", "basketball", "gym", "game"]): section = "sports"
    elif any(k in q for k in ["library", "book", "borrowing", "reading room"]): section = "library"
    elif any(k in q for k in ["gpu", "nvidia", "h100", "ai lab", "compute"]): section = "gpu_lab"
    elif any(k in q for k in ["canteen", "food", "dining", "snacks", "cafeteria"]): section = "canteen"
    elif any(k in q for k in ["medical", "doctor", "health", "hospital", "clinic"]): section = "medical"
    elif any(k in q for k in ["curfew", "10 pm", "10:00", "outing"]): section = "curfew"
    elif any(k in q for k in ["scholarship", "jvd", "jagananna"]): section = "scholarships"
    elif any(k in q for k in ["attendance", "shortage", "condonation"]): section = "attendance"

    # ── Ambiguity detection ────────────────────────────────────────────────
    # Fee query without a specific branch and not asking about scholarships → ambiguous
    vague_fee_terms = ["jvd", "scholarship", "refund", "concession", "reimbursement"]
    if (category == "fees" and dept == "GENERAL"
            and not any(k in q for k in vague_fee_terms)
            and q in ["fees", "fee", "cost", "hostel cost", "tell me fees", "branch fee"]):
        is_ambiguous = True

    # Save resolved context to session
    if not is_ambiguous:
        save_session(chat_id, category, dept, section, query_text)

    return category, dept, section, is_ambiguous


# ────────────────────────────────────────────────────────────────────────────
# Static fallback knowledge base (bootstrap / emergency)
# ────────────────────────────────────────────────────────────────────────────

GROUNDED_CHUNKS_DB = [
    {
        "chunk_id": "chunk_adm_entrance",
        "content": "MITS Entrance Exams & Counseling Code: For B.Tech convener quota admissions, the accepted entrance exam is AP EAPCET (AP EAMCET). Official AP EAPCET Counseling Code: MITS.",
        "metadata": {"document": "01_admissions", "category": "admissions", "department": "GENERAL", "section": "eamcet", "subsection": "counseling_code", "heading_title": "Section 1: Entrance Exams & EAPCET Counseling Code", "version": "2026.2.0", "last_updated": "2026-07-29"},
        "keywords": ["admission", "admissions", "eapcet", "ap eapcet", "eamcet", "entrance", "counseling", "counseling code", "code"],
    },
    {
        "chunk_id": "chunk_adm_documents",
        "content": "MITS Admission Document Requirements: Mandatory original certificates required during reporting: Intermediate Marks Card, Transfer Certificate (TC), Aadhaar Card, Income Certificate, Caste Certificate, and Study Certificates from 6th to Intermediate.",
        "metadata": {"document": "01_admissions", "category": "admissions", "department": "GENERAL", "section": "documents", "subsection": "certificates", "heading_title": "Section 2: Mandatory Certificates & Reporting Documents", "version": "2026.2.0", "last_updated": "2026-07-29"},
        "keywords": ["admission", "admissions", "document", "documents", "certificate", "certificates", "tc", "aadhaar", "marks card", "income"],
    },
    {
        "chunk_id": "chunk_fee_cse_ai",
        "content": "MITS Fee Structure: Computer Science & Engineering (AI & Machine Learning / CSE_AI) annual tuition fee is ₹2,50,000 per academic year, payable in two semester installments of ₹1,25,000.",
        "metadata": {"document": "02_fees_and_scholarships", "category": "fees", "department": "CSE_AI", "section": "tuition_fee", "heading_title": "Department: CSE_AI", "version": "2026.2.0", "last_updated": "2026-07-29"},
        "keywords": ["fee", "tuition", "cse ai", "ai & ml", "cse_ai", "250000", "2.5 lakh"],
    },
    {
        "chunk_id": "chunk_fee_cse_ds",
        "content": "MITS Fee Structure: Computer Science & Engineering (Data Science / CSE_DS) annual tuition fee is ₹2,00,000 per academic year, payable in two semester installments of ₹1,00,000.",
        "metadata": {"document": "02_fees_and_scholarships", "category": "fees", "department": "CSE_DS", "section": "tuition_fee", "heading_title": "Department: CSE_DS", "version": "2026.2.0", "last_updated": "2026-07-29"},
        "keywords": ["fee", "tuition", "cse ds", "data science", "cse_ds", "200000", "2 lakh"],
    },
    {
        "chunk_id": "chunk_fee_cse",
        "content": "MITS Fee Structure: Computer Science & Engineering (General CSE) annual tuition fee is ₹2,00,000 per academic year, payable in two semester installments of ₹1,00,000.",
        "metadata": {"document": "02_fees_and_scholarships", "category": "fees", "department": "CSE", "section": "tuition_fee", "heading_title": "Department: CSE", "version": "2026.2.0", "last_updated": "2026-07-29"},
        "keywords": ["fee", "tuition", "cse", "computer science", "200000", "2 lakh"],
    },
    {
        "chunk_id": "chunk_fee_ece",
        "content": "MITS Fee Structure: Electronics & Communication Engineering (ECE) annual tuition fee is ₹1,50,000 per academic year, payable in two semester installments of ₹75,000.",
        "metadata": {"document": "02_fees_and_scholarships", "category": "fees", "department": "ECE", "section": "tuition_fee", "heading_title": "Department: ECE", "version": "2026.2.0", "last_updated": "2026-07-29"},
        "keywords": ["fee", "tuition", "ece", "electronics", "150000", "1.5 lakh"],
    },
    {
        "chunk_id": "chunk_fee_eee",
        "content": "MITS Fee Structure: Electrical & Electronics Engineering (EEE) annual tuition fee is ₹1,00,000 per academic year, payable in two semester installments of ₹50,000.",
        "metadata": {"document": "02_fees_and_scholarships", "category": "fees", "department": "EEE", "section": "tuition_fee", "heading_title": "Department: EEE", "version": "2026.2.0", "last_updated": "2026-07-29"},
        "keywords": ["fee", "tuition", "eee", "electrical", "100000", "1 lakh"],
    },
    {
        "chunk_id": "chunk_fee_civil",
        "content": "MITS Fee Structure: Civil Engineering (CIVIL) annual tuition fee is ₹1,00,000 per academic year, payable in two semester installments of ₹50,000.",
        "metadata": {"document": "02_fees_and_scholarships", "category": "fees", "department": "CIVIL", "section": "tuition_fee", "heading_title": "Department: CIVIL", "version": "2026.2.0", "last_updated": "2026-07-29"},
        "keywords": ["fee", "tuition", "civil", "100000", "1 lakh"],
    },
    {
        "chunk_id": "chunk_fee_mechanical",
        "content": "MITS Fee Structure: Mechanical Engineering (MECHANICAL) annual tuition fee is ₹1,00,000 per academic year, payable in two semester installments of ₹50,000.",
        "metadata": {"document": "02_fees_and_scholarships", "category": "fees", "department": "MECHANICAL", "section": "tuition_fee", "heading_title": "Department: MECHANICAL", "version": "2026.2.0", "last_updated": "2026-07-29"},
        "keywords": ["fee", "tuition", "mechanical", "mech", "100000", "1 lakh"],
    },
    {
        "chunk_id": "chunk_fee_mca",
        "content": "MITS Fee Structure: Master of Computer Applications (MCA) annual tuition fee is ₹2,00,000 per academic year, payable in two semester installments of ₹1,00,000.",
        "metadata": {"document": "02_fees_and_scholarships", "category": "fees", "department": "MCA", "section": "tuition_fee", "heading_title": "Department: MCA", "version": "2026.2.0", "last_updated": "2026-07-29"},
        "keywords": ["fee", "tuition", "mca", "200000", "2 lakh"],
    },
    {
        "chunk_id": "chunk_fee_mba",
        "content": "MITS Fee Structure: Master of Business Administration (MBA) annual tuition fee is ₹2,00,000 per academic year, payable in two semester installments of ₹1,00,000.",
        "metadata": {"document": "02_fees_and_scholarships", "category": "fees", "department": "MBA", "section": "tuition_fee", "heading_title": "Department: MBA", "version": "2026.2.0", "last_updated": "2026-07-29"},
        "keywords": ["fee", "tuition", "mba", "200000", "2 lakh"],
    },
    {
        "chunk_id": "chunk_fee_mtech",
        "content": "MITS Fee Structure: Master of Technology (M.Tech / MTECH) annual tuition fee is ₹2,50,000 per academic year, payable in two semester installments of ₹1,25,000.",
        "metadata": {"document": "02_fees_and_scholarships", "category": "fees", "department": "MTECH", "section": "tuition_fee", "heading_title": "Department: MTECH", "version": "2026.2.0", "last_updated": "2026-07-29"},
        "keywords": ["fee", "tuition", "mtech", "m.tech", "250000", "2.5 lakh"],
    },
    {
        "chunk_id": "chunk_fee_scholarship",
        "content": "MITS Scholarships & Reimbursement: Jagananna Vidya Deevena (JVD) covers tuition fee only. JVD does NOT cover hostel fees. JEE percentile above 80 gets 30% tuition fee reduction across all branches. Refund policy: No refunds under any circumstances.",
        "metadata": {"document": "02_fees_and_scholarships", "category": "fees", "department": "GENERAL", "section": "scholarships", "heading_title": "Section 2: Scholarship Schemes & Concessions", "version": "2026.2.0", "last_updated": "2026-07-29"},
        "keywords": ["jvd", "scholarship", "jee", "percentile", "refund", "concession"],
    },
    {
        "chunk_id": "chunk_hst_rent",
        "content": "MITS Hostel Room Rent: Single Occupancy Air-Conditioned (AC) Room: ₹1,80,000 per academic year. Double Occupancy Non-AC Room: ₹1,20,000 per academic year.",
        "metadata": {"document": "03_hostel", "category": "hostel", "department": "GENERAL", "section": "room_types", "heading_title": "Section 1: Hostel Room Rent & Categories", "version": "2026.2.0", "last_updated": "2026-07-29"},
        "keywords": ["hostel", "room", "rent", "single ac", "double", "accommodation"],
    },
    {
        "chunk_id": "chunk_hst_mess",
        "content": "MITS Hostel Mess & Amenities: Annual mess fee is ₹40,000 per year, which includes 3 daily meals, high-speed Wi-Fi 6, and unlimited laundry service at no extra charge.",
        "metadata": {"document": "03_hostel", "category": "hostel", "department": "GENERAL", "section": "mess", "heading_title": "Section 2: Mess Charges & Included Amenities", "version": "2026.2.0", "last_updated": "2026-07-29"},
        "keywords": ["hostel", "mess", "food", "meals", "wifi", "laundry", "amenities"],
    },
    {
        "chunk_id": "chunk_hst_rules",
        "content": "MITS Hostel Curfew & Leave Rules: In-time curfew for all hostellers is strictly 10:00 PM. Leave policy allows direct departure without prior formal written application.",
        "metadata": {"document": "03_hostel", "category": "hostel", "department": "GENERAL", "section": "curfew", "heading_title": "Section 3: Hostel Curfew & Outing Rules", "version": "2026.2.0", "last_updated": "2026-07-29"},
        "keywords": ["hostel", "curfew", "10 pm", "outing", "leave", "timing", "rules"],
    },
    {
        "chunk_id": "chunk_plc_companies",
        "content": "MITS Visiting Companies & Top Recruiters: Major top tier companies visiting campus for recruitment selections include TCS, Wipro, Infosys, Cognizant, Accenture, and Amazon.",
        "metadata": {"document": "04_placements", "category": "placements", "department": "GENERAL", "section": "recruiters", "heading_title": "Section 1: Visiting Companies & Top Recruiters", "version": "2026.2.0", "last_updated": "2026-07-29"},
        "keywords": ["placement", "company", "companies", "recruiter", "visiting", "tcs", "wipro", "infosys", "amazon", "accenture"],
    },
    {
        "chunk_id": "chunk_plc_statistics",
        "content": "MITS Placement Packages & Salary Highlights: The highest package offered is ₹28 LPA, and the average package across all engineering branches is ₹6 LPA.",
        "metadata": {"document": "04_placements", "category": "placements", "department": "GENERAL", "section": "statistics", "heading_title": "Section 2: Placement Highlights & Salary Statistics", "version": "2026.2.0", "last_updated": "2026-07-29"},
        "keywords": ["placement", "highest package", "average package", "lpa", "28 lpa", "6 lpa", "salary"],
    },
    {
        "chunk_id": "chunk_plc_eligibility",
        "content": "MITS Placement Eligibility Rules: Students must maintain a minimum 7.0 CGPA cutoff and have a maximum allowance of up to 15 active backlogs to participate in campus recruitment drives.",
        "metadata": {"document": "04_placements", "category": "placements", "department": "GENERAL", "section": "eligibility", "heading_title": "Section 3: Placement Eligibility & CGPA Cutoff", "version": "2026.2.0", "last_updated": "2026-07-29"},
        "keywords": ["placement", "eligibility", "cgpa", "cutoff", "backlog", "criteria"],
    },
    {
        "chunk_id": "chunk_acd_01",
        "content": "MITS Academics & Credit System: Departments offered include CSE, CSE (AI & ML), CSE (Data Science), ECE, EEE, Civil, Mechanical, MCA, MBA, M.Tech. Credit system: 15 to 20 credits per semester. Standard weighted CGPA calculation formula.",
        "metadata": {"document": "05_academics", "category": "academics", "department": "GENERAL", "section": "departments", "heading_title": "Section 1: Academic Departments & Degree Programs", "version": "2026.2.0", "last_updated": "2026-07-29"},
        "keywords": ["academic", "department", "credit", "cgpa", "curriculum", "semester"],
    },
    {
        "chunk_id": "chunk_exm_marks",
        "content": "MITS Examination Evaluation System: Course evaluation split consists of 40 Internal assessment marks and 60 External semester-end examination marks.",
        "metadata": {"document": "06_examinations", "category": "examinations", "department": "GENERAL", "section": "marks_split", "heading_title": "Section 1: Internal & External Marks Distribution", "version": "2026.2.0", "last_updated": "2026-07-29"},
        "keywords": ["exam", "internal", "external", "marks", "40", "60", "evaluation"],
    },
    {
        "chunk_id": "chunk_exm_attendance",
        "content": "MITS Attendance Criteria & Condonation: Minimum 75% attendance is required to appear for semester end exams. Attendance between 65% and 74% requires medical condonation approval.",
        "metadata": {"document": "06_examinations", "category": "examinations", "department": "GENERAL", "section": "attendance", "heading_title": "Section 2: Mandatory Attendance & Condonation Rules", "version": "2026.2.0", "last_updated": "2026-07-29"},
        "keywords": ["exam", "attendance", "75%", "condonation", "medical", "65%", "shortage"],
    },
    {
        "chunk_id": "chunk_exm_revaluation",
        "content": "MITS Revaluation Policy & Fee: Students can apply for answer script revaluation by paying ₹500 per course within 10 days of semester results announcement.",
        "metadata": {"document": "06_examinations", "category": "examinations", "department": "GENERAL", "section": "revaluation", "heading_title": "Section 3: Answer Script Revaluation Fee & Process", "version": "2026.2.0", "last_updated": "2026-07-29"},
        "keywords": ["exam", "revaluation", "fee", "500", "rechecking", "results", "10 days"],
    },
    {
        "chunk_id": "chunk_fac_library",
        "content": "MITS Library Facilities: Central Library operating hours: Monday-Saturday 8:00 AM - 11:00 PM, Sunday 10:00 AM - 6:00 PM. Borrowing rules: Undergraduate students can borrow up to 3 books for up to 10 days.",
        "metadata": {"document": "07_campus_facilities", "category": "campus_facilities", "department": "GENERAL", "section": "library", "heading_title": "Section 1: Central Library Hours & Borrowing Privileges", "version": "2026.2.0", "last_updated": "2026-07-29"},
        "keywords": ["facility", "library", "hours", "borrowing", "3 books", "reading room", "books"],
    },
    {
        "chunk_id": "chunk_fac_sports",
        "content": "MITS Sports & Athletic Facilities: Outdoor sports grounds include a full-size Cricket Ground, Football Field, Basketball Court, and Volleyball Courts. Indoor sports complex features Badminton Courts, Table Tennis, Chess, Carroms, and a fully equipped modern Gymnasium.",
        "metadata": {"document": "07_campus_facilities", "category": "campus_facilities", "department": "GENERAL", "section": "sports", "heading_title": "Section 2: Sports Grounds & Indoor Athletics Complex", "version": "2026.2.0", "last_updated": "2026-07-29"},
        "keywords": ["facility", "sports", "ground", "cricket", "football", "basketball", "volleyball", "badminton", "gym", "gymnasium"],
    },
    {
        "chunk_id": "chunk_fac_gpu",
        "content": "MITS High Performance AI Computing Lab: Compute AI Lab equipped with 8x NVIDIA H100 GPUs for artificial intelligence, deep learning research, and high-performance computing projects.",
        "metadata": {"document": "07_campus_facilities", "category": "campus_facilities", "department": "GENERAL", "section": "gpu_lab", "heading_title": "Section 3: High Performance Compute & GPU AI Lab", "version": "2026.2.0", "last_updated": "2026-07-29"},
        "keywords": ["facility", "gpu", "nvidia", "h100", "ai lab", "compute", "supercomputer"],
    },
    {
        "chunk_id": "chunk_fac_canteen",
        "content": "MITS Canteen & Dining Facilities: Student & staff campus canteen operates daily from 9:00 AM to 5:00 PM serving hygienic hot meals, beverages, snacks, and refreshments.",
        "metadata": {"document": "07_campus_facilities", "category": "campus_facilities", "department": "GENERAL", "section": "canteen", "heading_title": "Section 4: Campus Canteen & Dining", "version": "2026.2.0", "last_updated": "2026-07-29"},
        "keywords": ["facility", "canteen", "food", "dining", "snacks", "cafeteria", "meals"],
    },
    {
        "chunk_id": "chunk_fac_medical",
        "content": "MITS Healthcare & Medical Center: 24/7 Medical Center on campus providing resident doctor consultation, first-aid, emergency medical support, and 24/7 ambulance service.",
        "metadata": {"document": "07_campus_facilities", "category": "campus_facilities", "department": "GENERAL", "section": "medical", "heading_title": "Section 5: 24/7 Medical Center & Emergency Services", "version": "2026.2.0", "last_updated": "2026-07-29"},
        "keywords": ["facility", "medical", "doctor", "health", "hospital", "first aid", "ambulance", "24/7", "clinic"],
    },
    {
        "chunk_id": "chunk_clb_01",
        "content": "MITS Active Clubs & Societies: Technical societies: IEEE Student Branch, ACM Student Chapter, CSI. Cultural clubs: Music, Dance, Drama, Fine Arts. Registration: Visit club coordinator in person and submit Google Form.",
        "metadata": {"document": "08_clubs_and_activities", "category": "clubs", "department": "GENERAL", "section": "technical_clubs", "heading_title": "Section 1: Active Student Clubs & Societies", "version": "2026.2.0", "last_updated": "2026-07-29"},
        "keywords": ["club", "ieee", "acm", "csi", "music", "dance", "google form", "join"],
    },
    {
        "chunk_id": "chunk_rul_01",
        "content": "MITS Rules & Anti-Ragging Policy: Strict zero-tolerance policy against ragging on campus or hostels. 75% attendance discipline enforced.",
        "metadata": {"document": "09_rules_and_discipline", "category": "discipline", "department": "GENERAL", "section": "anti_ragging", "heading_title": "Section 2: Anti-Ragging Policy & Zero Tolerance", "version": "2026.2.0", "last_updated": "2026-07-29"},
        "keywords": ["rule", "discipline", "ragging", "anti-ragging", "code of conduct", "attendance"],
    },
    {
        "chunk_id": "chunk_cnt_executive",
        "content": "MITS Executive Leadership Directory: Principal: Dr. K. V. Sharma (+91 94400 12345). Dean Academics: Dr. M. S. Rao (+91 94400 23456).",
        "metadata": {"document": "10_contacts_and_administration", "category": "contacts", "department": "GENERAL", "section": "principal", "heading_title": "Section 1: Executive Leadership Contacts", "version": "2026.2.0", "last_updated": "2026-07-29"},
        "keywords": ["contact", "principal", "dean", "leadership", "administration", "phone", "number"],
    },
    {
        "chunk_id": "chunk_cnt_emergency",
        "content": "MITS Emergency Help Desks: Campus Security Desk (24/7): +91 94400 00001. Emergency Medical Desk (24/7): +91 94400 00002.",
        "metadata": {"document": "10_contacts_and_administration", "category": "contacts", "department": "GENERAL", "section": "emergency", "heading_title": "Section 2: 24/7 Emergency Desks", "version": "2026.2.0", "last_updated": "2026-07-29"},
        "keywords": ["contact", "emergency", "security", "medical desk", "helpdesk", "24/7", "phone", "number"],
    },
]


# ────────────────────────────────────────────────────────────────────────────
# ChromaDB loader
# ────────────────────────────────────────────────────────────────────────────

def _load_chromadb_chunks() -> List[Dict[str, Any]]:
    """Loads all chunks from ChromaDB. Returns [] if empty or unavailable."""
    try:
        from backend.ingestion.pipeline import get_chroma_collection
        coll = get_chroma_collection("campusiq_knowledge_store")
        count = coll.count()
        if count == 0:
            return []

        res = coll.get(include=["documents", "metadatas"])
        chunks = []
        for cid, doc, meta in zip(res.get("ids", []), res.get("documents", []), res.get("metadatas", [])):
            if not meta:
                meta = {}
            # Rebuild keywords list from stored comma-separated string
            kw_str = meta.pop("keywords_str", "")
            keywords = [k.strip() for k in kw_str.split(",") if k.strip()] if kw_str else []

            chunks.append({
                "chunk_id": cid,
                "content": doc,
                "metadata": meta,
                "keywords": keywords,
            })
        logger.info(f"Loaded {len(chunks)} chunks from ChromaDB.")
        return chunks
    except Exception as e:
        logger.warning(f"ChromaDB load failed: {e}")
        return []


def get_active_chunks() -> List[Dict[str, Any]]:
    """Returns ChromaDB chunks if available, falls back to static GROUNDED_CHUNKS_DB."""
    dynamic = _load_chromadb_chunks()
    if dynamic:
        return dynamic
    logger.info("Using static GROUNDED_CHUNKS_DB fallback.")
    return GROUNDED_CHUNKS_DB


# ────────────────────────────────────────────────────────────────────────────
# BM25 Keyword Search
# ────────────────────────────────────────────────────────────────────────────

def bm25_search(
    queries: List[str],
    chunks: List[Dict[str, Any]],
    top_k: int = BM25_TOP_K,
) -> List[Tuple[Dict[str, Any], float]]:
    """
    Runs BM25 keyword search over chunk corpus.
    Returns list of (chunk, bm25_score) sorted descending.
    """
    try:
        from rank_bm25 import BM25Okapi

        # Tokenize corpus
        corpus_tokens = []
        for c in chunks:
            text = c["content"] + " " + " ".join(c.get("keywords", []))
            tokens = re.findall(r'\b[a-zA-Z0-9₹%]+\b', text.lower())
            corpus_tokens.append(tokens)

        bm25 = BM25Okapi(corpus_tokens)

        # Merge scores across all query variants
        combined_scores: Dict[int, float] = {}
        for q in queries:
            q_tokens = re.findall(r'\b[a-zA-Z0-9₹%]+\b', q.lower())
            if not q_tokens:
                continue
            scores = bm25.get_scores(q_tokens)
            for idx, score in enumerate(scores):
                combined_scores[idx] = max(combined_scores.get(idx, 0.0), float(score))

        # Sort by score
        ranked = sorted(combined_scores.items(), key=lambda x: x[1], reverse=True)
        results = []
        for idx, score in ranked[:top_k]:
            if score > 0:
                results.append((chunks[idx], score))

        return results

    except ImportError:
        logger.warning("rank_bm25 not installed — BM25 search skipped.")
        return []
    except Exception as e:
        logger.warning(f"BM25 search error: {e}")
        return []


# ────────────────────────────────────────────────────────────────────────────
# Vector Search (ChromaDB)
# ────────────────────────────────────────────────────────────────────────────

def vector_search(
    queries: List[str],
    top_k: int = VECTOR_TOP_K,
    category_filter: Optional[str] = None,
    dept_filter: Optional[str] = None,
) -> List[Tuple[Dict[str, Any], float]]:
    """
    Runs vector semantic search in ChromaDB using BAAI/bge-small-en-v1.5 embeddings.
    Applies optional metadata pre-filters for category and department.
    Returns list of (chunk_dict, cosine_score) sorted descending.
    """
    try:
        from backend.ingestion.pipeline import generate_embeddings, get_chroma_collection

        coll = get_chroma_collection("campusiq_knowledge_store")
        if coll.count() == 0:
            return []

        # Build where clause for metadata filtering
        where_clause: Optional[Dict] = None
        if category_filter and category_filter != "general":
            if dept_filter and dept_filter != "GENERAL":
                where_clause = {
                    "$and": [
                        {"category": {"$eq": category_filter}},
                        {"$or": [
                            {"department": {"$eq": dept_filter}},
                            {"department": {"$eq": "GENERAL"}},
                        ]},
                    ]
                }
            else:
                where_clause = {"category": {"$eq": category_filter}}

        # Generate embeddings for all query variants
        embeddings = generate_embeddings(queries)

        combined: Dict[str, Tuple[Dict[str, Any], float]] = {}

        for emb in embeddings:
            try:
                query_kwargs = {
                    "query_embeddings": [emb],
                    "n_results": min(top_k, max(1, coll.count())),
                    "include": ["documents", "metadatas", "distances"],
                }
                if where_clause:
                    query_kwargs["where"] = where_clause

                res = coll.query(**query_kwargs)

                ids_list = res.get("ids", [[]])[0]
                docs_list = res.get("documents", [[]])[0]
                metas_list = res.get("metadatas", [[]])[0]
                dists_list = res.get("distances", [[]])[0]

                for cid, doc, meta, dist in zip(ids_list, docs_list, metas_list, dists_list):
                    # ChromaDB cosine distance → similarity score
                    similarity = max(0.0, 1.0 - float(dist))
                    if not meta:
                        meta = {}

                    kw_str = meta.pop("keywords_str", "")
                    keywords = [k.strip() for k in kw_str.split(",") if k.strip()] if kw_str else []

                    chunk = {
                        "chunk_id": cid,
                        "content": doc,
                        "metadata": meta,
                        "keywords": keywords,
                    }

                    # Keep highest score across query variants
                    if cid not in combined or similarity > combined[cid][1]:
                        combined[cid] = (chunk, similarity)

            except Exception as q_err:
                # If filtered query fails, retry without filter
                if where_clause:
                    logger.debug(f"Filtered vector query failed, retrying without filter: {q_err}")
                    try:
                        res2 = coll.query(
                            query_embeddings=[emb],
                            n_results=min(top_k, max(1, coll.count())),
                            include=["documents", "metadatas", "distances"],
                        )
                        ids2 = res2.get("ids", [[]])[0]
                        docs2 = res2.get("documents", [[]])[0]
                        metas2 = res2.get("metadatas", [[]])[0]
                        dists2 = res2.get("distances", [[]])[0]
                        for cid, doc, meta, dist in zip(ids2, docs2, metas2, dists2):
                            similarity = max(0.0, 1.0 - float(dist))
                            if not meta:
                                meta = {}
                            kw_str = meta.pop("keywords_str", "")
                            keywords = [k.strip() for k in kw_str.split(",") if k.strip()] if kw_str else []
                            chunk = {"chunk_id": cid, "content": doc, "metadata": meta, "keywords": keywords}
                            if cid not in combined or similarity > combined[cid][1]:
                                combined[cid] = (chunk, similarity)
                    except Exception:
                        pass
                continue

        # Sort by similarity descending
        ranked = sorted(combined.values(), key=lambda x: x[1], reverse=True)
        return ranked[:top_k]

    except Exception as e:
        logger.warning(f"Vector search error: {e}")
        return []


# ────────────────────────────────────────────────────────────────────────────
# Cross-Encoder Reranker
# ────────────────────────────────────────────────────────────────────────────

_reranker_model = None
_reranker_available = None


def _get_reranker():
    """Lazy-loads the cross-encoder reranker model (cached singleton)."""
    global _reranker_model, _reranker_available
    if _reranker_available is False:
        return None
    if _reranker_model is not None:
        return _reranker_model
    try:
        from sentence_transformers import CrossEncoder
        _reranker_model = CrossEncoder("cross-encoder/ms-marco-MiniLM-L-6-v2", max_length=512)
        _reranker_available = True
        logger.info("Cross-encoder reranker loaded: ms-marco-MiniLM-L-6-v2")
        return _reranker_model
    except Exception as e:
        logger.warning(f"Cross-encoder not available: {e}. Falling back to score-based ranking.")
        _reranker_available = False
        return None


def rerank_chunks(
    query: str,
    candidates: List[Tuple[Dict[str, Any], float]],
    top_n: int = RERANK_TOP_N,
) -> List[Tuple[Dict[str, Any], float]]:
    """
    Cross-encoder reranking of candidate chunks.
    Returns top_n (chunk, reranker_score) pairs.
    Falls back to original scores if reranker unavailable.
    """
    if not candidates:
        return []

    reranker = _get_reranker()

    if reranker is None:
        # Fallback: return top_n by existing score
        return sorted(candidates, key=lambda x: x[1], reverse=True)[:top_n]

    try:
        pairs = [(query, c["content"][:500]) for c, _ in candidates]
        scores = reranker.predict(pairs)

        reranked = [
            (chunk, float(score))
            for (chunk, _orig), score in zip(candidates, scores)
        ]
        reranked.sort(key=lambda x: x[1], reverse=True)
        return reranked[:top_n]

    except Exception as e:
        logger.warning(f"Reranker predict failed: {e}")
        return sorted(candidates, key=lambda x: x[1], reverse=True)[:top_n]


# ────────────────────────────────────────────────────────────────────────────
# Confidence scoring
# ────────────────────────────────────────────────────────────────────────────

def compute_confidence(
    reranked: List[Tuple[Dict[str, Any], float]],
    max_vector_score: float,
    is_ambiguous: bool,
) -> Tuple[float, str]:
    """
    Computes final confidence score from three factors:
    1. Reranker score of top result (cross-encoder logit, sigmoid-normalized)
    2. Vector similarity of top result (cosine)
    3. Ambiguity flag

    When vector score is very high (≥ 0.90), we trust vector search more
    since semantic similarity is strong evidence even if reranker is conservative.

    Returns (confidence_0_to_1, tier_string).
    """
    if is_ambiguous or not reranked:
        return 0.0, "LOW"

    top_reranker_score = reranked[0][1]

    # Cross-encoder scores are unbounded logits — normalize with sigmoid
    norm_reranker = 1.0 / (1.0 + math.exp(-top_reranker_score))

    # Adaptive blending: when vector score is very high, trust it more
    if max_vector_score >= 0.90:
        # Strong vector evidence — give 60% weight to vector, 40% to reranker
        confidence = 0.40 * norm_reranker + 0.60 * max_vector_score
    else:
        # Default: 60% reranker + 40% vector
        confidence = 0.60 * norm_reranker + 0.40 * max_vector_score

    if confidence >= 0.75:
        tier = "HIGH"
    elif confidence >= 0.55:
        tier = "MEDIUM"
    else:
        tier = "LOW"

    return round(confidence, 4), tier


# ────────────────────────────────────────────────────────────────────────────
# Fallback: static-list search (when ChromaDB is empty)
# ────────────────────────────────────────────────────────────────────────────

def _static_search(
    queries: List[str],
    category: str,
    dept: str,
    section: str,
    top_k: int,
) -> List[Tuple[Dict[str, Any], float]]:
    """
    Searches the static GROUNDED_CHUNKS_DB using keyword + metadata scoring.
    Used as fallback when ChromaDB is empty (no docs ingested yet).
    """
    q_lower = " ".join(queries).lower()
    scored: List[Tuple[Dict[str, Any], float]] = []

    for item in GROUNDED_CHUNKS_DB:
        meta = item["metadata"]
        keywords = item.get("keywords", [])

        kw_match = sum(1 for kw in keywords if kw in q_lower)

        if meta.get("category") == category and meta.get("department") == dept:
            base = 0.92
        elif meta.get("category") == category and dept == "GENERAL":
            base = 0.87
        elif meta.get("category") == category:
            base = 0.80
        elif kw_match > 0:
            base = 0.72
        else:
            base = 0.30

        score = min(base + kw_match * 0.02, 0.98)

        # Section boost
        if section != "general" and meta.get("section") == section:
            score = min(score + 0.04, 0.98)

        scored.append((item, round(score, 3)))

    scored.sort(key=lambda x: x[1], reverse=True)
    return scored[:top_k]


# ────────────────────────────────────────────────────────────────────────────
# Main hybrid retrieval function
# ────────────────────────────────────────────────────────────────────────────

def search_knowledge_store_with_debug(
    query_text: str,
    top_k: int = RERANK_TOP_N,
    min_score: float = DEFAULT_MIN_SCORE,
    chat_id: Optional[str] = None,
) -> Tuple[List[Dict[str, Any]], float, Dict[str, Any]]:
    """
    Full 7-stage hybrid retrieval pipeline.
    Returns (passed_chunks, max_score, debug_info).
    """
    t0 = time.time()

    # ── Stage 1: Coreference + Entity Extraction ──────────────────────────
    session = get_session(chat_id)
    category, dept, section, is_ambiguous = extract_entities(query_text, chat_id)

    # ── Stage 2: Query Expansion + Synonym Normalization ──────────────────
    expanded_query = expand_query(query_text)

    # ── Stage 3: Multi-Query Generation ──────────────────────────────────
    multi_queries = generate_multi_queries(expanded_query, session)
    t_expand = time.time()

    # ── Stage 4+5+6: BM25 + Vector Search ────────────────────────────────
    active_chunks = get_active_chunks()
    use_chromadb = len(active_chunks) > len(GROUNDED_CHUNKS_DB)

    bm25_results: List[Tuple[Dict[str, Any], float]] = []
    vector_results: List[Tuple[Dict[str, Any], float]] = []
    max_vector_score = 0.0

    if use_chromadb:
        # Real BM25 + Vector
        bm25_results = bm25_search(multi_queries, active_chunks, top_k=BM25_TOP_K)
        vector_results = vector_search(
            multi_queries,
            top_k=VECTOR_TOP_K,
            category_filter=category if not is_ambiguous else None,
            dept_filter=dept if dept != "GENERAL" else None,
        )
        max_vector_score = vector_results[0][1] if vector_results else 0.0
    else:
        # Static fallback search
        static_results = _static_search(multi_queries, category, dept, section, top_k=20)
        bm25_results = static_results[:10]
        vector_results = static_results
        max_vector_score = vector_results[0][1] if vector_results else 0.0

    t_retrieve = time.time()

    # ── Stage 7a: Merge + Deduplicate ─────────────────────────────────────
    merged: Dict[str, Tuple[Dict[str, Any], float]] = {}

    for chunk, score in vector_results:
        cid = chunk.get("chunk_id", id(chunk))
        merged[cid] = (chunk, score)

    for chunk, bm25_score in bm25_results:
        cid = chunk.get("chunk_id", id(chunk))
        if cid in merged:
            # Boost score if chunk appears in both results
            existing_score = merged[cid][1]
            merged[cid] = (chunk, min(existing_score + 0.05, 1.0))
        else:
            # Normalize BM25 score to [0, 1] range roughly
            norm_bm25 = min(bm25_score / 20.0, 1.0)
            merged[cid] = (chunk, norm_bm25)

    all_candidates = list(merged.values())
    all_candidates.sort(key=lambda x: x[1], reverse=True)
    candidates_for_reranking = all_candidates[:20]

    # ── Stage 7b: Cross-Encoder Reranking ──────────────────────────────
    # IMPORTANT: Use expanded_query (not raw query_text) so synonym expansion
    # benefits the cross-encoder (e.g. "presence" → expanded to include "attendance")
    reranked = rerank_chunks(expanded_query, candidates_for_reranking, top_n=top_k)

    t_rerank = time.time()

    # ── Confidence Scoring ────────────────────────────────────────────────
    confidence, confidence_tier = compute_confidence(reranked, max_vector_score, is_ambiguous)

    # ── Apply confidence threshold to decide passed vs refused ─────────────
    passed_chunks: List[Dict[str, Any]] = []
    if not is_ambiguous and reranked and confidence >= CONFIDENCE_THRESHOLD:
        for chunk, reranker_score in reranked:
            chunk_copy = dict(chunk)
            chunk_copy["score"] = round(reranker_score, 4)
            chunk_copy["reranker_score"] = round(reranker_score, 4)
            chunk_copy["vector_score"] = round(max_vector_score, 4)
            passed_chunks.append(chunk_copy)

    t_total = time.time()

    # ── Build Debug Info ──────────────────────────────────────────────────
    debug_info = {
        "query_asked": query_text,
        "expanded_query": expanded_query,
        "multi_queries": multi_queries,
        "resolved_intent": category,
        "resolved_department": dept,
        "resolved_section": section,
        "is_ambiguous": is_ambiguous,
        "data_source": "chromadb" if use_chromadb else "static_fallback",
        "bm25_results_count": len(bm25_results),
        "vector_results_count": len(vector_results),
        "candidates_merged": len(merged),
        "candidates_for_reranking": len(candidates_for_reranking),
        "reranked_count": len(reranked),
        "passed_chunks_count": len(passed_chunks),
        "max_vector_score": round(max_vector_score, 4),
        "confidence_score": confidence,
        "confidence_tier": confidence_tier,
        "final_confidence_pct": f"{round(confidence * 100)}%",
        "latency_expand_ms": round((t_expand - t0) * 1000, 1),
        "latency_retrieve_ms": round((t_retrieve - t_expand) * 1000, 1),
        "latency_rerank_ms": round((t_rerank - t_retrieve) * 1000, 1),
        "latency_total_ms": round((t_total - t0) * 1000, 1),
        "top_5_chunks_summary": [
            {
                "chunk_id": chunk.get("chunk_id", "?"),
                "document": chunk.get("metadata", {}).get("document", "?"),
                "category": chunk.get("metadata", {}).get("category", "?"),
                "department": chunk.get("metadata", {}).get("department", "?"),
                "section": chunk.get("metadata", {}).get("section", "?"),
                "reranker_score": round(score, 4),
                "passed_threshold": chunk in [p for p in passed_chunks],
                "snippet": chunk.get("content", "")[:150] + "...",
            }
            for chunk, score in reranked[:5]
        ],
    }

    return passed_chunks, max_vector_score, debug_info


def search_knowledge_store(
    query_text: str,
    top_k: int = RERANK_TOP_N,
    min_score: float = DEFAULT_MIN_SCORE,
    chat_id: Optional[str] = None,
) -> Tuple[List[Dict[str, Any]], float]:
    """Simplified retrieval interface (no debug info returned)."""
    passed, max_score, _ = search_knowledge_store_with_debug(query_text, top_k, min_score, chat_id)
    return passed, max_score


def map_citations(retrieved_chunks: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Maps retrieved chunks to citation metadata for frontend display."""
    citations = []
    for c in retrieved_chunks:
        meta = c.get("metadata", {})
        doc = meta.get("document", "02_fees_and_scholarships")
        sc = float(c.get("score", c.get("reranker_score", 0.0)))
        citations.append({
            "document_id": doc,
            "filename": meta.get("document_name", f"{doc}.md"),
            "document_name": meta.get("document_name", f"{doc}.md"),
            "page": meta.get("page_number", 1),
            "page_number": meta.get("page_number", 1),
            "chunk_id": c.get("chunk_id", "chunk_01"),
            "section": meta.get("section", ""),
            "heading": meta.get("heading_title", ""),
            "score": round(sc, 4),
            "similarity_score": round(sc, 4),
        })
    return citations
