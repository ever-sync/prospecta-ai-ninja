DO $$ BEGIN
    CREATE TYPE robot_task_status AS ENUM ('pending', 'running', 'completed', 'failed');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;
CREATE TABLE IF NOT EXISTS public.robot_tasks (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    search_term TEXT NOT NULL,
    location TEXT NOT NULL,
    status robot_task_status DEFAULT 'pending',
    triggers JSONB DEFAULT '{}'::jsonb,
    results JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS
ALTER TABLE public.robot_tasks ENABLE ROW LEVEL SECURITY;

-- Policies
DO $$ BEGIN
    DROP POLICY IF EXISTS "Users can manage their own robot tasks" ON public.robot_tasks;
    CREATE POLICY "Users can manage their own robot tasks" 
        ON public.robot_tasks 
        FOR ALL 
        USING (auth.uid() = user_id);
END $$;
