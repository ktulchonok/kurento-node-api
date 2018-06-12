const BaseHandler = require('./base_handler');
const _ = require('lodash');
const fs = require('fs');
const url = require('url');

class ConferenceHandler extends BaseHandler {

  constructor(kurentoClient, id) {
    super(kurentoClient, id);
  }

  async getComposite(client) {
    if (client.composite) {
      console.log("Composer already exists!");
      return;
    }

    if (this.pipeline) {
      try {
        console.log('status:: creating composite');
        client.composite = await this.pipeline.create('Composite');
      } catch (error) {
        console.log(`ERR:: ${error.message}`);
      }
    }
  }

  async createHubPort(client) {
    try {
      await this.getComposite(client);
      let hubPort = await client.composite.createHubPort();
      return hubPort;
    } catch (error) {
      console.log(`ERR:: ${error.message}`);
    }
  }

  addClient(id, params, channel) {
    let numClients = _.size(this.clients);
    if (numClients === 4) {
      console.log('Client count: %i', _.size(this.clients));
      return false;
    } else {
      this._addClient(id, params, channel).then(() => {
        if (_.size(this.clients) > 0) {
          this.connect(id);
        }
      })
      console.log('Client count: %i', _.size(this.clients));
      return true;
    }
  }

  removeClient(id) {
    let client = _.find(this.clients, {
      id
    });
    if (client) {
      this._removeClient(client);
    }
  }

  async connect(id) {
    try {
      const res = _.groupBy(this.clients, {
        id
      });
      const client = _.get(res, 'true[0]');
      const otherClients = _.get(res, 'false', []);

      await _.forEach(otherClients, async (otherClient) => {
        otherClient.hubPort = await this.createHubPort(client);
        // otherClient.endpoint.connect(otherClient.hubPort);
        otherClient.hubPort.connect(otherClient.endpoint);
      })

      console.log('Clients connected!');

    } catch (error) {
      console.error(`Error connecting media workflow`, error);
    }
  }
}

module.exports = ConferenceHandler;