import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const APIFY_TOKEN = process.env.APIFY_API_TOKEN || process.env.APIFY_TOKEN;
  const ACTOR_PROFILE = 'GdWCkxBtKWOsKjdch';
  
  const results: any = {
    timestamp: new Date().toISOString(),
    tokenPresent: !!APIFY_TOKEN,
    tokenLength: APIFY_TOKEN?.length || 0,
    tests: []
  };

  // Test 1: Auth
  try {
    const res = await fetch(`https://api.apify.com/v2/users/me?token=${APIFY_TOKEN}`);
    const data = await res.json();
    results.tests.push({
      step: 1,
      name: 'Auth',
      ok: res.ok,
      status: res.status,
      user: data.data?.username
    });
  } catch (err: any) {
    results.tests.push({ step: 1, name: 'Auth', error: err.message });
  }

  // Test 2: List actors
  try {
    const res = await fetch(`https://api.apify.com/v2/acts?token=${APIFY_TOKEN}&limit=5`);
    const data = await res.json();
    results.tests.push({
      step: 2,
      name: 'List Actors',
      ok: res.ok,
      count: data.data?.items?.length || 0
    });
  } catch (err: any) {
    results.tests.push({ step: 2, name: 'List Actors', error: err.message });
  }

  // Test 3: Get specific actor
  try {
    const res = await fetch(`https://api.apify.com/v2/acts/${ACTOR_PROFILE}?token=${APIFY_TOKEN}`);
    const data = await res.json();
    results.tests.push({
      step: 3,
      name: 'Get Actor',
      ok: res.ok,
      actorName: data.data?.name,
      actorId: data.data?.id
    });
  } catch (err: any) {
    results.tests.push({ step: 3, name: 'Get Actor', error: err.message });
  }

  // Test 4: Start actor
  try {
    const res = await fetch(`https://api.apify.com/v2/acts/${ACTOR_PROFILE}/runs?token=${APIFY_TOKEN}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        profiles: ['https://www.tiktok.com/@tiktok'],
        resultsPerPage: 1
      })
    });
    const data = await res.json();
    results.tests.push({
      step: 4,
      name: 'Start Actor',
      ok: res.ok,
      status: res.status,
      error: data.error?.message || data.message,
      runId: data.data?.id
    });
    
    if (res.ok && data.data?.id) {
      await fetch(`https://api.apify.com/v2/actor-runs/${data.data.id}/abort?token=${APIFY_TOKEN}`, { method: 'POST' });
    }
  } catch (err: any) {
    results.tests.push({ step: 4, name: 'Start Actor', error: err.message });
  }

  return NextResponse.json(results);
}
