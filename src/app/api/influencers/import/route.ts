import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { handle, platform } = await request.json();

    if (!handle) {
      return NextResponse.json({ success: false, error: 'Handle required' }, { status: 400 });
    }

    const cleanHandle = handle.replace('@', '');
    let profileData: any = {};

    if (platform === 'tiktok') {
      // Tentativa de scraping "leve" via fetch
      // Nota: TikTok tem defesas fortes. Em produção real, usariamos uma API de scraping (ex: BrightData/ScrapingBee)
      // Aqui tentamos o "best effort" via metadados públicos
      
      const url = `https://www.tiktok.com/@${cleanHandle}`;
      
      // Simulando headers de browser real
      const headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      };

      try {
        const response = await fetch(url, { headers });
        const html = await response.text();

        // Tentar extrair dados do JSON SIGI_STATE ou __UNIVERSAL_DATA__
        // Isto é frágil e muda frequentemente, mas é a única forma sem browser real
        
        // Fallback básico: Meta tags
        const titleMatch = html.match(/<title>(.*?)<\/title>/);
        const descMatch = html.match(/<meta name="description" content="(.*?)"/);
        
        // Tentar encontrar contagem de seguidores via regex simples no HTML (muito falível)
        const followersMatch = html.match(/"followerCount":(\d+)/);
        const likesMatch = html.match(/"heartCount":(\d+)/);
        
        profileData = {
          handle: cleanHandle,
          platform: 'tiktok',
          name: titleMatch ? titleMatch[1].split('|')[0].trim() : cleanHandle,
          tiktokHandle: cleanHandle,
          notes: descMatch ? descMatch[1] : '',
          // Se encontrar no regex, usa, senão deixa vazio para preenchimento manual
          tiktokFollowers: followersMatch ? followersMatch[1] : '',
          totalLikes: likesMatch ? likesMatch[1] : '',
          
          // Estimativas da IA (simuladas se não houver dados reais)
          contentStability: 'HIGH',
          language: 'PT', // Assumir PT por defeito
          country: 'Portugal',
        };

        // Extrair email da bio se existir
        const emailMatch = profileData.notes.match(/([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+)/);
        if (emailMatch) {
          profileData.email = emailMatch[0];
        }

      } catch (scrapeError) {
        console.error('Scrape failed:', scrapeError);
        // Retornar dados básicos se falhar
        profileData = {
          handle: cleanHandle,
          name: cleanHandle,
          tiktokHandle: cleanHandle,
          notes: 'Falha ao aceder ao perfil automaticamente. Por favor preenche os dados ou pede ao Agente.',
        };
      }
    } else {
        // Instagram placeholder
        profileData = {
            handle: cleanHandle,
            platform: 'instagram',
            instagramHandle: cleanHandle,
            name: cleanHandle
        };
    }

    return NextResponse.json({ 
      success: true, 
      data: profileData 
    });

  } catch (error: any) {
    console.error('Import API Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
