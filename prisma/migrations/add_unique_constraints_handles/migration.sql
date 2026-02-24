-- Create unique index for tiktokHandle
CREATE UNIQUE INDEX "unique_tiktok_handle" ON "influencers"("tiktokHandle") WHERE "tiktokHandle" IS NOT NULL;

-- Create unique index for instagramHandle  
CREATE UNIQUE INDEX "unique_instagram_handle" ON "influencers"("instagramHandle") WHERE "instagramHandle" IS NOT NULL;
