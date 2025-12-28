require('dotenv').config();

const requiredEnvsCommon = ['DEVICES'];
const requiredEnvsInflux = ['INFLUX_URL', 'INFLUX_TOKEN', 'INFLUX_ORG', 'INFLUX_BUCKET'];

function validateConfig() {
    const missingCommon = requiredEnvsCommon.filter(key => !process.env[key]);
    if (missingCommon.length > 0) {
        console.error('\n================ CONFIGURATION ERROR ================');
        console.error(` The following required environment variables are missing:`);
        missingCommon.forEach(key => console.error(`  - ${key}`));
        console.error(' Please update your .env file or environment variables.');
        console.error('=====================================================\n');
        process.exit(1);
    }

    const hasInflux = requiredEnvsInflux.every(key => process.env[key]);
    const hasDataPath = !!process.env.DATA_PATH;

    if (!hasInflux && !hasDataPath) {
        console.error('\n================ CONFIGURATION ERROR ================');
        console.error(' Storage backend not configured.');
        console.error(' You must provide either:');
        console.error('  1. InfluxDB configuration (INFLUX_URL, INFLUX_TOKEN, etc.)');
        console.error('  2. Local File Storage path (DATA_PATH)');
        console.error('=====================================================\n');
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
    // storageType: Detect based on config. prioritizing Influx if both present? 
    // User requested: "if influxdb env variables are not set it will write data to data folder".
    // So if influx is fully set, use it. Else use file.
    useInflux: requiredEnvsInflux.every(key => process.env[key])
};
