import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    // Lista de emails fictícios para limpar
    const emails = [
      'giulia.conti@gmail.com',
      'sofia.rossi@gmail.com',
      'elena.moretti@gmail.com',
      'laura.martinez@gmail.com',
      'carolina.perez@gmail.com'
    ];

    // REMOVER LIXO (Limpeza Total)
    const deleteResult = await prisma.influencer.deleteMany({
      where: { email: { in: emails } }
    });

    return NextResponse.json({
      success: true,
      message: `✅ LIXO REMOVIDO: ${deleteResult.count} perfis fictícios apagados.`,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
