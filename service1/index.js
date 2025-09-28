const express = require('express');
const axios = require('axios');
const fs = require('fs');
const { execSync } = require('child_process');

const app = express();
app.use(express.text());

const PORT = 8199;
const STORAGE_URL = 'http://storage:8000/log';
const SERVICE2_URL = 'http://service2:8001/status';
const VSTORAGE_PATH = '/vstorage';

/**
 * Creates a status log entry for the current container.
**/
function CreateStatusEntry() {
  const currentDateTime = new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
  let containerUptimeHours = process.uptime() / 3600;
  containerUptimeHours = containerUptimeHours.toFixed(2);

  let freeDiskMB = 0;
  try {
    // Run df in MB and split into lines
    const dfOutputLines = execSync("df -m /").toString().trim().split("\n");

    // Take the last line (the data row with filesystem info)
    const filesystemRow = dfOutputLines[dfOutputLines.length - 1]
      .trim()
      .split(/\s+/);

    // Extract the "Available" column (index 3) in MB
    const availableDiskMB = parseInt(filesystemRow[3], 10);
    if (!isNaN(availableDiskMB)) {
            freeDiskMB = availableDiskMB;
        }
  } catch (e) {
    freeDiskMB = 0;
  }

  return `${currentDateTime}, uptime ${containerUptimeHours} hours, free disk in root: ${freeDiskMB} MBytes`;
}

/**
 * Writes the entry to vstorage
**/
function appendToVstorage(line) {
  const targetStorage = fs.existsSync(VSTORAGE_PATH) && fs.statSync(VSTORAGE_PATH).isDirectory() ? `${VSTORAGE_PATH}/log.txt` : VSTORAGE_PATH;
  fs.appendFileSync(targetStorage, line + '\n', 'utf8');
}

/**
 * GET /status
 *
 * Handles status requests for the system.
**/
app.get('/status', async (req, res) => {
  try {
    // 1) Service1 creates the status record
    const service1Entry = CreateStatusEntry();

    // 2) Service1 sends to Storage (POST)
    await axios.post(STORAGE_URL, service1Entry, {
      headers: { 'Content-Type': 'text/plain' },
      timeout: 2000
    }).catch(err => {
      console.error('Storage POST failed:', err.message);
    });

    // 3) Service1 writes to vStorage
    try { appendToVstorage(service1Entry); } catch (e) { console.error('append to vstorage failed:', e.message); }

    // 4) Service1 forwards to Service2
    const service2Request = await axios.get(SERVICE2_URL, { timeout: 2000 });
    const service2Entry = service2Request.data;

    // 9) combine and return
    res.type('text/plain').send(service1Entry + '\n' + service2Entry);
  } catch (err) {
    console.error(err);
    res.status(500).send('Internal error: ' + err.message);
  }
});

/**
 * GET /log
 *
 * Handles log requests for the system.
**/
app.get('/log', async (req, res) => {
  try {
    const storageRequest = await axios.get(STORAGE_URL, { timeout: 2000 });
    res.type('text/plain').send(storageRequest.data);
  } catch (err) {
    console.error('GET /log failed:', err.message);
    res.status(502).send('Bad gateway: ' + err.message);
  }
});

app.delete('/log', async (req, res) => {
  try {
    const deleteResponse = await axios.delete(STORAGE_URL);
    res.status(deleteResponse.status).send(deleteResponse.data);
  } catch (err) {
    console.error("Failed to proxy DELETE /log:", err.message);
    res.status(500).send("Failed to clear logs");
  }
});

app.delete('/vstorage', (req, res) => {
  fs.writeFile(VSTORAGE_PATH, '', (err) => {
    if (err) {
      console.error("Failed to clear vStorage:", err);
      return res.status(500).send('failed to clear vStorage');
    }
    res.send('vStorage cleared');
  });
});

app.listen(PORT, '0.0.0.0', () => console.log(`Service1 (gateway) listening on ${PORT}`));