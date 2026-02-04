-- PrintHub Database Initialization Script
-- This script runs automatically when the PostgreSQL container is first created

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";  -- For text search

-- Create custom types/enums (optional, EF will handle this)
-- But we can pre-create them if needed

-- Set default timezone
SET timezone = 'UTC';

-- Create a schema for staging/temporary data if needed
CREATE SCHEMA IF NOT EXISTS staging;

-- Grant permissions
GRANT ALL PRIVILEGES ON DATABASE printhub_dev TO printhub_user;
GRANT ALL PRIVILEGES ON SCHEMA public TO printhub_user;
GRANT ALL PRIVILEGES ON SCHEMA staging TO printhub_user;

-- Create a function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION trigger_set_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Note: Tables will be created by Entity Framework migrations
-- This script is just for database-level setup

-- Output confirmation
DO $$
BEGIN
  RAISE NOTICE 'PrintHub database initialized successfully';
  RAISE NOTICE 'Database: printhub_dev';
  RAISE NOTICE 'User: printhub_user';
  RAISE NOTICE 'Extensions enabled: uuid-ossp, pg_trgm';
END $$;