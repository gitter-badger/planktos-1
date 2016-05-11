import * as socketio from 'socket.io';
import * as http from 'http';
import * as express from 'express';
import { Message } from './peer';

const app = express();
const server = http.createServer(app);
const io = socketio(server);
const port = 8000;
const peers: string[] = [];

// Serve static content from the `app`
app.use(express.static(__dirname + '/../app'));

// When we receive a new connection/peer
io.on('connection', (socket: SocketIO.Socket) => {

  // keep track of all the peers
  peers.push(socket.id);

  // Broadcast the peer's info to all other peers
  const newPeerMsg: Message = {
    type: 'newPeers',
    content: [socket.id]
  };
  socket.broadcast.send(newPeerMsg);

  socket.on('message', function(msg: Message) {
    console.log("Received message", msg.type, msg.content);

    if (msg.type == "findPeers") {
      // The peer requested more peers
      findPeers(socket);
    } else if (msg.type == "relay") {
      // The peer wants a message relayed to another
      relayToPeer(socket, msg.content);
    } else {
      console.log("Unknown type", msg);
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
};

function relayToPeer(socket: SocketIO.Socket, content: any) {
  if (io.sockets.connected[content.peerId]) {
    const relayMsg: Message = {
      type: 'relayToPeer',
      content: {
        peerId: socket.id,
        msg: content.msg
      }
    };
    console.log("RELAYED", relayMsg);
    io.sockets.connected[content.peerId].send(relayMsg);
  }
};

export function startServer() {
  server.listen(port, function(){
    console.log('listening on *:' + port);
  });
};

if (require.main === module) {
  startServer();
}
