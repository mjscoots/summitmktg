-- Create role enum
CREATE TYPE public.app_role AS ENUM ('rookie', 'manager', 'admin');

-- Create status enum for roster
CREATE TYPE public.user_status AS ENUM ('active', 'contract_signed', 'onboarded', 'info_added', 'nlc');

-- Create experience enum
CREATE TYPE public.experience_level AS ENUM ('rookie', 'veteran');

-- User roles table (for auth)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL DEFAULT 'rookie',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Function to get user's primary role
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id UUID)
RETURNS app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.user_roles
  WHERE user_id = _user_id
  ORDER BY CASE role 
    WHEN 'admin' THEN 1 
    WHEN 'manager' THEN 2 
    WHEN 'rookie' THEN 3 
  END
  LIMIT 1
$$;

-- Profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  organization TEXT,
  recruiter TEXT,
  region TEXT,
  experience experience_level DEFAULT 'rookie',
  status user_status DEFAULT 'active',
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Announcements table
CREATE TABLE public.announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  author_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  target_role app_role, -- NULL means all roles
  is_pinned BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

-- Weekly schedule items
CREATE TABLE public.schedule_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6), -- 0=Sunday
  title TEXT NOT NULL,
  time_pst TEXT, -- e.g., "12:30 PM PST" or NULL for "ALL DAY"
  description TEXT,
  target_role app_role NOT NULL, -- 'rookie' or 'manager'
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
ALTER TABLE public.schedule_items ENABLE ROW LEVEL SECURITY;

-- Training courses (tiles)
CREATE TABLE public.training_courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  slug TEXT NOT NULL UNIQUE,
  target_role app_role, -- NULL means both roles, 'manager' means manager-only
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
ALTER TABLE public.training_courses ENABLE ROW LEVEL SECURITY;

-- Training modules (within courses)
CREATE TABLE public.training_modules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID REFERENCES public.training_courses(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
ALTER TABLE public.training_modules ENABLE ROW LEVEL SECURITY;

-- Training lessons (within modules)
CREATE TABLE public.training_lessons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id UUID REFERENCES public.training_modules(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL, -- Rich text / markdown
  key_takeaways TEXT[], -- Array of key points
  video_url TEXT,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
ALTER TABLE public.training_lessons ENABLE ROW LEVEL SECURITY;

-- Quiz questions
CREATE TABLE public.quiz_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id UUID REFERENCES public.training_lessons(id) ON DELETE CASCADE NOT NULL,
  question_text TEXT NOT NULL,
  question_type TEXT NOT NULL CHECK (question_type IN ('multiple_choice', 'short_answer', 'scenario')),
  options JSONB, -- For multiple choice: [{id, text, isCorrect}]
  correct_answer TEXT, -- For short answer
  explanation TEXT,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
ALTER TABLE public.quiz_questions ENABLE ROW LEVEL SECURITY;

-- User progress on lessons
CREATE TABLE public.lesson_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  lesson_id UUID REFERENCES public.training_lessons(id) ON DELETE CASCADE NOT NULL,
  completed_at TIMESTAMP WITH TIME ZONE,
  quiz_passed BOOLEAN DEFAULT false,
  quiz_score INTEGER, -- Percentage 0-100
  quiz_attempts INTEGER DEFAULT 0,
  last_attempt_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE (user_id, lesson_id)
);
ALTER TABLE public.lesson_progress ENABLE ROW LEVEL SECURITY;

-- Training videos library
CREATE TABLE public.training_videos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL, -- Pitch, Switchover, Backyard, Objections, Closing, Mindset, Coaching, Leadership, etc.
  video_url TEXT,
  duration_minutes INTEGER,
  target_role app_role, -- NULL means all, 'manager' means manager-only
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
ALTER TABLE public.training_videos ENABLE ROW LEVEL SECURITY;

-- Video watch progress
CREATE TABLE public.video_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  video_id UUID REFERENCES public.training_videos(id) ON DELETE CASCADE NOT NULL,
  watched BOOLEAN DEFAULT false,
  watched_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE (user_id, video_id)
);
ALTER TABLE public.video_progress ENABLE ROW LEVEL SECURITY;

