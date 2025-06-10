-- Check if draft exists and is linked to correct feedback
SELECT 
  fs.id as feedback_id,
  fs.question,
  fs.created_at as feedback_created,
  kad.id as draft_id,
  kad.title as draft_title,
  kad.status as draft_status,
  kad.created_at as draft_created
FROM feedback_submissions fs
LEFT JOIN kb_articles_draft kad ON fs.id = kad.feedback_id
WHERE fs.question ILIKE '%fridge magnets matt or gloss%'
ORDER BY fs.created_at DESC; 