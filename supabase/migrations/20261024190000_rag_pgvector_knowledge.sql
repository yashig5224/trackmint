-- Migration: Add pgvector financial knowledge base for Hybrid RAG Chatbot
CREATE EXTENSION IF NOT EXISTS vector;

-- Financial Knowledge Chunks
CREATE TABLE IF NOT EXISTS public.financial_knowledge_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  content TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  embedding vector(384),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for fast cosine similarity search
CREATE INDEX IF NOT EXISTS idx_financial_knowledge_embedding
  ON public.financial_knowledge_chunks
  USING hnsw (embedding vector_cosine_ops);

-- Index for category filtering
CREATE INDEX IF NOT EXISTS idx_financial_knowledge_category
  ON public.financial_knowledge_chunks (category);

-- RLS
ALTER TABLE public.financial_knowledge_chunks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read knowledge chunks" ON public.financial_knowledge_chunks;
CREATE POLICY "Public read knowledge chunks"
  ON public.financial_knowledge_chunks
  FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Service role manages knowledge chunks" ON public.financial_knowledge_chunks;
CREATE POLICY "Service role manages knowledge chunks"
  ON public.financial_knowledge_chunks
  FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');

-- Semantic Matching Function
CREATE OR REPLACE FUNCTION match_financial_knowledge(
  query_embedding vector(384),
  match_threshold float DEFAULT 0.0,
  match_count int DEFAULT 4,
  filter_category text DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  title text,
  category text,
  content text,
  metadata jsonb,
  similarity float
)
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  RETURN QUERY
  SELECT
    fkc.id,
    fkc.title,
    fkc.category,
    fkc.content,
    fkc.metadata,
    (1 - (fkc.embedding <=> query_embedding))::float AS similarity
  FROM public.financial_knowledge_chunks fkc
  WHERE fkc.embedding IS NOT NULL
    AND (filter_category IS NULL OR fkc.category = filter_category)
    AND (1 - (fkc.embedding <=> query_embedding)) > match_threshold
  ORDER BY fkc.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
