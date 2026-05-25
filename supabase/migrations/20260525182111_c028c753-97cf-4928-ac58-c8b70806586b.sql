
-- Roles enum and table
CREATE TYPE public.app_role AS ENUM ('organizer','volunteer','sponsor','participant');

CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  avatar_url TEXT,
  bio TEXT,
  skills TEXT[] DEFAULT '{}',
  xp INTEGER NOT NULL DEFAULT 0,
  level INTEGER NOT NULL DEFAULT 1,
  badges TEXT[] DEFAULT '{}',
  company TEXT,
  industry TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  UNIQUE(user_id, role)
);

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS(SELECT 1 FROM public.user_roles WHERE user_id=_user_id AND role=_role)
$$;

CREATE TABLE public.events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organizer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT,
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ,
  location TEXT,
  capacity INTEGER DEFAULT 100,
  budget NUMERIC DEFAULT 0,
  cover_image TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  intelligence_score INTEGER DEFAULT 0,
  ai_metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.registrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  qr_code TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  checked_in BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(event_id, user_id)
);

CREATE TABLE public.volunteer_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  required_skills TEXT[] DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'open',
  assigned_to UUID REFERENCES auth.users(id),
  xp_reward INTEGER DEFAULT 50,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.sponsorships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  sponsor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  package_name TEXT,
  amount NUMERIC DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending',
  roi_score INTEGER DEFAULT 0,
  match_score INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.certificates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  certificate_url TEXT,
  issued_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.volunteer_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sponsorships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.certificates ENABLE ROW LEVEL SECURITY;

-- Profiles: public read, owner update
CREATE POLICY "profiles_read" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "profiles_insert_own" ON public.profiles FOR INSERT WITH CHECK (auth.uid()=id);
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE USING (auth.uid()=id);

-- user_roles: users see their own, insert on signup
CREATE POLICY "roles_read_own" ON public.user_roles FOR SELECT USING (auth.uid()=user_id);
CREATE POLICY "roles_insert_own" ON public.user_roles FOR INSERT WITH CHECK (auth.uid()=user_id);

-- events: public read, organizer manages own
CREATE POLICY "events_read" ON public.events FOR SELECT USING (true);
CREATE POLICY "events_insert_organizer" ON public.events FOR INSERT WITH CHECK (auth.uid()=organizer_id);
CREATE POLICY "events_update_owner" ON public.events FOR UPDATE USING (auth.uid()=organizer_id);
CREATE POLICY "events_delete_owner" ON public.events FOR DELETE USING (auth.uid()=organizer_id);

-- registrations
CREATE POLICY "regs_read_own_or_organizer" ON public.registrations FOR SELECT USING (
  auth.uid()=user_id OR EXISTS(SELECT 1 FROM events WHERE events.id=event_id AND events.organizer_id=auth.uid())
);
CREATE POLICY "regs_insert_own" ON public.registrations FOR INSERT WITH CHECK (auth.uid()=user_id);
CREATE POLICY "regs_delete_own" ON public.registrations FOR DELETE USING (auth.uid()=user_id);

-- volunteer tasks
CREATE POLICY "tasks_read_all" ON public.volunteer_tasks FOR SELECT USING (true);
CREATE POLICY "tasks_insert_organizer" ON public.volunteer_tasks FOR INSERT WITH CHECK (
  EXISTS(SELECT 1 FROM events WHERE events.id=event_id AND events.organizer_id=auth.uid())
);
CREATE POLICY "tasks_update_assigned_or_organizer" ON public.volunteer_tasks FOR UPDATE USING (
  auth.uid()=assigned_to OR EXISTS(SELECT 1 FROM events WHERE events.id=event_id AND events.organizer_id=auth.uid())
);

-- sponsorships
CREATE POLICY "sp_read_party" ON public.sponsorships FOR SELECT USING (
  auth.uid()=sponsor_id OR EXISTS(SELECT 1 FROM events WHERE events.id=event_id AND events.organizer_id=auth.uid())
);
CREATE POLICY "sp_insert_sponsor" ON public.sponsorships FOR INSERT WITH CHECK (auth.uid()=sponsor_id);
CREATE POLICY "sp_update_party" ON public.sponsorships FOR UPDATE USING (
  auth.uid()=sponsor_id OR EXISTS(SELECT 1 FROM events WHERE events.id=event_id AND events.organizer_id=auth.uid())
);

-- certificates
CREATE POLICY "cert_read_own" ON public.certificates FOR SELECT USING (auth.uid()=user_id);
CREATE POLICY "cert_insert_organizer" ON public.certificates FOR INSERT WITH CHECK (
  EXISTS(SELECT 1 FROM events WHERE events.id=event_id AND events.organizer_id=auth.uid())
);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email,'@',1)));
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
