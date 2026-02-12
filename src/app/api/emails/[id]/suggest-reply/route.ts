import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { handleApiError, ApiError } from '@/lib/api-error';
import { logger } from '@/lib/logger';
import { GoogleGenerativeAI } from '@google/generative-ai';

export const dynamic = 'force-dynamic';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // 1. Buscar o email e o histórico da conversa (thread)
    const email = await prisma.email.findUnique({
      where: { id },
      include: {
        influencer: true,
      },
    });

    if (!email) {
      throw new ApiError(404, 'Email não encontrado');
    }

    // 2. Buscar emails anteriores da mesma conversa para dar contexto à IA
    const threadEmails = await prisma.email.findMany({
      where: {
        OR: [
          { gmailThreadId: email.gmailThreadId },
          { from: email.from },
          { to: email.from }
        ]
      },
      orderBy: { receivedAt: 'asc' },
      take: 5,
    });

    // 3. Preparar o contexto para o Gemini
    const conversationHistory = threadEmails
      .map(e => `${e.from === email.to ? 'Nós' : 'Influencer'}: ${e.body}`)
      .join('\n\n---\n\n');

    const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY || '');
    // Usando o modelo exato confirmado: gemini-3-flash-preview
    const model = genAI.getGenerativeModel({ model: 'gemini-3-flash-preview' });

    const prompt = `És o gestor de parcerias da VecinoCustom, uma marca portuguesa de joias personalizadas de alta qualidade.
Temos um email de um influencer e precisamos de uma resposta profissional, amigável e persuasiva.

CONTEXTO DA MARCA:
- Produto: Joias personalizadas com nomes, datas ou iniciais.
- Tom de voz: Próximo, elegante, jovem e profissional.

HISTÓRICO DA CONVERSA:
${conversationHistory}

DADOS DO INFLUENCER (se disponíveis):
- Nome: ${email.influencer?.name || 'Desconhecido'}
- Niche: ${email.influencer?.niche || 'N/A'}
- Fit Score: ${email.influencer?.fitScore || 'N/A'}/5

TAREFA:
Escreve uma sugestão de resposta para o último email recebido. 
- Se for o primeiro contacto, agradece o interesse e pede o media kit ou propõe uma análise.
- Se for uma dúvida, responde de forma clara.
- Se for uma negociação, sê cordial mas firme nos valores da marca.

REGRAS:
1. Responde em Português de Portugal.
2. Não incluas o assunto (Subject).
3. Não incluas a assinatura final (será adicionada automaticamente).
4. Sê direto e evita "palha".

SUGESTÃO DE RESPOSTA:`;

    logger.info('Generating AI reply suggestion...', { emailId: id });
    
    const result = await model.generateContent(prompt);
    const suggestion = result.response.text();

    return NextResponse.json({
      success: true,
      suggestion: suggestion.trim(),
    });

  } catch (error) {
    logger.error('POST /api/emails/[id]/suggest-reply failed', error);
    return handleApiError(error);
  }
}
