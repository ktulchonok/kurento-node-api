const BaseHandler = require('./base_handler');
const _ = require('lodash');
const fs = require('fs');
const hbjs = require('handbrake-js');
const videoDir = '/tmp/kurento-video';

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

  removeClient(id) {
    const client = _.find(this.clients, {
      id
    });
    if (client) {
      this._removeClient(client);
      if (client.recorder) {
        client.recorder.stopAndWait().then(() => {
          // fs.unlink(url.parse(client.recorder.getUri()).path, _.noop);
        });
        client.recorder.release();
        const videoID = this.id;
        hbjs.spawn({
          input: `/${videoDir}/${videoID}.webm`,
          output: `/${videoDir}/${videoID}.mp4`
        })
        .on('error', err => {
          // invalid user input, no video found etc
          console.error('%s.mp4 \nConverter error: ', err)
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