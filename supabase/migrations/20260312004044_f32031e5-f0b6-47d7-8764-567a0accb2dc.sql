
-- Profiles table
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  company_name text,
  company_logo_url text,
  email text,
  phone text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email)
  VALUES (NEW.id, NEW.email);
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Company DNA table
CREATE TABLE public.company_dna (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  services text[] DEFAULT '{}',
  differentials text[] DEFAULT '{}',
  target_audience text DEFAULT '',
  value_proposition text DEFAULT '',
  tone text DEFAULT '',
  additional_info text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.company_dna ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own dna" ON public.company_dna
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own dna" ON public.company_dna
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own dna" ON public.company_dna
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- Storage bucket for logos
INSERT INTO storage.buckets (id, name, public) VALUES ('company-logos', 'company-logos', true);

CREATE POLICY "Users can upload own logo" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'company-logos' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can update own logo" ON storage.objects
  FOR UPDATE TO authenticated USING (bucket_id = 'company-logos' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Anyone can view logos" ON storage.objects
  FOR SELECT TO public USING (bucket_id = 'company-logos');
