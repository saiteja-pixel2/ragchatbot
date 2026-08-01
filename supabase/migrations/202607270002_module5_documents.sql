-- Migration: Module 5 - Documents Table Schema
-- Version: 20260727_module5_documents

CREATE TABLE IF NOT EXISTS public.documents (
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

-- Indexing for performance
CREATE INDEX IF NOT EXISTS idx_documents_uploaded_at ON public.documents(uploaded_at DESC);
CREATE INDEX IF NOT EXISTS idx_documents_status ON public.documents(status);
