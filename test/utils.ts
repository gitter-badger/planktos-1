import { Client } from '../lib/client';
import { Server } from '../server';

export interface TestNet {
  server: Server;
  peers: Client[];
}

type DoneFunc = (e?: any)=>void;
type TestFunc = (t: TestNet, done:DoneFunc)=>void;

export function setupNet(testFunc: TestFunc, numPeers: number, waitForConnect = true) {

  return function() {
    return startNet(numPeers, waitForConnect)
      .then(testnet => {
        return new Promise((resolve, reject) => {

          const doneIntercept = (e?: any) => {
            stopNet(testnet);
            if (e)
              reject(e);
            else
              resolve();
          };

          testFunc(testnet, doneIntercept);
        });
      });
  };
}

export function startNet(numPeers: number, waitForConnect = true): Promise<TestNet> {
  let testnet: TestNet = {
    server: new Server(),
    peers: [],
  };

  return testnet.server.listen()
    .then(() => startPeers(testnet, numPeers, waitForConnect))
    .then(() => Promise.resolve(testnet));
}

export function stopNet(testnet: TestNet) {
  testnet.server.destroy();
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
