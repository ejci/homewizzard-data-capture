/**
 * @fileoverview Main orchestrator and business logic controller.
 * Manages the polling intervals, retrieves data via the `homewizzard` service,
 * and passes it securely to the storage mechanisms.
 * @module app
 */

const logger = require('./utils/logger');
const config = require('./config');
const influx = require('./storage/influx');
const fileStorage = require('./storage/file_storage');
const homewizzard = require('./services/homewizzard');

/** @type {Object} The dynamically resolved storage backend instance (Influx or File). */
let storage;

/** @type {NodeJS.Timeout[]} Internal array referencing active polling interval UUIDs for clean shutdown. */
const intervals = [];

/** @type {Object<string, Object>} In-memory dictionary linking IPs to static device metadata. */
const deviceCache = {};

/**
 * Initializes the application dependencies, verifies backend readiness,
 * and launches all device polling loops asynchronously.
 * 
 * @async
 */
async function start() {
    logger.info({ pollInterval: config.pollInterval, devices: config.devices }, 'Starting Homewizzard Data Capture...');

    // Select proper storage layer based on configuration toggles
    storage = config.useInflux ? influx : fileStorage;
    logger.info({ storageProvider: config.useInflux ? 'InfluxDB' : 'Local File Storage' }, 'Storage provider selected');

    // Perform startup sanity checks ensuring we have database/disk connectivity before polling loops generate heavy traffic
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

    // Launch daemon polling mechanics per configured device
    config.devices.forEach(async device => {
        // Pre-fetch once deterministically to seed cache
        await getDeviceInfo(device);
        
        // Execute initial poll synchronously
        pollDevice(device);
        
        // Register interval to continue polling continuously
        const intervalId = setInterval(() => {
            pollDevice(device);
        }, config.pollInterval);
        intervals.push(intervalId);
    });
}

/**
 * Halts all active polling intervals. Important to prevent memory leaks during Jest automated tests.
 */
function stop() {
    intervals.forEach(clearInterval);
    intervals.length = 0;
}

/**
 * Fetches static hardware descriptors utilizing in-memory object caching.
 * Memory caching is vital here since `getDevice` fetches data that very rarely changes (like model serial numbers),
 * avoiding unnecessary localized API floods.
 * 
 * @async
 * @param {string} deviceIp - The target IP address
 * @returns {Promise<Object>} Hardware details JSON
 */
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

/**
 * Contacts the device locally via Wi-Fi API, executes data pipelines, and flushes data to the storage proxy.
 * Provides broad exception shielding ensuring one faulty device poll doesn't crash the orchestrator.
 * 
 * @async
 * @param {string} device - The target IP address
 */
async function pollDevice(device) {
    try {
        // Resolve cache descriptors locally
        const deviceInfo = await getDeviceInfo(device);
        const data = await homewizzard.getData(device);
        
        if (storage) storage.writeMeasurement(device, data, deviceInfo);
        
        logger.info({ device }, 'Data pushed');
    } catch (error) {
        logger.error({ device, err: error.message }, 'Failed to poll device');
        if (storage) storage.logError(`Polling ${device}`, error);
    }
}

// Global scope exception safety net preventing daemon crashes in edge cases
process.on('uncaughtException', (error) => {
    logger.error({ err: error.message, stack: error.stack }, 'Uncaught Exception');
    if (storage) storage.logError('Uncaught Exception', error);
});

process.on('unhandledRejection', (reason, promise) => {
    const err = reason instanceof Error ? reason : new Error(String(reason));
    logger.error({ err: err.message, stack: err.stack }, 'Unhandled Rejection');
    if (storage) storage.logError('Unhandled Rejection', err);
});

module.exports = { start, stop, getDeviceInfo, pollDevice };
