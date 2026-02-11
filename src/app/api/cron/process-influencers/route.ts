import { NextResponse } from 'next/server';
import { handleApiError } from '@/lib/api-error';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * Vercel Cron Endpoint
 * 
 * Configure in vercel.json:
 * {
 *   "crons": [{
 *     "path": "/api/cron/process-influencers",
 *     "schedule": "* /2 * * * *"
 *   }]
 * }
 */
export async function GET(request: Request) {
  // Verificar autenticação (Vercel envia Authorization header)
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  logger.info('Triggered: Process Influencers');

  try {
    // 1. Verificar se há pendentes
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 
                    process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 
                    'http://localhost:3000';

    const checkRes = await fetch(`${baseUrl}/api/worker/pending`, {
      cache: 'no-store'
    });
    
    if (!checkRes.ok) {
      throw new Error('Failed to check pending influencers');
    }

    const checkData = await checkRes.json();
    
    if (!checkData.found) {
      logger.info('No pending influencers');
      return NextResponse.json({ 
        success: true, 
        message: 'No pending influencers' 
      });
    }

    logger.info(`Found pending: ${checkData.task.name}`);

    // 2. Processar com browser real (se disponível) ou fallback para IA
    const useRealScraping = process.env.USE_REAL_SCRAPING !== 'false'; // Default: true
    const processEndpoint = useRealScraping 
      ? `${baseUrl}/api/worker/process-real`
      : `${baseUrl}/api/worker/process`;
    
    logger.info(`Using endpoint: ${processEndpoint}`);
    
    const processRes = await fetch(processEndpoint, {
      method: 'POST',
      cache: 'no-store'
    });

    if (!processRes.ok) {
      throw new Error('Failed to process influencer');
    }

    const processData = await processRes.json();

    if (processData.success) {
      logger.info(`Processed: ${processData.influencer.name}`);
      return NextResponse.json({
        success: true,
        influencer: processData.influencer.name,
        fitScore: processData.influencer.fitScore,
        estimatedPrice: processData.influencer.estimatedPrice
      });
    } else {
      return NextResponse.json({
        success: false,
        error: processData.error || processData.message
      }, { status: 500 });
    }

  } catch (error) {
    logger.error('GET /api/cron/process-influencers failed', error);
    return handleApiError(error);
  }
}
