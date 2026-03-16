import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { google } from 'googleapis';
import { getGmailAuth } from '@/lib/gmail';

// Token secreto para autorização (temporário)
const ADMIN_TOKEN = 'update-threads-2024';

export async function GET(request: NextRequest) {
  try {
    // Verificar token
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');
    
    if (token !== ADMIN_TOKEN) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const batchSize = 30; // Processar 30 de cada vez

    // Buscar stats
    const [total, withoutThread] = await Promise.all([
      prisma.email.count(),
      prisma.email.count({ where: { gmailThreadId: null } }),
    ]);

    if (withoutThread === 0) {
      return NextResponse.json({
        success: true,
        message: '✅ Todos os emails já têm threadId!',
        stats: { total, withoutThread, withThread: total },
      });
    }

    // Buscar emails para processar
    const emails = await prisma.email.findMany({
      where: {
        gmailThreadId: null,
        gmailId: { not: null },
      },
      select: {
        id: true,
        gmailId: true,
        from: true,
        subject: true,
      },
      take: batchSize,
    });

    // Autenticar Gmail
    const auth = await getGmailAuth();
    const gmail = google.gmail({ version: 'v1', auth });

    let updated = 0;
    let failed = 0;
    const errors: string[] = [];

    for (const email of emails) {
      try {
        if (!email.gmailId) continue;

        const msg = await gmail.users.messages.get({
          userId: 'me',
          id: email.gmailId,
          format: 'minimal',
        });

        const threadId = msg.data.threadId;

        if (threadId) {
          await prisma.email.update({
            where: { id: email.id },
            data: { gmailThreadId: threadId },
          });
          updated++;
        } else {
          failed++;
        }

        // Pequena pausa
        await new Promise(r => setTimeout(r, 100));

      } catch (err: any) {
        failed++;
        errors.push(`${email.id}: ${err.message}`);
      }
    }

    const remaining = await prisma.email.count({ where: { gmailThreadId: null } });

    return NextResponse.json({
      success: true,
      message: `Processados ${emails.length} emails`,
      stats: {
        total,
        withoutThread: remaining,
        withThread: total - remaining,
      },
      batch: {
        processed: emails.length,
        updated,
        failed,
      },
      nextUrl: remaining > 0 
        ? `/api/admin/update-threads-bulk?token=${ADMIN_TOKEN}` 
        : null,
      errors: errors.slice(0, 5), // Mostrar só primeiros 5 erros
    });

  } catch (error: any) {
    console.error('[update-threads-bulk] Error:', error);
    return NextResponse.json(
      { error: 'Failed to update', message: error.message },
      { status: 500 }
    );
  }
}
