const BaseHandler = require('./base_handler');
const _ = require('lodash');
const fs = require('fs');
const url = require('url');

class RecorderHandler extends BaseHandler {

  constructor(kurentoClient, id) {
    super(kurentoClient, id);
  }

  addClient(id, params, channel) {
    console.log('addClient');
    let numClients = _.size(this.clients);
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
    let client = _.find(this.clients, {
      id
    });
    if (client) {
      this._removeClient(client);
      if (client.recorder) {
        client.recorder.stopAndWait().then(() => {
          // fs.unlink(url.parse(client.recorder.getUri()).path, _.noop);
        });
        client.recorder.release();
      }
    }
  }

  async connect() {

    let [client] = this.clients;
    try {
      let rtc = client.endpoint;

      let rec = await this.pipeline.create('RecorderEndpoint', {
        uri: `file:///tmp/rec.webm`,
        stopOnEndOfStream: true,
        mediaProfile: 'WEBM'
      });

      // let webRtc = await this.pipeline.create('WebRtcEndpoint');
      // let player = await this.pipeline.create("PlayerEndpoint", {
      //   uri: `file:///tmp/rec.webm`
      // })
      // player.on('EndOfStream', function (event) {
      //   console.log('endOfStream');
      //   client.player.release();
      // });

      await rtc.connect(rec);
      await rec.record();
      client.recorder = rec;

      // await rtc.connect(player);
      // await player.connect(webRtc);
      // await webRtc.connect(rtc);
      // await rtc.connect(webRtc);
      // await player.play();
      // client.player = player;
  
      console.log('Connected!');

    } catch (error) {
      console.error(`Error connecting media workflow`, error);
    }
  }
}

module.exports = RecorderHandler;