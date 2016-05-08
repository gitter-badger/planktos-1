"use strict";

var socketio = require('socket.io-client');

var Client = function(masterUrl) {
  this.peers = [];
  this.blocks = [];
  this.blockWatchers = [];
  this.peerWatchers = [];
  this._socket = socketio(masterUrl);

  var client = this;
  this._socket.on('message', function(msg) {
    onSocketioMessage(client, msg);
  });
};

Client.prototype._sendServerRequest = function(method, reqData) {
  var request = {
    'method': method,
    'data': reqData
  };

  console.log("SEND", request);

  this._socket.send(request);
};

Client.prototype.findPeers = function() {
    this._sendServerRequest('findPeers', {});
};

Client.prototype._onPeerMessageRecv = function(peerId, data) {
  console.log("P2P << ", peerId, data);

  if (data.type == "pullBlocks") {
    this._sendPeerMessage(peerId, "pushBlocks", this.blocks);
    notifyWatchers (this.blockWatchers);
  } else if (data.type == "pushBlocks") {
    mergeInto (this.blocks, data.message);
    notifyWatchers (this.blockWatchers);
  }
};

Client.prototype._sendPeerMessage = function(peerId, type, message) {
  var data = {
    peerId: peerId,
    data: {
      type: type,
      message: message
    }
  };
  console.log("P2P >> ", peerId, data.data.type, data.data.message);
  this._sendServerRequest ('relayToPeer', data);
};

Client.prototype.pushBlock = function(content) {
  this.blocks.push(content);
  this.peers.forEach((peerId) => {
    this._sendPeerMessage(peerId, "pushBlocks", [ content ]);
  });
};

Client.prototype.pullBlocks = function() {
  this.peers.forEach((peerId) => {
    this._sendPeerMessage(peerId, "pullBlocks", {});
  });
};

var onSocketioMessage = function(client, response) {
  console.log('RECV', response);
  if (response.method == 'relayToPeer') {
    client._onPeerMessageRecv(response.result.peerId, response.result.data);
  } else if (response.method == 'findPeers') {
    mergeInto(client.peers, response.result);
    notifyWatchers (client.peerWatchers);
  } else if (response.method == 'newPeer') {
    client.peers.push(response.result.peerId);
    notifyWatchers (client.peerWatchers);
  }
};


var notifyWatchers = function(watchList) {
  watchList.forEach(function(w) {
    w();
  });
};

var mergeInto = function(listA, listB) {
  listB.forEach(function(e) {
    if (listA.indexOf(e) === -1)
      listA.push(e);
  });
};

module.exports = exports = Client;
