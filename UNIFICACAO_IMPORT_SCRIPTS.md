# 🔄 Unificação dos Scripts de Importação

## 📊 Análise dos 4 Scripts Atuais

### 1. `auto-import-influencers.js` (EM USO)
**O quê:** Script principal de importação automática  
**Como funciona:**
1. Busca influencers com `status: IMPORT_PENDING` via API `/api/worker/pending`
2. Abre TikTok no browser (OpenClaw)
3. Extrai dados reais (followers, likes, bio, email)
4. Calcula engagement, tier, estimatedPrice, fitScore
5. Atualiza influencer com dados completos → `status: suggestion`

**Execução:** Windows Task Scheduler (a cada 5 minutos)

**Problemas:**
- Regex frágeis para parsing (depende do layout TikTok)
- Só suporta TikTok (não Instagram)
- Windows-only (usa `execSync` com OpenClaw CLI)
- Sem retry logic se falhar

---

### 2. `force_import.js` (CONTINGÊNCIA)
**O quê:** Força importação sem scraping  
**Como funciona:**
1. Busca influencers pendentes
2. Atualiza diretamente com valores default
3. Status → `negotiating` (com warning nos notes)

**Uso:** Quando scraping falha e precisas de avançar manualmente

**Problemas:**
- Dados são placeholder (followers: 0, etc)
- Requer revisão manual depois

---

### 3. `add-influencer.js` (MANUAL ONE-OFF)
**O quê:** Adiciona influencer específico via Prisma direto  
**Como funciona:**
1. Liga à DB via PrismaClient
2. Cria user admin se não existir
3. Cria influencer com dados hardcoded

**Uso:** Casos especiais (ex: Bárbara Vasconcelos)

**Problemas:**
- Hardcoded para um caso específico
- Não reutilizável sem editar código

---

### 4. `auto-scrape-videos.js` (FUNCIONALIDADE DIFERENTE)
**O quê:** Scrape de vídeos de campanhas ativas por hashtag  
**Como funciona:**
1. Busca campanhas ACTIVE com hashtag
2. Abre página da hashtag (TikTok/Instagram)
3. Usa Claude Haiku para analisar e extrair vídeos
4. Guarda vídeos novos na DB

**Este é diferente** - não importa influencers, importa CONTEÚDO

---

## ✅ Proposta de Unificação

### Serviço Único: `influencer-importer.js`

```javascript
#!/usr/bin/env node
/**
 * VECINO Influencer Importer - Serviço Unificado
 * 
 * Modos de operação:
 *   --mode=auto       → Importação automática (com browser scraping)
 *   --mode=force      → Força importação sem scraping
 *   --mode=manual     → Adiciona influencer específico
 *   --mode=analyze    → Só analisa fit (não guarda)
 * 
 * Plataformas:
 *   --platform=tiktok|instagram
 * 
 * Exemplos:
 *   node influencer-importer.js --mode=auto
 *   node influencer-importer.js --mode=manual --name="Joana" --handle="@joana" --platform=tiktok
 *   node influencer-importer.js --mode=force --id=xyz
 */
```

### Estrutura do Código Unificado

```
scripts/
├── influencer-importer/           # [NOVO] Pasta do serviço
│   ├── index.js                   # Entry point com CLI args
│   ├── lib/
│   │   ├── config.js              # Configuração centralizada
│   │   ├── logger.js              # Logging unificado
│   │   ├── api-client.js          # Cliente para Vercel API
│   │   ├── parsers/
│   │   │   ├── tiktok-parser.js   # Lógica de parsing TikTok
│   │   │   └── instagram-parser.js # Lógica de parsing Instagram
│   │   └── scrapers/
│   │       ├── browser-scraper.js # Scraper com OpenClaw
│   │       └── apify-scraper.js   # Scraper via Apify API
│   └── modes/
│       ├── auto.js                # Modo automático
│       ├── force.js               # Modo force
│       ├── manual.js              # Modo manual
│       └── analyze-only.js        # Só analisa
└── influencer-importer.js         # Symlink para index.js
```

### Fluxo Unificado

