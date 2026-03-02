/**
 * GET /api/users
 * POST /api/users
 * 
 * Listar e criar utilizadores (admin only)
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { handleApiError } from '@/lib/api-error';
import { logger } from '@/lib/logger';
import { serializeBigInt } from '@/lib/serialize';
import bcrypt from 'bcryptjs';
import { requireAdmin } from '@/lib/permissions';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// GET - Listar utilizadores (ADMIN only)
export async function GET(request: NextRequest) {
  try {
    const { allowed, error } = await requireAdmin(request);
    if (!allowed) {
      return NextResponse.json({ error: error || 'Acesso negado' }, { status: 403 });
    }

    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(serializeBigInt({ users }));

  } catch (error) {
    logger.error('[API] Error listing users', { error });
    return handleApiError(error);
  }
}

// POST - Criar utilizador (ADMIN only)
export async function POST(request: NextRequest) {
  try {
    const { allowed, error } = await requireAdmin(request);
    if (!allowed) {
      return NextResponse.json({ error: error || 'Acesso negado' }, { status: 403 });
    }

    const body = await request.json();
    const { email, name, password, role } = body;

    if (!email || !password || !role) {
      return NextResponse.json(
        { error: 'Email, password e role são obrigatórios' },
        { status: 400 }
      );
    }

    // Verificar se email já existe
    const existing = await prisma.user.findUnique({
      where: { email },
    });

    if (existing) {
      return NextResponse.json(
        { error: 'Email já registado' },
        { status: 400 }
      );
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        email,
        name,
        password: hashedPassword,
        role,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
      },
    });

    logger.info('[API] User created', { userId: user.id, email, role });

    return NextResponse.json(serializeBigInt({ user }), { status: 201 });

  } catch (error) {
    logger.error('[API] Error creating user', { error });
    return handleApiError(error);
  }
}
