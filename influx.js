const { InfluxDB, Point } = require('@influxdata/influxdb-client');
const { PingAPI } = require('@influxdata/influxdb-client-apis');
const logger = require('./logger');
const config = require('./config');

let client;
let writeApi;
let errorWriteApi;

if (config.influx.url) {
    client = new InfluxDB({ url: config.influx.url, token: config.influx.token });
    writeApi = client.getWriteApi(config.influx.org, config.influx.bucket);
    errorWriteApi = client.getWriteApi(config.influx.org, config.influx.errorBucket);
}

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

function writeMeasurement(deviceIp, data, deviceInfo = {}) {
    if (!writeApi) return;

    const measurementName = deviceInfo.product_type || 'homewizzard_device';

    const point = new Point(measurementName)
        .tag('device', deviceIp)
        .tag('product_name', deviceInfo.product_name || 'unknown')
        .tag('product_type', deviceInfo.product_type || 'unknown');

    for (const [key, value] of Object.entries(data)) {
        if (typeof value === 'number') {
            point.floatField(key, value);
        } else if (typeof value === 'boolean') {
            point.booleanField(key, value);
        } else if (typeof value === 'string' && key !== 'wifi_ssid') {
            point.stringField(key, value);
        }
    }

    writeApi.writePoint(point);
}

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
