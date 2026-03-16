/**
 * Update Email Thread IDs
 * 
 * Busca emails do Gmail e atualiza o gmailThreadId na BD
 * CORRE SEGURO: só atualiza campos vazios, não apaga nada
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getGmailAuth } from '@/lib/gmail';
import { google } from 'googleapis';

// LIMITE de emails para processar (para não sobrecarregar)
const BATCH_SIZE = 50;

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    // Apenas admins podem executar
    if (!session?.user?.email?.includes('rafael') && !session?.user?.email?.includes('admin')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('[update-thread-ids] Starting...');

    // Buscar emails na nossa BD que não têm threadId
    const emailsWithoutThread = await prisma.email.findMany({
      where: {
        gmailThreadId: null,
        gmailId: { not: null }, // Só emails que têm gmailId
      },
      select: {
        id: true,
        gmailId: true,
        from: true,
        subject: true,
      },
      take: BATCH_SIZE,
    });

    console.log(`[update-thread-ids] Found ${emailsWithoutThread.length} emails without threadId`);

    if (emailsWithoutThread.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No emails need updating',
        updated: 0,
      });
    }

    // Autenticar com Gmail
    const auth = await getGmailAuth();
    const gmail = google.gmail({ version: 'v1', auth });

    const results = {
      updated: 0,
      failed: 0,
      errors: [] as string[],
    };

    // Para cada email, buscar o threadId do Gmail
    for (const email of emailsWithoutThread) {
      try {
        if (!email.gmailId) continue;

        console.log(`[update-thread-ids] Processing: ${email.gmailId.substring(0, 20)}...`);

        // Buscar mensagem no Gmail
        const msg = await gmail.users.messages.get({
          userId: 'me',
          id: email.gmailId,
          format: 'metadata',
          metadataHeaders: ['Message-ID', 'Subject'],
        });

        const threadId = msg.data.threadId;

        if (threadId) {
          // ATUALIZAR SÓ O THREADID - não mexe em mais nada!
          await prisma.email.update({
            where: { id: email.id },
            data: { gmailThreadId: threadId },
          });

          console.log(`[update-thread-ids] ✓ Updated: ${email.id} -> thread: ${threadId.substring(0, 20)}...`);
          results.updated++;
        } else {
          console.log(`[update-thread-ids] ✗ No threadId for: ${email.id}`);
          results.failed++;
        }

        // Pequena pausa para não sobrecarregar a API
        await new Promise(resolve => setTimeout(resolve, 100));

      } catch (error: any) {
        console.error(`[update-thread-ids] ✗ Error processing ${email.id}:`, error.message);
        results.failed++;
        results.errors.push(`${email.id}: ${error.message}`);
      }
    }

    console.log('[update-thread-ids] Done:', results);

    return NextResponse.json({
      success: true,
      processed: emailsWithoutThread.length,
      ...results,
    });

  } catch (error: any) {
    console.error('[update-thread-ids] Fatal error:', error);
    return NextResponse.json(
      { error: 'Failed to update thread IDs', message: error.message },
      { status: 500 }
    );
  }
}

// GET para verificar status (quantos faltam)
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const [total, withoutThread] = await Promise.all([
      prisma.email.count(),
      prisma.email.count({ where: { gmailThreadId: null } }),
    ]);

    return NextResponse.json({
      success: true,
      stats: {
        total,
        withoutThread,
        withThread: total - withoutThread,
      },
    });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
