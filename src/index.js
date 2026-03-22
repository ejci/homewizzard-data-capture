/**
 * @fileoverview Application entry point.
 * Provides isolation between module definitions and actual process startup, which is a key Node.js best practice.
 * @module index
 */

const app = require('./app');
const logger = require('./utils/logger');

// Only start the app implicitly if we are the root execution script (E.g. "node src/index.js" rather than a require in tests).
if (require.main === module) {
    logger.info('Bootstrapping capture daemon...');
    
    // Begin data orchestration loops
    app.start();
}

// Optionally export for edge cases where another consumer might require index directly
module.exports = app;
