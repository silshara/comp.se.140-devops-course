from flask import Flask, Response
from datetime import datetime, timezone
import shutil, time, os, requests

app = Flask(__name__)
ps_start = time.time()  # service start time for service runtime uptime

PORT = 8001
STORAGE_URL = 'http://storage:8000/log'
VSTORAGE_PATH = '/vstorage'

# Creates a status log entry for the current container.
def create_status_entry():
    # system uptime
    current_datetime = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    uptime_seconds = time.time() - ps_start
    uptime_hours = f"{uptime_seconds / 3600:.2f}"

    try:
        free_mb = round(shutil.disk_usage('/').free / (1024*1024))
    except:
        free_mb = 0
    return f"{current_datetime}, uptime {uptime_hours} hours, free disk in root: {free_mb} Mbytes"

# Writes the entry to vstorage
def append_vstorage(line):
    vstorage_path = os.path.join(VSTORAGE_PATH, 'log.txt') if os.path.isdir(VSTORAGE_PATH) else VSTORAGE_PATH
    dirpath = os.path.dirname(vstorage_path)
    if dirpath and not os.path.exists(dirpath):
        try:
            os.makedirs(dirpath, exist_ok=True)
        except:
            pass
    with open(vstorage_path, 'a') as f:
        f.write(line + '\n')

# GET /status
# This endpoint is called only by Service1 (the gateway).
@app.route('/status', methods=['GET'])
def status():
    # 5) Service2 creates the status record
    service2_entry = create_status_entry()

    # 6) Service2 sends to Storage (POST)
    try:
        requests.post(STORAGE_URL, data=service2_entry, headers={'Content-Type': 'text/plain'}, timeout=2)
    except Exception as e:
        app.logger.error("Failed POST to storage: %s", e)

    # 7) Service2 writes to vStorage
    try:
        append_vstorage(service2_entry)
    except Exception as e:
        app.logger.error("Failed append to vstorage: %s", e)

    # 8) Service2 sends the response to service1
    return Response(service2_entry, mimetype='text/plain')

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=PORT)