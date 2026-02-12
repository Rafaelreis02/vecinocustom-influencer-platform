import { NextResponse } from 'next/server';
import { logger } from '@/lib/logger';

export async function POST() {
  try {
    logger.info('Full-sync initiated');
    return NextResponse.json({ success: true, message: 'Full sync queued' });
  } catch (error) {
    logger.error('Full-sync failed', error);
    return NextResponse.json({ error: 'Full-sync failed' }, { status: 500 });
  }
}
