import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

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

    console.log(`[CLEANUP] Starting cleanup for campaign ${campaignId}`);

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

    console.log(`[CLEANUP] Found ${brandInfluencers.length} brand accounts`);

    let totalDeleted = 0;

    for (const influencer of brandInfluencers) {
      const deleted = await prisma.video.deleteMany({
        where: {
          influencerId: influencer.id,
          campaignId: campaignId,
        },
      });

      console.log(`[CLEANUP] Deleted ${deleted.count} videos from @${influencer.tiktokHandle || influencer.name}`);
      totalDeleted += deleted.count;
    }

    return NextResponse.json({
      success: true,
      deletedVideos: totalDeleted,
      brandAccounts: BRAND_ACCOUNTS,
      message: `Deleted ${totalDeleted} brand videos from campaign`,
    });

  } catch (error: any) {
    console.error('[CLEANUP ERROR]', error.message);
    return NextResponse.json(
      { error: 'Failed to cleanup', details: error.message },
      { status: 500 }
    );
  }
}
