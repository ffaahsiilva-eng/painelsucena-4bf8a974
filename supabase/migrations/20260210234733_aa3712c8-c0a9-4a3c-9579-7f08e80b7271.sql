
-- Add items column to desvios table for multiple correction items
ALTER TABLE public.desvios ADD COLUMN items jsonb DEFAULT '[]'::jsonb;

-- items format: [{ "id": "uuid", "description": "text", "photo_url": "url|null", "correction_photo_url": "url|null" }]
