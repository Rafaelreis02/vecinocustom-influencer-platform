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
});

export const InfluencerUpdateSchema = InfluencerCreateSchema.partial();

// Campaign Schemas
export const CampaignCreateSchema = z.object({
  name: z.string().min(1, 'Nome obrigatório'),
  description: z.string().optional().nullable(),
  hashtag: z.string().optional().nullable(),
  platform: z.nativeEnum(Platform).optional().nullable(),
  startDate: z.coerce.date().optional().nullable(),
  endDate: z.coerce.date().optional().nullable(),
  budget: z.coerce.number().optional().nullable(),
  targetViews: z.coerce.number().int().optional().nullable(),
  targetSales: z.coerce.number().int().optional().nullable(),
});

export const CampaignUpdateSchema = CampaignCreateSchema.partial();

// Coupon Schemas
export const CouponCreateSchema = z.object({
  code: z.string().min(1, 'Código obrigatório'),
  influencerId: z.string().min(1),
  discountType: z.nativeEnum(DiscountType).default(DiscountType.PERCENTAGE),
  discountValue: z.number().min(0),
  usageLimit: z.number().int().optional().nullable(),
  commissionRate: z.number().min(0).max(100).optional().nullable(),
  validFrom: z.string().datetime().optional().nullable(),
  validUntil: z.string().datetime().optional().nullable(),
});

// Video Schemas
export const VideoCreateSchema = z.object({
  title: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  url: z.string().url('URL inválido'),
  platform: z.nativeEnum(Platform),
  influencerId: z.string().optional().nullable(),    // ALTERADO: era obrigatório
  authorHandle: z.string().optional().nullable(),     // NOVO
  authorDisplayName: z.string().optional().nullable(), // NOVO
  campaignId: z.string().optional().nullable(),
  views: z.number().int().optional().nullable(),
  likes: z.number().int().optional().nullable(),
  comments: z.number().int().optional().nullable(),
  shares: z.number().int().optional().nullable(),
  cost: z.number().optional().nullable(),             // Já existia
  publishedAt: z.string().datetime().optional().nullable(),
});

// Export types
export type InfluencerCreateInput = z.infer<typeof InfluencerCreateSchema>;
export type InfluencerUpdateInput = z.infer<typeof InfluencerUpdateSchema>;
export type CampaignCreateInput = z.infer<typeof CampaignCreateSchema>;
export type CampaignUpdateInput = z.infer<typeof CampaignUpdateSchema>;
export type CouponCreateInput = z.infer<typeof CouponCreateSchema>;
export type VideoCreateInput = z.infer<typeof VideoCreateSchema>;
