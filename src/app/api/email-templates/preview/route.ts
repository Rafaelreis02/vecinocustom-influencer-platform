import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

/**
 * POST /api/email-templates/preview
 * Generate a preview of an email template with sample data
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { subject, body } = await req.json();

    if (!subject || !body) {
      return NextResponse.json(
        { error: 'Subject and body are required' },
        { status: 400 }
      );
    }

    // Sample data for preview
    const sampleData = {
      nome: 'Ana Silva',
      valor: '150.00',
      email: 'ana.silva@email.com',
      instagram: 'anasilva',
      whatsapp: '+351 912 345 678',
      morada: 'Rua das Flores, 123, 4000-123 Porto, Portugal',
      sugestao1: 'https://vecinocustom.com/products/colar-personalizado',
      sugestao2: 'https://vecinocustom.com/products/pulseira-nome',
      sugestao3: 'https://vecinocustom.com/products/brincos-perola',
      url_produto: 'https://vecinocustom.com/products/colar-personalizado',
      url_contrato: 'https://vecinocustom-influencer-platform.vercel.app/portal/abc-123',
      tracking_url: 'https://track.dhl.com/1234567890',
      cupom: 'VECINO_ANA_10',
      portalToken: 'abc-123-def-456',
    };

    // Replace variables in subject and body
    let previewSubject = subject;
    let previewBody = body;

    for (const [key, value] of Object.entries(sampleData)) {
      const regex = new RegExp(`{{${key}}}`, 'g');
      previewSubject = previewSubject.replace(regex, value as string);
      previewBody = previewBody.replace(regex, value as string);
    }

    return NextResponse.json({
      success: true,
      data: {
        subject: previewSubject,
        body: previewBody,
      },
    });
  } catch (error: any) {
    console.error('Error generating preview:', error);
    return NextResponse.json(
      { error: 'Failed to generate preview: ' + error.message },
      { status: 500 }
    );
  }
}
