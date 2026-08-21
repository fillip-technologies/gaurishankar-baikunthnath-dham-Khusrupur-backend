import pino from 'pino'
import { envConfig } from '../configs/env.config.js'

const isDev = envConfig.NODE_ENV === 'development' || !envConfig.NODE_ENV
const isTest = envConfig.NODE_ENV === 'test'

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

const defaultLevel = isTest ? 'silent' : 'info'

const logger = pino({
  level: envConfig.LOG_LEVEL || defaultLevel,
  // Never write secrets/credentials to logs, wherever they appear in a payload.
  redact: {
    paths: [
      'req.headers.authorization',
      'req.headers.cookie',
      'req.body.password',
      'req.body.current_password',
      'req.body.newpassword',
      '*.password',
      '*.current_password',
      '*.newpassword',
      '*.accessToken',
      '*.refreshToken',
      '*.key_secret',
      '*.api_secret',
      '*.authorization',
      '*.cookie',
    ],
    censor: '[REDACTED]',
  },
  ...(transport && { transport }),
})

export default logger