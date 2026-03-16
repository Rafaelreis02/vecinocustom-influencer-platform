/**
 * Email History Parser - Versão Simples e Robusta
 * 
 * Separa o histórico de emails em mensagens individuais
 */

export interface ParsedMessage {
  id: string;
  content: string;
  isFromMe: boolean;
  senderName?: string;
}

/**
 * Remove HTML tags e converte para texto
 */
function stripHtml(html: string): string {
  // Remove script e style
  let text = html.replace(/<script[^>]*>.*?<\/script>/gi, '');
  text = text.replace(/<style[^>]*>.*?<\/style>/gi, '');
  
  // Converte tags comuns para texto
  text = text.replace(/<br\s*\/?>/gi, '\n');
  text = text.replace(/<\/p>/gi, '\n\n');
  text = text.replace(/<\/div>/gi, '\n');
  text = text.replace(/<p[^>]*>/gi, '');
  text = text.replace(/<div[^>]*>/gi, '');
  text = text.replace(/<blockquote[^>]*>/gi, '\n---CITACAO---\n');
  text = text.replace(/<\/blockquote>/gi, '\n---FIM_CITACAO---\n');
  
  // Remove restantes tags
  text = text.replace(/<[^>]+>/g, '');
  
  // Decodifica entidades HTML
  const entities: Record<string, string> = {
    '&nbsp;': ' ', '&amp;': '&', '&lt;': '<', '&gt;': '>',
    '&quot;': '"', '&#39;': "'", '&ldquo;': '"', '&rdquo;': '"',
    '&lsquo;': "'", '&rsquo;': "'", '&hellip;': '...',
    '&ndash;': '-', '&mdash;': '-', '&bull;': '•',
  };
  
  for (const [entity, char] of Object.entries(entities)) {
    text = text.replace(new RegExp(entity, 'g'), char);
  }
  
  // Normaliza espaços em branco
  text = text.replace(/\n{3,}/g, '\n\n');
  
  return text.trim();
}

/**
 * Extrai o nome do remetente de uma linha de citação
 */
function extractSender(line: string): string | undefined {
  // "On Mar 15, 2024 at 10:30 AM, John Doe wrote:"
  const match1 = line.match(/On\s+.+?\s+at\s+.+?,\s*(.+?)\s+wrote:/i);
  if (match1) return match1[1].trim();
  
  // "From: John Doe <email>"
  const match2 = line.match(/From:\s*(.+?)(?:\s*<|\s*$)/i);
  if (match2) return match2[1].trim();
  
  // "De: John Doe"
  const match3 = line.match(/De:\s*(.+?)(?:\s*<|\s*$)/i);
  if (match3) return match3[1].trim();
  
  // "Em 15/03/2024 10:30, John Doe escreveu:"
  const match4 = line.match(/Em\s+\d{2}[\/\-]\d{2}[\/\-]\d{4}.+?,\s*(.+?)(?:\s+(?:escreveu|wrote)):/i);
  if (match4) return match4[1].trim();
  
  return undefined;
}

/**
 * Verifica se é linha de citação (começa com >)
 */
function isQuotedLine(line: string): boolean {
  return line.trim().startsWith('>');
}

/**
 * Verifica se é início de uma citação no estilo "On ... wrote:"
 */
function isCitationStart(line: string): boolean {
  const trimmed = line.trim();
  
  // Gmail/Outlook/Apple padrões
  if (/^On\s+\w+.+?wrote:/i.test(trimmed)) return true;
  if (/^From:\s*\S+@/i.test(trimmed)) return true;
  if (/^De:\s*\S+/i.test(trimmed)) return true;
  if (/^Sent:\s*\w+/i.test(trimmed)) return true;
  if (/^Enviado:\s*\w+/i.test(trimmed)) return true;
  if (/Begin forwarded message/i.test(trimmed)) return true;
  if (/^_{3,}$/.test(trimmed)) return true;
  if (/^-{3,}$/.test(trimmed)) return true;
  if (trimmed.startsWith('>')) return true;
  
  return false;
}

/**
 * Parser principal - separa email em mensagens individuais
 */
