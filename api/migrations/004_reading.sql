-- Reading Module Migration
-- Books, reading lists, and reading goals

-- Books table for user's library
CREATE TABLE IF NOT EXISTS books (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Identifiers
    google_books_id VARCHAR(50),
    isbn_10 VARCHAR(10),
    isbn_13 VARCHAR(13),

    -- Book info
    title VARCHAR(500) NOT NULL,
    subtitle VARCHAR(500),
    authors TEXT[] NOT NULL DEFAULT '{}',
    publisher VARCHAR(255),
    published_date VARCHAR(20),
    description TEXT,
    page_count INT,
    categories TEXT[],
    language VARCHAR(10) DEFAULT 'en',

    -- Images
    thumbnail_url VARCHAR(500),

    -- User's copy
    format VARCHAR(20) DEFAULT 'physical', -- physical, ebook, audiobook
    owned BOOLEAN DEFAULT false,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Reading lists (to-read, reading, read, custom)
CREATE TABLE IF NOT EXISTS reading_lists (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    list_type VARCHAR(20) NOT NULL DEFAULT 'custom', -- to_read, reading, read, custom
    is_default BOOLEAN DEFAULT false,
    sort_order INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Books in reading lists with progress tracking
CREATE TABLE IF NOT EXISTS reading_list_books (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reading_list_id UUID NOT NULL REFERENCES reading_lists(id) ON DELETE CASCADE,
    book_id UUID NOT NULL REFERENCES books(id) ON DELETE CASCADE,

    -- Progress
    current_page INT DEFAULT 0,
    progress_percent INT DEFAULT 0,

    -- Dates
    date_added TIMESTAMPTZ DEFAULT NOW(),
    date_started DATE,
    date_finished DATE,

    -- Review
    rating INT CHECK (rating >= 1 AND rating <= 5),
    review TEXT,
    review_date DATE,

    -- Sorting
    sort_order INT DEFAULT 0,

    UNIQUE(reading_list_id, book_id)
);

-- Reading goals (yearly targets)
CREATE TABLE IF NOT EXISTS reading_goals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    year INT NOT NULL,
    target_books INT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, year)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_books_user ON books(user_id);
CREATE INDEX IF NOT EXISTS idx_books_google_id ON books(google_books_id);
CREATE INDEX IF NOT EXISTS idx_reading_lists_user ON reading_lists(user_id);
CREATE INDEX IF NOT EXISTS idx_reading_list_books_list ON reading_list_books(reading_list_id);
CREATE INDEX IF NOT EXISTS idx_reading_goals_user_year ON reading_goals(user_id, year);

-- Create default reading lists for existing users
INSERT INTO reading_lists (user_id, name, list_type, is_default, sort_order)
SELECT id, 'Want to Read', 'to_read', true, 0 FROM users
ON CONFLICT DO NOTHING;

INSERT INTO reading_lists (user_id, name, list_type, is_default, sort_order)
SELECT id, 'Currently Reading', 'reading', true, 1 FROM users
ON CONFLICT DO NOTHING;

INSERT INTO reading_lists (user_id, name, list_type, is_default, sort_order)
SELECT id, 'Read', 'read', true, 2 FROM users
ON CONFLICT DO NOTHING;
