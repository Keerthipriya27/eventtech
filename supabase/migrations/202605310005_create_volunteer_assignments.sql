-- Volunteer assignments
CREATE TABLE IF NOT EXISTS public.volunteer_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES public.volunteer_tasks(id) ON DELETE CASCADE,
  volunteer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  score NUMERIC DEFAULT 0,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  status TEXT NOT NULL DEFAULT 'assigned'
);

CREATE INDEX IF NOT EXISTS idx_vol_assign_task ON public.volunteer_assignments (task_id);
CREATE INDEX IF NOT EXISTS idx_vol_assign_volunteer ON public.volunteer_assignments (volunteer_id);
