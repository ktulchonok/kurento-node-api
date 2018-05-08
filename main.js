const path = require('path');
const express = require('express');
const https = require('https');
const fs = require('fs');
const enableSignaling = require('./server/signaling').enableSignaling;

const app = express();

const options = {
  key: fs.readFileSync('keys/app_key.pem'),
  cert: fs.readFileSync('keys/app_cert.pem')
};

app.use(express.static(path.join(__dirname, 'static')));

const server = https.createServer(options, app).listen(3001, function (err) {
  err && console.log(err)
  console.log('Kurento App. started');
});

enableSignaling(server);