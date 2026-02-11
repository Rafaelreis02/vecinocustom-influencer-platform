# 🤖 MEGA PROMPT - CORREÇÃO COMPLETA VECINOCUSTOM PLATFORM

Você é um desenvolvedor sênior TypeScript/Next.js encarregado de corrigir todos os problemas identificados nesta plataforma. Siga as instruções **NA ORDEM** para garantir funcionalidade completa.

---

## 📁 CONTEXTO DO PROJETO

**Stack:**
- Next.js 15 (App Router)
- React 19
- TypeScript
- Prisma ORM + PostgreSQL (Neon)
- Tailwind CSS

**Objetivo:** Plataforma de gestão de influencers para VecinoCustom (joias personalizadas)

**Funcionalidades Principais:**
- CRUD Influencers
- CRUD Campanhas
- Sistema de Cupões
- Portal do Influencer
- Worker System (scraping TikTok)
- Email Inbox (Gmail sync)
- Shopify Integration

---

## 🎯 MISSÃO PRINCIPAL

Corrigir **TODOS** os problemas identificados na análise (`ANALYSIS.md`), priorizando funcionalidade sobre perfeição. Código deve:
1. ✅ Compilar sem erros
2. ✅ Funcionar end-to-end
3. ✅ Ser type-safe
4. ✅ Ter error handling básico
5. ✅ Ter loading states

---

## 📋 TAREFAS - EXECUTAR NA ORDEM

### 🔴 FASE 1: FUNCIONALIDADE CRÍTICA (P0)

#### Task 1.1: Dashboard com Dados Reais
**Ficheiro:** `src/app/dashboard/page.tsx`

**Atual:** Dados hardcoded
**Fazer:**
1. Marcar componente com `"use client"`
2. Criar hook `useEffect` para fetch:
   - `GET /api/influencers?limit=5&sort=views` → top performers
   - `GET /api/campaigns?status=ACTIVE` → campanhas ativas
   - `GET /api/coupons?active=true` → cupões ativos
3. Criar estados: `loading`, `error`, `data`
4. Mostrar skeleton loader enquanto loading
5. Calcular stats reais dos dados fetched
6. Error boundary se fetch falhar

**Código Exemplo:**
```typescript
"use client";
import { useEffect, useState } from 'react';

export default function DashboardPage() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchDashboardData() {
      try {
        const [influencers, campaigns, coupons] = await Promise.all([
          fetch('/api/influencers').then(r => r.json()),
          fetch('/api/campaigns').then(r => r.json()),
          fetch('/api/coupons').then(r => r.json()),
        ]);
        
        setStats({
          totalInfluencers: influencers.length,
          activeCampaigns: campaigns.filter(c => c.status === 'ACTIVE').length,
          totalCoupons: coupons.length,
          revenue: calculateRevenue(coupons),
        });
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchDashboardData();
  }, []);

  if (loading) return <DashboardSkeleton />;
  if (error) return <ErrorState error={error} />;
  
  // ... rest of component
}
```

---

#### Task 1.2: Auth Middleware
**Criar:** `src/middleware.ts`

**Fazer:**
1. Criar middleware Next.js
2. Proteger rotas `/dashboard/*` e `/api/*` (exceto `/api/portal`)
3. Usar NextAuth ou session simples
4. Redirect para `/login` se não autenticado

**Código:**
```typescript
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const isAuthenticated = request.cookies.get('auth-token'); // ou NextAuth
  const isProtectedRoute = request.nextUrl.pathname.startsWith('/dashboard') ||
                           (request.nextUrl.pathname.startsWith('/api') && 
                            !request.nextUrl.pathname.startsWith('/api/portal'));

  if (isProtectedRoute && !isAuthenticated) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*', '/api/:path*'],
};
```

---

#### Task 1.3: Validação Input com Zod
**Criar:** `src/lib/validation.ts`

**Fazer:**
1. Instalar: `npm install zod`
2. Criar schemas para cada entidade:

```typescript
import { z } from 'zod';

export const InfluencerSchema = z.object({
  name: z.string().min(1, 'Nome obrigatório'),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  tiktokHandle: z.string().optional(),
  instagramHandle: z.string().optional(),
  status: z.enum(['UNKNOWN', 'SUGGESTION', 'IMPORT_PENDING', /* ... */]),
  // ... rest of fields
});

export const CampaignSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  // ...
});

// Export types
export type InfluencerInput = z.infer<typeof InfluencerSchema>;
export type CampaignInput = z.infer<typeof CampaignSchema>;
```

3. Usar em todas as API routes:

```typescript
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const validated = InfluencerSchema.parse(body); // throws if invalid
    
    const influencer = await prisma.influencer.create({
      data: validated,
    });
    
    return NextResponse.json(influencer);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validação falhou', details: error.errors },
        { status: 400 }
      );
    }
    // ... other error handling
  }
}
```

---

