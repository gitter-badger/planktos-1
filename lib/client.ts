import {MasterPeer, Peer, Message} from './peer';

type Watcher = ()=>void;

type Block = string;

/* Main controller for p2p code */
export default class Client {
  blocks: Block[] = [];
  blockWatchers: Watcher[] = [];
  master: MasterPeer = null;

  constructor() {
    const onMessage = (peer: Peer, msg: Message) => {
      this.onPeerMessage(peer, msg);
    };
    this.master = new MasterPeer(onMessage);
  }

  connect(masterUrl?: string) {
    this.master.connect(masterUrl);
  }

  /* Sends the block to every known peer */
  pushBlock(content: string) {
    this.blocks.push(content);
    for (const peerId in this.master.peers) {
      const peer = this.master.peers[peerId];
      peer.sendMessage("pushBlocks", [ content ]);
    }
  }

  /* Request from peers for them to send us their blocks */
  pullBlocks() {
    for (const peerId in this.master.peers) {
      const peer = this.master.peers[peerId];
      peer.sendMessage("pullBlocks", {});
    }
  }

  private onPeerMessage(peer: Peer, msg: Message) {
    console.log("P2P Rcv ", peer.id, msg, this);

    if (msg.type == "pullBlocks") {
      // Someone requrested our blocks, so send it to them
      peer.sendMessage("pushBlocks", this.blocks);
    } else if (msg.type == "pushBlocks") {
      // We just received blocks so add them to ours
      mergeInto (this.blocks, msg.content);
      this.blockWatchers.forEach((f) => f());
    }
  }
}

function mergeInto<T>(listA: T[], listB: T[]) {
  listB.forEach(function(e) {
    if (listA.indexOf(e) === -1)
      listA.push(e);
  });
};
