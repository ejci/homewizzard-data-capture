const fs = require('fs');
const path = require('path');

jest.mock('../src/config', () => ({
    dataPath: '/tmp/data',
    devices: ['192.168.1.100']
}));

jest.mock('fs', () => {
    return {
        existsSync: jest.fn(),
        mkdirSync: jest.fn(),
        writeFile: jest.fn((file, data, cb) => cb(null)),
        appendFile: jest.fn((file, data, cb) => cb(null)),
        promises: {
            access: jest.fn()
        },
        constants: { W_OK: 2 }
    };
});

jest.mock('../src/utils/logger', () => ({
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn()
}));

const fileStorage = require('../src/storage/file_storage');

describe('file_storage.js', () => {
    afterEach(() => {
        jest.clearAllMocks();
    });

    it('checkConnection returns true when writable', async () => {
        fs.promises.access.mockResolvedValueOnce(undefined);
        const result = await fileStorage.checkConnection();
        expect(result).toBe(true);
        expect(fs.promises.access).toHaveBeenCalledWith('/tmp/data', fs.constants.W_OK);
    });

    it('checkConnection returns false when access fails', async () => {
        fs.promises.access.mockRejectedValueOnce(new Error('no access'));
        const result = await fileStorage.checkConnection();
        expect(result).toBe(false);
    });

    it('writeMeasurement writes to correctly formatted path', () => {
        fs.existsSync.mockReturnValueOnce(true); // Base dir exists check
        fs.existsSync.mockReturnValueOnce(true); // Device dir exists check
        
        const data = { power: 10 };
        const deviceInfo = { product_type: 'p1 meter' };
        
        fileStorage.writeMeasurement('192.168.1.100', data, deviceInfo);
        
        expect(fs.writeFile).toHaveBeenCalled();
        const [filePath, payloadStr] = fs.writeFile.mock.calls[0];
        
        expect(filePath).toContain(path.normalize('p1_meter')); // Normalized product type
        expect(filePath).toContain('192.168.1.100.json');
        
        const payload = JSON.parse(payloadStr);
        expect(payload.measurements).toEqual(data);
        expect(payload.device_ip).toBe('192.168.1.100');
    });

    it('logError appends to error.log', () => {
        fileStorage.logError('test context', new Error('test error'));
        
        expect(fs.appendFile).toHaveBeenCalled();
        const [logPath, logEntry] = fs.appendFile.mock.calls[0];
        
        expect(logPath).toBe(path.join('/tmp/data', 'errors.log'));
        expect(logEntry).toContain('[test context] test error');
    });
});
