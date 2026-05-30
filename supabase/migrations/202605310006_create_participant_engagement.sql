-- Participant engagement scores
CREATE TABLE IF NOT EXISTS public.participant_engagement (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  score NUMERIC DEFAULT 0,
  trend JSONB DEFAULT '[]'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_participant_engagement_user_event ON public.participant_engagement (user_id, event_id);
