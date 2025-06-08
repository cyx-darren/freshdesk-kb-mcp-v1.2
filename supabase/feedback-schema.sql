-- =====================================================
-- Freshdesk Knowledge Base Feedback System Schema
-- =====================================================

-- Create custom types for enums
CREATE TYPE feedback_type_enum AS ENUM ('correct', 'incorrect', 'needs_improvement');
CREATE TYPE feedback_status_enum AS ENUM ('pending', 'in_progress', 'completed');

-- =====================================================
-- Feedback Submissions Table
-- =====================================================

CREATE TABLE IF NOT EXISTS public.feedback_submissions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    question TEXT NOT NULL,
    ai_response TEXT NOT NULL,
    feedback_type feedback_type_enum NOT NULL,
    user_session_id TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    status feedback_status_enum DEFAULT 'pending' NOT NULL,
    assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    category_attempted TEXT,
    
    -- Indexes for better performance
    CONSTRAINT feedback_submissions_question_check CHECK (char_length(question) > 0),
    CONSTRAINT feedback_submissions_ai_response_check CHECK (char_length(ai_response) > 0),
    CONSTRAINT feedback_submissions_user_session_check CHECK (char_length(user_session_id) > 0)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_feedback_submissions_created_at ON public.feedback_submissions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_feedback_submissions_status ON public.feedback_submissions(status);
CREATE INDEX IF NOT EXISTS idx_feedback_submissions_assigned_to ON public.feedback_submissions(assigned_to);
CREATE INDEX IF NOT EXISTS idx_feedback_submissions_feedback_type ON public.feedback_submissions(feedback_type);
CREATE INDEX IF NOT EXISTS idx_feedback_submissions_user_session ON public.feedback_submissions(user_session_id);

-- =====================================================
-- Knowledge Base Articles Draft Table
-- =====================================================

