# 🤖 Setup: Auto-Import Influencers com IA

Sistema automático para processar influencers pendentes usando Claude.

## 📋 O que foi implementado

### 1. **Endpoint de Processamento** (`/api/worker/process`)
- Busca o próximo influencer com status `IMPORT_PENDING`
- Chama Claude (Sonnet 4) para analisar o perfil
- Extrai métricas, nicho, engagement, etc.
- Atualiza o influencer no DB com status `suggestion`

### 2. **Endpoint de Verificação** (`/api/worker/pending`)
- Verifica se há influencers pendentes na fila
- Retorna o primeiro da fila (FIFO)

### 3. **Cronjob (Vercel)** (`/api/cron/process-influencers`)
- Endpoint para Vercel Cron
- Configurado em `vercel.json` para rodar a cada 2 minutos
- Processa automaticamente influencers pendentes

### 4. **Script Manual** (`scripts/process-pending-influencers.js`)
- Script Node.js para testar localmente
- Pode ser usado com cron do sistema operativo

## ⚙️ Configuração

### 1. Adicionar API Key do Anthropic

Edita o ficheiro `.env`:

```bash
ANTHROPIC_API_KEY="sk-ant-api03-..."
```

**Onde conseguir a chave:**
1. Vai a https://console.anthropic.com/
2. Settings → API Keys
3. Create Key
4. Copia e cola no `.env`

### 2. (Opcional) CRON_SECRET

Para segurança adicional no endpoint de cron:

```bash
CRON_SECRET="alguma-string-secreta-aleatoria"
```

Depois adiciona isto nas variáveis de ambiente do Vercel também.

### 3. Deploy no Vercel

O ficheiro `vercel.json` já está configurado:

```json
{
  "crons": [{
    "path": "/api/cron/process-influencers",
    "schedule": "*/2 * * * *"
  }]
}
```

**Quando fizeres deploy, o Vercel vai:**
- Detectar automaticamente o `vercel.json`
- Configurar o cron job
- Correr o processamento a cada 2 minutos

**⚠️ IMPORTANTE:** Vercel Cron só funciona em produção (não em preview/local).

### 4. Variáveis de Ambiente no Vercel

No dashboard do Vercel:
1. Project Settings → Environment Variables
2. Adiciona:
   - `ANTHROPIC_API_KEY` = `sk-ant-...`
   - `CRON_SECRET` = `tua-secret-key` (opcional)
3. Redeploy o projeto

## 🧪 Testar Localmente

### Opção 1: Chamar o endpoint diretamente

```bash
# Processar um influencer
curl -X POST http://localhost:3000/api/worker/process
```

### Opção 2: Usar o script Node.js

```bash
# Testar o script
node scripts/process-pending-influencers.js
```

### Opção 3: Via Cron Local (Linux/Mac)

Adiciona ao crontab (`crontab -e`):

```bash
*/2 * * * * cd /path/to/vecinocustom-app && node scripts/process-pending-influencers.js
```

## 📊 Como Usar

### No Frontend:

1. Vai a **Dashboard → Influencers → Adicionar**
2. Secção **"Importação Inteligente"**
3. Escreve o handle: `@barbarapaisdv`
4. Seleciona plataforma: `TikTok`
5. Clica **"Analisar e Importar"**

**O que acontece:**
- ✅ Cria influencer com status `IMPORT_PENDING`
- ⏳ Cron job detecta (max 2 min)
- 🤖 Claude analisa o perfil
- ✅ Influencer movido para `suggestion` com todos os dados preenchidos

### Ver o Progresso:

Na lista de influencers, vais ver:
- **"⏳ Import Pending"** → A aguardar processamento
- **"💡 Suggestion"** → Processado pela IA

## 🔍 Debugging

### Ver logs no Vercel:

1. Vercel Dashboard → teu projeto
2. Deployments → Latest
3. Functions → `/api/cron/process-influencers`
4. Ver logs

### Teste Manual (Vercel Production):

```bash
curl -X GET https://teu-dominio.vercel.app/api/cron/process-influencers \
  -H "Authorization: Bearer teu-cron-secret"
```

### Ver influencers pendentes:

```bash
curl http://localhost:3000/api/worker/pending
# ou
curl https://teu-dominio.vercel.app/api/worker/pending
```

## 📝 Estrutura dos Dados Extraídos

Claude vai preencher:
- ✅ Nome completo
- ✅ Bio/Descrição
- ✅ Número de seguidores
- ✅ Total de likes
- ✅ Engagement rate (%)
- ✅ Average views (range)
- ✅ Content stability (HIGH/MEDIUM/LOW)
- ✅ País
- ✅ Idioma
- ✅ Nicho (Fashion, Beauty, etc)
- ✅ Tipos de conteúdo
- ✅ Tier (nano/micro/macro/mega)
- ✅ Preço estimado (€)
- ✅ Fit score (1-5) - alinhamento com joias
- ✅ Tags
- ✅ Email (se encontrar na bio)

## ⚡ Performance

- **Processamento:** ~10-20s por influencer
- **Cron interval:** 2 minutos
- **Throughput:** ~3-6 influencers por hora
- **Custo Claude:** ~$0.003-0.01 por influencer

## 🚨 Limitações

1. **TikTok/Instagram bloqueiam bots:** Claude não tem acesso direto aos perfis. A análise é baseada em conhecimento geral e pode não ter dados em tempo real.

2. **Rate limits:** Se tiveres muitos influencers pendentes, vão ser processados gradualmente (2 min entre cada).

3. **Vercel Cron (Hobby Plan):** Limitado a 1 cron job. Se precisares de mais, upgrade para Pro.

## 🔄 Alternativas

Se Claude não conseguir aceder aos dados:
1. **API de Scraping:** BrightData, ScrapingBee (pago)
2. **Chrome Extension:** Criar extensão que extrai dados enquanto navegas (próximo passo)
3. **Manual:** Frontend já tem formulário completo para preenchimento manual

## ✅ Checklist de Deploy

- [ ] `ANTHROPIC_API_KEY` configurada no `.env` local
- [ ] `ANTHROPIC_API_KEY` configurada no Vercel (Environment Variables)
- [ ] (Opcional) `CRON_SECRET` configurada
- [ ] `vercel.json` commitado
- [ ] Deploy feito no Vercel
- [ ] Testar endpoint manualmente: `/api/worker/process`
- [ ] Criar influencer teste com "Importação Inteligente"
- [ ] Esperar 2 min e verificar se mudou para "Suggestion"
- [ ] Verificar logs no Vercel

---

**Próximos Passos:**
- [ ] Chrome Extension para scraping real dos perfis
- [ ] Dashboard de monitorização do worker
- [ ] Notificações quando processamento completa
- [ ] Retry automático em caso de erro
