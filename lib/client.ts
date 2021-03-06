import { ChannelManager, Channel, Message, startManager } from './channel';
import { EventEmitter } from 'events';

/* Basic data unit that is stored and retrieved on the network */
export class Block {
  content: any;
  id: string;
}

/* A remote peer that can be communicated with.
 * Peers can send/recveive blocks through their
 * channel (aka connection).
 */
export class Peer {
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

/* Main controller for p2p code.
 * Data can be stored on the network by pushing blocks onto it,
 * and data can be retreived by pulling blocks from it.
 *
 * Emits:
 *     pulled-blocks(blocks: Block[], path: string) - Array of pulled blocks and their path
 *     connected-peer(p: Peer)                      - A new peer has connected
 */
export class Client extends EventEmitter {
  private blockMap: {[i: string]: Block} = {};  // Index by block id
  private blockList: {[i: string]: Block[]} = {'': []};  // Indexed by path
  private channelManager: ChannelManager;

  peers: {[i: string]: Peer} = {};

  /* Starts a new client
   * socketiourl - the url of the socketio server to find peers from
   * useWebRtc   - indicates if webrtc should be used
   */
  constructor(socketioUrl?: string, useWebRtc = true) {
    super();

    startManager(socketioUrl, useWebRtc, cm => {
      this.channelManager = cm;
      this.channelManager.on('channel-connect', (c: Channel) => this.handleNewConnections(c));
    });
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

  /* Returns locally cached blocks at `path` */
  getBlocks(path: string): Block[] {
    path = normalizePath(path);

    if (!(path in this.blockList))
      this.blockList[path] = [];
    return this.blockList[path];
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
      this.emit('pulled-blocks', msg.content.blocks, msg.content.path);
    } else {
      console.warn("Recieved message with unknown type", msg, peer);
    }
  }

  /* Handles new channels (aka connections) */
  private handleNewConnections(channel: Channel) {
    if (channel.getRemoteId() in this.peers) {
      console.warn("Connected to already connected to peer", channel);
      return;
    }
    const peer = new Peer(channel);

    channel.on('disconnect', () => {
      delete this.peers[channel.getRemoteId()]
      console.info("disconnected peer", channel.getRemoteId());
    });

    // Register a callback so we can handle all peer messages
    channel.on('message', (msg: Message) => {
      this.handlePeerMsg(peer, msg);
    });

    this.peers[channel.getRemoteId()] = peer;
    this.emit('connected-peer', peer);

    // Send the peer our blocks
    peer.pushBlocks("", this.getBlocks(""));
  }
}

function genRandomString() {
  return "" + Math.round(Math.random() * 99999999999);
}

export function normalizePath (path: string) {
  return path.replace(/\/+/g, '/');
}
