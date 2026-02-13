# Estrutura de Permissões - Vecino Custom

## Perfis de Utilizador

### 1. ADMIN (Administrador)
**Acesso total à plataforma**

#### O que pode aceder:
- **Dashboard Completo**
  - Todas as estatísticas e relatórios
  - Todas as abas de comissões (Total, Pendentes, Pagamentos, Pagas)
  
- **Influencers**
  - Ver lista completa
  - Criar/editar/eliminar influencers
  - Associar emails
  - Ver perfil detalhado
  - Gerir notas internas
  
- **Campanhas**
  - Criar/editar/eliminar campanhas
  - Gerir influencers nas campanhas
  - Ver resultados
  
- **Emails/Mensagens**
  - Acesso completo ao sistema de emails
  - Sincronização Gmail
  - Associar emails a influencers
  - Enviar respostas
  
- **Comissões**
  - Todas as operações: aprovar, rejeitar, marcar como pago
  - Ver histórico completo
  - Exportar dados
  
- **Definições/Admin**
  - Criar/editar/eliminar utilizadores
  - Definir permissões
  - Alterar passwords
  - Configurações da plataforma

---

### 2. HUMANO AJUDANTE (Assistant)
**Acesso operacional limitado**

#### O que pode aceder:
- **Dashboard**
  - Ver estatísticas (leitura apenas)
  
- **Influencers**
  - Ver lista completa
  - Ver perfil detalhado
  - ✅ Criar novos influencers
  - ❌ Eliminar influencers
  - ❌ Editar dados sensíveis (NIF, banco, etc.)
  - Adicionar/editar notas internas
  
- **Campanhas**
  - Ver campanhas existentes
  - Adicionar influencers a campanhas
  - ❌ Criar/eliminar campanhas
  
- **Emails/Mensagens**
  - Ver emails
  - Associar emails a influencers
  - ❌ Enviar respostas (só ver)
  
- **Comissões**
  - Ver todas as abas
  - ✅ Aprovar/rejeitar comissões (pendentes)
  - ❌ Marcar como pago (só admin)
  
- **Definições**
  - ❌ Sem acesso

---

### 3. INTELIGENCIA ARTIFICIAL (IA/Agent)
**Acesso via API/automação**

#### O que pode aceder:
- **Influencers (via API)**
  - Ver lista
  - Analisar perfis (scoring automático)
  - Sugerir novos influencers
  - ❌ Criar/editar/eliminar diretamente (só sugerir)
  
- **Emails (via API)**
  - Ler emails
  - Classificar emails
  - Sugerir respostas automáticas
  - ❌ Enviar emails diretamente (só sugerir ao admin)
  
- **Comissões (via API)**
  - Calcular comissões automaticamente
  - Sincronizar com Shopify
  - Gerar relatórios
  - ❌ Aprovar/rejeitar/pagar (só dados)
  
- **Campanhas (via API)**
  - Analisar performance
  - Sugerir otimizações
  - ❌ Modificar campanhas

#### Interface:
- Não tem interface web normal
- Opera via API keys/endpoints especiais
- Logs de todas as ações para auditoria

---

## Resumo de Permissões

| Funcionalidade | ADMIN | HUMANO AJUDANTE | IA |
|----------------|-------|-----------------|-----|
| Dashboard | ✅ Total | ✅ Ver | ❌ |
| Influencers - Ver | ✅ | ✅ | ✅ API |
| Influencers - Criar | ✅ | ✅ | ❌ (só sugere) |
| Influencers - Editar | ✅ | ⚠️ Limitado | ❌ |
| Influencers - Eliminar | ✅ | ❌ | ❌ |
| Campanhas - CRUD | ✅ | ⚠️ Ver/Adicionar | ❌ (só sugere) |
| Emails - Ver | ✅ | ✅ | ✅ API |
| Emails - Responder | ✅ | ❌ | ❌ (só sugere) |
| Comissões - Aprovar | ✅ | ✅ | ❌ |
| Comissões - Pagar | ✅ | ❌ | ❌ |
| Definições/Utilizadores | ✅ | ❌ | ❌ |
| Configurações API | ✅ | ❌ | ⚠️ Própria |

---

## Implementação Técnica

### 1. Atualizar Enum no Prisma
```prisma
enum UserRole {
  ADMIN
  ASSISTANT      // HUMANO AJUDANTE
  AI_AGENT       // INTELIGENCIA ARTIFICIAL
}
```

### 2. Middleware de Permissões
Verificar role em cada rota/API

### 3. Componente de Definições
Página para admin gerir utilizadores:
- Lista de utilizadores
- Criar novo (email, nome, role, password)
- Editar role
- Reset password
- Desativar/eliminar
