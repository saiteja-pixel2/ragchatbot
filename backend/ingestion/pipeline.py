import os
import re
import math
import logging
from typing import List, Dict, Any, Optional

from backend.config import settings

logger = logging.getLogger("campusiq.ingestion.pipeline")

GLOBAL_VERSION = "2026.2.0"
GLOBAL_LAST_UPDATED = "2026-07-29"

# ---------------------------------------------------------------------------
# ChromaDB helpers
# ---------------------------------------------------------------------------

_chroma_client = None
_chroma_collection = None

def get_chroma_client():
    """Returns a cached singleton PersistentClient targeting the configured CHROMA_PERSIST_DIR."""
    global _chroma_client
    if _chroma_client is None:
        import chromadb
        os.makedirs(settings.CHROMA_PERSIST_DIR, exist_ok=True)
        _chroma_client = chromadb.PersistentClient(path=settings.CHROMA_PERSIST_DIR)
    return _chroma_client


def get_chroma_collection(collection_name: str = "campusiq_knowledge_store"):
    """Returns or creates a cached singleton ChromaDB collection using PersistentClient."""
    global _chroma_collection
    if _chroma_collection is None:
        client = get_chroma_client()
        _chroma_collection = client.get_or_create_collection(
            collection_name,
            metadata={"hnsw:space": "cosine"}
        )
    return _chroma_collection


# ---------------------------------------------------------------------------
# Text extraction
# ---------------------------------------------------------------------------

def extract_text(file_bytes: bytes, filename: str) -> str:
    """Extracts raw string text from PDF, DOCX, TXT, or MD documents."""
    ext = filename.split(".")[-1].lower()

    if ext == "pdf":
        try:
            import pypdf
            import io
            reader = pypdf.PdfReader(io.BytesIO(file_bytes))
            text = ""
            for idx, page in enumerate(reader.pages):
                page_text = page.extract_text() or ""
                text += f"\n[Page {idx+1}]\n" + page_text
            return text
        except Exception as e:
            logger.warning(f"pypdf extraction error for {filename}: {e}")
            return file_bytes.decode("utf-8", errors="replace")

    elif ext == "docx":
        try:
            import docx
            import io
            doc = docx.Document(io.BytesIO(file_bytes))
            return "\n\n".join([p.text for p in doc.paragraphs if p.text.strip()])
        except Exception as e:
            logger.warning(f"python-docx extraction error for {filename}: {e}")
            return file_bytes.decode("utf-8", errors="replace")

    elif ext in ["txt", "md"]:
        return file_bytes.decode("utf-8", errors="replace").strip()

    else:
        raise ValueError(f"Unsupported format: .{ext}")


def clean_text(raw_text: str) -> str:
    """Normalizes whitespace while preserving paragraph & heading breaks."""
    cleaned = re.sub(r'[\r\t\f\v]+', ' ', raw_text)
    cleaned = re.sub(r' +', ' ', cleaned)
    cleaned = re.sub(r'\n{3,}', '\n\n', cleaned)
    return cleaned.strip()


# ---------------------------------------------------------------------------
# Metadata detection helpers
# ---------------------------------------------------------------------------

def detect_category(filename: str, sample_text: str = "") -> str:
    """Detects primary category metadata from filename."""
    fname = filename.lower()
    if "01_admissions" in fname or "admission" in fname:
        return "admissions"
    elif "02_fees" in fname or "fee" in fname or "scholarship" in fname:
        return "fees"
    elif "03_hostel" in fname or "hostel" in fname:
        return "hostel"
    elif "04_placements" in fname or "placement" in fname:
        return "placements"
    elif "05_academics" in fname or "academic" in fname:
        return "academics"
    elif "06_examinations" in fname or "exam" in fname:
        return "examinations"
    elif "07_campus_facilities" in fname or "facility" in fname or "library" in fname:
        return "campus_facilities"
    elif "08_clubs" in fname or "club" in fname:
        return "clubs"
    elif "09_rules" in fname or "discipline" in fname:
        return "discipline"
    elif "10_contacts" in fname or "contact" in fname or "admin" in fname:
        return "contacts"
    return "general"


