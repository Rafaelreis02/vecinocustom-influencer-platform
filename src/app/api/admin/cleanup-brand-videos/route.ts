import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { handleApiError } from '@/lib/api-error';
import { logger } from '@/lib/logger';

const BRAND_ACCOUNTS = ['vecinocustom', 'vecino.custom'];

export async function POST(request: Request) {
  try {
    const { campaignId } = await request.json();

    if (!campaignId) {
      return NextResponse.json(
        { error: 'campaignId is required' },
        { status: 400 }
      );
    }

    logger.info(`Starting cleanup for campaign ${campaignId}`);

    // Find brand influencers
    const brandInfluencers = await prisma.influencer.findMany({
      where: {
        OR: [
          { tiktokHandle: { in: BRAND_ACCOUNTS } },
          { instagramHandle: { in: BRAND_ACCOUNTS } },
          { name: { in: BRAND_ACCOUNTS } },
        ],
      },
    });

    logger.info(`Found ${brandInfluencers.length} brand accounts`);

    let totalDeleted = 0;

    for (const influencer of brandInfluencers) {
      const deleted = await prisma.video.deleteMany({
        where: {
          influencerId: influencer.id,
          campaignId: campaignId,
        },
      });

      logger.info(`Deleted ${deleted.count} videos from @${influencer.tiktokHandle || influencer.name}`);
      totalDeleted += deleted.count;
    }

    return NextResponse.json({
      success: true,
      deletedVideos: totalDeleted,
      brandAccounts: BRAND_ACCOUNTS,
      message: `Deleted ${totalDeleted} brand videos from campaign`,
    });

  } catch (error) {
    logger.error('POST /api/admin/cleanup-brand-videos failed', error);
    return handleApiError(error);
  }
}
