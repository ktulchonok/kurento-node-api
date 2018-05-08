const BaseHandler = require('./base_handler');
const _ = require('lodash');
const fs = require('fs');
const url = require('url');

class OneToOneHandler extends BaseHandler {

  constructor(kurentoClient, id) {
    super(kurentoClient, id);
  }

  addClient(id, params, channel) {
    let numClients = _.size(this.clients);
    if(numClients === 2) {
      return false;
    } else {
      this._addClient(id, params, channel).then(() => {
        if(_.size(this.clients) === 2) {
          this.connect();
        }
      })
      return true;
    }
  }

  removeClient(id) {
    let client = _.find(this.clients, {id});
    if(client) {
      this._removeClient(client); if(client.recorder) {
        client.recorder.stopAndWait().then(() => {
          // fs.unlink(url.parse(client.recorder.getUri()).path, _.noop);
        });
        client.recorder.release();
      }
    }
  }

  async connect() {
    let [clientA, clientB] = this.clients;
    try {
      let recA = await this.pipeline.create('RecorderEndpoint', {
        uri: `file:///tmp/rec-${clientA.id}.webm`,
        stopOnEndOfStream: true,
        mediaProfile: 'WEBM'
      });

      let recB = await this.pipeline.create('RecorderEndpoint', {
        uri: `file:///tmp/rec-${clientB.id}.webm`,
        stopOnEndOfStream: true,
        mediaProfile: 'WEBM'
      });

      let rtcA = clientA.endpoint;
      let rtcB = clientB.endpoint;
      await rtcA.connect(recA);
      await rtcB.connect(recB);

      await rtcA.connect(rtcB);
      await rtcB.connect(rtcA);

      await recA.record();
      await recB.record();

      clientA.recorder = recA;
      clientB.recorder = recB;
      console.log('Connected!');

    } catch(error) {
      console.error(`Error connecting media workflow`, error);
    }
  }
}

module.exports = OneToOneHandler;