def extract_department(text: str) -> str:
    """Extracts department tag from text using strict word-boundary patterns."""
    t = text.lower()
    if re.search(r'\b(cse_ai|ai\s*&\s*ml|ai\s*&\s*machine\s*learning|cse\s*\(ai\s*&\s*ml\))\b', t):
        return "CSE_AI"
    elif re.search(r'\b(cse_ds|data\s*science|cse\s*\(data\s*science\))\b', t):
        return "CSE_DS"
    elif re.search(r'\b(cse|computer\s*science)\b', t):
        return "CSE"
    elif re.search(r'\b(eee|electrical\s*&\s*electronics|electrical)\b', t):
        return "EEE"
    elif re.search(r'\b(ece|electronics\s*&\s*communication|electronics)\b', t):
        return "ECE"
    elif re.search(r'\b(civil)\b', t):
        return "CIVIL"
    elif re.search(r'\b(mechanical|mech)\b', t):
        return "MECHANICAL"
    elif re.search(r'\b(mca)\b', t):
        return "MCA"
    elif re.search(r'\b(mba)\b', t):
        return "MBA"
    elif re.search(r'\b(mtech|m\.tech)\b', t):
        return "MTECH"
    return "GENERAL"


def extract_section(category: str, text: str) -> str:
    """Extracts subtopic section tag based on category taxonomy."""
    t = text.lower()
    if category == "admissions":
        if "eapcet" in t or "entrance" in t: return "eamcet"
        if "eligibility" in t: return "eligibility"
        if "document" in t or "certificate" in t: return "documents"
        if "quota" in t or "category-b" in t: return "management_quota"
        return "contact"
    elif category == "fees":
        if "jvd" in t or "jagananna" in t or "scholarship" in t or "jee" in t: return "scholarships"
        if "refund" in t: return "refund"
        return "tuition_fee"
    elif category == "hostel":
        if "mess" in t or "meal" in t: return "mess"
        if "curfew" in t or "10:00" in t: return "curfew"
        if "visitor" in t: return "visitors"
        if "wifi" in t or "laundry" in t: return "wifi"
        return "room_types"
    elif category == "placements":
        if "highest" in t or "average" in t or "package" in t or "lpa" in t: return "statistics"
        if "recruiter" in t or "company" in t or "tcs" in t or "amazon" in t: return "recruiters"
        if "cutoff" in t or "cgpa" in t or "backlog" in t: return "eligibility"
        if "training" in t or "soft skill" in t: return "training"
        return "internships"
    elif category == "academics":
        if "department" in t or "branch" in t: return "departments"
        if "credit" in t: return "credits"
        if "cgpa" in t or "formula" in t: return "cgpa"
        if "calendar" in t or "semester" in t: return "calendar"
        return "curriculum"
    elif category == "examinations":
        if "revaluation" in t: return "revaluation"
        if "condonation" in t: return "medical_condonation"
        if "attendance" in t: return "attendance"
        if "marks" in t or "40" in t or "60" in t: return "marks_split"
        if "backlog" in t: return "backlog_exams"
        return "results"
    elif category == "campus_facilities":
        if "library" in t or "book" in t or "borrowing" in t: return "library"
        if "gpu" in t or "hpc" in t or "nvidia" in t: return "gpu_lab"
        if "sport" in t or "cricket" in t or "gym" in t: return "sports"
        if "canteen" in t: return "canteen"
        if "medical" in t or "24/7" in t: return "medical_center"
        return "facilities"
    elif category == "clubs":
        if "ieee" in t or "acm" in t or "csi" in t or "tech" in t: return "technical_clubs"
        if "music" in t or "dance" in t or "drama" in t: return "cultural_clubs"
        if "sport" in t: return "sports_clubs"
        if "google form" in t or "join" in t: return "club_registration"
        return "events"
    elif category == "discipline":
        if "ragging" in t: return "anti_ragging"
        if "attendance" in t: return "attendance_policy"
        if "grievance" in t: return "grievance_cell"
        return "code_of_conduct"
    elif category == "contacts":
        if "principal" in t: return "principal"
        if "dean" in t: return "deans"
        if "hod" in t: return "hods"
        if "security" in t: return "security"
        if "emergency" in t or "medical" in t: return "emergency"
        return "offices"
    return "general"


