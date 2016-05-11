import * as socketio from 'socket.io-client';

export type OnMessage = (from: Peer, msg: Message) => void;
type PeerWatcher = (peer: Peer)=>void;
type PeerMap = {[index: string]: Peer};

export interface Message {
  type: string;
  content: any;
}

export interface Peer {
  id: string;
  sendMessage(type: string, content: any): void;
};

/* A peer that relays messages through a server */
class RelayPeer implements Peer {
  id: string;

  private master: MasterPeer;

  constructor(master: MasterPeer, id: string) {
    this.id = id;
    this.master = master;
  }

  sendMessage(type: string, content: any) {
    const data: {peerId: string, msg: Message} = {
      peerId: this.id,
      msg: {
        type: type,
        content: content
      }
    };

    // Sends message to server which relays it to the peer
    this.master.sendMessage('relay', data);
  }
};

/* This peer is connected to the socketio server */
export class MasterPeer implements Peer {

  id: string = "unconnected";
  peers: PeerMap = {};
  peerWatchers: PeerWatcher[] = [];

  private socket: SocketIOClient.Socket;
  private msgCallback: OnMessage;

  constructor(msgCallback: OnMessage) {
    this.msgCallback = msgCallback;
  }

  connect(masterUrl?: string) {
    this.socket = socketio.connect(masterUrl);
    this.socket.on('connect', () => {
      this.id = this.socket.id;
    });
    this.socket.on('message', (msg: Message) => this.onSocketioMessage(msg));
    this.findPeers();
  }

  sendMessage(type: string, content: any) {
    const msg: Message = { type: type, content: content };
    console.log("SEND", msg);
    this.socket.send(msg);
  }

  findPeers() {
    // Request from the server to give us peers
    this.sendMessage('findPeers', {});
  }

  /* Called when we received a message from the server */
  private onSocketioMessage(msg: Message) {
    console.log('RECV', msg);
    if (msg.type == 'relayToPeer') {
      this.onPeerMessage(msg.content.peerId, msg.content.msg);
    } else if (msg.type == 'newPeers') {
      this.onNewPeers(msg.content);
    } else {
      console.log("Received message with unknown type", msg);
    }
  }

  private onPeerMessage(peerId: string, msg: Message) {
    if (peerId in this.peers) {
      const from = this.peers[peerId];
      this.msgCallback(from, msg);
    } else {
      console.log("Received message from unknown peer", peerId, msg);
    }
  }

  private onNewPeers(peerIds: string[]) {
    for (const peerId of peerIds) {
      if (peerId in this.peers)
        continue; // Already have this peer

      const peer = new RelayPeer (this, peerId);
      this.peers[peerId] = peer;

      // Notify anyone watching that we just received a new peer
      this.peerWatchers.forEach((f) => f(peer));
    }
  }
}
