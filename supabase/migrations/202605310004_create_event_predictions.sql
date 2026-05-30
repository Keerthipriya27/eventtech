-- Event predictions table
CREATE TABLE IF NOT EXISTS public.event_predictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  model_version TEXT,
  success_probability NUMERIC,
  risk_factors JSONB DEFAULT '{}'::jsonb,
  recommended_actions JSONB DEFAULT '[]'::jsonb,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_event_predictions_event_id ON public.event_predictions (event_id);
