-- Add firecrawl_api_key to profiles so each user can use their own Firecrawl key
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS firecrawl_api_key text;