CREATE TABLE IF NOT EXISTS public.kb_articles_draft (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    feedback_id UUID NOT NULL REFERENCES public.feedback_submissions(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    category_id INTEGER,
    subcategory_id INTEGER,
    created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    published_at TIMESTAMP WITH TIME ZONE,
    freshdesk_article_id TEXT,
    
    -- Constraints
    CONSTRAINT kb_articles_draft_title_check CHECK (char_length(title) > 0),
    CONSTRAINT kb_articles_draft_content_check CHECK (char_length(content) > 0),
    CONSTRAINT kb_articles_draft_published_check CHECK (
        (published_at IS NULL) OR (published_at >= created_at)
    )
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_kb_articles_draft_feedback_id ON public.kb_articles_draft(feedback_id);
CREATE INDEX IF NOT EXISTS idx_kb_articles_draft_created_by ON public.kb_articles_draft(created_by);
CREATE INDEX IF NOT EXISTS idx_kb_articles_draft_created_at ON public.kb_articles_draft(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_kb_articles_draft_published_at ON public.kb_articles_draft(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_kb_articles_draft_category ON public.kb_articles_draft(category_id);
CREATE INDEX IF NOT EXISTS idx_kb_articles_draft_freshdesk_id ON public.kb_articles_draft(freshdesk_article_id);

-- =====================================================
-- Row Level Security (RLS) Policies
-- =====================================================

-- Enable RLS on both tables
ALTER TABLE public.feedback_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kb_articles_draft ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- Feedback Submissions RLS Policies
-- =====================================================

-- Policy: Team members can read all feedback submissions
CREATE POLICY "Team members can read all feedback submissions"
    ON public.feedback_submissions
    FOR SELECT
    USING (auth.uid() IS NOT NULL);

-- Policy: Team members can insert new feedback submissions
CREATE POLICY "Team members can create feedback submissions"
    ON public.feedback_submissions
    FOR INSERT
    WITH CHECK (auth.uid() IS NOT NULL);

-- Policy: Team members can update feedback submissions assigned to them
CREATE POLICY "Team members can update assigned feedback"
    ON public.feedback_submissions
    FOR UPDATE
    USING (
        auth.uid() IS NOT NULL AND 
        (assigned_to = auth.uid() OR assigned_to IS NULL)
    )
    WITH CHECK (
        auth.uid() IS NOT NULL AND 
        (assigned_to = auth.uid() OR assigned_to IS NULL)
    );

-- Policy: Team members can assign feedback to themselves or others
CREATE POLICY "Team members can assign feedback"
    ON public.feedback_submissions
    FOR UPDATE
    USING (auth.uid() IS NOT NULL)
    WITH CHECK (auth.uid() IS NOT NULL);

-- =====================================================
-- KB Articles Draft RLS Policies
-- =====================================================

-- Policy: Team members can read all draft articles
CREATE POLICY "Team members can read all draft articles"
    ON public.kb_articles_draft
    FOR SELECT
    USING (auth.uid() IS NOT NULL);

-- Policy: Team members can create draft articles
CREATE POLICY "Team members can create draft articles"
    ON public.kb_articles_draft
    FOR INSERT
    WITH CHECK (
        auth.uid() IS NOT NULL AND 
        created_by = auth.uid()
    );

-- Policy: Team members can update their own draft articles
CREATE POLICY "Team members can update own draft articles"
    ON public.kb_articles_draft
    FOR UPDATE
    USING (
        auth.uid() IS NOT NULL AND 
        created_by = auth.uid()
    )
    WITH CHECK (
        auth.uid() IS NOT NULL AND 
        created_by = auth.uid()
    );

-- Policy: Team members can delete their own draft articles
CREATE POLICY "Team members can delete own draft articles"
    ON public.kb_articles_draft
    FOR DELETE
    USING (
        auth.uid() IS NOT NULL AND 
        created_by = auth.uid()
    );

-- =====================================================
-- Helper Functions
-- =====================================================

-- Function to get feedback statistics
CREATE OR REPLACE FUNCTION get_feedback_stats()
RETURNS TABLE (
    total_feedback BIGINT,
    pending_feedback BIGINT,
    in_progress_feedback BIGINT,
    completed_feedback BIGINT,
    correct_feedback BIGINT,
    incorrect_feedback BIGINT,
    needs_improvement_feedback BIGINT
) 
LANGUAGE SQL
SECURITY DEFINER
AS $$
    SELECT 
        COUNT(*) as total_feedback,
        COUNT(*) FILTER (WHERE status = 'pending') as pending_feedback,
        COUNT(*) FILTER (WHERE status = 'in_progress') as in_progress_feedback,
        COUNT(*) FILTER (WHERE status = 'completed') as completed_feedback,
        COUNT(*) FILTER (WHERE feedback_type = 'correct') as correct_feedback,
        COUNT(*) FILTER (WHERE feedback_type = 'incorrect') as incorrect_feedback,
        COUNT(*) FILTER (WHERE feedback_type = 'needs_improvement') as needs_improvement_feedback
    FROM public.feedback_submissions;
$$;

-- Function to get user's assigned feedback
CREATE OR REPLACE FUNCTION get_my_assigned_feedback()
RETURNS SETOF public.feedback_submissions
LANGUAGE SQL
SECURITY DEFINER
AS $$
    SELECT *
    FROM public.feedback_submissions
    WHERE assigned_to = auth.uid()
    ORDER BY created_at DESC;
$$;

-- Function to assign feedback to a user
CREATE OR REPLACE FUNCTION assign_feedback(
    feedback_id UUID,
    user_id UUID DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Update the feedback assignment
    UPDATE public.feedback_submissions
    SET 
        assigned_to = user_id,
        status = CASE 
            WHEN user_id IS NOT NULL THEN 'in_progress'::feedback_status_enum
            ELSE 'pending'::feedback_status_enum
        END
    WHERE id = feedback_id;
    
    -- Check if the update was successful
    IF FOUND THEN
        RETURN TRUE;
    ELSE
        RETURN FALSE;
    END IF;
END;
$$;

-- =====================================================
-- Views for easier querying
-- =====================================================

-- View: Feedback with user information
CREATE OR REPLACE VIEW feedback_with_users AS
SELECT 
    fs.*,
    au.email as assigned_to_email,
    au.raw_user_meta_data->>'full_name' as assigned_to_name
FROM public.feedback_submissions fs
LEFT JOIN auth.users au ON fs.assigned_to = au.id;

-- View: Draft articles with feedback information
CREATE OR REPLACE VIEW draft_articles_with_feedback AS
SELECT 
    kad.*,
    fs.question,
    fs.feedback_type,
    fs.user_session_id,
    au_creator.email as created_by_email,
    au_creator.raw_user_meta_data->>'full_name' as created_by_name
FROM public.kb_articles_draft kad
JOIN public.feedback_submissions fs ON kad.feedback_id = fs.id
LEFT JOIN auth.users au_creator ON kad.created_by = au_creator.id;

-- =====================================================
-- Triggers for automatic timestamps
-- =====================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Note: Add updated_at column if you want to track updates
-- ALTER TABLE public.feedback_submissions ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
-- CREATE TRIGGER update_feedback_submissions_updated_at 
--     BEFORE UPDATE ON public.feedback_submissions 
--     FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- Sample Data (Optional - for testing)
-- =====================================================

-- Uncomment the following to insert sample data for testing
/*
INSERT INTO public.feedback_submissions (
    question, 
    ai_response, 
    feedback_type, 
    user_session_id, 
    category_attempted
) VALUES 
(
    'How do I setup my printer?',
    'To set up your printer, first connect it to your computer via USB or WiFi...',
    'needs_improvement',
    'session_123',
    'Printer Setup'
),
(
    'What are your business hours?',
    'Our business hours are Monday to Friday, 9 AM to 5 PM.',
    'correct',
    'session_124',
    'General Information'
),
(
    'How do I return a product?',
    'You can return products by visiting our returns page...',
    'incorrect',
    'session_125',
    'Returns'
);
*/

-- =====================================================
-- Comments and Documentation
-- =====================================================

COMMENT ON TABLE public.feedback_submissions IS 'Stores user feedback on AI responses for knowledge base improvement';
COMMENT ON TABLE public.kb_articles_draft IS 'Draft knowledge base articles created from feedback';

COMMENT ON COLUMN public.feedback_submissions.question IS 'The original user question';
COMMENT ON COLUMN public.feedback_submissions.ai_response IS 'The AI-generated response that received feedback';
COMMENT ON COLUMN public.feedback_submissions.feedback_type IS 'Type of feedback: correct, incorrect, or needs_improvement';
COMMENT ON COLUMN public.feedback_submissions.user_session_id IS 'Anonymous session identifier for the user';
COMMENT ON COLUMN public.feedback_submissions.status IS 'Current processing status of the feedback';
COMMENT ON COLUMN public.feedback_submissions.assigned_to IS 'Team member assigned to handle this feedback';
COMMENT ON COLUMN public.feedback_submissions.category_attempted IS 'The category the AI attempted to answer from';

COMMENT ON COLUMN public.kb_articles_draft.feedback_id IS 'Reference to the feedback that prompted this draft';
COMMENT ON COLUMN public.kb_articles_draft.title IS 'Title of the draft knowledge base article';
COMMENT ON COLUMN public.kb_articles_draft.content IS 'Content of the draft article';
COMMENT ON COLUMN public.kb_articles_draft.category_id IS 'Freshdesk category ID where this will be published';
COMMENT ON COLUMN public.kb_articles_draft.subcategory_id IS 'Freshdesk subcategory ID';
COMMENT ON COLUMN public.kb_articles_draft.freshdesk_article_id IS 'Freshdesk article ID after publication'; 