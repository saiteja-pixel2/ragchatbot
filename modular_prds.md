# CampusIQ – Modular Product Requirements Documents (PRDs)

**Master Application:** CampusIQ – AI-Powered College Knowledge Assistant  
**Document Type:** Detailed Modular PRD Specifications  
**Version:** 1.0  

---

## Module 1: Authentication & User Management

### 1. Detailed PRD: Authentication & User Management

#### 1.1 Module Overview
The Authentication & User Management module controls user onboarding, identity verification, session persistence, role assignment, and access enforcement across CampusIQ. It categorizes users into distinct personas (**Student**, **Parent**, **Faculty**, and **Administrator**), ensuring role-based access control (RBAC) to protected features (such as the Chat workspace and Admin dashboard).

#### 1.2 Features in that Module
- **Email & Password Authentication:** Standard registration, login, and secure password reset workflows.
- **Role-Based Access Control (RBAC):** Assignment of roles (`student`, `parent`, `faculty`, `administrator`) during account creation or admin provisioning.
- **Session Management:** Secure JWT session tokens and refresh tokens powered by Supabase Auth with persistent client state.
- **User Profile Management:** View user profile info, active persona badge, and update account credentials.
- **Protected Route Guards:** Middleware route interceptors blocking unauthenticated access to `/chat` and non-admin access to `/dashboard`.

#### 1.3 User Interactions
1. **User Sign Up:** Guest fills out Name, Email, Password, and selects their Persona (Student/Parent/Faculty). Upon form submission, a verification email is dispatched.
2. **User Sign In:** User inputs email/password credentials on the `/login` page. Upon validation, the app redirects them to `/chat` (for Students/Parents/Faculty) or `/dashboard` (for Administrators).
3. **Password Recovery:** User clicks "Forgot Password?", submits their email, receives a magic reset link, and updates their password on a dedicated reset screen.
4. **Session Expiry & Logout:** Clicking "Logout" in the sidebar revokes active tokens and redirects the user to the landing page.

