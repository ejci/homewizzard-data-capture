/**
 * @fileoverview Storage wrapper for InfluxDB v2.
 * Responsible for constructing connection interfaces, checking cluster health, 
 * mapping Homewizzard JSON directly into Influx Points, and flushing to the backend.
 * @module storage/influx
 */

const { InfluxDB, Point } = require('@influxdata/influxdb-client');
const { PingAPI } = require('@influxdata/influxdb-client-apis');
const logger = require('../utils/logger');
const config = require('../config');

let client;
let writeApi;
let errorWriteApi;

// Initialize clients if InfluxDB is enabled in the configuration
if (config.influx.url) {
    client = new InfluxDB({ url: config.influx.url, token: config.influx.token });
    writeApi = client.getWriteApi(config.influx.org, config.influx.bucket);
    errorWriteApi = client.getWriteApi(config.influx.org, config.influx.errorBucket);
}

/**
 * Verifies connectivity to the InfluxDB cluster using the Ping endpoint.
 * 
 * @returns {Promise<boolean>} True if reachable, false otherwise.
 */
async function checkConnection() {
    if (!client) return false;

    try {
        const pingApi = new PingAPI(client);
        await pingApi.getPing();
        logger.info({ influxUrl: config.influx.url }, 'Successfully connected to InfluxDB');
        return true;
    } catch (error) {
        logger.warn({ influxUrl: config.influx.url, err: error.message }, 'Failed to connect to InfluxDB');
        return false;
    }
}

// Ensure clean connection closure when the application shuts down gracefully
process.on('exit', () => {
    if (writeApi) {
        writeApi.close().then(() => {
            logger.info('InfluxDB writeApi closed');
        });
    }
    if (errorWriteApi && config.influx.bucket !== config.influx.errorBucket) {
        errorWriteApi.close();
    }
});

/**
 * Transforms generic device measurement attributes into InfluxDB Points
 * and buffers them to the write API.
 * 
 * @param {string} deviceIp - The source IP of the hardware device.
 * @param {Object} data - The unstructured JSON mapping of power/water parameters.
 * @param {Object} [deviceInfo={}] - Meta payload describing product_type and name.
 */
function writeMeasurement(deviceIp, data, deviceInfo = {}) {
    if (!writeApi) return;

    // We use the product type as the base measurement name (e.g. 'p1_meter', 'energy_socket')
    const measurementName = deviceInfo.product_type || 'homewizzard_device';

    const point = new Point(measurementName)
        .tag('device', deviceIp)
        .tag('product_name', deviceInfo.product_name || 'unknown')
        .tag('product_type', deviceInfo.product_type || 'unknown');

    // Dynamically iterate payload to preserve schema adaptability
    // This allows new Homewizzard properties to be streamed dynamically.
    for (const [key, value] of Object.entries(data)) {
        if (typeof value === 'number') {
            point.floatField(key, value);
        } else if (typeof value === 'boolean') {
            point.booleanField(key, value);
        } else if (typeof value === 'string' && key !== 'wifi_ssid') {
            // Ignore wifi_ssid to prevent high cardinality strings, store other strings
            point.stringField(key, value);
        }
    }

    writeApi.writePoint(point);
}

/**
 * Logs application errors into a dedicated InfluxDB measurement.
 * Beneficial for centralized cluster observability.
 * 
 * @param {string} context - Source of the error (e.g., 'Polling 192.168.1.50')
 * @param {Error|string} error - The caught generic Error object.
 */
function logError(context, error) {
    logger.error({ context, err: error.message || String(error) }, 'Application error');

    if (errorWriteApi) {
        const point = new Point('application_errors')
            .tag('service', 'homewizzard-data-capture')
            .tag('context', context)
            .stringField('message', error.message || String(error))
            .stringField('stack', error.stack || '');
        errorWriteApi.writePoint(point);
    }
}

module.exports = {
    checkConnection,
    writeMeasurement,
    logError
};
