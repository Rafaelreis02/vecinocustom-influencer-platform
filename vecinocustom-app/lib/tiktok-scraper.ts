/**
 * TikTok Profile Scraper
 * Extrai dados reais de perfis TikTok via OpenClaw Browser
 */

export interface TikTokProfileData {
  handle: string;
  name: string;
  bio: string;
  followers: number;
  following: number;
  totalLikes: number;
  email?: string;
  verified: boolean;
  avatarUrl?: string;
  recentVideos: {
    views: number;
  }[];
}

/**
 * Extrai dados de um perfil TikTok
 * Requer OpenClaw Gateway rodando
 */
export async function scrapeTikTokProfile(
  handle: string,
  openclawGatewayUrl = 'http://localhost:18789'
): Promise<TikTokProfileData> {
  const cleanHandle = handle.replace('@', '');
  const profileUrl = `https://www.tiktok.com/@${cleanHandle}`;
  
  console.log(`[SCRAPER] Opening TikTok profile: ${profileUrl}`);
  
  // 1. Abrir página no browser OpenClaw
  const openResponse = await fetch(`${openclawGatewayUrl}/browser/open`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ 
      url: profileUrl,
      profile: 'openclaw'
    })
  });
  
  if (!openResponse.ok) {
    throw new Error(`Failed to open browser: ${openResponse.statusText}`);
  }
  
  const { targetId } = await openResponse.json();
  
  // 2. Esperar página carregar
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  // 3. Tirar snapshot da página
  const snapshotResponse = await fetch(
    `${openclawGatewayUrl}/browser/snapshot?profile=openclaw&targetId=${targetId}`
  );
  
  if (!snapshotResponse.ok) {
    throw new Error(`Failed to get snapshot: ${snapshotResponse.statusText}`);
  }
  
  const snapshotData = await snapshotResponse.json();
  const pageText = snapshotData.text || '';
  
  console.log('[SCRAPER] Snapshot captured, parsing data...');
  
  // 4. Extrair dados usando regex (TikTok tem estrutura previsível)
  
  // Nome e handle
  const nameMatch = pageText.match(new RegExp(`${cleanHandle}\\s+([^\\n]+)`));
  const name = nameMatch ? nameMatch[1].trim() : cleanHandle;
  
  // Followers (ex: "837 A seguir  4510 Seguidores  124.3K Gostos")
  const followersMatch = pageText.match(/(\d+\.?\d*[KM]?)\s+Seguidores/i) ||
                         pageText.match(/(\d+\.?\d*[KM]?)\s+Followers/i);
  const followersStr = followersMatch ? followersMatch[1] : '0';
  const followers = parseNumber(followersStr);
  
  // Following
  const followingMatch = pageText.match(/(\d+\.?\d*[KM]?)\s+A seguir/i) ||
                         pageText.match(/(\d+\.?\d*[KM]?)\s+Following/i);
  const followingStr = followingMatch ? followingMatch[1] : '0';
  const following = parseNumber(followingStr);
  
  // Total Likes
  const likesMatch = pageText.match(/(\d+\.?\d*[KM]?)\s+Gostos/i) ||
                     pageText.match(/(\d+\.?\d*[KM]?)\s+Likes/i);
  const likesStr = likesMatch ? likesMatch[1] : '0';
  const totalLikes = parseNumber(likesStr);
  
  // Bio (geralmente depois do nome e antes dos números)
  const bioMatch = pageText.match(new RegExp(`${name}[\\s\\S]{0,200}?([\\s\\S]{10,200}?)(?:\\d+\\s+A seguir|\\d+\\s+Following)`));
  const bio = bioMatch ? bioMatch[1].trim() : '';
  
  // Email na bio
  const emailMatch = bio.match(/([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+)/);
  const email = emailMatch ? emailMatch[0] : undefined;
  
  // Verified (badge)
  const verified = pageText.includes('Verified account') || pageText.includes('Conta verificada');
  
  // Vídeos recentes (views)
  const videoViewsRegex = /(\d+\.?\d*[KM]?)\s*▶/g;
  const recentVideos: { views: number }[] = [];
  let match;
  
  while ((match = videoViewsRegex.exec(pageText)) !== null && recentVideos.length < 10) {
    recentVideos.push({ views: parseNumber(match[1]) });
  }
  
  console.log('[SCRAPER] Data extracted:', { name, followers, totalLikes });
  
  return {
    handle: cleanHandle,
    name,
    bio,
    followers,
    following,
    totalLikes,
    email,
    verified,
    recentVideos
  };
}

/**
 * Converte strings com K/M para números
 * Ex: "4.5K" → 4500, "1.2M" → 1200000
 */
function parseNumber(str: string): number {
  if (!str) return 0;
  
  const cleaned = str.trim().toUpperCase();
  
  if (cleaned.includes('M')) {
    return Math.round(parseFloat(cleaned) * 1000000);
  }
  
  if (cleaned.includes('K')) {
    return Math.round(parseFloat(cleaned) * 1000);
  }
  
  return parseInt(cleaned.replace(/[^0-9]/g, ''), 10) || 0;
}

/**
 * Calcula engagement rate baseado em métricas
 */
export function calculateEngagementRate(
  totalLikes: number,
  followers: number,
  videosCount: number = 100
): number {
  if (followers === 0) return 0;
  
  // Estimativa: likes / (followers * videos) * 100
  const avgLikesPerVideo = totalLikes / videosCount;
  const rate = (avgLikesPerVideo / followers) * 100;
  
  return parseFloat(rate.toFixed(2));
}

/**
 * Estima preço baseado em followers e engagement
 */
export function estimatePrice(
  followers: number,
  engagementRate: number
): number {
  // Base price por tier
  let basePrice = 0;
  
  if (followers < 10000) {
    basePrice = 50; // nano
  } else if (followers < 100000) {
    basePrice = 150; // micro
  } else if (followers < 1000000) {
    basePrice = 500; // macro
  } else {
    basePrice = 1500; // mega
  }
  
  // Ajuste por engagement (boa engagement = +50%, baixa = -30%)
  const engagementMultiplier = engagementRate >= 5 ? 1.5 : 
                                engagementRate >= 3 ? 1.2 :
                                engagementRate >= 1 ? 1.0 : 0.7;
  
  return Math.round(basePrice * engagementMultiplier);
}

/**
 * Determina tier baseado em followers
 */
export function determineTier(followers: number): string {
  if (followers < 10000) return 'nano';
  if (followers < 100000) return 'micro';
  if (followers < 1000000) return 'macro';
  return 'mega';
}

/**
 * Calcula fit score (1-5) para joias
 * Baseado em nicho, engagement e estabilidade
 */
export function calculateFitScore(
  bio: string,
  engagementRate: number,
  verified: boolean
): number {
  let score = 3; // Base
  
  // Keywords relevantes para joias
  const positiveKeywords = ['fashion', 'moda', 'lifestyle', 'beauty', 'beleza', 'luxury', 'luxo'];
  const bioLower = bio.toLowerCase();
  
  const hasPositiveKeywords = positiveKeywords.some(k => bioLower.includes(k));
  if (hasPositiveKeywords) score += 1;
  
  // Engagement alto
  if (engagementRate >= 5) score += 1;
  else if (engagementRate < 2) score -= 1;
  
  // Verificado
  if (verified) score += 0.5;
  
  // Clamp 1-5
  return Math.max(1, Math.min(5, Math.round(score)));
}
