-- Networking: connections and messages

CREATE TABLE IF NOT EXISTS public.connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  target_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'connected',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, target_user_id)
);

CREATE TABLE IF NOT EXISTS public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recipient_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS for messages and connections
ALTER TABLE public.connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- policies: users can insert/select their own connections/messages
DROP POLICY IF EXISTS "connections_read_parties" ON public.connections;
CREATE POLICY "connections_read_parties" ON public.connections FOR SELECT USING (
  auth.uid() = user_id OR auth.uid() = target_user_id
);
DROP POLICY IF EXISTS "connections_insert_own" ON public.connections;
CREATE POLICY "connections_insert_own" ON public.connections FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "messages_read_parties" ON public.messages;
CREATE POLICY "messages_read_parties" ON public.messages FOR SELECT USING (
  auth.uid() = sender_id OR auth.uid() = recipient_id
);
DROP POLICY IF EXISTS "messages_insert_own" ON public.messages;
CREATE POLICY "messages_insert_own" ON public.messages FOR INSERT WITH CHECK (auth.uid() = sender_id);
