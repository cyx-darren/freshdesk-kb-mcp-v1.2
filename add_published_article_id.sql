-- Add the missing published_article_id column to feedback_submissions table
ALTER TABLE feedback_submissions 
ADD COLUMN IF NOT EXISTS published_article_id TEXT;

-- Update the specific record that was published
UPDATE feedback_submissions 
SET 
    published_article_id = '151000214791',
    status = 'completed'
WHERE id = '06cb421f-939c-4791-9768-65a0ff70745d';

-- Verify the update
SELECT id, question, status, published_article_id, created_at 
FROM feedback_submissions 
WHERE id = '06cb421f-939c-4791-9768-65a0ff70745d';

-- Create an index for better performance
CREATE INDEX IF NOT EXISTS idx_feedback_published_article 
ON feedback_submissions(published_article_id);

-- Verify the column was added
\d feedback_submissions; 