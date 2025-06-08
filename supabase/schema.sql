-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Profiles table linked to Supabase Auth
CREATE TABLE profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    username TEXT UNIQUE,
    email TEXT UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    last_login TIMESTAMP WITH TIME ZONE,
    role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin'))
);

-- Search history for analytics
CREATE TABLE search_history (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    query TEXT,
    category TEXT,
    results_count INTEGER,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- User preferences storage
CREATE TABLE user_preferences (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE UNIQUE NOT NULL,
    preferences_json JSONB DEFAULT '{}' NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Article cache table
CREATE TABLE article_cache (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    article_id TEXT UNIQUE NOT NULL,
    data JSONB NOT NULL,
    cached_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL
);

-- Create indexes for performance
CREATE INDEX idx_search_history_user_id ON search_history(user_id);
CREATE INDEX idx_search_history_timestamp ON search_history(timestamp);
CREATE INDEX idx_article_cache_article_id ON article_cache(article_id);
CREATE INDEX idx_article_cache_expires_at ON article_cache(expires_at);

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE search_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE article_cache ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can view own search history" ON search_history FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own search history" ON search_history FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can manage own preferences" ON user_preferences USING (auth.uid() = user_id);
CREATE POLICY "Authenticated users can read cache" ON article_cache FOR SELECT TO authenticated USING (true);
CREATE POLICY "Service role can manage cache" ON article_cache FOR ALL TO service_role USING (true);

-- Create a trigger to automatically create a profile when a user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (new.id, new.email);
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
