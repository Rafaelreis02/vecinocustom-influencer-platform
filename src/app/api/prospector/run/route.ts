import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { logger } from '@/lib/logger';
import { spawn } from 'child_process';
import path from 'path';

/**
 * API para executar o influencer-prospector.js
 * 
 * POST /api/prospector/run
 * Body: { language: 'PT', max: 50, seed?: '@handle', dryRun?: false }
 */

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const { language, max = 50, seed, dryRun = false } = body;

    // Validações
    if (!language) {
      return NextResponse.json(
        { error: 'Idioma é obrigatório' },
        { status: 400 }
      );
    }

    const validLanguages = ['PT', 'ES', 'EN', 'DE', 'FR', 'IT'];
    if (!validLanguages.includes(language.toUpperCase())) {
      return NextResponse.json(
        { error: `Idioma inválido. Use: ${validLanguages.join(', ')}` },
        { status: 400 }
      );
    }

    if (max < 1 || max > 50) {
      return NextResponse.json(
        { error: 'Máximo deve ser entre 1 e 50' },
        { status: 400 }
      );
    }

    logger.info('[PROSPECTOR] Iniciando execução', { 
      language, 
      max, 
      seed, 
      dryRun,
      user: session.user.id 
    });

    // Construir comando
    const scriptPath = path.join(process.cwd(), 'scripts', 'influencer-prospector.js');
    const args = [
      `--language=${language.toUpperCase()}`,
      `--max=${max}`
    ];
    
    if (seed) {
      args.push(`--seed=${seed}`);
    }
    
    if (dryRun) {
      args.push('--dry-run');
    }

    // Executar script
    return new Promise((resolve) => {
      const child = spawn('node', [scriptPath, ...args], {
        env: {
          ...process.env,
          DATABASE_URL: process.env.DATABASE_URL,
          APIFY_API_TOKEN: process.env.APIFY_API_TOKEN || process.env.APIFY_TOKEN,
          GEMINI_API_KEY: process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY,
        },
        timeout: 30 * 60 * 1000 // 30 minutos timeout
      });

      let stdout = '';
      let stderr = '';

      child.stdout.on('data', (data) => {
        stdout += data.toString();
        logger.info('[PROSPECTOR STDOUT]', data.toString().trim());
      });

      child.stderr.on('data', (data) => {
        stderr += data.toString();
        logger.error('[PROSPECTOR STDERR]', data.toString().trim());
      });

      child.on('close', (code) => {
        logger.info('[PROSPECTOR] Processo terminado', { code });
        
        if (code === 0) {
          // Extrair estatísticas do output
          const stats = parseStats(stdout);
          
          resolve(NextResponse.json({
            success: true,
            message: `Prospecção concluída!`,
            stats,
            output: stdout.slice(-2000) // Últimos 2000 chars
          }));
        } else {
          resolve(NextResponse.json(
            { 
              error: 'Erro ao executar prospector',
              details: stderr || stdout.slice(-1000),
              code
            },
            { status: 500 }
          ));
        }
      });

      child.on('error', (error) => {
        logger.error('[PROSPECTOR] Erro ao iniciar processo', error);
        resolve(NextResponse.json(
          { error: 'Erro ao iniciar prospector', details: error.message },
          { status: 500 }
        ));
      });
    });

  } catch (error: any) {
    logger.error('[PROSPECTOR] Erro na API', error);
    return NextResponse.json(
      { error: error.message || 'Erro interno' },
      { status: 500 }
    );
  }
}

// Helper para extrair estatísticas do output
function parseStats(output: string) {
  const stats: Record<string, any> = {};
  
  // Procurar linhas do relatório final
  const lines = output.split('\n');
  let inStats = false;
  
  for (const line of lines) {
    if (line.includes('RELATÓRIO FINAL')) {
      inStats = true;
      continue;
    }
    
    if (inStats && line.includes(':')) {
      const [key, value] = line.split(':').map(s => s.trim());
      if (key && value) {
        stats[key] = value;
      }
    }
    
    if (inStats && line.includes('======')) {
      inStats = false;
    }
  }
  
  return stats;
}
