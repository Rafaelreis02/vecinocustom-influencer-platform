# Arquitetura do Fluxo de Parceria - Portal do Influencer

## Visão Geral
Sistema de workflow em 5 steps para gestão de parcerias entre VecinoCustom e influencers, com negociação de valores e aprovações mútuas.

---

## Status do Influencer

### 1. COUNTER_PROPOSAL
**Quando:** Nós (VecinoCustom) enviamos proposta inicial ao influencer
**O que acontece:**
- Influencer recebe link do portal
- Deve preencher todos os campos obrigatórios (nome, email, instagram, tiktok, phone)
- Campo "Valor" mostra o valor proposto por nós
- Influencer pode:
  - **Aceitar valor** → clica "Aceitar Proposta" → status muda para AGREED → avança Step 2
  - **Negociar valor** → altera o valor → botão "Aceitar" bloqueia → "Contraproposta" ativa → clica → status muda para ANALYZING

**Regras de UI:**
- Todos os campos editáveis (obrigatórios vazios)
- Valor editável (para negociação)
- Botão "Aceitar Proposta": ativo se valor NÃO foi alterado
- Botão "Contraproposta": ativo se valor FOI alterado
- Validação: todos os campos obrigatórios devem estar preenchidos

---

### 2. ANALYZING
**Quando:** Influencer enviou contraproposta (alterou o valor)
**O que acontece:**
- Todos os campos bloqueados
- Mensagem: "A sua proposta está em análise"
- Aguarda nossa resposta no dashboard
- Nós podemos: aceitar contraproposta (muda para AGREED) ou enviar nova proposta (volta para COUNTER_PROPOSAL)

**Regras de UI:**
- Todos os campos bloqueados (read-only)
- Apenas mensagem informativa visível
- Sem botões de ação

---

### 3. AGREED
**Quando:** Acordo alcançado (influencer aceitou nosso valor ou nós aceitamos contraproposta)
**O que acontece:**
- Influencer está no Step 2 (Shipping)
- Deve preencher: morada + 3 sugestões de produtos
- Pode clicar "Review Proposta" para ver Step 1 (valores acordados)

**Regras de UI no Step 2:**
- Campos de morada e sugestões editáveis
- Botão "Review Proposta" visível
- Botão "Send Details" para submeter

**Quando clica "Review Proposta":**
- Mostra Step 1 em modo leitura (todos os campos preenchidos e bloqueados)
- Mostra botão "Next Step" para voltar ao Step 2
- NÃO mostra botões "Aceitar" ou "Contraproposta" (já foi acordado)

---

## Fluxo Completo

```
[VecinoCustom Dashboard]
    |
    v
Criar Parceria + Definir Valor
    |
    v
Status: COUNTER_PROPOSAL ───────────────────┐
    |                                          |
    v                                          |
[Influencer Portal - Step 1]                  |
    |                                          |
    |-- Preenche dados + Aceita valor -------->|
    |    |                                     |
    |    v                                     |
    |  Status: AGREED ─────────────────────────┤
    |    |                                     |
    |    v                                     |
    |  Step 2 (Shipping)                       |
    |                                          |
    |-- Preenche dados + Altera valor -------->|
         |                                     |
         v                                     |
       Status: ANALYZING <─────────────────────┘
         |
         v
[Aguarda VecinoCustom]
         |
         |-- Aceita contraproposta ────────────>
         |    |
         |    v
         |  Status: AGREED
         |    |
         |    v
         |  Step 2 (Shipping)
         |
         |-- Envia nova proposta ─────────────>
              |
              v
            Status: COUNTER_PROPOSAL
              |
              v
            [Volta ao início do loop]
```

---

## Regras de Campos por Status

### Status: COUNTER_PROPOSAL (Step 1)
| Campo | Estado | Obrigatório |
|-------|--------|-------------|
| name | Editável (bloqueado se já tiver valor) | Sim |
| email | Editável (bloqueado se já tiver valor) | Sim |
| instagramHandle | Editável (bloqueado se já tiver valor) | Sim |
| tiktokHandle | Editável (bloqueado se já tiver valor) | Sim |
| phone | Editável (bloqueado se já tiver valor) | Sim |
| agreedPrice | **SEMPRE Editável** | Sim (já preenchido por nós) |

**Botões:**
- "Aceitar Proposta": ativo se agreedPrice === valor original
- "Contraproposta": ativo se agreedPrice !== valor original

---

### Status: ANALYZING (Step 1)
| Campo | Estado | Obrigatório |
|-------|--------|-------------|
| Todos | Bloqueado (read-only) | - |

**UI:**
- Mensagem: "A sua proposta está em análise"
- Sem botões de ação

