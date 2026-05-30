-- Event reports (post-event summary)
CREATE TABLE IF NOT EXISTS public.event_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  summary JSONB DEFAULT '{}'::jsonb,
  pdf_url TEXT,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_event_reports_event_id ON public.event_reports (event_id);
