const BaseHandler = require('./base_handler');
const _ = require('lodash');
const fs = require('fs');
// const url = require('url');
// const recUri = `file:///tmp/rec.webm`;

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
        // fs.createReadStream('/tmp/rec.webm').pipe(fs.createWriteStream('static/rec.webm'));
        // setTimeout(() => {
        //   fs.unlink('static/rec.webm');
        // }, 5000)
      }
    }
  }

  async connect() {
    const [client] = this.clients;
    try {
      const rtc = client.endpoint;
      const rec = await this.pipeline.create('RecorderEndpoint', {
        uri: `file:///tmp/rec-${client.id}.webm`,
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