#### Task 1.4: Error Handling Global
**Criar:** `src/lib/api-error.ts`

**Fazer:**
```typescript
export class ApiError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public details?: any
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export function handleApiError(error: unknown) {
  console.error('[API Error]', error);

  if (error instanceof ApiError) {
    return NextResponse.json(
      { error: error.message, details: error.details },
      { status: error.statusCode }
    );
  }

  if (error instanceof z.ZodError) {
    return NextResponse.json(
      { error: 'Validação falhou', details: error.errors },
      { status: 400 }
    );
  }

  // Generic error
  return NextResponse.json(
    { error: 'Erro interno do servidor' },
    { status: 500 }
  );
}
```

Usar em todas as rotas:
```typescript
export async function GET(request: Request) {
  try {
    // ... logic
  } catch (error) {
    return handleApiError(error);
  }
}
```

---

### 🟡 FASE 2: UX & QUALIDADE (P1)

#### Task 2.1: Loading States
**Criar:** `src/components/ui/LoadingStates.tsx`

```typescript
export function Skeleton({ className }: { className?: string }) {
  return (
    <div className={`animate-pulse bg-gray-200 rounded ${className}`} />
  );
}

export function DashboardSkeleton() {
  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-32" />
        ))}
      </div>
      <Skeleton className="h-96" />
    </div>
  );
}

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {[...Array(rows)].map((_, i) => (
        <Skeleton key={i} className="h-16" />
      ))}
    </div>
  );
}
```

Adicionar a TODOS os componentes que fazem fetch:
- Dashboard
- Listagens de influencers
- Listagens de campanhas
- Detalhes de influencer

---

#### Task 2.2: Error States
**Criar:** `src/components/ui/ErrorState.tsx`

```typescript
import { AlertCircle } from 'lucide-react';

export function ErrorState({ 
  error, 
  retry 
}: { 
  error: string; 
  retry?: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center">
      <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
      <h3 className="text-lg font-semibold text-gray-900 mb-2">
        Algo correu mal
      </h3>
      <p className="text-gray-600 mb-4">{error}</p>
      {retry && (
        <button
          onClick={retry}
          className="px-4 py-2 bg-black text-white rounded-md hover:bg-gray-800"
        >
          Tentar novamente
        </button>
      )}
    </div>
  );
}
```

---

#### Task 2.3: Remover `any` e Adicionar Tipos
**Fazer em TODOS os ficheiros:**

1. Criar tipos em `src/types/`:

```typescript
// src/types/influencer.ts
export interface Influencer {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  tiktokHandle: string | null;
  tiktokFollowers: number | null;
  instagramHandle: string | null;
  instagramFollowers: number | null;
  status: InfluencerStatus;
  // ... all fields from Prisma schema
}

export type InfluencerStatus = 
  | 'UNKNOWN'
  | 'SUGGESTION'
  | 'IMPORT_PENDING'
  // ... all statuses
  ;
```

2. Substituir TODOS os `any` por tipos específicos:
   - `catch (err: any)` → `catch (error: unknown)`
   - `function analyzeFit(profileData: any)` → `function analyzeFit(profileData: ProfileData)`
   - `const where: any = {}` → `const where: Prisma.InfluencerWhereInput = {}`

---

#### Task 2.4: Remover Console.logs
**Fazer:**
1. Substituir TODOS os `console.log` por logger:

```typescript
// src/lib/logger.ts
export const logger = {
  info: (message: string, data?: any) => {
    if (process.env.NODE_ENV === 'development') {
      console.log(`[INFO] ${message}`, data);
    }
  },
  error: (message: string, error?: any) => {
    console.error(`[ERROR] ${message}`, error);
    // Aqui pode adicionar Sentry, etc
  },
  warn: (message: string, data?: any) => {
    console.warn(`[WARN] ${message}`, data);
  },
};
```

2. Substituir em todo o código:
   - `console.log(...)` → `logger.info(...)`
   - `console.error(...)` → `logger.error(...)`

---

### 🔵 FASE 3: OTIMIZAÇÃO (P2)

#### Task 3.1: Otimizar Queries Prisma
**Fazer em TODAS as queries:**

1. Adicionar `select` para buscar apenas campos necessários:

```typescript
// ❌ ANTES
const influencer = await prisma.influencer.findUnique({
  where: { id },
  include: {
    videos: true,
    campaigns: true,
    coupons: true,
  },
});

// ✅ DEPOIS
const influencer = await prisma.influencer.findUnique({
  where: { id },
  select: {
    id: true,
    name: true,
    email: true,
    status: true,
    tiktokHandle: true,
    tiktokFollowers: true,
    videos: {
      select: {
        id: true,
        views: true,
        likes: true,
        publishedAt: true,
      },
      take: 10, // Limit
      orderBy: { publishedAt: 'desc' },
    },
  },
});
```

2. Adicionar pagination em listagens:

