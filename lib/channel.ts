import * as socketio from 'socket.io-client';
import { EventEmitter } from 'events';
const SimplePeer = require('simple-peer');

export interface Message {
  type: string;
  content: any;
}

/* Bi-directional communication via message passing between a
 * source and destination
 */
export interface Channel {
  getRemoteId(): string;
  sendMessage(m: Message): void;
  onMessage(callback: (m: Message)=>void): void;
  // TODO add onConnect and onDisconnect
}

/* Communication to/from a server using socketio as the transport */
export class SocketioChannel implements Channel {
  private socket: SocketIOClient.Socket;

  constructor(masterUrl?: string) {
    this.socket = socketio.connect(masterUrl);
    this.onMessage((msg) => {
      console.info("SOCKETIO RECV", JSON.stringify(msg));
    });
  }

  getRemoteId() {
    return this.socket.id;
  }

  sendMessage(msg: Message) {
    console.info("SOCKETIO SEND", JSON.stringify(msg));
    this.socket.send(msg);
  }

  onMessage(callback: (m: Message)=>void) {
    this.socket.on('message', callback);
  }

  onConnect(callback: (id: string)=>void) {
    this.socket.on('connect', () => callback('/#' + this.socket.id));
  }
}

/* Channel that relays it's messages through another channel */
export class RelayChannel implements Channel {
  private remoteId: string;
  private localId: string;
  private relay: Channel;
  private events = new EventEmitter();

  constructor(relay: Channel, localId: string, remoteId: string) {
    this.localId = localId;
    this.remoteId = remoteId;
    this.relay = relay;
    relay.onMessage(msg => {
      // Only accpet messages that have the exported toId/fromId since
      // there may be multiple RelayChannels using the same relay
      if (msg.type === 'relay' && msg.content.toId === this.localId &&
                                  msg.content.fromId == this.remoteId) {
          this.events.emit('message', msg.content.msg);
      }
    });
  }

  getRemoteId() {
    return this.remoteId;
  }

  sendMessage(msg: Message) {
    const relayMsg = {
      type: 'relay',
      content: {
        toId: this.remoteId,
        fromId: this.localId,
        msg: msg
      }
    };

    this.relay.sendMessage(relayMsg);
  }

  onMessage(callback: (m: Message)=>void) {
    this.events.on('message', callback);
  }
}

/* Channel that uses webrtc as it's transport */
export class WrtcChannel implements Channel {
  private signaler: Channel;
  private remoteId: string;
  private webrtc: any;  // Instance of SimplePeer

  /* Initiates a webrtc channel. Before two peers can connect they
   * must first exchange signaling information which is exchanged
   * through the provided `signaler` channel. The initiator of the
   * connection sends an 'offer' through the signaler channel. If the
   * 'offer' is accpeted, an 'answer' is sent back to the initiator.
   * After this, the two peers are connected
   */
  constructor(signaler: Channel, remoteId: string, offer?: any) {
    if (!SimplePeer.WEBRTC_SUPPORT)
      throw new Error("WebRTC is not supported!");
    this.signaler = signaler;
    this.remoteId = remoteId;
    this.webrtc = new SimplePeer({
      initiator: typeof(offer) === 'undefined',
      trickle: false
    });

    if (typeof(offer) !== 'undefined')
      this.webrtc.signal(offer);

    this.signaler.onMessage((msg: Message) => {
      if (msg.type !== 'signal') {
        console.warn("Received message other than signals over signaler channel", msg);
        return;
      }
      this.webrtc.signal(msg.content);
    });

    this.webrtc.on('signal', (signal: any) => {
      // We received an answer or our offer is ready.
      // So send the destination our signaling info
      this.signaler.sendMessage({
        type: 'signal',
        content: signal
      });
    });

    this.webrtc.on('connect', () => {
      console.info("WEBRTC CONNECTED");
    });

    this.webrtc.on('error', (e: any) => {
      console.warn("WEBRTC ERROR", e);
    });

    this.onMessage((msg: Message) => {
      console.info("WRTC RECV", JSON.stringify(msg));
    });
  }

  getRemoteId() {
    return this.remoteId;
  }

  onConnect(callback: ()=>void) {
    this.webrtc.on('connect', callback);
  }

  sendMessage(msg: Message) {
    const str = JSON.stringify(msg);
    console.info("WRTC SEND", str);
    this.webrtc.send(str);
  }

  onMessage(callback: (m: Message) => void) {
    this.webrtc.on('data', function(data: string) {
      callback(JSON.parse(data));
    });
  }
}

/* Brokers all the connections for a client.
 * When a new potential peer is found, ChannelManager attempts
 * to open a webrtc channel to that peer. First it must open
 * up a relay channel that relays all the messages between the
 * peers through a server so the peers can exchange signaling
 * information. When the peers connect over webrtc the
 * ChannelManager's `onConnect` event is fired.
 */
export class ChannelManager {

  private server: Channel;
  private localId: string;
  private events = new EventEmitter();

  // Channels that are in the process of exhanging signaling info
  private pendingChannels: {[i: string]: WrtcChannel} = {};

  // Channels that have formed a connection
  private connectedChannels: {[i: string]: Channel} = {};

  constructor(localId: string, server: Channel) {
    this.localId = localId;
    this.server = server;
    server.onMessage((msg) => this.handleServerMsg(msg));
    this.findPeers();
  }

  getLocalId() {
    return this.localId;
  }

  /* Asks the server for more peers and attempts to connect to them */
  findPeers() {
    this.server.sendMessage({ type: 'findPeers', content: {} });
  }

  /* Registers a callback for a new channel is connected */
  onConnect(callback: (c: Channel)=>void) {
    this.events.on('connect', callback);
  }

  /* Called when we received a message from the server */
  private handleServerMsg(msg: Message) {
    if (msg.type == 'newPeers') {
      this.handlePotentialPeers(msg.content);
    } else if (msg.type === 'relay') {
      this.handleRelayedMsg(msg);
    } else {
      console.warn("Received message with unknown type", msg);
    }
  }

  /* Watches for messages relayed over the server channel in
   * order to find signaling messages and start the webrtc
   * process on this side of the connection
   */
  private handleRelayedMsg(msg: Message) {
    const remoteId: string = msg.content.fromId;
    const relayMsg: Message = msg.content.msg;

    // Only signaling messages should be relayed
    if (relayMsg.type !== 'signal') {
      console.warn('Recieved relayed message other than signal', msg);
      return;
    }

    if (remoteId in this.pendingChannels || remoteId in this.connectedChannels)
      return;

    // An offer has been received
    this.initiateWrtcChannel(remoteId, relayMsg.content);
  }

  /* Called when potential peers have been found */
  private handlePotentialPeers(peerIds: string[]) {
    for (const remoteId of peerIds) {
      if (remoteId in this.pendingChannels || remoteId in this.connectedChannels)
        continue; // Already have this peer

      this.initiateWrtcChannel(remoteId);
    }
  }

  private initiateWrtcChannel(remoteId: string, offer?: any) {
    const signaler = new RelayChannel(this.server, this.getLocalId(), remoteId);
    const wrtc = new WrtcChannel(signaler, remoteId, offer);

    wrtc.onConnect(() => {
      this.connectedChannels[remoteId] = wrtc;
      delete this.pendingChannels[remoteId];
      this.events.emit('connect', wrtc);
    });

    //TODO Cleanup pending peers if connection fails after timeout
    this.pendingChannels[remoteId] = wrtc;
  }
}

function genRandomString() {
  return "" + Math.round(Math.random() * 99999999999);
}
