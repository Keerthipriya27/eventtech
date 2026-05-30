-- Notification rules and logs
CREATE TABLE IF NOT EXISTS public.notification_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES public.events(id),
  trigger TEXT NOT NULL,
  channel TEXT NOT NULL DEFAULT 'in_app',
  template JSONB DEFAULT '{}'::jsonb,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.notification_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_id UUID REFERENCES public.notification_rules(id),
  user_id UUID REFERENCES auth.users(id),
  payload JSONB DEFAULT '{}'::jsonb,
  status TEXT DEFAULT 'pending',
  sent_at TIMESTAMPTZ
);
