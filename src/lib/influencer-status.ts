// Configuração de status de influenciadores

export const INFLUENCER_STATUS_CONFIG = {
  NEW: {
    label: 'Novo',
    color: 'bg-gray-100 text-gray-700 border-gray-300',
    dotColor: 'bg-gray-500',
    icon: '🔵',
  },
  NEGOTIATING: {
    label: 'Em negociação',
    color: 'bg-blue-100 text-blue-700 border-blue-300',
    dotColor: 'bg-blue-500',
    icon: '💬',
  },
  AWAITING_PRODUCT: {
    label: 'À espera do produto',
    color: 'bg-yellow-100 text-yellow-700 border-yellow-300',
    dotColor: 'bg-yellow-500',
    icon: '⏳',
  },
  PRODUCT_SENT: {
    label: 'Produto enviado',
    color: 'bg-orange-100 text-orange-700 border-orange-300',
    dotColor: 'bg-orange-500',
    icon: '📦',
  },
  COMPLETED: {
    label: 'Concluído',
    color: 'bg-green-100 text-green-700 border-green-300',
    dotColor: 'bg-green-500',
    icon: '✅',
  },
  CANCELLED: {
    label: 'Cancelado',
    color: 'bg-red-100 text-red-700 border-red-300',
    dotColor: 'bg-red-500',
    icon: '❌',
  },
  IMPORT_PENDING: {
    label: 'A importar...',
    color: 'bg-purple-100 text-purple-700 border-purple-300',
    dotColor: 'bg-purple-500',
    icon: '⏳',
  },
  BLACKLISTED: {
    label: 'Bloqueado',
    color: 'bg-black text-white border-black',
    dotColor: 'bg-black',
    icon: '🚫',
  },
  // DEPRECATED
  ACTIVE: {
    label: 'Ativo (legacy)',
    color: 'bg-gray-100 text-gray-600 border-gray-300',
    dotColor: 'bg-gray-400',
    icon: '⚪',
  },
  INACTIVE: {
    label: 'Inativo (legacy)',
    color: 'bg-gray-100 text-gray-600 border-gray-300',
    dotColor: 'bg-gray-400',
    icon: '⚪',
  },
  PENDING: {
    label: 'Pendente (legacy)',
    color: 'bg-gray-100 text-gray-600 border-gray-300',
    dotColor: 'bg-gray-400',
    icon: '⚪',
  },
  working: {
    label: 'A trabalhar (legacy)',
    color: 'bg-gray-100 text-gray-600 border-gray-300',
    dotColor: 'bg-gray-400',
    icon: '⚪',
  },
  negotiating: {
    label: 'Negociação (legacy)',
    color: 'bg-gray-100 text-gray-600 border-gray-300',
    dotColor: 'bg-gray-400',
    icon: '⚪',
  },
  suggestion: {
    label: 'Sugestão (legacy)',
    color: 'bg-gray-100 text-gray-600 border-gray-300',
    dotColor: 'bg-gray-400',
    icon: '⚪',
  },
} as const;

export type InfluencerStatus = keyof typeof INFLUENCER_STATUS_CONFIG;

// Estados principais do workflow (excluindo deprecated e técnicos)
export const WORKFLOW_STATUSES: InfluencerStatus[] = [
  'NEW',
  'NEGOTIATING',
  'AWAITING_PRODUCT',
  'PRODUCT_SENT',
  'COMPLETED',
  'CANCELLED',
];

export function getStatusConfig(status: string | null | undefined) {
  if (!status) return INFLUENCER_STATUS_CONFIG.NEW;
  return INFLUENCER_STATUS_CONFIG[status as InfluencerStatus] || INFLUENCER_STATUS_CONFIG.NEW;
}
