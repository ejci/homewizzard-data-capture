jest.mock('../src/config', () => ({
    pollInterval: 100, // Make this short for testing
    devices: ['192.168.1.100'],
    useInflux: false,
    dataPath: '/tmp/data',
}));
jest.mock('../src/utils/logger', () => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
}));
jest.mock('../src/storage/file_storage', () => ({
    checkConnection: jest.fn().mockResolvedValue(true),
    writeMeasurement: jest.fn(),
    logError: jest.fn()
}));
jest.mock('../src/storage/influx', () => ({
    checkConnection: jest.fn().mockResolvedValue(true),
    writeMeasurement: jest.fn(),
    logError: jest.fn()
}));
jest.mock('../src/services/homewizzard', () => ({
    getDevice: jest.fn().mockResolvedValue({ product_name: 'test_meter', product_type: 'p1_meter' }),
    getData: jest.fn().mockResolvedValue({ active_power_w: 120 })
}));

const app = require('../src/app');
const homewizzard = require('../src/services/homewizzard');
const fileStorage = require('../src/storage/file_storage');
const logger = require('../src/utils/logger');

describe('app.js', () => {
    afterEach(() => {
        app.stop();
        jest.clearAllMocks();
    });

    it('start() initializes application and polls devices', async () => {
        // Start the application lifecycle
        await app.start();
        
        // Wait long enough (>= pollInterval/async delay) to let the initial API pull happen via async forEach
        await new Promise(r => setTimeout(r, 150));
        
        // Assert initialization tasks
        expect(logger.info).toHaveBeenCalledWith(expect.anything(), 'Starting Homewizzard Data Capture...');
        expect(fileStorage.checkConnection).toHaveBeenCalled();
        expect(homewizzard.getDevice).toHaveBeenCalledWith('192.168.1.100');
        expect(homewizzard.getData).toHaveBeenCalledWith('192.168.1.100');
        
        expect(fileStorage.writeMeasurement).toHaveBeenCalledWith(
            '192.168.1.100', 
            { active_power_w: 120 }, 
            { product_name: 'test_meter', product_type: 'p1_meter' }
        );
    });

    it('handles data fetching errors gracefully without crashing', async () => {
        homewizzard.getData.mockRejectedValueOnce(new Error('Connection timeout'));
        
        await app.start();
        
        // Wait briefly for promises to rejection
        await new Promise(r => setTimeout(r, 50));
        
        // Assert error was logged and passed to storage error handler
        expect(logger.error).toHaveBeenCalled();
        expect(fileStorage.logError).toHaveBeenCalled();
        // The app should not have crashed
    });
});
