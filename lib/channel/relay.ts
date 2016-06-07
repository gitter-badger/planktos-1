import { EventEmitter } from 'events';
import { ChannelManager, Channel, Message } from './';

/* Channel that relays it's messages through RelayChannelManager.
 * It sends messages through the `send` function that is passed
 * into the constructor. The RelayChannelManager is responsible
 * for 'delivering' messages to the channel by invoking
 * `emit('message', msg)` function
 */
class RelayChannel extends EventEmitter implements Channel {
  private remoteId: string;
  private send: (m: Message)=>void;

  constructor(remoteId: string, send: (m: Message)=>void) {
    super();
    this.remoteId = remoteId;
    this.send = send;
  }

  getRemoteId() {
    return this.remoteId;
  }

  sendMessage(msg: Message) {
    this.send(msg);
  }

  disconnect() {
    this.send = null;
    this.emit('disconnect');
  }
}

export class RelayChannelManager extends EventEmitter implements ChannelManager {

  private relay: Channel;
  private localId: string;
  private channels: {[i: string]: Channel} = {};

  constructor(localId: string, relay: Channel) {
    super();
    this.relay = relay;
    this.localId = localId;

    this.relay.on('message', (msg: Message) => {
      this.handleMessage(msg);
    });
  }

  getLocalId() {
    return this.localId;
  }

  connect(remoteId: string) {
    console.info("IIIIII Initiating connection");
    if (remoteId in this.channels)
      throw new Error("Already connected to channel");

    const channel = new RelayChannel(remoteId, (msg: Message) => {
      this.sendRelay(remoteId, msg);
    });

    channel.once('disconnect', () => {
      delete this.channels[remoteId];
      this.emit('channel-disconnect', channel);
    });

    this.channels[remoteId] = channel;

    // Delay emit until after caller has chance to set listener
    setTimeout(() => {
      console.info("IIIIII Emitting connect");
      channel.emit('connect')
      this.emit('channel-connect', channel);
    });

    return channel;
  }

  private sendRelay(toId: string, msg: Message) {
    this.relay.sendMessage({
      type: 'relay',
      content: {
        'toId': toId,
        'fromId': this.localId,
        'msg': msg
      }
    });
  }

  private handleMessage(msg: Message) {
    if (msg.type !== 'relay')
      return; // Ignore messages that aren't relays
    if (msg.content.toId !== this.localId)
      console.warn("Received message addressed to another peer", msg);
    else
      this.forward(msg.content.fromId, msg.content.msg);
  }

  private forward(fromId: string, msg: Message) {
    if (fromId in this.channels) {
      this.channels[fromId].emit('message', msg);
    } else {
      console.info("IIIIII received relay from new peer", msg);
      const c = this.connect(fromId);
      this.channels[fromId] = c;
      c.once('connect', () => {
        // Delay emit so listeners of 'channel-connct' can set listeners
        // for this event
        setTimeout(() => {
          console.info("IIIIII handling connect. emitting new message", msg);
          c.emit('message', msg);
        });
      });
    }
  }
}
