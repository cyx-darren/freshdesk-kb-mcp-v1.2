-- Add SEO fields to article_drafts table
ALTER TABLE article_drafts 
ADD COLUMN seo_title TEXT,
ADD COLUMN seo_description TEXT;

-- Add comments for the new fields
COMMENT ON COLUMN article_drafts.seo_title IS 'SEO title for search engines (recommended max 60 characters)';
COMMENT ON COLUMN article_drafts.seo_description IS 'SEO meta description for search engines (recommended max 160 characters)'; 