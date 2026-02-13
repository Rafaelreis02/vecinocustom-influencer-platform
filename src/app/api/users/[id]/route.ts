/**
 * PATCH /api/users/[id]
 * DELETE /api/users/[id]
 * 
 * Atualizar e eliminar utilizadores (admin only)
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { handleApiError } from '@/lib/api-error';
import { logger } from '@/lib/logger';
import { serializeBigInt } from '@/lib/serialize';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Verificar se é admin
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Acesso negado' },
        { status: 403 }
      );
    }

    const { id } = await params;
    const body = await request.json();
    const { role, name } = body;

    const updateData: any = {};
    if (role) updateData.role = role;
    if (name !== undefined) updateData.name = name;

    const user = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
      },
    });

    logger.info('[API] User updated', { userId: id, updates: { role, name } });

    return NextResponse.json(serializeBigInt({ user }));

  } catch (error) {
    logger.error('[API] Error updating user', { error });
    return handleApiError(error);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Verificar se é admin
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Acesso negado' },
        { status: 403 }
      );
    }

    const { id } = await params;

    // Não permitir eliminar a si próprio
    if (session.user.id === id) {
      return NextResponse.json(
        { error: 'Não podes eliminar o teu próprio utilizador' },
        { status: 400 }
      );
    }

    await prisma.user.delete({
      where: { id },
    });

    logger.info('[API] User deleted', { userId: id });

    return NextResponse.json({ success: true });

  } catch (error) {
    logger.error('[API] Error deleting user', { error });
    return handleApiError(error);
  }
}
