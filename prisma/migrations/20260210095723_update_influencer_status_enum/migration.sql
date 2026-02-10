-- AlterEnum - Update InfluencerStatus enum with new 3-phase structure
-- Step 1: Create new enum type with all new values
CREATE TYPE "InfluencerStatus_new" AS ENUM (
  'UNKNOWN',
  'SUGGESTION',
  'IMPORT_PENDING',
  'ANALYZING',
  'COUNTER_PROPOSAL',
  'AGREED',
  'PRODUCT_SELECTION',
  'CONTRACT_PENDING',
  'SHIPPED',
  'COMPLETED',
  'CANCELLED',
  'BLACKLISTED'
);

-- Step 2: Convert existing data to new status values
-- This is done via UPDATE with CASE mapping old values to new ones
UPDATE "influencers"
SET "status" = CASE "status"::text
  -- Legacy lowercase values
  WHEN 'suggestion' THEN 'SUGGESTION'
  WHEN 'negotiating' THEN 'ANALYZING'
  WHEN 'working' THEN 'AGREED'
  
  -- Old uppercase values
  WHEN 'NEW' THEN 'UNKNOWN'
  WHEN 'NEGOTIATING' THEN 'ANALYZING'
  WHEN 'AWAITING_PRODUCT' THEN 'PRODUCT_SELECTION'
  WHEN 'PRODUCT_SENT' THEN 'SHIPPED'
  WHEN 'COMPLETED' THEN 'COMPLETED'
  WHEN 'CANCELLED' THEN 'CANCELLED'
  
  -- Other legacy values
  WHEN 'ACTIVE' THEN 'AGREED'
  WHEN 'INACTIVE' THEN 'CANCELLED'
  WHEN 'PENDING' THEN 'UNKNOWN'
  WHEN 'IMPORT_PENDING' THEN 'IMPORT_PENDING'
  WHEN 'BLACKLISTED' THEN 'BLACKLISTED'
  
  -- Default fallback
  ELSE 'UNKNOWN'
END::"InfluencerStatus_new"::text;

-- Step 3: Alter the column type
ALTER TABLE "influencers" 
  ALTER COLUMN "status" TYPE "InfluencerStatus_new" 
  USING ("status"::text::"InfluencerStatus_new");

-- Step 4: Drop old enum and rename new one
DROP TYPE "InfluencerStatus";
ALTER TYPE "InfluencerStatus_new" RENAME TO "InfluencerStatus";

-- Step 5: Update default value
ALTER TABLE "influencers" 
  ALTER COLUMN "status" SET DEFAULT 'UNKNOWN'::"InfluencerStatus";
