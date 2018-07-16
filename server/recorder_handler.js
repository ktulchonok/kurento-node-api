const BaseHandler = require('./base_handler');
const _ = require('lodash');
const fs = require('fs');
const hbjs = require('handbrake-js');
const AWS = require('aws-sdk');

AWS.config.loadFromPath('./keys/configS3.json');
const videoDir = '/tmp/kurento-video';
const s3Bucket = new AWS.S3({
  params: {
    Bucket: '321jobs',
    timeout: 6000000
  }
});

class RecorderHandler extends BaseHandler {

  constructor(kurentoClient, id) {
    super(kurentoClient, id);
  }

  addClient(id, params, channel) {
    const numClients = _.size(this.clients);
    if (numClients > 0) {
      return false;
    } else {
      this._addClient(id, params, channel).then(() => {
        this.connect();
      })
      return true;
    }
  }

  uploadFile(fileName) {
    const filePath = `${videoDir}/${fileName}`;
    fs.readFile(filePath, function (err, fileData) {
      if (err) return console.log(err);

      let params = {
        ACL: 'public-read',
        Key: fileName,
        Body: fileData,
        ContentType: 'binary'
      };

      s3Bucket.putObject(params, (error, data) => {
        if (error) return console.log(error);

        console.log("Successfully uploaded %s", fileName);
        fs.unlink(filePath);
      });
    });
  }

  removeClient(id) {
    const client = _.find(this.clients, {
      id
    });
    if (client) {
      this._removeClient(client);
      if (client.recorder) {
        client.recorder.stopAndWait().then(() => {
        });
        client.recorder.release();
        const videoID = this.id;
        hbjs.spawn({
            input: `${videoDir}/${videoID}.webm`,
            output: `${videoDir}/${videoID}.mp4`
          })
          .on('error', err => {
            // invalid user input, no video found etc
            console.error('%s.mp4 \nConverter error: ', videoID, err)
          })
          .on('progress', progress => {
            console.log(
              '%s.mp4 \nPercent complete: %s, ETA: %s',
              videoID,
              progress.percentComplete,
              progress.eta
            )
          })
          .on('complete', () => {
            console.log('%s.mp4 complete!', videoID);
            this.uploadFile(`${videoID}.webm`);
            this.uploadFile(`${videoID}.mp4`);
          })
      }
    }
  }

  async connect() {
    const [client] = this.clients;
    try {
      const rtc = client.endpoint;
      const rec = await this.pipeline.create('RecorderEndpoint', {
        uri: `file://${videoDir}/${this.id}.webm`,
        stopOnEndOfStream: true,
        mediaProfile: 'WEBM'
      });

      await rtc.connect(rec);
      await rec.record();
      client.recorder = rec;

      console.log('Recorder connected!');
    } catch (error) {
      console.error(`Error connecting media workflow`, error);
    }
  }
}

module.exports = RecorderHandler;