export function parseEmailThread(
  content: string,
  isHtml: boolean,
  originalFrom: string,
  isOriginalFromMe: boolean
): ParsedMessage[] {
  console.log('[parseEmailThread] Starting...', { isHtml, isOriginalFromMe, contentLength: content?.length });
  
  // Converte HTML para texto
  const text = isHtml ? stripHtml(content) : content;
  
  if (!text || text.trim().length === 0) {
    console.log('[parseEmailThread] Empty content');
    return [];
  }
  
  const lines = text.split('\n');
  const messages: ParsedMessage[] = [];
  
  let currentContent: string[] = [];
  let currentSender: string | undefined;
  let inQuote = false;
  let messageIndex = 0;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    
    // Verifica se é início de citação
    if (isCitationStart(line)) {
      // Guarda mensagem atual antes da citação
      if (currentContent.length > 0) {
        const msgText = currentContent.join('\n').trim();
        if (msgText.length > 0) {
          messages.push({
            id: `msg-${messageIndex++}`,
            content: msgText,
            isFromMe: messageIndex === 1 ? isOriginalFromMe : !isOriginalFromMe,
            senderName: currentSender,
          });
          console.log(`[parseEmailThread] Found message ${messageIndex}, length: ${msgText.length}`);
        }
        currentContent = [];
      }
      
      // Extrai nome do remetente
      currentSender = extractSender(line) || currentSender;
      inQuote = true;
      
      // Se é linha com >, remove o prefixo
      if (trimmed.startsWith('>')) {
        const cleaned = trimmed.replace(/^>\s?/, '');
        if (cleaned) currentContent.push(cleaned);
      }
      
      continue;
    }
    
    // Se estamos dentro de uma citação
    if (inQuote) {
      if (isQuotedLine(line)) {
        // Remove o > do início
        const cleaned = line.replace(/^>\s?/, '');
        currentContent.push(cleaned);
      } else if (trimmed === '' || trimmed === '---CITACAO---' || trimmed === '---FIM_CITACAO---') {
        // Linha vazia ou marcador de citação - continua
        currentContent.push('');
      } else {
        // Acabou a citação, volta ao modo normal
        inQuote = false;
        currentContent.push(line);
      }
    } else {
      // Modo normal - mensagem atual
      currentContent.push(line);
    }
  }
  
  // Guarda última mensagem
  if (currentContent.length > 0) {
    const msgText = currentContent.join('\n').trim();
    if (msgText.length > 0) {
      messages.push({
        id: `msg-${messageIndex++}`,
        content: msgText,
        isFromMe: messageIndex === 1 ? isOriginalFromMe : !isOriginalFromMe,
        senderName: currentSender,
      });
      console.log(`[parseEmailThread] Found final message ${messageIndex}, length: ${msgText.length}`);
    }
  }
  
  // Se só encontrou uma mensagem e tem citação no meio, tenta separar de outra forma
  if (messages.length === 1 && messages[0].content.includes('>')) {
    console.log('[parseEmailThread] Trying alternative parsing...');
    const alternative = parseAlternative(text, isOriginalFromMe);
    if (alternative.length > 1) {
      return alternative;
    }
  }
  
  console.log(`[parseEmailThread] Found ${messages.length} messages total`);
  return messages;
}

/**
 * Parser alternativo - quando o primeiro falha
 * Procura por delimitadores mais óbvios
 */
function parseAlternative(text: string, isOriginalFromMe: boolean): ParsedMessage[] {
  const messages: ParsedMessage[] = [];
  
  // Procura por "On ... wrote:" ou equivalente
  const patterns = [
    /\n(On\s+\w+.+?wrote:)/i,
    /\n(From:\s*\S+@)/i,
    /\n(De:\s*\S+)/i,
    /\n(Enviado el:\s*\d)/i,
    /\n(Sent:\s*\w+)/i,
  ];
  
  let splitIndex = -1;
  let separator = '';
  
  for (const pattern of patterns) {
    const match = text.search(pattern);
    if (match !== -1) {
      splitIndex = match;
      separator = text.substring(match, match + 50);
      console.log(`[parseAlternative] Found separator at ${match}: "${separator.substring(0, 30)}..."`);
      break;
    }
  }
  
  if (splitIndex === -1) {
    return messages;
  }
  
  // Mensagem atual (antes do separador)
  const currentMsg = text.substring(0, splitIndex).trim();
  if (currentMsg) {
    messages.push({
      id: 'msg-0',
      content: currentMsg,
      isFromMe: isOriginalFromMe,
    });
  }
  
  // Histórico (depois do separador)
  const history = text.substring(splitIndex).trim();
  if (history) {
    // Limpa o histórico (remove > do início das linhas)
    const cleanedHistory = history
      .split('\n')
      .map(line => line.replace(/^>\s?/, ''))
      .join('\n')
      .trim();
    
    if (cleanedHistory) {
      messages.push({
        id: 'msg-1',
        content: cleanedHistory,
        isFromMe: !isOriginalFromMe,
      });
    }
  }
  
  return messages;
}
