/**
 * WORKFLOW_CONFIG.ts
 * 
 * Fonte única de verdade para o fluxo de parceria.
 * Este ficheiro define TODO o fluxo - tanto o painel admin como o portal do influencer
 * usam estas definições.
 * 
 * FLUXO COMPLETO (8 Steps):
 * =========================
 * 
 * Step 0 (BD) / Step 1 (Display): Partnership
 *   - Status: ANALYZING ou COUNTER_PROPOSAL
 *   - Quem age: Depende
 *     * ANALYZING: Nós aceitamos/rejeitamos proposta do influencer
 *     * COUNTER_PROPOSAL: Influencer analisa nossa contraproposta
 *   - Dados: agreedPrice, contactEmail, contactInstagram, contactWhatsapp
 *   - Ação admin: Aceitar proposta OU Enviar contraproposta
 * 
 * Step 1 (BD) / Step 2 (Display): Shipping
 *   - Status: AGREED
 *   - Quem age: Influencer (preenche no portal)
 *   - Dados: shippingAddress, productSuggestion1, productSuggestion2, productSuggestion3
 *   - Ação admin: Aguardar (influencer preenche)
 * 
 * Step 2 (BD) / Step 3 (Display): Preparing ⭐ IMPORTANTE
 *   - Status: PRODUCT_SELECTION
 *   - Quem age: Nós (admin)
 *   - Dados: selectedProductUrl (obrigatório), couponCode (obrigatório)
 *   - Ação admin: 
 *     1. Escolher produto na Shopify
 *     2. Colar URL do produto
 *     3. Gerar código de cupom (VECINO_NOME_10)
 *     4. Criar cupom na Shopify
 *     5. Clicar "Avançar" → Envia email Step 3
 * 
 * Step 3 (BD) / Step 4 (Display): Design Review
 *   - Status: DESIGN_REVIEW
 *   - Quem age: Nós (admin) enviamos prova de design
 *   - Dados: designReferenceUrl
 *   - Ação admin: Enviar prova de design
 * 
 * Step 4 (BD) / Step 5 (Display): Contract
 *   - Status: CONTRACT_PENDING
 *   - Quem age: Influencer (assina no portal)
 *   - Dados: contractSigned, contractUrl
 *   - Ação admin: Aguardar assinatura
 * 
 * Step 5 (BD) / Step 6 (Display): Contract Signed
 *   - Status: CONTRACT_SIGNED
 *   - Quem age: Nós (admin)
 *   - Dados: trackingUrl (obrigatório)
 *   - Ação admin: Adicionar URL de tracking e avançar
 * 
 * Step 6 (BD) / Step 7 (Display): Shipped
 *   - Status: SHIPPED
 *   - Quem age: Influencer (recebe e publica)
 *   - Dados: (nenhum - aguardamos conteúdo)
 *   - Ação admin: Marcar como completo quando influencer publicar
 * 
 * Step 7 (BD) / Step 8 (Display): Completed
 *   - Status: COMPLETED
 *   - Quem age: Ninguém (parceria finalizada)
 *   - Ação: Parceria concluída
 * 
 * MAPEAMENTO STATUS → STEP:
 * ==========================
 * ANALYZING          → Step 0 (Partnership)
 * COUNTER_PROPOSAL   → Step 0 (Partnership)
 * AGREED             → Step 1 (Shipping)
 * PRODUCT_SELECTION  → Step 2 (Preparing) ⭐
 * DESIGN_REVIEW      → Step 3 (Design Review)
 * CONTRACT_PENDING   → Step 4 (Contract)
 * CONTRACT_SIGNED    → Step 5 (Contract Signed)
 * SHIPPED            → Step 6 (Shipped)
 * COMPLETED          → Step 7 (Completed)
 * 
 * CAMPOS POR STEP:
 * ================
 * Step 0: agreedPrice, contactEmail, contactInstagram, contactWhatsapp
 * Step 1: shippingAddress, productSuggestion1, productSuggestion2, productSuggestion3
 * Step 2: selectedProductUrl (required), couponCode (required)
 * Step 3: designReferenceUrl
 * Step 4: contractSigned, contractUrl
 * Step 5: trackingUrl (required)
 * Step 6: (waiting for influencer content)
 * Step 7: (completed)
 */

