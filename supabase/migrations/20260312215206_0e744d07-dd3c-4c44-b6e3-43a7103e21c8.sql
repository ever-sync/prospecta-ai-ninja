
-- Add elevenlabs_voice_id to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS elevenlabs_voice_id text;

-- Add send_as_audio to message_templates
ALTER TABLE public.message_templates ADD COLUMN IF NOT EXISTS send_as_audio boolean NOT NULL DEFAULT false;

-- Create audio-messages storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('audio-messages', 'audio-messages', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload to audio-messages
CREATE POLICY "Users can upload audio" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'audio-messages');

-- Allow public read access to audio-messages
CREATE POLICY "Public can read audio" ON storage.objects FOR SELECT TO public
USING (bucket_id = 'audio-messages');
