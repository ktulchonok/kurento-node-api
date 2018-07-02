const path = require('path');
const express = require('express');
const https = require('https');
const fs = require('fs');
const enableSignaling = require('./server/signaling').enableSignaling;

const app = express();

const options = {
  key: fs.readFileSync('keys/private.key'),
  cert: fs.readFileSync('keys/certificate.crt'),
  ca: fs.readFileSync('keys/ca_bundle.crt')
};

app.use(express.static(path.normalize('/tmp/kurento-video')));

const server = https.createServer(options, app).listen(3001, function (err) {
  err && console.log(err)
  console.log('Kurento App. started');
});

enableSignaling(server);