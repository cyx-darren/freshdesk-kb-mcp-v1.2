-- Verify table structure
\d kb_articles_draft;

-- Check if table exists and is empty
SELECT COUNT(*) as row_count FROM kb_articles_draft;

-- Show table columns
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'kb_articles_draft' 
ORDER BY ordinal_position; 