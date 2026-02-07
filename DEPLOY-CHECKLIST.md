# ✅ Deploy Checklist - Auto-Import Influencers

## 1️⃣ Vercel Dashboard (AGORA!)

1. **Vai a:** https://vercel.com/dashboard
2. **Seleciona:** `vecinocustom-influencer-platform`
3. O Vercel já deve estar a fazer deploy automaticamente (commit detectado)

---

## 2️⃣ Adicionar Variável de Ambiente

### No Vercel Dashboard:

1. **Settings** (menu lateral) → **Environment Variables**
2. **Add New**
3. Preenche:
   ```
   Key:   ANTHROPIC_API_KEY
   Value: (a tua chave API da Anthropic)
   ```
4. **Environment:** Production ✅
5. **Save**

---

## 3️⃣ Redeploy (se necessário)

Se o deploy já terminou antes de adicionar a variável:

1. **Deployments** → Latest deployment
2. **⋯ (three dots)** → **Redeploy**
3. Ou espera pelo próximo push (qualquer mudança)

---

## 4️⃣ Verificar Cron Job

Depois do deploy:

1. **Settings** → **Cron Jobs**
2. Deve aparecer:
   ```
   /api/cron/process-influencers
   Schedule: */2 * * * * (Every 2 minutes)
   Status: Active
   ```

---

## 5️⃣ Testar em Produção

### Frontend:

1. Vai ao teu site: `https://teu-dominio.vercel.app`
2. **Dashboard → Influencers → Adicionar**
3. **"Importação Inteligente"**
   - Handle: `barbarapaisdv`
   - Plataforma: TikTok
4. Clica **"Analisar e Importar"**
5. Espera ~2 minutos
6. **Refresh** na lista
7. ✅ Deve aparecer como **"💡 Suggestion"** com todos os dados preenchidos!

### Endpoint Direto (Teste Manual):

```bash
# Criar influencer pendente
curl -X POST https://teu-dominio.vercel.app/api/influencers \
  -H "Content-Type: application/json" \
  -d '{"name":"test","tiktokHandle":"test","status":"IMPORT_PENDING"}'

# Processar (ou espera 2 min pelo cron)
curl -X POST https://teu-dominio.vercel.app/api/worker/process
```

---

## 6️⃣ Ver Logs (Debug)

Se algo correr mal:

1. **Vercel Dashboard** → **Deployments**
2. Clica no deployment mais recente
3. **Functions** → `/api/cron/process-influencers`
4. Ver logs de execução

Ou:

1. **Functions** → `/api/worker/process`
2. Ver erros de processamento

---

## 🚨 Problemas Comuns

### Cron não aparece:
- Verifica que `vercel.json` está no root do projeto ✅
- Redeploy o projeto

### Erro 404 (model not found):
- Verifica que `ANTHROPIC_API_KEY` está configurada
- Modelo correto: `claude-3-haiku-20240307` ✅

### Processamento não acontece:
- Verifica logs do cron
- Testa endpoint `/api/worker/pending` → deve retornar `{"found": true}`
- Testa endpoint `/api/worker/process` manualmente

---

## ✅ Sucesso!

Quando funcionar, vais ver:

```json
{
  "name": "Nome Completo",
  "tiktokFollowers": 123456,
  "engagementRate": 8.5,
  "averageViews": "50K-100K",
  "estimatedPrice": 200,
  "fitScore": 4,
  "niche": "Lifestyle",
  "status": "suggestion"
}
```

🎉 **Auto-import funcionando!**

---

**Próximos Passos:**
- [ ] Testar com influencer real
- [ ] Monitorizar custos da API (Anthropic console)
- [ ] Adicionar notificações quando processamento completa
- [ ] Chrome Extension para scraping real (próxima fase)
