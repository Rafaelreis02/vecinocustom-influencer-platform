/**
 * POST /api/emails/bulk-action
 * Bulk actions: mark-read, mark-unread, flag, unflag, delete, archive
 */

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { handleApiError } from '@/lib/api-error';
import { logger } from '@/lib/logger';

export async function POST(request: Request) {
  try {
    const { emailIds, action, payload } = await request.json();

    if (!emailIds || !Array.isArray(emailIds) || emailIds.length === 0) {
      return NextResponse.json(
        { error: 'Invalid emailIds' },
        { status: 400 }
      );
    }

    let updated = 0;

    switch (action) {
      case 'mark-read':
        await prisma.email.updateMany({
          where: { id: { in: emailIds } },
          data: { isRead: true },
        });
        updated = emailIds.length;
        break;

      case 'mark-unread':
        await prisma.email.updateMany({
          where: { id: { in: emailIds } },
          data: { isRead: false },
        });
        updated = emailIds.length;
        break;

      case 'flag':
        await prisma.email.updateMany({
          where: { id: { in: emailIds } },
          data: { isFlagged: true },
        });
        updated = emailIds.length;
        break;

      case 'unflag':
        await prisma.email.updateMany({
          where: { id: { in: emailIds } },
          data: { isFlagged: false },
        });
        updated = emailIds.length;
        break;

      case 'delete':
        const deleteResult = await prisma.email.deleteMany({
          where: { id: { in: emailIds } },
        });
        updated = deleteResult.count;
        break;

      case 'set-label':
        if (!payload?.label) {
          return NextResponse.json(
            { error: 'Label required for set-label action' },
            { status: 400 }
          );
        }
        const emails = await prisma.email.findMany({
          where: { id: { in: emailIds } },
        });
        for (const email of emails) {
          const labels = [...new Set([...(email.labels || []), payload.label])];
          await prisma.email.update({
            where: { id: email.id },
            data: { labels },
          });
        }
        updated = emails.length;
        break;

      case 'remove-label':
        if (!payload?.label) {
          return NextResponse.json(
            { error: 'Label required for remove-label action' },
            { status: 400 }
          );
        }
        const emailsToUpdate = await prisma.email.findMany({
          where: { id: { in: emailIds } },
        });
        for (const email of emailsToUpdate) {
          const labels = (email.labels || []).filter(l => l !== payload.label);
          await prisma.email.update({
            where: { id: email.id },
            data: { labels },
          });
        }
        updated = emailsToUpdate.length;
        break;

      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}` },
          { status: 400 }
        );
    }

    logger.info('Bulk action completed', { action, count: updated });

    return NextResponse.json({
      success: true,
      action,
      updated,
    });
  } catch (error) {
    logger.error('POST /api/emails/bulk-action failed', error);
    return handleApiError(error);
  }
}
