# COMP.SE.140 – Docker-compose an microservices
This project implements a system of three interworking services using Docker and Docker Compose.


## Services

### Service1 (Node.js)
- **Port**: 8199 (exposed to host)
- **Role**: Main proxy service that handles external requests
- **Endpoints**:
  - `GET /status` - Returns combined status from Service1 and Service2
  - `GET /log` - Returns logs from Storage service

### Service2 (Python/Flask)
- **Port**: 8001 (internal only)
- **Role**: Status analysis service
- **Endpoints**:
  - `GET /status` - Returns system status information

### Storage (Node.js)
- **Port**: 8000 (internal only)
- **Role**: Persistent storage service
- **Endpoints**:
  - `POST /log` - Append log entry
  - `GET /log` - Retrieve all logs
  - `DELETE /log` - Clear logs (for cleanup)

## Architecture

<img width="937" height="697" alt="image" src="https://github.com/user-attachments/assets/a55e60b2-4b08-45b5-b1b3-178cca84dd2a" />

The system uses two types of persistent storage:

1. **Named Volume (storage_data)**: Used by the Storage service for internal logs
2. **Bind Mount (vStorage)**: Mounted to `./vstorage` directory on host

## Running the System

```bash
# Clone the repository using command
git clone -b exercise1 https://github.com/silshara/comp.se.140-devops-course.git

# Source folder
cd comp.se.140-devops-course

# Start all services
docker-compose up --build

# Or start in background
docker-compose up --build -d

# Stop services
docker-compose down
```

## Testing

```bash
# Test status endpoint
curl localhost:8199/status

# Test log endpoint
curl localhost:8199/log

# Check vstorage
cat ./vstorage
```

## Cleanup Instructions

### To completely clean the system:

1. **Stop and remove containers**:
   ```bash
   docker-compose down
   ```

2. **Remove named volumes** (this will delete Storage service logs):
   ```bash
   docker volume rm compse140-devops-course_storage_data
   ```

3. **Remove bind mount data** (this will delete vStorage logs):
   ```bash
   > ./vstorage
   ```

4. **Remove Docker images** (optional):
   ```bash
   docker image rm microservice_gateway microservice_worker microservice_storage
   ```


## File Structure

```
├── docker-compose.yaml
├── service1/
│   ├── Dockerfile
│   ├── index.js
│   └── package.json
├── service2/
│   ├── Dockerfile
│   ├── app.py
│   └── requirements.txt
├── storage/
│   ├── Dockerfile
│   ├── index.js
│   └── package.json
├── vstorage
└── docker-status.txt
└── README.md
└── Report.pdf
```

## Network Architecture

- **appnet**: Bridge network connecting all services
- Services communicate using container names as hostnames
- Only Service1 (port 8199) is exposed to host
