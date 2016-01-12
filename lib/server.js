var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var port = 8000;

var boards = {};
var blocks = {};

app.use(express.static(__dirname + '/../build'));

io.on('connection', function(socket){

  socket.on('pullBlockHashes', function(data) {
    console.log('pullBlockHashes', data);
    var resp = {
      'hashes': data.board in boards ? boards[data.board] : [],
      'id': data.id
    }
    socket.emit('onPulledBlockHashes', resp);
  });

  socket.on('pullBlock', function(data) {
    console.log("pullBlock", data);
    var resp = {
      'block': blocks[data.hash],
      'id': data.id
    };
    socket.emit('onPulledBlock', resp);
  });

  socket.on('pullBoards', function(data) {
    console.log("pullBoards", data);
    var resp = {
      'boards': Object.keys(boards),
      'id': data.id
    };
    socket.emit('onPulledBoards', resp);
  });

  socket.on('pushBlock', function(data) {
    console.log("pushBlock", data);
    if (!(data.board in boards))
        boards[data.board] = [];
    boards[data.board].push(data.block.hash);
    blocks[data.block.hash] = data.block;
    socket.emit('onPushedBlock', {"id": data.id});
  });

  socket.on('deleteBoard', function(data) {
    console.log("deleteBoard", data);
    delete boards[data.board];
    socket.emit('onDeletedBoard', {"id": data.id});
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
