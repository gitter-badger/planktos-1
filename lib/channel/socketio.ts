import * as socketio from 'socket.io-client';
import { EventEmitter } from 'events';
import { ChannelManager, Channel, Message } from './';

/* Communication to/from a server using socketio as the transport */
export class SocketioChannel extends EventEmitter implements Channel {
  private socket: SocketIOClient.Socket;

  constructor(masterUrl?: string) {
    super();
    this.socket = socketio.connect(masterUrl);
    this.socket.on('message', (msg: Message) => {
      console.info("SOCKETIO RECV", JSON.stringify(msg));
      this.emit('message', msg);
    });
    this.socket.once('connect', () => {
      this.emit('connect');
    });
    this.socket.once('disconnect', () => {
      this.socket = null;
      this.emit('disconnect');
    });
  }

  getRemoteId() {
    return '/#' + this.socket.id;
  }

  sendMessage(msg: Message) {
    console.info("SOCKETIO SEND", JSON.stringify(msg));
    this.socket.send(msg);
  }

  disconnect() {
    this.socket.disconnect();
  }
}


