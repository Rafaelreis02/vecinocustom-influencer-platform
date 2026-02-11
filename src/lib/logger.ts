type LogLevel = 'info' | 'warn' | 'error' | 'debug';

class Logger {
  private log(level: LogLevel, message: string, data?: unknown) {
    const timestamp = new Date().toISOString();
    const prefix = `[${timestamp}] [${level.toUpperCase()}]`;
    
    if (level === 'error') {
      console.error(prefix, message, data || '');
    } else if (level === 'warn') {
      console.warn(prefix, message, data || '');
    } else if (process.env.NODE_ENV === 'development') {
      console.log(prefix, message, data || '');
    }
  }

  info(message: string, data?: unknown) {
    this.log('info', message, data);
  }

  warn(message: string, data?: unknown) {
    this.log('warn', message, data);
  }

  error(message: string, error?: unknown) {
    this.log('error', message, error);
  }

  debug(message: string, data?: unknown) {
    if (process.env.NODE_ENV === 'development') {
      this.log('debug', message, data);
    }
  }
}

export const logger = new Logger();
