import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

// GET /api/settings/email-sender - Get email sender settings
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get from database
    const settings = await prisma.$queryRaw`
      SELECT value FROM "app_settings" WHERE key = 'email_sender' LIMIT 1
    `;

    let senderName = 'VecinoCustom';
    let senderEmail = 'brand@vecinocustom.com';

    if (Array.isArray(settings) && settings.length > 0) {
      const dbValue = settings[0]?.value;
      if (dbValue) {
        senderName = dbValue.senderName || senderName;
        senderEmail = dbValue.senderEmail || senderEmail;
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        senderName,
        senderEmail,
      },
    });
  } catch (error) {
    logger.error('[API] Error fetching email sender settings', { error });
    return NextResponse.json(
      { error: 'Erro ao obter configurações' },
      { status: 500 }
    );
  }
}

// POST /api/settings/email-sender - Save email sender settings
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { senderName, senderEmail } = await request.json();

    if (!senderName || !senderName.trim()) {
      return NextResponse.json(
        { error: 'Nome do remetente não pode estar vazio' },
        { status: 400 }
      );
    }

    // Save to database - cast to jsonb
    const valueJson = JSON.stringify({
      senderName: senderName.trim(),
      senderEmail: senderEmail?.trim() || 'brand@vecinocustom.com',
    });
    
    await prisma.$executeRaw`
      INSERT INTO "app_settings" (key, value, "updatedAt")
      VALUES ('email_sender', ${valueJson}::jsonb, CURRENT_TIMESTAMP)
      ON CONFLICT (key) 
      DO UPDATE SET 
        value = EXCLUDED.value,
        "updatedAt" = CURRENT_TIMESTAMP
    `;

    logger.info('[API] Email sender settings saved', {
      senderName: senderName.trim(),
      senderEmail: senderEmail?.trim(),
    });

    return NextResponse.json({
      success: true,
      message: 'Configurações guardadas com sucesso',
      data: {
        senderName: senderName.trim(),
        senderEmail: senderEmail?.trim() || 'brand@vecinocustom.com',
      },
    });
  } catch (error) {
    logger.error('[API] Error saving email sender settings', { error });
    return NextResponse.json(
      { error: 'Erro ao guardar configurações' },
      { status: 500 }
    );
  }
}
