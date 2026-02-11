# Arquitetura: Campanha de Descoberta por Hashtag

**Data:** 2026-02-11  
**Status:** 📝 Planeamento (não implementado)  
**Prioridade:** Alta

---

## 🎯 Objetivo

Permitir descobrir **novos influencers potenciais** através de hashtags relevantes para a VecinoCustom (ex: `#joias`, `#jewelry`, `#acessorios`, `#personalizado`).

Diferente da importação direta (que já conhecemos o @handle), aqui:
- **INPUT:** Hashtag (ex: `#jewelry`)
- **OUTPUT:** Lista de influencers **únicos** ranqueados por fit com a marca

---

## 📊 Fluxo Completo

```
1. BUSCA HASHTAG (Apify)
   #jewelry → 100 vídeos recentes com essa tag
   
2. EXTRAÇÃO DE AUTORES
   100 vídeos → ~50 autores únicos (alguns aparecem várias vezes)
   
3. AGREGAÇÃO POR AUTOR
   Agrupar vídeos por author.id
   Calcular métricas por autor (média views, engagement, etc.)
   
4. SCORING & FILTROS
   - Filtrar por followers (ex: 5k-500k)
   - Calcular fit score preliminar (baseado em métricas)
   - Ordenar por potencial
   
5. ANÁLISE AI (Top N)
   - Pegar top 10-20 autores
   - Analisar com Claude Sonnet (igual ao flow de importação)
   - Avaliar fit com VecinoCustom
   
6. SUGESTÕES
   - Mostrar lista ranqueada
   - Admin pode aprovar/rejeitar
   - Aprovados → importar como influencers
```

---

## 🔍 Estrutura de Dados do Apify (Hashtag)

### Input
```javascript
{
  hashtags: ["jewelry"],
  resultsPerPage: 100,  // Máximo recomendado
  shouldDownloadVideos: false,
  shouldDownloadCovers: false,
}
```

### Output
Array de vídeos (posts), cada um com:

```json
{
  "id": "7386790515397692705",
  "text": "Check out my new jewelry haul! #jewelry #fashion",
  "webVideoUrl": "https://www.tiktok.com/@username/video/123",
  "authorMeta": {
    "id": "6900687975756170242",
    "name": "username",
    "nickName": "Display Name",
    "fans": 50000,
    "verified": false,
    "signature": "Bio text",
    "video": 250,
    "heart": 1500000
  },
  "playCount": 150000,
  "diggCount": 12000,
  "commentCount": 450,
  "shareCount": 200,
  "createTimeISO": "2024-07-01T22:00:19.000Z"
}
```

