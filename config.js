const logger = require('./logger');

const requiredEnvsCommon = ['DEVICES'];
const requiredEnvsInflux = ['INFLUX_URL', 'INFLUX_TOKEN', 'INFLUX_ORG', 'INFLUX_BUCKET'];

function validateConfig() {
    const missingCommon = requiredEnvsCommon.filter(key => !process.env[key]);
    if (missingCommon.length > 0) {
        logger.error({ missingVars: missingCommon }, 'Missing required environment variables');
        process.exit(1);
    }

    const hasInflux = requiredEnvsInflux.every(key => process.env[key]);
    const hasDataPath = !!process.env.DATA_PATH;

    if (!hasInflux && !hasDataPath) {
        logger.error(
            { requiredInfluxVars: requiredEnvsInflux, dataPathVar: 'DATA_PATH' },
            'Storage backend not configured. Provide InfluxDB variables or DATA_PATH.'
        );
        process.exit(1);
    }
}

validateConfig();

module.exports = {
    devices: process.env.DEVICES.split(',').map(d => d.trim()),
    pollInterval: parseInt(process.env.POLL_INTERVAL || '5000', 10),
    dataPath: process.env.DATA_PATH,
    influx: {
        url: process.env.INFLUX_URL,
        token: process.env.INFLUX_TOKEN,
        org: process.env.INFLUX_ORG,
        bucket: process.env.INFLUX_BUCKET,
        errorBucket: process.env.INFLUX_ERROR_BUCKET || process.env.INFLUX_BUCKET
    },
    useInflux: requiredEnvsInflux.every(key => process.env[key])
};
