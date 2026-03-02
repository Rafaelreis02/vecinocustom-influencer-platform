# Configuração de Permissões - Utilizador Operacional (ASSISTANT)

## ✅ O QUE JÁ ESTÁ IMPLEMENTADO

### 1. Sistema de Roles no Schema
```prisma
enum UserRole {
  ADMIN       // Acesso total
  ASSISTANT   // Operacional (o que queres configurar)
  AI_AGENT    // Automação
}
```

### 2. APIs Protegidas (Já existiam)
Estas APIs já têm verificação de ADMIN:
- ✅ `/api/users` - Gestão de utilizadores
- ✅ `/api/users/[id]` - Editar/eliminar utilizador
- ✅ `/api/settings/shopify` - Configurar Shopify
- ✅ `/api/emails/setup-webhook` - Setup Gmail
- ✅ `/api/webhooks/auto-reconfigure` - Reconfiguração
- ✅ `/api/webhooks/migrate` - Migração de dados

### 3. Novo Sistema de Permissões Criado
Ficheiro: `src/lib/permissions.ts`

Funções disponíveis:
- `checkPermission(role, action, resource)` - Verifica se pode fazer ação
- `requirePermission(req, action, resource)` - Middleware para APIs
- `requireAdmin(req)` - Verifica se é ADMIN
- `requireOperational(req)` - Verifica se é ADMIN ou ASSISTANT
- `getAssistantRestrictionMessage(action, resource)` - Mensagem de erro específica

---

## 🟡 O QUE FALTA IMPLEMENTAR

### 1. Proteção em APIs Críticas (Falta adicionar checks)

#### Deve ser ADMIN apenas:
- ❌ `/api/admin/cleanup-*` - Operações de limpeza
- ❌ `/api/seed/*` - Setup inicial (já é público, mas idealmente só ADMIN)
- ❌ `/api/debug/*` - Endpoints de debug
- ❌ DELETE `/api/influencers/[id]` - Apagar influencers (ASSISTANT não deve poder)
- ❌ DELETE `/api/campaigns/[id]` - Apagar campanhas (ASSISTANT não deve poder)

#### Deve ser ADMIN ou ASSISTANT (bloquear AI_AGENT para escrita):
- ❌ POST/PUT `/api/influencers/*` - Criar/editar influencers
- ❌ POST/PUT `/api/campaigns/*` - Criar/editar campanhas
- ❌ POST/PUT `/api/commissions/*` - Processar comissões
- ❌ POST `/api/partnerships/*` - Criar parcerias
- ❌ POST `/api/coupons/*` - Gerar cupões

### 2. UI/Frontend - Controlo de Acesso

Atualmente **NÃO HÁ** verificação de role no frontend:
- ❌ Botões de "Eliminar" aparecem para ASSISTANT (deviam estar escondidos)
- ❌ Menu de "Configurações" aparece para ASSISTANT (devia estar limitado)
- ❌ Menu de "Gestão de Users" aparece para ASSISTANT (só ADMIN)
- ❌ "Setup Shopify" visível para ASSISTANT

**Exemplo do que falta implementar:**
```tsx
// No componente React
const { data: session } = useSession();
const isAdmin = session?.user?.role === 'ADMIN';

// Esconder botões perigosos para ASSISTANT
{isAdmin && (
  <button onClick={deleteInfluencer}>Eliminar</button>
)}

// Ou desabilitar
<button 
  disabled={!isAdmin}
  title={!isAdmin ? 'Apenas ADMIN pode eliminar' : ''}
>
  Eliminar
</button>
```

### 3. Páginas a Proteger no Frontend

- ❌ `/dashboard/settings` - Mostrar apenas opções permitidas
- ❌ `/dashboard/influencers/[id]/edit` - ASSISTANT pode editar mas não eliminar
- ❌ Menu lateral - Filtrar items por role

### 4. Auditoria (Logging)

- ❌ Log de quem fez o quê (especialmente ações críticas)
- ❌ Alerta quando ASSISTANT tenta fazer ação não permitida

---

## 📋 PLANO DE IMPLEMENTAÇÃO

### Fase 1: APIs Críticas (Prioridade Alta)
1. Adicionar `requireAdmin` a:
   - Todos os `/api/admin/*`
   - Todos os `/api/debug/*`
   - DELETE endpoints de influencers e campaigns

2. Adicionar `requireOperational` a:
   - POST/PUT endpoints de influencers
   - POST/PUT endpoints de campaigns  
   - POST/PUT endpoints de commissions

### Fase 2: Frontend (Prioridade Média)
1. Criar hook `usePermission()`
2. Criar componente `<RequireAdmin>`
3. Atualizar menu lateral para filtrar por role
4. Esconder/desabilitar botões de delete para ASSISTANT
5. Limitar página de Settings para ASSISTANT

### Fase 3: Auditoria (Prioridade Baixa)
1. Adicionar logs a todas as ações críticas
2. Criar página de audit logs (ADMIN only)

---

## 🎯 RESUMO DO QUE O ASSISTANT PODE FAZER

### ✅ PERMITIDO (Operacional)
- Ver dashboard e analytics
- Ver lista de influencers
- Adicionar/editar influencers (não eliminar)
- Ver campanhas
- Criar/editar campanhas (não eliminar)
- Ver comissões
- Processar pagamentos de comissões
- Enviar emails
- Gerir parcerias
- Gerir cupões
- Ver vídeos
- Ver mensagens

### ❌ NÃO PERMITIDO (Configurações/Sistema)
- Criar/editar/eliminar utilizadores
- Configurar Shopify (pode desligar mas não configurar)
- Configurar webhooks Gmail
- Executar migrações de dados
- Reconfigurar automações
- Eliminar influencers permanentemente
- Eliminar campanhas permanentemente
- Aceder a debug tools

---

## 💡 RECOMENDAÇÃO

Queres que eu implemente:

1. **Apenas as APIs críticas** (Fase 1) - Rápido, ~30 min
2. **APIs + Frontend básico** (Fase 1+2) - Completo, ~1-2 horas
3. **Tudo incluindo auditoria** (Fase 1+2+3) - Total, ~3-4 horas

O que preferes?
