-- Bug Reports System Tables
-- This script creates the necessary tables for the bug reporting system

-- Create bug_reports table
CREATE TABLE IF NOT EXISTS bug_reports (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  severity VARCHAR(50) NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  status VARCHAR(50) DEFAULT 'new' CHECK (status IN ('new', 'in_progress', 'resolved', 'closed', 'reopened')),
  user_email VARCHAR(255) NOT NULL,
  user_name VARCHAR(255),
  ticket_number VARCHAR(20) UNIQUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create bug_attachments table
CREATE TABLE IF NOT EXISTS bug_attachments (
  id SERIAL PRIMARY KEY,
  bug_report_id INTEGER REFERENCES bug_reports(id) ON DELETE CASCADE,
  file_url TEXT NOT NULL,
  file_name VARCHAR(255),
  file_size INTEGER,
  file_type VARCHAR(100),
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_bug_reports_user_email ON bug_reports(user_email);
CREATE INDEX IF NOT EXISTS idx_bug_reports_status ON bug_reports(status);
CREATE INDEX IF NOT EXISTS idx_bug_reports_severity ON bug_reports(severity);
CREATE INDEX IF NOT EXISTS idx_bug_reports_created_at ON bug_reports(created_at);
CREATE INDEX IF NOT EXISTS idx_bug_reports_ticket_number ON bug_reports(ticket_number);
CREATE INDEX IF NOT EXISTS idx_bug_attachments_bug_report_id ON bug_attachments(bug_report_id);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS update_bug_reports_updated_at ON bug_reports;
CREATE TRIGGER update_bug_reports_updated_at
    BEFORE UPDATE ON bug_reports
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Generate ticket number function
CREATE OR REPLACE FUNCTION generate_ticket_number()
RETURNS TEXT AS $$
DECLARE
    new_ticket_number TEXT;
    counter INTEGER := 1;
BEGIN
    LOOP
        -- Generate ticket number in format: BUG-YYYYMMDD-NNNN
        new_ticket_number := 'BUG-' || TO_CHAR(CURRENT_DATE, 'YYYYMMDD') || '-' || LPAD(counter::TEXT, 4, '0');
        
        -- Check if this ticket number already exists
        IF NOT EXISTS (SELECT 1 FROM bug_reports WHERE ticket_number = new_ticket_number) THEN
            RETURN new_ticket_number;
        END IF;
        
        counter := counter + 1;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Add RLS (Row Level Security) policies if using Supabase
-- Enable RLS on bug_reports table
ALTER TABLE bug_reports ENABLE ROW LEVEL SECURITY;

-- Policy to allow users to read their own bug reports
CREATE POLICY "Users can view their own bug reports" ON bug_reports
    FOR SELECT USING (user_email = auth.email());

-- Policy to allow users to insert their own bug reports
CREATE POLICY "Users can create bug reports" ON bug_reports
    FOR INSERT WITH CHECK (user_email = auth.email());

-- Enable RLS on bug_attachments table
ALTER TABLE bug_attachments ENABLE ROW LEVEL SECURITY;

-- Policy to allow users to view attachments for their own bug reports
CREATE POLICY "Users can view attachments for their bug reports" ON bug_attachments
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM bug_reports 
            WHERE bug_reports.id = bug_attachments.bug_report_id 
            AND bug_reports.user_email = auth.email()
        )
    );

-- Policy to allow users to insert attachments for their own bug reports
CREATE POLICY "Users can add attachments to their bug reports" ON bug_attachments
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM bug_reports 
            WHERE bug_reports.id = bug_attachments.bug_report_id 
            AND bug_reports.user_email = auth.email()
        )
    );

-- Admin policies (for future admin access)
-- Note: These policies assume you have an admin role system
-- CREATE POLICY "Admins can view all bug reports" ON bug_reports
--     FOR ALL USING (auth.jwt() ->> 'role' = 'admin');

-- CREATE POLICY "Admins can view all attachments" ON bug_attachments
--     FOR ALL USING (auth.jwt() ->> 'role' = 'admin'); 