import {LogContext, LogLevel} from '@/types/common'
import {join} from 'path'
import pino from 'pino'

const pinoLogger = pino({
  level: 'debug',
  timestamp: pino.stdTimeFunctions.isoTime,
  transport: {
    targets: [
      {
        target: 'pino-pretty',
        level: 'debug',
        options: {
          colorize: true,
          translateTime: 'SYS:standard',
          ignore: 'pid,hostname',
        },
      },
      {
        target: 'pino/file',
        level: 'debug',
        options: {
          destination: join(process.cwd(), 'logs', 'app.log'),
          mkdir: true,
        },
      },
    ],
  },
})

class Logger {
  private currentLevel: LogLevel = LogLevel.INFO

  setLevel(level: LogLevel): void {
    this.currentLevel = level
    pinoLogger.level = level
  }

  private shouldLog(level: LogLevel): boolean {
    const levels = [LogLevel.DEBUG, LogLevel.INFO, LogLevel.WARN, LogLevel.ERROR]
    return levels.indexOf(level) >= levels.indexOf(this.currentLevel)
  }

  debug(message: string, context?: LogContext): void {
    if (this.shouldLog(LogLevel.DEBUG)) {
      pinoLogger.debug(context || {}, message)
    }
  }

  info(message: string, context?: LogContext): void {
    if (this.shouldLog(LogLevel.INFO)) {
      pinoLogger.info(context || {}, message)
    }
  }

  warn(message: string, context?: LogContext): void {
    if (this.shouldLog(LogLevel.WARN)) {
      pinoLogger.warn(context || {}, message)
    }
  }

  error(message: string, context?: LogContext): void {
    if (this.shouldLog(LogLevel.ERROR)) {
      pinoLogger.error(context || {}, message)
    }
  }
}

export const logger = new Logger()
export default logger
