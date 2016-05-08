/// <reference path="node.d.ts" />
"use strict";

var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var port = 8000;

app.use(express.static(__dirname + '/../app'));

var findPeers = function(data: any, peerId: string) {
  var peerList = Object.keys(peers);
  peerList.splice(peerList.indexOf(peerId), 1);
  return peerList;
};

var relayToPeer = function(data: any, peerId: string) {
  if (io.sockets.connected[data.peerId]) {
    var relayData = {
      method: 'relayToPeer',
      result: {
        peerId: peerId,
        data: data.data
      }
    };
    console.log("RELAYED", relayData);
    io.sockets.connected[data.peerId].send(relayData);
  }
};

var rpcMap: any = {
    findPeers: findPeers,
    relayToPeer: relayToPeer
};

var peers: any = {};

io.on('connection', function(socket: any){

  peers[socket.id] = true;

  socket.broadcast.send({method: 'newPeer', result: {peerId: socket.id}});

  socket.on('message', function(request: any) {
    console.log("Received request", request.method, request.data);
    var result = rpcMap[request.method](request.data, socket.id);
    if (typeof(result) != "undefined") {
      var response = {
        'method': request.method,
        'result': result
      };
      console.log("Sending response", response.method, response.result);
      socket.send(response);
    }
  });

  socket.on('disconnect', function() {
    delete peers[socket.id];
  });

});

exports.startServer = function() {
  http.listen(port, function(){
    console.log('listening on *:' + port);
  });
};

if (require.main === module) {
  exports.startServer();
}
