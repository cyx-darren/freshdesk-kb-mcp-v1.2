-- Check the feedback_submissions table structure
\d feedback_submissions;

-- Check the current data for the fridge magnet question
SELECT 
  id,
  question,
  status,
  published_article_id,
  created_at,
  updated_at
FROM feedback_submissions 
WHERE question ILIKE '%minimum order%fridge magnet%'
ORDER BY created_at DESC
LIMIT 5;

-- Check the "table cloth" feedback entry specifically
SELECT id, question, status, published_article_id, created_at 
FROM feedback_submissions 
WHERE question ILIKE '%table cloth%'
ORDER BY created_at DESC
LIMIT 3;

-- Check all recent feedback submissions to see their status
SELECT id, question, status, published_article_id, created_at 
FROM feedback_submissions 
ORDER BY created_at DESC 
LIMIT 10; 