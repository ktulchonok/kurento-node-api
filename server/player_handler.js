const BaseHandler = require('./base_handler');
const _ = require('lodash');
const url = require('url');
const recUri = `file:///tmp/rec.webm`;

class PlayerHandler extends BaseHandler {

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
      if (client.player) {
        client.player.release();
      }
    }
  }

  async connect() {
    const [client] = this.clients;
    try {
      const rtc = client.endpoint;
      const player = await this.pipeline.create('PlayerEndpoint', {
        uri: recUri,
        // useEncodedMedia: false
      })

      await player.connect(rtc);
      await player.play();
      client.player = player;

      console.log('Player connected!');
    } catch (error) {
      console.error(`Error connecting media workflow`, error);
    }
  }
}

module.exports = PlayerHandler;