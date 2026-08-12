import pino from 'pino'
import { envConfig } from '../configs/env.config.js'

const logger = pino({
    level : envConfig.LOG_LEVEL || 'info'
})

export default logger;