const fs = require('fs');
const path = require('path');
const logger = require('./logger');
const config = require('./config');

const dataPath = config.dataPath;

// Ensure base data directory exists
if (dataPath && !fs.existsSync(dataPath)) {
    try {
        fs.mkdirSync(dataPath, { recursive: true });
    } catch (err) {
        logger.error({ dataPath, err: err.message }, 'Error creating base data path');
    }
}

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

function writeMeasurement(deviceIp, data, deviceInfo = {}) {
    if (!dataPath) return;

    const productType = (deviceInfo.product_type || 'unknown_device').replace(/[^a-z0-9_-]/gi, '_');
    const deviceDir = path.join(dataPath, productType);

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

    fs.writeFile(filePath, JSON.stringify(payload, null, 2), (err) => {
        if (err) {
            logger.error({ filePath, err: err.message }, 'Error writing measurement file');
        }
    });
}

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
