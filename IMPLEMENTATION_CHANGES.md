# Campaign Hashtag Improvements - Implementation Summary

## Changes Completed

### 1. Database Schema Updates (`prisma/schema.prisma`)

#### Video Model Changes
- Made `influencerId` **optional** (changed from required to `String?`)
- Changed `onDelete` from `Cascade` to `SetNull` for influencer relation
- Added new fields:
  - `authorHandle String?` - TikTok/Instagram handle of video author
  - `authorDisplayName String?` - Display name of video author
  - `snapshots CampaignVideoSnapshot[]` - Relation to snapshot records

#### New CampaignVideoSnapshot Model
Created new model for tracking daily video metrics:
- `id` - Primary key
- `videoId` - Foreign key to Video
- `campaignId` - Foreign key to Campaign
- `views`, `likes`, `comments`, `shares` - Metric snapshots
- `snapshotDate` - Date of snapshot (@db.Date)
- Unique constraint on `[videoId, snapshotDate]`
- Indexes on `[campaignId, snapshotDate]` and `[videoId]`

#### Campaign Model Changes
- Added `snapshots CampaignVideoSnapshot[]` relation

### 2. Validation Schema Updates (`src/lib/validation.ts`)

Updated `VideoCreateSchema`:
- `influencerId` - Changed from required (`z.string().min(1)`) to optional (`z.string().optional().nullable()`)
- Added `authorHandle` - `z.string().optional().nullable()`
- Added `authorDisplayName` - `z.string().optional().nullable()`
- `cost` field already existed, confirmed it's present

### 3. Worker Rewrite (`src/app/api/worker/analyze-hashtag/route.ts`)

Complete rewrite with correct Apify field mappings:
- Fixed field mappings:
  - `webVideoUrl` instead of `videoUrl`
  - `authorMeta.name` instead of `authorUsername`
  - `playCount` instead of `viewCount`
  - `diggCount` instead of `likeCount`
  - `createTimeISO` or `createTime` instead of `publishedAt`
  - `text` instead of `description`
- Brand exclusion: Filters `vecino.custom` using `authorMeta.name` (case-insensitive)
- **UPDATE instead of SKIP**: Updates metrics for existing videos
- **No auto-create influencers**: Sets `authorHandle` without creating influencer record
- Creates daily snapshots for all campaign videos after processing
- Uses `logger` and `handleApiError` utilities
- Returns `{ created, updated, excluded, total }` instead of old format

### 4. New Sync Endpoint (`src/app/api/campaigns/[id]/sync/route.ts`)

POST endpoint for manual campaign sync:
- Validates campaign exists and has hashtag configured
- Only supports TikTok platform
- Calls `scrapeHashtagVideos()` from `apify-fetch.ts`
- Filters out `vecino.custom` brand account
- For existing videos: Updates metrics
- For new videos: Creates with `influencerId` if found, otherwise uses `authorHandle`
- Creates daily snapshots after processing
- Returns `{ created, updated, excluded, total }`

### 5. New Metrics Endpoint (`src/app/api/campaigns/[id]/metrics/route.ts`)

GET endpoint with optional date range filtering:
- Without params: Returns current totals from videos
- With `from` and `to` params:
  - Fetches snapshots at both dates (most recent <= date)
  - Calculates difference between dates
  - Returns `{ views, likes, comments, shares, videosCount, period }`
- Handles invalid dates and missing campaign

### 6. Campaign Detail GET Fix (`src/app/api/campaigns/[id]/route.ts`)

Updated to include new fields and calculate stats:
- Includes `influencer` relation in videos query
- Calculates `spent` (sum of video costs)
- Calculates `influencersCount`:
  - Counts unique `influencerId` values
  - Plus unique `authorHandle` values (where no influencerId)
- Returns both old `stats` object and new top-level fields

### 7. Campaigns List GET Fix (`src/app/api/campaigns/route.ts`)

Updated to calculate stats for each campaign:
- Includes `cost`, `influencerId`, `authorHandle` in videos select
- Calculates per campaign:
  - `totalViews` - sum of views
  - `spent` - sum of costs
  - `videosCount` - count of videos
  - `influencersCount` - unique influencerIds + unique authorHandles
- Returns array of campaigns with stats

### 8. Videos POST Fix (`src/app/api/videos/route.ts`)

