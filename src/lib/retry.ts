/**
 * Retry com Exponential Backoff
 * Tenta novamente se falhar, com delay crescente
 */

export async function retryWithExponentialBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  initialDelayMs: number = 1000,
  label: string = 'Operation'
): Promise<T> {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;

      if (attempt === maxRetries) {
        // Última tentativa falhou, lança o erro
        throw error;
      }

      // Calcular delay: 1s, 2s, 4s, 8s, etc (exponential backoff)
      const delay = initialDelayMs * Math.pow(2, attempt - 1);

      console.warn(
        `[RETRY] ${label} - Attempt ${attempt}/${maxRetries} failed. ` +
        `Retrying in ${delay}ms...`,
        { error: lastError.message }
      );

      // Esperar antes de tentar de novo
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  // Nunca deve chegar aqui, mas por segurança
  throw lastError || new Error('Unknown error in retry');
}

/**
 * Retry com jitter (aleatoriedade) para evitar thundering herd
 */
export async function retryWithJitter<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelayMs: number = 1000,
  label: string = 'Operation'
): Promise<T> {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;

      if (attempt === maxRetries) {
        throw error;
      }

      // Exponential backoff com jitter
      const exponentialDelay = baseDelayMs * Math.pow(2, attempt - 1);
      const jitter = Math.random() * exponentialDelay;
      const totalDelay = exponentialDelay + jitter;

      console.warn(
        `[RETRY-JITTER] ${label} - Attempt ${attempt}/${maxRetries} failed. ` +
        `Retrying in ${Math.round(totalDelay)}ms...`,
        { error: lastError.message }
      );

      await new Promise(resolve => setTimeout(resolve, totalDelay));
    }
  }

  throw lastError || new Error('Unknown error in retry');
}