export const WORKFLOW_STEPS = [
  { 
    number: 1, 
    name: 'Partnership', 
    status: 'ANALYZING',
    description: 'Proposta inicial de parceria',
    bdStep: 0,
  },
  { 
    number: 2, 
    name: 'Shipping', 
    status: 'AGREED',
    description: 'Dados de envio e sugestões',
    bdStep: 1,
  },
  { 
    number: 3, 
    name: 'Preparing', 
    status: 'PRODUCT_SELECTION',
    description: 'Selecionar produto e criar cupom',
    bdStep: 2,
    adminAction: 'Confirmar Produto',
    requiredFields: ['selectedProductUrl', 'couponCode'],
  },
  { 
    number: 4, 
    name: 'Design Review', 
    status: 'DESIGN_REVIEW',
    description: 'Enviar prova de design',
    bdStep: 3,
    adminAction: 'Enviar Prova',
  },
  { 
    number: 5, 
    name: 'Contract', 
    status: 'CONTRACT_PENDING',
    description: 'Contrato e assinatura',
    bdStep: 4,
  },
  { 
    number: 6, 
    name: 'Contract Signed', 
    status: 'CONTRACT_SIGNED',
    description: 'Preparar envio',
    bdStep: 5,
    adminAction: 'Adicionar Tracking',
    requiredFields: ['trackingUrl'],
  },
  { 
    number: 7, 
    name: 'Shipped', 
    status: 'SHIPPED',
    description: 'Encomenda enviada',
    bdStep: 6,
    adminAction: 'Completar',
  },
  { 
    number: 8, 
    name: 'Completed', 
    status: 'COMPLETED',
    description: 'Parceria concluída',
    bdStep: 7,
  },
] as const;

// Mapeamento de status para step (BD index 0-7)
export const STATUS_TO_STEP: Record<string, number> = {
  'ANALYZING': 0,
  'COUNTER_PROPOSAL': 0,
  'AGREED': 1,
  'PRODUCT_SELECTION': 2,
  'DESIGN_REVIEW': 3,
  'CONTRACT_PENDING': 4,
  'CONTRACT_SIGNED': 5,
  'SHIPPED': 6,
  'COMPLETED': 7,
};

// Mapeamento de step (BD index) para status
export const STEP_TO_STATUS: Record<number, string> = {
  0: 'ANALYZING',
  1: 'AGREED',
  2: 'PRODUCT_SELECTION',
  3: 'DESIGN_REVIEW',
  4: 'CONTRACT_PENDING',
  5: 'CONTRACT_SIGNED',
  6: 'SHIPPED',
  7: 'COMPLETED',
};

// Quem age em cada step
export const STEP_ACTOR: Record<number, 'admin' | 'influencer'> = {
  0: 'admin',      // Nós aceitamos/rejeitamos
  1: 'influencer', // Influencer preenche dados
  2: 'admin',      // Nós selecionamos produto e criamos cupom
  3: 'admin',      // Nós enviamos design
  4: 'influencer', // Influencer assina contrato
  5: 'admin',      // Nós adicionamos tracking
  6: 'influencer', // Influencer recebe e publica
  7: 'admin',      // Nós marcamos como completo
};

// Campos obrigatórios para avançar cada step
export const STEP_REQUIRED_FIELDS: Record<number, string[]> = {
  0: [],
  1: [],
  2: ['selectedProductUrl', 'couponCode'],
  3: [],
  4: [],
  5: ['trackingUrl'],
  6: [],
  7: [],
};

// Labels de ação para o botão em cada step
export const STEP_ACTION_LABELS: Record<number, string | null> = {
  0: null, // Especial: depende do status (ANALYZING vs COUNTER_PROPOSAL)
  1: null, // Influencer age
  2: 'Confirmar Produto',
  3: 'Enviar Prova',
  4: null, // Influencer age
  5: 'Adicionar Tracking',
  6: 'Completar',
  7: null, // Já está completo
};

// Descrição do que acontece em cada step
export const STEP_DESCRIPTIONS: Record<number, string> = {
  0: 'Analisar proposta do influencer',
  1: 'Influencer preenche dados de envio',
  2: 'Selecionar produto e criar cupom na Shopify',
  3: 'Enviar prova de design para aprovação',
  4: 'Aguardar assinatura do contrato',
  5: 'Preparar envio e adicionar tracking',
  6: 'Aguardar publicação do influencer',
  7: 'Parceria concluída',
};

// Helper para obter step a partir de status
export function getStepFromStatus(status: string): number {
  return STATUS_TO_STEP[status] ?? -1;
}

// Helper para obter status a partir de step
export function getStatusFromStep(step: number): string {
  return STEP_TO_STATUS[step] ?? 'UNKNOWN';
}

// Helper para verificar se admin pode agir neste step
export function canAdminAct(step: number): boolean {
  return STEP_ACTOR[step] === 'admin';
}

// Helper para verificar se influencer pode agir neste step
export function canInfluencerAct(step: number): boolean {
  return STEP_ACTOR[step] === 'influencer';
}

// Helper para obter campos em falta
export function getMissingFields(step: number, workflow: any): string[] {
  const required = STEP_REQUIRED_FIELDS[step] || [];
  return required.filter(field => {
    const value = workflow?.[field];
    return value === null || value === undefined || value === '';
  });
}

// Helper para verificar se pode avançar
export function canAdvance(step: number, workflow: any): { can: boolean; missing: string[] } {
  const missing = getMissingFields(step, workflow);
  return { can: missing.length === 0, missing };
}
