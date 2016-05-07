var socket = require('socket.io-client')("http://localhost:8000");

socket.on('message', function(response) {
  console.log('received socketio response', response);
  if (response.method == 'relayToPeer')
    onPeerMessageRecv(response.result.peerId, response.result.message);
  else if (response.method == 'findPeers')
    onFoundPeers (response.result);
});

var sendServerRequest = function(method, reqData) {
  var request = {
    'method': method,
    'data': reqData
  };

  console.log("Sending socketio request", request);

  socket.send(request);
};

var onFoundPeers = function(peers) {
  console.log("Found peers", peers);
};

var onPeerMessageRecv = function(peerId, message) {
  console.log("Received message from peer", peerId, message);
};

exports.sendPeerMessage = function(peerId, message) {
  var data = {
    peerId: peerId,
    message: message
  };
  sendServerRequest ('relayToPeer', data);
};

exports.findPeers = function() {
    sendServerRequest('findPeers', {});
};
