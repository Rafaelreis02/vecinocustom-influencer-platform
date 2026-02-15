import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic'; // Força não-cache

export async function POST(request: NextRequest) {
  const SCRIPT_VERSION = "v3-FULL-NOTES-DEBUG";
  console.log(`[SEED] Iniciando seed prospects ${SCRIPT_VERSION}`);

  try {
    // 1. Buscar admin
    const admin = await prisma.user.findFirst({
      where: { role: 'ADMIN' },
    });

    if (!admin) {
      console.error('[SEED] Nenhum admin encontrado');
      return NextResponse.json({ error: 'Nenhum admin encontrado' }, { status: 400 });
    }

    const emails = [
      'giulia.conti@gmail.com',
      'sofia.rossi@gmail.com',
      'elena.moretti@gmail.com',
      'laura.martinez@gmail.com',
      'carolina.perez@gmail.com'
    ];

    // 2. DELETE EXPLICITO
    console.log('[SEED] Removendo influencers existentes...');
    const deleteResult = await prisma.influencer.deleteMany({
      where: { email: { in: emails } }
    });
    console.log(`[SEED] Removidos: ${deleteResult.count}`);

    // 3. RECRIAR UM A UM (para garantir notas)
    console.log('[SEED] Recriando influencers com notas completas...');
    
    // GIULIA
    await prisma.influencer.create({
      data: {
        name: 'Giulia Conti',
        email: 'giulia.conti@gmail.com',
        tiktokHandle: '@giuliaconti.ch',
        tiktokFollowers: 28000,
        country: 'Itália',
        language: 'Italiano',
        primaryPlatform: 'TikTok',
        status: 'SUGGESTION',
        engagementRate: 7.1,
        niche: 'Jewelry/UGC',
        verified: true,
        fitScore: 85,
        createdById: admin.id,
        notes: `Scout Prospecting - 15/02/2026

ANÁLISE GEMINI 3-FLASH:
PONTOS FORTES:
- Estética visual impecável para joalharia (close-ups nítidos, luz natural).
- Comunidade "High Intent": comentários perguntam "onde comprar?" e "qual o material?".
- Conteúdo UGC nativo, perfeito para anúncios.

ANÁLISE:
Influencer com perfil técnico perfeito para a Vecino. O conteúdo é indistinguível de um anúncio profissional. O engagement é real e focado no produto, não apenas na influencer.

---
RECOMENDAÇÃO: CONTACTA
PREÇO EST.: 60€
RISCO: Baixo`
      }
    });

    // SOFIA
    await prisma.influencer.create({
      data: {
        name: 'Sofia Rossi',
        email: 'sofia.rossi@gmail.com',
        tiktokHandle: '@sofiarossiofficial',
        tiktokFollowers: 32000,
        country: 'Itália',
        language: 'Italiano',
        primaryPlatform: 'TikTok',
        status: 'SUGGESTION',
        engagementRate: 6.8,
        niche: 'Lifestyle/UGC',
        verified: true,
        fitScore: 83,
        createdById: admin.id,
        notes: `Scout Prospecting - 15/02/2026

ANÁLISE GEMINI 3-FLASH:
PONTOS FORTES:
- Excelente integração de produtos em rotinas de lifestyle diário.
- Responde a 90% dos comentários nas primeiras 2h (sinal de profissionalismo).
- Crescimento consistente de seguidores nos últimos 3 meses.

ANÁLISE:
Perfil lifestyle muito forte. Embora menos focado apenas em "produto" que a Giulia, tem uma audiência mais fiel e interativa. Ótima para brand awareness e prova social.

---
RECOMENDAÇÃO: CONTACTA
PREÇO EST.: 65€
RISCO: Baixo`
      }
    });

    // ELENA
    await prisma.influencer.create({
      data: {
        name: 'Elena Moretti',
        email: 'elena.moretti@gmail.com',
        tiktokHandle: '@elenamoretti.style',
        tiktokFollowers: 38000,
        country: 'Itália',
        language: 'Italiano',
        primaryPlatform: 'TikTok',
        status: 'SUGGESTION',
        engagementRate: 6.3,
        niche: 'Fashion/Style',
        verified: true,
        fitScore: 81,
        createdById: admin.id,
        notes: `Scout Prospecting - 15/02/2026

ANÁLISE GEMINI 3-FLASH:
PONTOS FORTES:
- Foco total em styling e combinações de moda (outfit inspiration).
- Vídeos com boa iluminação e edição dinâmica.
- Público interessado em tendências de moda.

ANÁLISE:
Boa opção para mostrar como usar as joias com diferentes looks. O engagement é bom, mas o conteúdo é um pouco mais genérico que as anteriores. Ainda assim, uma aposta segura.

---
RECOMENDAÇÃO: CONTACTA
PREÇO EST.: 70€
RISCO: Baixo`
      }
    });

    // LAURA
    await prisma.influencer.create({
      data: {
        name: 'Laura Martínez',
        email: 'laura.martinez@gmail.com',
        tiktokHandle: '@lauramtz.official',
        tiktokFollowers: 45000,
        country: 'Espanha',
        language: 'Espanhol',
        primaryPlatform: 'TikTok',
        status: 'SUGGESTION',
        engagementRate: 5.2,
        niche: 'Fashion/Lifestyle',
        verified: true,
        fitScore: 79,
        createdById: admin.id,
        notes: `Scout Prospecting - 15/02/2026

ANÁLISE GEMINI 3-FLASH:
PONTOS FORTES:
- Estética clean e minimalista, alinha bem com a marca.
- Backgrounds simples que não distraem do produto.
- Ativa nos stories, boa conexão com seguidores.

ANÁLISE:
Perfil sólido em Espanha. O engagement é ligeiramente menor (5.2%), mas a qualidade visual compensa. Bom para expandir presença no mercado espanhol com segurança.

---
RECOMENDAÇÃO: VALIDA MAIS
PREÇO EST.: 75€
RISCO: Médio`
      }
    });

    // CAROLINA
    await prisma.influencer.create({
      data: {
        name: 'Carolina Pérez',
        email: 'carolina.perez@gmail.com',
        tiktokHandle: '@carolinaperez.vlogs',
        tiktokFollowers: 52000,
        country: 'Espanha',
        language: 'Espanhol',
        primaryPlatform: 'TikTok',
        status: 'SUGGESTION',
        engagementRate: 4.8,
        niche: 'Lifestyle/Travel',
        verified: false,
        fitScore: 76,
        createdById: admin.id,
        notes: `Scout Prospecting - 15/02/2026

ANÁLISE GEMINI 3-FLASH:
PONTOS FORTES:
- Conteúdo de viagem visualmente apelativo.
- Mostra produtos em cenários bonitos.
- Base de seguidores grande (52k).

ANÁLISE:
O foco é muito em "viagem" e menos em "produto". As joias podem perder-se no cenário. O engagement abaixo de 5% sugere uma audiência menos participativa. Risco de o conteúdo ser demasiado "vlog" e pouco comercial.

---
RECOMENDAÇÃO: VALIDA MAIS
PREÇO EST.: 80€
RISCO: Médio/Alto`
      }
    });

    return NextResponse.json({
      success: true,
      version: SCRIPT_VERSION,
      message: `✅ Recriados 5 influencers com notas completas da IA (Versão ${SCRIPT_VERSION}).`,
      deleted_count: deleteResult.count
    });

  } catch (error: any) {
    console.error('[SEED] Erro:', error);
    return NextResponse.json(
      { error: 'Erro ao recriar prospects', details: error.message },
      { status: 500 }
    );
  }
}

// GET para verificar
export async function GET(request: NextRequest) {
  try {
    const prospects = await prisma.influencer.findMany({
      where: {
        status: 'SUGGESTION',
        fitScore: { gte: 76 },
      },
      select: {
        id: true,
        name: true,
        notes: true, // Importante: ver as notas
      },
      orderBy: { fitScore: 'desc' },
    });

    return NextResponse.json({
      total: prospects.length,
      prospects,
    });
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao ler' }, { status: 500 });
  }
}
