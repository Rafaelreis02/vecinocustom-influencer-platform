/**
 * Email History Parser - Lê citações e separa mensagens
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
 * Extrai informação do header de citação
 * Ex: "Shannon Quinn escreveu (quarta, 18/02/2026 à(s) 16:01):"
 */
function parseCitationHeader(line: string): { name: string; date?: string } | null {
  // Padrão português: "Nome escreveu (dia, data à(s) hora):"
  const ptMatch = line.match(/(.+?)\s+(?:escreveu|wrote)\s*\((.+?)\):/i);
  if (ptMatch) {
    return { name: ptMatch[1].trim(), date: ptMatch[2].trim() };
  }
  
  // Padrão Gmail: "On Mon, Jan 1, 2024 at 10:00 AM, Name wrote:"
  const enMatch = line.match(/On\s+(.+?),\s*(.+?)\s+wrote:/i);
  if (enMatch) {
    return { name: enMatch[2].trim(), date: enMatch[1].trim() };
  }
  
  // Padrão Outlook: "From: Name <email>"
  const fromMatch = line.match(/From:\s*(.+?)(?:\s*<|$)/i);
  if (fromMatch) {
    return { name: fromMatch[1].trim() };
  }
  
  // Padrão "De: Nome"
  const deMatch = line.match(/De:\s*(.+?)(?:\s*<|$)/i);
  if (deMatch) {
    return { name: deMatch[1].trim() };
  }
  
  return null;
}

/**
 * Verifica se é linha de citação (começa com >)
 */
function isQuotedLine(line: string): boolean {
  return line.trim().startsWith('>');
}

/**
 * Verifica se é início de uma nova mensagem no histórico
 */
function isNewMessageStart(line: string): boolean {
  const trimmed = line.trim();
  
  // Citação explícita
  if (trimmed.startsWith('>')) return true;
  
  // Headers de citação
  if (/\w+\s+(?:escreveu|wrote)\s*\(/i.test(trimmed)) return true;
  if (/^On\s+\w+.+?wrote:/i.test(trimmed)) return true;
  if (/^From:\s*\S+/i.test(trimmed)) return true;
  if (/^De:\s*\S+/i.test(trimmed)) return true;
  
  return false;
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
  
  // A primeira mensagem (mais recente) é o conteúdo antes de qualquer citação
  let currentContent: string[] = [];
  let currentSender: string | undefined;
  let currentDate: string | undefined;
  let inQuote = false;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Verifica se é início de uma mensagem citada
    if (isNewMessageStart(line)) {
      // Guarda a mensagem atual
      if (currentContent.length > 0 && !inQuote) {
        const msgText = currentContent.join('\n').trim();
        if (msgText.length > 10) { // Ignora mensagens muito curtas (só headers)
          messages.push({
            id: `msg-${messages.length}`,
            content: msgText,
            isFromMe: messages.length === 0 ? isOriginalFromMe : !messages[messages.length - 1]?.isFromMe,
            senderName: currentSender,
            date: currentDate,
          });
        }
        currentContent = [];
      }
      
      // Analisa o header de citação
      const citation = parseCitationHeader(line);
      if (citation) {
        currentSender = citation.name;
        currentDate = citation.date;
      }
      
      inQuote = true;
      
      // Se é linha com >, remove o prefixo para o conteúdo
      if (line.trim().startsWith('>')) {
        const cleaned = line.replace(/^>\s?/, '');
        if (cleaned.trim()) {
          currentContent.push(cleaned);
        }
      }
      
      continue;
    }
    
    // Dentro de uma citação
    if (inQuote) {
      if (isQuotedLine(line)) {
        const cleaned = line.replace(/^>\s?/, '');
        currentContent.push(cleaned);
      } else if (line.trim() === '') {
        // Linha vazia dentro da citação
        currentContent.push('');
      } else {
        // Acabou a citação
        inQuote = false;
        
        // Guarda a mensagem anterior
        if (currentContent.length > 0) {
          const msgText = currentContent.join('\n').trim();
          if (msgText.length > 10) {
            messages.push({
              id: `msg-${messages.length}`,
              content: msgText,
              isFromMe: messages.length === 0 ? isOriginalFromMe : !messages[messages.length - 1]?.isFromMe,
              senderName: currentSender,
              date: currentDate,
            });
          }
          currentContent = [];
        }
        
        // Começa nova mensagem
        currentContent.push(line);
      }
    } else {
      // Fora de citação - conteúdo da mensagem atual
      currentContent.push(line);
    }
  }
  
  // Guarda última mensagem
  if (currentContent.length > 0) {
    const msgText = currentContent.join('\n').trim();
    if (msgText.length > 10) {
      messages.push({
        id: `msg-${messages.length}`,
        content: msgText,
        isFromMe: messages.length === 0 ? isOriginalFromMe : !messages[messages.length - 1]?.isFromMe,
        senderName: currentSender,
        date: currentDate,
      });
    }
  }
  
  console.log(`[parseEmailThread] Found ${messages.length} messages`);
  
  // Inverte a ordem para ficar: mais antigo em cima, mais recente em baixo
  // (estilo WhatsApp)
  return messages.reverse();
}