def extract_keywords_from_text(text: str, metadata: dict) -> List[str]:
    """Generates keywords list from content and metadata fields."""
    kw = set()
    # From metadata
    for field in ["category", "department", "section", "heading_title"]:
        val = str(metadata.get(field, "")).lower().strip()
        if val and val != "general":
            kw.add(val)
    # Significant words from content (3+ chars, no stop words)
    stop = {"the", "and", "for", "are", "this", "that", "with", "from",
            "per", "not", "will", "all", "can", "has", "its", "any",
            "was", "been", "have", "but", "they", "their", "our", "you"}
    for word in re.findall(r'\b[a-zA-Z][a-zA-Z0-9_]{2,}\b', text.lower()):
        if word not in stop:
            kw.add(word)
    # Numeric values (fees, percentages)
    for num in re.findall(r'\b\d[\d,]+\b', text):
        kw.add(num.replace(",", ""))
    return list(kw)


def _extract_page_number(text_before: str) -> int:
    """Extracts page number from [Page N] markers in PDF-extracted text."""
    matches = re.findall(r'\[Page (\d+)\]', text_before)
    return int(matches[-1]) if matches else 1


# ---------------------------------------------------------------------------
# Chunker — heading-aware, overlapping, table/list-safe
# ---------------------------------------------------------------------------

def _is_table_line(line: str) -> bool:
    return bool(re.match(r'^\s*\|', line)) or bool(re.match(r'^\s*[-:]+\|', line))


def _is_list_line(line: str) -> bool:
    return bool(re.match(r'^\s*[-*+•]\s', line)) or bool(re.match(r'^\s*\d+\.\s', line))


def _approx_tokens(text: str) -> int:
    """Rough token count ≈ words × 1.3 (handles subword tokens)."""
    return int(len(text.split()) * 1.3)


