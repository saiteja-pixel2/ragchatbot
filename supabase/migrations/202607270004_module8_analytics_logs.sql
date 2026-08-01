-- Migration: Module 8 - Analytics Logs Schema
-- Version: 20260727_module8_analytics_logs

CREATE TABLE IF NOT EXISTS public.analytics_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  chat_id UUID REFERENCES public.chats(id) ON DELETE SET NULL,
  query_text TEXT NOT NULL,
  retrieval_latency_ms FLOAT NOT NULL DEFAULT 0.0,
  llm_latency_ms FLOAT NOT NULL DEFAULT 0.0,
  total_latency_ms FLOAT NOT NULL DEFAULT 0.0,
  top_similarity_score FLOAT NOT NULL DEFAULT 0.0,
  documents_cited JSONB DEFAULT '[]'::jsonb,
  is_unanswered BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexing for performance
CREATE INDEX IF NOT EXISTS idx_analytics_created_at ON public.analytics_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_is_unanswered ON public.analytics_logs(is_unanswered);
CREATE INDEX IF NOT EXISTS idx_analytics_similarity ON public.analytics_logs(top_similarity_score);
