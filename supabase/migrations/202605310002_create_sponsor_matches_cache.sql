-- Sponsor matches cache
CREATE TABLE IF NOT EXISTS public.sponsor_matches_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sponsor_id UUID REFERENCES auth.users(id),
  event_id UUID,
  score INTEGER,
  roi_estimate INTEGER,
  confidence NUMERIC,
  payload JSONB DEFAULT '{}'::jsonb,
  scored_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sponsor_matches_sponsor_id ON public.sponsor_matches_cache (sponsor_id);
