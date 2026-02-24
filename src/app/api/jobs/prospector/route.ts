import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { createJob, updateJob, completeJob, failJob } from '@/lib/background-jobs';
import { logger } from '@/lib/logger';

// Importar funções do prospector
// Nota: Vamos reutilizar a lógica existente em /api/prospector/run

// POST /api/jobs/prospector - Criar job de prospector e executar
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { seed, max = 10, platform = 'tiktok', dryRun = false } = body;

    if (!seed) {
      return NextResponse.json({ error: 'Seed is required' }, { status: 400 });
    }

    // Criar job
    const job = createJob('PROSPECTOR', {
      seed: seed.replace('@', ''),
      max,
      platform,
      dryRun,
    }, session.user.id);

    // Iniciar processamento em background (não espera)
    processProspectorJob(job.id, session.user.id);

    return NextResponse.json({
      success: true,
      jobId: job.id,
      message: 'Job created and started in background',
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// Função que processa o job em background
async function processProspectorJob(jobId: string, userId: string) {
  try {
    updateJob(jobId, { status: 'RUNNING' });

    // Chamar a API interna do prospector
    const job = updateJob(jobId, {});
    if (!job) return;

    const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || ''}/api/prospector/run`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(job.config),
    });

    if (!response.ok) {
      const error = await response.json();
      failJob(jobId, error.error || 'Unknown error');
      return;
    }

    const result = await response.json();

    if (result.success) {
      updateJob(jobId, {
        processedItems: result.stats?.processed || 0,
        importedItems: result.stats?.imported || 0,
      });
      
      completeJob(jobId, {
        success: true,
        message: result.message || `Encontrados ${result.stats?.imported} influencers`,
        stats: result.stats,
        results: result.results,
      });
    } else {
      failJob(jobId, result.error || 'Job failed');
    }
  } catch (error: any) {
    logger.error('[Background Job] Prospector failed', { jobId, error: error.message });
    failJob(jobId, error.message);
  }
}