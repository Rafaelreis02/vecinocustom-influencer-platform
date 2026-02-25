import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getAllTemplates, updateTemplate, previewTemplate, DEFAULT_PREVIEW_VARIABLES } from '@/lib/partnership-email';

// GET /api/email-templates - List all templates
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const templates = await getAllTemplates();
    return NextResponse.json({ success: true, data: templates });
  } catch (error) {
    console.error('Error fetching templates:', error);
    return NextResponse.json(
      { error: 'Failed to fetch templates' },
      { status: 500 }
    );
  }
}

// POST /api/email-templates/preview - Preview template with variables
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { subject, body: templateBody, variables } = body;

    if (!subject || !templateBody) {
      return NextResponse.json(
        { error: 'Subject and body are required' },
        { status: 400 }
      );
    }

    const previewVars = variables || DEFAULT_PREVIEW_VARIABLES;
    const preview = previewTemplate({ subject, body: templateBody }, previewVars);

    return NextResponse.json({ success: true, data: preview });
  } catch (error) {
    console.error('Error previewing template:', error);
    return NextResponse.json(
      { error: 'Failed to preview template' },
      { status: 500 }
    );
  }
}
