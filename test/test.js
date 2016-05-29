const assert = require('assert');
const Client = require('../build/lib/client').default;
const masterUrl = "http://localhost:8000/";

describe('sanity tests', function() {

  it('basic block push', function(done) {
    const clientA = new Client();
    const clientB = new Client();

    function onNewPeer(peer) {
      const peersA = Object.keys(clientA.peers);
      const peersB = Object.keys(clientB.peers);
      const numPeers = peersA.length + peersB.length;

      //TODO Sometime peers from previous tests will linger
      //causing the assert below to fail
      assert (peersA.length <= 1 && peersB.length <= 1);
      if (peersA.length == 1 && peersB.length == 1) {
        assert(peersA[0].indexOf(clientB.localId) !== -1);
        assert(peersB[0].indexOf(clientA.localId) !== -1);
        clientA.pushBlock("A");
        clientB.pushBlock("B");
      }
    }

    function onNewBlock() {
      assert(clientA.blocks.length <= 2 && clientB.blocks.length <= 2);
      if (clientA.blocks.length == 2 && clientB.blocks.length == 2) {
        assert(clientA.blocks.indexOf("A") !== -1);
        assert(clientA.blocks.indexOf("B") !== -1);
        assert(clientB.blocks.indexOf("A") !== -1);
        assert(clientB.blocks.indexOf("B") !== -1);
        done();
      }
    }

    clientA.on('connected-peer', onNewPeer);
    clientB.on('connected-peer', onNewPeer);
    clientA.on('pulled-blocks', onNewBlock);
    clientB.on('pulled-blocks', onNewBlock);

    clientA.connect(masterUrl);
    clientB.connect(masterUrl);
  });
});
