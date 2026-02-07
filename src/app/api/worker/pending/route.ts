import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic'; // Sempre fresco

// GET: Verifica se há trabalho pendente
export async function GET() {
  try {
    const pending = await prisma.influencer.findFirst({
      where: { status: 'IMPORT_PENDING' },
      orderBy: { createdAt: 'asc' }, // FIFO (Primeiro a entrar, primeiro a sair)
    });

    return NextResponse.json({ found: !!pending, task: pending });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