def chunk_text(
    text: str,
    filename: str = "document.md",
    chunk_size: int = 700,
    chunk_overlap: int = 140,
    # Legacy aliases so old callers still work
    target_tokens: Optional[int] = None,
    overlap_tokens: Optional[int] = None,
) -> List[Dict[str, Any]]:
    """
    Heading-Aware Markdown Chunker with overlapping sliding window.

    Rules:
    - Splits along #, ##, ### section boundaries (never inside a heading)
    - Never splits inside a Markdown table block
    - Never splits inside a contiguous bullet/numbered list block
    - Merges very-small sections (< 80 tokens) with the next section
    - Applies overlap window between consecutive chunks
    - Attaches rich metadata to every chunk
    """
    # Support legacy parameter names
    if target_tokens is not None:
        chunk_size = target_tokens
    if overlap_tokens is not None:
        chunk_overlap = overlap_tokens

    cleaned = clean_text(text)
    if not cleaned:
        return []

    doc_base = filename.split(".")[0]
    category = detect_category(filename, cleaned[:1000])

    # ── Split document into heading-bounded sections ──────────────────────
    raw_sections = re.split(r'\n(?=#{1,3}\s+)', cleaned)
    # Track page numbers alongside sections
    running_text = ""
    sections_with_pages: List[tuple] = []
    for sec in raw_sections:
        page_num = _extract_page_number(running_text)
        sections_with_pages.append((sec.strip(), page_num))
        running_text += sec

    # ── Build preliminary section chunks (merge tiny ones) ────────────────
    merged_sections: List[tuple] = []
    buffer_text = ""
    buffer_page = 1

    for sec_text, page_num in sections_with_pages:
        if not sec_text:
            continue
        # Skip header-only metadata blocks (e.g. > Context Summary:)
        sec_lines = [l.strip() for l in sec_text.split('\n') if l.strip()]
        if all(l.startswith('# ') or l.startswith('>') for l in sec_lines):
            continue

        if buffer_text:
            buffer_text += "\n\n" + sec_text
        else:
            buffer_text = sec_text
            buffer_page = page_num

        if _approx_tokens(buffer_text) >= 80:
            merged_sections.append((buffer_text, buffer_page))
            buffer_text = ""
            buffer_page = page_num

    if buffer_text:
        merged_sections.append((buffer_text, buffer_page))

    # ── Sliding window inside each section (for large sections) ──────────
    chunks: List[Dict[str, Any]] = []
    chunk_counter = 0

    for sec_text, page_num in merged_sections:
        # Extract heading
        heading_match = re.match(r'^(#{1,3}\s+[^\n]+)', sec_text)
        heading_title = heading_match.group(1).strip() if heading_match else f"Section"

        dept = extract_department(sec_text)
        sec_tag = extract_section(category, sec_text)

        sec_tokens = _approx_tokens(sec_text)

        if sec_tokens <= chunk_size:
            # Section fits in one chunk — no splitting needed
            meta = {
                "document": doc_base,
                "document_name": filename,
                "category": category,
                "department": dept,
                "section": sec_tag,
                "subsection": sec_tag,
                "heading_title": heading_title,
                "heading_hierarchy": heading_title,
                "page_number": page_num,
                "paragraph_idx": chunk_counter,
                "version": GLOBAL_VERSION,
                "last_updated": GLOBAL_LAST_UPDATED,
                "chunk_index": 0,
                "total_chunks_in_section": 1,
            }
            kw = extract_keywords_from_text(sec_text, meta)
            chunks.append({
                "content": sec_text,
                "metadata": meta,
                "keywords": kw,
            })
            chunk_counter += 1
        else:
            # Large section — apply sliding-window paragraph-safe split
            lines = sec_text.split('\n')
            window: List[str] = []
            window_tokens = 0
            sub_idx = 0
            i = 0

            while i < len(lines):
                line = lines[i]

                # Detect table block — collect entirely
                if _is_table_line(line):
                    table_lines = []
                    while i < len(lines) and (_is_table_line(lines[i]) or not lines[i].strip()):
                        table_lines.append(lines[i])
                        i += 1
                    block = "\n".join(table_lines)
                    window.append(block)
                    window_tokens += _approx_tokens(block)
                    continue

                # Detect list block — collect entirely
                if _is_list_line(line):
                    list_lines = []
                    while i < len(lines) and (_is_list_line(lines[i]) or (lines[i].strip() and lines[i].startswith(" "))):
                        list_lines.append(lines[i])
                        i += 1
                    block = "\n".join(list_lines)
                    window.append(block)
                    window_tokens += _approx_tokens(block)
                    continue

                window.append(line)
                window_tokens += _approx_tokens(line)
                i += 1

                if window_tokens >= chunk_size:
                    chunk_content = "\n".join(window).strip()
                    if chunk_content:
                        meta = {
                            "document": doc_base,
                            "document_name": filename,
                            "category": category,
                            "department": dept,
                            "section": sec_tag,
                            "subsection": sec_tag,
                            "heading_title": heading_title,
                            "heading_hierarchy": heading_title,
                            "page_number": page_num,
                            "paragraph_idx": chunk_counter,
                            "version": GLOBAL_VERSION,
                            "last_updated": GLOBAL_LAST_UPDATED,
                            "chunk_index": sub_idx,
                            "total_chunks_in_section": -1,  # filled in post-pass
                        }
                        kw = extract_keywords_from_text(chunk_content, meta)
                        chunks.append({
                            "content": chunk_content,
                            "metadata": meta,
                            "keywords": kw,
                        })
                        chunk_counter += 1
                        sub_idx += 1

                    # Overlap: keep last overlap_tokens worth of lines
                    overlap_lines: List[str] = []
                    overlap_count = 0
                    for wl in reversed(window):
                        wl_tok = _approx_tokens(wl)
                        if overlap_count + wl_tok > chunk_overlap:
                            break
                        overlap_lines.insert(0, wl)
                        overlap_count += wl_tok
                    window = overlap_lines
                    window_tokens = overlap_count

            # Flush remaining window
            if window:
                chunk_content = "\n".join(window).strip()
                if chunk_content and _approx_tokens(chunk_content) > 20:
                    meta = {
                        "document": doc_base,
                        "document_name": filename,
                        "category": category,
                        "department": dept,
                        "section": sec_tag,
                        "subsection": sec_tag,
                        "heading_title": heading_title,
                        "heading_hierarchy": heading_title,
                        "page_number": page_num,
                        "paragraph_idx": chunk_counter,
                        "version": GLOBAL_VERSION,
                        "last_updated": GLOBAL_LAST_UPDATED,
                        "chunk_index": sub_idx,
                        "total_chunks_in_section": -1,
                    }
                    kw = extract_keywords_from_text(chunk_content, meta)
                    chunks.append({
                        "content": chunk_content,
                        "metadata": meta,
                        "keywords": kw,
                    })
                    chunk_counter += 1

    return chunks


