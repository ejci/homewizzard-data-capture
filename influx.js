const { InfluxDB, Point } = require('@influxdata/influxdb-client');
const { PingAPI } = require('@influxdata/influxdb-client-apis');
const config = require('./config');

let client;
let writeApi;
let errorWriteApi;

if (config.influx.url) {
    client = new InfluxDB({ url: config.influx.url, token: config.influx.token });
    writeApi = client.getWriteApi(config.influx.org, config.influx.bucket);
    errorWriteApi = client.getWriteApi(config.influx.org, config.influx.errorBucket);
}

// Custom error handling for write failures
const handleWriteError = (error) => {
    console.error(new Date().toISOString(), 'InfluxDB Write Failed:', error.message || error);
    if (String(error).includes('ECONNREFUSED') || String(error).includes('ETIMEDOUT')) {
        console.error(new Date().toISOString(), `CRITICAL: Unable to connect to InfluxDB at ${config.influx.url}. Is it running?`);
    }
};

async function checkConnection() {
    if (!client) return false; // Not configured

    try {
        const pingApi = new PingAPI(client);
        // Ping returns void on success (204), throws on error
        await pingApi.getPing();
        console.log(new Date().toISOString(), 'Successfully connected to InfluxDB');
        return true;
    } catch (error) {
        console.error(new Date().toISOString(), `FAILED to connect to InfluxDB at ${config.influx.url}`);
        console.error(new Date().toISOString(), `Reason: ${error.message}`);
        console.error(new Date().toISOString(), 'Please check if InfluxDB is running and the URL is correct.');
        return false;
    }
}

// Ensure we close the client on exit
process.on('exit', () => {
    if (writeApi) {
        writeApi.close().then(() => {
            console.log(new Date().toISOString(), 'InfluxDB writeApi closed');
        });
    }
    if (errorWriteApi && config.influx.bucket !== config.influx.errorBucket) {
        errorWriteApi.close();
    }
});

function writeMeasurement(deviceIp, data, deviceInfo = {}) {
    if (!writeApi) return; // Not configured

    // Determine measurement name from product type or fallback
    // e.g. 'energy_socket', 'p1_meter', 'watermeter'
    const measurementName = deviceInfo.product_type || 'homewizzard_device';

    const point = new Point(measurementName)
        .tag('device', deviceIp)
        .tag('product_name', deviceInfo.product_name || 'unknown')
        .tag('product_type', deviceInfo.product_type || 'unknown');

    // Dynamically add all numeric, boolean, or string fields
    for (const [key, value] of Object.entries(data)) {
        if (typeof value === 'number') {
            point.floatField(key, value);
        } else if (typeof value === 'boolean') {
            point.booleanField(key, value);
        } else if (typeof value === 'string' && key !== 'wifi_ssid') {
            // Exclude sensitive or non-metric strings if needed, but wifi_ssid might be useful as tag or field. 
            // Usually strings are better as tags, but here we treat data as fields.
            point.stringField(key, value);
        }
    }

    // Explicitly handle wifi_ssid as a string field if present, or maybe just let the loop handle it.
    // The loop above handles strings.

    writeApi.writePoint(point);
}

function logError(errorContext, error) {
    if (!errorWriteApi) {
        // Fallback to console if Influx is not configured (though app generic handler usually does console logic too)
        console.error(new Date().toISOString(), `(No Influx) Error in ${errorContext}:`, error);
        return;
    }
    console.error(new Date().toISOString(), `Error in ${errorContext}:`, error);

    const point = new Point('application_errors')
        .tag('context', errorContext)
        .stringField('message', error.message || String(error))
        .stringField('stack', error.stack || '');

    errorWriteApi.writePoint(point);
}

module.exports = {
    checkConnection,
    writeMeasurement,
    logError
};
