import { NextRequest, NextResponse } from 'next/server';

/**
 * Diagnóstico Avançado - Verifica exatamente qual é o erro do Apify
 * GET /api/prospector/debug
 */

export async function GET(request: NextRequest) {
  const APIFY_TOKEN = process.env.APIFY_API_TOKEN || process.env.APIFY_TOKEN;
  
  const results: any = {
    timestamp: new Date().toISOString(),
    tokenPresent: !!APIFY_TOKEN,
    tokenLength: APIFY_TOKEN?.length || 0,
    tests: []
  };

  // Test 1: Verificar token (endpoint users/me)
  try {
    const userRes = await fetch(`https://api.apify.com/v2/users/me?token=${APIFY_TOKEN}`);
    const userData = await userRes.json();
    
    results.tests.push({
      step: 1,
      name: 'Apify Auth (users/me)',
      status: userRes.ok ? 'OK' : 'FAILED',
      statusCode: userRes.status,
      username: userData.data?.username || 'N/A',
      error: !userRes.ok ? userData : null
    });
  } catch (err: any) {
    results.tests.push({
      step: 1,
      name: 'Apify Auth (users/me)',
      status: 'ERROR',
      error: err.message
    });
  }

  // Test 2: Listar actors da conta
  try {
    const actorsRes = await fetch(`https://api.apify.com/v2/acts?token=${APIFY_TOKEN}&limit=10`);
    const actorsData = await actorsRes.json();
    
    results.tests.push({
      step: 2,
      name: 'List Actors',
      status: actorsRes.ok ? 'OK' : 'FAILED',
      statusCode: actorsRes.status,
      totalActors: actorsData.data?.total || 0,
      actors: actorsData.data?.items?.map((a: any) => ({ id: a.id, name: a.name })) || [],
      error: !actorsRes.ok ? actorsData : null
    });
  } catch (err: any) {
    results.tests.push({
      step: 2,
      name: 'List Actors',
      status: 'ERROR',
      error: err.message
    });
  });

  // Test 3: Verificar actor específico (Profile)
  const ACTOR_PROFILE = 'GdWCkxBtKWOsKjdch';
  try {
    const actorRes = await fetch(`https://api.apify.com/v2/acts/${ACTOR_PROFILE}?token=${APIFY_TOKEN}`);
    const actorData = await actorRes.json();
    
    results.tests.push({
      step: 3,
      name: `Get Actor ${ACTOR_PROFILE}`,
      status: actorRes.ok ? 'OK' : 'FAILED',
      statusCode: actorRes.status,
      actorName: actorData.data?.name || 'N/A',
      actorUsername: actorData.data?.username || 'N/A',
      error: !actorRes.ok ? actorData : null
    });
  } catch (err: any) {
    results.tests.push({
      step: 3,
      name: `Get Actor ${ACTOR_PROFILE}`,
      status: 'ERROR',
      error: err.message
    });
  }

  // Test 4: Tentar iniciar actor COM LOGGING DETALHADO
  try {
    const input = {
      profiles: ['https://www.tiktok.com/@tiktok'],
      resultsPerPage: 1
    };
    
    const startRes = await fetch(`https://api.apify.com/v2/acts/${ACTOR_PROFILE}/runs?token=${APIFY_TOKEN}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input)
    });
    
    const startData = await startRes.json();
    
    results.tests.push({
      step: 4,
      name: 'Start Actor (detailed)',
      status: startRes.ok ? 'OK' : 'FAILED',
      statusCode: startRes.status,
      statusText: startRes.statusText,
      response: startData,
      error: !startRes.ok ? {
        message: startData.error?.message || startData.message || 'Unknown error',
        type: startData.error?.type || 'N/A',
        code: startData.error?.code || 'N/A',
        fullResponse: startData
      } : null
    });

    // Se iniciou com sucesso, cancelar
    if (startRes.ok && startData.data?.id) {
      try {
        await fetch(`https://api.apify.com/v2/actor-runs/${startData.data.id}/abort?token=${APIFY_TOKEN}`, {
          method: 'POST'
        });
      } catch {}
    }
  } catch (err: any) {
    results.tests.push({
      step: 4,
      name: 'Start Actor (detailed)',
      status: 'EXCEPTION',
      error: err.message,
      stack: err.stack
    });
  }

  // Test 5: Verificar input schema do actor
  try {
    const schemaRes = await fetch(`https://api.apify.com/v2/acts/${ACTOR_PROFILE}/input-schema?token=${APIFY_TOKEN}`);
    const schemaData = await schemaRes.json();
    
    results.tests.push({
      step: 5,
      name: 'Actor Input Schema',
      status: schemaRes.ok ? 'OK' : 'FAILED',
      schema: schemaRes.ok ? {
        required: schemaData.data?.schema?.required || [],
        properties: Object.keys(schemaData.data?.schema?.properties || {})
      } : null,
      error: !schemaRes.ok ? schemaData : null
    });
  } catch (err: any) {
    results.tests.push({
      step: 5,
      name: 'Actor Input Schema',
      status: 'ERROR',
      error: err.message
    });
  }

  return NextResponse.json(results, { status: 200 });
}
