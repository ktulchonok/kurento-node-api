const url = require('url');
const WebSocket = require('ws');
const Kurento = require('kurento-client');
const uuidv4 = require('uuid/v4');

const OneToOneHandler = require('./one_to_one_handler');
const RecorderHandler = require('./recorder_handler');

//process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

const kurentoUrl = process.env.KURENTO_URL || 'ws://localhost:8888/kurento';
let kurentoClient = null;

getKurentoClient();

const AVAILABLE_HANDLERS = {
  'one-to-one': OneToOneHandler,
  'recorder': RecorderHandler,
};

const sessions = {};
for (var handler in AVAILABLE_HANDLERS) {
  sessions[handler] = {};
}

function stop(ws) {
  if (ws.readyState === WebSocket.OPEN) {
    ws.close();
  }
}

function stopWithError(ws, error) {
  console.error(error);
  stop(ws);
}

async function getKurentoClient() {
  if (kurentoClient === null) {
    kurentoClient = await Kurento(kurentoUrl);
    console.log('Connected to Kurento');
  }
  return kurentoClient;
}

function enableSignaling(server, kurentoServer) {
  const wss = new WebSocket.Server({
    server: server
  });

  wss.on('connection', async (ws) => {
    let parsedUrl = url.parse(ws.upgradeReq.url);

    // /:handlerName/:id[/params...]
    let urlSegments = parsedUrl.pathname.split('/').filter(s => s.length);
    urlSegments.shift(); // Drop /ws
    if (urlSegments.length > 1) {
      let handlerName = urlSegments.shift();
      let sessionId = urlSegments.shift();
      let handler = AVAILABLE_HANDLERS[handlerName];
      if (handler === undefined) {
        console.error(`Unknown handler ${handlerName}`);
        ws.close();
        return
      }
      let session = sessions[handlerName][sessionId];

      if (!session) {
        session = new handler(await getKurentoClient(kurentoUrl), sessionId);
        await session.init();
        session.on('shutdown', () => {
          delete sessions[handlerName][sessionId];
        });
        sessions[handlerName][sessionId] = session;
      }

      let clientId = uuidv4();

      let addSuccess = session.addClient(clientId, urlSegments, message => {
        console.log('SEND', message.action);
        ws.send(JSON.stringify(message));
      });

      if (!addSuccess) {
        stopWithError(ws, `Participant limit reached for session of type ${handlerName}`);
        return;
      }

      ws.on('error', error => {
        session.removeClient(clientId);
        stopWithError(ws, error);
      })

      ws.on('close', _ => {
        session.removeClient(clientId);
        stop(ws);
      });

      ws.on('message', _message => {
        let message = JSON.parse(_message);
        if (message.action === 'stop') {
          session.stopRec(clientId);
        }
        console.log('RECV', message.action)
        if (message.action === 'iceCandidate') {
          session.addIceCandidate(clientId, message.candidate);
        } else if (message.action === 'offer') {
          session.receiveOffer(clientId, message.offer);
        } else {
          session.removeClient(clientId);
          stopWithError(ws, `Unhandled message '${message.action}'`);
        }
      });
    } else {
      stopWithError(ws, `Invalid path ${parsedUrl.pathname}`);
    }
  });
}

module.exports = {
  AVAILABLE_HANDLERS,
  enableSignaling
};