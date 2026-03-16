/**
 * Email History Parser - Separa emails em mensagens individuais
 */

export interface ParsedMessage {
  id: string;
  content: string;
  isFromMe: boolean;
  senderName?: string;
  date?: string;
}

/**
 * Remove HTML e converte para texto
 */
function stripHtml(html: string): string {
  let text = html.replace(/<script[^>]*>.*?<\/script>/gi, '');
  text = text.replace(/<style[^>]*>.*?<\/style>/gi, '');
  text = text.replace(/<br\s*\/?>/gi, '\n');
  text = text.replace(/<\/p>/gi, '\n\n');
  text = text.replace(/<\/div>/gi, '\n');
  text = text.replace(/<[^>]+>/g, '');
  
  const entities: Record<string, string> = {
    '&nbsp;': ' ', '&amp;': '&', '&lt;': '<', '&gt;': '>',
    '&quot;': '"', '&#39;': "'", '&ldquo;': '"', '&rdquo;': '"',
  };
  
  for (const [entity, char] of Object.entries(entities)) {
    text = text.replace(new RegExp(entity, 'g'), char);
  }
  
  return text.trim();
}

/**
 * Verifica se é header de citação (início de mensagem anterior)
 */
function isCitationHeader(line: string): { isMatch: boolean; name?: string; date?: string } {
  const trimmed = line.trim();
  
  // Padrão português: "Shannon Quinn escreveu (segunda, 23/02/2026 à(s) 11:27):"
  const ptMatch = trimmed.match(/(.+?)\s+(?:escreveu|wrote)\s*\((.+?)\)\s*:/i);
  if (ptMatch) {
    return { isMatch: true, name: ptMatch[1].trim(), date: ptMatch[2].trim() };
  }
  
  // Padrão Gmail: "On Mon, Jan 1, 2024 at 10:00 AM, John Doe wrote:"
  const enMatch = trimmed.match(/On\s+(.+?),\s*(.+?)\s+wrote:\s*$/i);
  if (enMatch) {
    return { isMatch: true, name: enMatch[2].trim(), date: enMatch[1].trim() };
  }
  
  // Padrão Outlook: "From: Name <email>"
  const fromMatch = trimmed.match(/^From:\s*(.+?)(?:\s*<|$)/i);
  if (fromMatch) {
    return { isMatch: true, name: fromMatch[1].trim() };
  }
  
  // Padrão "De: Nome <email>"
  const deMatch = trimmed.match(/^De:\s*(.+?)(?:\s*<|$)/i);
  if (deMatch) {
    return { isMatch: true, name: deMatch[1].trim() };
  }
  
  return { isMatch: false };
}

/**
 * Verifica se é linha de citação (começa com >)
 */
function isQuotedLine(line: string): boolean {
  return line.trim().startsWith('>');
}

/**
 * Limpa linha de citação (remove > do início)
 */
function cleanQuotedLine(line: string): string {
  return line.replace(/^>\s?/, '');
}

/**
 * Parser principal
 */
export function parseEmailThread(
  content: string,
  isHtml: boolean,
  originalFrom: string,
  isOriginalFromMe: boolean
): ParsedMessage[] {
  console.log('[parseEmailThread] Starting...', { isHtml, isOriginalFromMe });
  
  const text = isHtml ? stripHtml(content) : content;
  
  if (!text || text.trim().length === 0) {
    return [];
  }
  
  const lines = text.split('\n');
  const messages: ParsedMessage[] = [];
  
  let currentContent: string[] = [];
  let currentSender: string | undefined;
  let currentDate: string | undefined;
  let isFirstMessage = true;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    
    // Ignora linhas vazias no início
    if (isFirstMessage && trimmed === '' && currentContent.length === 0) {
      continue;
    }
    
    // Verifica se é header de citação (início de mensagem anterior)
    const citation = isCitationHeader(line);
    if (citation.isMatch) {
      // Guarda a mensagem atual antes de começar a anterior
      if (currentContent.length > 0) {
        const msgText = currentContent.join('\n').trim();
        if (msgText.length > 5) {
          messages.push({
            id: `msg-${messages.length}`,
            content: msgText,
            isFromMe: isFirstMessage ? isOriginalFromMe : !messages[messages.length - 1]?.isFromMe,
            senderName: currentSender,
            date: currentDate,
          });
          console.log(`[parseEmailThread] Saved message ${messages.length}: "${msgText.substring(0, 50)}..."`);
        }
        currentContent = [];
        isFirstMessage = false;
      }
      
      // Guarda info do remetente da mensagem anterior
      currentSender = citation.name;
      currentDate = citation.date;
      
      // NÃO adiciona o header ao conteúdo
      continue;
    }
    
    // Se é linha de citação (>), limpa e adiciona
    if (isQuotedLine(line)) {
      const cleaned = cleanQuotedLine(line);
      // Só adiciona se não for linha vazia ou header
      if (cleaned.trim().length > 0) {
        currentContent.push(cleaned);
      }
    } else {
      // Linha normal - adiciona ao conteúdo atual
      currentContent.push(line);
    }
  }
  
  // Guarda última mensagem
  if (currentContent.length > 0) {
    const msgText = currentContent.join('\n').trim();
    if (msgText.length > 5) {
      messages.push({
        id: `msg-${messages.length}`,
        content: msgText,
        isFromMe: isFirstMessage ? isOriginalFromMe : !messages[messages.length - 1]?.isFromMe,
        senderName: currentSender,
        date: currentDate,
      });
      console.log(`[parseEmailThread] Saved final message ${messages.length}`);
    }
  }
  
  console.log(`[parseEmailThread] Total: ${messages.length} messages`);
  
  // Inverte para ficar: antigo em cima, novo em baixo (WhatsApp style)
  return messages.reverse();
}
