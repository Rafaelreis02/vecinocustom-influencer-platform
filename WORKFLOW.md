# Fluxo Completo de Parceria - Vecino Custom

## Regra de Ouro
**O painel de emails (InfluencerProfileCompact) é um ESPELHO do PartnershipWorkflow.**
Quando algo muda na página de influencer, muda também no painel de emails. Um fluxo único.

## Steps (currentStep na BD é 0-indexed, display é 1-indexed)

| BD | Display | Nome | Status | Quem Age | O que fazer |
|----|---------|------|--------|----------|-------------|
| 0 | Step 1 | Partnership | ANALYZING / COUNTER_PROPOSAL | **Admin ou Influencer** | Ver abaixo |
| 1 | Step 2 | Shipping | AGREED | **Influencer** | Preenche morada + sugestões no portal |
| 2 | Step 3 | Preparing | PRODUCT_SELECTION | **Admin** | Escolhe produto + cria cupom Shopify |
| 3 | Step 4 | Design Review | DESIGN_REVIEW | **Admin** | Envia prova de design |
| 4 | Step 5 | Contract | CONTRACT_PENDING | **Influencer** | Assina contrato no portal |
| 5 | Step 6 | Contract Signed | CONTRACT_SIGNED | **Admin** | Adiciona URL de tracking |
| 6 | Step 7 | Shipped | SHIPPED | **Admin** | Marca como completo |
| 7 | Step 8 | Completed | COMPLETED | - | Parceria concluída |

## Step 1 (Partnership) - Lógica Especial

### Status COUNTER_PROPOSAL
- NÓS enviámos proposta ao influencer
- Influencer está a analisar
- **Aguardamos** - sem botões de ação
- Mostrar: valor que propusemos

### Status ANALYZING  
- Influencer enviou contraproposta
- **NÓS decidimos**
- Botão verde: "Aceitar Proposta" → POST /api/partnerships/{id}/accept-counter
- Botão azul: "Enviar Contraproposta" → modal → POST /api/partnerships/{id}/send-counter
- Mostrar: valor que o influencer propôs

## Step 3 (Preparing) - Campos Obrigatórios
- `selectedProductUrl` - URL do produto na Shopify (obrigatório para avançar)
- `couponCode` - Código VECINO_NOME_10 criado na Shopify (obrigatório para avançar)
- Até não ter ambos os campos, o botão "Avançar" fica desativado

## Endpoints por Ação

| Ação | Endpoint |
|------|----------|
| Criar parceria | POST /api/partnerships/create |
| Avançar step (admin) | POST /api/partnerships/{id}/advance |
| Aceitar proposta do influencer | POST /api/partnerships/{id}/accept-counter |
| Enviar contraproposta | POST /api/partnerships/{id}/send-counter |
| Criar cupom Shopify | POST /api/influencers/{id}/create-coupon |
| Salvar campos workflow | PATCH /api/partnerships/{id} |

## Mapeamento Status → Step (BD)
```
ANALYZING          → 0
COUNTER_PROPOSAL   → 0
AGREED             → 1
PRODUCT_SELECTION  → 2
DESIGN_REVIEW      → 3
CONTRACT_PENDING   → 4
CONTRACT_SIGNED    → 5
SHIPPED            → 6
COMPLETED          → 7
```

## Quem Avança Cada Step

| Step BD | Quem avança | Como |
|---------|-------------|------|
| 0 | Admin | /accept-counter ou /send-counter |
| 1 | Influencer | Portal (/portal/[token]/advance) |
| 2 | Admin | /advance (requer selectedProductUrl + couponCode) |
| 3 | Admin | /advance |
| 4 | Influencer | Portal (/portal/[token]/accept-contract) |
| 5 | Admin | /advance (requer trackingUrl) |
| 6 | Admin | /advance |
| 7 | - | Completo |

## Ficheiros Chave
- `src/components/partnership/PartnershipWorkflow.tsx` - Fonte de verdade visual
- `src/components/partnership/PartnershipStep3.tsx` - Step 3: produto + cupom
- `src/app/api/partnerships/[id]/advance/route.ts` - API avançar step
- `src/app/api/partnerships/[id]/accept-counter/route.ts` - API aceitar proposta
- `src/lib/workflow-config.ts` - Constantes centralizadas
