describe('config.js', () => {
    let originalEnv;

    beforeEach(() => {
        originalEnv = { ...process.env };
        process.env = {}; // Clear environment variables to start fresh

        // Mock process.exit
        jest.spyOn(process, 'exit').mockImplementation((code) => {
            throw new Error(`Process exited with code ${code}`);
        });

        // Mock logger to avoid noisy console output during test
        jest.mock('../src/utils/logger', () => ({
            error: jest.fn(),
            info: jest.fn(),
            warn: jest.fn()
        }));
    });

    afterEach(() => {
        process.env = { ...originalEnv };
        jest.restoreAllMocks();
        jest.resetModules();
    });

    it('should exit if required common env variables are missing', () => {
        delete process.env.HOMEWIZZARD_DEVICES;
        
        expect(() => {
            require('../src/config');
        }).toThrow('Process exited with code 1');
    });

    it('should exit if neither InfluxDB nor Data Path is provided', () => {
        process.env.HOMEWIZZARD_DEVICES = '127.0.0.1';
        
        expect(() => {
            require('../src/config');
        }).toThrow('Process exited with code 1');
    });

    it('should load config correctly when file path is provided', () => {
        process.env.HOMEWIZZARD_DEVICES = '192.168.1.100';
        process.env.HOMEWIZZARD_DATA_PATH = '/tmp/data';
        
        const config = require('../src/config');
        
        expect(config.devices).toEqual(['192.168.1.100']);
        expect(config.dataPath).toBe('/tmp/data');
        expect(config.useInflux).toBe(false);
    });

    it('should load config correctly when influx vars are provided', () => {
        process.env.HOMEWIZZARD_DEVICES = '192.168.1.100, 192.168.1.101';
        process.env.INFLUX_URL = 'http://localhost:8086';
        process.env.INFLUX_TOKEN = 'secret';
        process.env.INFLUX_ORG = 'home';
        process.env.INFLUX_BUCKET = 'sensors';
        
        const config = require('../src/config');
        
        expect(config.useInflux).toBe(true);
        expect(config.influx.url).toBe('http://localhost:8086');
        expect(config.devices).toEqual(['192.168.1.100', '192.168.1.101']);
    });
});
