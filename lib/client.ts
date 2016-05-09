"use strict";

import * as socketio from 'socket.io-client';

var Client = function(masterUrl?: string) {
  this.peers = [];
  this.blocks = [];
  this.blockWatchers = [];
  this.peerWatchers = [];
  this._socket = null;
};

Client.prototype.connect = function(masterUrl: string) {
  var client = this;
  this._socket = socketio.connect(masterUrl);
  this._socket.on('message', function(msg: string) {
    onSocketioMessage(client, msg);
  });

  this.findPeers();
};

Client.prototype.disconnect = function() {
  this._socket.disconnect();
  this._socket = null;
  this.peers = [];
};

Client.prototype.getId = function() {
  return this._socket.id;
};

Client.prototype._sendServerRequest = function(method: string, reqData: any) {
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

Client.prototype._onPeerMessageRecv = function(peerId: string, data: any) {
  console.log("P2P << ", peerId, data);

  if (data.type == "pullBlocks") {
    this._sendPeerMessage(peerId, "pushBlocks", this.blocks);
    notifyWatchers (this.blockWatchers);
  } else if (data.type == "pushBlocks") {
    mergeInto (this.blocks, data.message);
    notifyWatchers (this.blockWatchers);
  }
};

Client.prototype._sendPeerMessage = function(peerId: string, type: string, message: any) {
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

Client.prototype.pushBlock = function(content: any) {
  this.blocks.push(content);
  this.peers.forEach((peerId: string) => {
    this._sendPeerMessage(peerId, "pushBlocks", [ content ]);
  });
};

Client.prototype.pullBlocks = function() {
  this.peers.forEach((peerId: string) => {
    this._sendPeerMessage(peerId, "pullBlocks", {});
  });
};

var onSocketioMessage = function(client: any, response: any) {
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


var notifyWatchers = function(watchList: Array<any>) {
  watchList.forEach(function(w: any) {
    w();
  });
};

var mergeInto = function(listA: Array<any>, listB: Array<any>) {
  listB.forEach(function(e) {
    if (listA.indexOf(e) === -1)
      listA.push(e);
  });
};

module.exports = exports = Client;
