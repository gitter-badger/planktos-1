import {ChannelManager, Channel, Message, SocketioChannel} from './channel';
import { EventEmitter } from 'events';

type Block = string;

/* A remote peer that can be communicated with.
 * Peers can send/recveive blocks through their
 * channel (aka connection).
 */
class Peer {
  channel: Channel;

  constructor(c: Channel) {
    this.channel = c;
  }

  /* Requests that the peer store the given `blocks` */
  pushBlocks(blocks: Block[]) {
    this.channel.sendMessage({type: 'pushBlocks', content: blocks });
  }

  /* Requests from the peer to send us it's blocks */
  pullBlocks() {
    this.channel.sendMessage({type: 'pullBlocks', content: {} });
  }
}

/* Main controller for p2p code */
export default class Client {
  private events = new EventEmitter();

  blocks: Block[] = [];
  peers: {[i: string]: Peer} = {};
  server: Channel;
  channelManager: ChannelManager;
  localId: string;

  connect(masterUrl?: string) {
    // Initiate a connection to the server
    const c = new SocketioChannel(masterUrl);
    c.onConnect((localId) => {
      this.localId = localId;
      // Start the channel manager in order to connect to peers
      this.channelManager = new ChannelManager(localId, c);
      this.channelManager.onConnect((c) => this.handleNewConnections(c));
    });
    this.server = c;
  }

  /* Sends the block to every known peer */
  pushBlock(content: string) {
    this.blocks.push(content);
    for (const peerId in this.peers) {
      const peer = this.peers[peerId];
      peer.pushBlocks([ content ]);
    }
  }

  /* Request from peers for them to send us their blocks */
  pullBlocks() {
    for (const peerId in this.peers) {
      const peer = this.peers[peerId];
      peer.pullBlocks();
    }
  }

  /* Registers `callback` for block updates */
  onPulledBlocks(callback: (b: Block[])=>void) {
    this.events.on('pulled-blocks', callback);
  }

  /* Registers `callback` for peer connected events */
  onPeerConnect(callback: (p: Peer)=>void) {
    this.events.on('connected-peer', callback);
  }

  /* Handles received messages from all peers */
  private handlePeerMsg(peer: Peer, msg: Message) {
    if (msg.type == "pullBlocks") {
      // Someone requrested our blocks, so send it to them
      peer.pushBlocks(this.blocks);
    } else if (msg.type == "pushBlocks") {
      // We just received blocks so add them to ours
      mergeInto (this.blocks, msg.content);
      this.events.emit('pulled-blocks', msg.content);
    }
  }

  /* Handles new channels (aka connections) */
  private handleNewConnections(channel: Channel) {
    if (channel.getRemoteId() in this.peers) {
      console.warn("Connected to already connected to peer", channel);
      return;
    }
    const peer = new Peer(channel);

    // Register a callback so we can handle all peer messages
    channel.onMessage((msg) => {
      this.handlePeerMsg(peer, msg);
    });

    this.peers[channel.getRemoteId()] = peer;
    this.events.emit('connected-peer', peer);

    // Send the peer our blocks
    peer.pushBlocks(this.blocks);
  }
}

function mergeInto<T>(listA: T[], listB: T[]) {
  listB.forEach(function(e) {
    if (listA.indexOf(e) === -1)
      listA.push(e);
  });
};
