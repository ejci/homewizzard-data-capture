/**
 * @fileoverview Configures and exports a shared Pino logger instance.
 * Using Pino provides fast, structured, newline-delimited JSON logging.
 * @module utils/logger
 */

const pino = require('pino');

/**
 * Shared application logger instance.
 * The log level can be controlled via the `HOMEWIZZARD_LOG_LEVEL` environment variable.
 * Default level is 'info'.
 * 
 * @type {import('pino').Logger}
 */
const logger = pino({
    level: process.env.HOMEWIZZARD_LOG_LEVEL || 'info',
    base: {
        service: 'homewizzard-data-capture'
    },
    timestamp: pino.stdTimeFunctions.isoTime
});

module.exports = logger;
