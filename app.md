#Homewizzard Data Capture

I need to implement application that will pull data about energy, water and gas consumption from homewizzard devices that are on my local network and push it to influxdb.
The end goal is to have all data in influxdb that then will be visualized with grafana. This specific app will only take care of pulling the data on predefined intervals and storing them in influxdb.

##Key requirements
- Application has a detailed configuration and all configuration should be exposed to environment variables
- Application will pull data from devices based on IPs or mdns names
- All data will be pushed to influx db and configuration will be exposed to environment variables
- Application schould be able to run in background with nodejs
- The whole application should be containerized with docker
- Application should be able to run on any platform that supports nodejs and docker
- Application should utilizae specifically V1 version of homewizzard API (https://api-documentation.homewizard.com/docs/category/api-v1) and not the v2
- Application should be able to recover from a network connection issues and continue to run

##Please consider
- Error handling
- Errors of the application should be also pushed to influxdb
- Edge cases
- Performance optimization
- Best practices for nodejs

##Deliverables
- Dockerfile
- .env.example
- app.js
- package.json
- README.md

##Other
Please do not unnecessarily remove any comments or code.
Generate the code with clear comments explaining the logic.
