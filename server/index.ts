import * as socketio from 'socket.io';
import * as http from 'http';
import * as express from 'express';
import { Message } from '../lib/channel';

export class Server {
  private app = express();
  private server = http.createServer(this.app);
  private io = socketio(this.server);
  private peers: string[] = [];

  constructor() {
    // Serve static content from the `app`
    this.app.use(express.static(__dirname + '/../app'));

    // When we receive a new connection/peer
    this.io.on('connection', (socket: SocketIO.Socket) => {

      // keep track of all the peers
      this.peers.push(socket.id);

      socket.on('message', (msg: Message) => {
        this.onSocketMessage(msg, socket);
      });

      socket.on('disconnect', () => {
        // Remove peer from list
        this.peers.splice(this.peers.indexOf(socket.id), 1);
      });

    });
  }

  listen(port=0) {
    return new Promise(resolve => {
      this.server.listen(port, () => {
        console.log('listening on *:' + this.server.address().port);
        resolve(this);
      });
    });
  }

  destroy() {
    this.server.close();
    this.server.unref();
  }

  address() {
    return this.server.address();
  }

  private onSocketMessage(msg: Message, socket: SocketIO.Socket) {
    console.info("RECV", msg.type, JSON.stringify(msg.content));

    if (msg.type == "findPeers") {
      // The peer requested more peers
      this.findPeers(socket);
    } else if (msg.type == "relay") {
      // The peer wants a message relayed to another
      this.relayToPeer(socket, msg);
    } else {
      console.warn("Unknown type", msg);
    }
  }

  private findPeers(socket: SocketIO.Socket) {
    const peerList = this.peers.slice(); //Obtain a copy
    peerList.splice(peerList.indexOf(socket.id), 1); // Remove peer
    const msg: Message = {
      type: 'newPeers',
      content: peerList
    };
    socket.send(msg);
  }

  private relayToPeer(socket: SocketIO.Socket, msg: Message) {
    if (this.io.sockets.connected[msg.content.toId]) {
      this.io.sockets.connected[msg.content.toId].send(msg);
    }
  }
}

if (require.main === module) {
  const s = new Server();
  s.listen(8000);
}
