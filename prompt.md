# CampusIQ – Master Implementation Prompts Guide (`prompt.md`)

This file contains step-by-step, production-grade AI developer prompts for executing and implementing each of the 10 modules of **CampusIQ – AI-Powered College Knowledge Assistant**.

---

## Table of Contents
1. [Module 1: Authentication & User Management Prompt](#module-1-authentication--user-management)
2. [Module 2: Landing Page & Public Discovery Prompt](#module-2-landing-page--public-discovery)
3. [Module 3: Chat Interface & Conversational UI Prompt](#module-3-chat-interface--conversational-ui)
4. [Module 4: Conversation History & Memory Management Prompt](#module-4-conversation-history--memory-management)
5. [Module 5: Document Upload & Processing Ingestion Pipeline Prompt](#module-5-document-upload--processing-ingestion-pipeline)
6. [Module 6: Knowledge Base & Vector Database Management Prompt](#module-6-knowledge-base--vector-database-management)
7. [Module 7: RAG Search & Retrieval Engine Prompt](#module-7-rag-search--retrieval-engine)
8. [Module 8: Analytics & System Performance Monitoring Prompt](#module-8-analytics--system-performance-monitoring)
9. [Module 9: Admin Dashboard & System Governance Prompt](#module-9-admin-dashboard--system-governance)
10. [Module 10: Deployment, Infrastructure & Security Prompt](#module-10-deployment-infrastructure--security)

---

## Module 1: Authentication & User Management

### Implementation Prompt: Module 1
```markdown
# TASK: Implement Module 1 - Authentication & User Management for CampusIQ

## OBJECTIVE:
Build a complete, production-grade Authentication & User Management module for CampusIQ using Supabase Auth, Next.js 15 App Router, and FastAPI backend middleware. Support multi-tenant college roles: `student`, `parent`, `faculty`, and `administrator`.

## TECHNICAL STACK & REQUIREMENTS:
- **Frontend:** Next.js 15 (App Router), TypeScript, `@supabase/ssr`, Tailwind CSS, Shadcn UI, Lucide React icons.
- **Design System Rules (from design.md):**
  - Font: `Space Grotesk` (Headings) + `DM Sans` (Body).
  - Primary color: `#7C3AED`, Accent: `#EC4899`, Background: `#FAF5FF`.
  - Iconography: Lucide React SVG icons ONLY. NO EMOJIS AS ICONS.
  - Interactivity: `cursor: pointer` on all buttons/inputs, 150-200ms ease transitions, visible focus ring (`#7C3AED`).
- **Backend:** FastAPI, `supabase-py` SDK, PyJWT, Python 3.11+.
- **Database:** Supabase PostgreSQL `users` table synced with Supabase Auth `auth.users`.

## STEP-BY-STEP IMPLEMENTATION INSTRUCTIONS:

### Step 1: Database Setup & Migration
1. Create Supabase PostgreSQL migration for `users` table:
   ```sql
   CREATE TYPE user_role AS ENUM ('student', 'parent', 'faculty', 'administrator');

   CREATE TABLE public.users (
     id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
     name TEXT NOT NULL,
     email TEXT UNIQUE NOT NULL,
     role user_role NOT NULL DEFAULT 'student',
     created_at TIMESTAMPTZ DEFAULT NOW(),
     updated_at TIMESTAMPTZ DEFAULT NOW()
   );
   ```
2. Create trigger to automatically insert a row into `public.users` upon Supabase Auth sign-up.
3. Configure Row Level Security (RLS) policies allowing users to read/update their own profile and Admins to read all profiles.

### Step 2: Backend Auth Middleware (FastAPI)
1. Create `backend/api/auth.py` with endpoints:
   - `POST /auth/signup` -> Validates request, creates Supabase user, sets custom metadata role.
   - `POST /auth/login` -> Verifies email/password, returns JWT token + user profile payload.
   - `POST /auth/logout` -> Revokes active session token.
   - `GET /auth/me` -> Validates Bearer JWT header and returns active profile & role.
2. Implement dependency `get_current_user` in `backend/utils/security.py` that parses Supabase JWT tokens and enforces role restrictions (`require_role('administrator')`).

### Step 3: Frontend Auth Pages & Components
1. Create Supabase browser & server clients in `frontend/lib/supabase/`:
   - `client.ts` (`createBrowserClient`)
   - `server.ts` (`createServerClient`)
2. Build Auth Layout & Pages:
   - `frontend/app/(auth)/login/page.tsx`
   - `frontend/app/(auth)/register/page.tsx`
3. Design Split-Screen Auth UI:
   - **Left Panel:** CampusIQ showcase card depicting indexed campus policies, glowing stats, and `#7C3AED` gradient fill.
   - **Right Panel:** Clean form with email input, password field (with eye icon toggle), role selector dropdown (`Student`, `Parent`, `Faculty`, `Administrator`), and error alert state.
4. Implement protected route middleware in `frontend/middleware.ts`:
   - Protect `/chat` -> Redirect unauthenticated users to `/login`.
   - Protect `/dashboard` -> Redirect non-admin users to `/chat`.

## VERIFICATION & DEFINITION OF DONE:
- [ ] User registration dispatches verification email and creates row in `public.users`.
- [ ] Login returns valid JWT and redirects based on user role.
- [ ] Protected route middleware blocks unauthorized access to `/dashboard`.
- [ ] Zero emojis used; all icons from Lucide React; 100% compliant with `design.md`.
```

---

## Module 2: Landing Page & Public Discovery

### Implementation Prompt: Module 2
```markdown
# TASK: Implement Module 2 - Landing Page & Public Discovery for CampusIQ

## OBJECTIVE:
Build a modern, high-converting Landing Page for CampusIQ that introduces students, parents, faculty, and administrators to the AI College Assistant. Include an interactive query sandbox, feature grid, animated RAG pipeline architecture diagram, and FAQ accordion.

## TECHNICAL STACK & DESIGN SYSTEM:
- **Framework:** Next.js 15, React 19, Tailwind CSS, Framer Motion, Lucide React icons.
- **Design System:** Space Grotesk (Headings), DM Sans (Body), `#7C3AED` Primary, `#EC4899` Accent, `#FAF5FF` Canvas background.
- **Rules:** No layout shifts, 150-200ms transitions, Lucide React SVG icons exclusively, WCAG AAA 4.5:1 text contrast.

## STEP-BY-STEP IMPLEMENTATION INSTRUCTIONS:

### Step 1: Global Sticky Glassmorphic Navigation Header
1. Create `frontend/components/landing/Header.tsx`:
   - Brand logo (CampusIQ Crest with glowing green status dot "System Online").
   - Navigation links: "Features", "RAG Pipeline", "Live Demo", "FAQ".
   - Theme toggle & Auth CTA buttons ("Sign In" ghost button, "Access Assistant" `#EC4899` primary pill button).

### Step 2: Hero Section & Interactive Micro-Demo Sandbox
1. Create `frontend/components/landing/Hero.tsx`:
   - Value prop badge: `"Instant Answers from Official College Documents"`.
   - Main headline with `#7C3AED` to `#EC4899` dual-tone gradient fill (*"Your AI Campus Knowledge Assistant"*).
   - Dual CTAs: "Ask CampusIQ Now" (`/chat`), "Admin Portal" (`/dashboard`).
2. Build Interactive Micro-Demo Sandbox component (`frontend/components/landing/DemoSandbox.tsx`):
   - Sample prompt chips: *"What is the hostel fee structure?"*, *"When do mid-term exams start?"*, *"Library opening hours"*.
   - Clicking a chip or typing a prompt simulates a instant RAG query response with grounded text and inline citation tags `[Hostel_Rules.pdf - Page 4]`.

### Step 3: Feature Showcase & RAG Architecture Pipeline
1. Create `frontend/components/landing/FeaturesGrid.tsx`:
   - 3x3 responsive grid featuring cards for PDF Parsing, Vector Similarity Search, Conversational Memory, Direct Citations, Role Governance, and Real-Time Analytics.
2. Create `frontend/components/landing/PipelineDiagram.tsx`:
   - Animated step-by-step Framer Motion diagram depicting document ingestion (PDF -> Text Extraction -> Chunking -> BAAI Embeddings -> ChromaDB) and retrieval flow (Question -> Gemini 2.5 Flash -> Grounded Output).

### Step 4: Persona Benefits & FAQ Accordion Section
1. Create `frontend/components/landing/PersonaTabs.tsx`:
   - Tabbed view switching content for **Students**, **Parents**, **Faculty**, and **Administrators**.
2. Create `frontend/components/landing/FAQ.tsx`:
   - Expandable single-column accordion answering security, document accuracy, and platform setup questions.
3. Build Footer (`frontend/components/landing/Footer.tsx`) with copyright, links, and system health badge.

## VERIFICATION & DEFINITION OF DONE:
- [ ] Landing page renders cleanly at 375px, 768px, 1024px, and 1440px viewports with zero horizontal scroll.
- [ ] Interactive demo sandbox executes sample query simulations with citation pills.
- [ ] Lucide React SVG icons used exclusively. All clickable elements enforce `cursor: pointer`.
```

---

## Module 3: Chat Interface & Conversational UI

### Implementation Prompt: Module 3
```markdown
# TASK: Implement Module 3 - Chat Interface & Conversational UI for CampusIQ

## OBJECTIVE:
Build the primary Chat Interface for CampusIQ where students, parents, and faculty interact with the AI assistant. Implement a ChatGPT-style canvas, real-time Server-Sent Events (SSE) token streaming, markdown/code rendering, preset prompt quick chips, auto-expanding input pod, and interactive citation tags.

## TECHNICAL STACK & COMPONENTS:
- **Frontend:** Next.js 15, React, Tailwind CSS, Framer Motion, `react-markdown`, `syntax-highlighter`, Lucide React icons.
- **Backend:** FastAPI, SSE (`sse-starlette` / `StreamingResponse`), Gemini 2.5 Flash SDK (`google-genai`).
- **Design Specifications:** Centered chat stream container (`max-w-[800px]`), `#7C3AED` user message bubbles (right-aligned), left-aligned AI answer blocks with gradient avatar, citation pills, slide-over drawer trigger.

## STEP-BY-STEP IMPLEMENTATION INSTRUCTIONS:

### Step 1: Chat Stream Layout & State Architecture
1. Create `frontend/app/(workspace)/chat/page.tsx` & `frontend/components/chat/ChatCanvas.tsx`:
   - Top Header Bar: Conversation title, Knowledge Base indicator (*"48 Official Documents"*), Model badge (*"Gemini 2.5 Flash"*), Mobile drawer trigger.
   - Message Stream Container: Auto-scrolling list of conversation messages.
2. Build Empty State Screen (`frontend/components/chat/EmptyChatState.tsx`):
   - Welcome title (*"Hello! Ask me anything about university regulations, courses, fees, or events."*).
   - 4 Quick Prompt Suggestion Chips (*"Hostel Fee Rules"*, *"Academic Calendar 2026"*, *"Exam Syllabus"*, *"Placement Statistics"*).

### Step 2: Real-Time SSE Token Streaming Endpoint (FastAPI)
1. Create `backend/api/chat.py` with endpoint `POST /chat/message`:
   - Ingests user prompt, `chat_id`, and past conversation history.
   - Triggers RAG Retrieval Engine (Module 7) to fetch Top 5 context chunks from ChromaDB (similarity >= 0.75).
   - Augments system prompt for Gemini 2.5 Flash.
   - Yields Server-Sent Events (SSE) stream of text tokens to the frontend.
   - Appends final citation metadata array to the end of the stream payload.

### Step 3: Stream Consumer & Auto-Expanding Input Pod
1. Implement custom React hook `useChatStream` in `frontend/hooks/useChatStream.ts`:
   - Handles optimistic message insertion, SSE stream consumption, and live state updates.
2. Create `frontend/components/chat/ChatInputPod.tsx`:
   - Auto-expanding textarea (44px min height to 200px max height).
   - Keydown handler: `Enter` to submit, `Shift+Enter` for multi-line newline.
   - Action row: Attachment button, clear conversation trigger, token count, and `#EC4899` send button.

### Step 4: Markdown Rendering & Right Citation Drawer Trigger
1. Create `frontend/components/chat/MessageBubble.tsx`:
   - User message: Right-aligned `#7C3AED` bubble with white text.
   - AI response: Left-aligned markdown container with list formatting, code highlight blocks, Copy button, and Citation Badges.
2. Create Citation Pill component (`frontend/components/chat/CitationBadge.tsx`):
   - Displays `[Doc Name - Page X]` with a similarity score indicator dot.
   - Click handler opens the Right Citation Drawer (Module 7).

## VERIFICATION & DEFINITION OF DONE:
- [ ] User query optimistically appends and triggers SSE token streaming.
- [ ] Streaming output displays token-by-token with typing indicator and zero flicker.
- [ ] Markdown lists, bold text, and code snippets render cleanly.
- [ ] Clicking citation tags triggers the Right Citation Drawer with verbatim chunk source.
```

---

## Module 4: Conversation History & Memory Management

### Implementation Prompt: Module 4
```markdown
# TASK: Implement Module 4 - Conversation History & Memory Management for CampusIQ

## OBJECTIVE:
Build multi-turn conversation memory and past session management. Implement a collapsible sidebar showing past chat sessions categorized chronologically, search filtering, session title auto-generation, multi-turn memory context building for RAG queries, and session deletion.

## TECHNICAL STACK & DATABASE:
- **Frontend:** Next.js 15, Framer Motion, Lucide React icons, Tailwind CSS.
- **Backend:** FastAPI, Supabase PostgreSQL `chats` & `messages` tables.
- **Design System:** 260px fixed width left sidebar (`#FAF5FF` background, `#EFE7FC` right border), dark mode support, smooth slide-in sheet for mobile.

## STEP-BY-STEP IMPLEMENTATION INSTRUCTIONS:

### Step 1: Database Schema & API Endpoints
1. Create Supabase PostgreSQL migrations:
   ```sql
   CREATE TABLE public.chats (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
     title TEXT NOT NULL DEFAULT 'New Conversation',
     last_message_at TIMESTAMPTZ DEFAULT NOW(),
     created_at TIMESTAMPTZ DEFAULT NOW(),
     updated_at TIMESTAMPTZ DEFAULT NOW()
   );

   CREATE TABLE public.messages (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     chat_id UUID NOT NULL REFERENCES public.chats(id) ON DELETE CASCADE,
     sender_type TEXT NOT NULL CHECK (sender_type IN ('user', 'assistant')),
     content TEXT NOT NULL,
     sources JSONB DEFAULT '[]'::jsonb,
     created_at TIMESTAMPTZ DEFAULT NOW()
   );
   ```
2. Create FastAPI history endpoints in `backend/api/history.py`:
   - `GET /chat/history` -> Returns chronologically grouped chat sessions for active user.
   - `GET /chat/history/{chat_id}` -> Returns all messages for a specific session.
   - `PATCH /chat/history/{chat_id}` -> Updates thread title.
   - `DELETE /chat/history/{chat_id}` -> Deletes chat session and cascades message deletion.

### Step 2: Collapsible History Sidebar Component
1. Create `frontend/components/chat/SidebarHistory.tsx`:
   - Top Header: "New Chat" button (`⌘K` shortcut), history search input.
   - Grouped List: Sections for "Today", "Yesterday", "Previous 7 Days", and "Older".
   - Active Thread Item: `#7C3AED` background tint, active indicator bar, hover actions (Rename, Delete).
   - Footer: User profile info, persona badge (`Student` / `Faculty` / `Admin`), Logout trigger.

### Step 3: Multi-Turn Memory Integration in RAG Pipeline
1. Update RAG Context Builder in `backend/rag/prompt_builder.py`:
   - Fetches the last 5 conversation turn pairs (User prompt + Assistant response) for the active `chat_id`.
   - Formats history context into Gemini 2.5 Flash prompt to resolve multi-turn coreferences (e.g., *"Who is the principal?"* -> *"What is his qualification?"*).
2. Auto-generate conversation title after initial message using Gemini 2.5 Flash background task.

## VERIFICATION & DEFINITION OF DONE:
- [ ] Sidebar loads past conversations categorized by timeframe.
- [ ] Selecting a past chat thread loads the full message history canvas.
- [ ] Multi-turn questions successfully resolve pronoun references using past message memory.
- [ ] Deleting a chat thread purges data in PostgreSQL and removes the item from the sidebar.
```

---

## Module 5: Document Upload & Processing Ingestion Pipeline

### Implementation Prompt: Module 5
```markdown
# TASK: Implement Module 5 - Document Upload & Ingestion Pipeline for CampusIQ

## OBJECTIVE:
Build an automated document ingestion pipeline for Administrators. Implement a Drag-and-Drop Dropzone, format/size validation (`.pdf`, `.docx`, `.txt` < 25MB), text extraction, sentence-aware chunking (800 chars / 150 overlap), `BAAI/bge-small-en-v1.5` embedding generation, and persistent vector indexing in ChromaDB.

## TECHNICAL STACK:
- **Frontend:** Next.js 15, Shadcn UI Progress, Lucide React icons, Tailwind CSS.
- **Backend:** FastAPI, `pypdf`, `python-docx`, `sentence-transformers`, `chromadb`, Supabase Storage SDK.
- **Design System:** Dotted double border dropzone (`border-2 border-dashed border-border`), `#7C3AED` drag hover state, 4-stage progress stepper.

## STEP-BY-STEP IMPLEMENTATION INSTRUCTIONS:

### Step 1: Ingestion API & Storage Setup (FastAPI)
1. Create Supabase Storage bucket `campus-documents` with RLS policies restricting write access to `administrator` role.
2. Create `documents` table in Supabase PostgreSQL:
   ```sql
   CREATE TABLE public.documents (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     filename TEXT NOT NULL,
     file_url TEXT NOT NULL,
     file_size INTEGER NOT NULL,
     file_type TEXT NOT NULL,
     total_chunks INTEGER DEFAULT 0,
     uploaded_by UUID REFERENCES public.users(id),
     status TEXT NOT NULL CHECK (status IN ('uploading', 'processing', 'indexed', 'failed')),
     error_message TEXT,
     uploaded_at TIMESTAMPTZ DEFAULT NOW()
   );
   ```
3. Create `backend/ingestion/pipeline.py`:
   - `extract_text(file)`: Parses PDF/DOCX/TXT text into raw string.
   - `clean_text(text)`: Normalizes whitespace, removes control characters.
   - `chunk_text(text, chunk_size=800, chunk_overlap=150)`: Splits text into sentence-aware overlapping chunks.
   - `generate_embeddings(chunks)`: Runs `BAAI/bge-small-en-v1.5` model to output 384-dim vector embeddings.
   - `store_in_chromadb(chunks, embeddings, metadata)`: Writes vector embeddings and text metadata to ChromaDB collection `campusiq_knowledge_store`.

### Step 2: Upload API & Ingestion Endpoint
1. Create `backend/api/upload.py` with endpoint `POST /ingestion/upload`:
   - Receives multi-part file upload, verifies file format and 25MB size limit.
   - Executes background ingestion task while returning live progress status.
2. Create `GET /ingestion/status/{job_id}` for progress tracking.

### Step 3: Frontend Drag-and-Drop Ingestion UI
1. Create `frontend/app/(workspace)/dashboard/upload/page.tsx`:
   - **Dropzone Container:** Drag-over scaling (`scale-1.01`), `#7C3AED10` background tint, drop file trigger.
   - **Multi-Stage Progress Stepper:**
     - Stage 1: Uploading to Storage
     - Stage 2: Text Extraction & Cleaning
     - Stage 3: Text Chunking (800 chars / 150 overlap)
     - Stage 4: Embedding & Vector Store Indexing
   - **Ingestion Table:** Directory displaying recent uploads, file sizes, chunk counts, and status badges.

## VERIFICATION & DEFINITION OF DONE:
- [ ] Admin drops a 10-page PDF into the dropzone.
- [ ] Stepper advances through all 4 stages without blocking UI thread.
- [ ] Text is extracted, split into ~800-char chunks, embedded, and stored in ChromaDB.
- [ ] Success toast notification pops up and document directory table auto-refreshes.
```

---

## Module 6: Knowledge Base & Vector Database Management

### Implementation Prompt: Module 6
```markdown
# TASK: Implement Module 6 - Knowledge Base & Vector Database Management for CampusIQ

## OBJECTIVE:
Build an administrative governance workspace to manage indexed college knowledge. Provide a document directory inventory table, text chunk inspector modal, manual re-indexing engine, vector store purge functionality, and ChromaDB health status monitoring.

## TECHNICAL STACK:
- **Frontend:** Next.js 15, Shadcn UI Data Table, Modal Dialogs, Lucide React icons, Tailwind CSS.
- **Backend:** FastAPI, ChromaDB Python Client (`chromadb.PersistentClient`), Supabase SDK.
- **Design System:** Space Grotesk section titles, DM Sans data tables, monospace chunk inspector, `#DC2626` destructive actions.

## STEP-BY-STEP IMPLEMENTATION INSTRUCTIONS:

### Step 1: Knowledge Base API Endpoints (FastAPI)
1. Create `backend/api/knowledge.py` with endpoints:
   - `GET /knowledge/documents` -> List all indexed documents with chunk count, file size, uploader, and status.
   - `GET /knowledge/documents/{id}/chunks` -> Retrieve text chunks and vector IDs for a specific document.
   - `POST /knowledge/reindex/{id}` -> Re-runs text extraction, chunking, and embedding generation for a document.
   - `DELETE /knowledge/documents/{id}` -> Removes document metadata from PostgreSQL, deletes storage file from Supabase Storage, and purges vector embeddings from ChromaDB.
   - `GET /knowledge/stats` -> Returns total collection vector count, memory usage, and ChromaDB connection status.

### Step 2: Knowledge Base Directory Table Component
1. Create `frontend/app/(workspace)/dashboard/knowledge/page.tsx`:
   - Header: Knowledge Base Title, Total Indexed Vector Count badge, "Purge Collection" emergency trigger.
   - Data Table Columns:
     - Document Title (with PDF file-type icon badge)
     - Total Chunks (Monospace badge e.g. `142 chunks`)
     - File Size (e.g. `2.4 MB`)
     - Upload Date & Admin Uploader
     - Actions: "Inspect Chunks" button, "Re-index" button, "Delete" red icon.

### Step 3: Chunk Inspector Modal & Delete Confirmation
1. Create `frontend/components/dashboard/ChunkInspectorModal.tsx`:
   - Displays scrollable list of document chunks (Chunk #1 to #N).
   - Displays character count, token estimate, and verbatim extracted text in a monospace container.
2. Create `frontend/components/dashboard/DeleteDocumentModal.tsx`:
   - Confirmation dialog warning admin that document file, metadata, and ChromaDB vector embeddings will be permanently deleted.

## VERIFICATION & DEFINITION OF DONE:
- [ ] Knowledge Base directory lists all uploaded documents with real-time vector chunk counts.
- [ ] Inspect Chunks modal renders verbatim text chunks extracted from ChromaDB.
- [ ] Deleting a document removes its file from Supabase Storage and purges vectors from ChromaDB.
- [ ] System handles ChromaDB offline state gracefully with an alert banner.
```

---

## Module 7: RAG Search & Retrieval Engine

### Implementation Prompt: Module 7
```markdown
# TASK: Implement Module 7 - RAG Search & Retrieval Engine for CampusIQ

## OBJECTIVE:
Build the core RAG Search & Retrieval Engine for CampusIQ. Implement question vectorization via `BAAI/bge-small-en-v1.5`, Cosine Similarity search in ChromaDB (Top K = 5, cutoff score >= 0.75), strict grounded prompt construction, Gemini 2.5 Flash execution, and citation mapping to the Right Citation Drawer.

## TECHNICAL STACK:
- **Backend:** FastAPI, `sentence-transformers`, `chromadb`, `google-genai` (Gemini 2.5 Flash).
- **Frontend:** Next.js 15, Framer Motion, Lucide React icons, Tailwind CSS.
- **Design System:** Right Citation Drawer (360px slide-over panel), highlighted search terms, emerald green match score dots (`#10B981`).

## STEP-BY-STEP IMPLEMENTATION INSTRUCTIONS:

### Step 1: Retrieval Pipeline Engine (FastAPI)
1. Create `backend/rag/retriever.py`:
   - `vectorize_query(query)`: Converts user text query into 384-dim vector embedding using BAAI model.
   - `search_chromadb(query_vector, top_k=5, min_score=0.75)`: Performs Cosine Similarity search against `campusiq_knowledge_store` collection. Returns top matching chunks with similarity scores.
2. Create `backend/rag/prompt_builder.py`:
   - Constructs strict system prompt enforcing grounded answers:
     ```text
     You are CampusIQ, an AI assistant for college knowledge.
     Answer ONLY using the provided context below.
     If the answer cannot be found, respond with:
     "I couldn't find that information in the uploaded official college documents."
     Always mention the source document title.

     Context:
     {retrieved_chunks}

     Question:
     {user_question}
     ```

### Step 2: Citation Mapper & API Integration
1. Create `backend/rag/citation_mapper.py`:
   - Maps each retrieved chunk used in the answer to structured citation objects: `document_id`, `filename`, `page_number`, `similarity_score`, `chunk_content`.
2. Connect retrieval pipeline to `POST /chat/message` (Module 3).

### Step 3: Right Citation Drawer Component (Frontend)
1. Create `frontend/components/chat/RightCitationDrawer.tsx`:
   - Slide-over panel (360px width) triggered when user clicks a citation badge `[Doc Title - Page X]`.
   - Header: Document title, page reference, similarity score pill (`94% Match`).
   - Content Body: Verbatim text chunk retrieved from ChromaDB with query search terms highlighted in yellow/indigo.
   - Action: "Download Full Document" button linking to Supabase Storage.

## VERIFICATION & DEFINITION OF DONE:
- [ ] User query triggers BAAI vectorization and retrieves Top 5 chunks from ChromaDB.
- [ ] Queries matching documents with score < 0.75 trigger the strict fallback response.
- [ ] Clicking a citation tag opens the Right Citation Drawer with verbatim source text.
```

---

## Module 8: Analytics & System Performance Monitoring

### Implementation Prompt: Module 8
```markdown
# TASK: Implement Module 8 - Analytics & System Performance Monitoring for CampusIQ

## OBJECTIVE:
Build an Analytics & Performance Monitoring dashboard for Administrators. Track daily query volume trends, latency distributions (Embedding, Search, LLM), top asked campus topics, most cited college documents, and unanswered query logs.

## TECHNICAL STACK:
- **Frontend:** Next.js 15, Recharts / Tremor / Chart.js, Lucide React icons, Tailwind CSS.
- **Backend:** FastAPI, Supabase PostgreSQL `analytics_logs` table.
- **Design System:** Responsive 2x2 grid, Space Grotesk chart headers, `#7C3AED` area charts, `#EC4899` bar charts.

## STEP-BY-STEP IMPLEMENTATION INSTRUCTIONS:

### Step 1: Analytics Logging Database Schema & API
1. Create Supabase PostgreSQL migration:
   ```sql
   CREATE TABLE public.analytics_logs (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     user_id UUID REFERENCES public.users(id),
     chat_id UUID REFERENCES public.chats(id),
     query_text TEXT NOT NULL,
     retrieval_latency_ms FLOAT NOT NULL,
     llm_latency_ms FLOAT NOT NULL,
     total_latency_ms FLOAT NOT NULL,
     top_similarity_score FLOAT NOT NULL,
     documents_cited JSONB DEFAULT '[]'::jsonb,
     is_unanswered BOOLEAN DEFAULT FALSE,
     created_at TIMESTAMPTZ DEFAULT NOW()
   );
   ```
2. Create FastAPI analytics endpoints in `backend/api/analytics.py`:
   - `GET /analytics/summary` -> Returns KPI summary (Total Queries, Avg Latency, Success Rate).
   - `GET /analytics/charts/volume?range=7D` -> Returns daily query counts.
   - `GET /analytics/charts/topics` -> Returns topic category breakdown.
   - `GET /analytics/unanswered` -> Returns log of queries with similarity scores < 0.75.

### Step 2: Analytics Dashboard UI Components
1. Create `frontend/app/(workspace)/dashboard/analytics/page.tsx`:
   - Timeframe Selector: Buttons for `7D`, `30D`, and `90D`.
   - **Daily Query Volume Chart:** Area chart showing chat interaction trends over time (`#7C3AED` stroke/fill).
   - **Latency Breakdown Bar Chart:** Stacked bar chart showing Retrieval vs LLM latency.
   - **Top Campus Topics Pie Chart:** Donut chart categorizing queries (Fees, Hostel, Syllabus, Exams, Placements).
   - **Unanswered Queries Directory:** Log table showing questions users asked that had no matching document context.

## VERIFICATION & DEFINITION OF DONE:
- [ ] Every chat query logs latency and similarity metrics to `analytics_logs`.
- [ ] Daily query volume area chart updates based on selected timeframe (`7D`, `30D`, `90D`).
- [ ] Unanswered query table correctly lists questions with similarity < 0.75 to highlight document gaps.
```

---

## Module 9: Admin Dashboard & System Governance

### Implementation Prompt: Module 9
```markdown
# TASK: Implement Module 9 - Admin Dashboard & System Governance for CampusIQ

## OBJECTIVE:
Build a central Control Tower and System Governance dashboard for Administrators. Aggregate KPI ribbon metrics, provide unified navigation across Ingestion, Knowledge Base, and Analytics, build system configuration controls (Retrieval Top-K, Similarity Cutoff threshold), and user role management.

## TECHNICAL STACK:
- **Frontend:** Next.js 15, Shadcn UI Tabs & Sliders, Lucide React icons, Tailwind CSS.
- **Backend:** FastAPI, Supabase PostgreSQL `system_config` table.
- **Design System:** Space Grotesk titles, DM Sans forms, `#7C3AED` accent sliders, high-contrast KPI cards (`#FAF5FF` surface).

## STEP-BY-STEP IMPLEMENTATION INSTRUCTIONS:

### Step 1: System Config Schema & Governance API
1. Create Supabase PostgreSQL `system_config` table:
   ```sql
   CREATE TABLE public.system_config (
     key TEXT PRIMARY KEY,
     value TEXT NOT NULL,
     updated_by UUID REFERENCES public.users(id),
     updated_at TIMESTAMPTZ DEFAULT NOW()
   );

   INSERT INTO public.system_config (key, value) VALUES
     ('retrieval_top_k', '5'),
     ('min_similarity_score', '0.75'),
     ('max_memory_turns', '5');
   ```
2. Create FastAPI admin endpoints in `backend/api/admin.py`:
   - `GET /admin/config` -> Returns active system parameters.
   - `PUT /admin/config` -> Updates configuration settings (restricted to Admin role).
   - `GET /admin/users` -> Returns list of users with assigned roles.
   - `PATCH /admin/users/{id}/role` -> Updates user role (`student`, `faculty`, `administrator`).

### Step 2: Admin Dashboard Layout & Control Ribbon
1. Create `frontend/app/(workspace)/dashboard/page.tsx`:
   - **Header Control Ribbon:** System Status indicator ("All Systems Operational"), ChromaDB collection status badge, quick action shortcuts.
   - **4 KPI Cards:** Total Indexed Documents, Total Chunks, Total Queries Answered, Average Latency.
   - **Governance Settings Panel:** Sliders to adjust Minimum Similarity Score (`0.50` to `0.95`) and Retrieval Top-K (`1` to `10`).
   - **User Management Directory:** Table to view user emails, roles, and promote/demote user permissions.

## VERIFICATION & DEFINITION OF DONE:
- [ ] Admin dashboard loads 4 top KPI metrics accurately.
- [ ] Adjusting the similarity threshold slider updates `system_config` and immediately affects RAG retrieval cutoff score.
- [ ] Admins can promote/demote user roles with instant UI feedback.
```

---

## Module 10: Deployment, Infrastructure & Security

### Implementation Prompt: Module 10
```markdown
# TASK: Implement Module 10 - Deployment, Infrastructure & Security for CampusIQ

## OBJECTIVE:
Set up production-grade deployment, containerization, environment security, and network protection for CampusIQ across Vercel (Next.js 15 Frontend) and Render (FastAPI Backend), connected to Supabase (PostgreSQL & Storage) and ChromaDB (Vector Store).

## TECHNICAL STACK:
- **Hosting:** Vercel (Frontend), Render (Backend Docker Container).
- **Database & Storage:** Supabase Cloud (PostgreSQL + S3 Storage).
- **Vector Store:** ChromaDB (Persistent Server instance).
- **Security:** CORS origin policy, FastAPI slowapi rate limiters, Environment secret management.

## STEP-BY-STEP IMPLEMENTATION INSTRUCTIONS:

### Step 1: Docker Containerization for FastAPI Backend
1. Create `backend/Dockerfile`:
   ```dockerfile
   FROM python:3.11-slim
   WORKDIR /app
   COPY requirements.txt .
   RUN pip install --no-cache-dir -r requirements.txt
   COPY . .
   EXPOSE 8000
   CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
   ```
2. Create `backend/requirements.txt` containing `fastapi`, `uvicorn`, `sentence-transformers`, `chromadb`, `google-genai`, `supabase`, `pypdf`, `python-docx`, `pyjwt`, `slowapi`.

### Step 2: Environment Secret Security & CORS Restrictions
1. Configure Environment Secrets on Render:
   - `GEMINI_API_KEY`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `JWT_SECRET`, `ALLOWED_ORIGIN=https://campusiq.vercel.app`.
2. Configure CORS Middleware in `backend/main.py`:
   - Restrict allowed origins strictly to the official Vercel domain.
3. Configure FastAPI health check endpoint `GET /health`:
   - Verifies API status, PostgreSQL database connectivity, and ChromaDB vector store health (`200 OK`).

### Step 3: Vercel Frontend Deployment & Production CI/CD
1. Configure `frontend/next.config.js` for production optimization.
2. Set Environment Variables on Vercel:
   - `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_API_URL`.
3. Connect GitHub repository to Vercel and Render for automated deployment on push to `main`.

## VERIFICATION & DEFINITION OF DONE:
- [ ] Vercel frontend builds and deploys successfully with SSL enabled.
- [ ] Render FastAPI backend passes `/health` ping and connects to Supabase and ChromaDB.
- [ ] CORS middleware blocks requests from unauthorized origins.
- [ ] Complete CampusIQ RAG pipeline works end-to-end in production environment.
```
