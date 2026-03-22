/**
 * @fileoverview Local JSON file storage backend.
 * Provides a reliable fallback storage method when InfluxDB is disabled or unreachable.
 * @module storage/file_storage
 */

const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');
const config = require('../config');

const dataPath = config.dataPath;

// Ensure base data directory exists gracefully on cold start
if (dataPath && !fs.existsSync(dataPath)) {
    try {
        fs.mkdirSync(dataPath, { recursive: true });
    } catch (err) {
        logger.error({ dataPath, err: err.message }, 'Error creating base data path');
    }
}

/**
 * Validates the local file system write access.
 * 
 * @returns {Promise<boolean>} True if directory is writable, false otherwise.
 */
async function checkConnection() {
    if (!dataPath) {
        logger.error('Data Path not configured');
        return false;
    }
    try {
        await fs.promises.access(dataPath, fs.constants.W_OK);
        logger.info({ dataPath }, 'Local storage is writable');
        return true;
    } catch (error) {
        logger.warn({ dataPath, err: error.message }, 'Failed to write to local data path');
        return false;
    }
}

/**
 * Writes raw device measurement data to a dynamically structured JSON file mapping.
 * Organizes files by product type (e.g. ./data/p1_meter/2026-....json).
 * 
 * @param {string} deviceIp - The source IP of the hardware device.
 * @param {Object} data - The raw JSON measurement payload.
 * @param {Object} [deviceInfo={}] - Meta payload describing product details.
 */
function writeMeasurement(deviceIp, data, deviceInfo = {}) {
    if (!dataPath) return;

    // Sanitize string for localized filesystem usage
    const productType = (deviceInfo.product_type || 'unknown_device').replace(/[^a-z0-9_-]/gi, '_');
    const deviceDir = path.join(dataPath, productType);

    // Create intermediate directories dynamically if handling diverse device portfolios
    if (!fs.existsSync(deviceDir)) {
        try {
            fs.mkdirSync(deviceDir, { recursive: true });
        } catch (err) {
            logger.error({ deviceDir, err: err.message }, 'Error creating device directory');
            return;
        }
    }

    const timestamp = new Date().toISOString();
    const filenameTime = timestamp.replace(/:/g, '-');
    const filename = `${filenameTime}_${deviceIp}.json`;
    const filePath = path.join(deviceDir, filename);

    const payload = {
        timestamp,
        device_ip: deviceIp,
        device_info: deviceInfo,
        measurements: data
    };

    // Serialize and write asynchronously to avoid blocking the Event Loop
    fs.writeFile(filePath, JSON.stringify(payload, null, 2), (err) => {
        if (err) {
            logger.error({ filePath, err: err.message }, 'Error writing measurement file');
        }
    });
}

/**
 * Appends application execution errors to a local `errors.log` file.
 * 
 * @param {string} context - Source of the error.
 * @param {Error|string} error - The caught Error object.
 */
function logError(context, error) {
    if (!dataPath) return;

    const logFile = path.join(dataPath, 'errors.log');
    const logEntry = `${new Date().toISOString()} [${context}] ${error.message || error}\n`;

    fs.appendFile(logFile, logEntry, (err) => {
        if (err) {
            logger.error({ logFile, err: err.message }, 'Error writing to error log');
        }
    });
}

module.exports = {
    checkConnection,
    writeMeasurement,
    logError
};
