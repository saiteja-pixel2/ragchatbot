# CampusIQ – AI-Powered College Knowledge Assistant
> **Master Product Requirements Document (PRD)**

> **Note:** A complete enterprise PRD of 15,000–20,000+ words exceeds the maximum content that can be generated in a single response or file creation step within this chat. This document provides the production-ready master structure and beginning sections. The remaining sections can be expanded iteratively while preserving this structure.

---

# 1. Product Vision

## Product Name
CampusIQ – AI-Powered College Knowledge Assistant

## Vision
CampusIQ is an intelligent Retrieval-Augmented Generation (RAG) platform that enables students, parents, faculty, and administrators to instantly retrieve accurate information from official college documents instead of relying on static FAQs or manual support.

## Problem Statement

Students often struggle to find accurate information because college information is scattered across PDFs, notices, regulations, brochures, and websites.

CampusIQ solves this problem by indexing institutional documents and answering questions using semantic search and LLM-powered responses grounded in retrieved context.

---

# 2. Objectives

- Build a production-ready RAG chatbot.
- Upload and index PDF documents.
- Perform semantic retrieval using embeddings.
- Generate grounded responses using an LLM.
- Maintain conversation history.
- Provide source citations.
- Offer an administrator dashboard.

---

# 3. Recommended Technology Stack

| Layer | Technology |
|--------|------------|
| Frontend | Next.js + Tailwind CSS |
| Backend | FastAPI |
| Authentication | Supabase Auth |
| Database | Supabase PostgreSQL |
| Storage | Supabase Storage |
| Vector Database | ChromaDB |
| Embedding Model | BAAI/bge-small-en-v1.5 |
| LLM | Gemini 2.5 Flash |

---

# 4. High-Level RAG Pipeline

```text
PDF Upload
    ↓
Text Extraction
    ↓
Chunking
    ↓
Embedding Generation
    ↓
ChromaDB
    ↓
User Question
    ↓
Question Embedding
    ↓
Similarity Search
    ↓
Top-K Chunks
    ↓
Prompt Builder
    ↓
Gemini
    ↓
Answer + Citations
```

---

# 5. Major Modules

1. Authentication
2. Landing Page
3. Chat Interface
4. Conversation History
5. Document Upload
6. Knowledge Base
7. RAG Engine
8. Analytics
9. Admin Dashboard
10. Deployment

---

# 6. Next Sections (to be expanded)

- User Personas
- Functional Requirements
- Non-functional Requirements
- Complete Database Schema
- API Documentation
- UI Specifications
- Prompt Engineering
- Security
- Testing
- Deployment
- Roadmap

