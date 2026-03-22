/**
 * @fileoverview Configuration loader and validator.
 * Extracts environment variables, validates required fields, and exports
 * a strongly-typed configuration object used throughout the application.
 * @module config/index
 */

const logger = require('../utils/logger');

const requiredEnvsCommon = ['HOMEWIZZARD_DEVICES'];
const requiredEnvsInflux = ['INFLUX_URL', 'INFLUX_TOKEN', 'INFLUX_ORG', 'INFLUX_BUCKET'];

/**
 * Validates the presence of required environment variables.
 * If critical variables are missing, the process will log an error and exit with code 1.
 * @throws {Error} Exits process horizontally if validation fails
 */
function validateConfig() {
    const missingCommon = requiredEnvsCommon.filter(key => !process.env[key]);
    if (missingCommon.length > 0) {
        logger.error({ missingVars: missingCommon }, 'Missing required environment variables');
        process.exit(1);
    }

    const hasInflux = requiredEnvsInflux.every(key => process.env[key]);
    const hasDataPath = !!process.env.HOMEWIZZARD_DATA_PATH;

    if (!hasInflux && !hasDataPath) {
        logger.error(
            { requiredInfluxVars: requiredEnvsInflux, dataPathVar: 'HOMEWIZZARD_DATA_PATH' },
            'Storage backend not configured. Provide InfluxDB variables or HOMEWIZZARD_DATA_PATH.'
        );
        process.exit(1);
    }
}

// Perform validation immediately upon module load
validateConfig();

/**
 * Validated application configuration object.
 * 
 * @typedef {Object} AppConfig
 * @property {string[]} devices - Array of Homewizzard device IP addresses or hostnames.
 * @property {number} pollInterval - Milliseconds between polling cycles (default: 5000).
 * @property {string|undefined} dataPath - Directory path for local file storage, if configured.
 * @property {Object} influx - InfluxDB connection properties.
 * @property {string|undefined} influx.url - InfluxDB server URL.
 * @property {string|undefined} influx.token - InfluxDB auth token.
 * @property {string|undefined} influx.org - InfluxDB organization.
 * @property {string|undefined} influx.bucket - Default bucket for measurements.
 * @property {string|undefined} influx.errorBucket - Bucket specifically designated for application errors.
 * @property {boolean} useInflux - True if InfluxDB is completely configured.
 */

/** @type {AppConfig} */
const config = {
    devices: process.env.HOMEWIZZARD_DEVICES.split(',').map(d => d.trim()),
    pollInterval: parseInt(process.env.HOMEWIZZARD_POLL_INTERVAL || '5000', 10),
    dataPath: process.env.HOMEWIZZARD_DATA_PATH,
    influx: {
        url: process.env.INFLUX_URL,
        token: process.env.INFLUX_TOKEN,
        org: process.env.INFLUX_ORG,
        bucket: process.env.INFLUX_BUCKET,
        errorBucket: process.env.INFLUX_ERROR_BUCKET || process.env.INFLUX_BUCKET
    },
    useInflux: requiredEnvsInflux.every(key => process.env[key])
};

module.exports = config;
