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
    console.log('addClient', numClients);
    if (numClients === 2) {
      return false;
    } else {
      this._addClient(id, params, channel).then(() => {
        if (_.size(this.clients) === 2) {
          this.connect();
        }
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
    }
  }

  async connect() {
    let [clientA, clientB] = this.clients;
    try {
      let rtcA = clientA.endpoint;
      let rtcB = clientB.endpoint;

      await rtcA.connect(rtcB);
      await rtcB.connect(rtcA);

      console.log('Clients connected!');

    } catch (error) {
      console.error(`Error connecting media workflow`, error);
    }
  }
}

module.exports = OneToOneHandler;