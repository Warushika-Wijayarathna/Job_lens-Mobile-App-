-- Migration script to update jobs table for real job listings integration
-- Run this if you have an existing jobs table with the old schema

-- Drop existing jobs table if it exists (be careful in production!)
DROP TABLE IF EXISTS jobs CASCADE;

-- Create the new jobs table for real job listings
CREATE TABLE jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR NOT NULL,
    company VARCHAR NOT NULL,
    location VARCHAR,
    url VARCHAR UNIQUE NOT NULL,
    description TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    external_id VARCHAR,
    job_type VARCHAR,
    salary VARCHAR,
    category VARCHAR
);

-- Create index for faster searches
CREATE INDEX IF NOT EXISTS idx_jobs_title ON jobs(title);
CREATE INDEX IF NOT EXISTS idx_jobs_company ON jobs(company);
CREATE INDEX IF NOT EXISTS idx_jobs_url ON jobs(url);
CREATE INDEX IF NOT EXISTS idx_jobs_external_id ON jobs(external_id);
CREATE INDEX IF NOT EXISTS idx_jobs_created_at ON jobs(created_at DESC);

-- Create a compound index for text search
CREATE INDEX IF NOT EXISTS idx_jobs_search ON jobs USING gin(to_tsvector('english', title || ' ' || company));
