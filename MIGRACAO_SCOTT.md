# 🤖 MIGRAÇÃO SCOTT v1.0 → v2.0

## Resumo

O Scott foi atualizado para usar a **API oficial** em vez de código duplicado.

| Antes (v1.0) | Depois (v2.0) |
|--------------|---------------|
| `analisar_importar_local.js` | `scott-api.js` |
| Código duplicado (Apify + Gemini + Prisma) | Chama API `/api/worker/analyze-influencer` |
| Cache próprio em ficheiro | Cache partilhada (API + local) |
| Logs só no terminal | Logs centralizados na plataforma |
| Sem autenticação | API Key segura |

---

## 📋 Checklist de Migração

### 1. Setup Inicial (Rafael + Tech)

- [ ] Tech: Criar user "AI_AGENT" na base de dados
- [ ] Tech: Gerar API Key para o Scott
- [ ] Tech: Guardar API Key no 1Password
- [ ] Tech: Adicionar variáveis de ambiente (Upstash Redis)

### 2. Instalação (Rafael)

```bash
# 1. Clonar/ir para o workspace
cd vecinocustom-influencer-platform

# 2. Instalar node-fetch v2 (necessário para scripts Node)
npm install node-fetch@2

# 3. Criar ficheiro .env na raiz
echo "SCOTT_API_TOKEN=vecino_sk_xxxxx" > .env
# (Token vem do 1Password, dado pelo Tech)

# 4. Testar
node scripts/scott-api.js
```

### 3. Migrar scripts antigos

**Antes:**
```javascript
// analisar_importar_local.js
const { analisarImportar } = require('./analisar_importar_local');
analisarImportar('handle', 'TIKTOK');
```

**Depois:**
```javascript
// Novo: scott-api.js
const { analisarInfluencer, importarInfluencer } = require('./scott-api');

// Só analisar (dry run)
const dados = await analisarInfluencer('handle', 'TIKTOK', true);

// Analisar E importar
const importado = await importarInfluencer('handle', 'TIKTOK');
```

---

## 🔧 Comandos para Tech (Setup)

### 1. Criar user AI_AGENT na DB

```javascript
// prisma/seed-scott.js ou via script
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const bcrypt = require('bcryptjs');

async function criarScott() {
  // Gerar token
  const token = `vecino_sk_${require('crypto').randomUUID().replace(/-/g, '').slice(0, 32)}`;
  const hashed = await bcrypt.hash(token, 10);
  
  const scott = await prisma.user.create({
    data: {
      email: 'scott@vecinocustom.internal',
      name: 'Scott (AI Agent)',
      role: 'AI_AGENT',
      password: hashed,
    }
  });
  
  console.log('Scott criado!');
  console.log('API Key (GUARDAR NO 1PASSWORD):', token);
  console.log('User ID:', scott.id);
}

criarScott();
```

### 2. Guardar no 1Password

```
Vault: AI-VECINO
Item: Scott API Key
- api_key: vecino_sk_xxxxx
- user_id: user_xxxxx
- url: https://vecinocustom-influencer-platform.vercel.app
```

### 3. Adicionar env vars (Vercel)

```bash
vercel env add UPSTASH_REDIS_REST_URL
vercel env add UPSTASH_REDIS_REST_TOKEN
```

---

## 📁 Ficheiros Criados/Modificados

### Novos ficheiros:
- `src/lib/api-auth.ts` - Autenticação por API Key
- `scripts/scott-api.js` - Novo script do Scott

### Modificados:
- `src/app/api/worker/analyze-influencer/route.ts` - Auth + Cache

### Onde estão:
```
vecinocustom-influencer-platform/
├── src/
│   ├── lib/
│   │   └── api-auth.ts           [NOVO]
│   └── app/api/worker/analyze-influencer/
│       └── route.ts              [MODIFICADO]
└── scripts/
    ├── scott-api.js              [NOVO - usar este!]
    └── analisar_importar_local.js [ANTIGO - pode apagar]
```

---

## 🧪 Testar Migração

```bash
# 1. Testar auth
curl -X POST https://vecinocustom-influencer-platform.vercel.app/api/worker/analyze-influencer \
  -H "Authorization: Bearer vecino_sk_xxxxx" \
  -H "Content-Type: application/json" \
  -d '{"handle": "teste", "platform": "TIKTOK", "dryRun": true}'

# 2. Testar script
node scripts/scott-api.js
```

---

## 💡 Diferenças Comportamentais

| Aspecto | Antes | Depois |
|---------|-------|--------|
| **Velocidade** | 10-15s sempre | 0.1s se em cache |
| **Custo** | $0.02 por análise | $0.02 por análise NOVA |
| **Duplicados** | Verificação manual | Cache automático |
| **Erros** | Só no terminal | Logs na plataforma + terminal |
| **Retry** | Não tinha | 3 tentativas automáticas |

---

## 🆘 Troubleshooting

### "401 Unauthorized"
- Verificar se SCOTT_API_TOKEN está definido no .env
- Verificar se token está correto (não foi alterado na DB)

### "429 Rate Limited"
- O Scott tem rate limiting interno (2s entre pedidos)
- Se precisar de mais rápido, falar com Tech

### "Cache não funciona"
- Verificar se UPSTASH_REDIS_REST_URL está definido
- Sem Redis, funciona na mesma mas sem cache partilhado

---

## ✅ Validação Final

- [ ] Script corre sem erros
- [ ] Análise aparece no dashboard (logs)
- [ ] Cache funciona (2ª análise do mesmo handle é instantânea)
- [ ] Influencers importados aparecem na lista
- [ ] Antigo `analisar_importar_local.js` pode ser apagado

---

**Dúvidas?** Perguntar ao Tech 💻

---
_Updated: 2026-02-20_
