-- Add biography, verified, videoCount to Influencer table
-- Run this on Neon console: https://console.neon.tech

ALTER TABLE "Influencer" ADD COLUMN IF NOT EXISTS "biography" TEXT;
ALTER TABLE "Influencer" ADD COLUMN IF NOT EXISTS "verified" BOOLEAN DEFAULT false;
ALTER TABLE "Influencer" ADD COLUMN IF NOT EXISTS "videoCount" INTEGER;

-- Verify the columns were added
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'Influencer' 
AND column_name IN ('biography', 'verified', 'videoCount');
