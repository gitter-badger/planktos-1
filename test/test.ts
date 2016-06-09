import { ok, equal } from 'assert';
import { Peer, Client, normalizePath } from '../lib/client';
import { startServer } from '../server';
import { Server } from 'http';
import { start, stop, TestNet, startPeer } from './utils';

describe('peer tests', function() {
  const peerCount = 2;
  let testnet: TestNet;

  before(function(done) {
    start(peerCount).then(t => {
      testnet = t;
      done();
    });
  });

  it('all peers connect to everyone else', function() {
    for (let p of testnet.peers) {
      equal(peerCount - 1, Object.keys(p.peers).length);
    }
  });

  it('new peer automatically connects to net', function(done) {
    let count = 0;
    const onPeerConnect = () => {
      count++;
      ok(count <= 2 * peerCount);
      if (count == 2 * peerCount)
        done();
    };
    for (let p of testnet.peers)
      p.on('connected-peer', onPeerConnect);
    const newPeer = startPeer(testnet);
    newPeer.on('connected-peer', onPeerConnect);
  });

  after(function() {
    stop(testnet);
  });
});

describe('utility tests', function() {
  it('normalize path test', function() {
    let path = '/a////a/a/a///////asdfadsf////asdfasdf//////asdfasdf//';
    path = normalizePath(path);
    equal(path.match(/\/{2,}/), null);
  });
});
