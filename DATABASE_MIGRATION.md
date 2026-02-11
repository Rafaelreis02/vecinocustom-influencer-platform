# Database Migration Guide

## Overview
This migration makes the Video model's `influencerId` field optional and adds support for tracking video authors without creating influencer records.

## Changes

### Video Table
1. `influencerId` column changed from `NOT NULL` to `NULL`
2. Foreign key constraint changed from `ON DELETE CASCADE` to `ON DELETE SET NULL`
3. New columns added:
   - `authorHandle VARCHAR(255)` - TikTok/Instagram handle (@username)
   - `authorDisplayName VARCHAR(255)` - Display name

### New Table: campaign_video_snapshots
Daily snapshot of video metrics for historical tracking:
- `id` - Primary key (cuid)
- `videoId` - Foreign key to videos (ON DELETE CASCADE)
- `campaignId` - Foreign key to campaigns (ON DELETE CASCADE)
- `views INT DEFAULT 0`
- `likes INT DEFAULT 0`
- `comments INT DEFAULT 0`
- `shares INT DEFAULT 0`
- `snapshotDate DATE` - Date of snapshot
- `createdAt TIMESTAMP` - Record creation time
- Unique constraint on `(videoId, snapshotDate)`
- Index on `(campaignId, snapshotDate)`
- Index on `videoId`

## Running the Migration

### Using Prisma Migrate (Recommended)

```bash
# Generate migration
npx prisma migrate dev --name add_video_author_fields_and_snapshots

# This will:
# 1. Generate SQL migration file
# 2. Apply migration to database
# 3. Regenerate Prisma Client
```

### Manual Migration (If Needed)

If you need to run SQL manually:

```sql
-- 1. Make influencerId nullable and change constraint
ALTER TABLE videos 
  DROP CONSTRAINT IF EXISTS videos_influencerId_fkey;

ALTER TABLE videos 
  ALTER COLUMN "influencerId" DROP NOT NULL;

ALTER TABLE videos 
  ADD CONSTRAINT videos_influencerId_fkey 
  FOREIGN KEY ("influencerId") 
  REFERENCES influencers(id) 
  ON DELETE SET NULL;

-- 2. Add new author fields
ALTER TABLE videos 
  ADD COLUMN "authorHandle" VARCHAR(255),
  ADD COLUMN "authorDisplayName" VARCHAR(255);

-- 3. Create snapshots table
CREATE TABLE campaign_video_snapshots (
  id TEXT PRIMARY KEY,
  "videoId" TEXT NOT NULL,
  "campaignId" TEXT NOT NULL,
  views INTEGER NOT NULL DEFAULT 0,
  likes INTEGER NOT NULL DEFAULT 0,
  comments INTEGER NOT NULL DEFAULT 0,
  shares INTEGER NOT NULL DEFAULT 0,
  "snapshotDate" DATE NOT NULL,
  "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT "campaign_video_snapshots_videoId_fkey" 
    FOREIGN KEY ("videoId") REFERENCES videos(id) ON DELETE CASCADE,
  
  CONSTRAINT "campaign_video_snapshots_campaignId_fkey" 
    FOREIGN KEY ("campaignId") REFERENCES campaigns(id) ON DELETE CASCADE,
  
  CONSTRAINT "campaign_video_snapshots_videoId_snapshotDate_key" 
    UNIQUE ("videoId", "snapshotDate")
);

-- 4. Create indexes
CREATE INDEX "campaign_video_snapshots_campaignId_snapshotDate_idx" 
  ON campaign_video_snapshots("campaignId", "snapshotDate");

CREATE INDEX "campaign_video_snapshots_videoId_idx" 
  ON campaign_video_snapshots("videoId");
```

## Data Migration (Optional)

If you have existing videos without `authorHandle`, you can populate them:

```sql
-- Populate authorHandle from influencer's tiktokHandle
UPDATE videos v
SET 
  "authorHandle" = i."tiktokHandle",
  "authorDisplayName" = i.name
FROM influencers i
WHERE v."influencerId" = i.id
  AND v."authorHandle" IS NULL
  AND i."tiktokHandle" IS NOT NULL;
```

## Verification

After migration, verify:

```sql
-- Check that videos table structure is correct
\d videos

-- Check that snapshots table exists
\d campaign_video_snapshots

-- Check that nullable influencerId works
SELECT COUNT(*) FROM videos WHERE "influencerId" IS NULL;

-- Check indexes
SELECT indexname FROM pg_indexes 
WHERE tablename = 'campaign_video_snapshots';
```

## Rollback (Emergency)

If you need to rollback:

```bash
# Using Prisma
npx prisma migrate resolve --rolled-back <migration_name>

# Then restore previous schema
git checkout HEAD~1 prisma/schema.prisma
npx prisma migrate dev
```

## Post-Migration Steps

1. **Regenerate Prisma Client**:
   ```bash
   npx prisma generate
   ```

2. **Restart Application**:
   ```bash
   npm run dev
   # or
   pm2 restart app
   ```

3. **Test New Features**:
   - Create a video without selecting an influencer
   - Run manual sync on a campaign with hashtag
   - Check that snapshots are created

## Notes

- **Existing videos**: Will retain their `influencerId` - no data loss
- **New videos**: Can be created without `influencerId` (will have `authorHandle` instead)
- **Snapshots**: Created automatically by sync operations
- **Performance**: New indexes ensure snapshot queries are fast

## Troubleshooting

### "column already exists" error
```bash
# Check if migration was partially applied
\d videos
# If columns exist, mark migration as applied
npx prisma migrate resolve --applied <migration_name>
```

### Foreign key constraint errors
```sql
-- Check for orphaned records
SELECT v.id, v."influencerId" 
FROM videos v 
LEFT JOIN influencers i ON v."influencerId" = i.id 
WHERE v."influencerId" IS NOT NULL AND i.id IS NULL;

-- Fix orphaned records (if any)
UPDATE videos SET "influencerId" = NULL 
WHERE "influencerId" NOT IN (SELECT id FROM influencers);
```

### Prisma Client errors
```bash
# Regenerate Prisma Client
rm -rf node_modules/.prisma
npx prisma generate
```
