-- Migration: 009_plant_photos.sql
-- Description: Plant photos for gallery and growth timeline

-- Plant photos table
CREATE TABLE IF NOT EXISTS plant_photos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plant_id UUID NOT NULL REFERENCES plants(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Photo details
    filename VARCHAR(255) NOT NULL,
    original_filename VARCHAR(255),
    content_type VARCHAR(100) DEFAULT 'image/jpeg',
    file_size INT,

    -- URLs
    photo_url VARCHAR(500) NOT NULL,
    thumbnail_url VARCHAR(500),

    -- Metadata
    taken_at TIMESTAMPTZ DEFAULT NOW(),
    caption TEXT,
    is_primary BOOLEAN DEFAULT false,

    -- Tags for categorization
    photo_type VARCHAR(50) DEFAULT 'general', -- general, growth, problem, treatment, milestone

    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_plant_photos_plant ON plant_photos(plant_id, taken_at DESC);
CREATE INDEX IF NOT EXISTS idx_plant_photos_user ON plant_photos(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_plant_photos_primary ON plant_photos(plant_id, is_primary) WHERE is_primary = true;

-- Function to ensure only one primary photo per plant
CREATE OR REPLACE FUNCTION ensure_single_primary_photo()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.is_primary = true THEN
        UPDATE plant_photos
        SET is_primary = false
        WHERE plant_id = NEW.plant_id
          AND id != NEW.id
          AND is_primary = true;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS plant_photos_primary ON plant_photos;
CREATE TRIGGER plant_photos_primary
    AFTER INSERT OR UPDATE OF is_primary ON plant_photos
    FOR EACH ROW
    WHEN (NEW.is_primary = true)
    EXECUTE FUNCTION ensure_single_primary_photo();
