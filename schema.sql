-- 1. raw_content table
CREATE TABLE IF NOT EXISTS raw_content (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_name TEXT NOT NULL,
    source_url TEXT UNIQUE NOT NULL,
    title TEXT NOT NULL,
    body TEXT,
    published_at_source TIMESTAMPTZ,
    scraped_at TIMESTAMPTZ DEFAULT NOW(),
    status TEXT NOT NULL DEFAULT 'raw', -- raw, queued, duplicate, discarded, processing, done
    relevance_score INTEGER DEFAULT 0,
    error_log TEXT
);

-- 2. articles table
CREATE TABLE IF NOT EXISTS articles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    raw_content_id UUID REFERENCES raw_content(id),
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    meta_title TEXT,
    meta_description TEXT,
    tags TEXT[],
    category TEXT,
    source_name TEXT,
    source_url TEXT,
    image_url TEXT,
    internal_link_entities TEXT[],
    status TEXT NOT NULL DEFAULT 'draft', -- draft, approved, published, discarded
    created_at TIMESTAMPTZ DEFAULT NOW(),
    reviewed_at TIMESTAMPTZ,
    published_at TIMESTAMPTZ
);

-- 3. job_log table
CREATE TABLE IF NOT EXISTS job_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    run_at TIMESTAMPTZ DEFAULT NOW(),
    items_fetched INTEGER DEFAULT 0,
    items_queued INTEGER DEFAULT 0,
    items_duplicated INTEGER DEFAULT 0,
    articles_generated INTEGER DEFAULT 0,
    errors TEXT,
    status TEXT NOT NULL DEFAULT 'running' -- running, completed, failed
);