Updated to support optional influencerId:
- Handles `tiktokHandle` from request body
- If `tiktokHandle` provided without `influencerId`:
  - Searches for existing influencer by `tiktokHandle`
  - If found: Uses their ID
  - If not found: Sets `authorHandle` and `authorDisplayName`, leaves `influencerId` null
- Removes non-schema fields before validation
- Creates video with optional influencer

### 9. Campaign Detail Frontend (`src/app/dashboard/campaigns/[id]/page.tsx`)

Updated interface and added sync functionality:
- Updated `Campaign` interface:
  - Made `influencerId` optional (`string | null`)
  - Made `influencer` optional (`| null`)
  - Added `authorHandle` and `authorDisplayName` fields
- Added sync state: `syncing` boolean
- Added `handleSync()` function:
  - Calls POST `/api/campaigns/${id}/sync`
  - Shows toast with results
  - Refreshes campaign data
- Added "Sincronizar" button:
  - Shows next to "Adicionar Vídeo" button
  - Only visible if campaign has hashtag and platform is TIKTOK
  - Shows loading spinner while syncing
  - Disabled during sync
- Fixed influencer count calculation:
  - Counts unique `influencerId` values
  - Plus unique `authorHandle` values where no influencer
- Updated video display:
  - Shows influencer name if available
  - Shows `@authorHandle` if no influencer but has handle
  - Shows "Desconhecido" if neither available
- Added `RefreshCw` icon import

### 10. AddVideoModal Frontend

Already supports optional influencer:
- "Adicionar pelo @" mode sets `tiktokHandle` without requiring existing influencer
- Backend handles finding/creating influencer or setting authorHandle
- Both modes send `cost` field

## Files Modified

1. `prisma/schema.prisma` - Database schema
2. `src/lib/validation.ts` - Validation schemas
3. `src/app/api/worker/analyze-hashtag/route.ts` - Worker rewrite
4. `src/app/api/campaigns/[id]/sync/route.ts` - NEW sync endpoint
5. `src/app/api/campaigns/[id]/metrics/route.ts` - NEW metrics endpoint
6. `src/app/api/campaigns/[id]/route.ts` - Campaign detail GET
7. `src/app/api/campaigns/route.ts` - Campaigns list GET
8. `src/app/api/videos/route.ts` - Videos POST
9. `src/app/dashboard/campaigns/[id]/page.tsx` - Campaign detail page
10. `src/components/AddVideoModal.tsx` - Already compatible

## Not Implemented (Out of Scope)

1. **Date range picker for metrics filtering** - UI component not added (metrics endpoint is ready)
2. **Date range picker on campaigns list page** - Not added
3. **Cron jobs** - As specified, not added to vercel.json

## Testing Required

Before deployment:
1. **Database migration**: Run `npx prisma migrate dev` to apply schema changes
2. **Test hashtag sync**: Verify Apify field mappings are correct
3. **Test manual sync**: Click sync button on campaign with hashtag
4. **Test metrics endpoint**: Call with and without date range
5. **Test video creation**: Create video with and without existing influencer
6. **Verify snapshots**: Check that daily snapshots are created

## Migration Notes

To apply database changes:
```bash
npx prisma migrate dev --name add_video_author_fields_and_snapshots
```

This will:
1. Make `influencerId` nullable in videos table
2. Add `authorHandle` and `authorDisplayName` columns to videos
3. Create `campaign_video_snapshots` table
4. Update foreign key constraints

## API Changes Summary

### New Endpoints
- `POST /api/campaigns/[id]/sync` - Manual hashtag sync
- `GET /api/campaigns/[id]/metrics?from=&to=` - Period metrics

### Modified Endpoints
- `GET /api/campaigns/[id]` - Now includes `spent` and `influencersCount`
- `GET /api/campaigns` - Now includes stats per campaign
- `POST /api/videos` - Supports optional `influencerId` and `tiktokHandle`

### Modified Worker
- `POST /api/worker/analyze-hashtag` - Uses correct Apify fields, updates existing videos

## Key Implementation Details

1. **No automatic influencer creation**: Videos imported from hashtags are created with `authorHandle` only
2. **Brand exclusion**: `vecino.custom` is filtered in worker and sync endpoint
3. **Snapshot creation**: Daily snapshots created after each sync/worker run
4. **Stats calculation**: Influencer count includes both registered and unique author handles
5. **Error handling**: All endpoints use `logger` and `handleApiError` utilities
