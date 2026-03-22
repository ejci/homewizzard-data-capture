/**
 * @fileoverview Client module for interacting with the Homewizzard Local Wi-Fi API.
 * Handles network requests and error mapping.
 * @module services/homewizzard
 */

const axios = require('axios');

/**
 * Fetches current measurement data from a specific Homewizzard device.
 * Uses the API v1 data endpoint.
 * 
 * @param {string} deviceIp - The IP address or hostname of the Homewizzard device.
 * @returns {Promise<Object>} A promise resolving to the raw measurement data payload.
 *                            Properties include active_power_w, total_power_import_kwh, etc.
 * @throws {Error} Throws an error if the request fails, enriched with the device context.
 */
async function getData(deviceIp) {
    try {
        const response = await axios.get(`http://${deviceIp}/api/v1/data`, {
            timeout: 5000 // 5 seconds timeout to prevent hanging connections
        });
        return response.data;
    } catch (error) {
        // Enrich error message with device IP context for better debugging
        error.message = `Failed to fetch data from ${deviceIp}: ${error.message}`;
        throw error;
    }
}

/**
 * Fetches hardware metadata from a specific Homewizzard device.
 * Used to discover the product type (e.g., p1_meter, energy_socket).
 * 
 * @param {string} deviceIp - The IP address or hostname of the Homewizzard device.
 * @returns {Promise<Object>} A promise resolving to the device metadata object.
 * @throws {Error} Throws an error if the request fails, enriched with the device context.
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
