/**
 * GET /api/emails/[id] - Get email details with influencer
 * PUT /api/emails/[id] - Update email (associate with influencer, mark as read, etc)
 * DELETE /api/emails/[id] - Delete email
 */

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request, { params }: any) {
  try {
    const email = await prisma.email.findUnique({
      where: { id: params.id },
      include: {
        influencer: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            tiktokHandle: true,
            instagramHandle: true,
            fitScore: true,
            tier: true,
            tags: true,
            notes: true,
            videos: {
              select: { id: true, views: true, likes: true },
              take: 5,
            },
            campaigns: {
              select: { campaign: { select: { id: true, name: true } } },
              take: 3,
            },
          },
        },
      },
    });

    if (!email) {
      return NextResponse.json({ error: 'Email not found' }, { status: 404 });
    }

    return NextResponse.json(email);
  } catch (err: any) {
    console.log('[API ERROR] Getting email:', err?.message);
    return NextResponse.json(
      { error: 'Failed to get email' },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request, { params }: any) {
  try {
    const body = await request.json();

    const email = await prisma.email.update({
      where: { id: params.id },
      data: {
        ...(body.influencerId !== undefined && { influencerId: body.influencerId }),
        ...(body.isRead !== undefined && { isRead: body.isRead }),
        ...(body.isFlagged !== undefined && { isFlagged: body.isFlagged }),
        ...(body.labels && { labels: body.labels }),
      },
      include: {
        influencer: true,
      },
    });

    return NextResponse.json(email);
  } catch (err: any) {
    console.log('[API ERROR] Updating email:', err?.message);
    return NextResponse.json(
      { error: 'Failed to update email' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request, { params }: any) {
  try {
    await prisma.email.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.log('[API ERROR] Deleting email:', err?.message);
    return NextResponse.json(
      { error: 'Failed to delete email' },
      { status: 500 }
    );
  }
}
