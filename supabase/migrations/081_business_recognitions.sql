-- Migration 081: Business Recognitions Schema, Strict FKs, Grants, Revocation Semantics & Hardened RLS

-- 1. Ensure composite UNIQUE constraint on public.businesses(id, tenant_id) for structural FK tenant isolation
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'uq_businesses_id_tenant'
    ) THEN
        ALTER TABLE public.businesses ADD CONSTRAINT uq_businesses_id_tenant UNIQUE (id, tenant_id);
    END IF;
END $$;

-- 2. Create public.business_recognitions table
CREATE TABLE IF NOT EXISTS public.business_recognitions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    business_id UUID NOT NULL,
    recognition_key TEXT NOT NULL REFERENCES public.institutional_recognitions(key) ON DELETE RESTRICT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    granted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    granted_by UUID REFERENCES auth.users(id),
    revoked_at TIMESTAMPTZ,
    justification TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Isolamento Estrutural de Tenant
    CONSTRAINT fk_business_recognitions_business_tenant 
        FOREIGN KEY (business_id, tenant_id) 
        REFERENCES public.businesses(id, tenant_id) ON DELETE CASCADE,
        
    -- Restrição de Integridade de Chaves (Apenas reconhecimentos concedíveis)
    CONSTRAINT chk_grantable_recognition_key 
        CHECK (recognition_key IN ('pedra_fundamental', 'coluna_de_honra')),

    -- Semântica de Revogação Estrita
    CONSTRAINT chk_revocation_consistency 
        CHECK (
          (is_active = true  AND revoked_at IS NULL)
          OR
          (is_active = false AND revoked_at IS NOT NULL)
        ),

    CONSTRAINT uq_business_recognition UNIQUE (tenant_id, business_id, recognition_key)
);

-- Trigger para auto updated_at
CREATE OR REPLACE TRIGGER trg_business_recognitions_updated_at
  BEFORE UPDATE ON public.business_recognitions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

-- Índices de Alta Performance
CREATE INDEX IF NOT EXISTS idx_business_recognitions_tenant_biz ON public.business_recognitions(tenant_id, business_id);
CREATE INDEX IF NOT EXISTS idx_business_recognitions_key ON public.business_recognitions(recognition_key);
CREATE INDEX IF NOT EXISTS idx_business_recognitions_active ON public.business_recognitions(tenant_id, business_id) WHERE is_active = true;

-- Grants para PostgREST
GRANT SELECT ON public.business_recognitions TO anon, authenticated;
GRANT ALL ON public.business_recognitions TO service_role;

-- RLS Hardened (Public só lê se a empresa estiver PUBLICADA e ATIVA)
ALTER TABLE public.business_recognitions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read active business_recognitions" ON public.business_recognitions;
CREATE POLICY "Public read active business_recognitions"
ON public.business_recognitions FOR SELECT
TO anon, authenticated
USING (
  is_active = true 
  AND EXISTS (
    SELECT 1 FROM public.businesses b
    WHERE b.id = business_recognitions.business_id
      AND b.tenant_id = business_recognitions.tenant_id
      AND b.is_active = true
      AND b.publication_status = 'published'
  )
);

DROP POLICY IF EXISTS "Admin manage business_recognitions" ON public.business_recognitions;
CREATE POLICY "Admin manage business_recognitions"
ON public.business_recognitions FOR ALL
TO authenticated
USING (public.has_tenant_admin_access(tenant_id))
WITH CHECK (public.has_tenant_admin_access(tenant_id));

-- Migração cirúrgica da Padaria Estrela
INSERT INTO public.business_recognitions (tenant_id, business_id, recognition_key, is_active, revoked_at, justification)
SELECT tenant_id, business_id, 'pedra_fundamental', true, NULL, 'Migração do registro de teste Padaria Estrela de directory_sponsored_businesses'
FROM public.directory_sponsored_businesses
WHERE business_id = '00000000-0000-0000-0000-000000000201'::uuid AND priority = 100
ON CONFLICT (tenant_id, business_id, recognition_key) DO UPDATE SET is_active = true, revoked_at = NULL;

-- Remoção completa (DELETE) do registro temporário
DELETE FROM public.directory_sponsored_businesses
WHERE business_id = '00000000-0000-0000-0000-000000000201'::uuid AND priority = 100;

NOTIFY pgrst, 'reload schema';