---

### Status: AGREED (Step 2)
| Campo | Estado | Obrigatório |
|-------|--------|-------------|
| shippingAddress | Editável | Sim |
| productSuggestion1 | Editável | Sim |
| productSuggestion2 | Editável | Não |
| productSuggestion3 | Editável | Não |

**Botões:**
- "Review Proposta": mostra Step 1 em modo leitura
- "Send Details": submite dados e avança

---

## Regras de Navegação

### Step 1 → Step 2
- Apenas quando status = AGREED
- Acontece quando influencer aceita proposta inicial OU nós aceitamos contraproposta

### Step 2 → Step 1 (Review)
- Botão "Review Proposta" disponível em Step 2
- Mostra Step 1 em modo leitura (todos os campos bloqueados)
- Botão "Next Step" para voltar ao Step 2

### Step 2 → Step 3
- Quando influencer preenche morada + sugestão 1
- Clica "Send Details"
- Nossa equipa avança no dashboard (Step 3)

---

## API Endpoints

### GET /api/portal/[token]/workflow
- Busca workflow ativo do influencer
- Retorna dados combinados (perfil + workflow)

### PUT /api/portal/[token]/workflow
- Atualiza dados do workflow
- Se agreedPrice mudou → status muda para ANALYZING
- Apenas campos permitidos pelo step atual

### POST /api/portal/[token]/advance
- Influencer avança step (1→2, 2→3, 4→5)
- Valida campos obrigatórios
- Envia email automático

---

## Estados de Botão (Step 1)

### agreedPrice === valorOriginal (não alterado)
- ✅ "Aceitar Proposta" = ATIVO
- ❌ "Contraproposta" = DESATIVADO

### agreedPrice !== valorOriginal (alterado)
- ❌ "Aceitar Proposta" = DESATIVADO
- ✅ "Contraproposta" = ATIVO

### Campos obrigatórios não preenchidos
- Ambos os botões desativados

---

## Dashboard Admin - Gestão de Contrapropostas

### Quando Influencer envia contraproposta (Status: ANALYZING)

**No Workflow do Dashboard (Step 1):**

Aparece secção especial:
```
┌─────────────────────────────────────────┐
│  CONTRAPROPOSTA RECEBIDA               │
│                                         │
│  Valor proposto pelo influencer: 150€  │
│  (O nosso valor inicial: 100€)         │
│                                         │
│  [✅ Aceitar Contraproposta]           │
│  [📝 Enviar Nova Proposta]             │
└─────────────────────────────────────────┘
```

**Botão "Aceitar Contraproposta":**
- Muda status do influencer para AGREED
- Workflow avança para Step 2
- Influencer recebe email de confirmação

**Botão "Enviar Nova Proposta":**
- Abre modal com campo para novo valor
- Ao confirmar:
  - Atualiza agreedPrice no workflow
  - Muda status para COUNTER_PROPOSAL
  - Influencer pode aceitar ou contrapropor novamente
  - Envia email ao influencer

### API Endpoints Admin

#### POST /api/partnerships/[id]/accept-counter
**Body:** (nenhum)
**Ação:**
- Atualiza status para AGREED
- Atualiza influencer.status para AGREED
- Envia email ao influencer

#### POST /api/partnerships/[id]/send-counter
**Body:** `{ agreedPrice: number }`
**Ação:**
- Atualiza agreedPrice
- Atualiza status para COUNTER_PROPOSAL
- Atualiza influencer.status para COUNTER_PROPOSAL
- Envia email ao influencer com nova proposta

---

## Implementação

### Componentes Principais
1. **Step1** - Partnership Details (COUNTER_PROPOSAL/ANALYZING)
2. **Step2** - Shipping (AGREED)
3. **Step3** - Preparing (read-only para influencer)
4. **Step4** - Contract (read-only para influencer)
5. **Step5** - Shipped (read-only para influencer)

### Estados de Formulário
- `formData` - dados editáveis
- `originalPrice` - valor inicial (para comparação)
- `priceChanged` - boolean (agreedPrice !== originalPrice)

### Validações
- Todos os campos obrigatórios preenchidos
- Valor > 0 (se for proposta com valor)
- Email válido
- Phone válido

---

## Notas Importantes

1. **Valor é sempre editável em COUNTER_PROPOSAL** - permite negociação
2. **Status ANALYZING bloqueia tudo** - aguarda nossa ação
3. **Review Mode em AGREED** - Step 1 é apenas visualização
4. **Próximo avanço é sempre no nosso dashboard** - Steps 3, 5

---

**Data:** 2026-02-26
**Versão:** 1.0
**Autor:** VecinoCustom Dev