#### 1.4 Data Requirements
- **Users Table (`users`):**
  - `id`: UUID (Primary Key, references Supabase Auth `auth.users.id`)
  - `name`: String (User's full name)
  - `email`: String (Unique, Indexed)
  - `role`: Enum (`student`, `parent`, `faculty`, `administrator`)
  - `created_at`: Timestamp
  - `updated_at`: Timestamp

#### 1.5 API Requirements (High Level)
- `POST /auth/signup` – Register a new user account with role metadata.
- `POST /auth/login` – Authenticate email/password credentials and return access/refresh tokens.
- `POST /auth/logout` – Invalidate active user session token.
- `POST /auth/reset-password` – Trigger password reset email workflow.
- `GET /auth/me` – Retrieve current authenticated user profile and assigned role.

#### 1.6 Edge Cases
- **Unverified Email Login Attempt:** Prevent access to `/chat` until email confirmation is verified if confirmation is required.
- **Role Elevation Tampering:** Attempting to manually modify local storage tokens or role headers to access `/dashboard` triggers server-side middleware validation and immediate 403 Forbidden rejection.
- **Expired Refresh Tokens:** Automatic silent token refresh fails gracefully, clearing client state and prompting the user with a session expired toast before redirecting to `/login`.

---

## Module 2: Landing Page & Public Discovery

### 2. Detailed PRD: Landing Page & Public Discovery

#### 2.1 Module Overview
The Landing Page & Public Discovery module serves as the primary marketing and educational portal for CampusIQ. It introduces prospective students, parents, faculty, and administrators to the capabilities of the AI college assistant, provides interactive sandbox demonstrations, highlights major platform features, visualizes the RAG architecture, and answers frequently asked questions.

#### 2.2 Features in that Module
- **Hero Banner:** Compelling value proposition headline, glowing system status indicator, and primary CTAs.
- **Interactive Micro-Demo Sandbox:** Sandboxed query container allowing guests to test sample campus questions (e.g., *"What is the hostel fee structure?"*) without logging in.
- **Feature Showcase Grid:** Visual grid highlighting PDF indexing, semantic retrieval, grounded responses, memory, and citations.
- **Interactive RAG Architecture Pipeline:** Visual animation showing how document ingestion, BAAI embeddings, ChromaDB, and Gemini 2.5 Flash work together.
- **Persona Benefits Tabs:** Tailored content views for Students, Parents, Faculty, and Administrators.
- **FAQ Accordion:** Single-column expandable accordion addressing security, document accuracy, and platform capabilities.

#### 2.3 User Interactions
1. **Explore Landing Page:** Visitor scrolls through hero, features, and architecture sections with sticky navigation header support.
2. **Test Live Micro-Demo:** Visitor clicks a sample question chip or types a query into the sandbox box. The sandbox displays a pre-computed or sandboxed RAG response with inline citations.
3. **Expand FAQ Items:** Visitor clicks FAQ accordions to toggle answer visibilities smoothly.
4. **Navigate to App:** Visitor clicks "Sign In" or "Access Assistant" to transition to authentication pages.

#### 2.4 Data Requirements
- **Static Assets & Demo Pre-sets (`demo_queries`):**
  - `id`: String
  - `sample_question`: String
  - `sample_answer`: String
  - `sample_citations`: JSON (Array of document names and page numbers)
- **Platform Health Stat (`system_status`):**
  - `status`: Enum (`online`, `degraded`, `maintenance`)
  - `total_documents_indexed`: Integer
  - `total_queries_answered`: Integer

#### 2.5 API Requirements (High Level)
- `GET /public/demo-queries` – Fetch curated sample queries for the landing page sandbox.
- `GET /public/system-stats` – Retrieve public indexing count and system health status.

#### 2.6 Edge Cases
- **Backend Service Unavailable:** Landing page sandbox falls back to cached static responses with a minor banner notice (*"Live demo in preview mode"*).
- **High Guest Rate Limiting:** Sandbox enforces a 5-query-per-minute IP rate limit to prevent abuse from unauthenticated bots.

---

## Module 3: Chat Interface & Conversational UI

### 3. Detailed PRD: Chat Interface & Conversational UI

#### 3.1 Module Overview
The Chat Interface & Conversational UI module is the core interaction canvas of CampusIQ. It provides a real-time, ChatGPT-like interface where students, parents, and faculty ask questions about college policies, fees, events, and syllabus, receiving grounded AI answers generated by Gemini 2.5 Flash complete with markdown formatting, code highlights, and interactive citation tags.

#### 3.2 Features in that Module
- **ChatGPT-Style Layout:** Centered chat canvas (`max-w-[800px]`) with user bubbles, AI response blocks, and gradient avatars.
- **Real-Time Token Streaming:** Server-Sent Events (SSE) streaming output displaying text token-by-token with typing animation.
- **Markdown & Code Rendering:** Support for rich text, lists, bold highlights, tables, and copyable code snippets.
- **Suggested Question Quick Chips:** Preset query chips (*"Hostel Fee Rules"*, *"Academic Calendar 2026"*, *"Library Timings"*) on empty state canvas.
- **Auto-Expanding Input Box:** Sticky input pod with multi-line textarea support, keyboard send (`Enter`), and newline (`Shift+Enter`).
- **Response Actions Toolbar:** One-click actions to Copy Response, Regenerate Answer, and View Citations.
- **Right Citation Drawer Trigger:** Interactive citation tags (`[Doc Title - Page X]`) that slide open the source context panel.

#### 3.3 User Interactions
1. **Submit Question:** User types query into the bottom input pod and hits Enter. Message immediately appends to canvas (optimistic update).
2. **Observe Stream:** User watches AI response stream in real-time. Streaming indicator pulses during output generation.
3. **Click Quick Chip:** User clicks a suggested prompt chip on the new chat screen to populate and send the question automatically.
4. **Inspect Citation:** User clicks a citation badge at the end of an AI response to open the Right Citation Drawer and read the exact source text chunk.
5. **Copy / Regenerate:** User clicks "Copy" to copy response text to clipboard or "Regenerate" to request a fresh answer using updated context retrieval.

#### 3.4 Data Requirements
- **Messages Table (`messages`):**
  - `id`: UUID (Primary Key)
  - `chat_id`: UUID (Foreign Key -> `chats.id`)
  - `sender_type`: Enum (`user`, `assistant`)
  - `content`: Text (Markdown content)
  - `sources`: JSONB (Array of source objects: `document_id`, `filename`, `page`, `chunk_id`, `score`)
  - `created_at`: Timestamp

#### 3.5 API Requirements (High Level)
- `POST /chat/message` – Send user query, trigger RAG pipeline, and stream LLM response via SSE readable stream.
- `POST /chat/regenerate` – Re-run retrieval and LLM generation for the last assistant response.

#### 3.6 Edge Cases
- **Stream Interruption / Network Drop:** Stream disconnects mid-response. Frontend detects broken socket/stream, retains received tokens, appends an warning badge (*"Response truncated due to network loss"*), and enables a "Resume" button.
- **LLM Refusal / No Context Found:** When top vector match similarity falls below `0.75`, LLM outputs strict fallback string: *"I couldn't find that information in the uploaded official college documents."*
- **Ultra-Long User Queries:** Input truncated gracefully at 2,000 characters with a visible character counter warning.

---

## Module 4: Conversation History & Memory Management

### 4. Detailed PRD: Conversation History & Memory Management

#### 4.1 Module Overview
The Conversation History & Memory Management module maintains multi-turn conversational context and organizes past chat sessions. It allows users to browse past queries, resume previous discussions with full contextual memory (resolving pronouns like *"his qualification"* or *"its deadline"*), search conversation titles, and delete obsolete threads.

#### 4.2 Features in that Module
- **Collapsible Sidebar History:** Left navigation bar displaying past chat threads categorized chronologically ("Today", "Yesterday", "Previous 7 Days", "Older").
- **Conversation Search:** Quick client-side filter input to search past chat titles.
- **Contextual Conversation Memory:** Ingests recent message history (up to last 5 turn pairs) into the RAG prompt builder to resolve multi-turn coreferences.
- **Chat Session CRUD:** Create new chat session (`⌘K`), title auto-generation based on first prompt, rename chat session, and delete chat session.

#### 4.3 User Interactions
1. **Start New Chat:** User clicks "New Chat" button or presses `⌘K`. Canvas clears to empty greeting state, creating a fresh session ID.
2. **Select Previous Chat:** User clicks a chat title in the left sidebar. Main canvas loads the entire message history of that session.
3. **Filter History:** User types keywords into the sidebar search input. The list instantly filters matching conversation titles.
4. **Delete Thread:** User hovers over a chat item in the sidebar, clicks the trash icon, and confirms deletion in a confirmation popover.

#### 4.4 Data Requirements
- **Chats Table (`chats`):**
  - `id`: UUID (Primary Key)
  - `user_id`: UUID (Foreign Key -> `users.id`)
  - `title`: String (Auto-generated from initial prompt)
  - `last_message_at`: Timestamp
  - `created_at`: Timestamp
  - `updated_at`: Timestamp

#### 4.5 API Requirements (High Level)
- `GET /chat/history` – Retrieve list of all chat sessions for the authenticated user.
- `GET /chat/history/{chat_id}` – Fetch complete message thread for a specific chat ID.
- `PATCH /chat/history/{chat_id}` – Rename a chat session title.
- `DELETE /chat/history/{chat_id}` – Delete a chat session and all associated messages.

#### 4.6 Edge Cases
- **Orphaned Message History:** Deleting a chat thread cascades deletion across all child messages in Supabase PostgreSQL.
- **Long Memory Context Overflow:** If total conversation tokens exceed LLM context window limits, memory automatically truncates older turns while retaining the system prompt and latest 3 conversation turns.

---

## Module 5: Document Upload & Processing Ingestion Pipeline

### 5.1 Detailed PRD: Document Upload & Processing Ingestion Pipeline

#### 5.1 Module Overview
The Document Upload & Ingestion Pipeline module provides Administrators with automated tools to ingest official college documents (PDF, DOCX, TXT). It handles client-side file validation, secure cloud storage upload, text extraction, cleaning, sentence-aware chunking (800 characters with 150 overlap), embedding generation using BAAI/bge-small-en-v1.5, and vector database indexing in ChromaDB.

#### 5.2 Features in that Module
- **Drag-and-Drop Dropzone:** Intuitive drag-and-drop file upload zone supporting multi-file selection.
- **File Format & Size Validation:** Restricts uploads to `.pdf`, `.docx`, and `.txt` up to 25MB per file.
- **Multi-Stage Processing Stepper:** Visual step-by-step progress monitor:
  1. File Upload to Supabase Storage
  2. Text Extraction & Cleaning
  3. Text Chunking (800 chars / 150 overlap)
  4. BAAI Embedding Generation & ChromaDB Vector Writing
- **Ingestion Status Feedback:** Toast alerts and real-time step status badges.

#### 5.3 User Interactions
1. **Drop PDF Files:** Admin opens `/dashboard/upload` and drops one or multiple PDF documents into the dropzone.
2. **Monitor Progress:** Admin watches the 4-stage processing stepper advance as each document is processed and vector-indexed.
3. **View Ingestion Summary:** Upon completion, a green toast notification confirms: *"Document 'Hostel_Rules_2026.pdf' successfully indexed (142 chunks)"*.
4. **Handle Upload Error:** If a corrupt PDF is dropped, the stepper flags Stage 2 red with an explicit error message (*"Failed to extract text: Encrypted PDF"*).

#### 5.4 Data Requirements
- **Documents Table (`documents`):**
  - `id`: UUID (Primary Key)
  - `filename`: String
  - `file_url`: String (Supabase Storage absolute path)
  - `file_size`: Integer (Bytes)
  - `file_type`: String (`pdf`, `docx`, `txt`)
  - `total_chunks`: Integer
  - `uploaded_by`: UUID (Foreign Key -> `users.id`)
  - `status`: Enum (`uploading`, `processing`, `indexed`, `failed`)
  - `error_message`: Text (Nullable)
  - `uploaded_at`: Timestamp

#### 5.5 API Requirements (High Level)
- `POST /ingestion/upload` – Multi-part form upload for raw document files.
- `GET /ingestion/status/{job_id}` – Poll or stream live progress for an ongoing ingestion job.
- `POST /ingestion/reindex/{document_id}` – Re-run text extraction, chunking, and embedding for an existing document.

#### 5.6 Edge Cases
- **Scanned Image PDF (No Vector Text):** OCR fallback or failure flag informing the admin: *"Document contains scanned images without extractable text. Please upload an OCR-processed PDF."*
- **Duplicate Document Upload:** Uploading a file with identical filename and checksum prompts confirmation: *"Document already exists. Overwrite existing index?"*

---

## Module 6: Knowledge Base & Vector Database Management

### 6.1 Detailed PRD: Knowledge Base & Vector Database Management

#### 6.1 Module Overview
The Knowledge Base & Vector Database Management module empowers Administrators to monitor, manage, and audit all indexed college knowledge. It provides a complete inventory table of uploaded documents, chunk counts, vector store health stats, manual re-indexing triggers, and vector purging capabilities to maintain search quality and data accuracy.

#### 6.2 Features in that Module
- **Knowledge Base Directory Table:** Detailed inventory showing document title, chunk count, file size, uploader, upload timestamp, and status.
- **Chunk Inspector Modal:** Ability to view extracted text chunks and vector embeddings for any specific document.
- **Re-indexing Engine:** One-click re-indexing trigger to rebuild embeddings if model or chunking parameters change.
- **Document Deletion & Vector Purge:** Deletes document metadata from PostgreSQL, raw files from Supabase Storage, and associated vector embeddings from ChromaDB.
- **Index Health Monitor:** Visual status card showing ChromaDB collection status, total vector count, and memory usage.

#### 6.3 User Interactions
1. **Browse Directory:** Admin navigates to `/dashboard/knowledge` to review all active campus documents.
2. **Inspect Chunks:** Admin clicks "Inspect Chunks" on a document row. A modal pops up displaying chunk breakdown (Chunk #1 to #N) with character lengths.
3. **Re-index Document:** Admin clicks "Re-index" button to regenerate embeddings after updating system chunking settings.
4. **Purge Document:** Admin clicks the red delete button, confirms in the modal, and system deletes file, chunks, and vectors instantly.

#### 6.4 Data Requirements
- **ChromaDB Collection Metadata:**
  - `collection_name`: `"campusiq_knowledge_store"`
  - `embedding_dimension`: 384 (BAAI/bge-small-en-v1.5)
  - `distance_metric`: Cosine Similarity
- **Document Vector Chunks Mapping (`chunks`):**
  - `id`: UUID (Primary Key)
  - `document_id`: UUID (Foreign Key -> `documents.id`)
  - `chunk_index`: Integer
  - `content`: Text (800 characters max)
  - `char_length`: Integer
  - `vector_id`: String (ChromaDB ID reference)

#### 6.5 API Requirements (High Level)
- `GET /knowledge/documents` – List all indexed documents with chunk metadata.
- `GET /knowledge/documents/{id}/chunks` – Retrieve all text chunks for a specific document.
- `DELETE /knowledge/documents/{id}` – Remove document, delete Supabase storage object, and purge ChromaDB vectors.
- `POST /knowledge/purge-all` – Admin emergency wipe of vector store collection.

#### 6.6 Edge Cases
- **Partial Deletion Failure:** If ChromaDB vector purge succeeds but storage deletion fails, transaction rolls back and flags item as `deletion_pending` for automatic background cleanup retry.
- **Vector DB Disconnection:** If ChromaDB instance goes offline, Knowledge Base displays an urgent status alert: *"Vector Store Connection Lost. Search operating in degraded mode."*

---

## Module 7: RAG Search & Retrieval Engine

### 7.1 Detailed PRD: RAG Search & Retrieval Engine

#### 7.1 Module Overview
The RAG Search & Retrieval Engine module is the intelligence backbone of CampusIQ. It handles query vectorization, cosine similarity search in ChromaDB, context retrieval (Top K = 5, Similarity Cutoff >= 0.75), prompt augmentation, Gemini 2.5 Flash API execution, and precise source citation mapping.

#### 7.2 Features in that Module
- **Question Vectorizer:** Converts incoming user prompts into 384-dimensional vector embeddings via BAAI/bge-small-en-v1.5.
- **Semantic Vector Search:** Executes Cosine Similarity vector search in ChromaDB to retrieve Top 5 most relevant context chunks.
- **Similarity Score Threshold Guard:** Filters out chunks with similarity scores below `0.75` to prevent noisy context injection.
- **Strict Grounded Prompt Builder:** Constructs system prompts instructing Gemini 2.5 Flash to answer *ONLY* using provided context and admit when information is absent.
- **Citation Mapper:** Maps retrieved chunks to response text, generating structured source citations (`document_name`, `page_number`, `confidence_score`).

#### 7.3 User Interactions
1. **Automated Internal Pipeline Execution:** Triggered automatically upon message submission in Module 3. No direct user configuration required during standard chat.
2. **Citation Drawer Inspection:** User clicks mounted citation tags to inspect context chunks returned by the RAG search engine.

#### 7.4 Data Requirements
- **RAG Execution Context Object (`rag_context`):**
  - `query_vector`: Array[Float] (384 Dimensions)
  - `top_k_chunks`: Array of Objects (`chunk_id`, `document_id`, `filename`, `content`, `similarity_score`)
  - `prompt_constructed`: Text
  - `llm_raw_response`: Text
  - `execution_latency_ms`: Float

#### 7.5 API Requirements (High Level)
- `POST /rag/retrieve` – Internal endpoint: Takes user query, runs vector search, returns Top-K chunks with similarity scores.
- `POST /rag/generate` – Internal endpoint: Takes query + retrieved chunks + history, builds prompt, calls Gemini 2.5 Flash, and streams response.

#### 7.6 Edge Cases
- **Low Similarity Score (< 0.75):** Zero chunks qualify. Prompt builder injects fallback instruction forcing LLM to output: *"I couldn't find that information in the uploaded official college documents."*
- **Embedding Model Timeout:** If local BAAI embedding generation exceeds 3 seconds, system retries with cached embeddings or returns a friendly retry prompt.

---

## Module 8: Analytics & System Performance Monitoring

### 8.1 Detailed PRD: Analytics & System Performance Monitoring

#### 8.1 Module Overview
The Analytics & System Performance Monitoring module provides Administrators with operational insights into platform usage, query volume trends, latency distributions, popular search topics, and most frequently cited campus documents. It tracks system performance to ensure high query quality and document coverage.

#### 8.2 Features in that Module
- **Daily Query Volume Area Chart:** Displays daily chat interaction counts over custom timeframes (7 Days, 30 Days, 90 Days).
- **Latency Distribution Bar Chart:** Visualizes query response times breakdown (Embedding Latency, Vector Search Latency, LLM Generation Latency).
- **Top Asked Campus Topics Pie Chart:** Categorizes queries into common academic topics (Fees, Hostel, Syllabus, Exams, Placements).
- **Document Citation Heatmap / Table:** Ranks uploaded college documents by frequency of citation in AI responses.
- **Unanswered Query Log:** Tracks queries where retrieval score was < 0.75, helping admins identify gaps in the knowledge base.

#### 8.3 User Interactions
1. **Select Timeframe:** Admin opens `/dashboard/analytics` and toggles time-range buttons (`7D`, `30D`, `90D`). Charts dynamically reload.
2. **Hover Chart Tooltips:** Admin hovers over data points on charts to inspect exact metrics (e.g., *"July 24: 342 Questions, Avg Latency 1.2s"*).
3. **Review Unanswered Queries:** Admin clicks "Unanswered Queries" tab to identify missing documentation (e.g., *"15 users asked about Bus Route Schedule - No Document Found"*).

#### 8.4 Data Requirements
- **Analytics Logs Table (`analytics_logs`):**
  - `id`: UUID (Primary Key)
  - `user_id`: UUID (Foreign Key -> `users.id`)
  - `chat_id`: UUID (Foreign Key -> `chats.id`)
  - `query_text`: Text
  - `retrieval_latency_ms`: Float
  - `llm_latency_ms`: Float
  - `total_latency_ms`: Float
  - `top_similarity_score`: Float
  - `documents_cited`: JSONB (Array of document IDs)
  - `is_unanswered`: Boolean
  - `created_at`: Timestamp

#### 8.5 API Requirements (High Level)
- `GET /analytics/summary` – Fetch KPI cards summary (Total Queries, Avg Latency, Success Rate).
- `GET /analytics/charts/volume` – Fetch daily chat volume time-series data.
- `GET /analytics/charts/topics` – Fetch query category breakdown.
- `GET /analytics/unanswered` – Retrieve list of queries that yielded no document matches.

#### 8.6 Edge Cases
- **Zero Analytics Data:** New installation displays clean empty-state chart placeholders with informative setup guidance.
- **Privacy Anonymization:** Query analytics mask sensitive personal information before storing query text logs.

---

## Module 9: Admin Dashboard & System Governance

### 9.1 Detailed PRD: Admin Dashboard & System Governance

#### 9.1 Module Overview
The Admin Dashboard & System Governance module is the central control tower for Administrators. It aggregates system metrics, provides unified navigation across upload management, knowledge base curation, and analytics, and controls system-wide configurations such as similarity thresholds and user permissions.

#### 9.2 Features in that Module
- **Central Control Ribbon:** High-level system health indicator ("All Systems Operational"), active ChromaDB collection status, and quick admin actions.
- **Unified Navigation Sidebar & Header:** Integrated admin navigation linking Ingestion, Knowledge Base, Analytics, and Governance Settings.
- **System Configuration Panel:** Controls for adjusting Retrieval Top-K (default 5), Minimum Similarity Cutoff (default 0.75), and system prompt rules.
- **User Management Table:** Admin view to promote users to Admin role or revoke access.

#### 9.3 User Interactions
1. **Access Dashboard:** Authenticated Admin opens `/dashboard`. System loads KPI cards, system status, and recent upload activity.
2. **Adjust Retrieval Threshold:** Admin opens Governance Settings, changes Minimum Similarity Score slider from `0.75` to `0.80`, and clicks "Save Configuration".
3. **Promote User:** Admin searches for a faculty member's email in User Management and toggles their role from `faculty` to `administrator`.

#### 9.4 Data Requirements
- **System Config Table (`system_config`):**
  - `key`: String (Primary Key, e.g., `retrieval_top_k`, `min_similarity_score`)
  - `value`: Text
  - `updated_by`: UUID (Foreign Key -> `users.id`)
  - `updated_at`: Timestamp

#### 9.5 API Requirements (High Level)
- `GET /admin/config` – Retrieve system configuration parameters.
- `PUT /admin/config` – Update system configuration settings.
- `GET /admin/users` – Fetch list of all registered users with roles.
- `PATCH /admin/users/{user_id}/role` – Update assigned user role.

#### 9.6 Edge Cases
- **Self-Demotion Lockout:** Prevent an Admin from revoking their own Administrator status if they are the sole remaining Admin.
- **Invalid Threshold Range:** Form validation enforces similarity score bounds between `0.50` and `0.95`.

---

## 10. Deployment, Infrastructure & Security

### 10.1 Detailed PRD: Deployment, Infrastructure & Security

#### 10.1 Module Overview
The Deployment, Infrastructure & Security module defines the operational architecture, cloud hosting setup, containerization, environment security, and network protection for CampusIQ. It ensures production-grade deployment across Vercel (Frontend Next.js) and Render (Backend FastAPI), connected to Supabase (PostgreSQL & Storage) and ChromaDB (Vector Store).

#### 10.2 Features in that Module
- **Vercel Frontend Hosting:** Edge deployment of Next.js 15 app with automatic SSL, global CDN caching, and custom domain setup.
- **Render Backend Deployment:** Containerized Docker deployment of FastAPI backend with health check ping endpoints.
- **Supabase Cloud Integration:** Managed PostgreSQL database and S3-compliant file storage with Row Level Security (RLS).
- **Environment Variable Security:** Secure secret management for API keys (`GEMINI_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `JWT_SECRET`).
- **CORS & Rate Limiting Guard:** CORS restriction allowing API calls exclusively from the official Vercel domain, paired with FastAPI slowapi rate limiters.

#### 10.3 User Interactions
1. **Automated CI/CD Pipeline:** Developer pushes code to GitHub `main` branch. GitHub Actions & Vercel/Render auto-build and deploy staging/production environments.
2. **Health Check Ping:** Infrastructure monitors send GET requests to `/health` every 60 seconds to verify API uptime.

#### 10.4 Data Requirements
- **Infrastructure Connection Configs:**
  - `FRONTEND_URL`: `https://campusiq.vercel.app`
  - `BACKEND_URL`: `https://campusiq-api.onrender.com`
  - `CHROMADB_HOST`: Local/Containerized Vector Store Instance
  - `DATABASE_URL`: Supabase PostgreSQL Connection String

#### 10.5 API Requirements (High Level)
- `GET /health` – Public health check endpoint returning API status, database connectivity, and vector store readiness (`200 OK`).

#### 10.6 Edge Cases
- **Render Cold Start Delay:** Render free/starter tier web service spins down after inactivity. Frontend displays a discreet connection establishing indicator (*"Connecting to CampusIQ Server..."*) while backend warms up.
- **API Key Exhaustion:** If Gemini API rate limits are reached, backend catches 429 status code and falls back to a graceful error banner asking the user to retry in a minute.

---
