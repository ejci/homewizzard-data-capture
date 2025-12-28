const fs = require('fs');
const path = require('path');
const config = require('./config');

const dataPath = config.dataPath;

// Ensure base data directory exists
if (dataPath && !fs.existsSync(dataPath)) {
    try {
        fs.mkdirSync(dataPath, { recursive: true });
    } catch (err) {
        console.error(new Date().toISOString(), `Error creating base data path ${dataPath}:`, err);
    }
}

async function checkConnection() {
    if (!dataPath) {
        console.error(new Date().toISOString(), 'Data Path not configured.');
        return false;
    }
    try {
        await fs.promises.access(dataPath, fs.constants.W_OK);
        console.log(new Date().toISOString(), `Local storage is writable at ${dataPath}`);
        return true;
    } catch (error) {
        console.error(new Date().toISOString(), `FAILED to write to local data path ${dataPath}: ${error.message}`);
        return false;
    }
}

function writeMeasurement(deviceIp, data, deviceInfo = {}) {
    if (!dataPath) return;

    // Use product type for folder structure, sanitize it
    const productType = (deviceInfo.product_type || 'unknown_device').replace(/[^a-z0-9_-]/gi, '_');
    const deviceDir = path.join(dataPath, productType);

    // Ensure device directory exists
    if (!fs.existsSync(deviceDir)) {
        try {
            fs.mkdirSync(deviceDir, { recursive: true });
        } catch (err) {
            console.error(new Date().toISOString(), `Error creating directory ${deviceDir}:`, err);
            return;
        }
    }

    const timestamp = new Date().toISOString();
    // Sanitize timestamp for filename
    const filenameTime = timestamp.replace(/:/g, '-');
    const filename = `${filenameTime}_${deviceIp}.json`;
    const filePath = path.join(deviceDir, filename);

    const payload = {
        timestamp: timestamp,
        device_ip: deviceIp,
        device_info: deviceInfo,
        measurements: data
    };

    fs.writeFile(filePath, JSON.stringify(payload, null, 2), (err) => {
        if (err) {
            console.error(new Date().toISOString(), `Error writing file ${filePath}:`, err);
        } else {
            // console.log(new Date().toISOString(), `Wrote data to ${filePath}`);
        }
    });
}

function logError(errorContext, error) {
    if (!dataPath) return;

    const logFile = path.join(dataPath, 'errors.log');
    const logEntry = `${new Date().toISOString()} [${errorContext}] ${error.message || error}\n`;

    fs.appendFile(logFile, logEntry, (err) => {
        if (err) {
            console.error(new Date().toISOString(), `Error writing to error log ${logFile}:`, err);
        }
    });
}

module.exports = {
    checkConnection,
    writeMeasurement,
    logError
};