-- Weekly leaderboard points
CREATE TABLE public.leaderboard_points (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  week_start DATE NOT NULL, -- Monday of the week
  training_points INTEGER DEFAULT 0,
  call_attendance_points INTEGER DEFAULT 0,
  roleplay_points INTEGER DEFAULT 0,
  quiz_points INTEGER DEFAULT 0,
  total_points INTEGER GENERATED ALWAYS AS (training_points + call_attendance_points + roleplay_points + quiz_points) STORED,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE (user_id, week_start)
);
ALTER TABLE public.leaderboard_points ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- User roles: users can read their own roles
CREATE POLICY "Users can view own roles" ON public.user_roles
  FOR SELECT USING (auth.uid() = user_id);

-- Profiles: users can view own profile, managers can view all active profiles
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Managers can view all active profiles" ON public.profiles
  FOR SELECT USING (
    public.has_role(auth.uid(), 'manager') AND status != 'nlc'
  );

CREATE POLICY "Admins can view all profiles" ON public.profiles
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all profiles" ON public.profiles
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Announcements: all authenticated users can read
CREATE POLICY "Authenticated users can view announcements" ON public.announcements
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage announcements" ON public.announcements
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Managers can create announcements" ON public.announcements
  FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'manager'));

-- Schedule items: all authenticated can read
CREATE POLICY "Authenticated users can view schedule" ON public.schedule_items
  FOR SELECT TO authenticated USING (is_active = true);

CREATE POLICY "Admins can manage schedule" ON public.schedule_items
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Training courses: all authenticated can read active courses
CREATE POLICY "Authenticated users can view courses" ON public.training_courses
  FOR SELECT TO authenticated USING (is_active = true);

CREATE POLICY "Admins can manage courses" ON public.training_courses
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Training modules: all authenticated can read
CREATE POLICY "Authenticated users can view modules" ON public.training_modules
  FOR SELECT TO authenticated USING (is_active = true);

CREATE POLICY "Admins can manage modules" ON public.training_modules
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Training lessons: all authenticated can read
CREATE POLICY "Authenticated users can view lessons" ON public.training_lessons
  FOR SELECT TO authenticated USING (is_active = true);

CREATE POLICY "Admins can manage lessons" ON public.training_lessons
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Quiz questions: all authenticated can read
CREATE POLICY "Authenticated users can view quiz questions" ON public.quiz_questions
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage quiz questions" ON public.quiz_questions
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Lesson progress: users manage own progress
CREATE POLICY "Users can manage own lesson progress" ON public.lesson_progress
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Managers can view all lesson progress" ON public.lesson_progress
  FOR SELECT USING (public.has_role(auth.uid(), 'manager'));

-- Training videos: authenticated can read
CREATE POLICY "Authenticated users can view videos" ON public.training_videos
  FOR SELECT TO authenticated USING (is_active = true);

CREATE POLICY "Admins can manage videos" ON public.training_videos
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Video progress: users manage own
CREATE POLICY "Users can manage own video progress" ON public.video_progress
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Managers can view all video progress" ON public.video_progress
  FOR SELECT USING (public.has_role(auth.uid(), 'manager'));

-- Leaderboard: rookies see rookies, managers see all
CREATE POLICY "Users can view own leaderboard" ON public.leaderboard_points
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Managers can view all leaderboard" ON public.leaderboard_points
  FOR SELECT USING (public.has_role(auth.uid(), 'manager'));

CREATE POLICY "View leaderboard based on role" ON public.leaderboard_points
  FOR SELECT USING (
    -- Check if viewing user is rookie, only show other rookies
    (public.get_user_role(auth.uid()) = 'rookie' AND public.get_user_role(user_id) = 'rookie')
    OR
    -- Managers can see everyone
    public.has_role(auth.uid(), 'manager')
  );

CREATE POLICY "Users can update own leaderboard" ON public.leaderboard_points
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own points" ON public.leaderboard_points
  FOR UPDATE USING (auth.uid() = user_id);

-- Trigger to create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, full_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', 'New User'));
  
  -- Default role is rookie
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'rookie');
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_announcements_updated_at
  BEFORE UPDATE ON public.announcements
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_leaderboard_updated_at
  BEFORE UPDATE ON public.leaderboard_points
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();