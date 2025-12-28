const axios = require('axios');

/**
 * Fetches measurement data from a Homewizzard device using API v1.
 * @param {string} deviceIp - IP address or hostname of the device.
 * @returns {Promise<Object>} - The measurement data object or throws an error.
 */
async function getData(deviceIp) {
    try {
        const response = await axios.get(`http://${deviceIp}/api/v1/data`, {
            timeout: 5000 // 5 seconds timeout
        });
        return response.data;
    } catch (error) {
        // Enrich error with device context
        error.message = `Failed to fetch data from ${deviceIp}: ${error.message}`;
        throw error;
    }
}

/**
 * Fetches device metadata from a Homewizzard device.
 * @param {string} deviceIp - IP address or hostname of the device.
 * @returns {Promise<Object>} - The device metadata object.
 */
async function getDevice(deviceIp) {
    try {
        const response = await axios.get(`http://${deviceIp}/api/`, {
            timeout: 5000
        });
        return response.data;
    } catch (error) {
        error.message = `Failed to fetch device info from ${deviceIp}: ${error.message}`;
        throw error;
    }
}

module.exports = {
    getData,
    getDevice
};
