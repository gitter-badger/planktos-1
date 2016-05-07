var socket = require('socket.io-client')("http://localhost:8000");

exports.peers = [];
exports.blocks = [];
exports.blockWatchers = [];

var mergeInto = function(listA, listB) {
  listB.forEach(function(e) {
    if (listA.indexOf(e) === -1)
      listA.push(e);
  });
};

/* <<<<<<<<<< BEGIN client-server interactions >>>>>>>>*/

socket.on('message', function(response) {
  console.log('RECV', response);
  if (response.method == 'relayToPeer')
    onPeerMessageRecv(response.result.peerId, response.result.data);
  else if (response.method == 'findPeers')
    mergeInto(exports.peers, response.result);
});

var sendServerRequest = function(method, reqData) {
  var request = {
    'method': method,
    'data': reqData
  };

  console.log("SEND", request);

  socket.send(request);
};

exports.findPeers = function() {
    sendServerRequest('findPeers', {});
};

/* <<<<<<<<<< END client-server interactions >>>>>>>>*/

/* <<<<<<<<<< BEGIN peer-peer interactions   >>>>>>>>*/

var onPeerMessageRecv = function(peerId, data) {
  console.log("P2P << ", peerId, data);

  if (data.type == "pullBlocks") {
    exports.sendPeerMessage(peerId, "pushBlocks", exports.blocks);
    exports.notifyBlockWatchers();
  } else if (data.type == "pushBlocks") {
    mergeInto (exports.blocks, data.message);
    exports.notifyBlockWatchers();
  }
};

exports.sendPeerMessage = function(peerId, type, message) {
  var data = {
    peerId: peerId,
    data: {
      type: type,
      message: message
    }
  };
  console.log("P2P >> ", peerId, data.data.type, data.data.message);
  sendServerRequest ('relayToPeer', data);
};

exports.pushBlock = function(content) {
  exports.blocks.push(content);
  exports.peers.forEach(function(peerId) {
    exports.sendPeerMessage(peerId, "pushBlocks", [ content ]);
  });
};

exports.notifyBlockWatchers = function() {
  exports.blockWatchers.forEach(function(w) {
    w();
  });
};

exports.pullBlocks = function() {
  exports.peers.forEach(function(peerId) {
    exports.sendPeerMessage(peerId, "pullBlocks", {});
  });
};

/* <<<<<<<<<< END peer-peer interactions   >>>>>>>>*/
