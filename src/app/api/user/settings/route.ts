import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { handleApiError, ApiError } from '@/lib/api-error';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) throw new ApiError(401, 'Não autorizado');

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { emailSignature: true }
    });

    return NextResponse.json(user);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PUT(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) throw new ApiError(401, 'Não autorizado');

    const { emailSignature } = await request.json();

    const user = await prisma.user.update({
      where: { id: session.user.id },
      data: { emailSignature },
      select: { emailSignature: true }
    });

    return NextResponse.json(user);
  } catch (error) {
    return handleApiError(error);
  }
}
