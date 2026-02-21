const pino = require('pino');

const logger = pino({
    level: process.env.HOMEWIZZARD_LOG_LEVEL || 'info',
    base: {
        service: 'homewizzard-data-capture'
    },
    timestamp: pino.stdTimeFunctions.isoTime
});

module.exports = logger;
