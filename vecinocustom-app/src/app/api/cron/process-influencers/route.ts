import { NextResponse } from 'next/server';

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

  console.log('[CRON] Triggered: Process Influencers');

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
      console.log('[CRON] No pending influencers');
      return NextResponse.json({ 
        success: true, 
        message: 'No pending influencers' 
      });
    }

    console.log(`[CRON] Found pending: ${checkData.task.name}`);

    // 2. Processar
    const processRes = await fetch(`${baseUrl}/api/worker/process`, {
      method: 'POST',
      cache: 'no-store'
    });

    if (!processRes.ok) {
      throw new Error('Failed to process influencer');
    }

    const processData = await processRes.json();

    if (processData.success) {
      console.log(`[CRON] ✅ Processed: ${processData.influencer.name}`);
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

  } catch (error: any) {
    console.error('[CRON] Error:', error.message);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}
