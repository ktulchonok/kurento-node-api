const BaseHandler = require('./base_handler');
const _ = require('lodash');

class FourWayHandler extends BaseHandler {

  constructor(kurentoClient, id) {
    super(kurentoClient, id);
    this.composite = null;
  }

  async getComposite() {
    if(this.composite !== null) {
      console.log("Composer already exists!");
      return;
    }

    if(this.pipeline !== null) {
      try {
        console.log('status:: creating composite');
        this.composite = await this.pipeline.create('Composite');
      } catch(error) {
        console.log(`ERR:: ${error.message}`);
      }
    }
  }

  async createHubPort() {
    try{
      await this.getComposite();
      let hubPort = await this.composite.createHubPort();
      return hubPort;
    } catch(error) {
      console.log(`ERR:: ${error.message}`);
    }
  }

  addClient(id, params, channel) {
    let numClients = _.size(this.clients);
    if(numClients === 4) {
      console.log('Client count: %i', _.size(this.clients));
      return false;
    } else {
      this._addClient(id, params, channel).then(() => {
        if(_.size(this.clients) > 0) {
          this.connect(id);
        }
      })
      console.log('Client count: %i', _.size(this.clients));
      return true;
    }
  }

  removeClient(id) {
    let client = _.find(this.clients, {id});
    if(typeof client !== undefined) {
      client.hubPort && client.hubPort.release();
      this._removeClient(client);
    }
    console.log('Client count: %i', _.size(this.clients));
  }

  async connect(id) {
    try {
      let client = _.find(this.clients, {id});
      console.log(`client ${client.id} connected to hub.`);

      client.hubPort = await this.createHubPort();
      client.endpoint.connect(client.hubPort);
      client.hubPort.connect(client.endpoint);
    } catch(error) {
      console.error(`Error connecting media workflow`, error);
    }
  }

}

module.exports = FourWayHandler;
