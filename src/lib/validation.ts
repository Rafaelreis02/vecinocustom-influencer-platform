import { z } from 'zod';
import { InfluencerStatus, Platform, DiscountType } from '@prisma/client';

// Influencer Schemas
export const InfluencerCreateSchema = z.object({
  name: z.string().min(1, 'Nome obrigatório'),
  email: z.string().email().optional().nullable(),
  phone: z.string().optional().nullable(),
  
  // Social Media
  instagramHandle: z.string().optional().nullable(),
  instagramFollowers: z.number().int().optional().nullable(),
  tiktokHandle: z.string().optional().nullable(),
  tiktokFollowers: z.number().int().optional().nullable(),
  youtubeHandle: z.string().optional().nullable(),
  youtubeFollowers: z.number().int().optional().nullable(),
  
  // Metrics & Performance
  totalLikes: z.number().int().optional().nullable(),
  engagementRate: z.number().optional().nullable(),
  averageViews: z.string().optional().nullable(),
  videoCount: z.number().int().optional().nullable(),
  
  // Profile Data
  biography: z.string().optional().nullable(),
  verified: z.boolean().optional().nullable(),
  
  // Demographics & Content
  country: z.string().optional().nullable(),
  language: z.string().optional().nullable(),
  niche: z.string().optional().nullable(),
  primaryPlatform: z.string().optional().nullable(),
  
  // Business
  nif: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  estimatedPrice: z.number().optional().nullable(),
  fitScore: z.number().int().optional().nullable(),
  tier: z.string().optional().nullable(),
  
  // Avatar
  avatarUrl: z.string().optional().nullable(),

  // Status & Metadata
  status: z.nativeEnum(InfluencerStatus).default(InfluencerStatus.UNKNOWN),
  notes: z.string().optional().nullable(),
  tags: z.array(z.string()).default([]),
  
  // AI Analysis - NOTAS INTERNAS! (NOVO!)
  analysisSummary: z.string().optional().nullable(),
  analysisDate: z.string().optional().nullable(),
});

export const InfluencerUpdateSchema = InfluencerCreateSchema.partial();

// ... rest of file
