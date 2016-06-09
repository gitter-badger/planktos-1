import { Client } from '../lib/client';
import { startServer } from '../server';
import { Server } from 'http';

export interface TestNet {
  server: Server;
  peers: Client[];
}

export function start(numPeers: number, waitForConnect = true): Promise<TestNet> {
  let testnet: TestNet = {
    server: undefined,
    peers: [],
  };

  return startServer()
    .then(s => testnet.server = s)
    .then(() => startPeers(testnet, numPeers, waitForConnect))
    .then(() => Promise.resolve(testnet));
}

export function stop(testnet: TestNet) {
  testnet.server.close();
  testnet.server.unref();
}

export function startPeer(testnet: TestNet) {
  const url = "http://localhost:" + testnet.server.address().port;
  // don't use webrtc. set to false for testing because webrtc
  // support in nodejs is... tricky...
  const c = new Client(url, false);
  testnet.peers.push(c);
  return c;
}

export function startPeers(testnet: TestNet, count: number, waitForConnect = true) {
  for (let i=0; i < count; i++) {
    startPeer(testnet);
  }

  if (!waitForConnect)
    return Promise.resolve();

  return new Promise(resolve => {

    const onPeerConnect = () => {
      console.log("CONNECTED", Object.keys(testnet.peers[0].peers), Object.keys(testnet.peers[1].peers));
      let allConnected = true;
      for (const p of testnet.peers) {
        if (Object.keys(p.peers).length !== testnet.peers.length - 1) {
          allConnected = false;
          break;
        }
      }
      if (allConnected)
        resolve();
    };

    for (const p of testnet.peers) {
      p.on('connected-peer', onPeerConnect);
    }

  });
}
