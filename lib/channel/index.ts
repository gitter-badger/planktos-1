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

/* Starts the default channel manager and returns a promise for when ready
 * socketioUrl - the url of the socketio server to get peers from
 * useWebrtc   - the webrtc module to use. If undefined the browser one
 *        will be used or no webrtc will be used
 * cb - callback called when the channel manager is ready
 */
export function startManager(socketioUrl?: string, useWebRtc?: boolean, cb?: (cm: ChannelManager)=>void) {

  const server = new SocketioChannel(socketioUrl);
  server.once('connect', () => {

    // Use the remote id the socketio server assigns us as our local id
    const localId = server.getRemoteId();

    let manager: ChannelManager = new RelayChannelManager(localId, server);
    if (useWebRtc)
      manager = new WrtcChannelManager(manager);


    const onServerMessage = (msg: Message) => {
      if (msg.type === 'newPeers') {
        server.removeListener('message', onServerMessage);
        for (const id of <string[]>msg.content) {
          manager.connect(id);
        }

        if(cb)
          cb(manager);
      }
    };
    server.on('message', onServerMessage);

    // Ask the server to send us peer ids so we can connect to them
    server.sendMessage({ type: 'findPeers', content: {} });
  });
}
