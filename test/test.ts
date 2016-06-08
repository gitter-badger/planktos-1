import { ok, equal } from 'assert';
import { Peer, Client, normalizePath } from '../lib/client';
import { startManager } from '../lib/channel';
import { startServer } from '../server';
import { Server } from 'http';

function createPeer(server: Server) {
  const url = "http://localhost:" + server.address().port;
  // don't use webrtc. set to false for testing because webrtc
  // support in nodejs is... tricky...
  return new Client(url, false);
}

describe('sanity tests', function() {

  let server: Server;

  before(function(done) {
    startServer(s => {
      server = s;
      done();
    });
  });

  after(function() {
    server.close();
    server.unref();
  });

  it('peer connect', function(done) {
    const clientA = createPeer(server);
    const clientB = createPeer(server);

    const onPeer = (peer: Peer) => {
      const peersA = Object.keys(clientA.peers);
      const peersB = Object.keys(clientB.peers);
      ok(peersA.length <= 1 && peersB.length <= 1);
      if (peersA.length == 1 && peersB.length == 1) {
        done();
      }
    };

    clientA.on('connected-peer', onPeer);
    clientB.on('connected-peer', onPeer);
  });

  it('normalize path test', function() {
    let path = '/a////a/a/a///////asdfadsf////asdfasdf//////asdfasdf//';
    path = normalizePath(path);
    equal(path.match(/\/{2,}/), null);
  });
});
