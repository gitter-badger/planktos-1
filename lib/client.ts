import * as socketio from 'socket.io-client';

type Watcher = ()=>void;

interface Peer {
  id: string;
}

interface Block {
  content: any;
}

export default class Client {
  peers: Peer[] = [];
  blocks: Block[] = [];
  blockWatchers: Watcher[] = [];
  peerWatchers: Watcher[] = [];

  private socket: SocketIOClient.Socket = null;

  connect(masterUrl?: string) {
    var client = this;
    this.socket = socketio.connect(masterUrl);
    this.socket.on('message', (msg: any) => this.onSocketioMessage(msg));
    this.findPeers();
  }

  disconnect() {
    this.socket.disconnect();
    this.socket = null;
    this.peers = [];
  }

  getId(): string {
    return this.socket.id;
  }

  findPeers() {
      this.sendServerRequest('findPeers', {});
  }

  pushBlock(content: any) {
    let block: Block = {content: content};
    this.blocks.push(block);
    this.peers.forEach((peer) => {
      this.sendPeerMessage(peer, "pushBlocks", [ block ]);
    });
  }

  pullBlocks() {
    this.peers.forEach((peer) => {
      this.sendPeerMessage(peer, "pullBlocks", {});
    });
  }

  private sendServerRequest(method: string, reqData: any) {
    let request = {
      'method': method,
      'data': reqData
    };

    console.log("SEND", request);

    this.socket.send(request);
  }

  private onPeerMessageRecv(peer: Peer, data: any) {
    console.log("P2P Rcv ", peer.id, data);

    if (data.type == "pullBlocks") {
      this.sendPeerMessage(peer, "pushBlocks", this.blocks);
      this.blockWatchers.forEach((f) => f());
    } else if (data.type == "pushBlocks") {
      mergeInto (this.blocks, data.message);
      this.blockWatchers.forEach((f) => f());
    }
  }

  private sendPeerMessage(peer: Peer, type: string, message: any) {
    var data = {
      peerId: peer.id,
      data: {
        type: type,
        message: message
      }
    };
    console.log("P2P Send ", peer.id, data.data.type, data.data.message);
    this.sendServerRequest ('relayToPeer', data);
  }

  private onSocketioMessage(response: any) {
    console.log('RECV', response);
    if (response.method == 'relayToPeer') {
      this.onPeerMessageRecv({ id: response.result.peerId }, response.result.data);
    } else if (response.method == 'findPeers') {
      mergeInto(this.peers, response.result.map((p:string) => ({id: p})));
      this.peerWatchers.forEach((f) => f());
    } else if (response.method == 'newPeer') {
      this.peers.push({ id: response.result.peerId });
      this.peerWatchers.forEach((f) => f());
    }
  }
}

function mergeInto<T>(listA: T[], listB: T[]) {
  listB.forEach(function(e) {
    if (listA.indexOf(e) === -1)
      listA.push(e);
  });
};
