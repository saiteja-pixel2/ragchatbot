-- Migration: Module 9 - System Config Schema
-- Version: 20260727_module9_system_config

CREATE TABLE IF NOT EXISTS public.system_config (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed default governance configuration parameters
INSERT INTO public.system_config (key, value) VALUES
  ('retrieval_top_k', '5'),
  ('min_similarity_score', '0.75'),
  ('system_prompt_rules', 'Answer strictly using provided document context. If answer is not present, output exact refusal string.')
ON CONFLICT (key) DO NOTHING;
