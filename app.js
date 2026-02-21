const logger = require('./logger');
const config = require('./config');
const influx = require('./influx');
const fileStorage = require('./file_storage');
const homewizzard = require('./homewizzard');

logger.info({ pollInterval: config.pollInterval, devices: config.devices }, 'Starting Homewizzard Data Capture...');

// Select storage provider
const storage = config.useInflux ? influx : fileStorage;
logger.info({ storageProvider: config.useInflux ? 'InfluxDB' : 'Local File Storage' }, 'Storage provider selected');

// Perform startup checks
(async () => {
    const connected = await storage.checkConnection();
    if (!connected) {
        logger.warn(
            { storageProvider: config.useInflux ? 'InfluxDB' : 'File Storage' },
            'Startup Check Failed: storage is not reachable/writable'
        );
    } else {
        logger.info(
            { storageProvider: config.useInflux ? 'InfluxDB' : 'File Storage' },
            'Startup Check Passed: storage is ready'
        );
    }
})();

const deviceCache = {};

async function getDeviceInfo(deviceIp) {
    if (deviceCache[deviceIp]) {
        return deviceCache[deviceIp];
    }

    try {
        const info = await homewizzard.getDevice(deviceIp);
        deviceCache[deviceIp] = info;
        logger.info({ device: deviceIp, productName: info.product_name, productType: info.product_type }, 'Device discovered');
        return info;
    } catch (error) {
        logger.warn({ device: deviceIp, err: error.message }, 'Failed to get device info');
        return { product_name: 'Unknown', product_type: 'unknown' };
    }
}

async function pollDevice(device) {
    try {
        const deviceInfo = await getDeviceInfo(device);
        const data = await homewizzard.getData(device);
        storage.writeMeasurement(device, data, deviceInfo);
        logger.info({ device }, 'Data pushed');
    } catch (error) {
        logger.error({ device, err: error.message }, 'Failed to poll device');
        storage.logError(`Polling ${device}`, error);
    }
}

// Start polling for each device
config.devices.forEach(async device => {
    await getDeviceInfo(device);
    pollDevice(device);
    setInterval(() => {
        pollDevice(device);
    }, config.pollInterval);
});

// Handle generic process errors
process.on('uncaughtException', (error) => {
    logger.error({ err: error.message, stack: error.stack }, 'Uncaught Exception');
    storage.logError('Uncaught Exception', error);
});

process.on('unhandledRejection', (reason, promise) => {
    const err = reason instanceof Error ? reason : new Error(String(reason));
    logger.error({ err: err.message, stack: err.stack }, 'Unhandled Rejection');
    storage.logError('Unhandled Rejection', err);
});
