var socket = require('socket.io-client')("http://localhost:8000");

var defers = {}; //{request id: {resolve: function, reject: function }}

socket.on('message', function(response) {
  console.log('received socketio response', response.id, response.result);
  defers[response.id].resolve(response.result);
});

var sendRequest = function(method, reqData) {
  //TODO possible promise overwrite. fix this
  var reqId = "" + Math.round(Math.random() * 9999999999);
  var request = {
    'id': reqId,
    'method': method,
    'data': reqData
  };

  console.log("Sending socketio request", method, reqId, reqData);

  var promise = new Promise(function(resolve, reject) {
    defers[reqId] = { 'resolve': resolve, 'reject': reject };
  });
  socket.send(request);
  return promise;
};

exports.pullBlockTree = function(blockPath) {
  return sendRequest('pullBlockTree', { 'blockPath': blockPath });
};

exports.pullBlock = function(blockPath) {
  return sendRequest('pullBlock', { 'blockPath': blockPath })
};
