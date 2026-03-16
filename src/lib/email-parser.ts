/**
 * Email History Parser
 * 
 * Analisa o conteúdo de emails e separa o histórico embutido
 * em mensagens individuais (estilo WhatsApp)
 */

interface ParsedMessage {
  id: string;
  content: string;
  isFromMe: boolean;
  timestamp?: string;
  senderName?: string;
}

/**
 * Padrões comuns de citação em emails
 */
const QUOTE_PATTERNS = [
  // Gmail/Inbox style
  /On\s+(.+?)\s+at\s+(.+?),\s*(.+?)\s+wrote:/i,
  // Outlook style
  /From:\s*(.+?)\s*Sent:\s*(.+?)\s*To:/i,
  // Apple Mail style
  /Begin\s+forwarded\s+message:/i,
  // Generic quoted text
  /^>\s+/m,
  // Separator lines
  /^-{3,}\s*$/m,
  /^_{3,}\s*$/m,
  // Date pattern: "Em 15/03/2024 10:30, Nome escreveu:"
  /Em\s+\d{2}\/\d{2}\/\d{4}\s+\d{2}:\d{2},?\s*(.+?)\s*(escreveu|wrote):/i,
  // "De: Nome <email> Enviado: data"
  /De:\s*(.+?)\s*Enviado:/i,
];

/**
 * Verifica se uma linha é o início de uma citação/histórico
 */
function isQuoteStart(line: string): boolean {
  const trimmed = line.trim();
  
  // Linha começa com >
  if (trimmed.startsWith('>')) return true;
  
  // Padrões de citação
  if (/^On\s+.+wrote:/i.test(trimmed)) return true;
  if (/^From:\s*/i.test(trimmed)) return true;
  if (/^De:\s*/i.test(trimmed)) return true;
  if (/^Sent:\s*/i.test(trimmed)) return true;
  if (/^Para:\s*/i.test(trimmed)) return true;
  if (/^To:\s*/i.test(trimmed)) return true;
  if (/^Subject:\s*/i.test(trimmed)) return true;
  if (/^Assunto:\s*/i.test(trimmed)) return true;
  if (/Begin forwarded message/i.test(trimmed)) return true;
  if (/^-{3,}$/.test(trimmed)) return true;
  if (/^_{3,}$/.test(trimmed)) return true;
  if (/^\|{3,}$/.test(trimmed)) return true;
  
  return false;
}

/**
 * Extrai o nome do remetente de uma linha de citação
 */
function extractSenderName(line: string): string | undefined {
  // "On Mar 15, 2024 at 10:30 AM, John Doe wrote:"
  const match1 = line.match(/On\s+.+?,\s*(.+?)\s+wrote:/i);
  if (match1) return match1[1].trim();
  
  // "From: John Doe <email>"
  const match2 = line.match(/From:\s*(.+?)(?:\s*<|$)/i);
  if (match2) return match2[1].trim();
  
  // "De: John Doe <email>"
  const match3 = line.match(/De:\s*(.+?)(?:\s*<|$)/i);
  if (match3) return match3[1].trim();
  
  // "Em 15/03/2024 10:30, John Doe escreveu:"
  const match4 = line.match(/Em\s+\d{2}\/\d{2}\/\d{4}\s+\d{2}:\d{2},?\s*(.+?)(?:\s*(?:escreveu|wrote)):/i);
  if (match4) return match4[1].trim();
  
  return undefined;
}

/**
 * Remove tags HTML e converte para texto
 */
function htmlToText(html: string): string {
  // Remove script e style
  let text = html.replace(/<script[^>]*>.*?<\/script>/gi, '');
  text = text.replace(/<style[^>]*>.*?<\/style>/gi, '');
  
  // Converte <br>, <p> para novas linhas
  text = text.replace(/<br\s*\/?>/gi, '\n');
  text = text.replace(/<\/p>/gi, '\n\n');
  text = text.replace(/<p[^>]*>/gi, '');
  
  // Remove restantes tags
  text = text.replace(/<[^>]+>/g, '');
  
  // Decodifica entidades HTML
  text = text.replace(/&nbsp;/g, ' ');
  text = text.replace(/&amp;/g, '&');
  text = text.replace(/&lt;/g, '<');
  text = text.replace(/&gt;/g, '>');
  text = text.replace(/&quot;/g, '"');
  
  // Normaliza espaços em branco
  text = text.replace(/\n{3,}/g, '\n\n');
  text = text.trim();
  
  return text;
}

