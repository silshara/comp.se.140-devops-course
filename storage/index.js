const express = require('express');
const fs = require('fs');
const path = require('path');
const app = express();
app.use(express.text({ type: 'text/plain' }));

const PORT = 8000;
const LOGPATH = '/data/log.txt';

// ensure /data exists
fs.mkdirSync('/data', { recursive: true });

/**
 * Append incoming record (text/plain)
**/
app.post('/log', (req, res) => {
  const body = req.body || '';
  try {
    fs.appendFileSync(LOGPATH, body + '\n', 'utf8');
    res.status(201).send('ok');
  } catch (e) {
    console.error('append failed', e);
    res.status(500).send('fail');
  }
});

/**
 * Return whole log
**/
app.get('/log', (req, res) => {
  let data = '';
  try {
    data = fs.readFileSync(LOGPATH, 'utf8');
  } catch (e) {
    data = '';
  }
  res.type('text/plain').send(data);
});

/**
 * Clear the log. This is an extra endpoint
**/
app.delete('/log', (req, res) => {
  fs.writeFile(LOGPATH, '', (err) => {
    if (err) return res.status(500).send('failed to clear');
    res.send('cleared');
  });
});

app.listen(PORT, '0.0.0.0', () => console.log(`Storage service listening on ${PORT}`));