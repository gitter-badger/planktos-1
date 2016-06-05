import * as socketio from 'socket.io-client';
import { EventEmitter } from 'events';
const SimplePeer = require('simple-peer');

export interface Message {
  type: string;
  content: any;
}

/* Bi-directional communication via message passing between a
 * source and destination
 * Emits: message(msg: Message), connect(), error(e: any), disconnect()
 */
export interface Channel extends NodeJS.EventEmitter {
  getRemoteId(): string;
  sendMessage(m: Message): void;
  disconnect(): void;
}

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
    this.socket.on('connect', () => {
      this.emit('connect');
    });
    this.socket.on('disconnect', () => {
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

/* Channel that relays it's messages through another channel */
export class RelayChannel extends EventEmitter implements Channel {
  private remoteId: string;
  private localId: string;
  private relay: Channel;

  private onRelayMessage: Function;
  private onRelayDisconnect: Function;

  constructor(relay: Channel, localId: string, remoteId: string) {
    super();
    this.localId = localId;
    this.remoteId = remoteId;
    this.relay = relay;
    relay = null; // Prevent local variable from being captured

    this.onRelayMessage = (msg: Message) => {
      // Only accpet messages that have the exported toId/fromId since
      // there may be multiple RelayChannels using the same relay
      if (msg.type === 'relay' && msg.content.toId === this.localId &&
                                  msg.content.fromId === this.remoteId) {
          this.emit('message', msg.content.msg);
      }
    };

    this.onRelayDisconnect = () => { this.disconnect() };

    this.relay.on('message', this.onRelayMessage);
    this.relay.on('disconnect', this.onRelayDisconnect);

    // Delay so caller can has chance to set listeners
    setTimeout(() => { this.emit('connect') });
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

  disconnect() {
    this.relay.removeListener('message', this.onRelayMessage);
    this.relay.removeListener('disconnect', this.onRelayMessage);
    this.relay = null;
    this.emit('disconnect');
  }
}

/* Channel that uses webrtc as it's transport */
export class WrtcChannel extends EventEmitter implements Channel {
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
    super();
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
    this.setupChannel();
  }

  getRemoteId() {
    return this.remoteId;
  }

  sendMessage(msg: Message) {
    const str = JSON.stringify(msg);
    console.info("WRTC SEND", str);
    this.webrtc.send(str);
  }

  disconnect() {
    if (this.signaler)
      this.signaler.disconnect();

    this.webrtc.close();
  }

  private setupChannel() {
    this.signaler.on('message', (msg: Message) => {
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
      this.emit('connect');
      this.signaler.disconnect();
      this.signaler = null;
    });

    this.webrtc.on('error', (e: any) => {
      console.warn("WEBRTC ERROR", e);
      this.emit('error', e);
    });

    this.webrtc.on('data', (data: string) => {
      const msg: Message = JSON.parse(data);
      console.info("WRTC RECV", JSON.stringify(msg));
      this.emit('message', msg);
    });

    this.webrtc.on('close', () => {
      console.info("WEBRTC CLOSE");
      this.webrtc = null;
      this.emit('disconnect');
    });
  }
}

/* Brokers all the connections for a client.
 * When a new potential peer is found, ChannelManager attempts
 * to open a webrtc channel to that peer. First it must open
 * up a relay channel that relays all the messages between the
 * peers through a server so the peers can exchange signaling
 * information. When the peers connect over webrtc the
 * ChannelManager's 'connect' event is fired.
 *
 * Emits: channel-connect(Channel), channel-disconnect(Channel)
 */
export class ChannelManager extends EventEmitter {

  private server: Channel;
  private localId: string;

  // The remote IDs of connected/initiated channels
  private channelIds: {[i: string]: void} = {};

  constructor(localId: string, server: Channel) {
    super();
    this.localId = localId;
    this.server = server;
    server.on('message', (msg: Message) => this.handleServerMsg(msg));
    this.findPeers();
  }

  getLocalId() {
    return this.localId;
  }

  /* Asks the server for more peers and attempts to connect to them */
  findPeers() {
    this.server.sendMessage({ type: 'findPeers', content: {} });
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

    if (remoteId in this.channelIds)
      return;

    // An offer has been received
    this.initiateWrtcChannel(remoteId, relayMsg.content);
  }

  /* Called when potential peers have been found */
  private handlePotentialPeers(peerIds: string[]) {
    for (const remoteId of peerIds) {
      if (remoteId in this.channelIds)
        continue; // Already have this peer

      this.initiateWrtcChannel(remoteId);
    }
  }

  private initiateWrtcChannel(remoteId: string, offer?: any) {
    let wrtc = new WrtcChannel(
      new RelayChannel(this.server, this.getLocalId(), remoteId),
      remoteId,
      offer);

    wrtc.once('connect', () => {
      this.emit('channel-connect', wrtc);
      wrtc = null;
    });

    wrtc.once('disconnect', () => {
      delete this.channelIds[remoteId];
      this.emit('channel-disconnect', wrtc);
      wrtc = null;
    });

    this.channelIds[remoteId] = undefined;
  }
}
