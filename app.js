const config = require('./config');
const influx = require('./influx');
const fileStorage = require('./file_storage');
const homewizzard = require('./homewizzard');

console.log(new Date().toISOString(), 'Starting Homewizzard Data Capture...');
console.log(new Date().toISOString(), `Polling interval: ${config.pollInterval}ms`);
console.log(new Date().toISOString(), `Devices to poll: ${config.devices.join(', ')}`);

// Select storage provider
const storage = config.useInflux ? influx : fileStorage;
console.log(new Date().toISOString(), `Using storage provider: ${config.useInflux ? 'InfluxDB' : 'Local File Storage'}`);

// Perform startup checks
(async () => {
    const connected = await storage.checkConnection();
    if (!connected) {
        console.error(new Date().toISOString(), `Startup Check Failed: ${config.useInflux ? 'InfluxDB' : 'File Storage'} is not reachable/writable.`);
        // We continue, as per requirements "recover from issues", but the logs are now clear.
    } else {
        console.log(new Date().toISOString(), `Startup Check Passed: ${config.useInflux ? 'InfluxDB' : 'File Storage'} is ready.`);
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
        console.log(new Date().toISOString(), `Discovered device at ${deviceIp}: ${info.product_name} (${info.product_type})`);
        return info;
    } catch (error) {
        console.error(new Date().toISOString(), `Failed to get device info for ${deviceIp}: ${error.message}`);
        // Return a minimal object if fetch fails so we can still try to log data
        return { product_name: 'Unknown', product_type: 'unknown' };
    }
}

async function pollDevice(device) {
    try {
        // Ensure we have device info (tried at startup, but retry if needed or getting cached)
        const deviceInfo = await getDeviceInfo(device);

        const data = await homewizzard.getData(device);
        storage.writeMeasurement(device, data, deviceInfo);
        console.log(new Date().toISOString(), `Data pushed for ${device}`);
        // Optional: console.log(`Data pushed for ${device}`);
    } catch (error) {
        console.error(new Date().toISOString(), `Failed to poll ${device}: ${error.message}`);
        storage.logError(`Polling ${device}`, error);
    }
}

// Start polling for each device
config.devices.forEach(async device => {
    // Try to pre-fetch device info to have it ready
    await getDeviceInfo(device);

    // Initial poll immediately
    pollDevice(device);

    // Set interval
    setInterval(() => {
        pollDevice(device);
    }, config.pollInterval);
});

// Handle generic process errors to try and keep alive or at least log them
process.on('uncaughtException', (error) => {
    console.error(new Date().toISOString(), 'Uncaught Exception:', error);
    storage.logError('Uncaught Exception', error);
    // Depending on severity, we might want to exit, but requirements say "recover and continue".
    // For uncaught exceptions it is usually safer to restart (Docker will handle restart).
    // process.exit(1); 
});

process.on('unhandledRejection', (reason, promise) => {
    console.error(new Date().toISOString(), 'Unhandled Rejection at:', promise, 'reason:', reason);
    storage.logError('Unhandled Rejection', reason instanceof Error ? reason : new Error(String(reason)));
});
