const axios = require('axios');
const homewizzard = require('../src/services/homewizzard');

jest.mock('axios');

describe('homewizzard.js', () => {
    afterEach(() => {
        jest.clearAllMocks();
    });

    it('getData fetches correctly', async () => {
        axios.get.mockResolvedValueOnce({ data: { active_power_w: 100 } });
        const data = await homewizzard.getData('192.168.1.100');
        expect(data).toEqual({ active_power_w: 100 });
        expect(axios.get).toHaveBeenCalledWith('http://192.168.1.100/api/v1/data', { timeout: 5000 });
    });

    it('getData handles errors and wraps message', async () => {
        axios.get.mockRejectedValueOnce(new Error('Network error'));
        await expect(homewizzard.getData('192.168.1.100')).rejects.toThrow('Failed to fetch data from 192.168.1.100: Network error');
    });

    it('getDevice fetches correctly', async () => {
        axios.get.mockResolvedValueOnce({ data: { product_type: 'p1_meter' } });
        const device = await homewizzard.getDevice('192.168.1.100');
        expect(device).toEqual({ product_type: 'p1_meter' });
        expect(axios.get).toHaveBeenCalledWith('http://192.168.1.100/api/', { timeout: 5000 });
    });

    it('getDevice handles errors and wraps message', async () => {
        axios.get.mockRejectedValueOnce(new Error('Network error'));
        await expect(homewizzard.getDevice('192.168.1.100')).rejects.toThrow('Failed to fetch device info from 192.168.1.100: Network error');
    });
});
