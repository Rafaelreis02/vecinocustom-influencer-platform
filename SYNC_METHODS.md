# Email Sync Methods - Comparison & Configuration

## Current Method: Gmail OAuth2 + Push Notifications + Polling Fallback

### 1. **GMAIL OAUTH2 (Current Implementation)**

**Como funciona:**
- User autoriza app com `GOOGLE_REFRESH_TOKEN`
- Token refresh é usado para obter `access_token` dinamicamente
- Refresh token **não expira** (excepto se removido manualmente)
- Access token expira a cada ~1 hora (auto-refresh)

**Vantagens:**
- ✅ Seguro (não guardamos access tokens)
- ✅ Duradouro (refresh token não expira)
- ✅ Sem necessidade de reautorização periódica
- ✅ Funciona com todas as funcionalidades do Gmail
- ✅ Integra bem com webhook push notifications

**Desvantagens:**
- ❌ User tem que fazer OAuth2 setup manualmente
- ❌ Requer acessar endpoint `/api/auth/gmail/authorize`
- ❌ Se refresh token for revogado, tudo para

**Configuração:**
```bash
GOOGLE_REFRESH_TOKEN="[SEE .env.local]"
FROM_EMAIL="noreply@vecinocustom.com"
GOOGLE_CLIENT_ID="[SEE .env.local]"
GOOGLE_CLIENT_SECRET="[SEE .env.local]"
```

**Setup user:**
1. Clica em `/api/auth/gmail/authorize`
2. Autoriza Google
3. Recebe refresh token
4. Guarda em `.env.local`

---

## Alternative Methods

### 2. **GMAIL API KEY (Simpler but Limited)**

**Como funciona:**
- Usa API key simples (sem autenticação de user)
- Apenas acesso de leitura
- Sem necessidade de OAuth2

**Vantagens:**
- ✅ Muito mais simples de configurar
- ✅ Sem necessidade de user authorization
- ✅ Funciona imediatamente com API key

**Desvantagens:**
- ❌ Apenas leitura (não consegue enviar emails)
- ❌ Sem acesso a buscas avançadas
- ❌ Rate limits mais baixos
- ❌ Não funciona com Gmail labels

**Quando usar:**
- Apenas para ler emails (não enviar)
- Prototipagem rápida

---

### 3. **GMAIL SERVICE ACCOUNT (Production - Google Cloud)**

**Como funciona:**
- Usa conta de serviço do Google Cloud
- Domain-wide delegation (impersona utilizadores)
- Acesso completo sem user authorization

**Vantagens:**
- ✅ Sem necessidade de user OAuth2
- ✅ Acesso completo (ler e enviar)
- ✅ Escalável para múltiplas contas
- ✅ Funciona com domain-wide delegation
- ✅ Rate limits maiores

**Desvantagens:**
- ❌ Requer Google Cloud setup
- ❌ Requer domain configuration
- ❌ Mais complexo de configurar
- ❌ Custo associado (Google Cloud)

**Quando usar:**
- App em produção com múltiplos utilizadores
- Domain email próprio (@empresa.com)

---

### 4. **IMAP (Protocolo Universal)**

**Como funciona:**
- Protocolo padrão IMAP para sincronização
- Funciona com qualquer email (Gmail, Outlook, etc)
- Acesso direto ao servidor IMAP

**Vantagens:**
- ✅ Universal (funciona com qualquer email)
- ✅ Sem dependência de APIs proprietárias
- ✅ Rápido e eficiente
- ✅ Baixo custo

**Desvantagens:**
- ❌ Mais lento que APIs nativas
- ❌ Sem search/filters avançados
- ❌ Requer app-specific passwords
- ❌ Sincronização incremental mais complexa

**Quando usar:**
- Multi-provider email (Gmail + Outlook + Yahoo)
- Quando APIs não estão disponíveis

---

### 5. **POLLING vs WEBHOOKS**

**POLLING (Atual - Fallback)**
```
App pede "há novo email?" a cada 5 minutos
→ Simples mas lento (latência até 5 min)
```

**WEBHOOKS (Atual - Primary)**
```
Gmail push notification em tempo real
→ Rápido (~1-2 seg) mas requer webhook receiver
```

**Vantagens:**
- Webhooks: ✅ Tempo real, ✅ Sem polling CPU
- Polling: ✅ Simples, ✅ Sem endpoints complexos

**Desvantagens:**
- Webhooks: ❌ Requer firewall open, ❌ Mais complexo
- Polling: ❌ Lento, ❌ Usa mais recursos

---

## Recommendation for VecinoCustom

**Manter o atual:** OAuth2 + Webhooks + Polling fallback

**Porquê:**
1. ✅ Simples para 1-2 users
2. ✅ Seguro (refresh token)
3. ✅ Tempo real (webhooks)
4. ✅ Fallback automático se webhook cair
5. ✅ Zero custos

**Se escalar para 100+ users:**
→ Migrar para Service Account (Google Cloud)

---

## Checklist Setup Atual

- [x] GOOGLE_REFRESH_TOKEN - Configurado
- [x] FROM_EMAIL - Configurado (noreply@vecinocustom.com)
- [x] GOOGLE_CLIENT_ID - Configurado
- [x] GOOGLE_CLIENT_SECRET - Configurado
- [x] Webhooks - Configurado em Vercel
- [x] Polling fallback - Ativado

**Tudo pronto! ✅**

---

## Para Enviar Emails

Agora que fixámos o `compose/route.ts`:

```javascript
const res = await fetch('/api/emails/compose', {
  method: 'POST',
  body: JSON.stringify({
    to: 'influencer@example.com',
    subject: 'Olá!',
    body: 'Mensagem do email'
  })
});
```

Usa:
- `GOOGLE_REFRESH_TOKEN` - Gera access token automaticamente
- `FROM_EMAIL` - Email remetente (noreply@vecinocustom.com)

✅ Agora deve funcionar!
