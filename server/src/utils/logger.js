import pino from 'pino'
import { envConfig } from '../configs/env.config.js'

const isDev = envConfig.NODE_ENV !== 'production'

const transport = isDev
  ? {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'SYS:yyyy-mm-dd HH:MM:ss',
        ignore: 'pid,hostname',
      },
    }
  : undefined // production: fast, structured JSON (no pretty-print overhead)

const logger = pino({
  level: envConfig.LOG_LEVEL || 'info',
  ...(transport && { transport }),
})

export default logger