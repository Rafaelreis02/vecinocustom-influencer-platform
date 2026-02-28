-- Add CONTACTED status to InfluencerStatus enum
-- Migration: add_contacted_status_and_template

-- Add the new enum value (PostgreSQL specific)
-- Note: If using Prisma, run: npx prisma migrate dev --name add_contacted_status

-- Create InfluencerContact table
CREATE TABLE IF NOT EXISTS "influencer_contacts" (
    "id" TEXT NOT NULL,
    "influencerId" TEXT NOT NULL,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "emailSubject" TEXT NOT NULL,
    "emailBody" TEXT NOT NULL,
    "response" TEXT,
    "responseAt" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    
    CONSTRAINT "influencer_contacts_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "influencer_contacts_influencerId_fkey" FOREIGN KEY ("influencerId") REFERENCES "influencers"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Create indexes
CREATE INDEX IF NOT EXISTS "influencer_contacts_influencerId_idx" ON "influencer_contacts"("influencerId");
CREATE INDEX IF NOT EXISTS "influencer_contacts_status_idx" ON "influencer_contacts"("status");

-- Add initial contact email template (if EmailTemplate table exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'email_templates') THEN
        INSERT INTO "email_templates" ("id", "key", "name", "subject", "body", "step", "isActive", "hasValue", "createdAt", "updatedAt")
        VALUES (
            gen_random_uuid(),
            'INITIAL_CONTACT',
            'Contacto Inicial - Prospecção',
            'Colaboração VecinoCustom - Interessado?',
            'Olá {{nome}},

Somos a VecinoCustom, uma marca de joias personalizadas feitas à mão em Portugal.

Gostamos muito do teu conteúdo no Instagram e queríamos saber se terias interesse numa colaboração connosco.

Se sim, responde a este email ou pelo WhatsApp que falamos em mais detalhes.

Cumprimentos,
Equipa VecinoCustom

---
www.vecinocustom.com',
            0,
            true,
            true,
            CURRENT_TIMESTAMP,
            CURRENT_TIMESTAMP
        )
        ON CONFLICT ("key") DO UPDATE SET
            "subject" = EXCLUDED."subject",
            "body" = EXCLUDED."body",
            "updatedAt" = CURRENT_TIMESTAMP;
    END IF;
END $$;
