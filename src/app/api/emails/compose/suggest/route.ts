import { NextRequest, NextResponse } from 'next/server';
import { handleApiError } from '@/lib/api-error';
import { logger } from '@/lib/logger';
import { GoogleGenerativeAI } from '@google/generative-ai';

// POST /api/emails/compose/suggest - Get AI suggestion for email composition
export async function POST(request: NextRequest) {
  try {
    const { draft, subject, to } = await request.json();

    if (!draft || !draft.trim()) {
      return NextResponse.json(
        { error: 'Rascunho vazio' },
        { status: 400 }
      );
    }

    logger.info('[API] Email compose suggestion requested', {
      draftLength: draft.length,
      hasSubject: !!subject,
    });

    if (!process.env.GOOGLE_API_KEY) {
      logger.error('[API] GOOGLE_API_KEY not configured');
      return NextResponse.json(
        { error: 'Serviço de IA não configurado' },
        { status: 500 }
      );
    }

    const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
    const model = genAI.getGenerativeModel({ model: 'gemini-3-flash-preview' });

    const prompt = `Tu és um assistente de escrita profissional especializado em emails de negócios. 
Refatorar o seguinte rascunho de email para ficar bem estruturado, profissional e convincente.
Mantém o significado e a intenção original, mas melhora a apresentação, gramática e tom.

RASCUNHO DO UTILIZADOR:
${draft}

DESTINATÁRIO: ${to || 'desconhecido'}
ASSUNTO: ${subject || 'Sem assunto'}

Retorna APENAS o email refatorado, sem explicações adicionais.`;

    const result = await model.generateContent(prompt);
    const suggestion = result.response.text();

    if (!suggestion || !suggestion.trim()) {
      logger.error('[API] Empty suggestion from Gemini', { suggestion });
      return NextResponse.json(
        { error: 'Gemini retornou resposta vazia' },
        { status: 500 }
      );
    }

    logger.info('[API] Email suggestion generated', {
      originalLength: draft.length,
      suggestedLength: suggestion.length,
    });

    return NextResponse.json({
      success: true,
      suggestion,
    });
  } catch (error) {
    logger.error('[API] Error generating email suggestion', { error });
    return handleApiError(error);
  }
}
