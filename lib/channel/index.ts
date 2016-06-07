import { EventEmitter } from 'events';
import { SocketioChannel } from './socketio';
import { RelayChannelManager } from './relay';
import { WrtcChannelManager } from './webrtc';

/* Structure of messages sent through channels */
export interface Message {
  type: string;
  content: any;
}

/* Bi-directional communication via message passing between a
 * source and destination
 *
 * Emits:
 *    message(msg: Message)  - A message was received
 *    connect()              - The channel has formed a connection
 *    error(e: any)          - An error occured
 *    disconnect()           - The connection is no more
 */
export interface Channel extends NodeJS.EventEmitter {
  getRemoteId(): string;
  sendMessage(m: Message): void;
  disconnect(): void;
}

/* Handles all the channels (connections) for a peer.
 * ChannelManager is responsible for initiating
 * the connection to peers through channels.
 * The interface is pretty
 * minimal because it's purpose is to abstract
 * the peer connection process away. The main
 * from of interaction with the interface is with
 * it's emmited events.
 *
 * Emits:
 *     channel-connect(Channel)     - A channel has connected
 *     channel-disconnect(Channel)  - A channel has disconnected
 */
export interface ChannelManager extends NodeJS.EventEmitter {
  /* Retreives the id that other peers identify you as */
  getLocalId(): string;
  /* Given a channel's id, a connection is attempted */
  connect(remoteId: string): Channel;
}

/* Starts the default channel manager and calls `cb` when ready */
export function startManager(cb?: (cm: ChannelManager)=>void) {

    const server = new SocketioChannel();
    server.once('connect', () => {

      // Use the remote id the socketio server assigns us as our local id
      const localId = server.getRemoteId();

      const manager = new WrtcChannelManager(new RelayChannelManager(localId, server));

      const onServerMessage = (msg: Message) => {
        if (msg.type === 'newPeers') {
          server.removeListener('message', onServerMessage);
          for (const id of <string[]>msg.content) {
            console.log("ID", id, manager);
            manager.connect(id);
          }

          cb(manager);
        }
      };
      server.on('message', onServerMessage);

      // Ask the server to send us peer ids so we can connect to them
      server.sendMessage({ type: 'findPeers', content: {} });
    });

}
