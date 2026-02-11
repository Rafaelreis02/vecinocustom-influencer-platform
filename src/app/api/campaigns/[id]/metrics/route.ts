import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { handleApiError, ApiError } from '@/lib/api-error';

// GET /api/campaigns/[id]/metrics?from=2026-02-10&to=2026-02-15
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const fromParam = searchParams.get('from');
    const toParam = searchParams.get('to');

    // Validate campaign exists
    const campaign = await prisma.campaign.findUnique({
      where: { id },
      select: { id: true }
    });

    if (!campaign) {
      throw new ApiError(404, 'Campanha não encontrada');
    }

    // If no date params, return current totals from videos
    if (!fromParam || !toParam) {
      const videos = await prisma.video.findMany({
        where: { campaignId: id },
        select: {
          views: true,
          likes: true,
          comments: true,
          shares: true,
        }
      });

      const totalViews = videos.reduce((sum, v) => sum + (v.views || 0), 0);
      const totalLikes = videos.reduce((sum, v) => sum + (v.likes || 0), 0);
      const totalComments = videos.reduce((sum, v) => sum + (v.comments || 0), 0);
      const totalShares = videos.reduce((sum, v) => sum + (v.shares || 0), 0);

      return NextResponse.json({
        views: totalViews,
        likes: totalLikes,
        comments: totalComments,
        shares: totalShares,
        videosCount: videos.length,
        period: null,
      });
    }

    // Parse dates
    const fromDate = new Date(fromParam);
    const toDate = new Date(toParam);

    if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) {
      throw new ApiError(400, 'Datas inválidas');
    }

    // Set to start of day
    fromDate.setHours(0, 0, 0, 0);
    toDate.setHours(0, 0, 0, 0);

    logger.info(`[METRICS] Campaign ${id} metrics from ${fromDate.toISOString()} to ${toDate.toISOString()}`);

    // Get snapshots at 'to' date (or most recent before)
    const snapshotsTo = await prisma.campaignVideoSnapshot.findMany({
      where: {
        campaignId: id,
        snapshotDate: {
          lte: toDate,
        }
      },
      orderBy: {
        snapshotDate: 'desc',
      },
      distinct: ['videoId'],
      select: {
        videoId: true,
        views: true,
        likes: true,
        comments: true,
        shares: true,
        snapshotDate: true,
      }
    });

    // Get snapshots at 'from' date (or most recent before)
    const snapshotsFrom = await prisma.campaignVideoSnapshot.findMany({
      where: {
        campaignId: id,
        snapshotDate: {
          lte: fromDate,
        }
      },
      orderBy: {
        snapshotDate: 'desc',
      },
      distinct: ['videoId'],
      select: {
        videoId: true,
        views: true,
        likes: true,
        comments: true,
        shares: true,
        snapshotDate: true,
      }
    });

    // Calculate totals for 'to'
    const toViews = snapshotsTo.reduce((sum, s) => sum + s.views, 0);
    const toLikes = snapshotsTo.reduce((sum, s) => sum + s.likes, 0);
    const toComments = snapshotsTo.reduce((sum, s) => sum + s.comments, 0);
    const toShares = snapshotsTo.reduce((sum, s) => sum + s.shares, 0);

    // Calculate totals for 'from'
    const fromViews = snapshotsFrom.reduce((sum, s) => sum + s.views, 0);
    const fromLikes = snapshotsFrom.reduce((sum, s) => sum + s.likes, 0);
    const fromComments = snapshotsFrom.reduce((sum, s) => sum + s.comments, 0);
    const fromShares = snapshotsFrom.reduce((sum, s) => sum + s.shares, 0);

    // Calculate difference
    const views = Math.max(0, toViews - fromViews);
    const likes = Math.max(0, toLikes - fromLikes);
    const comments = Math.max(0, toComments - fromComments);
    const shares = Math.max(0, toShares - fromShares);

    // Count unique videos in period
    const videoIds = new Set([
      ...snapshotsTo.map(s => s.videoId),
      ...snapshotsFrom.map(s => s.videoId),
    ]);

    return NextResponse.json({
      views,
      likes,
      comments,
      shares,
      videosCount: videoIds.size,
      period: {
        from: fromDate.toISOString().split('T')[0],
        to: toDate.toISOString().split('T')[0],
      }
    });

  } catch (error) {
    logger.error('[METRICS] Error', error);
    return handleApiError(error);
  }
}
