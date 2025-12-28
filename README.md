# Homewizzard Data Capture

A robust Node.js application to capture energy, water, and gas consumption data from [Homewizzard](https://www.homewizzard.com/) Wi-Fi API meters (P1 Meter, Energy Socket, Watermeter, etc.) and store it in **InfluxDB** or **Local JSON Files**.

## Features

-   **Multi-Device Support**: Polls multiple devices simultaneously via local network.
-   **Automatic Discovery**: Fetches device metadata (Product Name, Device Type) to tag data accurately.
-   **Dual Storage Backends**:
    -   **InfluxDB (v2)**: Seamless integration for time-series visualization (Grafana, InfluxDB UI).
    -   **Local File Storage**: Saves raw JSON data locally if InfluxDB is not needed.
-   **Robust Error Handling**:
    -   Startup connectivity checks for storage backends.
    -   Clear, human-readable configuration errors.
    -   Resilient polling loop (continues processing other devices if one fails).
    -   Application execution errors logged to InfluxDB (if configured) or local error log.
-   **Containerized**: Docker-ready for easy deployment.

## Configuration

The application is configured via environment variables. Create a `.env` file in the root directory.

### Common Configuration
| Variable | Desctiption | Required | Default |
| :--- | :--- | :--- | :--- |
| `DEVICES` | Comma-separated list of Device IPs or Hostnames (e.g. `192.168.1.10,homewizzard-p1`) | **Yes** | |
| `POLL_INTERVAL` | Polling frequency in milliseconds | No | `5000` |

### Storage Option 1: InfluxDB (Primary)
If these variables are set, the application will use InfluxDB.

| Variable | Description | Required (for Influx) |
| :--- | :--- | :--- |
| `INFLUX_URL` | URL of your InfluxDB instance (e.g. `http://localhost:8086`) | **Yes** |
| `INFLUX_TOKEN` | InfluxDB API Token | **Yes** |
| `INFLUX_ORG` | InfluxDB Organization Name | **Yes** |
| `INFLUX_BUCKET` | Target Bucket for measurements | **Yes** |
| `INFLUX_ERROR_BUCKET`| Bucket for application errors (defaults to `INFLUX_BUCKET`) | No |

### Storage Option 2: Local File Storage (Fallback)
If InfluxDB variables are **not** set, the application will check for `DATA_PATH`.

| Variable | Description | Required (for Local) |
| :--- | :--- | :--- |
| `DATA_PATH` | Local directory path to save JSON files (e.g. `./data`) | **Yes** |

*> Note: The application requires either InfluxDB configuration OR a `DATA_PATH` to start.*

## Running the Application

### Using Docker (Recommended)

1.  **Build the Image**:
    ```bash
    docker build -t homewizzard-capture .
    ```

2.  **Run with InfluxDB**:
    ```bash
    docker run -d \
      --name homewizzard-capture \
      --env-file .env \
      --restart unless-stopped \
      homewizzard-capture
    ```

3.  **Run with Local Storage**:
    Mount a volume to persist the data.
    ```bash
    docker run -d \
      --name homewizzard-capture \
      --env-file .env \
      -v $(pwd)/data:/app/data \
      --restart unless-stopped \
      homewizzard-capture
    ```
    *(Ensure your `.env` has `DATA_PATH=/app/data`)*

### Running Locally (Node.js)

1.  **Install Dependencies**:
    ```bash
    npm install
    ```

2.  **Start the App**:
    ```bash
    node app.js
    ```

## Data Format

### InfluxDB
-   **Measurement**: Derived from device type (e.g., `p1_meter`, `energy_socket`) or `homewizzard_device`.
-   **Tags**: `device` (IP), `product_name`, `product_type`.
-   **Fields**: All numeric, boolean, and string data returned by the API (e.g., `active_power_w`, `total_power_import_kwh`).

### Local JSON
Files are saved in: `<DATA_PATH>/<product_type>/<timestamp>_<device_ip>.json`
```json
{
  "timestamp": "2025-12-28T14:00:00.000Z",
  "device_ip": "192.168.1.50",
  "device_info": { ... },
  "measurements": {
    "active_power_w": 450,
    "total_power_import_kwh": 1234.56,
    ...
  }
}
```

## Troubleshooting

-   **"Missing required environment variables"**: The app will list exactly which variables are missing. Check your `.env` file.
-   **"Startup Check Failed"**: The app could not connect to InfluxDB or write to the `DATA_PATH`. Check network connectivity or file permissions.
-   **Connection Refused**: Ensure the Homewizzard device is reachable on the local network and the Local API is enabled in the Homewizzard Energy App.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
