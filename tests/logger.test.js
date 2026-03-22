const logger = require('../src/utils/logger');

describe('logger.js', () => {
    it('should be a pino logger instance', () => {
        expect(logger).toHaveProperty('info');
        expect(logger).toHaveProperty('error');
        expect(logger).toHaveProperty('warn');
        expect(logger).toHaveProperty('debug');
    });
});
