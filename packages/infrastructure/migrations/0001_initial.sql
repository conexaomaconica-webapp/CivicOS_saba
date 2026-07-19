-- ============================================================================
-- Migration: 0001_initial
-- Description: Creates foundational tables for CivicOS Platform
-- ============================================================================

-- Outbox Table for Outbox Pattern (Transactional Event Bus)
CREATE TABLE IF NOT EXISTS public.outbox_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  aggregate_type VARCHAR(255) NOT NULL,
  aggregate_id VARCHAR(255) NOT NULL,
  event_type VARCHAR(255) NOT NULL,
  payload JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  processed_at TIMESTAMP WITH TIME ZONE,
  error TEXT
);

-- Index for processing unprocessed events
CREATE INDEX IF NOT EXISTS idx_outbox_events_unprocessed ON public.outbox_events (created_at) WHERE processed_at IS NULL;
