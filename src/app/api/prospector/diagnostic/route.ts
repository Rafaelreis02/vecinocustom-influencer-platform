import { NextRequest, NextResponse } from 'next/server';

/**
 * Endpoint de diagnóstico - Testa conexão com Apify
 * GET /api/prospector/diagnostic
 */

export async function GET(request: NextRequest) {
  const APIFY_TOKEN = process.env.APIFY_API_TOKEN || process.env.APIFY_TOKEN;
  
  const results: any = {
    timestamp: new Date().toISOString(),
    tokenExists: !!APIFY_TOKEN,
    tokenLength: APIFY_TOKEN?.length || 0,
    tokenPreview: APIFY_TOKEN ? `${APIFY_TOKEN.substring(0, 10)}...${APIFY_TOKEN.substring(APIFY_TOKEN.length - 5)}` : 'N/A',
    tests: []
  };

  // Test 1: Verificar se consegue aceder ao Apify
  try {
    const testRes = await fetch(`https://api.apify.com/v2/users/me?token=${APIFY_TOKEN}`);
    const testData = await testRes.json();
    
    results.tests.push({
      name: 'Apify Auth',
      status: testRes.ok ? 'OK' : 'FAILED',
      statusCode: testRes.status,
      response: testRes.ok ? `User: ${testData.data?.username || 'N/A'}` : testData
    });
  } catch (err: any) {
    results.tests.push({
      name: 'Apify Auth',
      status: 'ERROR',
      error: err.message
    });
  }

  // Test 2: Verificar actors específicos
  const ACTOR_PROFILE = 'GdWCkxBtKWOsKjdch';
  const ACTOR_FOLLOWING = 'i7JuI8WcwN94blNMb';

  for (const [name, actorId] of [['Profile Actor', ACTOR_PROFILE], ['Following Actor', ACTOR_FOLLOWING]]) {
    try {
      const actorRes = await fetch(`https://api.apify.com/v2/acts/${actorId}?token=${APIFY_TOKEN}`);
      const actorData = await actorRes.json();
      
      results.tests.push({
        name: `${name} (${actorId})`,
        status: actorRes.ok ? 'OK' : 'FAILED',
        statusCode: actorRes.status,
        actorName: actorData.data?.name || 'N/A'
      });
    } catch (err: any) {
      results.tests.push({
        name: `${name} (${actorId})`,
        status: 'ERROR',
        error: err.message
      });
    }
  }

  // Test 3: Tentar iniciar um actor simples (só para ver se funciona)
  try {
    const startRes = await fetch(`https://api.apify.com/v2/acts/${ACTOR_PROFILE}/runs?token=${APIFY_TOKEN}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        profiles: ['https://www.tiktok.com/@tiktok'],
        resultsPerPage: 1
      })
    });
    
    const startData = await startRes.json();
    
    results.tests.push({
      name: 'Start Actor Test',
      status: startRes.ok ? 'OK' : 'FAILED',
      statusCode: startRes.status,
      response: startRes.ok ? `Run ID: ${startData.data?.id?.substring(0, 8)}...` : startData
    });

    // Se iniciou com sucesso, cancelar imediatamente (não queremos gastar créditos)
    if (startRes.ok && startData.data?.id) {
      try {
        await fetch(`https://api.apify.com/v2/actor-runs/${startData.data.id}/abort?token=${APIFY_TOKEN}`, {
          method: 'POST'
        });
        results.tests.push({
          name: 'Cancel Test Run',
          status: 'OK'
        });
      } catch {
        // Ignorar erro ao cancelar
      }
    }
  } catch (err: any) {
    results.tests.push({
      name: 'Start Actor Test',
      status: 'ERROR',
      error: err.message
    });
  }

  return NextResponse.json(results);
}
