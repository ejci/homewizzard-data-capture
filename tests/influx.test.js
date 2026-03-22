const { InfluxDB, Point } = require('@influxdata/influxdb-client');
const { PingAPI } = require('@influxdata/influxdb-client-apis');

jest.mock('../src/config', () => ({
    influx: {
        url: 'http://localhost:8086',
        token: 'secret',
        org: 'home',
        bucket: 'sensors',
        errorBucket: 'sensors'
    }
}));

const mockWritePoint = jest.fn();
jest.mock('@influxdata/influxdb-client', () => {
    const PointMock = jest.fn().mockImplementation(() => {
        return {
            tag: jest.fn().mockReturnThis(),
            floatField: jest.fn().mockReturnThis(),
            booleanField: jest.fn().mockReturnThis(),
            stringField: jest.fn().mockReturnThis()
        };
    });
    
    return {
        InfluxDB: jest.fn().mockImplementation(() => ({
            getWriteApi: jest.fn().mockReturnValue({
                writePoint: mockWritePoint,
                close: jest.fn().mockResolvedValue()
            })
        })),
        Point: PointMock
    };
});

const mockGetPing = jest.fn();
jest.mock('@influxdata/influxdb-client-apis', () => ({
    PingAPI: jest.fn().mockImplementation(() => ({
        getPing: mockGetPing
    }))
}));

jest.mock('../src/utils/logger', () => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
}));

const influxStorage = require('../src/storage/influx'); // Safe to require directly now!

describe('influx.js', () => {
    afterEach(() => {
        jest.clearAllMocks();
    });

    it('checkConnection returns true when reachable', async () => {
        mockGetPing.mockResolvedValueOnce(undefined);
        
        const result = await influxStorage.checkConnection();
        expect(result).toBe(true);
    });

    it('checkConnection returns false when unreachable', async () => {
        mockGetPing.mockRejectedValueOnce(new Error('timeout'));
        
        const result = await influxStorage.checkConnection();
        expect(result).toBe(false);
    });

    it('writeMeasurement writes point to writeApi', () => {
        const data = { 
            active_power_w: 100, 
            total_power_import_kwh: 50.5,
            wifi_strength: 50,
            has_error: false,
            status: "ok",
            wifi_ssid: "MyNet"
        };
        const deviceInfo = { product_type: 'p1_meter', product_name: 'Main Meter' };
        
        influxStorage.writeMeasurement('192.168.1.100', data, deviceInfo);
        
        expect(Point).toHaveBeenCalledWith('p1_meter');
        const pointInstance = Point.mock.results[0].value;
        
        expect(pointInstance.tag).toHaveBeenCalledWith('device', '192.168.1.100');
        expect(pointInstance.floatField).toHaveBeenCalledWith('active_power_w', 100);
        
        expect(mockWritePoint).toHaveBeenCalledWith(pointInstance);
    });

    it('logError writes error point to error bucket', () => {
        influxStorage.logError('test context', new Error('test error'));
        
        // Point is called twice total so far in module lifecycle: once for app error
        expect(Point).toHaveBeenCalledWith('application_errors');
        
        // The last Point call generated our error point
        const pointInstance = Point.mock.results[Point.mock.results.length - 1].value;
        
        expect(pointInstance.tag).toHaveBeenCalledWith('context', 'test context');
        expect(pointInstance.stringField).toHaveBeenCalledWith('message', 'test error');
        
        expect(mockWritePoint).toHaveBeenCalledWith(pointInstance);
    });
});