```typescript
// GET /api/influencers
const page = parseInt(searchParams.get('page') || '1');
const limit = parseInt(searchParams.get('limit') || '20');
const skip = (page - 1) * limit;

const [influencers, total] = await Promise.all([
  prisma.influencer.findMany({
    skip,
    take: limit,
    orderBy: { createdAt: 'desc' },
  }),
  prisma.influencer.count(),
]);

return NextResponse.json({
  data: influencers,
  pagination: {
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
  },
});
```

---

#### Task 3.2: Centralizar Env Vars
**Criar:** `src/lib/env.ts`

```typescript
import { z } from 'zod';

const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  NEXTAUTH_SECRET: z.string().min(1),
  NEXTAUTH_URL: z.string().url(),
  ANTHROPIC_API_KEY: z.string().optional(),
  APIFY_TOKEN: z.string().optional(),
  SHOPIFY_STORE_URL: z.string().optional(),
  SHOPIFY_CLIENT_ID: z.string().optional(),
  SHOPIFY_CLIENT_SECRET: z.string().optional(),
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  GOOGLE_REFRESH_TOKEN: z.string().optional(),
});

export const env = envSchema.parse(process.env);
```

Substituir TODOS os `process.env.X` por `env.X`

---

#### Task 3.3: Adicionar "use client" Onde Necessário
**Regra:** Componente precisa "use client" se:
- Usa hooks (useState, useEffect, etc)
- Usa event handlers (onClick, onChange, etc)
- Usa Context API

**Verificar e adicionar em:**
- Todos os forms
- Todos os components com interatividade
- Dashboard
- Listagens com filtros

---

### 🟢 FASE 4: FUNCIONALIDADES ESPECÍFICAS (P3)

#### Task 4.1: Homepage Funcional
**Ficheiro:** `src/app/page.tsx`

1. Marcar com `"use client"`
2. Fetch stats reais da API
3. Botão "Adicionar Influencer" → redirect para `/dashboard/influencers/new`
4. Tipar componentes (remover `any`)

---

#### Task 4.2: Portal do Influencer - Validações
**Ficheiro:** `src/app/portal/[token]/page.tsx`

1. Validar token antes de mostrar form
2. Validar uploads (tamanho, tipo de ficheiro)
3. Preview de produtos antes de submeter
4. Confirmação antes de submeter

---

#### Task 4.3: Worker System - Retry Logic
**Ficheiro:** `src/app/api/worker/process-real/route.ts`

1. Adicionar retry automático (max 3 tentativas)
2. Delay exponencial entre retries
3. Marcar influencer como ERROR após 3 falhas

```typescript
async function processWithRetry(influencerId: string, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await processInfluencer(influencerId);
    } catch (error) {
      if (attempt === maxRetries) {
        await prisma.influencer.update({
          where: { id: influencerId },
          data: { status: 'ERROR', notes: `Failed after ${maxRetries} attempts` },
        });
        throw error;
      }
      // Exponential backoff
      await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, attempt)));
    }
  }
}
```

---

## ✅ CHECKLIST FINAL

Antes de considerar completo, verificar:

- [ ] Código compila sem erros TypeScript
- [ ] Todos os `any` removidos/substituídos
- [ ] Todos os console.log removidos/substituídos
- [ ] Dashboard mostra dados reais
- [ ] Loading states em todas as páginas
- [ ] Error handling em todas as APIs
- [ ] Validação input (Zod) em todas as APIs
- [ ] Auth middleware funcional
- [ ] Queries Prisma otimizadas (select + pagination)
- [ ] Env vars centralizadas
- [ ] "use client" onde necessário
- [ ] Homepage funcional
- [ ] Portal do influencer validado
- [ ] Worker com retry logic

---

## 🚀 OUTPUT ESPERADO

No final, deve entregar:

1. **Commits Git** separados por fase:
   - `feat: dashboard with real data`
   - `feat: add auth middleware`
   - `feat: add input validation with Zod`
   - `feat: add loading and error states`
   - `refactor: remove any types`
   - `refactor: optimize prisma queries`
   - `fix: centralize env vars`

2. **Relatório de Mudanças** (`CHANGES.md`):
   - Ficheiros modificados
   - Funcionalidades corrigidas
   - Breaking changes (se houver)
   - Como testar

3. **Código funcional** end-to-end que:
   - Build passa: `npm run build`
   - Dev server funciona: `npm run dev`
   - Dashboard mostra dados reais
   - Pode adicionar/editar influencers
   - Portal funciona

---

## 📝 NOTAS IMPORTANTES

1. **Priorize funcionalidade sobre perfeição** - se algo é muito complexo, deixe um `// TODO` e continue
2. **Teste incremental** - após cada fase, verifique que o build passa
3. **Commits pequenos** - um commit por task facilita review
4. **Mantenha compatibilidade** - não quebre funcionalidades existentes
5. **Documente decisões** - se fez algo diferente do especificado, explique porquê

---

**BOA SORTE! 🚀**
