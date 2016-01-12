var Q = require('q');
var socket = require('socket.io-client')("http://localhost:8000");

var defers = {}; //{request id: Q.defer}

socket.on('onPulledBlockHashes', function (data) {
  console.log('onPulledBlockHashes', data);
  defers[data.id].resolve(data.hashes);
});

socket.on('onPushedBlock', function (data) {
  console.log('onPushedBlock', data);
  defers[data.id].resolve();
});

socket.on('onPulledBlock', function (data) {
  console.log('onPulledBlock', data);
  defers[data.id].resolve(data.block);
});

var generateId = function() {
  return "" + Math.round(Math.random() * 9999999999);
};

exports.pullBlockHashes = function(board) {
  console.log('pullBlockHashes', board);
  var req = {
    'board': board,
    'id': generateId()
  };
  var deferred = Q.defer();
  defers[req.id] = deferred;
  socket.emit('pullBlockHashes', req);
  return deferred.promise;
};

exports.pullBlock = function(board, hash) {
  var req = {
    'board': board,
    'hash': hash,
    'id': generateId()
  };
  var deferred = Q.defer();
  defers[req.id] = deferred;
  socket.emit('pullBlock', req);
  return deferred.promise;
};

exports.pushBlock = function(board, data) {
  var req = {
    'block': {
      'data': data,
      'hash': '' + Math.random()
    },
    'board': board,
    'id': generateId()
  };
  var deferred = Q.defer();
  defers[req.id] = deferred;
  socket.emit('pushBlock', req);
  return deferred.promise;
};
