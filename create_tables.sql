-- Drop existing table if it exists to avoid conflicts
DROP TABLE IF EXISTS public.kb_articles_draft CASCADE;

-- Create kb_articles_draft table (minimal version)
CREATE TABLE public.kb_articles_draft (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    feedback_id UUID,
    title TEXT,
    content TEXT,
    original_question TEXT,
    ai_response TEXT,
    folder_id TEXT,
    tags TEXT,
    seo_title TEXT,
    seo_description TEXT,
    freshdesk_article_id TEXT,
    user_id TEXT,
    status TEXT DEFAULT 'draft',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes
CREATE INDEX idx_kb_articles_draft_feedback_id ON public.kb_articles_draft(feedback_id);
CREATE INDEX idx_kb_articles_draft_user_id ON public.kb_articles_draft(user_id);

-- Grant basic permissions
GRANT ALL ON public.kb_articles_draft TO postgres;
GRANT ALL ON public.kb_articles_draft TO authenticated;
GRANT ALL ON public.kb_articles_draft TO anon;

-- Create updated_at trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at column
DROP TRIGGER IF EXISTS update_kb_articles_draft_updated_at ON public.kb_articles_draft;
CREATE TRIGGER update_kb_articles_draft_updated_at
    BEFORE UPDATE ON public.kb_articles_draft
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column(); 