-- Feature Requests System Tables
-- This script creates the necessary tables for the feature request system

-- Create feature_requests table
CREATE TABLE IF NOT EXISTS feature_requests (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  use_case TEXT NOT NULL,
  priority VARCHAR(50) NOT NULL CHECK (priority IN ('must_have', 'nice_to_have', 'future')),
  category VARCHAR(100) CHECK (category IN ('ui_ux', 'functionality', 'integration', 'performance', 'mobile', 'reporting', 'other')),
  status VARCHAR(50) DEFAULT 'submitted' CHECK (status IN ('submitted', 'under_review', 'planned', 'in_development', 'completed', 'rejected')),
  user_email VARCHAR(255) NOT NULL,
  user_name VARCHAR(255),
  ticket_number VARCHAR(20) UNIQUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create feature_attachments table
CREATE TABLE IF NOT EXISTS feature_attachments (
  id SERIAL PRIMARY KEY,
  feature_request_id INTEGER REFERENCES feature_requests(id) ON DELETE CASCADE,
  file_url TEXT NOT NULL,
  file_name VARCHAR(255),
  file_size INTEGER,
  file_type VARCHAR(100),
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_feature_requests_user_email ON feature_requests(user_email);
CREATE INDEX IF NOT EXISTS idx_feature_requests_status ON feature_requests(status);
CREATE INDEX IF NOT EXISTS idx_feature_requests_priority ON feature_requests(priority);
CREATE INDEX IF NOT EXISTS idx_feature_requests_category ON feature_requests(category);
CREATE INDEX IF NOT EXISTS idx_feature_requests_created_at ON feature_requests(created_at);
CREATE INDEX IF NOT EXISTS idx_feature_requests_ticket_number ON feature_requests(ticket_number);
CREATE INDEX IF NOT EXISTS idx_feature_attachments_feature_request_id ON feature_attachments(feature_request_id);

-- Create updated_at trigger function (if not exists from bug reports)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS update_feature_requests_updated_at ON feature_requests;
CREATE TRIGGER update_feature_requests_updated_at
    BEFORE UPDATE ON feature_requests
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Generate feature ticket number function
CREATE OR REPLACE FUNCTION generate_feature_ticket_number()
RETURNS TEXT AS $$
DECLARE
    new_ticket_number TEXT;
    counter INTEGER := 1;
BEGIN
    LOOP
        -- Generate ticket number in format: FEAT-YYYYMMDD-NNNN
        new_ticket_number := 'FEAT-' || TO_CHAR(CURRENT_DATE, 'YYYYMMDD') || '-' || LPAD(counter::TEXT, 4, '0');
        
        -- Check if this ticket number already exists
        IF NOT EXISTS (SELECT 1 FROM feature_requests WHERE ticket_number = new_ticket_number) THEN
            RETURN new_ticket_number;
        END IF;
        
        counter := counter + 1;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Add RLS (Row Level Security) policies
-- Enable RLS on feature_requests table
ALTER TABLE feature_requests ENABLE ROW LEVEL SECURITY;

-- Policy to allow users to read their own feature requests
CREATE POLICY "Users can view their own feature requests" ON feature_requests
    FOR SELECT USING (user_email = auth.email());

-- Policy to allow users to insert their own feature requests
CREATE POLICY "Users can create feature requests" ON feature_requests
    FOR INSERT WITH CHECK (user_email = auth.email());

-- Enable RLS on feature_attachments table
ALTER TABLE feature_attachments ENABLE ROW LEVEL SECURITY;

-- Policy to allow users to view attachments for their own feature requests
CREATE POLICY "Users can view attachments for their feature requests" ON feature_attachments
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM feature_requests 
            WHERE feature_requests.id = feature_attachments.feature_request_id 
            AND feature_requests.user_email = auth.email()
        )
    );

-- Policy to allow users to insert attachments for their own feature requests
CREATE POLICY "Users can add attachments to their feature requests" ON feature_attachments
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM feature_requests 
            WHERE feature_requests.id = feature_attachments.feature_request_id 
            AND feature_requests.user_email = auth.email()
        )
    ); 