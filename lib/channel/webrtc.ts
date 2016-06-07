const SimplePeer = require('simple-peer');
import { EventEmitter } from 'events';
import { ChannelManager, Channel, Message } from './';

/* Channel that uses webrtc as it's transport */
class WrtcChannel extends EventEmitter implements Channel {
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
    this.remoteId = remoteId;
    this.webrtc = new SimplePeer({
      initiator: typeof(offer) === 'undefined',
      trickle: false
    });

    if (typeof(offer) !== 'undefined')
      this.webrtc.signal(offer);
    this.setupChannel(signaler);
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
    this.webrtc.close();
  }

  private setupChannel(signaler: Channel) {
    signaler.on('message', (msg: Message) => {
      if (msg.type !== 'signal') {
        console.warn("Received message other than signals over signaler channel", msg);
        return;
      }
      this.webrtc.signal(msg.content);
    });

    this.webrtc.on('signal', (signal: any) => {
      // We received an answer or our offer is ready.
      // So send the destination our signaling info
      signaler.sendMessage({
        type: 'signal',
        content: signal
      });
    });

    this.webrtc.once('connect', () => {
      console.info("WEBRTC CONNECTED");
      this.emit('connect');
      signaler.disconnect();
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

    this.webrtc.once('close', () => {
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
 * information.
 */
export class WrtcChannelManager extends EventEmitter implements ChannelManager {

  private relay: ChannelManager;

  // The remote IDs of connected/initiated channels
  private channels: {[i: string]: WrtcChannel} = {};

  constructor(relay: ChannelManager) {
    super();

    this.relay = relay;

    relay.on('channel-connect', (c: Channel) => {
      console.info("IIIIII WRTC FOUND NEW CONN", c);
      this.handleNewRelayChannel(c);
    });
  }

  getLocalId() {
    return this.relay.getLocalId();
  }


  connect(remoteId: string) {
    if (remoteId in this.channels)
      throw new Error("Already connected to channel: " + remoteId);

    // Set it to null so we know a connection has be started
    this.channels[remoteId] = null;
    const relayChannel = this.relay.connect(remoteId);
    return this.initiateWrtcChannel(relayChannel);
  }

  private handleNewRelayChannel(c: Channel) {
    if (c.getRemoteId() in this.channels)
      return; // Skip channels we already have
    c.once('message', (msg: Message) => {
      console.log('IIIIII WRTC RECEIVED RELAY', msg);
      if (msg.type === 'signal') {
        this.initiateWrtcChannel(c, msg.content);
      } else {
        console.warn("Relayed channel sent something other than a signal message");
      }
    });
  }

  private initiateWrtcChannel(relay: Channel, offer?: any) {
    const remoteId = relay.getRemoteId();
    console.info("IIIIII initiating wrtc channel", offer);
    const wrtc = new WrtcChannel(relay, remoteId, offer);

    wrtc.once('connect', () => {
      console.info('IIIIII WRTC emitting channel-connect');
      this.emit('channel-connect', wrtc);
      relay.disconnect();
      relay = null;
    });

    // TODO Maybe a memory leak for `wrtc` and/or `relay`?

    wrtc.once('disconnect', () => {
      delete this.channels[remoteId];
      this.emit('channel-disconnect', wrtc);
    });

    this.channels[remoteId] = wrtc;

    return wrtc;
  }
}
