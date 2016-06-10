import { ok, equal } from 'assert';
import { Peer, Client, normalizePath } from '../lib/client';
import { Server } from 'http';
import { startNet, stopNet, startPeer, setupNet } from './utils';

describe('peer tests', function() {
  const peerCount = 2;

  it('all peers connect to everyone else', setupNet((testnet, done) => {
    for (let p of testnet.peers) {
      equal(peerCount - 1, Object.keys(p.peers).length);
    }
    done();
  }, peerCount));

  it('new peer automatically connects to net', setupNet((testnet, done) => {
    let count = 0;
    const onPeerConnect = () => {
      count++;
      ok(count <= 2 * peerCount);
      if (count == 2 * peerCount)
        done();
    };
    for (let p of testnet.peers) {
      p.on('connected-peer', onPeerConnect);
    }
    const newPeer = startPeer(testnet);
    newPeer.on('connected-peer', onPeerConnect);
  }, peerCount));

});

describe('utility tests', function() {
  it('normalize path test', function() {
    let path = '/a////a/a/a///////asdfadsf////asdfasdf//////asdfasdf//';
    path = normalizePath(path);
    equal(path.match(/\/{2,}/), null);
  });
});
