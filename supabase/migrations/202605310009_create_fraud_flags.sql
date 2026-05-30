-- Fraud / spam flags
CREATE TABLE IF NOT EXISTS public.fraud_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  risk_score NUMERIC DEFAULT 0,
  reasons JSONB DEFAULT '[]'::jsonb,
  flagged_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_fraud_entity ON public.fraud_flags (entity_type, entity_id);
