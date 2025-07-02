-- Create article_drafts table
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

-- Grant basic permissions
GRANT ALL ON public.article_drafts TO authenticated;
GRANT ALL ON public.article_drafts TO service_role; 