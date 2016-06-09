import * as socketio from 'socket.io';
import * as http from 'http';
import * as express from 'express';
import { Message } from '../lib/channel';

const app = express();
const server = http.createServer(app);
const io = socketio(server);
const peers: string[] = [];

// Serve static content from the `app`
app.use(express.static(__dirname + '/../app'));

// When we receive a new connection/peer
io.on('connection', (socket: SocketIO.Socket) => {

  // keep track of all the peers
  peers.push(socket.id);

  socket.on('message', function(msg: Message) {
    console.info("RECV", msg.type, JSON.stringify(msg.content));

    if (msg.type == "findPeers") {
      // The peer requested more peers
      findPeers(socket);
    } else if (msg.type == "relay") {
      // The peer wants a message relayed to another
      relayToPeer(socket, msg);
    } else {
      console.warn("Unknown type", msg);
    }
  });

  socket.on('disconnect', function() {
    // Remove peer from list
    peers.splice(peers.indexOf(socket.id), 1);
  });

});

function findPeers(socket: SocketIO.Socket) {
  const peerList = peers.slice(); //Obtain a copy
  peerList.splice(peerList.indexOf(socket.id), 1); // Remove peer
  const msg: Message = {
    type: 'newPeers',
    content: peerList
  };
  socket.send(msg);
}

function relayToPeer(socket: SocketIO.Socket, msg: Message) {
  if (io.sockets.connected[msg.content.toId]) {
    io.sockets.connected[msg.content.toId].send(msg);
  }
}

export function startServer(port=0) {
  return new Promise<http.Server>(resolve =>{
    server.listen(port, function(){
      console.log('listening on *:' + server.address().port);
      resolve(server);
    });
  });
}

if (require.main === module) {
  startServer(8000);
}
