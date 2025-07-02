-- Create article_drafts table
CREATE TABLE article_drafts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  original_question TEXT,
  ai_response TEXT,
  category TEXT,
  subcategory TEXT,
  tags TEXT,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
  freshdesk_id TEXT,
  published_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for user_id for faster queries
CREATE INDEX idx_article_drafts_user_id ON article_drafts(user_id);

-- Create index for status for filtering
CREATE INDEX idx_article_drafts_status ON article_drafts(status);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_article_drafts_updated_at 
    BEFORE UPDATE ON article_drafts 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE article_drafts ENABLE ROW LEVEL SECURITY;

-- Create policy for users to only see their own drafts
CREATE POLICY "Users can view their own drafts" ON article_drafts
  FOR SELECT USING (auth.uid() = user_id);

-- Create policy for users to insert their own drafts
CREATE POLICY "Users can insert their own drafts" ON article_drafts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create policy for users to update their own drafts
CREATE POLICY "Users can update their own drafts" ON article_drafts
  FOR UPDATE USING (auth.uid() = user_id);

-- Create policy for users to delete their own drafts
CREATE POLICY "Users can delete their own drafts" ON article_drafts
  FOR DELETE USING (auth.uid() = user_id);