# ---------------------------------------------------------------------------
# Embedding generation
# ---------------------------------------------------------------------------

_embedding_model = None

def get_embedding_model():
    """Lazy-loads the embedding model (cached singleton)."""
    global _embedding_model
    if _embedding_model is None:
        import os
        is_render = os.environ.get("RENDER") == "true" or os.environ.get("DISABLE_LOCAL_MODEL") == "true"
        if is_render:
            logger.warning("[EMBEDDING] Render environment: skipping local model loading to save RAM.")
            raise RuntimeError("Local model loading is disabled in production on Render.")
        from sentence_transformers import SentenceTransformer
        _embedding_model = SentenceTransformer("BAAI/bge-small-en-v1.5")
    return _embedding_model

def generate_embeddings(texts: List[str]) -> List[List[float]]:
    """Generates 384-dim vector embeddings.
    In production/Render, it uses remote hosted APIs (Hugging Face serverless or Google Gemini Embeddings)
    to keep container RAM footprint under 100MB.
    """
    import os
    import requests
    from backend.config import settings

    is_render = os.environ.get("RENDER") == "true" or os.environ.get("DISABLE_LOCAL_MODEL") == "true"

    if is_render:
        logger.info(f"[EMBEDDING] Render detected. Requesting remote embeddings for {len(texts)} texts...")
        # 1. Try Hugging Face Inference API for BAAI/bge-small-en-v1.5 (dimension 384)
        try:
            hf_url = "https://api-inference.huggingface.co/models/BAAI/bge-small-en-v1.5"
            headers = {}
            hf_token = os.environ.get("HF_TOKEN") or getattr(settings, "HF_TOKEN", None)
            if hf_token:
                headers["Authorization"] = f"Bearer {hf_token}"
            
            embeddings = []
            for text in texts:
                resp = requests.post(hf_url, json={"inputs": text}, headers=headers, timeout=10)
                if resp.status_code == 200:
                    val = resp.json()
                    if isinstance(val, list) and len(val) > 0:
                        if isinstance(val[0], list):
                            embeddings.append(val[0])
                        else:
                            embeddings.append(val)
                    else:
                        raise ValueError(f"Unexpected HF response format: {val}")
                else:
                    raise RuntimeError(f"HF API returned status {resp.status_code}: {resp.text}")
            
            if len(embeddings) == len(texts) and len(embeddings[0]) == 384:
                logger.info("[EMBEDDING SUCCESS] Retrieved 384-dim BGE embeddings from Hugging Face.")
                return embeddings
        except Exception as hf_err:
            logger.warning(f"[EMBEDDING] Hugging Face Inference API failed: {hf_err}. Trying Google Gemini Embeddings...")

        # 2. Try Google Gemini embedding-001 API with dimension 384
        try:
            api_key = getattr(settings, "GEMINI_API_KEY", "")
            if api_key and "your-gemini-api-key" not in api_key:
                import google.generativeai as genai
                genai.configure(api_key=api_key)
                
                embeddings = []
                for text in texts:
                    res = genai.embed_content(
                        model="models/gemini-embedding-001",
                        content=text,
                        task_type="retrieval_query",
                        output_dimensionality=384
                    )
                    embeddings.append(res["embedding"])
                
                if len(embeddings) == len(texts) and len(embeddings[0]) == 384:
                    logger.info("[EMBEDDING SUCCESS] Generated 384-dim embeddings from Google Gemini API.")
                    return embeddings
            else:
                raise ValueError("No valid GEMINI_API_KEY configured for Google Embeddings.")
        except Exception as google_err:
            logger.error(f"[EMBEDDING FAILURE] Remote Google embeddings also failed: {google_err}")

    # 3. Fallback to local model (only if not on Render or if remote failed)
    try:
        model = get_embedding_model()
        embeddings = model.encode(texts, normalize_embeddings=True, show_progress_bar=False)
        return embeddings.tolist()
    except Exception as e:
        logger.warning(f"[EMBEDDING] Local model failed/triggered: {e}. Using deterministic string hashing.")
        embeddings = []
        dim = 384
        for text in texts:
            vec = [0.0] * dim
            for idx, word in enumerate(text.lower().split()):
                h = sum(ord(c) for c in word)
                vec[(h + idx) % dim] += 1.0
            norm = math.sqrt(sum(v * v for v in vec)) or 1.0
            embeddings.append([v / norm for v in vec])
        return embeddings


