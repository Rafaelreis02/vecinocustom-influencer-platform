import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { createJob, getUserJobs, getActiveUserJobs } from '@/lib/background-jobs';

// POST /api/jobs/create - Criar novo job
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { type, config } = body;

    if (!type || !config) {
      return NextResponse.json({ error: 'Missing type or config' }, { status: 400 });
    }

    const job = createJob(type, config, session.user.id);

    return NextResponse.json({
      success: true,
      job: {
        id: job.id,
        type: job.type,
        status: job.status,
        progress: job.progress,
        config: job.config,
        createdAt: job.createdAt,
      }
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// GET /api/jobs - Listar jobs do user
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const activeOnly = searchParams.get('active') === 'true';

    const jobs = activeOnly 
      ? getActiveUserJobs(session.user.id)
      : getUserJobs(session.user.id);

    return NextResponse.json({
      jobs: jobs.map(job => ({
        id: job.id,
        type: job.type,
        status: job.status,
        progress: job.progress,
        totalItems: job.totalItems,
        processedItems: job.processedItems,
        importedItems: job.importedItems,
        config: job.config,
        result: job.result,
        error: job.error,
        reportVisible: job.reportVisible,
        createdAt: job.createdAt,
        updatedAt: job.updatedAt,
        completedAt: job.completedAt,
      }))
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}