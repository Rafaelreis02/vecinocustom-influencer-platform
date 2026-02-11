// Configuração de status de influenciadores - Sistema de 3 Fases

// ============================================
// DEFINIÇÃO DAS 3 FASES
// ============================================

export const PHASES = {
  PROSPECTING: {
    id: 'prospecting' as const,
    label: 'Prospeção',
    icon: undefined,
    href: '/dashboard/influencers/prospecting',
    statuses: ['UNKNOWN', 'SUGGESTION', 'IMPORT_PENDING'],
  },
  NEGOTIATING: {
    id: 'negotiating' as const,
    label: 'A Negociar',
    icon: undefined,
    href: '/dashboard/influencers/negotiating',
    statuses: ['ANALYZING', 'COUNTER_PROPOSAL'],
  },
  CLOSING: {
    id: 'closing' as const,
    label: 'Em Curso',
    icon: undefined,
    href: '/dashboard/influencers/closing',
    statuses: ['AGREED', 'PRODUCT_SELECTION', 'CONTRACT_PENDING', 'SHIPPED', 'COMPLETED'],
  },
} as const;

export type PhaseId = keyof typeof PHASES;

// ============================================
// CONFIGURAÇÃO DE CADA STATUS
// ============================================

export const INFLUENCER_STATUS_CONFIG = {
  // Fase 1: Prospeção
  UNKNOWN: {
    label: 'Desconhecido',
    color: 'bg-gray-100 text-gray-700 border-gray-300',
    dotColor: 'bg-gray-400',
    icon: undefined,
    phase: 'PROSPECTING' as PhaseId,
  },
  SUGGESTION: {
    label: 'Sugestão',
    color: 'bg-indigo-100 text-indigo-700 border-indigo-300',
    dotColor: 'bg-indigo-500',
    
    icon: undefined,
    phase: 'PROSPECTING' as PhaseId,
  },
  IMPORT_PENDING: {
    label: 'A Importar',
    color: 'bg-purple-100 text-purple-700 border-purple-300',
    dotColor: 'bg-purple-500',
    
    icon: undefined,
    phase: 'PROSPECTING' as PhaseId,
  },

  // Fase 2: A Negociar
  ANALYZING: {
    label: 'Em Análise',
    color: 'bg-blue-100 text-blue-700 border-blue-300',
    dotColor: 'bg-blue-500',
    
    icon: undefined,
    phase: 'NEGOTIATING' as PhaseId,
  },
  COUNTER_PROPOSAL: {
    label: 'Contraproposta',
    color: 'bg-cyan-100 text-cyan-700 border-cyan-300',
    dotColor: 'bg-cyan-500',
    
    icon: undefined,
    phase: 'NEGOTIATING' as PhaseId,
  },

  // Fase 3: Em Curso
  AGREED: {
    label: 'Acordado',
    color: 'bg-emerald-100 text-emerald-700 border-emerald-300',
    dotColor: 'bg-emerald-500',
    
    icon: undefined,
    phase: 'CLOSING' as PhaseId,
  },
  PRODUCT_SELECTION: {
    label: 'Seleção Produto',
    color: 'bg-amber-100 text-amber-700 border-amber-300',
    dotColor: 'bg-amber-500',
    
    icon: undefined,
    phase: 'CLOSING' as PhaseId,
  },
  CONTRACT_PENDING: {
    label: 'Contrato Pendente',
    color: 'bg-yellow-100 text-yellow-700 border-yellow-300',
    dotColor: 'bg-yellow-500',
    
    icon: undefined,
    phase: 'CLOSING' as PhaseId,
  },
  SHIPPED: {
    label: 'Enviado',
    color: 'bg-orange-100 text-orange-700 border-orange-300',
    dotColor: 'bg-orange-500',
    
    icon: undefined,
    phase: 'CLOSING' as PhaseId,
  },
  COMPLETED: {
    label: 'Concluído',
    color: 'bg-green-100 text-green-700 border-green-300',
    dotColor: 'bg-green-500',
    
    icon: undefined,
    phase: 'CLOSING' as PhaseId,
  },

  // Especiais (sem fase)
  CANCELLED: {
    label: 'Cancelado',
    color: 'bg-red-100 text-red-700 border-red-300',
    dotColor: 'bg-red-500',
    
    icon: undefined,
    phase: null,
  },
  BLACKLISTED: {
    label: 'Bloqueado',
    color: 'bg-black text-white border-black',
    dotColor: 'bg-black',
    
    icon: undefined,
    phase: null,
  },
} as const;

export type InfluencerStatus = keyof typeof INFLUENCER_STATUS_CONFIG;

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Obtém a configuração de um status específico
 */
export function getStatusConfig(status: string | null | undefined) {
  if (!status) return INFLUENCER_STATUS_CONFIG.UNKNOWN;
  return INFLUENCER_STATUS_CONFIG[status as InfluencerStatus] || INFLUENCER_STATUS_CONFIG.UNKNOWN;
}

/**
 * Obtém a fase de um status específico
 */
export function getPhaseForStatus(status: string): PhaseId | null {
  const config = getStatusConfig(status);
  return config.phase;
}

/**
 * Obtém todos os statuses de uma fase específica
 */
export function getStatusesForPhase(phaseId: string): readonly string[] {
  const phase = PHASES[phaseId.toUpperCase() as PhaseId];
  return phase ? phase.statuses : [];
}

/**
 * Obtém todos os statuses do workflow (excluindo especiais)
 */
export function getWorkflowStatuses(): InfluencerStatus[] {
  return Object.keys(INFLUENCER_STATUS_CONFIG).filter(
    status => INFLUENCER_STATUS_CONFIG[status as InfluencerStatus].phase !== null
  ) as InfluencerStatus[];
}

/**
 * Obtém os statuses especiais (sem fase)
 */
export function getSpecialStatuses(): InfluencerStatus[] {
  return Object.keys(INFLUENCER_STATUS_CONFIG).filter(
    status => INFLUENCER_STATUS_CONFIG[status as InfluencerStatus].phase === null
  ) as InfluencerStatus[];
}
