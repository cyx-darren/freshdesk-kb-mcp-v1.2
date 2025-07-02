-- Create article_drafts table (the one frontend actually uses)
CREATE TABLE IF NOT EXISTS public.article_drafts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  original_question TEXT,
  ai_response TEXT,
  category TEXT,
  subcategory TEXT,
  folder_id TEXT,
  tags TEXT,
  seo_title TEXT,
  seo_description TEXT,
  status TEXT DEFAULT 'draft',
  freshdesk_id TEXT,
  published_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_article_drafts_user_id ON public.article_drafts(user_id);
CREATE INDEX IF NOT EXISTS idx_article_drafts_status ON public.article_drafts(status);
CREATE INDEX IF NOT EXISTS idx_article_drafts_original_question ON public.article_drafts(original_question);

-- Grant permissions
GRANT ALL ON public.article_drafts TO postgres;
GRANT ALL ON public.article_drafts TO authenticated;
GRANT ALL ON public.article_drafts TO anon;

-- Create updated_at trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger
DROP TRIGGER IF EXISTS update_article_drafts_updated_at ON public.article_drafts;
CREATE TRIGGER update_article_drafts_updated_at 
    BEFORE UPDATE ON public.article_drafts 
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column(); 