# ---------------------------------------------------------------------------
# ChromaDB storage
# ---------------------------------------------------------------------------

def store_in_chromadb(
    doc_id: str,
    filename: str,
    chunks: List[Dict[str, Any]],
    embeddings: List[List[float]],
    category: str = "general",
):
    """Stores chunk vectors & metadata into ChromaDB, replacing stale vectors."""
    try:
        collection = get_chroma_collection("campusiq_knowledge_store")
        doc_base = filename.split(".")[0]

        # Delete old vectors for this document to avoid stale duplicates
        try:
            collection.delete(where={"document": doc_base})
        except Exception as del_err:
            logger.debug(f"ChromaDB delete old chunks info: {del_err}")

        ids = [f"{doc_id}_chunk_{idx}" for idx in range(len(chunks))]
        documents = [c["content"] for c in chunks]
        # ChromaDB metadatas must be flat dicts with str/int/float/bool values
        metadatas = []
        for c in chunks:
            flat_meta = {}
            for k, v in c["metadata"].items():
                if isinstance(v, (str, int, float, bool)):
                    flat_meta[k] = v
                else:
                    flat_meta[k] = str(v)
            # Store keywords as comma-separated string
            flat_meta["keywords_str"] = ",".join(c.get("keywords", []))
            metadatas.append(flat_meta)

        collection.add(
            ids=ids,
            documents=documents,
            embeddings=embeddings,
            metadatas=metadatas,
        )
        logger.info(f"Stored {len(chunks)} chunks for '{filename}' in ChromaDB.")
        try:
            from backend.rag.retrieval import invalidate_active_chunks_cache
            invalidate_active_chunks_cache()
            logger.info("Invalidated active chunks cache.")
        except Exception as cache_err:
            logger.warning(f"Failed to invalidate active chunks cache: {cache_err}")
    except Exception as err:
        logger.warning(f"ChromaDB storage error for {filename}: {err}")


# ---------------------------------------------------------------------------
# Indexing audit report
# ---------------------------------------------------------------------------

def audit_chromadb() -> Dict[str, Any]:
    """
    Performs a complete audit of the ChromaDB vector store.
    Returns a structured indexing report.
    """
    report: Dict[str, Any] = {
        "total_vectors": 0,
        "documents_indexed": [],
        "chunks_per_document": {},
        "embedding_dimensions": 384,
        "failures": [],
        "status": "ok",
    }

    try:
        collection = get_chroma_collection("campusiq_knowledge_store")
        result = collection.get(include=["metadatas", "embeddings"])

        ids = result.get("ids") if result.get("ids") is not None else []
        metadatas = result.get("metadatas") if result.get("metadatas") is not None else []
        embeddings = result.get("embeddings") if result.get("embeddings") is not None else []

        report["total_vectors"] = len(ids)

        docs_seen: Dict[str, int] = {}
        zero_embeddings = 0

        for i, (cid, meta) in enumerate(zip(ids, metadatas)):
            doc = (meta or {}).get("document", "unknown")
            docs_seen[doc] = docs_seen.get(doc, 0) + 1

            # Check for zero/null embeddings
            if embeddings is not None and len(embeddings) > 0 and i < len(embeddings):
                emb = embeddings[i]
                if emb is None:
                    zero_embeddings += 1
                elif hasattr(emb, "__len__") and len(emb) > 0:
                    try:
                        import numpy as np
                        if isinstance(emb, np.ndarray):
                            if not np.any(emb):
                                zero_embeddings += 1
                        elif all(v == 0.0 for v in emb):
                            zero_embeddings += 1
                    except Exception:
                        pass

        report["documents_indexed"] = sorted(docs_seen.keys())
        report["chunks_per_document"] = docs_seen
        report["total_documents"] = len(docs_seen)

        if zero_embeddings > 0:
            report["failures"].append(f"{zero_embeddings} zero/null embeddings detected")
            report["status"] = "warning"

    except Exception as e:
        report["status"] = "error"
        report["failures"].append(str(e))

    return report
