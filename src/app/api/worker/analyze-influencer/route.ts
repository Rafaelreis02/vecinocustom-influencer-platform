/**
 * Analyze Influencer Profile
 * 
 * POST /api/worker/analyze-influencer
 * 
 * Request:
 * {
 *   "handle": "@username",
 *   "platform": "TIKTOK" | "INSTAGRAM"
 * }
 * 
 * Process:
 * 1. Apify extracts profile data (followers, engagement, etc.)
 * 2. Sonnet evaluates the profile (fit score, notes, pricing)
 * 3. Returns enriched profile data
 */

import { parseProfile } from '@/lib/apify';
import { Anthropic } from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Force Node.js runtime (Edge has issues with ApifyClient)
export const runtime = 'nodejs';

export async function POST(req: Request) {
  try {
    const { handle, platform } = await req.json();

    if (!handle || !platform) {
      return Response.json(
        { error: 'Missing handle or platform' },
        { status: 400 }
      );
    }

    console.log(`[ANALYZE] Starting profile analysis: @${handle} (${platform})`);

    // Step 1: Extract profile data with Apify
    console.log(`[APIFY] Fetching ${platform} profile for @${handle}...`);
    const profileData = await parseProfile(
      handle.replace('@', ''),
      platform as 'TIKTOK' | 'INSTAGRAM'
    );

    console.log(`[APIFY] ✅ Extracted:`, {
      followers: profileData.followers,
      engagement: profileData.engagementRate,
      likes: profileData.totalLikes,
      verified: profileData.verified,
    });

    // Step 2: Use Sonnet to evaluate the profile
    console.log(`[SONNET] Evaluating profile...`);

    const evaluationPrompt = `
Você é um especialista em marketing de influencers. Analise este perfil de influencer e forneça uma avaliação estruturada em JSON.

DADOS DO PERFIL:
- Handle: @${handle}
- Plataforma: ${platform}
- Seguidores: ${profileData.followers || 'N/A'}
- Taxa de Engajamento: ${profileData.engagementRate || 'N/A'}%
- Total de Likes: ${profileData.totalLikes || 'N/A'}
- Verificado: ${profileData.verified ? 'Sim' : 'Não'}
- Bio: ${profileData.biography || 'N/A'}

AVALIAR E RETORNAR APENAS JSON (sem markdown, sem explicação adicional):
{
  "fitScore": <número entre 1 e 5>,
  "tier": "<nano|micro|mid|macro|mega>",
  "niche": "<categoria principal do conteúdo>",
  "contentQuality": "<baixa|média|alta>",
  "audienceQuality": "<baixa|média|alta>",
  "engagementQuality": "<baixa|média|alta>",
  "estimatedPrice": <número em EUR>,
  "notes": "<resumo profissional da avaliação, máx 200 caracteres>",
  "strengths": [<lista de 2-3 pontos fortes>],
  "opportunities": [<lista de 2-3 oportunidades de melhoria>]
}
`;

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-5',
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: evaluationPrompt,
        },
      ],
    });

    const responseText =
      response.content[0].type === 'text' ? response.content[0].text : '';

    console.log(`[SONNET] Response:`, responseText);

    // Parse Sonnet's JSON response
    let evaluation: any = {};
    try {
      evaluation = JSON.parse(responseText);
    } catch (parseError) {
      console.error(`[SONNET] Failed to parse JSON:`, parseError);
      // Try to extract JSON from markdown code blocks
      const jsonMatch = responseText.match(/```json\n([\s\S]*?)\n```/);
      if (jsonMatch) {
        evaluation = JSON.parse(jsonMatch[1]);
      } else {
        throw new Error(`Invalid JSON response from Sonnet: ${responseText}`);
      }
    }

    console.log(`[SONNET] ✅ Evaluation complete:`, evaluation);

    // Combine Apify data with Sonnet evaluation
    const enrichedData = {
      // Apify extracted data
      handle: profileData.handle,
      platform: profileData.platform,
      followers: profileData.followers,
      totalLikes: profileData.totalLikes?.toString() || null,
      engagementRate: profileData.engagementRate,
      biography: profileData.biography,
      verified: profileData.verified,
      averageViews: profileData.averageViews,

      // Sonnet evaluation
      fitScore: evaluation.fitScore || 3,
      tier: evaluation.tier || 'micro',
      niche: evaluation.niche || 'Geral',
      contentQuality: evaluation.contentQuality || 'média',
      audienceQuality: evaluation.audienceQuality || 'média',
      engagementQuality: evaluation.engagementQuality || 'média',
      estimatedPrice: evaluation.estimatedPrice || profileData.estimatedPrice || 150,
      notes: evaluation.notes || 'Perfil analisado',
      strengths: evaluation.strengths || [],
      opportunities: evaluation.opportunities || [],

      // Metadata
      analyzedAt: new Date().toISOString(),
      status: 'suggestion',
    };

    console.log(`[SUCCESS] Analysis complete for @${handle}`);

    return Response.json(enrichedData, { status: 200 });
  } catch (error: any) {
    console.error('[ERROR]', error.message);
    return Response.json(
      { error: error.message || 'Failed to analyze profile' },
      { status: 500 }
    );
  }
}