**IMPORTANTE:** 
- Cada vídeo tem `authorMeta` nested (igual ao flow de perfis)
- Mesmo autor pode aparecer múltiplas vezes (vários vídeos com a #)

---

## 🗄️ Schema de Database

### Nova tabela: HashtagCampaign

```prisma
model HashtagCampaign {
  id          String   @id @default(cuid())
  hashtag     String   // Ex: "jewelry" (sem #)
  status      CampaignStatus @default(PENDING)
  
  // Configuração
  maxResults  Int      @default(100)  // Quantos vídeos buscar
  minFollowers Int?    @default(5000) // Filtro: mínimo de followers
  maxFollowers Int?    @default(500000) // Filtro: máximo de followers
  
  // Metadados
  videosFound Int?     // Total de vídeos encontrados
  uniqueAuthors Int?   // Total de autores únicos
  analyzed    Int?     // Quantos autores foram analisados por AI
  
  // Timestamps
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  completedAt DateTime?
  
  // Relações
  createdById String
  createdBy   User     @relation(fields: [createdById], references: [id])
  suggestions HashtagSuggestion[]
}

model HashtagSuggestion {
  id          String   @id @default(cuid())
  campaignId  String
  campaign    HashtagCampaign @relation(fields: [campaignId], references: [id], onDelete: Cascade)
  
  // Dados do autor
  tiktokHandle String
  name        String
  followers   Int
  totalLikes  BigInt
  videoCount  Int
  verified    Boolean  @default(false)
  biography   String?
  
  // Métricas agregadas (da hashtag)
  videosInHashtag Int  // Quantos vídeos com essa # ele tem
  avgViews    Float    // Média de views nos vídeos dessa #
  avgEngagement Float  // Engagement rate médio
  
  // Análise AI
  fitScore    Int?     // 1-5 (se foi analisado)
  niche       String?
  tier        String?
  aiSummary   String?  // Análise do Sonnet
  
  // Estado
  status      SuggestionStatus @default(PENDING)
  reviewedAt  DateTime?
  reviewedById String?
  reviewedBy  User?    @relation(fields: [reviewedById], references: [id])
  
  // Se aprovado, link ao influencer importado
  influencerId String?  @unique
  influencer  Influencer? @relation(fields: [influencerId], references: [id])
  
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  @@index([campaignId])
  @@index([status])
}

enum CampaignStatus {
  PENDING     // A aguardar processamento
  SCRAPING    // A buscar vídeos no Apify
  AGGREGATING // A agrupar por autor
  ANALYZING   // A analisar com AI
  COMPLETED   // Concluída
  FAILED      // Erro
}

enum SuggestionStatus {
  PENDING    // A aguardar revisão
  APPROVED   // Aprovado (vai importar)
  REJECTED   // Rejeitado
  IMPORTED   // Já importado como influencer
}
```

---

## 🚀 Endpoints API

### 1. Criar Campanha
**POST /api/campaigns/hashtag**

Request:
```json
{
  "hashtag": "jewelry",
  "maxResults": 100,
  "minFollowers": 5000,
  "maxFollowers": 500000
}
```

Response:
```json
{
  "id": "campaign123",
  "status": "PENDING",
  "message": "Campanha criada. Processamento em background."
}
```

### 2. Processar Campanha (Worker)
**POST /api/worker/process-hashtag-campaign**

Request:
```json
{
  "campaignId": "campaign123"
}
```

Fluxo:
1. Buscar vídeos no Apify (`scrapeHashtagVideos()`)
2. Extrair autores únicos
3. Filtrar por followers (min/max)
4. Agrupar vídeos por autor
5. Calcular métricas agregadas
6. Criar `HashtagSuggestion` para cada autor
7. (Opcional) Analisar top N com Sonnet
8. Marcar campanha como COMPLETED

### 3. Listar Sugestões
**GET /api/campaigns/hashtag/{id}/suggestions**

Query params:
- `status=PENDING|APPROVED|REJECTED|IMPORTED`
- `minFitScore=3`
- `sortBy=fitScore|followers|avgViews`

Response:
```json
{
  "suggestions": [
    {
      "id": "sug123",
      "tiktokHandle": "fashionista_pt",
      "name": "Maria Silva",
      "followers": 45000,
      "videosInHashtag": 3,
      "avgViews": 12500,
      "fitScore": 4,
      "niche": "Fashion & Lifestyle",
      "status": "PENDING"
    }
  ]
}
```

### 4. Aprovar/Rejeitar Sugestão
**PATCH /api/campaigns/hashtag/suggestions/{id}**

Request:
```json
{
  "status": "APPROVED" // ou "REJECTED"
}
```

Se `APPROVED`:
1. Importar como Influencer (igual ao flow manual)
2. Marcar status → IMPORTED
3. Link `influencerId`

---

## 📐 Lógica de Agregação

```typescript
interface VideoWithAuthor {
  video: ApifyPostItem;
  author: ApifyAuthorMeta;
}

// 1. Agrupar por author.id
const grouped = groupBy(videos, v => v.authorMeta.id);

// 2. Para cada autor único
const suggestions = Object.entries(grouped).map(([authorId, videos]) => {
  const author = videos[0].authorMeta; // Todos iguais
  
  // Calcular métricas agregadas
  const totalViews = sum(videos.map(v => v.playCount || 0));
  const totalLikes = sum(videos.map(v => v.diggCount || 0));
  const avgViews = totalViews / videos.length;
  const avgEngagement = totalViews > 0 ? (totalLikes / totalViews) * 100 : 0;
  
  return {
    tiktokHandle: author.name,
    name: author.nickName || author.name,
    followers: author.fans || 0,
    totalLikes: author.heart || 0,
    videoCount: author.video || 0,
    verified: author.verified || false,
    biography: author.signature || null,
    
    // Métricas da hashtag
    videosInHashtag: videos.length,
    avgViews,
    avgEngagement,
  };
});

// 3. Filtrar
const filtered = suggestions.filter(s =>
  s.followers >= minFollowers &&
  s.followers <= maxFollowers &&
  s.videosInHashtag >= 2  // Pelo menos 2 vídeos com a #
);

// 4. Ordenar por potencial
const sorted = filtered.sort((a, b) => {
  // Scoring preliminar (antes da AI)
  const scoreA = (a.avgViews / 1000) + (a.followers / 10000);
  const scoreB = (b.avgViews / 1000) + (b.followers / 10000);
  return scoreB - scoreA;
});

// 5. Criar sugestões no DB
for (const suggestion of sorted) {
  await prisma.hashtagSuggestion.create({
    data: { ...suggestion, campaignId, status: 'PENDING' }
  });
}
```

---

## 🎨 UI/UX

### Página: Dashboard → Campanhas → Nova Campanha por Hashtag

**Form:**
- Input: Hashtag (ex: `jewelry`, auto-remove #)
- Slider: Min/Max followers (5k - 500k)
- Input: Max vídeos (default 100)
- Checkbox: Analisar top N com AI? (default: sim, top 20)
- Button: "Iniciar Campanha"

**Após criar:**
- Redireciona para `/dashboard/campaigns/hashtag/{id}`
- Mostra progresso em tempo real (polling ou SSE)
- Estados: SCRAPING → AGGREGATING → ANALYZING → COMPLETED

### Página: Detalhe da Campanha

**Cards de Resumo:**
- 📹 Vídeos encontrados: 98
- 👤 Autores únicos: 47
- ✅ Após filtros: 23
- 🤖 Analisados por AI: 20

**Tabela de Sugestões:**
- Colunas: Avatar, Nome, @handle, Followers, Vídeos c/ #, Avg Views, Fit Score, Status
- Ações: Ver Perfil, Aprovar, Rejeitar
- Filtros: Status, Min Fit Score, Min Followers
- Sorting: Fit Score, Followers, Avg Views

**Aprovação em massa:**
- Checkbox para selecionar múltiplos
- Botão: "Aprovar Selecionados" → importa todos

---

## 🔄 Processamento Assíncrono

Opções:

### A. Polling (Simples)
- Frontend faz GET a cada 3s
- Backend retorna status atual
- Quando COMPLETED, para polling

### B. Server-Sent Events (Melhor UX)
- Backend envia eventos em tempo real
- Frontend mostra progresso live
- Ex: "Encontrados 50 vídeos...", "Analisando autor 5/20..."

### C. Webhook (Future)
- Worker notifica endpoint quando completo
- Frontend recebe push notification

**Recomendação inicial:** Polling (mais simples)

---

## ⚡ Otimizações

1. **Caching de autores já analisados:**
   - Se autor já está no DB (de outra campanha), reutilizar análise

2. **Batch AI analysis:**
   - Em vez de 1 call por autor, agrupar 5-10 autores num único prompt

3. **Incremental processing:**
   - Guardar progresso (vídeos 1-50, depois 51-100)
   - Se falhar, retomar de onde parou

4. **Rate limiting:**
   - Apify: max 1 req/s
   - Anthropic: max 50 req/min
   - Queue com delays

---

## 🎯 Critérios de Fit Score (Preliminar, antes da AI)

```typescript
function calculatePreliminaryScore(suggestion: Suggestion): number {
  let score = 0;
  
  // Engagement (max 30 pontos)
  if (suggestion.avgEngagement > 5) score += 30;
  else if (suggestion.avgEngagement > 3) score += 20;
  else if (suggestion.avgEngagement > 1) score += 10;
  
  // Consistência (vídeos com #)
  if (suggestion.videosInHashtag >= 5) score += 20;
  else if (suggestion.videosInHashtag >= 3) score += 15;
  else if (suggestion.videosInHashtag >= 2) score += 10;
  
  // Reach (followers)
  if (suggestion.followers > 100000) score += 25;
  else if (suggestion.followers > 50000) score += 20;
  else if (suggestion.followers > 20000) score += 15;
  else if (suggestion.followers > 10000) score += 10;
  
  // Views consistency
  const viewsPerFollower = suggestion.avgViews / suggestion.followers;
  if (viewsPerFollower > 0.5) score += 15; // Views > 50% followers
  else if (viewsPerFollower > 0.2) score += 10;
  else if (viewsPerFollower > 0.1) score += 5;
  
  // Verified
  if (suggestion.verified) score += 10;
  
  return Math.min(100, score); // Max 100
}
```

Depois, a AI (Sonnet) dá fit score **1-5** mais qualitativo.

---

## 📝 Checklist de Implementação

### Phase 1: Database & API Base
- [ ] Adicionar tabelas `HashtagCampaign` e `HashtagSuggestion` ao schema
- [ ] Migration para criar tabelas
- [ ] API: POST /api/campaigns/hashtag (criar)
- [ ] API: GET /api/campaigns/hashtag (listar)
- [ ] API: GET /api/campaigns/hashtag/{id} (detalhes)

### Phase 2: Worker & Apify
- [ ] Endpoint: POST /api/worker/process-hashtag-campaign
- [ ] Integração com Apify (hashtags)
- [ ] Lógica de agregação por autor
- [ ] Filtros (min/max followers)
- [ ] Criação de HashtagSuggestion no DB
- [ ] Scoring preliminar

### Phase 3: AI Analysis
- [ ] Integrar Sonnet para analisar top N sugestões
- [ ] Atualizar fitScore, niche, aiSummary
- [ ] Handling de erros (continuar se 1 falhar)

### Phase 4: Frontend
- [ ] Página: Criar Campanha
- [ ] Página: Detalhe da Campanha (com polling)
- [ ] Tabela de Sugestões (filtros, sorting)
- [ ] Ações: Aprovar/Rejeitar
- [ ] Importação de aprovados como Influencers

### Phase 5: Polish
- [ ] Validações e error handling
- [ ] Loading states
- [ ] Toasts de feedback
- [ ] Logs detalhados
- [ ] Testes com hashtags reais

---

## 🚧 Riscos & Considerações

1. **Apify Rate Limits:**
   - Free tier: limitado
   - Pode ser necessário upgrade

2. **Custo do Sonnet:**
   - Se analisar 100 autores por campanha → caro
   - Solução: analisar apenas top 20

3. **Duplicados entre campanhas:**
   - Mesmo autor aparece em `#jewelry` e `#fashion`
   - Solução: verificar se já existe antes de criar sugestão

4. **Qualidade da #:**
   - Algumas # são muito genéricas (ex: `#fyp`)
   - Podem retornar milhares de resultados irrelevantes
   - Solução: user escolhe # específicas (ex: `#joyaspersonalizadas`)

---

## 📊 Métricas de Sucesso

- **Taxa de aprovação:** % de sugestões aprovadas
- **Custo por influencer descoberto:** Apify + Sonnet costs
- **Tempo de processamento:** Scraping + Análise
- **Qualidade:** Fit score médio dos aprovados

---

**Próximo passo:** Implementar Phase 1 (Database + API base) ou discutir estratégia?
