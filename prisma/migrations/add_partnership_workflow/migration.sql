-- Create PartnershipWorkflow table
CREATE TABLE IF NOT EXISTS "partnership_workflows" (
    "id" TEXT NOT NULL,
    "influencerId" TEXT NOT NULL,
    "currentStep" INTEGER NOT NULL DEFAULT 1,
    "agreedPrice" DOUBLE PRECISION,
    "contactEmail" TEXT,
    "contactInstagram" TEXT,
    "contactWhatsapp" TEXT,
    "step1CompletedAt" TIMESTAMP(3),
    "shippingAddress" TEXT,
    "productSuggestion1" TEXT,
    "productSuggestion2" TEXT,
    "productSuggestion3" TEXT,
    "step2CompletedAt" TIMESTAMP(3),
    "selectedProductUrl" TEXT,
    "designProofUrl" TEXT,
    "designNotes" TEXT,
    "step3CompletedAt" TIMESTAMP(3),
    "contractSigned" BOOLEAN NOT NULL DEFAULT false,
    "contractUrl" TEXT,
    "step4CompletedAt" TIMESTAMP(3),
    "trackingUrl" TEXT,
    "couponCode" TEXT,
    "step5CompletedAt" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "isRestarted" BOOLEAN NOT NULL DEFAULT false,
    "previousWorkflowId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "partnership_workflows_pkey" PRIMARY KEY ("id")
);

-- Create index for influencer
CREATE INDEX "partnership_workflows_influencerId_idx" ON "partnership_workflows"("influencerId");
CREATE INDEX "partnership_workflows_status_idx" ON "partnership_workflows"("status");
CREATE INDEX "partnership_workflows_currentStep_idx" ON "partnership_workflows"("currentStep");

-- Create PartnershipEmail table
CREATE TABLE IF NOT EXISTS "partnership_emails" (
    "id" TEXT NOT NULL,
    "workflowId" TEXT NOT NULL,
    "step" INTEGER NOT NULL,
    "templateKey" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sentBy" TEXT NOT NULL,
    "variables" JSONB,

    CONSTRAINT "partnership_emails_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "partnership_emails_workflowId_idx" ON "partnership_emails"("workflowId");
CREATE INDEX "partnership_emails_step_idx" ON "partnership_emails"("step");

-- Create EmailTemplate table
CREATE TABLE IF NOT EXISTS "email_templates" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "step" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "hasValue" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "email_templates_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "email_templates_key_key" UNIQUE ("key")
);

CREATE INDEX "email_templates_step_idx" ON "email_templates"("step");
CREATE INDEX "email_templates_isActive_idx" ON "email_templates"("isActive");

-- Add foreign key constraints
ALTER TABLE "partnership_workflows" 
    ADD CONSTRAINT "partnership_workflows_influencerId_fkey" 
    FOREIGN KEY ("influencerId") REFERENCES "influencers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "partnership_workflows" 
    ADD CONSTRAINT "partnership_workflows_previousWorkflowId_fkey" 
    FOREIGN KEY ("previousWorkflowId") REFERENCES "partnership_workflows"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "partnership_emails" 
    ADD CONSTRAINT "partnership_emails_workflowId_fkey" 
    FOREIGN KEY ("workflowId") REFERENCES "partnership_workflows"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Create enum type
DO $$ BEGIN
    CREATE TYPE "PartnershipStatus" AS ENUM ('ACTIVE', 'COMPLETED', 'CANCELLED', 'RESTARTED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Alter status column to use enum
ALTER TABLE "partnership_workflows" 
    ALTER COLUMN "status" TYPE "PartnershipStatus" 
    USING "status"::"PartnershipStatus";
