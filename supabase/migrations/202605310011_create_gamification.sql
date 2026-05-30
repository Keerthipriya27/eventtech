-- Gamification: xp ledger, badges, achievements
CREATE TABLE IF NOT EXISTS public.xp_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  event_id UUID REFERENCES public.events(id),
  change INTEGER NOT NULL,
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  points INTEGER DEFAULT 0,
  hidden BOOLEAN DEFAULT false
);

CREATE TABLE IF NOT EXISTS public.user_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  achievement_id UUID NOT NULL REFERENCES public.achievements(id),
  unlocked_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
