import {ChannelManager, Channel, Message, SocketioChannel} from './channel';
import { EventEmitter } from 'events';

/* Basic data unit that is stored and retrieved on the network */
class Block {
  content: any;
  id: string;
}

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
  pushBlocks(path: string, blocks: Block[]) {
    this.channel.sendMessage({
      type: 'pushBlocks',
      content: {
        path: path,
        blocks: blocks
      }
    });
  }

  /* Requests from the peer to send us it's blocks */
  pullBlocks(path: string) {
    this.channel.sendMessage({
      type: 'pullBlocks',
      content: { path: path }
    });
  }
}

/* Main controller for p2p code */
export default class Client {
  private events = new EventEmitter();
  private blockMap: {[i: string]: Block} = {};  // Index by block id
  private blockList: {[i: string]: Block[]} = {'': []};  // Indexed by path

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
  pushBlock(path: string, content: any) {
    const block: Block = {
      content: content,
      id: genRandomString()
    };

    this.getBlocks(path).push(block);
    this.blockMap[block.id] = block;

    for (const peerId in this.peers) {
      const peer = this.peers[peerId];
      peer.pushBlocks(path, [ block ]);
    }
  }

  /* Request from peers for them to send us their blocks */
  pullBlocks(path: string) {
    for (const peerId in this.peers) {
      const peer = this.peers[peerId];
      peer.pullBlocks(path);
    }
  }

  getBlocks(path: string): Block[] {
    //TODO normalize path
    if (!(path in this.blockList))
      this.blockList[path] = [];
    return this.blockList[path];
  }

  /* Registers `callback` for block updates */
  onPulledBlocks(callback: (b: Block[], path: String)=>void) {
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
      const path = msg.content.path;
      peer.pushBlocks(path, this.getBlocks(path));
    } else if (msg.type == "pushBlocks") {
      // We just received blocks so add them to ours
      const list = this.getBlocks(msg.content.path);
      for (const block of <Block[]>msg.content.blocks) {
        if (!(block.id in this.blockMap)) {
          this.blockMap[block.id] = block;
          list.push(block);
        }
      }
      this.events.emit('pulled-blocks', msg.content.blocks, msg.content.path);
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
    peer.pushBlocks("", this.getBlocks(""));
  }
}

function genRandomString() {
  return "" + Math.round(Math.random() * 99999999999);
}
