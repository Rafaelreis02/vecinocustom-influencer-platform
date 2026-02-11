import { NextResponse } from 'next/server';
import { z } from 'zod';
import { Prisma } from '@prisma/client';

export class ApiError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public details?: unknown
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export function handleApiError(error: unknown): NextResponse {
  console.error('[API Error]', error);

  // Zod validation errors
  if (error instanceof z.ZodError) {
    return NextResponse.json(
      { 
        error: 'Validação falhou', 
        details: error.errors.map(e => ({
          field: e.path.join('.'),
          message: e.message,
        }))
      },
      { status: 400 }
    );
  }

  // Custom API errors
  if (error instanceof ApiError) {
    return NextResponse.json(
      { error: error.message, details: error.details },
      { status: error.statusCode }
    );
  }

  // Prisma errors
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    // Unique constraint violation
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'Registo duplicado', details: error.meta },
        { status: 409 }
      );
    }
    
    // Record not found
    if (error.code === 'P2025') {
      return NextResponse.json(
        { error: 'Registo não encontrado' },
        { status: 404 }
      );
    }
  }

  // Generic error
  return NextResponse.json(
    { error: 'Erro interno do servidor' },
    { status: 500 }
  );
}
