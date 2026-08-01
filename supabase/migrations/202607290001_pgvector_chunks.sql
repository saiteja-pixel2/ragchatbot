-- Migration: Module 10 - pgvector Storage & Category Match Function
-- Version: 20260729_pgvector_chunks

-- 1. Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. Create document_chunks_vector table with category metadata
CREATE TABLE IF NOT EXISTS public.document_chunks_vector (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'general',
  chunk_index INT NOT NULL,
  page_number INT DEFAULT 1,
  section_title TEXT,
  chunk_text TEXT NOT NULL,
  embedding vector(384),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for vector similarity cosine distance
CREATE INDEX IF NOT EXISTS document_chunks_vector_embedding_idx 
ON public.document_chunks_vector 
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- 3. Match function with similarity score cutoff and optional category pre-filtering
CREATE OR REPLACE FUNCTION public.match_document_chunks(
  query_embedding vector(384),
  match_threshold FLOAT DEFAULT 0.75,
  match_count INT DEFAULT 5,
  filter_category TEXT DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  document_name TEXT,
  category TEXT,
  chunk_index INT,
  page_number INT,
  section_title TEXT,
  chunk_text TEXT,
  similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    v.id,
    v.document_name,
    v.category,
    v.chunk_index,
    v.page_number,
    v.section_title,
    v.chunk_text,
    1 - (v.embedding <=> query_embedding) AS similarity
  FROM public.document_chunks_vector v
  WHERE (filter_category IS NULL OR LOWER(v.category) = LOWER(filter_category))
    AND (1 - (v.embedding <=> query_embedding)) >= match_threshold
  ORDER BY v.embedding <=> query_embedding ASC
  LIMIT match_count;
END;
$$;
