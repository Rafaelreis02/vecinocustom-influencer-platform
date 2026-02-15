# Email Integration Methods - How Big Apps Do It

## The Method: OAuth2 (o que estamos a usar)

Quando vês um site dizer "Login com Google" ou "Sincronizar Gmail":

```
1. User clica "Conectar Gmail"
2. Google redireciona para página de login
3. User faz login e autoriza permissões
4. App recebe "refresh token" (vitalício)
5. App pode ler/enviar emails eternamente
```

**É exatamente o que fizemos!** ✅

---

## Como Sites/Apps Fazem Isso

### **1. GMAIL / GOOGLE WORKSPACE (Mais Comum)**

**Exemplos:** Gmail, Slack, Zapier, HubSpot, Notion, Make.com

**Fluxo:**
```
Utilizador clica [Conectar Gmail] 
    ↓
Redireciona para: https://accounts.google.com/o/oauth2/auth?...
    ↓
User faz login (se não estiver)
    ↓
Google pede permissão: "Quer dar acesso a emails?"
    ↓
User clica [Permitir]
    ↓
Google redireciona de volta com código
    ↓
App troca código por refresh token
    ↓
App guarda refresh token (seguro!)
    ↓
Agora pode ler/enviar emails sempre
```

**Código aproximado:**
```javascript
// User clica botão
window.location.href = `https://accounts.google.com/o/oauth2/auth?
  client_id=YOUR_CLIENT_ID&
  scope=https://www.googleapis.com/auth/gmail.modify&
  response_type=code&
  redirect_uri=https://yourapp.com/callback`;

// Callback recebe o código
const code = new URLSearchParams(location.search).get('code');

// App troca código por refresh token
const response = await fetch('https://oauth2.googleapis.com/token', {
  method: 'POST',
  body: new URLSearchParams({
    code,
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
    redirect_uri: 'https://yourapp.com/callback',
    grant_type: 'authorization_code'
  })
});

const { refresh_token } = await response.json();
// Guarda refresh_token na BD
```

---

### **2. OUTLOOK / MICROSOFT 365 (Office)**

**Exemplos:** Microsoft Outlook, Office 365, Copilot

**Fluxo:**
Idêntico ao Gmail, mas com Microsoft:
- Endpoint: `https://login.microsoftonline.com/common/oauth2/v2.0/authorize`
- Scopes: `https://graph.microsoft.com/mail.read`

---

### **3. IMAP (Protocolo Universal)**

**Usado por:** Thunderbird, Apple Mail, alguns clientes

**Fluxo:**
```
User entra username + password
    ↓
App conecta ao IMAP server (imap.gmail.com:993)
    ↓
App faz autenticação básica
    ↓
Consegue ler/enviar emails
```

**Problema:** Password fica guardada (inseguro!)

**Solução:** Usar "app passwords" em vez de password real:
- Gmail: Generate app password (16 caracteres)
- Outlook: Similar

```javascript
// IMAP exemplo simplificado
const imapConfig = {
  user: 'user@gmail.com',
  password: 'app_specific_password_16chars', // Não password real!
  host: 'imap.gmail.com',
  port: 993,
  tls: true
};
```

---

## Comparação dos 3 Métodos

| Método | Segurança | Facilidade | Tempo Real | Escalável |
|--------|-----------|-----------|-----------|-----------|
| **OAuth2** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| **IMAP** | ⭐⭐ | ⭐⭐⭐ | ⭐⭐ | ⭐⭐⭐ |
| **App Passwords** | ⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐ |

---

## O que Grandes Apps Fazem

### **Slack**
```
User clica [Add Workspace Email]
    ↓
Slack redireciona para Gmail OAuth
    ↓
Slack obtém refresh_token
    ↓
Slack lê emails do workspace
    ↓
Notificações em tempo real
```

### **HubSpot**
```
User clica [Sync Email]
    ↓
HubSpot pede OAuth com Gmail/Outlook
    ↓
HubSpot guarda refresh_token em BD
    ↓
Background jobs leem emails 24/7
    ↓
CRM atualiza com histórico
```

### **Zapier**
```
User clica [Connect Gmail]
    ↓
Zapier OAuth -> obtém refresh_token
    ↓
User cria automação (quando novo email → fazer X)
    ↓
Webhooks + Polling disparam a automação
```

### **Notion**
```
User clica [Send Email from Notion]
    ↓
Notion pede OAuth
    ↓
User escreve email em Notion
    ↓
Notion envia via Gmail do user
```

---

## Fluxo em VecinoCustom (Atual)

```
Rafael clica [Conectar Gmail]
    ↓
Redireciona para Google OAuth
    ↓
Rafael faz login
    ↓
Rafael clica [Permitir acesso ao Gmail]
    ↓
Google retorna código
    ↓
App troca por refresh_token
    ↓
Rafael vê: "Gmail Conectado! ✅"
    ↓
Refresh token guardado em .env
    ↓
App pode ler/enviar emails eternamente
```

**Endpoint:** `/api/auth/gmail/authorize`

---

## Por que OAuth2 é Melhor?

### **Segurança:**
- ✅ Não armazenamos password
- ✅ Refresh token é vitalício
- ✅ User pode revogar a qualquer momento
- ✅ Google controla as permissões

### **Permissões Granulares:**
```
App pode pedir APENAS:
- Ler emails (gmail.readonly)
- Enviar emails (gmail.send)
- Modificar labels (gmail.modify)
- etc
```

### **Escalabilidade:**
- ✅ Funciona para 1 user ou 1 milhão
- ✅ Sem necessidade de replicar passwords
- ✅ Sem limites de conexão simultânea

---

## Próximos Passos em VecinoCustom

### **Se queremos automação de emails após steps do portal:**

```javascript
// Step 1: Influencer preenche formulário
await createInfluencer({...});

// Step 2: Enviar email automático
await sendEmailViaGmail({
  to: influencer.email,
  subject: 'Bem-vindo ao programa Vecino Custom',
  body: '...'
});

// Step 3: Registrar no histórico
await logEmailSent({...});
```

### **Setup:**
1. ✅ OAuth2 já configurado
2. ✅ Refresh token já guardado
3. ✅ API `/api/emails/compose` pronta
4. ✅ Só falta disparar automaticamente

---

## Resumo

**"Como sites fazem login com Gmail e sincronizar?"**

→ **OAuth2 (o que estamos a fazer)**

**Fluxo:**
1. User clica botão
2. Redireciona para Google
3. User autoriza
4. App recebe refresh token
5. App pode ler/enviar emails eternamente

**Vantagens:**
- ✅ Seguro (sem passwords)
- ✅ Fácil (1 clique para user)
- ✅ Escalável (funciona para N users)
- ✅ Tempo real (webhooks + polling)

**Exemplos reais:** Slack, HubSpot, Zapier, Notion, Gmail

**Nós já temos tudo isto! ✅**

Agora é só disparar emails automaticamente após eventos. 🚀