```
┌─────────────────────────────────────────────────────────────┐
│                    influencer-importer                       │
└───────────────────────┬─────────────────────────────────────┘
                        │
        ┌───────────────┼───────────────┐
        │               │               │
        ▼               ▼               ▼
   ┌─────────┐    ┌──────────┐    ┌──────────┐
   │  AUTO   │    │  FORCE   │    │  MANUAL  │
   └────┬────┘    └────┬─────┘    └────┬─────┘
        │              │               │
        ▼              ▼               ▼
   ┌────────────────────────────────────────┐
   │    Busca pendentes / Recebe dados      │
   └────────────────┬───────────────────────┘
                    │
        ┌───────────┴───────────┐
        │                       │
        ▼                       ▼
   ┌─────────┐           ┌──────────┐
   │ Browser │           │ Apify    │
   │ Scraper │           │ API      │
   └────┬────┘           └────┬─────┘
        │                      │
        └──────────┬───────────┘
                   │
                   ▼
   ┌──────────────────────────────────┐
   │  Parser Unificado (TikTok/IG)    │
   │  - Extract followers             │
   │  - Extract engagement            │
   │  - Extract bio/contact           │
   └──────────────┬───────────────────┘
                  │
                  ▼
   ┌──────────────────────────────────┐
   │  AI Analysis (Gemini/Claude)     │
   │  - Fit score                     │
   │  - Niche detection               │
   │  - Price estimation              │
   └──────────────┬───────────────────┘
                  │
                  ▼
   ┌──────────────────────────────────┐
   │  Update API                      │
   │  - status: suggestion            │
   │  - All metrics                   │
   └──────────────────────────────────┘
```

---

## 🔧 Implementação Passo a Passo

### Fase 1: Preparação (30 min)
1. ✅ Criar pasta `scripts/influencer-importer/`
2. ✅ Extrair lógica de parsing para módulos separados
3. ✅ Criar logger unificado
4. ✅ Criar configuração centralizada

### Fase 2: Core (1h)
1. ✅ Implementar cliente API
2. ✅ Implementar parsers (TikTok + Instagram)
3. ✅ Implementar AI analysis
4. ✅ Implementar modos auto/force/manual

### Fase 3: Testes (30 min)
1. ✅ Testar modo auto com influencer real
2. ✅ Testar modo force
3. ✅ Testar modo manual
4. ✅ Verificar logging

### Fase 4: Migração (15 min)
1. ✅ Backup dos scripts antigos
2. ✅ Substituir scripts antigos por wrappers (backward compatibility)
3. ✅ Atualizar Task Scheduler
4. ✅ Documentar novo uso

---

## 🚀 Benefícios da Unificação

| Antes | Depois |
|-------|--------|
| 4 scripts separados | 1 serviço unificado |
| Código duplicado | Módulos reutilizáveis |
| Só TikTok | TikTok + Instagram |
| Windows-only | Cross-platform (Node.js) |
| Regex frágeis | Parsers testáveis |
| Sem retry | Retry logic built-in |
| Logs dispersos | Logging centralizado |
| Hardcoded values | Configuração externa |

---

## ❓ Perguntas para ti

1. **Qual script estás a usar atualmente?**
   - Presumo que seja o `auto-import-influencers.js` via Task Scheduler

2. **Queres manter compatibilidade com os comandos antigos?**
   - Posso criar wrappers para `auto-import-influencers.js` chamar o novo serviço

3. **Precisas de suporte para Instagram também?**
   - O script atual só faz TikTok

4. **Tens preferência por Apify vs Browser scraping?**
   - Apify = mais estável, custa $$ 
   - Browser = gratuito mas pode quebrar se TikTok mudar layout

5. **Queres que eu implemente isto agora?**
   - Preciso de acesso ao repo para fazer push
   - Ou faço local e mostro o código para aprovares?

---

## 📋 Checklist Implementação

- [ ] Criar estrutura de pastas
- [ ] Extrair parsers para módulos
- [ ] Implementar logger
- [ ] Implementar modos auto/force/manual
- [ ] Adicionar retry logic
- [ ] Adicionar suporte Instagram
- [ ] Testes manuais
- [ ] Criar wrappers backward-compatible
- [ ] Atualizar documentação
- [ ] Deploy e monitorização

---

**Recomendação:** Começar pela Fase 1 (preparação) que é low-risk e organiza o código. Depois avançamos para as outras fases.

Queres que comece a implementar? 💻