/**
 * Separa o conteúdo de um email em múltiplas mensagens
 */
export function parseEmailThread(
  content: string,
  isHtml: boolean,
  originalSender: string,
  isOriginalFromMe: boolean
): ParsedMessage[] {
  const messages: ParsedMessage[] = [];
  
  // Converte HTML para texto se necessário
  const text = isHtml ? htmlToText(content) : content;
  
  // Divide o texto em linhas
  const lines = text.split('\n');
  
  const currentMessage: string[] = [];
  let currentSender: string | undefined;
  let foundQuote = false;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Verifica se é início de citação
    if (isQuoteStart(line)) {
      // Guarda a mensagem atual antes de começar a citação
      if (currentMessage.length > 0) {
        const content = currentMessage.join('\n').trim();
        if (content) {
          messages.push({
            id: `msg-${messages.length}`,
            content: content,
            isFromMe: messages.length === 0 ? isOriginalFromMe : !isOriginalFromMe,
            senderName: currentSender,
          });
        }
        currentMessage.length = 0;
      }
      
      // Extrai nome do remetente da citação
      currentSender = extractSenderName(line);
      foundQuote = true;
      
      // Continua para a próxima linha
      continue;
    }
    
    // Se estamos numa citação (linhas começam com >)
    if (foundQuote && line.trim().startsWith('>')) {
      // Remove o > do início
      const cleanLine = line.replace(/^>\s?/, '');
      currentMessage.push(cleanLine);
    } else if (!foundQuote) {
      // Mensagem original (ainda não encontrámos citação)
      currentMessage.push(line);
    }
  }
  
  // Guarda a última mensagem
  if (currentMessage.length > 0) {
    const content = currentMessage.join('\n').trim();
    if (content) {
      messages.push({
        id: `msg-${messages.length}`,
        content: content,
        isFromMe: messages.length === 0 ? isOriginalFromMe : !isOriginalFromMe,
        senderName: currentSender,
      });
    }
  }
  
  // Inverte a ordem para ficar cronológico (mais antigo primeiro)
  // porque o histórico no email vem do mais recente para o mais antigo
  return messages.reverse();
}

/**
 * Versão simplificada para emails com histórico simples
 * Usa delimitadores comuns
 */
export function parseSimpleThread(
  content: string,
  isHtml: boolean,
  isFromMe: boolean
): ParsedMessage[] {
  const text = isHtml ? htmlToText(content) : content;
  
  // Procura por delimitadores comuns
  const delimiters = [
    /\n-{3,}\n/,                    // Linhas de hífens
    /\n_{3,}\n/,                    // Linhas de underscores
    /On\s+\w+\s+\d+,?\s+\d{4}/i,    // "On Mar 15, 2024"
    /From:\s*\S+@\S+/i,             // "From: email@domain"
    /De:\s*\S+@\S+/i,               // "De: email@domain"
  ];
  
  let splitIndex = -1;
  
  for (const delimiter of delimiters) {
    const match = text.search(delimiter);
    if (match !== -1) {
      splitIndex = match;
      break;
    }
  }
  
  if (splitIndex === -1) {
    // Não encontrou delimitador, retorna como mensagem única
    return [{
      id: 'msg-0',
      content: text.trim(),
      isFromMe: isFromMe,
    }];
  }
  
  // Separa em duas partes
  const currentMessage = text.substring(0, splitIndex).trim();
  const history = text.substring(splitIndex).trim();
  
  const messages: ParsedMessage[] = [];
  
  if (currentMessage) {
    messages.push({
      id: 'msg-0',
      content: currentMessage,
      isFromMe: isFromMe,
    });
  }
  
  if (history) {
    messages.push({
      id: 'msg-1',
      content: history,
      isFromMe: !isFromMe,
    });
  }
  
  return messages;
}
