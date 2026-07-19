-- ============================================================================
-- Migration: 0002_business
-- Description: Creates tables for Business Directory Domain
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.businesses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  slug VARCHAR(255) NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  status VARCHAR(50) NOT NULL DEFAULT 'DRAFT',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Index for searching by tenant
CREATE INDEX IF NOT EXISTS idx_businesses_tenant ON public.businesses (tenant_id);
-- Index for slug lookups (UNIQUE already creates an index, but good to be explicit for tenant+slug if needed)
